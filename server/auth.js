/**
 * auth.js
 * ・/api/register  ユーザー登録
 * ・/api/login     ログイン（JWTをCookieに保存）
 * ・/api/me        自分情報（ログイン確認）
 */

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("./db");

const router = express.Router();

// JWTの秘密鍵（本番は必ず環境変数）
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Cookieに入れるトークン名
const TOKEN_COOKIE = "token";

/**
 * 入力チェック（最低限）
 */
function validateUsernamePassword(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return "形式が不正";
  if (username.trim().length < 3) return "usernameは3文字以上";
  if (password.length < 8) return "passwordは8文字以上";
  return null;
}

/**
 * ユーザー登録
 * body: { username, password }
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const err = validateUsernamePassword(username, password);
    if (err) return res.status(400).json({ ok: false, message: err });

    // パスワードをハッシュ化（生パスは保存しない）
    const passwordHash = await bcrypt.hash(password, 10);

    // usersへ登録（usernameはUNIQUE）
    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at",
      [username.trim(), passwordHash]
    );

    return res.json({ ok: true, user: rows[0] });
  } catch (e) {
    // username重複（UNIQUE制約）
    if (e.code === "23505") {
      return res.status(409).json({ ok: false, message: "そのusernameは既に使われています" });
    }
    console.error(e);
    return res.status(500).json({ ok: false, message: "サーバエラー" });
  }
});

/**
 * ログイン
 * body: { username, password }
 * 成功したらJWTをCookieにセット
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const err = validateUsernamePassword(username, password);
    if (err) return res.status(400).json({ ok: false, message: err });

    // ユーザー取得
    const { rows } = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE username = $1",
      [username.trim()]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ ok: false, message: "ユーザー名かパスワードが違います" });

    // パスワード照合
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ ok: false, message: "ユーザー名かパスワードが違います" });

    // JWT発行（最低限のpayload）
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Cookieに保存（開発用：httpOnly）
    res.cookie(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      // secure: true, // httpsならtrue
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ ok: true, message: "logged in" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "サーバエラー" });
  }
});

/**
 * ログアウト（Cookie削除）
 */
router.post("/logout", (req, res) => {
  res.clearCookie(TOKEN_COOKIE);
  res.json({ ok: true });
});

/**
 * ログイン確認
 * CookieのJWTを検証して user を返す
 */
router.get("/me", (req, res) => {
  try {
    const token = req.cookies?.[TOKEN_COOKIE];
    if (!token) return res.status(401).json({ ok: false, message: "not logged in" });

    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ ok: true, user: payload });
  } catch {
    return res.status(401).json({ ok: false, message: "not logged in" });
  }
});

module.exports = { authRouter: router };
