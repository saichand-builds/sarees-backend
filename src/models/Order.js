import { getPool, sql } from '../config/database.js'

function generateOrderNumber() {
  return `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export const Order = {
  async create(orderData) {
    const pool = await getPool()
    const { 
      user_id, subtotal, shipping_charge, discount, total_amount, 
      payment_method, shipping_address, shipping_city, shipping_state, shipping_pincode 
    } = orderData
    
    const order_number = generateOrderNumber()
    
    const result = await pool.request()
      .input('order_number', sql.NVarChar, order_number)
      .input('user_id', sql.Int, user_id)
      .input('subtotal', sql.Decimal, subtotal)
      .input('shipping_charge', sql.Decimal, shipping_charge)
      .input('discount', sql.Decimal, discount || 0)
      .input('total_amount', sql.Decimal, total_amount)
      .input('payment_method', sql.NVarChar, payment_method)
      .input('shipping_address', sql.NVarChar, shipping_address)
      .input('shipping_city', sql.NVarChar, shipping_city || null)
      .input('shipping_state', sql.NVarChar, shipping_state || null)
      .input('shipping_pincode', sql.NVarChar, shipping_pincode || null)
      .query(`
        INSERT INTO Orders 
          (order_number, user_id, subtotal, shipping_charge, discount, total_amount, 
           payment_method, shipping_address, shipping_city, shipping_state, shipping_pincode, created_at)
        OUTPUT INSERTED.order_id
        VALUES 
          (@order_number, @user_id, @subtotal, @shipping_charge, @discount, @total_amount,
           @payment_method, @shipping_address, @shipping_city, @shipping_state, @shipping_pincode, GETDATE())
      `)
    
    return result.recordset[0].order_id
  },

  async addOrderItem(order_id, item) {
    const pool = await getPool()
    const { product_id, product_name, product_image, quantity, unit_price, total_price } = item
    
    await pool.request()
      .input('order_id', sql.Int, order_id)
      .input('product_id', sql.Int, product_id)
      .input('product_name', sql.NVarChar, product_name)
      .input('product_image', sql.NVarChar, product_image || null)
      .input('quantity', sql.Int, quantity)
      .input('unit_price', sql.Decimal, unit_price)
      .input('total_price', sql.Decimal, total_price)
      .query(`
        INSERT INTO OrderItems 
          (order_id, product_id, product_name, product_image, quantity, unit_price, total_price, created_at)
        VALUES 
          (@order_id, @product_id, @product_name, @product_image, @quantity, @unit_price, @total_price, GETDATE())
      `)
  },

  async findById(order_id, user_id = null) {
    const pool = await getPool()
    let query = `
      SELECT o.*, u.first_name, u.last_name, u.email
      FROM Orders o
      JOIN Users u ON u.user_id = o.user_id
      WHERE o.order_id = @order_id
    `
    const request = pool.request().input('order_id', sql.Int, order_id)
    
    if (user_id) {
      query += ' AND o.user_id = @user_id'
      request.input('user_id', sql.Int, user_id)
    }
    
    const result = await request.query(query)
    
    if (result.recordset[0]) {
      const order = result.recordset[0]
      const itemsResult = await pool.request()
        .input('order_id', sql.Int, order_id)
        .query('SELECT * FROM OrderItems WHERE order_id = @order_id')
      order.items = itemsResult.recordset
      return order
    }
    return null
  },

  async findByUser(user_id, filters = {}) {
    const pool = await getPool()
    const { status = null, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit
    
    let where = 'WHERE o.user_id = @user_id'
    const request = pool.request()
      .input('user_id', sql.Int, user_id)
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
    
    if (status) {
      where += ' AND o.order_status = @status'
      request.input('status', sql.NVarChar, status)
    }
    
    const result = await request.query(`
      SELECT o.*,
             COUNT(*) OVER() AS total_count
      FROM Orders o
      ${where}
      ORDER BY o.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `)
    
    const orders = result.recordset
    for (const order of orders) {
      const itemsResult = await pool.request()
        .input('order_id', sql.Int, order.order_id)
        .query('SELECT * FROM OrderItems WHERE order_id = @order_id')
      order.items = itemsResult.recordset
    }
    
    return {
      data: orders,
      total: result.recordset[0]?.total_count || 0,
      page,
      totalPages: Math.ceil((result.recordset[0]?.total_count || 0) / limit)
    }
  },

  async updateStatus(order_id, status, tracking_number = null) {
    const pool = await getPool()
    await pool.request()
      .input('order_id', sql.Int, order_id)
      .input('status', sql.NVarChar, status)
      .input('tracking', sql.NVarChar, tracking_number)
      .query(`
        UPDATE Orders SET 
          order_status = @status,
          tracking_number = @tracking,
          delivered_at = CASE WHEN @status = 'delivered' THEN GETDATE() ELSE delivered_at END,
          cancelled_at = CASE WHEN @status = 'cancelled' THEN GETDATE() ELSE cancelled_at END
        WHERE order_id = @order_id
      `)
  },

  async updatePayment(order_id, razorpay_order_id, razorpay_payment_id) {
    const pool = await getPool()
    await pool.request()
      .input('order_id', sql.Int, order_id)
      .input('razorpay_order_id', sql.NVarChar, razorpay_order_id)
      .input('razorpay_payment_id', sql.NVarChar, razorpay_payment_id)
      .query(`
        UPDATE Orders SET 
          payment_status = 'paid',
          order_status = 'confirmed',
          razorpay_order_id = @razorpay_order_id,
          razorpay_payment_id = @razorpay_payment_id
        WHERE order_id = @order_id
      `)
  },

  async getAllAdmin(filters = {}) {
    const pool = await getPool()
    const { status = null, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit
    
    let where = 'WHERE 1=1'
    const request = pool.request()
      .input('limit', sql.Int, limit)
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
    
    return {
      data: result.recordset,
      total: result.recordset[0]?.total_count || 0,
      page,
      totalPages: Math.ceil((result.recordset[0]?.total_count || 0) / limit)
    }
  },

  async getStats() {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS total_orders,
        ISNULL(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS total_revenue,
        ISNULL(SUM(CASE WHEN MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE()) THEN total_amount ELSE 0 END), 0) AS revenue_this_month,
        COUNT(CASE WHEN order_status = 'pending' THEN 1 END) AS pending_orders
      FROM Orders
    `)
    return result.recordset[0]
  }
}

export default Order