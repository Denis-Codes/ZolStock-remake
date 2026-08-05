# BUG-001 — Quantity chosen on the product page is ignored by the cart

| | |
|---|---|
| **Status** | Open — covered by an expected-fail test |
| **Severity** | Medium |
| **Area** | Frontend — product details → cart |
| **Covered by** | `frontend-react/tests/e2e/cart-flow.spec.js` (`@regression`) |

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
