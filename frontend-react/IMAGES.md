# Product image manifest

Generated from `src/data/products.json` — do not hand-edit; regenerate if the
catalogue changes.

The catalogue was rebuilt around the chain's eight real departments before the
photography existed. **All 40 files below are now in place** — the generated
set from `src/assets/styles/img/Product Images for ZolStock/` was matched to
each product by eye and copied in under the filenames listed in the table.
The placeholder fallback (`onProductImageError` in
`src/services/util.service.js`) stays wired up and still covers the orphaned
images at the bottom of this file.

## What each file needs

- **Path:** `public/assets/img/products/<filename>`
- **Format:** PNG, square (1:1), ideally 1000×1000 or larger
- **Framing:** the product isolated on a white or very light neutral ground.
  DESIGN.md renders media at `object-fit: contain` and forbids cropping, so a
  lifestyle shot with a busy background will letterbox badly.
- **Licence:** must permit commercial/portfolio use. Pexels, Unsplash, Pixabay
  and Openverse all qualify. **Do not** use photography from the real ZolStock
  site — this is an unofficial remake (see PRODUCT.md) and those images are
  copyrighted.

## After the files are in place

```
npm run gen:image-fit
```

This measures each photo's subject-to-canvas ratio and writes
`src/data/product-image-fit.json`, so products with different framing still
render at a consistent visual size. Skipping it leaves everything at
`scale(1)`, which is functional but visually uneven.

Already run for the current set — 63/63 images mapped, scale range
0.841 .. 1.196. Re-run it if any product photo is swapped out.

## Files

Each search term links straight to a Pexels search. Swap `pexels.com/search/`
for `unsplash.com/s/photos/` or `pixabay.com/images/search/` if nothing there
fits — all three permit commercial use.

| # | Filename | Product (he) | Department | Search (opens Pexels) |
|---|---|---|---|---|
| 1 | `storage-box.png` | קופסת אחסון 30 ליטר | כלי בית | [plastic storage box with lid](https://www.pexels.com/search/plastic%20storage%20box%20with%20lid/) |
| 2 | `serving-tray.png` | מגש הגשה עץ | כלי בית | [wooden serving tray](https://www.pexels.com/search/wooden%20serving%20tray/) |
| 3 | `glass-tumblers.png` | סט 6 כוסות זכוכית | כלי בית | [set of drinking glasses](https://www.pexels.com/search/set%20of%20drinking%20glasses/) |
| 4 | `frying-pan.png` | מחבת טפלון 28 ס״מ | כלי בית | [nonstick frying pan](https://www.pexels.com/search/nonstick%20frying%20pan/) |
| 5 | `dinner-plates.png` | סט 12 צלחות ארוחה | כלי בית | [stack of white dinner plates](https://www.pexels.com/search/stack%20of%20white%20dinner%20plates/) |
| 6 | `gift-box-spa.png` | מארז מתנה ספא | מתנות | [spa gift set box](https://www.pexels.com/search/spa%20gift%20set%20box/) |
| 7 | `scented-candle.png` | נר ריחני בכוס זכוכית | מתנות | [scented candle in glass jar](https://www.pexels.com/search/scented%20candle%20in%20glass%20jar/) |
| 8 | `photo-frames.png` | סט 3 מסגרות תמונה | מתנות | [picture frame set](https://www.pexels.com/search/picture%20frame%20set/) |
| 9 | `gift-wrap.png` | סט גלילי נייר עטיפה | מתנות | [gift wrapping paper rolls](https://www.pexels.com/search/gift%20wrapping%20paper%20rolls/) |
| 10 | `ceramic-vase.png` | אגרטל קרמיקה לבן | מתנות | [white ceramic vase](https://www.pexels.com/search/white%20ceramic%20vase/) |
| 11 | `bath-towel.png` | מגבת רחצה 70x140 | טקסטיל | [folded bath towel](https://www.pexels.com/search/folded%20bath%20towel/) |
| 12 | `bedding-set.png` | סט מצעים זוגי | טקסטיל | [folded bed linen set](https://www.pexels.com/search/folded%20bed%20linen%20set/) |
| 13 | `shaggy-rug.png` | שטיח שאגי 120x170 | טקסטיל | [shaggy area rug](https://www.pexels.com/search/shaggy%20area%20rug/) |
| 14 | `cushion-cover.png` | ציפית כרית נוי 45x45 | טקסטיל | [decorative cushion cover](https://www.pexels.com/search/decorative%20cushion%20cover/) |
| 15 | `blackout-curtain.png` | וילון האפלה 140x230 | טקסטיל | [blackout curtain panel](https://www.pexels.com/search/blackout%20curtain%20panel/) |
| 16 | `acrylic-paints.png` | סט 12 צבעי אקריליק | יצירה | [acrylic paint tube set](https://www.pexels.com/search/acrylic%20paint%20tube%20set/) |
| 17 | `colored-cardboard.png` | קרטון צבעוני A4 | יצירה | [coloured cardboard sheets](https://www.pexels.com/search/coloured%20cardboard%20sheets/) |
| 18 | `bead-kit.png` | ערכת חרוזים לתכשיטים | יצירה | [jewellery making beads kit](https://www.pexels.com/search/jewellery%20making%20beads%20kit/) |
| 19 | `mosaic-kit.png` | ערכת יצירת פסיפס | יצירה | [mosaic craft tiles kit](https://www.pexels.com/search/mosaic%20craft%20tiles%20kit/) |
| 20 | `glue-gun.png` | אקדח דבק חם מיני | יצירה | [mini hot glue gun](https://www.pexels.com/search/mini%20hot%20glue%20gun/) |
| 21 | `surface-cleaner.png` | נוזל ניקוי רב שימושי 1 ליטר | נקיון | [spray cleaning bottle](https://www.pexels.com/search/spray%20cleaning%20bottle/) |
| 22 | `microfiber-cloths.png` | מארז 5 מטליות מיקרופייבר | נקיון | [microfibre cleaning cloths](https://www.pexels.com/search/microfibre%20cleaning%20cloths/) |
| 23 | `laundry-basket.png` | סל כביסה 50 ליטר | נקיון | [laundry basket](https://www.pexels.com/search/laundry%20basket/) |
| 24 | `floor-squeegee.png` | מגב רצפה עם מקל | נקיון | [floor squeegee mop](https://www.pexels.com/search/floor%20squeegee%20mop/) |
| 25 | `dish-sponges.png` | מארז 10 ספוגי כלים | נקיון | [kitchen dish sponges](https://www.pexels.com/search/kitchen%20dish%20sponges/) |
| 26 | `springform-pan.png` | תבנית מתפרקת 26 ס״מ | אפייה | [springform cake tin](https://www.pexels.com/search/springform%20cake%20tin/) |
| 27 | `measuring-cups.png` | סט כוסות וכפות מדידה | אפייה | [stainless steel measuring cups](https://www.pexels.com/search/stainless%20steel%20measuring%20cups/) |
| 28 | `piping-set.png` | סט 24 שקיות זילוף וצנתרים | אפייה | [piping bags and nozzles](https://www.pexels.com/search/piping%20bags%20and%20nozzles/) |
| 29 | `muffin-tray.png` | תבנית סיליקון למאפינס | אפייה | [silicone muffin baking tray](https://www.pexels.com/search/silicone%20muffin%20baking%20tray/) |
| 30 | `hand-mixer.png` | מיקסר ידני 300 וואט | אפייה | [electric hand mixer](https://www.pexels.com/search/electric%20hand%20mixer/) |
| 31 | `board-game.png` | משחק קופסה משפחתי | צעצועים | [family board game box](https://www.pexels.com/search/family%20board%20game%20box/) |
| 32 | `puzzle-1000.png` | פאזל 1000 חלקים | צעצועים | [jigsaw puzzle box](https://www.pexels.com/search/jigsaw%20puzzle%20box/) |
| 33 | `jump-rope.png` | חבל קפיצה לילדים | צעצועים | [kids skipping rope](https://www.pexels.com/search/kids%20skipping%20rope/) |
| 34 | `fashion-doll.png` | בובת אופנה 30 ס״מ | צעצועים | [fashion doll toy](https://www.pexels.com/search/fashion%20doll%20toy/) |
| 35 | `toy-car.png` | מכונית מתכת אספנות | צעצועים | [diecast toy car](https://www.pexels.com/search/diecast%20toy%20car/) |
| 36 | `screwdriver-set.png` | סט 12 מברגים | כלי עבודה | [screwdriver set](https://www.pexels.com/search/screwdriver%20set/) |
| 37 | `claw-hammer.png` | פטיש נגרים 450 גרם | כלי עבודה | [claw hammer](https://www.pexels.com/search/claw%20hammer/) |
| 38 | `toolbox.png` | ארגז כלים 16 אינץ׳ | כלי עבודה | [plastic toolbox](https://www.pexels.com/search/plastic%20toolbox/) |
| 39 | `tape-measure.png` | סרט מדידה 5 מטר | כלי עבודה | [tape measure](https://www.pexels.com/search/tape%20measure/) |
| 40 | `work-gloves.png` | זוג כפפות עבודה | כלי עבודה | [pair of work gloves](https://www.pexels.com/search/pair%20of%20work%20gloves/) |

## Count by department

- כלי בית: 5
- מתנות: 5
- טקסטיל: 5
- יצירה: 5
- נקיון: 5
- אפייה: 5
- צעצועים: 5
- כלי עבודה: 5

## Orphaned images from the previous catalogue

These sit in `public/assets/img/products/` and are referenced by nothing after
the taxonomy change. They belong to the invented furniture / clothing /
electronics / pets departments that no longer exist. Left in place rather than
deleted — removing them is a call for the repo owner:

`audio, beanbag, chair, coffee-table, computer, cookware, dog-food, dress,
headphones, hoodie, jeans, knives, lighting, pet-bed, pet-toy, shelf, shoes,
sofa, table, tableware, tshirt, tv-stand, wardrobe`

`cookware.png`, `tableware.png` and `knives.png` are the three that could
plausibly be re-cut for כלי בית if you would rather not re-source those.
