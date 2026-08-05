# BUG-006 — VariantSelector silently swaps the colour when a size+colour combination does not exist

**Status:** Open, not fixed
**Severity:** High — the shopper is shown one thing and buys another
**Found by:** Component tests, stage 5d
**Pinned by:** `frontend-react/tests/unit/variant-selector.test.jsx` → `VariantSelector — the sparse catalogue` (two tests, both passing, pinning current behaviour)

---

## What happens

A product sold in two variants:

| size | colour |
|---|---|
| M | red |
| L | blue |

1. The page opens on **M / red**. Correct — that combination exists.
2. The shopper clicks **L**. The button is enabled, because L genuinely is in stock.
3. The screen now shows size **L** selected and colour **red** still selected.
4. The variant actually handed to the cart is **L / blue**.

The colour swatch says red. The colour name beside the label says אדום. The
item that gets bought is blue. Nothing warns anyone.

## Cause

`src/cmps/VariantSelector.jsx` renders size and colour as **two independent
lists**, and neither constrains the other. A button is enabled if that value
appears in *any* in-stock variant:

```js
function isSizeAvailable(size) {
  return variants?.some((v) => v.size === size && v.inStock)
}
function isColorAvailable(color) {
  return variants?.some((v) => v.color === color && v.inStock)
}
```

So with the table above, `L` is available (in blue) and `red` is available (in
M). Both buttons are enabled, and the shopper can select the pair `L + red`,
which is not a thing that exists.

The resolution step then falls through a chain of fallbacks:

```js
return variants.find(v => v.size === selectedSize && v.color === selectedColor)
    || variants.find(v => v.size === selectedSize)   // ← lands here
    || variants.find(v => v.color === selectedColor)
    || variants[0]
```

The exact match fails, the second clause matches L/blue, and that is what the
parent receives. The fallback chain is doing something reasonable in
isolation — never return null — but the UI is never told that the selection it
is displaying was overridden.

## Why it matters

- The shopper's mental model and the order disagree, and nothing on screen
  reveals it. This is worse than an error: an error is recoverable, a wrong
  parcel two days later is a support ticket and a return.
- It is not an exotic data shape. A **full** size×colour matrix is the unusual
  case; real catalogues are sparse almost by definition, because stock sells
  out unevenly.
- No layer after this one can catch it. Once the cart holds `L/blue`, that is
  indistinguishable from a shopper who genuinely chose blue — the API tests,
  the order tests and checkout are all working correctly on bad input.
- It gets worse as stock depletes. A product that starts as a full matrix
  becomes sparse the moment one combination sells out, so this appears on
  popular items rather than obscure ones.

## Fix

The component already contains the function that would fix it, unused:

```js
function isVariantAvailable(size, color) {
  return variants?.some(
    (v) => v.size === size && v.color === color && v.inStock
  )
}
```

It is defined, never called, and does exactly the right check — which reads
like an intention that was written and then not wired up.

Two reasonable approaches:

1. **Constrain the second list.** Once a size is chosen, disable every colour
   that does not exist in that size (using `isVariantAvailable`). The shopper
   cannot construct an impossible pair, which is the strongest fix.
2. **Reconcile on change.** When a new size makes the current colour
   impossible, move the colour selection to one that does exist and let the
   swatch update. Less strict, but the screen never lies.

Either way the display must follow the resolved variant. The bug is not
really the fallback — it is that the fallback happens invisibly.

## How this was found

By writing a fixture that was not a full matrix.

The first version of the test file used four variants covering every
size×colour pair, and every test passed. Adding a two-variant sparse fixture —
because a real catalogue is not a matrix — is what surfaced it.

Worth recording as a method: **test data that is too tidy hides bugs.** A
fixture where everything exists in every combination cannot exercise the code
that decides what to do when something does not.

## Not fixed

Per the project's bug policy: reproduce it, pin it, write it down, do not fix.

The two pinned tests assert what the component does **today** and therefore
pass — they are named so it is obvious they document a defect rather than
endorse it. When the fix lands they should be rewritten to assert the correct
behaviour, not merely deleted; the sparse fixture is the valuable part and
should stay.
