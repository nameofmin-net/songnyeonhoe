// 송년회 광장 중계 서버: 명단 보관 + 입장/건배 신호를 모든 화면(WebSocket)에 전달.
// 캐릭터 위치는 주고받지 않는다(각 화면이 랜덤으로 움직임).
import { DurableObject } from "cloudflare:workers";

const ROSTER_N = 104, GUESTS = 30, MAX = ROSTER_N + GUESTS, MSG = 40;
const ORIGINS = ["https://nameofmin-net.github.io", "http://localhost:8931"];

function cors(req) {
  const o = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
    "Vary": "Origin",
  };
}
const json = (req, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(req) } });

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/") && url.pathname !== "/ws") return json(req, { ok: true, name: "songnyeonhoe-live" });
    const room = env.ROOM.get(env.ROOM.idFromName("2026"));
    return room.fetch(req);
  },
};

// 복장 설정: 정해진 항목만, 짧은 영문 키워드나 #rrggbb 색만 허용
const EMOTES = ["cheers", "wave", "heart", "party", "dance", "laugh", "wow", "sleepy", "focus"];
const STYLE_KEYS = ["skin", "hair", "hairColor", "top", "topColor", "top2", "bottom", "bottomColor", "shoes", "hat", "hatColor", "acc", "accColor", "sp"];
function cleanStyle(v) {
  const out = {};
  if (!v || typeof v !== "object") return out;
  for (const k of STYLE_KEYS) {
    const x = v[k];
    if (typeof x === "string" && /^([a-z]{2,12}|#[0-9a-f]{6})$/i.test(x)) out[k] = x.toLowerCase();
  }
  if (typeof v.nm === "string") { const nm = v.nm.replace(/[^가-힣a-zA-Z0-9]/g, "").slice(0, 10); if (nm) out.nm = nm; }
  return out;
}
const row = (r) => ({ id: r.id, message: r.message, at: r.at, style: JSON.parse(r.style || "{}") });

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS att (id INTEGER PRIMARY KEY, message TEXT NOT NULL, at INTEGER NOT NULL)");
    const cols = ctx.storage.sql.exec("PRAGMA table_info(att)").toArray().map((c) => c.name);
    if (!cols.includes("style")) ctx.storage.sql.exec("ALTER TABLE att ADD COLUMN style TEXT NOT NULL DEFAULT '{}'");
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS chat (cid INTEGER PRIMARY KEY AUTOINCREMENT, who INTEGER NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL)");
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS menus (sid INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, title TEXT NOT NULL, sub TEXT NOT NULL, people TEXT NOT NULL, at INTEGER NOT NULL)");
    if (!ctx.storage.sql.exec("PRAGMA table_info(menus)").toArray().some((c) => c.name === "extra")) ctx.storage.sql.exec("ALTER TABLE menus ADD COLUMN extra TEXT NOT NULL DEFAULT '{}'");
    this.lastChat = new Map();
    this.show = null;
    this.mode = null;
    this.quizQs = []; this.quiz = null; this.votes = new Map();
    ctx.blockConcurrencyWhile(async () => { this.show = (await ctx.storage.get("show")) || null; this.mode = (await ctx.storage.get("mode")) || null; this.quizQs = (await ctx.storage.get("quizQs")) || []; this.quiz = (await ctx.storage.get("quiz")) || null; this.office = !!(await ctx.storage.get("office")); this.admins = (await ctx.storage.get("admins")) || null; });
    this.reqs = new Map(); this.reqN = 0;
  }
  menus() {
    return this.ctx.storage.sql.exec("SELECT sid, name, title, sub, people, at, extra FROM menus ORDER BY sid").toArray().map(({ extra, ...m }) => ({ kind: "merit", ...JSON.parse(extra || "{}"), ...m, people: JSON.parse(m.people || "[]") }));
  }
  list() {
    return this.ctx.storage.sql.exec("SELECT id, message, at, style FROM att ORDER BY at").toArray().map(row);
  }
  chatlog(n = 80) {
    return this.ctx.storage.sql.exec("SELECT cid, who, text, at FROM chat ORDER BY cid DESC LIMIT ?", n).toArray().reverse();
  }
  broadcast(msg) {
    const s = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) { try { ws.send(s); } catch {} }
  }
  admin(req) {
    return !!this.env.ADMIN_KEY && req.headers.get("X-Admin-Key") === this.env.ADMIN_KEY;
  }
  async fetch(req) {
    const url = new URL(req.url), path = url.pathname;
    if (path === "/ws") {
      if (req.headers.get("Upgrade") !== "websocket") return new Response("websocket only", { status: 426 });
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: "state", attendees: this.list() }));
      server.send(JSON.stringify({ type: "chatlog", items: this.chatlog() }));
      server.send(JSON.stringify({ type: "show", show: this.show }));
      server.send(JSON.stringify({ type: "mode", mode: this.mode }));
      server.send(JSON.stringify({ type: "office", on: this.office }));
      server.send(JSON.stringify({ type: "admins", ids: this.admins }));
      server.send(JSON.stringify({ type: "quiz", quiz: this.quiz, votes: Object.fromEntries(this.votes) }));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (path === "/api/state" && req.method === "GET") return json(req, { attendees: this.list() });
    if (req.method !== "POST") return json(req, { error: "not found" }, 404);
    let body = {};
    try { body = await req.json(); } catch {}

    if (path === "/api/join") {
      let id = Number(body.id); const message = String(body.message ?? "").trim().slice(0, MSG);
      let gstyle = null;
      if (typeof body.guest === "string") {
        // 직접 입력: 같은 이름이 이미 있으면 그 자리, 없으면 성별에 맞는 빈 손님 자리를 서버가 고른다
        const nm = cleanStyle({ nm: body.guest }).nm; if (!nm) return json(req, { error: "bad name" }, 400);
        const used = this.list().filter((a) => a.id >= ROSTER_N);
        const same = used.find((a) => a.style.nm === nm);
        if (same) id = same.id;
        else {
          const taken = new Set(used.map((a) => a.id)), odd = body.gender === "F" ? 1 : 0;
          id = -1; for (let i = 0; i < GUESTS; i++) if (i % 2 === odd && !taken.has(ROSTER_N + i)) { id = ROSTER_N + i; break; }
          if (id < 0) return json(req, { error: "full" }, 409);
          gstyle = { nm };
        }
      }
      if (!Number.isInteger(id) || id < 0 || id >= MAX) return json(req, { error: "bad id" }, 400);
      if (!message) return json(req, { error: "empty message" }, 400);
      const had = this.ctx.storage.sql.exec("SELECT id, message, at, style FROM att WHERE id = ?", id).toArray()[0];
      // 이미 입장한 이름이면 새로 넣지 않고 그 사람의 정보를 돌려준다
      if (had) return json(req, { ok: false, already: true, entry: row(had) });
      const at = Date.now(), style = { ...cleanStyle(body.style), ...(gstyle || {}) };
      this.ctx.storage.sql.exec("INSERT INTO att (id, message, at, style) VALUES (?, ?, ?, ?)", id, message, at, JSON.stringify(style));
      this.broadcast({ type: "join", id, message, at, style });
      return json(req, { ok: true, entry: { id, message, at, style } });
    }
    if (path === "/api/update") {
      const id = Number(body.id);
      const had = this.ctx.storage.sql.exec("SELECT id, message, at, style FROM att WHERE id = ?", id).toArray()[0];
      if (!had) return json(req, { error: "not joined" }, 404);
      const cur = row(had);
      const message = body.message === undefined ? cur.message : String(body.message).trim().slice(0, MSG) || cur.message;
      const style = body.style === undefined ? cur.style : { ...cleanStyle(body.style), ...(cur.style.nm ? { nm: cur.style.nm } : {}) };
      this.ctx.storage.sql.exec("UPDATE att SET message = ?, style = ? WHERE id = ?", message, JSON.stringify(style), id);
      const e = { id, message, at: cur.at, style };
      this.broadcast({ type: "update", ...e });
      return json(req, { ok: true, entry: e });
    }
    if (path === "/api/me" ) {
      const id = Number(body.id);
      const had = this.ctx.storage.sql.exec("SELECT id, message, at, style FROM att WHERE id = ?", id).toArray()[0];
      return json(req, { entry: had ? row(had) : null });
    }
    if (path === "/api/chat") {
      const who = Number(body.id), text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
      if (!text) return json(req, { error: "empty" }, 400);
      if (!this.ctx.storage.sql.exec("SELECT id FROM att WHERE id = ?", who).toArray().length) return json(req, { error: "not joined" }, 403);
      const now = Date.now(), last = this.lastChat.get(who) || 0;
      if (now - last < 1200) return json(req, { error: "slow down" }, 429);
      this.lastChat.set(who, now);
      const cid = this.ctx.storage.sql.exec("INSERT INTO chat (who, text, at) VALUES (?, ?, ?) RETURNING cid", who, text, now).one().cid;
      this.ctx.storage.sql.exec("DELETE FROM chat WHERE cid <= ?", cid - 300);
      this.broadcast({ type: "chat", cid, who, text, at: now });
      return json(req, { ok: true });
    }
    if (path === "/api/emote") {
      const who = Number(body.id), kind = String(body.kind || "");
      if (!EMOTES.includes(kind)) return json(req, { error: "bad emote" }, 400);
      if (!this.ctx.storage.sql.exec("SELECT id FROM att WHERE id = ?", who).toArray().length) return json(req, { error: "not joined" }, 403);
      const now = Date.now(), key = "e" + who, last = this.lastChat.get(key) || 0;
      if (now - last < 900) return json(req, { error: "slow down" }, 429);
      if (kind === "focus") { const lf = this.lastChat.get("f" + who) || 0; if (now - lf < 8000) return json(req, { error: "slow down" }, 429); this.lastChat.set("f" + who, now); }
      this.lastChat.set(key, now);
      this.broadcast({ type: "emote", who, kind, at: now });
      return json(req, { ok: true });
    }
    if (path === "/api/cheers") {
      const now = Date.now();
      if (this.lastCheers && now - this.lastCheers < 3000) return json(req, { ok: true, throttled: true });
      this.lastCheers = now;
      this.broadcast({ type: "cheers" });
      return json(req, { ok: true });
    }
    // ---------- 어드민 컨트롤러: 시상 메뉴 만들기 · 재생 ----------
    // OX 퀴즈 투표(입장한 사람만, 문제가 열려 있을 때만)
    if (path === "/api/quiz/vote") {
      const id = Number(body.id), pick = body.pick === "O" || body.pick === "X" ? body.pick : null;
      if (!pick || !this.quiz || this.quiz.phase !== "ask") return json(req, { error: "closed" }, 409);
      if ((this.quiz.out || []).includes(id)) return json(req, { error: "out" }, 403);
      if (!this.ctx.storage.sql.exec("SELECT id FROM att WHERE id = ?", id).toArray().length) return json(req, { error: "not joined" }, 403);
      if (this.votes.get(id) === pick) return json(req, { ok: true });
      this.votes.set(id, pick);
      this.broadcast({ type: "vote", id, pick, idx: this.quiz.idx });
      return json(req, { ok: true });
    }
    // 관리자 권한 요청(누구나): 관리자로 지정된 이름으로 입장하려는데 비밀번호를 모를 때
    if (path === "/api/admin/request") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id < 0 || id >= MAX) return json(req, { error: "bad id" }, 400);
      for (const [k, r] of this.reqs) if (Date.now() - r.at > 30 * 60000) this.reqs.delete(k);
      if (this.reqs.size > 50) return json(req, { error: "busy" }, 429);
      const rid = Math.random().toString(36).slice(2, 10) + (++this.reqN);
      this.reqs.set(rid, { rid, id, at: Date.now(), status: "wait" });
      this.broadcast({ type: "adminreq" });
      return json(req, { ok: true, rid });
    }
    if (path === "/api/admin/status") {
      const r = this.reqs.get(String(body.rid || ""));
      if (!r) return json(req, { status: "gone" });
      return json(req, r.status === "ok" ? { status: "ok", key: this.env.ADMIN_KEY } : { status: r.status });
    }
    if (path.startsWith("/api/admin/")) {
      if (!this.admin(req)) return json(req, { error: "forbidden" }, 403);
      if (path === "/api/admin/check") return json(req, { ok: true });
      if (path === "/api/admin/list") return json(req, { ok: true, admins: this.admins, reqs: [...this.reqs.values()].filter((r) => r.status === "wait") });
      if (path === "/api/admin/set") {
        this.admins = (Array.isArray(body.ids) ? body.ids : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < MAX).slice(0, 30);
        await this.ctx.storage.put("admins", this.admins);
        this.broadcast({ type: "admins", ids: this.admins });
        return json(req, { ok: true, admins: this.admins });
      }
      if (path === "/api/admin/decide") {
        const r = this.reqs.get(String(body.rid || "")); if (!r) return json(req, { error: "gone" }, 404);
        r.status = body.ok ? "ok" : "no";
        if (body.ok && Array.isArray(this.admins) && !this.admins.includes(r.id)) { this.admins.push(r.id); await this.ctx.storage.put("admins", this.admins); this.broadcast({ type: "admins", ids: this.admins }); }
        return json(req, { ok: true });
      }
      return json(req, { error: "not found" }, 404);
    }
    if (path.startsWith("/api/menu") || path === "/api/show" || path === "/api/mode" || path === "/api/office" || path === "/api/reload" || path === "/api/music" || path.startsWith("/api/quiz")) {
      if (!this.admin(req)) return json(req, { error: "forbidden" }, 403);
      const txt = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
      if (path === "/api/menus") return json(req, { ok: true, menus: this.menus(), show: this.show, mode: this.mode, quizQs: this.quizQs, quiz: this.quiz, votes: Object.fromEntries(this.votes) });
      if (path === "/api/quiz/save") {
        this.quizQs = (Array.isArray(body.questions) ? body.questions : []).slice(0, 50).map((q) => ({ q: txt(q.q, 80), a: q.a === "X" ? "X" : "O" })).filter((q) => q.q);
        await this.ctx.storage.put("quizQs", this.quizQs);
        return json(req, { ok: true, quizQs: this.quizQs });
      }
      if (path === "/api/quiz/ctl") {
        const act = String(body.action || ""), n = this.quizQs.length;
        const ask = (idx, out) => { this.votes = new Map(); this.quiz = { on: true, idx, total: n, phase: "ask", q: this.quizQs[idx].q, out, at: Date.now() }; };
        if (act === "start") { if (!n) return json(req, { error: "no questions" }, 400); this.votes = new Map(); this.quiz = { on: true, idx: -1, total: n, phase: "ready", q: "", out: [], at: Date.now() }; }
        else if (act === "reveal" && this.quiz) { const qq = this.quizQs[this.quiz.idx]; const c = { O: 0, X: 0 }; for (const v of this.votes.values()) c[v]++; const ans = qq ? qq.a : "O", out = new Set(this.quiz.out || []); for (const [k, v] of this.votes) if (v !== ans) out.add(k);
          for (const a of this.list()) if (!this.votes.has(a.id)) out.add(a.id); /* 입력 안 한 사람도 탈락 */ this.quiz = { ...this.quiz, phase: "reveal", a: ans, counts: c, out: [...out] }; }
        else if (act === "next" && this.quiz && this.quiz.phase === "ready") ask(0, []);
        else if (act === "next" && this.quiz) { if (this.quiz.idx + 1 >= n) this.quiz = { ...this.quiz, phase: "end" }; else ask(this.quiz.idx + 1, this.quiz.out || []); }
        else if (act === "goto" && this.quiz) { const i = Number(body.idx); if (i >= 0 && i < n) ask(i, this.quiz.out || []); }
        else if (act === "stop") { this.quiz = null; this.votes = new Map(); }
        await this.ctx.storage.put("quiz", this.quiz);
        this.broadcast({ type: "quiz", quiz: this.quiz, votes: Object.fromEntries(this.votes) });
        return json(req, { ok: true, quiz: this.quiz });
      }
      if (path === "/api/office") {
        this.office = body.toggle ? !this.office : !!body.on;
        await this.ctx.storage.put("office", this.office);
        this.broadcast({ type: "office", on: this.office });
        return json(req, { ok: true, on: this.office });
      }
      if (path === "/api/music") { this.broadcast({ type: "music", play: !!body.play }); return json(req, { ok: true }); }
      if (path === "/api/reload") { this.broadcast({ type: "reload" }); return json(req, { ok: true }); }
      // 기본 메뉴: 시상식 준비 모드(모두 앉아서 단상을 봄)
      if (path === "/api/mode") {
        this.mode = body.mode === "ceremony" ? "ceremony" : null;
        await this.ctx.storage.put("mode", this.mode);
        this.broadcast({ type: "mode", mode: this.mode });
        return json(req, { ok: true, mode: this.mode });
      }
      if (path === "/api/menu/save") {
        const name = txt(body.name, 30), title = txt(body.title, 40), sub = txt(body.sub, 60);
        const people = [...new Set((Array.isArray(body.people) ? body.people : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < MAX))].slice(0, 60);
        if (!name || !title) return json(req, { error: "name and title required" }, 400);
        // 종류별 추가 항목: 공로상(merit) / 올해의 유플리더스(upleaders)
        const ids = (v) => [...new Set((Array.isArray(v) ? v : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < MAX))];
        const kind = body.kind === "upleaders" ? "upleaders" : "merit";
        const extra = { kind, prizeOn: !!body.prizeOn, prize: txt(body.prize, 24) };
        if (kind === "upleaders") {
          extra.award = txt(body.award, 20); extra.desc = String(body.desc ?? "").slice(0, 200).trim(); extra.quote = String(body.quote ?? "").slice(0, 160).trim();
          const w = Number(body.winner); extra.winner = Number.isInteger(w) && w >= 0 && w < MAX ? w : -1;
          extra.rivals = ids(body.rivals).filter((n) => n !== extra.winner).slice(0, 7);
        }
        const sid = Number(body.sid);
        if (sid > 0) this.ctx.storage.sql.exec("UPDATE menus SET name = ?, title = ?, sub = ?, people = ?, extra = ? WHERE sid = ?", name, title, sub, JSON.stringify(people), JSON.stringify(extra), sid);
        else this.ctx.storage.sql.exec("INSERT INTO menus (name, title, sub, people, at, extra) VALUES (?, ?, ?, ?, ?, ?)", name, title, sub, JSON.stringify(people), Date.now(), JSON.stringify(extra));
        return json(req, { ok: true, menus: this.menus() });
      }
      if (path === "/api/menu/delete") {
        this.ctx.storage.sql.exec("DELETE FROM menus WHERE sid = ?", Number(body.sid));
        return json(req, { ok: true, menus: this.menus() });
      }
      if (path === "/api/show") {
        const step = Number(body.step);
        if (step < 0 || !body.sid) { this.show = null; }
        else {
          const m = this.menus().find((x) => x.sid === Number(body.sid));
          if (!m) return json(req, { error: "no menu" }, 404);
          const maxStep = m.kind === "upleaders" ? 3 : 2;
          this.show = { ...m, step: Math.min(maxStep, Math.max(0, step)), at: Date.now() };
        }
        await this.ctx.storage.put("show", this.show);
        this.broadcast({ type: "show", show: this.show });
        return json(req, { ok: true, show: this.show });
      }
      return json(req, { error: "not found" }, 404);
    }
    if (path === "/api/chatclear") {
      if (!this.admin(req)) return json(req, { error: "forbidden" }, 403);
      this.ctx.storage.sql.exec("DELETE FROM chat");
      this.broadcast({ type: "chatlog", items: [] });
      return json(req, { ok: true });
    }
    if (path === "/api/reset") {
      if (!this.admin(req)) return json(req, { error: "forbidden" }, 403);
      const keep = Number.isInteger(body?.keep) ? body.keep : -1;
      this.ctx.storage.sql.exec("DELETE FROM att WHERE id != ?", keep);
      this.ctx.storage.sql.exec("DELETE FROM chat");
      this.broadcast({ type: "reset" });
      const left = this.ctx.storage.sql.exec("SELECT id, message, at, style FROM att").toArray().map(row);
      this.broadcast({ type: "state", attendees: left });
      this.broadcast({ type: "chatlog", items: [] });
      return json(req, { ok: true });
    }
    return json(req, { error: "not found" }, 404);
  }
  webSocketMessage(ws, msg) { if (msg === "ping") ws.send("pong"); }
  webSocketClose(ws, code) { try { ws.close(code, "bye"); } catch {} }
}
