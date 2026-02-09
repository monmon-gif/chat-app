/**
 * dm-api.js
 * ・GET /api/users            相手一覧（自分以外）
 * ・POST /api/conversations   相手を指定してDM部屋を作る/取得
 * ・GET /api/messages?conversationId=...  履歴取得
 */
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_COOKIE = "token";

/**
 * CookieからJWTを検証して req.user に入れる
 * （CookieはhttpOnlyなので、ブラウザJSからは触れない＝安全寄り）
 */
function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[TOKEN_COOKIE];
    if (!token) return res.status(401).json({ ok: false, message: "not logged in" });

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { userId, username, iat, exp }
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "not logged in" });
  }
}

/**
 * user1_id < user2_id の順に並べる（重複conversationを防ぐ）
 */
function normalizePair(a, b) {
  const x = Number(a);
  const y = Number(b);
  return x < y ? [x, y] : [y, x];
}

/**
 * 相手一覧（自分以外）
 */
router.get("/users", requireAuth, async (req, res) => {
  try {
    const myId = Number(req.user.userId);
    const { rows } = await pool.query(
      "SELECT id, username FROM public.users WHERE id <> $1 ORDER BY username ASC",
      [myId]
    );
    res.json({ ok: true, users: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "サーバエラー" });
  }
});

/**
 * DM会話（部屋）を作る/取得する
 * body: { partnerId }
 */
router.post("/conversations", requireAuth, async (req, res) => {
  try {
    const myId = Number(req.user.userId);
    const partnerId = Number(req.body?.partnerId);

    if (!partnerId || partnerId === myId) {
      return res.status(400).json({ ok: false, message: "partnerIdが不正" });
    }

    // 相手が存在するか確認
    const u = await pool.query("SELECT id FROM public.users WHERE id = $1", [partnerId]);
    if (u.rowCount === 0) return res.status(404).json({ ok: false, message: "相手が存在しない" });

    const [user1, user2] = normalizePair(myId, partnerId);

    // まずは既存を探す
    const found = await pool.query(
      "SELECT id FROM public.conversations WHERE user1_id = $1 AND user2_id = $2",
      [user1, user2]
    );

    if (found.rowCount > 0) {
      return res.json({ ok: true, conversationId: found.rows[0].id });
    }

    // 無ければ作る
    const created = await pool.query(
      "INSERT INTO public.conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING id",
      [user1, user2]
    );

    return res.json({ ok: true, conversationId: created.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "サーバエラー" });
  }
});

/**
 * 履歴取得
 * GET /api/messages?conversationId=123
 * ※ 自分がその会話の参加者かチェックする
 */
router.get("/messages", requireAuth, async (req, res) => {
  try {
    const myId = Number(req.user.userId);
    const conversationId = Number(req.query?.conversationId);
    if (!conversationId) return res.status(400).json({ ok: false, message: "conversationIdが必要" });

    // 会話の参加者チェック
    const c = await pool.query(
      "SELECT user1_id, user2_id FROM public.conversations WHERE id = $1",
      [conversationId]
    );
    if (c.rowCount === 0) return res.status(404).json({ ok: false, message: "会話が存在しない" });

    const { user1_id, user2_id } = c.rows[0];
    if (myId !== Number(user1_id) && myId !== Number(user2_id)) {
      return res.status(403).json({ ok: false, message: "権限なし" });
    }

    const { rows } = await pool.query(
      `
      SELECT m.id, m.body, m.created_at, u.username AS sender_name, m.sender_id
      FROM public.messages m
      JOIN public.users u ON u.id = m.sender_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT 50
      `,
      [conversationId]
    );

    res.json({ ok: true, messages: rows.reverse() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: "サーバエラー" });
  }
});

module.exports = { dmRouter: router, requireAuth, normalizePair };
