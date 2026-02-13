/**
 * db.js
 * - ローカル: SSLなしでOK
 * - Heroku(Postgres): SSL必須なので有効化する
 */

const { Pool } = require("pg");  // ← これが必要

const connectionString = process.env.DATABASE_URL;

// Herokuは NODE_ENV=production になる
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
