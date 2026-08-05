# BUG-003 — One product can occupy two cart lines when referenced by both id forms

| | |
|---|---|
| **Status** | Open — covered by an expected-fail test |
| **Severity** | Low–Medium |
| **Area** | Backend — cart line identity |
| **Covered by** | `backend/tests/unit/cart-pricing.test.js` (`_variantKey`) |

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
