import sql from 'mssql'

const config = {
  server: 'DELLINSPIRON',
  database: 'master',
  options: {
    trustedConnection: true,
    encrypt: false,
    trustServerCertificate: true,
  }
}

async function test() {
  try {
    console.log('Testing connection...')
    const pool = await sql.connect(config)
    console.log('✅ Connected successfully!')
    
    const result = await pool.request().query('SELECT @@VERSION as version, DB_NAME() as currentDB')
    console.log('SQL Version:', result.recordset[0].version.substring(0, 60))
    console.log('Current Database:', result.recordset[0].currentDB)
    
    await pool.close()
    process.exit(0)
  } catch (err) {
    console.error('❌ Failed:', err.message)
    process.exit(1)
  }
}

test()