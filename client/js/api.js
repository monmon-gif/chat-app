// ===============================
// GETリクエスト用関数
// ===============================

export async function apiGet(url) {

  // fetchでサーバーにリクエストを送る
  // credentials: "include" は超重要
  // → Cookie（ログイン情報）を一緒に送る設定
  const r = await fetch(url, { 
    credentials: "include" 
  });

  // レスポンスをparse関数に渡す
  return parse(r);
}
// ===============================
// POSTリクエスト用関数
// ===============================

export async function apiPost(url, body) {

  const r = await fetch(url, {

    // HTTPメソッドをPOSTに指定
    method: "POST",

    // JSON形式で送るよ、とサーバーに伝える
    headers: { "Content-Type": "application/json" },

    // Cookieを含める（ログイン維持）
    credentials: "include",

    // JavaScriptのオブジェクトをJSON文字列に変換
    body: JSON.stringify(body),
  });

  return parse(r);
}
// ===============================
// レスポンス共通処理
// ===============================

async function parse(r) {

  // まずレスポンスをテキストで取得
  const t = await r.text();

  try {

    // JSONとしてパースできる場合
    return { 
      httpStatus: r.status,   // HTTPステータス（200, 401など）
      ...JSON.parse(t)        // サーバーが返したJSONを展開
    };

  } catch {

    // JSONじゃなかった場合（HTMLエラーなど）
    return { 
      httpStatus: r.status,
      ok: r.ok,               // true / false
      raw: t                  // 生テキスト
    };
  }
}

