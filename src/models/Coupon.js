import { getPool, sql } from '../config/database.js'

export const Coupon = {
  async findByCode(code) {
    const pool = await getPool()
    const result = await pool.request()
      .input('code', sql.NVarChar, code)
      .query(`
        SELECT * FROM Coupons 
        WHERE code = @code AND is_active = 1 
        AND GETDATE() BETWEEN valid_from AND valid_to
        AND (usage_limit IS NULL OR used_count < usage_limit)
      `)
    return result.recordset[0]
  },

  async validateCoupon(code, subtotal) {
    const coupon = await this.findByCode(code)
    if (!coupon) return null
    
    if (subtotal < coupon.min_order_amount) {
      return { valid: false, message: `Minimum order amount of ₹${coupon.min_order_amount} required` }
    }
    
    let discount = 0
    if (coupon.discount_type === 'percentage') {
      discount = (subtotal * coupon.discount_value) / 100
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount
      }
    } else {
      discount = coupon.discount_value
    }
    
    return {
      valid: true,
      coupon,
      discount,
      message: `Coupon applied! You saved ₹${discount}`
    }
  },

  async incrementUsage(coupon_id) {
    const pool = await getPool()
    await pool.request()
      .input('coupon_id', sql.Int, coupon_id)
      .query('UPDATE Coupons SET used_count = used_count + 1 WHERE coupon_id = @coupon_id')
  },

  async getAll() {
    const pool = await getPool()
    const result = await pool.request()
      .query('SELECT * FROM Coupons ORDER BY created_at DESC')
    return result.recordset
  },

  async create(couponData) {
    const pool = await getPool()
    const { code, description, discount_type, discount_value, min_order_amount, max_discount, valid_from, valid_to, usage_limit } = couponData
    
    const result = await pool.request()
      .input('code', sql.NVarChar, code)
      .input('description', sql.NVarChar, description || null)
      .input('discount_type', sql.NVarChar, discount_type)
      .input('discount_value', sql.Decimal, discount_value)
      .input('min_order_amount', sql.Decimal, min_order_amount || 0)
      .input('max_discount', sql.Decimal, max_discount || null)
      .input('valid_from', sql.DateTime, valid_from)
      .input('valid_to', sql.DateTime, valid_to)
      .input('usage_limit', sql.Int, usage_limit || null)
      .query(`
        INSERT INTO Coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, valid_from, valid_to, usage_limit, created_at)
        OUTPUT INSERTED.*
        VALUES (@code, @description, @discount_type, @discount_value, @min_order_amount, @max_discount, @valid_from, @valid_to, @usage_limit, GETDATE())
      `)
    
    return result.recordset[0]
  }
}

export default Coupon