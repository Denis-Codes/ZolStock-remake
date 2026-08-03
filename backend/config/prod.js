// Production reads everything from the environment. There is no fallback
// connection string on purpose: a missing MONGO_URL should fail loudly at
// boot rather than silently connecting somewhere unintended.
export default {
  dbURL: process.env.MONGO_URL,
  dbName: process.env.DB_NAME || 'zolstock_db',
  isGuestMode: false,
}
