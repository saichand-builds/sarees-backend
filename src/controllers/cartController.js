import { getPool, sql } from '../config/database.js'

export async function getCart(req, res) {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        SELECT c.cart_id, c.product_id, c.quantity,
               p.name, p.price, p.discount_price, p.images
        FROM Cart c
        JOIN Products p ON p.product_id = c.product_id
        WHERE c.user_id = @user_id
      `)

    const cartItems = result.recordset.map(item => ({
      ...item,
      images: (() => { try { return JSON.parse(item.images) } catch { return [] } })(),
      price: item.discount_price || item.price,
    }))

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    res.json({ success: true, data: cartItems, subtotal })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get cart' })
  }
}

export async function addToCart(req, res) {
  try {
    const pool = await getPool()
    const { product_id, quantity = 1 } = req.body
    const user_id = req.user.user_id

    const existing = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('product_id', sql.Int, product_id)
      .query('SELECT * FROM Cart WHERE user_id = @user_id AND product_id = @product_id')

    if (existing.recordset.length) {
      await pool.request()
        .input('cart_id', sql.Int, existing.recordset[0].cart_id)
        .input('quantity', sql.Int, existing.recordset[0].quantity + quantity)
        .query('UPDATE Cart SET quantity = @quantity WHERE cart_id = @cart_id')
    } else {
      await pool.request()
        .input('user_id', sql.Int, user_id)
        .input('product_id', sql.Int, product_id)
        .input('quantity', sql.Int, quantity)
        .query('INSERT INTO Cart (user_id, product_id, quantity) VALUES (@user_id, @product_id, @quantity)')
    }

    res.json({ success: true, message: 'Added to cart' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add to cart' })
  }
}

export async function updateCartQuantity(req, res) {
  try {
    const pool = await getPool()
    const { cart_id, quantity } = req.body
    const user_id = req.user.user_id

    if (quantity <= 0) {
      await pool.request()
        .input('cart_id', sql.Int, cart_id)
        .input('user_id', sql.Int, user_id)
        .query('DELETE FROM Cart WHERE cart_id = @cart_id AND user_id = @user_id')
    } else {
      await pool.request()
        .input('cart_id', sql.Int, cart_id)
        .input('quantity', sql.Int, quantity)
        .input('user_id', sql.Int, user_id)
        .query('UPDATE Cart SET quantity = @quantity WHERE cart_id = @cart_id AND user_id = @user_id')
    }

    res.json({ success: true, message: 'Cart updated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update cart' })
  }
}

export async function removeFromCart(req, res) {
  try {
    const pool = await getPool()
    const { cart_id } = req.params
    const user_id = req.user.user_id

    await pool.request()
      .input('cart_id', sql.Int, cart_id)
      .input('user_id', sql.Int, user_id)
      .query('DELETE FROM Cart WHERE cart_id = @cart_id AND user_id = @user_id')

    res.json({ success: true, message: 'Removed from cart' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove from cart' })
  }
}

export async function clearCart(req, res) {
  try {
    const pool = await getPool()
    await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query('DELETE FROM Cart WHERE user_id = @user_id')
    res.json({ success: true, message: 'Cart cleared' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear cart' })
  }
}