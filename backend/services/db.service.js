import { MongoClient } from 'mongodb'

import { config } from '../config/index.js'
import { logger } from './logger.service.js'

export const dbService = { getCollection, ping, close }

// The in-flight *promise* is cached, not the resolved connection. Caching only
// the resolved value leaves a window in which several concurrent first
// requests each see a null connection and open their own client, leaking pools.
var dbConnPromise = null
var client = null

async function getCollection(collectionName) {
  try {
    const db = await _connect()
    return db.collection(collectionName)
  } catch (err) {
    logger.error('Failed to get Mongo collection', err)
    throw err
  }
}

async function _connect() {
  if (dbConnPromise) return dbConnPromise

  dbConnPromise = (async () => {
    try {
      client = await MongoClient.connect(config.dbURL, {
        maxPoolSize: 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 10000,
        retryWrites: true,
      })
      logger.info(`Connected to MongoDB, db: ${config.dbName}`)
      return client.db(config.dbName)
    } catch (err) {
      // Clear the cache so a later request can retry, instead of every
      // subsequent call awaiting the same permanently-rejected promise.
      dbConnPromise = null
      client = null
      logger.error('Cannot Connect to DB', err)
      throw err
    }
  })()

  return dbConnPromise
}

/** Cheap liveness probe for /api/health. */
async function ping() {
  try {
    const db = await _connect()
    await db.command({ ping: 1 })
    return true
  } catch (err) {
    return false
  }
}

async function close() {
  if (!client) return
  await client.close()
  client = null
  dbConnPromise = null
  logger.info('MongoDB connection closed')
}
