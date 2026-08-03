/**
 * Seeds Mongo from the frontend's canonical catalogue.
 *
 * The products live in the React app at src/data/products.json, which
 * PRODUCT.md designates the source of truth for the eight real departments.
 * This script is the one place that file crosses into the database, so the
 * two can never drift silently: re-running it rebuilds the collection from
 * whatever the JSON currently says.
 *
 * Usage:
 *   npm run seed          upsert products by sku, leave users alone
 *   npm run seed:fresh    drop products and users first, then seed
 *
 * On ids: products keep their original "p1001" string as an indexed `sku`
 * while Mongo assigns a real ObjectId `_id`. Existing product URLs and any
 * cart already sitting in a shopper's localStorage still resolve, because
 * the API accepts either form.
 */
import '../config/env.js'

import fs from 'fs'
import path from 'path'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

import { config } from '../config/index.js'
import { dbService } from '../services/db.service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CATALOGUE_PATH = path.resolve(
  __dirname,
  '../../frontend-react/src/data/products.json'
)

const isFresh = process.argv.includes('--fresh')

/**
 * products.json stores image paths relative ("assets/img/products/x.png").
 * The frontend's local service prepends BASE_URL at read time, but the remote
 * service does not, and a relative path would resolve against the current
 * route (/product/assets/...) rather than the site root. Normalising to a
 * leading slash here makes the served value correct from either origin.
 *
 * Note: per PRODUCT.md these image files do not exist yet — the catalogue is
 * unillustrated and a placeholder stands in. This only fixes the shape of the
 * path, not the missing assets.
 */
function normalizeImages(images = []) {
  return images.map(img => {
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) return img
    return `/${img}`
  })
}

function toProductDoc(raw) {
  const { id, ...rest } = raw
  return {
    ...rest,
    sku: id,
    images: normalizeImages(raw.images),
    // Denormalised for search: one lowercase haystack the text index can
    // cover, so Hebrew display names, brand and tags are all searchable
    // without a $or across eight regexes on every keystroke.
    searchText: [
      raw.name,
      raw.displayNameHe,
      raw.brand,
      raw.displayCategoryHe,
      raw.displaySubCategoryHe,
      ...(raw.tags || []),
      ...(raw.displayTagsHe || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
    updatedAt: new Date(),
  }
}

async function seedProducts() {
  if (!fs.existsSync(CATALOGUE_PATH)) {
    throw new Error(`Catalogue not found at ${CATALOGUE_PATH}`)
  }

  const raw = JSON.parse(fs.readFileSync(CATALOGUE_PATH, 'utf8'))
  const collection = await dbService.getCollection('products')

  // The collection currently holds 32 documents from a retired catalogue
  // (furniture / clothing / electronics / kitchen / pets) that matches no
  // real department. Those must go regardless of --fresh, or the API would
  // serve departments the storefront no longer has.
  const stale = await collection.countDocuments({ sku: { $exists: false } })
  if (stale > 0) {
    await collection.deleteMany({ sku: { $exists: false } })
    console.log(`  removed ${stale} legacy document(s) with no sku`)
  }

  if (isFresh) {
    const dropped = await collection.deleteMany({})
    console.log(`  --fresh: cleared ${dropped.deletedCount} product(s)`)
  }

  // Upsert by sku so re-seeding updates in place and keeps _id stable —
  // otherwise every run would invalidate any URL or order referencing a
  // product by its ObjectId.
  const ops = raw.map(item => ({
    updateOne: {
      filter: { sku: item.id },
      update: { $set: toProductDoc(item), $setOnInsert: { createdAt: new Date() } },
      upsert: true,
    },
  }))

  const res = await collection.bulkWrite(ops, { ordered: false })
  console.log(
    `  products: ${res.upsertedCount} inserted, ${res.modifiedCount} updated (${raw.length} in catalogue)`
  )

  await collection.createIndex({ sku: 1 }, { unique: true })
  await collection.createIndex({ category: 1, subCategory: 1 })
  await collection.createIndex({ price: 1 })

  // A plain index, not a text index. The API matches searchText with a
  // substring regex so search-as-you-type works on partial words, and $text
  // only matches whole words. An earlier seed created a text index here; drop
  // it so re-seeding an existing database converges on the right shape.
  await collection.dropIndex('searchText_text').catch(() => {})
  await collection.createIndex({ searchText: 1 })
  console.log('  indexes: sku(unique), category+subCategory, price, searchText')
}

async function seedAdmin() {
  const collection = await dbService.getCollection('user')

  if (isFresh) {
    const dropped = await collection.deleteMany({})
    console.log(`  --fresh: cleared ${dropped.deletedCount} user(s)`)
  }

  const username = process.env.ADMIN_USERNAME || 'admin'
  const existing = await collection.findOne({ username })

  if (existing) {
    console.log(`  admin "${username}" already exists, leaving it alone`)
    return
  }

  // A generated password is printed once and never stored in plaintext.
  // Set ADMIN_PASSWORD in .env to choose your own instead.
  const generated = !process.env.ADMIN_PASSWORD
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url')

  await collection.insertOne({
    username,
    password: await bcrypt.hash(password, 10),
    fullname: 'ZolStock Admin',
    imgUrl: 'https://cdn.pixabay.com/photo/2020/07/01/12/58/icon-5359553_1280.png',
    isAdmin: true,
    score: 10000,
    createdAt: new Date(),
  })

  await collection.createIndex({ username: 1 }, { unique: true })

  console.log(`  admin created -> username: ${username}`)
  if (generated) {
    console.log(`  GENERATED PASSWORD (shown once, save it now): ${password}`)
  }
}

async function main() {
  console.log(`Seeding ${config.dbName} at ${config.dbURL.replace(/\/\/[^@]*@/, '//***@')}`)

  await seedProducts()
  await seedAdmin()

  await dbService.close()
  console.log('Seed complete.')
}

main().catch(async err => {
  console.error('Seed failed:', err)
  await dbService.close().catch(() => {})
  process.exit(1)
})
