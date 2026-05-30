import bcrypt from 'bcryptjs'
import sql from 'mssql'

const config = {
  server: 'DELLINSPIRON',
  database: 'SareesDB',
  user: 'sa',
  password: 'Demo@1234',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
}

async function testLogin() {
  try {
    const pool = await sql.connect(config)
    console.log('✅ Connected to database\n')
    
    // Check if users exist
    const users = await pool.request().query('SELECT user_id, email, password_hash, role FROM Users')
    console.log('Users in database:')
    users.recordset.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`)
      console.log(`    Hash: ${user.password_hash.substring(0, 50)}...`)
    })
    
    if (users.recordset.length === 0) {
      console.log('\n❌ No users found! Need to insert demo users.')
      
      // Insert demo users
      const hash = await bcrypt.hash('Demo@1234', 12)
      console.log(`\nGenerated hash for Demo@1234: ${hash}`)
      
      await pool.request()
        .input('email', sql.NVarChar, 'admin@sarees.com')
        .input('hash', sql.NVarChar, hash)
        .input('first_name', sql.NVarChar, 'Admin')
        .input('last_name', sql.NVarChar, 'User')
        .input('role', sql.NVarChar, 'admin')
        .query(`
          INSERT INTO Users (first_name, last_name, email, password_hash, role, created_at)
          VALUES (@first_name, @last_name, @email, @hash, @role, GETDATE())
        `)
      
      await pool.request()
        .input('email', sql.NVarChar, 'customer@demo.com')
        .input('hash', sql.NVarChar, hash)
        .input('first_name', sql.NVarChar, 'Priya')
        .input('last_name', sql.NVarChar, 'Sharma')
        .input('role', sql.NVarChar, 'customer')
        .query(`
          INSERT INTO Users (first_name, last_name, email, password_hash, role, created_at)
          VALUES (@first_name, @last_name, @email, @hash, @role, GETDATE())
        `)
      
      console.log('✅ Demo users inserted!')
    }
    
    // Test login with bcrypt
    console.log('\n🔐 Testing password verification...')
    const testUser = users.recordset.find(u => u.email === 'admin@sarees.com')
    
    if (testUser) {
      const isValid = await bcrypt.compare('Demo@1234', testUser.password_hash)
      console.log(`Password "Demo@1234" is ${isValid ? '✅ VALID' : '❌ INVALID'}`)
      
      if (!isValid) {
        // Generate correct hash
        const correctHash = await bcrypt.hash('Demo@1234', 12)
        console.log(`\nCorrect hash for Demo@1234 should be: ${correctHash}`)
        console.log(`Current hash in DB: ${testUser.password_hash}`)
        
        // Update with correct hash
        await pool.request()
          .input('email', sql.NVarChar, 'admin@sarees.com')
          .input('hash', sql.NVarChar, correctHash)
          .query('UPDATE Users SET password_hash = @hash WHERE email = @email')
        console.log('✅ Updated admin password hash')
        
        await pool.request()
          .input('email', sql.NVarChar, 'customer@demo.com')
          .input('hash', sql.NVarChar, correctHash)
          .query('UPDATE Users SET password_hash = @hash WHERE email = @email')
        console.log('✅ Updated customer password hash')
      }
    }
    
    await pool.close()
    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

testLogin()