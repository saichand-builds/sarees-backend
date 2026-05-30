import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

let pool = null;

export async function getPool() {
  if (!pool) {
    console.log("📡 Connecting using connection string...");

    pool = await sql.connect(process.env.DB_CONNECTION_STRING);

    console.log("✅ SQL Server connected");
  }

  return pool;
}

export { sql };
export default getPool;