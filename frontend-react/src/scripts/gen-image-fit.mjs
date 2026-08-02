/**
 * Regenerates src/data/product-image-fit.json.
 *
 * The product shots are all 1024×1024, but each subject fills a different
 * share of its own canvas (measured: 75%–97%). Left alone, identical card
 * tiles therefore render products at noticeably different sizes. This script
 * finds each image's true subject bounding box and records:
 *
 *   s  scale that puts every product's LONGEST side at TARGET of the frame
 *   x  horizontal nudge (%) recentring a subject that sits off-centre
 *   y  vertical nudge (%)
 *
 * ProductPreview.jsx feeds these in as CSS custom properties. Files missing
 * from the map fall back to scale(1), so this is an enhancement rather than a
 * requirement — a new photo renders fine before the map is regenerated.
 *
 * Run it after adding or replacing anything in public/assets/img/products:
 *
 *   npm run gen:image-fit          (dev server must be running)
 *
 * Pixel work happens in a real browser because that is what has a canvas;
 * there is no image-decoding dependency in this project.
 */
import { readdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const PRODUCTS_DIR = 'public/assets/img/products'
const OUT_FILE = 'src/data/product-image-fit.json'
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173'

// Share of the frame that every product's longest side should occupy.
// Keep in step with the `padding` on .card-media img in ProductPreview.scss.
const TARGET = 0.84

// How far a pixel must differ from the corner colour to count as subject.
const THRESHOLD = 28

const files = readdirSync(PRODUCTS_DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
if (!files.length) {
  console.error(`No images found in ${PRODUCTS_DIR}`)
  process.exit(1)
}

const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()

try {
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 15000 })
} catch {
  console.error(`Could not reach ${ORIGIN}. Start the dev server first (npm run dev).`)
  await browser.close()
  process.exit(1)
}

const map = await page.evaluate(
  async ({ files, TARGET, THRESHOLD }) => {
    const out = {}

    for (const file of files) {
      const img = new Image()
      await new Promise((resolve) => {
        img.onload = resolve
        img.onerror = resolve
        img.src = `/assets/img/products/${file}`
      })
      if (!img.naturalWidth) continue

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // The top-left pixel is the backdrop, transparent or white alike.
      const bg = [data[0], data[1], data[2], data[3]]
      const step = Math.max(1, Math.floor(canvas.width / 500))

      let minX = canvas.width
      let minY = canvas.height
      let maxX = -1
      let maxY = -1

      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const i = (y * canvas.width + x) * 4
          const diff =
            Math.abs(data[i] - bg[0]) +
            Math.abs(data[i + 1] - bg[1]) +
            Math.abs(data[i + 2] - bg[2])
          const isSubject = bg[3] < 16 ? data[i + 3] > 16 : diff > THRESHOLD
          if (!isSubject) continue
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }

      if (maxX < 0) continue

      const fill = Math.max(
        (maxX - minX + 1) / canvas.width,
        (maxY - minY + 1) / canvas.height
      )
      const offsetX = ((minX + maxX) / 2 - canvas.width / 2) / canvas.width
      const offsetY = ((minY + maxY) / 2 - canvas.height / 2) / canvas.height

      out[file] = {
        s: +(TARGET / fill).toFixed(3),
        x: +(-offsetX * 100).toFixed(2),
        y: +(-offsetY * 100).toFixed(2),
      }
    }

    return out
  },
  { files, TARGET, THRESHOLD }
)

await browser.close()

const missing = files.filter((f) => !map[f])
writeFileSync(OUT_FILE, `${JSON.stringify(map, null, 2)}\n`)

const scales = Object.values(map).map((v) => v.s)
console.log(`${OUT_FILE}: ${Object.keys(map).length}/${files.length} images mapped`)
console.log(`scale range ${Math.min(...scales)} .. ${Math.max(...scales)}`)
if (missing.length) console.warn(`could not measure: ${missing.join(', ')}`)
