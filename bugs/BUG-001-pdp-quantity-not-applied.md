# BUG-001 — Quantity chosen on the product page is ignored by the cart

| | |
|---|---|
| **Status** | **FIXED** |
| **Severity** | Medium |
| **Area** | Frontend — product details → cart |
| **Covered by** | `frontend-react/tests/e2e/cart-flow.spec.js` (`@regression`), `frontend-react/tests/unit/add-to-cart-btn.test.jsx` |

> The report below is kept as written. The fix is recorded at the end.

## Symptom

On the product details page a shopper can increase the quantity before adding to
the cart. The chosen quantity is displayed correctly on the page, but the cart
always receives **1**.

## Reproduce

1. Open any product's details page.
2. Press the quantity increase control until it reads `2`.
3. Add to cart.
4. Open the cart — the line shows quantity `1`.

## Cause

Two places drop the value:

- `src/cmps/AddToCartBtn.jsx:21` hardcodes it:
  `dispatch(addToCart(product, 1, selectedVariant))`
- `src/cmps/AddToCartBtn.jsx:5` — the component signature accepts
  `{ product, selectedVariant, size, showText }` and has **no** `quantity` prop,
  so `src/pages/ProductDetails.jsx:255` has nothing to pass it into.

`ProductDetails.jsx:58` does hold the value in state (`const [quantity,
setQuantity] = useState(1)`) and renders it correctly at line 233 — so the
quantity control drives local display only. Nothing carries it into the
add-to-cart call.

## Impact

A shopper wanting several of one item silently gets one. They either notice in the
cart and adjust it there, or they don't notice and receive the wrong order. No
data corruption and no security impact — the server prices whatever quantity it is
actually sent.

## Why it is not fixed yet

Deliberately deferred. The current work is building the test and deployment
infrastructure; product behaviour changes are being kept out of those diffs so
each stage stays reviewable on its own.

## How the test behaves

The covering test is marked `test.fail()`, which means Playwright **expects** it to
fail:

- While the bug is open, the suite stays green.
- When the bug is fixed, the test passes — and Playwright reports that as a
  **failure**, because a test marked as expected-to-fail unexpectedly passed.

That red is the signal to delete the `test.fail()` line. The test then guards the
fixed behaviour permanently.

## When fixing

1. Pass the selected quantity from `ProductDetails.jsx` into `AddToCartBtn`.
2. Have `AddToCartBtn` send that value instead of a hardcoded `1`.
3. Delete the `test.fail(...)` line in `cart-flow.spec.js`.
4. Check the other places `AddToCartBtn` is used — the product listing and the
   deals band on the homepage — since they render it without a quantity control
   and must keep defaulting to 1.

---

## The fix, as applied

All four steps above, plus one thing the plan did not anticipate.

**`src/cmps/AddToCartBtn.jsx`** — a `quantity` prop with a default, and the
hardcoded `1` replaced:

```js
export function AddToCartBtn({ product, selectedVariant = null, quantity = 1, ... })
...
dispatch(addToCart(product, quantity, selectedVariant))
```

**`src/pages/ProductDetails.jsx`** — `quantity={quantity}` on the button. The
state and the stepper already existed and were untouched.

### The part step 4 was right to warn about

`= 1` is the whole of that step, and it is the only thing standing between this
fix and a much worse bug. `AddToCartBtn` is rendered in three places; two of
them — `ProductPreview` in the listing and the homepage deals band — have no
stepper and pass nothing. A **required** prop would have sent `undefined` into
`addToCart` from every add-to-cart outside the product page.

That would have been a strictly worse defect than the one being fixed, and it
would have looked like a tidier signature.

`add-to-cart-btn.test.jsx` now pins the default explicitly, because a default
is invisible until something depends on it — which is exactly when it needs a
test.

### Markers removed, tests kept

Both covering tests were already written and both had to be converted, not
deleted:

- `cart-flow.spec.js` — `test.fail(true, ...)` line removed.
- `add-to-cart-btn.test.jsx` — `it.fails('BUG-001: respects a requested
  quantity')` → `it('respects a requested quantity')`.

The second one is worth noting: the unit test **failed on the first run after
the fix**, reporting *expected to fail but passed*. That red was the designed
signal arriving on schedule, not a regression — it is how the suite announces
that a bug is gone. The two-test overlap was deliberate and both were kept,
because they fail for different reasons: the browser test proves
`ProductDetails` passes the value, the unit test proves the button honours it.
