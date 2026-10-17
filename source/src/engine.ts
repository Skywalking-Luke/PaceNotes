// LH Cars Arcade shared engine: top-down pixel racer core, UI, audio, leaderboard, ads hooks.
import "./style.css";
import { MP } from "./mp";
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const params = new URLSearchParams(location.search);
export const OG = params.has("og");
export const W = OG ? 240 : 180;
export let H = 320;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const pickOf = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export function hash(n: number) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export const fmtT = (t: number) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(1).padStart(4, "0")}`; };
export const SW = 12, SH = 20;

// ---------- sprites ----------
export type Sprite = { cv: HTMLCanvasElement };
type P = (c: string, x: number, y: number, w?: number, h?: number) => void;
const DIG = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001010010010", "111101111101111", "111101111001111"];
function digit(p: P, d: number, x: number, y: number, c: string) { const g = DIG[d % 10]; for (let i = 0; i < 15; i++) if (g[i] === "1") p(c, x + (i % 3), y + Math.floor(i / 3)); }
export type Shape = "stock" | "f1" | "gt" | "proto" | "rally" | "gt4";
export function car(shape: Shape, body: string, acc: string, num = -1, w2 = "#fff"): Sprite {
  const cv = document.createElement("canvas"); cv.width = SW; cv.height = SH;
  const g = cv.getContext("2d")!;
  const p: P = (c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const T = "#0b0b0d", GL = "#16202c", GH = "#4a5d7a";
  if (shape === "f1") {
    p(acc, 0, 0, 12, 2); p(T, 0, 3, 2, 4); p(T, 10, 3, 2, 4);              // front wing + front tyres
    p(body, 5, 0, 2, 9); p(body, 4, 6, 4, 2);                              // nose
    p(body, 3, 8, 6, 8); p(body, 2, 10, 8, 4); p(acc, 2, 11, 1, 2); p(acc, 9, 11, 1, 2); // sidepods
    p(GL, 5, 8, 2, 3); p("#888", 4, 8, 4, 1);                               // cockpit + halo
    p(T, 0, 13, 2, 5); p(T, 10, 13, 2, 5);                                 // rear tyres
    p(body, 4, 16, 4, 2); p(acc, 1, 18, 10, 2); p("#ff3030", 5, 19, 2, 1); // rear wing + rain light
    if (num >= 0) digit(p, num, 5, 12, w2 === "#fff" ? "#fff" : w2);
    return { cv };
  }
  const tyres = (a: number, b: number) => { p(T, 0, a, 1, 4); p(T, 11, a, 1, 4); p(T, 0, b, 1, 4); p(T, 11, b, 1, 4); };
  if (shape === "stock") {
    tyres(3, 13); p(body, 1, 1, 10, 18); p(body, 2, 0, 8, 1);
    p(GL, 2, 5, 8, 2); p(GH, 3, 5, 2, 1); p(body, 2, 7, 8, 5); p(GL, 2, 12, 8, 2);
    p(acc, 5, 0, 2, 5); p(acc, 5, 14, 2, 5);
    if (num >= 0) { p("#fff", 3, 7, 6, 5); digit(p, num, 5, 7, "#111"); }
    p("#222", 1, 18, 10, 1); p("#ff3030", 2, 19, 2, 1); p("#ff3030", 8, 19, 2, 1); p("#fff6c8", 2, 0, 2, 1); p("#fff6c8", 8, 0, 2, 1);
    return { cv };
  }
  if (shape === "proto") {
    tyres(3, 13); const prof = [2, 3, 4, 5, 5, 5, 5, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5];
    prof.forEach((h, y) => p(body, 6 - h, y, 2 * h, 1));
    p("#eaffff", 2, 1, 2, 1); p("#eaffff", 8, 1, 2, 1); p(GL, 4, 6, 4, 4); p(GH, 4, 6, 2, 1);
    p(acc, 5, 10, 2, 8); p(acc, 1, 3, 1, 3); p(acc, 10, 3, 1, 3); p("#111", 0, 18, 12, 1); p("#ff3030", 1, 19, 10, 1);
    if (num >= 0) digit(p, num, 2, 12, "#fff");
    return { cv };
  }
  if (shape === "rally") {
    tyres(3, 13); p(body, 1, 1, 10, 18); p(body, 2, 0, 8, 1);
    p("#fff6c8", 2, 0, 2, 1); p("#fff6c8", 8, 0, 2, 1); p("#ffffaa", 3, 2, 1, 1); p("#ffffaa", 5, 2, 2, 1); p("#ffffaa", 8, 2, 1, 1); // light pod
    p(GL, 2, 5, 8, 2); p(GH, 3, 5, 2, 1); p(body, 2, 7, 8, 6); p("#333", 5, 8, 2, 2); // roof scoop
    p(acc, 1, 1, 1, 18); p(acc, 10, 1, 1, 18); p(GL, 2, 13, 8, 2); p(acc, 1, 16, 10, 2); p("#111", 1, 18, 10, 1);
    p("#ff3030", 1, 19, 2, 1); p("#ff3030", 9, 19, 2, 1); p("#6b4a2a", 0, 18, 1, 2); p("#6b4a2a", 11, 18, 1, 2);
    if (num >= 0) digit(p, num, 5, 10, "#fff");
    return { cv };
  }
  // gt / gt4
  tyres(3, 13); const prof = shape === "gt4" ? [3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4] : [3, 4, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 4];
  prof.forEach((h, y) => p(body, 6 - h, y, 2 * h, 1));
  p("#fff6c8", 2, 1, 2, 1); p("#fff6c8", 8, 1, 2, 1); p(GL, 3, 5, 6, 4); p(GH, 3, 5, 2, 1); p(GL, 4, 12, 4, 2);
  p(acc, 5, 0, 2, 20); p("#111", 1, 17, 10, 1); p("#ff3030", 2, 19, 3, 1); p("#ff3030", 7, 19, 3, 1);
  if (num >= 0) { p("#fff", 3, 9, 6, 3); digit(p, num, 7, 9, "#111"); digit(p, Math.floor(num / 10), 3, 9, "#111"); }
  return { cv };
}

// ---------- types ----------
export type Bot = { s: number; off: number; tOff: number; v: number; kind: number; t: number; brake: number; ahead: boolean; passes: number; gap: number; spr: Sprite; cls: string; wreck: number; spin: number; vx: number; dead: boolean; data: any };
export type Pick = { s: number; off: number; type: string; got: boolean };
export type PickDef = { name: string; good: boolean; col: string; desc: string; apply: () => void };
export type Obs = { s: number; off: number; w: number; h: number; kind: string; hit: boolean };
export type Obj = { label: string; cur: () => number; goal: number; bonus: number; atEnd?: boolean; le?: boolean; done?: boolean; fail?: boolean; show?: () => string };
export type Pad = { id: string; label: string; cls?: string; down: () => void; up?: () => void; keys?: string[] };
export type Part = { x: number; y: number; vx: number; vy: number; life: number; c: string };
export type Entry = { n: string; p: number; t: number; l: number; d: number; x?: number };
export interface Game {
  id: string; title: string; base: string; unit: string; color: string; shadow: string;
  blurb: string; controls: string; legend?: string;
  player: Sprite; roster: Sprite[];
  boardX?: { h: string; fmt: (x: number) => string };
  center(s: number): number; width(s: number): number; limit?(s: number): number;
  levelLen(L: number): number;
  vmax(): number; accel(): number; brakeDecel?: number; steer(): number; grip(): number; kmh(v: number): number;
  start(): void; startLevel(): void; tick(dt: number): void;
  botTick?(b: Bot, dt: number): void;
  onHit?(b: Bot): boolean; onPass?(b: Bot): void; onObs?(o: Obs): boolean; offroad?(side: number, dt: number): void;
  levelEnd(): { bonus: number; fail?: string; msg?: string };
  hud(): { info: string; fx: string[]; panel: string };
  row(y: number, s: number, L: number, R: number, c: number, hw: number): void;
  under?(pY: number, sx: number): void; overlay?(pY: number, sx: number): void;
  drawObs?(o: Obs, x: number, y: number): void;
  pads: Pad[]; keyDown?(k: string): void;
  mpTarget?: number;
  overLines(): [string, number | string][];
  boardVal?(): number;
  og(): void; ogSub: string;
  picks: Record<string, PickDef>;
}

// ---------- shared state ----------
export const G = {
  st: "title" as "title" | "play" | "pause" | "clear" | "over" | "board" | "mp",
  level: 1, pS: 0, px: 0, camX: 0, v: 0, vxL: 0, score: 0, runT: 0, t: 0, levelStart: 0, levelLen: 1,
  combo: 0, comboT: 0, mult: 1, bots: [] as Bot[], picks: [] as Pick[], obs: [] as Obs[], parts: [] as Part[],
  fx: {} as Record<string, number>, shield: false, invT: 0, air: 0, airMax: 0, off: 0, lat: 0, edge: 40,
  steerIn: 0, brake: false, brakePad: false, crashT: 0, shake: 0, flash: 0, speedFx: 0, dust: "#6b4a2a", god: false, pack: false,
  slow: 1, br: {} as Record<string, number>, objs: [] as Obj[], lvStat: {} as Record<string, number>, runId: 0, contUsed: false, overWhy: "",
  sparks: 0, yaw: 0,
};
let game: Game;
export const PLAYER_Y = () => Math.round(H * 0.74);
export const botX = (b: { s: number; off: number }) => game.center(b.s) + b.off * (game.width(b.s) / 2 - 7);
export const stat = (k: string, n = 1) => { G.lvStat[k] = (G.lvStat[k] || 0) + n; };
export const lv = (k: string) => G.lvStat[k] || 0;
export function addScore(v: number, k = "", useMult = true) {
  const pts = v * (useMult ? G.mult : 1) * ((G.fx.x2 || 0) > 0 ? 2 : 1);
  G.score += pts; if (k) G.br[k] = (G.br[k] || 0) + pts;
  return Math.round(pts);
}
export function style(label: string, pts: number) {
  G.combo++; G.comboT = 3.5; G.mult = 1 + 0.25 * Math.min(G.combo, 12);
  const got = addScore(pts, "style"); popText(`${label} +${got}`); audio.near();
}
export function breakCombo() { G.combo = 0; G.mult = 1; }
export function mkBot(s: number, off: number, v: number, spr: Sprite, kind = 0, cls = ""): Bot {
  return { s, off, tOff: off, v, kind, t: rnd(0, 3), brake: 0, ahead: true, passes: 0, gap: 99, spr, cls, wreck: 0, spin: 0, vx: 0, dead: false, data: {} };
}
export function scatterPicks(goodKeys: string[], nGood: number, badKeys: string[], nBad: number, from = 300) {
  const L = G.levelLen, S = G.levelStart;
  for (let i = 0; i < nGood; i++) G.picks.push({ s: S + from + ((i + rnd(0.2, 0.8)) / nGood) * (L - from - 100), off: rnd(-0.6, 0.6), type: goodKeys[i % goodKeys.length], got: false });
  for (let i = 0; i < nBad; i++) G.picks.push({ s: S + from + 100 + ((i + rnd(0.2, 0.8)) / nBad) * (L - from - 200), off: rnd(-0.7, 0.7), type: pickOf(badKeys), got: false });
}
export function burst(x: number, y: number, n: number, cols: string[], sp = 80) { for (let k = 0; k < n; k++) G.parts.push({ x, y, vx: rnd(-sp, sp), vy: rnd(-sp, sp * 0.6), life: rnd(0.3, 0.7), c: pickOf(cols) }); }

// ---------- UI ----------
let bannerTO = 0, popTO = 0, noteTO = 0;
export function showBanner(t: string, sub = "", ms = 1800) {
  const b = $("banner"); b.innerHTML = t + (sub ? `<small>${sub}</small>` : ""); b.style.opacity = "1";
  clearTimeout(bannerTO); bannerTO = window.setTimeout(() => (b.style.opacity = "0"), ms);
}
export function popText(t: string) { const p = $("pop"); p.textContent = t; clearTimeout(popTO); popTO = window.setTimeout(() => (p.textContent = ""), 1000); }
export function note(t: string, col = "#fff", ms = 1600) { const n = $("note"); n.innerHTML = t; n.style.color = col; n.style.opacity = "1"; clearTimeout(noteTO); noteTO = window.setTimeout(() => (n.style.opacity = "0"), ms); }
export const bar = (label: string, f: number, col: string) => `<div class="g"><span>${label}</span><i><b style="width:${Math.round(clamp(f, 0, 1) * 100)}%;background:${col}"></b></i></div>`;
function showPlay(on: boolean) { ["hud", "pads", "spd"].forEach((id) => $(id).classList.toggle("hidden", !on)); }

// ---------- audio (chiptune) ----------
export const audio = (() => {
  let ac: AudioContext | null = null, master: GainNode, eg: GainNode, o1: OscillatorNode, o2: OscillatorNode, lp: BiquadFilterNode;
  let muted = false;
  const init = () => {
    if (ac) return;
    ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.45; master.connect(ac.destination);
    eg = ac.createGain(); eg.gain.value = 0; lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    o1 = ac.createOscillator(); o1.type = "square"; o2 = ac.createOscillator(); o2.type = "sawtooth";
    const g1 = ac.createGain(), g2 = ac.createGain(); g1.gain.value = 0.25; g2.gain.value = 0.18;
    o1.connect(g1).connect(lp); o2.connect(g2).connect(lp); lp.connect(eg).connect(master); o1.start(); o2.start();
  };
  const tone = (f: number, f2: number, d: number, type: OscillatorType, v = 0.15, delay = 0) => {
    if (!ac) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02);
  };
  const noise = (d: number, v: number, f = 1200) => {
    if (!ac) return; const n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = ac.createBufferSource(), g = ac.createGain(), fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = f; s.buffer = b; g.gain.value = v; s.connect(fl).connect(g).connect(master); s.start();
  };
  return {
    setKey(k: string) { muted = localStorage.getItem(k + ".mute") === "1"; },
    get muted() { return muted; },
    start() { init(); ac!.resume(); },
    toggle() { muted = !muted; localStorage.setItem(game.id + ".mute", muted ? "1" : "0"); if (ac) master.gain.value = muted ? 0 : 0.45; $("bmute").textContent = muted ? "×" : "♪"; if (muted) speechSynthesis?.cancel?.(); },
    engine(f: number, boost: boolean, base = 70) {
      if (!ac) return; const t = ac.currentTime; f = clamp(f, 0, 1.3);
      const gears = 6, gp = Math.min(gears - 1, Math.floor(f * gears)), w = f * gears - gp;
      const fr = base + 25 * gp + 140 * w * (0.7 + 0.06 * gp) + (boost ? 40 : 0);
      o1.frequency.setTargetAtTime(fr, t, 0.03); o2.frequency.setTargetAtTime(fr * 0.5 + 3, t, 0.03);
      lp.frequency.setTargetAtTime(500 + 1600 * f + (boost ? 900 : 0), t, 0.05);
      eg.gain.setTargetAtTime(0.05 + 0.1 * f, t, 0.05);
    },
    idle() { if (ac) eg.gain.setTargetAtTime(0, ac.currentTime, 0.05); },
    blip() { tone(880, 1320, 0.08, "square", 0.07); },
    near() { tone(1200, 2200, 0.12, "triangle", 0.12); },
    pick() { tone(660, 1760, 0.22, "square", 0.08); tone(990, 1980, 0.15, "square", 0.05, 0.08); },
    bad() { tone(220, 90, 0.3, "square", 0.12); },
    boost() { tone(300, 2400, 0.6, "sawtooth", 0.09); },
    beep(f = 880, d = 0.1) { tone(f, f, d, "square", 0.08); },
    hit() { noise(0.25, 0.35, 2500); tone(180, 70, 0.2, "square", 0.12); },
    crash() { this.idle(); noise(0.7, 0.5); tone(160, 40, 0.5, "square", 0.2); },
    jingle() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.12, "square", 0.08, i * 0.1)); },
    fail() { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.16, "square", 0.08, i * 0.14)); },
    voice(t: string) {
      if (muted || !("speechSynthesis" in window)) return;
      try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.rate = 1.35; u.pitch = 0.85; u.volume = 0.9; speechSynthesis.speak(u); } catch { /* */ }
    },
  };
})();

// ---------- leaderboard ----------
const KEY = () => game.id + ".board.v1";
const board = (): Entry[] => { try { return JSON.parse(localStorage.getItem(KEY()) || "[]"); } catch { return []; } };
const sortB = (b: Entry[]) => b.sort((a, c) => c.p - a.p || a.t - c.t).slice(0, 10);
function qualifies(p: number) { const b = board(); const l = b[b.length - 1]; return p > 0 && (b.length < 10 || p > l.p || (p === l.p && G.runT < l.t)); }
let lastEntry: Entry | null = null;
function boardHtml() {
  const b = board(); if (!b.length) return `<p>No runs yet. Be the first.</p>`;
  const X = game.boardX;
  return `<table><tr><th>#</th><th>NAME</th><th>${game.unit}</th>${X ? `<th class="r">${X.h}</th>` : ""}<th class="r">TIME</th><th class="r">PTS</th></tr>${b
    .map((e, i) => `<tr class="${lastEntry && e.d === lastEntry.d ? "me" : ""}"><td>${i + 1}</td><td>${e.n}</td><td>${e.l}</td>${X ? `<td class="r">${X.fmt(e.x || 0)}</td>` : ""}<td class="r">${fmtT(e.t)}</td><td class="r">${e.p}</td></tr>`).join("")}</table>`;
}
const menu = () => $("menu");
function legendHtml() {
  const ups = Object.values(game.picks).filter((d) => d.good), dn = Object.values(game.picks).filter((d) => !d.good);
  return `<p class="leg"><span class="u">POWER-UPS</span> ${ups.map((d) => `<i class="ic" style="background:${d.col}"></i>${d.name}`).join(" ")}</p>
  <p class="leg"><span class="d">POWER-DOWNS</span> ${dn.map((d) => `<i class="ic dn" style="--k:${d.col}"></i>${d.name}`).join(" ")}</p>`;
}
export function showTitle() {
  G.st = "title"; showPlay(false); menu().classList.remove("off");
  menu().innerHTML = `<div class="card"><h2>LH CARS ARCADE</h2><h1 style="text-shadow:4px 4px 0 ${game.shadow};color:${game.color}">${game.title}</h1>
  <p>${game.blurb}</p><p>${game.controls}</p>${legendHtml()}${game.legend || ""}
  <canvas id="roster" width="${12 + game.roster.length * 14}" height="22"></canvas>
  <button id="go">START</button><button class="alt" id="mpb">MULTIPLAYER</button><button class="alt" id="lb">LEADERBOARD</button><button class="alt" id="hm">ARCADE</button></div>`;
  $("go").onclick = () => newRun(); $("mpb").onclick = () => MP.open(); $("lb").onclick = () => showBoard(); $("hm").onclick = () => (location.href = "/");
  const rc = $<HTMLCanvasElement>("roster"), rg = rc.getContext("2d")!; rg.imageSmoothingEnabled = false;
  rc.style.width = rc.width * 2 + "px"; rc.style.height = "44px";
  rg.drawImage(game.player.cv, 0, 1); game.roster.forEach((b, i) => rg.drawImage(b.cv, 16 + i * 14, 1));
}
export function showBoard() {
  G.st = "board"; showPlay(false); menu().classList.remove("off");
  menu().innerHTML = `<div class="card"><h2>TOP 10</h2>${boardHtml()}<p>Ranked by points, faster time wins ties. Saved on this device.</p><button id="go">RACE</button><button class="alt" id="bk">BACK</button></div>`;
  $("go").onclick = () => newRun(); $("bk").onclick = () => showTitle();
}
type LHAdsApi = { rewardEnabled?: boolean; banner?: (el: HTMLElement) => void; offerReward?: (cb: (show: () => Promise<boolean>) => void) => void };
function adsOnOver() {
  const ads = (window as unknown as { LHAds?: LHAdsApi }).LHAds;
  const slot = document.getElementById("adslot"); if (slot) ads?.banner?.(slot);
  const btn = document.getElementById("cont") as HTMLButtonElement | null;
  if (!btn || !ads?.rewardEnabled || G.contUsed) return;
  const my = G.runId;
  ads.offerReward?.((show) => {
    if (G.st !== "over" || G.runId !== my || G.contUsed) return;
    btn.style.display = "";
    btn.onclick = () => { btn.disabled = true; show().then((ok) => { if (ok && G.st === "over" && G.runId === my) continueRun(); else btn.style.display = "none"; }); };
  });
}
export let onContinue: () => void = () => {};
export function setOnContinue(f: () => void) { onContinue = f; }
function continueRun() {
  if (G.st !== "over" || G.contUsed) return;
  G.contUsed = true; G.st = "play"; G.invT = 2.5; G.crashT = 0; G.v = Math.max(G.v, game.vmax() * 0.4); onContinue();
  G.px = game.center(G.pS); G.vxL = 0; menu().classList.add("off"); menu().innerHTML = ""; showPlay(true);
}
export function gameOver(why: string) {
  if (G.st !== "play") return;
  if (MP.inRace) { G.st = "over"; G.overWhy = why; G.crashT = 0; audio.crash(); showPlay(false); speechSynthesis?.cancel?.(); MP.finish("out"); return; }
  G.st = "over"; G.overWhy = why; G.crashT = 0; audio.crash(); showPlay(false); speechSynthesis?.cancel?.();
  setTimeout(() => {
    menu().classList.remove("off");
    const p = Math.floor(G.score), q = qualifies(p);
    const lines: [string, number | string][] = [["Distance", G.br.dist || 0], ["Overtakes ×" + (G.br.nOver || 0), G.br.over || 0], ["Near misses ×" + (G.br.nNear || 0), G.br.near || 0], ["Style bonuses", G.br.style || 0], ["Pickups", G.br.pick || 0], ["Objectives", G.br.obj || 0], [game.unit[0] + game.unit.slice(1).toLowerCase() + " bonuses", G.br.clear || 0], ...game.overLines()];
    menu().innerHTML = `<div class="card"><h2>${why}</h2><h1 style="font-size:22px">${p} PTS</h1>
    <p>${game.unit} ${G.level} · ${fmtT(G.runT)}</p>
    <div class="bd">${lines.map(([a, b]) => `<div><span>${a}</span><span>${typeof b === "number" ? Math.floor(b) : b}</span></div>`).join("")}</div>
    ${q ? `<p>Top 10! Enter initials:</p><input id="ini" maxlength="3" autocomplete="off" /><br><button id="sv">SAVE</button>` : ""}
    <button id="cont" style="display:none">▶ WATCH AD TO CONTINUE</button><button id="go">RETRY (R)</button><button class="alt" id="lb">BOARD</button><div id="adslot" class="lh-ad" style="display:none;margin-top:8px"></div></div>`;
    adsOnOver();
    $("go").onclick = () => newRun(); $("lb").onclick = () => showBoard();
    if (q) {
      const inp = $<HTMLInputElement>("ini");
      const save = () => {
        const n = (inp.value.replace(/[^a-z0-9]/gi, "").toUpperCase() || "???").slice(0, 3);
        lastEntry = { n, p, t: Math.round(G.runT * 10) / 10, l: G.level, d: Date.now(), x: game.boardVal ? game.boardVal() : 0 };
        localStorage.setItem(KEY(), JSON.stringify(sortB([...board(), lastEntry]))); showBoard();
      };
      $("sv").onclick = save; inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") save(); });
    }
  }, 900);
}
function pause(on: boolean) {
  if (MP.racing) return; // no pausing in a live multiplayer race
  if (on && G.st === "play") {
    G.st = "pause"; audio.idle(); menu().classList.remove("off");
    menu().innerHTML = `<div class="card"><h2>PAUSED</h2><button id="rs">RESUME</button><button class="alt" id="rt">RETRY</button><button class="alt" id="qt">QUIT</button></div>`;
    $("rs").onclick = () => pause(false); $("rt").onclick = () => newRun(); $("qt").onclick = () => showTitle();
  } else if (!on && G.st === "pause") { G.st = "play"; menu().classList.add("off"); }
}
export function newRun() {
  G.runId++; G.contUsed = false; G.level = 1; G.pS = 0; G.v = 0; G.vxL = 0; G.score = 0; G.runT = 0; G.combo = 0; G.comboT = 0; G.mult = 1;
  G.parts = []; G.fx = {}; G.shield = false; G.invT = 0; G.air = 0; G.lat = 0; G.br = {}; G.slow = 1; G.speedFx = 0; G.sparks = 0; G.yaw = 0;
  game.start(); G.px = game.center(0); G.camX = G.px;
  startLevel(); G.st = "play"; menu().classList.add("off"); showPlay(true); audio.start();
}
function startLevel() {
  if (MP.racing) MP.rngSeed(G.level);
  G.levelStart = G.pS; G.levelLen = game.levelLen(G.level); G.bots = []; G.picks = []; G.obs = []; G.objs = []; G.lvStat = {};
  game.startLevel();
}
function finishLevel() {
  const r = game.levelEnd();
  for (const o of G.objs) if (o.atEnd && !o.done) { const c = o.cur(); if (o.le ? c <= o.goal : c >= o.goal) { o.done = true; G.score += o.bonus; G.br.obj = (G.br.obj || 0) + o.bonus; } else o.fail = true; }
  if (r.fail) { audio.fail(); gameOver(r.fail); return; }
  const lb = 1000 * G.level + r.bonus; G.score += lb; G.br.clear = (G.br.clear || 0) + lb;
  const got = G.objs.filter((o) => o.done).length;
  if (MP.inRace && G.level >= MP.target) { G.st = "mp"; audio.jingle(); showPlay(false); showBanner("FINISHED!", `${Math.floor(G.score)} PTS · ${fmtT(G.runT)}`, 2500); MP.finish("fin"); return; }
  G.st = "clear"; clearT = 2.2; audio.jingle();
  showBanner(`${game.unit} ${G.level} CLEAR`, `+${lb} · objectives ${got}/${G.objs.length}${r.msg ? " · " + r.msg : ""}`, 2200);
}
let clearT = 0;

// ---------- input ----------
const keys = new Set<string>(), pointers = new Map<number, number>();
let brakeKey = false;
function readSteer() {
  let s = 0;
  if (keys.has("arrowleft") || keys.has("a")) s -= 1;
  if (keys.has("arrowright") || keys.has("d")) s += 1;
  const mid = innerWidth / 2; for (const x of pointers.values()) s += x < mid ? -1 : 1;
  $("pl").classList.toggle("on", s < 0); $("pr").classList.toggle("on", s > 0);
  return clamp(s, -1, 1);
}

// ---------- sim ----------
function botAI(dt: number) {
  const pY = PLAYER_Y();
  for (const b of G.bots) {
    if (b.dead) continue;
    if (b.wreck > 0) { b.wreck -= dt; b.spin += dt * 9 * Math.sign(b.vx || 1); b.v = Math.max(0, b.v - 160 * dt); continue; }
    b.t -= dt;
    if (b.t <= 0) {
      if (b.kind === 1) { b.tOff = clamp(b.tOff + (Math.random() < 0.5 ? -0.7 : 0.7), -0.8, 0.8); b.t = rnd(1.2, 2.6); }
      else if (b.kind === 2) { b.brake = 0.9; b.t = rnd(2, 3.5); }
      else if (b.kind === 3) { b.t = 0.4; const dy = b.s - G.pS; if (dy > 30 && dy < 160) b.tOff = clamp((G.px - game.center(b.s)) / (game.width(b.s) / 2 - 7) * 0.8, -0.8, 0.8); }
      else if (b.kind === 4) { b.tOff = 0.7 * Math.sin(G.t * 1.6 + b.data.ph); b.t = 0.05; }
      else b.t = 99;
    }
    b.brake = Math.max(0, b.brake - dt);
    if (!b.data.test) game.botTick?.(b, dt);
  }
  if (G.pack) {
    // nose-to-tail avoidance (player included) so packs don't pile through each other
    const all = G.bots.filter((b) => !b.dead && b.wreck <= 0 && Math.abs(b.s - G.pS) < 900);
    for (const b of all) {
      let best = 1e9, bv = 0, bo = 0;
      const cand: { s: number; off: number; v: number }[] = all as any; 
      for (const o of cand) { if (o === b) continue; const d = o.s - b.s; if (d > 0 && d < best && Math.abs(o.off - b.off) < 0.32) { best = d; bv = o.v; bo = o.off; } }
      const poff = (G.px - game.center(G.pS)) / (game.width(G.pS) / 2 - 7);
      const dp = G.pS - b.s; if (dp > 0 && dp < best && Math.abs(poff - b.off) < 0.34) { best = dp; bv = G.v; bo = poff; }
      if (best < 30) { b.v = Math.min(b.v, bv - 4); if (b.t > 0.5 && Math.random() < dt * 1.5) { b.tOff = clamp(b.off + (bo > b.off ? -0.45 : 0.45), -0.8, 0.8); } }
    }
  }
  void pY;
}
function stepBots(dt: number) {
  for (const b of G.bots) {
    if (b.dead) continue;
    b.s += b.v * (b.brake > 0 ? 0.4 : 1) * dt;
    if (b.wreck > 0) b.off = clamp(b.off + b.vx * dt, -1.2, 1.2); else b.off += (b.tOff - b.off) * Math.min(1, dt * 2.2);
    if (G.air > 0) continue;
    const bx = botX(b), dy = b.s - G.pS, dx = Math.abs(bx - G.px);
    if (Math.abs(dy) < SH - 1 && dx < SW - 1 && !G.god && G.invT <= 0) {
      if (G.shield) { G.shield = false; G.invT = 1; b.wreck = 1.5; b.vx = Math.sign(bx - G.px || 1) * 1.2; audio.bad(); popText("SHIELD SAVED YOU"); burst(G.px - G.camX + W / 2, PLAYER_Y() - 8, 20, ["#4fd2ff", "#fff"]); continue; }
      if (game.onHit && game.onHit(b)) {
        G.invT = Math.max(G.invT, 0.7); audio.hit(); G.shake = 0.3; breakCombo();
        b.tOff = clamp(b.off + (bx > G.px ? 0.6 : -0.6), -0.9, 0.9); G.vxL = (bx > G.px ? -1 : 1) * 60;
        if (dy > 0) b.s += 6; burst(G.px - G.camX + W / 2 + (bx - G.px) / 2, PLAYER_Y() - Math.sign(dy) * 8, 14, ["#ffd23f", "#fff", "#ff7a1a"]);
        continue;
      }
      gameOver("CRASH!"); return;
    }
    if (Math.abs(dy) < SH) b.gap = Math.min(b.gap, dx - (SW - 1));
    if (b.ahead && dy < -SH) {
      b.ahead = false;
      if (b.passes < 2) {
        b.passes++; G.br.nOver = (G.br.nOver || 0) + 1; stat("over"); audio.blip();
        let got = addScore(50, "over");
        if (b.gap <= 5) { G.combo++; G.comboT = 3.5; G.mult = 1 + 0.25 * Math.min(G.combo, 12); const v = 100 * Math.min(G.combo, 6); got += addScore(v, "near"); G.br.nNear = (G.br.nNear || 0) + 1; stat("near"); audio.near(); popText(`NEAR MISS +${got}`); }
        else popText(`OVERTAKE +${got}`);
        game.onPass?.(b);
      }
      b.gap = 99;
    } else if (!b.ahead && dy > SH) { b.ahead = true; b.gap = 99; stat("lost"); }
  }
}
function update(dtR: number) {
  if (G.st === "over") { G.crashT += dtR; updParts(dtR); return; }
  if (G.st !== "play") return;
  G.runT += dtR;
  const dt = dtR * G.slow; G.t += dt;
  for (const k in G.fx) G.fx[k] = Math.max(0, G.fx[k] - dt);
  G.invT = Math.max(0, G.invT - dt); G.shake = Math.max(0, G.shake - dt); G.flash = Math.max(0, G.flash - dt); G.speedFx = Math.max(0, G.speedFx - dt);
  G.brake = brakeKey || G.brakePad; G.steerIn = readSteer(); G.lat = 0;
  game.tick(dt); if (G.st !== "play") return;
  botAI(dt);
  const c = game.center(G.pS), half = game.width(G.pS) / 2;
  G.off = G.air > 0 ? 0 : Math.abs(G.px - c) > half - 2 ? Math.sign(G.px - c) : 0;
  if (G.off) { game.offroad?.(G.off, dt); if (G.st !== "play") return; }
  const vt = game.vmax();
  let a: number;
  if (G.brake && G.air <= 0) a = -(game.brakeDecel ?? 300);
  else if (G.v < vt) a = game.accel() * (1 - Math.pow(G.v / vt, 2)) + 15;
  else a = -Math.min(400, (G.v - vt) * 2 + 20);
  G.v = clamp(G.v + a * dt, 0, 4000);
  const lim = game.limit ? game.limit(G.pS) : 1e9, outside = -Math.sign(game.center(G.pS + 30) - game.center(G.pS - 30));
  const push = G.v > lim && G.air <= 0 ? clamp((G.v - lim) / (lim * 0.5), 0, 1) * 80 * outside : 0;
  if (game.limit) { let mn = 1e9; for (let d = 60; d <= 420; d += 60) mn = Math.min(mn, game.limit(G.pS + d)); $("bz").textContent = G.v > mn * 1.12 ? "BRAKE ▼" : ""; }
  const desired = G.air > 0 ? G.vxL : push + G.steerIn * game.steer() + G.lat;
  const grip = G.air > 0 ? 0 : game.grip();
  const steps = Math.max(1, Math.ceil((G.v * dt) / 4)), sd = dt / steps;
  for (let i = 0; i < steps && G.st === "play"; i++) {
    G.pS += G.v * sd; G.vxL += (desired - G.vxL) * Math.min(1, grip * sd); G.px += G.vxL * sd;
    const cc = game.center(G.pS), hh = game.width(G.pS) / 2; G.px = clamp(G.px, cc - hh - G.edge, cc + hh + G.edge);
    stepBots(sd);
  }
  if (G.st !== "play") return;
  G.comboT -= dt; if (G.comboT <= 0 && G.combo) breakCombo();
  const dp = (G.v * dt) / 10; addScore(dp, "dist", false);
  G.camX += (game.center(G.pS - 40) * 0.6 + G.px * 0.4 - G.camX) * Math.min(1, dt * 4);
  const sx = G.px - G.camX + W / 2, sy = PLAYER_Y();
  if (G.off && G.air <= 0 && Math.random() < 0.7) G.parts.push({ x: sx + rnd(-5, 5), y: sy + 8, vx: rnd(-20, 20), vy: rnd(20, 60), life: 0.4, c: G.dust });
  if (G.speedFx > 0) for (let k = 0; k < 3; k++) G.parts.push({ x: sx + rnd(-4, 4), y: sy + 10, vx: rnd(-8, 8), vy: rnd(120, 220), life: 0.25, c: Math.random() < 0.5 ? game.color : "#fff" });
  updParts(dt);
  if (G.air <= 0) {
    for (const p of G.picks) {
      if (p.got) continue; const y = sy - (p.s - G.pS), x = game.center(p.s) + p.off * game.width(p.s) / 2;
      if (Math.abs(y - sy) < 14 && Math.abs(x - G.px) < 10) { p.got = true; const d = game.picks[p.type]; if (d.good) { audio.pick(); addScore(200, "pick"); stat("pick"); } else { audio.bad(); breakCombo(); stat("bad"); } d.apply(); }
    }
    for (const o of G.obs) {
      if (o.hit) continue; const dy = o.s - G.pS; if (Math.abs(dy) > (o.h + SH) / 2) continue;
      const x = game.center(o.s) + o.off * game.width(o.s) / 2;
      if (Math.abs(x - G.px) < (o.w + SW) / 2 - 1 && !G.god && G.invT <= 0) {
        o.hit = true;
        if (G.shield) { G.shield = false; G.invT = 1; audio.bad(); popText("SHIELD SAVED YOU"); continue; }
        if (game.onObs && game.onObs(o)) { G.invT = Math.max(G.invT, 0.5); audio.hit(); G.shake = 0.3; breakCombo(); burst(sx, sy - 8, 14, ["#ffd23f", "#fff", "#aaa"]); continue; }
        gameOver("CRASH!"); return;
      }
    }
  }
  for (const o of G.objs) if (!o.atEnd && !o.done && o.cur() >= o.goal) { o.done = true; G.score += o.bonus; G.br.obj = (G.br.obj || 0) + o.bonus; audio.jingle(); note(`OBJECTIVE ✓ ${o.label} +${o.bonus}`, "#7dff9a", 2000); }
  if (G.pS >= G.levelStart + G.levelLen) finishLevel();
  audio.engine(G.v / Math.max(1, vt * 1.05), G.speedFx > 0, 60 + 10 * Math.min(G.level, 5));
}
function updParts(dt: number) { for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } G.parts = G.parts.filter((p) => p.life > 0); if (G.parts.length > 400) G.parts.splice(0, G.parts.length - 400); }

// ---------- render ----------
export let ctx: CanvasRenderingContext2D;
export let cv: HTMLCanvasElement;
export function drawCar(x: number, y: number, s: Sprite, brake: boolean, spin = 0, scale = 1, shadow = 2) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(x - SW / 2 + 1 + shadow - 2, y - SH / 2 + shadow, SW, SH);
  if (spin || scale !== 1) { ctx.save(); ctx.translate(x, y); ctx.rotate(spin); ctx.scale(scale, scale); ctx.drawImage(s.cv, -SW / 2, -SH / 2); ctx.restore(); }
  else ctx.drawImage(s.cv, x - SW / 2, y - SH / 2);
  if (brake && !spin) { ctx.fillStyle = "#ff3030"; ctx.fillRect(x - SW / 2 + 1, y + SH / 2 - 1, SW - 2, 1); ctx.fillStyle = "rgba(255,40,40,.35)"; ctx.fillRect(x - SW / 2, y + SH / 2, SW, 3); }
}
function drawPick(p: Pick, x: number, y: number) {
  const d = game.picks[p.type], blink = Math.floor(performance.now() / 150) & 1;
  if (!d.good) { ctx.fillStyle = blink ? "#ff2a2a" : "#ffd23f"; ctx.fillRect(x - 6, y - 5, 12, 10); ctx.fillStyle = "#111"; ctx.fillRect(x - 5, y - 4, 10, 8); ctx.fillStyle = d.col; ctx.fillRect(x - 3, y - 2, 6, 4); ctx.fillStyle = "#111"; ctx.fillRect(x - 1, y - 1, 2, 2); return; }
  ctx.fillStyle = "#fff"; ctx.fillRect(x - 5, y - 5, 10, 10); ctx.fillStyle = d.col; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = blink ? "#fff" : "#111"; ctx.fillRect(x - 2, y - 2, 4, 4);
}
export function render() {
  const pY = PLAYER_Y();
  const sh = (G.shake > 0 || G.speedFx > 0) && !OG ? 1 : 0;
  ctx.setTransform(1, 0, 0, 1, sh ? Math.round(rnd(-1, 1)) : 0, sh ? Math.round(rnd(-1, 1)) : 0);
  const shiftX = W / 2 - G.camX;
  for (let y = 0; y < H; y++) { const s = G.pS + (pY - y); const hw = game.width(s) / 2, c = game.center(s) + shiftX; game.row(y, s, Math.round(c - hw), Math.round(c + hw), c, hw); }
  game.under?.(pY, shiftX);
  for (const o of G.obs) { if (o.hit) continue; const y = pY - (o.s - G.pS); if (y < -20 || y > H + 20) continue; game.drawObs?.(o, Math.round(game.center(o.s) + o.off * game.width(o.s) / 2 + shiftX), Math.round(y)); }
  for (const p of G.picks) { if (p.got) continue; const y = pY - (p.s - G.pS); if (y < -10 || y > H + 10) continue; drawPick(p, Math.round(game.center(p.s) + p.off * game.width(p.s) / 2 + shiftX), Math.round(y)); }
  for (const b of G.bots) { if (b.dead) continue; const y = pY - (b.s - G.pS); if (y < -20 || y > H + 20) continue; drawCar(botX(b) + shiftX, y, b.spr, b.brake > 0, b.spin); if (b.wreck > 0 && Math.random() < 0.4) G.parts.push({ x: botX(b) + shiftX + rnd(-4, 4), y: y + rnd(-6, 6), vx: rnd(-10, 10), vy: rnd(-30, 0), life: 0.6, c: Math.random() < 0.5 ? "#888" : "#ccc" }); }
  drawGhosts(pY, shiftX);
  const sx = G.px + shiftX;
  if (G.speedFx > 0) { ctx.fillStyle = game.color; for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(sx - 8 + hash(i + Math.floor(performance.now() / 50)) * 16), pY + 10 + i * 3, 1, 6); }
  const sc = G.air > 0 ? 1 + 0.45 * Math.sin(Math.PI * (1 - G.air / Math.max(0.01, G.airMax))) : 1;
  if ((G.st !== "over" || Math.floor(G.crashT * 10) % 2 === 0) && !(G.invT > 0 && Math.floor(G.invT * 12) % 2)) drawCar(sx, pY, game.player, G.brake, G.st === "over" ? G.crashT * 6 : G.yaw, sc, G.air > 0 ? Math.round(6 * (sc - 1) / 0.45) + 2 : 2);
  if (G.shield) { ctx.strokeStyle = Math.floor(performance.now() / 200) & 1 ? "#4fd2ff" : "#9ff0ff"; ctx.lineWidth = 1; ctx.strokeRect(Math.round(sx) - 8.5, pY - 12.5, 17, 25); }
  if (G.speedFx > 0) for (let i = 0; i < 16; i++) { const e = hash(i * 7.3 + Math.floor(performance.now() / 40)); const xx = i < 8 ? Math.floor(e * 34) : W - 1 - Math.floor(e * 34); const yy = Math.floor(hash(i + performance.now() / 33) * H); ctx.fillStyle = i % 3 ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.6)"; ctx.fillRect(xx, yy, 1, 10 + Math.floor(e * 18)); }
  for (const p of G.parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
  game.overlay?.(pY, shiftX);
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.3 * G.flash / 0.25})`; ctx.fillRect(0, 0, W, H); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (G.st === "over") { ctx.fillStyle = `rgba(255,60,40,${Math.max(0, 0.5 - G.crashT)})`; ctx.fillRect(0, 0, W, H); }
  MP.flushTags(cv);
}
function drawGhosts(pY: number, shiftX: number) {
  for (const g of MP.ghosts()) {
    let y = pY - (g.y - G.pS); const x = Math.round(clamp(g.x + shiftX, 6, W - 6));
    const img = MP.tint(game.player.cv, g.col, game.id);
    if (y < -12 || y > H + 12) { // off screen: edge marker
      const up = y < 0; y = up ? 10 : H - 10; ctx.fillStyle = g.col;
      for (let i = 0; i < 4; i++) ctx.fillRect(x - i, up ? y - 6 + i : y + 6 - i, 2 * i + 1, 1);
      MP.tag(g, x, up ? y + 10 : y - 4); continue;
    }
    ctx.globalAlpha = g.st === "out" ? 0.3 : 0.62; ctx.drawImage(img, Math.round(x - SW / 2), Math.round(y - SH / 2)); ctx.globalAlpha = 1;
    MP.tag(g, x, y - SH / 2 - 1);
  }
}
export function pixelText(t: string, x: number, y: number, size: number, col: string, shadow: string) {
  const oc = document.createElement("canvas"); oc.width = W; oc.height = H; const o = oc.getContext("2d")!;
  o.font = `bold ${size}px "Press Start 2P", monospace`; o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = "#fff"; o.fillText(t, x, y);
  const d = o.getImageData(0, 0, W, H).data;
  for (const [c, dx] of [[shadow, 1], [col, 0]] as [string, number][]) for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 110) { ctx.fillStyle = c; ctx.fillRect(xx + dx, yy + dx, 1, 1); }
}
function updHud() {
  $("score").textContent = String(Math.floor(G.score));
  $("lvl").textContent = `${game.unit} ${G.level}`;
  $("time").textContent = fmtT(G.runT);
  $("combo").textContent = G.combo > 0 ? `x${G.mult.toFixed(2).replace(/\.?0+$/, "")} COMBO` : "";
  ($("prog").firstElementChild as HTMLElement).style.width = clamp(((G.pS - G.levelStart) / G.levelLen) * 100, 0, 100) + "%";
  const h = game.hud();
  $("info").innerHTML = h.info;
  $("obj").innerHTML = G.objs.map((o) => `<div class="${o.done ? "ok" : o.fail ? "no" : ""}">${o.done ? "■" : "□"} ${o.label}${!o.done && o.show ? " " + o.show() : ""}</div>`).join("");
  const fx = h.fx.slice(); if (G.shield) fx.unshift('<span class="u">■ SHIELD</span>'); if ((G.fx.x2 || 0) > 0) fx.unshift(`<span class="u">x2 POINTS ${G.fx.x2.toFixed(1)}</span>`);
  $("fx").innerHTML = fx.join("<br>");
  $("kmh").textContent = String(Math.round(game.kmh(G.v))).padStart(3, " ");
  $("panel").innerHTML = h.panel;
}

// ---------- boot ----------
export function boot(gm: Game) {
  game = gm; audio.setKey(gm.id);
  const app = $("app");
  app.innerHTML = `<canvas id="c"></canvas>
  <div id="hud" class="hidden"><div class="row"><span id="score">0</span><span id="lvl"></span></div><div class="row small"><span id="time">0:00.0</span><span id="combo"></span></div><div id="prog"><i></i></div><div id="info" class="small"></div><div id="obj" class="small"></div><div id="fx" class="small"></div></div>
  <div id="spd" class="hidden"><div><b id="kmh">0</b> <small>KM/H</small></div><div id="panel"></div></div>
  <div id="banner"></div><div id="bz"></div><div id="pop"></div><div id="note"></div>
  <div id="tl"><button id="bpause" aria-label="Pause">II</button><button id="bmute" aria-label="Mute">♪</button><button id="bfs" aria-label="Fullscreen">⛶</button></div>
  <div id="pads" class="hidden"><div class="pad" id="pl">◀</div><div id="mid">${gm.pads.map((p) => `<button id="${p.id}" class="mb ${p.cls || ""}">${p.label}</button>`).join("")}</div><div class="pad" id="pr">▶</div></div>
  <div id="menu"></div>`;
  cv = $<HTMLCanvasElement>("c"); ctx = cv.getContext("2d")!;
  const resize = () => {
    const vw = innerWidth, vh = innerHeight;
    H = OG ? 126 : Math.max(300, Math.min(400, Math.round((W * vh) / vw)));
    cv.width = W; cv.height = H; const s = Math.min(vw / W, vh / H);
    cv.style.width = Math.floor(W * s) + "px"; cv.style.height = Math.floor(H * s) + "px"; ctx.imageSmoothingEnabled = false;
  };
  addEventListener("resize", resize); resize();
  // no zoom / instant taps
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false } as AddEventListenerOptions);
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
  let lastTE = 0;
  document.addEventListener("touchend", (e) => { const t = Date.now(); if (t - lastTE < 350 && !(e.target as HTMLElement).closest("input,#menu button")) e.preventDefault(); lastTE = t; }, { passive: false });
  document.addEventListener("touchmove", (e) => { if ((e as TouchEvent).touches.length > 1) e.preventDefault(); }, { passive: false });
  // stale-build guard (GitHub Pages caches HTML ~10 min)
  if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  (() => {
    const mine = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.src; if (!mine) return;
    fetch(`${location.pathname}?fresh=${Date.now()}`, { cache: "no-store" }).then((r) => r.text()).then((html) => {
      const m = html.match(/assets\/index-[\w-]+\.js/); if (!m || mine.includes(m[0])) return;
      if (sessionStorage.getItem(gm.id + "-reloaded") === m[0]) return;
      sessionStorage.setItem(gm.id + "-reloaded", m[0]); const rm = params.get("room"); location.replace(`${location.pathname}?v=${m[0].slice(13, 21)}${rm ? "&room=" + encodeURIComponent(rm) : ""}`);
    }).catch(() => {});
  })();
  // input
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
    const rep = keys.has(k); keys.add(k);
    if (k === "escape" || k === "p") { if (G.st === "play") pause(true); else if (G.st === "pause") pause(false); }
    if (k === "m") audio.toggle();
    if (k === "arrowdown" || k === "s") brakeKey = true;
    if (k === "r" && G.st !== "title" && !MP.active) newRun();
    if (k === "enter" && (G.st === "title" || G.st === "board") && !MP.active) newRun();
    if (!rep && G.st === "play") { for (const p of gm.pads) if (p.keys?.includes(k)) p.down(); gm.keyDown?.(k); }
  });
  addEventListener("keyup", (e) => { const k = e.key.toLowerCase(); keys.delete(k); if (k === "arrowdown" || k === "s") brakeKey = false; for (const p of gm.pads) if (p.keys?.includes(k)) p.up?.(); });
  for (const p of gm.pads) {
    const el = $(p.id);
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add("on"); audio.start(); if (G.st === "play") p.down(); });
    const off = () => { el.classList.remove("on"); p.up?.(); };
    el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("pointerleave", off);
  }
  app.addEventListener("pointerdown", (e) => { if (G.st !== "play" || (e.target as HTMLElement).closest("button,#menu")) return; e.preventDefault(); pointers.set(e.pointerId, e.clientX); audio.start(); });
  app.addEventListener("pointermove", (e) => { if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e.clientX); });
  const up = (e: PointerEvent) => pointers.delete(e.pointerId);
  app.addEventListener("pointerup", up); app.addEventListener("pointercancel", up);
  $("bpause").onclick = () => (G.st === "play" ? pause(true) : pause(false));
  $("bmute").onclick = () => audio.toggle(); $("bmute").textContent = audio.muted ? "×" : "♪";
  const fs = $("bfs"); if (!document.documentElement.requestFullscreen) fs.style.display = "none";
  fs.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions).catch(() => {}); };
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(true); });
  (window as any).__g = { G, game: gm, newRun, give: (t: string) => gm.picks[t].apply(), jump: (d: number) => (G.pS += d), setGod: (v: boolean) => (G.god = v),
    forceBot() { const s = G.pS + 40; const b = mkBot(s, (G.px - gm.center(s)) / (gm.width(s) / 2 - 7), 0, gm.roster[0]); b.t = 99; b.data = { test: true }; G.bots.unshift(b); } };
  if (OG) {
    document.querySelectorAll("#hud,#tl,#pads,#menu,#banner,#pop,#note,#spd,#bz").forEach((e) => e.remove());
    cv.style.width = "1200px"; cv.style.height = "630px";
    document.fonts.load('16px "Press Start 2P"').finally(() => {
      gm.start(); G.st = "play"; gm.og(); render(); G.st = "title";
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, 8, W, 42);
      pixelText(gm.title, W / 2, 23, 16, gm.color, gm.shadow); pixelText(gm.ogSub, W / 2, 41, 8, "#fff", "#000");
      (window as any).ogReady = true;
    });
    return;
  }
  showTitle();
  MP.init({
    id: gm.id, title: gm.title, color: gm.color, target: gm.mpTarget ?? 3, unit: gm.unit,
    start: () => newRun(),
    state: () => ({ p: G.pS, x: G.px, y: G.pS, a: G.yaw, sc: G.score, lv: G.level, tm: G.runT, v: G.v }),
    quit: () => { G.st = "title"; showTitle(); },
  });
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (G.st === "title" || G.st === "board") { G.pS += 70 * dt; G.px = gm.center(G.pS); G.camX = G.px; }
    MP.rngRun(() => {
    if (G.st === "clear") { clearT -= dt; G.pS += G.v * dt; G.camX += (gm.center(G.pS) - G.camX) * dt * 2; G.px += (gm.center(G.pS) - G.px) * dt * 3; if (clearT <= 0) { G.level++; startLevel(); G.st = "play"; } }
    update(dt);
    });
    render();
    if (G.st === "play" || G.st === "clear" || G.st === "pause") updHud();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
