/**
 * chat.js
 * ・ログイン必須（未ログインなら login.html へ）
 * ・conversationId をURLから取得
 * ・履歴を表示
 * ・Socket.IOで join / send / receive
 * ・自分のメッセージは右（msg me）
 */

import { apiGet, apiPost } from "./api.js";
import { requireLogin } from "./guard.js";

// ★ 1回だけログイン情報を取得（ここが自分判定に使える）
const me = await requireLogin(); // { userId, username }

// ★ conversationId をURLから取る
const params = new URLSearchParams(location.search);
const conversationId = params.get("conversationId");

// ★ conversationId が無ければ一覧へ戻す（保険）
if (!conversationId) {
  location.href = "/chatList.html";
}

// ====== 画面のボタン ======
document.getElementById("backBtn").onclick = () => {
  location.href = "/chatList.html";
};

document.getElementById("logoutBtn").onclick = async () => {
  await apiPost("/api/logout", {});
  location.href = "/login.html";
};

// ====== DOM取得 ======
const log = document.getElementById("log");
const input = document.getElementById("input"); // ★これが必要

// ====== 履歴表示 ======
const history = await apiGet(`/api/messages?conversationId=${conversationId}`);
if (history.ok && Array.isArray(history.messages)) {
  history.messages.forEach((m) => addMessage(m.sender_name, m.body));
}

// ====== Socket.IO 接続 ======
const socket = io();

// 会話の部屋に入る
socket.emit("dm:join", { conversationId });

// 受信したメッセージを表示
socket.on("dm:message", (m) => {
  addMessage(m.sender_name, m.body);
});

// ====== 送信 ======
document.getElementById("form").onsubmit = (e) => {
  e.preventDefault();

  const body = input.value.trim();
  if (!body) return;

  socket.emit("dm:send", {
    conversationId,
    body,
  });

  input.value = "";
};

// ====== 表示（自分は右、相手は左） ======
function addMessage(senderName, text) {
  const wrap = document.createElement("div");

  // ★ 自分かどうかでクラス分け（CSSの msg me / msg other を使う）
  wrap.className = senderName === me.username ? "msg me" : "msg other";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrap.appendChild(bubble);
  log.appendChild(wrap);

  // 下までスクロール
  log.scrollTop = log.scrollHeight;
}
