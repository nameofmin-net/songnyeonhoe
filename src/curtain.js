// 무게감 있는 빨간 커튼: 스프링(질량·감쇠)으로 여닫히고, 밑단은 한 박자 늦게 따라오며 흔들리고,
// 열릴수록 주름이 바깥쪽으로 몰려 접힌다. 저해상도 캔버스에 그려 픽셀 느낌을 맞춘다.
const LW = 320, LH = 180, PLEATS = 13;
const HALF = LW / 2 + 2;

export function createCurtain(canvas) {
  canvas.width = LW; canvas.height = LH;
  const g = canvas.getContext("2d");
  // 0 = 닫힘(가운데서 만남), 1 = 열림(양옆으로 몰림)
  const top = { x: 1, v: 0 }, hem = { x: 1, v: 0 };
  let target = 1, raf = 0, last = 0, t = 0, waiters = [];

  function step(dt) {
    // 윗단: 레일에 걸린 고리 → 묵직한 스프링(살짝 넘쳤다 돌아옴)
    const k = 22, c = 7.5;
    top.v += (k * (target - top.x) - c * top.v) * dt; top.x += top.v * dt;
    // 밑단: 윗단을 늦게 따라오는 진자(더 무겁고 덜 감쇠돼 한두 번 흔들림)
    const k2 = 11, c2 = 3.2;
    hem.v += (k2 * (top.x - hem.x) - c2 * hem.v) * dt; hem.x += hem.v * dt;
  }
  const settled = () => Math.abs(top.x - target) < 0.004 && Math.abs(top.v) < 0.01 && Math.abs(hem.x - target) < 0.006 && Math.abs(hem.v) < 0.02;

  function shade(b) {
    // 벨벳 빨강 램프
    const r = Math.round(60 + 175 * b), gg = Math.round(6 + 38 * b * b), bb = Math.round(14 + 40 * b * b);
    return `rgb(${r},${gg},${bb})`;
  }
  function drawHalf(side) {
    // side -1: 왼쪽(바깥=0), +1: 오른쪽(바깥=LW)
    for (let y = 0; y < LH; y++) {
      const fy = y / LH, o = top.x + (hem.x - top.x) * fy * fy; // 아래로 갈수록 밑단 값을 따름
      const width = Math.max(10, HALF * (1 - 0.88 * Math.min(1.08, Math.max(-0.05, o))));
      // 움직일 때 천이 부풀어 출렁
      const billow = (top.v - hem.v) * 6 * Math.sin(fy * Math.PI) + Math.sin(t * 1.3 + fy * 5) * 0.6 * (1 - settledness());
      const cols = 64;
      for (let i = 0; i < cols; i++) {
        const u0 = i / cols, u1 = (i + 1) / cols;
        const xa = u0 * width + billow * u0, xb = u1 * width + billow * u1;
        const ph = u0 * PLEATS * Math.PI * 2;
        let b = 0.55 + 0.38 * Math.cos(ph) + 0.07 * Math.cos(ph * 2 + fy * 2);
        b *= 0.78 + 0.22 * (1 - fy) ; // 아래쪽은 살짝 어둡게
        if (u0 > 0.965) b = 1.35; // 안쪽 금색 단(아래에서 별도로 칠함)
        const x0 = side < 0 ? xa : LW - xb, w = Math.max(1, Math.abs(xb - xa) + 0.6);
        g.fillStyle = u0 > 0.965 ? (Math.floor(y / 3) % 2 ? "#ffd84a" : "#c8941a") : shade(Math.max(0, Math.min(1, b)));
        g.fillRect(Math.floor(x0), y, Math.ceil(w), 1);
      }
      // 안쪽 가장자리 그림자
      const ex = side < 0 ? width + billow : LW - width - billow;
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(Math.floor(side < 0 ? ex : ex - 3), y, 3, 1);
    }
    // 밑단 술(펄럭이는 금색 점선)
    const o = hem.x, width = Math.max(10, HALF * (1 - 0.88 * Math.min(1.08, Math.max(-0.05, o))));
    for (let x = 0; x < width; x += 2) { g.fillStyle = (x / 2) % 2 ? "#ffd84a" : "#a8741a"; g.fillRect(side < 0 ? x : LW - x - 2, LH - 2, 2, 2); }
  }
  let settle = 0;
  const settledness = () => settle;
  function frame(ms) {
    const dt = Math.min(0.033, (ms - (last || ms)) / 1000); last = ms; t += dt;
    for (let i = 0; i < 4; i++) step(dt / 4);
    settle = settled() ? Math.min(1, settle + dt) : 0;
    g.clearRect(0, 0, LW, LH);
    if (!(target === 1 && top.x > 0.995 && hem.x > 0.99 && settled())) { drawHalf(-1); drawHalf(1); }
    if (settled()) {
      waiters.forEach((f) => f()); waiters = [];
      raf = 0; last = 0;
      if (target === 1) g.clearRect(0, 0, LW, LH);
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  function go(to) {
    target = to;
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
    return new Promise((res) => waiters.push(res));
  }
  return {
    close: () => go(0),
    open: () => go(1),
    /** 거의 닫혔는지(내용 교체 타이밍) */
    get closedEnough() { return top.x < 0.06; },
  };
}
