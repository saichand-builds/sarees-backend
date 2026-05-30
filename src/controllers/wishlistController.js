import { getPool, sql } from '../config/database.js'

export async function getWishlist(req, res) {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        SELECT w.wishlist_id, w.product_id, w.added_at,
               p.name, p.price, p.discount_price, p.images
        FROM Wishlist w
        JOIN Products p ON p.product_id = w.product_id
        WHERE w.user_id = @user_id AND p.is_active = 1
      `)

    const items = result.recordset.map(item => ({
      ...item,
      images: (() => { try { return JSON.parse(item.images) } catch { return [] } })(),
    }))

    res.json({ success: true, data: items })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get wishlist' })
  }
}

export async function addToWishlist(req, res) {
  try {
    const pool = await getPool()
    const { product_id } = req.body
    const user_id = req.user.user_id

    const existing = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('product_id', sql.Int, product_id)
      .query('SELECT 1 FROM Wishlist WHERE user_id = @user_id AND product_id = @product_id')

    if (!existing.recordset.length) {
      await pool.request()
        .input('user_id', sql.Int, user_id)
        .input('product_id', sql.Int, product_id)
        .query('INSERT INTO Wishlist (user_id, product_id) VALUES (@user_id, @product_id)')
    }

    res.json({ success: true, message: 'Added to wishlist' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add to wishlist' })
  }
}

export async function removeFromWishlist(req, res) {
  try {
    const pool = await getPool()
    const { product_id } = req.params
    const user_id = req.user.user_id

    await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('product_id', sql.Int, product_id)
      .query('DELETE FROM Wishlist WHERE user_id = @user_id AND product_id = @product_id')

    res.json({ success: true, message: 'Removed from wishlist' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist' })
  }
}