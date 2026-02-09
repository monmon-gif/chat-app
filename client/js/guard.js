import { apiGet } from "./api.js";

export async function requireLogin() {
  const me = await apiGet("/api/me");
  if (!me.ok) {
    location.href = "/login.html";
    return null;
  }
  return me.user;
}
