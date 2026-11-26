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
import { createCurtain } from "./curtain.js";
import { buildQuizBg, drawDoll, WALL, O_ZONE, X_ZONE } from "./quiz.js";
import { sfx, setSound, soundOn, savedPref, setTrack } from "./audio.js";
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
  blocks.push({ ell: [CX, FY + 12, 62, 16], tree: true });
}

function blocked(x, y) {
  if (typeof quizSt !== "undefined" && quizSt.q) return x < 12 || x > W - 12 || y < WALL + 16 || y > H - 6;
  if (x < 12 || x > W - 12 || y < FLOOR_TOP + 10 || y > H - 6) return true;
  if (x + (H - y) * 1.1 < 96 || W - x + (H - y) * 1.1 < 96) return true; // 화단
  for (const b of blocks) {
    if (b.tree && ceremony?.on) continue;
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
const SIT_LINES = ["두근두근 누가 받을까?", "대표님 멋있어요! 👏", "박수 준비~ 👏👏", "저 상 받고 싶다…", "곧 시작한다!", "조용조용 🤫", "올해 MVP 누구일까?", "사진 찍어야지 📸", "앞에 잘 보여요?", "와 무대 멋지다", "떨린다…", "상품 뭐예요? 🎁", "기대된다 ✨", "누구 상 받을 것 같아요?"];
const CEO_LINES = ["여러분 올 한 해 정말 고생 많으셨습니다!", "자, 시상식을 시작하겠습니다 🎤", "모두 박수 한번 주세요 👏", "내년에도 함께 갑시다!", "에헴… 마이크 테스트 🎤", "오늘 다들 멋지네요!"];
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
    if (!s) this.cache.set(k, (s = renderSprite(quizVis ? { ...this.style, sp: "track" } : this.style, dir, step, blink)));
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
    if (this.seat && this.state !== "chat") { this.seatLogic(dt); return; }
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
  /** 시상식 준비: 자리로 걸어가서 앉아(또는 서서) 단상을 본다 */
  seatLogic(dt) {
    const s = this.seat, dx = s.x - this.x, dy = s.y - this.y, d = Math.hypot(dx, dy);
    if (s.jump && d > 1.5 && d < 40) {
      // 단상 앞에 오면 폴짝 올라간다
      this.x = s.x; this.y = s.y; this.hop = 0.7; this.say(choose(CEO_LINES), 4); return;
    }
    if (d > 1.5) {
      if (this.timer > 0 && this.state !== "walk") { this.timer -= dt; return; } // 감정표현 중엔 잠깐 멈춤
      const tx = s.jump ? s.jx : s.x, ty = s.jump ? s.jy : s.y, ex = tx - this.x, ey = ty - this.y, e = Math.max(0.001, Math.hypot(ex, ey));
      const sp = this.speed * (s.flee ? 7 : s.fast ? 4.2 : 1.5);
      if (e < 1.5 && s.jump) { this.x = s.x; this.y = s.y; this.hop = 0.7; this.say(choose(CEO_LINES), 4); return; }
      this.state = "walk";
      this.x += (ex / e) * Math.min(sp * dt, e); this.y += (ey / e) * Math.min(sp * dt, e);
      if (Math.abs(ex) > Math.abs(ey) * 0.9) { this.dir = 2; this.flip = ex < 0; } else this.dir = ey > 0 ? 0 : 1;
      return;
    }
    if (s.flee) { this.zapped = true; this.seat = null; return; }
    this.x = s.x; this.y = s.y;
    if (this.state === "walk") { this.state = s.stand ? "idle" : "sit"; this.timer = 0; }
    if (this.dance > 0) return;
    if (this.timer > 0) { this.timer -= dt; return; }
    this.state = s.stand ? "idle" : "sit"; this.dir = s.face ?? 1; this.flip = false;
    const lines = this.d.name === CEO_NAME ? CEO_LINES : this.d.npc ? this.d.lines : SIT_LINES;
    if (Math.random() < dt * (this.d.name === CEO_NAME ? 0.12 : this.d.npc ? 0.05 : 0.012)) this.say(choose(lines), 3.2);
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
    if (this.zapped) return;
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
    if (this.state !== "ride" && !this.onStage) for (let dx = -6; dx <= 6; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx / 6.5) ** 2 + dy * dy < 1.2) p.blendPx(Math.round(this.x) + dx, Math.round(this.y) + dy - 1, 0xff1a1222, 0.45);
    for (const f of this.fx) f.fx.draw(frame, "back");
    if (this.spo) drawSpecial(painterFor(frame), this.style.sp, "back", this.spo);
    if (this.state === "sit") {
      // 앉은 모습: 다리를 감추고 몸을 내린다(뒤에서 본 모습)
      blit(spr, SW, 22, x0, y0 + 5, this.flip);
      const cut = spr.slice(); cut.fill(0, SW * 22); this.last = { spr: cut, x0, y0: y0 + 5, flip: this.flip };
    } else {
      blit(spr, SW, SH, x0, y0, this.flip);
      this.last = { spr, x0, y0, flip: this.flip };
    }
  }
  drawFront() {
    if (this.zapped) return;
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

  // 현수막(퀴즈 운동장에선 숨김)
  if (!quizVis) {
    const cx = CX * S, cy = 30 * S;
    c.font = `bold ${big}px Galmuri14, "Apple SD Gothic Neo", sans-serif`;
    const t = "🎉 2026 U PLEAT 송년회 🎉", tw = c.measureText(t).width + 24;
    pixelBox(c, cx - tw / 2, cy - big * 0.9, tw, big * 1.8, u * 2, "#b8332f", "#1c1624");
    c.fillStyle = "#ffe08a"; c.fillText(t, cx, cy + 1);
  }

  const list = [...people].sort((a, b) => a.y - b.y);
  // 이름표
  c.font = `${nameF}px Galmuri14, "Apple SD Gothic Neo", sans-serif`;
  for (const r of list) {
    if (r.hidden || r.zapped || r.state === "ride" || r.state === "sit") continue;
    const x = r.x * S, y = (r.y + 3) * S + nameF * 0.6;
    const label = quizVis && !r.d.npc ? `${String(r.d.id + 1).padStart(3, "0")} ${r.name}` : r.name;
    const tw = c.measureText(label).width + 10;
    c.fillStyle = "rgba(20,14,30,0.72)";
    c.fillRect(Math.round(x - tw / 2), Math.round(y - nameF * 0.62), Math.round(tw), Math.round(nameF * 1.3));
    c.fillStyle = r.d.npc ? "#ffd84a" : r.style.gender === "M" ? "#a8d4ff" : "#ffc2dc";
    c.fillText(label, x, y + 1);
  }
  // 말풍선
  c.font = `${talkF}px Galmuri14, "Apple SD Gothic Neo", sans-serif`;
  for (const r of list) {
    if (!r.speech || r.zapped) continue;
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
  if (ceremony?.on) return;
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
  if (quizOn()) { r.x = W / 2 + (Math.random() - 0.5) * 60; r.y = H - 24; placeQuiz(r); }
  else if (ceremony.on) setTimeout(() => { if (ceremony.on && !r.seat) { if (r.d.name === CEO_NAME) seatEveryoneOne(r); else { const taken = people.filter((p) => p.seat).map((p) => p.seat); const s = seatsFor(people.length).find((q) => !taken.some((t) => Math.abs(t.x - q.x) < 2 && Math.abs(t.y - q.y) < 2)); if (s) r.seat = { x: s.x, y: s.y }; } } }, silent ? 0 : 4500);
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
    if (a.state !== "walk" || a.chatCool > 0 || a.seat) continue;
    for (const b of people) {
      if (b === a || b.chatCool > 0 || b.busy || b.seat) continue;
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
  const Q = quizVis;
  if (Q) frame.light.set(quizScene.light); else drawGarland(now);
  let dollY = 0;
  if (Q && quizSt.drop) {
    const D = quizSt.drop; D.t += dt;
    // 하늘에서 떨어져(가속) 쿵! 한 번 살짝 튀고 멈춤
    const fall = 0.55, t = D.t;
    if (t < fall) dollY = -170 * (1 - (t / fall) ** 2);
    else { if (!D.landed) { D.landed = true; sfx.boom(); shakeStage(true); landDust(); } const b = t - fall; dollY = b < 0.3 ? -Math.sin((b / 0.3) * Math.PI) * 10 : 0; }
    if (t > 1.2) quizSt.drop = null;
  }
  if (Q) drawDoll(painterFor(frame), CX, WALL + 6 + dollY, quizSt.dollFront, quizSt.dollFront && quizSt.q?.phase === "reveal", now);
  if (Q && quizSt.laser) {
    const L = quizSt.laser; L.t += dt;
    const p = painterFor(frame), tx = L.r.x, ty = L.r.y - 14, a = Math.max(0, 1 - L.t / 0.3);
    for (const ex of [CX - 5.5, CX + 5.5]) {
      const ey = WALL + 6 - 76 + 16.5;
      p.line(ex, ey, tx, ty, C("#ff3030"), a); p.line(ex + 1, ey, tx + 1, ty, C("#ffd0d0"), a);
      p.glowLine(ex, ey, tx, ty, 3, C("#ff2020"), 0.8 * a);
    }
    p.glow(tx, ty, 10, C("#ff4040"), 0.8 * a);
    if (L.t > 0.3) quizSt.laser = null;
  }
  const items = [...people.map((r) => ({ y: r.onStage ? 104.5 : r.y, r })), ...(Q ? [] : props.map((p) => ({ y: p.y, p })))];
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
  if (!Q) drawSnow(dt, now);
  drawStorm(dt);
  composite(frame, img.data, Q ? quizScene.bg : bg);
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
  const p = treeProp(); if (!p || tree.gone) return false;
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
const treeFromRow = () => (tree.gone ? bigTree.h : tree.boom < 0 ? 0 : Math.ceil(bigTree.h * (1 - growOf(tree.boom))));

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
const curtain = createCurtain(showEl.querySelector(".curtain"));
let showCur = null, showChain = Promise.resolve();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const HAPPY = ["감사합니다! 🙏", "제가요?! 😆", "와 대박!", "팀원들 덕분이에요!", "내년에도 열심히!", "기분 최고 ✨", "상금은요? 💰", "엄마 나 상 받았어!", "꺅! 🎉", "눈물 날 것 같아요 🥹", "다 같이 받은 상이에요!", "사랑합니다 💖"];
const HAPPY_EMO = ["🎉", "✨", "💖", "👍", "😆", "🏆", "👏", "🥳"];
// 수상자 걷기 애니메이션 상태
let walkers = [], walkRaf = 0;
function spriteImage(st, dir, step, cache) {
  const k = dir * 10 + step;
  if (cache.has(k)) return cache.get(k);
  const spr = renderSprite(st, dir, step, false), img = new ImageData(SW, SH);
  for (let i = 0; i < spr.length; i++) { const v = spr[i]; if (!v) continue; img.data[i * 4] = v & 255; img.data[i * 4 + 1] = (v >>> 8) & 255; img.data[i * 4 + 2] = (v >>> 16) & 255; img.data[i * 4 + 3] = 255; }
  cache.set(k, img); return img;
}
function fillShow(sh) {
  const n = sh.people.length, ph = n <= 6 ? 22 : n <= 12 ? 17 : n <= 24 ? 12 : 8, pf = n <= 6 ? 2.3 : n <= 12 ? 1.9 : n <= 24 ? 1.6 : 1.35;
  showCard.style.setProperty("--ph", ph + "cqh"); showCard.style.setProperty("--pf", pf + "cqw");
  showCard.innerHTML = `<div class="sh-t"><small>2026 U PLEAT AWARDS</small>${esc(sh.title)}</div>
    ${sh.sub ? `<div class="sh-s">${esc(sh.sub)}</div>` : ""}
    ${sh.prizeOn && sh.prize ? `<div class="sh-prize">상금 : ${esc(sh.prize)}</div>` : ""}
    <div class="ppl">${sh.people.filter((id) => ALL[id]).map((id) => `<div class="pp" data-id="${id}"><div class="bub"></div><div class="emo"></div><canvas width="${SW}" height="${SH}"></canvas><b>${esc(ALL[id].name)}${ALL[id].rank ? `<small>${ALL[id].rank}</small>` : ""}</b></div>`).join("")}</div>
    <div class="sh-congrats">🎉 축하합니다! 🎉</div>`;
  walkers = []; cancelAnimationFrame(walkRaf); walkRaf = 0;
}
// 수상자들이 양옆에서 걸어 나와 자기 자리(일정한 간격)에 서고, 기뻐하며 대사·이모티콘을 반복한다
function startWalkers(quiet = false) {
  const cardR = showCard.getBoundingClientRect();
  const els = [...showCard.querySelectorAll(".pp")];
  walkers = els.map((el, i) => {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2 - cardR.left, fromLeft = cx < cardR.width / 2;
    const dist = fromLeft ? cx + r.width : cardR.width - cx + r.width;
    const id = +el.dataset.id;
    return { el, id, st: styleOf(id), cache: new Map(), g: el.querySelector("canvas").getContext("2d"), bub: el.querySelector(".bub"), emo: el.querySelector(".emo"),
      x: fromLeft ? -dist : dist, from: fromLeft ? -dist : dist, delay: 0.15 + i * Math.min(0.28, 2.2 / Math.max(1, els.length)), dur: 1.3 + Math.abs(dist) / cardR.width * 1.4,
      t: 0, arrived: false, next: 1 + Math.random() * 2, hop: 0, frameKey: "" };
  });
  let last = performance.now();
  const tick = (ms) => {
    const dt = Math.min(0.05, (ms - last) / 1000); last = ms;
    let anyWalking = false;
    for (const w of walkers) {
      w.t += dt;
      const u = Math.max(0, Math.min(1, (w.t - w.delay) / w.dur));
      let dir = 2, step = 0, flip = w.from > 0, bob = 0;
      if (u < 1) {
        anyWalking = true;
        w.x = w.from * (1 - u);
        step = u > 0 ? Math.floor(w.t * 8) % 4 : 0;
        bob = step % 2 ? -1 : 0;
      } else {
        if (!w.arrived) { w.arrived = true; w.el.classList.add("here"); w.next = 0.4 + Math.random() * 1.2; }
        w.x = 0; dir = 0; flip = false;
        // 기쁨 루프: 폴짝 + 대사 또는 이모티콘
        w.next -= dt;
        const party = showEl.classList.contains("s2");
        if (w.next <= 0 && !(quiet && !w.el.classList.contains("win"))) {
          if (Math.random() < 0.5) { w.bub.textContent = choose(HAPPY); w.bub.classList.add("on"); clearTimeout(w.bt); w.bt = setTimeout(() => w.bub.classList.remove("on"), 1800); }
          else { w.emo.textContent = choose(HAPPY_EMO); w.emo.classList.remove("on"); void w.emo.offsetWidth; w.emo.classList.add("on"); }
          w.next = party ? 0.9 + Math.random() * 1.2 : 2.2 + Math.random() * 2.8;
        }
      }
      if (w.hop > 0) { w.hop -= dt; bob = -Math.round(Math.abs(Math.sin((0.55 - w.hop) / 0.55 * Math.PI)) * 4); }
      w.el.style.transform = `translate(${w.x.toFixed(1)}px, ${bob * (w.el.offsetHeight / 40)}px)`;
      w.el.classList.add("go");
      const key = dir * 10 + step + (flip ? 100 : 0);
      if (key !== w.frameKey) {
        w.frameKey = key;
        const img = spriteImage(w.st, dir, step, w.cache);
        w.g.clearRect(0, 0, SW, SH); w.g.putImageData(img, 0, 0);
        w.el.querySelector("canvas").style.transform = flip ? "scaleX(-1)" : "";
      }
    }
    walkRaf = requestAnimationFrame(tick);
  };
  walkRaf = requestAnimationFrame(tick);
  // 걸어 나오는 동안 발소리 느낌으로 박수
  setTimeout(() => sfx.applause(3), 400);
}
function stepClass(step) { showEl.classList.remove("s0", "s1", "s2", "s3"); showEl.classList.add("s" + step); }
function confettiRain() {
  const box = showEl.querySelector(".sh-conf"), cols = ["#ffd84a", "#ff5a5a", "#5ae08a", "#5ab4ff", "#ff8ad8", "#ffffff"];
  box.innerHTML = Array.from({ length: 90 }, () => `<i style="left:${Math.random() * 100}%;background:${choose(cols)};animation-duration:${(2.2 + Math.random() * 2).toFixed(2)}s;animation-delay:${(Math.random() * 1.2).toFixed(2)}s"></i>`).join("");
  setTimeout(() => (box.innerHTML = ""), 5000);
}
async function closeCurtain() {
  sfx.curtain(); showEl.classList.add("closed");
  const done = curtain.close();
  // 가운데서 거의 만나면 다음 단계로(완전히 멈출 때까지 기다리지 않음)
  for (let i = 0; i < 60 && !curtain.closedEnough; i++) await wait(50);
  await Promise.race([done, wait(900)]);
}
function openCurtain() { sfx.curtain(); showEl.classList.remove("closed"); return curtain.open(); }
async function doShow(sh) {
  const isNew = sh && (!showCur || showCur.sid !== sh.sid);
  if (!sh) {
    if (!showCur) return;
    showCur = null;
    await closeCurtain();
    cancelAnimationFrame(walkRaf); walkRaf = 0; walkers = [];
    stopRace(); showEl.classList.remove("on", "s0", "s1", "s2", "s3", "up"); showCard.innerHTML = "";
    await wait(300); openCurtain();
    return;
  }
  if (sh.kind === "upleaders") return doUpl(sh, isNew);
  if (isNew) {
    showCur = { ...sh, step: 0 };
    await closeCurtain();
    stopRace(); showEl.classList.remove("up", "s3");
    fillShow(sh); stepClass(0); showEl.classList.add("on");
    sfx.drumroll(1.1); await wait(1200);
    openCurtain(); await wait(500); sfx.fanfare();
    if (sh.step > 0) await wait(900);
    else return;
  }
  const prev = showCur.step ?? 0;
  showCur = sh;
  if (sh.step === prev && !isNew) return;
  stepClass(sh.step);
  if (sh.step >= 1 && prev < 1) { sfx.drumroll(0.7); await wait(80); startWalkers(); setTimeout(() => coinBurst(showCard.querySelector(".sh-prize")), 900); }
  if (sh.step === 0) { cancelAnimationFrame(walkRaf); walkRaf = 0; walkers = []; showCard.querySelectorAll(".pp").forEach((e) => { e.classList.remove("here"); e.style.transform = ""; }); }
  if (sh.step === 2) { sfx.fanfare(); sfx.applause(3); confettiRain(); for (const id of sh.people) people.find((p) => p.d.id === id)?.emote("party"); }
}
// ---------- 올해의 유플리더스: 오프닝 → 상 소개 → 레이스(막판 역전) → 축하 ----------
function uplHTML(sh) {
  const w = ALL[sh.winner];
  const cands = [sh.winner, ...(sh.rivals || [])].filter((id) => ALL[id]).sort(() => Math.random() - 0.5);
  return `<div class="up-p up-0"><div class="sh-t"><small>2026 U PLEAT AWARDS</small>올해의 유플리더스</div></div>
    <div class="up-p up-1"><div class="sh-t"><small>올해의 유플리더스</small>${esc(sh.title)}</div>${sh.desc ? `<p class="up-desc">${esc(sh.desc)}</p>` : ""}${sh.prizeOn && sh.prize ? `<div class="sh-prize">상금 : ${esc(sh.prize)}</div>` : ""}</div>
    <div class="up-p up-2"><div class="sh-t sm"><small>올해의 유플리더스</small>${esc(sh.title)}</div>
      <div class="ppl up-c">${cands.map((id) => `<div class="pp" data-id="${id}"><div class="bub"></div><div class="emo"></div><canvas width="${SW}" height="${SH}"></canvas><b>${esc(ALL[id].name)}${ALL[id].rank ? `<small>${ALL[id].rank}</small>` : ""}</b></div>`).join("")}</div>
      <div class="dimmer"></div><div class="cone"></div>
      <div class="up-win"><div class="sh-t"><small>올해의 유플리더스</small>${esc(sh.title)}</div><div class="up-frame"><canvas width="${SW}" height="${SH}"></canvas></div><div class="up-name">${w ? esc(w.name) : ""}${w?.rank ? `<small>${w.rank}</small>` : ""}</div>${sh.quote ? `<p class="up-desc">“${esc(sh.quote)}”</p>` : ""}</div></div>`;
}
// 후보들이 걸어 나와 줄지어 서면 → 스포트라이트가 사람들 사이를 오가다 수상자에서 멈춤 → 나머지 퇴장, 수상자 확대
let spotRaf = 0;
function stopRace() { cancelAnimationFrame(spotRaf); spotRaf = 0; }
async function startSpotlight(sh) {
  stopRace();
  const panel = showCard.querySelector(".up-2");
  showCard.style.setProperty("--ph", "20cqh"); showCard.style.setProperty("--pf", "2cqw");
  panel.classList.remove("done", "dark");
  startWalkers(true);
  const els = [...panel.querySelectorAll(".up-c .pp")];
  if (els.length < 2) { await wait(2200); return revealWinner(sh); }
  await wait(1000 + els.length * 300 + 1600);
  if (!showCur || showCur.sid !== sh.sid || showCur.step !== 2) return;
  panel.classList.add("dark"); sfx.drumroll(3.2);
  const pr = panel.getBoundingClientRect(), cone = panel.querySelector(".cone");
  const pos = (el) => { const r = el.querySelector("canvas").getBoundingClientRect(); return [r.left + r.width / 2 - pr.left, r.bottom - pr.top]; };
  const winIx = els.findIndex((e) => +e.dataset.id === sh.winner);
  const hops = 6 + els.length;
  const seq = []; let cur = Math.floor(Math.random() * els.length);
  for (let i = 0; i < hops - 1; i++) { let nx; do nx = Math.floor(Math.random() * els.length); while (nx === cur); seq.push(nx); cur = nx; }
  if (seq[seq.length - 1] === winIx) seq.push((winIx + 1) % els.length);
  seq.push(winIx);
  const [, fy] = pos(els[0]);
  cone.style.height = `calc(${fy + 4}px + 9cqh)`;
  cone.style.opacity = 1;
  // 원뿔 조명이 줄 위를 부드럽게 좌우로 훑다가 점점 느려지며 수상자에서 멈춘다
  const xs = els.map((e) => pos(e)[0]), lo = Math.min(...xs) - 10, hi = Math.max(...xs) + 10, mid = (lo + hi) / 2, amp = (hi - lo) / 2;
  const wx = xs[winIx], T = 14000;
  els.forEach((e) => (e.style.transition = "none"));
  cone.style.transition = "none";
  await new Promise((done) => {
    const t0 = performance.now(); let ph = Math.random() * 6.28, lastT = t0;
    const sm = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const step = (ms) => {
      if (!showCur || showCur.step !== 2) return done();
      const u = Math.min(1, (ms - t0) / T), dt = (ms - lastT) / 1000; lastT = ms;
      ph += dt * (1.0 - 0.75 * u); // 천천히, 갈수록 더 느려짐
      const sweep = mid + amp * Math.sin(ph), k = sm(0.72, 1, u);
      const cxNow = sweep * (1 - k) + wx * k;
      cone.style.transform = `translateX(${cxNow.toFixed(1)}px)`;
      // 빛 안에 들어온 사람만 밝게(빛의 폭에 따라 부드럽게)
      els.forEach((e, i) => { const l = Math.max(0, 1 - Math.abs(xs[i] - cxNow) / (cone.offsetWidth * 0.5)); e.style.filter = `brightness(${(0.25 + 1.15 * Math.min(1, l * 1.4)).toFixed(2)})`; });
      if (u < 1) requestAnimationFrame(step); else setTimeout(done, 700);
    };
    requestAnimationFrame(step);
  });
  if (!showCur || showCur.step !== 2) return;
  // 쾅! 수상자만 남기
  sfx.fanfare(); panel.classList.add("hit");
  // 최종 포커스: 빛이 좁아지며 수상자만 환하게
  cone.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)"; cone.style.transform = `translateX(${wx}px) scaleX(.72)`;
  els.forEach((e, i) => { e.style.transition = "opacity .8s, filter .6s"; if (i !== winIx) { e.style.filter = "brightness(.15)"; e.classList.add("lose"); } else { e.style.filter = "brightness(1.35)"; e.classList.add("win", "lit"); } });
  await wait(1500);
  revealWinner(sh);
}
function revealWinner(sh) {
  const panel = showCard.querySelector(".up-2");
  stopRace(); cancelAnimationFrame(walkRaf); walkRaf = 0; walkers = [];
  drawSpr(showCard.querySelector(".up-frame canvas"), sh.winner, 0, 0, new Map());
  panel.classList.add("done");
  sfx.applause(3);
  people.find((p) => p.d.id === sh.winner)?.emote("party");
}
// 픽셀 동전 스프라이트(10×10, 4프레임 회전)
const COIN_URL = (() => {
  const c = document.createElement("canvas"); c.width = 40; c.height = 10; const g = c.getContext("2d");
  const O = "#5a3a08", D = "#c8941a", M = "#ffd84a", L = "#fff3b0";
  const frames = [
    ["...OOOO...", "..OMMMMO..", ".OMLLMMDO.", "OMLMMMMDDO", "OMLMDDMMDO", "OMMMDDMMDO", "OMMMMMMDDO", ".OMMMMDDO.", "..ODDDDO..", "...OOOO..."],
    ["....OOO...", "...OMMMO..", "...OLMDO..", "..OLMMDDO.", "..OLMMMDO.", "..OMMMMDO.", "..OMMMDDO.", "...OMMDO..", "...ODDDO..", "....OOO..."],
    ["....OO....", "....OMO...", "....OLO...", "....OMO...", "....OMO...", "....OMO...", "....OMO...", "....ODO...", "....ODO...", "....OO...."],
    ["...OOO....", "..OMMMO...", "..ODMLO...", ".ODDMMLO..", ".ODMMMLO..", ".ODMMMMO..", ".ODDMMMO..", "..ODMMO...", "..ODDDO...", "...OOO...."],
  ];
  frames.forEach((rows, f) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = { O, D, M, L }[ch]; g.fillRect(f * 10 + x, y, 1, 1); })));
  return c.toDataURL();
})();
// 상금이 나올 때 동전이 분수처럼 솟았다가 중력으로 떨어져 바닥에서 통통 튄다
function coinBurst(el) {
  if (!el) return;
  showEl.style.setProperty("--coin", `url(${COIN_URL})`);
  const host = showEl, hr = host.getBoundingClientRect(), er = el.getBoundingClientRect();
  const ox = er.left + er.width / 2 - hr.left, oy = er.top - hr.top, floor = hr.height * 0.96, U = hr.width / 100; // U = 1cqw
  const box = document.createElement("div"); box.className = "coins"; host.appendChild(box);
  const coins = []; let spawned = 0, last = performance.now(), t = 0;
  const N = 34, G = 95 * U;
  sfx.coins();
  const tick = (ms) => {
    const dt = Math.min(0.033, (ms - last) / 1000); last = ms; t += dt;
    // 0.55초 동안 줄줄이 뿜어 올림
    while (spawned < N && spawned < (t / 0.55) * N) {
      const i = document.createElement("i"); box.appendChild(i);
      coins.push({ el: i, x: ox + (Math.random() - 0.5) * 2 * U, y: oy, vx: (Math.random() - 0.5) * 70 * U, vy: -(58 + Math.random() * 30) * U, life: 0, b: 0 });
      spawned++;
      if (spawned % 8 === 0) sfx.coins();
    }
    for (const c of coins) {
      c.life += dt; c.vy += G * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.y > floor && c.vy > 0) { c.y = floor; c.vy *= -0.42; c.vx *= 0.7; c.b++; }
      const a = c.life > 2.2 ? Math.max(0, 1 - (c.life - 2.2) / 0.5) : 1;
      c.el.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`; c.el.style.opacity = a;
    }
    if (t < 3) requestAnimationFrame(tick); else box.remove();
  };
  requestAnimationFrame(tick);
}
function drawSpr(cv, id, dir, step, cache) {
  const img = spriteImage(styleOf(id), dir, step, cache);
  const g = cv.getContext("2d"); g.clearRect(0, 0, SW, SH); g.putImageData(img, 0, 0);
}
async function doUpl(sh, isNew) {
  if (isNew) {
    showCur = { ...sh, step: 0 };
    await closeCurtain();
    stopRace(); showEl.classList.remove("s0", "s1", "s2", "s3"); showEl.classList.add("up", "on");
    showCard.innerHTML = uplHTML(sh); stepClass(0);
    sfx.drumroll(1.1); await wait(1200);
    openCurtain(); await wait(500); sfx.fanfare();
    if (sh.step === 0) return;
    await wait(700);
  }
  const prev = showCur.step ?? 0;
  showCur = sh;
  if (sh.step === prev && !isNew) return;
  stepClass(sh.step);
  if (sh.step === 1) { stopRace(); sfx.curtain(); setTimeout(() => coinBurst(showCard.querySelector(".up-1 .sh-prize")), 700); }
  if (sh.step === 2 && prev !== 3) startSpotlight(sh);
  if (sh.step === 3) { if (!showCard.querySelector(".up-2.done")) revealWinner(sh); sfx.fanfare(); sfx.applause(3); confettiRain(); }
}
function applyShow(sh) { setTrack(sh ? "award" : quizOn() ? "quiz" : "carol"); showChain = showChain.then(() => doShow(sh)).catch(() => {}); }

// ---------- 기본 메뉴: OX 퀴즈 ----------
var quizSt = { q: null, votes: {}, dollFront: false };
let quizScene = null;
function quizOn() { return !!quizSt?.q; }
// 화면에 운동장을 그리는지(폭풍 전환 중간에 바뀜)
var quizVis = false;
const storm = { t: -1, to: false, parts: [] };
function startStorm(to) {
  storm.t = 0; storm.to = to; storm.swapped = false;
  storm.parts = Array.from({ length: 220 }, () => ({ x: -Math.random() * W, y: Math.random() * H, v: 260 + Math.random() * 420, l: 6 + Math.random() * 30, c: choose(["#e8d6b0", "#c9a46c", "#ffffff", "#9a8a70", "#6fbf55"]) }));
  sfx.dust(); sfx.boom(); shakeStage();
}
function drawStorm(dt) {
  if (storm.t < 0) return;
  storm.t += dt;
  const T = 1.8, u = storm.t / T, p = painterFor(frame);
  // 왼쪽에서 오른쪽으로 쓸고 가는 모래바람 띠: 띠가 지나간 자리부터 새 배경
  const front = -120 + u * (W + 240);
  if (!storm.swapped && u > 0.5) {
    storm.swapped = true; quizVis = storm.to;
    if (storm.to) quizSt.drop = { t: 0, landed: false };
    for (const r of people) { r.cache.clear(); r.actor = actorFor(r.sprite(0, 0, false)); }
  }
  for (let x = Math.max(0, Math.floor(front - 120)); x < Math.min(W, front + 40); x++) {
    const k = 1 - Math.abs(x - front + 40) / 120;
    if (k > 0) for (let y = 0; y < H; y += 2) p.blendPx(x, y + ((x + y) & 1), 0xff6a5a40, Math.min(0.85, k * 0.9));
  }
  for (const q of storm.parts) {
    q.x += q.v * dt * 1.6; q.y += Math.sin(q.x / 30) * 0.6;
    if (q.x > W + 40) continue;
    p.rect(Math.round(q.x), Math.round(q.y), Math.round(q.l), 1, C(q.c), 0.85);
  }
  if (u >= 1) storm.t = -1;
}
function landDust() {
  for (let i = 0; i < 70; i++) { const a = Math.PI + Math.random() * Math.PI; tree.dust.push({ x: CX + (Math.random() - 0.5) * 30, y: WALL + 6, vx: Math.cos(a) * (40 + Math.random() * 90), vy: Math.sin(a) * (10 + Math.random() * 30), c: C(choose(["#e8d6b0", "#c9a46c", "#f4ead4"])), ash: C("#d8c49a"), life: 0.6 + Math.random() * 0.6, t: 0 }); }
}
function shakeStage(big) { const st = $("#stage"); st.classList.remove("hit", "boom"); void st.offsetWidth; st.classList.add(big ? "boom" : "hit"); }
const QUIZ_LINES = ["이거 O 아니야?", "X 같은데…", "무궁화 꽃이…", "살려줘요 😱", "확실해!", "아 몰라 찍자", "옆사람 따라가야지", "두근두근", "정답 뭐야??"];
function spotIn(zone) { for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * (zone.r - 14); const x = zone.x + Math.cos(a) * d, y = zone.y + Math.sin(a) * d * 0.8; if (y > WALL + 20 && y < H - 8) return { x, y }; } return { x: zone.x, y: zone.y }; }
function middleSpot() { return { x: W / 2 + (Math.random() - 0.5) * 70, y: WALL + 34 + Math.random() * (H - WALL - 48) }; }
function placeQuiz(r) {
  if (r.d.npc) { r.seat = { x: r.d.id === -1 ? CX - 60 : CX + 60, y: WALL + 22, stand: true, face: 0 }; return; }
  const v = quizSt.votes[r.d.id];
  if (!v) { r.seat = null; if (r.state === "sit") r.state = "idle"; r.timer = Math.random() * 1.5; return; } // 안 고른 사람은 운동장을 자유롭게 돌아다님
  const s = v === "O" ? spotIn(O_ZONE) : spotIn(X_ZONE);
  if ((quizSt.q?.out || []).includes(r.d.id) && quizSt.q?.phase !== "reveal") { r.zapped = true; r.seat = null; return; }
  r.seat = { x: s.x, y: s.y, stand: true, face: 1, fast: true }; r.timer = 0;
}
function applyQuiz(q, votes) {
  const was = quizOn(), prevIdx = quizSt.q?.idx, prevPhase = quizSt.q?.phase;
  quizSt.q = q && q.on ? q : null; quizSt.votes = votes || {};
  if (quizOn() && !quizScene) quizScene = buildQuizBg(W, H);
  if (quizOn() !== was) {
    startStorm(quizOn());
    if (quizOn()) {
      setTrack("quiz");
      for (const r of people) { r.speech = null; r.seat = null; r.state = "idle"; r.timer = 4; r.dir = 0; }
      // 인형이 떨어진 뒤: 모두 어리둥절 → 잠시 뒤 준비 광장(가운데)으로
      setTimeout(() => { if (!quizOn()) return; for (const r of people) { r.dir = 0; r.state = "idle"; r.timer = 3; r.play(FX.confused, true, 2.2); if (Math.random() < 0.45) r.say(choose(["뭐야?!", "저게 뭐야…", "어디야 여기?", "헉 인형이…", "???"]), 2); } }, 1500);
      setTimeout(() => { if (!quizOn()) return; for (const r of people) placeQuiz(r); }, 3900); setTimeout(() => { if (quizOn()) $("#quizBar").hidden = false; }, 900); }
    else {
      setTrack("carol"); $("#quizBar").hidden = true; quizSt.laser = null;
      for (const r of people) r.zapped = false;
      for (const r of people) { r.seat = null; r.state = "idle"; r.timer = Math.random() * 2; let k = 0; while (blocked(r.x, r.y) && k++ < 80) { r.y += 2; if (r.y > H - 10) { r.y = FLOOR_TOP + 20; r.x = 40 + Math.random() * (W - 80); } } }
      if (ceremony?.on) seatEveryone();
      return;
    }
  }
  if (!quizOn()) return;
  const Qn = quizSt.q;
  // 새 문제: 모두 가운데로, 인형은 뒤돌아 노래
  if (!was) quizSt.dollFront = false;
  else if (Qn.idx !== prevIdx || (Qn.phase === "ask" && prevPhase !== "ask")) {
    quizSt.dollFront = false;
    for (const r of people) { if (r.zapped && !(Qn.out || []).includes(r.d.id)) { r.zapped = false; r.x = W / 2 + (Math.random() - 0.5) * 60; r.y = H - 20; } placeQuiz(r); r.fx = r.fx.filter((f) => !f.loop); }
    sfx.drumroll(0.6);
  }
  if (Qn.phase === "reveal" && prevPhase !== "reveal") {
    quizSt.dollFront = true; sfx.boom();
    setTimeout(() => {
      const losers = [];
      for (const r of people) {
        if (r.d.npc) continue;
        const v = quizSt.votes[r.d.id];
        if ((quizSt.q.out || []).includes(r.d.id) && !v && r.zapped) continue; // 이미 탈락한 사람
        if (v === Qn.a) r.emote("party"); else { losers.push(r); r.say(v ? "헉…! 😱" : "앗 안 골랐다…", 2); }
      }
      if (!losers.length) sfx.fanfare();
      // 인형 눈 레이저: 몇 명만 맞고(가루), 나머지는 비명 지르며 화면 밖으로 도망
      losers.sort(() => Math.random() - 0.5);
      const nZap = Math.min(losers.length, Math.max(1, Math.round(losers.length * 0.35)), 5);
      losers.slice(0, nZap).forEach((r, i) => setTimeout(() => {
        if (!quizOn() || r.zapped) return;
        quizSt.laser = { r, t: 0 }; sfx.laser(); r.speech = null;
        setTimeout(() => { if (r.last) dissolve(r); r.zapped = true; sfx.dust(); shakeStage(); }, 140);
      }, 700 + i * 320));
      setTimeout(() => losers.slice(nZap).forEach((r) => {
        if (!quizOn() || r.zapped) return;
        // 가장 가까운 화면 가장자리로 전력질주
        const dl = r.x, dr = W - r.x, db = H - r.y;
        const ex = Math.min(dl, dr, db) === db ? { x: r.x + (Math.random() - 0.5) * 60, y: H + 40 } : dl < dr ? { x: -40, y: r.y + (Math.random() - 0.5) * 40 } : { x: W + 40, y: r.y + (Math.random() - 0.5) * 40 };
        r.seat = { x: ex.x, y: ex.y, stand: true, fast: true, flee: true }; r.timer = 0; r.state = "walk"; r.fx = r.fx.filter((f) => !f.loop);
        r.speed = Math.max(r.speed, 26); r.say(choose(["도망쳐!!", "살려줘요 😱", "으아아악", "엄마!!"]), 1.6);
      }), 500);
    }, 900);
  }
  renderQuizBar();
}
function onVote(m) {
  if (!quizOn() || m.idx !== quizSt.q.idx) return;
  quizSt.votes[m.id] = m.pick;
  const r = people.find((p) => p.d.id === m.id); if (r) { placeQuiz(r); if (Math.random() < 0.4) r.say(choose(QUIZ_LINES), 2); }
  renderQuizBar();
}
function renderQuizBar() {
  const q = quizSt.q, el = $("#quizBar"); if (!q) return;
  const c = { O: 0, X: 0 }; Object.values(quizSt.votes).forEach((v) => c[v]++);
  if (q.phase === "end") { el.innerHTML = `<b>🏁 OX 퀴즈 끝!</b><span>모두 수고했어요</span>`; return; }
  if (q.phase === "ready") { el.innerHTML = `<small>OX QUIZ</small><b>곧 시작합니다!</b><span>휴대폰을 준비해 주세요 📱</span>`; return; }
  el.innerHTML = `<small>Q${q.idx + 1}${q.total ? ` / ${q.total}` : ""}</small><b>${esc(q.q)}</b>${q.phase === "reveal" ? `<i class="ans ${q.a === "O" ? "o" : "x"}">정답 ${q.a === "O" ? "⭕" : "❌"}</i>` : ""}<span>⭕ ${c.O} · ❌ ${c.X}</span>`;
}

// ---------- 기본 메뉴: 시상식 준비 모드 ----------
const CEO_NAME = "최근화";
var ceremony = { on: false };
function seatsFor(n) {
  const out = [];
  for (let y = 146; y <= 344 && out.length < n + 40; y += 19) {
    const row = [];
    for (let x = CX - 230; x <= CX + 230; x += 17) if (!blocked(x, y) && !blocked(x - 6, y) && !blocked(x + 6, y)) row.push({ x: x + ((y / 19) % 2 ? 8 : 0) * 0, y });
    row.sort((a, b) => Math.abs(a.x - CX) - Math.abs(b.x - CX));
    out.push(...row);
  }
  return out;
}
function vanishTree() {
  const p = treeProp(), s = p.spr;
  tree.gone = true;
  for (let n = 0; n < 700; n++) {
    const x = Math.floor(Math.random() * s.w), y = Math.floor(Math.random() * s.h), c = s.color[y * s.w + x];
    if (!c) continue;
    tree.dust.push({ x: p.x - s.ox + x, y: p.y - s.oy + y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40, c, life: 0.8 + Math.random() * 1.2, t: -(1 - y / s.h) * 0.2 - Math.random() * 0.8, sp: true });
  }
  sfx.dust();
}
function seatEveryone() {
  const crowd = people.filter((r) => !r.d.npc && r.d.name !== CEO_NAME);
  crowd.sort(() => Math.random() - 0.5);
  const seats = seatsFor(crowd.length);
  crowd.forEach((r, i) => { const s = seats[i] || seats[seats.length - 1]; r.seat = { x: s.x, y: s.y }; r.state = "idle"; r.timer = Math.random() * 1.2; r.speech = null; });
  const ceo = people.find((r) => r.d.name === CEO_NAME);
  if (ceo) { ceo.seat = { x: CX - 26, y: 98, jump: true, jx: CX - 26, jy: 116, stand: true, face: 0 }; ceo.timer = 0; }
  const [sa, de] = people.filter((r) => r.d.npc);
  if (ride.t > 0) ride.t = 0.001;
  if (sa) sa.seat = { x: CX - 70, y: 124, stand: true, face: 0 };
  if (de) de.seat = { x: CX + 70, y: 124, stand: true, face: 0 };
}
function seatEveryoneOne(r) { r.seat = { x: CX - 26, y: 98, jump: true, jx: CX - 26, jy: 116, stand: true, face: 0 }; }
function setCeremony(on) {
  if (on === ceremony.on) return;
  ceremony.on = on;
  if (on) {
    vanishTree();
    seatEveryone();
  } else {
    for (const r of people) { if (r.seat) { r.seat = null; r.onStage = false; if (r.state === "sit") r.state = "idle"; r.timer = Math.random() * 2; r.hop = 0.5; } }
    // 단상 위 사람은 내려온다
    const ceo = people.find((r) => r.d.name === CEO_NAME);
    if (ceo && ceo.y < 112) { ceo.y = 118; ceo.hop = 0.6; }
    // 트리 자리에 앉아 있던 사람은 바깥으로 밀어낸다
    for (const r of people) {
      let k = 0;
      while (blocked(r.x, r.y) && k++ < 60) { const an = Math.atan2(r.y - (FY + 12), r.x - CX) || 0; r.x += Math.cos(an) * 3; r.y += Math.sin(an) * 1.6 + (k > 30 ? 2 : 0); }
    }
    tree.gone = false; tree.bits = []; tree.boom = GROW_AT; sfx.regrow();
    ride.cool = rnd(10, 20);
  }
}
// 단상 위에 있는지(그리기 순서·그림자용)
setInterval(() => { for (const r of people) r.onStage = !!(r.seat && r.seat.jump && r.y < 108); }, 200);

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
  mode: (m) => setCeremony(m === "ceremony"),
  quiz: (q, v) => applyQuiz(q, v),
  vote: onVote,
  status: (on) => { online = on; const el = $("#live"); el.textContent = on ? "● 실시간 연결됨" : "○ 연결 중…"; el.className = on ? "on" : ""; },
});
renderLists();
if (params.get("arrive")) setTimeout(() => randomArrivals(+params.get("arrive"), true), 400);
// 테스트용(서버에 아무것도 보내지 않음): ?debug 로 열면 콘솔에서 광장 캐릭터를 직접 움직일 수 있다
if (params.has("debug")) window.__plaza = { get people() { return people; }, styleOf, ride, explode: () => explodeTree(), leaveAll: () => { for (const id of [...present.keys()]) leave(id); }, show: (sh) => applyShow(sh), quiz: (q, v) => applyQuiz(q, v), vote: onVote, get qs() { return quizSt; }, ceremony: (on) => setCeremony(on), arrive: (id, m) => arrive(id, m || "") };
(document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(tick));
