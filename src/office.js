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
  const K = { x1: Math.round(W * 0.45), y0: Math.round(H * 0.69), bx0: Math.round(W * 0.06), bx1: Math.round(W * 0.33), by0: Math.round(H * 0.82) };
  const tree = { x: Math.round(W * 0.82), y: Math.round(H * 0.57) };
  // 못 들어가는 곳: 소파 두 조각, 라운지 테이블, 탕비실 전체
  const blocks = [[L.sx0, L.sy0 - 2, L.sx1, L.sy0 + 12], [L.sx1 - 12, L.sy0, L.sx1, L.sy1], [L.tx0 + 20, L.ty0 + 52, L.tx0 + 40, L.ty0 + 66], [0, K.y0 - 4, K.x1 + 2, H]];
  return { L, K, tree, blocks };
}
export function buildOfficeBg(W, H, CX, FY, FLOOR_TOP) {
  const { L, K } = officeLayout(W, H);
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
    if (x >= L.tx0 && x < L.tx1 && y >= L.ty0 && y < L.ty1) c = ((x >> 3) + (y >> 3)) % 2 ? "#1e4fd6" : "#2456dc";
    if ((x === L.tx0 || x === L.tx1 - 1 || y === L.ty0 || y === L.ty1 - 1) && x >= L.tx0 && x < L.tx1 && y >= L.ty0 && y < L.ty1) c = "#1a3fa8";
    f.color[y * W + x] = C(c);
  }
  // ㄱ자 소파(그레이 + 오렌지·레드 쿠션)
  const sofa = (x, y, w, h) => { p.rect(x, y, w, h, C("#8e8e94")); p.rect(x + 1, y + 1, w - 2, h - 3, C("#a8a8ae")); p.rect(x + 1, y + 1, w - 2, 1, C("#c4c4ca")); p.rect(x, y + h - 1, w, 1, C("#6a6a70")); };
  sofa(L.sx0, L.sy0, L.sx1 - L.sx0, 12);
  sofa(L.sx1 - 12, L.sy0, 12, L.sy1 - L.sy0);
  p.rect(L.sx0 + 8, L.sy0 + 3, 9, 6, C("#e0642a")); p.rect(L.sx0 + 22, L.sy0 + 3, 9, 6, C("#c8332f"));
  p.rect(L.sx1 - 10, L.sy0 + 30, 8, 9, C("#e0642a"));
  // 라운지 원형 테이블 + 블루 큐브
  p.circle(L.tx0 + 30, L.ty0 + 60, 9, C("#2a2a30")); p.circle(L.tx0 + 30, L.ty0 + 59, 8, C("#f4f4f2"));
  p.rect(L.tx0 + 10, L.ty1 - 26, 12, 11, C("#3a6ae8")); p.rect(L.tx0 + 10, L.ty1 - 16, 12, 1, C("#1a3fa8"));
  // 탕비실: 위쪽 벽+카운터, 오른쪽 파티션, 긴 원목 바 테이블 + 검은 스툴
  p.rect(0, K.y0, K.x1, 5, C("#2a2a30")); p.rect(0, K.y0 + 5, K.x1 - 20, 9, C("#f4f4f2")); p.rect(0, K.y0 + 13, K.x1 - 20, 1, C("#c8c8c4"));
  for (let x = 8; x < K.x1 - 30; x += 22) p.rect(x, K.y0 + 6, 8, 5, C(x % 44 ? "#1c1c22" : "#c8c8cc")); // 커피머신·전자레인지
  p.rect(K.x1 - 4, K.y0, 5, H - K.y0, C("#2a2a30")); p.rect(K.x1 - 3, K.y0, 1, H - K.y0, C("#5a5a62"));
  p.rect(K.bx0, K.by0, K.bx1 - K.bx0, 10, C("#d8a860")); p.rect(K.bx0, K.by0, K.bx1 - K.bx0, 2, C("#f0c880")); p.rect(K.bx0, K.by0 + 9, K.bx1 - K.bx0, 1, C("#8a6440"));
  for (let i = 0; i < 4; i++) { const sx = K.bx0 + 10 + i * Math.round((K.bx1 - K.bx0 - 20) / 3.2); for (const sy of [K.by0 - 9, K.by0 + 14]) { p.circle(sx, sy, 3.5, C("#1c1c22")); p.rect(sx - 1, sy - 2, 2, 1, C("#4a4a52")); } }
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
