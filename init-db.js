import sql from 'mssql'

const config = {
  server: 'DELLINSPIRON',
  user: 'sa',
  password: 'Demo@1234',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
}

async function initDatabase() {
  try {
    console.log('🔌 Connecting to SQL Server...')
    const pool = await sql.connect(config)
    console.log('✅ Connected!')
    
    // Create database
    await pool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SareesDB')
      BEGIN
        CREATE DATABASE SareesDB;
        PRINT 'Database SareesDB created successfully!';
      END
      ELSE
      BEGIN
        PRINT 'Database SareesDB already exists.';
      END
    `)
    
    // Switch to SareesDB and create tables
    await pool.request().query(`
      USE SareesDB;
      
      -- Users table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
      BEGIN
        CREATE TABLE Users (
          user_id INT IDENTITY(1,1) PRIMARY KEY,
          first_name NVARCHAR(100) NOT NULL,
          last_name NVARCHAR(100) NOT NULL,
          email NVARCHAR(255) NOT NULL UNIQUE,
          phone NVARCHAR(20),
          password_hash NVARCHAR(255) NOT NULL,
          role NVARCHAR(20) NOT NULL CHECK (role IN ('customer','admin')),
          is_active BIT NOT NULL DEFAULT 1,
          address NVARCHAR(MAX),
          city NVARCHAR(100),
          state NVARCHAR(100),
          pincode NVARCHAR(10),
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          last_login DATETIME2
        );
        PRINT '✅ Users table created';
      END
      
      -- Categories table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Categories')
      BEGIN
        CREATE TABLE Categories (
          category_id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL,
          description NVARCHAR(MAX),
          image_url NVARCHAR(500),
          is_active BIT NOT NULL DEFAULT 1,
          display_order INT NOT NULL DEFAULT 0,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE()
        );
        PRINT '✅ Categories table created';
      END
      
      -- Products table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
      BEGIN
        CREATE TABLE Products (
          product_id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(200) NOT NULL,
          slug NVARCHAR(200) NOT NULL UNIQUE,
          description NVARCHAR(MAX),
          category_id INT REFERENCES Categories(category_id),
          fabric NVARCHAR(100),
          color NVARCHAR(100),
          occasion NVARCHAR(100),
          work_type NVARCHAR(100),
          price DECIMAL(10,2) NOT NULL,
          discount_price DECIMAL(10,2),
          stock_quantity INT NOT NULL DEFAULT 0,
          images NVARCHAR(MAX),
          is_featured BIT NOT NULL DEFAULT 0,
          is_new BIT NOT NULL DEFAULT 0,
          is_active BIT NOT NULL DEFAULT 1,
          rating DECIMAL(3,2) DEFAULT 0,
          total_reviews INT NOT NULL DEFAULT 0,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME2
        );
        PRINT '✅ Products table created';
      END
      
      -- Cart table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Cart')
      BEGIN
        CREATE TABLE Cart (
          cart_id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT NOT NULL REFERENCES Users(user_id),
          product_id INT NOT NULL REFERENCES Products(product_id),
          quantity INT NOT NULL DEFAULT 1,
          added_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          UNIQUE (user_id, product_id)
        );
        PRINT '✅ Cart table created';
      END
      
      -- Orders table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Orders')
      BEGIN
        CREATE TABLE Orders (
          order_id INT IDENTITY(1,1) PRIMARY KEY,
          order_number NVARCHAR(50) NOT NULL UNIQUE,
          user_id INT NOT NULL REFERENCES Users(user_id),
          order_date DATETIME2 NOT NULL DEFAULT GETDATE(),
          subtotal DECIMAL(10,2) NOT NULL,
          shipping_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
          discount DECIMAL(10,2) NOT NULL DEFAULT 0,
          total_amount DECIMAL(10,2) NOT NULL,
          payment_method NVARCHAR(50) CHECK (payment_method IN ('razorpay','cod','bank_transfer')),
          payment_status NVARCHAR(30) DEFAULT 'pending',
          order_status NVARCHAR(30) DEFAULT 'pending',
          razorpay_order_id NVARCHAR(200),
          razorpay_payment_id NVARCHAR(200),
          shipping_address NVARCHAR(MAX) NOT NULL,
          shipping_city NVARCHAR(100),
          shipping_state NVARCHAR(100),
          shipping_pincode NVARCHAR(10),
          tracking_number NVARCHAR(100),
          notes NVARCHAR(MAX),
          delivered_at DATETIME2,
          cancelled_at DATETIME2,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE()
        );
        PRINT '✅ Orders table created';
      END
      
      -- OrderItems table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderItems')
      BEGIN
        CREATE TABLE OrderItems (
          order_item_id INT IDENTITY(1,1) PRIMARY KEY,
          order_id INT NOT NULL REFERENCES Orders(order_id),
          product_id INT NOT NULL REFERENCES Products(product_id),
          product_name NVARCHAR(200) NOT NULL,
          product_image NVARCHAR(500),
          quantity INT NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE()
        );
        PRINT '✅ OrderItems table created';
      END
      
      -- Wishlist table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Wishlist')
      BEGIN
        CREATE TABLE Wishlist (
          wishlist_id INT IDENTITY(1,1) PRIMARY KEY,
          user_id INT NOT NULL REFERENCES Users(user_id),
          product_id INT NOT NULL REFERENCES Products(product_id),
          added_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          UNIQUE (user_id, product_id)
        );
        PRINT '✅ Wishlist table created';
      END
      
      -- Reviews table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reviews')
      BEGIN
        CREATE TABLE Reviews (
          review_id INT IDENTITY(1,1) PRIMARY KEY,
          product_id INT NOT NULL REFERENCES Products(product_id),
          user_id INT NOT NULL REFERENCES Users(user_id),
          rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          comment NVARCHAR(MAX),
          is_visible BIT NOT NULL DEFAULT 1,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
          UNIQUE (product_id, user_id)
        );
        PRINT '✅ Reviews table created';
      END
      
      -- Coupons table
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Coupons')
      BEGIN
        CREATE TABLE Coupons (
          coupon_id INT IDENTITY(1,1) PRIMARY KEY,
          code NVARCHAR(50) NOT NULL UNIQUE,
          description NVARCHAR(500),
          discount_type NVARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage','fixed')),
          discount_value DECIMAL(10,2) NOT NULL,
          min_order_amount DECIMAL(10,2) DEFAULT 0,
          max_discount DECIMAL(10,2),
          valid_from DATETIME2 NOT NULL,
          valid_to DATETIME2 NOT NULL,
          usage_limit INT,
          used_count INT NOT NULL DEFAULT 0,
          is_active BIT NOT NULL DEFAULT 1,
          created_at DATETIME2 NOT NULL DEFAULT GETDATE()
        );
        PRINT '✅ Coupons table created';
      END
    `)
    
    console.log('\n📊 Creating sample data...')
    
    // Insert sample data
    await pool.request().query(`
      USE SareesDB;
      
      -- Insert demo users if not exists
      IF NOT EXISTS (SELECT * FROM Users WHERE email = 'admin@sarees.com')
      BEGIN
        INSERT INTO Users (first_name, last_name, email, phone, password_hash, role)
        VALUES 
          ('Admin', 'User', 'admin@sarees.com', '+91 98765 43210', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMRXMG.Y2yBqJn6i8DvXa3oa', 'admin'),
          ('Priya', 'Sharma', 'customer@demo.com', '+91 98765 43210', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMRXMG.Y2yBqJn6i8DvXa3oa', 'customer');
        PRINT '✅ Demo users inserted';
      END
      
      -- Insert categories
      IF NOT EXISTS (SELECT * FROM Categories)
      BEGIN
        INSERT INTO Categories (name, description, display_order) VALUES
          ('Banarasi Sarees', 'Traditional Banarasi silk sarees with intricate zari work', 1),
          ('Kanchipuram Sarees', 'Authentic Kanchipuram silk sarees from Tamil Nadu', 2),
          ('Paithani Sarees', 'Beautiful Paithani sarees with peacock motifs', 3),
          ('Chanderi Sarees', 'Lightweight Chanderi silk and cotton sarees', 4),
          ('Cotton Sarees', 'Comfortable daily wear cotton sarees', 5),
          ('Silk Sarees', 'Premium pure silk sarees for special occasions', 6);
        PRINT '✅ Categories inserted';
      END
      
      -- Insert sample products
      IF NOT EXISTS (SELECT * FROM Products)
      BEGIN
        DECLARE @cat_banarasi INT = (SELECT category_id FROM Categories WHERE name = 'Banarasi Sarees');
        DECLARE @cat_kanchi INT = (SELECT category_id FROM Categories WHERE name = 'Kanchipuram Sarees');
        DECLARE @cat_paithani INT = (SELECT category_id FROM Categories WHERE name = 'Paithani Sarees');
        DECLARE @cat_cotton INT = (SELECT category_id FROM Categories WHERE name = 'Cotton Sarees');
        
        INSERT INTO Products (name, slug, description, category_id, fabric, color, occasion, work_type, price, discount_price, stock_quantity, images, is_featured) VALUES
          ('Red Banarasi Silk Saree', 'red-banarasi-silk-saree', 'Pure silk Banarasi saree with heavy gold zari work. Perfect for weddings.', @cat_banarasi, 'Pure Silk', 'Red', 'Wedding', 'Banarasi', 12500, 9999, 10, '["/images/saree1.jpg"]', 1),
          ('Kanchipuram Pink Silk Saree', 'kanchipuram-pink-silk-saree', 'Authentic Kanchipuram silk saree with traditional temple border.', @cat_kanchi, 'Pure Silk', 'Pink', 'Wedding', 'Kanchipuram', 18000, 14999, 8, '["/images/saree2.jpg"]', 1),
          ('Paithani Purple Saree', 'paithani-purple-saree', 'Handwoven Paithani saree with traditional peacock motif border.', @cat_paithani, 'Silk', 'Purple', 'Festival', 'Paithani', 22000, 18999, 5, '["/images/saree3.jpg"]', 1),
          ('Cotton Printed Saree', 'cotton-printed-saree', 'Comfortable cotton saree with floral prints. Ideal for daily wear.', @cat_cotton, 'Cotton', 'Multi', 'Daily Wear', 'Printed', 2500, 1999, 50, '["/images/saree4.jpg"]', 0);
        PRINT '✅ Sample products inserted';
      END
    `)
    
    console.log('\n🎉 Database initialization complete!')
    console.log('\n📋 Demo Credentials:')
    console.log('   Admin: admin@sarees.com / Demo@1234')
    console.log('   Customer: customer@demo.com / Demo@1234')
    
    await pool.close()
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

initDatabase()