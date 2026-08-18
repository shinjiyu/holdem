/** HTTP host: lobby + tables + star-claim + OAuth for kuroneko.chat/holdem/ */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Auth } from "../../auth";
import { createGithubStarFetcher, StarGrantLedger } from "../../auth/star-grant";
import { TableSession } from "../../app/table-session";
import { WebTableHost } from "./web-table";
import { StarClaimHost } from "./star-claim";
import { BankPlugin } from "../../bank";
import { DEFAULT_TABLE_CONFIG } from "../../config";
import type { ActionIntent } from "../../contracts/shared/dto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const DATA_DIR = join(process.cwd(), "data");
const META_FILE = join(DATA_DIR, "players.json");
const MAX_SEATS = DEFAULT_TABLE_CONFIG.maxSeats;

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
const REDIRECT_URI = env("HOLDEM_REDIRECT_URI", `${PUBLIC_BASE}/oauth/callback`);
const COOKIE_NAME = "holdem_session";
const COOKIE_SECRET = env("TABLE_TOKEN_SECRET", "dev-only-change-me");
/** Temporary multi-seat testing. Unset HOLDEM_TEST_SECRET to disable /dev/as. */
const TEST_SECRET = env("HOLDEM_TEST_SECRET");
const TEST_LOGINS = new Set(["bot1", "bot2", "bot3", "bot4", "bot5", "bot6"]);
const TEST_STACK = 1_000_000;

function isTestLogin(login: string): boolean {
  return TEST_LOGINS.has(login.toLowerCase());
}

/** Test bots are memory-only while secret is on; never treat as real session when secret is off. */
function testLoginAllowed(): boolean {
  return Boolean(TEST_SECRET);
}

const auth = new Auth({
  clientId: env("GITHUB_CLIENT_ID"),
  clientSecret: env("GITHUB_CLIENT_SECRET"),
  redirectUri: REDIRECT_URI,
  tokenSecret: COOKIE_SECRET,
});

interface PlayerCookie {
  githubLogin: string;
  avatarUrl?: string;
}

interface SeatInfo {
  seat: number;
  githubLogin: string | null;
  avatarUrl: string | null;
  /** Chips put in on the current betting street (0 if empty / idle). */
  streetBet: number;
}

interface TableRoom {
  id: string;
  name: string;
  session: TableSession;
  host: WebTableHost;
  avatars: Map<string, string>;
}

interface PersistedState {
  players: Record<string, { avatarUrl: string; accessToken?: string }>;
  lobbyIndex: Record<string, number>;
  lobbyStacks: Record<string, number>;
  lobbySeatSeq: number;
  starClaimed: string[];
}

const lobbyBank = new BankPlugin();
const starLedger = new StarGrantLedger();
const starClaim = new StarClaimHost(
  lobbyBank,
  createGithubStarFetcher(DEFAULT_TABLE_CONFIG.starGrantRepo),
  { ledger: starLedger, amount: DEFAULT_TABLE_CONFIG.starGrantChips },
);
let lobbySeatSeq = 0;
const lobbyIndex = new Map<string, number>();
const playerMeta = new Map<string, { avatarUrl: string; accessToken?: string }>();
const rooms = new Map<string, TableRoom>();

function savePersist(): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const lobbyStacks: Record<string, number> = {};
  const lobbyIndexOut: Record<string, number> = {};
  for (const [login, seat] of lobbyIndex) {
    if (isTestLogin(login)) continue; // bots never touch disk
    lobbyStacks[login] = lobbyBank.stack(seat);
    lobbyIndexOut[login] = seat;
  }
  const players: PersistedState["players"] = {};
  for (const [login, meta] of playerMeta) {
    if (isTestLogin(login)) continue;
    players[login] = { ...meta };
  }
  const state: PersistedState = {
    players,
    lobbyIndex: lobbyIndexOut,
    lobbyStacks,
    lobbySeatSeq,
    starClaimed: [...starClaimedSet].filter((l) => !isTestLogin(l)),
  };
  writeFileSync(META_FILE, JSON.stringify(state), "utf8");
}

const starClaimedSet = new Set<string>();

function purgeTestLoginsFromMemory(): void {
  for (const login of [...lobbyIndex.keys()]) {
    if (!isTestLogin(login)) continue;
    lobbyIndex.delete(login);
  }
  for (const login of [...playerMeta.keys()]) {
    if (!isTestLogin(login)) continue;
    playerMeta.delete(login);
  }
  for (const login of [...starClaimedSet]) {
    if (isTestLogin(login)) starClaimedSet.delete(login);
  }
}

function loadPersist(): void {
  if (!existsSync(META_FILE)) return;
  try {
    const state = JSON.parse(readFileSync(META_FILE, "utf8")) as PersistedState;
    lobbySeatSeq = state.lobbySeatSeq ?? 0;
    let dirty = false;
    for (const [login, seat] of Object.entries(state.lobbyIndex ?? {})) {
      if (isTestLogin(login)) {
        dirty = true;
        continue;
      }
      lobbyIndex.set(login, seat);
      const stack = state.lobbyStacks?.[login] ?? DEFAULT_TABLE_CONFIG.startingStack;
      lobbyBank.sit({ seat, githubLogin: login, stack });
    }
    for (const [login, meta] of Object.entries(state.players ?? {})) {
      if (isTestLogin(login)) {
        dirty = true;
        continue;
      }
      playerMeta.set(login, meta);
    }
    for (const login of state.starClaimed ?? []) {
      if (isTestLogin(login)) {
        dirty = true;
        continue;
      }
      starClaimedSet.add(login);
      starLedger.markClaimed(login);
    }
    if (dirty) savePersist(); // rewrite file without bots
  } catch (e) {
    console.error("loadPersist failed", e);
  }
}

loadPersist();
if (!testLoginAllowed()) purgeTestLoginsFromMemory();

function rememberPlayer(
  githubLogin: string,
  meta: { avatarUrl: string; accessToken?: string },
): void {
  const prev = playerMeta.get(githubLogin);
  playerMeta.set(githubLogin, {
    avatarUrl: meta.avatarUrl || prev?.avatarUrl || avatarFor(githubLogin),
    accessToken: meta.accessToken || prev?.accessToken,
  });
  if (!isTestLogin(githubLogin)) savePersist();
}

function avatarFor(login: string, explicit?: string): string {
  return explicit || `https://github.com/${login}.png?size=80`;
}

function ensureLobbyWallet(githubLogin: string): number {
  const hit = lobbyIndex.get(githubLogin);
  if (hit != null) return hit;
  const seat = lobbySeatSeq++;
  lobbyBank.sit({
    seat,
    githubLogin,
    stack: DEFAULT_TABLE_CONFIG.startingStack,
  });
  lobbyIndex.set(githubLogin, seat);
  if (!isTestLogin(githubLogin)) savePersist();
  return seat;
}

function sessionFromRequest(req: IncomingMessage): PlayerCookie | null {
  const player = readCookie(req);
  if (!player) return null;
  // Stale bot cookie after QA: pretend logged out so GitHub login is reachable
  if (isTestLogin(player.githubLogin) && !testLoginAllowed()) return null;
  return player;
}

function createRoom(name?: string): TableRoom {
  const id = randomBytes(3).toString("hex");
  const session = new TableSession();
  const room: TableRoom = {
    id,
    name: name?.trim() || `桌 ${id}`,
    session,
    host: new WebTableHost(session, auth),
    avatars: new Map(),
  };
  rooms.set(id, room);
  return room;
}

function getRoom(tableId: string): TableRoom | null {
  return rooms.get(tableId) ?? null;
}

function seatOccupants(room: TableRoom): SeatInfo[] {
  const out: SeatInfo[] = [];
  for (let seat = 0; seat < MAX_SEATS; seat++) {
    const streetBet = room.session.isHandActive()
      ? room.session.betting.committed(seat)
      : 0;
    try {
      const occ = room.session.seat.view({ seat });
      out.push({
        seat,
        githubLogin: occ.you.githubLogin,
        avatarUrl: room.avatars.get(occ.you.githubLogin) ?? avatarFor(occ.you.githubLogin),
        streetBet,
      });
    } catch {
      out.push({ seat, githubLogin: null, avatarUrl: null, streetBet: 0 });
    }
  }
  return out;
}

function findSeat(room: TableRoom, githubLogin: string): number | null {
  for (const s of seatOccupants(room)) {
    if (s.githubLogin === githubLogin) return s.seat;
  }
  return null;
}

function firstFreeSeat(room: TableRoom): number | null {
  for (const s of seatOccupants(room)) {
    if (!s.githubLogin) return s.seat;
  }
  return null;
}

function tablePayload(room: TableRoom, seat: number): Record<string, unknown> {
  const active = room.session.isHandActive();
  return {
    tableId: room.id,
    seats: seatOccupants(room),
    handActive: active,
    streetBet: active ? room.session.betting.streetBet : 0,
    view: room.host.view(seat),
    result: room.host.result(),
    legal: room.host.legal(seat),
  };
}

function playerTable(githubLogin: string): { tableId: string; seat: number } | null {
  for (const room of rooms.values()) {
    const seat = findSeat(room, githubLogin);
    if (seat != null) return { tableId: room.id, seat };
  }
  return null;
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

function clearSessionCookie(res: ServerResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/holdem; HttpOnly; SameSite=Lax; Secure; Max-Age=0`,
  );
}

function accessTokenOf(githubLogin: string, cookie?: PlayerCookie | null): string | undefined {
  return playerMeta.get(githubLogin)?.accessToken;
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
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const raw = await readBody(req);
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}

function requirePlayer(req: IncomingMessage, res: ServerResponse): PlayerCookie | null {
  const player = sessionFromRequest(req);
  if (!player) {
    send(res, 401, { error: "login required" });
    return null;
  }
  return player;
}

function lobbySnapshot() {
  return [...rooms.values()].map((room) => {
    const seats = seatOccupants(room);
    return {
      id: room.id,
      name: room.name,
      maxSeats: MAX_SEATS,
      occupied: seats.filter((s) => s.githubLogin).length,
      seats,
      street: (() => {
        try {
          return room.session.dealer.street;
        } catch {
          return "idle";
        }
      })(),
    };
  });
}

async function handleApi(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
  const method = req.method ?? "GET";

  if (method === "GET" && path === "/api/me") {
    const raw = readCookie(req);
    // Drop stale bot cookie when test mode is off
    if (raw && isTestLogin(raw.githubLogin) && !testLoginAllowed()) {
      clearSessionCookie(res);
      send(res, 200, { loggedIn: false, loginUrl: `${PUBLIC_BASE}/login` });
      return;
    }
    const player = sessionFromRequest(req);
    if (!player) {
      send(res, 200, { loggedIn: false, loginUrl: `${PUBLIC_BASE}/login` });
      return;
    }
    ensureLobbyWallet(player.githubLogin);
    const meta = playerMeta.get(player.githubLogin);
    const at = playerTable(player.githubLogin);
    const hasToken = Boolean(accessTokenOf(player.githubLogin, player));
    const testUser = isTestLogin(player.githubLogin);
    send(res, 200, {
      loggedIn: true,
      githubLogin: player.githubLogin,
      avatarUrl: meta?.avatarUrl ?? player.avatarUrl ?? avatarFor(player.githubLogin),
      chips: lobbyBank.stack(lobbyIndex.get(player.githubLogin)!),
      starGrantChips: DEFAULT_TABLE_CONFIG.starGrantChips,
      starGrantRepo: DEFAULT_TABLE_CONFIG.starGrantRepo,
      starClaimed: testUser
        ? true
        : starClaimedSet.has(player.githubLogin) || starLedger.hasClaimed(player.githubLogin),
      needsReauth: testUser ? false : !hasToken,
      isTestUser: testUser,
      tableId: at?.tableId ?? null,
      seat: at?.seat ?? null,
    });
    return;
  }

  if (method === "POST" && path === "/api/logout") {
    clearSessionCookie(res);
    send(res, 200, { ok: true });
    return;
  }

  if (method === "GET" && path === "/api/lobby") {
    send(res, 200, { tables: lobbySnapshot() });
    return;
  }

  if (method === "POST" && path === "/api/tables") {
    const player = requirePlayer(req, res);
    if (!player) return;
    if (playerTable(player.githubLogin)) {
      send(res, 409, { error: "already seated; leave first" });
      return;
    }
    const body = await readJson<{ name?: string }>(req);
    const room = createRoom(body.name);
    send(res, 200, { table: lobbySnapshot().find((t) => t.id === room.id) });
    return;
  }

  if (method === "POST" && path.startsWith("/api/tables/") && path.endsWith("/join")) {
    const player = requirePlayer(req, res);
    if (!player) return;
    const tableId = path.slice("/api/tables/".length, -"/join".length);
    const room = getRoom(tableId);
    if (!room) {
      send(res, 404, { error: "table not found" });
      return;
    }
    const existing = playerTable(player.githubLogin);
    if (existing && existing.tableId !== tableId) {
      send(res, 409, { error: "already at another table" });
      return;
    }
    if (existing?.tableId === tableId) {
      send(res, 200, { tableId, seat: existing.seat, seats: seatOccupants(room) });
      return;
    }
    const body = await readJson<{ seat?: number }>(req);
    let seat = body.seat;
    if (seat == null) seat = firstFreeSeat(room) ?? undefined;
    if (seat == null || seat < 0 || seat >= MAX_SEATS) {
      send(res, 409, { error: "table full" });
      return;
    }
    if (findSeat(room, player.githubLogin) == null) {
      try {
        room.session.seat.view({ seat });
        send(res, 409, { error: `seat ${seat} taken` });
        return;
      } catch {
        /* empty */
      }
    }
    ensureLobbyWallet(player.githubLogin);
    const chips = lobbyBank.stack(lobbyIndex.get(player.githubLogin)!);
    room.host.sit(seat, player.githubLogin, chips);
    const av = playerMeta.get(player.githubLogin)?.avatarUrl ?? player.avatarUrl ?? avatarFor(player.githubLogin);
    room.avatars.set(player.githubLogin, av);
    send(res, 200, { tableId, seat, seats: seatOccupants(room) });
    return;
  }

  if (method === "POST" && path.startsWith("/api/tables/") && path.endsWith("/leave")) {
    const player = requirePlayer(req, res);
    if (!player) return;
    const tableId = path.slice("/api/tables/".length, -"/leave".length);
    const room = getRoom(tableId);
    if (!room) {
      send(res, 404, { error: "table not found" });
      return;
    }
    const seat = findSeat(room, player.githubLogin);
    if (seat == null) {
      send(res, 200, { ok: true });
      return;
    }
    // Persist chips back to lobby
    ensureLobbyWallet(player.githubLogin);
    const chips = room.session.bank.stack(seat);
    const lobbySeat = lobbyIndex.get(player.githubLogin)!;
    lobbyBank.sit({ seat: lobbySeat, githubLogin: player.githubLogin, stack: chips });
    savePersist();
    // Recreate session without this seat — simplest: rebuild occupants
    const keep = seatOccupants(room).filter((s) => s.githubLogin && s.githubLogin !== player.githubLogin);
    const session = new TableSession();
    const host = new WebTableHost(session, auth);
    const avatars = new Map<string, string>();
    for (const s of keep) {
      const login = s.githubLogin!;
      const stack = room.session.bank.stack(s.seat);
      host.sit(s.seat, login, stack);
      avatars.set(login, room.avatars.get(login) ?? avatarFor(login));
    }
    room.session = session;
    room.host = host;
    room.avatars = avatars;
    if (keep.length === 0) rooms.delete(tableId);
    send(res, 200, { ok: true, chips: lobbyBank.stack(lobbySeat) });
    return;
  }

  if (method === "POST" && path === "/api/star-claim") {
    const player = requirePlayer(req, res);
    if (!player) return;
    const token = accessTokenOf(player.githubLogin, player);
    if (!token) {
      send(res, 401, {
        error: "需要重新登录 GitHub 才能领币",
        needsReauth: true,
        loginUrl: `${PUBLIC_BASE}/login`,
      });
      return;
    }
    ensureLobbyWallet(player.githubLogin);
    try {
      const result = await starClaim.claim(player.githubLogin, token);
      starClaimedSet.add(player.githubLogin);
      savePersist();
      send(res, 200, {
        ...result,
        chips: lobbyBank.stack(lobbyIndex.get(player.githubLogin)!),
        starClaimed: true,
      });
    } catch (e) {
      send(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  // ---- in-table APIs (require ?tableId= or body.tableId) ----
  const needTable = async (): Promise<{ player: PlayerCookie; room: TableRoom; seat: number } | null> => {
    const player = requirePlayer(req, res);
    if (!player) return null;
    const at = playerTable(player.githubLogin);
    if (!at) {
      send(res, 400, { error: "join a table from the lobby first" });
      return null;
    }
    const room = getRoom(at.tableId);
    if (!room) {
      send(res, 404, { error: "table gone" });
      return null;
    }
    return { player, room, seat: at.seat };
  };

  if (method === "POST" && path === "/api/start") {
    const ctx = await needTable();
    if (!ctx) return;
    const body = await readJson<{ seed?: number }>(req);
    try {
      const button = seatOccupants(ctx.room).find((s) => s.githubLogin)?.seat ?? 0;
      ctx.room.host.startHand({
        button,
        seed: body.seed ?? Date.now() % 1_000_000,
        tableId: ctx.room.id,
      });
      send(res, 200, {
        ok: true,
        ...tablePayload(ctx.room, ctx.seat),
      });
    } catch (e) {
      send(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (method === "GET" && path === "/api/view") {
    const ctx = await needTable();
    if (!ctx) return;
    send(res, 200, tablePayload(ctx.room, ctx.seat));
    return;
  }

  if (method === "POST" && path === "/api/act") {
    const ctx = await needTable();
    if (!ctx) return;
    const body = await readJson<{ intent: ActionIntent }>(req);
    try {
      ctx.room.host.clickAct({ seat: ctx.seat, intent: body.intent });
      send(res, 200, tablePayload(ctx.room, ctx.seat));
    } catch (e) {
      send(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (method === "POST" && path === "/api/advance") {
    const ctx = await needTable();
    if (!ctx) return;
    try {
      ctx.room.host.advanceStreet();
      send(res, 200, tablePayload(ctx.room, ctx.seat));
    } catch (e) {
      send(res, 400, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (method === "POST" && path === "/api/control") {
    // Phase-2 AI hosting: H5 no longer toggles control. Keep API for agent tests.
    send(res, 501, { error: "AI hosting deferred to phase 2" });
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
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

// seed a couple empty tables so lobby isn't blank
createRoom("新手桌 A");
createRoom("新手桌 B");

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    let path = url.pathname;
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
      // Always clear prior session (incl. test bots) so GitHub OAuth can replace it
      clearSessionCookie(res);
      const loc = auth.authorizationUrl(randomBytes(8).toString("hex"));
      res.writeHead(302, { Location: loc });
      res.end();
      return;
    }

    // Temporary: https://…/holdem/dev/as?u=bot1&k=<HOLDEM_TEST_SECRET>
    // Disabled when HOLDEM_TEST_SECRET is unset. Bots are memory-only (not in players.json).
    if (req.method === "GET" && path === "/dev/as") {
      if (!TEST_SECRET) {
        send(res, 404, "not found", "text/plain");
        return;
      }
      const k = url.searchParams.get("k") ?? "";
      const u = (url.searchParams.get("u") ?? "").trim().toLowerCase();
      if (!k || k !== TEST_SECRET || !TEST_LOGINS.has(u)) {
        send(res, 403, "forbidden", "text/plain");
        return;
      }
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u)}`;
      rememberPlayer(u, { avatarUrl });
      ensureLobbyWallet(u);
      const seat = lobbyIndex.get(u)!;
      lobbyBank.sit({ seat, githubLogin: u, stack: TEST_STACK });
      setSessionCookie(res, { githubLogin: u, avatarUrl });
      res.writeHead(302, { Location: `${PUBLIC_BASE}/` });
      res.end();
      return;
    }

    if (req.method === "GET" && path === "/oauth/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        send(res, 400, "missing code", "text/plain");
        return;
      }
      const result = await auth.completeOAuth(code);
      if (!result.accessToken) {
        console.error("oauth callback missing accessToken for", result.githubLogin);
      }
      const avatarUrl = result.avatarUrl ?? avatarFor(result.githubLogin);
      rememberPlayer(result.githubLogin, {
        avatarUrl,
        accessToken: result.accessToken,
      });
      ensureLobbyWallet(result.githubLogin);
      setSessionCookie(res, {
        githubLogin: result.githubLogin,
        avatarUrl,
      });
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

// Force check/fold when a seat's action clock expires (even if nobody is polling)
setInterval(() => {
  for (const room of rooms.values()) {
    try {
      room.session.expireTimedOutActions();
    } catch (e) {
      console.error("expireTimedOutActions", room.id, e);
    }
  }
}, 1000);