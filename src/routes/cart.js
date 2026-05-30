import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getCart, addToCart, updateCartQuantity, removeFromCart, clearCart } from '../controllers/cartController.js'

const router = Router()
router.use(authenticate)

router.get('/', getCart)
router.post('/add', addToCart)
router.put('/update', updateCartQuantity)
router.delete('/:cart_id', removeFromCart)
router.delete('/', clearCart)

export default router