import { getPool, sql } from '../config/database.js'

export const Category = {
  async create(categoryData) {
    const pool = await getPool()
    const { name, description, image_url, display_order } = categoryData
    
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description || null)
      .input('image_url', sql.NVarChar, image_url || null)
      .input('display_order', sql.Int, display_order || 0)
      .query(`
        INSERT INTO Categories (name, description, image_url, display_order, created_at)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @image_url, @display_order, GETDATE())
      `)
    
    return result.recordset[0]
  },

  async findAll() {
    const pool = await getPool()
    const result = await pool.request()
      .query('SELECT * FROM Categories WHERE is_active = 1 ORDER BY display_order')
    return result.recordset
  },

  async findById(category_id) {
    const pool = await getPool()
    const result = await pool.request()
      .input('category_id', sql.Int, category_id)
      .query('SELECT * FROM Categories WHERE category_id = @category_id AND is_active = 1')
    return result.recordset[0]
  },

  async update(category_id, updates) {
    const pool = await getPool()
    let query = 'UPDATE Categories SET'
    const request = pool.request().input('category_id', sql.Int, category_id)
    
    if (updates.name) {
      query += ' name = @name,'
      request.input('name', sql.NVarChar, updates.name)
    }
    if (updates.description !== undefined) {
      query += ' description = @description,'
      request.input('description', sql.NVarChar, updates.description)
    }
    if (updates.image_url !== undefined) {
      query += ' image_url = @image_url,'
      request.input('image_url', sql.NVarChar, updates.image_url)
    }
    if (updates.display_order !== undefined) {
      query += ' display_order = @display_order,'
      request.input('display_order', sql.Int, updates.display_order)
    }
    if (updates.is_active !== undefined) {
      query += ' is_active = @is_active,'
      request.input('is_active', sql.Bit, updates.is_active)
    }
    
    query = query.slice(0, -1)
    query += ' WHERE category_id = @category_id'
    await request.query(query)
    
    return this.findById(category_id)
  }
}

export default Category