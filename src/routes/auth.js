import { Router } from 'express'
import { register, login, getMe, debugLogin } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/debug', debugLogin)  // Debug endpoint
router.get('/me', authenticate, getMe)

export default router