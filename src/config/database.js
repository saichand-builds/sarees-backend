import sql from 'mssql'

const config = {
  server: 'DELLINSPIRON',
  port: 1433,
  database: 'SareesDB',
  user: 'sa',
  password: 'Demo@1234',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: { max: 20, min: 2, idleTimeoutMillis: 30000 },
}

console.log('📡 Connecting to SQL Server...')
console.log('   Server:', config.server)
console.log('   Database:', config.database)
console.log('   User:', config.user)

let pool = null

export async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config)
      console.log('✅ SQL Server connected to', config.database)
    } catch (err) {
      console.error('❌ DB connection failed:', err.message)
      throw err
    }
  }
  return pool
}

export { sql }
export default getPool