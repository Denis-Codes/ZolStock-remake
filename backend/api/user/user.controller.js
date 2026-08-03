import { userService } from './user.service.js'
import { toNumber } from '../../services/query.util.js'
import { asyncHandler, ForbiddenError } from '../../middlewares/error.middleware.js'

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.params.id)
  res.json(user)
})

export const getUsers = asyncHandler(async (req, res) => {
  const filterBy = {
    txt: req.query?.txt || '',
    minBalance: toNumber(req.query?.minBalance) ?? 0,
  }
  const users = await userService.query(filterBy)
  res.json(users)
})

export const deleteUser = asyncHandler(async (req, res) => {
  await userService.remove(req.params.id)
  res.json({ msg: 'Deleted successfully' })
})

export const updateUser = asyncHandler(async (req, res) => {
  const { loggedinUser } = req
  const targetId = req.params.id

  // The previous version updated whatever _id arrived in the body, so any
  // authenticated user could rewrite any other user's record. Bind the update
  // to the URL and require ownership (or admin).
  if (!loggedinUser.isAdmin && loggedinUser._id !== targetId) {
    throw new ForbiddenError('You can only update your own profile')
  }

  const userToUpdate = { ...req.body, _id: targetId }

  // score is server-owned; only an admin may set it.
  if (!loggedinUser.isAdmin) delete userToUpdate.score

  const savedUser = await userService.update(userToUpdate)
  res.json(savedUser)
})
