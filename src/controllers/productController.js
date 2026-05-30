import { getPool, sql } from '../config/database.js'

export async function listProducts(req, res) {
  try {
    const pool = await getPool()
    const { search = '', category_id = '', page = 1, limit = 12 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)
    let where = 'WHERE p.is_active = 1'
    const request = pool.request()
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, offset)

    if (search) {
      where += ' AND (p.name LIKE @search OR p.description LIKE @search)'
      request.input('search', sql.NVarChar, `%${search}%`)
    }
    if (category_id) {
      where += ' AND p.category_id = @category_id'
      request.input('category_id', sql.Int, parseInt(category_id))
    }

    const result = await request.query(`
      SELECT p.*, c.name as category_name,
             COUNT(*) OVER() AS total_count
      FROM Products p
      LEFT JOIN Categories c ON c.category_id = p.category_id
      ${where}
      ORDER BY p.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `)

    const products = result.recordset.map(p => ({
      ...p,
      images: (() => { try { return JSON.parse(p.images) } catch { return [] } })(),
    }))

    res.json({
      success: true,
      data: products,
      total: result.recordset[0]?.total_count || 0,
      page: parseInt(page),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Failed to fetch products' })
  }
}

export async function getProduct(req, res) {
  try {
    const pool = await getPool()
    const { id } = req.params

    const productRes = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT p.*, c.name as category_name
        FROM Products p
        LEFT JOIN Categories c ON c.category_id = p.category_id
        WHERE p.product_id = @id AND p.is_active = 1
      `)

    if (!productRes.recordset.length)
      return res.status(404).json({ success: false, message: 'Product not found' })

    const product = productRes.recordset[0]
    product.images = (() => { try { return JSON.parse(product.images) } catch { return [] } })()
    res.json({ success: true, data: product })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get product' })
  }
}

export async function getCategories(req, res) {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .query('SELECT * FROM Categories WHERE is_active = 1 ORDER BY display_order')
    res.json({ success: true, data: result.recordset })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get categories' })
  }
}

export async function addReview(req, res) {
  try {
    const pool = await getPool()
    const { product_id, rating, comment } = req.body
    const user_id = req.user.user_id

    const orderCheck = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('product_id', sql.Int, product_id)
      .query(`
        SELECT 1 FROM OrderItems oi
        JOIN Orders o ON o.order_id = oi.order_id
        WHERE o.user_id = @user_id AND oi.product_id = @product_id AND o.order_status = 'delivered'
      `)

    if (orderCheck.recordset.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only review products you have purchased' })
    }

    const existing = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('product_id', sql.Int, product_id)
      .query('SELECT 1 FROM Reviews WHERE user_id = @user_id AND product_id = @product_id')

    if (existing.recordset.length) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this product' })
    }

    await pool.request()
      .input('product_id', sql.Int, product_id)
      .input('user_id', sql.Int, user_id)
      .input('rating', sql.TinyInt, rating)
      .input('comment', sql.NVarChar, comment)
      .query(`
        INSERT INTO Reviews (product_id, user_id, rating, comment, created_at)
        VALUES (@product_id, @user_id, @rating, @comment, GETDATE())
      `)

    await pool.request()
      .input('product_id', sql.Int, product_id)
      .query(`
        UPDATE Products SET
          rating = (SELECT AVG(CAST(rating AS FLOAT)) FROM Reviews WHERE product_id = @product_id),
          total_reviews = (SELECT COUNT(*) FROM Reviews WHERE product_id = @product_id)
        WHERE product_id = @product_id
      `)

    res.json({ success: true, message: 'Review submitted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Review failed' })
  }
}