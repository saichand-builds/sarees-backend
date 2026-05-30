import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  },

  pool: {
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000
  }
};

console.log('📡 Connecting to SQL Server...');
console.log('   Server:', config.server);
console.log('   Database:', config.database);
console.log('   User:', config.user);

let pool = null;

export async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('✅ SQL Server connected to', config.database);
    } catch (err) {
      console.error('❌ DB connection failed:', err.message);
      throw err;
    }
  }

  return pool;
}

export { sql };
export default getPool;