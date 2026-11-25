// 입장(메인 팝업 · 모바일 입장 페이지 공용): 이름+한마디 입장 → 내 캐릭터(복장·한마디 수정)
import { makePopulation, renderSprite, applyStyle, optionsFor, LABELS, SW, SH, isDress, FIXED_TOPS } from "./characters.js";

import { ROSTER } from "./roster.js";
export const ALL = makePopulation(0, 2026, ROSTER);
ALL.forEach((d, i) => (d.rank = ROSTER[i].rank));
export const MAX = ALL.length;
export const byId = (id) => ALL[id];
export const sortedByName = (ids) => [...ids].sort((a, b) => ALL[a].name.localeCompare(ALL[b].name, "ko"));

export const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------- 복장 덮어쓰기 ----------
const overrides = new Map(); // id -> 사용자가 고른 항목
export function setOverride(id, ov) { overrides.set(id, ov && typeof ov === "object" ? ov : {}); }
export const styleOf = (id, ov = overrides.get(id)) => applyStyle(ALL[id].style, ov);

// ---------- 실시간 중계 서버 ----------
// 명단·복장과 입장·건배 신호만 주고받는다. 캐릭터 위치는 화면마다 랜덤.
export const API = "https://songnyeonhoe-live.dkdldb3144.workers.dev";

async function post(path, body, headers = {}) {
  const r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body ?? {}) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}
export const sendJoin = (id, message) => post("/api/join", { id, message });
export const sendUpdate = (id, patch) => post("/api/update", { id, ...patch });
export const sendCheers = () => post("/api/cheers");
export const sendChat = (id, text) => post("/api/chat", { id, text });
export const sendEmote = (id, kind) => post("/api/emote", { id, kind });
/** 채팅 이모티콘: 누르면 광장의 내 캐릭터가 그 동작을 한다 */
export const EMOTES = [
  ["cheers", "🍻", "건배"], ["wave", "👋", "인사"], ["heart", "❤️", "하트"], ["party", "🎉", "축하"],
  ["dance", "💃", "댄스"], ["laugh", "😂", "웃음"], ["wow", "❗", "놀람"], ["sleepy", "😴", "졸려"],
];
export const emoteOf = (k) => EMOTES.find((e) => e[0] === k);
export const resetAll = (key) => post("/api/reset", {}, { "X-Admin-Key": key });

/**
 * 서버와 WebSocket으로 연결해 신호를 받는다. 끊기면 자동 재연결.
 * handlers: { state(list), join(e), update(e), cheers(), status(connected) }
 */
export function connectLive(h) {
  let ws, wait = 1000, ping;
  const open = () => {
    ws = new WebSocket(API.replace(/^http/, "ws") + "/ws");
    ws.onopen = () => { wait = 1000; h.status?.(true); ping = setInterval(() => { try { ws.send("ping"); } catch {} }, 25000); };
    ws.onmessage = (e) => {
      if (e.data === "pong") return;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === "state") { for (const a of m.attendees || []) setOverride(a.id, a.style); h.state?.(m.attendees || []); }
      else if (m.type === "join") { setOverride(m.id, m.style); h.join?.(m); }
      else if (m.type === "update") { setOverride(m.id, m.style); h.update?.(m); }
      else if (m.type === "cheers") h.cheers?.();
      else if (m.type === "chatlog") h.chatlog?.(m.items || []);
      else if (m.type === "chat") h.chat?.(m);
      else if (m.type === "emote") h.emote?.(m);
    };
    ws.onclose = () => { clearInterval(ping); h.status?.(false); setTimeout(open, wait); wait = Math.min(wait * 2, 15000); };
    ws.onerror = () => { try { ws.close(); } catch {} };
  };
  open();
}

// ---------- 아바타 ----------
const avCache = new Map();
function spriteURL(style, k, head) {
  const key = JSON.stringify(style) + k + head;
  if (avCache.has(key)) return avCache.get(key);
  const spr = renderSprite(style, 0, 0, false), h = head ? 17 : SH;
  const c = document.createElement("canvas");
  c.width = SW * k; c.height = h * k;
  const g = c.getContext("2d");
  for (let y = 0; y < h; y++)
    for (let x = 0; x < SW; x++) {
      const v = spr[y * SW + x];
      if (!v) continue;
      g.fillStyle = `rgb(${v & 255},${(v >>> 8) & 255},${(v >>> 16) & 255})`;
      g.fillRect(x * k, y * k, k, k);
    }
  const url = c.toDataURL();
  avCache.set(key, url);
  return url;
}
/** 캐릭터 정면 그림(data URL). 사용자가 바꾼 복장을 반영. head=true면 머리·어깨만. */
export const avatarURL = (id, k = 3, head = false) => spriteURL(styleOf(id), k, head);

// ---------- 채팅 한 줄 ----------
const hhmm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
export function chatItemHTML(m, meId = null) {
  const d = ALL[m.who]; if (!d) return "";
  if (m.kind) { const e = emoteOf(m.kind); return `<li class="ce${m.who === meId ? " mine" : ""}"><img src="${avatarURL(m.who, 2, true)}" alt=""><span class="${d.style.gender}">${esc(d.name)}</span>${d.rank ? `<small class="rk">${d.rank}</small>` : ""} ${e ? e[1] + " " + e[2] + "!" : ""}</li>`; }
  const mine = m.who === meId;
  return `<li class="ci${mine ? " mine" : ""}" data-cid="${m.cid}"><img src="${avatarURL(m.who, 2, true)}" alt=""><div class="cb"><span class="cn ${d.style.gender}">${esc(d.name)}${d.rank ? `<small class="rk">${d.rank}</small>` : ""}<time>${hhmm(m.at)}</time></span><p>${esc(m.text)}</p></div></li>`;
}

// ---------- 화면 ----------
const CSS = `
.jf { display: flex; flex-direction: column; gap: 14px; font-family: Galmuri11, "Apple SD Gothic Neo", sans-serif; color: #f4eefc; }
.jf-head { display: flex; align-items: center; gap: 14px; }
.jf-av { width: 72px; height: 112px; flex: none; display: grid; place-items: center; background: #1c1630; border: 2px solid #4a3f6a; }
.jf-av img { width: 54px; height: 84px; image-rendering: pixelated; }
.jf-av .q { color: #6a5f8a; font-size: 28px; }
.jf-title { font-size: 18px; line-height: 1.4; }
.jf-title small { display: block; color: #9a90b0; font-size: 12px; margin-top: 4px; }
.jf label, .jf .lab { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #c9c0dc; }
.jf select, .jf textarea { font: inherit; font-size: 16px; color: #f4eefc; background: #15101f; border: 2px solid #4a3f6a; padding: 10px 12px; border-radius: 0; width: 100%; }
.jf select:focus, .jf textarea:focus { outline: none; border-color: #ffd84a; }
.jf textarea { resize: none; height: 72px; line-height: 1.5; }
.jf .cnt { align-self: flex-end; font-size: 11px; color: #7a7090; }
.jf .btn, .mob .btn { font: inherit; font-size: 16px; padding: 12px; color: #1c1624; background: #ffd84a; border: 2px solid #fff3b0; box-shadow: 0 4px 0 #8a6a10; cursor: pointer; }
.jf .btn:disabled, .mob .btn:disabled { background: #4a3f6a; border-color: #5a4f7a; color: #9a90b0; box-shadow: none; cursor: default; }
.jf .btn.sub, .mob .btn.sub { background: #2a2140; color: #f4eefc; border-color: #4a3f6a; box-shadow: 0 3px 0 #0008; font-size: 14px; padding: 10px; }
.jf .note { font-size: 13px; line-height: 1.5; padding: 10px 12px; background: #2a2140; border: 1px solid #5a4a30; color: #fff3c0; }
.jf .note:empty { display: none; }
.jf .msg { text-align: center; font-size: 13px; color: #ffd84a; min-height: 1.2em; }
/* 내 캐릭터 */
.me-stage { display: flex; gap: 16px; align-items: center; }
.me-pv { width: 108px; height: 156px; flex: none; display: grid; place-items: center; background: radial-gradient(#2c2444, #1a1428); border: 2px solid #4a3f6a; }
.me-pv canvas { width: 90px; height: 140px; image-rendering: pixelated; }
.me-name { font-size: 22px; } .me-name.M { color: #a8d4ff; } .me-name.F { color: #ffc2dc; }
.me-sub { font-size: 12px; color: #9a90b0; margin-top: 6px; line-height: 1.5; }
.sec { border-top: 2px solid #2e2546; padding-top: 12px; display: flex; flex-direction: column; gap: 10px; }
.sec h3 { margin: 0; font-size: 14px; font-weight: normal; color: #ffd84a; }
.row2 { display: flex; gap: 8px; }
.row2 .btn { flex: 1; }
.parts { display: flex; flex-direction: column; gap: 14px; }
.opt { display: flex; flex-direction: column; gap: 6px; }
.opt > span { font-size: 12px; color: #9a90b0; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font: inherit; font-size: 13px; color: #d8cfe8; background: #15101f; border: 2px solid #3a2f52; padding: 6px 10px; cursor: pointer; }
.chip.on { color: #1c1624; background: #ffd84a; border-color: #fff3b0; }
.sw { width: 30px; height: 30px; border: 2px solid #3a2f52; cursor: pointer; padding: 0; }
.sw.on { border-color: #fff; outline: 2px solid #ffd84a; outline-offset: 1px; }
/* 채팅 공통 */
.ci { display: flex; gap: 8px; align-items: flex-start; padding: 6px 4px; }
.ci img { width: 27px; height: 25px; image-rendering: pixelated; flex: none; margin-top: 2px; }
.ci .cb { min-width: 0; }
.ci .cn { font-size: 12px; display: flex; gap: 6px; align-items: baseline; }
.ci .cn.M { color: #a8d4ff; } .ci .cn.F { color: #ffc2dc; }
.ci time { font-size: 10px; color: #6a6084; }
.rk { font-size: 10px; color: #9a90b0; margin-left: 3px; }
.ci p { margin: 3px 0 0; font-size: 14px; line-height: 1.45; color: #f4eefc; background: #2a2140; padding: 6px 10px; display: inline-block; word-break: keep-all; overflow-wrap: anywhere; }
.ci.mine { flex-direction: row-reverse; text-align: right; }
.ci.mine .cn { justify-content: flex-end; }
.ci.mine p { background: #ffd84a; color: #1c1624; }
.ce { display: flex; align-items: center; gap: 6px; padding: 3px 4px; font-size: 12px; color: #9a90b0; }
.ce img { width: 18px; height: 17px; image-rendering: pixelated; }
.ce .M { color: #a8d4ff; } .ce .F { color: #ffc2dc; }
.ce.mine { justify-content: flex-end; }
/* 모바일: 입장 후 채팅 화면 */
.mob { height: 100dvh; display: flex; flex-direction: column; font-family: Galmuri11, "Apple SD Gothic Neo", sans-serif; color: #f4eefc; }
.mob-head { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #1a1426; border-bottom: 2px solid #3a2f52; flex: none; }
.mob-head img { width: 36px; height: 56px; image-rendering: pixelated; }
.mob-head .who { flex: 1; min-width: 0; }
.mob-head .who b { font-size: 17px; display: block; } .mob-head .who b.M { color: #a8d4ff; } .mob-head .who b.F { color: #ffc2dc; }
.mob-head .who small { font-size: 11px; color: #9a90b0; }
.mob-head .btn { padding: 8px 12px; font-size: 13px; }
.mob-chat { flex: 1; overflow-y: auto; padding: 8px 10px; list-style: none; margin: 0; }
.mob-chat .empty { color: #7a7090; text-align: center; padding: 40px 10px; font-size: 13px; line-height: 1.6; }
.mob-emo { display: flex; gap: 6px; overflow-x: auto; padding: 8px 10px 0; background: #1a1426; border-top: 2px solid #3a2f52; flex: none; scrollbar-width: none; }
.mob-emo button { flex: none; font: inherit; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 52px; padding: 6px 4px; background: #241c36; color: #d8cfe8; border: 2px solid #3a2f52; cursor: pointer; font-size: 11px; }
.mob-emo button i { font-style: normal; font-size: 22px; line-height: 1; }
.mob-emo button:active, .mob-emo button.on { background: #ffd84a; color: #1c1624; border-color: #fff3b0; }
.mob-emo + .mob-in { border-top: 0; }
.mob-head img.hop { animation: hop .6s ease-out; }
@keyframes hop { 0%,100% { transform: translateY(0); } 30% { transform: translateY(-10px); } 60% { transform: translateY(0); } 80% { transform: translateY(-4px); } }
.mob-in { display: flex; gap: 8px; padding: 10px; padding-bottom: max(10px, env(safe-area-inset-bottom)); background: #1a1426; border-top: 2px solid #3a2f52; flex: none; }
.mob-in input { flex: 1; min-width: 0; font: inherit; font-size: 16px; color: #f4eefc; background: #15101f; border: 2px solid #4a3f6a; padding: 10px 12px; border-radius: 0; }
.mob-in input:focus { outline: none; border-color: #ffd84a; }
.mob-in .btn { padding: 10px 16px; font-size: 15px; }
.mob-sheet { position: fixed; inset: 0; background: #110d18; overflow-y: auto; padding: 0 16px 24px; z-index: 5; }
.mob-sheet[hidden] { display: none; }
.mob-sheet .close { position: fixed; top: 12px; right: 12px; z-index: 3; padding: 6px 10px; font-size: 13px; }
/* 스크롤해도 내 캐릭터 미리보기는 위에 고정 */
.mob-sheet .me-stage { position: sticky; top: 0; z-index: 2; background: #110d18; margin: 0 -16px; padding: 14px 16px 12px; border-bottom: 2px solid #2e2546; box-shadow: 0 8px 16px #110d18; }
.mob-sheet .me-stage .me-pv { width: 84px; height: 120px; }
.mob-sheet .me-stage .me-pv canvas { width: 72px; height: 112px; }
.mob-sheet .me-stage > div:last-child { padding-right: 64px; }
`;
let cssOn = false;
const ME_KEY = "songnyeonhoe-me-v1";
const readMe = () => { try { const v = localStorage.getItem(ME_KEY); return v === null ? null : +v; } catch { return null; } };
const writeMe = (id) => { try { id === null ? localStorage.removeItem(ME_KEY) : localStorage.setItem(ME_KEY, String(id)); } catch {} };

// 복장 항목: [키, 이름, 종류]
const PARTS = [
  ["hair", "헤어", "chip"], ["hairColor", "머리 색", "color"], ["skin", "피부", "color"],
  ["top", "상의", "chip"], ["topColor", "상의 색", "color"], ["top2", "포인트 색", "color"],
  ["bottom", "하의", "chip"], ["bottomColor", "하의 색", "color"], ["shoes", "신발", "color"],
  ["hat", "모자", "chip"], ["hatColor", "모자 색", "color"],
  ["acc", "소품", "chip"], ["accColor", "소품 색", "color"],
];

/**
 * 입장 화면을 root에 그린다.
 * lock: true면 이 기기는 한 사람만(모바일 입장 페이지). false면 여러 명 테스트 가능(메인 팝업).
 * entries(): 서버 명단 Map(id -> {message, style})
 * 반환: { sync() — 명단이 바뀌면 호출, focus() }
 */
export function mountEntry(root, { lock = true, entries, onEntered }) {
  if (!cssOn) { const s = document.createElement("style"); s.textContent = CSS; document.head.append(s); cssOn = true; }
  let view = null, me = null, timer = null, chatItems = [], renderChat = null;

  function showForm(note = "") {
    view = "form"; me = null; clearInterval(timer); renderChat = null;
    document.body.classList.remove("chatting");
    root.innerHTML = `
      <form class="jf" autocomplete="off">
        <div class="jf-head">
          <div class="jf-av"><span class="q">?</span></div>
          <div class="jf-title">2026 송년회 입장<small>내 이름을 고르고 올해 한마디를 남겨 주세요</small></div>
        </div>
        <div class="note">${esc(note)}</div>
        <label>이름 <select name="who" required></select></label>
        <label class="msgbox">올해 한마디
          <textarea name="msg" maxlength="40" placeholder="예) 올해 다들 고생 많았어요!"></textarea>
          <span class="cnt">0 / 40</span>
        </label>
        <button class="btn" type="submit" disabled>입장하기 🎉</button>
        <div class="msg"></div>
      </form>`;
    const f = root.querySelector("form"), sel = f.who, msg = f.msg, btn = f.querySelector(".btn"), av = f.querySelector(".jf-av"), cnt = f.querySelector(".cnt"), out = f.querySelector(".msg"), noteEl = f.querySelector(".note"), box = f.querySelector(".msgbox");
    const fill = () => {
      const keep = sel.value, E = entries();
      const ids = sortedByName(ALL.map((d) => d.id));
      const waitN = ids.filter((id) => !E.has(id)).length;
      sel.innerHTML = `<option value="">이름을 선택하세요 (${waitN}명 대기)</option>` +
        ids.map((id) => `<option value="${id}">${ALL[id].name}${E.has(id) ? " · 입장 완료" : ""}</option>`).join("");
      sel.value = keep;
    };
    const check = () => {
      const id = sel.value === "" ? null : +sel.value, done = id !== null && entries().has(id);
      av.innerHTML = id === null ? `<span class="q">?</span>` : `<img alt="" src="${avatarURL(id, 3)}">`;
      box.hidden = done;
      if (done) noteEl.textContent = "이미 입장한 이름이에요. 아래 버튼으로 내 캐릭터를 열 수 있어요.";
      else if (noteEl.textContent.startsWith("이미 입장한")) noteEl.textContent = "";
      btn.textContent = done ? "내 캐릭터 열기" : "입장하기 🎉";
      btn.disabled = id === null || (!done && !msg.value.trim());
      cnt.textContent = `${msg.value.length} / 40`;
    };
    sel.addEventListener("change", () => { out.textContent = ""; check(); });
    msg.addEventListener("input", check);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      const id = +sel.value;
      if (entries().has(id)) { open(id, "already"); return; }
      btn.disabled = true; out.textContent = "보내는 중…";
      try {
        const r = await sendJoin(id, msg.value.trim());
        open(id, r.already ? "already" : "new", r.entry);
        onEntered?.(id);
      } catch { out.textContent = "전송에 실패했어요. 잠시 후 다시 눌러 주세요."; check(); }
    });
    fill(); check();
    showForm.fill = () => { fill(); check(); };
  }

  function open(id, why, entry) {
    if (lock) writeMe(id);
    if (entry) setOverride(id, entry.style);
    showMe(id, why);
  }

  function showMe(id, why = "") {
    view = "me"; me = id; clearInterval(timer);
    const d = ALL[id], E = entries().get(id) || { message: "", style: {} };
    const opt = optionsFor(d.style.gender);
    let draft = { ...(E.style || overrides.get(id) || {}) };
    const sub = why === "new" ? "입장 완료! 광장에 내 캐릭터가 등장했어요 🎉" : why === "already" ? "이미 입장한 이름이에요. 내 캐릭터를 꾸며 보세요." : "언제든 복장과 한마디를 바꿀 수 있어요.";
    const editor = `
      <div class="jf">
        <div class="me-stage">
          <div class="me-pv"><canvas width="${SW}" height="${SH}"></canvas></div>
          <div><div class="me-name ${d.style.gender}">${esc(d.name)} 님</div><div class="me-sub">${sub}</div></div>
        </div>
        <div class="sec">
          <h3>올해 한마디</h3>
          <textarea maxlength="40">${esc(E.message)}</textarea>
          <span class="cnt">0 / 40</span>
          <button class="btn sub" data-act="msg">한마디 바꾸기</button>
        </div>
        <div class="sec">
          <h3>복장 설정</h3>
          <div class="parts"></div>
          <div class="row2"><button class="btn sub" data-act="rand">🎲 랜덤</button><button class="btn sub" data-act="undo">처음대로</button></div>
          <button class="btn" data-act="save">저장하고 광장에 반영</button>
        </div>
        <div class="msg"></div>
        ${lock ? "" : `<button class="btn sub" data-act="other">다른 사람 입장하기</button>`}
      </div>`;
    if (lock) {
      document.body.classList.add("chatting");
      root.innerHTML = `
        <div class="mob">
          <header class="mob-head">
            <img class="mob-av" src="${avatarURL(id, 2)}" alt="">
            <div class="who"><b class="${d.style.gender}">${esc(d.name)} 님</b><small class="mob-live">${sub}</small></div>
            <button class="btn sub" data-act="edit">캐릭터 수정</button>
          </header>
          <ul class="mob-chat"></ul>
          <div class="mob-emo">${EMOTES.map(([k, e, l]) => `<button type="button" data-emo="${k}"><i>${e}</i>${l}</button>`).join("")}</div>
          <form class="mob-in" autocomplete="off"><input maxlength="100" placeholder="광장에 메시지 보내기" enterkeyhint="send"><button class="btn">전송</button></form>
          <div class="mob-sheet" hidden><button class="btn sub close" data-act="close">닫기 ✕</button>${editor}</div>
        </div>`;
      const list = root.querySelector(".mob-chat"), form = root.querySelector(".mob-in"), input = form.querySelector("input"), sheet = root.querySelector(".mob-sheet");
      renderChat = () => {
        const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
        list.innerHTML = chatItems.length ? chatItems.map((m) => chatItemHTML(m, id)).join("") : `<li class="empty">아직 대화가 없어요.<br>첫 인사를 남겨 보세요 👋</li>`;
        if (atBottom || renderChat.first) list.scrollTop = list.scrollHeight;
        renderChat.first = false;
      };
      renderChat.first = true; renderChat();
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = input.value.trim(); if (!text) return;
        input.value = ""; input.focus();
        try { await sendChat(id, text); list.scrollTop = list.scrollHeight; }
        catch (err) { input.value = text; alert(err.message === "slow down" ? "조금 천천히 보내 주세요." : "전송에 실패했어요."); }
      });
      const live = root.querySelector(".mob-live"), av = root.querySelector(".mob-av");
      let liveT = 0;
      root.querySelector(".mob-emo").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-emo]"); if (!b) return;
        const em = emoteOf(b.dataset.emo);
        av.classList.remove("hop"); void av.offsetWidth; av.classList.add("hop");
        b.classList.add("on"); setTimeout(() => b.classList.remove("on"), 300);
        try {
          await sendEmote(id, em[0]);
          live.textContent = `${em[1]} 광장에서 ${em[2]} 중!`;
        } catch (err) { live.textContent = err.message === "slow down" ? "조금 천천히 눌러 주세요" : "전송에 실패했어요"; }
        clearTimeout(liveT); liveT = setTimeout(() => (live.textContent = "광장에 연결돼 있어요"), 2200);
      });
      root.querySelector(".mob").addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "edit") { sheet.hidden = false; sheet.scrollTop = 0; }
        if (act === "close") { sheet.hidden = true; root.querySelector(".mob-av").src = avatarURL(id, 2); }
      });
    } else root.innerHTML = editor;
    const cv = root.querySelector("canvas"), g = cv.getContext("2d"), parts = root.querySelector(".parts"), out = root.querySelector(".msg");
    const ta = root.querySelector("textarea"), cnt = root.querySelector(".cnt");
    const cur = () => applyStyle(d.style, draft);
    // 미리보기: 앞 → 옆 → 뒤로 돌며 걷기
    let f = 0;
    const paint = () => {
      const seq = [[0, 0], [0, 1], [0, 0], [0, 3], [2, 0], [2, 1], [2, 0], [2, 3], [1, 0], [1, 1], [1, 0], [1, 3]];
      const [dir, step] = seq[Math.floor(f / 2) % seq.length];
      const spr = renderSprite(cur(), dir, step, false), img = g.createImageData(SW, SH);
      for (let i = 0; i < spr.length; i++) { const v = spr[i]; if (!v) continue; img.data[i * 4] = v & 255; img.data[i * 4 + 1] = (v >>> 8) & 255; img.data[i * 4 + 2] = (v >>> 16) & 255; img.data[i * 4 + 3] = 255; }
      g.clearRect(0, 0, SW, SH); g.putImageData(img, 0, 0); f++;
    };
    timer = setInterval(paint, 160); paint();
    const drawParts = () => {
      const st = cur();
      parts.innerHTML = PARTS.filter(([k]) => !(k === "hatColor" && st.hat === "none") && !(k === "accColor" && !["headphones", "backpack", "scarf"].includes(st.acc)) && !(k === "bottom" && isDress(st.top)) && !((k === "topColor" || k === "top2") && FIXED_TOPS.includes(st.top)))
        .map(([k, name, kind]) => `<div class="opt"><span>${name}</span><div class="chips">${
          opt[k].map((v) => kind === "chip"
            ? `<button class="chip ${st[k] === v ? "on" : ""}" data-k="${k}" data-v="${v}">${LABELS[k]?.[v] ?? v}</button>`
            : `<button class="sw ${st[k] === v ? "on" : ""}" data-k="${k}" data-v="${v}" style="background:${v}" aria-label="${name} ${v}"></button>`).join("")
        }</div></div>`).join("");
    };
    parts.addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]"); if (!b) return;
      draft = { ...draft, [b.dataset.k]: b.dataset.v };
      if (b.dataset.k === "top" && !isDress(b.dataset.v) && cur().bottom === "dress") draft.bottom = optionsFor(d.style.gender).bottom[0];
      out.textContent = ""; drawParts();
    });
    const counter = () => (cnt.textContent = `${ta.value.length} / 40`);
    ta.addEventListener("input", counter); counter();
    root.querySelector(".jf").addEventListener("click", async (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act; if (!act) return;
      if (act === "rand") { const r = (a) => a[Math.floor(Math.random() * a.length)]; draft = {}; for (const [k] of PARTS) draft[k] = r(opt[k]); drawParts(); }
      if (act === "undo") { draft = {}; drawParts(); }
      if (act === "other") { showForm(); return; }
      if (act === "msg" || act === "save") {
        const btn = e.target; btn.disabled = true; out.textContent = "보내는 중…";
        try {
          const st = cur(), clean = {};
          for (const [k] of PARTS) if (st[k] !== d.style[k]) clean[k] = st[k];
          const r = await sendUpdate(id, act === "msg" ? { message: ta.value.trim() } : { style: clean });
          setOverride(id, r.entry.style);
          out.textContent = act === "msg" ? "한마디를 바꿨어요. 광장에서 말하고 있어요 💬" : "저장했어요! 광장 캐릭터에 반영됐어요 ✨";
        } catch (err) { out.textContent = err.message === "not joined" ? "명단에서 빠져 있어요. 다시 입장해 주세요." : "전송에 실패했어요. 잠시 후 다시 눌러 주세요."; }
        btn.disabled = false;
      }
    });
    drawParts();
  }

  function sync() {
    const E = entries();
    if (view === "me") {
      // 초기화 등으로 명단에서 빠졌으면 입장 폼으로
      if (!E.has(me)) { if (lock) writeMe(null); showForm("명단이 초기화됐어요. 다시 입장해 주세요."); }
      return;
    }
    const saved = lock ? readMe() : null;
    if (saved !== null && E.has(saved)) { showMe(saved); return; }
    if (saved !== null && !E.has(saved) && ready) writeMe(null);
    if (view !== "form") showForm(); else showForm.fill?.();
  }
  let ready = false;
  showForm();
  return {
    sync: () => { ready = true; sync(); },
    focus: () => root.querySelector("select")?.focus(),
    reset: () => showForm(),
    chatlog: (items) => { chatItems = items.slice(-150); renderChat?.(); },
    chat: (m) => { chatItems.push(m); if (chatItems.length > 150) chatItems.shift(); renderChat?.(); },
    emote: (m) => { chatItems.push(m); if (chatItems.length > 150) chatItems.shift(); renderChat?.(); },
  };
}
