import { boot, G, car, scatterPicks, style, addScore, stat, lv, note, showBanner, popText, bar, audio, gameOver, clamp, hash, PLAYER_Y, W, H, ctx, fmtT, $, type Game, type Obs } from "./engine";

// ---------- seeded stage generator ----------
type Surf = "T" | "G" | "S";
type Sec = { s0: number; len: number; dir: number; sev: number; kind: "c" | "st" | "jump" | "crest" | "chic"; surf: Surf; cliff: number; called: boolean; ramp: number };
const THEMES: { name: string; surfs: Surf[]; cliffP: number; snowTrees: boolean }[] = [
  { name: "FOREST GRAVEL", surfs: ["G", "G", "G", "T"], cliffP: 0.1, snowTrees: false },
  { name: "MOUNTAIN TARMAC", surfs: ["T", "T", "T", "G"], cliffP: 0.45, snowTrees: false },
  { name: "NORDIC SNOW", surfs: ["S", "S", "S", "G"], cliffP: 0.15, snowTrees: true },
  { name: "MIXED MADNESS", surfs: ["T", "G", "S"], cliffP: 0.35, snowTrees: false },
];
const theme = () => THEMES[(G.level - 1) % THEMES.length];
const stageLen = (L: number) => 5200 + 1200 * (L - 1);
let SECS: Sec[] = [];
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function genStage() {
  const R = rng(G.level * 7919 + 13), th = theme(), L = G.level; SECS = [];
  let s = G.levelStart, surf: Surf = th.surfs[0];
  const end = G.levelStart + G.levelLen + 600;
  SECS.push({ s0: s - 400, len: 700, dir: 0, sev: 6, kind: "st", surf, cliff: 0, called: true, ramp: 0 }); s += 300;
  while (s < end) {
    if (R() < 0.25) surf = th.surfs[Math.floor(R() * th.surfs.length)];
    const r = R(); let sec: Sec;
    const hard = Math.min(0.5, 0.06 * L);
    if (r < 0.52) { const sev = clamp(Math.floor(R() * 6) + 1 - (R() < hard ? 2 : 0), 1, 6); sec = { s0: s, len: 200 + sev * 30 + R() * 140, dir: R() < 0.5 ? -1 : 1, sev, kind: "c", surf, cliff: R() < th.cliffP ? (R() < 0.5 ? -1 : 1) : 0, called: false, ramp: 0 }; }
    else if (r < 0.66) sec = { s0: s, len: 260 + R() * 120, dir: 0, sev: 3, kind: "chic", surf, cliff: 0, called: false, ramp: 0 };
    else if (r < 0.8) sec = { s0: s, len: 420, dir: 0, sev: 6, kind: "jump", surf, cliff: 0, called: false, ramp: 0.45 };
    else if (r < 0.88) sec = { s0: s, len: 320, dir: 0, sev: 6, kind: "crest", surf, cliff: 0, called: false, ramp: 0.5 };
    else sec = { s0: s, len: 260 + R() * 260, dir: 0, sev: 6, kind: "st", surf, cliff: 0, called: false, ramp: 0 };
    SECS.push(sec); s += sec.len;
  }
}
function secAt(s: number) { let lo = 0, hi = SECS.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (SECS[m].s0 <= s) lo = m; else hi = m - 1; } return SECS[lo]; }
function centerF(s: number) {
  if (!SECS.length) return 0; const sc = secAt(s), t = clamp((s - sc.s0) / sc.len, 0, 1); let c = 6 * Math.sin(s / 210);
  if (sc.kind === "c") c += sc.dir * (22 + 13 * (6 - sc.sev)) * Math.sin(Math.PI * t);
  if (sc.kind === "chic") c += 26 * Math.sin(t * Math.PI * 2) * Math.sin(t * Math.PI);
  return c;
}
const widthF = (s: number) => (SECS.length && secAt(s).surf === "T" ? 68 : 64);
const base = (L: number) => 255 * Math.pow(1.045, Math.min(L, 9) - 1);
const SG: Record<Surf, number> = { T: 30, G: 9, S: 4.5 };
const SL: Record<Surf, number> = { T: 1, G: 0.9, S: 0.78 };
function limitF(s: number) { const sc = secAt(s); if (sc.kind !== "c" && sc.kind !== "chic") return 1e9; const t = (s - sc.s0) / sc.len; if (t < 0.1 || t > 0.9) return 1e9; return base(G.level) * (0.42 + 0.1 * sc.sev) * SL[sc.surf] * (studT > 0 && sc.surf === "S" ? 1.15 : 1); }

const PLAYER = car("rally", "#1a5ad2", "#ffd23f", 4);
const ROSTER = [car("rally", "#d21f2f", "#fff", 1), car("rally", "#e8e8e8", "#16c7b8", 2), car("rally", "#0a6e3a", "#c8ff3a", 3), car("rally", "#ff8a1a", "#111", 5)];

let timeLeft = 0, cps: number[] = [], cpIdx = 0, splits: number[] = [], stageT0 = 0, best: number[] = [], drift = 0, driftPts = 0, studT = 0, turboT = 0, mudT = 0, misT = 0, iceT = 0, puncT = 0, noteAhead = 1.3;
let airLanded = true, handbrake = false, lastSurf: Surf = "G", hits = 0;
const BKEY = () => `pacenotes.split.${G.level}`;
const spd = () => base(G.level);
const quarterT = () => (G.levelLen / 4) / (spd() * 0.68);
function callNote(sc: Sec) {
  sc.called = true; let t = "", v = "";
  const side = sc.dir < 0 ? "LEFT" : "RIGHT";
  if (sc.kind === "c") { t = `${side} ${sc.sev}${sc.len > 380 ? " LONG" : ""}`; v = `${side.toLowerCase()} ${sc.sev}${sc.len > 380 ? " long" : ""}`; if (sc.sev <= 2) { t += sc.sev === 1 ? " HAIRPIN" : " TIGHT"; v += sc.sev === 1 ? " hairpin" : " tight"; } if (sc.cliff) { t += `<br><small style="color:#ff5a5a">⚠ CLIFF ${sc.cliff < 0 ? "LEFT" : "RIGHT"}</small>`; v += ", caution, cliff"; } }
  else if (sc.kind === "chic") { t = "CHICANE · LEFT-RIGHT"; v = "into chicane"; }
  else if (sc.kind === "jump") { t = "JUMP! · FLAT · KEEP MIDDLE"; v = "jump, flat, keep middle"; }
  else if (sc.kind === "crest") { t = "OVER CREST"; v = "over crest"; }
  else return;
  if (sc.surf !== lastSurf) { const n = { T: "TARMAC", G: "GRAVEL", S: "SNOW" }[sc.surf]; t += `<br><small>ONTO ${n}</small>`; v += `, onto ${n.toLowerCase()}`; lastSurf = sc.surf; }
  note(`<span style="font-size:15px">${sc.dir < 0 ? "◀ " : sc.dir > 0 ? "" : ""}${t}${sc.dir > 0 ? " ▶" : ""}</span>`, sc.kind === "jump" ? "#ffd23f" : "#fff", 1500); audio.beep(sc.sev <= 2 ? 520 : 760, 0.06); audio.voice(v);
}

function land() {
  const sc = secAt(G.pS), c = centerF(G.pS), hw = widthF(G.pS) / 2, d = Math.abs(G.px - c) - hw, side = Math.sign(G.px - c);
  G.shake = 0.25; audio.hit();
  if (d > 3) { if (sc.cliff === side) gameOver("OVER THE CLIFF!"); else gameOver("LANDED IN THE TREES!"); return; }
  if (Math.abs(G.steerIn) > 0) { G.v *= 0.8; popText("BAD LANDING"); return; }
  if (G.airMax > 0.6) { stat("air"); style(`BIG AIR ${G.airMax.toFixed(1)}s`, Math.round(G.airMax * 900)); } else style("AIR", 100);
}
const game: Game = {
  id: "pacenotes", title: "PACE NOTES", base: "/PaceNotes/", unit: "STAGE", color: "#ffd23f", shadow: "#1a5ad2",
  ogSub: "GRAVEL · SNOW · JUMPS",
  blurb: "Flat-out rally stages against the clock. Listen to your co-driver's pace notes, drift the gravel and snow, fly the jumps, and beat the checkpoints before time runs out. Cliffs and trees don't forgive.",
  controls: "◀ ▶ hold left/right · arrows or A/D<br>BRAKE ↓/S · HANDBRAKE pad / Space (tight turns, drifts)<br>Notes: number = corner speed (1 hairpin … 6 flat)<br>Esc pause · R retry · M mute (also mutes the co-driver)",
  player: PLAYER, roster: ROSTER,
  boardX: { h: "STG", fmt: (x) => String(x || "-") },
  picks: {
    T: { name: "TURBO", good: true, col: "#ff7a1a", desc: "", apply: () => { turboT = 3; G.speedFx = 3; audio.boost(); showBanner("ANTI-LAG TURBO", "+18% · 3 s"); } },
    C: { name: "TIME +5", good: true, col: "#7dff9a", desc: "", apply: () => { timeLeft += 5; showBanner("+5 SECONDS"); } },
    K: { name: "SNOW STUDS", good: true, col: "#e8f4ff", desc: "", apply: () => { studT = 10; showBanner("STUDDED TYRES", "grip on snow & ice · 10 s"); } },
    S: { name: "SUMP GUARD", good: true, col: "#4fd2ff", desc: "", apply: () => { G.shield = true; showBanner("SUMP GUARD", "survive one rock / log"); } },
    X: { name: "x2 PTS", good: true, col: "#ff7ad9", desc: "", apply: () => { G.fx.x2 = 7; showBanner("DOUBLE POINTS", "7 s"); } },
    N: { name: "SHARP CO-DRIVER", good: true, col: "#ffd23f", desc: "", apply: () => { noteAhead = 2.2; showBanner("SHARP CO-DRIVER", "earlier notes for this stage"); } },
    M: { name: "MUD SPLASH", good: false, col: "#6b4a2a", desc: "", apply: () => { mudT = 4; showBanner("⚠ MUD ON SCREEN", "4 s"); } },
    E: { name: "MISFIRE", good: false, col: "#999", desc: "", apply: () => { misT = 4; showBanner("⚠ ENGINE MISFIRE", "-25% power · 4 s"); } },
    I: { name: "BLACK ICE", good: false, col: "#9cc8ff", desc: "", apply: () => { iceT = 2; showBanner("⚠ BLACK ICE"); } },
    P: { name: "PUNCTURE", good: false, col: "#333", desc: "", apply: () => { puncT = 5; showBanner("⚠ PUNCTURE", "slower · pulling"); } },
  },
  center: centerF, width: widthF, limit: (s) => limitF(s),
  levelLen: stageLen,
  vmax() {
    let v = spd() * (SECS.length ? SL[secAt(G.pS).surf] * 0.15 + 0.85 : 1);
    if (turboT > 0) v *= 1.18; if (misT > 0) v *= 0.75; if (puncT > 0) v *= 0.85; if (handbrake) v *= 0.8;
    const c = centerF(G.pS), hw = widthF(G.pS) / 2; if (Math.abs(G.px - c) > hw + 1) v *= 0.55;
    return v;
  },
  accel: () => 170 + 8 * G.level, brakeDecel: 300,
  steer: () => (handbrake ? 190 : 118) * (puncT > 0 ? 0.8 : 1),
  grip() { const sc = secAt(G.pS); let g = SG[sc.surf]; if (studT > 0 && sc.surf !== "T") g = Math.max(g, 14); if (iceT > 0) g = 1.5; if (handbrake) g *= 0.6; return g; },
  kmh: (v) => v * 0.8,
  start() { G.pack = false; G.edge = 30; best = []; hits = 0; },
  startLevel() {
    genStage(); lastSurf = SECS[0].surf; cpIdx = 0; splits = []; stageT0 = G.runT; drift = 0; driftPts = 0; studT = turboT = mudT = misT = iceT = puncT = 0; noteAhead = 1.3; airLanded = true; hits = 0;
    cps = [0.25, 0.5, 0.75, 1].map((f) => G.levelStart + G.levelLen * f);
    timeLeft = quarterT() * (1.4 - Math.min(0.25, 0.04 * (G.level - 1)));
    try { best = JSON.parse(localStorage.getItem(BKEY()) || "[]"); } catch { best = []; }
    // hard obstacles: rocks / logs / hay
    const n = Math.round(6 * Math.pow(1.3, G.level - 1));
    for (let i = 0; i < n; i++) {
      const s = G.levelStart + 500 + ((i + 0.5 + (hash(i * 9.1 + G.level) - 0.5) * 0.6) / n) * (G.levelLen - 800), sc = secAt(s);
      if (sc.kind === "jump" || sc.kind === "crest") continue;
      const k = hash(i * 3.7 + G.level * 11); const kind = k < 0.45 ? "rock" : k < 0.7 ? "log" : "hay";
      G.obs.push({ s, off: kind === "log" ? (hash(i) < 0.5 ? -0.45 : 0.45) : (hash(i * 5.3) - 0.5) * 1.3, w: kind === "log" ? 22 : kind === "hay" ? 10 : 8, h: kind === "log" ? 5 : 7, kind, hit: false });
    }
    scatterPicks(["T", "C", "K", "S", "X", "N"], 6 + G.level, ["M", "E", "I", "P"], Math.round(3 * Math.pow(1.4, G.level - 1)), 400);
    const tgt = quarterT() * 4 * (0.92 - Math.min(0.12, 0.02 * G.level));
    G.objs = [
      { label: `STAGE UNDER ${fmtT(tgt)}`, cur: () => G.runT - stageT0, goal: tgt, le: true, atEnd: true, bonus: 1500 + 400 * G.level },
      { label: `DRIFT ${600 + 300 * G.level} PTS`, cur: () => lv("drift"), goal: 600 + 300 * G.level, bonus: 700 + 250 * G.level, show: () => `(${Math.floor(lv("drift"))})` },
      { label: `${1 + Math.floor(G.level / 2)} BIG AIR`, cur: () => lv("air"), goal: 1 + Math.floor(G.level / 2), bonus: 600 + 200 * G.level, show: () => `(${lv("air")})` },
      { label: "CLEAN STAGE (NO HITS)", cur: () => hits, goal: 0, le: true, atEnd: true, bonus: 1200 },
    ];
    G.v = 0; G.px = G.camX = centerF(G.levelStart);
    showBanner(`STAGE ${G.level} · ${theme().name}`, `${(G.levelLen / 1000 * 1.6).toFixed(1)} km · 3 checkpoints · ${fmtT(timeLeft)} to CP1`, 2400);
    audio.voice(`Stage ${G.level}. ${theme().name.toLowerCase()}. Go!`);
  },
  tick(dt) {
    const sc = secAt(G.pS);
    timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; gameOver("TIME UP!"); return; }
    if (timeLeft < 5 && Math.floor(timeLeft * 2) !== Math.floor((timeLeft + dt) * 2)) audio.beep(1000, 0.05);
    studT = Math.max(0, studT - dt); turboT = Math.max(0, turboT - dt); mudT = Math.max(0, mudT - dt); misT = Math.max(0, misT - dt); iceT = Math.max(0, iceT - dt); puncT = Math.max(0, puncT - dt);
    // pace notes
    for (const x of SECS) { if (x.called || x.s0 < G.pS) continue; if (x.s0 - G.pS > G.v * noteAhead + 40) break; callNote(x); }
    for (const x of SECS) if (!x.called && x.s0 < G.pS) x.called = true;
    // checkpoints + splits
    if (cpIdx < 4 && G.pS >= cps[cpIdx]) {
      const t = G.runT - stageT0; splits.push(t); const b = best[cpIdx];
      const diff = b ? t - b : 0;
      if (cpIdx < 3) { const add = quarterT() * (1.12 - Math.min(0.2, 0.03 * (G.level - 1))); timeLeft += add; const g = addScore(300 + Math.round(timeLeft * 20), "style"); note(`CHECKPOINT ${cpIdx + 1} · SPLIT ${fmtT(t)}${b ? `<br><span style="color:${diff <= 0 ? "#7dff9a" : "#ff5a5a"}">${diff <= 0 ? "-" : "+"}${Math.abs(diff).toFixed(1)}</span>` : ""}<br><small>+${add.toFixed(1)} s · +${g}</small>`, "#7dff9a", 2000); audio.jingle(); }
      cpIdx++;
    }
    // airtime
    if (G.air > 0) { G.air -= dt; if (G.air <= 0) { G.air = 0; land(); } }
    else if ((sc.kind === "jump" || sc.kind === "crest") && airLanded) { const ramp = sc.s0 + sc.len * sc.ramp; if (G.pS > ramp && G.pS - G.v * dt <= ramp + 1) { const big = sc.kind === "jump"; G.airMax = G.air = big ? 0.35 + G.v / 520 : 0.15 + G.v / 1600; airLanded = false; G.vxL *= 0.3; audio.beep(300, 0.2); } }
    else if (sc.kind !== "jump" && sc.kind !== "crest") airLanded = true;
    // drift
    const loose = sc.surf !== "T" || iceT > 0;
    const slip = Math.abs(G.steerIn * game.steer() - G.vxL);
    if (G.air <= 0 && (loose || handbrake) && Math.abs(G.steerIn) > 0 && G.v > spd() * 0.5 && !G.off) {
      drift += dt; const p = (20 + slip * 0.3) * dt * (handbrake ? 1.4 : 1); driftPts += p; G.yaw = clamp(G.yaw + (G.steerIn * 0.45 - G.yaw) * dt * 6, -0.5, 0.5);
      if (Math.random() < 0.6) G.parts.push({ x: G.px - G.camX + W / 2 + (Math.random() - 0.5) * 10, y: PLAYER_Y() + 9, vx: (Math.random() - 0.5) * 40, vy: 40 + Math.random() * 60, life: 0.5, c: sc.surf === "S" ? "#f4f8ff" : "#b08850" });
    } else {
      G.yaw += (0 - G.yaw) * Math.min(1, dt * 8);
      if (drift > 0.7) { stat("drift", driftPts); style(`DRIFT ${drift.toFixed(1)}s`, Math.round(driftPts)); }
      drift = 0; driftPts = 0;
    }
    // edge-of-cliff style bonus
    if (sc.cliff && G.air <= 0) { const c = centerF(G.pS), hw = widthF(G.pS) / 2, d = sc.cliff > 0 ? c + hw - G.px : G.px - (c - hw); if (d < 5 && d > -1 && G.v > spd() * 0.6) { addScore(60 * dt, "style"); if (Math.random() < dt * 2) popText("ON THE EDGE!"); } }
    if (puncT > 0) G.lat += 18;
    if (turboT > 0) G.speedFx = Math.max(G.speedFx, 0.1);
  },
  onObs(o: Obs) {
    hits++;
    if (o.kind === "hay") { G.v *= 0.6; popText("HAY BALE!"); return true; }
    gameOver(o.kind === "log" ? "HIT A LOG!" : "HIT A ROCK!"); return true;
  },
  offroad(side, dt) {
    const sc = secAt(G.pS), c = centerF(G.pS), hw = widthF(G.pS) / 2, d = Math.abs(G.px - c) - hw;
    if (sc.cliff === side && d > 3) { audio.fail(); gameOver("OVER THE CLIFF!"); return; }
    if (d > 13) { hits++; gameOver("HIT A TREE!"); return; }
    if (d > 1) G.v *= 1 - 0.9 * dt;
  },
  levelEnd() {
    const t = G.runT - stageT0; const prev = best[3];
    if (!prev || t < prev) { localStorage.setItem(BKEY(), JSON.stringify(splits)); }
    const tb = Math.round(timeLeft * 150);
    return { bonus: tb, msg: `${fmtT(t)}${prev ? (t < prev ? " · STAGE RECORD!" : ` · +${(t - prev).toFixed(1)}`) : " · record set"}` };
  },
  hud() {
    const fx: string[] = [], up = (t: string) => fx.push(`<span class="u">${t}</span>`), dn = (t: string) => fx.push(`<span class="d">⚠ ${t}</span>`);
    if (drift > 0.3) up(`DRIFT ${Math.floor(driftPts)}`); if (turboT > 0) up("TURBO"); if (studT > 0) up("STUDS " + studT.toFixed(0)); if (G.air > 0) up("AIRBORNE");
    if (mudT > 0) dn("MUD"); if (misT > 0) dn("MISFIRE"); if (iceT > 0) dn("BLACK ICE"); if (puncT > 0) dn("PUNCTURE");
    const sc = secAt(G.pS), sn = { T: "TARMAC", G: "GRAVEL", S: "SNOW" }[sc.surf];
    return { info: `<b style="font-size:14px;color:${timeLeft < 5 ? "#ff5a5a" : "#fff"}">⏱ ${timeLeft.toFixed(1)}</b> · CP ${Math.min(cpIdx + 1, 4)}/4<br>STAGE ${fmtT(G.runT - stageT0)}${splits.length ? " · S" + splits.length + " " + fmtT(splits[splits.length - 1]) : ""}`, fx,
      panel: `<div>${sn}</div>` + bar("GRIP", (studT > 0 && sc.surf !== "T" ? 14 : SG[sc.surf]) / 30, sc.surf === "S" ? "#e8f4ff" : sc.surf === "G" ? "#b08850" : "#7dff9a") + bar("TIME", timeLeft / 30, timeLeft < 5 ? "#ff3b3b" : "#7dff9a") };
  },
  row(y, s, L, R, c, hw) {
    const sc = secAt(s), th = theme(), band = Math.floor(s / 8);
    const snowy = sc.surf === "S" || th.snowTrees;
    const gr = snowy ? ((Math.floor(s / 20) & 1) ? "#dfe8f0" : "#d4dee8") : sc.surf === "T" ? ((Math.floor(s / 24) & 1) ? "#5a7a3a" : "#527234") : ((Math.floor(s / 24) & 1) ? "#3c7a30" : "#36702c");
    ctx.fillStyle = gr; ctx.fillRect(0, y, W, 1);
    // trees beyond the verge
    for (let bx = 0; bx < W; bx += 5) { if (bx > L - 14 && bx < R + 12) continue; const h = hash(Math.floor((bx - (W / 2 - G.camX)) / 5) * 31 + Math.floor(s / 5)); if (h > 0.45) { ctx.fillStyle = snowy ? (h > 0.85 ? "#fff" : h > 0.65 ? "#2a5a3a" : "#1a3a2a") : (h > 0.85 ? "#2c6e2a" : h > 0.65 ? "#1f5a24" : "#0c2a12"); ctx.fillRect(bx, y, 5, 1); } }
    // cliffs
    if (sc.cliff) { const x0 = sc.cliff > 0 ? R + 4 : 0, x1 = sc.cliff > 0 ? W : L - 4; for (let x = x0; x < x1; x++) { const dd = sc.cliff > 0 ? x - x0 : x1 - x; ctx.fillStyle = dd < 3 ? "#8a8a90" : dd < 6 ? "#5a5a66" : `rgb(${20 + (dd % 7)},${28 + (dd % 5)},${48})`; ctx.fillRect(x, y, 1, 1); } if ((band & 3) === 0) { ctx.fillStyle = "#fff"; ctx.fillRect(sc.cliff > 0 ? R + 2 : L - 3, y, 1, 1); } }
    // road surface
    const col = sc.surf === "T" ? ((Math.floor(s / 4) & 1) ? "#4c4e52" : "#48494e") : sc.surf === "G" ? ((hash(Math.floor(s)) > 0.5) ? "#9a7a4a" : "#93744a") : ((hash(Math.floor(s)) > 0.5) ? "#f4f8ff" : "#e8f0fa");
    ctx.fillStyle = col; ctx.fillRect(L, y, R - L, 1);
    if (sc.surf !== "T") { ctx.fillStyle = sc.surf === "G" ? "#7a5a34" : "#b8c8dc"; ctx.fillRect(Math.round(c - hw * 0.45), y, 4, 1); ctx.fillRect(Math.round(c + hw * 0.3), y, 4, 1); ctx.fillStyle = sc.surf === "S" ? "#fff" : "#6a5a3a"; ctx.fillRect(L - 2, y, 2, 1); ctx.fillRect(R, y, 2, 1); }
    else { ctx.fillStyle = "#ddd"; ctx.fillRect(L + 1, y, 1, 1); ctx.fillRect(R - 2, y, 1, 1); if ((Math.floor(s / 14) % 2) === 0) { ctx.fillStyle = "#c9c9b8"; ctx.fillRect(Math.round(c), y, 1, 1); } }
    // jump ramp / crest
    if (sc.kind === "jump" || sc.kind === "crest") { const r = sc.s0 + sc.len * sc.ramp, d = r - s; if (d > 0 && d < 30) { ctx.fillStyle = `rgba(255,255,255,${0.1 + (1 - d / 30) * 0.3})`; ctx.fillRect(L, y, R - L, 1); } if (d <= 0 && d > -8) { ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(L, y, R - L, 1); } if (sc.kind === "jump" && d > 28 && d < 32) { ctx.fillStyle = "#ffd23f"; ctx.fillRect(L, y, 3, 1); ctx.fillRect(R - 3, y, 3, 1); } }
    // checkpoints & finish
    for (let i = 0; i < cps.length; i++) { const d = s - cps[i]; if (d > -4 && d < 0) { for (let x = L - 6; x < R + 6; x += 2) { ctx.fillStyle = i === 3 ? (((x >> 1) + Math.floor(d / 2)) & 1 ? "#fff" : "#111") : (x >> 1) & 1 ? "#7dff9a" : "#0c3a16"; ctx.fillRect(x, y, 2, 1); } } if (d > -2 && d < 8) { ctx.fillStyle = "#ffd23f"; ctx.fillRect(L - 8, y, 2, 1); ctx.fillRect(R + 6, y, 2, 1); } }
  },
  drawObs(o, x, y) {
    if (o.kind === "rock") { ctx.fillStyle = "#6a6a72"; ctx.fillRect(x - 4, y - 3, 8, 6); ctx.fillStyle = "#9a9aa2"; ctx.fillRect(x - 3, y - 3, 4, 2); ctx.fillStyle = "#3a3a40"; ctx.fillRect(x - 4, y + 2, 8, 1); }
    else if (o.kind === "log") { ctx.fillStyle = "#6b4a2a"; ctx.fillRect(x - 11, y - 2, 22, 5); ctx.fillStyle = "#8a6a3a"; ctx.fillRect(x - 11, y - 2, 22, 1); ctx.fillStyle = "#c8a070"; ctx.fillRect(x - 11, y - 2, 2, 5); ctx.fillRect(x + 9, y - 2, 2, 5); }
    else { ctx.fillStyle = "#e8c860"; ctx.fillRect(x - 5, y - 3, 10, 7); ctx.fillStyle = "#b89838"; ctx.fillRect(x - 5, y, 10, 1); }
  },
  overlay(pY, sx) {
    if (G.air > 0) { const x = Math.round(G.px + sx); void x; }
    if (mudT > 0) { for (let i = 0; i < 14; i++) { const x = Math.floor(hash(i * 2.1) * W), y = Math.floor(hash(i * 4.7) * H), r = 6 + Math.floor(hash(i * 8.3) * 14); ctx.fillStyle = `rgba(90,60,30,${0.75 * Math.min(1, mudT)})`; ctx.fillRect(x - r, y - r / 2, r * 2, r); } }
    if (iceT > 0) { ctx.fillStyle = "rgba(160,200,255,.15)"; ctx.fillRect(0, 0, W, H); }
    if (theme().name === "NORDIC SNOW") { ctx.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 30; i++) ctx.fillRect(Math.floor(hash(i * 3.3 + Math.floor(G.t * 8)) * W), Math.floor((hash(i * 1.7) * H + G.t * 60 * (1 + hash(i))) % H), 1, 1); }
    void pY;
  },
  pads: [
    { id: "bhb", label: "HANDBRAKE", cls: "y", keys: [" ", "shift", "e"], down: () => (handbrake = true), up: () => (handbrake = false) },
    { id: "bbrake", label: "BRAKE", cls: "brk", down: () => (G.brakePad = true), up: () => (G.brakePad = false) },
  ],
  overLines: () => [["Splits", splits.map((t) => fmtT(t)).join(" ") || "-"], ["Time left", timeLeft.toFixed(1) + " s"]],
  boardVal: () => G.level,
  og() {
    G.level = 1; G.levelStart = 0; G.levelLen = stageLen(1); genStage();
    const j = SECS.find((x) => x.kind === "c" && x.sev <= 3 && x.s0 > 600) || SECS[3];
    G.pS = j.s0 + j.len * 0.45; G.px = centerF(G.pS) + 4; G.camX = centerF(G.pS); G.yaw = 0.35 * (j.dir || 1); G.steerIn = j.dir;
    for (let i = 0; i < 60; i++) G.parts.push({ x: G.px - G.camX + W / 2 + (hash(i) - 0.5) * 16, y: 92 + 8 + hash(i * 3) * 26, vx: 0, vy: 0, life: 1, c: hash(i * 7) > 0.5 ? "#b08850" : "#d8b888" });
  },
};
G.levelLen = stageLen(1); genStage();
boot(game);
void $; void clamp;
