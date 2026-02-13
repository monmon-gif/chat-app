// .env ファイルを読み込んで環境変数を使えるようにする
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

// ルーティング・Socket設定を別ファイルから読み込み
const { authRouter } = require("./auth");      // 認証系API
const { dmRouter } = require("./dm-api");      // DM用API
const setupDMSocket = require("./socket-dm");  // DM用Socket.IO処理

const app = express();

// Express単体ではなく、httpサーバーを明示的に作成
// （Socket.IOを使うため）
const server = http.createServer(app);

/* =========================
   ミドルウェア設定
   ========================= */

// JSON形式のリクエストボディを扱えるようにする
app.use(express.json());

// Cookieを req.cookies で参照できるようにする
app.use(cookieParser());

/* =========================
   APIルーティング
   ========================= */

// /api/login, /api/logout など
app.use("/api", authRouter);

// /api/dm, /api/users など
app.use("/api", dmRouter);

/* =========================
   Web（画面）側
   ========================= */

// ルートURLに来たら login.html にリダイレクト
app.get("/", (req, res) => res.redirect("/login.html"));

// client フォルダ配下の静的ファイルを公開
// → login.html, index.html, js, css など
app.use(express.static(path.join(__dirname, "..", "client")));

/* =========================
   Socket.IO
   ========================= */

// httpサーバーに Socket.IO を紐づける
const io = new Server(server);

// DM用のSocketイベントを登録
setupDMSocket(io);

/* =========================
   サーバー起動
   ========================= */

// Herokuなどでは PORT が環境変数で渡される
const PORT = process.env.PORT || 3000;

// API + Web + Socket をまとめて起動
server.listen(PORT, () => {
  console.log(`API+WEB+Socket running → http://localhost:${PORT}`);
});
