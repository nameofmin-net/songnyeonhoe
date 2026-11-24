// 입장 폼(메인 팝업 · 모바일 서브페이지 공용) + 아바타 + 전송 채널
import { makePopulation, renderSprite, SW, SH } from "./characters.js";

export const MAX = 110;
export const ALL = makePopulation(MAX);
export const byId = (id) => ALL[id];
export const sortedByName = (ids) => [...ids].sort((a, b) => ALL[a].name.localeCompare(ALL[b].name, "ko"));

// ---------- 저장 (같은 브라우저) ----------
const KEY = "songnyeonhoe-attendees-v1";
export function loadAttendees() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function saveAttendees(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

// ---------- 전송 채널 ----------
// 지금은 같은 브라우저의 탭끼리(BroadcastChannel). 나중에 QR 모바일 입장은 이 두 함수만 서버(WebSocket 등)로 바꾸면 된다.
let ch = null;
try { ch = new BroadcastChannel("songnyeonhoe"); } catch {}
export function sendJoin(id, message) { ch?.postMessage({ type: "join", id, message }); }
export function onJoin(fn) { if (ch) ch.addEventListener("message", (e) => { if (e.data?.type === "join") fn(e.data.id, e.data.message); }); }

// ---------- 아바타 ----------
const avCache = new Map();
/** 캐릭터 정면 그림을 data URL로. head=true면 머리·어깨만. */
export function avatarURL(id, k = 3, head = false) {
  const key = `${id}|${k}|${head}`;
  if (avCache.has(key)) return avCache.get(key);
  const spr = renderSprite(ALL[id].style, 0, 0, false);
  const y0 = head ? 0 : 0, h = head ? 17 : SH;
  const c = document.createElement("canvas");
  c.width = SW * k; c.height = h * k;
  const g = c.getContext("2d");
  for (let y = 0; y < h; y++)
    for (let x = 0; x < SW; x++) {
      const v = spr[(y + y0) * SW + x];
      if (!v) continue;
      g.fillStyle = `rgb(${v & 255},${(v >>> 8) & 255},${(v >>> 16) & 255})`;
      g.fillRect(x * k, y * k, k, k);
    }
  const url = c.toDataURL();
  avCache.set(key, url);
  return url;
}

// ---------- 폼 ----------
const CSS = `
.jf { display: flex; flex-direction: column; gap: 14px; font-family: Galmuri11, "Apple SD Gothic Neo", sans-serif; color: #f4eefc; }
.jf-head { display: flex; align-items: center; gap: 14px; }
.jf-av { width: 72px; height: 112px; flex: none; display: grid; place-items: center; background: #1c1630; border: 2px solid #4a3f6a; image-rendering: pixelated; }
.jf-av img { width: 54px; height: 84px; image-rendering: pixelated; }
.jf-av .q { color: #6a5f8a; font-size: 28px; }
.jf-title { font-size: 18px; line-height: 1.4; }
.jf-title small { display: block; color: #9a90b0; font-size: 12px; margin-top: 4px; }
.jf label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #c9c0dc; }
.jf select, .jf textarea { font: inherit; font-size: 16px; color: #f4eefc; background: #15101f; border: 2px solid #4a3f6a; padding: 10px 12px; border-radius: 0; width: 100%; }
.jf select:focus, .jf textarea:focus { outline: none; border-color: #ffd84a; }
.jf textarea { resize: none; height: 72px; line-height: 1.5; }
.jf .cnt { align-self: flex-end; font-size: 11px; color: #7a7090; }
.jf button[type=submit] { font: inherit; font-size: 16px; padding: 12px; color: #1c1624; background: #ffd84a; border: 2px solid #fff3b0; box-shadow: 0 4px 0 #8a6a10; cursor: pointer; }
.jf button[type=submit]:disabled { background: #4a3f6a; border-color: #5a4f7a; color: #9a90b0; box-shadow: none; cursor: default; }
.jf .done { text-align: center; font-size: 14px; color: #ffd84a; min-height: 1.2em; }
`;
let cssOn = false;

/**
 * root 안에 입장 폼을 그린다.
 * waiting(): 아직 입장하지 않은 id 목록, onSubmit(id, message)
 */
export function mountJoinForm(root, { waiting, onSubmit, doneText = "입장 완료! 메인 화면을 확인하세요 🎉" }) {
  if (!cssOn) { const s = document.createElement("style"); s.textContent = CSS; document.head.append(s); cssOn = true; }
  root.innerHTML = `
    <form class="jf" autocomplete="off">
      <div class="jf-head">
        <div class="jf-av"><span class="q">?</span></div>
        <div class="jf-title">2026 송년회 입장<small>내 이름을 고르고 올해 한마디를 남겨 주세요</small></div>
      </div>
      <label>이름
        <select name="who" required></select>
      </label>
      <label>올해 한마디
        <textarea name="msg" maxlength="40" placeholder="예) 올해 다들 고생 많았어요!" required></textarea>
        <span class="cnt">0 / 40</span>
      </label>
      <button type="submit" disabled>입장하기 🎉</button>
      <div class="done"></div>
    </form>`;
  const f = root.querySelector("form"), sel = f.who, msg = f.msg, btn = f.querySelector("button"), av = f.querySelector(".jf-av"), cnt = f.querySelector(".cnt"), done = f.querySelector(".done");
  const check = () => { btn.disabled = !(sel.value !== "" && msg.value.trim().length > 0); cnt.textContent = `${msg.value.length} / 40`; };
  function refresh() {
    const keep = sel.value, ids = sortedByName(waiting());
    sel.innerHTML = `<option value="">이름을 선택하세요 (${ids.length}명 대기)</option>` +
      ids.map((id) => `<option value="${id}">${ALL[id].name}</option>`).join("");
    sel.value = ids.includes(+keep) && keep !== "" ? keep : "";
    showAv();
    check();
  }
  function showAv() {
    av.innerHTML = sel.value === "" ? `<span class="q">?</span>` : `<img alt="" src="${avatarURL(+sel.value, 3)}">`;
  }
  sel.addEventListener("change", () => { showAv(); check(); done.textContent = ""; });
  msg.addEventListener("input", check);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    onSubmit(+sel.value, msg.value.trim());
    msg.value = ""; done.textContent = doneText;
    refresh();
  });
  refresh();
  return { refresh, focus: () => sel.focus() };
}
