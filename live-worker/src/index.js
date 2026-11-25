// 송년회 광장 중계 서버: 명단 보관 + 입장/건배 신호를 모든 화면(WebSocket)에 전달.
// 캐릭터 위치는 주고받지 않는다(각 화면이 랜덤으로 움직임).
import { DurableObject } from "cloudflare:workers";

const MAX = 110, MSG = 40;
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
const STYLE_KEYS = ["skin", "hair", "hairColor", "top", "topColor", "top2", "bottom", "bottomColor", "shoes", "hat", "hatColor", "acc", "accColor"];
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
  }
  list() {
    return this.ctx.storage.sql.exec("SELECT id, message, at, style FROM att ORDER BY at").toArray().map(row);
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
    if (path === "/api/cheers") {
      const now = Date.now();
      if (this.lastCheers && now - this.lastCheers < 3000) return json(req, { ok: true, throttled: true });
      this.lastCheers = now;
      this.broadcast({ type: "cheers" });
      return json(req, { ok: true });
    }
    if (path === "/api/reset") {
      if (!this.admin(req)) return json(req, { error: "forbidden" }, 403);
      this.ctx.storage.sql.exec("DELETE FROM att");
      this.broadcast({ type: "state", attendees: [] });
      return json(req, { ok: true });
    }
    return json(req, { error: "not found" }, 404);
  }
  webSocketMessage(ws, msg) { if (msg === "ping") ws.send("pong"); }
  webSocketClose(ws, code) { try { ws.close(code, "bye"); } catch {} }
}
