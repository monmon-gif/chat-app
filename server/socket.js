/**
 * socket.js
 * ======================================
 * Socket.IO のイベント処理だけを書く
 * index.js から io を受け取る
 */

module.exports = function setupSocket(io) {

  // クライアント接続時
  io.on("connection", (socket) => {
    console.log("connected:", socket.id);

    /**
     * メッセージ受信
     * client → server
     */
    socket.on("chat:message", (msg) => {
      // msg = { userName, body }

      // 名前が空なら guest
      const userName = (msg?.userName || "guest")
        .toString()
        .slice(0, 50);

      // メッセージ本文
      const body = (msg?.body || "")
        .toString()
        .slice(0, 1000);

      // 空メッセージは無視
      if (!body.trim()) return;

      // クライアントへ返すデータ
      const payload = {
        userName,
        body,
        createdAt: new Date().toISOString(),
      };

      // 全クライアントへ配信
      io.emit("chat:message", payload);
    });

    /**
     * 切断時
     */
    socket.on("disconnect", () => {
      console.log("disconnected:", socket.id);
    });
  });
};
