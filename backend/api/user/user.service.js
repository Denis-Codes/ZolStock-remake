import {dbService} from '../../services/db.service.js'
import {logger} from '../../services/logger.service.js'
import {reviewService} from '../review/review.service.js'
import { ObjectId } from 'mongodb'
import { escapeRegex, isObjectIdLike } from '../../services/query.util.js'
import { NotFoundError } from '../../middlewares/error.middleware.js'

export const userService = {
	add, // Create (Signup)
	getById, // Read (Profile page)
	update, // Update (Edit profile)
	remove, // Delete (remove user)
	query, // List (of users)
	getByUsername, // Used for Login
}

async function query(filterBy = {}) {
    const criteria = _buildCriteria(filterBy)
    try {
        const collection = await dbService.getCollection('user')
        var users = await collection.find(criteria).toArray()
        users = users.map(user => {
            delete user.password
            user.createdAt = user._id.getTimestamp()
            // Returning fake fresh data
            // user.createdAt = Date.now() - (1000 * 60 * 60 * 24 * 3) // 3 days ago
            return user
        })
        return users
    } catch (err) {
        logger.error('cannot find users', err)
        throw err
    }
}

async function getById(userId) {
    try {
        // A malformed id threw a raw BSON error from createFromHexString and
        // surfaced as a 500; a valid-but-unknown id then hit `delete
        // user.password` on null and threw too. Both are 404s.
        if (!isObjectIdLike(userId)) throw new NotFoundError(`User ${userId} not found`)

        var criteria = { _id: ObjectId.createFromHexString(userId) }

        const collection = await dbService.getCollection('user')
        const user = await collection.findOne(criteria)
        if (!user) throw new NotFoundError(`User ${userId} not found`)

        delete user.password

        criteria = { byUserId: userId }

        user.givenReviews = await reviewService.query(criteria)
        user.givenReviews = user.givenReviews.map(review => {
            delete review.byUser
            return review
        })

        return user
    } catch (err) {
        if (err instanceof NotFoundError) throw err
        logger.error(`while finding user by id: ${userId}`, err)
        throw err
    }
}

async function getByUsername(username) {
	try {
		const collection = await dbService.getCollection('user')
		const user = await collection.findOne({ username })
		return user
	} catch (err) {
		logger.error(`while finding user by username: ${username}`, err)
		throw err
	}
}

async function remove(userId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(userId) }

        const collection = await dbService.getCollection('user')
        await collection.deleteOne(criteria)
    } catch (err) {
        logger.error(`cannot remove user ${userId}`, err)
        throw err
    }
}

async function update(user) {
    try {
        if (!isObjectIdLike(user._id)) throw new NotFoundError(`User ${user._id} not found`)
        const _id = ObjectId.createFromHexString(user._id)

        // Build $set from only the fields actually supplied. The previous
        // version always wrote fullname and score, so a request updating just
        // one of them blanked the other to undefined.
        const fields = {}
        if (user.fullname !== undefined) fields.fullname = user.fullname
        if (user.imgUrl !== undefined) fields.imgUrl = user.imgUrl
        if (user.score !== undefined) fields.score = user.score

        const collection = await dbService.getCollection('user')

        if (Object.keys(fields).length) {
            await collection.updateOne({ _id }, { $set: fields })
        }

        const saved = await collection.findOne({ _id })
        if (!saved) throw new NotFoundError(`User ${user._id} not found`)

        delete saved.password
        return saved
    } catch (err) {
        if (err instanceof NotFoundError) throw err
        logger.error(`cannot update user ${user._id}`, err)
        throw err
    }
}

async function add(user) {
	try {
		// peek only updatable fields!
		const userToAdd = {
			username: user.username,
			password: user.password,
			fullname: user.fullname,
			imgUrl: user.imgUrl,
			// Never taken from the caller — see authService.signup.
			isAdmin: false,
			score: 100,
			createdAt: new Date(),
		}
		const collection = await dbService.getCollection('user')

		// The "username already taken" check in authService.signup is a
		// read-then-write, so two simultaneous signups can both pass it. The
		// unique index is what actually guarantees it.
		await collection.createIndex({ username: 1 }, { unique: true })
		await collection.insertOne(userToAdd)

		delete userToAdd.password
		return userToAdd
	} catch (err) {
		logger.error('cannot add user', err)
		throw err
	}
}

function _buildCriteria(filterBy) {
	const criteria = {}
	if (filterBy.txt) {
		// Escaped: raw user input compiled into a regex crashes on "(" and is
		// a ReDoS vector on inputs like "(a+)+$".
		const txtCriteria = { $regex: escapeRegex(filterBy.txt), $options: 'i' }
		criteria.$or = [
			{
				username: txtCriteria,
			},
			{
				fullname: txtCriteria,
			},
		]
	}
	if (filterBy.minBalance) {
		criteria.score = { $gte: filterBy.minBalance }
	}
	return criteria
}