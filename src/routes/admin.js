import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { 
  getAdminDashboard, getAllOrders, updateOrderStatus, 
  createProduct, updateProduct, getAllUsers, updateUserStatus 
} from '../controllers/adminController.js'

const router = Router()
router.use(authenticate, authorize('admin'))

router.get('/dashboard', getAdminDashboard)
router.get('/orders', getAllOrders)
router.put('/orders/:id/status', updateOrderStatus)
router.post('/products', createProduct)
router.put('/products/:id', updateProduct)
router.get('/users', getAllUsers)
router.put('/users/:id/status', updateUserStatus)

export default router