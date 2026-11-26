// 소리: Web Audio로 직접 합성한 효과음 + 8비트 캐롤 BGM(징글벨 · We Wish You a Merry Christmas · Deck the Halls, 모두 퍼블릭 도메인)
// 브라우저는 사용자가 한 번 눌러야 소리를 낼 수 있어서, 켜기 버튼(또는 첫 클릭)으로 시작한다.

let ac = null, master, bgmBus, sfxBus, noiseBuf;
let enabled = false, bgmOn = true;
const PREF = "songnyeonhoe-sound";

function init() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
  bgmBus = ac.createGain(); bgmBus.gain.value = 0.16; bgmBus.connect(comp);
  sfxBus = ac.createGain(); sfxBus.gain.value = 0.42; sfxBus.connect(comp);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export const soundOn = () => enabled;
export function savedPref() { try { return localStorage.getItem(PREF) === "on"; } catch { return false; } }
export async function setSound(on) {
  enabled = on;
  try { localStorage.setItem(PREF, on ? "on" : "off"); } catch {}
  if (on) { init(); if (ac.state !== "running") ac.resume().catch(() => {}); startBgm(); }
  else if (ac) { stopBgm(); }
}

// ---------- 합성 도구 ----------
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (n) => { const m = /^([A-G])(#?)(\d)$/.exec(n); return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] ? 1 : 0); };

function tone(bus, { f, f2, t = 0, dur = 0.2, type = "sine", vol = 0.5, a = 0.005, cut }) {
  const s = ac.currentTime + t, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, s);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, s + dur);
  g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + a); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
  let out = g;
  if (cut) { const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = cut; g.connect(fl); out = fl; }
  o.connect(g); out.connect(bus); o.start(s); o.stop(s + dur + 0.05);
}
function noise(bus, { t = 0, dur = 0.3, vol = 0.4, type = "bandpass", f = 2000, f2, q = 1 }) {
  const s = ac.currentTime + t, src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf; src.loop = true;
  fl.type = type; fl.frequency.setValueAtTime(f, s); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, s + dur);
  g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
  src.connect(fl); fl.connect(g); g.connect(bus); src.start(s); src.stop(s + dur + 0.05);
}
const bell = (f, t, vol = 0.35, dur = 0.6) => { tone(sfxBus, { f, t, dur, vol }); tone(sfxBus, { f: f * 2.76, t, dur: dur * 0.5, vol: vol * 0.3 }); };

// ---------- 효과음 ----------
let lastAt = {};
const gate = (k, ms) => { const n = performance.now(); if (n - (lastAt[k] || 0) < ms) return false; lastAt[k] = n; return true; };
const ok = (k, ms = 60) => enabled && ac && gate(k, ms);

export const sfx = {
  /** 입장: 빛기둥 슈웅 + 차임 */
  enter() {
    if (!ok("enter", 300)) return;
    noise(sfxBus, { dur: 0.9, vol: 0.25, f: 400, f2: 5000, q: 3 });
    tone(sfxBus, { f: 300, f2: 1400, dur: 0.7, type: "triangle", vol: 0.25 });
    ["C6", "E6", "G6", "C7"].forEach((n, i) => bell(hz(midi(n)), 0.75 + i * 0.09, 0.3));
  },
  /** 폭죽 팡 */
  pop() {
    if (!ok("pop", 120)) return;
    noise(sfxBus, { dur: 0.15, vol: 0.5, type: "highpass", f: 1500 });
    for (let i = 0; i < 5; i++) tone(sfxBus, { f: 900 + Math.random() * 1600, t: 0.05 + i * 0.05, dur: 0.08, type: "square", vol: 0.06 });
  },
  /** 건배: 잔이 두 번 짠! (beer.js 타이밍) */
  cheers() {
    if (!ok("cheers", 90)) return;
    const d = (Math.random() - 0.5) * 120;
    for (const [t, v] of [[0.32, 0.4], [0.72, 0.28]]) { tone(sfxBus, { f: 2350 + d, t, dur: 0.35, vol: v }); tone(sfxBus, { f: 3520 + d, t, dur: 0.25, vol: v * 0.5 }); noise(sfxBus, { t, dur: 0.05, vol: 0.15, type: "highpass", f: 5000 }); }
  },
  /** 변신: 반짝이 상승 아르페지오 + 섬광 */
  transform() {
    if (!ok("transform", 200)) return;
    const sc = ["C5", "E5", "G5", "B5", "D6", "E6", "G6", "B6", "D7"];
    sc.forEach((n, i) => tone(sfxBus, { f: hz(midi(n)), t: i * 0.045, dur: 0.25, type: "triangle", vol: 0.18 }));
    noise(sfxBus, { t: 0.45, dur: 0.6, vol: 0.2, type: "highpass", f: 6000 });
    ["C6", "G6", "C7"].forEach((n, i) => bell(hz(midi(n)), 0.5 + i * 0.12, 0.25, 0.9));
  },
  /** 채팅 뽁 */
  chat() { if (ok("chat", 80)) { tone(sfxBus, { f: 700, f2: 1100, dur: 0.09, type: "triangle", vol: 0.22 }); } },
  /** 캐릭터 클릭 / 이모티콘 */
  blip() { if (ok("blip", 60)) tone(sfxBus, { f: 1000 + Math.random() * 300, f2: 1600, dur: 0.07, type: "square", vol: 0.06 }); },
  /** 트리 두드리기: 누를수록 음이 올라감 */
  treeTap(n) { if (ok("tap", 30)) bell(hz(72 + [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19][Math.min(11, n - 1)]), 0, 0.3, 0.4); },
  /** 트리 폭발 */
  boom() {
    if (!enabled || !ac) return;
    tone(sfxBus, { f: 140, f2: 30, dur: 1.2, type: "sine", vol: 0.9 });
    noise(sfxBus, { dur: 1.6, vol: 0.8, type: "lowpass", f: 3000, f2: 200 });
    noise(sfxBus, { dur: 0.3, vol: 0.5, type: "highpass", f: 3000 });
    for (let i = 0; i < 10; i++) bell(1500 + Math.random() * 3000, 0.1 + Math.random() * 0.8, 0.08, 0.3);
  },
  /** 가루로 흩어짐: 사르르 */
  dust() { if (ok("dust", 1500)) { noise(sfxBus, { dur: 2.2, vol: 0.28, f: 2500, f2: 9000, q: 0.6 }); noise(sfxBus, { t: 0.2, dur: 1.8, vol: 0.15, f: 800, f2: 400, q: 0.8 }); } },
  /** 트리가 다시 자람: 샤라라라랄 */
  regrow() {
    if (!ok("regrow", 1000)) return;
    const sc = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6", "A6", "C7", "D7", "E7"];
    for (let i = 0; i < 26; i++) tone(sfxBus, { f: hz(midi(sc[Math.floor(i / 2)])), t: i * 0.068, dur: 0.3, type: "triangle", vol: 0.12 });
    noise(sfxBus, { dur: 1.8, vol: 0.12, type: "highpass", f: 7000 });
    ["C6", "E6", "G6", "C7"].forEach((n) => bell(hz(midi(n)), 1.85, 0.22, 1.4));
  },
  /** 레이저 피융 */
  laser() { if (ok("laser", 80)) { tone(sfxBus, { f: 2400, f2: 300, dur: 0.22, type: "sawtooth", vol: 0.18, cut: 5000 }); noise(sfxBus, { dur: 0.12, vol: 0.2, type: "highpass", f: 3000 }); } },
  /** 동전 짤랑 */
  coins() { if (ok("coins", 400)) for (let i = 0; i < 9; i++) { const f = 2600 + Math.random() * 1800, t = i * 0.05 + Math.random() * 0.03; tone(sfxBus, { f, t, dur: 0.18, vol: 0.12, type: "square", cut: 6000 }); tone(sfxBus, { f: f * 1.5, t: t + 0.03, dur: 0.12, vol: 0.06 }); } },
  /** 커튼 쓸리는 소리 */
  curtain() { if (ok("curtain", 400)) { noise(sfxBus, { dur: 1.0, vol: 0.35, f: 500, f2: 1800, q: 0.7 }); noise(sfxBus, { t: 0.1, dur: 0.9, vol: 0.15, type: "lowpass", f: 400 }); } },
  /** 두구두구 */
  drumroll(dur = 1.2) {
    if (!ok("drum", 300)) return;
    for (let t = 0; t < dur; t += 0.045) { const v = 0.12 + 0.25 * (t / dur); noise(sfxBus, { t, dur: 0.06, vol: v, type: "bandpass", f: 220, q: 1.5 }); tone(sfxBus, { f: 110, f2: 80, t, dur: 0.05, vol: v * 0.6 }); }
    noise(sfxBus, { t: dur, dur: 0.6, vol: 0.5, type: "highpass", f: 4000 }); // 심벌
  },
  /** 빰빠밤~ 팡파르 */
  fanfare() {
    if (!ok("fanfare", 800)) return;
    const seq = [["G4", 0, 0.12], ["G4", 0.14, 0.12], ["G4", 0.28, 0.12], ["C5", 0.42, 0.5], ["E5", 0.95, 0.16], ["G5", 1.13, 0.7]];
    for (const [n, t, d] of seq) { const f = hz(midi(n)); tone(sfxBus, { f, t, dur: d + 0.1, type: "sawtooth", vol: 0.16, cut: 2600 }); tone(sfxBus, { f: f * 1.5, t, dur: d + 0.1, type: "square", vol: 0.06, cut: 2400 }); tone(sfxBus, { f: f / 2, t, dur: d + 0.1, type: "triangle", vol: 0.25 }); }
    noise(sfxBus, { t: 1.13, dur: 0.8, vol: 0.35, type: "highpass", f: 5000 });
  },
  /** 박수 짝짝짝 */
  applause(dur = 2.5) {
    if (!ok("applause", 800)) return;
    for (let i = 0; i < dur * 40; i++) { const t = Math.random() * dur, fade = 1 - t / dur; noise(sfxBus, { t, dur: 0.03, vol: (0.08 + Math.random() * 0.12) * fade, type: "bandpass", f: 1200 + Math.random() * 1800, q: 1.2 }); }
  },
  /** 루돌프가 산타를 업음: 방울 딸랑 */
  jingle() { if (ok("jingle", 500)) for (let i = 0; i < 6; i++) noise(sfxBus, { t: i * 0.09, dur: 0.12, vol: 0.25, f: 6500, q: 8 }); },
};

// ---------- BGM: 캐롤 메들리 ----------
// [음, 박] (박 = 4분음표). "R" = 쉼표. 베이스는 마디마다 [근음, 5음].
const SONGS = [
  { name: "Jingle Bells", bpm: 152, beats: 4, bells: true,
    mel: "E4 1 E4 1 E4 2 E4 1 E4 1 E4 2 E4 1 G4 1 C4 1.5 D4 .5 E4 4 F4 1 F4 1 F4 1.5 F4 .5 F4 1 E4 1 E4 1 E4 .5 E4 .5 E4 1 D4 1 D4 1 E4 1 D4 2 G4 2 E4 1 E4 1 E4 2 E4 1 E4 1 E4 2 E4 1 G4 1 C4 1.5 D4 .5 E4 4 F4 1 F4 1 F4 1.5 F4 .5 F4 1 E4 1 E4 1 E4 .5 E4 .5 G4 1 G4 1 F4 1 D4 1 C4 4",
    bass: "C C C C F C D G C C C C F C G C" },
  { name: "We Wish You a Merry Christmas", bpm: 138, beats: 3, pickup: 1,
    mel: "G4 1 C5 1 C5 .5 D5 .5 C5 .5 B4 .5 A4 1 A4 1 A4 1 D5 1 D5 .5 E5 .5 D5 .5 C5 .5 B4 1 G4 1 G4 1 E5 1 E5 .5 F5 .5 E5 .5 D5 .5 C5 1 A4 1 G4 .5 G4 .5 A4 1 D5 1 B4 1 C5 2 R 1",
    bass: "C F D G E F G C" },
  { name: "Deck the Halls", bpm: 132, beats: 4,
    mel: "D5 1.5 C5 .5 B4 1 A4 1 G4 1 A4 1 B4 1 G4 1 A4 .5 B4 .5 C5 .5 A4 .5 B4 1.5 A4 .5 G4 1 F#4 1 G4 2 D5 1.5 C5 .5 B4 1 A4 1 G4 1 A4 1 B4 1 G4 1 A4 .5 B4 .5 C5 .5 A4 .5 B4 1.5 A4 .5 G4 1 F#4 1 G4 2",
    bass: "G G D G G G D G" },
];
const parse = (s) => { const a = s.split(/\s+/), out = []; for (let i = 0; i < a.length; i += 2) out.push([a[i], +a[i + 1]]); return out; };
SONGS.forEach((s) => (s.notes = parse(s.mel)));
const ROOT = { C: 48, D: 50, E: 52, F: 53, G: 55, A: 57, B: 59 };

let bgmTimer = null, songIx = 0, nextT = 0, queue = [];
function stopBgm() { clearInterval(bgmTimer); bgmTimer = null; queue.forEach((o) => { try { o.stop(); } catch {} }); queue = []; }
function startBgm() { if (!bgmOn || bgmTimer || !ac || track === "none") return; nextT = ac.currentTime + 0.3; scheduleSong(); bgmTimer = setInterval(() => { if (ac.currentTime > nextT - 2) scheduleSong(); }, 500); }
function voice(f, s, dur, type, vol, cut) {
  const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
  o.type = type; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.value = cut;
  g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + 0.01); g.gain.setValueAtTime(vol * 0.7, s + Math.min(dur * 0.5, 0.12)); g.gain.exponentialRampToValueAtTime(0.0001, s + dur * 0.95);
  o.connect(g); g.connect(fl); fl.connect(bgmBus); o.start(s); o.stop(s + dur);
  queue.push(o); if (queue.length > 400) queue.splice(0, 200);
}
// 시상식 BGM: 직접 만든 웅장한 행진풍 루프(C장조, 느린 템포) — 패드 화음 + 금관 멜로디 + 팀파니
let track = "carol";
export function setTrack(t) {
  if (t === track) return; track = t;
  if (!ac || !enabled) return;
  // 지금 큐를 페이드아웃하고 새 트랙으로
  const g = bgmBus.gain, now = ac.currentTime;
  g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0.0001, now + 0.6);
  setTimeout(() => { stopBgm(); g.cancelScheduledValues(ac.currentTime); g.setValueAtTime(0.16, ac.currentTime); startBgm(); }, 650);
}
const AWARD = { bpm: 84, chords: [["C3", "E3", "G3"], ["A2", "E3", "A3"], ["F2", "C3", "A3"], ["G2", "D3", "B3"], ["C3", "E3", "G3"], ["F2", "A3", "C4"], ["D3", "F3", "A3"], ["G2", "D3", "G3"]],
  mel: "G4 1.5 C5 .5 E5 2 D5 1 C5 1 A4 2 C5 1 A4 1 F4 1.5 A4 .5 C5 2 B4 2 G4 1.5 C5 .5 E5 2 G5 1 F5 1 A4 2 D5 1 F5 1 E5 1.5 D5 .5 C5 4" };
AWARD.notes = parse(AWARD.mel);
function scheduleAward() {
  const spb = 60 / AWARD.bpm, bar = 4 * spb; let t = nextT;
  AWARD.chords.forEach((ch, i) => {
    const s = nextT + i * bar;
    for (const n of ch) { voice(hz(midi(n)), s, bar * 0.98, "sawtooth", 0.07, 900); voice(hz(midi(n)) * 2, s, bar * 0.98, "triangle", 0.05, 2000); }
    voice(hz(midi(ch[0]) - 12), s, bar * 0.95, "triangle", 0.3, 600);
    // 팀파니
    for (const k of [0, 2.5, 3]) { const ts = s + k * spb; tone(bgmBus, { f: hz(midi(ch[0]) - 12), f2: hz(midi(ch[0]) - 14), t: ts - ac.currentTime, dur: 0.5, vol: k ? 0.18 : 0.3 }); }
  });
  for (const [n, b] of AWARD.notes) { if (n !== "R") { const f = hz(midi(n)); voice(f, t, b * spb, "sawtooth", 0.11, 2200); voice(f / 2, t, b * spb, "square", 0.04, 1500); } t += b * spb; }
  nextT += AWARD.chords.length * bar;
}
// OX 퀴즈 BGM: 직접 만든 오르골풍 긴장감 루프(A단조) + 째깍째깍
const QUIZ = { bpm: 108, mel: "A5 .5 C6 .5 E6 .5 C6 .5 B5 .5 E5 .5 G#5 .5 B5 .5 A5 .5 C6 .5 E6 .5 A6 .5 G#6 1 E6 1 F6 .5 E6 .5 D6 .5 C6 .5 B5 .5 C6 .5 D6 .5 B5 .5 A5 .5 E5 .5 A5 .5 C6 .5 B5 2" };
QUIZ.notes = parse(QUIZ.mel);
function scheduleQuiz() {
  const spb = 60 / QUIZ.bpm; let t = nextT;
  for (const [n, b] of QUIZ.notes) { const f = hz(midi(n)); voice(f, t, Math.max(0.5, b * spb * 1.6), "sine", 0.22, 6000); voice(f * 2, t, 0.25, "sine", 0.05, 8000); t += b * spb; }
  const total = t - nextT;
  for (let k = 0, s = nextT; s < nextT + total; s += spb, k++) { const src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = noiseBuf; fl.type = "bandpass"; fl.frequency.value = k % 2 ? 2600 : 3400; fl.Q.value = 10; g.gain.setValueAtTime(0.12, s); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.04); src.connect(fl); fl.connect(g); g.connect(bgmBus); src.start(s); src.stop(s + 0.05); }
  ["A2", "F2", "D2", "E2"].forEach((n, i) => voice(hz(midi(n)), nextT + i * total / 4, total / 4, "triangle", 0.22, 700));
  nextT += total + spb;
}
function scheduleSong() {
  if (track === "award") return scheduleAward();
  if (track === "quiz") return scheduleQuiz();
  const song = SONGS[songIx % SONGS.length]; songIx++;
  const spb = 60 / song.bpm; let t = nextT;
  // 멜로디(사각파) + 한 옥타브 위 반짝 종소리 살짝
  for (const [n, b] of song.notes) {
    if (n !== "R") { const f = hz(midi(n)); voice(f, t, b * spb, "square", 0.22, 2600); voice(f * 2, t, Math.min(b * spb, 0.35), "sine", 0.05, 6000); }
    t += b * spb;
  }
  const total = t - nextT;
  // 베이스(삼각파): 박마다 근음·5음 교대
  const bars = song.bass.split(" "), bar = song.beats * spb, b0 = nextT + (song.pickup || 0) * spb;
  bars.forEach((r, i) => { for (let k = 0; k < song.beats; k++) { const m = ROOT[r] - 12 + (k % 2 ? 7 : 0), s = b0 + i * bar + k * spb; if (s < nextT + total) voice(hz(m), s, spb * 0.9, "triangle", 0.32, 1200); } });
  // 징글벨엔 방울 소리
  if (song.bells) for (let s = nextT; s < nextT + total; s += spb) { const src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = noiseBuf; fl.type = "bandpass"; fl.frequency.value = 7000; fl.Q.value = 6; g.gain.setValueAtTime(0.18, s); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.08); src.connect(fl); fl.connect(g); g.connect(bgmBus); src.start(s); src.stop(s + 0.1); }
  nextT += total + spb * 2; // 곡 사이 잠깐 쉼
}
