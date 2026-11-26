// OX 퀴즈 운동장: 파스텔 벽화 담장 + 모래 운동장 + 바닥에 크게 칠한 O / X, 그리고 거대한 인형(영희)
import { createFrame, painterFor, hex } from "../pixelfx/core/index.js";

const C = hex;
const h2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const WALL = 118; // 담장 아래 끝(여기부터 운동장)
export const O_ZONE = { x: 170, y: 252, r: 78 }, X_ZONE = { x: 470, y: 252, r: 78 };

export function buildQuizBg(W, H) {
  const f = createFrame(W, H), p = painterFor(f);
  // 벽화: 하늘 · 구름 · 언덕 · 나무
  p.rect(0, 0, W, WALL, C("#9fd4ee"));
  for (let y = 0; y < 40; y++) for (let x = 0; x < W; x++) if (h2(x >> 2, y >> 2) < 0.03 * (1 - y / 40)) p.rect(x, y, 1, 1, C("#b8e2f4"));
  const cloud = (cx, cy, s) => { for (const [dx, dy, r] of [[0, 0, 9], [10, -4, 11], [22, 0, 9], [11, 3, 9]]) p.circle(cx + dx * s, cy + dy * s, r * s, C("#ffffff")); };
  cloud(60, 26, 1); cloud(250, 18, 0.8); cloud(430, 30, 1.1); cloud(570, 16, 0.7);
  // 언덕
  for (let x = 0; x < W; x++) {
    const h1 = 70 + Math.sin(x / 70) * 10 + Math.sin(x / 23) * 4, h2v = 86 + Math.sin(x / 50 + 2) * 7;
    p.rect(x, h1, 1, WALL - h1, C("#8ccf6a")); p.rect(x, h2v, 1, WALL - h2v, C("#6fbf55"));
  }
  // 나무 몇 그루
  for (const tx of [40, 120, 520, 600, 210, 430]) {
    p.rect(tx - 2, 74, 4, 16, C("#8a5a33"));
    p.circle(tx, 66, 13, C("#4aa84a")); p.circle(tx - 6, 70, 9, C("#3f9a42")); p.circle(tx + 7, 69, 8, C("#58b858"));
  }
  // 담장 아래 띠
  p.rect(0, WALL - 6, W, 6, C("#e8c890")); p.rect(0, WALL - 1, W, 1, C("#b8925a"));
  // 운동장 모래
  for (let y = WALL; y < H; y++) for (let x = 0; x < W; x++) {
    const n = h2(x, y), base = y < WALL + 30 ? "#d6b47c" : "#dcbb84";
    p.rect(x, y, 1, 1, C(n < 0.06 ? "#c9a46c" : n > 0.97 ? "#ead0a0" : base));
  }
  // 바닥에 칠한 O / X
  p.ring(O_ZONE.x, O_ZONE.y, O_ZONE.r, 12, C("#2f6ad8"));
  p.ring(O_ZONE.x, O_ZONE.y, O_ZONE.r - 12, 2, C("#7aa8f0"));
  const X = X_ZONE, r = X.r * 0.82;
  for (let t = -r; t <= r; t += 0.5) for (let w = -7; w <= 7; w++) { p.rect(X.x + t + w * 0.7, X.y + t * 0.85 - w * 0.7, 1, 1, C("#d83a3a")); p.rect(X.x + t + w * 0.7, X.y - t * 0.85 + w * 0.7, 1, 1, C("#d83a3a")); }
  // 가운데 경계선
  for (let y = WALL + 8; y < H; y += 8) p.rect(W / 2 - 1, y, 2, 4, C("#f4ead4"));
  const bg = new Uint32Array(W * H), light = new Uint32Array(W * H);
  for (let i = 0; i < W * H; i++) { bg[i] = f.color[i]; light[i] = f.light[i]; }
  return { bg, light };
}

// 거대 인형: 단발 + 양갈래, 노란 블라우스, 주황 원피스, 흰 양말. front=true면 정면(눈이 빨갛게 빛날 수 있음)
export function drawDoll(p, cx, footY, front, eyes, t) {
  const HAIR = C("#16121c"), HAIR2 = C("#2a2430"), SKIN = C("#f6d6bc"), YEL = C("#f2c84b"), YEL2 = C("#d8a830"), ORG = C("#f08a3c"), ORG2 = C("#d06a24"), WHITE = C("#f6f2ea"), SHOE = C("#6a3a2a"), INK = C("#1c1624");
  const x = cx - 20, y = footY - 76;
  const R = (dx, dy, w, h, c) => p.rect(x + dx, y + dy, w, h, c);
  // 그림자
  for (let i = -18; i <= 18; i++) p.blendPx(cx + i, footY + 1, 0xff201810, 0.35);
  // 다리·신발
  R(13, 62, 5, 11, WHITE); R(22, 62, 5, 11, WHITE); R(12, 72, 7, 4, SHOE); R(21, 72, 7, 4, SHOE);
  // 원피스(멜빵 + 치마)
  R(8, 36, 24, 4, ORG); R(6, 40, 28, 22, ORG); R(6, 58, 28, 4, ORG2); R(30, 40, 4, 22, ORG2);
  // 블라우스(소매 + 칼라)
  R(9, 28, 22, 9, YEL); R(4, 29, 6, 12, YEL); R(30, 29, 6, 12, YEL); R(5, 39, 4, 3, SKIN); R(31, 39, 4, 3, SKIN);
  R(12, 36, 3, 6, ORG); R(25, 36, 3, 6, ORG); // 멜빵 끈
  R(13, 28, 14, 2, YEL2);
  // 머리
  R(8, 4, 24, 24, front ? SKIN : HAIR);
  if (front) {
    R(6, 2, 28, 8, HAIR); R(6, 8, 4, 16, HAIR); R(30, 8, 4, 16, HAIR); R(10, 9, 20, 2, HAIR); // 앞머리
    // 눈
    const ec = eyes ? C("#ff2a2a") : INK;
    R(13, 15, 3, 3, ec); R(24, 15, 3, 3, ec);
    if (eyes) { p.light(x + 14.5, y + 16.5, C("#ff3030"), 1.2); p.light(x + 25.5, y + 16.5, C("#ff3030"), 1.2); }
    R(12, 21, 3, 1, C("#f2a0a0")); R(25, 21, 3, 1, C("#f2a0a0"));
    R(18, 22, 4, 1, C("#c0645a"));
  } else {
    R(6, 2, 28, 24, HAIR); for (let i = 0; i < 6; i++) R(9 + i * 4, 6, 1, 18, HAIR2);
  }
  // 양갈래 묶음
  R(2, 12, 5, 9, HAIR); R(33, 12, 5, 9, HAIR); R(3, 11, 3, 2, ORG); R(34, 11, 3, 2, ORG);
  // 외곽 살짝
  p.rect(x + 6, y + 1, 28, 1, INK);
}
