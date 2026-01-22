import { logger } from '../../services/logger.service.js'
import { productService } from './product.service.js'

export async function getProducts(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || '',
      category: req.query.category || '',
      subCategory: req.query.subCategory || '',
      minPrice: req.query.minPrice ? +req.query.minPrice : null,
      maxPrice: req.query.maxPrice ? +req.query.maxPrice : null,
      sortField: req.query.sortField || '',
      sortDir: +req.query.sortDir || 1,
      pageIdx: req.query.pageIdx ? +req.query.pageIdx : 0,
    }

    const products = await productService.query(filterBy)
    res.json(products)
  } catch (err) {
    logger.error('Failed to get products', err)
    res.status(400).send({ err: 'Failed to get products' })
  }
}


export async function getProductById(req, res) {
	try {
		const productId = req.params.id
		const product = await productService.getById(productId)
		res.json(product)
	} catch (err) {
		logger.error('Failed to get product', err)
		res.status(400).send({ err: 'Failed to get product' })
	}
}

export async function addProduct(req, res) {
	const { loggedinUser, body: product } = req

	try {
		product.owner = loggedinUser
		const addedProduct = await productService.add(product)
		res.json(addedProduct)
	} catch (err) {
		logger.error('Failed to add product', err)
		res.status(400).send({ err: 'Failed to add product' })
	}
}

export async function updateProduct(req, res) {
	const { loggedinUser, body: product } = req
    const { _id: userId, isAdmin } = loggedinUser

    if(!isAdmin && product.owner._id !== userId) {
        res.status(403).send('Not your product...')
        return
    }

	try {
		const updatedProduct = await productService.update(product)
		res.json(updatedProduct)
	} catch (err) {
		logger.error('Failed to update product', err)
		res.status(400).send({ err: 'Failed to update product' })
	}
}

export async function removeProduct(req, res) {
	try {
		const productId = req.params.id
		const removedId = await productService.remove(productId)

		res.send(removedId)
	} catch (err) {
		logger.error('Failed to remove product', err)
		res.status(400).send({ err: 'Failed to remove product' })
	}
}

export async function addProductMsg(req, res) {
	const { loggedinUser } = req

	try {
		const productId = req.params.id
		const msg = {
			txt: req.body.txt,
			by: loggedinUser,
		}
		const savedMsg = await productService.addProductMsg(productId, msg)
		res.json(savedMsg)
	} catch (err) {
		logger.error('Failed to update product', err)
		res.status(400).send({ err: 'Failed to update product' })
	}
}

export async function removeProductMsg(req, res) {
	try {
		const productId = req.params.id
		const { msgId } = req.params

		const removedId = await productService.removeProductMsg(productId, msgId)
		res.send(removedId)
	} catch (err) {
		logger.error('Failed to remove product msg', err)
		res.status(400).send({ err: 'Failed to remove product msg' })
	}
}

export async function getCategories(req, res) {
  try {
    const categories = await productService.getCategories()
    res.json(categories)
  } catch (err) {
    logger.error('Failed to get categories', err)
    res.status(400).send({ err: 'Failed to get categories' })
  }
}

export async function getSubCategories(req, res) {
  try {
    const subCats = await productService.getSubCategories(req.query.category || '')
    res.json(subCats)
  } catch (err) {
    logger.error('Failed to get sub categories', err)
    res.status(400).send({ err: 'Failed to get sub categories' })
  }
}
