# ZolStock Remake — API

Node/Express + MongoDB backend for the ZolStock Remake storefront. Plain JS, ES modules.

## Running it

```bash
npm install
cp .env.example .env      # then fill in SECRET (see below)
npm run seed              # loads the catalogue and creates the admin user
npm run dev               # nodemon on http://localhost:3030
```

`npm run seed` prints a generated admin password **once**. Save it, or set
`ADMIN_PASSWORD` in `.env` before seeding to choose your own.

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`.env` is gitignored and must stay that way — it holds the session secret and
the database URL.

### Environment

| Variable | Purpose |
|---|---|
| `MONGO_URL` | Connection string. Defaults to `mongodb://127.0.0.1:27017` in dev; required in production. |
| `DB_NAME` | Database name, defaults to `zolstock_db`. |
| `PORT` | Defaults to `3030`, which is what the frontend expects in dev. |
| `SECRET` | Encrypts the login cookie. Changing it invalidates every session. |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to send credentialed requests. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Optional, read by the seed script. |

On Windows prefer `127.0.0.1` over `localhost` in `MONGO_URL`: `localhost`
resolves to IPv6 `::1` first, while mongod listens on IPv4, which causes
intermittent connection stalls.

## Seeding

The catalogue's source of truth is `../frontend-react/src/data/products.json`.
`scripts/seed.js` is the only place that file crosses into the database, so the
two cannot drift silently.

```bash
npm run seed          # upsert by sku; safe to re-run, keeps _id stable
npm run seed:fresh    # drop products and users first
```

Products carry a real Mongo `ObjectId` as `_id` and keep their original
`p1001`-style id as an indexed, unique `sku`. Lookups accept **either**, so
product URLs minted before the migration still resolve.

## API

All routes are under `/api`. Authentication is a `httpOnly` cookie set at login.

| Route | Auth | Notes |
|---|---|---|
| `GET /api/health` | — | Liveness plus a database ping. Not rate limited. |
| `GET /api/product` | — | Filters: `txt`, `category`, `subCategory`, `minPrice`, `maxPrice`, `inStock`, `sortField`, `sortDir`, `pageIdx`, `pageSize`. Returns every match unless `pageIdx` is supplied. |
| `GET /api/product/category` | — | `[{ slug, labelHe }]` |
| `GET /api/product/sub-category?category=` | — | `[{ slug, labelHe, category }]` |
| `GET /api/product/:id` | — | Accepts an ObjectId or a sku. |
| `POST/PUT/DELETE /api/product/:id` | admin | Catalogue writes. |
| `POST /api/auth/signup`, `/login`, `/logout` | — | Rate limited; only failed attempts count. |
| `GET /api/user` | admin | |
| `GET/PUT/DELETE /api/user/:id` | auth | A non-admin may only update their own record. |
| `GET /api/cart`, `POST /cart/item`, `PUT /cart/item/:itemId`, `DELETE /cart/item/:itemId`, `DELETE /cart`, `POST /cart/merge` | auth | Always returns the whole cart. |
| `GET /api/wishlist`, `POST /wishlist/:productId`, `DELETE /wishlist/:productId`, `POST /wishlist/merge` | auth | |
| `GET /api/order`, `POST /api/order`, `GET /api/order/:id` | auth | `POST` checks out the current cart. |
| `GET /api/order/all`, `PUT /api/order/:id/status` | admin | |
| `GET /api/review`, `POST`, `DELETE /api/review/:id` | mixed | |

Text search matches a denormalised lowercase `searchText` field with a
substring regex rather than `$text`, because `$text` only matches whole words
and the storefront searches as you type. User input is regex-escaped.

## Things worth knowing before changing this

**The server prices everything.** Carts store product references and
quantities — never prices. Item prices, discounts and delivery are resolved
from the catalogue on every read and again at checkout. A client that sends a
`price` is ignored. Do not "optimise" this by trusting the request body.

**Checkout has no transactions.** A standalone mongod has no multi-document
transactions, so `orderService.checkout` reserves stock per line with a
conditional decrement (`{ stockQty: { $gte: qty } }` inside the *filter*, so
the guard and the write are one atomic operation) and releases everything it
already took if any line fails. A read-then-write here would let two shoppers
oversell the last unit.

**Delivery pricing is part placeholder.** `FREE_SHIPPING_THRESHOLD` (₪300)
came from copy the storefront already showed; `SHIPPING_FLAT_FEE` (₪29) was
chosen, not sourced. Both live in `api/cart/cart.service.js` and are mirrored
in the frontend's `cart.actions.js` for guests, who have no server cart to
read. Keep the two in step.

**Signup never accepts `isAdmin` or `score`.** The Zod schema strips undeclared
fields and `authService.signup` does not destructure them. Admins are created
only by the seed script. This is deliberately belt-and-braces; do not relax it.

**Payment is simulated.** No gateway, no card data collected or stored. Orders
record a `SIM-` reference and are marked paid.
