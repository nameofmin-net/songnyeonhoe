// 입장(메인 팝업 · 모바일 입장 페이지 공용): 이름+한마디 입장 → 내 캐릭터(복장·한마디 수정)
import { makePopulation, renderSprite, applyStyle, optionsFor, LABELS, SW, SH, isDress, FIXED_TOPS } from "./characters.js";
import { createFrame, clearFrame, painterFor, composite } from "../pixelfx/core/index.js";
import { drawSpecial, floatOf } from "./special.js";

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
export const resetAll = (key, keep) => post("/api/reset", keep === undefined ? {} : { keep }, { "X-Admin-Key": key });
// 어드민(컨트롤러)
export const ADMIN_NAME = "최민우";
export const ADMIN_ID = ALL.findIndex((d) => d.name === ADMIN_NAME);
const ADMIN_LS = "songnyeonhoe-admin";
export const adminKey = { get: () => { try { return localStorage.getItem(ADMIN_LS) || ""; } catch { return ""; } }, set: (k) => { try { k ? localStorage.setItem(ADMIN_LS, k) : localStorage.removeItem(ADMIN_LS); } catch {} } };
export const sendQuizVote = (id, pick) => post("/api/quiz/vote", { id, pick });
export const adminPost = (path, body) => post(path, body, { "X-Admin-Key": adminKey.get() });

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
      else if (m.type === "reset") h.reset?.();
      else if (m.type === "chatlog") h.chatlog?.(m.items || []);
      else if (m.type === "chat") h.chat?.(m);
      else if (m.type === "emote") h.emote?.(m);
      else if (m.type === "show") h.show?.(m.show);
      else if (m.type === "mode") h.mode?.(m.mode);
      else if (m.type === "quiz") h.quiz?.(m.quiz, m.votes || {});
      else if (m.type === "vote") h.vote?.(m);
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
.jf { display: flex; flex-direction: column; gap: 14px; font-family: Galmuri14, "Apple SD Gothic Neo", sans-serif; color: #f4eefc; }
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
.me-pv canvas { width: 120px; height: 138px; image-rendering: pixelated; }
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
.tabs { display: flex; gap: 0; border: 2px solid #4a3f6a; }
.tabs button { flex: 1; font: inherit; font-size: 14px; padding: 10px; color: #9a90b0; background: #15101f; border: 0; cursor: pointer; }
.tabs button.on { color: #1c1624; background: #ffd84a; }
.tabs button:not(.on).sp { color: #ff8ad8; }
.spgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.spcard { font: inherit; text-align: left; color: #d8cfe8; background: #15101f; border: 2px solid #3a2f52; padding: 10px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
.spcard b { font-size: 14px; font-weight: normal; color: #f4eefc; }
.spcard small { font-size: 11px; color: #9a90b0; line-height: 1.4; }
.spcard.on { border-color: #ffd84a; background: #2a2140; box-shadow: 0 0 0 2px #ffd84a55; }
.spcard.on b { color: #ffd84a; }
.spnote { font-size: 12px; color: #ff8ad8; line-height: 1.5; padding: 8px 10px; background: #2a1830; border: 1px solid #5a3050; }
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
.mob { height: 100dvh; display: flex; flex-direction: column; font-family: Galmuri14, "Apple SD Gothic Neo", sans-serif; color: #f4eefc; }
.mob-head { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #1a1426; border-bottom: 2px solid #3a2f52; flex: none; }
.mob-head img { width: 36px; height: 56px; image-rendering: pixelated; }
.mob-head .who { flex: 1; min-width: 0; }
.mob-head .who b { font-size: 17px; display: block; } .mob-head .who b.M { color: #a8d4ff; } .mob-head .who b.F { color: #ffc2dc; }
.mob-head .who small { font-size: 11px; color: #9a90b0; }
.mob-head .btn { padding: 8px 12px; font-size: 13px; }
/* 버튼 프레스 인터랙션 (채팅·메뉴·컨트롤러 공통) */
button, .btn, [data-act], [data-emo], label[data-row], label:has(> input[type=checkbox]), [role=button] { -webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; -webkit-user-select: none; transition: transform .12s cubic-bezier(.22,1,.36,1), box-shadow .12s, filter .15s, background-color .15s; }
@media (hover: hover) { button:hover:not(:disabled), .btn:hover { filter: brightness(1.12); } }
button.down:not(:disabled), .btn.down, button:active:not(:disabled), .btn:active, label.down, [role=button].down { transform: translateY(3px) scale(.96); filter: brightness(.92); box-shadow: 0 1px 0 #00000066 !important; transition-duration: .04s; }
.mob-emo button.down i, .mob-emo button:active i { display: inline-block; transform: scale(1.35) rotate(-8deg); }
.mob-emo button i { transition: transform .18s cubic-bezier(.34,1.8,.5,1); }
label.down { transform: scale(.985) !important; filter: brightness(1.25) !important; box-shadow: none !important; }
.qz-btns button.down:not(:disabled), .qz-btns button:active:not(:disabled) { transform: translateY(6px) scale(.94); }
button:disabled { opacity: .45; filter: grayscale(.6); cursor: default; }
.btn.pressed, button.pressed { animation: pressPop .32s cubic-bezier(.34,1.6,.5,1); }
@keyframes pressPop { 0% { transform: scale(.92); } 60% { transform: scale(1.06); } 100% { transform: none; } }

.mob-quiz { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 20px 16px; text-align: center; background: #e8d6b0; color: #3a2a1a; }
.mob-quiz[hidden] { display: none; }
.mob.quizzing .mob-chat, .mob.quizzing .mob-in { display: none; }
.qz-n { font-size: 14px; color: #c8327a; letter-spacing: .1em; }
.qz-q { font-size: 22px; line-height: 1.5; word-break: keep-all; color: #1c1624; }
.qz-btns { display: flex; gap: 16px; width: 100%; }
.qz-btns button { flex: 1; aspect-ratio: 1; font: inherit; font-size: 72px; line-height: 1; border: 4px solid #1c1624; box-shadow: 0 6px 0 #1c1624; cursor: pointer; color: #fff; }
.qz-btns .o { background: #2f6ad8; } .qz-btns .x { background: #d83a3a; }
.qz-btns button.on { transform: translateY(4px); box-shadow: 0 2px 0 #1c1624; outline: 4px solid #ffd84a; }
.qz-btns button:disabled { opacity: .35; } .qz-btns button.ans { opacity: 1; outline: 5px solid #5ae08a; }
.qz-st { font-size: 15px; min-height: 1.4em; } .qz-st .ok { color: #1a8a3a; font-size: 20px; } .qz-st .ng { color: #c81e2a; font-size: 20px; }
.qz-end { font-size: 22px; line-height: 1.6; } .qz-end small { font-size: 14px; color: #6a5a4a; }
.mob-admin { display: flex; gap: 6px; padding: 6px 10px; border-bottom: 1px solid #ffffff14; }
.mob-admin .btn { flex: 1; padding: 8px 6px; font-size: 13px; }
.mob-head .btn.ctl-btn { padding: 6px 10px; font-size: 20px; }
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
.mob-sheet .me-stage .me-pv canvas { width: 84px; height: 97px; }
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
  ["sp", "특수 복장", "special"],
];
const SP_DESC = {
  none: "특수 복장을 벗고 기본 복장으로",
  gold: "금빛 수트에 왕관, 온몸에서 반짝이와 금가루가 흩날려요",
  disco: "머리 위에 미러볼이 돌고, 발밑에 조명이 빙글빙글",
  tree: "내가 트리가 된다. 전구가 깜빡이고 별이 빛나요",
  neon: "외곽선이 무지개 네온으로 흘러가며 빛나요",
  angel: "날개가 퍼덕이고 머리 위에 링, 둥실 떠다녀요",
};
const PW = 40, PH = 46;

/**
 * 입장 화면을 root에 그린다.
 * lock: true면 이 기기는 한 사람만(모바일 입장 페이지). false면 여러 명 테스트 가능(메인 팝업).
 * entries(): 서버 명단 Map(id -> {message, style})
 * 반환: { sync() — 명단이 바뀌면 호출, focus() }
 */
export function mountEntry(root, { lock = true, entries, onEntered, onController }) {
  if (!cssOn) { const s = document.createElement("style"); s.textContent = CSS; document.head.append(s); cssOn = true; }
  let view = null, me = null, timer = null, chatItems = [], renderChat = null;
  let quizState = null, myPick = {}, renderQuiz = null;

  function showForm(note = "") {
    view = "form"; me = null; clearInterval(timer); renderChat = null; renderQuiz = null;
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
          <div class="me-pv"><canvas width="${PW}" height="${PH}"></canvas></div>
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
          <div class="tabs"><button data-tab="basic" class="on">기본 복장</button><button data-tab="sp" class="sp">✨ 특수 복장</button></div>
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
            ${id === ADMIN_ID && onController ? `<button class="btn ctl-btn" data-act="ctl">🎮</button>` : ""}
            <button class="btn sub" data-act="edit">캐릭터 수정</button>
          </header>
          ${id === ADMIN_ID ? `<div class="mob-admin"><button class="btn sub" data-act="rand">🎲 랜덤 5명 입장</button><button class="btn sub" data-act="wipe">💥 광장 초기화</button></div>` : ""}
          <div class="mob-quiz" hidden></div>
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
      // OX 퀴즈: 진행 중엔 채팅 대신 문제 + O/X 버튼(이모티콘은 그대로)
      const qbox = root.querySelector(".mob-quiz"), mob = root.querySelector(".mob");
      renderQuiz = () => {
        const q = quizState;
        mob.classList.toggle("quizzing", !!q);
        qbox.hidden = !q;
        if (!q) return;
        if (q.phase === "ready") { qbox.innerHTML = `<div class="qz-end">⭕❌ OX 퀴즈 운동장에 도착!<br><small>곧 첫 문제가 나와요. 휴대폰을 들고 기다려 주세요</small></div>`; return; }
        if (q.phase === "end") { qbox.innerHTML = `<div class="qz-end">🏁 모든 문제가 끝났어요!<br><small>광장 화면을 봐 주세요</small></div>`; return; }
        const pick = myPick[q.idx], out = (q.out || []).includes(id) && q.phase !== "reveal", rev = q.phase === "reveal" || out;
        const res = out ? `<b class="ng">탈락했어요 💀 구경 모드</b>` : rev ? (pick ? (pick === q.a ? `<b class="ok">⭕ 정답! 살아남았어요 🎉</b>` : `<b class="ng">탈락… 💀</b>`) : `<b class="ng">안 골라서 탈락… 💀</b>`) : pick ? `${pick} 쪽으로 이동했어요` : "O 또는 X를 골라 주세요";
        qbox.innerHTML = `<div class="qz-n">Q${q.idx + 1}${q.total ? ` / ${q.total}` : ""}</div><div class="qz-q">${esc(q.q)}</div>
          <div class="qz-btns"><button data-pick="O" class="o ${pick === "O" ? "on" : ""} ${rev && q.a === "O" ? "ans" : ""}" ${rev ? "disabled" : ""}>O</button><button data-pick="X" class="x ${pick === "X" ? "on" : ""} ${rev && q.a === "X" ? "ans" : ""}" ${rev ? "disabled" : ""}>X</button></div>
          <div class="qz-st">${res}</div>`;
      };
      qbox.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-pick]"); if (!b || !quizState || quizState.phase !== "ask") return;
        const prev = myPick[quizState.idx]; myPick[quizState.idx] = b.dataset.pick; renderQuiz();
        try { await sendQuizVote(id, b.dataset.pick); } catch (err) { myPick[quizState.idx] = prev; renderQuiz(); if (err.message === "closed") alert("투표가 마감됐어요"); }
      });
      renderQuiz();
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
        if (act === "ctl") { onController(); return; }
        if (act === "rand") { adminRandom(entries); return; }
        if (act === "wipe") { adminWipe(id); return; }
        if (act === "edit") { sheet.hidden = false; sheet.scrollTop = 0; }
        if (act === "close") { sheet.hidden = true; root.querySelector(".mob-av").src = avatarURL(id, 2); }
      });
    } else root.innerHTML = editor;
    const cv = root.querySelector("canvas"), g = cv.getContext("2d"), parts = root.querySelector(".parts"), out = root.querySelector(".msg");
    const ta = root.querySelector("textarea"), cnt = root.querySelector(".cnt");
    const cur = () => applyStyle(d.style, draft);
    // 미리보기: 앞 → 옆 → 뒤로 돌며 걷기
    const pf = createFrame(PW, PH), img = g.createImageData(PW, PH), t0 = performance.now();
    let sprKey = "", sprCache = new Map();
    const paint = () => {
      const t = (performance.now() - t0) / 1000, f = Math.floor(t / 0.16);
      const seq = [[0, 0], [0, 1], [0, 0], [0, 3], [2, 0], [2, 1], [2, 0], [2, 3], [1, 0], [1, 1], [1, 0], [1, 3]];
      const [dir, step] = seq[Math.floor(f / 2) % seq.length];
      const st = cur(), key = JSON.stringify(st);
      if (key !== sprKey) { sprKey = key; sprCache = new Map(); }
      let spr = sprCache.get(dir * 10 + step);
      if (!spr) sprCache.set(dir * 10 + step, (spr = renderSprite(st, dir, step, false)));
      clearFrame(pf);
      const cx = PW / 2, fy = PH - 3, x0 = cx - SW / 2, y0 = fy - SH - floatOf(st.sp, t);
      const o = { x0, y0, cx, fy, t, spr, flip: false, seed: id };
      const p = painterFor(pf);
      drawSpecial(p, st.sp, "back", o);
      for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const v = spr[y * SW + x]; if (v && y0 + y >= 0) pf.color[(y0 + y) * PW + x0 + x] = v; }
      drawSpecial(painterFor(pf), st.sp, "front", o);
      img.data.fill(0); composite(pf, img.data, null);
      g.putImageData(img, 0, 0);
    };
    timer = setInterval(paint, 50); paint();
    let tab = cur().sp && cur().sp !== "none" ? "sp" : "basic";
    const drawParts = () => {
      const st = cur();
      root.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
      if (tab === "sp") {
        parts.innerHTML = `<div class="spgrid">${opt.sp.map((v) => `<button class="spcard ${(st.sp || "none") === v ? "on" : ""}" data-k="sp" data-v="${v}"><b>${LABELS.sp[v]}</b><small>${SP_DESC[v]}</small></button>`).join("")}</div>`;
        return;
      }
      const note = st.sp && st.sp !== "none" ? `<div class="spnote">✨ 지금 특수 복장(${LABELS.sp[st.sp]})을 입고 있어요. 기본 복장은 특수 복장 탭에서 '없음'을 고르면 보여요.</div>` : "";
      parts.innerHTML = note + PARTS.filter(([k]) => k !== "sp").filter(([k]) => !(k === "hatColor" && st.hat === "none") && !(k === "accColor" && !["headphones", "backpack", "scarf"].includes(st.acc)) && !(k === "bottom" && isDress(st.top)) && !((k === "topColor" || k === "top2") && FIXED_TOPS.includes(st.top)))
        .map(([k, name, kind]) => `<div class="opt"><span>${name}</span><div class="chips">${
          opt[k].map((v) => kind === "chip"
            ? `<button class="chip ${st[k] === v ? "on" : ""}" data-k="${k}" data-v="${v}">${LABELS[k]?.[v] ?? v}</button>`
            : `<button class="sw ${st[k] === v ? "on" : ""}" data-k="${k}" data-v="${v}" style="background:${v}" aria-label="${name} ${v}"></button>`).join("")
        }</div></div>`).join("");
    };
    // 기본 복장 탭을 누르거나 기본 항목을 고르면 특수 복장을 벗는다
    root.querySelector(".tabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]"); if (!b) return;
      tab = b.dataset.tab;
      if (tab === "basic" && cur().sp && cur().sp !== "none") { draft = { ...draft, sp: "none" }; out.textContent = ""; }
      drawParts();
    });
    parts.addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]"); if (!b) return;
      draft = { ...draft, [b.dataset.k]: b.dataset.v };
      if (b.dataset.k !== "sp") draft.sp = "none";
      if (b.dataset.k === "top" && !isDress(b.dataset.v) && cur().bottom === "dress") draft.bottom = optionsFor(d.style.gender).bottom[0];
      out.textContent = ""; drawParts();
    });
    const counter = () => (cnt.textContent = `${ta.value.length} / 40`);
    ta.addEventListener("input", counter); counter();
    root.querySelector(".jf").addEventListener("click", async (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act; if (!act) return;
      if (act === "rand") { const r = (a) => a[Math.floor(Math.random() * a.length)]; draft = {}; for (const [k] of PARTS) if (k !== "sp") draft[k] = r(opt[k]); drawParts(); }
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
    quiz: (q, votes) => { quizState = q && q.on ? q : null; if (q && me !== null && votes && votes[me]) myPick[q.idx] = votes[me]; renderQuiz?.(); },
  };
}

const RAND_MSG = ["올해 정말 고생 많으셨어요!", "내년에도 잘 부탁드립니다 🙏", "다들 건강하세요!", "올해 최고의 팀이었어요 👏", "새해 복 많이 받으세요", "맛있는 거 먹으러 왔어요 🍗", "내년엔 더 재밌게!", "올 한 해 감사했습니다", "회식 2차 갑니다 🍻", "다들 사랑합니다 ❤️"];
function adminRandom(entries, n = 5) {
  const here = entries?.() || new Map(), has = (i) => (here.has ? here.has(i) : here[i]);
  const waiting = ALL.map((d) => d.id).filter((i) => !has(i));
  if (!waiting.length) { alert("모두 입장했어요."); return; }
  for (let i = 0; i < n && waiting.length; i++) {
    const pick = waiting.splice(Math.floor(Math.random() * waiting.length), 1)[0];
    setTimeout(() => sendJoin(pick, RAND_MSG[Math.floor(Math.random() * RAND_MSG.length)]).catch(() => {}), i * 600);
  }
}
async function adminWipe(me) {
  if (!confirm("💥 광장을 초기화할까요?\n모든 기기의 입장 명단과 채팅이 지워져요. (관리자 본인은 남아요)")) return;
  let key = adminKey.get();
  if (!key) { key = (prompt("관리자 코드를 입력하세요.") || "").trim(); if (!key) return; }
  try { await resetAll(key, me); adminKey.set(key); }
  catch (e) { alert(e.message === "forbidden" ? "관리자 코드가 맞지 않아요." : "초기화에 실패했어요."); }
}

const PRESS = "button, .btn, label[data-row], label:has(> input[type=checkbox]), [role=button]";
// 손을 뗄 때 톡 튀어오르는 반동 + 짧은 진동
if (typeof document !== "undefined") document.addEventListener("click", (e) => {
  const b = e.target.closest?.(PRESS); if (!b || b.disabled) return;
  b.classList.remove("pressed"); void b.offsetWidth; b.classList.add("pressed");
}, true);

// 누르는 동안 눌린 모양(.down) 유지 → 손을 떼면 그때 동작(click). 손가락이 버튼 밖으로 나가면 취소.
if (typeof document !== "undefined") {
  document.addEventListener("touchstart", () => {}, { passive: true }); // iOS :active 활성화
  let held = null;
  const up = () => { if (held) { const b = held; held = null; setTimeout(() => b.classList.remove("down"), 70); } };
  document.addEventListener("pointerdown", (e) => { const b = e.target.closest?.(PRESS); if (!b || b.disabled) return; held = b; b.classList.add("down"); try { navigator.vibrate?.(6); } catch {} }, true);
  document.addEventListener("pointerup", up, true);
  document.addEventListener("pointercancel", up, true);
  document.addEventListener("pointermove", (e) => { if (!held) return; const r = held.getBoundingClientRect(); if (e.clientX < r.left - 8 || e.clientX > r.right + 8 || e.clientY < r.top - 8 || e.clientY > r.bottom + 8) { held.classList.remove("down"); held = null; } }, true);
}
