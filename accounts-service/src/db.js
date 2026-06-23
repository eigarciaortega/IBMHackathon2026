const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "accounts_db",
  user: process.env.DB_USER || "neowallet_user",
  password: process.env.DB_PASSWORD || "neowallet_pass",
  max: 10,
  idleTimeoutMillis: 30000
});

async function checkDatabase() {
  const result = await pool.query("SELECT 1 AS ok");
  return result.rows[0].ok === 1;
}

module.exports = {
  pool,
  checkDatabase
};

