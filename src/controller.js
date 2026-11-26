// 어드민 컨트롤러(최민우 폰): 시상 메뉴 만들기·수정·삭제, 광장 무대 재생(커튼 → 타이틀 → 수상자 → 축하)
import { ALL, adminKey, adminPost, avatarURL, sortedByName } from "./joinform.js";

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const STEPS_MERIT = [["타이틀", "커튼이 열리고 상 이름만"], ["수상자 공개", "프로젝트 이름과 수상자 등장"], ["축하", "꽃가루 · 팡파르 · 박수"]];
const STEPS_UPL = [["오프닝", "올해의 유플리더스"], ["상 소개", "상 이름 · 설명 · 상금"], ["발표", "후보 등장 → 조명 → 수상자"], ["축하", "꽃가루 · 팡파르"]];
export const stepsOf = (kind) => (kind === "upleaders" ? STEPS_UPL : STEPS_MERIT);
// 올해의 유플리더스 상 목록(상금 기본값). 설명은 행사 자료에 있는 루키만 미리 채움.
export const UPL_AWARDS = [
  ["rookie", "올해의 루키", "300,000원", "올해의 루키상은 올해 입사한 유플리더 중 업무에 대해 전문성을 갖춘 태도를 보여주며, 조직에 신선한 변화를 가져온 분께 수여됩니다."],
  ["uxer", "올해의 유엑서", "500,000원", ""],
  ["upleader", "올해의 유플리더", "1,000,000원", ""],
  ["creator", "올해의 크리에이터", "500,000원", ""],
  ["pioneer", "올해의 파이오니어", "500,000원", ""],
  ["facilitator", "올해의 퍼실리테이터", "500,000원", ""],
];

const CSS = `
.ctl { position: fixed; inset: 0; z-index: 20; background: #110d18; color: #f4eefc; font-family: Galmuri11, "Apple SD Gothic Neo", sans-serif; display: flex; flex-direction: column; }
.ctl[hidden] { display: none; }
.ctl-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #2a1830; border-bottom: 2px solid #5a3050; flex: none; }
.ctl-head b { flex: 1; font-size: 17px; color: #ffd84a; }
.ctl-head button { font: inherit; font-size: 13px; padding: 8px 12px; color: #f4eefc; background: #3a2448; border: 2px solid #5a3a6a; cursor: pointer; }
.ctl-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.ctl .big { font: inherit; font-size: 16px; padding: 14px; color: #1c1624; background: #ffd84a; border: 2px solid #fff3b0; box-shadow: 0 4px 0 #8a6a10; cursor: pointer; }
.ctl .big:disabled { background: #4a3f6a; border-color: #5a4f7a; color: #9a90b0; box-shadow: none; }
.ctl .ghost { font: inherit; font-size: 14px; padding: 11px; color: #f4eefc; background: #2a2140; border: 2px solid #4a3f6a; box-shadow: 0 3px 0 #0008; cursor: pointer; }
.ctl .red { background: #b8332f; border-color: #ff7a6a; color: #fff; box-shadow: 0 4px 0 #5a1010; }
.ctl .card { background: #1c1630; border: 2px solid #3a2f52; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.ctl .card h4 { margin: 0; font-size: 16px; font-weight: normal; color: #fff; }
.ctl .card h4 small { font-size: 11px; color: #9a90b0; margin-left: 6px; }
.ctl .card.base { border-color: #5a4a30; background: #221a28; }
.ctl .card.base.live { border-color: #5ae08a; }
.ctl .card.base b { color: #5ae08a; font-weight: normal; }
.ctl .card p { margin: 0; font-size: 12px; color: #9a90b0; line-height: 1.5; }
.ctl .card .row { display: flex; gap: 8px; }
.ctl .card .row button { flex: 1; }
.ctl .card .row .play { flex: 2; }
.ctl .empty { text-align: center; color: #7a7090; font-size: 13px; line-height: 1.7; padding: 30px 0; }
.ctl label.f { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #c9c0dc; }
.ctl label.f small { color: #7a7090; }
.ctl input[type=text], .ctl input[type=search] { font: inherit; font-size: 16px; color: #f4eefc; background: #15101f; border: 2px solid #4a3f6a; padding: 10px 12px; border-radius: 0; width: 100%; box-sizing: border-box; }
.ctl input:focus { outline: none; border-color: #ffd84a; }
.ctl .picked { display: flex; flex-wrap: wrap; gap: 6px; min-height: 30px; }
.ctl .picked button { font: inherit; font-size: 12px; padding: 5px 8px; color: #1c1624; background: #ffd84a; border: 0; cursor: pointer; }
.ctl .picked .none { font-size: 12px; color: #7a7090; padding: 6px 0; }
.ctl .plist { display: flex; flex-direction: column; border: 2px solid #3a2f52; max-height: 46vh; overflow-y: auto; }
.ctl .plist label { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-bottom: 1px solid #241c36; font-size: 14px; cursor: pointer; }
.ctl .plist label.on { background: #2e2546; }
.ctl .plist input { width: 20px; height: 20px; accent-color: #ffd84a; flex: none; }
.ctl .plist img { width: 27px; height: 25px; image-rendering: pixelated; flex: none; }
.ctl .plist .nm { flex: 1; } .ctl .plist .nm small { color: #9a90b0; margin-left: 4px; font-size: 11px; }
.ctl .plist .in { font-size: 11px; color: #5ae08a; }
.ctl .seg { display: flex; border: 2px solid #4a3f6a; }
.ctl .seg button { flex: 1; font: inherit; font-size: 13px; padding: 8px; background: #15101f; color: #9a90b0; border: 0; cursor: pointer; }
.ctl .seg button.on { background: #ffd84a; color: #1c1624; }
.ctl .msg { text-align: center; font-size: 13px; color: #ffd84a; min-height: 1.2em; }
/* 리모컨 */
.ctl .remote { background: linear-gradient(#3a1020, #1c1630); border: 2px solid #b8332f; padding: 16px 14px; display: flex; flex-direction: column; gap: 12px; }
.ctl .remote .now { font-size: 12px; color: #ff8ad8; letter-spacing: .1em; }
.ctl .remote h3 { margin: 0; font-size: 20px; color: #ffd84a; font-weight: normal; }
.ctl .steps { display: flex; gap: 6px; }
.ctl .steps div { flex: 1; padding: 8px 6px; border: 2px solid #4a3f6a; background: #15101f; font-size: 12px; color: #7a7090; text-align: center; line-height: 1.4; }
.ctl .steps div small { display: block; font-size: 10px; }
.ctl .steps div.done { color: #c9c0dc; border-color: #5a4f7a; }
.ctl .steps div.cur { color: #1c1624; background: #ffd84a; border-color: #fff3b0; }
.ctl .remote .next { font-size: 20px; padding: 20px; }
.ctl .remote .row { display: flex; gap: 8px; } .ctl .remote .row button { flex: 1; }
.ctl .ktabs { display: flex; border: 2px solid #4a3f6a; }
.ctl .ktabs button { flex: 1; font: inherit; font-size: 14px; padding: 11px 6px; background: #15101f; color: #9a90b0; border: 0; cursor: pointer; }
.ctl .ktabs button.on { background: #2f50d8; color: #fff; }
.ctl .ktabs button.on.m { background: #ffd84a; color: #1c1624; }
.ctl .awards { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.ctl .awards button { font: inherit; font-size: 13px; padding: 9px 6px; text-align: left; background: #15101f; color: #d8cfe8; border: 2px solid #3a2f52; cursor: pointer; line-height: 1.35; }
.ctl .awards button small { display: block; color: #9a90b0; font-size: 11px; }
.ctl .awards button.on { border-color: #ffd84a; background: #2a2140; color: #ffd84a; }
.ctl .prize { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.ctl .prize input[type=checkbox] { width: 22px; height: 22px; accent-color: #ffd84a; flex: none; }
.ctl .prize input[type=text] { flex: 1; }
.ctl .prize input[type=text]:disabled { opacity: .4; }
.ctl textarea { font: inherit; font-size: 15px; color: #f4eefc; background: #15101f; border: 2px solid #4a3f6a; padding: 10px 12px; border-radius: 0; width: 100%; box-sizing: border-box; resize: none; height: 76px; line-height: 1.5; }
.ctl .plist .roles { display: flex; gap: 6px; flex: none; }
.ctl .plist .roles button { font: inherit; font-size: 12px; padding: 5px 7px; background: #15101f; color: #9a90b0; border: 2px solid #3a2f52; cursor: pointer; }
.ctl .plist .roles button.win.on { background: #ffd84a; color: #1c1624; border-color: #fff3b0; }
.ctl .plist .roles button.riv.on { background: #2f50d8; color: #fff; border-color: #6a8aff; }
.ctl .tag { display: inline-block; font-size: 10px; padding: 2px 5px; margin-right: 4px; vertical-align: 2px; background: #3a2f52; color: #c9c0dc; }
.ctl .tag.u { background: #2f50d8; color: #fff; }
`;

export function mountController({ entries }) {
  if (!document.getElementById("ctl-css")) { const st = document.createElement("style"); st.id = "ctl-css"; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement("div");
  el.className = "ctl"; el.hidden = true;
  document.body.appendChild(el);
  let menus = [], show = null, mode = null, view = "list", draft = null, query = "", sortMode = "here", busy = false, msg = "";

  const call = async (path, body) => {
    try { return await adminPost(path, body); }
    catch (e) {
      if (e.message === "forbidden") { adminKey.set(""); msg = "관리자 코드가 맞지 않아요. 다시 열어 주세요."; el.hidden = true; alert(msg); }
      throw e;
    }
  };
  async function ensureKey() {
    if (adminKey.get()) return true;
    const k = (prompt("컨트롤러 관리자 코드를 입력하세요.") || "").trim();
    if (!k) return false;
    adminKey.set(k); return true;
  }
  async function open() {
    if (!(await ensureKey())) return;
    el.hidden = false; view = "list"; msg = "불러오는 중…"; render();
    try { const r = await call("/api/menus"); menus = r.menus; show = r.show; mode = r.mode; msg = ""; render(); } catch { /* 위에서 처리 */ }
  }
  const close = () => (el.hidden = true);

  function render() {
    if (el.hidden) return;
    if (view === "edit") return renderEdit();
    const m = show && menus.find((x) => x.sid === show.sid);
    el.innerHTML = `
      <div class="ctl-head"><b>🎮 컨트롤러</b><button data-a="close">닫기 ✕</button></div>
      <div class="ctl-body">
        ${show && m ? remoteHTML(m) : ""}
        <div class="card base ${mode === "ceremony" ? "live" : ""}">
          <h4>🎤 시상식 준비 모드 <small>기본 메뉴</small></h4>
          <p>트리가 사라지고 모두 광장 바닥에 줄 맞춰 앉아 단상을 봐요. 최근화 대표님은 단상으로 올라가요.${mode === "ceremony" ? "<br><b>● 지금 준비 모드 중</b>" : ""}</p>
          <div class="row">${mode === "ceremony" ? `<button class="big red" data-a="modeoff" ${busy ? "disabled" : ""}>■ 준비 모드 끝내기</button>` : `<button class="big" data-a="modeon" ${busy ? "disabled" : ""}>▶ 시작</button>`}</div>
        </div>
        <button class="big" data-a="new">＋ 새 메뉴 만들기</button>
        ${menus.length ? menus.map((x) => `
          <div class="card">
            <h4><span class="tag ${x.kind === "upleaders" ? "u" : ""}">${x.kind === "upleaders" ? "유플리더스" : "공로상"}</span>${esc(x.name)}</h4>
            <p>${x.kind === "upleaders"
              ? `수상자 ${x.winner >= 0 ? esc(ALL[x.winner]?.name) : "미정"} · 후보 ${(x.rivals || []).length}명${x.prizeOn && x.prize ? ` · 상금 ${esc(x.prize)}` : ""}`
              : `${esc(x.title)}${x.sub ? ` · ${esc(x.sub)}` : ""}${x.prizeOn && x.prize ? ` · 상금 ${esc(x.prize)}` : ""}<br>수상자 ${x.people.length}명${x.people.length ? ` — ${x.people.slice(0, 6).map((id) => esc(ALL[id]?.name)).join(", ")}${x.people.length > 6 ? " 외" : ""}` : ""}`}</p>
            <div class="row"><button class="big play" data-a="play" data-sid="${x.sid}" ${busy ? "disabled" : ""}>▶ 재생</button><button class="ghost" data-a="edit" data-sid="${x.sid}">수정</button><button class="ghost" data-a="del" data-sid="${x.sid}">삭제</button></div>
          </div>`).join("") : `<div class="empty">아직 메뉴가 없어요.<br>위의 '새 메뉴 만들기'로 첫 시상을 만들어 보세요.</div>`}
        <div class="msg">${esc(msg)}</div>
      </div>`;
  }
  function remoteHTML(m) {
    const st = show.step, STEPS = stepsOf(m.kind), last = STEPS.length - 1;
    return `<div class="remote">
      <div class="now">● 광장에서 재생 중</div>
      <h3>${esc(m.name)}</h3>
      <div class="steps">${STEPS.map(([t, d], i) => `<div class="${i < st ? "done" : i === st ? "cur" : ""}">${i + 1}. ${t}<small>${d}</small></div>`).join("")}</div>
      ${st < last ? `<button class="big next" data-a="next" ${busy ? "disabled" : ""}>다음 ▶ ${STEPS[st + 1][0]}</button>` : m.kind === "upleaders" ? "" : `<button class="big next" data-a="again" ${busy ? "disabled" : ""}>🎉 한 번 더 축하</button>`}
      <div class="row"><button class="ghost" data-a="prev" ${st === 0 || busy ? "disabled" : ""}>◀ 이전</button><button class="big red" data-a="stop" ${busy ? "disabled" : ""}>■ 끝내기 (커튼 닫기)</button></div>
    </div>`;
  }

  // 체크·검색·정렬은 목록 부분만 바꿔서 화면이 위로 튀지 않게 한다
  function listHTML() {
    const here = entries();
    let ids = ALL.map((d) => d.id);
    if (query) ids = ids.filter((id) => ALL[id].name.includes(query));
    ids = sortedByName(ids);
    if (sortMode === "here") ids = [...ids.filter((id) => here.has(id)), ...ids.filter((id) => !here.has(id))];
    if (draft.kind === "upleaders") {
      const rv = new Set(draft.rivals);
      return ids.map((id) => `<label class="${draft.winner === id || rv.has(id) ? "on" : ""}" data-row="${id}"><img src="${avatarURL(id, 2, true)}" alt=""><span class="nm">${esc(ALL[id].name)}${ALL[id].rank ? `<small>${ALL[id].rank}</small>` : ""}${here.has(id) ? ` <span class="in">입장</span>` : ""}</span><span class="roles"><button type="button" class="win ${draft.winner === id ? "on" : ""}" data-a="win" data-id="${id}">🏆 수상</button><button type="button" class="riv ${rv.has(id) ? "on" : ""}" data-a="riv" data-id="${id}">🙋 후보</button></span></label>`).join("") || `<div class="empty">'${esc(query)}' 이름이 없어요</div>`;
    }
    const pickedSet = new Set(draft.people);
    return ids.map((id) => `<label class="${pickedSet.has(id) ? "on" : ""}"><input type="checkbox" data-id="${id}" ${pickedSet.has(id) ? "checked" : ""}><img src="${avatarURL(id, 2, true)}" alt=""><span class="nm">${esc(ALL[id].name)}${ALL[id].rank ? `<small>${ALL[id].rank}</small>` : ""}</span>${here.has(id) ? `<span class="in">입장</span>` : ""}</label>`).join("") || `<div class="empty">'${esc(query)}' 이름이 없어요</div>`;
  }
  const pickedHTML = () => draft.kind === "upleaders"
    ? `<span class="none">🏆 ${draft.winner >= 0 ? esc(ALL[draft.winner].name) : "수상자 미정"} · 🙋 후보 ${draft.rivals.length}/7${draft.rivals.length ? " — " + draft.rivals.map((id) => esc(ALL[id].name)).join(", ") : ""}</span>`
    : (draft.people.length ? draft.people.map((id) => `<button data-a="unpick" data-id="${id}">${esc(ALL[id].name)} ✕</button>`).join("") : `<span class="none">아래에서 체크해 주세요</span>`);
  function refreshPicked() { el.querySelector(".picked").innerHTML = pickedHTML(); const c = el.querySelector(".pcnt"); if (c) c.textContent = draft.people.length; }
  function refreshList() { el.querySelector(".plist").innerHTML = listHTML(); }
  function renderEdit() {
    el.innerHTML = `
      <div class="ctl-head"><b>${draft.sid ? "메뉴 수정" : "새 메뉴"}</b><button data-a="back">취소</button></div>
      <div class="ctl-body">
        <div class="ktabs"><button data-a="kind" data-v="merit" class="m ${draft.kind !== "upleaders" ? "on" : ""}">🏅 프로젝트 공로상</button><button data-a="kind" data-v="upleaders" class="${draft.kind === "upleaders" ? "on" : ""}">🏆 올해의 유플리더스</button></div>
        ${draft.kind === "upleaders" ? uplFormHTML() : meritFormHTML()}
        <button class="big" data-a="save" ${busy ? "disabled" : ""}>저장</button>
        <div class="msg">${esc(msg)}</div>
      </div>`;
  }
  const prizeHTML = () => `<div class="f" style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#c9c0dc">상금 <small style="color:#7a7090">체크하면 무대에 상금이 나와요</small>
          <div class="prize"><input type="checkbox" data-f="prizeOn" ${draft.prizeOn ? "checked" : ""}><input type="text" data-f="prize" maxlength="24" value="${esc(draft.prize)}" placeholder="예) 300,000원" ${draft.prizeOn ? "" : "disabled"}></div></div>`;
  const peopleBox = (label) => `<div class="f" style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:#c9c0dc">${label}
          <input type="search" data-f="q" value="${esc(query)}" placeholder="이름 검색">
          <div class="seg"><button data-a="sort" data-v="here" class="${sortMode === "here" ? "on" : ""}">입장한 사람 먼저</button><button data-a="sort" data-v="abc" class="${sortMode === "abc" ? "on" : ""}">가나다순</button></div>
          <div class="plist">${listHTML()}</div>
          <div class="picked">${pickedHTML()}</div>
        </div>`;
  function uplFormHTML() {
    return `
        <div class="f" style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#c9c0dc">상 고르기 <small style="color:#7a7090">고르면 이름·상금이 채워져요(바꿔도 돼요)</small>
          <div class="awards">${UPL_AWARDS.map(([k, n, p]) => `<button data-a="award" data-v="${k}" class="${draft.award === k ? "on" : ""}">${n}<small>${p}</small></button>`).join("")}</div></div>
        <label class="f">상 이름 <small>무대에 크게 나와요</small><input type="text" data-f="title" maxlength="40" value="${esc(draft.title)}" placeholder="예) 올해의 루키"></label>
        <label class="f">메뉴명 <small>컨트롤러 목록에 보이는 이름</small><input type="text" data-f="name" maxlength="30" value="${esc(draft.name)}" placeholder="비우면 상 이름과 같게"></label>
        <label class="f">상 설명 <small>'상 소개' 단계에 나와요</small><textarea data-f="desc" maxlength="200" placeholder="예) 올해 입사한 유플리더 중…">${esc(draft.desc)}</textarea></label>
        ${prizeHTML()}
        <label class="f">수상 소감·인용구 <small>발표 때 수상자 아래에 나와요 (선택)</small><textarea data-f="quote" maxlength="160" placeholder="예) 세상을 보는 데는 두 가지 방법이 있습니다…">${esc(draft.quote)}</textarea></label>
        ${peopleBox("수상자 1명(🏆)과 같이 무대에 설 후보(🙋 최대 7명)")}`;
  }
  function meritFormHTML() {
    return `
        <label class="f">메뉴명 <small>컨트롤러 목록에 보이는 이름</small><input type="text" data-f="name" maxlength="30" value="${esc(draft.name)}" placeholder="예) 프로젝트 공로상"></label>
        <label class="f">타이틀 <small>커튼이 열리면 가장 먼저 크게 나와요</small><input type="text" data-f="title" maxlength="40" value="${esc(draft.title)}" placeholder="비우면 메뉴명과 같게"></label>
        <label class="f">서브 제목 <small>'다음'을 누르면 나와요 (프로젝트 이름)</small><input type="text" data-f="sub" maxlength="60" value="${esc(draft.sub)}" placeholder="예) KB손해보험 UX 전담반"></label>
        ${prizeHTML()}
        ${peopleBox(`수상자 선택 (<span class="pcnt">${draft.people.length}</span>명)`)}`;
  }

  // 입력값은 렌더 없이 draft에 반영(키보드가 닫히지 않게)
  el.addEventListener("input", (e) => {
    const f = e.target.dataset.f; if (!f || !draft) return;
    if (f === "q") { query = e.target.value.trim(); refreshList(); el.querySelector(".plist").scrollTop = 0; return; }
    if (f === "prizeOn") { draft.prizeOn = e.target.checked; const t = el.querySelector("[data-f=prize]"); t.disabled = !draft.prizeOn; if (draft.prizeOn) t.focus(); return; }
    draft[f] = e.target.value;
  });
  el.addEventListener("change", (e) => {
    if (e.target.dataset.f === "prizeOn") return;
    const id = e.target.dataset.id; if (id === undefined || e.target.type !== "checkbox") return;
    const n = +id;
    draft.people = e.target.checked ? [...draft.people, n] : draft.people.filter((x) => x !== n);
    e.target.closest("label")?.classList.toggle("on", e.target.checked);
    refreshPicked();
  });
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
    const a = b.dataset.a, sid = +b.dataset.sid;
    if (a === "close") return close();
    if (a === "new") { draft = { sid: 0, kind: "merit", name: "", title: "", sub: "", people: [], prizeOn: false, prize: "", award: "", desc: "", quote: "", winner: -1, rivals: [] }; query = ""; msg = ""; view = "edit"; return render(); }
    if (a === "edit") { const m = menus.find((x) => x.sid === sid); draft = { ...{ sid: 0, kind: "merit", name: "", title: "", sub: "", people: [], prizeOn: false, prize: "", award: "", desc: "", quote: "", winner: -1, rivals: [] }, ...m, people: [...m.people], rivals: [...(m.rivals || [])] }; query = ""; msg = ""; view = "edit"; return render(); }
    if (a === "back") { view = "list"; msg = ""; return render(); }
    if (a === "kind") { draft.kind = b.dataset.v; return renderEdit(); }
    if (a === "award") {
      const [k, n, p, d] = UPL_AWARDS.find((x) => x[0] === b.dataset.v);
      draft.award = k; draft.title = n; draft.name = n; draft.prize = p; draft.prizeOn = true; if (d && !draft.desc) draft.desc = d;
      const sc = el.querySelector(".ctl-body").scrollTop; renderEdit(); el.querySelector(".ctl-body").scrollTop = sc; return;
    }
    if (a === "win" || a === "riv") {
      e.preventDefault();
      const n = +b.dataset.id;
      if (a === "win") { draft.winner = draft.winner === n ? -1 : n; draft.rivals = draft.rivals.filter((x) => x !== n); }
      else if (draft.rivals.includes(n)) draft.rivals = draft.rivals.filter((x) => x !== n);
      else { if (draft.rivals.length >= 7) { alert("후보는 최대 7명까지예요."); return; } draft.rivals = [...draft.rivals, n]; if (draft.winner === n) draft.winner = -1; }
      const sc = el.querySelector(".plist").scrollTop; refreshList(); el.querySelector(".plist").scrollTop = sc; refreshPicked(); return;
    }
    if (a === "sort") { sortMode = b.dataset.v; el.querySelectorAll(".seg button").forEach((x) => x.classList.toggle("on", x.dataset.v === sortMode)); refreshList(); return; }
    if (a === "unpick") {
      const n = +b.dataset.id; draft.people = draft.people.filter((x) => x !== n);
      const cb = el.querySelector(`.plist input[data-id="${n}"]`); if (cb) { cb.checked = false; cb.closest("label").classList.remove("on"); }
      refreshPicked(); return;
    }
    if (a === "save") {
      if (draft.kind === "upleaders") {
        if (!draft.title.trim()) { msg = "상 이름을 적거나 위에서 상을 골라 주세요."; return renderEdit(); }
        if (draft.winner < 0) { msg = "🏆 수상자 1명을 골라 주세요."; return renderEdit(); }
        if (!draft.name.trim()) draft.name = draft.title;
      }
      if (!draft.name.trim()) { msg = "메뉴명을 적어 주세요."; return renderEdit(); }
      const body = { ...draft, title: draft.title.trim() || draft.name.trim() };
      if (draft.kind === "upleaders") body.people = [draft.winner];
      busy = true; msg = "저장 중…"; renderEdit();
      try { const r = await call("/api/menu/save", body); menus = r.menus; view = "list"; msg = "저장했어요 ✓"; } catch (err) { msg = err.message === "forbidden" ? "" : "저장에 실패했어요."; }
      busy = false; return render();
    }
    if (a === "del") {
      const m = menus.find((x) => x.sid === sid);
      if (!confirm(`'${m.name}' 메뉴를 삭제할까요?`)) return;
      try { const r = await call("/api/menu/delete", { sid }); menus = r.menus; msg = "삭제했어요"; } catch {}
      return render();
    }
    const go = async (body) => {
      busy = true; render();
      try { const r = await call("/api/show", body); show = r.show; msg = ""; } catch (err) { msg = err.message === "forbidden" ? "" : "광장에 보내지 못했어요."; }
      // 커튼 연출이 끝날 동안 잠깐 막는다(연타 방지)
      setTimeout(() => { busy = false; render(); }, 1200);
      render();
    };
    if (a === "play") { if (show && !confirm("지금 재생 중인 무대를 바꿀까요?")) return; return go({ sid, step: 0 }); }
    if (a === "next" && show) return go({ sid: show.sid, step: show.step + 1 });
    if (a === "again" && show) { await go({ sid: show.sid, step: 1 }); setTimeout(() => go({ sid: show.sid, step: 2 }), 1300); return; }
    if (a === "prev" && show) return go({ sid: show.sid, step: show.step - 1 });
    if (a === "stop") return go({ sid: 0, step: -1 });
    if (a === "modeon" || a === "modeoff") {
      busy = true; render();
      try { const r = await call("/api/mode", { mode: a === "modeon" ? "ceremony" : null }); mode = r.mode; msg = ""; } catch (err) { msg = err.message === "forbidden" ? "" : "광장에 보내지 못했어요."; }
      setTimeout(() => { busy = false; render(); }, 1200); render();
    }
  });

  return {
    open,
    /** 서버에서 무대 상태가 바뀌면(다른 기기 포함) 리모컨에 반영 */
    onShow(sh) { show = sh; if (!el.hidden && view === "list") render(); },
    onMode(m) { mode = m; if (!el.hidden && view === "list") render(); },
  };
}
