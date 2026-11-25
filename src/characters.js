// 절차적 픽셀 캐릭터: 스타일(성별·피부·헤어·상의·하의·소품) → 방향·걸음별 스프라이트
import { hex, rgb, red, green, blue } from "../pixelfx/core/index.js";

export const SW = 18, SH = 28; // 스프라이트 크기, 발 = 아래 중앙

const OUT = hex("#1c1624");
const shadeC = (c, k) => rgb(Math.min(255, red(c) * k), Math.min(255, green(c) * k), Math.min(255, blue(c) * k));

// ---------- 스타일 풀 ----------
const SKINS = ["#ffe3cc", "#f6cfae", "#eab58e", "#cf9468", "#a8704a", "#7d5034"];
const HAIR_COLORS = ["#231c26", "#3b2a22", "#5e3a24", "#8a5a33", "#d9a94e", "#f0d68a", "#b8432f", "#e7859f", "#6a7fd8", "#c7c9d6", "#5fbfa4", "#8d5cc4"];
const CLOTH = ["#e9e4da", "#2b2d3a", "#d94f4f", "#f08a3c", "#f2c84b", "#6cbf5a", "#3f9e8c", "#4a7fd4", "#2f4a8c", "#8a63d2", "#e27fb4", "#9a6a4a", "#5d6470", "#c8d36a", "#7fc6e8"];
const BOTTOMS = ["#2f3a5c", "#3d5f9a", "#23232b", "#6b5a48", "#8a8f99", "#c9b28a", "#5a3a5c", "#3e5a45"];
const SHOES = ["#f4f1ea", "#23232b", "#7a4a2a", "#d94f4f", "#4a7fd4", "#f2c84b"];

const HAIR_M = ["short", "side", "spiky", "buzz", "curly", "mid", "parted"];
const HAIR_F = ["long", "bob", "pony", "twin", "bun", "wavy", "pixie", "curly"];
const TOP_M = ["tee", "long", "hoodie", "stripe", "jacket", "shirt", "overall"];
const TOP_F = ["tee", "long", "hoodie", "stripe", "jacket", "blouse", "dress", "overall"];
const BOT_M = ["pants", "jeans", "shorts"];
const BOT_F = ["pants", "jeans", "shorts", "skirt", "longskirt"];
// 크리스마스 코스튬(꾸미기 전용). santa·elf·santadress는 정해진 색으로 그린다.
const XTOP_M = ["santa", "elf", "xsweater"], XTOP_F = ["santa", "santadress", "elf", "xsweater"];
const XHATS = ["santa", "antler", "elfhat"], XACCS = ["rednose", "scarf"];
export const FIXED_TOPS = ["santa", "elf", "santadress"];
// 특수 복장(관종 옷): 기본 복장 위에 통째로 덮어쓰고, 광장에서는 special.js가 효과를 붙인다.
export const SPECIALS = ["none", "gold", "disco", "tree", "neon", "angel"];
function specialize(st) {
  const sp = st.sp;
  if (!sp || sp === "none") return st;
  const o = { ...st, hat: "none" };
  if (sp === "gold") Object.assign(o, { top: "jacket", topColor: "#f2c84b", top2: "#fff0a0", bottom: "pants", bottomColor: "#d9a92a", shoes: "#f2c84b", acc: "sunglasses" });
  if (sp === "disco") Object.assign(o, { top: "jacket", topColor: "#c9cdd8", top2: "#ff5ac8", bottom: "pants", bottomColor: "#a9adbb", shoes: "#f4f1ea", acc: "sunglasses" });
  if (sp === "tree") Object.assign(o, { top: "tee", topColor: "#2f8a44", bottom: "pants", bottomColor: "#6a4a2a", shoes: "#6a4a2a", acc: "none" });
  if (sp === "neon") Object.assign(o, { top: "hoodie", topColor: "#262236", top2: "#5af0ff", bottom: "pants", bottomColor: "#1e1a2c", shoes: "#ff5ac8", acc: "sunglasses" });
  if (sp === "angel") Object.assign(o, { top: "dress", topColor: "#f6f2ea", top2: "#ffd84a", bottom: "dress", shoes: "#f6f2ea", acc: "none" });
  return o;
}
function paintSpecial(g, st, dir) {
  const sp = st.sp;
  if (sp === "gold") {
    // 왕관
    const G = hex("#ffd84a"), GD = hex("#d9a92a");
    g.hline(0, [5, 8, 9, 12], G, 8); g.hline(1, [5, 6, 8, 9, 11, 12], G, 8);
    g.rows([[2, 5, 12]], G, 8); g.rows([[3, 5, 12]], GD, 8);
    if (dir !== 1) { g.set(6, 2, hex("#ff4a5a"), 8); g.set(11, 2, hex("#ff4a5a"), 8); g.set(8, 2, hex("#5ab4ff"), 8); g.set(9, 2, hex("#5ab4ff"), 8); }
  }
  if (sp === "tree") {
    const G = hex("#2f9a4a"), GD = hex("#22743a"), Y = hex("#ffd84a");
    g.rows([[14, 7, 10], [15, 6, 11], [16, 5, 12]], G, 3);
    g.rows([[17, 5, 12], [18, 4, 13], [19, 3, 14]], G, 3);
    g.rows([[20, 4, 13], [21, 3, 14], [22, 2, 15]], G, 3);
    g.hline(16, [5, 12], GD, 3); g.hline(19, [3, 14], GD, 3); g.hline(22, [2, 15], GD, 3);
    g.rect(7, 23, 10, 23, hex("#7a4a2a"), 4);
    g.rows([[1, 8, 9], [2, 6, 11], [3, 7, 10]], Y, 8); g.set(8, 0, Y, 8); g.set(7, 4, Y, 8); g.set(10, 4, Y, 8);
  }
}
export const isDress = (top) => top === "dress" || top === "santadress";
const HATS = ["none", "none", "none", "none", "cap", "beanie"];
const ACCS = ["none", "none", "none", "glasses", "sunglasses", "headphones", "backpack"];

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];

// ---------- 이름 ----------
const SUR = "김김김이이이박박최정강조윤장임한오서신권황안송류홍전고문양손배백허남심노하곽성차주우구민유진지엄채원천방공현함변염여추도소석선설마길연위표명".split("");
const GIVEN_M = ["민준", "서준", "도윤", "예준", "시우", "하준", "주원", "지호", "지후", "준우", "현우", "도현", "건우", "우진", "선우", "유준", "연우", "정우", "승우", "시윤", "준혁", "은우", "지환", "승현", "민재", "태윤", "재원", "한결", "동현", "성민", "윤호", "진혁", "태호", "규민", "상우", "영훈", "경민", "재현", "준서", "현준"];
const GIVEN_F = ["서연", "서윤", "지우", "서현", "민서", "하은", "하윤", "윤서", "지유", "지민", "채원", "수아", "지아", "다은", "예은", "은서", "소율", "예린", "수빈", "지원", "유나", "하린", "시아", "가은", "나연", "예나", "소연", "혜원", "다인", "유진", "세아", "아린", "채은", "보람", "미소", "은지", "현아", "나래", "수진", "가영"];

/** n명의 고유한 주민을 만든다. 짝수번째 남, 홀수번째 여 → 앞에서 몇 명을 잘라도 5:5. */
// 실제 명단에는 자연스러운 머리색·피부톤을 기본으로(본인이 입장 후 바꿀 수 있음)
const NATURAL_HAIR = ["#231c26", "#231c26", "#3b2a22", "#3b2a22", "#5e3a24", "#8a5a33"];
const NATURAL_SKIN = ["#ffe3cc", "#f6cfae", "#f6cfae", "#eab58e"];
/** roster가 있으면 그 이름·성별로, 없으면 n명을 무작위로 만든다. */
export function makePopulation(n, seed = 2026, roster = null) {
  const r = mulberry(seed), names = new Set(), looks = new Set(), out = [];
  if (roster) n = roster.length;
  for (let i = 0; i < n; i++) {
    const gender = roster ? roster[i].gender : i % 2 === 0 ? "M" : "F";
    let name;
    if (roster) name = roster[i].name;
    else do name = pick(r, SUR) + pick(r, gender === "M" ? GIVEN_M : GIVEN_F); while (names.has(name));
    names.add(name);
    let st, key;
    do {
      st = {
        gender,
        skin: pick(r, roster ? NATURAL_SKIN : SKINS),
        hairColor: pick(r, roster && r() < 0.85 ? NATURAL_HAIR : HAIR_COLORS),
        hair: pick(r, gender === "M" ? HAIR_M : HAIR_F),
        top: pick(r, gender === "M" ? TOP_M : TOP_F),
        topColor: pick(r, CLOTH),
        top2: pick(r, CLOTH),
        bottom: pick(r, gender === "M" ? BOT_M : BOT_F),
        bottomColor: pick(r, BOTTOMS),
        shoes: pick(r, SHOES),
        hat: pick(r, HATS),
        hatColor: pick(r, CLOTH),
        acc: pick(r, ACCS),
        accColor: pick(r, CLOTH),
      };
      if (st.top2 === st.topColor) st.top2 = CLOTH[(CLOTH.indexOf(st.topColor) + 5) % CLOTH.length];
      if (st.top === "dress") st.bottom = "dress";
      if (st.hat !== "none" && (st.hair === "bun" || st.hair === "twin") && r() < 0.7) st.hat = "none";
      key = [st.hair, st.hairColor, st.top, st.topColor, st.bottom, st.hat, st.acc].join("|");
    } while (looks.has(key));
    looks.add(key);
    out.push({ id: i, name, style: st });
  }
  return out;
}

// ---------- 스프라이트 페인터 ----------
// region: 1 피부 2 머리 3 상의 4 하의 5 신발 6 포인트 7 눈(음영 없음) 8 모자
class Grid {
  constructor() {
    this.c = new Uint32Array(SW * SH);
    this.r = new Uint8Array(SW * SH);
  }
  set(x, y, c, reg) {
    if (x < 0 || y < 0 || x >= SW || y >= SH) return;
    this.c[y * SW + x] = c; this.r[y * SW + x] = reg;
  }
  rect(x0, y0, x1, y1, c, reg) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c, reg); }
  hline(y, xs, c, reg) { for (const x of xs) this.set(x, y, c, reg); }
  rows(spec, c, reg) { for (const [y, x0, x1] of spec) this.rect(x0, y, x1, y, c, reg); }
}

function headShape(g, skin) {
  g.rows([[5, 5, 12], [6, 4, 13], [7, 4, 13], [8, 4, 13], [9, 4, 13], [10, 4, 13], [11, 4, 13], [12, 4, 13], [13, 5, 12]], skin, 1);
}

// 앞머리 + 정수리. dir: 0 앞, 1 뒤, 2 옆(오른쪽 봄)
function paintHair(g, st, dir, back) {
  const H = hex(st.hairColor), HL = shadeC(H, 1.25), R = 2;
  const cap = () => g.rows([[3, 6, 11], [4, 5, 12], [5, 4, 13], [6, 4, 13]], H, R);
  const s = st.hair;
  // 뒤로 길게 떨어지는 머리(몸 뒤에 그려야 하는 부분)
  if (back) {
    if (dir === 0 || dir === 2) {
      if (s === "long" || s === "wavy") {
        const x0 = dir === 2 ? 3 : 3, x1 = dir === 2 ? 9 : 14;
        for (let y = 7; y <= 18; y++) g.rect(x0 + (s === "wavy" && y % 3 === 0 ? -1 : 0), y, x1 + (s === "wavy" && y % 3 === 1 ? 1 : 0), y, H, R);
      }
      if (s === "pony" && dir === 0) g.rows([[6, 14, 15], [7, 14, 15], [8, 14, 15], [9, 14, 15], [10, 14, 15], [11, 14, 14]], H, R);
      if (s === "twin" && dir === 0) for (let y = 7; y <= 15; y++) { const w = y > 13 ? 0 : 1; g.rect(2 - w, y, 3, y, H, R); g.rect(14, y, 15 + w, y, H, R); }
    }
    if (dir === 1) {
      if (s === "long" || s === "wavy") g.rect(3, 6, 14, 18, H, R);
    }
    return;
  }
  if (dir === 1) {
    // 뒷모습: 머리 전체
    g.rows([[3, 6, 11], [4, 5, 12], [5, 4, 13], [6, 4, 13], [7, 4, 13], [8, 4, 13], [9, 4, 13], [10, 4, 13], [11, 4, 13], [12, 4, 13], [13, 5, 12]], H, R);
    if (s === "buzz") g.rows([[11, 5, 12], [12, 5, 12], [13, 6, 11]], hex(st.skin), 1);
    if (s === "short" || s === "spiky" || s === "side" || s === "parted" || s === "pixie") g.rows([[13, 6, 11]], hex(st.skin), 1);
    if (s === "bob") g.rows([[13, 3, 14], [12, 3, 3], [12, 14, 14]], H, R);
    if (s === "pony") { g.rect(8, 11, 9, 18, H, R); g.rect(7, 10, 10, 10, hex(st.top2), 6); }
    if (s === "twin") for (let y = 7; y <= 15; y++) { g.rect(1, y, 3, y, H, R); g.rect(14, y, 16, y, H, R); }
    if (s === "bun") g.rows([[0, 7, 10], [1, 6, 11], [2, 6, 11]], H, R);
    if (s === "curly") g.rows([[2, 5, 12], [3, 4, 13], [4, 3, 14], [8, 3, 14], [11, 3, 14]], H, R);
    if (s === "spiky") g.hline(2, [5, 8, 11], H, R);
    return;
  }
  if (dir === 2) {
    // 옆모습(오른쪽): 뒤통수 + 정수리
    cap();
    g.rows([[7, 4, 8], [8, 4, 8], [9, 4, 7], [10, 4, 7], [11, 4, 7], [12, 4, 6], [13, 5, 6]], H, R);
    g.rows([[7, 9, 13]], H, R); // 앞머리
    if (s === "buzz") { g.rows([[3, 6, 11], [4, 5, 12]], H, R); g.rows([[7, 9, 13], [10, 5, 7], [11, 5, 7], [12, 5, 6], [13, 5, 6]], hex(st.skin), 1); g.rows([[7, 4, 4]], H, R); }
    if (s === "spiky") { g.hline(2, [6, 9, 12], H, R); g.set(14, 5, H, R); }
    if (s === "side" || s === "parted") g.rows([[8, 11, 13]], H, R);
    if (s === "mid" || s === "bob") g.rows([[13, 4, 7], [14, 4, 6]], H, R);
    if (s === "bob") g.rows([[11, 3, 3], [12, 3, 3], [13, 3, 3]], H, R);
    if (s === "pony") g.rows([[5, 2, 3], [6, 1, 3], [7, 1, 3], [8, 1, 2], [9, 1, 2], [10, 1, 2], [11, 2, 2], [6, 4, 4]], H, R);
    if (s === "twin") for (let y = 7; y <= 15; y++) g.rect(2, y, 4, y, H, R);
    if (s === "bun") g.rows([[0, 5, 8], [1, 4, 8], [2, 4, 8]], H, R);
    if (s === "curly") g.rows([[2, 5, 11], [3, 4, 13], [4, 3, 14], [7, 3, 4], [9, 3, 4], [11, 3, 4], [8, 9, 14]], H, R);
    if (s === "pixie") g.rows([[8, 12, 13]], H, R);
    if (s === "wavy" || s === "long") g.rows([[13, 4, 8]], H, R);
    for (let x = 6; x <= 10; x++) if (g.r[4 * SW + x] === R) g.set(x, 4, HL, R);
    return;
  }
  // 앞모습
  cap();
  const bangs = {
    short: [[7, 4, 6], [7, 8, 9], [7, 11, 13], [8, 4, 4], [8, 13, 13], [9, 4, 4], [9, 13, 13]],
    side: [[7, 4, 11], [8, 4, 7], [8, 13, 13], [9, 4, 4], [9, 13, 13]],
    parted: [[7, 4, 7], [7, 10, 13], [8, 4, 5], [8, 12, 13], [9, 4, 4], [9, 13, 13]],
    spiky: [[7, 4, 5], [7, 7, 8], [7, 10, 10], [7, 12, 13], [8, 4, 4], [8, 13, 13]],
    buzz: [[7, 4, 4], [7, 13, 13]],
    mid: [[7, 4, 13], [8, 4, 5], [8, 8, 9], [8, 12, 13], [9, 4, 4], [9, 13, 13], [10, 4, 4], [10, 13, 13], [11, 4, 4], [11, 13, 13]],
    curly: [[7, 4, 13], [8, 4, 5], [8, 7, 7], [8, 10, 10], [8, 12, 13], [9, 3, 4], [9, 13, 14], [10, 3, 4], [10, 13, 14], [11, 3, 3], [11, 14, 14]],
    long: [[7, 4, 7], [7, 9, 13], [8, 4, 5], [8, 12, 13], [9, 4, 4], [9, 13, 13], [10, 4, 4], [10, 13, 13], [11, 4, 4], [11, 13, 13], [12, 4, 4], [12, 13, 13]],
    wavy: [[7, 4, 8], [7, 10, 13], [8, 4, 5], [8, 12, 13], [9, 4, 4], [9, 13, 13], [10, 3, 4], [10, 13, 14], [11, 4, 4], [11, 13, 13], [12, 3, 4], [12, 13, 14]],
    bob: [[7, 4, 13], [8, 4, 6], [8, 8, 9], [8, 11, 13], [9, 3, 4], [9, 13, 14], [10, 3, 4], [10, 13, 14], [11, 3, 4], [11, 13, 14], [12, 3, 4], [12, 13, 14], [13, 3, 5], [13, 12, 14]],
    pony: [[7, 4, 13], [8, 4, 4], [8, 7, 7], [8, 13, 13], [9, 4, 4], [9, 13, 13]],
    twin: [[7, 4, 13], [8, 4, 5], [8, 8, 9], [8, 12, 13], [9, 4, 4], [9, 13, 13]],
    bun: [[7, 4, 7], [7, 10, 13], [8, 4, 4], [8, 13, 13], [9, 4, 4], [9, 13, 13]],
    pixie: [[7, 4, 10], [8, 4, 7], [8, 13, 13], [9, 4, 5], [9, 13, 13]],
  }[s];
  g.rows(bangs, H, R);
  if (s === "spiky") { g.hline(2, [5, 8, 11], H, R); g.hline(3, [4, 13], H, R); }
  if (s === "buzz") g.rows([[3, 6, 11]], shadeC(H, 1.1), R);
  if (s === "curly") g.rows([[2, 5, 12], [3, 4, 13], [4, 3, 14], [5, 3, 14], [6, 3, 14]], H, R);
  if (s === "bun") { g.rows([[0, 7, 10], [1, 6, 11], [2, 6, 11]], H, R); g.hline(0, [8], HL, R); }
  if (s === "twin") { g.set(3, 7, hex(st.top2), 6); g.set(14, 7, hex(st.top2), 6); }
  // 하이라이트 한 줄
  for (let x = 6; x <= 9; x++) if (g.r[4 * SW + x] === R) g.set(x, 4, HL, R);
}

function paintHat(g, st, dir) {
  if (st.hat === "none") return;
  const C = hex(st.hatColor), D = shadeC(C, 0.72), L = shadeC(C, 1.2), M = 8;
  const W = hex("#f6f2ea"), RED = hex("#d8323a"), RD = shadeC(RED, 0.72);
  if (st.hat === "santa") {
    // 빨간 고깔이 오른쪽으로 처지고 끝에 하얀 방울
    g.rows([[1, 6, 11], [2, 5, 12], [3, 4, 13], [4, 4, 13], [5, 4, 13]], RED, M);
    g.rows([[0, 9, 12], [1, 12, 14], [2, 13, 14]], RED, M);
    g.set(10, 1, RD, M); g.set(13, 2, RD, M);
    g.rect(14, 3, 15, 4, W, M); g.set(15, 2, W, M);
    g.rows([[6, 4, 13]], W, M);
    if (dir !== 1) g.set(7, 2, shadeC(RED, 1.2), M);
    return;
  }
  if (st.hat === "elfhat") {
    const G = hex("#3fa052");
    g.rows([[0, 12, 13], [1, 10, 13], [2, 8, 12], [3, 6, 12], [4, 5, 13], [5, 4, 13]], G, M);
    g.rows([[6, 4, 13]], RED, M);
    g.set(14, 0, hex("#ffd84a"), M); g.set(14, 1, hex("#e0a92a"), M);
    if (dir !== 1) g.set(7, 4, shadeC(G, 1.2), M);
    return;
  }
  if (st.hat === "antler") {
    // 루돌프 뿔 머리띠
    const A = hex("#9a6a3e"), AL = hex("#c48a52"), HB = hex("#d8323a");
    const left = [[5, 3], [5, 2], [4, 1], [4, 0], [3, 2], [2, 1], [6, 1]], right = left.map(([x, y]) => [17 - x, y]);
    if (dir === 2) { for (const [x, y] of left) g.set(x + 3, y, A, M); g.set(7, 0, AL, M); g.hline(3, [6, 7, 8, 9, 10], HB, M); }
    else { for (const [x, y] of [...left, ...right]) g.set(x, y, A, M); g.set(4, 0, AL, M); g.set(13, 0, AL, M); g.hline(3, [6, 7, 8, 9, 10, 11], HB, M); }
    return;
  }
  if (st.hat === "beanie") {
    g.rows([[1, 7, 10], [2, 5, 12], [3, 4, 13], [4, 4, 13], [5, 4, 13]], C, M);
    g.rows([[6, 4, 13]], D, M);
    g.set(8, 0, L, M); g.set(9, 0, L, M);
    if (dir !== 1) g.hline(3, [6, 7], L, M);
  } else {
    // 캡 모자
    g.rows([[2, 6, 11], [3, 5, 12], [4, 4, 13], [5, 4, 13]], C, M);
    if (dir === 0) g.rows([[6, 3, 14]], D, M);
    if (dir === 2) g.rows([[6, 4, 15], [5, 14, 15]], D, M);
    if (dir === 1) g.rows([[6, 4, 13]], D, M);
    if (dir !== 1) g.set(8, 3, L, M);
  }
}

function paintFace(g, st, dir, blink) {
  const E = hex("#1c1624"), skin = hex(st.skin), cheek = hex("#f08a8a"), mouth = shadeC(skin, 0.62);
  if (dir === 1) return;
  if (dir === 0) {
    if (blink) { g.hline(10, [5, 6], E, 7); g.hline(10, [11, 12], E, 7); }
    else {
      g.rect(6, 9, 6, 10, E, 7); g.rect(11, 9, 11, 10, E, 7);
      g.set(5, 9, E, 7); g.set(12, 9, E, 7);
      if (st.gender === "F") { g.set(5, 8, E, 7); g.set(12, 8, E, 7); }
    }
    g.set(4, 11, st.gender === "F" ? cheek : skin, st.gender === "F" ? 7 : 1);
    g.set(13, 11, st.gender === "F" ? cheek : skin, st.gender === "F" ? 7 : 1);
    g.hline(12, [8, 9], mouth, 7);
  } else {
    if (blink) g.hline(10, [11, 12], E, 7);
    else { g.rect(12, 9, 12, 10, E, 7); g.set(11, 9, E, 7); if (st.gender === "F") g.set(11, 8, E, 7); }
    if (st.gender === "F") g.set(11, 11, cheek, 7);
    g.set(13, 12, mouth, 7);
    g.set(14, 10, skin, 1); // 코
    g.set(7, 10, shadeC(skin, 0.85), 1); // 귀
  }
}

function paintAcc(g, st, dir, layer) {
  const a = st.acc, F = hex("#2a2230");
  if (a === "backpack") {
    const C = hex(st.accColor), D = shadeC(C, 0.72);
    if (layer === "back" && dir === 2) g.rows([[15, 3, 5], [16, 2, 5], [17, 2, 5], [18, 2, 5], [19, 2, 5], [20, 3, 5]], C, 6);
    if (layer === "front" && dir === 0) { g.rect(6, 15, 6, 17, D, 6); g.rect(11, 15, 11, 17, D, 6); }
    if (layer === "front" && dir === 1) { g.rect(5, 15, 12, 21, C, 6); g.rect(6, 18, 11, 19, D, 6); g.hline(15, [6, 11], shadeC(C, 1.2), 6); }
    return;
  }
  if (layer !== "front") return;
  if (a === "scarf") {
    const C = hex(st.accColor), D = shadeC(C, 0.72), L = shadeC(C, 1.22);
    if (dir === 0) { g.rows([[14, 5, 12]], C, 6); g.hline(14, [6, 9, 12], L, 6); g.rect(10, 15, 11, 17, C, 6); g.hline(17, [10, 11], D, 6); }
    else if (dir === 1) { g.rows([[14, 5, 12]], C, 6); g.rect(7, 15, 8, 17, D, 6); }
    else { g.rows([[14, 6, 11]], C, 6); g.hline(14, [7, 10], L, 6); g.rect(5, 15, 5, 17, D, 6); }
    return;
  }
  if (a === "rednose") {
    const N = hex("#ff3b3b");
    if (dir === 0) { g.rect(8, 11, 9, 11, N, 7); g.set(8, 10, hex("#ffb0a8"), 7); }
    if (dir === 2) { g.set(14, 10, N, 7); g.set(15, 10, N, 7); g.set(14, 11, shadeC(N, 0.8), 7); }
    return;
  }
  if (a === "glasses" && dir === 0) {
    g.hline(8, [5, 6, 7, 10, 11, 12], F, 7); g.set(5, 9, F, 7); g.set(7, 9, F, 7); g.set(10, 9, F, 7); g.set(12, 9, F, 7);
    g.hline(10, [5, 7, 10, 12], F, 7); g.hline(9, [8, 9], F, 7);
  }
  if (a === "glasses" && dir === 2) { g.hline(8, [11, 12, 13], F, 7); g.set(13, 9, F, 7); g.hline(9, [8, 9, 10], F, 7); }
  if (a === "sunglasses" && dir === 0) { g.rect(5, 9, 7, 10, F, 7); g.rect(10, 9, 12, 10, F, 7); g.hline(9, [8, 9], F, 7); g.set(5, 9, hex("#8a7ca8"), 7); g.set(10, 9, hex("#8a7ca8"), 7); }
  if (a === "sunglasses" && dir === 2) { g.rect(11, 9, 13, 10, F, 7); g.hline(9, [8, 9, 10], F, 7); }
  if (a === "headphones") {
    const C = hex(st.accColor);
    if (dir === 0 || dir === 1) { g.hline(2, [5, 6, 7, 8, 9, 10, 11, 12], F, 7); g.set(4, 3, F, 7); g.set(13, 3, F, 7); g.rect(3, 8, 4, 10, C, 6); g.rect(13, 8, 14, 10, C, 6); }
    else { g.hline(2, [6, 7, 8, 9, 10, 11], F, 7); g.rect(7, 3, 7, 7, F, 7); g.rect(6, 8, 8, 10, C, 6); }
  }
}

function paintBody(g, st, dir, step) {
  const top = st.top, bot = st.bottom;
  const XR = hex("#d8323a"), XG = hex("#3fa052"), XW = hex("#f6f2ea"), XK = hex("#2a2230"), XY = hex("#f2c84b");
  const skin = hex(st.skin), B = hex(st.bottomColor), S = top === "elf" ? XG : hex(st.shoes);
  const T = top === "santa" || top === "santadress" ? XR : top === "elf" ? XG : hex(st.topColor), T2 = hex(st.top2);
  const longSleeve = ["long", "hoodie", "jacket", "shirt", "santa", "elf", "xsweater", "santadress"].includes(top);
  const cuff = top === "santa" || top === "santadress" ? XW : top === "elf" ? XR : top === "xsweater" ? XW : 0;
  // 다리 (걸음: 1 = 왼발 들림, 3 = 오른발 들림)
  const legC = bot === "shorts" || bot === "skirt" ? skin : B;
  const legY1 = 25;
  if (dir === 2) {
    const fwd = step === 1 ? 2 : step === 3 ? -2 : 0;
    // 뒷다리 → 앞다리
    g.rect(7 - fwd, 21, 9 - fwd, legY1, shadeC(legC, 0.82), legC === skin ? 1 : 4);
    g.rect(7 - fwd, 26, 10 - fwd, 26, shadeC(S, 0.82), 5);
    g.rect(7 + fwd, 21, 9 + fwd, legY1, legC, legC === skin ? 1 : 4);
    g.rect(7 + fwd, 26, 10 + fwd, 26, S, 5);
    if (bot === "shorts") { g.rect(6, 21, 11, 22, B, 4); }
  } else {
    const lUp = step === 1 ? 1 : 0, rUp = step === 3 ? 1 : 0;
    g.rect(6, 21, 8, legY1 - lUp, legC, legC === skin ? 1 : 4);
    g.rect(5, 26 - lUp, 8, 26 - lUp, S, 5);
    g.rect(9, 21, 11, legY1 - rUp, legC, legC === skin ? 1 : 4);
    g.rect(9, 26 - rUp, 12, 26 - rUp, S, 5);
    if (bot === "shorts") g.rect(6, 21, 11, 22, B, 4);
    if (bot === "jeans") { g.set(7, 22, shadeC(B, 1.2), 4); g.set(10, 22, shadeC(B, 1.2), 4); }
  }
  if (bot === "skirt") g.rows([[20, 5, 12], [21, 5, 12], [22, 4, 13], [23, 4, 13]], B, 4);
  if (bot === "longskirt") g.rows([[20, 5, 12], [21, 5, 12], [22, 4, 13], [23, 4, 13], [24, 4, 13], [25, 3, 14]], B, 4);
  if (bot === "pants" || bot === "jeans" || bot === "shorts") g.rect(6, 20, 11, 20, B, 4);
  if (bot === "dress") g.rows([[20, 5, 12], [21, 5, 12], [22, 4, 13], [23, 4, 13], [24, 3, 14]], T, 3);
  if (bot === "dress" && top === "santadress") g.rows([[24, 3, 14]], XW, 6);

  // 몸통
  const tx0 = dir === 2 ? 6 : 5, tx1 = dir === 2 ? 11 : 12;
  g.rect(tx0, 15, tx1, 19, T, 3);
  g.rect(dir === 2 ? 7 : 6, 14, dir === 2 ? 10 : 11, 14, T, 3);
  if (bot !== "dress" && bot !== "skirt" && bot !== "longskirt") g.rect(tx0, 20, tx1, 20, B, 4);
  else if (bot !== "dress") g.rect(tx0, 20, tx1, 20, B, 4);
  // 목
  g.rect(8, 14, 9, 14, skin, 1);
  if (dir === 1) g.rect(8, 14, 9, 14, T, 3);

  // 상의 디테일 (앞)
  if (dir === 0) {
    if (top === "stripe") { g.rect(5, 16, 12, 16, T2, 3); g.rect(5, 18, 12, 18, T2, 3); }
    if (top === "hoodie") { g.rect(6, 14, 11, 14, shadeC(T, 0.75), 3); g.set(7, 15, T2, 6); g.set(10, 15, T2, 6); g.set(7, 16, T2, 6); g.set(10, 16, T2, 6); g.rect(7, 18, 10, 19, shadeC(T, 0.82), 3); }
    if (top === "jacket") { g.rect(8, 14, 9, 19, T2, 6); g.set(7, 15, shadeC(T, 0.75), 3); g.set(10, 15, shadeC(T, 0.75), 3); }
    if (top === "shirt") { g.rect(6, 14, 11, 14, hex("#f4f1ea"), 6); g.rect(8, 15, 9, 18, T2, 6); g.set(8, 14, T2, 6); }
    if (top === "blouse") { g.rect(7, 14, 10, 15, hex("#f4f1ea"), 6); g.set(8, 16, T2, 6); g.set(9, 16, T2, 6); }
    if (top === "dress") { g.rect(5, 19, 12, 19, T2, 6); }
    if (top === "overall") { g.rect(6, 17, 11, 19, B, 4); g.rect(6, 15, 6, 16, B, 4); g.rect(11, 15, 11, 16, B, 4); g.set(7, 17, hex("#f2c84b"), 6); g.set(10, 17, hex("#f2c84b"), 6); }
    if (top === "tee" || top === "long") g.rect(7, 14, 10, 14, shadeC(T, 0.8), 3);
  } else if (dir === 2) {
    if (top === "stripe") { g.rect(6, 16, 11, 16, T2, 3); g.rect(6, 18, 11, 18, T2, 3); }
    if (top === "jacket") g.rect(11, 15, 11, 19, T2, 6);
    if (top === "hoodie") g.rect(6, 14, 7, 15, shadeC(T, 0.75), 3);
    if (top === "overall") { g.rect(9, 17, 11, 19, B, 4); g.rect(9, 15, 9, 16, B, 4); }
    if (top === "dress") g.rect(6, 19, 11, 19, T2, 6);
  } else {
    if (top === "stripe") { g.rect(5, 16, 12, 16, T2, 3); g.rect(5, 18, 12, 18, T2, 3); }
    if (top === "hoodie") g.rows([[14, 6, 11], [15, 7, 10]], shadeC(T, 0.8), 3);
    if (top === "overall") { g.rect(6, 15, 6, 19, B, 4); g.rect(11, 15, 11, 19, B, 4); g.rect(6, 19, 11, 19, B, 4); }
    if (top === "dress") g.rect(5, 19, 12, 19, T2, 6);
  }

  // 크리스마스 코스튬 디테일
  const side = dir === 2, x0 = side ? 6 : 5, x1 = side ? 11 : 12;
  if (top === "santa" || top === "santadress") {
    g.rect(x0, 18, x1, 18, XK, 6);
    if (dir === 0) { g.rect(8, 18, 9, 18, XY, 6); g.rect(8, 14, 9, 17, XW, 6); g.rect(6, 14, 11, 14, XW, 6); }
    if (side) { g.set(11, 18, XY, 6); g.rect(7, 14, 10, 14, XW, 6); }
    if (dir === 1) g.rect(6, 14, 11, 14, XW, 6);
    if (top === "santa") { g.rect(x0, 20, x1, 20, XW, 6); if (dir === 0) g.rect(8, 19, 9, 19, XW, 6); }
  }
  if (top === "elf") {
    g.rect(side ? 7 : 6, 14, side ? 10 : 11, 14, XR, 6);
    if (!side) g.hline(15, dir === 0 ? [6, 8, 9, 11] : [6, 8, 9, 11], XR, 6); else g.hline(15, [7, 9], XR, 6);
    g.rect(x0, 18, x1, 18, XK, 6);
    if (dir === 0) g.rect(8, 18, 9, 18, XY, 6); else if (side) g.set(11, 18, XY, 6);
    for (let x = x0; x <= x1; x += 2) g.set(x, 20, XR, 6);
    for (let x = x0 + 1; x <= x1; x += 2) g.set(x, 20, T, 3);
  }
  if (top === "xsweater") {
    g.rect(side ? 7 : 6, 14, side ? 10 : 11, 14, XW, 6);
    for (let x = x0; x <= x1; x += 2) { g.set(x, 15, XW, 6); g.set(x + 1, 19, XW, 6); }
    if (dir === 0) { g.set(8, 16, XY, 6); g.set(9, 16, XG, 6); g.rect(7, 17, 10, 17, XG, 6); g.rect(8, 18, 9, 18, XG, 6); g.set(7, 17, XG, 6); g.set(10, 17, hex("#ff5a5a"), 6); }
    else g.hline(17, side ? [7, 9, 11] : [6, 8, 10, 12], XW, 6);
  }

  // 팔
  const sleeve = (x, y0) => {
    for (let y = y0; y <= y0 + 4; y++) g.set(x, y, longSleeve || y < y0 + 2 ? T : skin, longSleeve || y < y0 + 2 ? 3 : 1);
    if (cuff) g.set(x, y0 + 4, cuff, 6);
    g.set(x, y0 + 5, skin, 1);
  };
  if (dir === 2) {
    const sw = step === 1 ? 1 : step === 3 ? -1 : 0;
    // 팔 하나, 앞뒤로 흔듦
    for (let y = 15; y <= 19; y++) g.set(9 + (y > 17 ? sw : 0), y, longSleeve || y < 17 ? shadeC(T, 0.88) : skin, longSleeve || y < 17 ? 3 : 1);
    g.set(9 + sw, 20, skin, 1);
    if (cuff) g.set(9 + sw, 19, cuff, 6);
    g.set(8, 15, shadeC(T, 0.88), 3);
  } else {
    const l = step === 1 ? 1 : step === 3 ? -1 : 0;
    sleeve(4, 15 + Math.max(0, -l));
    sleeve(13, 15 + Math.max(0, l));
  }
}

function shadeAndOutline(g) {
  const out = new Uint32Array(SW * SH);
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const i = y * SW + x, c = g.c[i], r = g.r[i];
      if (!c) continue;
      let k = 1;
      if (r !== 7) {
        const right = x + 1 < SW ? g.r[i + 1] : 0, below = y + 1 < SH ? g.r[i + SW] : 0, left = x > 0 ? g.r[i - 1] : 0, above = y > 0 ? g.r[i - SW] : 0;
        if (right !== r && right !== 7 && (r !== 1 || right === 0)) k = 0.8; // 오른쪽 가장자리 그림자
        else if (below !== r && below !== 7 && r === 2) k = 0.82;
        else if (left === 0 && above !== r && r !== 1) k = 1.12;
      }
      out[i] = k === 1 ? c : shadeC(c, k);
    }
  // 외곽선(4방향)
  const res = out.slice();
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const i = y * SW + x;
      if (out[i]) continue;
      if ((x > 0 && out[i - 1]) || (x + 1 < SW && out[i + 1]) || (y > 0 && out[i - SW]) || (y + 1 < SH && out[i + SW])) res[i] = OUT;
    }
  return res;
}

/** dir 0 앞 1 뒤 2 옆(오른쪽). step 0..3. */
export function renderSprite(st0, dir, step, blink = false) {
  const st = specialize(st0);
  const g = new Grid();
  paintHair(g, st, dir, true);
  paintAcc(g, st, dir, "back");
  paintBody(g, st, dir, step);
  if (dir === 1) paintAcc(g, st, dir, "front");
  headShape(g, hex(st.skin));
  paintFace(g, st, dir, blink);
  paintHair(g, st, dir, false);
  paintHat(g, st, dir);
  if (dir !== 1) paintAcc(g, st, dir, "front");
  else if (st.acc === "headphones") paintAcc(g, st, dir, "front");
  paintSpecial(g, st, dir);
  return shadeAndOutline(g);
}

/** 이펙트(pixelfx actor effects)가 감쌀 수 있도록 캐릭터의 마스크·픽셀·눈 위치를 만든다. */
export function actorFor(sprite) {
  let r0 = 0;
  while (r0 < SH && !sprite.slice(r0 * SW, (r0 + 1) * SW).some(Boolean)) r0++;
  const h = SH - r0, data = new Uint8Array(SW * h), pixels = new Uint32Array(SW * h);
  for (let i = 0; i < SW * h; i++) { pixels[i] = sprite[r0 * SW + i]; data[i] = pixels[i] ? 1 : 0; }
  const y = -h;
  return { mask: { w: SW, h, data }, pixels, x: -SW / 2, y, w: SW, h, k: 2, head: [0, y], chest: [0, y + 15], eyes: [[6, 9 - r0], [11, 9 - r0]] };
}

// ---------- 복장 설정(입장 후 내 캐릭터 꾸미기) ----------
const uniq = (a) => [...new Set(a)];
export const LABELS = {
  hair: { short: "짧은머리", side: "옆가르마", parted: "가르마", spiky: "삐죽머리", buzz: "버즈컷", mid: "중단발", curly: "곱슬", long: "긴머리", wavy: "웨이브", bob: "단발", pixie: "숏컷", pony: "포니테일", twin: "양갈래", bun: "똥머리" },
  top: { tee: "티셔츠", long: "긴팔", hoodie: "후드티", stripe: "줄무늬", jacket: "재킷", shirt: "셔츠", blouse: "블라우스", overall: "멜빵", dress: "원피스", santa: "🎅 산타 코트", santadress: "🎅 산타 원피스", elf: "🧝 요정 옷", xsweater: "🎄 크리스마스 니트" },
  bottom: { pants: "바지", jeans: "청바지", shorts: "반바지", skirt: "치마", longskirt: "롱스커트", dress: "원피스" },
  hat: { none: "없음", cap: "캡모자", beanie: "비니", santa: "🎅 산타 모자", antler: "🦌 루돌프 뿔", elfhat: "🧝 요정 모자" },
  sp: { none: "없음", gold: "👑 황금 왕", disco: "🪩 디스코 킹", tree: "🎄 트리 인간", neon: "🌈 네온 사이버", angel: "😇 천사" },
  acc: { none: "없음", glasses: "안경", sunglasses: "선글라스", headphones: "헤드폰", backpack: "백팩", rednose: "🔴 루돌프 코", scarf: "🧣 목도리" },
};
/** 성별에 맞는 선택지. 헤어는 모두에게 열어 둔다. */
export function optionsFor(gender) {
  return {
    hair: uniq([...HAIR_M, ...HAIR_F]),
    top: gender === "M" ? [...TOP_M, ...XTOP_M] : [...TOP_F, ...XTOP_F],
    bottom: gender === "M" ? BOT_M : BOT_F,
    hat: [...uniq(HATS), ...XHATS],
    acc: [...uniq(ACCS), ...XACCS],
    sp: SPECIALS,
    skin: SKINS,
    hairColor: HAIR_COLORS,
    topColor: CLOTH,
    top2: CLOTH,
    bottomColor: BOTTOMS,
    shoes: SHOES,
    hatColor: CLOTH,
    accColor: CLOTH,
  };
}
/** 기본 스타일 위에 사용자가 고른 항목을 얹는다(잘못된 값은 무시). */
export function applyStyle(base, ov = {}) {
  const st = { ...base }, opt = optionsFor(base.gender);
  for (const [k, v] of Object.entries(ov || {})) {
    const list = opt[k];
    if (list && list.map((x) => x.toLowerCase()).includes(String(v).toLowerCase())) st[k] = list.find((x) => x.toLowerCase() === String(v).toLowerCase());
  }
  if (isDress(st.top)) st.bottom = "dress";
  else if (st.bottom === "dress") st.bottom = base.bottom === "dress" ? "pants" : base.bottom;
  return st;
}
