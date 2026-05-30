import { getPool, sql } from '../config/database.js'

export const Cart = {
  async getCart(user_id) {
    const pool = await getPool()
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT c.cart_id, c.product_id, c.quantity,
               p.name, p.price, p.discount_price, p.images, p.stock_quantity
        FROM Cart c
        JOIN Products p ON p.product_id = c.product_id
        WHERE c.user_id = @user_id AND p.is_active = 1
      `)
    
    return result.recordset.map(item => ({
      ...item,
      images: JSON.parse(item.images),
      price: item.discount_price || item.price
    }))
  },

  async addItem(user_id, product_id, quantity = 1) {
    const pool = await getPool()
    
    const existing = await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('product_id', sql.Int, product_id)
      .query('SELECT * FROM Cart WHERE user_id = @user_id AND product_id = @product_id')
    
    if (existing.recordset.length) {
      await pool.request()
        .input('cart_id', sql.Int, existing.recordset[0].cart_id)
        .input('quantity', sql.Int, existing.recordset[0].quantity + quantity)
        .query('UPDATE Cart SET quantity = @quantity WHERE cart_id = @cart_id')
      return existing.recordset[0]
    } else {
      await pool.request()
        .input('user_id', sql.Int, user_id)
        .input('product_id', sql.Int, product_id)
        .input('quantity', sql.Int, quantity)
        .query('INSERT INTO Cart (user_id, product_id, quantity, added_at) VALUES (@user_id, @product_id, @quantity, GETDATE())')
    }
  },

  async updateQuantity(cart_id, user_id, quantity) {
    const pool = await getPool()
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
  },

  async removeItem(cart_id, user_id) {
    const pool = await getPool()
    await pool.request()
      .input('cart_id', sql.Int, cart_id)
      .input('user_id', sql.Int, user_id)
      .query('DELETE FROM Cart WHERE cart_id = @cart_id AND user_id = @user_id')
  },

  async clearCart(user_id) {
    const pool = await getPool()
    await pool.request()
      .input('user_id', sql.Int, user_id)
      .query('DELETE FROM Cart WHERE user_id = @user_id')
  },

  async getCartItemsWithDetails(user_id) {
    const pool = await getPool()
    const items = await this.getCart(user_id)
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    return {
      items,
      subtotal,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    }
  }
}

export default Cart