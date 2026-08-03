# Fooocus prompt batch

One prompt per missing product image, matching `IMAGES.md` filename for
filename. Generated from `src/data/products.json`; regenerate if the
catalogue changes.

## Before you start

Fooocus will not run usefully on the machine this repo currently sits on —
Intel Iris Xe with ~1GB shared VRAM and no CUDA, against SDXL's ~8GB
expectation. Use a machine with an NVIDIA GPU. For scripted batch runs
install [Fooocus-API](https://github.com/mrhan1993/Fooocus-API) rather than
vanilla Fooocus, which is a Gradio UI with no stable REST surface.

## Settings

- **Aspect ratio:** 1024 × 1024 (square — the UI renders media at 1:1)
- **Performance:** Speed is fine; Quality if the subject comes out mushy
- **Style:** `Fooocus Photograph` (plus `Fooocus Sharp` if available)
- **Output:** save as PNG into `public/assets/img/products/<filename>`

**Shared negative prompt** — paste once, applies to every row:

```
text, lettering, watermark, logo, brand name, label text, hands, people, cropped, cut off, multiple duplicate products, cluttered background, busy scene, props, shadows across background, blurry, distorted
```

## After the files are in place

```
npm run gen:image-fit
```

Generated shots vary in how much of the canvas the subject fills, so this
step matters more here than it would for consistent stock photography.

## Prompts

### 1. `storage-box.png` — קופסת אחסון 30 ליטר (כלי בית)

```
a clear plastic storage box with a fitted lid, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 2. `serving-tray.png` — מגש הגשה עץ (כלי בית)

```
a rectangular wooden serving tray with cut-out handles, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 3. `glass-tumblers.png` — סט 6 כוסות זכוכית (כלי בית)

```
a set of six plain clear drinking glasses, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 4. `frying-pan.png` — מחבת טפלון 28 ס״מ (כלי בית)

```
a black non-stick frying pan with a handle, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 5. `dinner-plates.png` — סט 12 צלחות ארוחה (כלי בית)

```
a neat stack of plain white ceramic dinner plates, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 6. `gift-box-spa.png` — מארז מתנה ספא (מתנות)

```
an open spa gift set box with rolled towel and soap, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 7. `scented-candle.png` — נר ריחני בכוס זכוכית (מתנות)

```
a scented candle in a clear glass jar, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 8. `photo-frames.png` — סט 3 מסגרות תמונה (מתנות)

```
three black wooden picture frames of different sizes, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 9. `gift-wrap.png` — סט גלילי נייר עטיפה (מתנות)

```
three rolls of patterned gift wrapping paper standing upright, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 10. `ceramic-vase.png` — אגרטל קרמיקה לבן (מתנות)

```
a tall white ceramic vase, smooth matte finish, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 11. `bath-towel.png` — מגבת רחצה 70x140 (טקסטיל)

```
a neatly folded bath towel, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 12. `bedding-set.png` — סט מצעים זוגי (טקסטיל)

```
a folded bed linen set, sheet and two pillowcases, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 13. `shaggy-rug.png` — שטיח שאגי 120x170 (טקסטיל)

```
a rectangular grey shaggy pile rug, laid flat, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 14. `cushion-cover.png` — ציפית כרית נוי 45x45 (טקסטיל)

```
a square decorative cushion with plain woven cover, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 15. `blackout-curtain.png` — וילון האפלה 140x230 (טקסטיל)

```
a single grey blackout curtain panel hanging straight, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 16. `acrylic-paints.png` — סט 12 צבעי אקריליק (יצירה)

```
a set of twelve acrylic paint tubes arranged in a row, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 17. `colored-cardboard.png` — קרטון צבעוני A4 (יצירה)

```
a fanned stack of coloured cardboard sheets, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 18. `bead-kit.png` — ערכת חרוזים לתכשיטים (יצירה)

```
a jewellery making kit of assorted coloured beads in compartments, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 19. `mosaic-kit.png` — ערכת יצירת פסיפס (יצירה)

```
a mosaic craft kit with small coloured tiles, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 20. `glue-gun.png` — אקדח דבק חם מיני (יצירה)

```
a small orange and black hot glue gun, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 21. `surface-cleaner.png` — נוזל ניקוי רב שימושי 1 ליטר (נקיון)

```
a plastic spray bottle of surface cleaner, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 22. `microfiber-cloths.png` — מארז 5 מטליות מיקרופייבר (נקיון)

```
a stack of folded microfibre cleaning cloths, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 23. `laundry-basket.png` — סל כביסה 50 ליטר (נקיון)

```
a white plastic laundry basket with handles, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 24. `floor-squeegee.png` — מגב רצפה עם מקל (נקיון)

```
a floor squeegee with a long handle, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 25. `dish-sponges.png` — מארז 10 ספוגי כלים (נקיון)

```
a stack of two-tone kitchen dish sponges, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 26. `springform-pan.png` — תבנית מתפרקת 26 ס״מ (אפייה)

```
a round springform cake tin with clasp, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 27. `measuring-cups.png` — סט כוסות וכפות מדידה (אפייה)

```
a nested set of stainless steel measuring cups, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 28. `piping-set.png` — סט 24 שקיות זילוף וצנתרים (אפייה)

```
piping bags with assorted stainless steel nozzles, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 29. `muffin-tray.png` — תבנית סיליקון למאפינס (אפייה)

```
a red silicone muffin baking tray with six cups, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 30. `hand-mixer.png` — מיקסר ידני 300 וואט (אפייה)

```
a white electric hand mixer with beaters attached, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 31. `board-game.png` — משחק קופסה משפחתי (צעצועים)

```
a closed family board game box, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 32. `puzzle-1000.png` — פאזל 1000 חלקים (צעצועים)

```
a closed jigsaw puzzle box, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 33. `jump-rope.png` — חבל קפיצה לילדים (צעצועים)

```
a coiled skipping rope with plastic handles, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 34. `fashion-doll.png` — בובת אופנה 30 ס״מ (צעצועים)

```
a fashion doll figure standing upright, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 35. `toy-car.png` — מכונית מתכת אספנות (צעצועים)

```
a small diecast toy car, side view, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 36. `screwdriver-set.png` — סט 12 מברגים (כלי עבודה)

```
a set of twelve screwdrivers laid in a row, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 37. `claw-hammer.png` — פטיש נגרים 450 גרם (כלי עבודה)

```
a claw hammer with a rubber grip handle, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 38. `toolbox.png` — ארגז כלים 16 אינץ׳ (כלי עבודה)

```
a closed black plastic toolbox with handle, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 39. `tape-measure.png` — סרט מדידה 5 מטר (כלי עבודה)

```
a retractable tape measure, case closed, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

### 40. `work-gloves.png` — זוג כפפות עבודה (כלי עבודה)

```
a pair of work gloves laid flat, centred product photograph, isolated on a plain pure white background, soft even studio lighting, full product visible and not cropped, sharp focus, high detail, e-commerce catalogue photograph, square composition
```

