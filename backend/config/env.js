// Side-effect module: loads .env into process.env.
//
// This exists as its own file because ES module imports are hoisted and
// evaluated before any statement in the importing module. Calling
// dotenv.config() at the top of index.js would run *after* dev.js/prod.js had
// already read process.env and captured undefined. Importing this first
// guarantees the variables are in place before any config is evaluated.
import dotenv from 'dotenv'

dotenv.config()
