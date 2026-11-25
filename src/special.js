// 특수 복장(관종 옷) 효과: 캐릭터 뒤(back)·앞(front)에 매 프레임 그린다. 광장과 꾸미기 미리보기가 같이 쓴다.
// o = { x0, y0: 스프라이트 왼쪽 위, cx, fy: 발 중앙, t: 초, spr, flip, seed }
import { hex, rgb, sparkle } from "../pixelfx/core/index.js";
import { SW, SH } from "./characters.js";

const OUTLINE = hex("#1c1624") >>> 0;
const GOLD = hex("#ffd84a"), WHITE = hex("#ffffff"), CREAM = hex("#fff3c0");
const BULBS = ["#ff5a5a", "#ffd84a", "#5ae08a", "#5ab4ff", "#ff8ad8"].map(hex);
const rnd = (i, s) => { const h = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return h - Math.floor(h); };
function hue(h) {
  h = ((h % 1) + 1) % 1;
  const f = (n) => { const k = (n + h * 6) % 6; return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1)))); };
  return rgb(f(5), f(3), f(1));
}
// 스프라이트 픽셀(뒤집기 반영)
const at = (o, x, y) => o.spr[y * SW + (o.flip ? SW - 1 - x : x)] >>> 0;

/** 천사는 둥실 떠 있다(px) */
export const floatOf = (sp, t) => (sp === "angel" ? 2 + Math.round(Math.sin(t * 2.4) * 1.5) : 0);

export function drawSpecial(p, sp, layer, o) {
  if (!sp || sp === "none") return;
  const { x0, y0, cx, fy, t } = o, s = o.seed || 0;
  if (sp === "gold") {
    if (layer === "back") { p.glow(cx, y0 + 15, 15, GOLD, 0.16 + 0.06 * Math.sin(t * 3)); return; }
    // 반짝이 6개가 돌아가며 번쩍
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.9 + rnd(i, s)) % 1;
      if (ph > 0.45) continue;
      const k = Math.sin((ph / 0.45) * Math.PI), cyc = Math.floor(t * 0.9 + rnd(i, s));
      const x = cx + (rnd(i, cyc) - 0.5) * 26, y = y0 + 2 + rnd(i + 9, cyc) * 24;
      sparkle(p, x, y, 1 + Math.round(k * 2), GOLD, WHITE, 0.3 * k);
    }
    // 떨어지는 금가루
    for (let i = 0; i < 4; i++) {
      const u = (t * 0.6 + rnd(i, s + 3)) % 1, x = cx + (rnd(i, s + 4) - 0.5) * 18;
      p.dot(Math.round(x + Math.sin(t * 3 + i) * 1.5), Math.round(y0 + 6 + u * 22), GOLD, 1 - u);
    }
    return;
  }
  if (sp === "disco") {
    if (layer === "back") {
      // 바닥을 도는 조명 점
      for (let i = 0; i < 5; i++) {
        const an = t * 1.6 + (i / 5) * Math.PI * 2, x = cx + Math.cos(an) * 15, y = fy + Math.sin(an) * 5;
        p.glow(x, y, 6, BULBS[i], 0.6);
        p.dot(Math.round(x), Math.round(y), BULBS[i]); p.dot(Math.round(x) + 1, Math.round(y), BULBS[i]);
        p.glowLine(cx, y0 - 6, x, y, 1, BULBS[i], 0.12);
      }
      return;
    }
    // 머리 위 미러볼
    const bx = cx, by = y0 - 6;
    p.dot(bx, by - 6, hex("#8a8f99")); p.dot(bx, by - 5, hex("#8a8f99"));
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      if (dx * dx + dy * dy > 17) continue;
      const f = (Math.floor((dx + t * 6) / 2) + Math.floor(dy / 2)) & 1;
      const c = dx * dx + dy * dy > 11 ? hex("#7d8396") : f ? hex("#e9edf6") : hex("#a9b0c4");
      p.dot(bx + dx, by + dy, c);
    }
    const tw = Math.floor(t * 8) % 6;
    sparkle(p, bx - 2 + (tw % 3) * 2, by - 2 + (tw > 2 ? 3 : 0), 2, WHITE, CREAM, 0.3);
    p.glow(bx, by, 9, WHITE, 0.18);
    // 반짝이 옷: 몸통 픽셀 몇 개가 무지개로 번쩍
    for (let i = 0; i < 7; i++) {
      const cyc = Math.floor(t * 5 + rnd(i, s) * 3), x = 4 + Math.floor(rnd(i, cyc) * 10), y = 14 + Math.floor(rnd(i + 5, cyc) * 12);
      const v = at(o, x, y);
      if (v && v !== OUTLINE) { const c = hue(t * 0.5 + i / 7); p.dot(x0 + x, y0 + y, c); p.light(x0 + x, y0 + y, c, 0.5); }
    }
    return;
  }
  if (sp === "tree") {
    if (layer === "back") { p.glow(cx, y0 + 18, 12, hex("#5ae08a"), 0.1); return; }
    const pts = [[8, 15], [6, 17], [11, 18], [8, 19], [4, 21], [13, 21], [7, 22], [10, 21], [12, 16], [5, 19]];
    pts.forEach(([x, y], i) => {
      const on = (Math.floor(t * 3) + i) % 3 !== 0, c = BULBS[(i + Math.floor(t * 1.5)) % BULBS.length];
      const sx = x0 + (o.flip ? SW - 1 - x : x), sy = y0 + y;
      p.dot(sx, sy, on ? c : hex("#1d5a2c"));
      if (on) p.light(sx, sy, c, 0.55);
    });
    const k = 0.5 + 0.5 * Math.sin(t * 4);
    p.glow(cx, y0 + 2, 7, GOLD, 0.25 + 0.2 * k);
    if (k > 0.8) sparkle(p, cx, y0 + 1, 3, WHITE, GOLD, 0.35);
    return;
  }
  if (sp === "neon") {
    if (layer === "back") { p.glow(cx, fy - 1, 12, hue(t * 0.4), 0.22); return; }
    // 외곽선이 무지개로 흐르며 빛난다
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      if (at(o, x, y) !== OUTLINE) continue;
      const c = hue(t * 0.6 - y * 0.035);
      p.dot(x0 + x, y0 + y, c); p.light(x0 + x, y0 + y, c, 0.35);
    }
    return;
  }
  if (sp === "angel") {
    if (layer === "back") {
      // 퍼덕이는 날개
      const flap = Math.sin(t * 6), lift = Math.round(flap * 2);
      const wing = (dir) => {
        for (let r = 0; r < 7; r++) {
          const len = [4, 6, 7, 7, 6, 4, 2][r], y = y0 + 13 + r - (r < 3 ? lift : 0);
          for (let k = 0; k < len; k++) {
            const x = cx + dir * (4 + k), edge = k === len - 1 || r === 6;
            p.dot(Math.round(x), y, edge ? hex("#cfd6ea") : WHITE);
          }
        }
      };
      wing(-1); wing(1);
      p.glow(cx, y0 + 15, 14, CREAM, 0.18);
      return;
    }
    // 머리 위 링
    const hy = y0 + 1 + Math.round(Math.sin(t * 2.4) * 0.6);
    for (let dx = -4; dx <= 4; dx++) {
      const top = Math.abs(dx) < 4;
      p.dot(cx + dx - 1, hy - (top ? 1 : 0), GOLD);
      if (top) p.dot(cx + dx - 1, hy + 1, hex("#e0a92a"));
    }
    p.glow(cx - 1, hy, 7, GOLD, 0.35);
    // 깃털이 살랑 떨어짐
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.35 + i / 3 + rnd(i, s) * 0.2) % 1, x = cx + (rnd(i, Math.floor(t * 0.35 + i / 3)) - 0.5) * 24 + Math.sin(t * 2 + i) * 3;
      const y = y0 + 4 + u * 26, a = u < 0.15 ? u / 0.15 : 1 - u;
      p.dot(Math.round(x), Math.round(y), WHITE, a); p.dot(Math.round(x) + 1, Math.round(y) - 1, hex("#cfd6ea"), a);
    }
  }
}
