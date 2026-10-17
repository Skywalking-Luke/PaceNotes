// LH Cars Arcade multiplayer client. One shared module for all six games.
// Rooms of up to 4 players on a Cloudflare Durable Object relay. Ghost cars, no contact between humans.
import qrcode from "./qr";

export type MPState = { p: number; x: number; y: number; a: number; sc: number; lv: number; tm: number; v: number };
export interface MPAdapter {
  id: string;            // relay game id
  title: string;
  color: string;         // accent colour
  target: number;        // levels/laps/stages to finish the race
  unit: string;          // singular: "STAGE", "LAP", ...
  start(seed: number): void;
  state(): MPState;
  quit(): void;          // back to the solo title screen
}
export type Ghost = { id: string; name: string; col: string; p: number; x: number; y: number; a: number; lv: number; sc: number; st: string };

const PROD = "https://lhcars-mp.lhcars.workers.dev";
const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const qs = new URLSearchParams(location.search);
const SERVER = (local && qs.get("mpserver")) || PROD;
export const COLORS = ["#ff3b3b", "#3b7bff", "#ffd23f", "#38d860", "#ff8a1a", "#b05cff", "#2fe0e0", "#ff5fa8"];
const CNAMES = ["RED", "BLUE", "YELLOW", "GREEN", "ORANGE", "PURPLE", "CYAN", "PINK"];
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SEND_MS = 80;      // ~12.5 state updates per second
const INTERP_MS = 140;   // render remote cars this far in the past

type P = { id: string; name: string; col: number; ready: boolean; joined: number; spec: boolean };
type Res = { id: string; name: string; col: number; sc: number; t: number; lv: number; how: string };
type Snap = { at: number; s: MPState };

let A: MPAdapter;
let ws: WebSocket | null = null;
let code = "", myId = "", host = "", phase = "lobby", race = 0, seed = 0, startAt = 0, deadline = 0;
let players: P[] = [];
let offset = 0, bestRtt = 1e9;
let view: "" | "menu" | "lobby" | "count" | "race" | "wait" | "results" | "error" | "spec" = "";
let sendT = 0, standT = 0, reconnects = 0, wantClose = false, myDone = "", results: Res[] = [];
const buf = new Map<string, Snap[]>();
const done = new Map<string, { how: string; sc: number; tm: number; lv: number }>();
let root: HTMLDivElement, panel: HTMLDivElement, stand: HTMLDivElement, tags: HTMLDivElement, cd: HTMLDivElement;

export const MP = {
  get active() { return !!view && view !== "menu" && view !== "error"; },
  get racing() { return view === "race" || view === "wait" || view === "count"; },
  get inRace() { return view === "race"; },
  get seed() { return seed; },
  get target() { return A ? A.target : 3; },
  init, open, finish, ghosts, tag, flushTags, rngSeed, rngRun, tint, leave,
};

// ---------- seeded RNG (same world for every player) ----------
const nativeRandom = Math.random;
let rngOn = false, rs = 1, patched = false;
function mulberry() { rs |= 0; rs = (rs + 0x6d2b79f5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function rngSeed(n: number) { rs = (Math.imul(seed ^ 0x9e3779b9, 2654435761) ^ Math.imul(n + 1, 40503)) | 0; for (let i = 0; i < 4; i++) mulberry(); }
function rngRun<T>(f: () => T): T {
  if (!MP.racing) return f();
  if (!patched) { patched = true; Math.random = () => (rngOn ? mulberry() : nativeRandom()); }
  const was = rngOn; rngOn = true; try { return f(); } finally { rngOn = was; }
}

// ---------- tinted sprites for ghost cars ----------
const tintCache = new Map<string, HTMLCanvasElement>();
function tint(img: CanvasImageSource & { width: number; height: number }, col: string, key: string) {
  const k = key + col; let c = tintCache.get(k); if (c) return c;
  c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0); g.globalCompositeOperation = "source-atop"; g.globalAlpha = 0.6; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  tintCache.set(k, c); return c;
}

// ---------- DOM ----------
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const $ = (id: string) => document.getElementById(id) as HTMLElement;
function css() {
  const s = document.createElement("style");
  s.textContent = `
#lhmp{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;background:rgba(4,6,14,.82);font-family:"Press Start 2P",ui-monospace,monospace;color:#fff;-webkit-user-select:none;user-select:none}
#lhmp.on{display:flex}
#lhmp .c{width:min(380px,94vw);max-height:94vh;overflow:auto;background:#0b0f1e;border:3px solid var(--mpc);box-shadow:6px 6px 0 #000;padding:14px;text-align:center;box-sizing:border-box}
#lhmp h2{font-size:13px;margin:4px 0 10px;color:var(--mpc);text-shadow:2px 2px 0 #000}
#lhmp h3{font-size:9px;margin:10px 0 6px;color:#9fb0d0}
#lhmp p{font-size:8px;line-height:1.7;margin:6px 0;color:#c8d2ea}
#lhmp button{font:inherit;font-size:10px;display:block;width:100%;margin:6px 0;padding:11px 8px;background:var(--mpc);color:#000;border:0;box-shadow:3px 3px 0 #000;cursor:pointer}
#lhmp button.alt{background:#1c2440;color:#fff}
#lhmp button:disabled{opacity:.45}
#lhmp button.sm{display:inline-block;width:auto;font-size:8px;padding:8px 10px;margin:4px}
#lhmp input{font:inherit;font-size:11px;width:100%;box-sizing:border-box;padding:10px;background:#000;color:#fff;border:2px solid #3a4670;text-transform:uppercase;text-align:center;-webkit-user-select:text;user-select:text}
#lhmp .sw{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:8px 0}
#lhmp .sw i{width:24px;height:24px;display:inline-block;border:2px solid #000;box-shadow:2px 2px 0 #000;cursor:pointer}
#lhmp .sw i.on{outline:3px solid #fff}
#lhmp .sw i.x{opacity:.2;cursor:not-allowed}
#lhmp .pl{text-align:left;font-size:9px;margin:8px 0}
#lhmp .pl div{display:flex;align-items:center;gap:8px;padding:7px 6px;border-bottom:1px solid #1f2a48}
#lhmp .pl div.me{background:#16203c}
#lhmp .pl b{width:12px;height:12px;display:inline-block;border:1px solid #000;flex:none}
#lhmp .pl span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lhmp .pl em{font-style:normal;font-size:7px;color:#7dff9a}
#lhmp .pl em.no{color:#ffb84f}
#lhmp .qr{background:#fff;padding:8px;display:inline-block;margin:4px auto;image-rendering:pixelated}
#lhmp .qr canvas{display:block;width:150px;height:150px;image-rendering:pixelated}
#lhmp .lnk{font-size:7px;word-break:break-all;color:#9fb0d0;margin:4px 0}
#lhmp .code{font-size:22px;letter-spacing:6px;color:#fff;margin:2px 0 6px}
#lhmp table{width:100%;border-collapse:collapse;font-size:8px;margin:8px 0}
#lhmp td,#lhmp th{padding:6px 3px;border-bottom:1px solid #1f2a48;text-align:left}
#lhmp th{color:#9fb0d0;font-weight:normal}
#lhmp td.r,#lhmp th.r{text-align:right}
#lhmp tr.me td{background:#16203c}
#lhmp .err{color:#ff7a6a}
#lhmp-st{position:fixed;z-index:8000;right:6px;top:38%;font-family:"Press Start 2P",ui-monospace,monospace;font-size:7px;color:#fff;background:rgba(0,0,0,.55);padding:5px 6px;pointer-events:none;display:none;min-width:118px;line-height:1.9}
#lhmp-st div{display:flex;gap:5px;align-items:center;white-space:nowrap}
#lhmp-st div.me{color:#ffd23f}
#lhmp-st b{width:7px;height:7px;display:inline-block;flex:none}
#lhmp-st span{flex:1;overflow:hidden;text-overflow:ellipsis;max-width:62px}
#lhmp-tags{position:fixed;inset:0;z-index:7999;pointer-events:none;font-family:"Press Start 2P",ui-monospace,monospace}
#lhmp-tags i{position:absolute;font-style:normal;font-size:7px;padding:2px 3px;color:#000;transform:translate(-50%,-100%);white-space:nowrap;box-shadow:1px 1px 0 #000;opacity:.92}
#lhmp-cd{position:fixed;inset:0;z-index:9100;display:none;align-items:center;justify-content:center;pointer-events:none;font-family:"Press Start 2P",ui-monospace,monospace;font-size:64px;color:var(--mpc);text-shadow:5px 5px 0 #000}
#lhmp-cd small{display:block;font-size:10px;color:#fff;margin-top:14px;text-align:center}
.lhmp-btn{}
`;
  document.head.appendChild(s);
}
function build() {
  css();
  root = document.createElement("div"); root.id = "lhmp"; root.style.setProperty("--mpc", A.color);
  panel = document.createElement("div"); panel.className = "c"; root.appendChild(panel);
  stand = document.createElement("div"); stand.id = "lhmp-st";
  tags = document.createElement("div"); tags.id = "lhmp-tags";
  cd = document.createElement("div"); cd.id = "lhmp-cd"; cd.style.setProperty("--mpc", A.color);
  document.body.append(root, stand, tags, cd);
  // keep game hotkeys (R, M, Enter...) and canvas taps away from the overlay
  for (const ev of ["keydown", "keyup", "pointerdown", "pointerup", "touchstart", "mousedown", "contextmenu"]) root.addEventListener(ev, (e) => e.stopPropagation());
}
function show(html: string, v: typeof view) { view = v; panel.innerHTML = html; root.classList.add("on"); }
function hide() { root.classList.remove("on"); panel.innerHTML = ""; }

// ---------- identity ----------
const NAME_K = "lhmp.name", COL_K = "lhmp.col", PID_K = "lhmp.pid";
const getName = () => (localStorage.getItem(NAME_K) || "").slice(0, 12);
const setName = (n: string) => localStorage.setItem(NAME_K, n);
const getCol = () => Math.abs(parseInt(localStorage.getItem(COL_K) || "", 10) || 0) % COLORS.length;
const pid = () => { let p = sessionStorage.getItem(PID_K); if (!p) { p = Math.random().toString(36).slice(2, 12); sessionStorage.setItem(PID_K, p); } return p; };
const cleanName = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 _.\-!?]/g, "").trim().slice(0, 12);
function defaultName() { const n = getName(); if (n) return n; const d = "RACER" + Math.floor(10 + Math.random() * 89); setName(d); return d; }

// ---------- public: setup ----------
let built = false;
const raceLen = () => `${A.target} ${A.unit}${A.target > 1 ? "S" : ""}`;
function init(adapter: MPAdapter) {
  A = adapter; if (built) return; built = true; build();
  const r = (qs.get("room") || "").toUpperCase();
  if (r) { if (validCode(r)) { defaultName(); join(r); } else showError("BAD INVITE", "That room code is not valid."); }
}
const validCode = (c: string) => c.length === 4 && [...c].every((ch) => ALPHA.includes(ch));
function open() {
  const n = getName(), col = getCol();
  show(`<h2>MULTIPLAYER</h2><p>Race up to 3 friends. Same track, same traffic, same power-ups. Other players are ghost cars, so no crashes between humans.</p>
  <h3>YOUR NAME</h3><input id="mpn" maxlength="12" placeholder="NICKNAME" value="${esc(n)}" autocomplete="off" spellcheck="false" />
  <h3>CAR COLOUR</h3><div class="sw" id="mpsw">${COLORS.map((c, i) => `<i data-c="${i}" class="${i === col ? "on" : ""}" style="background:${c}" title="${CNAMES[i]}"></i>`).join("")}</div>
  <button id="mpcreate">CREATE ROOM</button>
  <h3>OR JOIN WITH A CODE</h3><input id="mpcode" maxlength="4" placeholder="ABCD" autocomplete="off" spellcheck="false" />
  <button class="alt" id="mpjoin">JOIN ROOM</button><button class="alt" id="mpback">BACK</button><p class="err" id="mperr"></p>`, "menu");
  const nameOk = () => { const v = cleanName(($("mpn") as HTMLInputElement).value); if (!v) { $("mperr").textContent = "Enter a nickname first"; return ""; } setName(v); return v; };
  $("mpsw").onclick = (e) => { const c = (e.target as HTMLElement).dataset.c; if (c == null) return; localStorage.setItem(COL_K, c); $("mpsw").querySelectorAll("i").forEach((i) => i.classList.toggle("on", i.dataset.c === c)); };
  $("mpback").onclick = () => { hide(); view = ""; };
  $("mpcreate").onclick = async () => {
    if (!nameOk()) return; const b = $("mpcreate") as HTMLButtonElement; b.disabled = true; b.textContent = "CREATING...";
    try {
      const r = await fetch(`${SERVER}/new?game=${A.id}`, { method: "POST" }); const j = await r.json();
      if (!r.ok || !j.code) throw new Error(j.error || "server");
      join(j.code);
    } catch (e) { b.disabled = false; b.textContent = "CREATE ROOM"; $("mperr").textContent = "Could not reach the race server. Check your connection and try again."; }
  };
  $("mpjoin").onclick = () => { if (!nameOk()) return; const c = ($("mpcode") as HTMLInputElement).value.toUpperCase().trim(); if (!validCode(c)) { $("mperr").textContent = "Room codes are 4 letters/numbers"; return; } join(c); };
  ($("mpcode") as HTMLInputElement).onkeydown = (e) => { if (e.key === "Enter") $("mpjoin").click(); };
}
function showError(t: string, msg: string) {
  cleanup(); show(`<h2>${esc(t)}</h2><p>${esc(msg)}</p><button id="mpo">MULTIPLAYER MENU</button><button class="alt" id="mpx">PLAY SOLO</button>`, "error");
  $("mpo").onclick = () => open(); $("mpx").onclick = () => { hide(); view = ""; A.quit(); };
}
function setUrl(c: string) {
  const u = new URL(location.href); if (c) u.searchParams.set("room", c); else u.searchParams.delete("room"); u.searchParams.delete("v");
  history.replaceState(null, "", u.pathname + u.search + u.hash);
}
const invite = () => `${location.origin}${location.pathname}?room=${code}`;

// ---------- connection ----------
function join(c: string) {
  code = c; wantClose = false; setUrl(c);
  show(`<h2>ROOM ${esc(c)}</h2><p>Connecting...</p>`, "lobby");
  connect();
}
function connect() {
  const url = `${SERVER.replace(/^http/, "ws")}/ws/${A.id}/${code}`;
  const s = new WebSocket(url); ws = s;
  s.onmessage = (e) => { let m: any; try { m = JSON.parse(e.data); } catch { return; } onMsg(m); };
  s.onclose = (e) => {
    if (ws !== s) return; ws = null;
    if (wantClose || [4001, 4002, 4003, 4004].includes(e.code)) return;
    if (reconnects < 6) { reconnects++; flash(`CONNECTION LOST · RETRYING (${reconnects})`); setTimeout(() => { if (!wantClose && !ws) connect(); }, 600 * reconnects); }
    else { const was = view; showError("DISCONNECTED", "Lost the connection to the race server."); if (was === "race") A.quit(); }
  };
}
function sendMsg(o: unknown) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function ping() { sendMsg({ t: "ping", c: performance.now() }); }
let pingIv = 0;
function onMsg(m: any) {
  switch (m.t) {
    case "hi": sendMsg({ t: "hello", name: defaultName(), col: getCol(), pid: pid() }); offset = m.now - Date.now(); ping(); setTimeout(ping, 400); setTimeout(ping, 900); clearInterval(pingIv); pingIv = window.setInterval(ping, 15000); break;
    case "pong": { const rtt = performance.now() - m.c; if (rtt < bestRtt || rtt < bestRtt * 1.3) { bestRtt = Math.min(bestRtt, rtt); offset = m.now + rtt / 2 - Date.now(); } break; }
    case "you": myId = m.id; reconnects = 0; if (m.seed && m.resume) { seed = m.seed; } break;
    case "err":
      if (m.e === "full") showError("ROOM FULL", "This room already has 4 players. Ask the host for a new invite, or create your own room.");
      else if (m.e === "nf") showError("ROOM NOT FOUND", "This invite has expired or the room was closed. Create a new room.");
      else if (m.e === "idle") showError("ROOM CLOSED", "The room closed after 20 minutes without activity.");
      else flash(m.msg || "Error");
      break;
    case "room": {
      players = m.players; host = m.host; const was = phase; phase = m.phase; race = m.race;
      const me = players.find((p) => p.id === myId);
      if (phase === "lobby") { if (view !== "lobby" || was !== "lobby") { if (MP.racing || view === "results") A.quit(); stopRace(); } lobby(); }
      else if (phase === "race" && me?.spec && view !== "race" && view !== "count" && view !== "wait") specView();
      else if (view === "results") renderResults();
      else if (view === "wait") waitView();
      break;
    }
    case "host": host = m.id; if (host === myId) flash("YOU ARE NOW THE HOST"); break;
    case "start": if (m.players.includes(myId)) countdown(m); break;
    case "st": { let a = buf.get(m.id); if (!a) { a = []; buf.set(m.id, a); } a.push({ at: performance.now(), s: m }); if (a.length > 12) a.shift(); if (view === "spec") specView(); break; }
    case "done": done.set(m.id, m); if (view === "wait") waitView(); break;
    case "deadline": deadline = m.at; break;
    case "left": buf.delete(m.id); break;
    case "results": results = m.results; showResults(); break;
  }
}
let flashTO = 0;
function flash(t: string) { let f = $("lhmp-fl"); if (!f) { f = document.createElement("div"); f.id = "lhmp-fl"; f.style.cssText = "position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9200;background:#000;color:#fff;font:8px 'Press Start 2P',monospace;padding:8px 10px;border:2px solid #fff;pointer-events:none"; document.body.appendChild(f); } f.textContent = t; f.style.display = "block"; clearTimeout(flashTO); flashTO = window.setTimeout(() => (f!.style.display = "none"), 2600); }

// ---------- lobby ----------
function qrCanvas(text: string) {
  const q = (qrcode as any)(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(), cv = document.createElement("canvas"); cv.width = n; cv.height = n; const g = cv.getContext("2d")!;
  g.fillStyle = "#fff"; g.fillRect(0, 0, n, n); g.fillStyle = "#000";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(c, r, 1, 1);
  return cv;
}
function lobby() {
  if (view === "lobby" && document.activeElement && (document.activeElement as HTMLElement).id === "mpn") { renderPlayers(); return; }
  const me = players.find((p) => p.id === myId), isHost = host === myId, full = players.length >= 4;
  const others = players.filter((p) => p.id !== host), allReady = others.every((p) => p.ready);
  const taken = new Set(players.filter((p) => p.id !== myId).map((p) => p.col));
  show(`<h2>${esc(A.title)} · ROOM</h2><div class="code">${esc(code)}</div>
  <div class="qr" id="mpqr"></div><div class="lnk">${esc(invite())}</div>
  <button class="sm alt" id="mpcopy">COPY LINK</button>${"share" in navigator ? `<button class="sm alt" id="mpshare">SHARE</button>` : ""}
  <p>Scan the QR or open the link to join. ${players.length}/4 players${full ? " · FULL" : ""}.<br>Race: ${esc(raceLen())} · highest points wins.</p>
  <div class="pl" id="mppl"></div>
  <h3>YOU</h3><input id="mpn" maxlength="12" value="${esc(me?.name || getName())}" autocomplete="off" spellcheck="false" />
  <div class="sw" id="mpsw">${COLORS.map((c, i) => `<i data-c="${i}" class="${me?.col === i ? "on" : ""} ${taken.has(i) ? "x" : ""}" style="background:${c}" title="${CNAMES[i]}"></i>`).join("")}</div>
  ${isHost ? `<button id="mpgo" ${allReady ? "" : "disabled"}>${allReady ? "START RACE" : "WAITING FOR READY"}</button>` : `<button id="mprd">${me?.ready ? "READY ✓ (TAP TO UNDO)" : "READY"}</button><p>The host starts the race.</p>`}
  <button class="alt" id="mplv">LEAVE ROOM</button>`, "lobby");
  $("mpqr").appendChild(qrCanvas(invite()));
  renderPlayers();
  $("mpcopy").onclick = () => { navigator.clipboard?.writeText(invite()).then(() => flash("INVITE LINK COPIED"), () => flash(invite())); };
  const sh = $("mpshare"); if (sh) sh.onclick = () => navigator.share({ title: `${A.title} race`, text: `Race me in ${A.title}! Room ${code}`, url: invite() }).catch(() => {});
  const ni = $("mpn") as HTMLInputElement;
  const commit = () => { const v = cleanName(ni.value); if (v && v !== me?.name) { setName(v); sendMsg({ t: "name", v }); } };
  ni.onchange = commit; ni.onblur = commit; ni.onkeydown = (e) => { if (e.key === "Enter") ni.blur(); };
  $("mpsw").onclick = (e) => { const c = (e.target as HTMLElement).dataset.c; if (c == null || taken.has(+c)) return; localStorage.setItem(COL_K, c); sendMsg({ t: "col", v: +c }); };
  if (isHost) $("mpgo").onclick = () => sendMsg({ t: "start" }); else $("mprd").onclick = () => sendMsg({ t: "ready", v: !me?.ready });
  $("mplv").onclick = () => leave();
}
function renderPlayers() {
  const el = $("mppl"); if (!el) return;
  el.innerHTML = players.slice().sort((a, b) => a.joined - b.joined).map((p) => `<div class="${p.id === myId ? "me" : ""}"><b style="background:${COLORS[p.col]}"></b><span>${esc(p.name)}${p.id === myId ? " (YOU)" : ""}</span>${p.id === host ? `<em>HOST</em>` : p.spec ? `<em class="no">WATCHING</em>` : p.ready ? `<em>READY</em>` : `<em class="no">NOT READY</em>`}</div>`).join("") + Array.from({ length: 4 - players.length }, () => `<div><b style="background:#222"></b><span style="color:#556">open slot</span></div>`).join("");
}

// ---------- race ----------
function countdown(m: any) {
  seed = m.seed; race = m.race; startAt = m.at; deadline = 0; myDone = ""; done.clear(); buf.clear(); results = [];
  hide(); view = "count"; cd.style.display = "flex"; A.quit();
  const tickCd = () => {
    if (view !== "count") { cd.style.display = "none"; return; }
    const left = startAt - (Date.now() + offset);
    if (left <= 0) { cd.innerHTML = "GO!"; setTimeout(() => (cd.style.display = "none"), 700); goRace(); return; }
    cd.innerHTML = `${Math.ceil(left / 1000)}<small>${players.filter((p) => !p.spec).length} RACERS · ${esc(raceLen())}</small>`;
    requestAnimationFrame(tickCd);
  };
  tickCd();
}
function goRace() {
  view = "race"; rngSeed(0); rngRun(() => A.start(seed));
  stand.style.display = "block"; clearInterval(sendT); clearInterval(standT);
  sendT = window.setInterval(sendState, SEND_MS); standT = window.setInterval(renderStand, 200);
}
function sendState() {
  if (view !== "race") return; const s = A.state(), r1 = (v: number) => Math.round(v * 10) / 10;
  sendMsg({ t: "st", r: race, p: r1(s.p), x: r1(s.x), y: r1(s.y), a: Math.round(s.a * 100) / 100, sc: Math.floor(s.sc), lv: s.lv, tm: r1(s.tm), v: Math.round(s.v) });
}
function stopRace() { clearInterval(sendT); clearInterval(standT); stand.style.display = "none"; tags.innerHTML = ""; cd.style.display = "none"; }
function finish(how: "fin" | "out") {
  if (view !== "race" || myDone) return;
  const s = A.state(); myDone = how; sendState();
  sendMsg({ t: "done", r: race, how, sc: Math.floor(s.sc), tm: Math.round(s.tm * 10) / 10, lv: s.lv });
  done.set(myId, { how, sc: Math.floor(s.sc), tm: s.tm, lv: s.lv });
  view = "wait"; tags.innerHTML = ""; setTimeout(() => { if (view === "wait") waitView(); }, how === "out" ? 1100 : 400);
}
type Row = { id: string; name: string; col: number; p: number; sc: number; v: number; st: string; lv: number; tm: number };
function rows(): Row[] {
  const out: Row[] = [], me = A.state();
  for (const p of players) {
    if (p.spec) continue;
    const d = done.get(p.id);
    if (p.id === myId) { out.push({ id: p.id, name: p.name, col: p.col, p: me.p, sc: d ? d.sc : Math.floor(me.sc), v: me.v, st: d ? d.how : "race", lv: me.lv, tm: d ? d.tm : me.tm }); continue; }
    const a = buf.get(p.id), l = a && a[a.length - 1]?.s;
    out.push({ id: p.id, name: p.name, col: p.col, p: l ? l.p : 0, sc: d ? d.sc : l ? l.sc : 0, v: l ? l.v : 0, st: d ? d.how : "race", lv: l ? l.lv : 1, tm: d ? d.tm : l ? l.tm : 0 });
  }
  const rk = (r: Row) => (r.st === "fin" ? 0 : r.st === "race" ? 1 : 2);
  return out.sort((a, b) => rk(a) - rk(b) || (a.st === "fin" ? a.tm - b.tm : b.p - a.p));
}
function renderStand() {
  if (view !== "race" && view !== "wait") return;
  const rs = rows(), lead = rs.find((r) => r.st === "race");
  stand.innerHTML = rs.map((r, i) => {
    const gap = r.st === "fin" ? "FIN" : r.st === "out" ? "OUT" : r === lead ? (i === 0 ? "LEAD" : "") : "+" + ((lead!.p - r.p) / Math.max(30, r.v || lead!.v || 30)).toFixed(1) + "s";
    return `<div class="${r.id === myId ? "me" : ""}"><span style="flex:none">${i + 1}</span><b style="background:${COLORS[r.col]}"></b><span>${esc(r.name)}</span><span style="flex:none">${r.sc}</span><span style="flex:none;min-width:34px;text-align:right">${gap}</span></div>`;
  }).join("");
}
function waitView() {
  const d = done.get(myId)!, rs = rows(), left = deadline ? Math.max(0, Math.ceil((deadline - Date.now() - offset) / 1000)) : 0;
  show(`<h2>${d.how === "fin" ? "FINISHED!" : "OUT OF THE RACE"}</h2><p>${d.sc} PTS · ${fmt(d.tm)} · ${esc(A.unit)} ${d.lv}</p>
  <h3>LIVE</h3><div class="pl">${rs.map((r, i) => `<div class="${r.id === myId ? "me" : ""}"><b style="background:${COLORS[r.col]}"></b><span>${i + 1}. ${esc(r.name)}</span><em class="${r.st === "race" ? "no" : ""}">${r.st === "race" ? "RACING " + r.sc : r.st.toUpperCase() + " " + r.sc}</em></div>`).join("")}</div>
  <p>Results when everyone is done${left ? ` · max ${left}s` : ""}.</p><button class="alt" id="mplv">LEAVE ROOM</button>`, "wait");
  $("mplv").onclick = () => leave();
  clearTimeout(waitTO); waitTO = window.setTimeout(() => { if (view === "wait") waitView(); }, 1000);
}
let waitTO = 0;
function specView() {
  const rs = rows();
  show(`<h2>RACE IN PROGRESS</h2><p>You're in the room and will race in the next round.</p><div class="pl">${rs.map((r, i) => `<div><b style="background:${COLORS[r.col]}"></b><span>${i + 1}. ${esc(r.name)}</span><em>${r.sc}</em></div>`).join("")}</div><button class="alt" id="mplv">LEAVE ROOM</button>`, "spec");
  $("mplv").onclick = () => leave();
}
const fmt = (t: number) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, "0")}`; };
function showResults() { stopRace(); view = "results"; renderResults(); }
function renderResults() {
  const isHost = host === myId;
  show(`<h2>RACE RESULTS</h2><table><tr><th>#</th><th>NAME</th><th class="r">PTS</th><th class="r">TIME</th><th class="r">${esc(A.unit.slice(0, 2))}</th></tr>
  ${results.map((r, i) => `<tr class="${r.id === myId ? "me" : ""}"><td>${i + 1}</td><td><b style="display:inline-block;width:8px;height:8px;background:${COLORS[r.col]}"></b> ${esc(r.name)}${r.how !== "fin" ? ` <span style="color:#ffb84f">${r.how.toUpperCase()}</span>` : ""}</td><td class="r">${r.sc}</td><td class="r">${r.t ? fmt(r.t) : "-"}</td><td class="r">${r.lv}</td></tr>`).join("")}</table>
  <p>Ranked by points, then faster time.</p>
  ${isHost ? `<button id="mprm">REMATCH</button>` : `<p>Waiting for the host to start a rematch...</p>`}<button class="alt" id="mplv">LEAVE ROOM</button>`, "results");
  if (isHost) $("mprm").onclick = () => sendMsg({ t: "rematch" });
  $("mplv").onclick = () => leave();
}
function cleanup() {
  wantClose = true; stopRace(); clearInterval(pingIv);
  if (ws) { try { sendMsg({ t: "leave" }); ws.close(1000); } catch { /* */ } ws = null; }
  setUrl(""); code = ""; myId = ""; players = []; buf.clear(); done.clear(); reconnects = 0;
}
function leave() { cleanup(); hide(); view = ""; A.quit(); }

// ---------- ghosts for the renderer ----------
function ghosts(): Ghost[] {
  if (view !== "race" && view !== "wait") return [];
  const out: Ghost[] = [], now = performance.now() - INTERP_MS;
  for (const p of players) {
    if (p.id === myId || p.spec) continue;
    const a = buf.get(p.id); if (!a || !a.length) continue;
    let s: MPState;
    let i = a.length - 1; while (i > 0 && a[i - 1].at > now) i--;
    const b = a[i], pr = a[i - 1];
    if (pr && b.at > now && pr.s.lv === b.s.lv) { const k = Math.max(0, Math.min(1, (now - pr.at) / Math.max(1, b.at - pr.at))); const L = (u: number, v: number) => u + (v - u) * k; s = { ...b.s, p: L(pr.s.p, b.s.p), x: L(pr.s.x, b.s.x), y: L(pr.s.y, b.s.y), a: L(pr.s.a, b.s.a) }; }
    else s = b.s;
    const d = done.get(p.id);
    out.push({ id: p.id, name: p.name, col: COLORS[p.col], p: s.p, x: s.x, y: s.y, a: s.a, lv: s.lv, sc: s.sc, st: d ? d.how : "race" });
  }
  return out;
}
const tagQ: { id: string; x: number; y: number; name: string; col: string }[] = [];
function tag(g: Ghost, x: number, y: number) { tagQ.push({ id: g.id, x, y, name: g.name, col: g.col }); }
function flushTags(canvas: HTMLCanvasElement) {
  if (view !== "race") { if (tags.childElementCount) tags.innerHTML = ""; tagQ.length = 0; return; }
  const r = canvas.getBoundingClientRect(), sx = r.width / canvas.width, sy = r.height / canvas.height;
  const have = new Map<string, HTMLElement>(); for (const el of Array.from(tags.children) as HTMLElement[]) have.set(el.dataset.id!, el);
  // keep stacked name tags readable
  tagQ.sort((a, b) => b.y - a.y);
  const placed: { x: number; y: number }[] = [];
  for (const t of tagQ) { let y = t.y * sy; for (let k = 0; k < 4; k++) { const hit = placed.find((q) => Math.abs(q.x - t.x * sx) < 44 && Math.abs(q.y - y) < 11); if (!hit) break; y = hit.y - 11; } placed.push({ x: t.x * sx, y }); t.y = y / sy; }
  for (const t of tagQ) {
    let el = have.get(t.id); if (!el) { el = document.createElement("i"); el.dataset.id = t.id; tags.appendChild(el); } else have.delete(t.id);
    if (el.textContent !== t.name) el.textContent = t.name; el.style.background = t.col;
    el.style.left = Math.round(r.left + t.x * sx) + "px"; el.style.top = Math.round(r.top + t.y * sy) + "px";
  }
  for (const el of have.values()) el.remove();
  tagQ.length = 0;
}
