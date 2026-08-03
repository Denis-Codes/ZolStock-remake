# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: a Hebrew-first Israeli shopper on a phone, browsing for deals. Sessions are short and interruptible — they arrive casually rather than with a specific SKU in mind, and price and discount are the hook that stops the scroll. Mobile is the design-defining context; desktop is the secondary case, not the reference case.

Secondary, real audience: people evaluating Denis Libin's work. This is a portfolio remake of a real brand (see Product Purpose), so the storefront must be convincing as a production retail experience, not merely functional.

## Product Purpose

ZolStock Remake is an unofficial redesign of the storefront for ZolStock, an existing Israeli discount retail chain. It is a portfolio/showcase build — not a commissioned or sanctioned replacement for the chain's live shop.

The product is a full Hebrew RTL e-commerce storefront: browse by category and subcategory, filter and search, inspect a product with variants and specs, save to a wishlist, build a cart, and find a physical branch. Success is a shopper reaching a product they want to buy quickly from a cold, casual mobile entry — and a reviewer reading the result as a real chain's shop rather than a demo.

## Positioning

The product's angle is discount retail across an unusually wide category spread — housewares, gifts, textiles, crafts, cleaning, baking, toys, and tools in one shop. The buying proposition is the markdown itself; a neighboring storefront that hides or de-emphasizes the discount is not selling the same thing.

## Operating Context

- Hebrew RTL throughout; `direction: rtl` is set globally in the base stylesheet.
- One-handed phone use in a casual, distracted setting is the assumed usage scene.
- The chain has physical branches; a Google Maps branch locator is part of the shop (`branches-map`, reachable from the header).
- Existing brand social presence: facebook.com/zolstock, instagram.com/zol_stock (linked from the footer).

## Capabilities and Constraints

Implemented surfaces (routes in `src/RootCmp.jsx`): home, category and subcategory index, product details, search results, cart, wishlist, checkout, order confirmation, order history, login/signup, user details, reviews, chat, admin, about.

Supporting capabilities: sidebar filters, variant selection, star ratings, stock warnings, sale badges, image galleries and carousels (Embla, Slick), toast messages, skeleton loading states.

Cart and wishlist have two backings, chosen per call: a signed-in shopper's live on the server and survive a change of device; a guest's stay in localStorage. Whatever a guest collected merges into their account on login, quantities summed rather than overwritten.

Fixed constraints — future work must not change these:

- **Hebrew RTL is the only locale.** No LTR or English mode is planned; layout may assume RTL permanently.
- **Discount-first pricing display.** `originalPrice`, `salePrice`, and `discountPercent` are core product truth and must stay visible wherever a product appears.
- **Stack and data shape.** React 18 + Vite + Redux (with thunks) + SCSS on the frontend; the Node/Express backend at `localhost:3030` (REST + socket.io) is fixed.
- **Products are keyed by Mongo ObjectId.** The catalogue is served from MongoDB, seeded from `src/data/products.json`, which remains the source of truth for its contents. The `p1001`-style id survives as an indexed `sku` and is what the מק״ט line shows; the API resolves either form, so older product URLs keep working. `VITE_LOCAL=true` still reads the JSON directly with no backend, and the `github` build always does.
- **The server prices everything.** Carts store product references and quantities, never prices; item prices, discounts and delivery are resolved from the catalogue on read and again at checkout. A client cannot state what an order costs.

Undecided / known gaps:

- **Delivery pricing is part placeholder.** The ₪300 free-delivery threshold comes from copy the cart already showed; the flat fee beneath it (currently ₪29, in `backend/api/cart/cart.service.js` and mirrored in `cart.actions.js`) was chosen, not sourced. Confirm before it is presented as the chain's real terms.
- Payment is simulated. No gateway is wired up and no card details are collected or stored; an order records a `SIM-` reference and is marked paid. The checkout screen says so in plain Hebrew.
- `score` on a user is a leftover from the starter template. It is server-owned (only an admin can set it) and nothing spends it; whether it becomes real store credit is undecided.
- `src/pages/AboutUs.jsx` has been rewritten from the starter-template boilerplate into real Hebrew copy (departments list, branch CTA). It deliberately makes no claims about founding dates, store counts, or history, since none are known — future work must not invent them.
- `index.html` still carries the Vite starter title and favicon.
- The footer's shortcut links (branches, accessibility, terms, privacy, returns, contact) point nowhere; whether those pages will exist is undecided.

## Brand Commitments

- Name: ZolStock (זול סטוק). Logo asset: `src/assets/styles/img/logo.png`.
- **Brand palette is real and frozen:** blue `#1c41b4` and yellow `#FFF200`, taken from the actual ZolStock identity. Future work must not alter, re-shade, or "improve" them. Supporting neutrals are not brand-frozen.
- Typeface: Assistant (Google Fonts), a Hebrew-first family. Alternates (Heebo, Rubik, Alef, Varela Round) are commented out in `_variables.scss` as a deliberate shortlist.
- Authorship credit in the footer: "Made by Denis Libin".

## Evidence on Hand

- The chain's real departments are כלי בית (housewares), מתנות (gifts), טקסטיל (textiles), יצירה (crafts), נקיון (cleaning), אפייה (baking), צעצועים (toys), and כלי עבודה (tools). Supplied by the repo owner from the chain's own signage; this is the authoritative list and `src/services/taxonomy.service.js` is its single source in code. An earlier catalogue used an invented five (furniture / clothing / electronics / kitchen / pets) that matched no real shop.
- `src/data/products.json` — 40 products, five per department, with Hebrew display names, ILS pricing, subcategories, specs, and variants. **This is placeholder data.** Product names, brands (e.g. "HomeLab", "ToolCraft"), ratings, review counts, and stock quantities are invented and must never be presented as real ZolStock facts or cited as evidence anywhere in copy. Only the department names are real.
- **There is currently no product photography.** All 40 rows reference files under `public/assets/img/products/` that do not exist; a drawn placeholder stands in for each. `IMAGES.md` is the sourcing manifest. Future work must not describe the catalogue as illustrated or photographed until those files land, and must not source them from the real chain's site.
- ~23 images from the previous invented catalogue remain in `public/assets/img/products/` and are referenced by nothing.
- Playwright smoke tests, including mobile coverage, exist in the repo.
- No real customer testimonials, sales figures, press, or partnership claims exist. Future work must not fabricate any.

## Product Principles

1. **The markdown is the merchandise.** Price, original price, and percent off travel together everywhere a product appears; never let a layout bury the saving.
2. **Design at arm's length, one-handed.** Mobile Hebrew RTL is the reference case for every decision; desktop adapts from it, not the other way round.
3. **Breadth without disorientation.** Eight loosely related departments share one shop — navigation and filtering must make the range feel deliberate rather than scattered.
4. **Read as a real chain, not a demo.** Placeholder data may sit behind the interface, but nothing in the experience should feel like a template or a stub.
5. **The brand marks are inherited, not authored.** ZolStock's blue, yellow, name, and logo are fixed inputs; expression happens in everything around them.
