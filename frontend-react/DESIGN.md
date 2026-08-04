---
name: ZolStock Remake
description: Hebrew RTL discount-retail storefront — warehouse economics delivered with consumer-app softness.
colors:
  zolstock-blue: "#1c41b4"
  zolstock-blue-deep: "#173491"
  high-voltage-yellow: "#FFF200"
  markdown-red: "#d32f2f"
  markdown-red-deep: "#c62828"
  ink: "#333333"
  pure-white: "#FFFFFF"
  page-paper: "#F7F8FA"
  cool-ash: "#F1F3F5"
  fog-white: "#F5F5F5"
  quiet-gray: "#777777"
  hairline-gray: "#DDDDDD"
  in-stock-green: "#28a745"
  low-stock-amber: "#a85400"
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
- **Markdown Red** (`#d32f2f`): Strictly factual. Discount badge fill, cart/wishlist count bubbles, the active (saved) heart. Never decorative, never used to imply scarcity that the data does not support. It was `#e53935` — Material Red 600 — which carried white badge text at only 4.23:1; this is Red 700, the next step on the same ramp, at 4.98:1. It is now *darker* than Out of Stock Red rather than lighter, which is a reversal but not a merge: the two remain separate values for the reason given in The Error Red Is Not The Markdown Red Rule.
- **Markdown Red Deep** (`#c62828`): Documented for a discounted price tag with a red tint background that no longer exists — the tag is yellow always (see The Tag Is Yellow Always). **Currently unused in the codebase.** Kept as the bottom of the red ramp rather than retired, since Markdown Red now sits one step above it.

### Neutral
- **Page Paper** (`#F7F8FA`): The page background — a soft off-white, not a lightbox. It is what lets flat white surfaces separate by tone instead of by shadow.
- **Cool Ash** (`#F1F3F5`): Inset zones and image wells, one step below the page.
- **Pure White** (`#FFFFFF`): All elevated surfaces — product cards, the filter sidebar, inputs, the mobile drawer, the product-details canvas.
- **Fog White** (`#F5F5F5`): A legacy neutral still used by the top utility strip. The header itself is opaque white.
- **Ink** (`#333333`): All primary text. Secondary text is the same ink at reduced alpha (`0.78` for supporting lines, `0.6`/`0.55` for muted), not a separate gray.
- **Hairline Gray** (`#DDDDDD`): Empty star glyphs. Borders are `rgba(0,0,0,0.06–0.12)` rather than a named gray.
- **Quiet Gray** (`#777777`): **Currently unused.** It was the review-count colour, at 4.48:1 on white — just under the floor. Review counts, struck-through original prices and card subcategories are all Ink at `0.72` now, which is the alpha that exists precisely to mark that boundary (5.24:1 measured). Kept as a documented value rather than retired, but nothing should reach for it: the Ink ramp already covers this job and passes.

### Status
- **In Stock Green** (`#28a745`), **Low Stock Amber** (`#a85400`), **Out of Stock Red** (`#dc3545`), **Star Gold** (`#ffc107`). These are a functional set, deliberately outside the brand palette so a stock signal is never confused with a brand moment.
- Low Stock Amber was `#f57c00`, which as text on white measured 2.70:1 — the worst contrast in the system, on the one line ("נותרו רק 3!") whose entire job is to be noticed. Material's orange ramp bottoms out at `#e65100` / 3.6:1, so this value is off-ramp by necessity: the same 30° hue, darkened until it cleared the floor at 5.34:1. Star Gold stays bright because it is a glyph fill, never text.

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

The product grid is `repeat(auto-fill, minmax(clamp(rem(165px), 13vw, rem(220px)), 1fr))` with a `rem(12px)` gap, tightening to `rem(10px)` on tablet, and pinned to exactly `repeat(2, minmax(0, 1fr))` with a `rem(8px)` gap on mobile. Two columns on a phone is a decision, not a fallback: it is what makes browsing feel like scanning a shelf.

**`auto-fill`, never `auto-fit`.** `auto-fit` collapses empty tracks to zero and gives their width to whatever survived, so a filter or search returning one product rendered it as a 993px card with a 991px photo — taller than the viewport. Against a 40-product catalogue most Hebrew queries return one to three results, so that was the common path. `auto-fill` holds the empty tracks at their minimum and a single result stays the size it was before the filter narrowed.

**The track minimum is a clamp, not a per-breakpoint value.** A minimum that steps at a breakpoint makes the column count fall exactly where the screen grew: 165px on tablet against 200px on desktop took the shelf from five columns to four between 1023px and 1024px. Growing the track continuously with the viewport keeps the count monotonic everywhere except the one place it cannot be — see the sidebar note under Filter Sheet.

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
- **Border:** Product cards use `$line` (`rgba(0,0,0,0.16)`), darkening to `$line-strong` (`rgba(0,0,0,0.32)`) on hover and to solid `$clr1` on `:focus-within`. The filter panel sits a step lighter at `rgba(0,0,0,0.08)`, because it is furniture rather than content.
- **Shadow Strategy:** None. See Elevation & Depth — cards are flat at rest and flat on hover.
- **Internal Padding:** `10px 12px 12px` on product cards (`8px 10px 10px` below `$bp-sm`), `24px` on panels. Cards are tight on purpose: five to a row at 1440px, the padding is the only thing competing with the photo.
- **Behaviour:** Nothing moves. Hover darkens the hairline and stops there — forty cards in a grid make any movement read as a twitch. Out-of-stock cards drop the image to `0.6` opacity with `grayscale(30%)`.
- **Row alignment:** `.card-body` is a five-row grid — title, meta, slack, price, action — and every child is pinned to a numbered row, so a product missing its subtitle, swatches or stock line leaves that row empty rather than dragging the rest upward. The single `1fr` slack row is row three, not the last: fixed row heights put the leftover space above the meta line, where it read as uneven padding. Collecting it once, below the meta, pins price and button to the bottom edge so they line up across a row regardless of which optional fields each product has.
- **Touch targets:** Every control on a card clears `44px` in both axes — the add-to-cart button by `min-height` (its padding alone gave 32px), the wishlist heart by being `44×44`. The listing toolbar's select, filter field and sheet controls match, so the whole page has one target floor rather than a spread of 32/40/42/46.

### The Card Meta Line
One line under the title carries every secondary fact: subcategory, rating, colour swatches. It truncates rather than wraps, which means whatever sits on it has to actually fit.

**Ratings are compact on cards, full on the product page.** Five 12px star glyphs cost 87px of a 147px meta line on a phone-width card, which left the subcategory 53px of the 67px it needed and truncated four cards in five to `סירים ומ…`. The card renders one star plus the number instead, at 51px, and nothing is lost: at 12px a glyph row cannot express 4.5 against 4.2 — the number always did that work. The five-star display stays on the product page, where it has the size to read as a scale. Measured across all eight departments at six widths, no card truncates its subcategory.

**Value before count.** The rating reads `★ 4.5 (24)`, right to left. The count used to come first, so every card announced how many people rated the product before saying what they rated it.

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

**The Price You Pay Comes First Rule.** In the price row the tag is the first child, so in RTL it sits rightmost and is read first — by eye and by screen reader. The struck-through original follows it, and the stock line is pushed to the far edge. The struck price used to lead, which meant every discounted card stated a number the shopper would *not* be charged before the one they would. The struck price is also Ink at `0.72`, not `#999`: it is quiet, but it is the figure the whole discount is measured against, and `#999` renders it at 2.85:1.

### Search Overlay

There is no permanent search field anywhere. A magnifier in the header opens a full-width panel that drops from the bar's bottom edge, autofocuses, and closes on Escape, on outside click, or on submit — restoring focus to the toggle. One `180ms ease-out` fade-and-drop; nothing else on the page moves. Removing the field is what lets the header be symmetric: two icon clusters against equal gutters at every width, with no middle column to balance.

### Filter Sheet

On the listing page the filter panel is a sidebar column from `$bp-lg` (1200px) up and a right-anchored drawer below it, opened from the toolbar. The drawer is `visibility: hidden` and translated off-canvas when closed — in RTL, `inset-inline-start` is the right edge, and anchoring to the wrong side once left the closed panel sitting over the page silently swallowing every click.

**The sidebar has to pay for itself.** It used to arrive at 1024px at 300px wide, which with its gap took 332px off the grid and left 610px — two tracks that stretched to 299px each. Widening the window from 1023px to 1024px therefore dropped the shelf from five columns to two and inflated every card by 66%, on the landscape tablets and small laptops that sit exactly there. It now arrives at 1200px at `rem(210px)` with a `rem(20px)` gap.

Introducing a permanent column always costs the grid something at the width it appears — the viewport gains one pixel and the shelf loses a whole sidebar — so monotonicity across that single threshold is not achievable. Keeping the loss to one column is: the shelf goes six to five and the cards stay within 15% of their previous size. Any change to the sidebar's width must be re-measured across the full 360–1920 sweep, not spot-checked at one width.

**The drawer covers the screen, and its head does not move.** The panel takes an explicit `100dvh` with `max-block-size: none`. Both are needed: `inset-block: 0` with `height: auto` did not stretch it, and the sidebar's desktop ceiling (`calc(100vh - 88px)`, which keeps the sticky column clear of the header) clipped the drawer 88px short of the bottom at every width. Inside, only the filter list scrolls — with three filter sections it is now taller than a phone screen, and a scrolling header takes the close button with it.

**Visibility steps, it does not ease.** `transition: visibility 220ms` flips the property at the halfway mark, so for the first ~110ms of opening the panel is still `hidden` — and a hidden element cannot take focus, which silently defeated moving focus to the close button. It is `visibility 0s linear 220ms` when closing and `0s linear 0s` when open: visible at once on the way in, waiting out the full slide on the way back.

**The open drawer is a modal, and only then.** It takes `role="dialog"`, `aria-modal`, and `aria-labelledby` **only while open** — the same element is a plain column from `$bp-lg` up, and announcing a static sidebar as a modal would be a lie. Opening moves focus to the close button rather than the first filter, because a panel that has just opened should not look like it has already changed something; closing returns focus to the toolbar button that opened it. Tab cycles inside the panel: without the trap it walked out onto the product links behind the scrim, where focus was invisible and Enter navigated away from a page that still looked open.

One breakpoint is written twice — `(min-width: 75rem)` in a `matchMedia` listener that closes the sheet when the window grows past `$bp-lg`. Without it, a drawer left open while the window widens keeps the page scroll locked and a focus trap running around an ordinary sidebar column. It must track `$bp-lg` in `setup/_breakpoints.scss`.

**The heading is the place, not a label for the place.** The listing H1 read `קטגוריה: כלי בית` — the noun "category" prefixed to a category name, on a page already carrying breadcrumbs that say exactly that — and on a sub-category it printed the full path a second time, so the department name appeared twice within 40px of itself. The heading now names the narrowest thing in view (`סירים ומחבתות`) and the breadcrumbs carry the path. This is the eyebrow/kicker reflex in inline form; the same rule applies anywhere else a heading is tempted to label itself.

### Listing Controls

**The URL Is The Shareable Copy Rule.** The store is the working copy of the filter; the query string is the copy a shopper can link, bookmark, refresh and back out of. A filtered shelf used to survive nowhere — narrow forty products to two, hit reload, get forty. The listing now writes `q`, `min`, `max`, `stock` and `sort` to the address bar and reads them back on arrival. Category and sub-category are deliberately **not** among them: those are route segments (`/category/housewares/cookware`), and duplicating them as params would give the page two disagreeing accounts of where the shopper is.

Both directions of the mapping live in one module so they cannot drift, and both effects open with an equality check so neither can drive the other into a loop. There is one extra guard: at a category change the route lands before the store catches up, so store→URL refuses to write until `filterBy.category` matches the route — without it, a search made in one department is copied onto the next department's address as the shopper walks into it.

**Deliberate acts push; continuous ones replace.** Choosing a sort or toggling in-stock is a single decision, and going back from it is exactly what a shopper means by "undo that", so those push a history entry. Typing in the filter field and dragging the price slider emit a change per keystroke and per pixel — those replace, or several hundred entries would sit between the shopper and the page they arrived from.

**Sorting is a list, not a switch.** `SORT_OPTIONS` builds the `<select>`, maps a token to a filter, and maps a filter back to a token. Adding a sort is adding a row, rather than editing three hard-coded ladders that had to agree. The list now opens with **`הנחה: מהגבוהה לנמוכה`** — this storefront's whole proposition is the markdown, every card carries a discount badge, and there was no way to ask for the deepest one.

**Paging slices what is already loaded.** The product query returns the whole match set in one response, so the page slices locally rather than asking the API for a window. That is not laziness about the API's `pageIdx`/`pageSize` — it is what lets the count line say `מציג 25–48 מתוך 60`, which a server-paginated response cannot, because it only knows the twenty-four rows it sent. When the catalogue outgrows one response this moves to the API and the endpoint will need to return a total alongside the rows.

Page size is 24. **At the catalogue's present size — forty products across eight departments — the paginator never renders**, and that is the correct behaviour rather than a sign it is broken: one page is not a choice, so it gets no control, and the count line drops the range because `מציג 1–5 מתוך 5` is three numbers saying one thing. Verified against an inflated result set: 60 products give three pages, the last holding 12; `?page=99` clamps to the last page rather than showing an empty grid; 300 products give `1 … 6 7 8 … 13`.

`page` lives in the URL but not in the filter — it never reaches the query. The store→URL effect therefore compares only the params the *filter* owns; comparing whole query strings would read `?page=2` as a difference, rewrite the URL without it, and undo every page move on the next render. A genuine filter change does drop the page, which is right: page 3 of a result set that no longer exists is not where the shopper wants to be.

**The Active Filters Line Rule.** Three of the four filters live somewhere the shopper cannot see while looking at the results: below 1200px the price slider and the stock toggle are inside a drawer, and the sub-category shows only as a breadcrumb. A shelf holding two of forty products gave no on-screen account of why. The chips row states each active filter and removes exactly that one — one chip for the price range rather than two, since removing a floor and leaving a ceiling is not a state the shopper built. `נקה הכל` appears only once undoing them one at a time is a chore. The sub-category chip navigates rather than dispatching, because removing it means going up a route.

Chips are the one place on the listing that sits **below the 44px floor**, at 34px, on purpose: every filter a chip removes is also removable from the control that set it, and a row of 44px pills reads as the page's primary navigation, which is precisely what a redundant exit is not.

### Empty & Loading States

**The Empty State Names Its Cause Rule.** A grid with nothing in it is a state the shopper landed in, not a fact to report. `EmptyState` is a white card on the page tone — the same treatment as the products it replaces — carrying a drawn 44px glyph, a title that names *why* it is empty, an optional line echoing the shopper's own choices back to them (`חיפוש: "מגש" · מחיר: 20–50 ₪`), and one 44px exit. The listing's exit is `נקה סינון`, which dispatches the identical action as the filter panel's `ניקוי`: an empty result offering a way out has to undo exactly what the panel would, or the two disagree about what "cleared" means. A department with no products at all is a different situation and gets a different exit (`לכל המחלקות`), because clearing filters would not help.

The list component takes the empty state as a *node*, never a message string. Only the caller knows why its own list came back empty — a filter that matched nothing, a search with no hits and an empty wishlist are three situations with three exits, and the list cannot tell them apart from the outside.

**The Skeleton Is The Card Rule.** Placeholders reuse `.product-card` and `.card-body` wholesale, including the five-row grid, and pin their four lines to the same numbered rows real content occupies — otherwise they auto-place into rows 1/2/3, the price lands in the slack row, and the card comes out short. The heights are measured against what actually renders (19px title, 18px meta, 36px price tag, 44px action), which puts a skeleton card within **0.4px** of the real one, so the shelf does not resize when results arrive. A placeholder that is a different size from the thing it stands in for is worse than no placeholder.

**Skeletons only when the shelf is genuinely bare.** Every keystroke in the in-category filter refetches, so keying the placeholder off `isLoading` alone would blank the whole grid and rebuild it on each letter typed. While results are already on screen the existing `aria-live` count line carries the loading state instead, and the stale results stay put. A search results page has the opposite need — its old results belong to the old query — so it shows skeletons on every load.

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

**The Disabled State Reads By Tone Rule.** The same failure applied to genuinely disabled buttons, where the add-to-cart control on an out-of-stock card carried the word `אזל מהמלאי` in white on `#cccccc` at 1.61:1 with a further `0.7` opacity on top. A disabled control now takes the sunken fill (`$surface-sunken`) with muted ink and a `$line-soft` hairline: inert by tone, at 4.96:1, still shaped like a button, and the same 44px box as its enabled sibling. Never signal "unavailable" by making the word unavailable too.

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
