// 변신: 복장을 바꾸면 반짝이가 모여들고 → 하얀 섬광과 빛줄기 → 빛 리본이 감아 오르며 새 옷이 드러나고 → 별·하트가 흩어진다.
// (pixelfx 이펙트 규격, 캐릭터 실루엣 o.actor를 감싼다)
import { hex, sparkle, flare, ease, clamp, TAU, mix } from "../pixelfx/core/index.js";

export const meta = {
  name: "Transform",
  desc: "A magical outfit change: sparkles spiral in, a white flash with light rays, pastel ribbons wind up the body as the white fades off the new outfit, then stars and hearts drift away.",
  duration: 2.3,
  loop: false,
  actor: 2,
  options: {},
};

/** 새 옷으로 바뀌는 시점(섬광이 가장 밝을 때) */
export const SWAP = 0.5;

const PINK = hex("#ff8ad8"), GOLD = hex("#ffd84a"), CYAN = hex("#8ae8ff"), WHITE = hex("#ffffff"), LILAC = hex("#c8a8ff");
const COLS = [PINK, GOLD, CYAN, LILAC];
const HEART = [".#.#.", "#####", "#####", ".###.", "..#.."];
const rnd = (i, s) => { const h = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return h - Math.floor(h); };

function ribbons(p, t, o, front) {
  const a = o.actor, h = a ? -a.y : 26;
  if (!(t > SWAP && t < SWAP + 1.3)) return;
  const u = (t - SWAP) / 1.3, fade = u < 0.15 ? u / 0.15 : u > 0.75 ? (1 - u) / 0.25 : 1;
  for (const [col, ph] of [[PINK, 0], [GOLD, Math.PI]]) {
    for (let s = 0; s < 70; s++) {
      const v = s / 70, an = v * TAU * 1.6 + ph + t * 7;
      if (v > clamp(u * 1.6)) continue;
      const y = 2 - v * (h + 10), x = Math.cos(an) * (8 + 3 * Math.sin(v * 9));
      if ((Math.sin(an) > 0) !== front) continue;
      const c = v > clamp(u * 1.6) - 0.08 ? WHITE : col;
      p.dot(Math.round(x), Math.round(y), c, fade); p.dot(Math.round(x), Math.round(y) - 1, mix(c, WHITE, 0.4), fade);
      if (s % 6 === 0) p.light(x, y, col, 0.3 * fade);
    }
  }
}

export function draw(p, t, o) {
  ribbons(p, t, o, true);
  const a = o.actor, top = a ? a.y : -26, h = -top, cy = top / 2; // cy: 몸 가운데
  const D = meta.duration;
  // ① 모여드는 반짝이 (0 ~ SWAP)
  if (t < SWAP + 0.05) {
    const u = clamp(t / SWAP);
    for (let i = 0; i < 22; i++) {
      for (let tr = 0; tr < 3; tr++) {
        const uu = clamp(u - tr * 0.035), an = rnd(i, 1) * TAU + uu * 5, r = (1 - ease.inQuad(uu)) * (24 + rnd(i, 2) * 12) + 3;
        const x = Math.cos(an) * r, y = cy + Math.sin(an) * r * 0.8;
        if (tr === 0 && i % 4 === 0) sparkle(p, x, y, 1 + Math.round(u * 2), COLS[i % 4], WHITE, 0.25);
        else p.dot(Math.round(x), Math.round(y), tr ? mix(COLS[i % 4], hex("#3a2a6a"), tr * 0.3) : COLS[i % 4], (0.5 + 0.5 * u) * (1 - tr * 0.3));
      }
    }
    // 발밑에서 올라오는 빛기둥
    for (let y = 0; y > top - 6; y--) p.light(0, y, PINK, 0.08 * u);
    p.glow(0, cy, 6 + 20 * u, PINK, 0.15 + 0.35 * u);
  }
  // ② 섬광: 하얀 실루엣 + 빛줄기 + 퍼지는 고리
  const ft = t - SWAP;
  if (ft > -0.12 && ft < 0.5) {
    const k = ft < 0 ? 1 + ft / 0.12 : 1 - ft / 0.5;
    if (ft > -0.05 && ft < 0.22) flare(p, 0, cy, 16 + 22 * (1 - Math.abs(ft) / 0.22), 0.6, ["#3a2a6a", "#c8a8ff", "#ffe8ff", "#ffffff"]);
    p.glow(0, cy, 30, WHITE, 0.55 * k);
    if (ft > 0) {
      const R = 6 + ease.outCubic(clamp(ft / 0.45)) * 30;
      p.ring(0, -1, R, 1, mix(PINK, WHITE, 0.4), 1 - ft / 0.5);
      p.glowRing(0, -1, R, 3, PINK, 0.4 * (1 - ft / 0.5));
    }
  }
  // 몸을 하얗게 덮었다가(섬광) 위에서부터 걷혀 새 옷이 드러남
  if (a && t > SWAP - 0.2 && t < SWAP + 0.9) {
    const reveal = clamp((t - SWAP - 0.05) / 0.8); // 0 → 1: 위에서 아래로 걷힘
    const grow = clamp((t - (SWAP - 0.2)) / 0.2);
    const line = a.y + reveal * (a.h + 4);
    p.mask(a.mask, a.x, a.y, (mx, my) => (a.y + my < line + 2 ? mix(WHITE, PINK, 0.35) : WHITE), (mx, my) => (a.y + my < line ? 0 : grow < 0.5 ? grow * 1.6 : 1));
    if (reveal > 0 && reveal < 1) for (let x = a.x - 1; x <= a.x + a.w; x++) p.light(x, line, GOLD, 0.35);
  }
  // ④ 별·하트가 흩어지며 반짝
  if (t > SWAP + 0.3) {
    const u = clamp((t - SWAP - 0.3) / (D - SWAP - 0.3));
    for (let i = 0; i < 9; i++) {
      const an = rnd(i, 7) * TAU, sp = 14 + rnd(i, 8) * 18, life = 0.6 + rnd(i, 9) * 0.4;
      const v = clamp(u / life); if (v >= 1) continue;
      const x = Math.cos(an) * sp * ease.outCubic(v), y = cy + Math.sin(an) * sp * 0.7 * ease.outCubic(v) - v * 10;
      const al = 1 - v;
      if (i % 3 === 0) HEART.forEach((row, yy) => [...row].forEach((c, xx) => c === "#" && p.dot(Math.round(x) - 2 + xx, Math.round(y) - 2 + yy, PINK, al)));
      else sparkle(p, x, y, 1 + Math.round(2 * (1 - v)), COLS[i % 4], WHITE, 0.3 * al);
    }
  }
}

// 리본이 몸 뒤로 돌아가는 부분은 캐릭터 뒤에 그린다
export function drawBack(p, t, o) { ribbons(p, t, o, false); }
