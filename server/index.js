require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const { authRouter } = require("./auth");
const { dmRouter } = require("./dm-api");
const setupDMSocket = require("./socket-dm");

const app = express();
const server = http.createServer(app);

// JSON & Cookie
app.use(express.json());
app.use(cookieParser());

// API
app.use("/api", authRouter);
app.use("/api", dmRouter);

// ★ ルートは login.html に飛ばす
app.get("/", (req, res) => res.redirect("/login.html"));

// 静的ファイル
app.use(express.static(path.join(__dirname, "..", "client")));

// Socket.IO
const io = new Server(server);
setupDMSocket(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`API+WEB+Socket running → http://localhost:${PORT}`);
});