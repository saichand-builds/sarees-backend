import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { listProducts, getProduct, getCategories, addReview } from '../controllers/productController.js'

const router = Router()

router.get('/', listProducts)
router.get('/categories', getCategories)
router.get('/:id', getProduct)
router.post('/review', authenticate, addReview)

export default router