import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

let pool = null;

export async function getPool() {
  if (!pool) {
    console.log("📡 Connecting to Azure SQL...");
    
    const config = {
      server: process.env.DB_SERVER,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT) || 1433,
      options: {
        encrypt: true, // Required for Azure SQL
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };

    try {
      pool = await sql.connect(config);
      console.log("✅ Azure SQL Server connected successfully");
      
      // Test the connection
      const result = await pool.request().query("SELECT DB_NAME() as database_name");
      console.log(`📚 Connected to database: ${result.recordset[0].database_name}`);
      
    } catch (err) {
      console.error("❌ DB connection failed:", err.message);
      throw err;
    }
  }
  return pool;
}

export { sql };
export default getPool;