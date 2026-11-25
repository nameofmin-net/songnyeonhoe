// 건배: 머리 위에서 맥주잔 두 개가 날아와 "짠, 짠!" 부딪히는 픽셀 이펙트 (pixelfx 이펙트 규격)
import { hex, sparkle, ease, clamp } from "../pixelfx/core/index.js";

export const meta = {
  name: "Beer clink",
  desc: "Two beer mugs swing in over the head and clink twice: foam splashes up, a white flash at the touch, then they bob and fade.",
  duration: 1.9,
  loop: false,
  actor: 2,
  options: {},
};

// 손잡이가 오른쪽인 맥주잔 (13 x 12). k 외곽 · g 유리 바닥 · b 맥주 · B 반사광 · w 거품 · W 거품 그늘 · h 손잡이
const MUG = [
  "..wwWwww.....",
  ".wwwwwwwWw...",
  "kwwwwwwwwk...",
  "kwbwwbWwbk...",
  "kbBbbbbbbkhh.",
  "kbBbbbbbbk..h",
  "kbBbbbbbbk..h",
  "kbbbbbbbbk..h",
  "kbbbbbbbbkhh.",
  "kbbbbbbbbk...",
  "kggggggggk...",
  ".kkkkkkkk....",
];
const PAL = { k: hex("#2a1a12"), g: hex("#cfe3ec"), b: hex("#f2a93b"), B: hex("#ffd98a"), w: hex("#fffbea"), W: hex("#e6dcc0"), h: hex("#d6e2ea") };
const INK = hex("#1c1624");
const MW = MUG[0].length, MH = MUG.length;
const at = (x, y) => (x >= 0 && y >= 0 && x < MW && y < MH && MUG[y][x] !== "." ? MUG[y][x] : null);

/** 잔 하나를 (cx, cy) 화면 좌표 중심에 angle만큼 기울여 그린다. flip이면 손잡이가 왼쪽. */
function mug(p, cx, cy, angle, flip, a) {
  const cs = Math.cos(angle), sn = Math.sin(angle), R = 10;
  for (let sy = Math.floor(cy - R); sy <= cy + R; sy++)
    for (let sx = Math.floor(cx - R); sx <= cx + R; sx++) {
      // 화면 → 잔 로컬(역회전)
      const dx = sx + 0.5 - cx, dy = sy + 0.5 - cy;
      let lx = dx * cs + dy * sn, ly = -dx * sn + dy * cs;
      if (flip) lx = -lx;
      const x = Math.floor(lx + MW / 2 - (flip ? 0 : 0)), y = Math.floor(ly + MH / 2);
      const ch = at(x, y);
      if (ch) p.put(sx, sy, PAL[ch], a);
      else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) p.put(sx, sy, INK, a);
    }
}

// 거품 방울(고정 시드)
const DROPS = Array.from({ length: 9 }, (_, i) => {
  const h = Math.sin(i * 91.7 + 3.1) * 43758.5453, u = h - Math.floor(h);
  const h2 = Math.sin(i * 17.3 + 1.7) * 12345.678, v = h2 - Math.floor(h2);
  return { vx: (u - 0.5) * 50, vy: -28 - v * 30, big: i % 3 === 0 };
});

const HIT1 = 0.32, HIT2 = 0.72;

export function draw(p, t, o) {
  const a0 = o.actor, headY = a0 ? a0.y : -26;
  const D = meta.duration;
  const alpha = clamp(t / 0.12) * (t > D - 0.35 ? clamp((D - t) / 0.35) : 1);
  if (alpha <= 0) return;
  // 잔 사이 거리와 기울기: 날아와서(짠1) 살짝 떨어졌다가(짠2) 머문다
  let off, ang, lift;
  if (t < HIT1) { const u = ease.outQuad(t / HIT1); off = 17 - 12 * u; ang = 0.42 * u; lift = 8 * (1 - u); }
  else if (t < HIT1 + 0.08) { off = 5; ang = 0.5; lift = 0; }
  else if (t < HIT2) { const u = (t - HIT1 - 0.08) / (HIT2 - HIT1 - 0.08); const k = Math.sin(u * Math.PI); off = 5 + 4 * k; ang = 0.5 - 0.3 * k; lift = -2 * k; }
  else if (t < HIT2 + 0.08) { off = 5; ang = 0.46; lift = 0; }
  else { const u = clamp((t - HIT2 - 0.08) / 0.5); off = 5 + 3 * ease.outQuad(u); ang = 0.46 - 0.26 * ease.outQuad(u); lift = Math.sin((t - HIT2) * 7) * 1 - (t > D - 0.35 ? (t - (D - 0.35)) * 14 : 0); }
  const cx = p.toX(0, 0), cy = p.toY(0, headY - 12 + lift);
  // 은은한 불빛
  p.glow(0, headY - 12 + lift, 16, hex("#ffb84a"), 0.14 * alpha);
  // 왼쪽 잔(손잡이 바깥=왼쪽)과 오른쪽 잔
  mug(p, cx - off - 2, cy, ang, true, alpha);
  mug(p, cx + off + 2, cy, -ang, false, alpha);
  // 부딪힐 때: 하얀 번쩍임 + 별 + 거품 튐
  for (const [hit, k] of [[HIT1, 1], [HIT2, 0.7]]) {
    const dt = t - hit;
    if (dt >= 0 && dt < 0.16) {
      const u = 1 - dt / 0.16;
      sparkle(p, 0, headY - 19 + lift, Math.round(2 + 4 * u * k), hex("#ffffff"), hex("#ffe9a8"), 0.35 * u);
      for (let i = 0; i < 6; i++) {
        const an = -Math.PI / 2 + (i - 2.5) * 0.45, r0 = 5 + dt * 60;
        p.dot(Math.round(Math.cos(an) * r0), Math.round(headY - 19 + lift + Math.sin(an) * r0), hex("#fff3c0"), u);
      }
    }
    if (dt >= 0 && dt < 0.7) {
      for (const d of DROPS) {
        if (k < 1 && d.big) continue;
        const x = d.vx * dt * k, y = headY - 18 + d.vy * dt * k + 70 * dt * dt;
        const c = d.big ? hex("#fffbea") : hex("#f2e6c4");
        p.dot(Math.round(x), Math.round(y), c, clamp(1 - dt / 0.7) * alpha);
        if (d.big) p.dot(Math.round(x) + 1, Math.round(y), c, clamp(1 - dt / 0.7) * alpha);
      }
    }
  }
}
