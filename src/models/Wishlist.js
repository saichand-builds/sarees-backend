import { getPool, sql } from '../config/database.js'

export const Wishlist = {
  async getWishlist(user_id) {
    const pool = await getPool()
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT w.wishlist_id, w.product_id, w.added_at,
               p.name, p.price, p.discount_price, p.images, p.rating, p.total_reviews
        FROM Wishlist w
        JOIN Products p ON p.product_id = w.product_id
        WHERE w.user_id = @user_id AND p.is_active = 1
        ORDER BY w.added_at DESC
      `)
    
    return result.recordset.map(item => ({
      ...item,
      images: JSON.parse(item.images),
      price: item.discount_price || item.price
    }))
  },

  async addItem(user_id, product_id) {
    const pool = await getPool()
    const existing = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('product_id', sql.Int, product_id)
      .query('SELECT 1 FROM Wishlist WHERE user_id = @user_id AND product_id = @product_id')
    
    if (!existing.recordset.length) {
      await pool.request()
        .input('user_id', sql.Int, user_id)
        .input('product_id', sql.Int, product_id)
        .query('INSERT INTO Wishlist (user_id, product_id, added_at) VALUES (@user_id, @product_id, GETDATE())')
      return true
    }
    return false
  },

  async removeItem(user_id, product_id) {
    const pool = await getPool()
    await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('product_id', sql.Int, product_id)
      .query('DELETE FROM Wishlist WHERE user_id = @user_id AND product_id = @product_id')
  },

  async isInWishlist(user_id, product_id) {
    const pool = await getPool()
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('product_id', sql.Int, product_id)
      .query('SELECT 1 FROM Wishlist WHERE user_id = @user_id AND product_id = @product_id')
    return result.recordset.length > 0
  },

  async count(user_id) {
    const pool = await getPool()
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query('SELECT COUNT(*) AS count FROM Wishlist WHERE user_id = @user_id')
    return result.recordset[0].count
  }
}

export default Wishlist