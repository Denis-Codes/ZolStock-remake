---
target: homepage
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-04T06-02-12Z
slug: src-pages-homepage-jsx
---
Method: dual-agent (A: a929ba3ec430aad56 · B: a4613e7840b230441)

**Target:** `src/pages/HomePage.jsx` — ZolStock Remake homepage. **Mode: Persuade.** The shopper arrives cold with no SKU; there is nothing to operate until something makes them want it. PRODUCT.md's own hook — "price and discount are the hook that stops the scroll" — is a persuasion mechanism.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | `HomePage.jsx:81-100` fires 8 parallel queries and renders `.category-tiles` from empty state — a labelled band above a zero-height hole until all 8 resolve. `ProductSkeleton` exists in the system and is not used here. |
| 2 | Match System / Real World | 3 | Correct RTL (`dir=rtl` verified in DOM), correct Hebrew departments, real branch addresses and hours grouped by real Israeli regions. Undercut only by the hero copy. |
| 3 | User Control and Freedom | 1 | `EmblaCarousel.jsx:60` — `Autoplay({ delay: 5000, stopOnInteraction: false })`. The largest object on a 375px screen rotates every 5s, cannot be paused, is not stopped by swiping, and has no dots, arrows, or slide count. WCAG 2.2.2 failure. |
| 4 | Consistency and Standards | 2 | No `ThemeProvider` exists in `src/`, so MUI `<Typography>` region names render in Roboto against the One Family Rule (measured: 13.6–18.3% of *visible* text). All 8 desktop nav links are 25.6px tall against a documented 44px standard. |
| 5 | Error Prevention | 2 | `HamburgerMenu.jsx:237,240` link to `/jobs` and `/franchise` — no matching route in `RootCmp.jsx` and no `path="*"` fallback, so both render a blank page under the header. `AppHeader.jsx:159-160` uses `href=""`, which reloads the current page. |
| 6 | Recognition Rather Than Recall | 1 | **All 8 category tile images 404** (verified in-browser). Every tile renders the same grey parcel placeholder, so the shopper must read eight Hebrew labels cold — which is the one job a tile image exists to prevent. |
| 7 | Flexibility and Efficiency | 2 | Search is a persistent header toggle at every width. But the page offers no accelerator to merchandise at all: no top deals, no biggest markdowns, no recently viewed. Every route to a product is tile → listing → card → product. |
| 8 | Aesthetic and Minimalist Design | 2 | Genuinely uncluttered — four blocks, no modal, no cookie bar, and the blue separator bands read cleanly. But minimal here means *empty of merchandise*: the branches block is roughly half the page's scroll on a shopping homepage. |
| 9 | Error Recovery | 1 | `HomePage.jsx:93` is a bare `.then()` with no `.catch()` — one failed department query rejects `Promise.all` and the tile grid stays empty permanently, silently. The map today shows **Google's own error box** (`RefererNotAllowedMapError`), not an app-authored state. |
| 10 | Help and Documentation | 1 | No delivery cost, no returns terms, no "the online price is the in-store price". The footer's `מידע ותקנון` group (`AppFooter.jsx:43`) renders נגישות / תנאי שימוש / מדיניות פרטיות / החלפה והחזרה as inert `<span>`s. |
| **Total** | | **16/40** | **Poor — major UX work required** |

No heuristic is `n/a`; all ten apply to a storefront homepage.

## Design Specificity Verdict

**LLM assessment: fails.** The page renders four blocks (`HomePage.jsx:136-242`): an auto-rotating carousel, 8 department tiles, a brochure hero, and a store locator. **There is not one product, one price, one struck-through original, one percent-off badge, or one `.price-tag` anywhere on it.** DESIGN.md calls the price tag "the defining object of the storefront" and Product Principle #1 is "the markdown is the merchandise" — the most-visited surface in the build contains zero instances of either.

It does not merely fail to escape the default e-commerce template (hero + carousel + category tiles + product grid) — it has the first three and *deletes the fourth*, replacing it with a store locator. Simultaneously generic and incomplete. Swap the department labels and this is a pharmacy, an optician, or a bank; the only things anchoring it to this business are the eight Hebrew department names and the Israeli branch list, and both are data, not design.

Structural sameness compounds it: all four blocks are the same shape — full-width band, centred content, blue label bar. No block is a different *kind* of thing from its neighbour. The `.section-separator` is a genuinely good device used twice; two identical bands is a pattern, not a system.

The brand owns `#FFF200`, one of the loudest colours in Israeli retail, and the homepage uses it twice — both times as text over a photo, never as the filled tag that makes the brand legible. The composition also papers over the photography gap instead of designing around it: the `.category-tile` mosaic's entire premise is visual variety from photography, and it renders today as eight identical grey rectangles, one of them four times larger than the others for no perceivable reason.

**Deterministic scan.** The CLI detector returned **0 findings, exit 0** across `HomePage.jsx`, its three child components, and all 31 files in `src/cmps/` — confirmed genuine, not a silent no-op (a `--no-config` run also returned 0, and a canary file with a bounce easing correctly returned exit 2). The static pass is a regex scan over JSX; this page's styling lives in SCSS, which is out of its scope. The real signal came from the live DOM.

The in-page detector produced **31 findings on mobile / 36 on desktop**. After verification, most are false positives:
- `low-contrast ×3` on the `.welcome` `h1` and `p` — **false positive.** The detector walked the `background-color` chain and never sampled the background *image*, which returns HTTP 200. An element screenshot shows white and yellow on a dark navy photo, clearly legible.
- `text-occlusion ×8` — **false positive, self-inflicted.** Every occluded node is the detector's own injected overlay badge.
- `marquee ×2` — out of scope; the real hit is `ProductSkeleton.scss:48`, and `ProductSkeleton` is not rendered on this page.
- `overused-font (roboto 85%)` — **misleading.** Measured across collapsed accordion content. A visible-only census inverts it: Assistant 81.6% mobile / 85.6% desktop, Roboto 18.3% / 13.6%. The violation is real but ~6× smaller than reported: 5 MUI region names plus Google's error text.
- Header `box-shadow` at rest — **sanctioned**, not a violation. DESIGN.md line 254 documents it as the header hairline. One factual note: the computed alpha is `0.1`; DESIGN.md specifies `0.08`. Minor token drift.

Real detector findings: `layout-transition ×19` (mostly hidden MUI internals), `heading-rhythm ×2` (mobile only), `cramped-padding ×1` (mobile only).

**Where the detector beat the review:** three findings the design pass missed entirely — a permanently focusable unlabelled toast button, 33 sub-44px desktop hit targets, and the live Maps failure. **Where the review beat the detector:** every P0/P1 below. No automated rule can notice that a shop's homepage has no prices on it.

**Visual overlays.** Injection genuinely succeeded — `live-server.mjs` served `detect.js`, globals appeared where none existed before, and `div.impeccable-overlay` nodes painted into the page. Both servers (Vite on 5177, live-server on 8400) were stopped and verified closed, so the overlay tab is no longer live; the console output is summarised above.

## Overall Impression

This is a well-engineered page that is not a shop. The craft in the parts is real — the responsive carousel swaps artwork instead of cropping it, the branches block genuinely re-thinks its mobile layout rather than stacking it, zero horizontal overflow at 375px, exactly one `h1`, no project-owned image missing alt, one resting shadow and it's the documented one. Someone has been careful here.

And then the front door of a discount retail storefront shows a shopper zero prices, zero products, and eight grey placeholder rectangles, before closing with directions to a car park.

**The single biggest opportunity:** put merchandise on the homepage. One band of the deepest markdowns in the catalogue, in the existing 2-column mobile grid, with the real yellow price tag — and this page stops being a brochure.

## What's Working

**The `.section-separator` is a real design idea, correctly engineered.** `HomePage.scss:98-126` — a filled brand-blue band that sizes to the content it introduces via `@include page-container`, drops to `border-radius: 0` when neighbouring blocks run edge to edge, and scales its type with `clamp()`. It works because it interrupts the scroll with a *colour* change rather than a size change, so it registers peripherally while the thumb is still moving.

**The carousel swaps artwork rather than cropping it.** `EmblaCarousel.jsx:13-31, 54-67` maintains two slide sets — 1920×700 wide, 1080×1080 square — switched by a JS media query with an explicit `reInit()` because the sets differ in slide *count*. Cropping one asset to serve two aspect ratios is how heroes end up with heads cut off; this refuses to. It also drops the autoplay plugin entirely under `prefers-reduced-motion` rather than just shortening it.

**The mobile branches layout is a real re-think.** `HomePage.scss:294-378` strips all panel chrome below `$bp-lg`, reorders the map above the list, and **removes the nested scroller entirely** so the page scrolls as one surface. The comment diagnosing the original bug — a swipe scrolling an inner `max-height: 248px` box instead of the document — is a correct diagnosis and the right fix rather than a workaround.

**Confirmed clean by measurement:** zero horizontal overflow at both viewports, `dir=rtl` correct, exactly one `h1`, no positive `tabindex`, and every project-owned image carries alt text.

## Priority Issues

### [P0] The homepage sells nothing

**What.** Four blocks, none of them merchandise. No `ProductList`, no `ProductPreview`, no `.price-tag`, no sale badge — all exist in the codebase and none is imported here. The carousel is six bare `<img>` tags with **no `<Link>` wrapper** (`EmblaCarousel.jsx:73-78`), so the largest, most attention-grabbing, auto-animating object on the page goes nowhere. The only route to a product is three taps, and tap one lands on a grey placeholder.

**Why it matters.** Casey arrives with no SKU in a short interruptible session, hooked by price. The page gives her nothing priced to react to and nothing tappable that leads to something priced. For the portfolio audience, a reviewer opens the homepage of an "e-commerce storefront" and sees no commerce — the build's strongest work (the price tag, the card grid, the variant selector) is invisible from the front door.

**Fix.** Insert a merchandise band below the carousel and above the tiles: **"המבצעים הגדולים" — 6–8 products sorted by `discountPercent` descending**, in the existing 2-column mobile grid, each carrying the yellow price tag, struck-through `originalPrice`, and red discount badge. All three fields exist on all 40 catalogue rows. Then wrap each carousel slide in a `<Link>`.

**Suggested command:** `/impeccable shape`

### [P1] The first viewport is an unpausable, unclickable, hotlinked carousel for a category the shop doesn't stock

**What.** Four defects on one element. `stopOnInteraction: false` means swiping does not even stop it, and there are no dots, arrows, or slide count. The mobile set is "חורף 2025" — fur slippers, rubber boots, fur gloves, kids' scarves — and the catalogue has **no apparel or footwear department**; in August 2026 that is a year-stale campaign for goods that don't exist. Every slide and the `.welcome` background are **hotlinked from `zolstock.co.il`**, which PRODUCT.md explicitly forbids, and which puts the LCP asset on a third-party host. `EmblaCarousel.jsx:75` sets `loading="lazy"` on that LCP image.

**Why it matters.** Casey's thumb is already moving when the slide she was reading swaps out, and she can't get it back. Jordan reads the hero as the shop's offer, taps it, nothing happens, and concludes the site is broken — then goes looking for a clothing department that will never appear. One third-party outage takes out the hero and the entire first viewport at once.

**Fix.** `stopOnInteraction: true`, add a pause control and ≥44px dot indicators. Replace the winter set with department-led art built from the 8 real departments, self-hosted under `public/`, each slide wrapped in a `<Link>`. `loading="eager"` + `fetchpriority="high"` on slide 1 only.

**Suggested command:** `/impeccable harden`

### [P1] Eight identical placeholders are the category system, and every failure on the page is silent

**What.** Verified in-browser: **all 8 category tile images return 404** (`storage-box.png`, `gift-box-spa.png`, `bath-towel.png`, `acrylic-paints.png`, `surface-cleaner.png`, `springform-pan.png`, `board-game.png`, `screwdriver-set.png`). Every tile falls through to the same grey parcel SVG, including the 2×2 feature tile. Alongside it: `HomePage.jsx:84-95` has no `.catch()`, so one failed query empties the grid permanently; there is no skeleton despite `ProductSkeleton` existing; and the map currently renders **Google's own error box** (`RefererNotAllowedMapError`) at both viewports, because `MapsCmp` has no authored error state.

**Why it matters.** Recognition is the entire purpose of a category tile, and this one returns zero information — the shopper reads eight labels cold. A portfolio reviewer reads eight grey rectangles plus a Google error panel as an unfinished project. And PRODUCT.md is explicit that the photography isn't coming yet.

**Fix.** Design the tiles for the constraint rather than waiting on it: make the department name the artwork — Assistant 800 Hebrew on department-tinted brand blue, no image — so it looks chosen now and still works when photos land. Add a `.catch()` with a retry affordance, a skeleton for the loading state, and an authored fallback in `MapsCmp.jsx:136` (a static branch list with a "open in Google Maps" link) instead of returning `null`.

**Suggested command:** `/impeccable onboard`

### [P1] A permanently focusable invisible button, and desktop hit targets at 25.6px

**What.** `UserMsg.scss` hides the toast with `opacity: 0; translate: 150%` — no `display:none`, no `visibility:hidden`, no `aria-hidden`. Its unlabelled `<button>x</button>` (18.7×17px) therefore sits in the tab order at **position 7 of 9 on mobile** and **21 of 25 on desktop** with no message present. Its transition is `600ms` against DESIGN.md's documented 160ms. Separately, **33 desktop interactive boxes measure under 44×44** — including all 8 primary nav links at **25.6px tall** and the 4 utility-strip links at 33.6px — against DESIGN.md's own 44px icon-button standard. Mobile is far healthier at 4.

**Why it matters.** Sam tabs into an invisible control that announces "x" and does nothing visible. This is the kind of defect no design review catches and no user reports — it just quietly fails an audit. The nav link heights contradict the system's own stated floor on the surface most likely to be inspected.

**Fix.** Gate `UserMsg` on message presence, or add `visibility: hidden` + `aria-hidden` to the hidden state and a real `aria-label` to the dismiss button. Raise the nav link row to the documented 44px minimum.

**Suggested command:** `/impeccable audit`

### [P2] The hero copy invents three departments and omits four

**What.** `HomePage.jsx:157-160` advertises צעצועים, כלי בית, טקסטיל, **מוצרי פארם**, **ציוד משרדי**, **מוצרי חשמל**. The authoritative list (`taxonomy.service.js`, from the chain's own signage) is כלי בית / מתנות / טקסטיל / יצירה / נקיון / אפייה / צעצועים / כלי עבודה. Pharmacy, office supplies and electrical goods do not exist; gifts, crafts, baking and tools go unmentioned. The block also asserts "שירות מקצועי", an unverifiable claim PRODUCT.md forbids, and the `h1` ends in an exclamation mark against DESIGN.md's "cheerfulness comes from the yellow and the air, not from exclamation marks."

**Why it matters.** The hero contradicts the nav, drawer, footer and tiles on the same screen — four surfaces say eight departments, the hero says a different six. That is the fastest possible read as "a template someone forgot to update", which is exactly the "read as a real chain, not a demo" failure PRODUCT.md names.

**Fix.** Rewrite to the eight real departments, drop the service claim and the exclamation mark, and replace the brochure paragraph with the true differentiating fact the page already owns: **74 סניפים, 8 מחלקות**. Move the `h1` above the first `h2` — the DOM order is currently `h2` → `h1` → `h2`.

**Suggested command:** `/impeccable clarify`

## Persona Red Flags

**Casey (distracted one-handed mobile).** The first viewport spends ~519 of 667px on an 88px logo band, a 56px header, and a 375px image that isn't a link — no price, no product, no button. The carousel steals her place: `stopOnInteraction: false` means she half-reads a slide, it advances, she swipes back, it advances again in 5s, and no dot row tells her there are six. The tap she eventually makes is a gamble between eight identical grey squares. And the one persistent thumb-reachable affordance on the page is `ScrollToTopBtn`, whose function is to undo scrolling.

**Jordan (confused first-timer).** The hero teaches him this is a winter clothing shop; nothing in the catalogue is clothing. The single paragraph written to explain the shop contradicts the nav on the same screen, leaving him two mutually exclusive answers to "what do they sell". The tiles return zero recognition. He can scroll the entire homepage without encountering a single ₪ — a shop whose whole proposition is being cheap never demonstrates it. Then the page ends by telling him where to drive. And if he taps דרושים in the drawer (`HamburgerMenu.jsx:237`) he lands on a blank white page with nothing to explain it.

**Riley (stress tester).** Refresh mid-flow loses everything — `selectedRegionId` and `selectedBranchId` are component-local and nothing is in the URL, so finding a branch in a 34-item region and refreshing returns him to all-collapsed with the map re-centred on Israel. One 500 from the API empties the tile grid forever with an unhandled rejection. Expanding צפון renders 34 unvirtualised branch blocks — several thousand pixels of body text with no route back to the map but scrolling. The 74 branch rows are `<div onClick>` with no `role`, no `tabIndex`, and no focus state, so tabbing skips the locator entirely. `.category-tile-label` has no line clamp, so a longer Hebrew label pushes white text out of its bottom-18% scrim into the light part of the image.

**Sam (accessibility-dependent).** Measured, not inferred: an unlabelled focusable button at tab position 7 of 9 on mobile; the carousel has no `role="region"`, no `aria-label`, no `aria-live`, so six image swaps are unannounced; `aria-hidden={isScrolled}` on `.nav-wrap` (`AppHeader.jsx:187`) hides the desktop category nav from assistive tech whenever the page is scrolled; 8 nav links at 25.6px tall; and a heading outline that opens `h2` before `h1`.

## Minor Observations

- **`strong { color: $clr2 }` at `HomePage.scss:402-404` is unnested and therefore global** — it paints every `<strong>` in the entire app high-voltage yellow. Only one exists today (over a dark scrim), so it is latent, not live. The same file carries a long comment nine lines above about a previous global `button:hover { color: $clr2 }` that caused exactly this bug.
- **Radius drops at the wrong breakpoint.** `.section-separator`, `.embla--square .embla__slide` and `.map` drop to radius 0 at `until($bp-lg)` (1200px), but `<main>` only drops its gutter at `until($bp-sm)` (480px). Across the entire 480–1199px band those blocks are inset *and* square-cornered — the exact artifact the comments were written to prevent.
- **Three competing insets in one mobile scroll:** carousel `0` → separator `0` → `.category-tiles` a hand-written `padding-inline: rem(12px)` (bypassing `page-gutter`) → `.welcome` `clamp(1.25rem, 4vw, 3rem)` → map `0`.
- **The 2×2 feature tile leaves a hole.** 8 departments = 1 double + 7 singles, which under-fills the last row at both 2- and 4-column widths; the comment at `HomePage.scss:210-212` still describes the old 5-tile arrangement.
- **Dead CSS:** `.all-products-btn`, `.full-viewport`, the `.gallery2` tablet rule, and a commented-out block. `.all-products-btn` is telling — a "see all products" button was planned for this page and never landed.
- **`AppHeader.jsx:159-160`** — `<a href="">דרושים</a>` and `<a href="">זכיינות</a>` reload the current page.
- **`#branches-map { scroll-margin-top: rem(120px) }`** is a good detail, but `onGoToBranches` uses `block: 'center'`, which ignores `scroll-margin-top` entirely. The two mechanisms disagree.
- **Header shadow alpha drift:** computed `0.1`, DESIGN.md documents `0.08`.
- **`background-attachment: fixed`** on `.welcome` is overridden to `scroll` on `pointer: coarse`, so the comment claiming it "keeps the image moving against the copy" describes behaviour that doesn't happen on the reference device.

## Questions to Consider

1. **If the homepage showed exactly one thing, and that thing were a price — which price would it be, and what would the rest of the page have to become to earn its place beside it?** The page shows zero prices and four blocks. Invert it.
2. **The photography isn't coming this week. What would this page look like if you designed it as though photography were never coming?** Eight grey parcels is what "waiting for photos" looks like. A department wall in Assistant 800 on eight tints of brand blue would look *chosen* — and would still be an upgrade after the photos land.
3. **Why is a store locator the last thing a shopper sees on a shopping homepage?** Peak-end says the closing moment disproportionately colours the memory. This page closes by sending people to a car park. If the branches block moved to its own route, what would you want in that slot?
4. **The brand owns `#FFF200` and the homepage uses it twice, both as text on a photo. What happens if the yellow price tag becomes the page's structural motif rather than a component detail?** The system already calls the tag "the defining object of the storefront." What would it mean for the homepage to be *made of* tags?
