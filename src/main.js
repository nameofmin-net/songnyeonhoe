// 송년회 메타버스 광장 — pixelfx 기반
import { createFrame, createFx, composite, painterFor, hex, rgb } from "../pixelfx/core/index.js";
import * as charmed from "../pixelfx/fx/status/charmed.js";
import * as sleep from "../pixelfx/fx/status/sleep.js";
import * as confused from "../pixelfx/fx/status/confused.js";
import * as stunned from "../pixelfx/fx/status/stunned.js";
import * as exclamation from "../pixelfx/fx/ui/exclamation.js";
import * as fountain from "../pixelfx/fx/water/fountain.js";
import { makePopulation, renderSprite, actorFor, SW, SH } from "./characters.js";

const W = 480, H = 270;
const MAX = 110;
const params = new URLSearchParams(location.search);
let COUNT = Math.min(MAX, Math.max(2, +(params.get("n") || 10)));

// ---------- 화면 ----------
const stage = document.getElementById("stage");
const cv = document.getElementById("world");
const ov = document.getElementById("overlay");
const ctx = cv.getContext("2d");
const octx = ov.getContext("2d");
cv.width = W; cv.height = H;
const img = ctx.createImageData(W, H);
let S = 3, dpr = 1;
function resize() {
  const avail = Math.min((innerWidth - 16) / W, (innerHeight - 120) / H);
  S = Math.max(1, avail >= 2 ? Math.floor(avail) : avail);
  const cw = Math.round(W * S), ch = Math.round(H * S);
  for (const c of [cv, ov]) { c.style.width = cw + "px"; c.style.height = ch + "px"; }
  stage.style.width = cw + "px"; stage.style.height = ch + "px";
  dpr = devicePixelRatio || 1;
  ov.width = Math.round(cw * dpr); ov.height = Math.round(ch * dpr);
}
addEventListener("resize", resize);
resize();

// ---------- 배경 ----------
const C = (h) => hex(h);
const frame = createFrame(W, H);
const bg = new Uint32Array(W * H);
const staticLight = new Uint32Array(W * H);
const FLOOR_TOP = 44;

function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

function buildBackground() {
  const f = createFrame(W, H), p = painterFor(f);
  // 건물 외벽
  p.rect(0, 0, W, FLOOR_TOP, C("#231d33"));
  for (let y = 2; y < FLOOR_TOP - 6; y += 5) for (let x = (y / 5) % 2 ? 0 : 6; x < W; x += 12) p.rect(x, y, 11, 1, C("#2b2440"));
  // 창문
  for (let x = 18; x < W; x += 54) {
    if (x > 200 && x < 270) continue;
    p.rect(x - 1, 7, 24, 20, C("#15111f"));
    p.rect(x, 8, 22, 18, C("#f2b45c"));
    p.rect(x, 8, 22, 4, C("#ffd88a"));
    p.rect(x + 10, 8, 2, 18, C("#7a4a3a"));
    p.rect(x, 16, 22, 1, C("#7a4a3a"));
    p.rect(x - 2, 27, 26, 2, C("#4a3f5e"));
    p.glow(x + 11, 18, 22, C("#ffb35a"), 0.22);
  }
  // 중앙 출입문
  p.rect(222, 6, 36, FLOOR_TOP - 6, C("#15111f"));
  p.rect(224, 8, 32, FLOOR_TOP - 8, C("#5a3a2a"));
  p.rect(239, 8, 2, FLOOR_TOP - 8, C("#3a2418"));
  p.rect(226, 10, 11, 14, C("#f7c66b")); p.rect(243, 10, 11, 14, C("#f7c66b"));
  p.glow(240, 20, 30, C("#ffb35a"), 0.3);
  // 보도 턱
  p.rect(0, FLOOR_TOP - 4, W, 4, C("#4b445e"));
  p.rect(0, FLOOR_TOP - 4, W, 1, C("#6a6382"));
  // 바닥 타일
  for (let y = FLOOR_TOP; y < H; y++)
    for (let x = 0; x < W; x++) {
      const tx = Math.floor((x + (Math.floor((y - FLOOR_TOP) / 12) % 2) * 8) / 16), ty = Math.floor((y - FLOOR_TOP) / 12);
      const gx = (x + (ty % 2) * 8) % 16, gy = (y - FLOOR_TOP) % 12;
      const dx = x - 240, dy = (y - 158) * 1.9, d = Math.hypot(dx, dy);
      let c;
      if (d < 92 && d > 80) c = (Math.floor(Math.atan2(dy, dx) * 8) % 2 ? "#4f5672" : "#4a516c");
      else c = hash2(tx, ty) < 0.5 ? "#373c52" : "#3a4058";
      if (gx === 0 || gy === 0) c = "#2a2d3f";
      else if (hash2(x, y) < 0.025) c = "#434a64";
      f.color[y * W + x] = C(c);
    }
  // 잔디 화단 (아래 양 모서리)
  for (const [cx, sx] of [[0, 1], [W, -1]])
    for (let y = 214; y < H; y++)
      for (let x = 0; x < 70; x++) {
        const px = cx === 0 ? x : W - 1 - x;
        if (x + (H - y) * 1.1 > 92) continue;
        const edge = x + (H - y) * 1.1 > 88;
        f.color[y * W + px] = C(edge ? "#2a2d3f" : hash2(px, y) < 0.12 ? "#3f7a4c" : (y + x) % 7 === 0 ? "#2f6040" : "#2b5a3c");
      }
  for (let i = 0; i < W * H; i++) { bg[i] = f.color[i]; staticLight[i] = f.light[i]; }
}

// ---------- 소품(높이 정렬되는 스프라이트) ----------
function propSprite(w, h, ox, oy, draw) {
  const f = createFrame(w, h), p = painterFor(f);
  p.place(ox, oy);
  draw(p);
  return { w, h, ox, oy, color: f.color, light: f.light };
}
const lampSpr = propSprite(14, 46, 7, 45, (p) => {
  p.rect(-3, -3, 6, 3, C("#1f1a2a"));
  p.rect(-1, -36, 2, 34, C("#2f2a40")); p.rect(-1, -36, 1, 34, C("#4b4560"));
  p.rect(-4, -42, 8, 7, C("#1f1a2a"));
  p.rect(-3, -41, 6, 5, C("#ffe2a0")); p.rect(-3, -41, 6, 1, C("#fff6da"));
  p.rect(-5, -44, 10, 2, C("#2f2a40"));
});
const benchSpr = propSprite(40, 18, 20, 16, (p) => {
  p.rect(-18, -15, 36, 3, C("#8a5a33")); p.rect(-18, -15, 36, 1, C("#b07a45"));
  p.rect(-18, -11, 36, 2, C("#7a4a2a"));
  p.rect(-19, -7, 38, 4, C("#9a6a3a")); p.rect(-19, -7, 38, 1, C("#c08a50"));
  p.rect(-16, -3, 2, 3, C("#2a2230")); p.rect(14, -3, 2, 3, C("#2a2230"));
  p.rect(-16, -12, 2, 5, C("#2a2230")); p.rect(14, -12, 2, 5, C("#2a2230"));
});
const treeSpr = propSprite(40, 58, 20, 56, (p) => {
  // 작은 크리스마스 트리
  const g = [C("#1f4a34"), C("#2b6a45"), C("#3f8a55")];
  p.rect(-2, -6, 4, 6, C("#5a3a2a"));
  for (let i = 0; i < 4; i++) {
    const y = -12 - i * 10, w = 18 - i * 4;
    for (let r = 0; r < 12; r++) {
      const ww = Math.round(w * (r / 12));
      p.rect(-ww, y - 12 + r, ww * 2 + 1, 1, g[r < 3 ? 2 : r < 8 ? 1 : 0]);
    }
  }
  p.rect(-1, -55, 3, 3, C("#ffd84a")); p.px(0, -56, C("#fff6c0"));
});
const potSpr = propSprite(20, 26, 10, 25, (p) => {
  p.rect(-6, -9, 12, 9, C("#8a4a3a")); p.rect(-7, -10, 14, 2, C("#a85a44"));
  for (let i = 0; i < 7; i++) p.circle(-5 + (i % 4) * 3.4, -14 - Math.floor(i / 4) * 5 - (i % 2) * 2, 3.2, i % 3 ? C("#2f6a44") : C("#3f8a55"));
  p.px(-2, -20, C("#e85a6a")); p.px(3, -16, C("#f2c84b"));
});

const props = [];
const blocks = []; // 발이 들어갈 수 없는 영역 [x0,y0,x1,y1]
function addProp(spr, x, y, block, glow) {
  props.push({ spr, x, y });
  if (block) blocks.push(block);
  if (glow) {
    const p = painterFor({ w: W, h: H, ox: 0, oy: 0, color: bg, light: staticLight });
    p.glow(glow[0], glow[1], glow[2], C(glow[3]), glow[4]);
  }
}
function buildProps() {
  for (const [x, y] of [[96, 112], [384, 112], [96, 236], [384, 236]]) addProp(lampSpr, x, y, [x - 4, y - 3, x + 4, y + 2], [x, y - 38, 46, "#ffcf80", 0.45]);
  for (const [x, y] of [[160, 74], [320, 74]]) addProp(benchSpr, x, y, [x - 20, y - 6, x + 20, y + 2]);
  for (const [x, y] of [[34, 98], [446, 98]]) addProp(treeSpr, x, y, [x - 14, y - 6, x + 14, y + 3]);
  for (const [x, y] of [[136, 186], [344, 186], [200, 60], [280, 60]]) addProp(potSpr, x, y, [x - 8, y - 4, x + 8, y + 2]);
  // 분수대
  blocks.push({ ell: [240, 152, 40, 22] });
}
const fountainFx = createFx(fountain, { x: 240, y: 168, seed: 3 });

function blocked(x, y) {
  if (x < 12 || x > W - 12 || y < FLOOR_TOP + 10 || y > H - 6) return true;
  if (x + (H - y) * 1.1 < 96 || W - x + (H - y) * 1.1 < 96) return true; // 화단
  for (const b of blocks) {
    if (b.ell) { const [cx, cy, rx, ry] = b.ell; if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) return true; }
    else if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return true;
  }
  return false;
}
function clearPath(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
  for (let i = 1; i <= n; i++) if (blocked(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
  return true;
}

// ---------- 대사 ----------
const LINES = [
  "올해 고생 많으셨어요!", "건배~! 🥂", "내년에도 잘 부탁해요", "벌써 연말이라니…", "케이크 어디 있어요?",
  "사진 같이 찍어요!", "올해 최고의 순간은?", "경품 추첨 언제 해요?", "와 분수 예쁘다", "다들 한 해 수고했어요 👏",
  "2차 가실 분~?", "이 노래 좋다 ♪", "새해 복 많이 받으세요!", "올해 목표 이뤘어요?", "배고파요 🍗",
  "오늘 드레스코드 레드!", "내년엔 더 잘될 거예요", "ㅋㅋㅋㅋㅋ", "소원 빌었어요 ✨", "선물 교환 하죠!",
];
const GREET = ["안녕하세요!", "오 반가워요!", "어, 왔어요?", "올해 수고 많았어요!", "여기서 보네요 ㅎㅎ"];
const REPLY = ["네 반가워요 😊", "수고하셨어요~", "건배해요! 🥂", "내년에도 화이팅!", "ㅎㅎ 안녕하세요"];
const rnd = (a, b) => a + Math.random() * (b - a);
const choose = (a) => a[Math.floor(Math.random() * a.length)];

// ---------- 머리 위 이모티콘 (픽셀) ----------
const ICONS = {
  note: { c: "#5a4ad6", rows: ["...##..", "...#.#.", "...#..#", "...#...", ".###...", "####...", ".##...."] },
  question: { c: "#2f6fd4", rows: ["..###..", ".#...#.", ".....#.", "...##..", "...#...", ".......", "...#..."] },
  sweat: { c: "#4ab0e8", rows: ["...#...", "...#...", "..###..", ".#####.", ".##.##.", ".#####.", "..###.."] },
  heart: { c: "#e8456a", rows: [".##.##.", "#######", "#######", ".#####.", "..###..", "...#...", "......."] },
  star: { c: "#e8a820", rows: ["...#...", "...#...", "#######", ".#####.", "..###..", ".##.##.", "##...##"] },
  dots: { c: "#4a4458", rows: [".......", ".......", ".......", "#.#.#..", ".......", ".......", "......."] },
  gift: { c: "#d94f4f", rows: ["..#.#..", "...#...", "#######", "#..#..#", "#######", "#..#..#", "#######"] },
  cheers: { c: "#e8a820", rows: ["#.#.#.#", "#...#..", ".#.#...", "..#..#.", "..#..#.", "..#..#.", ".###.##"] },
};
const ICON_KEYS = Object.keys(ICONS);
const BUBBLE = ["..###########..", ".#...........#.", "#.............#", "#.............#", "#.............#", "#.............#", "#.............#", "#.............#", "#.............#", ".#...........#.", "..#####.######.", "......#.#......", ".......#......."];

function drawIcon(px, py, kind, a) {
  const ink = C("#1c1624"), white = C("#ffffff"), ic = C(ICONS[kind].c);
  const p = painterFor(frame);
  BUBBLE.forEach((row, y) => [...row].forEach((ch, x) => {
    const inside = ch === "." && y > 0 && y < 10 && x > 0 && x < 14 && !((y === 1 || y === 9) && (x < 2 || x > 12));
    if (ch === "#") p.dot(px + x, py + y, ink, a);
    else if (inside) p.dot(px + x, py + y, white, a);
  }));
  // 꼬리 안쪽
  p.dot(px + 7, py + 10, white, a); p.dot(px + 7, py + 11, white, a);
  ICONS[kind].rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") p.dot(px + 4 + x, py + 2 + y, ic, a); }));
}

// ---------- 주민 ----------
const ALL = makePopulation(MAX);
const FX = { charmed, sleep, confused, stunned };

class Resident {
  constructor(d) {
    this.d = d; this.name = d.name; this.style = d.style;
    this.cache = new Map();
    this.actor = actorFor(this.sprite(0, 0, false));
    let x, y;
    do { x = rnd(20, W - 20); y = rnd(FLOOR_TOP + 14, H - 10); } while (blocked(x, y) || people.some((o) => Math.hypot(o.x - x, o.y - y) < 18));
    this.x = x; this.y = y;
    this.state = "idle"; this.timer = rnd(0.3, 3); this.dir = 0; this.flip = false; this.t = rnd(0, 9);
    this.speed = rnd(16, 26); this.blinkAt = rnd(1, 4);
    this.fx = []; this.icon = null; this.speech = null; this.chatCool = rnd(3, 10);
  }
  sprite(dir, step, blink) {
    const k = dir * 10 + step + (blink ? 5 : 0);
    let s = this.cache.get(k);
    if (!s) this.cache.set(k, (s = renderSprite(this.style, dir, step, blink)));
    return s;
  }
  get busy() { return this.state === "chat" || this.fx.some((f) => f.loop); }
  say(text, dur) { this.speech = { text, until: performance.now() / 1000 + (dur ?? 2.4 + text.length * 0.09) }; }
  pop(kind) { this.icon = { kind: kind ?? choose(ICON_KEYS), t: 0, dur: rnd(1.8, 2.8) }; }
  play(mod, loop, dur) {
    const fx = createFx(mod, { x: Math.round(this.x), y: Math.round(this.y), actor: this.actor, seed: this.d.id * 7 + Math.floor(Math.random() * 99) });
    this.fx.push({ fx, loop, end: loop ? dur : Infinity, age: 0 });
  }
  react() {
    const r = Math.random();
    if (r < 0.34) this.say(choose(LINES));
    else if (r < 0.62) this.pop();
    else if (r < 0.74) { this.play(exclamation, false); }
    else {
      const key = choose(["charmed", "charmed", "confused", "stunned", "sleep"]);
      this.state = "idle"; this.dir = 0;
      this.timer = key === "sleep" ? rnd(4, 6) : rnd(2.4, 3.4);
      this.play(FX[key], true, this.timer);
    }
  }
  pickTarget() {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, d = rnd(30, 150);
      const tx = this.x + Math.cos(a) * d, ty = this.y + Math.sin(a) * d * 0.7;
      if (!blocked(tx, ty) && clearPath(this.x, this.y, tx, ty)) { this.tx = tx; this.ty = ty; return true; }
    }
    return false;
  }
  update(dt, now) {
    this.t += dt; this.chatCool -= dt;
    for (const f of this.fx) {
      f.age += dt; f.fx.update(dt);
      f.fx.options.x = Math.round(this.x); f.fx.options.y = Math.round(this.y);
      if (f.loop && f.age > f.end) f.fx.stop();
    }
    this.fx = this.fx.filter((f) => !f.fx.done());
    if (this.icon && (this.icon.t += dt) > this.icon.dur) this.icon = null;
    if (this.speech && now > this.speech.until) this.speech = null;
    if (this.pending && now > this.pending.at) { this.say(this.pending.text); this.pending = null; }

    if (this.state === "walk") {
      const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { this.state = "idle"; this.timer = rnd(1.2, 4.5); if (Math.random() < 0.55) this.dir = 0; if (Math.random() < 0.6) this.react(); return; }
      const vx = (dx / d) * this.speed, vy = (dy / d) * this.speed;
      let nx = this.x + vx * dt, ny = this.y + vy * dt;
      // 살짝 서로 비켜가기
      for (const o of people) {
        if (o === this) continue;
        const ex = nx - o.x, ey = (ny - o.y) * 1.6, e = Math.hypot(ex, ey);
        if (e > 0 && e < 10) { nx += (ex / e) * 12 * dt; ny += (ey / e) * 8 * dt; }
      }
      if (!blocked(nx, ny)) { this.x = nx; this.y = ny; } else { this.state = "idle"; this.timer = rnd(0.3, 1); }
      if (Math.abs(vx) > Math.abs(vy) * 0.9) { this.dir = 2; this.flip = vx < 0; } else this.dir = vy > 0 ? 0 : 1;
      if (Math.random() < dt * 0.04) this.say(choose(LINES));
    } else if (this.state === "chat") {
      if ((this.timer -= dt) <= 0) { this.state = "idle"; this.timer = rnd(0.5, 1.5); }
    } else {
      if ((this.timer -= dt) <= 0 && !this.fx.some((f) => f.loop)) {
        if (this.pickTarget()) this.state = "walk"; else this.timer = rnd(0.5, 1.5);
      }
    }
  }
  draw() {
    const walking = this.state === "walk";
    const step = walking ? Math.floor(this.t * 7) % 4 : 0;
    const blink = !walking && this.t % this.blinkAt < 0.13;
    const sleeping = this.fx.some((f) => f.fx.meta.name === "Sleep");
    const spr = this.sprite(this.dir, step, blink && !sleeping);
    const bob = walking && step % 2 === 1 ? 1 : 0;
    const x0 = Math.round(this.x) - SW / 2, y0 = Math.round(this.y) - SH - bob;
    // 그림자
    const p = painterFor(frame);
    for (let dx = -6; dx <= 6; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx / 6.5) ** 2 + dy * dy < 1.2) p.blendPx(Math.round(this.x) + dx, Math.round(this.y) + dy - 1, 0xff1a1222, 0.45);
    for (const f of this.fx) f.fx.draw(frame, "back");
    blit(spr, SW, SH, x0, y0, this.flip);
  }
  drawFront() {
    for (const f of this.fx) f.fx.draw(frame, "front");
    if (this.icon) {
      const u = this.icon.t, rise = u < 0.18 ? Math.round((1 - u / 0.18) * 5) : 0;
      const a = u < 0.12 ? u / 0.12 : u > this.icon.dur - 0.25 ? (this.icon.dur - u) / 0.25 : 1;
      drawIcon(Math.round(this.x) - 7, Math.round(this.y) - SH - 14 + rise, this.icon.kind, a);
    }
  }
}

function blit(spr, w, h, x0, y0, flip) {
  const C = frame.color;
  for (let y = 0; y < h; y++) {
    const sy = y0 + y; if (sy < 0 || sy >= H) continue;
    for (let x = 0; x < w; x++) {
      const c = spr[y * w + (flip ? w - 1 - x : x)];
      if (!c) continue;
      const sx = x0 + x; if (sx < 0 || sx >= W) continue;
      C[sy * W + sx] = c;
    }
  }
}
function blitProp(pr) {
  const s = pr.spr, x0 = pr.x - s.ox, y0 = pr.y - s.oy;
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const c = s.color[y * s.w + x];
    if (!c) continue;
    const sx = x0 + x, sy = y0 + y;
    if (sx >= 0 && sy >= 0 && sx < W && sy < H) frame.color[sy * W + sx] = c;
  }
}

// ---------- 장식: 전구 줄, 눈 ----------
const BULBS = ["#ff5a5a", "#ffd84a", "#5ae08a", "#5ab4ff", "#ff8ad8"].map(C);
function drawGarland(time) {
  const p = painterFor(frame);
  for (let x = 0; x < W; x++) {
    const y = 4 + Math.round(Math.abs(Math.sin((x / W) * Math.PI * 6)) * 6);
    p.put(x, y, C("#1a1522"));
    if (x % 12 === 6) {
      const i = (x / 12) | 0, on = Math.sin(time * 3 + i * 1.7) > -0.4, c = BULBS[i % BULBS.length];
      p.put(x, y + 1, on ? c : 0xff3a3040); p.put(x, y + 2, on ? c : 0xff3a3040);
      if (on) p.glow(x, y + 2, 7, c, 0.3);
    }
  }
}
const flakes = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: rnd(8, 18), w: rnd(0, 6) }));
function drawSnow(dt, time) {
  const p = painterFor(frame), white = C("#eef2ff");
  for (const f of flakes) {
    f.y += f.v * dt; f.x += Math.sin(time * 1.3 + f.w) * 6 * dt;
    if (f.y > H) { f.y = -2; f.x = Math.random() * W; }
    p.dot(Math.round(f.x), Math.round(f.y), white, 0.7);
  }
}

// ---------- 텍스트 레이어 (이름·말풍선·현수막) ----------
function pixelBox(c, x, y, w, h, u, fill, ink) {
  c.fillStyle = ink;
  c.fillRect(x + u, y, w - 2 * u, h); c.fillRect(x, y + u, w, h - 2 * u);
  c.fillStyle = fill;
  c.fillRect(x + u, y + u, w - 2 * u, h - 2 * u);
}
function drawOverlay() {
  const c = octx, u = Math.max(1, Math.round(S / 1.5));
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, ov.width, ov.height);
  c.textAlign = "center"; c.textBaseline = "middle";
  const big = S >= 4 ? 22 : S >= 2.5 ? 15 : 11;
  const small = S >= 4 ? 15 : S >= 2.5 ? 12 : 10;

  // 현수막
  {
    const cx = 240 * S, cy = 30 * S;
    c.font = `bold ${big}px Galmuri11, "Apple SD Gothic Neo", sans-serif`;
    const t = "🎉 2026 U PLEAT 송년회 🎉", tw = c.measureText(t).width + 24;
    pixelBox(c, cx - tw / 2, cy - big * 0.9, tw, big * 1.8, u * 2, "#b8332f", "#1c1624");
    c.fillStyle = "#ffe08a"; c.fillText(t, cx, cy + 1);
  }

  const list = [...people].sort((a, b) => a.y - b.y);
  // 이름표
  c.font = `${small}px Galmuri11, "Apple SD Gothic Neo", sans-serif`;
  for (const r of list) {
    const x = r.x * S, y = (r.y + 3) * S + small * 0.6;
    const tw = c.measureText(r.name).width + 8;
    c.fillStyle = "rgba(20,14,30,0.72)";
    c.fillRect(Math.round(x - tw / 2), Math.round(y - small * 0.62), Math.round(tw), Math.round(small * 1.3));
    c.fillStyle = r.style.gender === "M" ? "#a8d4ff" : "#ffc2dc";
    c.fillText(r.name, x, y + 1);
  }
  // 말풍선
  c.font = `${small}px Galmuri11, "Apple SD Gothic Neo", sans-serif`;
  for (const r of list) {
    if (!r.speech) continue;
    const x = r.x * S, top = (r.y - SH - 4) * S - (r.icon ? 14 * S : 0);
    const tw = c.measureText(r.speech.text).width + 16, th = small * 1.9;
    const bx = Math.round(Math.min(Math.max(x - tw / 2, 4), W * S - tw - 4)), by = Math.round(top - th - 6 * u);
    pixelBox(c, bx, by, tw, th, u * 2, "#ffffff", "#1c1624");
    // 꼬리
    c.fillStyle = "#1c1624";
    c.fillRect(Math.round(x - 3 * u), by + th - u, 6 * u, 3 * u); c.fillRect(Math.round(x - u), by + th + 2 * u, 2 * u, 2 * u);
    c.fillStyle = "#ffffff"; c.fillRect(Math.round(x - 2 * u), by + th - 2 * u, 4 * u, 3 * u);
    c.fillStyle = "#1c1624"; c.fillText(r.speech.text, bx + tw / 2, by + th / 2 + 1);
  }
}

// ---------- 루프 ----------
let people = [];
function populate(n) {
  COUNT = n; people = [];
  for (let i = 0; i < n; i++) people.push(new Resident(ALL[i]));
  // 첫 화면부터 살아 있게: 몇 명은 바로 반응
  people.forEach((r, i) => { if (i % 3 === 0) setTimeout(() => r.react(), 300 + Math.random() * 1500); });
  const m = people.filter((p) => p.style.gender === "M").length;
  document.getElementById("count").textContent = `접속 ${n}명 · 남 ${m} / 여 ${n - m}`;
  document.querySelectorAll("[data-n]").forEach((b) => b.classList.toggle("on", +b.dataset.n === n));
}

function chats() {
  for (let i = 0; i < people.length; i++) {
    const a = people[i];
    if (a.state !== "walk" || a.chatCool > 0) continue;
    for (const b of people) {
      if (b === a || b.chatCool > 0 || b.busy) continue;
      if (Math.abs(a.x - b.x) < 26 && Math.abs(a.y - b.y) < 8 && Math.abs(a.x - b.x) > 10) {
        for (const [s, o] of [[a, b], [b, a]]) { s.state = "chat"; s.timer = rnd(3.2, 4.2); s.dir = 2; s.flip = o.x < s.x; s.chatCool = rnd(14, 24); }
        a.say(choose(GREET)); b.pending = { at: performance.now() / 1000 + 1.1, text: choose(REPLY) };
        if (Math.random() < 0.25) b.play(exclamation, false);
        break;
      }
    }
  }
}

let last = performance.now();
function tick(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
  const now = nowMs / 1000;
  for (const r of people) r.update(dt, now);
  chats();
  fountainFx.update(dt);

  frame.color.fill(0); frame.light.set(staticLight);
  drawGarland(now);
  const items = [...people.map((r) => ({ y: r.y, r })), ...props.map((p) => ({ y: p.y, p })), { y: 168, f: true }];
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    if (it.r) it.r.draw();
    else if (it.p) blitProp(it.p);
    else fountainFx.draw(frame);
  }
  for (const it of items) if (it.r) it.r.drawFront();
  drawSnow(dt, now);
  composite(frame, img.data, bg);
  ctx.putImageData(img, 0, 0);
  drawOverlay();
  requestAnimationFrame(tick);
}

// 클릭 → 그 사람이 반응
ov.addEventListener("pointerdown", (e) => {
  const rect = ov.getBoundingClientRect(), x = (e.clientX - rect.left) / S, y = (e.clientY - rect.top) / S;
  let best = null, bd = 1e9;
  for (const r of people) { const d = Math.hypot(r.x - x, r.y - 12 - y); if (d < 16 && d < bd) { bd = d; best = r; } }
  if (best) best.react();
});
document.querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", () => populate(+b.dataset.n)));
document.getElementById("cheers").addEventListener("click", () => {
  for (const r of people) setTimeout(() => { r.say(choose(["건배! 🥂", "위하여~!", "건배~!!", "올해도 수고했어요!"])); r.pop("cheers"); }, Math.random() * 600);
});

buildBackground();
buildProps();
populate(COUNT);
(document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(tick));
