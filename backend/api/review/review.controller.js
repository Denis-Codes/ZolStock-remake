import { logger } from '../../services/logger.service.js'
import { socketService } from '../../services/socket.service.js'
import { userService } from '../user/user.service.js'
import { authService } from '../auth/auth.service.js'
import { reviewService } from './review.service.js'

/**
 * Notifications are not part of the write.
 *
 * Both handlers below used to broadcast inside the same try/catch as the
 * database work, so a socket failure after a completed write answered
 * `400 Failed to add review` — with the review in the database, the score
 * incremented and a refreshed cookie already issued. The client then told the
 * customer to try again, and the retry produced a second review and +20 score.
 * The misleading error actively encouraged the action that compounded it.
 * See bugs/BUG-007.
 *
 * The fix is a boundary, not a guard: the response is sent first, and anything
 * after it is best-effort. A failure here is logged and goes no further,
 * because there is no longer a response it could honestly change.
 */
async function notify(label, send) {
	try {
		await send()
	} catch (err) {
		logger.error(`${label} succeeded, but the broadcast failed`, err)
	}
}

export async function getReviews(req, res) {
	try {
		const reviews = await reviewService.query(req.query)
		res.send(reviews)
	} catch (err) {
		logger.error('Cannot get reviews', err)
		res.status(400).send({ err: 'Failed to get reviews' })
	}
}

export async function deleteReview(req, res) {
	var { loggedinUser } = req
    const { id: reviewId } = req.params
    
	try {
		const deletedCount = await reviewService.remove(reviewId)
		if (deletedCount !== 1) {
			return res.status(400).send({ err: 'Cannot remove review' })
		}

		res.send({ msg: 'Deleted successfully' })
	} catch (err) {
		logger.error('Failed to delete review', err)
		return res.status(400).send({ err: 'Failed to delete review' })
	}

	// Past the response, and deliberately so.
	await notify('review-removed', () =>
		// Awaited: broadcast is async, and an unawaited rejection escapes the
		// try/catch entirely and becomes an unhandled rejection instead.
		socketService.broadcast({ type: 'review-removed', data: reviewId, userId: loggedinUser._id })
	)
}

export async function addReview(req, res) {
	var { loggedinUser } = req

	try {
		var review = req.body
		const { aboutUserId } = review
		review.byUserId = loggedinUser._id
		review = await reviewService.add(review)

		// Give the user credit for adding a review
		// var user = await userService.getById(review.byUserId)
		// user.score += 10

		loggedinUser.score += 10
		await userService.update(loggedinUser)

		// Update user score in login token as well

		const loginToken = authService.getLoginToken(loggedinUser)
		res.cookie('loginToken', loginToken)

		// prepare the updated review for sending out

		review.byUser = loggedinUser
		review.aboutUser = await userService.getById(aboutUserId)

		delete review.aboutUser.givenReviews
		delete review.aboutUserId
		delete review.byUserId

		res.send(review)
	} catch (err) {
		logger.error('Failed to add review', err)
		return res.status(400).send({ err: 'Failed to add review' })
	}

	// Past the response. Everything the endpoint promised has happened and been
	// reported; what follows is delivery, and delivery does not get a vote on
	// whether the write succeeded.
	await notify('review-added', async () => {
		await socketService.broadcast({ type: 'review-added', data: review, userId: loggedinUser._id })
		await socketService.emitToUser({ type: 'review-about-you', data: review, userId: review.aboutUser._id })

		const fullUser = await userService.getById(loggedinUser._id)
		socketService.emitTo({ type: 'user-updated', data: fullUser, label: fullUser._id })
	})
}
