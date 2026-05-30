import { getPool, sql } from '../config/database.js'
import crypto from 'crypto'

function generateOrderNumber() {
  return `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export async function createOrder(req, res) {
  try {
    const pool = await getPool()
    const user_id = req.user.user_id
    const { shipping_address, shipping_city, shipping_state, shipping_pincode, payment_method, coupon_code } = req.body

    const cartRes = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT c.product_id, c.quantity, p.name, p.price, p.discount_price, p.images
        FROM Cart c
        JOIN Products p ON p.product_id = c.product_id
        WHERE c.user_id = @user_id
      `)

    if (cartRes.recordset.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' })
    }

    let subtotal = 0
    const orderItems = cartRes.recordset.map(item => {
      const price = item.discount_price || item.price
      const total = price * item.quantity
      subtotal += total
      return {
        ...item,
        unit_price: price,
        total_price: total
      }
    })

    let discount = 0
    if (coupon_code) {
      const couponRes = await pool.request()
        .input('code', sql.NVarChar, coupon_code)
        .query(`
          SELECT * FROM Coupons 
          WHERE code = @code AND is_active = 1 
          AND GETDATE() BETWEEN valid_from AND valid_to
        `)
      
      if (couponRes.recordset.length && subtotal >= couponRes.recordset[0].min_order_amount) {
        const coupon = couponRes.recordset[0]
        if (coupon.discount_type === 'percentage') {
          discount = (subtotal * coupon.discount_value) / 100
          if (coupon.max_discount && discount > coupon.max_discount) {
            discount = coupon.max_discount
          }
        } else {
          discount = coupon.discount_value
        }
      }
    }

    const shipping_charge = subtotal >= 2499 ? 0 : 99
    const total_amount = subtotal + shipping_charge - discount
    const order_number = generateOrderNumber()

    const orderRes = await pool.request()
      .input('order_number', sql.NVarChar, order_number)
      .input('user_id', sql.Int, user_id)
      .input('subtotal', sql.Decimal, subtotal)
      .input('shipping_charge', sql.Decimal, shipping_charge)
      .input('discount', sql.Decimal, discount)
      .input('total_amount', sql.Decimal, total_amount)
      .input('payment_method', sql.NVarChar, payment_method)
      .input('shipping_address', sql.NVarChar, shipping_address)
      .input('shipping_city', sql.NVarChar, shipping_city)
      .input('shipping_state', sql.NVarChar, shipping_state)
      .input('shipping_pincode', sql.NVarChar, shipping_pincode)
      .query(`
        INSERT INTO Orders 
          (order_number, user_id, subtotal, shipping_charge, discount, total_amount, 
           payment_method, shipping_address, shipping_city, shipping_state, shipping_pincode, created_at)
        OUTPUT INSERTED.order_id
        VALUES 
          (@order_number, @user_id, @subtotal, @shipping_charge, @discount, @total_amount,
           @payment_method, @shipping_address, @shipping_city, @shipping_state, @shipping_pincode, GETDATE())
      `)

    const order_id = orderRes.recordset[0].order_id

    for (const item of orderItems) {
      const images = (() => { try { return JSON.parse(item.images) } catch { return [] } })()
      await pool.request()
        .input('order_id', sql.Int, order_id)
        .input('product_id', sql.Int, item.product_id)
        .input('product_name', sql.NVarChar, item.name)
        .input('product_image', sql.NVarChar, images[0] || '')
        .input('quantity', sql.Int, item.quantity)
        .input('unit_price', sql.Decimal, item.unit_price)
        .input('total_price', sql.Decimal, item.total_price)
        .query(`
          INSERT INTO OrderItems 
            (order_id, product_id, product_name, product_image, quantity, unit_price, total_price)
          VALUES 
            (@order_id, @product_id, @product_name, @product_image, @quantity, @unit_price, @total_price)
        `)

      await pool.request()
        .input('product_id', sql.Int, item.product_id)
        .input('quantity', sql.Int, item.quantity)
        .query('UPDATE Products SET stock_quantity = stock_quantity - @quantity WHERE product_id = @product_id')
    }

    await pool.request()
      .input('user_id', sql.Int, user_id)
      .query('DELETE FROM Cart WHERE user_id = @user_id')

    res.json({ 
      success: true, 
      order_id, 
      order_number, 
      total_amount,
      payment_method
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Failed to create order' })
  }
}

export async function getOrders(req, res) {
  try {
    const pool = await getPool()
    const result = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        SELECT * FROM Orders 
        WHERE user_id = @user_id 
        ORDER BY created_at DESC
      `)

    for (const order of result.recordset) {
      const itemsRes = await pool.request()
        .input('order_id', sql.Int, order.order_id)
        .query('SELECT * FROM OrderItems WHERE order_id = @order_id')
      order.items = itemsRes.recordset
    }

    res.json({ success: true, data: result.recordset })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get orders' })
  }
}

export async function getOrder(req, res) {
  try {
    const pool = await getPool()
    const { id } = req.params

    const orderRes = await pool.request()
      .input('order_id', sql.Int, id)
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        SELECT * FROM Orders 
        WHERE order_id = @order_id AND user_id = @user_id
      `)

    if (!orderRes.recordset.length) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    const itemsRes = await pool.request()
      .input('order_id', sql.Int, id)
      .query('SELECT * FROM OrderItems WHERE order_id = @order_id')

    const order = orderRes.recordset[0]
    order.items = itemsRes.recordset

    res.json({ success: true, data: order })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get order' })
  }
}