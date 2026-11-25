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

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS att (id INTEGER PRIMARY KEY, message TEXT NOT NULL, at INTEGER NOT NULL)");
  }
  list() {
    return this.ctx.storage.sql.exec("SELECT id, message, at FROM att ORDER BY at").toArray();
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
      const at = Date.now();
      const had = this.ctx.storage.sql.exec("SELECT at FROM att WHERE id = ?", id).toArray()[0];
      this.ctx.storage.sql.exec("INSERT INTO att (id, message, at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET message = excluded.message", id, message, at);
      this.broadcast({ type: had ? "update" : "join", id, message, at: had ? had.at : at });
      return json(req, { ok: true, again: !!had });
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
