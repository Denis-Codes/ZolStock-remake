---
name: ZolStock Remake
description: Hebrew RTL discount-retail storefront — warehouse economics delivered with consumer-app softness.
colors:
  zolstock-blue: "#1c41b4"
  zolstock-blue-deep: "#173491"
  high-voltage-yellow: "#FFF200"
  markdown-red: "#e53935"
  markdown-red-deep: "#c62828"
  ink: "#333333"
  pure-white: "#FFFFFF"
  page-paper: "#F7F8FA"
  cool-ash: "#F1F3F5"
  fog-white: "#F5F5F5"
  quiet-gray: "#777777"
  hairline-gray: "#DDDDDD"
  in-stock-green: "#28a745"
  low-stock-amber: "#f57c00"
  out-of-stock-red: "#dc3545"
  star-gold: "#ffc107"
typography:
  display:
    fontFamily: "Assistant, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(2.1rem, 3.4vw, 3.8rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02rem"
  headline:
    fontFamily: "Assistant, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01rem"
  title:
    fontFamily: "Assistant, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "normal"
  price:
    fontFamily: "Assistant, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.6px"
  body:
    fontFamily: "Assistant, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Assistant, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.zolstock-blue}"
    textColor: "{colors.pure-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.zolstock-blue-deep}"
    textColor: "{colors.pure-white}"
  button-primary-disabled:
    backgroundColor: "#cccccc"
    textColor: "{colors.pure-white}"
  button-primary-success:
    backgroundColor: "{colors.in-stock-green}"
    textColor: "{colors.pure-white}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.zolstock-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.zolstock-blue}"
    textColor: "{colors.pure-white}"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.zolstock-blue}"
    rounded: "{rounded.md}"
    width: "44px"
    height: "44px"
  price-tag:
    backgroundColor: "{colors.high-voltage-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.price}"
    rounded: "{rounded.lg}"
    padding: "8px 14px"
  sale-badge:
    backgroundColor: "{colors.markdown-red}"
    textColor: "{colors.pure-white}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  product-card:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px 16px 18px"
  surface-panel:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-text:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "46px"
  input-search:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 48px 0 14px"
    height: "48px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.zolstock-blue}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "52px"
  nav-link-hover:
    backgroundColor: "{colors.high-voltage-yellow}"
    textColor: "{colors.zolstock-blue}"
  chip:
    backgroundColor: "rgba(28, 65, 180, 0.08)"
    textColor: "{colors.zolstock-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.35rem 0.6rem"
---

# Design System: ZolStock Remake

## Overview

**Creative North Star: "The Soft Warehouse"**

ZolStock sells cheap goods across five unrelated departments, and the interface never pretends otherwise. Underneath, the logic is blunt warehouse economics: a struck-through original price, a percentage off, a count of how many are left on the shelf. On the surface, all of it arrives with the calm of a well-made consumer app — squared-off corners, a page that breathes, motion you notice only when it is absent. That tension is the entire system. Hard numbers, soft delivery.

The gut feeling to protect is **trustworthy, cheerful, effortless**. This is a big chain you can rely on, not a flash-sale site trying to panic you into buying. The deal is *stated*, plainly and legibly, and then the interface gets out of the way. Red exists here, but as a factual marker of markdown and stock risk — never as manufactured urgency. Cheerfulness comes from the yellow and the air, not from exclamation marks.

Everything is Hebrew RTL and thumb-first. The product card is the atom of the whole storefront: a square photo on white, two lines of clamped title, colour swatches, a rating, a stock line, a price, and a way to buy — repeated in a grid that reflows from two columns on a phone to as many as the viewport allows. If a decision does not survive being repeated forty times in that grid at 375px, it is the wrong decision.

**Key Characteristics:**
- Soft off-white page, white surfaces, a squared-off 4–8px radius scale
- One saturated brand blue carrying every interactive affordance
- A filled yellow price tag as the single loudest element on any product surface — at every size, discounted or not
- Square 1:1 product media, scale-normalised per image so no product renders larger than another
- One motion duration (160ms) and one curve; hovers change colour, never position
- Flat surfaces: exactly one shadow exists, and only true overlays may use it

## Colors

A two-note brand — a deep saturated blue and a near-fluorescent yellow — sitting on a cool, almost-white gray, with red reserved strictly for factual markdown and stock signals.

### Primary
- **ZolStock Blue** (`#1c41b4`): The load-bearing colour of the entire interface. Every interactive affordance is blue — nav links, the search icon on focus, cart and wishlist glyphs, the add-to-cart fill, filter clear buttons, price-slider track and thumbs, the branches CTA, the scroll-to-top button. It is also the fill behind the big logo lockup. **Frozen brand value; see the Fixed Palette Rule.**
- **ZolStock Blue Deep** (`#173491`): The pressed/hover state of any blue fill. It is the compiled output of `darken($clr1, 8%)`; a `darken($clr1, 5%)` variant (`#19399E`) appears on the scroll-to-top button.

### Secondary
- **High-Voltage Yellow** (`#FFF200`): Used sparingly and always as a *fill*, never as a floating text colour. It backs the product price tag, fills the nav-link hover state, colours the hero headline over a dark photo scrim, and lights social icons when their blue circle fills on hover. Its job is to be the brightest object in the frame exactly once per card. **Frozen brand value.**

### Tertiary
- **Markdown Red** (`#e53935`): Strictly factual. Discount badge fill, cart/wishlist count bubbles, the active (saved) heart. Never decorative, never used to imply scarcity that the data does not support.
- **Markdown Red Deep** (`#c62828`): Text colour inside the discounted price tag, where the red tint background needs a darker foreground to hold contrast.

### Neutral
- **Page Paper** (`#F7F8FA`): The page background — a soft off-white, not a lightbox. It is what lets flat white surfaces separate by tone instead of by shadow.
- **Cool Ash** (`#F1F3F5`): Inset zones and image wells, one step below the page.
- **Pure White** (`#FFFFFF`): All elevated surfaces — product cards, the filter sidebar, inputs, the mobile drawer, the product-details canvas.
- **Fog White** (`#F5F5F5`): A legacy neutral still used by the top utility strip. The header itself is opaque white.
- **Ink** (`#333333`): All primary text. Secondary text is the same ink at reduced alpha (`0.78` for supporting lines, `0.6`/`0.55` for muted), not a separate gray.
- **Quiet Gray** (`#777777`) and **Hairline Gray** (`#DDDDDD`): Review counts and empty star glyphs respectively. Borders are `rgba(0,0,0,0.06–0.12)` rather than a named gray.

### Status
- **In Stock Green** (`#28a745`), **Low Stock Amber** (`#f57c00`), **Out of Stock Red** (`#dc3545`), **Star Gold** (`#ffc107`). These are a functional set, deliberately outside the brand palette so a stock signal is never confused with a brand moment.

### Named Rules

**The Fixed Palette Rule.** ZolStock Blue (`#1c41b4`) and High-Voltage Yellow (`#FFF200`) are the real chain's colours. They are never re-shaded, never nudged toward a nicer neighbour, never swapped for a token that renders differently. Any refactor that touches them must diff the compiled hex before and after.

**The Yellow Needs A Bed Rule.** High-Voltage Yellow at `#FFF200` fails against white — it has been fixed as a legibility bug twice already in this codebase (see the comments in [ProductDetails.scss](src/assets/styles/pages/ProductDetails.scss) and [AppHeader.scss](src/assets/styles/cmps/AppHeader.scss)). Yellow is only ever a fill under dark text, or text sitting on blue, a dark scrim, or a photo. Yellow text on a light surface is a defect, not a style choice.

**The Red Means Fact Rule.** Red states something true from the data — a real discount percentage, a real low-stock count, a real item count in the cart. It is never used to decorate, alarm, or invent urgency.

## Typography

**Display Font:** Assistant (Google Fonts; fallback `-apple-system, BlinkMacSystemFont, sans-serif`)
**Body Font:** Assistant — the same family throughout
**Label/Mono Font:** none; labels are Assistant at heavier weight and smaller size

**Character:** Assistant is a Hebrew-first humanist sans that stays even-toned across the 200–800 range, which is why one family carries the whole system. Hierarchy comes from weight and size, never from a second typeface. Five alternates (Heebo, Rubik, Alef, Open Sans, Varela Round) sit commented out in [_variables.scss](src/assets/styles/setup/_variables.scss) as a deliberate shortlist — a switch is a one-line change, so no component may hardcode a family.

### Hierarchy
- **Display** (700, `clamp(2.1rem, 3.4vw, 3.8rem)`, 1.15, `-0.02rem`): The homepage hero headline only. Rendered in yellow over a darkened photo.
- **Headline** (700, `2.6rem`, 1.1, `-0.01rem`): The product-details title, and the matching large price beside it.
- **Title** (800, `~1.25rem`): Section heads and panel headers — the filter sidebar's heading, drawer headings. Weight 800 is what distinguishes a title from body at similar sizes.
- **Price** (800, `1.75rem`, 1, `-0.6px`): The whole-shekel figure inside a price tag. The currency mark and agorot ride at `0.875rem` alongside it, the agorot lifted `-8px` to sit as a superscript.
- **Body** (400, `1.125rem` base, 1.6): Page copy. Inside cards and dense controls, body steps down to `0.8125–1rem` — the card is a denser typographic environment than the page.
- **Label** (600–700, `0.6875–0.875rem`): Field labels, stock warnings, badge text, swatch counts, meta lines.

### Named Rules

**The One Family Rule.** Assistant does every job. If something needs to feel different, change weight (400 → 700 → 800) or size, never the typeface.

**The Two-Line Clamp Rule.** Product titles clamp to exactly two lines (`-webkit-line-clamp: 2`). Cards in a grid must never disagree about their own height because one product has a longer name.

**The LTR Price Rule.** Prices are numerals inside an RTL document, so the price tag and strikethrough price both force `flex-direction: row-reverse` to lock ₪ → whole → agorot in reading order. Never let a price inherit ambient direction.

## Layout

The app is a three-column grid shell (`.main-container`, `0 1fr 0`) where content lands in the middle column and anything marked `.full` — the header, the footer, the hero — spans edge to edge. Page insets are owned by one mixin, `page-gutter`: `padding-inline: clamp(1rem, 4vw, 10rem)`, applied to `<main>`, the header, and the footer so all three align at every width. Sections must not re-apply their own inline padding on top of it; `.welcome` documents this in a comment.

Breakpoints come from a single source, [_breakpoints.scss](src/assets/styles/setup/_breakpoints.scss), and are used through the `until` / `from` / `between` mixins rather than raw media queries: mobile ≤ 480px, tablet 600–1024px, desktop 1200–1920px, ultra ≥ 2560px, plus a 4K step at 3840px. Legacy `for-mobile-layout` style mixins still exist but are aliases onto the same values — one system, two vocabularies. Every breakpoint in the header now comes from that scale; the category nav gives way to the hamburger drawer at `$bp-lg` (1200px).

The header is its own three-column grid, and its columns are **content-sized on both sides** (`auto minmax(0, 1fr) auto`). This is load-bearing rather than incidental: the category nav needs ~535px and the left actions ~326px, so symmetric `1fr` columns starved the nav by roughly 200px that sat unused opposite it — the nav overflowed its column from 1600px down and physically collided with the search bar at 1366px and below. Content-sized columns give each side exactly what it needs and hand the remainder to the search field. The cost, accepted deliberately, is that the search bar centres within the leftover space rather than on the viewport (about 105px off true centre on wide screens); centring it exactly would require equal side columns, which cannot fit the nav below ~1640px.

Spacing is a 4px-derived scale expressed through the `rem()` function — `rem(4px)` through `rem(32px)` covers almost everything, with `clamp()` used for anything that must breathe across the full range. Below 480px `<main>` drops its inline padding to zero and lets cards run to the edge.

The product grid is `repeat(auto-fit, minmax(rem(260px), 1fr))` with a `rem(32px)` gap, tightening to `minmax(rem(210px), 1fr)` / `rem(20px)` on tablet, and pinned to exactly `repeat(2, minmax(0, 1fr))` with a `rem(14px)` gap on mobile. Two columns on a phone is a decision, not a fallback: it is what makes browsing feel like scanning a shelf.

**The One Gutter Rule.** `page-gutter` is the only source of page inset. A component that needs to align with the header aligns by inheriting it, not by guessing a matching value.

## Elevation & Depth

Depth is tonal, not cast. White surfaces on a soft off-white page do all the separating, helped by a hairline border. **Surfaces are flat at rest — there is no resting shadow anywhere in the system**, and hover never adds one.

Exactly **one** shadow token exists, and only genuinely floating layers may use it: the category dropdown, the mobile drawer, the search overlay, and the filter sheet. The sticky header separates with a 1px hairline rather than a shadow; the translucent 50px-blur glass it once used was decoration and is gone.

### Shadow Vocabulary
- **Overlay** (`0 4px 16px rgba(0,0,0,0.12)`): The only shadow. Dropdown, drawer, search overlay, filter sheet.
- **Header hairline** (`0 1px 0 rgba(0,0,0,0.08)`): Not a shadow so much as a rule; separates the sticky bar from content passing under it.
- **Focus ring**: An `outline` in ZolStock Blue at 2px with 2px offset — not a shadow. Focus is never removed without a replacement.

**The Flat-At-Rest Rule.** If a surface is not floating above the page, it casts nothing. A card earns its edge from a hairline and the page tone behind it. Adding a resting shadow to a new component is a regression.


## Shapes

Squared off, consistently. The whole system lives between **4px and 8px**: `4px` on badges and chips, `6px` on buttons, inputs and the price tag, `8px` on cards, panels and media frames. Bigger surfaces no longer get bigger corners — a 44px button and a full product card are the same family. Pills (`999px`) survive only on status chips; circles on avatars, swatches, slider thumbs and social icons.

Anything that runs edge to edge on a phone drops its radius to **0** — the carousel, the section separators, the map, the branch list. A rounded corner against the screen edge reads as a mistake.

Borders are hairlines at low alpha (`rgba(0,0,0,0.08)`–`rgba(0,0,0,0.12)`), darkening to `rgba(0,0,0,0.20)` on hover. A border changing colour is a complete state signal on its own.

Product media is always a `1 / 1` square with `object-fit: contain` on a **white** frame matching the artwork's own canvas, and each image carries a measured scale correction (see Components) so every product's longest side lands at the same share of the tile.

**The Radius Is Flat Rule.** Do not scale the corner with the component. Pick from `sm`/`md`/`lg` by role, not by size.


## Components

The shared character is **tactile and confident**, but the confidence is in weight and colour, not movement. States are visible rather than implied; nothing lifts, scales or bounces. Every interactive target is at least 44px.

### Buttons
- **Shape:** Softly rounded (`8–14px`); the pill radius is reserved for the outline/filter variant.
- **Primary:** ZolStock Blue fill, white text, weight 600. Three sizes — small (`8px 14px` / 13px), medium (`10px 18px` / 14px), large (`14px 28px` / 16px, full-width). The large variant is the product-details buy action.
- **Hover / Focus:** Fill darkens to `#173491`. That is the whole hover — no lift, no shadow, no scale. Focus-visible draws a 2px ZolStock Blue outline at 2px offset.
- **States:** Disabled goes flat `#cccccc` at 0.7 opacity with `cursor: not-allowed`. Loading swaps the label for a 2px white spinner at `0.6s linear`. Success flips the fill to In Stock Green and pops a check at `scale(0 → 1.2 → 1)` over 300ms — the buy button confirms itself rather than relying on a toast.
- **Outline:** Transparent fill, blue text, `rgba($clr1, 0.35)` border, pill radius, 36px tall. Inverts to a solid blue fill with white text on hover. Used for destructive-but-safe actions like clearing filters.
- **Ghost / Icon:** 44×44 transparent square at `12–14px` radius; background fades in at `rgba($clr1, 0.1)` on hover.

### Chips
- **Style:** `rgba($clr1, 0.08)` fill, blue text, pill radius, `0.35rem 0.6rem` padding. Used for product tags.
- **Stock chips:** Same pill shape, colour-coded from the status set — never from the brand palette.

### Cards / Containers
- **Corner Style:** `8px` on product cards and on panels alike; `0` wherever a block runs edge to edge on a phone.
- **Background:** Pure White on Cool Ash.
- **Border:** `1px solid rgba(0,0,0,0.08)`, warming to `rgba($clr1, 0.18)` on hover and `rgba($clr1, 0.5)` on `:focus-within`.
- **Shadow Strategy:** None. See Elevation & Depth — cards are flat at rest and flat on hover.
- **Internal Padding:** `16px 16px 18px` on cards, `24px` on panels (`18px` on mobile).
- **Behaviour:** Nothing moves. Hover darkens the hairline and stops there — forty cards in a grid make any movement read as a twitch. Out-of-stock cards drop the image to `0.6` opacity with `grayscale(30%)`.
- **Row alignment:** `.card-body` declares all seven rows explicitly and every child is pinned to a numbered row, so a product missing its subtitle, swatches or stock line leaves that row empty rather than dragging the rest upward. Buttons and price tags line up across a row regardless of which optional fields each product has.

### Inputs / Fields
- **Style:** White fill, `1px` hairline border, `12–14px` radius, `44–46px` tall.
- **Focus:** Border shifts to `rgba($clr1, 0.55)` and a `0 0 0 4px rgba($clr1, 0.12)` halo appears; the native outline is removed and replaced, never just removed.
- **Search:** The magnifier sits absolutely at the field's right edge (RTL leading edge) and tints blue with a `1.06` scale on `:focus-within` — the field's focus state animates its own icon.

### Navigation
- **Desktop:** An opaque sticky bar under a blue logo band, laid out as two flex clusters against equal gutters. Category links are blue, weight 600, in 52px-tall rows; hovering fills the row with High-Voltage Yellow and rotates the chevron 180°. Dropdowns are white panels at `8px` radius carrying the overlay shadow, laid out as an 8-row column-flow grid.
- **Scrolled:** An `IntersectionObserver` on a 1px sentinel triggers `.is-scrolled`, which fades in a mini-logo sized to sit inside the 44px control row. The nav no longer collapses — with search behind a toggle there is nothing competing for the room.
- **Mobile (<1200px):** Nav collapses to a 44px hamburger at `rgba($clr1, 0.08)`. The drawer slides from the right (RTL) at `min(84vw, 360px)` over a `rgba(0,0,0,0.45)` scrim, with accordion subcategories animating via `max-height`.
- **Stacking:** `.nav-wrap` carries `transform: translateY(0)` for its collapse animation, and any non-`none` transform creates a stacking context — which makes the dropdown's own `z-index: 9999` inert. The nav layer therefore declares `position: relative; z-index: 20` against the search bar's `z-index: 10`. Removing either number puts open menus back underneath the search field.

### The Price Tag (signature component)
The defining object of the storefront: a filled, self-sized tag of High-Voltage Yellow at `6px` radius with `6px 12px` padding, containing three typographic parts — the ₪ mark at `14px`/0.9 opacity, the whole shekels at `28px`/800 with `-0.6px` tracking, and the agorot at `14px` lifted `-8px` as a superscript. Agorot are omitted entirely when they are `00`. The whole tag forces LTR ordering inside the RTL page and carries an `aria-label` spelling the price out in Hebrew.

**The tag is yellow always — resolved.** A discount does not change its fill. The markdown is carried by the red corner badge and the struck-through original price beside it. The earlier behaviour flipped the tag to a red tint, which meant a row of cards showed two different coloured blobs and the brand mark disappeared exactly where the saving mattered most. The product page uses the same tag at a larger size rather than bare red text.

### Search Overlay

There is no permanent search field anywhere. A magnifier in the header opens a full-width panel that drops from the bar's bottom edge, autofocuses, and closes on Escape, on outside click, or on submit — restoring focus to the toggle. One `180ms ease-out` fade-and-drop; nothing else on the page moves. Removing the field is what lets the header be symmetric: two icon clusters against equal gutters at every width, with no middle column to balance.

### Filter Sheet

On the listing page the filter panel is a sidebar column from 1024px up and a right-anchored drawer below it, opened from the toolbar. The drawer is `visibility: hidden` and translated off-canvas when closed — in RTL, `inset-inline-start` is the right edge, and anchoring to the wrong side once left the closed panel sitting over the page silently swallowing every click.

### Product Media Normalisation

The product shots are all 1024×1024, but each subject fills a different share of its own canvas (75%–97%), so identical tiles rendered products at visibly different sizes. `src/data/product-image-fit.json` holds a measured per-file scale and centring offset, applied as CSS custom properties, putting every product's longest side at the same share of the frame. Regenerate with `npm run gen:image-fit` after changing any product photo. Unmapped files fall back to `scale(1)`.

### The Order Manifest

The checkout's right-hand companion: a white panel listing every line as a 56px square thumbnail with the quantity riding its inline-start corner as a blue pill, the title clamped to two lines, and the line sum pinned to the far edge. Below the lines sit the totals — products, savings, delivery — and then the price tag carrying the grand total.

It is `position: sticky` from `$bp-lg` up, and its offsets clear the sticky header rather than the viewport top: `top: rem(72px)` with `max-height: calc(100vh - rem(88px))`, the same pair `ProductIndex.scss` uses for the filter sidebar. Anchoring at `24px` tucks the panel's own heading under the opaque bar and overshoots the viewport by the header's height, pushing the total below the fold.

The manifest is a reference, not an editor — no quantity steppers, no remove buttons. Changing the order means going back to the cart.

### The Docked Action Bar

Below `$bp-lg` the checkout's primary action leaves the form and docks: a fixed bar at the block-end edge carrying the total on the inline-start side and the submit button on the other, with `padding-block-end: max(12px, env(safe-area-inset-bottom))` for the home indicator. The page adds matching bottom padding so the last field is never trapped under it.

The button sits outside the `<form>` in the DOM and is associated by `form="checkout-form"` rather than by nesting.

**The Dock Owns The Corner Rule.** A docked bar is only honest if nothing covers it. The scroll-to-top button is `position: fixed` at the inline-start bottom corner with `z-index: 999999` and portals to `<body>`, so it landed directly on top of the total — and no CSS scoping can reach a portal. Any route that docks an action suppresses competing fixed furniture at the render site (`RootCmp`), not in stylesheets.

### Form Fields

White fill, hairline border, `$r-md`, 46px tall, `font-size: 16px` — below 16px iOS zooms the page on focus. Labels sit above at 13px/700, with an optional-marker at 11px in muted ink.

**The Error Red Is Not The Markdown Red Rule.** Invalid fields and their messages use `$out-of-stock-red`, never `$markdown-red`. In this system red-as-markdown means *you are saving money*; an invalid field borrowing the discount colour tells the shopper the opposite of what it means. `_variables.scss` already documents `$out-of-stock-red` as the form-error token.

The invalid state must be declared on `:focus` and `:focus-visible` as well as at rest: `.field input:focus` (0,2,1) outranks `.field--invalid input` (0,1,1), so without it, focusing a bad field turns its border blue again and drops the only signal that it is still wrong. Focus draws the blue halo **or** the outline, never both — declaring one on `:focus` and the other on `:focus-visible` fires both for keyboard users and paints a concentric double ring.

Submit buttons are never disabled on validity. A greyed-out primary action gives the shopper nothing to act on; submitting an incomplete form marks every problem, focuses the first, and names each one. Disabled is reserved for states the shopper cannot resolve by typing.

**The Loading State Keeps Its Fill Rule.** A button that is working keeps its blue and swaps its label for the white spinner. Greying it out renders white on `#cccccc` at roughly 1.5:1 — illegible at exactly the moment a shopper most needs to know something is happening.

### Money

Prices are never rounded to whole shekels. 38 of the 40 catalogue products are priced with agorot, so `toFixed(0)` printed ₪119 for an order that charged ₪118.80 — under the label שולם. `src/services/money.service.js` is the single formatter: `formatMoney()` for prices in a run of text, `moneyParts()` for the composed tag, `moneyAriaLabel()` for the spoken form. Agorot are omitted only when they are genuinely `00`.

The tag reverses **once**. `dir="ltr"` on the element and `flex-direction: row-reverse` in CSS cancel each other out — applying both rendered `119₪` while the rows above it rendered `₪130`.

## Do's and Don'ts

### Do:
- **Do** put every interactive affordance in ZolStock Blue (`#1c41b4`). One colour means one meaning: this responds to you.
- **Do** run edge-to-edge blocks at radius `0` on phones, and give the sections beside them a matching inset.
- **Do** regenerate `product-image-fit.json` (`npm run gen:image-fit`) after changing a product photo.
- **Do** give High-Voltage Yellow a dark bed — a fill under dark text, or text over blue or a photo scrim. Never yellow text on a light surface.
- **Do** keep the product card at two clamped title lines so grid rows stay honest.
- **Do** force LTR ordering (`flex-direction: row-reverse`) on anything containing a price or a numeral run.
- **Do** reach for the `until` / `from` / `between` mixins and the `rem()` function; both exist precisely so raw px and raw media queries don't reappear.
- **Do** route page insets through the `page-gutter` mixin so header, main and footer stay aligned.
- **Do** size every touch target at 44px or larger — this system is thumb-first before it is anything else.
- **Do** honour `prefers-reduced-motion`; the header already does, and new motion must follow.
- **Do** let a coloured element cast a shadow tinted to its own colour.

### Don't:
- **Don't** alter, re-shade, or "improve" `#1c41b4` or `#FFF200`. They are the real chain's marks. Diff the compiled hex on any refactor that touches them.
- **Don't** introduce a second typeface. Assistant does every job; hierarchy is weight and size.
- **Don't** add a resting shadow to any surface, or a hover shadow to any. One overlay shadow exists and only floating layers may use it.
- **Don't** animate position, scale or size on hover. Colour, background and border only, at 160ms.
- **Don't** use Markdown Red for anything the data doesn't support. No invented scarcity, no decorative red.
- **Don't** crop product photography. Media is `1 / 1` with `object-fit: contain`, always.
- **Don't** invent a new breakpoint. The scale is centralised and the header now uses it end to end — reach for `$bp-lg` and its siblings, not a hand-written px value.
- **Don't** assume `inset-inline-end` is the left edge. This document is RTL: inline-start is the right edge, and getting it backwards puts an off-canvas panel over the page.
- **Don't** fix an overlap by hiding the thing that overlaps. The header's nav once collapsed a full 360px early to dodge a stacking bug; the bug outlived the workaround. Find the stacking context or the starved column first.
- **Don't** remove a focus outline without replacing it with the blue halo.
- **Don't** add `!important`. Exactly one exists — [AppHeader.scss:949](src/assets/styles/cmps/AppHeader.scss#L949), cancelling transitions under `prefers-reduced-motion`, where overriding every transition is the point. That is the only justified case.
- **Don't** collapse the mobile product grid to one column. Two columns at 375px is the intended shelf-scanning density.
