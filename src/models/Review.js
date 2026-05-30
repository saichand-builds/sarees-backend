import { getPool, sql } from '../config/database.js'

export const Review = {
  async create(reviewData) {
    const pool = await getPool()
    const { product_id, user_id, rating, comment } = reviewData
    
    const result = await pool.request()
      .input('product_id', sql.Int, product_id)
      .input('user_id', sql.Int, user_id)
      .input('rating', sql.TinyInt, rating)
      .input('comment', sql.NVarChar, comment || null)
      .query(`
        INSERT INTO Reviews (product_id, user_id, rating, comment, created_at)
        OUTPUT INSERTED.*
        VALUES (@product_id, @user_id, @rating, @comment, GETDATE())
      `)
    
    return result.recordset[0]
  },

  async findByProduct(product_id, limit = 10) {
    const pool = await getPool()
    const result = await pool.request()
      .input('product_id', sql.Int, product_id)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) r.*, u.first_name, u.last_name
        FROM Reviews r
        JOIN Users u ON u.user_id = r.user_id
        WHERE r.product_id = @product_id AND r.is_visible = 1
        ORDER BY r.created_at DESC
      `)
    return result.recordset
  },

  async hasUserReviewed(product_id, user_id) {
    const pool = await getPool()
    const result = await pool.request()
      .input('product_id', sql.Int, product_id)
      .input('user_id', sql.Int, user_id)
      .query('SELECT 1 FROM Reviews WHERE product_id = @product_id AND user_id = @user_id')
    return result.recordset.length > 0
  },

  async getProductRating(product_id) {
    const pool = await getPool()
    const result = await pool.request()
      .input('product_id', sql.Int, product_id)
      .query(`
        SELECT 
          AVG(CAST(rating AS FLOAT)) AS avg_rating,
          COUNT(*) AS total_reviews
        FROM Reviews
        WHERE product_id = @product_id AND is_visible = 1
      `)
    return result.recordset[0]
  }
}

export default Review