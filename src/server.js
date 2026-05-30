import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { getPool } from './config/database.js'

import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import cartRoutes from './routes/cart.js'
import orderRoutes from './routes/orders.js'
import wishlistRoutes from './routes/wishlist.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

const app = express()
const server = http.createServer(app)

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }))
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }))

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' })
})

const PORT = process.env.PORT || 5000
getPool()
  .then(() => server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`)))
  .catch((err) => { console.error('DB connection failed:', err); process.exit(1) })