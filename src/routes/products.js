import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { 
  listProducts, 
  getProduct, 
  getCategories, 
  addReview,
  testConnection 
} from '../controllers/productController.js'

const router = Router()

router.get('/', listProducts)
router.get('/categories', getCategories)
router.get('/test/connection', testConnection)  // Debug endpoint
router.get('/:id', getProduct)
router.post('/review', authenticate, addReview)

export default router