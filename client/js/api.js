export async function apiGet(url) {
  const r = await fetch(url, { credentials: "include" });
  return parse(r);
}
export async function apiPost(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return parse(r);
}
async function parse(r) {
  const t = await r.text();
  try { return { httpStatus: r.status, ...JSON.parse(t) }; }
  catch { return { httpStatus: r.status, ok: r.ok, raw: t }; }
}
