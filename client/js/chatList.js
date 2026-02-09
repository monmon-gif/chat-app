import { apiGet, apiPost } from "./api.js";
import { requireLogin } from "./guard.js";

const me = await requireLogin();
document.getElementById("meName").textContent = me.username;

document.getElementById("logoutBtn").onclick = async () => {
  await apiPost("/api/logout", {});
  location.href = "/login.html";
};

document.getElementById("loadBtn").onclick = async () => {
  const res = await apiGet("/api/users");
  const ul = document.getElementById("usersList");
  ul.innerHTML = "";

  res.users.forEach((u) => {
    const li = document.createElement("li");
    li.textContent = u.username;
    li.onclick = async () => {
      const c = await apiPost("/api/conversations", { partnerId: u.id });
      location.href = `/chat.html?conversationId=${c.conversationId}`;
    };
    ul.appendChild(li);
  });
};
