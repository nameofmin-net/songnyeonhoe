// 모바일 입장 페이지: 이름 선택 + 올해 한마디 → 메인 광장에 입장
import { ALL, loadAttendees, sendJoin, mountJoinForm, onJoin } from "./joinform.js";

const arrived = () => new Set(loadAttendees().map((a) => a.id));
const form = mountJoinForm(document.getElementById("join"), {
  waiting: () => { const a = arrived(); return ALL.map((d) => d.id).filter((id) => !a.has(id)); },
  onSubmit: (id, message) => sendJoin(id, message),
});
// 메인이 명단을 저장하면 목록 새로 고침
addEventListener("storage", () => form.refresh());
onJoin(() => setTimeout(() => form.refresh(), 300));
