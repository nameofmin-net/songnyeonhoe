// 모바일 입장 페이지: 한 기기 = 한 사람. 입장 후엔 내 캐릭터(복장·한마디) 화면.
import { mountEntry, connectLive } from "./joinform.js";

const entries = new Map(); // id -> { message, style, at }
const ui = mountEntry(document.getElementById("join"), { lock: true, entries: () => entries });
const live = document.getElementById("live");
connectLive({
  state: (list) => { entries.clear(); for (const a of list) entries.set(a.id, a); ui.sync(); },
  join: (e) => { entries.set(e.id, e); ui.sync(); },
  update: (e) => { entries.set(e.id, e); },
  chatlog: (items) => ui.chatlog(items),
  chat: (m) => ui.chat(m),
  status: (on) => { live.textContent = on ? "● 광장과 연결됨" : "○ 광장에 연결 중…"; live.className = on ? "on" : ""; },
});
