// 송년회 메타버스 광장 — pixelfx 기반
import { createFrame, createFx, composite, painterFor, hex, rgb, sparkle } from "../pixelfx/core/index.js";
import * as charmed from "../pixelfx/fx/status/charmed.js";
import * as sleep from "../pixelfx/fx/status/sleep.js";
import * as confused from "../pixelfx/fx/status/confused.js";
import * as stunned from "../pixelfx/fx/status/stunned.js";
import * as exclamation from "../pixelfx/fx/ui/exclamation.js";
import { bigTree, drawTreeLights, stage as podium } from "./bigtree.js";
import { renderSprite, actorFor, SW, SH } from "./characters.js";
import * as respawnBeam from "../pixelfx/fx/spawn/respawn-beam.js";
import * as confetti from "../pixelfx/fx/ui/confetti.js";
import * as beer from "./beer.js";
import * as transform from "./transform.js";
import { drawSpecial, floatOf } from "./special.js";
import { sfx, setSound, soundOn, savedPref } from "./audio.js";
import { ALL, MAX, sortedByName, avatarURL, mountEntry, connectLive, sendJoin, sendCheers, resetAll, styleOf, chatItemHTML } from "./joinform.js";

const W = 640, H = 360;
const CX = W / 2, FY = 216; // 광장 중심(대형 트리)
const params = new URLSearchParams(location.search);
// 휴대폰에서는 광장 대신 입장(채팅) 페이지로
if (matchMedia("(max-width: 760px) and (pointer: coarse)").matches && !params.has("plaza")) location.replace("join.html");

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
  const wide = innerWidth >= 1100, side = wide ? 236 + 300 + 24 : 0;
  document.body.classList.toggle("narrow", !wide);
  const avail = Math.min((innerWidth - 24 - side) / W, ((wide ? innerHeight : innerHeight * 0.62) - 96) / H);
  S = Math.max(1, avail >= 2 ? Math.floor(avail) : avail);
  const cw = Math.round(W * S), ch = Math.round(H * S);
  for (const c of [cv, ov]) { c.style.width = cw + "px"; c.style.height = ch + "px"; }
  stage.style.width = cw + "px"; stage.style.height = ch + "px";
  document.getElementById("row").style.height = wide ? ch + "px" : "";
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
    if (x > CX - 40 && x < CX + 30) continue;
    p.rect(x - 1, 7, 24, 20, C("#15111f"));
    p.rect(x, 8, 22, 18, C("#f2b45c"));
    p.rect(x, 8, 22, 4, C("#ffd88a"));
    p.rect(x + 10, 8, 2, 18, C("#7a4a3a"));
    p.rect(x, 16, 22, 1, C("#7a4a3a"));
    p.rect(x - 2, 27, 26, 2, C("#4a3f5e"));
    p.glow(x + 11, 18, 22, C("#ffb35a"), 0.22);
  }
  // 중앙 출입문
  p.rect(CX - 18, 6, 36, FLOOR_TOP - 6, C("#15111f"));
  p.rect(CX - 16, 8, 32, FLOOR_TOP - 8, C("#5a3a2a"));
  p.rect(CX - 1, 8, 2, FLOOR_TOP - 8, C("#3a2418"));
  p.rect(CX - 14, 10, 11, 14, C("#f7c66b")); p.rect(CX + 3, 10, 11, 14, C("#f7c66b"));
  p.glow(CX, 20, 30, C("#ffb35a"), 0.3);
  // 보도 턱
  p.rect(0, FLOOR_TOP - 4, W, 4, C("#4b445e"));
  p.rect(0, FLOOR_TOP - 4, W, 1, C("#6a6382"));
  // 바닥 타일
  for (let y = FLOOR_TOP; y < H; y++)
    for (let x = 0; x < W; x++) {
      const tx = Math.floor((x + (Math.floor((y - FLOOR_TOP) / 12) % 2) * 8) / 16), ty = Math.floor((y - FLOOR_TOP) / 12);
      const gx = (x + (ty % 2) * 8) % 16, gy = (y - FLOOR_TOP) % 12;
      const dx = x - CX, dy = (y - FY) * 1.9, d = Math.hypot(dx, dy);
      let c;
      if (d < 104 && d > 92) c = (Math.floor(Math.atan2(dy, dx) * 8) % 2 ? "#4f5672" : "#4a516c");
      else c = hash2(tx, ty) < 0.5 ? "#373c52" : "#3a4058";
      if (gx === 0 || gy === 0) c = "#2a2d3f";
      else if (hash2(x, y) < 0.025) c = "#434a64";
      f.color[y * W + x] = C(c);
    }
  // 잔디 화단 (아래 양 모서리)
  for (const [cx, sx] of [[0, 1], [W, -1]])
    for (let y = H - 60; y < H; y++)
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
  for (const [x, y] of [[130, 140], [510, 140], [130, 312], [510, 312]]) addProp(lampSpr, x, y, [x - 4, y - 3, x + 4, y + 2], [x, y - 38, 46, "#ffcf80", 0.45]);
  for (const [x, y] of [[CX - 150, 82], [CX + 150, 82], [56, 200], [W - 56, 200]]) addProp(benchSpr, x, y, [x - 20, y - 6, x + 20, y + 2]);
  for (const [x, y] of [[36, 100], [W - 36, 100], [CX - 210, 340], [CX + 210, 340]]) addProp(treeSpr, x, y, [x - 14, y - 6, x + 14, y + 3]);
  for (const [x, y] of [[CX - 110, 262], [CX + 110, 262], [CX - 88, 108], [CX + 88, 108], [CX, 336]]) addProp(potSpr, x, y, [x - 8, y - 4, x + 8, y + 2]);
  // 12시 방향 단상
  addProp(podium, CX, 104, [CX - 76, 44, CX + 76, 108], [CX, 70, 60, "#fff0c0", 0.25]);
  // 중앙 대형 트리
  addProp(bigTree, CX, FY + 20, null);
  blocks.push({ ell: [CX, FY + 12, 62, 16] });
}

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
  "사진 같이 찍어요!", "올해 최고의 순간은?", "경품 추첨 언제 해요?", "와 트리 진짜 크다 🎄", "단상에서 한마디 하실 분?", "다들 한 해 수고했어요 👏",
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
const FX = { charmed, sleep, confused, stunned };

class Resident {
  constructor(d, message = "") {
    this.d = d; this.name = d.name; this.style = d.npc ? d.style : styleOf(d.id); this.message = message;
    this.cache = new Map();
    this.actor = actorFor(this.sprite(0, 0, false));
    let x, y;
    do { x = rnd(20, W - 20); y = rnd(FLOOR_TOP + 14, H - 10); } while (blocked(x, y) || (Math.abs(x - CX) < 76 && y < FY + 26 && y > FY - 140) || people.some((o) => Math.hypot(o.x - x, o.y - y) < 18));
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
  get busy() { return this.state === "chat" || this.state === "ride" || this.fx.some((f) => f.loop); }
  say(text, dur) { this.speech = { text, until: performance.now() / 1000 + (dur ?? 2.4 + text.length * 0.09) }; }
  pop(kind) { this.icon = { kind: kind ?? choose(ICON_KEYS), t: 0, dur: rnd(1.8, 2.8) }; }
  play(mod, loop, dur) {
    const fx = createFx(mod, { x: Math.round(this.x), y: Math.round(this.y), actor: this.actor, seed: this.d.id * 7 + Math.floor(Math.random() * 99) });
    this.fx.push({ fx, loop, end: loop ? dur : Infinity, age: 0 });
  }
  react() {
    const r = Math.random();
    if (this.state === "ride") { this.say(choose(this.d.rideLines || this.d.lines || LINES)); return; }
    if (this.d.npc && r < 0.6) { this.say(choose(this.d.lines)); if (Math.random() < 0.4) this.play(confetti, false); this.hop = 0.7; return; }
    if (r < 0.34) this.say(this.message && Math.random() < 0.35 ? this.message : choose(LINES));
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
    if (this.hop > 0) this.hop -= dt;
    if (this.swap && this.t >= this.swap.at) { this.setStyle(this.swap.st); this.swap = null; }
    if (this.dance > 0) { this.dance -= dt; this.dir = [0, 2, 1, 2][Math.floor(this.t * 5) % 4]; this.flip = Math.floor(this.t * 5) % 4 === 3; if (this.dance <= 0) { this.dir = 0; this.flip = false; } }
    for (const f of this.fx) {
      f.age += dt; f.fx.update(dt);
      f.fx.options.x = Math.round(this.x); f.fx.options.y = Math.round(this.y);
      if (f.loop && f.age > f.end) f.fx.stop();
    }
    this.fx = this.fx.filter((f) => !f.fx.done());
    if (this.icon && (this.icon.t += dt) > this.icon.dur) this.icon = null;
    if (this.speech && now > this.speech.until) this.speech = null;
    if (this.pending && now > this.pending.at) { this.say(this.pending.text); this.pending = null; }
    if (this.entering !== undefined) {
      this.entering += dt;
      if (this.entering > 1.75) {
        this.entering = undefined;
        this.play(confetti, false); sfx.pop();
        if (this.message) this.say(this.message, 7);
      }
      return;
    }

    if (this.state === "ride") return; // 업혀 가는 중: 위치는 npcRide()가 정한다
    if (this.state === "walk") {
      const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { this.state = "idle"; this.timer = rnd(1.2, 4.5); if (Math.random() < 0.55) this.dir = 0; if (Math.random() < 0.6) this.react(); return; }
      const vx = (dx / d) * this.speed, vy = (dy / d) * this.speed;
      let nx = this.x + vx * dt, ny = this.y + vy * dt;
      // 살짝 서로 비켜가기
      for (const o of people) {
        if (o === this || o.state === "ride") continue;
        const ex = nx - o.x, ey = (ny - o.y) * 1.6, e = Math.hypot(ex, ey);
        if (e > 0 && e < 10) { nx += (ex / e) * 12 * dt; ny += (ey / e) * 8 * dt; }
      }
      if (!blocked(nx, ny)) { this.x = nx; this.y = ny; } else { this.state = "idle"; this.timer = rnd(0.3, 1); }
      if (Math.abs(vx) > Math.abs(vy) * 0.9) { this.dir = 2; this.flip = vx < 0; } else this.dir = vy > 0 ? 0 : 1;
      if (Math.random() < dt * (this.d.npc ? 0.09 : 0.04)) this.say(choose(this.d.lines || LINES));
    } else if (this.state === "chat") {
      if ((this.timer -= dt) <= 0) { this.state = "idle"; this.timer = rnd(0.5, 1.5); }
    } else {
      if ((this.timer -= dt) <= 0 && !this.fx.some((f) => f.loop)) {
        if (this.pickTarget()) this.state = "walk"; else this.timer = rnd(0.5, 1.5);
      }
    }
  }
  /** 복장이 바뀌면 스프라이트·이펙트용 실루엣을 다시 만든다 */
  setStyle(st) {
    this.style = st; this.cache.clear();
    this.actor = actorFor(this.sprite(0, 0, false));
    for (const f of this.fx) f.fx.options.actor = this.actor;
  }
  /** 휴대폰에서 누른 이모티콘을 광장에서 몸으로 보여준다 */
  emote(kind) {
    if (this.hidden) return;
    if (this.state === "ride") { if (kind === "cheers") this.play(beer, false); return; }
    this.state = "idle"; this.dir = 0; this.flip = false; this.pending = null;
    const hold = (t) => (this.timer = Math.max(this.timer, t));
    if (kind === "cheers") { this.play(beer, false); sfx.cheers(); this.hop = 0.5; hold(1.9); }
    else if (kind === "wave") { this.say("안녕하세요! 👋", 2.6); this.hop = 0.6; hold(1.6); }
    else if (kind === "heart") { this.play(charmed, true, 2.4); hold(2.4); }
    else if (kind === "party") { this.play(confetti, false); sfx.pop(); this.pop("star"); this.hop = 0.6; hold(2.6); }
    else if (kind === "dance") { this.dance = 2.6; this.pop("note"); hold(2.6); }
    else if (kind === "laugh") { this.say("ㅋㅋㅋㅋㅋ", 2.2); this.pop("sweat"); this.hop = 0.9; hold(1.6); }
    else if (kind === "wow") { this.play(exclamation, false); hold(1.4); }
    else if (kind === "sleepy") { this.play(sleep, true, 3.2); hold(3.2); }
  }
  /** 복장 변경: 변신 이펙트를 틀고, 섬광이 가장 밝을 때 새 옷으로 바꾼다 */
  transformTo(st) {
    if (this.hidden) { this.setStyle(st); return; }
    this.state = "idle"; this.dir = 0; this.flip = false; this.dance = 0;
    this.timer = Math.max(this.timer, transform.meta.duration);
    this.play(transform, false); sfx.transform();
    this.swap = { st, at: this.t + transform.SWAP };
  }
  get beering() { return this.fx.some((f) => f.fx.meta === beer.meta); }
  get hidden() {
    const b = this.fx.find((f) => f.fx.meta === respawnBeam.meta);
    return b ? respawnBeam.actorAlpha(b.fx.t) === 0 : false;
  }
  enter() {
    this.state = "idle"; this.dir = 0; this.timer = 4.2;
    this.play(respawnBeam, false);
    this.entering = 0;
  }
  draw() {
    if (this.hidden) { for (const f of this.fx) f.fx.draw(frame, "back"); return; }
    const walking = this.state === "walk";
    const step = walking ? Math.floor(this.t * 7) % 4 : 0;
    const blink = !walking && this.t % this.blinkAt < 0.13;
    const sleeping = this.fx.some((f) => f.fx.meta.name === "Sleep");
    const spr = this.sprite(this.dir, step, blink && !sleeping);
    let bob = walking && step % 2 === 1 ? 1 : 0;
    if (this.hop > 0) bob = Math.round(Math.abs(Math.sin(this.hop * Math.PI * 3)) * 4);
    if (this.dance > 0) bob = Math.round(Math.abs(Math.sin(this.t * Math.PI * 5)) * 3);
    const sp = this.style.sp;
    bob += floatOf(sp, this.t);
    if (this.d.hoppy && walking) bob += Math.round(Math.abs(Math.sin(this.t * 9)) * (this.carrying ? 3 : 2));
    this.lastBob = bob;
    if (this.state === "ride") bob = (this.lift || 0) + (this.mount?.lastBob || 0);
    const x0 = Math.round(this.x) - SW / 2, y0 = Math.round(this.y) - SH - bob;
    this.spo = sp && sp !== "none" ? { x0, y0, cx: Math.round(this.x), fy: Math.round(this.y), t: this.t, spr, flip: this.flip, dir: this.dir, seed: Math.abs(this.d.id) } : null;
    // 그림자
    const p = painterFor(frame);
    if (this.state !== "ride") for (let dx = -6; dx <= 6; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx / 6.5) ** 2 + dy * dy < 1.2) p.blendPx(Math.round(this.x) + dx, Math.round(this.y) + dy - 1, 0xff1a1222, 0.45);
    for (const f of this.fx) f.fx.draw(frame, "back");
    if (this.spo) drawSpecial(painterFor(frame), this.style.sp, "back", this.spo);
    blit(spr, SW, SH, x0, y0, this.flip);
    this.last = { spr, x0, y0, flip: this.flip };
  }
  drawFront() {
    if (this.spo && !this.hidden) drawSpecial(painterFor(frame), this.style.sp, "front", this.spo);
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
function blitProp(pr, fromRow = 0) {
  const s = pr.spr, x0 = pr.x - s.ox, y0 = pr.y - s.oy;
  for (let y = fromRow; y < s.h; y++) for (let x = 0; x < s.w; x++) {
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
function wrap(c, text, maxW) {
  if (c.measureText(text).width <= maxW) return [text];
  const out = []; let cur = "";
  for (const word of text.split(/(?<= )/)) {
    if (c.measureText(cur + word).width <= maxW) { cur += word; continue; }
    if (cur) { out.push(cur.trimEnd()); cur = ""; }
    // 한 단어가 너무 길면 글자 단위로 자른다
    for (const ch of [...word]) {
      if (c.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trimEnd());
  return out.slice(0, 3);
}
function drawOverlay() {
  const c = octx, u = Math.max(1, Math.round(S / 1.5));
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, ov.width, ov.height);
  c.textAlign = "center"; c.textBaseline = "middle";
  const big = S >= 4 ? 22 : S >= 2 ? 15 : 11;
  const small = S >= 4 ? 15 : S >= 2 ? 11 : 10;
  const nameF = Math.round(small * 1.3), talkF = Math.round(small * 1.5);

  // 현수막
  {
    const cx = CX * S, cy = 30 * S;
    c.font = `bold ${big}px Galmuri11, "Apple SD Gothic Neo", sans-serif`;
    const t = "🎉 2026 U PLEAT 송년회 🎉", tw = c.measureText(t).width + 24;
    pixelBox(c, cx - tw / 2, cy - big * 0.9, tw, big * 1.8, u * 2, "#b8332f", "#1c1624");
    c.fillStyle = "#ffe08a"; c.fillText(t, cx, cy + 1);
  }

  const list = [...people].sort((a, b) => a.y - b.y);
  // 이름표
  c.font = `${nameF}px Galmuri11, "Apple SD Gothic Neo", sans-serif`;
  for (const r of list) {
    if (r.hidden || r.state === "ride") continue;
    const x = r.x * S, y = (r.y + 3) * S + nameF * 0.6;
    const tw = c.measureText(r.name).width + 10;
    c.fillStyle = "rgba(20,14,30,0.72)";
    c.fillRect(Math.round(x - tw / 2), Math.round(y - nameF * 0.62), Math.round(tw), Math.round(nameF * 1.3));
    c.fillStyle = r.d.npc ? "#ffd84a" : r.style.gender === "M" ? "#a8d4ff" : "#ffc2dc";
    c.fillText(r.name, x, y + 1);
  }
  // 말풍선
  c.font = `${talkF}px Galmuri11, "Apple SD Gothic Neo", sans-serif`;
  for (const r of list) {
    if (!r.speech) continue;
    const x = r.x * S, top = (r.y - SH - 4 - (r.state === "ride" ? r.lift + 2 : 0)) * S - (r.icon ? 14 * S : 0) - (r.beering ? 18 * S : 0);
    const lines = wrap(c, r.speech.text, talkF * 11), lh = talkF * 1.35;
    const tw = Math.max(...lines.map((l) => c.measureText(l).width)) + talkF * 1.4, th = lh * lines.length + talkF * 0.8;
    const bx = Math.round(Math.min(Math.max(x - tw / 2, 4), W * S - tw - 4)), by = Math.round(top - th - 6 * u);
    pixelBox(c, bx, by, tw, th, u * 2, "#ffffff", "#1c1624");
    // 꼬리
    c.fillStyle = "#1c1624";
    c.fillRect(Math.round(x - 3 * u), by + th - u, 6 * u, 3 * u); c.fillRect(Math.round(x - u), by + th + 2 * u, 2 * u, 2 * u);
    c.fillStyle = "#ffffff"; c.fillRect(Math.round(x - 2 * u), by + th - 2 * u, 4 * u, 3 * u);
    c.fillStyle = "#1c1624";
    lines.forEach((l, i) => c.fillText(l, bx + tw / 2, by + th / 2 + 1 + (i - (lines.length - 1) / 2) * lh));
  }
}

// ---------- 참석 명단 ----------
let people = [];
// NPC: 산타와 이족보행 루돌프(명단과 무관, 기기마다 혼자 돌아다님)
const NPCS = [
  { id: -1, npc: true, name: "산타", style: { gender: "M", skin: "#f6cfae", hair: "buzz", hairColor: "#f4f1ea", top: "santa", topColor: "#d8323a", top2: "#f6f2ea", bottom: "pants", bottomColor: "#d8323a", shoes: "#23232b", hat: "santa", hatColor: "#d8323a", acc: "none", accColor: "#d8323a", sp: "npcsanta" },
    lines: ["호호호! 메리 크리스마스! 🎅", "올해 착한 일 많이 했나요?", "선물 받을 사람~? 🎁", "호호호호!", "루돌프 어디 갔지?", "다들 한 해 수고 많았어요!", "내년에도 선물 가득! 🎁"] },
  { id: -2, npc: true, hoppy: true, name: "루돌프", style: { gender: "M", skin: "#a8704a", hair: "buzz", hairColor: "#6a4428", top: "long", topColor: "#8a5a33", top2: "#e9d8b8", bottom: "pants", bottomColor: "#7a4a2a", shoes: "#3a2a20", hat: "antler", hatColor: "#8a5a33", acc: "none", accColor: "#8a5a33", sp: "npcdeer" },
    lines: ["코가 빛나서 길 안 잃어요 🔴", "썰매 끄느라 다리 아파요…", "두 발로 걷는 거 처음이에요", "산타 할아버지 기다려요!", "음머? 아니 그건 소…", "반짝반짝 ✨", "당근 있어요? 🥕"] },
];
NPCS[0].rideLines = ["호호호! 편하구나 🎅", "루돌프야 조금만 천천히!", "이랴~ 🦌", "썰매보다 낫구나!"];
NPCS[1].rideLines = ["으쌰 으쌰! 🦌", "할아버지 무거워요…", "꽉 잡으세요!", "코 불빛 켭니다 🔴"];
const [santa, deer] = NPCS.map((d) => { const r = new Resident(d); r.speed = d.hoppy ? 30 : 18; people.push(r); return r; });
// 둘이 마주치면 루돌프가 산타를 업고 잠시 다닌다
const ride = { t: 0, cool: rnd(10, 18) };
function npcRide(dt) {
  if (ride.t > 0) {
    ride.t -= dt;
    santa.x = deer.x; santa.y = deer.y + (deer.dir === 1 ? 0.5 : -0.5);
    santa.dir = deer.dir; santa.flip = deer.flip;
    if (deer.state === "idle" && deer.timer > 1.2) deer.timer = 0.6; // 업고 있을 땐 쉬지 않고 돌아다님
    if (Math.random() < dt * 0.12) (Math.random() < 0.5 ? deer : santa).say(choose((Math.random() < 0.5 ? deer : santa).d.rideLines), 2.2);
    if (ride.t <= 0) {
      santa.state = "idle"; santa.lift = 0; santa.mount = null; deer.carrying = false; deer.speed = 30;
      const side = deer.flip ? 12 : -12;
      santa.x = blocked(deer.x + side, deer.y) ? deer.x - side : deer.x + side; santa.dir = 0; santa.flip = false;
      santa.timer = 2.5; santa.hop = 0.6; santa.say("호호호! 잘 탔다 🎅", 2.6);
      deer.state = "idle"; deer.timer = 2; deer.dir = 0; deer.say("휴… 힘들다 💦", 2.4);
      ride.cool = rnd(25, 40);
    }
    return;
  }
  ride.cool -= dt;
  if (ride.cool > 0 || santa.hidden || deer.hidden || santa.busy || deer.busy) return;
  // 가끔 루돌프가 산타 쪽으로 간다
  if (deer.state !== "walk" || Math.random() < dt * 0.3) {
    if (Math.random() < dt * 0.6 && clearPath(deer.x, deer.y, santa.x, santa.y)) { deer.tx = santa.x + (deer.x < santa.x ? -8 : 8); deer.ty = santa.y; deer.state = "walk"; }
  }
  if (Math.hypot(deer.x - santa.x, (deer.y - santa.y) * 1.6) < 16) {
    ride.t = rnd(7, 10); sfx.jingle();
    santa.state = "ride"; santa.lift = 12; santa.mount = deer; santa.speech = null; santa.pending = null;
    deer.carrying = true; deer.speed = 36; deer.state = "idle"; deer.timer = 1.4; deer.dir = 0; deer.flip = false;
    deer.say("할아버지 업히세요! 🦌", 2.4); deer.play(exclamation, false);
    santa.pending = { at: performance.now() / 1000 + 1.2, text: "호호호! 고맙구나 🎅" };
  }
}
const present = new Map(); // id -> { message, at }
const $ = (q) => document.querySelector(q);

function renderLists(highlight) {
  const waiting = ALL.map((d) => d.id).filter((id) => !present.has(id));
  const pres = [...present.entries()].sort((a, b) => b[1].at - a[1].at);
  $("#waitN").textContent = waiting.length;
  $("#presN").textContent = pres.length;
  const m = pres.filter(([id]) => ALL[id].style.gender === "M").length;
  $("#presMF").textContent = `남 ${m} · 여 ${pres.length - m}`;
  $("#waitList").innerHTML = !waiting.length ? `<li class="empty">모두 도착했어요 🎉</li>` : sortedByName(waiting).map((id) =>
    `<li><img src="${avatarURL(id, 2, true)}" alt=""><span class="nm ${ALL[id].style.gender}">${ALL[id].name}</span></li>`).join("");
  $("#presList").innerHTML = pres.length ? pres.map(([id, v]) =>
    `<li class="${id === highlight ? "new" : ""}"><img src="${avatarURL(id, 2, true)}" alt=""><div><span class="nm ${ALL[id].style.gender}">${ALL[id].name}</span><p>${esc(v.message)}</p></div></li>`).join("")
    : `<li class="empty">아직 아무도 없어요.<br>첫 번째로 입장해 보세요!</li>`;
  if (highlight >= 0) $("#presList").scrollTop = 0; // 방금 온 사람이 보이게
  form?.sync();
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);


/** 입장: 이름·한마디로 광장에 등장 */
function arrive(id, message, { silent = false, at = Date.now() } = {}) {
  if (!(id >= 0 && id < MAX)) return;
  message = String(message || "").slice(0, 40);
  if (present.has(id)) {
    // 이미 와 있으면 한마디만 갱신
    const v = present.get(id), changed = v.message !== message;
    v.message = message;
    const r = people.find((p) => p.d.id === id);
    if (r) {
      r.message = message;
      const st = styleOf(id);
      if (JSON.stringify(st) !== JSON.stringify(r.swap ? r.swap.st : r.style)) r.transformTo(st);
      if (changed) r.say(message, 6);
    }
    renderLists(id);
    return;
  }
  present.set(id, { message, at });
  const r = new Resident(ALL[id], message);
  people.push(r);
  if (!silent) { r.enter(); announce(id, message); sfx.enter(); }
  else r.timer = rnd(0.3, 3);
  renderLists(silent ? -1 : id);
}
function leave(id) {
  const r = people.find((p) => p.d.id === id);
  if (r && r.last && !r.hidden) { dissolve(r); sfx.dust(); }
  present.delete(id);
  people = people.filter((p) => p.d.id !== id);
}
/** 서버의 전체 명단에 맞춘다(처음 접속·재연결·초기화). 새로 생긴 사람은 조용히 추가. */
function applyState(list) {
  const ids = new Set(list.map((a) => a.id));
  for (const id of [...present.keys()]) if (!ids.has(id)) leave(id);
  for (const a of list) {
    if (present.has(a.id)) { const v = present.get(a.id); v.message = a.message; v.at = a.at; const r = people.find((p) => p.d.id === a.id); if (r) { r.message = a.message; r.setStyle(styleOf(a.id)); } }
    else arrive(a.id, a.message, { silent: true, at: a.at });
  }
  renderLists();
}

// 입장 알림 카드 (차례로)
const queue = [];
let showing = false;
function announce(id, message) { queue.push({ id, message }); if (!showing) nextAnnounce(); }
function nextAnnounce() {
  const a = queue.shift();
  const el = $("#announce");
  if (!a) { showing = false; el.classList.remove("on"); return; }
  showing = true;
  el.innerHTML = `<img src="${avatarURL(a.id, 3)}" alt=""><div><b>🎉 <span class="${ALL[a.id].style.gender}">${ALL[a.id].name}</span> 님 입장!</b><p>“${esc(a.message)}”</p></div>`;
  el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  setTimeout(nextAnnounce, queue.length ? 2600 : 4200);
}

const SAMPLE_MSG = ["올해 정말 고생 많으셨어요!", "내년에도 잘 부탁드립니다 🙏", "다들 건강하세요!", "올해 최고의 팀이었어요 👏", "새해 복 많이 받으세요", "맛있는 거 먹으러 왔어요 🍗", "내년엔 더 재밌게!", "올 한 해 감사했습니다", "회식 2차 갑니다 🍻", "다들 사랑합니다 ❤️"];
function randomArrivals(n, local = false) {
  const waiting = ALL.map((d) => d.id).filter((id) => !present.has(id));
  for (let i = 0; i < n && waiting.length; i++) {
    const id = waiting.splice(Math.floor(Math.random() * waiting.length), 1)[0];
    setTimeout(() => (local ? arrive(id, choose(SAMPLE_MSG)) : sendJoin(id, choose(SAMPLE_MSG)).catch(() => {})), i * 700);
  }
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
  npcRide(dt);
  chats();

  frame.color.fill(0); frame.light.set(staticLight);
  drawGarland(now);
  const items = [...people.map((r) => ({ y: r.y, r })), ...props.map((p) => ({ y: p.y, p }))];
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    if (it.r) it.r.draw();
    else if (it.p) {
      if (it.p.spr === bigTree) {
        const from = treeFromRow();
        if (from >= bigTree.h) continue;
        const sx = tree.shake > 0 ? Math.round(Math.sin(tree.shake * 60)) : 0, pp = sx ? { ...it.p, x: it.p.x + sx } : it.p;
        if (from > 0) blitProp(pp, from);
        else { blitProp(pp); drawTreeLights(painterFor(frame), pp.x, pp.y, now); }
      } else blitProp(it.p);
    }
  }
  for (const it of items) if (it.r) it.r.drawFront();
  drawTreeFx(dt);
  drawDust(dt);
  drawSnow(dt, now);
  composite(frame, img.data, bg);
  ctx.putImageData(img, 0, 0);
  drawOverlay();
  requestAnimationFrame(tick);
}

// ---------- 이스터에그: 트리를 빠르게 30번 누르면 트리가 터지며 초기화 ----------
const ADMIN_KEY_LS = "songnyeonhoe-admin";
const savedKey = () => { try { return localStorage.getItem(ADMIN_KEY_LS) || ""; } catch { return ""; } };
const saveKey = (k) => { try { k ? localStorage.setItem(ADMIN_KEY_LS, k) : localStorage.removeItem(ADMIN_KEY_LS); } catch {} };
const TAPS_NEEDED = 10, TAP_WINDOW = 5000;
const tree = { taps: [], shake: 0, boom: -1, bits: [], sparks: [], dust: [] };
const treeProp = () => props.find((p) => p.spr === bigTree);
function hitTree(x, y) {
  const p = treeProp(); if (!p) return false;
  const s = p.spr, lx = Math.floor(x - (p.x - s.ox)), ly = Math.floor(y - (p.y - s.oy));
  if (lx < 0 || ly < 0 || lx >= s.w || ly >= s.h) return false;
  // 트리 픽셀 근처면 인정(손가락 오차)
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = lx + dx, yy = ly + dy; if (xx >= 0 && yy >= 0 && xx < s.w && yy < s.h && s.color[yy * s.w + xx]) return true; }
  return false;
}
function tapTree(x, y) {
  if (tree.boom >= 0) return;
  const now = performance.now();
  tree.taps = tree.taps.filter((t) => now - t < TAP_WINDOW); tree.taps.push(now);
  tree.shake = 0.25; sfx.treeTap(tree.taps.length);
  tree.sparks.push({ x, y, t: 0, n: tree.taps.length });
  if (tree.taps.length >= TAPS_NEEDED) {
    tree.taps = [];
    setTimeout(askReset, 30);
  }
}
async function askReset() {
  if (!confirm("🎄 트리를 터뜨려서 광장을 초기화할까요?\n모든 기기의 입장 명단과 채팅이 지워져요.")) return;
  let key = savedKey();
  if (!key) { key = (prompt("관리자 코드를 입력하세요.") || "").trim(); if (!key) return; }
  explodeTree();
  setTimeout(async () => {
    try { await resetAll(key); saveKey(key); }
    catch (e) { saveKey(""); alert(e.message === "forbidden" ? "관리자 코드가 맞지 않아요. 초기화되지 않았어요." : "초기화에 실패했어요."); }
  }, 700);
}
function explodeTree() {
  const p = treeProp(), s = p.spr;
  tree.boom = 0; tree.bits = []; sfx.boom(); setTimeout(() => sfx.regrow(), GROW_AT * 1000);
  // 트리 픽셀을 조각내서 사방으로
  for (let n = 0; n < 900; n++) {
    const x = Math.floor(Math.random() * s.w), y = Math.floor(Math.random() * s.h), c = s.color[y * s.w + x];
    if (!c) continue;
    const wx = p.x - s.ox + x, wy = p.y - s.oy + y, cy = p.y - 60;
    const ang = Math.atan2(wy - cy, wx - p.x) + (Math.random() - 0.5) * 0.6, sp = 40 + Math.random() * 150;
    tree.bits.push({ x: wx, y: wy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60 - Math.random() * 80, c, life: 1.2 + Math.random() * 1.4, big: Math.random() < 0.18 });
  }
  for (const b of s.bulbs) tree.bits.push({ x: p.x + b.x, y: p.y + b.y, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 160, c: b.c, life: 2 + Math.random(), big: true, glow: true });
  const st = $("#stage"); st.classList.remove("boom"); void st.offsetWidth; st.classList.add("boom");
  for (const r of people) { if (r.state !== "ride") { r.hop = 0.8; if (Math.random() < 0.5) r.play(exclamation, false); } }
}
function drawTreeFx(dt) {
  const p = painterFor(frame);
  for (const k of tree.sparks) {
    k.t += dt;
    const u = k.t / 0.45;
    sparkleAt(p, k.x, k.y, u, k.n);
  }
  tree.sparks = tree.sparks.filter((k) => k.t < 0.45);
  if (tree.shake > 0) tree.shake -= dt;
  if (tree.boom < 0) return;
  tree.boom += dt;
  const tp = treeProp(), cx = tp.x, cy = tp.y - 60, b = tree.boom;
  // 섬광 + 충격파
  if (b < 0.5) { p.glow(cx, cy, 40 + b * 200, C("#ffffff"), 0.9 * (1 - b / 0.5)); }
  if (b < 0.9) { const R = 10 + b * 320; p.ring(cx, cy + 30, R, 2, C("#fff3c0"), 1 - b / 0.9); p.glowRing(cx, cy + 30, R, 6, C("#ffd84a"), 0.5 * (1 - b / 0.9)); }
  for (const t of tree.bits) {
    t.vy += 260 * dt; t.x += t.vx * dt; t.y += t.vy * dt; t.vx *= 1 - dt * 0.6;
    const a = Math.max(0, 1 - b / t.life);
    if (a <= 0) continue;
    p.dot(Math.round(t.x), Math.round(t.y), t.c, a);
    if (t.big) p.dot(Math.round(t.x) + 1, Math.round(t.y), t.c, a), p.dot(Math.round(t.x), Math.round(t.y) + 1, t.c, a);
    if (t.glow) p.light(t.x, t.y, t.c, 0.6 * a);
  }
  // 다시 자라나는 트리: 아래에서 위로 반짝이 띠가 훑고 올라가며 생긴다
  const g = growOf(b);
  if (g > 0 && g < 1) {
    const s = tp.spr, row = Math.floor(s.h * (1 - g)), wy = tp.y - s.oy + row;
    const xs = [];
    for (let x = 0; x < s.w; x++) for (let dy = 0; dy < 3; dy++) if (s.color[Math.min(s.h - 1, row + dy) * s.w + x]) { xs.push(x); break; }
    if (xs.length) {
      const x0 = tp.x - s.ox + xs[0], x1 = tp.x - s.ox + xs[xs.length - 1];
      for (let x = x0 - 1; x <= x1 + 1; x++) { p.dot(x, wy, C("#fff3c0"), 0.9); p.light(x, wy, C("#ffd84a"), 0.5); p.light(x, wy - 1, C("#5ae08a"), 0.25); }
      for (let i = 0; i < 4; i++) { const x = x0 + Math.random() * (x1 - x0); sparkle(p, x, wy - Math.random() * 4, 1 + Math.round(Math.random() * 2), C("#ffffff"), C("#ffd84a"), 0.3); }
    }
    for (let i = 0; i < 3; i++) tree.dust.push({ x: tp.x + (Math.random() - 0.5) * 70 * (1 - g * 0.8), y: wy, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, c: [C("#ffd84a"), C("#5ae08a"), C("#fff3c0"), C("#ff8ad8")][i], life: 0.6 + Math.random() * 0.5, t: 0, sp: true });
  }
  if (b > GROW_AT + GROW_DUR && b < GROW_AT + GROW_DUR + 0.6) { const u = (b - GROW_AT - GROW_DUR) / 0.6; p.glow(cx, tp.y - tp.spr.oy + 4, 18, C("#ffd84a"), 0.7 * (1 - u)); if (u < 0.3) sparkle(p, cx, tp.y - tp.spr.oy + 4, 6, C("#ffffff"), C("#ffd84a"), 0.4); }
  if (b > GROW_AT + GROW_DUR + 0.6) { tree.boom = -1; tree.bits = []; }
}
const GROW_AT = 2.4, GROW_DUR = 1.8;
const growOf = (b) => (b < GROW_AT ? 0 : Math.min(1, (b - GROW_AT) / GROW_DUR));
// 사람이 가루가 되어 흩어진다(위에서부터 부서져 오른쪽 위로 날림)
function dissolve(r) {
  const { spr, x0, y0, flip } = r.last;
  const pal = [C("#c8bca8"), C("#8a8070"), C("#e8dcc8")];
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const c = spr[y * SW + (flip ? SW - 1 - x : x)];
    if (!c) continue;
    const delay = (y / SH) * 0.9 + Math.random() * 0.5 + (x / SW) * 0.15;
    tree.dust.push({ x: x0 + x, y: y0 + y, vx: 14 + Math.random() * 30, vy: -8 - Math.random() * 22, c, ash: pal[(x + y) % 3], life: 0.9 + Math.random() * 0.8, t: -delay });
  }
}
function drawDust(dt) {
  if (!tree.dust.length) return;
  const p = painterFor(frame);
  for (const d of tree.dust) {
    d.t += dt;
    if (d.t < 0) { p.dot(d.x, d.y, d.c); continue; } // 아직 붙어 있음
    d.x += d.vx * dt; d.y += d.vy * dt; d.vx += (Math.random() - 0.3) * 30 * dt; d.vy -= 6 * dt;
    const u = d.t / d.life, a = Math.max(0, 1 - u);
    const col = d.sp ? d.c : u < 0.25 ? d.c : d.ash;
    p.dot(Math.round(d.x), Math.round(d.y), col, a);
    if (d.sp) p.light(d.x, d.y, d.c, 0.3 * a);
  }
  tree.dust = tree.dust.filter((d) => d.t < d.life);
}
function sparkleAt(p, x, y, u, n) {
  const a = 1 - u, r = 2 + u * 6, c = n >= TAPS_NEEDED - 3 ? C("#ff5a5a") : C("#fff3c0");
  for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2; p.dot(Math.round(x + Math.cos(an) * r), Math.round(y + Math.sin(an) * r), c, a); }
  p.glow(x, y, 6, c, 0.4 * a);
}
// 트리 행 중 보이는 시작 줄(0 = 전부, h = 안 보임)
const treeFromRow = () => (tree.boom < 0 ? 0 : Math.ceil(bigTree.h * (1 - growOf(tree.boom))));

// 클릭 → 그 사람이 반응
ov.addEventListener("pointerdown", (e) => {
  const rect = ov.getBoundingClientRect(), x = (e.clientX - rect.left) / S, y = (e.clientY - rect.top) / S;
  if (hitTree(x, y)) { tapTree(x, y); return; }
  let best = null, bd = 1e9;
  for (const r of people) { const d = Math.hypot(r.x - x, r.y - 12 - y); if (d < 16 && d < bd) { bd = d; best = r; } }
  if (best) { best.react(); sfx.blip(); }
});
function cheersAll() {
  for (const r of people) setTimeout(() => r.emote("cheers"), Math.random() * 700);
}
let online = false;
document.getElementById("cheers").addEventListener("click", () => { if (online) sendCheers().catch(cheersAll); else cheersAll(); });

// 입장 팝업
let form = null;
const modal = $("#modal");
function openModal() { modal.classList.add("on"); form.reset(); form.sync(); setTimeout(() => form.focus(), 50); }
function closeModal() { modal.classList.remove("on"); }
$("#joinBtn").addEventListener("click", openModal);
// 소리: 버튼으로 켜고 끈다. 전에 켜 뒀으면 첫 클릭 때 자동으로 다시 켠다(브라우저 정책상 클릭이 필요).
const sndBtn = $("#sound");
const paintSnd = () => (sndBtn.textContent = soundOn() ? "🔊 소리 끄기" : "🔇 캐롤·효과음 켜기");
sndBtn.addEventListener("click", async () => { await setSound(!soundOn()); paintSnd(); });
if (savedPref()) addEventListener("pointerdown", async function first(e) { removeEventListener("pointerdown", first); if (e.target !== sndBtn && !soundOn()) { await setSound(true); paintSnd(); } });
paintSnd();
modal.addEventListener("pointerdown", (e) => { if (e.target === modal) closeModal(); });
$("#modalClose").addEventListener("click", closeModal);
addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
// 관리자 버튼은 ?admin 으로 열었을 때만
const isAdmin = params.has("admin");
for (const b of ["#rand5", "#reset"]) $(b).hidden = !isAdmin;
$("#rand5").addEventListener("click", () => randomArrivals(5));
$("#reset").addEventListener("click", async () => {
  const key = prompt("모든 기기의 참석 명단을 비웁니다. 관리자 코드를 입력하세요.");
  if (!key) return;
  try { await resetAll(key.trim()); saveKey(key.trim()); } catch (e) { alert(e.message === "forbidden" ? "관리자 코드가 맞지 않아요." : "초기화에 실패했어요."); }
});

buildBackground();
buildProps();
form = mountEntry($("#modalBody"), { lock: false, entries: () => present });
// ---------- 실시간 채팅(보기 전용) ----------
let chatItems = [];
function renderChat(newCid) {
  const ul = $("#chatList");
  ul.innerHTML = chatItems.length ? chatItems.map((m) => chatItemHTML(m)).join("") : `<li class="empty">아직 대화가 없어요.<br>휴대폰에서 입장해 첫 인사를 남겨 보세요 👋</li>`;
  if (newCid) ul.querySelector(`[data-cid="${newCid}"]`)?.classList.add("new");
  ul.scrollTop = ul.scrollHeight;
  $("#chatN").textContent = chatItems.length ? `${chatItems.length}개` : "";
}
function onEmote(m) {
  chatItems.push(m); if (chatItems.length > 150) chatItems.shift();
  renderChat();
  people.find((p) => p.d.id === m.who)?.emote(m.kind);
  if (m.kind !== "cheers") sfx.blip();
}
function onChat(m) {
  chatItems.push(m); if (chatItems.length > 150) chatItems.shift();
  renderChat(m.cid); sfx.chat();
  // 광장의 그 캐릭터가 말풍선으로 말한다
  const r = people.find((p) => p.d.id === m.who);
  if (r && !r.hidden) r.say(m.text, 3 + m.text.length * 0.12);
}

// ---------- 시상식: 빨간 커튼 무대 (어드민 컨트롤러가 재생) ----------
const showEl = $("#show"), showCard = showEl.querySelector(".sh-card");
let showCur = null, showChain = Promise.resolve();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function fillShow(sh) {
  const n = sh.people.length, ph = n <= 6 ? 22 : n <= 12 ? 17 : n <= 24 ? 12 : 8, pf = n <= 6 ? 2.3 : n <= 12 ? 1.9 : n <= 24 ? 1.6 : 1.35;
  showCard.style.setProperty("--ph", ph + "cqh"); showCard.style.setProperty("--pf", pf + "cqw");
  showCard.innerHTML = `<div class="sh-t"><small>2026 U PLEAT AWARDS</small>${esc(sh.title)}</div>
    ${sh.sub ? `<div class="sh-s">${esc(sh.sub)}</div>` : ""}
    <div class="ppl">${sh.people.filter((id) => ALL[id]).map((id, i) => `<div class="pp" style="animation-delay:${(0.25 + i * Math.min(0.12, 1.6 / Math.max(1, n))).toFixed(2)}s"><img src="${avatarURL(id, 3)}" alt=""><b>${esc(ALL[id].name)}${ALL[id].rank ? `<small>${ALL[id].rank}</small>` : ""}</b></div>`).join("")}</div>
    <div class="sh-congrats">🎉 축하합니다! 🎉</div>`;
}
function stepClass(step) { showEl.classList.remove("s0", "s1", "s2"); showEl.classList.add("s" + step); }
function confettiRain() {
  const box = showEl.querySelector(".sh-conf"), cols = ["#ffd84a", "#ff5a5a", "#5ae08a", "#5ab4ff", "#ff8ad8", "#ffffff"];
  box.innerHTML = Array.from({ length: 90 }, () => `<i style="left:${Math.random() * 100}%;background:${choose(cols)};animation-duration:${(2.2 + Math.random() * 2).toFixed(2)}s;animation-delay:${(Math.random() * 1.2).toFixed(2)}s"></i>`).join("");
  setTimeout(() => (box.innerHTML = ""), 5000);
}
async function doShow(sh) {
  const isNew = sh && (!showCur || showCur.sid !== sh.sid);
  if (!sh) {
    if (!showCur) return;
    showCur = null;
    sfx.curtain(); showEl.classList.add("closed"); await wait(1100);
    showEl.classList.remove("on", "s0", "s1", "s2"); showCard.innerHTML = "";
    await wait(250); sfx.curtain(); showEl.classList.remove("closed");
    return;
  }
  if (isNew) {
    showCur = { ...sh, step: 0 };
    sfx.curtain(); showEl.classList.add("closed"); await wait(1100);
    fillShow(sh); stepClass(0); showEl.classList.add("on");
    sfx.drumroll(1.1); await wait(1200);
    sfx.curtain(); showEl.classList.remove("closed"); await wait(500); sfx.fanfare();
    if (sh.step > 0) { await wait(900); }
    else return;
  }
  const prev = showCur.step ?? 0;
  showCur = sh;
  if (sh.step === prev && !isNew) return;
  stepClass(sh.step);
  if (sh.step === 1 && prev < 1) { sfx.drumroll(0.7); setTimeout(() => sfx.applause(2.6), 700); }
  if (sh.step === 2) { sfx.fanfare(); sfx.applause(3); confettiRain(); for (const id of sh.people) people.find((p) => p.d.id === id)?.emote("party"); }
}
function applyShow(sh) { showChain = showChain.then(() => doShow(sh)).catch(() => {}); }

// ---------- 명단 자동 스크롤 ----------
function autoScroll(el) {
  let dir = 1, hold = 2.5, hover = false, acc = 0;
  el.addEventListener("pointerenter", () => (hover = true));
  el.addEventListener("pointerleave", () => (hover = false));
  let last = performance.now();
  const step = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const max = el.scrollHeight - el.clientHeight;
    if (!hover && max > 4) {
      if (hold > 0) hold -= dt;
      else {
        acc += dt * 22 * dir; // 초당 22px
        const whole = Math.trunc(acc); acc -= whole;
        el.scrollTop += whole;
        if (dir > 0 && el.scrollTop >= max - 1) { dir = -1; hold = 2.5; }
        else if (dir < 0 && el.scrollTop <= 0) { dir = 1; hold = 2.5; }
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
autoScroll($("#presList"));
autoScroll($("#waitList"));

// 실시간 연결: 명단 동기화 + 입장/건배 신호 (위치는 화면마다 랜덤)
connectLive({
  state: applyState,
  join: (e) => arrive(e.id, e.message, { at: e.at }),
  update: (e) => arrive(e.id, e.message),
  cheers: cheersAll,
  chatlog: (items) => { chatItems = items.slice(-150); renderChat(); },
  chat: onChat,
  emote: onEmote,
  show: applyShow,
  status: (on) => { online = on; const el = $("#live"); el.textContent = on ? "● 실시간 연결됨" : "○ 연결 중…"; el.className = on ? "on" : ""; },
});
renderLists();
if (params.get("arrive")) setTimeout(() => randomArrivals(+params.get("arrive"), true), 400);
// 테스트용(서버에 아무것도 보내지 않음): ?debug 로 열면 콘솔에서 광장 캐릭터를 직접 움직일 수 있다
if (params.has("debug")) window.__plaza = { get people() { return people; }, styleOf, ride, explode: () => explodeTree(), leaveAll: () => { for (const id of [...present.keys()]) leave(id); }, show: (sh) => applyShow(sh) };
(document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(tick));
