/**
 * db.js
 * - ローカル: SSLなしでOK
 * - Heroku(Postgres): SSL必須なので有効化する
 */
const pool = require("./db");

const connectionString = process.env.DATABASE_URL;

// Herokuは NODE_ENV=production になる
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString,
  // 本番だけSSLを有効にする（Herokuでよく使う設定）
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
