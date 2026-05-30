import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { createOrder, getOrders, getOrder } from '../controllers/orderController.js'

const router = Router()
router.use(authenticate)

router.post('/create', createOrder)
router.get('/', getOrders)
router.get('/:id', getOrder)

export default router