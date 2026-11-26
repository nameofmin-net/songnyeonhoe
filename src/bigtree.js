// 광장 중앙의 대형 크리스마스 트리 + 12시 방향 단상
import { createFrame, painterFor, hex, sparkle, mix } from "../pixelfx/core/index.js";

const C = hex;
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 대형 트리 ----------
// 로컬 좌표: 바닥 중심이 (0, 0), 위로 음수. 폭 약 96, 높이 약 128.
const TW = 124, TH = 140, TOX = 62, TOY = 136;
const K = 0.82; // 트리 크기 배율
const TIERS = [ // [윗변 y, 아랫변 y, 아랫변 반폭]
  [-118, -96, 18],
  [-104, -78, 28],
  [-88, -58, 37],
  [-70, -38, 46],
  [-52, -16, 54],
].map(([a, b, w], i, all) => i === all.length - 1 ? [Math.round(a * K), b, Math.round(w * K)] : [Math.round(a * K), Math.round(b * K), Math.round(w * K)]);
const STAR_Y = Math.round(-122 * K);

function inTree(x, y) {
  for (const [y0, y1, hw] of TIERS) {
    if (y < y0 || y > y1) continue;
    const u = (y - y0) / (y1 - y0);
    // 아래쪽 가장자리를 톱니처럼 처지게
    const sag = y > y1 - 3 ? (Math.abs(((x % 8) + 8) % 8 - 4) > 2 ? 1 : 0) : 0;
    if (Math.abs(x) <= hw * (0.12 + 0.88 * u) - sag) return { u, hw, y0, y1 };
  }
  return null;
}

function buildTree() {
  const f = createFrame(TW, TH), p = painterFor(f);
  p.place(TOX, TOY);
  const G = ["#0f2a22", "#163a2c", "#1f4f38", "#2b6a45", "#3f8a55", "#5aa866"].map(C);
  const snow = C("#e6eefc"), snowS = C("#b8c6e0");
  // 트리 받침(나무 상자) + 기둥
  p.rect(-6, -16, 12, 10, C("#4a2e20")); p.rect(-6, -16, 3, 10, C("#6a4430"));
  p.rect(-16, -8, 32, 8, C("#8a2e2e")); p.rect(-16, -8, 32, 2, C("#b8443e")); p.rect(10, -8, 6, 8, C("#6a2222"));
  p.rect(-16, -5, 32, 1, C("#e8c060"));
  // 잎: 빛은 왼쪽 위에서
  for (let y = -120; y <= -14; y++)
    for (let x = -56; x <= 56; x++) {
      const t = inTree(x, y);
      if (!t) continue;
      const edge = Math.abs(x) / (t.hw * (0.12 + 0.88 * t.u) + 0.01);
      let k = 3 - (x > 0 ? edge * 2.2 : -edge * 1.2) - (t.u > 0.8 ? 1 : 0);
      { const hh = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; if (hh - Math.floor(hh) < 0.12) k -= 1; } // 바늘잎 결
      k = Math.max(0, Math.min(5, Math.round(k)));
      p.px(x, y, G[k]);
    }
  // 각 층 위에 쌓인 눈
  for (const [y0, y1, hw] of TIERS) {
    for (let x = -hw; x <= hw; x++) {
      const yy = y1 - 2 + (Math.abs(x) % 5 === 0 ? 1 : 0);
      if (!inTree(x, yy)) continue;
      if (x < -hw * 0.75 || (x * 7) % 11 === 0) p.px(x, yy, x < 0 ? snow : snowS);
    }
  }
  // 금색 반짝이 줄(사선)
  const gold = C("#f2c84b"), goldD = C("#b8862a");
  for (let i = 0; i < 4; i++) {
    const yA = Math.round((-98 + i * 22) * K);
    for (let x = -54; x <= 54; x++) {
      const y = Math.round(yA + x * 0.28 + Math.sin(x * 0.25) * 1.5);
      if (inTree(x, y) && inTree(x, y + 1)) p.px(x, y, x < 0 ? gold : goldD);
    }
  }
  // 오너먼트(고정 장식 공)
  const r = mulberry(7), ORN = ["#d94f4f", "#4a7fd4", "#f2c84b", "#e27fb4", "#c7c9d6"].map(C);
  const balls = [];
  for (let n = 0; n < 400 && balls.length < 22; n++) {
    const x = Math.round((r() - 0.5) * 90 * K), y = Math.round((-108 + r() * 90) * K);
    if (!inTree(x, y) || !inTree(x - 2, y + 2) || !inTree(x + 2, y + 2)) continue;
    if (balls.some((b) => Math.abs(b[0] - x) + Math.abs(b[1] - y) < 9)) continue;
    balls.push([x, y]);
    const c = ORN[balls.length % ORN.length];
    p.rect(x - 1, y, 3, 3, c); p.px(x, y - 1, c); p.px(x, y + 3, mix(c, 0xff000000, 0.4));
    p.px(x + 1, y + 2, mix(c, 0xff000000, 0.35)); p.px(x - 1, y, C("#ffffff"));
  }
  // 바닥 선물 상자
  const gifts = [[-30, 0, 12, 9, "#4a7fd4", "#f2c84b"], [-20, 0, 9, 13, "#d94f4f", "#f4f1ea"], [20, 0, 13, 10, "#6cbf5a", "#d94f4f"], [31, 0, 8, 7, "#e27fb4", "#ffffff"], [-40, 0, 7, 6, "#f2c84b", "#d94f4f"]];
  for (const [gx, gy, w, h, c, rb] of gifts) {
    const x0 = gx - (w >> 1), y0 = gy - h;
    p.rect(x0, y0, w, h, C(c)); p.rect(x0 + w - 2, y0, 2, h, mix(C(c), 0xff000000, 0.3));
    p.rect(x0 + (w >> 1), y0, 1, h, C(rb)); p.rect(x0, y0 + (h >> 1), w, 1, C(rb));
    p.px(x0 + (w >> 1) - 1, y0 - 1, C(rb)); p.px(x0 + (w >> 1) + 1, y0 - 1, C(rb));
  }
  // 외곽선
  const out = f.color.slice(), ink = C("#0b1410");
  for (let y = 0; y < TH; y++)
    for (let x = 0; x < TW; x++) {
      const i = y * TW + x;
      if (f.color[i]) continue;
      if ((x > 0 && f.color[i - 1]) || (x < TW - 1 && f.color[i + 1]) || (y > 0 && f.color[i - TW]) || (y < TH - 1 && f.color[i + TW])) out[i] = ink;
    }
  // 전구 자리
  const bulbs = [];
  const BC = ["#ff5a5a", "#ffd84a", "#5ae08a", "#5ab4ff", "#ff8ad8", "#fff3c0"].map(C);
  for (let n = 0; n < 800 && bulbs.length < 46; n++) {
    const x = Math.round((r() - 0.5) * 96 * K), y = Math.round((-112 + r() * 96) * K);
    if (!inTree(x, y) || !inTree(x, y + 1)) continue;
    if (bulbs.some((b) => Math.abs(b.x - x) + Math.abs(b.y - y) < 7) || balls.some((b) => Math.abs(b[0] - x) + Math.abs(b[1] - y) < 4)) continue;
    bulbs.push({ x, y, c: BC[bulbs.length % BC.length], ph: r() * 6.28, sp: 1.5 + r() * 2.5 });
  }
  return { w: TW, h: TH, ox: TOX, oy: TOY, color: out, bulbs };
}
export const bigTree = buildTree();

/** 트리 위에 매 프레임: 깜빡이는 전구, 빛나는 별, 반짝임. p는 frame의 painter. */
export function drawTreeLights(p, x, y, t) {
  p.place(x, y);
  // 전구: 물결처럼 번갈아 켜짐
  for (const b of bigTree.bulbs) {
    const v = Math.sin(t * b.sp + b.ph + b.y * 0.08);
    if (v > -0.2) {
      p.px(b.x, b.y, v > 0.7 ? C("#ffffff") : b.c);
      p.px(b.x, b.y + 1, b.c);
      p.glow(b.x, b.y, 6, b.c, 0.18 + 0.2 * Math.max(0, v));
    } else p.px(b.x, b.y, mix(b.c, 0xff101010, 0.6));
  }
  // 꼭대기 별
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  const S = ["....#....", "....#....", "...###...", "#########", ".#######.", "..#####..", "..##.##..", ".##...##.", "##.....##"];
  S.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === "#") p.px(i - 4, STAR_Y - 6 + j, j < 4 && i < 5 ? C("#fff2a0") : j > 5 ? C("#d9a020") : C("#ffd84a"));
  }));
  p.px(0, STAR_Y - 2, C("#ffffff"));
  p.glow(0, STAR_Y - 2, 20 + pulse * 10, C("#ffd84a"), 0.35 + pulse * 0.25);
  if (pulse > 0.75) sparkle(p, 0, STAR_Y - 2, 3 + Math.round((pulse - 0.75) * 24), C("#fff2a0"), C("#ffd84a"), 0.4);
  // 트리 위를 도는 반짝임
  for (let i = 0; i < 6; i++) {
    const life = 1.6, age = (t + i * 0.53) % life, cyc = Math.floor((t + i * 0.53) / life);
    const h = Math.sin(cyc * 12.9898 + i * 78.233) * 43758.5453, u = h - Math.floor(h);
    const sx = Math.round((u - 0.5) * 80), sy = Math.round(-110 + ((h * 7) % 1 + 1) % 1 * 90);
    if (!inTree(sx, sy)) continue;
    const k = Math.sin((age / life) * Math.PI);
    if (k > 0.3) sparkle(p, sx, sy, Math.round(k * 3), C("#ffffff"), C("#fff2a0"), 0.25);
  }
  // 바닥에 번지는 따뜻한 빛
  p.glow(0, -50, 70, C("#ffcf80"), 0.12 + pulse * 0.04);
  p.place(0, 0);
}

// ---------- 단상 ----------
export const stage = (() => {
  const w = 150, h = 62, ox = 75, oy = 60;
  const f = createFrame(w, h), p = painterFor(f);
  p.place(ox, oy);
  const top = C("#8a5a33"), topL = C("#b07a45"), front = C("#5a3a24"), frontD = C("#3e2618");
  // 무대 바닥(윗면)
  p.rect(-70, -34, 140, 22, top);
  for (let y = -34; y < -12; y += 4) p.rect(-70, y, 140, 1, C("#7a4a2a"));
  p.rect(-70, -34, 140, 1, topL);
  // 앞면
  p.rect(-72, -12, 144, 12, front); p.rect(-72, -12, 144, 2, C("#6a4430"));
  for (let x = -66; x < 70; x += 12) p.rect(x, -9, 1, 9, frontD);
  // 레드 카펫 계단
  p.rect(-14, -12, 28, 12, C("#a82a2a")); p.rect(-14, -8, 28, 1, C("#7a1a1a")); p.rect(-14, -4, 28, 1, C("#7a1a1a"));
  p.rect(-14, -12, 28, 1, C("#d94a3e"));
  p.rect(-10, -34, 20, 22, C("#b8332f")); p.rect(-10, -34, 2, 22, C("#d94a3e"));
  // 연설대
  p.rect(-9, -56, 18, 4, C("#6a4430")); p.rect(-9, -56, 18, 1, C("#a8744a"));
  p.rect(-7, -52, 14, 20, C("#5a3a24")); p.rect(-7, -52, 3, 20, C("#7a4e32"));
  p.rect(-3, -46, 6, 6, C("#f2c84b")); p.px(-2, -45, C("#fff2a0")); // 엠블럼
  // 마이크
  p.rect(5, -62, 1, 6, C("#2a2230")); p.rect(4, -62, 3, 2, C("#8a8f99"));
  // 양옆 조명 스탠드
  for (const sx of [-62, 62]) {
    p.rect(sx, -56, 2, 22, C("#2a2230"));
    p.rect(sx - 3, -60, 8, 5, C("#1f1a2a")); p.rect(sx - 2, -59, 6, 3, C("#fff2c0"));
  }
  // 외곽선
  const out = f.color.slice(), ink = C("#140e18");
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (f.color[i]) continue;
      if ((x > 0 && f.color[i - 1]) || (x < w - 1 && f.color[i + 1]) || (y > 0 && f.color[i - w]) || (y < h - 1 && f.color[i + w])) out[i] = ink;
    }
  return { w, h, ox, oy, color: out };
})();
