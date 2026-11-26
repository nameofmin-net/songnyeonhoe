// 유플리트 사옥 모드: 광장과 같은 배치(동선·충돌 그대로)를 사옥 로비 분위기로 다시 칠한다.
// 벽: 웜그레이 + 우드 슬랫 + 야경 통창, 가운데 유리 출입문 + UPLEAT 사인, 바닥: 오크 원목 + 트리 아래 러그
import { createFrame, painterFor, hex } from "../pixelfx/core/index.js";

const C = hex;
const h2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// 3x5 픽셀 글자
const GLYPH = {
  U: ["101", "101", "101", "101", "111"], P: ["111", "101", "111", "100", "100"], L: ["100", "100", "100", "100", "111"],
  E: ["111", "100", "111", "100", "111"], A: ["010", "101", "111", "101", "101"], T: ["111", "010", "010", "010", "010"],
};
function text(p, s, x, y, c, k = 1) {
  for (const ch of s) {
    const g = GLYPH[ch];
    if (g) g.forEach((row, j) => [...row].forEach((b, i) => { if (b === "1") p.rect(x + i * k, y + j * k, k, k, c); }));
    x += 4 * k;
  }
}

export function buildOfficeBg(W, H, CX, FY, FLOOR_TOP, lamps) {
  const f = createFrame(W, H), p = painterFor(f);
  // 벽: 웜그레이 + 세로 우드 슬랫
  p.rect(0, 0, W, FLOOR_TOP, C("#cfc6b8"));
  for (let x = 0; x < W; x += 4) p.rect(x, 0, 2, FLOOR_TOP - 4, C(x % 8 ? "#a8805a" : "#b48c64"));
  // 야경 통창(양옆으로 반복)
  for (let x = 14; x < W - 30; x += 62) {
    if (x > CX - 140 && x < CX + 40) continue;
    p.rect(x - 2, 4, 46, 30, C("#2b2a30"));
    p.rect(x, 6, 42, 26, C("#1b1f36"));
    for (let i = 0; i < 6; i++) { // 빌딩 실루엣 + 불 켜진 창
      const bx = x + i * 7, bh = 8 + Math.floor(h2(x + i, 3) * 14);
      p.rect(bx, 32 - bh, 6, bh, C("#2a2f4a"));
      for (let yy = 32 - bh + 2; yy < 31; yy += 3) for (let xx = bx + 1; xx < bx + 5; xx += 2) if (h2(xx, yy) < 0.45) p.rect(xx, yy, 1, 1, C("#ffd98a"));
    }
    p.rect(x + 20, 6, 2, 26, C("#2b2a30")); // 창틀
    p.rect(x, 6, 42, 1, C("#3a3f5e"));
  }
  // 가운데: 유리 출입문 + 위쪽 UPLEAT 사인
  p.rect(CX - 20, 4, 40, FLOOR_TOP - 4, C("#2b2a30"));
  p.rect(CX - 18, 12, 36, FLOOR_TOP - 12, C("#c8d6cc"));
  p.rect(CX - 1, 12, 2, FLOOR_TOP - 12, C("#2b2a30"));
  p.rect(CX - 6, 26, 1, 6, C("#e8e8e8")); p.rect(CX + 5, 26, 1, 6, C("#e8e8e8")); // 손잡이
  for (let i = 0; i < 5; i++) p.rect(CX - 16 + i * 7, 14 + i, 3, 1, C("#ffffff")); // 유리 반사
  // 벽면 UPLEAT 사인(도어 왼쪽, 전구줄 아래)
  const sx = CX - 84;
  p.rect(sx - 30, 13, 60, 18, C("#1c1624"));
  text(p, "UPLEAT", sx - 23, 17, C("#ffffff"), 2);
  p.glow(sx, 22, 30, C("#ffffff"), 0.2);
  p.glow(CX, 28, 32, C("#ffe2b0"), 0.28);
  // 걸레받이
  p.rect(0, FLOOR_TOP - 4, W, 4, C("#3a3230")); p.rect(0, FLOOR_TOP - 4, W, 1, C("#5a4c46"));
  // 바닥: 오크 원목(엇갈린 판재)
  for (let y = FLOOR_TOP; y < H; y++) for (let x = 0; x < W; x++) {
    const row = Math.floor((y - FLOOR_TOP) / 7), off = (row * 23) % 48, gx = (x + off) % 48, gy = (y - FLOOR_TOP) % 7;
    const plank = Math.floor((x + off) / 48) * 7 + row, tone = h2(plank, 1);
    let c = tone < 0.33 ? "#c49a6a" : tone < 0.66 ? "#b98e5e" : "#cfa676";
    if (gy === 6 || gx === 0) c = "#8a6440";
    else if (h2(x, y) < 0.05) c = "#a87e50";
    else if (gy === 0) c = "#d8b282";
    // 트리 아래 둥근 러그(버건디 + 금색 테)
    const dx = x - CX, dy = (y - FY) * 1.9, d = Math.hypot(dx, dy);
    if (d < 108) c = d > 101 ? "#d8a83a" : d > 97 ? "#6a1e2a" : (Math.floor(d / 6) % 2 ? "#7c2632" : "#842a36");
    f.color[y * W + x] = C(c);
  }
  // 아래 양 모서리: 화단 대신 원목 플랜터 + 초록
  for (const sx of [1, -1]) for (let y = H - 60; y < H; y++) for (let x = 0; x < 70; x++) {
    const px = sx > 0 ? x : W - 1 - x, k = x + (H - y) * 1.1;
    if (k > 92) continue;
    f.color[y * W + px] = C(k > 88 ? "#6a4a30" : k > 84 ? "#8a6440" : h2(px, y) < 0.15 ? "#5aa866" : (x + y) % 5 === 0 ? "#2f6a44" : "#3f8a55");
  }
  // 천장 펜던트 조명 느낌의 따뜻한 빛 웅덩이
  for (const [x, y] of lamps) p.glow(x, y - 30, 50, C("#ffd9a0"), 0.4);
  p.glow(CX, FY - 40, 120, C("#fff0d0"), 0.12);
  const bg = new Uint32Array(W * H), light = new Uint32Array(W * H);
  for (let i = 0; i < W * H; i++) { bg[i] = f.color[i]; light[i] = f.light[i]; }
  return { bg, light };
}

function spr(w, h, ox, oy, draw) {
  const f = createFrame(w, h), p = painterFor(f);
  p.place(ox, oy); draw(p);
  return { w, h, ox, oy, color: f.color, light: f.light };
}
// 가로등 → 아크 플로어 램프
export const officeLamp = spr(24, 46, 12, 45, (p) => {
  p.rect(-4, -2, 8, 2, C("#2b2a30"));
  p.rect(-1, -30, 2, 28, C("#3a3a40")); p.rect(-1, -30, 1, 28, C("#5a5a62"));
  for (let i = 0; i < 8; i++) p.rect(-1 + i, -31 - Math.round(Math.sin(i / 8 * Math.PI) * 6), 2, 2, C("#3a3a40"));
  p.rect(4, -36, 10, 4, C("#f4ead8")); p.rect(5, -32, 8, 1, C("#fff6da"));
});
// 벤치 → 패브릭 소파
export const officeSofa = spr(40, 18, 20, 16, (p) => {
  p.rect(-18, -15, 36, 8, C("#4a5568")); p.rect(-18, -15, 36, 1, C("#6a7588"));
  p.rect(-19, -8, 38, 6, C("#55607a")); p.rect(-19, -8, 38, 1, C("#7a86a0"));
  p.rect(-20, -12, 3, 10, C("#3f4a5c")); p.rect(17, -12, 3, 10, C("#3f4a5c"));
  p.rect(-10, -13, 8, 5, C("#e8b44a")); p.rect(3, -13, 8, 5, C("#d9d2c4")); // 쿠션
  p.rect(-17, -2, 2, 2, C("#2a2230")); p.rect(15, -2, 2, 2, C("#2a2230"));
});
// 작은 트리 → 큰 화분(몬스테라)
export const officePlant = spr(40, 58, 20, 56, (p) => {
  p.rect(-7, -12, 14, 12, C("#ece6dc")); p.rect(-8, -13, 16, 2, C("#ffffff")); p.rect(5, -12, 2, 12, C("#cfc6b8"));
  const L = [[-10, -24, 7], [8, -26, 7], [-4, -34, 8], [6, -40, 7], [-9, -42, 6], [1, -48, 6], [-2, -20, 6]];
  for (const [x, y, r] of L) { p.circle(x, y, r, C("#2f7a4a")); p.circle(x - 1, y - 1, r - 2, C("#3f9a5a")); p.rect(x, y - r + 2, 1, r * 2 - 3, C("#24603a")); }
  p.rect(-1, -30, 2, 18, C("#2a5a34"));
});
// 화분 → 카페 테이블 + 커피잔
export const officeTable = spr(20, 26, 10, 25, (p) => {
  p.rect(-1, -9, 2, 8, C("#3a3a40")); p.rect(-5, -2, 10, 2, C("#3a3a40"));
  p.rect(-8, -12, 16, 3, C("#f4efe6")); p.rect(-8, -10, 16, 1, C("#cfc6b8"));
  p.rect(-5, -16, 3, 4, C("#ffffff")); p.rect(-2, -15, 1, 2, C("#ffffff")); p.rect(-5, -16, 3, 1, C("#6a3a2a"));
  p.rect(2, -15, 4, 3, C("#e8b44a")); p.rect(2, -16, 4, 1, C("#5a3a2a"));
});
