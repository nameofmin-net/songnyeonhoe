// 관리자 지정 페이지: 비밀번호로 열고, 관리자 이름을 고르고, 권한 요청을 승인/거절한다
import { ALL, ADMIN_ID, adminKey, adminPost, avatarURL, esc, sortedByName, connectLive, setOverride } from "./joinform.js";

const $ = (s) => document.querySelector(s);
const root = $("#app");
let admins = [], reqs = [], q = "", timer = 0;

function login(msg = "") {
  root.innerHTML = `<div class="card"><h1>🔐 관리자 지정</h1><p>관리자 비밀번호를 입력하세요.</p>
    <input id="pw" type="password" placeholder="비밀번호" autocomplete="off"><div class="msg">${esc(msg)}</div><button class="btn" id="go">열기</button></div>`;
  const pw = $("#pw"); pw.focus();
  const go = async () => { adminKey.set(pw.value.trim()); await load() ? main() : login("비밀번호가 맞지 않아요."); };
  $("#go").onclick = go; pw.onkeydown = (e) => e.key === "Enter" && go();
}
async function load() {
  try { const r = await adminPost("/api/admin/list", {}); admins = r.admins || [ADMIN_ID]; reqs = r.reqs || []; return true; }
  catch (e) { if (e.message === "forbidden") adminKey.set(""); return false; }
}
async function save(ids) {
  try { const r = await adminPost("/api/admin/set", { ids }); admins = r.admins; } catch { alert("저장에 실패했어요."); }
  render();
}
const person = (id, right) => `<li><img src="${avatarURL(id, 2, true)}" alt=""><span>${esc(ALL[id].name)}${ALL[id].rank ? `<small>${esc(ALL[id].rank)}</small>` : ""}</span>${right}</li>`;
function render() {
  const t = q.replace(/\s+/g, "");
  const hits = t ? sortedByName(ALL.filter((d) => d.name && d.name.includes(t) && !admins.includes(d.id)).map((d) => d.id)).slice(0, 8) : [];
  $("#reqs").innerHTML = reqs.length ? reqs.map((r) => person(r.id, `<em>${new Date(r.at).toTimeString().slice(0, 5)}</em><button class="btn ok" data-ok="${r.rid}">승인</button><button class="btn sub" data-no="${r.rid}">거절</button>`)).join("") : `<li class="empty">대기 중인 요청이 없어요</li>`;
  $("#reqN").textContent = reqs.length || "";
  $("#admins").innerHTML = admins.length ? sortedByName(admins.filter((id) => ALL[id])).map((id) => person(id, `<button class="btn sub" data-del="${id}">해제</button>`)).join("") : `<li class="empty">관리자가 없어요</li>`;
  $("#hits").innerHTML = hits.map((id) => person(id, `<button class="btn" data-add="${id}">+ 관리자</button>`)).join("") || (t ? `<li class="empty">찾는 이름이 없어요</li>` : "");
}
function main() {
  root.innerHTML = `<div class="card"><h1>🔐 관리자 지정</h1>
    <h2>🙋 권한 요청 <b id="reqN"></b></h2><ul id="reqs" class="list"></ul>
    <h2>👑 관리자</h2><p class="hint">관리자 이름으로 입장하려면 비밀번호나 승인이 필요해요. 관리자 폰엔 컨트롤 버튼이 보여요.</p><ul id="admins" class="list"></ul>
    <h2>➕ 관리자 추가</h2><input id="q" type="search" placeholder="이름 검색" autocomplete="off"><ul id="hits" class="list"></ul>
    <button class="btn sub" id="out">로그아웃</button></div>`;
  $("#q").oninput = (e) => { q = e.target.value; render(); };
  $("#out").onclick = () => { adminKey.set(""); clearInterval(timer); login(); };
  root.onclick = async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.add) { await save([...admins, +b.dataset.add]); $("#q").value = ""; q = ""; render(); }
    if (b.dataset.del) { const id = +b.dataset.del; if (admins.length <= 1) return alert("관리자는 최소 한 명 있어야 해요."); if (confirm(`${ALL[id].name} 님을 관리자에서 해제할까요?`)) save(admins.filter((x) => x !== id)); }
    if (b.dataset.ok || b.dataset.no) {
      b.disabled = true;
      try { await adminPost("/api/admin/decide", { rid: b.dataset.ok || b.dataset.no, ok: !!b.dataset.ok }); } catch {}
      await load(); render();
    }
  };
  render();
  clearInterval(timer); timer = setInterval(async () => { if (await load()) render(); }, 4000);
}
connectLive({ state: (list) => { for (const a of list) setOverride(a.id, a.style); }, adminreq: async () => { if (await load() && $("#reqs")) render(); try { navigator.vibrate?.(200); } catch {} } });
(async () => ((adminKey.get() && (await load())) ? main() : login()))();
