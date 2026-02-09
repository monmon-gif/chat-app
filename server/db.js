/**
 * db.js
 * ・Postgres接続（pool）
 */
const { Pool } = require("pg");

const pool = new Pool({
  // 例: postgres://user:pass@localhost:5432/chat
  connectionString: process.env.DATABASE_URL,
});

module.exports = { pool };
