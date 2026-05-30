import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

function signToken(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

function safeUser(u) {
  const { password_hash, ...rest } = u
  return rest
}

export async function register(req, res) {
  try {
    const { first_name, last_name, email, phone, password } = req.body
    
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' })
    }

    const hash = await bcrypt.hash(password, 12)
    const user = await User.create({
      first_name, last_name, email, phone,
      password_hash: hash,
      role: 'customer'
    })

    res.status(201).json({ success: true, token: signToken(user), user: safeUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Registration failed' })
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body
    
    const user = await User.findByEmail(email)
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    await User.updateLastLogin(user.user_id)

    res.json({ success: true, token: signToken(user), user: safeUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Login failed' })
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.user_id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    res.json({ success: true, user: safeUser(user) })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' })
  }
}

export async function updateProfile(req, res) {
  try {
    const { first_name, last_name, phone, address, city, state, pincode } = req.body
    const user = await User.update(req.user.user_id, {
      first_name, last_name, phone, address, city, state, pincode
    })
    res.json({ success: true, user: safeUser(user), message: 'Profile updated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed' })
  }
}