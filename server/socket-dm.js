/**
 * socket-dm.js
 * ・Socket接続時にCookieのJWTを検証して user を紐付ける
 * ・dm:join で部屋に入る
 * ・dm:send でDB保存→部屋に配信
 */
const jwt = require("jsonwebtoken");
const pool = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const TOKEN_COOKIE = "token";

function parseCookieHeader(cookieHeader) {
  // "a=1; token=xxx; b=2" → {a:"1", token:"xxx", b:"2"}
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(";").forEach((p) => {
    const [k, ...rest] = p.trim().split("=");
    out[k] = decodeURIComponent(rest.join("=") || "");
  });
  return out;
}

module.exports = function setupDMSocket(io) {
  // 接続時に認証（CookieのJWT）
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.request.headers.cookie;
      const cookies = parseCookieHeader(cookieHeader);
      const token = cookies[TOKEN_COOKIE];
      if (!token) return next(new Error("not authorized"));

      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = { userId: Number(payload.userId), username: payload.username };
      next();
    } catch {
      next(new Error("not authorized"));
    }
  });

  io.on("connection", (socket) => {
    // 自分情報（デバッグ用）
    socket.emit("dm:ready", { ok: true, me: socket.user });

    // 会話の部屋に入る
    socket.on("dm:join", async ({ conversationId }) => {
      const cid = Number(conversationId);
      if (!cid) return;

      // 参加者チェック
      const c = await pool.query(
        "SELECT user1_id, user2_id FROM public.conversations WHERE id = $1",
        [cid]
      );
      if (c.rowCount === 0) return socket.emit("dm:error", { message: "会話が存在しない" });

      const { user1_id, user2_id } = c.rows[0];
      const myId = socket.user.userId;
      if (myId !== Number(user1_id) && myId !== Number(user2_id)) {
        return socket.emit("dm:error", { message: "権限なし" });
      }

      socket.join(`dm:${cid}`);
      socket.emit("dm:joined", { conversationId: cid });
    });

    // 送信：保存して、会話の部屋にだけ配信
    socket.on("dm:send", async ({ conversationId, body }) => {
      const cid = Number(conversationId);
      const text = (body || "").toString().slice(0, 1000);
      if (!cid || !text.trim()) return;

      // 参加者チェック
      const c = await pool.query(
        "SELECT user1_id, user2_id FROM public.conversations WHERE id = $1",
        [cid]
      );
      if (c.rowCount === 0) return socket.emit("dm:error", { message: "会話が存在しない" });

      const { user1_id, user2_id } = c.rows[0];
      const myId = socket.user.userId;
      if (myId !== Number(user1_id) && myId !== Number(user2_id)) {
        return socket.emit("dm:error", { message: "権限なし" });
      }

      // 保存
      const inserted = await pool.query(
        `
        INSERT INTO public.messages (conversation_id, sender_id, body)
        VALUES ($1, $2, $3)
        RETURNING id, conversation_id, sender_id, body, created_at
        `,
        [cid, myId, text]
      );

      const m = inserted.rows[0];

      // sender名を付けて返す
      const payload = {
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        sender_name: socket.user.username,
        body: m.body,
        created_at: m.created_at,
      };

      io.to(`dm:${cid}`).emit("dm:message", payload);
    });
  });
};
