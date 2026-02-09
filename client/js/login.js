import { apiGet, apiPost } from "./api.js";

const status = document.getElementById("status");

// すでにログイン済みなら一覧へ
(async () => {
  const me = await apiGet("/api/me");
  if (me.ok) location.href = "/chatList.html";
})();

document.getElementById("registerForm").onsubmit = async (e) => {
  e.preventDefault();
  const res = await apiPost("/api/register", {
    username: regUsername.value,
    password: regPassword.value,
  });
  status.textContent = JSON.stringify(res, null, 2);
};

document.getElementById("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const res = await apiPost("/api/login", {
    username: loginUsername.value,
    password: loginPassword.value,
  });
  status.textContent = JSON.stringify(res, null, 2);
  if (res.ok) location.href = "/chatList.html";
};
