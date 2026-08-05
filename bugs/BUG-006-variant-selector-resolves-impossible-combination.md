# BUG-006 — VariantSelector silently swaps the colour when a size+colour combination does not exist

**Status:** FIXED
**Severity:** High — the shopper is shown one thing and buys another
**Found by:** Component tests, stage 5d
**Fixed in:** `frontend-react/src/cmps/VariantSelector.jsx` — colour is constrained by the chosen size, and the display follows the resolved variant
**Regression tests:** `frontend-react/tests/unit/variant-selector.test.jsx` → `VariantSelector — the sparse catalogue` (five tests)

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

## Resolution

Both approaches above, because each on its own leaves half the bug standing.

**Constrain the second list.** `isColorAvailable` no longer asks whether a
colour exists anywhere in the catalogue; it asks whether it exists *in the
selected size*, using the `isVariantAvailable` that was already sitting there
unused:

```js
function isColorAvailable(color) {
  if (!selectedSize) return variants?.some(v => v.color === color && v.inStock)
  return isVariantAvailable(selectedSize, color)
}
```

The `!selectedSize` branch is not defensive padding — a product sold in
colours only has nothing to constrain against, and without it every colour
would be disabled.

**Reconcile, by deriving rather than storing.** When a size change makes the
chosen colour impossible, `effectiveColor` resolves to a colour that size
actually comes in, and the swatch, the colour name and the variant handed to
the parent all read from it:

```js
const effectiveColor = useMemo(() => {
  if (isVariantAvailable(selectedSize, selectedColor)) return selectedColor
  return colors.find(c => isVariantAvailable(selectedSize, c)) ?? selectedColor
}, [variants, colors, selectedSize, selectedColor])
```

Two decisions inside that are worth stating, because both were the alternative
and both are worse:

- **Derived, not an effect that calls `setSelectedColor`.** Reconciling in a
  `useEffect` leaves one render where the swatch and the resolved variant
  disagree — which is precisely the defect, just shortened. Deriving means the
  disagreement cannot exist at any point.
- **The chosen colour stays in state.** Overwriting it would mean a shopper who
  wanted red, looked at L, and came back to M would find blue. Keeping it means
  red returns the moment a size has it — the intent is remembered rather than
  quietly spent. `restores the shopper's colour when they return to a size that
  has it` pins this.

The `?? selectedColor` tail covers the case where nothing in the size is in
stock. The chosen colour stands and the stock line says `אזל מהמלאי`; blanking
the swatch would replace a wrong answer with no answer.

Size remains constrained by the catalogue as a whole rather than by the chosen
colour. Constraining both directions deadlocks — with M/red and L/blue,
whichever axis moved first would disable the other — so size is the primary
axis and colour follows it, which is the order shoppers pick in anyway.

## What was checked before calling it done

- **`ProductDetails.jsx`** is the only caller. It passes
  `onVariantSelect={setSelectedVariant}` — a stable setter, so the notify
  effect's dependency array behaves exactly as before — and reads
  `selectedVariant` for stock and add-to-cart. The prop contract is unchanged.
- **The eleven pre-existing tests still pass unmodified**, including `keeps the
  colour when only the size changes`, which is the one most at risk from a fix
  in this area: on a full matrix nothing should be reconciled at all.
- **No SCSS change.** Colours unavailable in the selected size get the same
  `unavailable` class and `disabled` attribute the component already used, so
  there is no new state to style.

Two tests were added beyond inverting the pinned pair: `initialVariant` naming
a combination that does not exist (a stale link would otherwise move the bug to
the URL), and the entirely-out-of-stock size.
