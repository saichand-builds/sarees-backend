import sql from 'mssql'

const config = {
  server: 'DELLINSPIRON',
  port: 1433,
  database: 'master',
  user: 'sa',
  password: 'Demo@1234',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  }
}

async function test() {
  try {
    console.log('🔌 Testing SQL Authentication...')
    console.log('   Server:', config.server)
    console.log('   User:', config.user)
    console.log('   Password:', 'Demo@1234')
    
    const pool = await sql.connect(config)
    console.log('✅ CONNECTED SUCCESSFULLY!')
    
    const result = await pool.request().query('SELECT @@VERSION as version, SYSTEM_USER as currentUser, DB_NAME() as db')
    console.log('   SQL Version:', result.recordset[0].version.substring(0, 50))
    console.log('   Logged in as:', result.recordset[0].currentUser)
    console.log('   Database:', result.recordset[0].db)
    
    await pool.close()
    console.log('\n🎉 Connection works! You can now run the app.')
    process.exit(0)
  } catch (err) {
    console.error('❌ Connection failed:', err.message)
    process.exit(1)
  }
}

test()