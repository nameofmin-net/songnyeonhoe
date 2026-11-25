// 송년회 광장 중계 서버: 명단 보관 + 입장/건배 신호를 모든 화면(WebSocket)에 전달.
// 캐릭터 위치는 주고받지 않는다(각 화면이 랜덤으로 움직임).
import { DurableObject } from "cloudflare:workers";

const MAX = 104, MSG = 40;
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
const EMOTES = ["cheers", "wave", "heart", "party", "dance", "laugh", "wow", "sleepy"];
const STYLE_KEYS = ["skin", "hair", "hairColor", "top", "topColor", "top2", "bottom", "bottomColor", "shoes", "hat", "hatColor", "acc", "accColor", "sp"];
function cleanStyle(v) {
  const out = {};
  if (!v || typeof v !== "object") return out;
  for (const k of STYLE_KEYS) {
    const x = v[k];
    if (typeof x === "string" && /^([a-z]{2,12}|#[0-9a-f]{6})$/i.test(x)) out[k] = x.toLowerCase();
  }
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
    this.lastChat = new Map();
    this.show = null;
    ctx.blockConcurrencyWhile(async () => { this.show = (await ctx.storage.get("show")) || null; });
  }
  menus() {
    return this.ctx.storage.sql.exec("SELECT sid, name, title, sub, people, at FROM menus ORDER BY sid").toArray().map((m) => ({ ...m, people: JSON.parse(m.people || "[]") }));
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
      return new Response(null, { status: 101, webSocket: client });
    }
    if (path === "/api/state" && req.method === "GET") return json(req, { attendees: this.list() });
    if (req.method !== "POST") return json(req, { error: "not found" }, 404);
    let body = {};
    try { body = await req.json(); } catch {}

    if (path === "/api/join") {
      const id = Number(body.id), message = String(body.message ?? "").trim().slice(0, MSG);
      if (!Number.isInteger(id) || id < 0 || id >= MAX) return json(req, { error: "bad id" }, 400);
      if (!message) return json(req, { error: "empty message" }, 400);
      const had = this.ctx.storage.sql.exec("SELECT id, message, at, style FROM att WHERE id = ?", id).toArray()[0];
      // 이미 입장한 이름이면 새로 넣지 않고 그 사람의 정보를 돌려준다
      if (had) return json(req, { ok: false, already: true, entry: row(had) });
      const at = Date.now(), style = cleanStyle(body.style);
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
      const style = body.style === undefined ? cur.style : cleanStyle(body.style);
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
    if (path.startsWith("/api/menu") || path === "/api/show") {
      if (!this.admin(req)) return json(req, { error: "forbidden" }, 403);
      const txt = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
      if (path === "/api/menus") return json(req, { ok: true, menus: this.menus(), show: this.show });
      if (path === "/api/menu/save") {
        const name = txt(body.name, 30), title = txt(body.title, 40), sub = txt(body.sub, 60);
        const people = [...new Set((Array.isArray(body.people) ? body.people : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < MAX))].slice(0, 60);
        if (!name || !title) return json(req, { error: "name and title required" }, 400);
        const sid = Number(body.sid);
        if (sid > 0) this.ctx.storage.sql.exec("UPDATE menus SET name = ?, title = ?, sub = ?, people = ? WHERE sid = ?", name, title, sub, JSON.stringify(people), sid);
        else this.ctx.storage.sql.exec("INSERT INTO menus (name, title, sub, people, at) VALUES (?, ?, ?, ?, ?)", name, title, sub, JSON.stringify(people), Date.now());
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
          this.show = { sid: m.sid, title: m.title, sub: m.sub, people: m.people, step: Math.min(2, Math.max(0, step)), at: Date.now() };
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
      this.ctx.storage.sql.exec("DELETE FROM att");
      this.ctx.storage.sql.exec("DELETE FROM chat");
      this.broadcast({ type: "state", attendees: [] });
      this.broadcast({ type: "chatlog", items: [] });
      return json(req, { ok: true });
    }
    return json(req, { error: "not found" }, 404);
  }
  webSocketMessage(ws, msg) { if (msg === "ping") ws.send("pong"); }
  webSocketClose(ws, code) { try { ws.close(code, "bye"); } catch {} }
}
