---
target: the product list
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-08-04T20-41-47Z
slug: src-cmps-productlist-jsx
---
Method: dual-agent (A: a1cc963e658c7b3b2 · B: a38359fc7c9c5e24c)

Target: the product list (category listing grid) — `src/cmps/ProductList.jsx`, `ProductPreview.jsx`, `ProductIndex.jsx` and their SCSS. Mode: **Operate**. Inspected live at 375 → 1920 on `/category/housewares`, a subcategory route, and `/search`.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | `ProductSkeleton` is wired into `HomeDeals` but not the listing — filter/sort swaps the grid with no loading affordance; `AddToCartBtn.jsx:23` adds a fake 300ms delay |
| 2 | Match System / Real World | 3 | H1 reads `קטגוריה: כלי בית` — a database word prefixing a shop word; unresolved subcategory falls back to the raw English slug |
| 3 | User Control and Freedom | 2 | Filters and sort live only in Redux. Refresh, back, or share a filtered view and every choice is silently discarded |
| 4 | Consistency and Standards | 2 | One `ProductList` on 5 surfaces, 3 different insets; `סינון` appears 3× on one screen; heart is a text glyph while every sibling icon is SVG |
| 5 | Error Prevention | 2 | Out-of-stock cards keep the full-brightness yellow price tag; `onMinFieldChange` accepts min > max from the fields |
| 6 | Recognition Rather Than Recall | 2 | No active-filter chips. Once the sheet closes, the only evidence of a filter is a smaller count |
| 7 | Flexibility and Efficiency | 1 | Price is the only filter. `subCategory`, `brand`, `tags`, `inStock` all exist in the data and none are filterable. Pagination computed at `ProductIndex.jsx:119-120` and never rendered |
| 8 | Aesthetic and Minimalist Design | 3 | Strongest axis — flat cards, one yellow tag, one blue CTA, honest row alignment. Dragged down by a subcategory truncating to one character |
| 9 | Error Recovery | 1 | Zero-results is `<p className="empty-state">` and `.empty-state` has no rule in any stylesheet. On `/search`, two different empty messages stack |
| 10 | Help and Documentation | 2 | The toolbar field self-documents via placeholder; the sort control does not |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

All ten heuristics apply to a listing surface; none scored `n/a`.

## Design Specificity Verdict

**Partially authored. The price tag and grid density are ZolStock's. The card around them is a generic e-commerce card that has been Hebrew-ified rather than Hebrew-authored.**

**LLM assessment.** Genuinely specific: the filled `#FFF200` tag with superscript agorot, the decision to keep it yellow when discounted, the pinned 2-column mobile grid, the flat hairline card. Swap in an unrelated product and the yellow tag is the first thing that breaks — that is a real signature.

Not specific: the card's information skeleton (corner % badge, corner heart, square photo, clamped title, meta strip, price, full-width CTA) is the default Shopify/Woo arrangement.

The disqualifying evidence is the price row. Measured at 375px, `.original-price` renders at x=327 and `.card-price` at x=240 — **in RTL the shopper reads the struck-through ₪89 before the actual ₪59.90**, on 40 of 40 cards. `ProductPreview.jsx:144-158` puts `original-price` first in the DOM: correct LTR authoring transplanted into an RTL page. `StarRating.jsx:42-46` carries the same fingerprint — stars → count → number renders as `★★★★☆ (65) 4.1`, separating the score from its own stars.

Second failure: **every one of the 40 products carries a discount badge** (30–43%). For a chain positioned on "the markdown is the merchandise," the markdown signal is uniform wallpaper — it discriminates nothing at scan distance.

**Deterministic scan.** The mandated JSX-only scan returned `[]` / exit 0 — and that result is vacuous, not clean. Assessment B canary-tested it: a synthetic `.jsx` containing `Inter, system-ui`, a purple gradient, an unlabelled `<img>`, a 20×20 button and a click-handler `<div>` *also* returned `[]`. Root cause isolated: `extractCSSinJS` returns nothing for React inline-style objects, and this project keeps 100% of styling in SCSS. Scanning `.jsx` here is structurally guaranteed to find nothing.

The supplementary SCSS scan returned 14 advisory findings: 9 `design-system-color` (all `rgba(0,0,0,0.08–0.45)` shadow/border alphas — technically palette drift, not brand colour) and 5 `design-system-font-size` off-ramp sizes (`StockWarning.scss:2` 12px; `AddToCartBtn.scss:26,36` 14/16px; `StarRating.scss:26,48` 11/15px).

**Where the detector beat the review:** contrast. Three failures the eye passed over, corroborated by both the injected browser bundle and independent measurement:

| Element | Ratio | Threshold | Result |
|---|---|---|---|
| Struck original price `#999` on white | **2.85:1** | 4.5 | FAIL |
| Sale badge `#fff` on `#e53935` | **4.23:1** | 4.5 | FAIL |
| Review count `#777` on white | **4.48:1** | 4.5 | FAIL (marginal) |

**False positives confirmed:** `marquee` on `body` (no `<marquee>` in `src/`; it is `.skeleton-shimmer::after`), `bounce-easing` (FontAwesome vendor keyframe), `gradient-text` on `body` (stylesheet-level attribution), `layout-transition` ×8 on `.nav-link` (header, outside this surface).

**Visual overlays:** injection preflight succeeded, but no user-visible overlay was produced — the path named in the brief (`scripts/detect.js`) does not exist; B substituted the real bundle at `scripts/detector/detect-antipatterns-browser.js` and ran it programmatically. Screenshots were captured at 375×812 and 1440×900 instead. No live-server was started; the running Vite dev server was reused.

## Overall Impression

This grid is better engineered than it is designed. The row-alignment system holds under an 82-character Hebrew title (measured card heights `342, 342, 326, 326, 323` — row-mates match exactly), and the image-fit normalisation is invisible load-bearing craft that makes the shelf read as a shelf. That is real work.

But it breaks in two places that matter more than anything it does well: **a single search result renders as a 993px-wide, 1154px-tall card**, and **widening a laptop from 1023px to 1024px drops the grid from 5 columns to 2**. Both are one-line CSS causes with page-destroying effects, and both fire on ordinary paths, not exotic ones.

The single biggest opportunity is smaller than either: reverse the price row. The shop's whole proposition is the saving, and in Hebrew the layout currently announces the price you are *not* paying first.

## What's Working

**1. The yellow price tag is a genuine brand object, and keeping it yellow when discounted is the right call.** Flipping it red would have put two coloured blobs in one grid row and removed the brand mark exactly where the saving matters. Because it never changes, the eye learns one shape — *the yellow thing is the price* — and can scan 24 cards by shape alone instead of reading each.

**2. Row alignment is honest and holds under stress.** `.card-body` pins every child to a numbered grid row with one `1fr` slack row. Injecting an 82-character title left every card matching its row-mates and collected the slack *below* the meta line, so nothing above drifted. Most grids fail this; this one was built with the failure in mind.

**3. Image normalisation makes the grid a catalogue rather than a collage.** Source images fill 75–97% of their own canvas; the measured per-file scale/offset map puts every product's longest side at the same share of the frame. Invisible, and doing the heaviest lifting on the page.

## Priority Issues

### [P0] `auto-fit` inflates a single result to a full-viewport product photo
`ProductPreview.scss:305` — `grid-template-columns: repeat(auto-fit, minmax(rem(200px), 1fr))`.

**Why it matters:** `auto-fit` collapses empty tracks and hands their space to survivors. Measured at 1440 with one match: computed columns `992.8px 0px 0px 0px`, card 993px wide, media 991px tall, card 1154px — taller than the viewport. This is not exotic: most Hebrew queries against a 40-product catalogue return 1–3 results, and it fires on `/search`, on any filtered-to-one category, and on a one-item wishlist. A shopper who successfully narrows a filter is punished with a broken-looking page. Category pages hide it only because every department happens to hold exactly 5 products.

**Fix:** `auto-fill` instead of `auto-fit`. Empty tracks keep their minimum, so one result renders as one 200px card. One word; every affected surface fixed at once.

**Suggested command:** `/impeccable adapt`

### [P0] 1023px → 1024px drops the grid from 5 columns to 2
`ProductPreview.scss:305/326/334` against `ProductIndex.scss:349`.

**Why it matters:** measured sweep — 375→2, 768→4, **1023→5, 1024→2**, 1100→3, 1440→4, 1920→6. Non-monotonic. At exactly `$bp-md` the 300px sticky sidebar plus a 32px gap arrives and the track minimum jumps 165px→200px simultaneously, leaving ~610px for the grid: 2 tracks of 299px, cards 66% wider than at 1440 with 299px-tall photos. A user rotating a tablet or restoring a maximised window watches the shelf get *emptier* as the screen gets bigger. The shipped values also contradict DESIGN.md's own Layout section (`minmax(260px)`/32px desktop, 210px/20px tablet vs. shipped 200px/12px and 165px/10px).

**Fix:** move the sidebar to `$bp-lg` so 1024–1199 keeps the grid and uses the sheet, or narrow the sidebar and lower the track minimum so 1024 yields 3+. Reconcile the shipped numbers with DESIGN.md in the same pass. Re-measure the sweep and confirm column count never decreases as width increases.

**Suggested command:** `/impeccable adapt`

### [P1] The RTL price row reads the struck-through price first
`ProductPreview.jsx:144-158`, `StarRating.jsx:42-46`.

**Why it matters:** it contradicts the product's first principle — "never let a layout bury the saving" — on every card in the catalogue. The shopper's eye lands on ₪89 before ₪59.90. The same LTR-habit fingerprint puts the rating number after the review count.

**Fix:** reverse the DOM order so the paid price leads in reading order and the original follows as the reference. Same for the star row: stars → score → count.

**Suggested command:** `/impeccable layout`

### [P1] Both primary touch targets on the card are below the system's own minimum
`AddToCartBtn.scss:14-16`, `ProductPreview.scss:77-78`.

**Why it matters:** DESIGN.md states *"size every touch target at 44px or larger — this system is thumb-first before it is anything else."* Measured at 375px: add-to-cart **137.5 × 32**, wishlist **40 × 40**, title link **147.5 × 19**, and all three toolbar controls at exactly **42px** — a consistent 2px miss, not random drift. Casey is one-handed with an 8px gutter to the adjacent column's card; a 32px target produces mis-taps into the wrong product's cart, 24 times per screen.

**Fix:** `.add-to-cart-btn.small` to `min-height: rem(44px)` keeping the 13px label; `.wish-btn` to 44px square; toolbar controls 42→44. The `1fr` slack row absorbs the ~14px card growth without disturbing row alignment.

**Suggested command:** `/impeccable audit`

### [P1] Zero results is an unstyled paragraph with no cause and no exit
`ProductList.jsx:4`; `.empty-state` has no rule in any stylesheet.

**Why it matters:** this is the moment the shopper is closest to leaving, and the interface offers no diagnosis and no recovery — a bare right-aligned `<p>` floating in ~600px of empty page. The filter that caused it isn't named and `ניקוי` is buried inside a sheet the user must reopen. On `/search` it is worse: `SearchResultsPage.jsx:39` and `ProductList.jsx:4` render two different empty messages stacked.

**Fix:** name the constraint, echo the term back, and offer the exit (`נקה סינון` wired to the existing clear handler, plus a link to the parent department). Style `.empty-state` as a centred block. Delete the duplicate message so one component owns the state.

**Suggested command:** `/impeccable harden`

### [P2] Three text colours fail WCAG AA on the card
Struck price `#999` → **2.85:1**; sale badge white-on-`#e53935` → **4.23:1**; review count `#777` → **4.48:1**.

**Why it matters:** the struck price is a *price* — the number the saving is measured against — rendered at 2.85:1 and struck through. The badge is the discount signal itself. Neither is decorative.

**Fix:** darken the struck price and review count to pass 4.5:1 (`$text-faint` is two hex steps away). The badge is brand-adjacent: `#e53935` is `$markdown-red`, not a frozen brand colour, so darkening to `$markdown-red-deep` (`#c62828`, 5.9:1) is permitted — verify against DESIGN.md before touching.

**Suggested command:** `/impeccable audit`

### [P2] The subcategory truncates to one character
`ProductPreview.jsx:116` inside `.card-meta`.

**Why it matters:** measured on housewares at 375px, `.card-line` renders 53px against a 67px scrollWidth. On textiles, where swatches take `margin-inline-start: auto` and win the space, it collapses to `מ…`, `כ…`, `כלי…` on three of five cards. It occupies the most valuable position in the meta line — first thing a Hebrew reader hits after the title — to restate the category the user just tapped, while crowding out the rating, which is the card's only real decision support.

**Fix:** drop `card-line` when `filterBy.subCategory` is already set; elsewhere let it have the row only when swatches are absent. Keep `.card-meta`'s `min-height` so grid alignment holds.

**Suggested command:** `/impeccable layout`

## Persona Red Flags

**Casey (distracted mobile, one-handed):**
- First card top at **y=440** on an 812px viewport — on a 667px phone Casey sees card *tops* and nothing else before scrolling. The 130px toolbar is the largest removable contributor; its third row is a 42px full-width text field for narrowing a 5-product list.
- **The card's entire middle is dead to touch.** Only four focusables per card; the meta line, the price section and the ~46px slack row are inside no link. A thumb landing on the yellow `₪29⁹⁰` — the most eye-catching object on the card — does nothing.
- Filters are Redux-only: interrupted, app-switched, returned → every filter and the sort gone, with no URL to restore from.

**Riley (stress tester):**
- 1 result → 993px card (the P0). 0 results → unstyled `<p>`, and on `/search` two conflicting empty messages at once.
- 1000 results → nothing exists. No pagination, no infinite scroll, no virtualisation; `from`/`to` computed at `ProductIndex.jsx:119-120` and rendered nowhere. 24 was clearly the intended page size.
- Out-of-stock → `אזל מהמלאי` renders **twice** per card while the price tag stays full-brightness yellow. At 375px `נותרו רק 2!` wraps to two lines in a 34px box jammed against the tag.
- Unknown subcategory slug → raw English in the H1 and breadcrumb, in a locale PRODUCT.md fixes as Hebrew-only.
- Long Hebrew title → **holds**. Rows stay aligned.

**Jordan (first-timer):**
- `קטגוריה: כלי בית` — the biggest text on the page names a system concept.
- `סינון` appears **3×** on one screen with the sheet open (toolbar button, sheet `<h2>`, panel `<h3>`), two of them stacked 40px apart.
- The filter sheet is **341px tall, not full-height** — `height: auto` over-constrains `bottom`, so the drawer stops mid-screen with a hard edge floating over the scrim. Reads as a dropdown that failed to render.
- Opening the sheet **doesn't move focus into it**; tabbing goes through the page behind the scrim first. No `role="dialog"`/`aria-modal`. Body scroll is locked but focus is not trapped.
- If logged in, a solid blue `הוסף מוצר` appears in the toolbar — not admin-gated, and **it has no `onClick`**. The loudest control in the toolbar is inert and shown to shoppers.

## Minor Observations

- `StarRating.jsx:22` hardcodes `id="halfGradient"` in every half-star SVG — duplicate DOM ids, invalid HTML, works only because the gradients are identical.
- `SaleBadge.scss:3-4` uses physical `top/right` and `.wish-btn` uses `left`, in a codebase whose own rule is *"Don't assume `inset-inline-end` is the left edge."*
- `src/assets/styles/cmps/ProductList.scss` is 228 lines, entirely commented out, still `@import`ed at `main.scss:55`. The live `.product-list` rules actually sit in `ProductPreview.scss:299-343`. **Flagged, not removed.**
- `.product-index` (`ProductIndex.scss:1-18`) targets a class that appears nowhere in the JSX — the page renders `.product-page`.
- `.breadcrumbs` is declared twice in the same file (`:20` and `:86`), the second overriding the first's padding.
- `ProductIndex.scss:334-335` carries a note to a collaborator left in a shipped stylesheet.
- `.product-card` has `overflow: hidden`, so the focus outline on `.card-media` — the first tab stop in every card — is clipped at the card's edge.
- Card images carry good alt text (equal to the product title) and `loading="lazy"`, but **no `width`/`height`**, so no space is reserved and the grid can shift on load.
- Three of four card focus indicators are UA defaults rather than the design system's blue halo.
- `SaleBadge` accepts a `size` prop the card never passes; `.small`/`.large` are unreachable here.

## Questions to Consider

1. **If every product is 30–43% off, what is the badge for?** It is texture, not signal. What if it appeared only above the catalogue's median discount — or if the grid could sort by *depth of markdown*, the one axis this shop is organised around and the only one the toolbar doesn't offer?
2. **Is the struck-price-first order intentional anchoring, or an LTR habit that survived translation?** If intentional, DESIGN.md should say so, because it contradicts "never let a layout bury the saving."
3. **The flat cards are right — keep them.** But if the card is a scanning object, why is the price tag not inside the link?
4. **The desktop sidebar costs two grid columns to display one slider.** Would the mobile sheet pattern — which is genuinely good — be the better answer at every width until there are enough filters to justify a permanent column?
5. **`from`/`to` say someone designed 24-per-page pagination and stopped.** At 40 products the omission is invisible; at 400 it is the difference between a shop and a scroll. Deferred or abandoned?
