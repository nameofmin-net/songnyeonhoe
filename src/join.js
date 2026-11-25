// 모바일 입장 페이지: 이름 선택 + 올해 한마디 → 서버로 입장 신호 → 모든 광장 화면에 등장
import { ALL, sendJoin, mountJoinForm, connectLive } from "./joinform.js";

const arrived = new Set();
let ready = false;
const form = mountJoinForm(document.getElementById("join"), {
  waiting: () => ALL.map((d) => d.id).filter((id) => !arrived.has(id)),
  onSubmit: (id, message) => sendJoin(id, message),
});
const live = document.getElementById("live");
connectLive({
  state: (list) => { arrived.clear(); for (const a of list) arrived.add(a.id); ready = true; form.refresh(); },
  join: (e) => { arrived.add(e.id); form.refresh(); },
  status: (on) => { live.textContent = on ? "● 광장과 연결됨" : "○ 광장에 연결 중…"; live.className = on ? "on" : ""; },
});
