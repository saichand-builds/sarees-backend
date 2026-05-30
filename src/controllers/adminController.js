import { getPool, sql } from '../config/database.js'

export async function getAdminDashboard(req, res) {
  try {
    const pool = await getPool()
    const [stats, recentOrders, topProducts, lowStock] = await Promise.all([
      pool.request().query(`
        SELECT
          (SELECT COUNT(*) FROM Users WHERE role = 'customer') AS total_customers,
          (SELECT COUNT(*) FROM Products WHERE is_active = 1) AS total_products,
          (SELECT COUNT(*) FROM Orders) AS total_orders,
          (SELECT ISNULL(SUM(total_amount), 0) FROM Orders WHERE payment_status = 'paid') AS total_revenue,
          (SELECT ISNULL(SUM(total_amount), 0) FROM Orders WHERE MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE())) AS revenue_this_month
      `),
      pool.request().query(`
        SELECT TOP 5 o.order_id, o.order_number, o.total_amount, o.order_status, o.created_at,
               u.first_name, u.last_name
        FROM Orders o
        JOIN Users u ON u.user_id = o.user_id
        ORDER BY o.created_at DESC
      `),
      pool.request().query(`
        SELECT TOP 5 p.product_id, p.name, p.price, p.total_reviews, p.rating, p.images
        FROM Products p
        WHERE p.is_active = 1
        ORDER BY p.total_reviews DESC
      `),
      pool.request().query(`
        SELECT product_id, name, stock_quantity
        FROM Products
        WHERE stock_quantity < 10 AND is_active = 1
        ORDER BY stock_quantity
      `),
    ])

    res.json({
      success: true,
      stats: stats.recordset[0],
      recentOrders: recentOrders.recordset,
      topProducts: topProducts.recordset,
      lowStock: lowStock.recordset,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Failed' })
  }
}

export async function getAllOrders(req, res) {
  try {
    const pool = await getPool()
    const { status = '', page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)
    
    let where = 'WHERE 1=1'
    const request = pool.request()
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, offset)
    
    if (status) {
      where += ' AND o.order_status = @status'
      request.input('status', sql.NVarChar, status)
    }

    const result = await request.query(`
      SELECT o.*, u.first_name, u.last_name, u.email, u.phone,
             COUNT(*) OVER() AS total_count
      FROM Orders o
      JOIN Users u ON u.user_id = o.user_id
      ${where}
      ORDER BY o.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `)

    res.json({ success: true, data: result.recordset, total: result.recordset[0]?.total_count || 0 })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' })
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const pool = await getPool()
    const { id } = req.params
    const { order_status, tracking_number } = req.body

    await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, order_status)
      .input('tracking', sql.NVarChar, tracking_number)
      .query(`
        UPDATE Orders SET 
          order_status = @status,
          tracking_number = @tracking,
          delivered_at = CASE WHEN @status = 'delivered' THEN GETDATE() ELSE delivered_at END,
          cancelled_at = CASE WHEN @status = 'cancelled' THEN GETDATE() ELSE cancelled_at END
        WHERE order_id = @id
      `)

    res.json({ success: true, message: 'Order status updated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' })
  }
}

export async function createProduct(req, res) {
  try {
    const pool = await getPool()
    const { name, slug, description, category_id, fabric, color, occasion, work_type, price, discount_price, stock_quantity, images, is_featured, is_new } = req.body

    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('slug', sql.NVarChar, slug)
      .input('description', sql.NVarChar, description)
      .input('category_id', sql.Int, category_id)
      .input('fabric', sql.NVarChar, fabric)
      .input('color', sql.NVarChar, color)
      .input('occasion', sql.NVarChar, occasion)
      .input('work_type', sql.NVarChar, work_type)
      .input('price', sql.Decimal, price)
      .input('discount_price', sql.Decimal, discount_price)
      .input('stock_quantity', sql.Int, stock_quantity)
      .input('images', sql.NVarChar, JSON.stringify(images || []))
      .input('is_featured', sql.Bit, is_featured ? 1 : 0)
      .input('is_new', sql.Bit, is_new ? 1 : 0)
      .query(`
        INSERT INTO Products 
          (name, slug, description, category_id, fabric, color, occasion, work_type, 
           price, discount_price, stock_quantity, images, is_featured, is_new, created_at)
        VALUES 
          (@name, @slug, @description, @category_id, @fabric, @color, @occasion, @work_type,
           @price, @discount_price, @stock_quantity, @images, @is_featured, @is_new, GETDATE())
      `)

    res.status(201).json({ success: true, message: 'Product created' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Failed to create product' })
  }
}

export async function updateProduct(req, res) {
  try {
    const pool = await getPool()
    const { id } = req.params
    const updates = req.body

    let query = 'UPDATE Products SET updated_at = GETDATE()'
    const request = pool.request().input('id', sql.Int, id)

    const fields = ['name', 'slug', 'description', 'category_id', 'fabric', 'color', 'occasion', 'work_type', 'price', 'discount_price', 'stock_quantity', 'is_featured', 'is_new', 'is_active']
    for (const field of fields) {
      if (updates[field] !== undefined) {
        query += `, ${field} = @${field}`
        request.input(field, 
          field === 'price' || field === 'discount_price' ? sql.Decimal :
          field === 'category_id' || field === 'stock_quantity' ? sql.Int :
          field === 'is_featured' || field === 'is_new' || field === 'is_active' ? sql.Bit :
          sql.NVarChar, 
          updates[field]
        )
      }
    }
    if (updates.images) {
      query += `, images = @images`
      request.input('images', sql.NVarChar, JSON.stringify(updates.images))
    }

    query += ' WHERE product_id = @id'
    await request.query(query)

    res.json({ success: true, message: 'Product updated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product' })
  }
}

export async function getAllUsers(req, res) {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .query('SELECT user_id, first_name, last_name, email, phone, role, is_active, created_at, last_login FROM Users ORDER BY created_at DESC')
    res.json({ success: true, data: result.recordset })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' })
  }
}

export async function updateUserStatus(req, res) {
  try {
    const pool = await getPool()
    const { id } = req.params
    const { is_active } = req.body

    await pool.request()
      .input('id', sql.Int, id)
      .input('is_active', sql.Bit, is_active ? 1 : 0)
      .query('UPDATE Users SET is_active = @is_active WHERE user_id = @id')

    res.json({ success: true, message: 'User status updated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' })
  }
}