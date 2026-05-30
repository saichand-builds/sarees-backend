import { getPool, sql } from '../config/database.js'

export const User = {
  async create(userData) {
    const pool = await getPool()
    const { first_name, last_name, email, phone, password_hash, role } = userData
    
    const result = await pool.request()
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone || null)
      .input('password_hash', sql.NVarChar, password_hash)
      .input('role', sql.NVarChar, role || 'customer')
      .query(`
        INSERT INTO Users (first_name, last_name, email, phone, password_hash, role, created_at)
        OUTPUT INSERTED.*
        VALUES (@first_name, @last_name, @email, @phone, @password_hash, @role, GETDATE())
      `)
    
    return result.recordset[0]
  },

  async findByEmail(email) {
    const pool = await getPool()
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE email = @email')
    
    return result.recordset[0]
  },

  async findById(user_id) {
    const pool = await getPool()
    const result = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query('SELECT * FROM Users WHERE user_id = @user_id')
    
    return result.recordset[0]
  },

  async update(user_id, updates) {
    const pool = await getPool()
    let query = 'UPDATE Users SET updated_at = GETDATE()'
    const request = pool.request().input('user_id', sql.Int, user_id)
    
    const fields = ['first_name', 'last_name', 'phone', 'address', 'city', 'state', 'pincode']
    for (const field of fields) {
      if (updates[field] !== undefined) {
        query += `, ${field} = @${field}`
        request.input(field, sql.NVarChar, updates[field])
      }
    }
    
    query += ' WHERE user_id = @user_id'
    await request.query(query)
    
    return this.findById(user_id)
  },

  async updateLastLogin(user_id) {
    const pool = await getPool()
    await pool.request()
      .input('user_id', sql.Int, user_id)
      .query('UPDATE Users SET last_login = GETDATE() WHERE user_id = @user_id')
  },

  async getAll(role = null) {
    const pool = await getPool()
    let query = 'SELECT user_id, first_name, last_name, email, phone, role, is_active, created_at, last_login FROM Users'
    if (role) {
      query += ' WHERE role = @role'
      const result = await pool.request()
        .input('role', sql.NVarChar, role)
        .query(query)
      return result.recordset
    }
    const result = await pool.request().query(query)
    return result.recordset
  },

  async updateStatus(user_id, is_active) {
    const pool = await getPool()
    await pool.request()
      .input('user_id', sql.Int, user_id)
      .input('is_active', sql.Bit, is_active)
      .query('UPDATE Users SET is_active = @is_active WHERE user_id = @user_id')
  }
}

export default User