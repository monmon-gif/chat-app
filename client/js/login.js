// api.js から GET / POST 用の関数を読み込む
// （fetch をラップした自作関数）
import { apiGet, apiPost } from "./api.js";

// 画面にある <div id="status"> を取得
// サーバーから返ってきた結果を表示するために使う
const status = document.getElementById("status");


// ===============================
// 0) 画面共通：ステータス表示関数
// ===============================

// status領域に文字を表示する（テキストのみ）
function setStatus(msg) {
  status.textContent = msg;
}

// 「○○できました」などの後に、ユーザーに押してもらう確認ボタンを表示する
// Promiseを返すので、await で「ボタンが押されるまで待つ」ことができる
function showConfirm(message, okLabel = "確認") {
  return new Promise((resolve) => {
    // status領域にメッセージ＋ボタンを描画（HTMLを差し込む）
    // ※messageは固定文言推奨（ユーザー入力をそのまま入れるのは避ける）
    status.innerHTML = `
      <div style="display:flex; gap:8px; align-items:center; justify-content:space-between;">
        <div>${message}</div>
        <button id="statusOkBtn" type="button">${okLabel}</button>
      </div>
    `;

    // ボタン押したら resolve → await showConfirm(...) の次の行へ進む
    document.getElementById("statusOkBtn").onclick = () => resolve(true);
  });
}

// 指定したミリ秒だけ待つ（UIの演出用：1秒待って見せる、など）
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// ===============================
// ① ページを開いたときに自動実行（ログイン済みチェック）
// ===============================

// 即時実行関数（ページ読み込み時にすぐ実行される）
(async () => {
  // /api/me にGETリクエストを送る
  // → 「今ログインしているか？」をサーバーに確認
  const me = await apiGet("/api/me");

  // もしログイン済みなら
  if (me.ok) {
    // チャット一覧ページへ移動
    location.href = "/chatList.html";
  }
})();


// ===============================
// ② 登録フォーム送信処理（登録 → 確認ボタン → 自動ログイン → loginへ）
// ===============================

// ※registerForm がページに存在する時だけイベントを付ける（別ページでエラー防止）
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.onsubmit = async (e) => {
    e.preventDefault();

    // 登録フォームの入力値を取得（登録時の値をこの後のログインにも使う）
    const username = regUsername.value.trim();
    const password = regPassword.value;

    // ユーザー目線の演出：「押した感」を出す
    setStatus("登録しています…");
    await sleep(1000);

    // 1) 登録APIを呼ぶ（結果を受け取る）
    const regRes = await apiPost("/api/register", { username, password });

    // 登録失敗なら、メッセージを出して終了
    if (!regRes.ok) {
      setStatus(regRes.message || "登録に失敗しました");
      return;
    }

    // 2) 登録成功 → 確認ボタンを出す（押されるまで待つ）
    await showConfirm("登録できました！", "ログインする");

    // 3) 自動ログイン開始（演出）
    setStatus("ログインしています…");
    await sleep(1000);

    // 4) 自動ログイン（登録フォームの値でログイン）
    const loginRes = await apiPost("/api/login", { username, password });

    if (!loginRes.ok) {
      setStatus(loginRes.message || "自動ログインに失敗しました。ログインしてください。");
      return;
    }

    // 5) login画面へ（ログイン完了トースト表示用のクエリを付ける）
    // ※この時点でログイン済みだが、「ログインできました」を見せたいのでloginへ一回寄る仕様
    sessionStorage.setItem("login", "success");
    location.href = "/login.html?toast=logged_in";
  };
}


// ===============================
// ③ login画面：toast=logged_in を受け取った時だけ3秒表示
// ===============================

// ※loginForm があるページ = login画面 とみなして、そこでだけ表示する
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  const params = new URLSearchParams(location.search);

  // URLが /login.html?toast=logged_in のときだけ表示
  if (params.get("toast") === "logged_in") {
    setStatus("ログインできました");

    // 3秒後に消す
    setTimeout(() => setStatus(""), 3000);

    // リロードしても出続けないようにURLからクエリを消す
    history.replaceState({}, "", "/login.html");
  }

  // ===============================
  // ④ ログインフォーム送信処理（通常ログイン）
  // ===============================
  loginForm.onsubmit = async (e) => {
    e.preventDefault();

    // /api/login にPOST
    const res = await apiPost("/api/login", {
      username: loginUsername.value,
      password: loginPassword.value,
    });

    // ユーザー向けには文字で出す方が分かりやすい（学習中ならJSONでもOK）
    // status.textContent = JSON.stringify(res, null, 2);
    if (!res.ok) {
      setStatus(res.message || "ログインに失敗しました");
      return;
    }

    setStatus("ログインできました");
    await sleep(500);

    // ログイン成功ならチャット一覧へ移動
    sessionStorage.setItem("login", "success");
    location.href = "/chatList.html";
  };
}
