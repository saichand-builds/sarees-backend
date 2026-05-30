import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlistController.js'

const router = Router()
router.use(authenticate)

router.get('/', getWishlist)
router.post('/add', addToWishlist)
router.delete('/:product_id', removeFromWishlist)

export default router