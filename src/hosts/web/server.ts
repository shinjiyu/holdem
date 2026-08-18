/** Minimal HTTP host for kuroneko.chat/holdem/ — OAuth + table API + static H5. */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Auth } from "../../auth";
import { TableSession } from "../../app/table-session";
import { WebTableHost } from "./web-table";
import type { ActionIntent } from "../../contracts/shared/dto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");

/** Load /opt/holdem/.env when started under pm2 without a shell wrapper. */
function loadDotEnv(): void {
  for (const candidate of [join(process.cwd(), ".env"), join(__dirname, "../../../.env")]) {
    if (!existsSync(candidate)) continue;
    for (const line of readFileSync(candidate, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const i = trimmed.indexOf("=");
      const key = trimmed.slice(0, i).trim();
      let val = trimmed.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null || process.env[key] === "") process.env[key] = val;
    }
  }
}
loadDotEnv();

function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

const PORT = Number(env("HOLDEM_PORT", "3010"));
const PUBLIC_BASE = env("HOLDEM_PUBLIC_BASE", "http://127.0.0.1:3010").replace(/\/$/, "");
const REDIRECT_URI = env(
  "HOLDEM_REDIRECT_URI",
  `${PUBLIC_BASE}/oauth/callback`,
);
const COOKIE_NAME = "holdem_session";
const COOKIE_SECRET = env("TABLE_TOKEN_SECRET", "dev-only-change-me");

const auth = new Auth({
  clientId: env("GITHUB_CLIENT_ID"),
  clientSecret: env("GITHUB_CLIENT_SECRET"),
  redirectUri: REDIRECT_URI,
  tokenSecret: COOKIE_SECRET,
});

interface PlayerCookie {
  githubLogin: string;
}

interface TableRoom {
  id: string;
  session: TableSession;
  host: WebTableHost;
}

const rooms = new Map<string, TableRoom>();

function getRoom(tableId = "main"): TableRoom {
  let room = rooms.get(tableId);
  if (!room) {
    const session = new TableSession();
    room = { id: tableId, session, host: new WebTableHost(session, auth) };
    rooms.set(tableId, room);
  }
  return room;
}

function signCookie(payload: PlayerCookie): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", COOKIE_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function readCookie(req: IncomingMessage): PlayerCookie | null {
  const raw = req.headers.cookie ?? "";
  const part = raw
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_NAME}=`));
  if (!part) return null;
  const token = decodeURIComponent(part.slice(COOKIE_NAME.length + 1));
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = createHmac("sha256", COOKIE_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PlayerCookie;
    if (!parsed?.githubLogin) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setSessionCookie(res: ServerResponse, player: PlayerCookie): void {
  const value = encodeURIComponent(signCookie(player));
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${value}; Path=/holdem; HttpOnly; SameSite=Lax; Secure; Max-Age=604800`,
  );
}

function send(res: ServerResponse, status: number, body: unknown, type = "application/json"): void {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": `${type}; charset=utf-8`,
    "Cache-Control": "no-store",
  });
  res.end(data);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const raw = await readBody(req);
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}

function findSeat(room: TableRoom, githubLogin: string): number | null {
  for (let seat = 0; seat < 6; seat++) {
    try {
      const occ = room.session.seat.view({ seat });
      if (occ.you.githubLogin === githubLogin) return seat;
    } catch {
      /* empty seat */
    }
  }
  return null;
}

function firstFreeSeat(room: TableRoom): number | null {
  for (let seat = 0; seat < 2; seat++) {
    try {
      room.session.seat.view({ seat });
    } catch {
      return seat;
    }
  }
  return null;
}

function requirePlayer(req: IncomingMessage, res: ServerResponse): PlayerCookie | null {
  const player = readCookie(req);
  if (!player) {
    send(res, 401, { error: "login required" });
    return null;
  }
  return player;
}

async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
): Promise<void> {
  const room = getRoom("main");
  const method = req.method ?? "GET";

  if (method === "GET" && path === "/api/me") {
    const player = readCookie(req);
    if (!player) {
      send(res, 200, { loggedIn: false, loginUrl: `/holdem/login` });
      return;
    }
    const seat = findSeat(room, player.githubLogin);
    send(res, 200, {
      loggedIn: true,
      githubLogin: player.githubLogin,
      seat,
      tableId: room.id,
    });
    return;
  }

  if (method === "POST" && path === "/api/sit") {
    const player = requirePlayer(req, res);
    if (!player) return;
    const existing = findSeat(room, player.githubLogin);
    if (existing != null) {
      send(res, 200, { seat: existing, view: room.host.view(existing) });
      return;
    }
    const seat = firstFreeSeat(room);
    if (seat == null) {
      send(res, 409, { error: "table full (2 seats for MVP)" });
      return;
    }
    room.host.sit(seat, player.githubLogin);
    send(res, 200, { seat, view: room.host.view(seat) });
    return;
  }

  if (method === "POST" && path === "/api/start") {
    const player = requirePlayer(req, res);
    if (!player) return;
    const body = await readJson<{ seed?: number }>(req);
    try {
      room.host.startHand({ button: 0, seed: body.seed ?? Date.now() % 1_000_000, tableId: room.id });
      const seat = findSeat(room, player.githubLogin);
      send(res, 200, { ok: true, view: seat != null ? room.host.view(seat) : null });
    } catch (e) {
      send(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (method === "GET" && path === "/api/view") {
    const player = requirePlayer(req, res);
    if (!player) return;
    const seat = findSeat(room, player.githubLogin);
    if (seat == null) {
      send(res, 400, { error: "sit first" });
      return;
    }
    send(res, 200, {
      view: room.host.view(seat),
      result: room.host.result(),
      legal: room.host.legal(seat),
    });
    return;
  }

  if (method === "POST" && path === "/api/act") {
    const player = requirePlayer(req, res);
    if (!player) return;
    const seat = findSeat(room, player.githubLogin);
    if (seat == null) {
      send(res, 400, { error: "sit first" });
      return;
    }
    const body = await readJson<{ intent: ActionIntent }>(req);
    try {
      const view = room.host.clickAct({ seat, intent: body.intent });
      send(res, 200, { view, legal: room.host.legal(seat), result: room.host.result() });
    } catch (e) {
      send(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (method === "POST" && path === "/api/advance") {
    const player = requirePlayer(req, res);
    if (!player) return;
    try {
      room.host.advanceStreet();
      const seat = findSeat(room, player.githubLogin);
      send(res, 200, {
        view: seat != null ? room.host.view(seat) : null,
        result: room.host.result(),
      });
    } catch (e) {
      send(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (method === "POST" && path === "/api/control") {
    const player = requirePlayer(req, res);
    if (!player) return;
    const seat = findSeat(room, player.githubLogin);
    if (seat == null) {
      send(res, 400, { error: "sit first" });
      return;
    }
    const body = await readJson<{ control: "manual" | "hosted" }>(req);
    const view =
      body.control === "manual"
        ? room.host.takeBack(seat)
        : room.host.setControl({ seat, control: "hosted", host: "cursor" });
    send(res, 200, { view });
    return;
  }

  if (method === "POST" && path === "/api/reset") {
    const player = requirePlayer(req, res);
    if (!player) return;
    rooms.delete("main");
    send(res, 200, { ok: true });
    return;
  }

  send(res, 404, { error: "not found" });
}

function serveStatic(res: ServerResponse, filePath: string): void {
  if (!existsSync(filePath)) {
    send(res, 404, "not found", "text/plain");
    return;
  }
  const html = readFileSync(filePath);
  const type = filePath.endsWith(".js")
    ? "application/javascript"
    : filePath.endsWith(".css")
      ? "text/css"
      : "text/html";
  res.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
  res.end(html);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    let path = url.pathname;
    // Accept both /holdem/... (direct) and /... (nginx strip)
    if (path.startsWith("/holdem")) path = path.slice("/holdem".length) || "/";

    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      serveStatic(res, join(PUBLIC_DIR, "index.html"));
      return;
    }

    if (req.method === "GET" && path === "/login") {
      if (!env("GITHUB_CLIENT_ID")) {
        send(res, 500, "GITHUB_CLIENT_ID missing", "text/plain");
        return;
      }
      const state = randomBytes(8).toString("hex");
      const loc = auth.authorizationUrl(state);
      res.writeHead(302, { Location: loc });
      res.end();
      return;
    }

    if (req.method === "GET" && path === "/oauth/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        send(res, 400, "missing code", "text/plain");
        return;
      }
      const { githubLogin } = await auth.completeOAuth(code);
      setSessionCookie(res, { githubLogin });
      res.writeHead(302, { Location: `${PUBLIC_BASE}/` });
      res.end();
      return;
    }

    if (path.startsWith("/api/")) {
      await handleApi(req, res, path);
      return;
    }

    send(res, 404, "not found", "text/plain");
  } catch (e) {
    send(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`holdem listening on 127.0.0.1:${PORT} public=${PUBLIC_BASE}`);
});
