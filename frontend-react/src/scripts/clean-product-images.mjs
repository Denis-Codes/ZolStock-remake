/**
 * Normalises the generated product photography in public/assets/img/products.
 *
 * The generated shots arrive with three defects that all read as "cheap" on a
 * product card: an off-white backdrop that shows as a visible grey rectangle
 * against the white card, a "Meta AI" watermark in the lower-right, and a
 * subject that sits off-centre in its own frame.
 *
 * This rewrites each file in place:
 *
 *   1. BACKDROP -> PURE WHITE. Flood-filled inward from the border rather than
 *      thresholded globally. A global "light pixels become white" pass would
 *      destroy the products that are themselves white (dinner plates, bath
 *      towel, ceramic vase, cushion cover); flooding from the edge only ever
 *      reaches the backdrop, so a white subject enclosed by its own shadow or
 *      edge survives intact.
 *
 *   2. WATERMARK -> ERASED. Once the backdrop is flat, the watermark is left
 *      behind as small, desaturated islands sitting in that backdrop. Islands
 *      are erased only when they are small, low-saturation AND confined to the
 *      lower band, which is where the mark always sits. A saturated or large
 *      component is never touched, so multi-part products whose pieces reach
 *      the bottom of the frame (mosaic tiles, scattered beads) keep every
 *      piece.
 *
 *   3. SUBJECT -> CENTRED. The subject is translated, NOT rescaled. Rescaling
 *      here would upsample subjects that already fill 97% of frame and soften
 *      them; sizing is CSS's job via product-image-fit.json, which stays the
 *      single source of scale.
 *
 * Pixel work runs in a real browser canvas, matching gen-image-fit.mjs — this
 * project deliberately carries no image-decoding dependency. Images are passed
 * in as data URLs, so unlike gen-image-fit.mjs no dev server is required.
 *
 *   npm run clean:product-images                 (dry run, reports only)
 *   npm run clean:product-images -- --write      (rewrites the files)
 *
 * Originals are kept in src/assets/styles/img/Product Images for ZolStock, so
 * a bad run is recoverable by re-copying from there.
 *
 * Re-run `npm run gen:image-fit` afterwards: centring the subject invalidates
 * the offsets recorded in product-image-fit.json.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const PRODUCTS_DIR = 'public/assets/img/products'
const MANIFEST = 'src/data/products.json'
const WRITE = process.argv.includes('--write')

// --out <dir> renders to a scratch directory instead of the live files, so the
// result can be eyeballed before anything is overwritten.
const outArg = process.argv.indexOf('--out')
const OUT_DIR = outArg > -1 ? process.argv[outArg + 1] : null
if (OUT_DIR) mkdirSync(OUT_DIR, { recursive: true })

// --only a,b restricts the run to named files while tuning.
const onlyArg = process.argv.indexOf('--only')
const ONLY = onlyArg > -1 ? process.argv[onlyArg + 1].split(',') : null

// Largest per-channel drift from the corner colour that still counts as
// backdrop. These renders carry a soft vignette and sensor-style noise; too
// tight a value strands a halo of speckle that survives the flood, inflates the
// subject bounds and wrecks the centring.
const BG_TOL = 22

// Any island under this share of the canvas is speckle, wherever it sits.
// A real product part — even one bead — is orders of magnitude larger.
const NOISE_MAX_AREA = 0.0002

// An island must be under this share of the canvas to be watermark-shaped.
const MARK_MAX_AREA = 0.008
// ...and sit entirely below this line. The mark is always bottom-anchored.
const MARK_TOP = 0.74
// ...and be this desaturated. Product parts that reach the bottom are colourful.
const MARK_MAX_SAT = 0.22

// Whitening is blended, not binary. A pixel this close to the backdrop colour
// goes fully white; one at BG_TOL is left alone; between the two it ramps. A
// hard mask cuts mid-gradient and leaves a visible ragged seam wherever the
// flood runs through a white product that has no edge to stop it — a white vase
// on a white ground being the worst case.
const SOFT_LO = 6

// The watermark sits in this corner. When it happens to overlap the drop shadow
// it joins a large component and survives the island test, so the corner gets
// cleared on its own terms: only pixels that are near-neutral are touched, which
// spares any coloured product part that reaches down here.
const MARK_ZONE_X = 0.55
const MARK_ZONE_Y = 0.82
const MARK_ZONE_MAX_SAT = 0.12
const MARK_ZONE_MIN_VAL = 150

// The test that separates a watermark from a white product sitting in the same
// corner: a mark is thin and floats on backdrop, so most of its neighbourhood
// is backdrop. A white towel or plate is a large contiguous body, so its
// neighbourhood is mostly itself. Radius is in pixels of a 1024-ish canvas.
const MARK_ZONE_RADIUS = 14
const MARK_ZONE_BG_FRAC = 0.6

// Inside the watermark corner the backdrop is whitened hard rather than blended.
// The mark's mid-grey pixels sit within flood tolerance, so the soft ramp only
// fades them — they have to be driven to 255 to disappear. Preserving a gradient
// matters nowhere in this corner, and the transition is feathered over this many
// pixels so the switch from blended to hard never shows as an edge.
const MARK_ZONE_FEATHER = 0.06

/**
 * Files whose watermark lands on the drop shadow rather than on clean backdrop.
 * The shadow is outside the flood, so none of the backdrop rules above can
 * reach the mark, and loosening them far enough to catch it would also eat
 * genuinely white products sitting in the same corner — the laundry basket and
 * the steel measuring cups both fail that test. So the rectangle is named
 * explicitly instead: everything inside it is driven to white, feathered at the
 * edges. Verify by eye that the rectangle contains no product before adding one.
 */
const ZONE_OVERRIDE = {
  // Clears "Meta AI" at the lower right. Top edge sits just below the handle's
  // end cap, which ends at ~0.855 of frame height.
  'claw-hammer.png': { x0: 0.75, y0: 0.859 },
}

// Bounds are measured only from pixels this far off white. A contact shadow is
// part of the shot and stays, but it must not drive the centring: an object
// with a shadow pooling to one side would otherwise be pushed off-centre by
// exactly the width of its own shadow.
const CORE_TOL = 46

// Only touch files the catalogue actually references; the orphaned images from
// the previous taxonomy are left exactly as they are.
const files = [
  ...new Set(
    JSON.parse(readFileSync(MANIFEST, 'utf8'))
      .flatMap((p) => p.images || [])
      .map((img) => img.split('/').pop())
  ),
].sort()

const present = files
  .filter((f) => existsSync(`${PRODUCTS_DIR}/${f}`))
  .filter((f) => !ONLY || ONLY.includes(f) || ONLY.includes(f.replace(/\.png$/, '')))
if (!present.length) {
  console.error(`No catalogue images found in ${PRODUCTS_DIR}`)
  process.exit(1)
}

const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()
await page.setContent('<!doctype html><meta charset="utf-8">')

function work({
  dataUrl,
  BG_TOL,
  SOFT_LO,
  NOISE_MAX_AREA,
  MARK_MAX_AREA,
  MARK_TOP,
  MARK_MAX_SAT,
  MARK_ZONE_X,
  MARK_ZONE_Y,
  MARK_ZONE_MAX_SAT,
  MARK_ZONE_MIN_VAL,
  MARK_ZONE_RADIUS,
  MARK_ZONE_BG_FRAC,
  MARK_ZONE_FEATHER,
  CORE_TOL,
  override,
}) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const W = img.naturalWidth
      const H = img.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, W, H)
      const d = imageData.data
      const N = W * H

      // Backdrop reference: median of the four corner patches, so a stray
      // speck in one corner cannot define the whole backdrop.
      const samples = []
      for (const [cx, cy] of [
        [0, 0],
        [W - 8, 0],
        [0, H - 8],
        [W - 8, H - 8],
      ]) {
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const i = ((cy + y) * W + (cx + x)) * 4
            samples.push([d[i], d[i + 1], d[i + 2]])
          }
        }
      }
      const med = (k) => {
        const v = samples.map((s) => s[k]).sort((a, b) => a - b)
        return v[v.length >> 1]
      }
      const bg = [med(0), med(1), med(2)]

      // 1. Flood the backdrop inward from every border pixel.
      const isBg = new Uint8Array(N)
      const forceWhite = new Uint8Array(N)
      const stack = []
      const near = (i) =>
        Math.max(
          Math.abs(d[i * 4] - bg[0]),
          Math.abs(d[i * 4 + 1] - bg[1]),
          Math.abs(d[i * 4 + 2] - bg[2])
        ) <= BG_TOL

      for (let x = 0; x < W; x++) {
        for (const i of [x, (H - 1) * W + x]) if (!isBg[i] && near(i)) (isBg[i] = 1), stack.push(i)
      }
      for (let y = 0; y < H; y++) {
        for (const i of [y * W, y * W + W - 1]) if (!isBg[i] && near(i)) (isBg[i] = 1), stack.push(i)
      }
      while (stack.length) {
        const i = stack.pop()
        const x = i % W
        const y = (i / W) | 0
        if (x > 0 && !isBg[i - 1] && near(i - 1)) (isBg[i - 1] = 1), stack.push(i - 1)
        if (x < W - 1 && !isBg[i + 1] && near(i + 1)) (isBg[i + 1] = 1), stack.push(i + 1)
        if (y > 0 && !isBg[i - W] && near(i - W)) (isBg[i - W] = 1), stack.push(i - W)
        if (y < H - 1 && !isBg[i + W] && near(i + W)) (isBg[i + W] = 1), stack.push(i + W)
      }

      // 2. Walk what the flood left behind and drop anything that is not
      //    product: backdrop speckle anywhere, watermark strokes at the bottom.
      const seen = new Uint8Array(N)
      let marksErased = 0
      let noiseErased = 0
      for (let start = 0; start < N; start++) {
        if (seen[start] || isBg[start]) continue
        const comp = []
        const q = [start]
        seen[start] = 1
        let minY = H
        let sat = 0
        while (q.length) {
          const i = q.pop()
          comp.push(i)
          const y = (i / W) | 0
          const x = i % W
          if (y < minY) minY = y
          const r = d[i * 4]
          const g = d[i * 4 + 1]
          const b = d[i * 4 + 2]
          const mx = Math.max(r, g, b)
          sat += mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx
          for (const [nx, ny] of [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
          ]) {
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
            const j = ny * W + nx
            if (!seen[j] && !isBg[j]) (seen[j] = 1), q.push(j)
          }
        }

        const isNoise = comp.length < NOISE_MAX_AREA * N
        const isMark =
          !isNoise &&
          comp.length < MARK_MAX_AREA * N &&
          minY > MARK_TOP * H &&
          sat / comp.length < MARK_MAX_SAT

        if (isNoise || isMark) {
          for (const i of comp) (isBg[i] = 1), (forceWhite[i] = 1)
          if (isMark) marksErased++
          else noiseErased++
        }
      }

      // 2b. Clear a watermark that escaped the island test by overlapping the
      //     drop shadow. Neutral, reasonably light pixels only.
      let zoneCleared = 0
      let overrideCleared = 0
      const bgSnapshot = isBg.slice()
      const R = Math.max(6, Math.round((MARK_ZONE_RADIUS * W) / 1024))
      for (let y = Math.floor(MARK_ZONE_Y * H); y < H; y++) {
        for (let x = Math.floor(MARK_ZONE_X * W); x < W; x++) {
          const i = y * W + x
          if (forceWhite[i] || bgSnapshot[i]) continue
          const r = d[i * 4]
          const g = d[i * 4 + 1]
          const b = d[i * 4 + 2]
          const mx = Math.max(r, g, b)
          const sat = mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx
          if (mx < MARK_ZONE_MIN_VAL || sat > MARK_ZONE_MAX_SAT) continue

          let bgSeen = 0
          let total = 0
          for (let wy = y - R; wy <= y + R; wy += 3) {
            if (wy < 0 || wy >= H) continue
            for (let wx = x - R; wx <= x + R; wx += 3) {
              if (wx < 0 || wx >= W) continue
              total++
              if (bgSnapshot[wy * W + wx]) bgSeen++
            }
          }
          if (!total || bgSeen / total < MARK_ZONE_BG_FRAC) continue

          isBg[i] = 1
          forceWhite[i] = 1
          zoneCleared++
        }
      }

      // Flatten. Anything explicitly erased goes hard white; the flooded
      // backdrop is blended so the transition cannot read as a cut edge.
      const feather = Math.max(1, MARK_ZONE_FEATHER * W)
      const smooth = (t) => t * t * (3 - 2 * t)

      // Named rectangle: whiten unconditionally, feathered, ignoring every mask.
      if (override) {
        const ox = override.x0 * W
        const oy = override.y0 * H
        for (let y = Math.floor(oy); y < H; y++) {
          for (let x = Math.floor(ox); x < W; x++) {
            const i = y * W + x
            const ow = smooth(
              Math.min(
                1,
                Math.max(0, Math.min((x - ox) / feather, (y - oy) / feather))
              )
            )
            if (ow <= 0) continue
            for (let c = 0; c < 3; c++) {
              d[i * 4 + c] += (255 - d[i * 4 + c]) * ow
            }
            if (ow > 0.9) (isBg[i] = 1), (forceWhite[i] = 1)
            overrideCleared++
          }
        }
      }

      for (let i = 0; i < N; i++) {
        if (!isBg[i]) continue
        const r = d[i * 4]
        const g = d[i * 4 + 1]
        const b = d[i * 4 + 2]
        let w = 1
        if (!forceWhite[i]) {
          const diff = Math.max(
            Math.abs(r - bg[0]),
            Math.abs(g - bg[1]),
            Math.abs(b - bg[2])
          )
          if (diff >= BG_TOL) w = 0
          else if (diff > SOFT_LO) {
            w = 1 - smooth((diff - SOFT_LO) / (BG_TOL - SOFT_LO))
          }

          // Ramp toward hard white as the pixel moves into the mark corner.
          const x = i % W
          const y = (i / W) | 0
          const zx = Math.min(1, Math.max(0, (x - MARK_ZONE_X * W) / feather))
          const zy = Math.min(1, Math.max(0, (y - MARK_ZONE_Y * H) / feather))
          const zw = smooth(Math.min(zx, zy))
          if (zw > 0) w += (1 - w) * zw
        }
        if (w <= 0) continue
        d[i * 4] = r + (255 - r) * w
        d[i * 4 + 1] = g + (255 - g) * w
        d[i * 4 + 2] = b + (255 - b) * w
        d[i * 4 + 3] = 255
      }

      // 3. Re-centre by translation. Bounds are measured twice: once from the
      // solid core, which is what should sit centred, and once from everything
      // surviving including shadow, as a fallback for a subject so pale that it
      // has no core (a white vase on white).
      let minX = W
      let minY = H
      let maxX = -1
      let maxY = -1
      let anyMinX = W
      let anyMinY = H
      let anyMaxX = -1
      let anyMaxY = -1
      // Measured from the flattened pixels rather than the mask, so a partially
      // blended edge is weighted by how much of it actually survived.
      for (let i = 0; i < N; i++) {
        const off = Math.max(255 - d[i * 4], 255 - d[i * 4 + 1], 255 - d[i * 4 + 2])
        if (off <= 3) continue
        const x = i % W
        const y = (i / W) | 0
        if (x < anyMinX) anyMinX = x
        if (x > anyMaxX) anyMaxX = x
        if (y < anyMinY) anyMinY = y
        if (y > anyMaxY) anyMaxY = y

        if (off < CORE_TOL) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }

      // Too little core to trust — fall back to the full silhouette.
      if (maxX < 0 || (maxX - minX + 1) * (maxY - minY + 1) < 0.01 * N) {
        minX = anyMinX
        minY = anyMinY
        maxX = anyMaxX
        maxY = anyMaxY
      }

      ctx.putImageData(imageData, 0, 0)

      const out = document.createElement('canvas')
      out.width = W
      out.height = H
      const octx = out.getContext('2d')
      octx.fillStyle = '#fff'
      octx.fillRect(0, 0, W, H)

      let dx = 0
      let dy = 0
      let fill = 0
      if (maxX >= 0) {
        const bw = maxX - minX + 1
        const bh = maxY - minY + 1
        fill = Math.max(bw / W, bh / H)

        // Translate the whole canvas rather than cropping to the core box, so
        // the contact shadow travels with the object instead of being sliced
        // off at the core boundary. No resampling happens at any point.
        dx = Math.round(W / 2 - (minX + maxX + 1) / 2)
        dy = Math.round(H / 2 - (minY + maxY + 1) / 2)

        // Never shift so far that the silhouette leaves the frame. The range
        // always contains 0, so this can only reduce the correction.
        dx = Math.max(-anyMinX, Math.min(W - 1 - anyMaxX, dx))
        dy = Math.max(-anyMinY, Math.min(H - 1 - anyMaxY, dy))
      }
      octx.drawImage(canvas, dx, dy)

      resolve({
        dataUrl: out.toDataURL('image/png'),
        marksErased,
        noiseErased,
        zoneCleared,
        overrideCleared,
        fill: +fill.toFixed(3),
        movedX: dx,
        movedY: dy,
      })
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

console.log(`${WRITE ? 'Rewriting' : 'Dry run over'} ${present.length} catalogue images\n`)

let marked = 0
let moved = 0
let failed = []

for (const file of present) {
  const path = `${PRODUCTS_DIR}/${file}`
  const before = readFileSync(path)
  const dataUrl = `data:image/png;base64,${before.toString('base64')}`

  const res = await page.evaluate(work, {
    dataUrl,
    BG_TOL,
    SOFT_LO,
    NOISE_MAX_AREA,
    MARK_MAX_AREA,
    MARK_TOP,
    MARK_MAX_SAT,
    MARK_ZONE_X,
    MARK_ZONE_Y,
    MARK_ZONE_MAX_SAT,
    MARK_ZONE_MIN_VAL,
    MARK_ZONE_RADIUS,
    MARK_ZONE_BG_FRAC,
    MARK_ZONE_FEATHER,
    CORE_TOL,
    override: ZONE_OVERRIDE[file] || null,
  })

  if (!res) {
    failed.push(file)
    console.log(`  ${file.padEnd(24)} FAILED to decode`)
    continue
  }

  const buf = Buffer.from(res.dataUrl.split(',')[1], 'base64')
  if (OUT_DIR) writeFileSync(`${OUT_DIR}/${file}`, buf)
  else if (WRITE) writeFileSync(path, buf)

  if (res.marksErased) marked++
  const shift = Math.abs(res.movedX) + Math.abs(res.movedY)
  if (shift > 4) moved++

  const kb = (n) => `${Math.round(n / 1024)}kB`
  console.log(
    `  ${file.padEnd(24)} fill ${String(res.fill).padEnd(7)}` +
      `shift ${String(`${res.movedX},${res.movedY}`).padEnd(12)}` +
      `mark ${String(res.marksErased).padEnd(4)}` +
      `zone ${String(res.zoneCleared).padEnd(8)}` +
      `${kb(before.length)} -> ${kb(buf.length)}`
  )
}

await browser.close()

console.log(
  `\n${present.length} processed | ${marked} had islands erased | ${moved} re-centred by >4px`
)
if (failed.length) console.warn(`failed: ${failed.join(', ')}`)
if (!WRITE) console.log('\nDry run — nothing written. Re-run with -- --write to apply.')
else console.log('\nNow run: npm run gen:image-fit')
