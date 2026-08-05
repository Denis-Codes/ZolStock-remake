# BUG-003 — One product can occupy two cart lines when referenced by both id forms

| | |
|---|---|
| **Status** | **FIXED** |
| **Severity** | Low–Medium |
| **Area** | Backend — cart line identity |
| **Covered by** | `backend/tests/api/cart.api.test.js` (merges by sku and ObjectId) |

> The report below is kept as written. The fix is recorded at the end.

## Symptom

The same product can appear on two separate rows of the cart, each with its own
quantity, instead of merging into one row of the combined quantity.

## Reproduce

Requires a cart line that references a product by its legacy `sku` — which is
exactly what `byIdOrSku` exists to support.

1. Have a cart line whose `productId` is a legacy sku, e.g. `p1001`. In practice
   this comes from a guest cart saved in `localStorage` before the ObjectId
   migration, folded in by `POST /api/cart/merge` at sign-in.
2. Open that same product's page and add it to the cart. The storefront sends
   `product._id` — the ObjectId hex string.
3. Read the cart: two lines, both resolving to the same product.

## Cause

`backend/api/cart/cart.service.js` — `addItem()` builds the line key from the
**raw client-supplied id**, before that id is resolved to a product:

```js
const product = await products.findOne(byIdOrSku(productId))   // resolves both forms
if (!product) throw new NotFoundError(...)

const variantKey = _variantKey(productId, variant)             // ...but keys off the raw input
```

`byIdOrSku` deliberately accepts two names for one product — `507f…011` and
`p1001` both find the same document. `_variantKey` then treats those two names
as two different things, so the `cart.items.find(item => item.variantKey === variantKey)`
lookup misses the existing line and a second one is pushed.

The resolved product is already in hand one line earlier.

## Impact

- **Display**: the shopper sees a duplicate row and may think the cart is broken.
- **Stock ceiling**: the `newQty > product.stockQty` check is applied per line,
  so a product with 5 in stock could hold 5 on each of two lines — 10 total.
  Checkout still refuses to oversell (`_reserveStock` is a conditional
  decrement against the live `stockQty`), so this ends as a checkout-time
  conflict rather than an oversell. The shopper is blocked at the last step
  instead of being told earlier.
- **No pricing or security impact.** Both lines are priced from the catalogue.

Severity is held at Low–Medium because it needs a pre-migration cart to trigger,
and the worst outcome is a confusing checkout rather than lost money or stock.

## Why it is not fixed yet

Deliberately deferred. Current work is test and deployment infrastructure;
product behaviour changes are kept out of those diffs so each stage stays
reviewable on its own. The fix also needs a decision about existing carts (see
below), which is a product call rather than a testing one.

## How the test behaves

Marked `it.fails()`, so Vitest **expects** it to fail (note the spelling —
Playwright calls the same thing `test.fail()`):

- While the bug is open, the suite stays green.
- When it is fixed, the test passes — and Vitest reports that as a failure,
  because a test marked expected-to-fail unexpectedly passed.

That red is the signal to delete the `.fails`. The test then guards the fixed
behaviour permanently.

## When fixing

1. In `addItem()`, key off the resolved document rather than the request:
   `_variantKey(product._id, variant)`. The lookup above already returns it.
2. `updateItemQty()` re-reads the product via `byIdOrSku(item.productId)`, so
   stored lines keep working either way — but confirm it.
3. Decide what happens to carts already holding sku-keyed lines. Either leave
   them (they resolve and price correctly, they just will not merge with a new
   add) or write a one-off migration. Leaving them is defensible; choosing it
   silently is not.
4. Remove the `.fails` from the covering test in
   `backend/tests/unit/cart-pricing.test.js`.
5. Add an API-level test in stage 4 that adds the same product by sku and by
   ObjectId and asserts a single line — the unit test above cannot see the
   resolution step, so it proves the key is normalised but not that `addItem`
   uses the normalised one.

---

## The fix, as applied

**`backend/api/cart/cart.service.js` — `addItem()`**, two lines:

```js
const variantKey = _variantKey(product._id, variant)   // was: productId
...
productId: String(product._id),                        // was: String(productId)
```

The lookup one line above already had the resolved document. Normalising the
stored `productId` as well was not in the original plan; reads go through
`byIdOrSku` either way so both forms have always resolved, but a stored line
whose `productId` disagrees with its own `variantKey` is a trap for whoever
reads it next.

### Step 3 — the decision about existing carts

**Left alone. No migration.** Carts already holding sku-keyed lines keep
working: they resolve, they price correctly, and they check out. What they will
not do is merge with a new add of the same product, so such a shopper can still
see the duplicate row once.

The reason to accept that: the population is small (guest carts saved before
the ObjectId migration and merged at sign-in), the consequence is cosmetic, and
those lines drain naturally as people check out. A one-off migration would
touch live cart documents to fix a duplicate row — more risk than the defect
carries.

Recording it because the report said choosing this silently is not defensible.
Choosing it out loud is.

### The test had to move layers, and that is the interesting part

The original pin lived in `tests/unit/cart-pricing.test.js`:

```js
it.fails('BUG-003: gives one product one line regardless of which id form was used', () => {
  expect(_variantKey('507f1f77bcf86cd799439011', null)).toBe(_variantKey('p1001', null))
})
```

After the fix landed, **that test still failed** — correctly, and permanently.

`_variantKey` is pure. It has no database, so it cannot know that `507f…011`
and `p1001` name one product; only a lookup can. Two different strings, two
different keys, and a faithful function should return exactly that. The
assertion was pinned to a function that could never satisfy it.

So an `it.fails` that can never flip is not a pinned bug — it is a test that
someone eventually deletes out of irritation, taking the record of the bug with
it.

Both tests were rewritten rather than removed:

- **Unit** — now asserts what *is* this function's job: the encoding is
  literal, `not.toBe`, two ids are two lines. That property is precisely what
  makes it safe to normalise upstream.
- **API** — `tests/api/cart.api.test.js` → *merges a product added by sku and
  by ObjectId into one line*. This layer has a database, so it can prove the
  thing the unit test only gestured at. It asserts one line **and** a merged
  quantity of 2 — one line holding 5 would mean the second add replaced the
  first instead of merging.

Mutation-checked: reverting `product._id` to `productId` turns the new API test
red with *"expected to have a length of 1 but got 2"* — the duplicate row, in
the failure message.

**Worth recording as a method: pin a bug at the layer that can actually fix
it.** A test at the wrong layer looks like coverage and passes review while
asserting an impossibility. The question to ask when writing it is *"could the
code under test satisfy this if it wanted to?"*

## Related

The frontend computes its own guest-cart key in
`frontend-react/src/store/actions/cart.actions.js` with a *different* rule:

```js
`${productId}-${selectedVariant.size}-${selectedVariant.color}`
```

For a variant with a size but no colour this yields `p1-M-undefined`, where the
server yields `p1-M`. The two keys never have to agree today — the guest key
lives only in `localStorage`, and once signed in the client uses the key the
server returns — so this is not itself a bug. It is noted because two
independent implementations of one rule is how a bug like this one gets written
a second time.
