import { getPool, sql } from '../config/database.js'

export const Product = {
  async create(productData) {
    const pool = await getPool()
    const { 
      name, slug, description, category_id, fabric, color, 
      occasion, work_type, price, discount_price, stock_quantity, 
      images, is_featured, is_new 
    } = productData
    
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('slug', sql.NVarChar, slug)
      .input('description', sql.NVarChar, description || null)
      .input('category_id', sql.Int, category_id || null)
      .input('fabric', sql.NVarChar, fabric || null)
      .input('color', sql.NVarChar, color || null)
      .input('occasion', sql.NVarChar, occasion || null)
      .input('work_type', sql.NVarChar, work_type || null)
      .input('price', sql.Decimal, price)
      .input('discount_price', sql.Decimal, discount_price || null)
      .input('stock_quantity', sql.Int, stock_quantity || 0)
      .input('images', sql.NVarChar, JSON.stringify(images || []))
      .input('is_featured', sql.Bit, is_featured ? 1 : 0)
      .input('is_new', sql.Bit, is_new ? 1 : 0)
      .query(`
        INSERT INTO Products 
          (name, slug, description, category_id, fabric, color, occasion, work_type, 
           price, discount_price, stock_quantity, images, is_featured, is_new, created_at)
        OUTPUT INSERTED.*
        VALUES 
          (@name, @slug, @description, @category_id, @fabric, @color, @occasion, @work_type,
           @price, @discount_price, @stock_quantity, @images, @is_featured, @is_new, GETDATE())
      `)
    
    const product = result.recordset[0]
    product.images = JSON.parse(product.images)
    return product
  },

  async findById(product_id) {
    const pool = await getPool()
    const result = await pool.request()
      .input('product_id', sql.Int, product_id)
      .query(`
        SELECT p.*, c.name as category_name
        FROM Products p
        LEFT JOIN Categories c ON c.category_id = p.category_id
        WHERE p.product_id = @product_id AND p.is_active = 1
      `)
    
    if (result.recordset[0]) {
      const product = result.recordset[0]
      product.images = JSON.parse(product.images)
      return product
    }
    return null
  },

  async findBySlug(slug) {
    const pool = await getPool()
    const result = await pool.request()
      .input('slug', sql.NVarChar, slug)
      .query(`
        SELECT p.*, c.name as category_name
        FROM Products p
        LEFT JOIN Categories c ON c.category_id = p.category_id
        WHERE p.slug = @slug AND p.is_active = 1
      `)
    
    if (result.recordset[0]) {
      const product = result.recordset[0]
      product.images = JSON.parse(product.images)
      return product
    }
    return null
  },

  async findAll(filters = {}) {
    const pool = await getPool()
    const { 
      search = '', category_id = null, fabric = null, occasion = null,
      min_price = null, max_price = null, is_featured = null, is_new = null,
      sort = 'created_at DESC', page = 1, limit = 12 
    } = filters
    
    const offset = (page - 1) * limit
    let where = 'WHERE p.is_active = 1'
    const request = pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)

    if (search) {
      where += ' AND (p.name LIKE @search OR p.description LIKE @search)'
      request.input('search', sql.NVarChar, `%${search}%`)
    }
    if (category_id) {
      where += ' AND p.category_id = @category_id'
      request.input('category_id', sql.Int, category_id)
    }
    if (fabric) {
      where += ' AND p.fabric = @fabric'
      request.input('fabric', sql.NVarChar, fabric)
    }
    if (occasion) {
      where += ' AND p.occasion = @occasion'
      request.input('occasion', sql.NVarChar, occasion)
    }
    if (min_price) {
      where += ' AND p.price >= @min_price'
      request.input('min_price', sql.Decimal, min_price)
    }
    if (max_price) {
      where += ' AND p.price <= @max_price'
      request.input('max_price', sql.Decimal, max_price)
    }
    if (is_featured) {
      where += ' AND p.is_featured = 1'
    }
    if (is_new) {
      where += ' AND p.is_new = 1'
    }

    const result = await request.query(`
      SELECT p.*, c.name as category_name,
             COUNT(*) OVER() AS total_count
      FROM Products p
      LEFT JOIN Categories c ON c.category_id = p.category_id
      ${where}
      ORDER BY ${sort}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `)

    const products = result.recordset.map(p => ({
      ...p,
      images: JSON.parse(p.images)
    }))

    return {
      data: products,
      total: result.recordset[0]?.total_count || 0,
      page,
      totalPages: Math.ceil((result.recordset[0]?.total_count || 0) / limit)
    }
  },

  async update(product_id, updates) {
    const pool = await getPool()
    let query = 'UPDATE Products SET updated_at = GETDATE()'
    const request = pool.request().input('product_id', sql.Int, product_id)
    
    const fields = ['name', 'slug', 'description', 'category_id', 'fabric', 'color', 
      'occasion', 'work_type', 'price', 'discount_price', 'stock_quantity', 'is_featured', 'is_new', 'is_active']
    
    for (const field of fields) {
      if (updates[field] !== undefined) {
        query += `, ${field} = @${field}`
        if (field === 'price' || field === 'discount_price') {
          request.input(field, sql.Decimal, updates[field])
        } else if (field === 'category_id' || field === 'stock_quantity') {
          request.input(field, sql.Int, updates[field])
        } else if (field === 'is_featured' || field === 'is_new' || field === 'is_active') {
          request.input(field, sql.Bit, updates[field] ? 1 : 0)
        } else {
          request.input(field, sql.NVarChar, updates[field])
        }
      }
    }
    
    if (updates.images) {
      query += `, images = @images`
      request.input('images', sql.NVarChar, JSON.stringify(updates.images))
    }
    
    query += ' WHERE product_id = @product_id'
    await request.query(query)
    
    return this.findById(product_id)
  },

  async updateStock(product_id, quantity) {
    const pool = await getPool()
    await pool.request()
      .input('product_id', sql.Int, product_id)
      .input('quantity', sql.Int, quantity)
      .query('UPDATE Products SET stock_quantity = stock_quantity - @quantity WHERE product_id = @product_id')
  },

  async updateRating(product_id) {
    const pool = await getPool()
    await pool.request()
      .input('product_id', sql.Int, product_id)
      .query(`
        UPDATE Products SET
          rating = (SELECT AVG(CAST(rating AS FLOAT)) FROM Reviews WHERE product_id = @product_id),
          total_reviews = (SELECT COUNT(*) FROM Reviews WHERE product_id = @product_id)
        WHERE product_id = @product_id
      `)
  },

  async getLowStock(threshold = 10) {
    const pool = await getPool()
    const result = await pool.request()
      .input('threshold', sql.Int, threshold)
      .query('SELECT product_id, name, stock_quantity FROM Products WHERE stock_quantity < @threshold AND is_active = 1 ORDER BY stock_quantity')
    return result.recordset
  },

  async getTopProducts(limit = 5) {
    const pool = await getPool()
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) p.*, c.name as category_name
        FROM Products p
        LEFT JOIN Categories c ON c.category_id = p.category_id
        WHERE p.is_active = 1
        ORDER BY p.total_reviews DESC, p.rating DESC
      `)
    
    return result.recordset.map(p => ({
      ...p,
      images: JSON.parse(p.images)
    }))
  },

  async delete(product_id) {
    const pool = await getPool()
    await pool.request()
      .input('product_id', sql.Int, product_id)
      .query('UPDATE Products SET is_active = 0 WHERE product_id = @product_id')
  }
}

export default Product