// API呼び出し用（fetchのラッパー）と、未ログインならログイン画面へ飛ばすガードを読み込む
import { apiGet, apiPost } from "./api.js";
import { requireLogin } from "./guard.js";

// ===============================
// ① まずログインチェック（未ログインならここでリダイレクトされる想定）
// ===============================

// requireLogin() は「ログイン中ユーザー情報」を返す（例: { id, username, ... }）
const me = await requireLogin();

// ヘッダー等に自分のユーザー名を表示
document.getElementById("meName").textContent = me.username;

// ===============================
// ② ログアウトボタン
// ===============================

document.getElementById("logoutBtn").onclick = async () => {
  // サーバー側でセッション/Cookieを無効化するAPIを呼ぶ
  await apiPost("/api/logout", {});
  // ログイン画面へ戻す
  location.href = "/login.html";
};

// ===============================
// ③ 「読み込む」ボタン（手動リロード用）
// ===============================

document.getElementById("loadBtn").onclick = loadUsers;

// ===============================
// ④ ページ表示直後に自動でユーザー一覧を読み込む
// ===============================

// DOMが読み込まれたタイミングで一覧を表示（初期表示用）
window.addEventListener("DOMContentLoaded", () => {
  loadUsers();
});

// ===============================
// ⑤ ユーザー一覧の取得＆表示（カード表示）
// ===============================

async function loadUsers() {
  // ユーザー一覧を取得（例: { ok: true, users: [...] }）
  const res = await apiGet("/api/users");

  // 一覧を表示する <ul> を取得
  const ul = document.getElementById("usersList");

  // 再読み込み時に前の表示を消す
  ul.innerHTML = "";

  // 取得したユーザーを1件ずつカード表示する
  res.users.forEach((u) => {
    // <li> を作って、カード用クラスを付与
    const li = document.createElement("li");
    li.className = "user-card";

    // liの中身（カードUI）をHTMLで組み立てる
    // avatar: ユーザー名の先頭1文字を表示（例: "t" → "T"）
    li.innerHTML = `
      <div class="avatar">
        ${u.username.slice(0, 1).toUpperCase()}
      </div>
      <div class="user-info">
        <div class="username">${u.username}</div>
        <div class="sub">クリックしてチャット開始</div>
      </div>
      <div class="arrow">›</div>
    `;

    // クリックしたら「会話を作成（または取得）」して、チャット画面へ遷移
    li.onclick = async () => {
      // partnerId を渡して会話IDを作る/取得する
      const c = await apiPost("/api/conversations", { partnerId: u.id });

      // 会話IDをクエリにつけてチャット画面へ
      location.href = `/chat.html?conversationId=${c.conversationId}`;
    };

    // 作ったカードを一覧に追加
    ul.appendChild(li);
  });
}

// ===============================
// ⑥ ログイン成功トースト（遷移元でsessionStorageに入れたフラグを見る）
// ===============================

// login成功時に login.js 側で sessionStorage.setItem("login","success") している前提
// chatList.html に来た瞬間だけ「ログイン成功」を表示したい
if (sessionStorage.getItem("login") === "success") {
  // 1回だけ表示するためにフラグを消す
  sessionStorage.removeItem("login");

  // トースト表示（3秒）
  showToast("ログインに成功しました 🎉", 3000);
}

// ===============================
// ⑦ トースト表示関数（右上/上中央などはCSSで制御）
// ===============================

function showToast(message, ms = 3000) {
  // トースト要素を作成
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  // bodyに追加して表示できる状態にする
  document.body.appendChild(toast);

  // CSSの transition を効かせるために、少し遅らせて show クラスを付ける
  setTimeout(() => toast.classList.add("show"), 10);

  // 指定時間後に自動で消す
  const timer = setTimeout(() => {
    toast.classList.remove("show");
    // アニメーション完了後にDOMから削除
    setTimeout(() => toast.remove(), 300);
  }, ms);

  // クリックでも閉じられるようにする（ユーザーが邪魔なら消せる）
  toast.onclick = () => {
    clearTimeout(timer);
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  };
}
