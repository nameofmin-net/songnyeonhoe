// 유플리트 사옥 모드: 광장과 같은 배치(동선·충돌 그대로)를 사옥 로비 분위기로 다시 칠한다.
// 벽: 웜그레이 + 우드 슬랫 + 야경 통창, 가운데 유리 출입문 + UPLEAT 사인, 바닥: 오크 원목 + 트리 아래 러그
import { createFrame, painterFor, hex } from "../pixelfx/core/index.js";

const C = hex;
const h2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// 3x5 픽셀 글자
const GLYPH = {
  U: ["101", "101", "101", "101", "111"], P: ["111", "101", "111", "100", "100"], L: ["100", "100", "100", "100", "111"],
  E: ["111", "100", "111", "100", "111"], A: ["010", "101", "111", "101", "101"], T: ["111", "010", "010", "010", "010"], W: ["101", "101", "101", "111", "101"], H: ["101", "101", "111", "101", "101"],
  R: ["110", "101", "110", "101", "101"], I: ["111", "010", "010", "010", "111"], N: ["101", "111", "111", "111", "101"], D: ["110", "101", "101", "101", "110"],
  B: ["110", "101", "110", "101", "110"], G: ["111", "100", "101", "101", "111"], S: ["111", "100", "111", "001", "111"], " ": ["000", "000", "000", "000", "000"],
};
function text(p, s, x, y, c, k = 1) {
  for (const ch of s) {
    const g = GLYPH[ch];
    if (g) g.forEach((row, j) => [...row].forEach((b, i) => { if (b === "1") p.rect(x + i * k, y + j * k, k, k, c); }));
    x += 4 * k;
  }
}

// 사옥 평면 배치(스케치 기준 비율)
export function officeLayout(W, H) {
  const L = { tx0: Math.round(W * 0.26), tx1: Math.round(W * 0.46), ty0: Math.round(H * 0.21), ty1: Math.round(H * 0.56) };
  L.sx0 = L.tx0 + 10; L.sx1 = L.tx1 - 4; L.sy0 = L.ty0 + 8; L.sy1 = L.ty0 + Math.round((L.ty1 - L.ty0) * 0.82);
  const K = { x1: Math.round(W * 0.45), y0: Math.round(H * 0.69), bx0: Math.round(W * 0.2), bx1: Math.round(W * 0.37), by0: Math.round(H * 0.81) };
  K.cw = K.x1 - 30; // 상판 끝(그 오른쪽 위가 출입구)
  const tree = { x: Math.round(W * 0.82), y: Math.round(H * 0.57) };
  // 못 들어가는 곳: 소파 두 조각, 라운지 테이블, 탕비실 전체
  const blocks = [[L.sx0, L.sy0 - 2, L.sx1, L.sy0 + 17], [L.sx1 - 17, L.sy0, L.sx1, L.sy1], [L.tx0 + 20, L.ty0 + 52, L.tx0 + 40, L.ty0 + 66],
    [0, K.y0 - 4, K.cw + 4, K.y0 + 32], [K.x1 - 6, K.y0, K.x1 + 2, H], [K.bx0 - 2, K.by0 - 2, K.bx1 + 2, K.by0 + 20], [0, H - 32, 18, H]];
  // 앉을 자리
  const seats = [];
  for (const dx of [10, 22, 34]) seats.push({ x: L.sx0 + dx, y: L.sy0 + 14, face: 0, kind: "sofa" });
  for (const dy of [30, 46]) seats.push({ x: L.sx1 - 9, y: L.sy0 + dy, face: 2, flip: true, kind: "sofa" });
  const tw = K.bx1 - K.bx0;
  for (let i = 0; i < 3; i++) { const sx = K.bx0 + 9 + Math.round(i * (tw - 18) / 2); seats.push({ x: sx, y: K.by0 - 5, face: 0, kind: "bar" }, { x: sx, y: K.by0 + 29, face: 1, kind: "bar" }); }
  seats.push({ x: 62, y: K.y0 + 38, face: 1, stand: true, kind: "coffee" }, { x: 32, y: K.y0 + 38, face: 1, stand: true, kind: "water" });
  // 오른쪽 아래 업무 테이블: 세로로 긴 대형 테이블 3개, 좌3·우3 마주 앉기
  const D = [], tw2 = 20, th2 = 64, rx0 = Math.round(W * 0.53), rx1 = W - 12, ty = Math.round(H * 0.7);
  const span = (rx1 - rx0) / 3;
  for (let i = 0; i < 3; i++) D.push({ x: Math.round(rx0 + span * (i + 0.5) - tw2 / 2), y: ty, w: tw2, h: th2 });
  for (const d of D) {
    blocks.push([d.x - 1, d.y - 2, d.x + d.w + 1, d.y + d.h + 1]);
    for (let k = 0; k < 3; k++) {
      const yy = d.y + 14 + k * 20;
      seats.push({ x: d.x - 8, y: yy, face: 2, flip: false, kind: "desk" }, { x: d.x + d.w + 8, y: yy, face: 2, flip: true, kind: "desk" });
    }
  }
  const doorIn = { x: Math.round((K.cw + K.x1) / 2), y: K.y0 + 14 }, doorOut = { x: Math.round((K.cw + K.x1) / 2), y: K.y0 - 12 };
  return { L, K, tree, blocks, seats, doorIn, doorOut, D };
}
export function buildOfficeBg(W, H, CX, FY, FLOOR_TOP) {
  const { L, K, D } = officeLayout(W, H);
  const f = createFrame(W, H), p = painterFor(f);
  const BLUE = C("#1e4fd6"), BLUE2 = C("#1a43b8"), INK = C("#1c1c22");
  // 벽: 흰 벽 + 천장 라인 조명
  p.rect(0, 0, W, FLOOR_TOP, C("#ecebe7"));
  p.rect(0, 0, W, 2, C("#ffffff"));
  // 왼쪽: 대형 LED 스크린(가을 공원)
  const lx = 8, lw = Math.min(110, Math.round(W * 0.22));
  p.rect(lx - 2, 3, lw + 4, 36, INK);
  for (let y = 0; y < 32; y++) for (let x = 0; x < lw; x++) {
    let c = y < 14 ? (y < 6 ? "#6aa8e8" : "#8cc0f0") : y < 24 ? (h2(x >> 1, y >> 1) < 0.5 ? "#c8742e" : h2(x, y) < 0.5 ? "#a85a22" : "#e0a040") : "#b0a070";
    if (y < 16 && x > 8 && x < 22 && y > 3 + ((x * 7) % 5)) c = "#b85a48"; // 건물
    if (y < 16 && x > 70 && x < 78 && y > 5 - (x % 3)) c = "#c86a50";
    f.color[(5 + y) * W + lx + x] = C(c);
  }
  p.glow(lx + lw / 2, 20, 50, C("#ffe0b0"), 0.25);
  // 유리 파티션(검은 프레임) — 스크린 오른쪽부터 끝까지
  const gx0 = lx + lw + 8;
  p.rect(gx0, 4, W - gx0, FLOOR_TOP - 8, C("#dfe6e6"));
  for (let x = gx0; x < W; x++) if (h2(x, 2) < 0.3) p.rect(x, 6, 1, FLOOR_TOP - 12, C("#e8eeee"));
  for (let x = gx0; x < W; x += 34) p.rect(x, 4, 2, FLOOR_TOP - 8, INK);
  p.rect(gx0, 4, W - gx0, 1, INK);
  // 파티션 너머 사무실(모니터·의자 실루엣)
  for (let x = gx0 + 6; x < W - 10; x += 22) { if (Math.abs(x - CX) < 30) continue; p.rect(x, 22, 8, 5, C("#3a3f4a")); p.rect(x + 1, 23, 6, 3, C("#7ab0e0")); p.rect(x - 2, 28, 14, 2, C("#f4f4f2")); p.rect(x + 2, 30, 5, 5, C("#c8c8c8")); }
  // 오른쪽 유리에 세로 스트라이프 시트 + "WHERE THE WIND BEGINS"
  const sx0 = W - 96;
  for (let x = sx0; x < W - 4; x += 4) p.rect(x, 5, 2, FLOOR_TOP - 10, C("#ffffff"));
  p.rect(W - 44, 12, 40, 24, C("#f6f8f8"));
  text(p, "WHERE", W - 26, 14, INK); text(p, "THE WIND", W - 38, 21, INK); text(p, "BEGINS", W - 30, 28, INK);
  // 가운데 출입문(유리 양문)
  p.rect(CX - 18, 8, 36, FLOOR_TOP - 8, C("#cfdada"));
  p.rect(CX - 18, 8, 36, 1, INK); p.rect(CX - 18, 8, 1, FLOOR_TOP - 8, INK); p.rect(CX + 17, 8, 1, FLOOR_TOP - 8, INK); p.rect(CX, 8, 1, FLOOR_TOP - 8, INK);
  p.rect(CX - 4, 22, 1, 7, INK); p.rect(CX + 3, 22, 1, 7, INK);
  // 흰 기둥 + 파란 U 로고 (문 왼쪽)
  const ux = CX - 62;
  p.rect(ux - 12, 0, 24, FLOOR_TOP - 2, C("#f8f8f6")); p.rect(ux + 10, 0, 2, FLOOR_TOP - 2, C("#d8d8d4"));
  p.rect(ux - 5, 8, 3, 12, BLUE); p.rect(ux + 2, 8, 3, 12, BLUE); p.rect(ux - 5, 18, 10, 3, BLUE); p.rect(ux - 6, 8, 5, 1, BLUE); p.rect(ux + 1, 8, 5, 1, BLUE);
  text(p, "UPLEAT", ux - 11, 25, BLUE);
  // 걸레받이
  p.rect(0, FLOOR_TOP - 4, W, 4, C("#c8c6c0")); p.rect(0, FLOOR_TOP - 4, W, 1, C("#ffffff"));
  // 바닥: 밝은 폴리싱 콘크리트 + 트리 아래 코발트 블루 러그
  for (let y = FLOOR_TOP; y < H; y++) for (let x = 0; x < W; x++) {
    const n = h2(x >> 2, y >> 2), m = h2(x, y);
    let c = n < 0.25 ? "#d2d1cc" : n < 0.7 ? "#d9d8d3" : "#dfded9";
    if (m < 0.04) c = "#c6c4be"; else if (m > 0.985) c = "#ecebe7";
    if ((y - FLOOR_TOP) % 60 === 59 || x % 80 === 0) c = "#cbc9c3"; // 줄눈
    // 파란 타일 라운지(ㄱ자 소파 자리)
    if (x >= L.tx0 && x < L.tx1 && y >= L.ty0 && y < L.ty1) c = h2(x, y) < 0.12 ? "#2a5ae0" : h2(x >> 1, y) < 0.2 ? "#1a46c4" : "#1e4fd6";
    if ((x === L.tx0 || x === L.tx1 - 1 || y === L.ty0 || y === L.ty1 - 1) && x >= L.tx0 && x < L.tx1 && y >= L.ty0 && y < L.ty1) c = "#1a3fa8";
    f.color[y * W + x] = C(c);
  }
  // ㄱ자 소파: 라이트 그레이 펠트 + 크롬 다리, 쿠션(네이비·핑크·오렌지)
  const GR = C("#b9bcbc"), GR2 = C("#a4a8a8"), GRL = C("#d2d5d4"), GRD = C("#8a8e8e"), CHROME = C("#e8eaee");
  const sofa = (x, y, w, h, backTop) => {
    p.rect(x, y, w, h, GR); p.rect(x, y, w, 1, GRL); p.rect(x, y + h - 1, w, 1, GRD);
    if (backTop) { p.rect(x, y, w, 4, GR2); p.rect(x, y, w, 1, GRL); } else { p.rect(x + w - 4, y, 4, h, GR2); p.rect(x + w - 1, y, 1, h, GRD); }
    for (const [lx, ly] of [[x + 1, y + h], [x + w - 2, y + h]]) p.rect(lx, ly, 1, 2, CHROME);
  };
  sofa(L.sx0, L.sy0, L.sx1 - L.sx0 - 16, 17, true);
  sofa(L.sx1 - 17, L.sy0, 17, L.sy1 - L.sy0, false);
  const cush = (x, y, w, h, c, hl) => { p.rect(x, y, w, h, C(c)); p.rect(x, y, w, 1, C(hl)); p.rect(x + w - 1, y + 1, 1, h - 1, C("#00000022")); };
  cush(L.sx0 + 3, L.sy0 + 5, 9, 8, "#25356a", "#3a4c88");
  cush(L.sx0 + 15, L.sy0 + 5, 9, 8, "#e8c8c8", "#f8e0e0");
  cush(L.sx0 + 28, L.sy0 + 5, 10, 8, "#c86a2a", "#e08a44");
  cush(L.sx1 - 14, L.sy0 + 24, 8, 10, "#2a4aa0", "#4060c0");
  cush(L.sx1 - 14, L.sy0 + 40, 8, 9, "#3a8aa0", "#5aaac0");
  // 라운지 원형 테이블(다크 그레이) + 화이트 사이드 테이블 + 큐브(틸·네이비)
  p.circle(L.tx0 + 28, L.ty0 + 58, 9, C("#3a3c40")); p.circle(L.tx0 + 27, L.ty0 + 57, 7, C("#55585e"));
  p.circle(L.sx1 - 4, L.sy0 - 4, 5, C("#f4f4f2"));
  const cube = (x, y, c, hl, sh) => { p.rect(x, y, 11, 10, C(c)); p.rect(x, y, 11, 2, C(hl)); p.rect(x + 10, y + 2, 1, 8, C(sh)); };
  cube(L.tx0 + 6, L.ty1 - 24, "#3a8aa8", "#5aaac8", "#2a6a88");
  cube(L.tx0 + 18, L.ty1 - 20, "#2a3e8a", "#4058a8", "#1c2c6a");
  // 탕비실 ─ 상부 블랙 수납장 + 화이트 서브웨이 타일 + 화이트 상판
  const y0 = K.y0, cw = K.cw;
  // 상부장(블랙) 8px · 서브웨이 타일 10px · 상판 12px  → 탕비실 깊이 30px
  p.rect(0, y0, cw, 8, C("#1c1c22")); for (let x = 0; x < cw; x += 20) p.rect(x, y0, 1, 8, C("#3a3a42")); p.rect(0, y0 + 7, cw, 1, C("#0e0e12"));
  p.rect(cw, y0, 4, 32, C("#1c1c22")); // 출입구 왼쪽 기둥
  p.rect(0, y0 + 8, cw, 10, C("#f4f2ec"));
  for (let yy = 0; yy < 10; yy += 3) { p.rect(0, y0 + 8 + yy, cw, 1, C("#dcd9d2")); for (let x = (yy / 3) % 2 ? 0 : 3; x < cw; x += 6) p.rect(x, y0 + 8 + yy, 1, 3, C("#dcd9d2")); }
  p.rect(0, y0 + 18, cw, 12, C("#fdfdfb")); p.rect(0, y0 + 18, cw, 1, C("#ffffff")); p.rect(0, y0 + 29, cw, 1, C("#bcbab4"));
  // 양문형 냉장고(실버, 크게)
  const fx0 = 2, fw = 22;
  p.rect(fx0, y0 + 2, fw, 28, C("#aeb3ba")); p.rect(fx0, y0 + 2, fw, 1, C("#e4e8ee")); p.rect(fx0, y0 + 29, fw, 1, C("#7a7e84"));
  p.rect(fx0 + fw / 2 - 1, y0 + 3, 1, 26, C("#7a7e84"));
  p.rect(fx0 + fw / 2 - 3, y0 + 9, 1, 10, C("#eef0f4")); p.rect(fx0 + fw / 2 + 1, y0 + 9, 1, 10, C("#eef0f4"));
  p.rect(fx0 + 2, y0 + 10, 6, 6, C("#c8ccd2")); p.rect(fx0 + 3, y0 + 13, 4, 1, C("#8a8e94")); // 디스펜서
  // 정수기(화이트)
  p.rect(28, y0 + 8, 9, 21, C("#f8f8f8")); p.rect(28, y0 + 8, 9, 1, C("#ffffff")); p.rect(36, y0 + 9, 1, 20, C("#d0d0d0"));
  p.rect(30, y0 + 16, 5, 4, C("#2a2a30")); p.rect(31, y0 + 11, 3, 1, C("#5ab4ff"));
  // 커피머신(블랙) + 잔
  const cx0 = 56;
  p.rect(cx0, y0 + 10, 11, 14, C("#1c1c22")); p.rect(cx0, y0 + 10, 11, 1, C("#4a4a52")); p.rect(cx0 + 2, y0 + 13, 7, 3, C("#3a3a42")); p.rect(cx0 + 3, y0 + 14, 2, 1, C("#5ae08a"));
  p.rect(cx0 + 4, y0 + 18, 3, 1, C("#8a8a92")); p.rect(cx0 + 3, y0 + 20, 5, 4, C("#ffffff")); p.rect(cx0 + 8, y0 + 21, 1, 2, C("#ffffff"));
  // 전자레인지(크림)
  const mx0 = 70;
  p.rect(mx0, y0 + 12, 20, 13, C("#f2ece0")); p.rect(mx0, y0 + 12, 20, 1, C("#fff8ec")); p.rect(mx0, y0 + 24, 20, 1, C("#c8c0b0"));
  p.rect(mx0 + 2, y0 + 14, 11, 9, C("#3a3a40")); p.rect(mx0 + 3, y0 + 15, 4, 2, C("#6a6a72"));
  p.circle(mx0 + 16, y0 + 17, 2, C("#3a3a40")); p.rect(mx0 + 15, y0 + 21, 3, 1, C("#3a3a40"));
  // 컵 · 싱크 수전
  for (let i = 0; i < 3; i++) p.rect(42 + i * 4, y0 + 20, 3, 5, C("#ffffff"));
  p.rect(98, y0 + 15, 1, 7, C("#1c1c22")); p.rect(98, y0 + 15, 4, 1, C("#1c1c22")); p.rect(94, y0 + 23, 14, 4, C("#d8dce0"));
  // 오른쪽 유리 파티션(블랙 프레임) — 아래쪽은 출입구로 비움
  p.rect(K.x1 - 5, y0, 5, H - y0, C("#1c1c22")); p.rect(K.x1 - 4, y0 + 2, 3, H - y0 - 2, C("#d8e4e8")); p.rect(K.x1 - 3, y0 + 2, 1, H - y0, C("#ffffff"));
  p.rect(cw + 4, y0, K.x1 - 5 - cw - 4, 2, C("#9a9a9e")); // 출입구 문턱
  // 큰 관엽 화분(왼쪽 창가)
  p.circle(8, H - 16, 7, C("#5a5c60")); p.circle(8, H - 16, 5, C("#3a2a20"));
  for (const [dx, dy, r] of [[-2, -6, 5], [5, -9, 5], [0, -14, 5], [7, -2, 4], [-4, 0, 4], [3, -18, 4]]) { p.circle(8 + dx, H - 20 + dy, r, C("#3f8a3a")); p.circle(7 + dx, H - 21 + dy, r - 2, C("#6ab84a")); }
  // 버처블록 원목 바 테이블 + 블랙 스툴
  const tw = K.bx1 - K.bx0;
  p.rect(K.bx0, K.by0, tw, 18, C("#dcae6a"));
  for (let x = K.bx0; x < K.bx1; x++) for (let yy = 1; yy < 17; yy++) if (h2(x >> 1, (K.by0 + yy) >> 1 ^ (x >> 4)) < 0.35) p.rect(x, K.by0 + yy, 1, 1, C(h2(x >> 3, yy) < 0.5 ? "#c89452" : "#e8bc7a"));
  for (let yy = 2; yy < 17; yy += 3) p.rect(K.bx0, K.by0 + yy, tw, 1, C("#c89452"));
  p.rect(K.bx0, K.by0, tw, 1, C("#f4cc8a")); p.rect(K.bx0, K.by0 + 17, tw, 1, C("#8a6440"));
  p.rect(K.bx0 + 2, K.by0 + 18, 2, 2, C("#1c1c22")); p.rect(K.bx1 - 4, K.by0 + 18, 2, 2, C("#1c1c22"));
  p.rect(K.bx0 + tw / 2 - 5, K.by0 + 6, 6, 4, C("#8aa8e0")); p.rect(K.bx0 + tw / 2 - 4, K.by0 + 5, 4, 1, C("#ffffff")); // 티슈
  const stool = (sx, sy) => { p.circle(sx, sy, 4, C("#1c1c22")); p.circle(sx - 1, sy - 1, 2, C("#3a3a42")); p.rect(sx - 3, sy + 4, 1, 2, C("#1c1c22")); p.rect(sx + 3, sy + 4, 1, 2, C("#1c1c22")); };
  for (let i = 0; i < 3; i++) { const sx = K.bx0 + 9 + Math.round(i * (tw - 18) / 2); stool(sx, K.by0 - 8); stool(sx, K.by0 + 26); }
  // 트랙 조명 빛
  for (let x = 20; x < cw; x += 34) p.glow(x, y0 + 30, 16, C("#fff2d8"), 0.06);
  // 업무 테이블(세로형): 화이트 상판 + 가운데 칸막이 + 양쪽 모니터·키보드 + 화이트 의자
  for (const d of D) {
    const mid = d.x + d.w / 2;
    p.rect(d.x, d.y, d.w, d.h, C("#fafaf8")); p.rect(d.x, d.y, d.w, 1, C("#ffffff")); p.rect(d.x, d.y + d.h - 1, d.w, 1, C("#c4c2bc")); p.rect(d.x + d.w - 1, d.y, 1, d.h, C("#d8d6d0"));
    p.rect(mid - 1, d.y + 1, 2, d.h - 2, C("#b8bcc2"));
    for (let k = 0; k < 3; k++) {
      const yy = d.y + 4 + k * 20;
      p.rect(mid - 5, yy, 3, 10, C("#1c1c22")); p.rect(mid - 5, yy + 1, 1, 8, C("#4a7fd4")); // 왼쪽 사람 모니터
      p.rect(mid + 2, yy, 3, 10, C("#1c1c22")); p.rect(mid + 4, yy + 1, 1, 8, C("#4a7fd4")); // 오른쪽 사람 모니터
      p.rect(d.x + 1, yy + 3, 2, 5, C("#e2e2e4")); p.rect(d.x + d.w - 3, yy + 3, 2, 5, C("#e2e2e4")); // 키보드
      if (k === 1) { p.rect(d.x + 3, yy + 10, 2, 2, C("#ffffff")); p.rect(d.x + d.w - 5, yy - 2, 2, 2, C("#e8b44a")); } // 머그
      for (const [cx, side] of [[d.x - 7, -1], [d.x + d.w + 6, 1]]) {
        p.rect(cx - 3, yy + 2, 7, 8, C("#e4e4e6")); p.rect(side < 0 ? cx - 4 : cx + 3, yy + 1, 2, 10, C("#c8c8cc"));
      }
    }
    p.glow(mid, d.y + d.h / 2, 26, C("#cfe0ff"), 0.06);
  }
  // 펜던트 조명 빛
  p.glow((L.tx0 + L.tx1) / 2, (L.ty0 + L.ty1) / 2, 70, C("#ffffff"), 0.12);
  p.glow((K.bx0 + K.bx1) / 2, K.by0, 60, C("#fff2d8"), 0.18);
  const bg = new Uint32Array(W * H), light = new Uint32Array(W * H);
  for (let i = 0; i < W * H; i++) { bg[i] = f.color[i]; light[i] = f.light[i]; }
  return { bg, light };
}

function spr(w, h, ox, oy, draw) {
  const f = createFrame(w, h), p = painterFor(f);
  p.place(ox, oy); draw(p);
  return { w, h, ox, oy, color: f.color, light: f.light };
}
// 가로등 → 흰 돔 펜던트 스탠드
export const officeLamp = spr(24, 46, 12, 45, (p) => {
  p.rect(-4, -2, 8, 2, C("#1c1c22"));
  p.rect(0, -34, 1, 32, C("#1c1c22"));
  p.rect(-6, -38, 13, 3, C("#f4f4f2")); p.rect(-4, -40, 9, 2, C("#ffffff")); p.rect(-6, -35, 13, 1, C("#c8c8c4"));
  p.rect(-2, -34, 5, 1, C("#fff6da"));
});
// 벤치 → 그레이 모듈 소파 + 오렌지 쿠션
export const officeSofa = spr(40, 18, 20, 16, (p) => {
  p.rect(-18, -15, 36, 8, C("#9a9a9e")); p.rect(-18, -15, 36, 1, C("#b8b8bc"));
  p.rect(-19, -8, 38, 6, C("#a8a8ac")); p.rect(-19, -8, 38, 1, C("#c8c8cc"));
  p.rect(-20, -13, 3, 11, C("#8a8a8e")); p.rect(17, -13, 3, 11, C("#8a8a8e"));
  p.rect(-12, -13, 8, 6, C("#e0642a")); p.rect(-12, -13, 8, 1, C("#f08a4a"));
  p.rect(4, -13, 8, 6, C("#c8332f")); p.rect(4, -13, 8, 1, C("#e0504a"));
  p.rect(-17, -2, 1, 2, C("#c8c8cc")); p.rect(16, -2, 1, 2, C("#c8c8cc"));
});
// 작은 트리 → 큰 관엽 화분(검은 화분)
export const officePlant = spr(40, 58, 20, 56, (p) => {
  p.rect(-7, -12, 14, 12, C("#2a2a30")); p.rect(-8, -13, 16, 2, C("#3a3a42"));
  p.rect(-1, -36, 2, 24, C("#6a4a30"));
  const L = [[-9, -26, 6], [8, -28, 6], [-5, -36, 7], [6, -42, 6], [-10, -42, 5], [1, -50, 6], [-2, -22, 5], [10, -36, 5]];
  for (const [x, y, r] of L) { p.circle(x, y, r, C("#3f8a3a")); p.circle(x - 1, y - 1, r - 2, C("#5aaa4a")); }
});
// 화분 → 코발트 블루 큐브 오토만
export const officeTable = spr(20, 26, 10, 25, (p) => {
  p.rect(-6, -10, 12, 10, C("#1e4fd6")); p.rect(-6, -10, 12, 2, C("#3a6ae8")); p.rect(4, -8, 2, 8, C("#1a3fa8"));
});
