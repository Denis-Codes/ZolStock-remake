# BUG-004 — `POST /api/product` returns a product with no `_id`

**Status:** FIXED
**Severity:** Medium
**Found by:** Playwright API spec, while writing the authorization matrix
**Fixed in:** `backend/api/product/product.service.js` — `add()` now returns the inserted document
**Regression test:** `frontend-react/tests/api/shop.api.spec.js` → `returns the id of the product it created`

---

## What happens

An administrator creates a product. The server answers `200` and returns a
product object — but the object has no `_id`. The client is never told the
identity of the thing it just created.

```
POST /api/product   { name: "Sneaky Product", price: 99 }
→ 200 { name: "Sneaky Product", price: 99, owner: {...} }
                                                    ↑ no _id anywhere
```

The product **is** created correctly. Only the response is wrong.

## Cause

`backend/api/product/product.service.js`:

```js
async function add(product) {
  const collection = await dbService.getCollection('products')
  await collection.insertOne({
    ...product,                        // ← a NEW object
    searchText: _buildSearchText(product),
    createdAt: new Date(),
  })
  return product                       // ← the ORIGINAL object
}
```

The MongoDB driver assigns the generated `_id` by **mutating the object it was
handed**. That object is the spread copy created inline on line 84 — not
`product`. So the copy that reached the database has an `_id`, and the object
returned to the caller never does.

This is a subtle one precisely because the mutation is real and does happen; it
just happens to a different object than the one that gets returned.

The same line drops `searchText` and `createdAt` from the response, so the body
does not reflect the stored document in three ways, not one.

## Why it matters

A creation endpoint that will not identify what it created forces every caller
into a workaround:

- An admin UI cannot navigate to, link to, or open the product it just added.
- It cannot edit it either — `PUT /api/product/:id` and `updateProduct` are
  keyed on `_id`.
- The only recovery is to re-fetch the entire catalogue and search by name,
  which is what the passing test beside this one has to do. That breaks
  outright as soon as two products share a name, and it is a full extra round
  trip on every create.

Not currently user-facing: there is no admin product-creation UI in the app
yet. It becomes user-facing the moment one is built, and it will be diagnosed
as a frontend bug first, because "I created it and the page didn't open" looks
like a routing problem.

## Fix

One line — return what was inserted rather than what was passed in:

```js
async function add(product) {
  const collection = await dbService.getCollection('products')
  const doc = {
    ...product,
    searchText: _buildSearchText(product),
    createdAt: new Date(),
  }
  await collection.insertOne(doc)
  return doc
}
```

Worth doing at the same time, but a separate decision:

- **`201 Created`, not `200`.** The request created a resource. `checkout`
  already returns 201 for the same reason, so the API currently contradicts
  itself.
- `updateProduct` returns whatever `productService.update` gives back — worth
  checking for the same shape of mistake before assuming it is fine.

## How this was found

Not by reading the code. The Playwright API spec asserted the obvious thing
about a creation endpoint:

```js
expect((await res.json())._id).toBeTruthy()
```

It failed, and the cause turned out to be one object literal away from the
return statement. The in-process Vitest suite has an authorization test for
this same endpoint that passes — it asserts the product was **saved**, by
reading the database directly, and never looks at what the response body
contains.

That difference is the argument for having both layers. A test with database
access naturally asserts against the database; a test that only has HTTP is
forced to rely on the response, and so it is the one that notices the response
is wrong. Neither layer is redundant, and the gap between them is exactly where
this bug was living.

## Resolution

`add()` now builds the document once and both inserts and returns it:

```js
const doc = { ...product, searchText: _buildSearchText(product), createdAt: new Date() }
await collection.insertOne(doc)
return doc
```

The pinned test carried `test.fail()` while this was open. After the fix
Playwright reported:

```
Expected to fail, but passed.
```

That is the marker doing its job — it fails loudly the moment it becomes a
lie, instead of silently hiding a test that now works. The marker was then
removed and the test extended: it no longer just checks that an `_id` is
present, it fetches the product by that id and confirms it addresses the right
document.

Side effect worth noting: the response body now also carries `searchText` and
`createdAt`, because it is the stored document rather than the submitted one.
That matches what `GET /api/product` already returns, so the API is more
consistent than it was, not less.
