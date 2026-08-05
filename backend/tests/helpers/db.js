import { dbService } from '../../services/db.service.js'

/**
 * Thin seeding helpers.
 *
 * These insert straight into Mongo rather than going through the API. That is
 * deliberate: a test about checkout should not fail because the *cart* endpoint
 * has a bug. Arrange with the database, act through the API, assert on both.
 *
 * The exception is when the setup path IS what you are testing — then drive the
 * API, because that is the behaviour under test.
 */

export async function seedProducts(...products) {
  const collection = await dbService.getCollection('products')
  await collection.insertMany(products)
  return products
}

export async function seedUsers(...users) {
  const collection = await dbService.getCollection('user')
  await collection.insertMany(users)
  return users
}

export async function seedCart(cart) {
  const collection = await dbService.getCollection('carts')
  await collection.insertOne(cart)
  return cart
}

export async function seedOrders(...orders) {
  const collection = await dbService.getCollection('orders')
  await collection.insertMany(orders)
  return orders
}

/** Reads a product back — for asserting on state the API changed. */
export async function findProduct(query) {
  const collection = await dbService.getCollection('products')
  return collection.findOne(query)
}

export async function findUser(query) {
  const collection = await dbService.getCollection('user')
  return collection.findOne(query)
}

export async function findOrders(query = {}) {
  const collection = await dbService.getCollection('orders')
  return collection.find(query).toArray()
}

export async function findCart(userId) {
  const collection = await dbService.getCollection('carts')
  return collection.findOne({ userId: String(userId) })
}

export async function countDocuments(collectionName, query = {}) {
  const collection = await dbService.getCollection(collectionName)
  return collection.countDocuments(query)
}
