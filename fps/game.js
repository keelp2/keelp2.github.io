/* BREACHPOINT — a lightweight wave-survival FPS. Pure Three.js + WebAudio, no build step. */
(() => {
'use strict';
const V3 = THREE.Vector3;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const pick = a => a[Math.floor(Math.random() * a.length)];
const $ = id => document.getElementById(id);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// ============================================================ SETTINGS
const settings = { xhair: 'cross', xcolor: '#ffffff', invertY: false, adsToggle: false, view: 'first', sens: 1, fov: 85, quality: 'medium', difficulty: 'normal', map: 0, volume: 0.6, primary: 'rifle', secondary: 'pistol', cls: 'assault', music: 0.5, ambience: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem('breachpoint') || '{}')); } catch (e) {}
const saveSettings = () => { try { localStorage.setItem('breachpoint', JSON.stringify(settings)); } catch (e) {} };
const QUALITY = {
  low: { pr: () => 0.5, shadows: false },
  medium: { pr: () => Math.min(window.devicePixelRatio || 1, 1) * 0.85, shadows: false },
  high: { pr: () => Math.min(window.devicePixelRatio || 1, 1.5), shadows: true },
};
const DIFF = {
  easy: { dmg: 0.55, acc: 0.75, react: 1.45, hp: 0.85 },
  normal: { dmg: 1, acc: 1, react: 1, hp: 1 },
  hard: { dmg: 1.35, acc: 1.15, react: 0.7, hp: 1.15 },
};

// ============================================================ RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.autoClear = false;
renderer.shadowMap.type = THREE.PCFShadowMap;
$('game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(85, 1, 0.05, 600);
camera.rotation.order = 'YXZ';
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(54, 1, 0.045, 10);
vmScene.add(new THREE.HemisphereLight(0xdde6ff, 0x3a3530, 1.5));
const vmSun = new THREE.DirectionalLight(0xffffff, 1.8); vmSun.position.set(0.4, 1, 0.5); vmScene.add(vmSun);
let shadowsOn = false;
let dynScale = 1, dynAcc = 0, dynN = 0;
function resize() {
  renderer.setPixelRatio(QUALITY[settings.quality].pr() * dynScale);
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = vmCam.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ============================================================ TEXTURES
const TEX = {};
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function tex(size, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return t;
}
function speckle(g, s, n, a) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${Math.random() * a})` : `rgba(255,255,255,${Math.random() * a})`;
    const w = 1 + Math.random() * 2.5; g.fillRect(Math.random() * s, Math.random() * s, w, w);
  }
}
function blotch(g, s, n, rgb, a) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${rgb},${Math.random() * a})`; g.beginPath();
    g.arc(Math.random() * s, Math.random() * s, 8 + Math.random() * 40, 0, 7); g.fill();
  }
}
function makeTextures() {
  TEX.concrete = tex(256, (g, s) => { g.fillStyle = '#bdbdbd'; g.fillRect(0, 0, s, s); blotch(g, s, 40, '0,0,0', 0.05); speckle(g, s, 3000, 0.15); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2); });
  TEX.tiles = tex(256, (g, s) => {
    const n = 4, ts = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 165 + Math.random() * 35 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * ts, j * ts, ts, ts); }
    blotch(g, s, 20, '0,0,0', 0.06); speckle(g, s, 2500, 0.12);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * ts, 0); g.lineTo(i * ts, s); g.stroke(); g.beginPath(); g.moveTo(0, i * ts); g.lineTo(s, i * ts); g.stroke(); }
  });
  TEX.panel = tex(256, (g, s) => {
    g.fillStyle = '#a8a8a8'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 2) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(x, 0, 2, s); }
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, 0, s, 3); g.fillRect(0, s / 2, s, 3); g.fillRect(0, 0, 3, s);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 3, s, 2); g.fillRect(0, s / 2 + 3, s, 2);
    for (const y of [12, s / 2 - 10, s / 2 + 14, s - 10]) for (const x of [12, s / 2, s - 10]) {
      g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(x - 1, y - 1, 1.4, 0, 7); g.fill();
    }
    blotch(g, s, 12, '0,0,0', 0.06); speckle(g, s, 800, 0.1);
  });
  TEX.wood = tex(256, (g, s) => {
    const n = 5, h = s / n;
    for (let i = 0; i < n; i++) {
      const v = 150 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v * 0.78 | 0},${v * 0.52 | 0})`; g.fillRect(0, i * h, s, h);
      for (let k = 0; k < 12; k++) { g.strokeStyle = `rgba(60,30,10,${Math.random() * 0.25})`; g.beginPath(); const y = i * h + Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(s / 3, y + rand(-4, 4), 2 * s / 3, y + rand(-4, 4), s, y); g.stroke(); }
      g.fillStyle = 'rgba(40,20,5,.6)'; g.fillRect(0, i * h, s, 2);
    }
    g.strokeStyle = 'rgba(55,28,8,.85)'; g.lineWidth = 16; g.strokeRect(8, 8, s - 16, s - 16);
    g.lineWidth = 12; g.beginPath(); g.moveTo(14, 14); g.lineTo(s - 14, s - 14); g.stroke();
  });
  TEX.planks = tex(256, (g, s) => {
    const n = 6, h = s / n;
    for (let i = 0; i < n; i++) { const v = 150 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v * 0.78 | 0},${v * 0.52 | 0})`; g.fillRect(0, i * h, s, h); g.fillStyle = 'rgba(40,20,5,.5)'; g.fillRect(0, i * h, s, 2); }
    speckle(g, s, 1200, 0.12);
  });
  TEX.corrugated = tex(128, (g, s) => {
    for (let x = 0; x < s; x++) { const v = 150 + Math.sin(x / s * Math.PI * 2 * 8) * 55 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, s); }
    blotch(g, s, 10, '60,30,0', 0.12); speckle(g, s, 600, 0.15); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, s, 4);
  });
  TEX.hazard = tex(128, (g, s) => {
    g.fillStyle = '#e8b923'; g.fillRect(0, 0, s, s); g.fillStyle = '#1d1d1d';
    for (let i = -s; i < s * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 - s, s); g.lineTo(i - s, s); g.closePath(); g.fill(); }
    speckle(g, s, 500, 0.2);
  });
  TEX.plaster = tex(256, (g, s) => { g.fillStyle = '#ddd6c8'; g.fillRect(0, 0, s, s); blotch(g, s, 40, '90,70,40', 0.07); blotch(g, s, 30, '255,255,255', 0.08); speckle(g, s, 2500, 0.1); });
  TEX.sand = tex(256, (g, s) => {
    g.fillStyle = '#d8c39a'; g.fillRect(0, 0, s, s); blotch(g, s, 30, '150,110,60', 0.08);
    for (let y = 0; y < s; y += 6) { g.strokeStyle = `rgba(120,90,50,${0.05 + Math.random() * 0.06})`; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x * 0.0245 * 4 + y) * 2); g.stroke(); }
    speckle(g, s, 5000, 0.15);
  });
  TEX.bags = tex(128, (g, s) => {
    g.fillStyle = '#b9a477'; g.fillRect(0, 0, s, s);
    for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) { const x = c * 64 + (r % 2) * 32, y = r * 32; g.fillStyle = `rgba(255,240,200,${0.1 + Math.random() * 0.1})`; g.beginPath(); g.ellipse(x + 32, y + 16, 30, 13, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(70,50,20,.5)'; g.lineWidth = 2; g.stroke(); }
    speckle(g, s, 800, 0.15);
  });
  TEX.grid = tex(256, (g, s) => {
    g.fillStyle = '#1b1e30'; g.fillRect(0, 0, s, s); speckle(g, s, 1500, 0.08);
    g.strokeStyle = 'rgba(0,229,255,.6)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
    g.strokeStyle = 'rgba(0,229,255,.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
  });
  TEX.decal = tex(64, (g, s) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.25, 'rgba(10,10,10,.95)'); gr.addColorStop(0.45, 'rgba(30,30,30,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }, false);
  TEX.flash = tex(64, (g, s) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.3, 'rgba(255,200,90,.9)'); gr.addColorStop(1, 'rgba(255,120,20,0)');
    g.fillStyle = gr; g.beginPath();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = i % 2 ? 12 : 32; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    g.fill();
  }, false);
  TEX.dot = tex(32, (g, s) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, false);
}

// ============================================================ AUDIO — layered, CoD-style weapon audio + reverb + battle ambience
const GUNSND = { // crack, body (lowpass f, dur, gain), thump (f0 -> f1, dur, gain), mech click delay
  pistol: { crack: 0.55, bf: 3600, bd: 0.12, bg: 0.9, t0: 170, t1: 60, td: 0.08, tg: 0.55, mech: 0.05 },
  revolver: { crack: 0.85, bf: 3000, bd: 0.26, bg: 1.15, t0: 125, t1: 40, td: 0.2, tg: 0.95, mech: 0 },
  rifle: { crack: 0.75, bf: 4300, bd: 0.1, bg: 0.85, t0: 145, t1: 55, td: 0.07, tg: 0.6, mech: 0.03 },
  ak: { crack: 0.85, bf: 3000, bd: 0.14, bg: 1.0, t0: 115, t1: 45, td: 0.1, tg: 0.8, mech: 0.035 },
  smg: { crack: 0.45, bf: 4800, bd: 0.07, bg: 0.7, t0: 190, t1: 75, td: 0.05, tg: 0.4, mech: 0.025 },
  lmg: { crack: 0.75, bf: 3500, bd: 0.11, bg: 0.95, t0: 125, t1: 50, td: 0.08, tg: 0.75, mech: 0.03 },
  shotgun: { crack: 0.95, bf: 2500, bd: 0.32, bg: 1.3, t0: 95, t1: 35, td: 0.26, tg: 1.15, mech: 0 },
  dmr: { crack: 1.0, bf: 3500, bd: 0.2, bg: 1.15, t0: 110, t1: 40, td: 0.2, tg: 1.0, mech: 0.04 },
  sniper: { crack: 1.25, bf: 3000, bd: 0.38, bg: 1.4, t0: 90, t1: 30, td: 0.36, tg: 1.35, mech: 0 },
};
const sfx = {
  ctx: null,
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C();
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = settings.volume;
    this.musicBus = c.createGain(); this.musicBus.gain.value = settings.music;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.18;
    this.sfxBus.connect(comp); comp.connect(c.destination); this.musicBus.connect(c.destination);
    this.verb = c.createConvolver(); this.verb.buffer = this.impulse(2.4, 2.8); this.verbIn = c.createGain(); this.verbIn.gain.value = 0.55;
    this.verbIn.connect(this.verb); this.verb.connect(this.sfxBus);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nb = buf;
  },
  impulse(sec, decay) { // synthetic outdoor/room reverb: early reflections + diffuse tail
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (t < 0.02 ? 0.4 : 1); }
      for (let k = 0; k < 6; k++) { const at = Math.floor(c.sampleRate * (0.01 + Math.random() * 0.09)); d[at] += (Math.random() < 0.5 ? -1 : 1) * 0.6; } }
    return b;
  },
  setVol(v) { if (this.sfxBus) this.sfxBus.gain.value = v; },
  setMusic(v) { if (this.musicBus) this.musicBus.gain.value = v; },
  // chain: pan + optional lowpass (distance) + dry/wet split
  chain(pan = 0, wet = 0.2, lp = 0, vol = 1) {
    const c = this.ctx, g = c.createGain(); g.gain.value = vol; let head = g;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); head = f; }
    let out = head;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); head.connect(p); out = p; }
    out.connect(this.sfxBus);
    if (wet > 0) { const w = c.createGain(); w.gain.value = wet; out.connect(w); w.connect(this.verbIn); }
    return g;
  },
  nz(dest, o) {
    const c = this.ctx, t = o.t !== undefined ? o.t : c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.nb;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur); f.Q.value = o.q || 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g), t + (o.a || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * 1.5); src.stop(t + o.dur + 0.05);
  },
  osc(dest, o) {
    const c = this.ctx, t = o.t !== undefined ? o.t : c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(10, o.f2), t + o.dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g), t + (o.a || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur); osc.connect(g); g.connect(dest); osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  ok() { return this.ctx && this.ctx.state === 'running'; },
  gun(id, o = {}) { // o: dist, pan, vol, supp, comp
    if (!this.ok()) return; const P = GUNSND[id] || GUNSND.rifle, d = o.dist || 0, far = clamp(d / 70, 0, 1), sup = !!o.supp;
    const dest = this.chain(o.pan || 0, sup ? 0.12 : 0.22 + far * 0.6, far > 0.02 ? 12000 - far * 10500 : 0, (o.vol === undefined ? 1 : o.vol) * (o.comp ? 1.12 : 1) / (1 + d * 0.025));
    const t = this.ctx.currentTime;
    if (!sup) this.nz(dest, { t, dur: 0.035, type: 'highpass', f: 2600, g: P.crack * (1 - far * 0.85) });
    this.nz(dest, { t, dur: sup ? P.bd * 0.6 : P.bd, type: 'lowpass', f: sup ? P.bf * 0.32 : P.bf, f2: P.bf * 0.2, g: P.bg * (sup ? 0.45 : 1), a: 0.001 });
    this.osc(dest, { t, type: 'sine', f: P.t0, f2: P.t1, dur: P.td, g: P.tg * (sup ? 0.35 : 1) * (1 - far * 0.5) });
    if (!sup && !far) this.nz(dest, { t: t + 0.02, dur: 0.5, type: 'bandpass', f: 700, f2: 180, q: 0.6, g: 0.12 });
    if (P.mech && d < 6) this.nz(dest, { t: t + P.mech, dur: 0.03, type: 'bandpass', f: 3300, q: 5, g: 0.18 });
  },
  boom(dist = 0, pan = 0, big = 1) {
    if (!this.ok()) return; const far = clamp(dist / 120, 0, 1);
    const dest = this.chain(pan, 0.45 + far * 0.5, far > 0.02 ? 6000 - far * 5200 : 0, big / (1 + dist * 0.02)), t = this.ctx.currentTime;
    this.nz(dest, { t, dur: 0.05, type: 'highpass', f: 1500, g: 0.9 * (1 - far) });
    this.nz(dest, { t, dur: 1.8, type: 'lowpass', f: 1600, f2: 70, g: 1.4, a: 0.004 });
    this.osc(dest, { t, type: 'sine', f: 70, f2: 22, dur: 1.2, g: 1.3 });
    for (let i = 0; i < 8 && !far; i++) this.nz(dest, { t: t + 0.15 + Math.random() * 0.9, dur: 0.05, type: 'bandpass', f: 1500 + Math.random() * 3000, q: 3, g: 0.08 });
  },
  play(n, o = {}) {
    if (!this.ok()) return;
    const v = o.vol === undefined ? 1 : o.vol, dest = this.chain(o.pan || 0, o.wet || 0.05, 0, v);
    const N = x => this.nz(dest, x), T = x => this.osc(dest, x);
    switch (n) {
      case 'eRifle': return this.gun('rifle', o); case 'eShotgun': return this.gun('shotgun', o); case 'eHeavy': return this.gun('lmg', o); case 'eSniper': return this.gun('sniper', o);
      case 'pistol': case 'revolver': case 'rifle': case 'ak': case 'smg': case 'lmg': case 'shotgun': case 'dmr': case 'sniper': return this.gun(n, o);
      case 'charge': T({ type: 'sine', f: 600, f2: 1800, dur: 1.0, g: 0.18, a: 0.3 }); break;
      case 'empty': N({ dur: 0.035, type: 'bandpass', f: 3500, q: 6, g: 0.4 }); break;
      case 'magout': N({ dur: 0.07, type: 'bandpass', f: 1800, q: 4, g: 0.45 }); N({ dur: 0.12, type: 'bandpass', f: 900, q: 2, g: 0.2, delay: 0.05 }); break;
      case 'magin': N({ dur: 0.05, type: 'bandpass', f: 2600, q: 3, g: 0.55 }); N({ dur: 0.06, type: 'bandpass', f: 1200, q: 3, g: 0.55, delay: 0.07 }); N({ dur: 0.04, type: 'highpass', f: 4000, g: 0.4, delay: 0.25 }); break;
      case 'bolt': N({ dur: 0.08, type: 'bandpass', f: 1500, q: 3, g: 0.5 }); N({ dur: 0.08, type: 'bandpass', f: 2200, q: 3, g: 0.5, delay: 0.18 }); break;
      case 'shell': N({ dur: 0.07, type: 'bandpass', f: 1700, q: 3, g: 0.5 }); break;
      case 'pump': N({ dur: 0.09, type: 'bandpass', f: 900, q: 2, g: 0.6 }); N({ dur: 0.09, type: 'bandpass', f: 1500, q: 2, g: 0.6, delay: 0.14 }); break;
      case 'switch': N({ dur: 0.08, type: 'bandpass', f: 1300, q: 2, g: 0.35 }); N({ dur: 0.05, type: 'bandpass', f: 2600, q: 3, g: 0.25, delay: 0.1 }); break;
      case 'hit': N({ dur: 0.03, type: 'bandpass', f: 4200, q: 6, g: 0.5 }); T({ type: 'square', f: 1900, dur: 0.025, g: 0.06 }); break;
      case 'head': T({ type: 'sine', f: 2600, dur: 0.2, g: 0.3 }); N({ dur: 0.04, type: 'bandpass', f: 5000, q: 6, g: 0.5 }); break;
      case 'kill': N({ dur: 0.06, type: 'bandpass', f: 2500, q: 3, g: 0.6 }); T({ type: 'triangle', f: 520, f2: 380, dur: 0.18, g: 0.3 }); break;
      case 'hurt': N({ dur: 0.2, f: 700, f2: 150, g: 0.7 }); T({ f: 90, f2: 45, dur: 0.18, g: 0.55 }); break;
      case 'step': N({ dur: 0.08, f: rand(450, 750), f2: 140, g: 0.2 }); N({ dur: 0.03, type: 'highpass', f: 3000, g: 0.03, delay: 0.01 }); break;
      case 'land': N({ dur: 0.16, f: 500, f2: 90, g: 0.5 }); break;
      case 'jump': N({ dur: 0.08, f: 900, f2: 300, g: 0.12 }); break;
      case 'slide': N({ dur: 0.6, type: 'bandpass', f: 900, f2: 300, q: 0.8, g: 0.28, a: 0.05 }); break;
      case 'pad': T({ type: 'sine', f: 200, f2: 1200, dur: 0.35, g: 0.35 }); N({ dur: 0.4, type: 'bandpass', f: 600, f2: 3000, g: 0.25 }); break;
      case 'explode': return this.boom(o.dist || 0, o.pan || 0, o.vol || 1);
      case 'pickup': T({ type: 'triangle', f: 660, dur: 0.08, g: 0.3 }); T({ type: 'triangle', f: 990, dur: 0.12, g: 0.3, delay: 0.08 }); break;
      case 'wave': T({ type: 'sawtooth', f: 110, dur: 0.9, g: 0.22, a: 0.05 }); T({ type: 'sawtooth', f: 165, dur: 0.9, g: 0.16, a: 0.05 }); N({ dur: 1.2, f: 400, f2: 60, g: 0.5 }); break;
      case 'clear': [523, 659, 784, 1046].forEach((f, i) => T({ type: 'triangle', f, dur: 0.25, g: 0.22, delay: i * 0.09 })); break;
      case 'whiz': N({ dur: 0.02, type: 'highpass', f: 5000, g: 0.6 }); N({ dur: 0.16, type: 'bandpass', f: 4200, f2: 1300, q: 5, g: 0.4, a: 0.03 }); break;
      case 'throw': N({ dur: 0.15, type: 'bandpass', f: 600, f2: 1500, g: 0.25 }); break;
      case 'bounce': T({ type: 'triangle', f: 900, f2: 600, dur: 0.06, g: 0.15 }); break;
      case 'spawn': T({ type: 'sine', f: 1500, f2: 300, dur: 0.4, g: 0.12 }); break;
      case 'low': T({ type: 'square', f: 2600, dur: 0.025, g: 0.05 }); break;
      case 'swing': N({ dur: 0.18, type: 'bandpass', f: 900, f2: 2600, q: 1.2, g: 0.45, a: 0.04 }); break;
      case 'stab': N({ dur: 0.09, f: 1200, f2: 200, g: 0.8 }); T({ f: 140, f2: 60, dur: 0.1, g: 0.5 }); break;
      case 'clang': T({ type: 'triangle', f: 1800, dur: 0.25, g: 0.2 }); N({ dur: 0.05, type: 'highpass', f: 4000, g: 0.3 }); break;
      case 'howl': T({ type: 'sawtooth', f: 300, f2: 620, dur: 0.5, g: 0.15, a: 0.1 }); T({ type: 'sawtooth', f: 620, f2: 380, dur: 0.9, g: 0.12, delay: 0.45, a: 0.05 }); break;
      case 'brew': T({ type: 'sine', f: 300, f2: 900, dur: 0.4, g: 0.25 }); for (let i = 0; i < 5; i++) T({ type: 'sine', f: rand(400, 900), f2: rand(900, 1400), dur: 0.08, g: 0.1, delay: 0.1 + i * 0.07 }); break;
    }
  },
};
function spatial(p) {
  const dx = p.x - camera.position.x, dy = p.y - camera.position.y, dz = p.z - camera.position.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  return { vol: 1 / (1 + d * 0.07), pan: clamp((dx * rx + dz * rz) / d, -1, 1) * 0.8, dist: d };
}
// distant battle (only while a match is running)
const ambience = { t: 2,
  update(dt) {
    if (!sfx.ok() || settings.ambience === false) return;
    this.t -= dt; if (this.t > 0) return; this.t = rand(0.8, 4.5);
    const pan = rand(-1, 1), r = Math.random();
    if (r < 0.6) { const id = pick(['rifle', 'ak', 'lmg', 'smg', 'rifle']), n = randi(3, 9), dist = rand(110, 260), gap = id === 'lmg' ? 0.08 : id === 'smg' ? 0.07 : rand(0.09, 0.2);
      for (let i = 0; i < n; i++) setTimeout(() => sfx.gun(id, { dist, pan, vol: 0.55 }), i * gap * 1000); }
    else if (r < 0.85) sfx.boom(rand(180, 380), pan, 0.8);
    else { const dist = rand(150, 300); for (let i = 0; i < 3; i++) setTimeout(() => sfx.gun('sniper', { dist, pan, vol: 0.5 }), i * rand(900, 1600)); }
  },
};

// ============================================================ MUSIC — tiny sequencer with silly instruments
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz
const INSTR = {
  tuba(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.04);
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 2; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.55, t + 0.025); g.gain.exponentialRampToValueAtTime(v * 0.25, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(lp); lp.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05); },
  kazoo(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), o2 = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); o2.frequency.setValueAtTime(f * 1.003, t);
    lfo.frequency.value = 6.5; lg.gain.value = f * 0.018; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.6; const m = c.createGain(); m.gain.value = 0.5; o.connect(bp); o2.connect(m); m.connect(bp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.5, t + 0.03); g.gain.setValueAtTime(v * 0.45, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    bp.connect(g); g.connect(dest); for (const x of [o, o2, lfo]) { x.start(t); x.stop(t + d + 0.05); } },
  accordion(dest, t, f, d, v) { const c = sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.18, t + 0.02); g.gain.setValueAtTime(v * 0.16, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    for (const det of [-7, 7]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + 0.05); } },
  bell(dest, t, f, d, v) { const c = sfx.ctx; for (const [m, a] of [[1, 1], [2.76, 0.3], [5.4, 0.12]]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f * m; g.gain.setValueAtTime(v * 0.25 * a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 1.5); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d * 1.5 + 0.05); } },
  brass(dest, t, f, d, v) { const c = sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.linearRampToValueAtTime(2600, t + 0.08); lp.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.3, t + 0.04); g.gain.setValueAtTime(v * 0.26, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    for (const det of [-5, 0, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + 0.05); } },
  trombone(dest, t, f, d, v, bend) { const c = sfx.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); if (bend) o.frequency.linearRampToValueAtTime(f * bend, t + d);
    lfo.frequency.setValueAtTime(5, t); lfo.frequency.linearRampToValueAtTime(7, t + d); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.03, t + d); lfo.connect(lg); lg.connect(o.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 1200; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.5, t + 0.05); g.gain.setValueAtTime(v * 0.45, t + d * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(lp); lp.connect(g); g.connect(dest); o.start(t); lfo.start(t); o.stop(t + d + 0.05); lfo.stop(t + d + 0.05); },
  kick(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(v * 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3); },
  snare(dest, t, f, d, v) { const c = sfx.ctx, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = sfx.nb; bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 0.7;
    g.gain.setValueAtTime(v * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (d || 0.15)); s.connect(bp); bp.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + (d || 0.15) + 0.05); },
  tamb(dest, t, f, d, v) { const c = sfx.ctx, s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(); s.buffer = sfx.nb; hp.type = 'highpass'; hp.frequency.value = 7000;
    g.gain.setValueAtTime(v * 0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); s.connect(hp); hp.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + 0.1); },
  boing(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 4, t + d * 0.5); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + d);
    g.gain.setValueAtTime(v * 0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05); },
};
// Songs: list of [beat, instrument, midi, lengthInBeats, velocity, extra]
function polkaTheme() { // "The Ballad of Bogwater" — oom-pah polka with a kazoo lead
  const ev = [], prog = [[48, [60, 64, 67]], [43, [59, 62, 67]], [48, [60, 64, 67]], [41, [60, 65, 69]], [48, [60, 64, 67]], [43, [59, 62, 65]], [48, [60, 64, 67]], [43, [59, 62, 67]]];
  prog.forEach(([b, ch], bar) => { const s = bar * 4;
    ev.push([s, 'tuba', b, 0.9, 1], [s + 2, 'tuba', b + 7, 0.9, 0.9]);
    for (const off of [1, 3]) for (const n of ch) ev.push([s + off, 'accordion', n, 0.5, 0.8]);
    for (let k = 0; k < 4; k++) ev.push([s + k + 0.5, 'tamb', 0, 0.1, 0.8]);
    ev.push([s, 'kick', 0, 0.2, 0.6], [s + 2, 'kick', 0, 0.2, 0.6], [s + 1, 'snare', 0, 0.12, 0.35], [s + 3, 'snare', 0, 0.12, 0.35]);
  });
  const mel = [[0, 76, 1], [1, 79, 0.5], [1.5, 79, 0.5], [2, 81, 0.5], [2.5, 79, 0.5], [3, 76, 1], [4, 74, 0.5], [4.5, 74, 0.5], [5, 77, 1], [6, 74, 1], [7, 71, 1],
    [8, 72, 0.5], [8.5, 74, 0.5], [9, 76, 1], [10, 79, 1], [11, 84, 1], [12, 81, 1], [13, 77, 0.5], [13.5, 76, 0.5], [14, 74, 2],
    [16, 76, 1], [17, 79, 0.5], [17.5, 79, 0.5], [18, 81, 0.5], [18.5, 79, 0.5], [19, 76, 1], [20, 81, 1], [21, 79, 0.5], [21.5, 77, 0.5], [22, 76, 1], [23, 74, 1],
    [24, 72, 0.5], [24.5, 76, 0.5], [25, 79, 1], [26, 74, 0.5], [26.5, 71, 0.5], [27, 74, 1], [28, 72, 3], [31, 67, 0.5], [31.5, 71, 0.5]];
  for (const [b, n, l] of mel) ev.push([b, 'kazoo', n, l * 0.95, 0.9]);
  ev.push([29, 'boing', 220, 0.6, 0.6]);
  return { bpm: 150, len: 32, loop: true, ev };
}
function fanfare() { const ev = [];
  [[0, 0.25], [0.33, 0.25], [0.66, 0.25], [1, 1.5]].forEach(([b, l], i) => { const n = [67, 67, 67, 72][i]; ev.push([b, 'brass', n, l, 1], [b, 'brass', n - 12, l, 0.7]); });
  for (let i = 0; i < 8; i++) ev.push([i * 0.125, 'snare', 0, 0.08, 0.5]);
  ev.push([1, 'kick', 0, 0.3, 1], [1, 'snare', 0, 0.6, 0.6], [2.6, 'boing', 330, 0.5, 0.7]);
  return { bpm: 120, len: 4, loop: false, ev };
}
function victory() { const ev = [];
  [[0, 72, 0.5], [0.5, 76, 0.5], [1, 79, 0.5], [1.5, 84, 2]].forEach(([b, n, l]) => { ev.push([b, 'brass', n, l, 1], [b, 'brass', n - 12, l, 0.6]); });
  for (let i = 0; i < 8; i++) ev.push([2 + i * 0.125, 'kazoo', i % 2 ? 86 : 84, 0.12, 0.7]);
  ev.push([3.5, 'kazoo', 88, 1, 0.8], [1.5, 'kick', 0, 0.3, 1], [1.5, 'snare', 0, 1.2, 0.5], [3.5, 'bell', 96, 1, 0.8]);
  return { bpm: 120, len: 6, loop: false, ev };
}
function sadTrombone() { const ev = [[0, 'trombone', 67, 0.55, 1], [0.6, 'trombone', 66, 0.55, 1], [1.2, 'trombone', 65, 0.55, 1], [1.8, 'trombone', 64, 2.4, 1, 0.97]]; return { bpm: 90, len: 5, loop: false, ev }; }
const SONGS = { title: polkaTheme, start: fanfare, win: victory, lose: sadTrombone };
const music = {
  cur: null, name: '',
  play(name) {
    if (!sfx.ok()) { this.pending = name; return; }
    if (this.name === name && this.cur && SONGS[name]().loop) return;
    this.stop(); const song = SONGS[name](), c = sfx.ctx, out = c.createGain(); out.gain.value = name === 'title' ? 0.8 : 1; out.connect(sfx.musicBus);
    const spb = 60 / song.bpm, ev = song.ev.slice().sort((a, b) => a[0] - b[0]);
    const st = { out, t0: c.currentTime + 0.08, i: 0, loopN: 0, timer: 0 };
    const tick = () => {
      const horizon = c.currentTime + 0.3;
      for (;;) {
        if (st.i >= ev.length) { if (!song.loop) return; st.i = 0; st.loopN++; }
        const e = ev[st.i], at = st.t0 + (e[0] + st.loopN * song.len) * spb; if (at > horizon) break;
        if (at > c.currentTime - 0.05) INSTR[e[1]](out, Math.max(at, c.currentTime), e[1] === 'boing' ? e[2] : NOTE(e[2]), e[3] * spb, e[4], e[5]);
        st.i++;
      }
    };
    tick(); st.timer = setInterval(tick, 60);
    this.cur = st; this.name = name;
    if (!song.loop) setTimeout(() => { if (this.cur === st && name !== 'title') { this.cur = null; this.name = ''; } }, (song.len * spb + 1) * 1000);
  },
  stop() { if (!this.cur) return; clearInterval(this.cur.timer); const g = this.cur.out.gain, c = sfx.ctx; g.setValueAtTime(g.value, c.currentTime); g.linearRampToValueAtTime(0.0001, c.currentTime + 0.4); const o = this.cur.out; setTimeout(() => o.disconnect(), 600); this.cur = null; this.name = ''; },
};

// ============================================================ LEVEL BUILDER
class LevelBuilder {
  constructor() { this.links = []; this.props = []; this.water = []; this.glows = []; this.padStyle = 'mushroom'; this.boxes = []; this.decor = []; this.pads = []; this.barrels = []; this.pickups = []; this.enemySpawns = []; this.spawn = { x: 0, y: 0, z: 0, yaw: 0 }; this.bounds = [-30, -30, 30, 30]; }
  box(x0, y0, z0, x1, y1, z1, m = 'wall', o = {}) {
    const b = { x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), m, tint: o.tint };
    (o.col === false ? this.decor : this.boxes).push(b); return b;
  }
  B(cx, cz, w, d, h, y = 0, m = 'wall', o) { return this.box(cx - w / 2, y, cz - d / 2, cx + w / 2, y + h, cz + d / 2, m, o); }
  stairs(x, z, dir, w, h0, h1, run, m = 'metal') {
    const n = Math.max(1, Math.ceil((h1 - h0) / 0.34)), sd = run / n;
    { const dx = dir === 'px' ? 1 : dir === 'nx' ? -1 : 0, dz = dir === 'pz' ? 1 : dir === 'nz' ? -1 : 0; // nav link bottom -> top
      this.links.push([x - dx * 0.6, h0, z - dz * 0.6, x + dx * (run + 0.6), h1, z + dz * (run + 0.6), run + 1.2]); }
    for (let i = 0; i < n; i++) {
      const top = h0 + (h1 - h0) * (i + 1) / n, a = i * sd, b = (i + 1) * sd;
      if (dir === 'px') this.box(x + a, h0, z - w / 2, x + b, top, z + w / 2, m);
      else if (dir === 'nx') this.box(x - b, h0, z - w / 2, x - a, top, z + w / 2, m);
      else if (dir === 'pz') this.box(x - w / 2, h0, z + a, x + w / 2, top, z + b, m);
      else this.box(x - w / 2, h0, z - b, x + w / 2, top, z - a, m);
    }
  }
  // wall along X at z with openings [{c,w,y0,y1}]
  wallX(x0, x1, z, th, h, ops, m) {
    let cur = x0;
    for (const o of (ops || []).slice().sort((a, b) => a.c - b.c)) {
      const a = o.c - o.w / 2, b = o.c + o.w / 2;
      if (a > cur) this.box(cur, 0, z - th / 2, a, h, z + th / 2, m);
      if (o.y0 > 0) this.box(a, 0, z - th / 2, b, o.y0, z + th / 2, m);
      if (o.y1 < h) this.box(a, o.y1, z - th / 2, b, h, z + th / 2, m);
      cur = b;
    }
    if (cur < x1) this.box(cur, 0, z - th / 2, x1, h, z + th / 2, m);
  }
  wallZ(z0, z1, x, th, h, ops, m) {
    let cur = z0;
    for (const o of (ops || []).slice().sort((a, b) => a.c - b.c)) {
      const a = o.c - o.w / 2, b = o.c + o.w / 2;
      if (a > cur) this.box(x - th / 2, 0, cur, x + th / 2, h, a, m);
      if (o.y0 > 0) this.box(x - th / 2, 0, a, x + th / 2, o.y0, b, m);
      if (o.y1 < h) this.box(x - th / 2, o.y1, a, x + th / 2, h, b, m);
      cur = b;
    }
    if (cur < z1) this.box(x - th / 2, 0, cur, x + th / 2, h, z1, m);
  }
  building(x0, z0, x1, z1, h, ops, m = 'house', roof = 'roof', parapet = 0) {
    const th = 0.5;
    this.wallX(x0, x1, z1 - th / 2, th, h, ops.n, m);
    this.wallX(x0, x1, z0 + th / 2, th, h, ops.s, m);
    this.wallZ(z0 + th, z1 - th, x1 - th / 2, th, h, ops.e, m);
    this.wallZ(z0 + th, z1 - th, x0 + th / 2, th, h, ops.w, m);
    this.box(x0 - 0.2, h, z0 - 0.2, x1 + 0.2, h + 0.3, z1 + 0.2, roof);
    if (parapet) {
      const y = h + 0.3, t = 0.35, gap = ops.roofGap; // gap = [x0,x1] on south side
      this.box(x0 - 0.2, y, z1 - t + 0.2, x1 + 0.2, y + parapet, z1 + 0.2, m);
      this.box(x1 - t + 0.2, y, z0 - 0.2, x1 + 0.2, y + parapet, z1 + 0.2, m);
      this.box(x0 - 0.2, y, z0 - 0.2, x0 + t - 0.2, y + parapet, z1 + 0.2, m);
      if (gap) {
        if (gap[0] > x0) this.box(x0 - 0.2, y, z0 - 0.2, gap[0], y + parapet, z0 + t - 0.2, m);
        if (gap[1] < x1) this.box(gap[1], y, z0 - 0.2, x1 + 0.2, y + parapet, z0 + t - 0.2, m);
      } else this.box(x0 - 0.2, y, z0 - 0.2, x1 + 0.2, y + parapet, z0 + t - 0.2, m);
    }
  }
  trim(b, m, inset = 0.03) { // glowing outline around top edge
    const y0 = b.y1 - 0.09, y1 = b.y1 + 0.01, e = inset;
    this.box(b.x0 - e, y0, b.z0 - e, b.x1 + e, y1, b.z0 + 0.05, m, { col: false });
    this.box(b.x0 - e, y0, b.z1 - 0.05, b.x1 + e, y1, b.z1 + e, m, { col: false });
    this.box(b.x0 - e, y0, b.z0, b.x0 + 0.05, y1, b.z1, m, { col: false });
    this.box(b.x1 - 0.05, y0, b.z0, b.x1 + e, y1, b.z1, m, { col: false });
  }
  pad(x, z, y, vy, px, pz) {
    let b;
    if (this.padStyle === 'mushroom') { b = this.B(x, z, 1.7, 1.7, 0.3, y, 'pad'); b.noRender = true; this.prop('bigmush', x, y, z, 1); this.glow(x, y + 0.5, z, 0x8affb0, 0.9); }
    else { b = this.B(x, z, 2, 2, 0.08, y, 'rune'); this.B(x, z, 2.5, 2.5, 0.05, y, 'castle', { col: false }); this.glow(x, y + 0.4, z, 0x6fd8ff, 2); }
    b.pad = { vy, px, pz }; this.pads.push(b); return b;
  }
  prop(k, x, y, z, s = 1, o = {}) {
    const fixed = ['log', 'gable', 'octo', 'coneroof', 'house', 'tower', 'mountain', 'chimney'].includes(k);
    const p = Object.assign({ k, x, y, z, s, ry: fixed ? 0 : rand(0, 6.28) }, o); this.props.push(p);
    if (k === 'lantern') this.glow(x + 0.42 * s * Math.cos(p.ry), y + 2.1 * s, z - 0.42 * s * Math.sin(p.ry), 0xffc070, 1.2 * s);
    if (k === 'torch') this.glow(x + 0.2 * s * Math.sin(p.ry), y + 0.6 * s, z + 0.2 * s * Math.cos(p.ry), 0xff8a30, 1.7, true);
    if (k === 'brazier') this.glow(x, y + 0.7 * s, z, 0xff7a20, 2.4 * s, true);
    return p;
  }
  glow(x, y, z, c, s = 1, flame = false) { this.glows.push([x, y, z, c, s, flame]); }
  octo(cx, cz, R, h, m, y = 0) { // octagonal tower: 3 collision boxes approximate the shape
    const a = R * Math.tan(Math.PI / 8), q = R / Math.SQRT2;
    for (const [w, d] of [[R, a], [a, R], [q, q]]) this.box(cx - w, y, cz - d, cx + w, y + h, cz + d, m).noRender = true;
    this.prop('octo', cx, y, cz, 1, { r: R / Math.cos(Math.PI / 8), h, mat: m });
  }
}
const door = c => ({ c, w: 2.2, y0: 0, y1: 2.6 });
const win = c => ({ c, w: 1.6, y0: 1.15, y1: 2.1 });

// ============================================================ REALISTIC PROCEDURAL TEXTURES
// Pixel-level fbm / voronoi textures, generated lazily and cached. Each doubles as its own bump map.
function valueNoise() {
  const perm = new Uint8Array(512), vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = Math.random(); }
  for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const h = (x, y, P) => vals[perm[perm[((x % P) + P) % P] + (((y % P) + P) % P)]];
  return (x, y, P) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    return lerp(lerp(h(xi, yi, P), h(xi + 1, yi, P), u), lerp(h(xi, yi + 1, P), h(xi + 1, yi + 1, P), u), w);
  };
}
const NZ = valueNoise(), NZ2 = valueNoise();
function fbm(N, x, y, size, base, oct, sx = 1, sy = 1) { // tileable fbm (sx/sy stretch keeps tiling when they are integers)
  let a = 0.5, s = 0, n = 0;
  for (let o = 0; o < oct; o++) { const f = base << o; s += a * N(x / size * f * sx, y / size * f * sy, f * Math.max(sx, sy)); n += a; a *= 0.5; }
  return s / n;
}
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function pixCanvas(size, fn, alpha) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const img = g.createImageData(size, size), d = img.data, out = [0, 0, 0, 255];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    out[3] = 255; fn(x, y, out); const i = (y * size + x) * 4;
    d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; d[i + 3] = alpha ? out[3] : 255;
  }
  g.putImageData(img, 0, 0); return c;
}
function canvasTex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t;
}
// Voronoi helper for stones (tileable): returns [d1, d2, cellId]
function voronoi(x, y, size, cells, pts) {
  const cs = size / cells, ci = Math.floor(x / cs), cj = Math.floor(y / cs); let d1 = 1e9, d2 = 1e9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const a = ci + i, b = cj + j, wa = ((a % cells) + cells) % cells, wb = ((b % cells) + cells) % cells, p = pts[wb * cells + wa];
    const px = (a + p[0]) * cs, py = (b + p[1]) * cs, d = Math.hypot(px - x, py - y);
    if (d < d1) { d2 = d1; d1 = d; id = wb * cells + wa; } else if (d < d2) d2 = d;
  }
  return [d1 / cs, d2 / cs, id];
}
const jitterPts = (n, j = 0.7) => Array.from({ length: n * n }, () => [0.5 + (Math.random() - 0.5) * j, 0.5 + (Math.random() - 0.5) * j, Math.random()]);
const TEXF = {
  grassMud: () => pixCanvas(512, (x, y, o) => {
    const n = fbm(NZ, x, y, 512, 8, 5), m = fbm(NZ2, x, y, 512, 3, 4), fine = NZ(x * 0.9, y * 0.9, 461);
    const mud = smooth(0.52, 0.64, m), wet = smooth(0.66, 0.74, m);
    let r = lerp(48, 98, n), g = lerp(74, 122, n), b = lerp(28, 50, n);
    r = lerp(r, lerp(86, 108, n) * (1 - wet * 0.15), mud * 0.85); g = lerp(g, lerp(72, 90, n) * (1 - wet * 0.15), mud * 0.85); b = lerp(b, lerp(44, 58, n) * (1 - wet * 0.12), mud * 0.85);
    const k = 0.92 + fine * 0.16; o[0] = r * k; o[1] = g * k; o[2] = b * k;
  }),
  cobble: (() => { const pts = jitterPts(10); return () => pixCanvas(512, (x, y, o) => {
    const [d1, d2, id] = voronoi(x, y, 512, 10, pts), edge = d2 - d1, n = fbm(NZ, x, y, 512, 16, 3), base = 120 + pts[id][2] * 60;
    const stone = smooth(0.06, 0.16, edge), dome = 1 - d1 * 0.55;
    const v = lerp(55 + n * 25, base * dome * (0.8 + n * 0.35), stone);
    o[0] = v * 1.02; o[1] = v * 0.98; o[2] = v * 0.92;
  }); })(),
  flagstone: (() => { const pts = jitterPts(5, 0.5); return () => pixCanvas(512, (x, y, o) => {
    const [d1, d2, id] = voronoi(x, y, 512, 5, pts), edge = d2 - d1, n = fbm(NZ, x, y, 512, 8, 4), c = fbm(NZ2, x, y, 512, 32, 2);
    const slab = smooth(0.025, 0.07, edge), v = lerp(40, (95 + pts[id][2] * 45) * (0.75 + n * 0.45) * (c > 0.72 ? 0.8 : 1), slab);
    o[0] = v * 0.97; o[1] = v * 0.97; o[2] = v * 1.04;
  }); })(),
  castle: () => pixCanvas(256, (x, y, o) => { // large ashlar blocks
    const bh = 64, row = Math.floor(y / bh), bw = 128, off = (row % 2) * 64, bx = Math.floor((x + off) / bw);
    const lx = (x + off) % bw, ly = y % bh, mort = Math.min(lx, bw - lx, ly, bh - ly);
    const n = fbm(NZ, x, y, 256, 8, 4), r = (Math.sin(bx * 12.9898 + row * 78.233) * 43758.5) % 1, tone = 0.82 + Math.abs(r) * 0.3;
    const v = mort < 3 ? 70 + n * 20 : (125 + n * 70) * tone * (mort < 7 ? 0.88 : 1);
    o[0] = v * 1.0; o[1] = v * 0.97; o[2] = v * 0.9;
  }),
  brick: () => pixCanvas(256, (x, y, o) => {
    const bh = 32, row = Math.floor(y / bh), bw = 64, off = (row % 2) * 32, bx = Math.floor((x + off) / bw);
    const lx = (x + off) % bw, ly = y % bh, mort = Math.min(lx, bw - lx, ly, bh - ly);
    const n = fbm(NZ, x, y, 256, 16, 3), r = Math.abs((Math.sin(bx * 12.9898 + row * 78.233) * 43758.5) % 1);
    const v = mort < 2.5 ? 150 + n * 30 : (110 + n * 60) * (0.78 + r * 0.35);
    o[0] = v; o[1] = v * 0.95; o[2] = v * 0.88;
  }),
  cliff: () => pixCanvas(256, (x, y, o) => {
    const n = fbm(NZ, x, y, 256, 4, 5), rid = 1 - Math.abs(fbm(NZ2, x, y, 256, 4, 4, 1, 4) * 2 - 1), moss = smooth(0.58, 0.7, fbm(NZ2, x + 77, y, 256, 4, 3));
    let v = 70 + n * 90 - rid * rid * 40;
    o[0] = lerp(v * 1.02, v * 0.62, moss); o[1] = lerp(v * 0.98, v * 0.82, moss); o[2] = lerp(v * 0.9, v * 0.45, moss);
  }),
  bark: () => pixCanvas(256, (x, y, o) => {
    const n = fbm(NZ, x, y, 256, 4, 5, 6, 1), c = fbm(NZ2, x, y, 256, 8, 3);
    const groove = smooth(0.35, 0.5, n), v = lerp(30, 95, groove) * (0.85 + c * 0.3);
    o[0] = v * 1.0; o[1] = v * 0.78; o[2] = v * 0.58;
  }),
  planks: () => pixCanvas(256, (x, y, o) => {
    const ph = 42.67, row = Math.floor(y / ph), ly = y - row * ph, n = fbm(NZ, x, y, 256, 2, 4, 1, 8), knot = fbm(NZ2, x, y, 256, 8, 2);
    const tone = 0.8 + Math.abs(Math.sin(row * 5.13)) * 0.3, seam = ly < 2 ? 0.45 : 1, endSeam = ((x + row * 97) % 256) < 2 ? 0.5 : 1;
    const v = (120 + n * 70) * tone * seam * endSeam * (knot > 0.75 ? 0.75 : 1);
    o[0] = v * 1.0; o[1] = v * 0.74; o[2] = v * 0.48;
  }),
  staves: () => pixCanvas(128, (x, y, o) => {
    const sw = 16, lx = x % sw, n = fbm(NZ, x, y, 128, 4, 4, 1, 4), tone = 0.85 + Math.abs(Math.sin(Math.floor(x / sw) * 3.7)) * 0.25;
    const v = (110 + n * 60) * tone * (lx < 1.5 ? 0.5 : 1); o[0] = v; o[1] = v * 0.72; o[2] = v * 0.45;
  }),
  thatch: () => pixCanvas(256, (x, y, o) => {
    const n = fbm(NZ, x, y, 256, 4, 5, 8, 1), rowShade = 1 - ((y % 32) / 32) * 0.35, v = (120 + n * 110) * rowShade;
    o[0] = v * 0.95; o[1] = v * 0.8; o[2] = v * 0.45;
  }),
  rooftiles: () => pixCanvas(256, (x, y, o) => {
    const th = 32, tw = 32, row = Math.floor(y / th), off = (row % 2) * 16, lx = ((x + off) % tw) - tw / 2, ly = y % th;
    const curve = Math.sqrt(Math.max(0, 1 - (lx / (tw / 2)) ** 2)), n = fbm(NZ, x, y, 256, 16, 3), shadow = ly > th - 5 ? 0.55 : 1;
    const v = (0.65 + curve * 0.4) * shadow * (0.85 + n * 0.3);
    o[0] = 168 * v; o[1] = 82 * v; o[2] = 55 * v;
  }),
  tudor: () => { // plaster with oak timber framing; tile = 3m
    const c = pixCanvas(256, (x, y, o) => { const n = fbm(NZ, x, y, 256, 8, 4); const v = 205 + n * 40; o[0] = v; o[1] = v * 0.95; o[2] = v * 0.84; });
    const g = c.getContext('2d'); g.lineCap = 'butt';
    const beam = (x0, y0, x1, y1, w) => { g.strokeStyle = '#4a3020'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.stroke(); };
    beam(0, 0, 0, 256, 22); beam(256, 0, 256, 256, 22); beam(128, 0, 128, 256, 16); beam(0, 128, 256, 128, 14); beam(0, 0, 256, 0, 16); beam(0, 256, 256, 256, 16);
    beam(10, 125, 122, 8, 12); beam(246, 125, 134, 8, 12);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(60,40,20,${Math.random() * 0.06})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    return c;
  },
  hay: () => pixCanvas(128, (x, y, o) => { const n = fbm(NZ, x, y, 128, 4, 5, 6, 1), v = 150 + n * 100; o[0] = v; o[1] = v * 0.82; o[2] = v * 0.4; }),
  water: () => pixCanvas(256, (x, y, o) => {
    const r = 1 - Math.abs(fbm(NZ, x, y, 256, 4, 4) * 2 - 1), c = Math.pow(r, 6);
    o[0] = 60 + c * 150; o[1] = 90 + c * 150; o[2] = 95 + c * 140;
  }),
  leaves: () => pixCanvas(128, (x, y, o) => { const n = fbm(NZ, x, y, 128, 16, 3), v = 0.6 + n * 0.6; o[0] = 200 * v; o[1] = 220 * v; o[2] = 190 * v; }),
  mushcap: () => { const c = pixCanvas(128, (x, y, o) => { const n = fbm(NZ, x, y, 128, 8, 3); o[0] = 190 + n * 40; o[1] = 40 + n * 20; o[2] = 30; });
    const g = c.getContext('2d'); g.fillStyle = '#f4efe2';
    for (let i = 0; i < 14; i++) { const x = Math.random() * 128, y = Math.random() * 70, r = 4 + Math.random() * 7; for (const dx of [-128, 0, 128]) { g.beginPath(); g.ellipse(x + dx, y, r, r * 0.8, 0, 0, 7); g.fill(); } }
    return c; },
  stripes: () => pixCanvas(128, (x, y, o) => { const s = Math.floor(x / 16) % 2, n = fbm(NZ, x, y, 128, 8, 3), v = (s ? 235 : 160) * (0.9 + n * 0.15); o[0] = v; o[1] = v; o[2] = v; }),
  grassBlade: () => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    for (let i = 0; i < 26; i++) { const x = 8 + Math.random() * 112, h = 50 + Math.random() * 75, lean = (Math.random() - 0.5) * 30, w = 2.5 + Math.random() * 3, t = Math.random();
      g.fillStyle = `rgb(${70 + t * 50 | 0},${105 + t * 60 | 0},${35 + t * 25 | 0})`; g.beginPath(); g.moveTo(x - w, 128); g.quadraticCurveTo(x + lean * 0.4, 128 - h * 0.6, x + lean, 128 - h); g.quadraticCurveTo(x + lean * 0.4 + w * 0.5, 128 - h * 0.6, x + w, 128); g.fill(); }
    return c; },
  cloud: () => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    for (let i = 0; i < 26; i++) { const x = 40 + Math.random() * 176, y = 50 + Math.random() * 40, r = 18 + Math.random() * 34; const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); }
    return c; },
};
const TEXC = {};
function getTex(name) {
  if (TEXC[name]) return TEXC[name];
  if (TEX[name]) return TEX[name];
  const f = TEXF[name]; if (!f) return null;
  const c = f(); const noRepeat = name === 'grassBlade' || name === 'cloud';
  return (TEXC[name] = canvasTex(c, !noRepeat));
}
// material definitions shared by level boxes and props: t=texture, s=world metres per tile, c=tint, e=emissive colour
const MATDEF = {
  cliff: { t: 'cliff', s: 6 }, castle: { t: 'castle', s: 3 }, stone: { t: 'castle', c: 0xd8d2c4, s: 2 }, stonewall: { t: 'brick', c: 0xb8b0a0, s: 2 },
  planks: { t: 'planks', s: 2 }, crate: { t: 'wood', local: true }, bark: { t: 'bark', s: 2 }, logwall: { t: 'bark', s: 1.2 }, hutwall: { t: 'brick', c: 0xa88a68, s: 2 },
  tudor: { t: 'tudor', s: 3 }, tudor2: { t: 'tudor', c: 0xf2dcc0, s: 3 }, roof: { t: 'castle', c: 0x8f8476, s: 3 }, hay: { t: 'hay', s: 1.2 }, cloth: { t: 'stripes', s: 1.3 },
  rope: { c: 0x8a7350 }, thatch: { t: 'thatch', s: 2 }, tiles: { t: 'rooftiles', s: 2 }, slate: { t: 'rooftiles', c: 0x6a7a9a, s: 2 }, flag: { t: 'flagstone', s: 4 },
  pad: { e: 0x6dff9a }, rune: { e: 0x6fd8ff }, glass: { e: 0xffc870 }, lampglow: { e: 0xffd890 }, dark: { c: 0x1a1714 },
  leaf: { t: 'leaves', vc: true }, rock: { t: 'cliff', s: 2 }, mushcap: { t: 'mushcap' }, stem: { c: 0xe8dcc0 }, reed: { c: 0x8a9a5a }, metal: { c: 0x3a3a40 },
  wood: { t: 'planks', s: 1 }, banner: { t: 'stripes' }, staves: { t: 'staves' }, mountain: { c: 0xffffff, fogless: true }, snow: { c: 0xf4f6fa, fogless: true },
  gold: { c: 0xc9a227 }, red: { c: 0x9a2a2a }, white: { c: 0xf0ece4 },
};
function matFor(key, theme) {
  const def = Object.assign({}, MATDEF[key] || {}, (theme.mats || {})[key] || {});
  if (def.e !== undefined) return { def, mat: new THREE.MeshBasicMaterial({ color: def.e, vertexColors: true }) };
  const map = def.t ? getTex(def.t) : null;
  const mat = new THREE.MeshLambertMaterial({ map, color: def.c !== undefined ? def.c : 0xffffff, vertexColors: true, fog: !def.fogless });
  if (map && def.t !== 'leaves' && def.t !== 'mushcap' && settings.quality !== 'low' && def.bump !== 0) { mat.bumpMap = map; mat.bumpScale = def.bump !== undefined ? def.bump : 2.2; }
  return { def, mat };
}

// ============================================================ PROPS (baked into a few merged meshes per map)
const WHITE = new THREE.Color(1, 1, 1);
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));
const PG = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10), cyl8: new THREE.CylinderGeometry(1, 1, 1, 8), cylT: new THREE.CylinderGeometry(0.7, 1, 1, 9),
  cone: new THREE.ConeGeometry(1, 1, 9), cone6: new THREE.ConeGeometry(1, 1, 6), blob: new THREE.IcosahedronGeometry(1, 1), blob0: new THREE.IcosahedronGeometry(1, 0),
  box: new THREE.BoxGeometry(1, 1, 1), half: new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), sph: new THREE.SphereGeometry(1, 10, 8),
  plane: new THREE.PlaneGeometry(1, 1),
};
const ROCKS = [0, 1, 2].map(() => { const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.75 + Math.random() * 0.45; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); return g; });
function gableGeo(w, d, h, oh = 0.35) { // ridge along x; w = length along x, d = depth along z
  const x0 = -w / 2 - oh, x1 = w / 2 + oh, z0 = -d / 2 - oh, z1 = d / 2 + oh, sl = Math.hypot(d / 2 + oh, h);
  const P = [], U = [];
  const quad = (a, b, c, e, ua) => { P.push(...a, ...b, ...c, ...a, ...c, ...e); U.push(...ua[0], ...ua[1], ...ua[2], ...ua[0], ...ua[2], ...ua[3]); };
  quad([x0, 0, z1], [x1, 0, z1], [x1, h, 0], [x0, h, 0], [[0, 0], [w / 2, 0], [w / 2, sl / 2], [0, sl / 2]]);
  quad([x1, 0, z0], [x0, 0, z0], [x0, h, 0], [x1, h, 0], [[0, 0], [w / 2, 0], [w / 2, sl / 2], [0, sl / 2]]);
  P.push(x0 + oh, 0, z0 + oh, x0 + oh, 0, z1 - oh, x0 + oh, h * (d / 2) / (d / 2 + oh), 0); U.push(0, 0, d / 3, 0, d / 6, h / 3);
  P.push(x1 - oh, 0, z1 - oh, x1 - oh, 0, z0 + oh, x1 - oh, h * (d / 2) / (d / 2 + oh), 0); U.push(0, 0, d / 3, 0, d / 6, h / 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.computeVertexNormals(); return g;
}
const tint = (hex, v = 0.12) => { const c = new THREE.Color(hex); const k = 1 + (Math.random() - 0.5) * 2 * v; return c.multiplyScalar(k); };
// Each template returns parts: [material key, geometry, local matrix, colour]
const PROPT = {
  pine: p => { const h = rand(0.9, 1.15); const out = [['bark', PG.cylT, M4(0, 1.6 * h, 0, 0, 0, 0, 0.22, 3.2 * h, 0.22)]];
    const lc = tint(p.leaf || 0x2f5233, 0.15);
    [[1.7, 2.6, 2.4], [1.4, 2.3, 3.5], [1.05, 2.0, 4.5], [0.65, 1.7, 5.4]].forEach(([r, hh, y]) => out.push(['leaf', PG.cone, M4(0, y * h, 0, 0, Math.random() * 3, 0, r, hh, r), lc]));
    return out; },
  oak: p => { const out = [['bark', PG.cylT, M4(0, 1.6, 0, 0, 0, 0, 0.3, 3.2, 0.3)], ['bark', PG.cylT, M4(0.5, 2.9, 0, 0, 0, -0.8, 0.12, 1.4, 0.12)], ['bark', PG.cylT, M4(-0.4, 3.0, 0.2, 0.3, 0, 0.7, 0.12, 1.3, 0.12)]];
    const lc = tint(p.leaf || 0x4a7a35, 0.12);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + rand(-0.4, 0.4), r = i ? rand(0.9, 1.5) : 0, s = rand(1.2, 1.7); out.push(['leaf', PG.blob, M4(Math.cos(a) * r, 4.1 + rand(-0.4, 0.6), Math.sin(a) * r, 0, rand(0, 3), 0, s, s * 0.85, s), tint(lc, 0.08)]); }
    return out; },
  bigtree: p => { const out = [['bark', PG.cylT, M4(0, 4.5, 0, 0, 0, 0, 0.75, 9, 0.75)]];
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; out.push(['bark', PG.cone, M4(Math.cos(a) * 0.7, 0.35, Math.sin(a) * 0.7, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5, 0.35, 1.2, 0.35)]); }
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + rand(0, 1); out.push(['bark', PG.cylT, M4(Math.cos(a) * 1.3, 8.2, Math.sin(a) * 1.3, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9, 0.22, 3, 0.22)]); }
    const lc = tint(p.leaf || 0x55703a, 0.1);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + rand(-0.3, 0.3), r = i ? rand(1.6, 2.6) : 0, s = rand(2, 2.8); out.push(['leaf', PG.blob, M4(Math.cos(a) * r, 10.5 + rand(-0.8, 1), Math.sin(a) * r, 0, rand(0, 3), 0, s, s * 0.75, s), tint(lc, 0.1)]); }
    return out; },
  deadtree: () => { const out = [['bark', PG.cylT, M4(0, 2, 0, rand(-0.1, 0.1), 0, rand(-0.1, 0.1), 0.25, 4, 0.25), tint(0x9a8a7a)]];
    for (let i = 0; i < 4; i++) { const a = rand(0, 6.28), y = rand(2, 3.6); out.push(['bark', PG.cylT, M4(Math.cos(a) * 0.5, y + 0.4, Math.sin(a) * 0.5, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9, 0.08, rand(1, 1.8), 0.08), tint(0x9a8a7a)]); }
    return out; },
  bush: p => { const out = [], lc = tint(p.leaf || 0x3f6a2f, 0.15); for (let i = 0; i < 3; i++) { const s = rand(0.45, 0.8); out.push(['leaf', PG.blob, M4(rand(-0.5, 0.5), s * 0.6, rand(-0.5, 0.5), 0, rand(0, 3), 0, s, s * 0.8, s), tint(lc, 0.08)]); } return out; },
  rock: p => [['rock', pick(ROCKS), M4(0, (p.sy || 0.6) * 0.35, 0, rand(0, 3), rand(0, 3), 0, 1, p.sy || 0.6, 1), tint(p.c || 0xa09a90, 0.1)]],
  mushrooms: () => { const out = []; for (let i = 0; i < 3; i++) { const x = rand(-0.4, 0.4), z = rand(-0.4, 0.4), s = rand(0.6, 1.3); out.push(['stem', PG.cyl, M4(x, 0.15 * s, z, 0, 0, 0, 0.05 * s, 0.3 * s, 0.05 * s)], ['mushcap', PG.half, M4(x, 0.28 * s, z, 0, rand(0, 3), 0, 0.2 * s, 0.14 * s, 0.2 * s)]); } return out; },
  bigmush: () => [['stem', PG.cyl, M4(0, -0.05, 0, 0, 0, 0, 0.35, 0.3, 0.35)], ['mushcap', PG.half, M4(0, 0.02, 0, 0, rand(0, 3), 0, 1.15, 0.3, 1.15)]],
  reeds: () => { const out = []; for (let i = 0; i < 7; i++) { const x = rand(-0.5, 0.5), z = rand(-0.5, 0.5), h = rand(1.0, 1.8), rx = rand(-0.12, 0.12), rz = rand(-0.12, 0.12);
    out.push(['reed', PG.cyl8, M4(x, h / 2, z, rx, 0, rz, 0.015, h, 0.015), tint(0x8a9a5a)]); if (i % 2) out.push(['bark', PG.cyl8, M4(x + rz * -h * 0.5, h * 0.95, z + rx * h * 0.5, rx, 0, rz, 0.035, 0.22, 0.035), tint(0x5a3a22)]); } return out; },
  lantern: p => [['bark', PG.cyl8, M4(0, 1.3, 0, 0, 0, 0, 0.06, 2.6, 0.06)], ['metal', PG.box, M4(0.22, 2.45, 0, 0, 0, 0, 0.5, 0.05, 0.05)], ['metal', PG.box, M4(0.42, 2.25, 0, 0, 0, 0, 0.2, 0.04, 0.2)],
    ['lampglow', PG.box, M4(0.42, 2.1, 0, 0, 0, 0, 0.15, 0.25, 0.15)], ['metal', PG.cone6, M4(0.42, 1.94, 0, Math.PI, 0, 0, 0.1, 0.08, 0.1)]],
  torch: () => [['metal', PG.box, M4(0, 0, 0, 0, 0, 0, 0.08, 0.08, 0.2)], ['wood', PG.cylT, M4(0, 0.15, 0.08, 0.25, 0, 0, 0.035, 0.45, 0.035)], ['metal', PG.cylT, M4(0, 0.38, 0.13, 0.25, 0, 0, 0.07, 0.1, 0.07)]],
  brazier: () => [['metal', PG.cylT, M4(0, 0.25, 0, Math.PI, 0, 0, 0.45, 0.4, 0.45)], ['metal', PG.cyl8, M4(0, -0.1, 0, 0, 0, 0, 0.08, 0.4, 0.08)], ['dark', PG.cyl, M4(0, 0.42, 0, 0, 0, 0, 0.38, 0.06, 0.38)]],
  log: p => { const out = [['bark', PG.cyl, p.axis === 'x' ? M4(0, p.r, 0, 0, 0, Math.PI / 2, p.r, p.len, p.r) : M4(0, p.r, 0, Math.PI / 2, 0, 0, p.r, p.len, p.r), tint(0x9a8060, 0.1)]];
    for (let i = 0; i < 4; i++) { const t = rand(-0.4, 0.4) * p.len, s = rand(0.35, 0.6); out.push(['leaf', PG.blob, p.axis === 'x' ? M4(t, p.r * 1.85, rand(-0.3, 0.3), 0, 0, 0, s * 1.3, s * 0.35, s) : M4(rand(-0.3, 0.3), p.r * 1.85, t, 0, 0, 0, s, s * 0.35, s * 1.3), tint(0x3f6a2a, 0.15)]); }
    return out; },
  wheel: p => { const out = [['planks', PG.cyl8, M4(0, 0, 0, 0, 0, Math.PI / 2, p.r, p.h, p.r)]]; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; out.push(['planks', PG.box, M4(0, Math.sin(a) * p.r, Math.cos(a) * p.r, a, 0, 0, p.h * 1.4, 0.5, 0.08)]); } return out.map(o => (o[2] = new THREE.Matrix4().makeTranslation(0, 2, 0).multiply(o[2]), o)); },
  octo: p => [[p.mat, PG.cyl8, M4(0, p.h / 2, 0, 0, Math.PI / 8, 0, p.r, p.h, p.r)]],
  gable: p => [[p.mat, gableGeo(p.w, p.d, p.h, p.oh), new THREE.Matrix4().makeRotationY(p.axis === 'z' ? Math.PI / 2 : 0)]],
  coneroof: p => [[p.mat, PG.cone, M4(0, p.h / 2, 0, 0, Math.PI / 8, 0, p.r, p.h, p.r)]],
  chimney: p => [['stonewall', PG.box, M4(0, (p.h || 1.6) / 2, 0, 0, 0, 0, 0.6, p.h || 1.6, 0.6)], ['dark', PG.box, M4(0, (p.h || 1.6) + 0.02, 0, 0, 0, 0, 0.4, 0.05, 0.4)]],
  tower: p => { const out = [['castle', PG.cyl, M4(0, p.h / 2, 0, 0, 0, 0, p.r, p.h, p.r)], [p.roof || 'slate', PG.cone, M4(0, p.h + p.r * 1.1, 0, 0, 0, 0, p.r * 1.25, p.r * 2.2, p.r * 1.25)]];
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; out.push(['glass', PG.box, M4(Math.cos(a) * p.r * 0.98, p.h * 0.7, Math.sin(a) * p.r * 0.98, 0, -a, 0, 0.12, 0.7, 0.35)]); }
    return out; },
  house: p => { const out = [[p.wall || 'tudor', PG.box, M4(0, p.h / 2, 0, 0, 0, 0, p.w, p.h, p.d)], [p.roof || 'tiles', gableGeo(p.w, p.d, p.rh || p.d * 0.55, 0.4), M4(0, p.h, 0)]];
    out.push(['chimney_', null]); // placeholder removed below
    for (let i = 0; i < 2; i++) out.push(['glass', PG.box, M4((i - 0.5) * p.w * 0.45, p.h * 0.55, p.d / 2 + 0.01, 0, 0, 0, 0.6, 0.8, 0.02)]);
    out.push(['stonewall', PG.box, M4(p.w * 0.3, p.h + (p.rh || p.d * 0.55) * 0.6, 0, 0, 0, 0, 0.6, (p.rh || p.d * 0.55) * 1.4, 0.6)]);
    return out.filter(x => x[1]); },
  mountain: p => { const c = new THREE.Color(p.c); return [['mountain', PG.cone6, M4(0, p.h / 2, 0, 0, rand(0, 3), 0, p.r, p.h, p.r), c]].concat(p.snow ? [['snow', PG.cone6, M4(0, p.h * 0.83, 0, 0, rand(0, 3), 0, p.r * 0.34, p.h * 0.34, p.r * 0.34)]] : []); },
  banner: p => [['metal', PG.cyl8, M4(0, 0, 0, 0, 0, Math.PI / 2, 0.03, 1.1, 0.03)], ['banner', PG.box, M4(0, -1.0, 0, 0, 0, 0, 0.9, 2, 0.02), new THREE.Color(p.c || 0x9a2a2a)], ['gold', PG.box, M4(0, -1.0, 0.012, 0, 0, Math.PI / 4, 0.32, 0.32, 0.01)]],
  fence: p => { const out = []; const n = Math.max(1, Math.round(p.len / 1.6)); for (let i = 0; i <= n; i++) out.push(['wood', PG.box, M4(-p.len / 2 + i * p.len / n, 0.5, 0, 0, 0, 0, 0.1, 1, 0.1)]);
    out.push(['wood', PG.box, M4(0, 0.75, 0, 0, 0, 0, p.len, 0.08, 0.04)], ['wood', PG.box, M4(0, 0.4, 0, 0, 0, 0, p.len, 0.08, 0.04)]); return out; },
  cart: () => [['wood', PG.box, M4(0, 0.75, 0, 0, 0, 0, 1.4, 0.15, 2.4)], ['wood', PG.box, M4(0.68, 1.0, 0, 0, 0, 0, 0.06, 0.4, 2.4)], ['wood', PG.box, M4(-0.68, 1.0, 0, 0, 0, 0, 0.06, 0.4, 2.4)],
    ['wood', PG.cyl, M4(0.78, 0.45, 0.6, 0, 0, Math.PI / 2, 0.45, 0.08, 0.45)], ['wood', PG.cyl, M4(-0.78, 0.45, 0.6, 0, 0, Math.PI / 2, 0.45, 0.08, 0.45)], ['wood', PG.box, M4(0, 0.6, -1.6, 0, 0, 0, 0.08, 0.08, 1.2)],
    ['hay', PG.blob, M4(0, 1.05, 0.2, 0, 0, 0, 0.55, 0.3, 0.9)]],
  keg: () => [['staves', PG.cylT, M4(0, 0.45, 0, 0, 0, 0, 0.33, 0.9, 0.33)], ['metal', PG.cyl, M4(0, 0.2, 0, 0, 0, 0, 0.32, 0.04, 0.32)], ['metal', PG.cyl, M4(0, 0.75, 0, 0, 0, 0, 0.3, 0.04, 0.3)]],
  well: () => [['stonewall', PG.cyl, M4(0, 0.45, 0, 0, 0, 0, 0.9, 0.9, 0.9)], ['dark', PG.cyl, M4(0, 0.91, 0, 0, 0, 0, 0.75, 0.02, 0.75)], ['wood', PG.box, M4(0.8, 1.4, 0, 0, 0, 0, 0.1, 1.9, 0.1)], ['wood', PG.box, M4(-0.8, 1.4, 0, 0, 0, 0, 0.1, 1.9, 0.1)], ['thatch', gableGeo(1.9, 1.4, 0.6, 0.15), M4(0, 2.3, 0, 0, Math.PI / 2, 0)]],
  statue: () => [['stone', PG.box, M4(0, 0.5, 0, 0, 0, 0, 1, 1, 1)], ['stone', PG.cylT, M4(0, 1.5, 0, 0, 0, 0, 0.28, 1.1, 0.28)], ['stone', PG.sph, M4(0, 2.25, 0, 0, 0, 0, 0.2, 0.22, 0.2)], ['stone', PG.cyl8, M4(0.28, 2.0, 0, 0, 0, -0.6, 0.06, 0.7, 0.06)], ['gold', PG.sph, M4(0.5, 2.35, 0, 0, 0, 0, 0.09, 0.09, 0.09)]],
};
function buildScenery(L, th, group) {
  const parts = {};
  const push = (mk, geo, m, c) => (parts[mk] || (parts[mk] = [])).push({ g: geo, m, c: c || WHITE });
  const low = settings.quality === 'low';
  for (const p of L.props) {
    const f = PROPT[p.k]; if (!f) continue;
    if (low && p.bg && Math.random() < 0.6) continue; // thin out background forest on weak machines
    const base = M4(p.x, p.y, p.z, 0, p.ry || 0, 0, p.s || 1, p.s || 1, p.s || 1);
    for (const [mk, geo, local, c] of f(p)) push(mk, geo, base.clone().multiply(local), c);
  }
  // grass tufts + flowers
  const q = { low: 0, medium: 0.32, high: 0.75 }[settings.quality] * (L.grass || 0);
  if (q > 0) {
    const [x0, z0, x1, z1] = L.bounds, n = Math.round((x1 - x0) * (z1 - z0) * q);
    const inWater = (x, z) => L.water.some(w => x > w[0] && x < w[2] && z > w[1] && z < w[3]);
    for (let i = 0; i < n; i++) {
      const x = rand(x0 + 0.6, x1 - 0.6), z = rand(z0 + 0.6, z1 - 0.6);
      if (!world.nav.free(x, z) && Math.random() < 0.85) continue; if (inWater(x, z)) continue;
      const s = rand(0.45, 0.9), a = rand(0, 3.14), c = tint(L.grassTint || 0xffffff, 0.12);
      push('grassBlade', PG.plane, M4(x, s * 0.42, z, 0, a, 0, s * 1.1, s * 0.85, 1), c);
      push('grassBlade', PG.plane, M4(x, s * 0.42, z, 0, a + 1.57, 0, s * 1.1, s * 0.85, 1), c);
      if (Math.random() < 0.06 * (L.flowers || 1)) push('flower', PG.blob0, M4(x + 0.1, s * 0.7, z, 0, 0, 0, 0.05, 0.04, 0.05), new THREE.Color(pick([0xffe14d, 0xffffff, 0xd85ad8, 0xff6a5a, 0x7ab8ff])));
    }
  }
  for (const mk in parts) {
    const list = parts[mk]; let n = 0;
    const geos = list.map(it => { const g = it.g.index ? it.g.toNonIndexed() : it.g; n += g.attributes.position.count; return g; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
    const v = new V3(), nm = new THREE.Matrix3(); let o = 0;
    list.forEach((it, k) => {
      const g = geos[k], P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; nm.getNormalMatrix(it.m);
      for (let i = 0; i < P.count; i++, o++) {
        v.fromBufferAttribute(P, i).applyMatrix4(it.m); pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
        if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z; }
        if (U) { uv[o * 2] = U.getX(i); uv[o * 2 + 1] = U.getY(i); }
        col[o * 3] = it.c.r; col[o * 3 + 1] = it.c.g; col[o * 3 + 2] = it.c.b;
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    let mat;
    if (mk === 'grassBlade') {
      mat = new THREE.MeshLambertMaterial({ map: getTex('grassBlade'), alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true });
      // gentle wind sway in the vertex shader (top of each blade only)
      mat.onBeforeCompile = sh => { sh.uniforms.uTime = windU; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat sway = uv.y * 0.12; transformed.x += sin(uTime * 1.7 + position.x * 0.4 + position.z * 0.3) * sway; transformed.z += cos(uTime * 1.3 + position.z * 0.5) * sway * 0.6;'); };
      geo.computeVertexNormals(); for (let i = 0; i < nor.length; i += 3) { nor[i] = 0; nor[i + 1] = 1; nor[i + 2] = 0; } // grass lit like the ground
    } else if (mk === 'flower') mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    else mat = matFor(mk, th).mat;
    if (mk === 'leaf' && mat.map) { mat.map = mat.map.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(2, 2); }
    if (mk === 'mountain' || mk === 'snow') mat.vertexColors = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !['grassBlade', 'flower', 'mountain', 'snow', 'glass', 'lampglow'].includes(mk); mesh.receiveShadow = !['mountain', 'snow'].includes(mk);
    if (mk === 'mountain' || mk === 'snow') mesh.renderOrder = -2;
    group.add(mesh);
  }
}
const windU = { value: 0 };
// ground, water, glows, fireflies, clouds
function buildEnvironment(L, th, group, anim) {
  const [x0, z0, x1, z1] = L.bounds;
  // detailed play-area ground with vertex-colour variation + soft darkening near walls
  const W = x1 - x0 + 8, D = z1 - z0 + 8, seg = L.big ? 128 : 64, gg = new THREE.PlaneGeometry(W, D, seg, seg); gg.rotateX(-Math.PI / 2); gg.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const P = gg.attributes.position, uv = gg.attributes.uv, col = new Float32Array(P.count * 3), s = L.groundScale || 4;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i); uv.setXY(i, x / s, -z / s); if (L.groundY) P.setY(i, L.groundY(x, z));
    const n = 0.86 + NZ(x * 0.08 + 50, z * 0.08 + 50, 256) * 0.28; let ao = 1;
    const dw = Math.min(x - x0, x1 - x, z - z0, z1 - z); if (dw < 2.5) ao = 0.65 + 0.35 * (dw / 2.5);
    const c = new THREE.Color(L.groundTint || 0xffffff); col[i * 3] = c.r * n * ao; col[i * 3 + 1] = c.g * n * ao; col[i * 3 + 2] = c.b * n * ao;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); if (L.groundY) gg.computeVertexNormals();
  const gm = matFor('ground_', { mats: { ground_: { t: L.ground, s: 1, bump: 0 } } }).mat;
  if (gm.map) { gm.map.anisotropy = Math.min(4, maxAniso); }
  const ground = new THREE.Mesh(gg, gm); ground.receiveShadow = true; group.add(ground);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: th.farGround || 0x4a5a3a }));
  far.position.y = -0.05; group.add(far);
  // water
  if (L.water.length) {
    const wt = getTex('water').clone(); wt.needsUpdate = true; wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
    const pos = [], uvs = [];
    for (const [a, b, c, d, y = 0.03] of L.water) { pos.push(a, y, b, a, y, d, c, y, d, a, y, b, c, y, d, c, y, b); uvs.push(a / 4, b / 4, a / 4, d / 4, c / 4, d / 4, a / 4, b / 4, c / 4, d / 4, c / 4, b / 4); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); wg.computeVertexNormals();
    const wm = new THREE.MeshLambertMaterial({ map: wt, color: th.water || 0x6a8a70, transparent: true, opacity: 0.88, emissive: new THREE.Color(th.water || 0x6a8a70).multiplyScalar(0.18) });
    const wmesh = new THREE.Mesh(wg, wm); wmesh.receiveShadow = true; group.add(wmesh); anim.water = wt;
  }
  // warm glows (lanterns, torches, windows) as one additive point cloud
  if (L.glows.length) {
    const n = L.glows.length, gp = new Float32Array(n * 3), gc = new Float32Array(n * 3);
    L.glows.forEach((g, i) => { gp.set([g[0], g[1], g[2]], i * 3); const c = new THREE.Color(g[3] || 0xffa040); gc.set([c.r, c.g, c.b], i * 3); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(gp, 3)); geo.setAttribute('color', new THREE.BufferAttribute(gc, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.1, map: TEX.dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    group.add(pts); anim.glow = { geo, base: gc.slice(), sizes: L.glows.map(g => g[4] || 1) };
    // flames: small bright cores
    const fl = L.glows.filter(g => g[5]); if (fl.length) {
      const fp = new Float32Array(fl.length * 3); fl.forEach((g, i) => fp.set([g[0], g[1], g[2]], i * 3));
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
      const fpts = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.45, map: getTex('flame_') || TEX.flash, color: 0xffd080, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      group.add(fpts); anim.flames = fpts;
    }
    if (settings.quality === 'high') { // a few real lights for the brightest fires
      L.glows.filter(g => g[5] && g[4] >= 1.5).slice(0, 4).forEach(g => { const l = new THREE.PointLight(g[3] || 0xff9040, 18, 12, 2); l.position.set(g[0], g[1] + 0.3, g[2]); group.add(l); });
    }
  }
  // fireflies / embers
  if (L.fireflies) {
    const n = L.fireflies, fp = new Float32Array(n * 3), seed = [];
    for (let i = 0; i < n; i++) { const x = rand(x0, x1), y = rand(0.4, L.emberRise ? 6 : 3), z = rand(z0, z1); fp.set([x, y, z], i * 3); seed.push([x, y, z, rand(0, 6.28), rand(0.3, 1)]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.12, map: TEX.dot, color: L.fireflyColor || 0xd8ff7a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    group.add(pts); anim.flies = { geo, seed, rise: !!L.emberRise };
  }
  // clouds
  const ct = getTex('cloud');
  for (let i = 0; i < (settings.quality === 'low' ? 0 : th.clouds || 0); i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, color: th.cloudColor || 0xffffff, transparent: true, opacity: rand(0.55, 0.9), depthWrite: false, fog: false }));
    const a = rand(0, 6.28), r = rand(160, 300); sp.position.set(Math.cos(a) * r, rand(60, 120), Math.sin(a) * r); const sc = rand(90, 170); sp.scale.set(sc, sc * 0.45, 1);
    sp.renderOrder = -5; group.add(sp);
  }
}
function updateEnvironment(dt) {
  if (!world || !world.anim) return; const A = world.anim, t = performance.now() / 1000;
  windU.value = t;
  if (A.water) { A.water.offset.x = t * 0.015; A.water.offset.y = t * 0.01; }
  if (A.glow) { const c = A.glow.geo.attributes.color, b = A.glow.base; for (let i = 0; i < c.count; i++) { const f = 0.8 + 0.2 * Math.sin(t * 9 + i * 1.7) * Math.sin(t * 5.3 + i); c.array[i * 3] = b[i * 3] * f; c.array[i * 3 + 1] = b[i * 3 + 1] * f; c.array[i * 3 + 2] = b[i * 3 + 2] * f; } c.needsUpdate = true; }
  if (A.flames) A.flames.material.size = 0.4 + Math.sin(t * 13) * 0.05;
  if (A.flies) { const p = A.flies.geo.attributes.position; A.flies.seed.forEach((s, i) => {
    if (A.flies.rise) { const y = (s[1] + t * s[4] * 0.8) % 7; p.setXYZ(i, s[0] + Math.sin(t * 0.7 + s[3]) * 0.6, y, s[2] + Math.cos(t * 0.6 + s[3]) * 0.6); }
    else p.setXYZ(i, s[0] + Math.sin(t * s[4] + s[3]) * 1.2, s[1] + Math.sin(t * 1.3 * s[4] + s[3] * 2) * 0.4, s[2] + Math.cos(t * 0.8 * s[4] + s[3]) * 1.2); });
    p.needsUpdate = true; A.flies.geo.attributes.position.needsUpdate = true; }
}
function mountains(L, colors, snow) {
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + rand(-0.1, 0.1), r = rand(190, 260), h = rand(35, 85);
    L.props.push({ k: 'mountain', x: Math.cos(a) * r, y: -2, z: Math.sin(a) * r, s: 1, ry: 0, r: rand(45, 80), h, c: pick(colors), snow: snow && h > 60 }); }
}

// ---------------------------------------------------------------- MAP 1: BOGWATER SWAMP
function buildSwamp(L) {
  L.bounds = [-32, -24, 32, 24]; L.ground = 'grassMud'; L.groundScale = 7; L.grass = 1; L.fireflies = 140; L.padStyle = 'mushroom';
  L.box(-34, -1, -26, 34, 0, 26, 'floor').noRender = true;
  // mossy cliffs ring the swamp; a dark pine forest crowns them
  L.box(-33, 0, -25, 33, 9, -24, 'cliff'); L.box(-33, 0, 24, 33, 9, 25, 'cliff'); L.box(-33, 0, -24, -32, 9, 24, 'cliff'); L.box(32, 0, -24, 33, 9, 24, 'cliff');
  for (let x = -36; x <= 36; x += 3.6) for (const z of [-26.5, 26.5, -30, 30, -34, 34]) L.prop('pine', x + rand(-1.4, 1.4), 9, z + rand(-1, 1), rand(1.3, 2), { bg: Math.abs(z) > 27 });
  for (let z = -28; z <= 28; z += 3.6) for (const x of [-34.5, 34.5, -38, 38]) L.prop('pine', x + rand(-1, 1), 9, z + rand(-1.4, 1.4), rand(1.3, 2), { bg: Math.abs(x) > 35 });
  for (let i = 0; i < 40; i++) { const side = randi(0, 3), t = rand(-30, 30); L.prop('rock', side < 2 ? t : (side === 2 ? -31.3 : 31.3), 0, side < 2 ? (side ? 23.3 : -23.3) : t * 0.75, rand(0.6, 1.4), { sy: rand(0.4, 0.8) }); }
  // boardwalks (elevated walkways) over the reed-choked water
  for (const s of [1, -1]) {
    const ez = 19 * s;
    L.box(-28, 3.5, ez, 28, 3.8, 24 * s, 'planks');
    L.box(-28, 4.72, ez - 0.03, 28, 4.78, ez + 0.03, 'rope', { col: false });
    for (let x = -28; x <= 28; x += 4) { L.box(x - 0.07, 3.8, ez - 0.07, x + 0.07, 4.85, ez + 0.07, 'bark', { col: false }); }
    for (let x = -24; x <= 24; x += 8) L.B(x, ez + s * 0.4, 0.4, 0.4, 3.5, 0, 'bark');
    for (const x of [-24, 24]) L.stairs(x, 13 * s, s > 0 ? 'pz' : 'nz', 3, 0, 3.8, 6, 'planks');
    L.B(-10, 21.5 * s, 1.2, 1.2, 1.2, 3.8, 'crate'); L.B(10, 21.5 * s, 3, 0.6, 1.0, 3.8, 'logwall');
    L.water.push([-31.5, Math.min(18.8 * s, 23.8 * s), 31.5, Math.max(18.8 * s, 23.8 * s)]);
    for (let x = -29; x <= 29; x += rand(3, 6)) L.prop('reeds', x, 0, ez + s * rand(0.2, 4), rand(0.8, 1.3));
    for (let x = -20; x <= 20; x += 13) { L.prop('lantern', x, 3.8, ez + s * 0.25, 0.9, { ry: s > 0 ? Math.PI / 2 : -Math.PI / 2 }); L.glow(x, 3.8 + 2.1 * 0.9, ez + s * 0.25 + (s > 0 ? -0.38 : 0.38), 0xffb860, 1.2); }
  }
  // central deck — the ogre's porch
  L.B(0, 0, 12, 10, 1.4, 0, 'planks');
  for (const z of [-5, 5]) L.box(-6.05, 1.32, z - 0.06, 6.05, 1.44, z + 0.06, 'bark', { col: false });
  for (const [x, z] of [[-5.9, -4.9], [5.9, -4.9], [-5.9, 4.9], [5.9, 4.9], [0, -4.9], [0, 4.9]]) L.box(x - 0.12, 0, z - 0.12, x + 0.12, 1.4, z + 0.12, 'bark', { col: false });
  L.stairs(9, 0, 'nx', 4, 0, 1.4, 3, 'planks'); L.stairs(-9, 0, 'px', 4, 0, 1.4, 3, 'planks');
  L.B(0, -2.6, 4, 0.6, 1.0, 1.4, 'logwall'); L.B(0, 2.6, 4, 0.6, 1.0, 1.4, 'logwall');
  L.B(-4.2, -3.6, 1.2, 1.2, 1.2, 1.4, 'crate'); L.B(4.2, 3.6, 1.2, 1.2, 1.2, 1.4, 'crate');
  for (const [x, z] of [[-5.6, -4.6], [5.6, 4.6], [-5.6, 4.6], [5.6, -4.6]]) { L.prop('lantern', x, 1.4, z, 0.8, { ry: Math.atan2(-x, -z) + Math.PI / 2 }); }
  L.glow(-5.6 + 0.34, 1.4 + 1.68, -4.6, 0xffb860, 1.2); L.glow(5.6 - 0.34, 1.4 + 1.68, 4.6, 0xffb860, 1.2);
  L.prop('keg', 2, 1.4, -3.9); L.prop('keg', -2.5, 1.4, 3.8);
  // fallen mossy logs (were shipping containers): you can climb onto them via crates
  const logs = [[-16, -9, 'x'], [-16, 9, 'z'], [16, -9, 'z'], [16, 9, 'x']];
  for (const [x, z, ax] of logs) { const b = ax === 'x' ? L.B(x, z, 6, 2.5, 2.6, 0, 'bark') : L.B(x, z, 2.5, 6, 2.6, 0, 'bark'); b.noRender = true; L.prop('log', x, 0, z, 1, { axis: ax, len: 6.4, r: 1.3, ry: 0 }); }
  L.B(-12.4, -9.6, 1.2, 1.2, 1.2, 0, 'crate'); L.B(-12.4, -8.4, 1.2, 1.2, 1.2, 0, 'crate'); L.B(-12.4, -8.4, 1.2, 1.2, 1.2, 1.2, 'crate');
  L.B(12.4, 9.6, 1.2, 1.2, 1.2, 0, 'crate'); L.B(12.4, 8.4, 1.2, 1.2, 1.2, 0, 'crate'); L.B(12.4, 8.4, 1.2, 1.2, 1.2, 1.2, 'crate');
  // mud-brick hut (west) with thatched roof
  L.B(-25.5, -2, 5, 5, 3.6, 0, 'hutwall');
  L.prop('gable', -25.5, 3.6, -2, 1, { w: 5, d: 5, h: 2.4, oh: 0.5, axis: 'z', mat: 'thatch' });
  L.prop('chimney', -24.3, 4.2, -3.2, 1, { h: 2.2 });
  L.box(-23.02, 0, -2.6, -22.98, 2.2, -1.4, 'planks', { col: false }); L.box(-23.02, 1.6, -0.6, -22.98, 2.4, 0.4, 'glass', { col: false }); L.glow(-22.7, 2.0, -0.1, 0xffa850, 1.6);
  // hollow-stump house (east)
  L.octo(25.5, 2, 2.5, 5.2, 'bark'); L.prop('coneroof', 25.5, 5.2, 2, 1, { r: 3.3, h: 2.6, mat: 'thatch' });
  L.box(22.97, 0, 1.4, 23.02, 2.3, 2.6, 'planks', { col: false }); L.box(23.0, 2.8, 3.0, 23.05, 3.6, 3.8, 'glass', { col: false }); L.glow(22.7, 3.2, 3.4, 0xffa850, 1.6);
  // great swamp trees (collision trunks were the pillars)
  for (const [x, z] of [[-10, 6], [10, -6], [-10, -6], [10, 6]]) { L.B(x, z, 1.2, 1.2, 9, 0, 'bark').noRender = true; L.prop('bigtree', x, 0, z, 1); }
  for (const [x, z] of [[-29.5, -13], [29.5, 13]]) { L.B(x, z, 0.6, 0.6, 5, 0, 'bark').noRender = true; L.prop('deadtree', x, 0, z, 1.2); }
  // crate stacks & log barricades
  for (const [x, z, st] of [[-6, 14, 1], [-4.8, 14.2, 0], [6, -14, 1], [4.8, -14.2, 0], [-28, 12, 1], [28, -12, 1], [-10, -16, 0], [10, 16, 0], [-21, 16, 0], [21, -16, 0]]) {
    L.B(x, z, 1.2, 1.2, 1.2, 0, 'crate'); if (st) L.B(x + 0.1, z - 0.1, 1.2, 1.2, 1.2, 1.2, 'crate');
  }
  L.B(0, -14, 5, 0.6, 1.1, 0, 'logwall'); L.B(0, 14, 5, 0.6, 1.1, 0, 'logwall'); L.B(-20, 0, 0.6, 4, 1.1, 0, 'logwall'); L.B(20, 0, 0.6, 4, 1.1, 0, 'logwall');
  // ponds, reeds, mushrooms, bushes
  L.water.push([-22, -16, -16, -12.5], [17, 12.5, 22, 16]);
  for (const [x, z] of [[-22.5, -14], [-15.5, -12], [22.5, 14], [16.5, 12]]) L.prop('reeds', x, 0, z, 1);
  for (let i = 0; i < 26; i++) { const x = rand(-30, 30), z = rand(-17, 17); if (Math.abs(x) < 8 && Math.abs(z) < 7) continue; L.prop('mushrooms', x, 0, z, rand(0.8, 1.4)); }
  for (let i = 0; i < 22; i++) { const side = randi(0, 3), t = rand(-28, 28); L.prop('bush', side < 2 ? t : (side === 2 ? -31 : 31), 0, side < 2 ? (side ? 17.5 : -17.5) * 0 + (side ? 23 : -23) : t * 0.6, rand(0.8, 1.4)); }
  L.prop('cart', -7, 0, -19.5, 1, { ry: 0.3 }); L.B(-7, -19.5, 1.6, 2.6, 1.2, 0, 'wood').noRender = true;
  L.pad(12, 15, 0, 14, 0, 6); L.pad(-12, -15, 0, 14, 0, -6);
  mountains(L, [0x5d7287, 0x6a7f92, 0x52677a], false);
  L.spawn = { x: 0, y: 1.4, z: 0, yaw: 0 };
  L.enemySpawns = [[-29, -21], [29, 21], [-29, 21], [29, -21], [-29, 8], [29, -8], [0, -21], [0, 21], [-14, -21], [14, 21]];
  L.pickups = [['health', -20, 0, 3], ['health', 20, 0, -3], ['ammo', 0, 3.8, 21.5], ['ammo', 0, 3.8, -21.5], ['ammo', -16, 2.6, -9], ['health', 16, 2.6, 9]];
  L.barrels = [[-8, -10], [8, 10], [-27, 15], [27, -15], [-3, -20], [3, 20], [-22, -6], [22, 6]];
}

// ---------------------------------------------------------------- MAP 2: KINGDOM MARKET
function buildKingdom(L) {
  L.bounds = [-36, -36, 36, 36]; L.ground = 'cobble'; L.groundScale = 3.5; L.grass = 0.18; L.flowers = 2; L.padStyle = 'rune';
  L.box(-40, -1, -40, 40, 0, 40, 'floor').noRender = true;
  // town walls with crenellations and corner towers
  L.box(-37, 0, -37, 37, 7, -36, 'castle'); L.box(-37, 0, 36, 37, 7, 37, 'castle'); L.box(-37, 0, -36, -36, 7, 36, 'castle'); L.box(36, 0, -36, 37, 7, 36, 'castle');
  for (let t = -36.5; t <= 36.5; t += 2) { L.box(t - 0.45, 7, -37, t + 0.45, 7.9, -36, 'castle', { col: false }); L.box(t - 0.45, 7, 36, t + 0.45, 7.9, 37, 'castle', { col: false }); L.box(-37, 7, t - 0.45, -36, 7.9, t + 0.45, 'castle', { col: false }); L.box(36, 7, t - 0.45, 37, 7.9, t + 0.45, 'castle', { col: false }); }
  for (const [x, z] of [[-37, -37], [37, -37], [-37, 37], [37, 37], [0, -37.5], [0, 37.5]]) L.prop('tower', x, 0, z, 1, { r: 3.2, h: 12 });
  // town beyond the walls (skyline)
  for (let i = 0; i < 34; i++) {
    const side = i % 4, t = rand(-50, 50), d = rand(41, 62);
    const x = side === 0 ? t : side === 1 ? t : side === 2 ? -d : d, z = side === 0 ? -d : side === 1 ? d : t;
    L.prop('house', x, 0, z, 1, { w: rand(6, 10), d: rand(5, 7), h: rand(6, 11), rh: rand(3, 4.5), ry: side < 2 ? 0 : Math.PI / 2, wall: pick(['tudor', 'tudor2']), roof: pick(['tiles', 'tiles', 'slate', 'thatch']) });
  }
  L.prop('tower', 20, 8, -120, 3.2, { r: 4, h: 22 }); L.prop('tower', -5, 8, -125, 3.2, { r: 5, h: 30 }); L.prop('tower', 35, 8, -118, 3.2, { r: 3.5, h: 18 });
  L.prop('house', 8, 8, -122, 3.2, { w: 12, d: 7, h: 12, rh: 5, wall: 'castle', roof: 'slate' });
  // market houses (gameplay buildings)
  L.building(-30, 14, -16, 28, 4.5, { s: [door(-23)], e: [door(21)], n: [win(-26), win(-20)], w: [win(21)], roofGap: [-29.4, -26.6] }, 'tudor', 'roof', 0.7);
  L.stairs(-28, 6, 'pz', 2.4, 0, 4.8, 8, 'stone');
  L.building(16, -28, 30, -14, 4.5, { n: [door(23)], w: [door(-21)], s: [win(20), win(26)], e: [win(-21)] }, 'tudor2', 'roof', 0);
  L.box(16 - 0.2, 4.8, -28.2, 30.2, 5.5, -27.85, 'stone'); L.box(29.85, 4.8, -28.2, 30.2, 5.5, -13.8, 'stone'); L.box(15.8, 4.8, -28.2, 16.15, 5.5, -13.8, 'stone'); L.box(15.8, 4.8, -14.15, 26.6, 5.5, -13.8, 'stone');
  L.stairs(28, -6, 'nz', 2.4, 0, 4.8, 8, 'stone');
  L.building(18, 18, 26, 26, 6, { s: [door(22)], w: [door(22)], n: [win(22)], e: [win(22)] }, 'castle', 'roof', 0.7);
  L.building(-26, -26, -18, -18, 6, { n: [door(-22)], e: [door(-22)], s: [win(-22)], w: [win(-22)] }, 'castle', 'roof', 0.7);
  for (const [x0, z0, x1, z1, y] of [[18, 18, 26, 26, 7.0], [-26, -26, -18, -18, 7.0]]) for (let t = 0.5; t < 8; t += 1.6) { L.box(x0 - 0.2 + t, y, z0 - 0.2, x0 + 0.4 + t, y + 0.6, z0 + 0.15, 'castle', { col: false }); L.box(x0 - 0.2 + t, y, z1 - 0.15, x0 + 0.4 + t, y + 0.6, z1 + 0.2, 'castle', { col: false }); }
  for (const [x, z, c] of [[-23, 13.7, 0x9a2a2a], [23, -13.7, 0x2a4a9a], [21.5, 25.8, 0x9a2a2a], [-22.5, -25.8, 0x2a4a9a]]) L.prop('banner', x, 4.2, z, 1, { c, ry: z > 0 ? 0 : Math.PI });
  L.pad(22, 14, 0, 17, 0, 5); L.pad(-22, -14, 0, 17, 0, -5);
  // plaza fountain with statue
  L.B(0, 0, 7, 7, 0.7, 0, 'stone'); L.water.push([-3.2, -3.2, 3.2, 3.2, 0.62]);
  L.B(0, 0, 1.2, 1.2, 2.6, 0, 'stone'); L.B(0, 0, 2.6, 2.6, 0.3, 2.6, 'stone'); L.prop('statue', 0, 2.9, 0, 0.9);
  const awn = [0xb33a3a, 0x2f6fae, 0x3f8f4a, 0xd98a2b];
  [[-11, 0, 0], [11, 0, 0], [0, 11, 1], [0, -11, 1]].forEach(([cx, cz, r], i) => {
    const w = r ? 3.4 : 1, d = r ? 1 : 3.4, aw = r ? 4 : 2.6, ad = r ? 2.6 : 4;
    L.B(cx, cz, w, d, 1.1, 0, 'planks');
    L.B(cx, cz, aw, ad, 0.1, 2.7, 'cloth', { col: false, tint: awn[i] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.B(cx + sx * (aw / 2 - 0.1), cz + sz * (ad / 2 - 0.1), 0.12, 0.12, 2.7, 0, 'planks', { col: false });
    L.prop('keg', cx + (r ? 1.2 : 0.9), 1.1, cz + (r ? 0.2 : 1.1), 0.5); L.prop('bush', cx + (r ? -1.1 : 0), 1.1, cz + (r ? 0 : -1.2), 0.25, { leaf: pick([0xc04040, 0xe0a030, 0x6a9a3a]) });
  });
  for (const [x, z, w, d] of [[-12, -15, 5, 1], [12, 15, 5, 1], [-6, 22, 1, 4], [6, -22, 1, 4], [-21, 2, 1, 5], [21, -2, 1, 5], [-30, -30, 4, 1], [30, 30, 4, 1]]) L.B(x, z, w, d, 1.0, 0, 'hay');
  L.B(-10, -26, 0.6, 12, 3, 0, 'stonewall'); L.B(10, 26, 0.6, 12, 3, 0, 'stonewall');
  L.B(27, 6, 9, 0.6, 3, 0, 'stonewall'); L.B(-27, -6, 9, 0.6, 3, 0, 'stonewall');
  for (const [x, z] of [[-17, -9], [17, 9]]) { L.B(x, z - 2, 0.8, 0.8, 4, 0, 'castle'); L.B(x, z + 2, 0.8, 0.8, 4, 0, 'castle'); L.B(x, z, 0.9, 5, 0.8, 4, 'castle'); }
  for (const [x, z] of [[-15, 9], [15, -9], [-5, 31], [5, -31], [31, -24], [-31, 24]]) { L.B(x, z, 0.6, 0.6, 3, 0, 'bark').noRender = true; L.prop('oak', x, 0, z, rand(1, 1.25)); }
  for (const [x, z, st] of [[-6, -7, 1], [7, 6, 0], [-14, -30, 1], [14, 30, 1], [29, 32, 0], [-29, -32, 0], [-30, 8, 0], [30, -8, 1], [-4, -18, 0], [4, 18, 0]]) {
    L.B(x, z, 1.2, 1.2, 1.2, 0, 'crate'); if (st) L.B(x, z, 1.2, 1.2, 1.2, 1.2, 'crate');
  }
  for (const [x, z] of [[-8, -8], [8, 8], [-8, 8], [8, -8], [-34, -20], [34, 20], [-20, 34], [20, -34]]) { L.prop('lantern', x, 0, z, 1, { ry: rand(0, 6) }); L.glow(x + 0.42 * Math.cos(0), 2.1, z, 0xffc070, 1.1); }
  L.prop('well', -28, 0, -16); L.B(-28, -16, 1.8, 1.8, 1, 0, 'stonewall').noRender = true;
  L.prop('cart', 28, 0, 16, 1, { ry: 0.4 }); L.B(28, 16, 1.8, 2.8, 1.2, 0, 'wood').noRender = true;
  for (let i = 0; i < 18; i++) { const side = randi(0, 3), t = rand(-33, 33); L.prop('bush', side < 2 ? t : (side === 2 ? -35.2 : 35.2), 0, side < 2 ? (side ? 35.2 : -35.2) : t, rand(0.6, 1)); }
  mountains(L, [0x7a8ea8, 0x8798b0, 0x6f86a0], true);
  L.spawn = { x: 0, y: 0, z: -32, yaw: Math.PI };
  L.enemySpawns = [[-33, 33], [33, 33], [0, 34], [-34, 0], [34, 0], [-33, -33], [33, -33], [20, 9], [-20, -9], [-12, 32], [12, -33]];
  L.pickups = [['health', -23, 0, 21], ['health', 23, 0, -21], ['health', 22, 6.3, 22], ['ammo', -22, 6.3, -22], ['ammo', -23, 4.8, 18], ['ammo', 23, 4.8, -18], ['health', 2.6, 0.7, 2.6], ['ammo', -22, 0, -22]];
  L.barrels = [[-8, -20], [8, 20], [-30, 0], [30, 10], [-14, 12], [14, -12], [-3, 8], [3, -8]];
}

// ---------------------------------------------------------------- MAP 3: DRAGON KEEP
function buildKeep(L) {
  L.bounds = [-30, -30, 30, 30]; L.ground = 'flagstone'; L.groundScale = 4; L.grass = 0.08; L.fireflies = 90; L.fireflyColor = 0xffa040; L.emberRise = true; L.padStyle = 'rune';
  L.box(-32, -1, -32, 32, 0, 32, 'floor').noRender = true;
  L.box(-31, 0, -31, 31, 10, -30, 'castle'); L.box(-31, 0, 30, 31, 10, 31, 'castle'); L.box(-31, 0, -30, -30, 10, 30, 'castle'); L.box(30, 0, -30, 31, 10, 30, 'castle');
  for (let t = -30.5; t <= 30.5; t += 2.2) { L.box(t - 0.5, 10, -31, t + 0.5, 11.1, -30.4, 'castle', { col: false }); L.box(t - 0.5, 10, 30.4, t + 0.5, 11.1, 31, 'castle', { col: false }); L.box(-31, 10, t - 0.5, -30.4, 11.1, t + 0.5, 'castle', { col: false }); L.box(30.4, 10, t - 0.5, 31, 11.1, t + 0.5, 'castle', { col: false }); }
  for (const [x, z] of [[-31, -31], [31, -31], [-31, 31], [31, 31]]) L.prop('tower', x, 0, z, 1, { r: 3.6, h: 16, roof: 'slate' });
  // inner wall-walk ring (gaps mid-side to jump)
  const ring = [[-30, 26, -2, 30], [2, 26, 30, 30], [-30, -30, -2, -26], [2, -30, 30, -26], [26, -26, 30, -2], [26, 2, 30, 26], [-30, -26, -26, -2], [-30, 2, -26, 26]];
  for (const [x0, z0, x1, z1] of ring) L.box(x0, 4, z0, x1, 4.4, z1, 'stone');
  for (const [x, z, w, d] of [[-14, 28, 2.2, 1], [14, -28, 2.2, 1], [28, 14, 1, 2.2], [-28, -14, 1, 2.2], [14, 28, 1, 1], [-14, -28, 1, 1]]) L.B(x, z, w, d, 1, 4.4, 'castle');
  L.stairs(20, 14, 'pz', 3, 0, 4.4, 12, 'castle'); L.stairs(-20, -14, 'nz', 3, 0, 4.4, 12, 'castle');
  L.stairs(-14, 20, 'nx', 3, 0, 4.4, 12, 'castle'); L.stairs(14, -20, 'px', 3, 0, 4.4, 12, 'castle');
  // torches on the inner face of the walls + banners
  for (let t = -22; t <= 22; t += 11) for (const [x, z, ry] of [[t, 29.85, Math.PI], [t, -29.85, 0], [29.85, t, -Math.PI / 2], [-29.85, t, Math.PI / 2]]) {
    L.prop('torch', x, 6.6, z, 1.4, { ry }); const dx = Math.sin(ry) * 0.38, dz = Math.cos(ry) * 0.38; L.glow(x + dx, 6.6 + 0.6, z + dz, 0xff8a30, 1.7, true);
    if (Math.abs(t) === 11) L.prop('banner', x + Math.sin(ry) * 0.06, 9.4, z + Math.cos(ry) * 0.06, 1.6, { ry, c: t > 0 ? 0x7a1a1a : 0x1a2a6a });
  }
  // the keep at the centre
  L.B(0, 0, 7, 7, 1.2, 0, 'castle');
  L.B(0, 0, 2.6, 2.6, 7, 0, 'castle');
  for (const [x, z] of [[-1.15, -1.15], [1.15, -1.15], [-1.15, 1.15], [1.15, 1.15]]) L.box(x - 0.25, 7, z - 0.25, x + 0.25, 7.7, z + 0.25, 'castle', { col: false });
  L.prop('brazier', 0, 7, 0, 1); L.glow(0, 7.7, 0, 0xff7a20, 2.6, true);
  for (const [x, z, ry] of [[0, 1.32, 0], [0, -1.32, Math.PI]]) L.prop('banner', x, 6.2, z, 1.2, { ry, c: 0x7a1a1a });
  L.stairs(5.5, 0, 'nx', 2.4, 0, 1.2, 2, 'castle'); L.stairs(-5.5, 0, 'px', 2.4, 0, 1.2, 2, 'castle');
  L.stairs(0, 5.5, 'nz', 2.4, 0, 1.2, 2, 'castle'); L.stairs(0, -5.5, 'pz', 2.4, 0, 1.2, 2, 'castle');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { L.B(10 * sx, 10 * sz, 2, 2, 3.6, 0, 'castle'); L.prop('brazier', 10 * sx, 3.6, 10 * sz, 0.9); L.glow(10 * sx, 4.25, 10 * sz, 0xff7a20, 1.8, true); }
  for (const [x, z, w, d] of [[0, 13, 7, 0.8], [0, -13, 7, 0.8], [13, 0, 0.8, 7], [-13, 0, 0.8, 7]]) L.B(x, z, w, d, 1.2, 0, 'stonewall');
  for (const [x, z, w, d] of [[-18, 6, 1, 4], [18, -6, 1, 4], [6, 19, 4, 1], [-6, -19, 4, 1], [-22, -22, 2, 2], [22, 22, 2, 2]]) L.B(x, z, w, d, 2.2, 0, 'castle');
  L.box(-3, 0, 29.6, 3, 6, 29.95, 'planks', { col: false }); L.box(-3.3, 6, 29.6, 3.3, 6.4, 29.95, 'castle', { col: false });
  for (const [x, z] of [[-24, 8], [24, -8], [8, 24], [-8, -24]]) { L.prop('keg', x, 0, z, 1); L.prop('keg', x + 0.7, 0, z + 0.3, 0.9); }
  for (let i = 0; i < 14; i++) L.prop('rock', rand(-28, 28), 0, pick([-28.8, 28.8]), rand(0.4, 0.8), { sy: 0.5, c: 0x8a8580 });
  L.pad(16, 8, 0, 15, 10, 0); L.pad(-16, -8, 0, 15, -10, 0); L.pad(8, -16, 0, 15, 0, -10); L.pad(-8, 16, 0, 15, 0, 10);
  mountains(L, [0x2a2440, 0x332a4a, 0x241f38], false);
  L.spawn = { x: 0, y: 1.2, z: -2.6, yaw: 0 };
  L.enemySpawns = [[-27, -27], [27, 27], [-27, 27], [27, -27], [0, 27], [0, -27], [27, 0], [-27, 0]];
  L.pickups = [['health', 15, 4.4, 28], ['health', -15, 4.4, -28], ['ammo', 28, 4.4, -15], ['ammo', -28, 4.4, 15], ['health', 0, 0, 20], ['ammo', 0, 0, -20]];
  L.barrels = [[-10, 4], [10, -4], [22, -25], [-22, 25], [4, 10], [-4, -10]];
}

// ---------------------------------------------------------------- MULTI-STOREY BUILDING HELPERS
function wallX2(L, x0, x1, z, th, y0, h, ops, m) {
  let cur = x0;
  for (const o of (ops || []).slice().sort((a, b) => a.c - b.c)) {
    const a = o.c - o.w / 2, b = o.c + o.w / 2;
    if (a > cur) L.box(cur, y0, z - th / 2, a, y0 + h, z + th / 2, m);
    if (o.y0 > 0) L.box(a, y0, z - th / 2, b, y0 + o.y0, z + th / 2, m);
    if (o.y1 < h) L.box(a, y0 + o.y1, z - th / 2, b, y0 + h, z + th / 2, m);
    if (o.y0 > 0.5) L.box(a - 0.05, y0 + o.y0 - 0.08, z - th / 2 - 0.08, b + 0.05, y0 + o.y0, z + th / 2 + 0.08, 'stone', { col: false });
    cur = b;
  }
  if (cur < x1) L.box(cur, y0, z - th / 2, x1, y0 + h, z + th / 2, m);
}
function wallZ2(L, z0, z1, x, th, y0, h, ops, m) {
  let cur = z0;
  for (const o of (ops || []).slice().sort((a, b) => a.c - b.c)) {
    const a = o.c - o.w / 2, b = o.c + o.w / 2;
    if (a > cur) L.box(x - th / 2, y0, cur, x + th / 2, y0 + h, a, m);
    if (o.y0 > 0) L.box(x - th / 2, y0, a, x + th / 2, y0 + o.y0, b, m);
    if (o.y1 < h) L.box(x - th / 2, y0 + o.y1, a, x + th / 2, y0 + h, b, m);
    if (o.y0 > 0.5) L.box(x - th / 2 - 0.08, y0 + o.y0 - 0.08, a - 0.05, x + th / 2 + 0.08, y0 + o.y0, b + 0.05, 'stone', { col: false });
    cur = b;
  }
  if (cur < z1) L.box(x - th / 2, y0, cur, x + th / 2, y0 + h, z1, m);
}
const D2 = c => ({ c, w: 1.8, y0: 0, y1: 2.5 }), W2 = c => ({ c, w: 1.3, y0: 1.0, y1: 2.3 });
// two-storey house: doors {n,s,e,w: [centers]}, interior stair along the north wall, upper-floor windows on every side, pitched roof
function house2(L, x0, z0, w, d, o = {}) {
  const fh = 3.4, th = 0.4, x1 = x0 + w, z1 = z0 + d, m = o.m || 'tudor', run = 3.8, sw = 1.5;
  const dr = o.doors || {}, wn = (a, b) => { const r = []; for (let c = a + 1.6; c < b - 1.2; c += 2.6) r.push(W2(c)); return r; };
  const gOps = (side, a, b) => (dr[side] || []).map(D2).concat(o.gwin === false ? [] : wn(a, b).filter(wo => !(dr[side] || []).some(dc => Math.abs(dc - wo.c) < 2)));
  wallX2(L, x0, x1, z1 - th / 2, th, 0, fh, gOps('n', x0, x1), m); wallX2(L, x0, x1, z0 + th / 2, th, 0, fh, gOps('s', x0, x1), m);
  wallZ2(L, z0 + th, z1 - th, x1 - th / 2, th, 0, fh, gOps('e', z0, z1), m); wallZ2(L, z0 + th, z1 - th, x0 + th / 2, th, 0, fh, gOps('w', z0, z1), m);
  const y2 = fh + 0.25;
  wallX2(L, x0, x1, z1 - th / 2, th, y2, fh - 0.25, wn(x0, x1), m); wallX2(L, x0, x1, z0 + th / 2, th, y2, fh - 0.25, wn(x0, x1), m);
  wallZ2(L, z0 + th, z1 - th, x1 - th / 2, th, y2, fh - 0.25, wn(z0, z1), m); wallZ2(L, z0 + th, z1 - th, x0 + th / 2, th, y2, fh - 0.25, wn(z0, z1), m);
  L.box(x0 - 0.05, fh, z0 - 0.05, x1 + 0.05, y2, z1 + 0.05, 'stone', { col: false });
  // upper floor slab with a stairwell along the north wall
  const sx0 = x0 + th + 1.1, sx1 = sx0 + run, sz0 = z1 - th - sw, hz = sz0 - 0.55;
  L.box(x0 + th, fh, z0 + th, x1 - th, y2, hz, 'planks'); L.box(sx1 + 0.2, fh, hz, x1 - th, y2, z1 - th, 'planks');
  L.stairs(sx0, sz0 + sw / 2, 'px', sw, 0, y2, run, 'planks');
  L.box(x0 + th, fh + 0.9, hz - 0.06, sx1 + 0.2, fh + 1.0, hz, 'planks', { col: false });
  L.box(x0 - 0.3, fh * 2, z0 - 0.3, x1 + 0.3, fh * 2 + 0.2, z1 + 0.3, o.roofM === 'thatch' ? 'thatch' : 'roof');
  L.prop('gable', (x0 + x1) / 2, fh * 2 + 0.2, (z0 + z1) / 2, 1, { w: w + 0.6, d: d + 0.6, h: Math.min(w, d) * 0.45, oh: 0.35, axis: w >= d ? 'x' : 'z', mat: o.roofM || 'tiles' });
  L.prop('chimney', x1 - 1.4, fh * 2 + 0.2, z0 + 1.4, 1, { h: Math.min(w, d) * 0.45 + 0.6 });
  for (let c = x0 + 1.6; c < x1 - 1.2; c += 2.6) L.glow(c, y2 + 1.6, z0 - 0.3, 0xffc070, 0.9);
}
// stair tower with belfry (three levels)
function stairTower(L, x0, z0, s, m) {
  const th = 0.5, x1 = x0 + s, z1 = z0 + s, ix0 = x0 + th, iz0 = z0 + th, ix1 = x1 - th, iz1 = z1 - th, half = (ix0 + ix1) / 2, f1 = 3.8, f2 = 7.6, H = 11.5;
  const lo = f2 + 0.5, bel = [{ c: 0, w: 1.6, y0: 0.4, y1: 2.1 }], cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, b = c => [{ c, w: 1.6, y0: 0.4, y1: 2.1 }];
  wallX2(L, x0, x1, z0 + th / 2, th, 0, lo, [D2(cx)], m); wallX2(L, x0, x1, z0 + th / 2, th, lo, H - lo, b(cx), m);
  wallX2(L, x0, x1, z1 - th / 2, th, 0, lo, [{ c: cx, w: 0.6, y0: f1 + 1.2, y1: f1 + 2.2 }], m); wallX2(L, x0, x1, z1 - th / 2, th, lo, H - lo, b(cx), m);
  wallZ2(L, z0 + th, z1 - th, x0 + th / 2, th, 0, lo, [], m); wallZ2(L, z0 + th, z1 - th, x0 + th / 2, th, lo, H - lo, b(cz), m);
  wallZ2(L, z0 + th, z1 - th, x1 - th / 2, th, 0, lo, [], m); wallZ2(L, z0 + th, z1 - th, x1 - th / 2, th, lo, H - lo, b(cz), m);
  const run = iz1 - iz0 - 1.6, wc = (ix0 + half) / 2, ec = (half + ix1) / 2;
  L.stairs(wc, iz0 + 1.0, 'pz', half - ix0, 0, f1, run, 'planks');                        // flight 1 (west half, northward) after an entry landing
  L.links.pop();
  L.box(half, f1 - 0.25, iz0, ix1, f1, iz1, 'planks'); L.box(ix0, f1 - 0.25, iz0 + 1.0 + run, half, f1, iz1, 'planks');
  L.stairs(ec, iz0 + 1.0 + run, 'nz', ix1 - half, f1, f2, run, 'planks');                 // flight 2 (east half, southward)
  L.links.pop(); L.links.push([wc, 0, iz0 + 0.45, wc, f2, iz0 + 1.25, run * 2 + 3, [[wc, f1, iz0 + 1.0 + run + 0.3], [ec, f1, iz0 + 1.0 + run + 0.3]]]); // one link up both flights via the landing
  L.box(ix0, f2 - 0.25, iz0, half, f2, iz1, 'planks');                                        // belfry floor
  L.box(x0 - 0.3, H, z0 - 0.3, x1 + 0.3, H + 0.3, z1 + 0.3, 'stone');
  L.prop('coneroof', (x0 + x1) / 2, H + 0.3, (z0 + z1) / 2, 1, { r: s * 0.78, h: 5, mat: 'slate' });
  L.prop('brazier', (half + ix1) / 2, f2 - 0.05, iz0 + 0.6, 0.5);
}

// ---------------------------------------------------------------- MAP 4: MILLBROOK VILLAGE (large, three lanes, river)
function buildMillbrook(L) {
  L.bounds = [-64, -48, 64, 48]; L.ground = 'grassMud'; L.groundScale = 7; L.grass = 0.9; L.flowers = 2; L.padStyle = 'mushroom'; L.big = true;
  L.groundY = (x, z) => { const a = Math.abs(x); return a < 2.8 ? -0.9 : a < 4.2 ? lerp(-0.9, 0, (a - 2.8) / 1.4) : 0; };
  L.box(-68, -1, -52, -4, 0, 52, 'floor').noRender = true; L.box(4, -1, -52, 68, 0, 52, 'floor').noRender = true;
  L.box(-4, -2, -52, -3, -0.45, 52, 'floor').noRender = true; L.box(3, -2, -52, 4, -0.45, 52, 'floor').noRender = true; L.box(-3, -2, -52, 3, -0.9, 52, 'floor').noRender = true;
  L.water.push([-3.9, -48, 3.9, 48, -0.32]);
  // boundary: rocky ridges + forest
  L.box(-65, 0, -49, 65, 9, -48, 'cliff'); L.box(-65, 0, 48, 65, 9, 49, 'cliff'); L.box(-65, 0, -48, -64, 9, 48, 'cliff'); L.box(64, 0, -48, 65, 9, 48, 'cliff');
  for (let x = -68; x <= 68; x += 4) for (const z of [-50.5, 50.5, -55, 55]) L.prop(Math.random() < 0.6 ? 'pine' : 'oak', x + rand(-1.5, 1.5), 9, z + rand(-1, 1), rand(1.3, 2), { bg: Math.abs(z) > 52 });
  for (let z = -48; z <= 48; z += 4) for (const x of [-66.5, 66.5, -71, 71]) L.prop(Math.random() < 0.6 ? 'pine' : 'oak', x + rand(-1, 1), 9, z + rand(-1.5, 1.5), rand(1.3, 2), { bg: Math.abs(x) > 68 });
  for (let i = 0; i < 50; i++) { const side = randi(0, 3), t = rand(-60, 60); L.prop('rock', side < 2 ? t : (side === 2 ? -63.2 : 63.2), 0, side < 2 ? (side ? 47.2 : -47.2) : t * 0.75, rand(0.8, 1.6), { sy: rand(0.4, 0.9) }); }
  // ---- crossings
  L.box(-5.5, -0.35, 27.5, 5.5, 0.0, 32.5, 'stone'); for (const z of [27.3, 32.7]) L.box(-5.5, 0, z - 0.2, 5.5, 1.0, z + 0.2, 'stone'); // stone bridge (north)
  L.box(-5, -0.35, -2, 5, 0.0, 2, 'planks'); for (const z of [-2, 2]) { L.box(-5, 0.9, z - 0.06, 5, 1.0, z + 0.06, 'planks', { col: false }); for (let x = -5; x <= 5; x += 2.5) L.box(x - 0.08, 0, z - 0.08, x + 0.08, 1.0, z + 0.08, 'bark', { col: false }); } // wooden bridge (mid)
  for (const [x, z] of [[-1.8, -30], [0, -31.2], [1.8, -29.6]]) L.B(x, z, 1.2, 1.2, 0.5, -0.9, 'stone'); // stepping stones (south ford)
  for (let z = -46; z <= 46; z += rand(4, 8)) for (const sx of [-1, 1]) if (Math.abs(z - 30) > 4 && Math.abs(z) > 4) L.prop('reeds', sx * rand(3.4, 4.6), -0.3, z, rand(0.8, 1.3));
  // ---- WEST: village
  stairTower(L, -27, 11, 6, 'castle');                                                     // bell tower
  wallX2(L, -42, -27, 30, 0.6, 0, 7, [{ c: -37, w: 1.4, y0: 3, y1: 5.5 }, { c: -32, w: 1.4, y0: 3, y1: 5.5 }], 'castle');   // church nave
  wallX2(L, -42, -27, 17, 0.6, 0, 7, [{ c: -37, w: 1.4, y0: 3, y1: 5.5 }, { c: -32, w: 1.4, y0: 3, y1: 5.5 }], 'castle');
  wallZ2(L, 17.3, 29.7, -41.7, 0.6, 0, 7, [{ c: 23.5, w: 2.4, y0: 0, y1: 3.2 }], 'castle'); wallZ2(L, 17.3, 29.7, -27.3, 0.6, 0, 7, [{ c: 23.5, w: 2.4, y0: 0, y1: 3.2 }], 'castle');
  L.box(-42.3, 7, 16.7, -26.7, 7.3, 30.3, 'stone'); L.prop('gable', -34.5, 7.3, 23.5, 1, { w: 15.6, d: 13.6, h: 5, oh: 0.4, axis: 'x', mat: 'slate' });
  for (let x = -40; x <= -29; x += 3.5) { L.B(x, 21.5, 2.4, 0.6, 0.5, 0, 'planks'); L.B(x, 25.5, 2.4, 0.6, 0.5, 0, 'planks'); }
  L.B(-40, 23.5, 1.2, 2.5, 1.1, 0, 'stone'); for (const z of [19, 28]) L.glow(-41.2, 4.2, z, 0xffc070, 1);
  for (let i = 0; i < 12; i++) L.B(-38 + (i % 4) * 2.6, 8 + Math.floor(i / 4) * 2.2, 0.6, 0.18, 0.8, 0, 'stone'); // graveyard
  L.prop('oak', -33, 0, 4, 1.3); L.B(-33, 4, 0.6, 0.6, 3, 0, 'bark').noRender = true;
  house2(L, -58, -14, 9, 8, { doors: { e: [-10], s: [-53.5] } }); house2(L, -58, 2, 9, 8, { doors: { e: [6], n: [-53.5] }, m: 'tudor2', roofM: 'thatch' });
  house2(L, -44, -32, 10, 8, { doors: { n: [-39], e: [-28] }, m: 'tudor2' }); house2(L, -26, -32, 9, 9, { doors: { n: [-21.5], w: [-27.5] } });
  house2(L, -58, 20, 8, 9, { doors: { e: [24.5], s: [-54] }, roofM: 'thatch' });
  house2(L, -20, 12, 8, 8, { doors: { s: [-16], e: [16] }, m: 'tudor2' });
  // market square
  L.prop('well', -24, 0, -4); L.B(-24, -4, 1.8, 1.8, 1, 0, 'stonewall').noRender = true;
  const awn = [0xb33a3a, 0x2f6fae, 0x3f8f4a, 0xd98a2b];
  [[-30, -8, 1], [-18, -8, 1], [-30, 2, 0], [-18, 4, 0]].forEach(([cx, cz, r], i) => {
    const w = r ? 3.4 : 1, d = r ? 1 : 3.4, aw = r ? 4 : 2.6, ad = r ? 2.6 : 4;
    L.B(cx, cz, w, d, 1.1, 0, 'planks'); L.B(cx, cz, aw, ad, 0.1, 2.7, 'cloth', { col: false, tint: awn[i] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.B(cx + sx * (aw / 2 - 0.1), cz + sz * (ad / 2 - 0.1), 0.12, 0.12, 2.7, 0, 'planks', { col: false });
  });
  for (const [x, z, ry] of [[-36, -18, 0.3], [-12, -20, 1.4], [-48, 14, 2]]) { L.prop('cart', x, 0, z, 1, { ry }); L.B(x, z, 1.8, 2.8, 1.2, 0, 'wood').noRender = true; }
  for (const [x, z] of [[-14, -6], [-14, 8], [-38, -4], [-50, -20], [-46, 30], [-20, 26], [-10, 38], [-10, -38]]) { L.prop('lantern', x, 0, z, 1); }
  for (const [x0, z0, x1, z1] of [[-62, -24, -46, -23.4], [-62, 34, -44, 34.6], [-12, -46, -11.4, -36], [-12, 34, -11.4, 46], [-46, 38, -24, 38.6]]) L.box(x0, 0, z0, x1, 1.2, z1, 'stonewall');
  for (const [x, z, st] of [[-20, -16, 1], [-34, -10, 0], [-10, 12, 1], [-8, -14, 0], [-52, 32, 1], [-14, 30, 0], [-40, 40, 1]]) { L.B(x, z, 1.2, 1.2, 1.2, 0, 'crate'); if (st) L.B(x + 0.1, z - 0.1, 1.2, 1.2, 1.2, 1.2, 'crate'); }
  // ---- EAST: farm
  const bx0 = 24, bz0 = -10, bw = 16, bd = 15, bh = 8.5;                                    // barn with hayloft; big doors both ends
  wallX2(L, bx0, bx0 + bw, bz0 + 0.25, 0.5, 0, bh, [W2(bx0 + 4), W2(bx0 + 12)], 'planks'); wallX2(L, bx0, bx0 + bw, bz0 + bd - 0.25, 0.5, 0, bh, [W2(bx0 + 4), W2(bx0 + 12)], 'planks');
  wallZ2(L, bz0 + 0.5, bz0 + bd - 0.5, bx0 + 0.25, 0.5, 0, bh, [{ c: bz0 + bd / 2, w: 4.5, y0: 0, y1: 4.2 }, { c: bz0 + bd / 2, w: 2, y0: 5.4, y1: 7.2 }], 'planks');
  wallZ2(L, bz0 + 0.5, bz0 + bd - 0.5, bx0 + bw - 0.25, 0.5, 0, bh, [{ c: bz0 + bd / 2, w: 4.5, y0: 0, y1: 4.2 }], 'planks');
  L.box(bx0 + 0.5, 4.2, bz0 + 0.5, bx0 + 7, 4.45, bz0 + bd - 0.5, 'planks');               // hayloft (west half)
  L.stairs(bx0 + 12.5, bz0 + 1.4, 'nx', 1.6, 0, 4.45, 5.5, 'planks');
  L.box(bx0 + 7.0, 4.45, bz0 + 2.4, bx0 + 7.1, 5.4, bz0 + bd - 0.5, 'planks', { col: false });
  L.box(bx0 - 0.3, bh, bz0 - 0.3, bx0 + bw + 0.3, bh + 0.2, bz0 + bd + 0.3, 'roof');
  L.prop('gable', bx0 + bw / 2, bh + 0.2, bz0 + bd / 2, 1, { w: bw + 0.6, d: bd + 0.6, h: 5.5, oh: 0.4, axis: 'x', mat: 'tiles' });
  for (const [x, z, h] of [[27, -6, 1], [29, -6, 2], [27, 2, 1], [36, -4, 1], [36, 3, 2], [33, -0.5, 1]]) for (let k = 0; k < h; k++) L.B(x, z, 1.8, 1.2, 1, k, 'hay');
  for (const [x, z] of [[26, -7], [26, 3]]) L.B(x, z, 1.4, 1.4, 1, 4.45, 'hay');
  house2(L, 44, 14, 10, 9, { doors: { w: [18.5], s: [49] }, m: 'tudor2', roofM: 'thatch' });   // farmhouse
  house2(L, 6.5, -30, 9, 8, { doors: { e: [-26], n: [11] }, m: 'hutwall', roofM: 'thatch' });   // mill
  const wheel = L.prop('octo', 5.6, -0.6, -26, 1, { r: 2.6, h: 0.6, mat: 'planks' }); wheel.k = 'wheel';
  L.octo(50, -24, 3, 12, 'stonewall'); L.prop('coneroof', 50, 12, -24, 1, { r: 3.6, h: 3, mat: 'tiles' });   // silo
  for (let x = 16; x <= 52; x += 6) for (let z = 28; z <= 44; z += 6) { const tx = x + rand(-1, 1), tz = z + rand(-1, 1); L.B(tx, tz, 0.6, 0.6, 3, 0, 'bark').noRender = true; L.prop('oak', tx, 0, tz, rand(0.85, 1.05), { leaf: pick([0x4a7a35, 0x5a8a3a, 0x6a8a30]) }); } // orchard
  for (const [x, z, len, ry] of [[22, 24, 24, 0], [56, 6, 16, Math.PI / 2], [22, -34, 22, 0], [14, -14, 12, Math.PI / 2]]) { L.prop('fence', x, 0, z, 1, { len, ry }); if (ry) L.box(x - 0.1, 0, z - len / 2, x + 0.1, 1, z + len / 2, 'wood').noRender = true; else L.box(x - len / 2, 0, z - 0.1, x + len / 2, 1, z + 0.1, 'wood').noRender = true; }
  for (const [x, z] of [[46, -8], [52, 0], [18, -40], [30, -40], [58, -36], [12, 10], [16, 18]]) { L.B(x, z, 1.8, 1.2, 1, 0, 'hay'); if (Math.random() < 0.5) L.B(x, z, 1.8, 1.2, 1, 1, 'hay'); }
  for (const [x, z, st] of [[18, -2, 1], [44, -14, 0], [56, 30, 1], [10, 36, 0], [40, -36, 1], [20, 8, 0]]) { L.B(x, z, 1.2, 1.2, 1.2, 0, 'crate'); if (st) L.B(x, z, 1.2, 1.2, 1.2, 1.2, 'crate'); }
  for (const [x, z] of [[14, 0], [42, 8], [34, -20], [20, -24], [56, -10], [8, 40]]) L.prop('lantern', x, 0, z, 1);
  for (let i = 0; i < 40; i++) { const x = rand(-60, 60), z = rand(-44, 44); if (Math.abs(x) < 5) continue; L.prop(Math.random() < 0.5 ? 'bush' : 'mushrooms', x, 0, z, rand(0.7, 1.2)); }
  mountains(L, [0x6a8098, 0x7a90a6, 0x5d7489], true);
  L.pad(-8, -40, 0, 15, 0, 6); L.pad(18, 40, 0, 15, 0, -6);
  L.spawn = { x: -58, y: 0, z: 0, yaw: -Math.PI / 2 };
  L.enemySpawns = [[58, 0], [58, -20], [58, 20], [40, 42], [40, -42], [-10, 44], [-10, -44], [-58, -40], [-58, 40], [20, -44], [30, 20], [-40, -44]];
  L.pickups = [['health', -34.5, 0, 23.5], ['ammo', -25.2, 7.6, 13.5], ['health', 28, 4.45, -2.5], ['ammo', 32, 0, 5], ['health', -53.5, 3.65, -8], ['ammo', 48.5, 3.65, 20],
    ['health', 0, 0, 0], ['ammo', 0, 0, 30], ['health', 11, 3.65, -24], ['ammo', -22, 0, 4], ['health', 40, 0, 30], ['ammo', -40, 0, -24]];
  L.barrels = [[-14, -10], [14, 4], [-30, 12], [22, -16], [46, 28], [-46, -28], [6, 22], [-6, -24]];
}

const MAPS = [
  {
    name: 'MILLBROOK VILLAGE', desc: 'Large three-lane map: river crossings, a climbable bell tower, two-storey houses, a barn with a hayloft.', tag: 'Large · all ranges · multi-floor', build: buildMillbrook,
    theme: {
      skyTop: 0x4a82c8, skyBottom: 0xf0d8b0, sunColor: 0xffe2b0, sunDir: [0.55, 0.42, 0.3], fog: 0xc8d0c8, fogNear: 60, fogFar: 220,
      hemiSky: 0xdfeaff, hemiGround: 0x5a6a3a, hemi: 1.25, sun: 2.5, sunLight: 0xffe6c0, shadowSun: [0.55, 0.8, 0.3], farGround: 0x4a5a32, water: 0x4f7a78, clouds: 18, cloudColor: 0xfff0dc,
      mats: {},
    },
  },
  {
    name: 'BOGWATER SWAMP', desc: 'An ogre’s swamp at golden hour. Boardwalks, mossy logs, giant mushrooms.', tag: 'Close–mid range · verticality', build: buildSwamp,
    theme: {
      skyTop: 0x4f78a6, skyBottom: 0xf3c98e, sunColor: 0xffc98a, sunDir: [0.75, 0.22, 0.35], fog: 0xa8ad8c, fogNear: 28, fogFar: 150,
      hemiSky: 0xe3ecff, hemiGround: 0x4a5a2a, hemi: 1.35, sun: 2.3, sunLight: 0xffd2a0, shadowSun: [0.7, 0.75, 0.35], farGround: 0x3d4a2a, water: 0x5a7a5a, clouds: 14, cloudColor: 0xffe2c0,
      mats: { crate: { t: 'wood', local: true } },
    },
  },
  {
    name: 'KINGDOM MARKET', desc: 'A walled fairy-tale market town. Timber houses, rooftops and a fountain plaza.', tag: 'Mid–long range · rooftops', build: buildKingdom,
    theme: {
      skyTop: 0x3a7ccc, skyBottom: 0xd2e4f4, sunColor: 0xfff2d0, sunDir: [-0.45, 0.75, 0.4], fog: 0xc8d8e6, fogNear: 55, fogFar: 230,
      hemiSky: 0xdfeeff, hemiGround: 0x8a7a5a, hemi: 1.25, sun: 2.6, sunLight: 0xfff0d6, shadowSun: [-0.5, 1, 0.4], farGround: 0x6a7a4a, water: 0x5a8aa0, clouds: 22, cloudColor: 0xffffff,
      mats: {},
    },
  },
  {
    name: 'DRAGON KEEP', desc: 'A torch-lit castle courtyard at dusk. Wall-walks, magic runes and a central keep.', tag: 'Fast · arena flow', build: buildKeep,
    theme: {
      skyTop: 0x0c1030, skyBottom: 0x7a4058, sunColor: 0xc8d4ff, sunDir: [-0.3, 0.42, -0.6], fog: 0x2e2640, fogNear: 26, fogFar: 120, stars: true,
      hemiSky: 0x8a90c8, hemiGround: 0x3a2a2a, hemi: 1.5, sun: 1.25, sunLight: 0xb0bcff, shadowSun: [-0.3, 1, -0.5], farGround: 0x221c2a, clouds: 8, cloudColor: 0x6a5a7a,
      mats: { castle: { c: 0xb8b0b0 }, stone: { c: 0xc8c0c0 } },
    },
  },
];

// ============================================================ GEOMETRY MERGE
const FACES = [
  { n: [1, 0, 0], c: b => [[b.x1, b.y0, b.z1], [b.x1, b.y0, b.z0], [b.x1, b.y1, b.z0], [b.x1, b.y1, b.z1]], uv: p => [-p[2], p[1]], ul: (x, y, z) => [1 - z, y] },
  { n: [-1, 0, 0], c: b => [[b.x0, b.y0, b.z0], [b.x0, b.y0, b.z1], [b.x0, b.y1, b.z1], [b.x0, b.y1, b.z0]], uv: p => [p[2], p[1]], ul: (x, y, z) => [z, y] },
  { n: [0, 1, 0], c: b => [[b.x0, b.y1, b.z1], [b.x1, b.y1, b.z1], [b.x1, b.y1, b.z0], [b.x0, b.y1, b.z0]], uv: p => [p[0], -p[2]], ul: (x, y, z) => [x, 1 - z] },
  { n: [0, -1, 0], c: b => [[b.x0, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y0, b.z1], [b.x0, b.y0, b.z1]], uv: p => [p[0], p[2]], ul: (x, y, z) => [x, z] },
  { n: [0, 0, 1], c: b => [[b.x0, b.y0, b.z1], [b.x1, b.y0, b.z1], [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1]], uv: p => [p[0], p[1]], ul: (x, y, z) => [x, y] },
  { n: [0, 0, -1], c: b => [[b.x1, b.y0, b.z0], [b.x0, b.y0, b.z0], [b.x0, b.y1, b.z0], [b.x1, b.y1, b.z0]], uv: p => [-p[0], p[1]], ul: (x, y, z) => [1 - x, y] },
];
function buildLevelMeshes(L, theme, group) {
  const byMat = {};
  for (const b of L.boxes.concat(L.decor)) if (!b.noRender && b.m !== 'barrel') (byMat[b.m] || (byMat[b.m] = [])).push(b);
  for (const m in byMat) {
    const { def, mat } = matFor(m, theme);
    const pos = [], nor = [], uv = [], col = [], idx = [];
    for (const b of byMat[m]) {
      const base = new THREE.Color(b.tint !== undefined ? b.tint : 0xffffff);
      const j = def.e !== undefined ? 1 : rand(0.86, 1.04);
      const sx = b.x1 - b.x0, sy = b.y1 - b.y0, sz = b.z1 - b.z0;
      for (const f of FACES) {
        if (f.n[1] === -1 && b.y0 <= 0.001) continue; // never visible
        const cs = f.c(b), vi = pos.length / 3;
        for (const p of cs) {
          pos.push(p[0], p[1], p[2]); nor.push(f.n[0], f.n[1], f.n[2]);
          let u, v;
          if (def.local) [u, v] = f.ul((p[0] - b.x0) / sx, (p[1] - b.y0) / sy, (p[2] - b.z0) / sz);
          else { const s = def.s || 4; [u, v] = f.uv(p); u /= s; v /= s; }
          uv.push(u, v);
          let sh = j;
          if (def.e === undefined) {
            if (f.n[1] === 0 && p[1] === b.y0 && b.y0 <= 0.01) sh *= 0.62; // contact shadow
            else if (f.n[1] === 0 && p[1] === b.y0) sh *= 0.85;
            if (f.n[1] === -1) sh *= 0.55;
          }
          col.push(base.r * sh, base.g * sh, base.b * sh);
        }
        const a = cs[0], b1 = cs[1], c2 = cs[2];
        const ux = b1[0] - a[0], uy = b1[1] - a[1], uz = b1[2] - a[2], wx = c2[0] - a[0], wy = c2[1] - a[1], wz = c2[2] - a[2];
        const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
        if (cx * f.n[0] + cy * f.n[1] + cz * f.n[2] >= 0) idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
        else idx.push(vi, vi + 2, vi + 1, vi, vi + 3, vi + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = def.e === undefined && m !== 'floor'; mesh.receiveShadow = def.e === undefined;
    group.add(mesh);
  }
}

// ============================================================ NAV GRID (A*)
// ============================================================ LAYERED NAVIGATION (multi-floor: stairs, walkways, rooftops)
const DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1];
class Nav {
  constructor(boxes, bounds, links = []) {
    const [x0, z0, x1, z1] = bounds, cs = this.cs = 0.5; this.x0 = x0; this.z0 = z0; this.W = Math.ceil((x1 - x0) / cs); this.H = Math.ceil((z1 - z0) / cs);
    this.boxes = boxes.filter(b => !b.barrel);
    // spatial hash (4 m buckets) for fast box queries
    this.hs = 4; this.hw = Math.ceil((x1 - x0) / 4) + 2; this.hh = Math.ceil((z1 - z0) / 4) + 2; this.hash = Array.from({ length: this.hw * this.hh }, () => []);
    for (const b of this.boxes) {
      const i0 = clamp(Math.floor((b.x0 - x0) / 4), 0, this.hw - 1), i1 = clamp(Math.floor((b.x1 - x0) / 4), 0, this.hw - 1), j0 = clamp(Math.floor((b.z0 - z0) / 4), 0, this.hh - 1), j1 = clamp(Math.floor((b.z1 - z0) / 4), 0, this.hh - 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.hash[j * this.hw + i].push(b);
    }
    const R = 0.3, HT = 1.7, N = this.W * this.H, nodeH = [], nodeCell = [], cellStart = new Int32Array(N + 1);
    for (let k = 0; k < N; k++) {
      cellStart[k] = nodeH.length; const cx = x0 + ((k % this.W) + 0.5) * cs, cz = z0 + (Math.floor(k / this.W) + 0.5) * cs, tops = new Set();
      for (const b of this.bucket(cx, cz)) if (cx >= b.x0 - 0.01 && cx <= b.x1 + 0.01 && cz >= b.z0 - 0.01 && cz <= b.z1 + 0.01 && b.y1 < 18) tops.add(Math.round(b.y1 * 100) / 100);
      for (const h of [...tops].sort((a, b) => a - b)) if (!this.blocked(cx, h + 0.47, cz, R, HT - 0.45)) { nodeH.push(h); nodeCell.push(k); }
    }
    cellStart[N] = nodeH.length; this.cellStart = cellStart; this.nodeH = Float32Array.from(nodeH); this.nodeCell = Int32Array.from(nodeCell); this.n = nodeH.length;
    // edges (explicit stair links first)
    const extra = new Map(), addX = (a, b, c) => { if (a < 0 || b < 0 || a === b) return; if (!extra.has(a)) extra.set(a, []); extra.get(a).push([b, c]); };
    const near = (x, y, z) => { // nearest node at this height that is actually visible from the point (not through a wall)
      const ci = Math.floor((x - x0) / cs), cj = Math.floor((z - z0) / cs); let best = -1, bs = 1e9;
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= this.W || j >= this.H) continue; const k = j * this.W + i;
        for (let m = cellStart[k]; m < cellStart[k + 1]; m++) { const h = nodeH[m]; if (Math.abs(h - y) > 0.75) continue; const nx = x0 + (i + 0.5) * cs, nz = z0 + (j + 0.5) * cs;
          const sc = Math.hypot(nx - x, nz - z) + (this.boxes.some(b => !b.noRender && rayAABB(x, y + 1, z, nx - x, h - y, nz - z, b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, 1) >= 0) ? 50 : 0) + Math.abs(h - y);
          if (sc < bs) { bs = sc; best = m; } } }
      return bs < 50 ? best : -1; };
    this.via = new Map();
    for (const [ax, ay, az, bx, by, bz, len, via] of links) { const a = near(ax, ay, az), b = near(bx, by, bz); if (a < 0 || b < 0) continue; addX(a, b, len); addX(b, a, len);
      if (via) { this.via.set(a + ',' + b, via); this.via.set(b + ',' + a, via.slice().reverse()); } }
    const eS = new Int32Array(this.n + 1), eTo = [], eC = [];
    for (let n = 0; n < this.n; n++) {
      eS[n] = eTo.length; if (extra.has(n)) for (const [m, c] of extra.get(n)) { eTo.push(m); eC.push(c); }
      const k = this.nodeCell[n], i = k % this.W, j = (k / this.W) | 0, h1 = this.nodeH[n], cx = x0 + (i + 0.5) * cs, cz = z0 + (j + 0.5) * cs;
      for (let d = 0; d < 8; d++) {
        const ni = i + DI[d], nj = j + DJ[d]; if (ni < 0 || nj < 0 || ni >= this.W || nj >= this.H) continue;
        const nk = nj * this.W + ni, diag = DI[d] && DJ[d];
        for (let m = cellStart[nk]; m < cellStart[nk + 1]; m++) {
          const h2 = this.nodeH[m], dh = h2 - h1, mx = cx + DI[d] * cs * 0.5, mz = cz + DJ[d] * cs * 0.5;
          if (Math.abs(dh) <= 0.6) {
            const hm = this.surfaceAt(mx, mz, Math.max(h1, h2) + 0.05); if (hm === null) continue;
            if (Math.abs(hm - h1) > 0.55 || Math.abs(h2 - hm) > 0.55) continue;
            if (this.blocked(mx, Math.max(h1, h2, hm) + 0.47, mz, R, HT - 0.45)) continue;
            if (diag && (!this.hasNear(i + DI[d], j, h1, h2) || !this.hasNear(i, j + DJ[d], h1, h2))) continue;
            eTo.push(m); eC.push((diag ? 1.414 : 1) * cs + Math.abs(dh) * 0.4);
          } else if (dh < -0.6 && dh > -4.6 && !diag) { // drop down a ledge (one way)
            if (this.blocked(cx + DI[d] * cs * 0.9, h1 + 0.47, cz + DJ[d] * cs * 0.9, R, HT - 0.45)) continue;
            eTo.push(m); eC.push(2.5);
          }
        }
      }
    }
    eS[this.n] = eTo.length; this.eS = eS; this.eTo = Int32Array.from(eTo); this.eC = Float32Array.from(eC);
    this.g = new Float32Array(this.n); this.from = new Int32Array(this.n); this.stamp = new Uint32Array(this.n); this.closed = new Uint32Array(this.n); this.cur = 0;
    // ground-layer compatibility grid
    this.blk = new Uint8Array(N); for (let k = 0; k < N; k++) { let g = false; for (let m = cellStart[k]; m < cellStart[k + 1]; m++) if (this.nodeH[m] < 0.3) g = true; this.blk[k] = g ? 0 : 1; }
  }
  bucket(x, z) { const i = clamp(Math.floor((x - this.x0) / 4), 0, this.hw - 1), j = clamp(Math.floor((z - this.z0) / 4), 0, this.hh - 1); return this.hash[j * this.hw + i]; }
  blocked(x, y, z, r, h) {
    for (const bx of [x - r, x + r]) for (const bz of [z - r, z + r]) for (const b of this.bucket(bx, bz)) if (overlapBox(b, x, y, z, r, h)) return true;
    return false;
  }
  surfaceAt(x, z, maxY) { let best = null; for (const b of this.bucket(x, z)) if (x >= b.x0 - 0.05 && x <= b.x1 + 0.05 && z >= b.z0 - 0.05 && z <= b.z1 + 0.05 && b.y1 <= maxY && (best === null || b.y1 > best)) best = b.y1; return best; }
  hasNear(i, j, h1, h2) { if (i < 0 || j < 0 || i >= this.W || j >= this.H) return false; const k = j * this.W + i; for (let m = this.cellStart[k]; m < this.cellStart[k + 1]; m++) { const h = this.nodeH[m]; if (Math.abs(h - h1) < 0.6 || Math.abs(h - h2) < 0.6) return true; } return false; }
  cellIdx(x, z) { const i = Math.floor((x - this.x0) / this.cs), j = Math.floor((z - this.z0) / this.cs); if (i < 0 || j < 0 || i >= this.W || j >= this.H) return -1; return j * this.W + i; }
  nodeAt(x, y, z, maxRm = 5) {
    const cs = this.cs, maxR = Math.ceil(maxRm / cs), ci = Math.floor((x - this.x0) / cs), cj = Math.floor((z - this.z0) / cs); let best = -1, bs = 1e9;
    for (let r = 0; r <= maxR; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= this.W || j >= this.H) continue;
        const k = j * this.W + i; for (let m = this.cellStart[k]; m < this.cellStart[k + 1]; m++) { const h = this.nodeH[m], dy = h - y; const sc = Math.hypot(di, dj) * cs + (dy > 0.7 ? dy * 3 : Math.abs(dy) * 1.2) + (this.eS && this.eS[m + 1] === this.eS[m] ? 6 : 0); if (sc < bs) { bs = sc; best = m; } }
      }
      if (best >= 0 && bs < (r + 1.5) * cs) break;
    }
    return best;
  }
  nodePos(n) { const k = this.nodeCell[n], cs = this.cs; return [this.x0 + ((k % this.W) + 0.5) * cs, this.nodeH[n], this.z0 + (Math.floor(k / this.W) + 0.5) * cs]; }
  pathTo(sx, sy, sz, tx, ty, tz) {
    const s = this.nodeAt(sx, sy, sz, 3), t = this.nodeAt(tx, ty, tz, 8); if (s < 0 || t < 0) return null; if (s === t) return [this.nodePos(t)];
    const st = ++this.cur, [txx, tyy, tzz] = this.nodePos(t);
    const h = n => { const [x, y, z] = this.nodePos(n); return Math.hypot(x - txx, z - tzz) + Math.abs(y - tyy) * 0.4; };
    const heap = new Heap(); this.g[s] = 0; this.stamp[s] = st; this.from[s] = -1; heap.push(s, h(s)); let it = 0;
    while (heap.size && it++ < 60000) {
      const n = heap.pop(); if (this.closed[n] === st) continue; this.closed[n] = st; if (n === t) break;
      for (let e = this.eS[n]; e < this.eS[n + 1]; e++) { const m = this.eTo[e]; if (this.closed[m] === st) continue; const ng = this.g[n] + this.eC[e];
        if (this.stamp[m] !== st || ng < this.g[m]) { this.stamp[m] = st; this.g[m] = ng; this.from[m] = n; heap.push(m, ng + h(m)); } }
    }
    if (this.closed[t] !== st) return null;
    const ids = []; for (let n = t; n !== -1; n = this.from[n]) ids.push(n); ids.reverse();
    const out = []; for (let i = 1; i < ids.length; i++) { const v = this.via.get(ids[i - 1] + ',' + ids[i]); if (v) for (const p of v) out.push(p); out.push(this.nodePos(ids[i])); }
    return out;
  }
  freeAt(x, y, z) { const k = this.cellIdx(x, z); if (k < 0) return false; for (let m = this.cellStart[k]; m < this.cellStart[k + 1]; m++) if (Math.abs(this.nodeH[m] - y) < 0.6) return true; return false; }
  lineFreeAt(ax, ay, az, bx, by, bz) { const dx = bx - ax, dz = bz - az, n = Math.ceil(Math.hypot(dx, dz) / 0.45); for (let i = 1; i <= n; i++) { const t = i / n; if (!this.freeAt(ax + dx * t, ay + (by - ay) * t, az + dz * t)) return false; } return true; }
  randomNode() { return this.n ? Math.floor(Math.random() * this.n) : -1; }
  // ---- ground-layer API kept for spawns and scenery
  free(x, z) { const k = this.cellIdx(x, z); return k >= 0 && !this.blk[k]; }
  center(k) { return [this.x0 + ((k % this.W) + 0.5) * this.cs, this.z0 + (Math.floor(k / this.W) + 0.5) * this.cs]; }
  nearestFree(x, z, maxRm = 8) {
    const k = this.cellIdx(x, z); if (k >= 0 && !this.blk[k]) return k; const ci = Math.floor((x - this.x0) / this.cs), cj = Math.floor((z - this.z0) / this.cs), maxR = Math.ceil(maxRm / this.cs);
    for (let r = 1; r <= maxR; r++) { let best = -1, bd = 1e9; for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= this.W || j >= this.H) continue; const kk = j * this.W + i; if (this.blk[kk]) continue; const d = di * di + dj * dj; if (d < bd) { bd = d; best = kk; } } if (best >= 0) return best; }
    return -1;
  }
}

class Heap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(k, p) { const K = this.k, P = this.p; let i = K.length; K.push(k); P.push(p); while (i > 0) { const pa = (i - 1) >> 1; if (P[pa] <= p) break; K[i] = K[pa]; P[i] = P[pa]; i = pa; } K[i] = k; P[i] = p; }
  pop() {
    const K = this.k, P = this.p, top = K[0], lk = K.pop(), lp = P.pop();
    if (K.length) { let i = 0; const n = K.length; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && P[c + 1] < P[c]) c++; if (P[c] >= lp) break; K[i] = K[c]; P[i] = P[c]; i = c; } K[i] = lk; P[i] = lp; }
    return top;
  }
}

// ============================================================ WORLD STATE
let world = null;
let enemies = [], pickups = [], barrels = [], grenades = [], remoteList = [];
const RN = [0, 0, 0];
function rayAABB(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1, tmax) {
  let tmin = 0, t1 = tmax, ax = -1, sg = 0;
  if (Math.abs(dx) < 1e-9) { if (ox < x0 || ox > x1) return -1; } else {
    const inv = 1 / dx; let a = (x0 - ox) * inv, b = (x1 - ox) * inv, s = -1; if (a > b) { const t = a; a = b; b = t; s = 1; }
    if (a > tmin) { tmin = a; ax = 0; sg = s; } if (b < t1) t1 = b; if (tmin > t1) return -1;
  }
  if (Math.abs(dy) < 1e-9) { if (oy < y0 || oy > y1) return -1; } else {
    const inv = 1 / dy; let a = (y0 - oy) * inv, b = (y1 - oy) * inv, s = -1; if (a > b) { const t = a; a = b; b = t; s = 1; }
    if (a > tmin) { tmin = a; ax = 1; sg = s; } if (b < t1) t1 = b; if (tmin > t1) return -1;
  }
  if (Math.abs(dz) < 1e-9) { if (oz < z0 || oz > z1) return -1; } else {
    const inv = 1 / dz; let a = (z0 - oz) * inv, b = (z1 - oz) * inv, s = -1; if (a > b) { const t = a; a = b; b = t; s = 1; }
    if (a > tmin) { tmin = a; ax = 2; sg = s; } if (b < t1) t1 = b; if (tmin > t1) return -1;
  }
  RN[0] = RN[1] = RN[2] = 0; if (ax >= 0) RN[ax] = sg;
  return tmin;
}
function raycast(o, d, maxT, withEnemies, ignore) {
  let best = maxT, hb = null, he = null, head = false, nx = 0, ny = 0, nz = 0;
  for (const b of world.boxes) {
    if (b.dead) continue;
    const t = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, best);
    if (t >= 0 && t < best) { best = t; hb = b; nx = RN[0]; ny = RN[1]; nz = RN[2]; }
  }
  if (withEnemies) for (const list of [enemies, remoteList]) for (const e of list) {
    if (e.dead || e === ignore) continue;
    const s = e.s, x = e.pos.x, y = e.pos.y, z = e.pos.z, hy = y + e.h * 0.8;
    let t = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, x - 0.2 * s, hy, z - 0.2 * s, x + 0.2 * s, y + e.h * 1.02, z + 0.2 * s, best);
    if (t >= 0 && t < best) { best = t; he = e; head = true; hb = null; nx = RN[0]; ny = RN[1]; nz = RN[2]; }
    t = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, x - 0.33 * s, y, z - 0.33 * s, x + 0.33 * s, hy, z + 0.33 * s, best);
    if (t >= 0 && t < best) { best = t; he = e; head = false; hb = null; nx = RN[0]; ny = RN[1]; nz = RN[2]; }
  }
  return { t: best, box: hb, enemy: he, head, nx, ny, nz };
}
function los(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz); if (d < 1e-3) return true;
  const ix = dx / d, iy = dy / d, iz = dz / d;
  for (const b of world.boxes) { if (b.dead || b.barrel) continue; if (rayAABB(ax, ay, az, ix, iy, iz, b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, d - 0.05) >= 0) return false; }
  return true;
}

// ============================================================ PHYSICS
const G = 21, STEP = 0.46;
function overlapBox(b, x, y, z, r, h) { return x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1 && y + h > b.y0 + 1e-4 && y < b.y1 - 1e-4; }
function anyOverlap(x, y, z, r, h) { for (const b of world.boxes) if (!b.dead && overlapBox(b, x, y, z, r, h)) return b; return null; }
function moveBody(e, dt) {
  const boxes = world.boxes, wasGround = e.onGround;
  const dx = e.vel.x * dt;
  if (dx) {
    e.pos.x += dx;
    for (const b of boxes) {
      if (b.dead || !overlapBox(b, e.pos.x, e.pos.y, e.pos.z, e.r, e.h)) continue;
      const rise = b.y1 - e.pos.y;
      if (wasGround && rise > 0 && rise <= STEP && !anyOverlap(e.pos.x, b.y1, e.pos.z, e.r, e.h)) { e.pos.y = b.y1; e.stepSmooth -= rise; continue; }
      e.pos.x = dx > 0 ? b.x0 - e.r - 1e-3 : b.x1 + e.r + 1e-3; e.vel.x = 0;
    }
  }
  const dz = e.vel.z * dt;
  if (dz) {
    e.pos.z += dz;
    for (const b of boxes) {
      if (b.dead || !overlapBox(b, e.pos.x, e.pos.y, e.pos.z, e.r, e.h)) continue;
      const rise = b.y1 - e.pos.y;
      if (wasGround && rise > 0 && rise <= STEP && !anyOverlap(e.pos.x, b.y1, e.pos.z, e.r, e.h)) { e.pos.y = b.y1; e.stepSmooth -= rise; continue; }
      e.pos.z = dz > 0 ? b.z0 - e.r - 1e-3 : b.z1 + e.r + 1e-3; e.vel.z = 0;
    }
  }
  e.vel.y -= G * dt;
  const prevY = e.pos.y; e.pos.y += e.vel.y * dt; e.onGround = false; e.ground = null;
  for (const b of boxes) {
    if (b.dead || !overlapBox(b, e.pos.x, e.pos.y, e.pos.z, e.r, e.h)) continue;
    if (e.vel.y <= 0 && prevY >= b.y1 - 0.06) { e.pos.y = b.y1; e.vel.y = 0; e.onGround = true; e.ground = b; }
    else if (e.vel.y > 0 && prevY + e.h <= b.y0 + 0.06) { e.pos.y = b.y0 - e.h - 1e-3; e.vel.y = 0; }
  }
  if (!e.onGround && wasGround && e.vel.y <= 0) { // snap down stairs
    let best = -1e9, gb = null;
    for (const b of boxes) {
      if (b.dead) continue;
      if (e.pos.x + e.r > b.x0 && e.pos.x - e.r < b.x1 && e.pos.z + e.r > b.z0 && e.pos.z - e.r < b.z1 && b.y1 <= e.pos.y + 1e-3 && b.y1 >= e.pos.y - 0.55 && b.y1 > best) { best = b.y1; gb = b; }
    }
    if (gb && !anyOverlap(e.pos.x, best, e.pos.z, e.r, e.h)) { e.stepSmooth += e.pos.y - best; e.pos.y = best; e.vel.y = 0; e.onGround = true; e.ground = gb; }
  }
}

// ============================================================ EFFECTS
const fx = new THREE.Group(); scene.add(fx);
// particles
class Particles {
  constructor(n, additive, size) {
    this.n = n; this.i = 0;
    this.p = new Float32Array(n * 3); this.c = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
    this.v = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grav = new Float32Array(n);
    for (let k = 0; k < n; k++) this.p[k * 3 + 1] = -999;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.c, 3));
    this.geo = g;
    this.mesh = new THREE.Points(g, new THREE.PointsMaterial({ size, map: TEX.dot, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, alphaTest: additive ? 0 : 0.3 }));
    this.mesh.frustumCulled = false; fx.add(this.mesh);
  }
  emit(x, y, z, vx, vy, vz, r, g, b, life, grav = 1) {
    const k = this.i; this.i = (this.i + 1) % this.n; const k3 = k * 3;
    this.p[k3] = x; this.p[k3 + 1] = y; this.p[k3 + 2] = z; this.v[k3] = vx; this.v[k3 + 1] = vy; this.v[k3 + 2] = vz;
    this.base[k3] = r; this.base[k3 + 1] = g; this.base[k3 + 2] = b; this.life[k] = this.max[k] = life; this.grav[k] = grav;
  }
  burst(x, y, z, n, spd, r, g, b, life, grav = 1, nx = 0, ny = 0, nz = 0) {
    for (let i = 0; i < n; i++) {
      let vx = rand(-1, 1), vy = rand(-1, 1), vz = rand(-1, 1); const l = Math.hypot(vx, vy, vz) || 1;
      vx = vx / l + nx; vy = vy / l + ny; vz = vz / l + nz; const s = spd * rand(0.3, 1);
      this.emit(x, y, z, vx * s, vy * s, vz * s, r, g, b, life * rand(0.6, 1.2), grav);
    }
  }
  update(dt) {
    let any = false;
    for (let k = 0; k < this.n; k++) {
      if (this.life[k] <= 0) continue; any = true; const k3 = k * 3;
      this.life[k] -= dt;
      if (this.life[k] <= 0) { this.p[k3 + 1] = -999; continue; }
      this.v[k3 + 1] -= 12 * this.grav[k] * dt;
      const dr = 1 - 1.5 * dt; this.v[k3] *= dr; this.v[k3 + 2] *= dr;
      this.p[k3] += this.v[k3] * dt; this.p[k3 + 1] += this.v[k3 + 1] * dt; this.p[k3 + 2] += this.v[k3 + 2] * dt;
      const f = this.life[k] / this.max[k];
      this.c[k3] = this.base[k3] * f; this.c[k3 + 1] = this.base[k3 + 1] * f; this.c[k3 + 2] = this.base[k3 + 2] * f;
    }
    if (any || this.dirty) { this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.dirty = any; }
  }
}
let sparks, debris;
// tracers
const tracers = [];
const tracerGeo = new THREE.BoxGeometry(1, 1, 1);
function initTracers() {
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; fx.add(m); tracers.push({ m, a: new V3(), b: new V3(), dir: new V3(), len: 0, t: 0, speed: 0, live: false });
  }
}
let tracerI = 0;
function spawnTracer(a, b, color, speed = 320, width = 0.025) {
  const tr = tracers[tracerI]; tracerI = (tracerI + 1) % tracers.length;
  tr.a.copy(a); tr.b.copy(b); tr.dir.subVectors(b, a); tr.len = tr.dir.length(); if (tr.len < 0.5) return; tr.dir.divideScalar(tr.len);
  tr.t = 0; tr.speed = speed; tr.live = true; tr.m.visible = true; tr.m.material.color.setHex(color); tr.w = width;
}
const _ta = new V3(), _tb = new V3();
function updateTracers(dt) {
  for (const tr of tracers) {
    if (!tr.live) continue;
    tr.t += dt; const head = Math.min(tr.len, tr.t * tr.speed), tail = Math.max(0, head - Math.min(4, tr.speed * 0.025));
    if (tail >= tr.len - 0.01) { tr.live = false; tr.m.visible = false; continue; }
    _ta.copy(tr.a).addScaledVector(tr.dir, tail); _tb.copy(tr.a).addScaledVector(tr.dir, head);
    tr.m.position.addVectors(_ta, _tb).multiplyScalar(0.5); tr.m.lookAt(_tb);
    tr.m.scale.set(tr.w, tr.w, Math.max(0.01, head - tail)); tr.m.material.opacity = 0.9;
  }
}
// decals
const decals = []; let decalI = 0;
function initDecals() {
  const g = new THREE.PlaneGeometry(0.16, 0.16);
  const mat = new THREE.MeshBasicMaterial({ map: TEX.decal, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, color: 0x222222 });
  for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(g, mat); m.visible = false; fx.add(m); decals.push(m); }
}
function addDecal(p, nx, ny, nz) {
  const m = decals[decalI]; decalI = (decalI + 1) % decals.length;
  m.position.set(p.x + nx * 0.012, p.y + ny * 0.012, p.z + nz * 0.012);
  m.lookAt(m.position.x + nx, m.position.y + ny, m.position.z + nz); m.rotation.z = Math.random() * 6.28;
  const s = rand(0.7, 1.2); m.scale.set(s, s, s); m.visible = true;
}
// explosion flashes
const booms = [];
const boomGeo = new THREE.SphereGeometry(1, 14, 10);
let boomLight;
function spawnBoom(p, r) {
  const m = new THREE.Mesh(boomGeo, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.copy(p); fx.add(m); booms.push({ m, t: 0, r });
  boomLight.position.copy(p); boomLight.position.y += 1; boomLight.intensity = 260;
}
function updateBooms(dt) {
  for (let i = booms.length - 1; i >= 0; i--) {
    const b = booms[i]; b.t += dt; const k = b.t / 0.35;
    if (k >= 1) { fx.remove(b.m); b.m.material.dispose(); booms.splice(i, 1); continue; }
    const s = b.r * (0.3 + 0.7 * Math.sqrt(k)); b.m.scale.set(s, s, s); b.m.material.opacity = (1 - k) * 0.85;
    b.m.material.color.setHSL(0.08 - k * 0.06, 1, 0.6 - k * 0.3);
  }
  boomLight.intensity = Math.max(0, boomLight.intensity - dt * 1200);
}

// ============================================================ SKY
const skyMat = new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, sunDir: { value: new V3(0, 1, 0) }, sunColor: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vP;
    void main(){ vec3 d = normalize(vP); float h = clamp(d.y*1.4+0.12,0.0,1.0); vec3 c = mix(bottom, top, pow(h,0.65));
    float s = max(dot(d, normalize(sunDir)),0.0); c += sunColor*(pow(s,600.0)*3.0 + pow(s,12.0)*0.25);
    gl_FragColor = vec4(c,1.0);
    #include <colorspace_fragment>
    }`,
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
let stars = null;
function makeStars() {
  const n = 900, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = Math.random(), v = rand(0.05, 1); const th = u * Math.PI * 2, r = Math.sqrt(1 - v * v); p[i * 3] = Math.cos(th) * r * 420; p[i * 3 + 1] = v * 420; p[i * 3 + 2] = Math.sin(th) * r * 420; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }));
}

// ============================================================ BARRELS / PICKUPS
const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.1, 14);
const bandGeo = new THREE.CylinderGeometry(0.41, 0.41, 0.18, 14);
class Barrel {
  constructor(x, z) {
    this.x = x; this.z = z; this.y = 0; this.hp = 30; this.fuse = 0; this.respawn = 0;
    this.box = { x0: x - 0.4, y0: 0, z0: z - 0.4, x1: x + 0.4, y1: 1.1, z1: z + 0.4, m: 'barrel', barrel: this };
    world.boxes.push(this.box);
    this.mesh = new THREE.Group();
    const body = new THREE.Mesh(barrelGeo, new THREE.MeshLambertMaterial({ map: getTex('staves'), color: 0xd8b088 }));
    body.position.y = 0.55; body.castShadow = true; this.mesh.add(body);
    for (const y of [0.12, 0.98]) { const band = new THREE.Mesh(bandGeo, new THREE.MeshLambertMaterial({ color: 0x2c2a28 })); band.position.y = y; band.scale.y = 0.4; this.mesh.add(band); }
    const label = new THREE.Mesh(bandGeo, new THREE.MeshLambertMaterial({ color: 0xa0221c })); label.position.y = 0.55; label.scale.set(1.005, 1.3, 1.005); this.mesh.add(label);
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 6), new THREE.MeshLambertMaterial({ color: 0x3a2a1a })); fuse.position.set(0.15, 1.2, 0); fuse.rotation.z = 0.4; this.mesh.add(fuse);
    this.mesh.position.set(x, 0, z); world.group.add(this.mesh);
  }
  hit(d) { if (this.box.dead || this.fuse > 0) return; this.hp -= d; if (this.hp <= 0) this.fuse = 0.05; }
  update(dt) {
    if (this.fuse > 0) { this.fuse -= dt; if (this.fuse <= 0) this.explode(); return; }
    if (this.box.dead) {
      this.respawn -= dt;
      if (this.respawn <= 0 && Math.hypot(player.pos.x - this.x, player.pos.z - this.z) > 5 && !enemies.some(e => !e.dead && Math.hypot(e.pos.x - this.x, e.pos.z - this.z) < 1.2)) {
        this.box.dead = false; this.hp = 30; this.mesh.visible = true;
      }
    }
  }
  explode() {
    this.box.dead = true; this.mesh.visible = false; this.respawn = 40;
    explosion(new V3(this.x, 0.6, this.z), 6, 150);
  }
}
const hpGeo = new THREE.BoxGeometry(0.55, 0.35, 0.55), crossA = new THREE.BoxGeometry(0.56, 0.12, 0.16), crossB = new THREE.BoxGeometry(0.16, 0.12, 0.56);
const potionGeo = new THREE.SphereGeometry(0.17, 16, 12), roundGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8);
const amGeo = new THREE.BoxGeometry(0.65, 0.34, 0.42), ringGeo = new THREE.RingGeometry(0.45, 0.6, 24);
class Pickup {
  constructor(type, x, y, z, temp) {
    this.type = type; this.pos = new V3(x, y, z); this.active = true; this.timer = 0; this.temp = temp; this.life = temp ? 20 : 0;
    const g = this.mesh = new THREE.Group(); const inner = this.inner = new THREE.Group(); g.add(inner);
    if (type === 'health') { // healing potion
      const glass = new THREE.Mesh(potionGeo, new THREE.MeshPhongMaterial({ color: 0xff3048, emissive: 0x5a0010, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.88 })); inner.add(glass);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.16, 10), new THREE.MeshPhongMaterial({ color: 0xffd0d8, transparent: true, opacity: 0.6, shininess: 90 })); neck.position.y = 0.24; inner.add(neck);
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.07, 10), new THREE.MeshLambertMaterial({ color: 0x8a6a42 })); cork.position.y = 0.34; inner.add(cork);
    } else { // ammunition crate with rounds on top
      inner.add(new THREE.Mesh(amGeo, new THREE.MeshLambertMaterial({ map: getTex('planks'), color: 0x9aa070 })));
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.43), new THREE.MeshLambertMaterial({ color: 0x3a3a30 })); st.position.y = 0.06; inner.add(st);
      for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(roundGeo, GMAT.brass); r.rotation.z = Math.PI / 2; r.position.set(0, 0.2, -0.14 + i * 0.07); inner.add(r); }
    }
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: type === 'health' ? 0x5dff9a : 0xffc933, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring); this.ring = ring;
    g.position.copy(this.pos); world.group.add(g);
  }
  update(dt, t) {
    if (!this.active) { this.timer -= dt; if (this.timer <= 0) { this.active = true; this.mesh.visible = true; } return true; }
    if (this.temp) { this.life -= dt; if (this.life <= 0) { world.group.remove(this.mesh); return false; } this.mesh.visible = this.life > 4 || Math.floor(t * 8) % 2 === 0; }
    this.inner.rotation.y += dt * 1.6; this.inner.position.y = 0.45 + Math.sin(t * 3 + this.pos.x) * 0.08;
    if (!player.alive) return true;
    const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z, dy = player.pos.y - this.pos.y;
    if (dx * dx + dz * dz < 1.3 * 1.3 && dy > -1 && dy < 1.6) {
      if (MP.active) { // multiplayer: the host decides who gets it
        if (MP.pickPending < 0 && this.wants()) { const k = this.idx; MP.pickPending = k; netSend({ t: 'pickreq', k }); setTimeout(() => { if (MP.pickPending === k) MP.pickPending = -1; }, 1000); }
        return true;
      }
      const took = this.apply(false);
      if (took) {
        sfx.play('pickup');
        if (this.temp) { world.group.remove(this.mesh); return false; }
        this.active = false; this.timer = 22; this.mesh.visible = false;
      }
    }
    return true;
  }
  wants() { if (this.type === 'health') return player.hp < player.maxHp; return carry.some(i => isFinite(WEAPONS[i].res) && inv[i].res < WEAPONS[i].maxRes) || player.grenades < cls().nadeMax; }
  apply(force) {
      let took = false;
      if (this.type === 'health' && (force || player.hp < player.maxHp)) { player.hp = Math.min(player.maxHp, player.hp + 50); player.regenCap = Math.max(player.regenCap, Math.ceil(player.hp / 25) * 25); took = true; showHint('+50 HEALTH', '#5dff9a'); }
      if (this.type === 'ammo') {
        let any = false;
        carry.forEach(i => { const w = WEAPONS[i]; if (isFinite(w.res) && inv[i].res < w.maxRes) { inv[i].res = Math.min(w.maxRes, inv[i].res + w.pickup); any = true; } });
        if (player.grenades < cls().nadeMax) { player.grenades++; any = true; }
        if (any || force) { took = true; showHint('+AMMO  +GRENADE', '#ffc933'); }
      }
      return took;
  }
}

// ============================================================ ENEMIES
// ============================================================ CHARACTERS (original fairy-tale cast)
const CG = { sph: new THREE.SphereGeometry(1, 16, 12), cyl: new THREE.CylinderGeometry(1, 1, 1, 12), cylT: new THREE.CylinderGeometry(0.8, 1, 1, 12), box: new THREE.BoxGeometry(1, 1, 1), cone: new THREE.ConeGeometry(1, 1, 12), half: new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), plane: new THREE.PlaneGeometry(1, 1) };
const CHAR = {
  // player classes
  knight: { scale: 1, skin: 0xe2b48c, body: 0x2c4a9a, pants: 0x8e959e, boots: 0x5a5f66, arms: 0xa9b1ba },
  ginger: { scale: 0.85, skin: 0xb5703a, body: 0xb5703a, pants: 0xb5703a, boots: 0xb5703a, arms: 0xb5703a, round: true },
  ogre: { scale: 1.15, skin: 0x86a33a, body: 0xd8cfb0, pants: 0x6b5a3a, boots: 0x3a2a1a, arms: 0x86a33a, bigHead: true },
  fairy: { scale: 0.92, skin: 0xf3d0b0, body: 0xb58be0, pants: 0xf3d0b0, boots: 0x8a5ab0, arms: 0xf3d0b0, slim: true },
  // enemies
  guard: { scale: 1, skin: 0xe2b48c, body: 0xa52a2a, pants: 0x3a3a40, boots: 0x2a2018, arms: 0x8e959e },
  goblin: { scale: 0.9, skin: 0xa3b23e, body: 0x5a4630, pants: 0x4a3a2a, boots: 0x2a2018, arms: 0xa3b23e, slim: true },
  troll: { scale: 1.25, skin: 0x7f8f9a, body: 0x7f8f9a, pants: 0x5a4028, boots: 0x5a6670, arms: 0x7f8f9a, bigHead: true },
  archer: { scale: 1, skin: 0xe2b48c, body: 0x2f5a2f, pants: 0x4a3a2a, boots: 0x2a2018, arms: 0x2f5a2f },
};
function makeProcChar(kind, opt = {}) {
  const D = CHAR[kind] || CHAR.guard, sc = opt.scale || D.scale;
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(sc); g.add(inner);
  const cache = {}; const M = (c, basic) => cache[c + (basic ? 'b' : '')] || (cache[c + (basic ? 'b' : '')] = basic ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshLambertMaterial({ color: c }));
  const add = (geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, parent = inner) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m; };
  const limb = (a, b, r, mat, parent = inner) => { const d = new V3().subVectors(b, a), len = d.length(); const m = new THREE.Mesh(CG.cyl, mat); m.position.addVectors(a, b).multiplyScalar(0.5); m.scale.set(r, len, r); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); m.castShadow = true; parent.add(m); return m; };
  const bodyMat = new THREE.MeshLambertMaterial({ color: D.body }); // hit-flash target
  const skin = M(D.skin), pants = M(D.pants), boots = M(D.boots), arms = M(D.arms), dark = M(0x161616), steel = M(0x9aa3ad), gunM = M(0x1d1e21);
  // legs
  const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-0.12, 0.88, 0); legR.position.set(0.12, 0.88, 0); inner.add(legL, legR);
  for (const L of [legL, legR]) { add(CG.cylT, pants, 0, -0.4, 0, D.slim ? 0.075 : 0.095, 0.8, D.slim ? 0.075 : 0.095, 0, 0, 0, L); add(CG.box, boots, 0, -0.83, 0.04, 0.14, 0.11, 0.26, 0, 0, 0, L); }
  // torso + head
  if (D.round) add(CG.sph, bodyMat, 0, 1.2, 0, 0.28, 0.36, 0.2); else add(CG.box, bodyMat, 0, 1.2, 0, D.slim ? 0.38 : 0.48, 0.64, 0.27);
  add(CG.cyl, skin, 0, 1.55, 0, 0.06, 0.08, 0.06);
  const head = add(CG.sph, skin, 0, 1.7, 0.01, D.bigHead ? 0.19 : 0.155, D.bigHead ? 0.17 : 0.17, D.bigHead ? 0.18 : 0.16);
  for (const sx of [-1, 1]) add(CG.sph, dark, sx * 0.055, 1.72, D.bigHead ? 0.16 : 0.14, 0.022, 0.022, 0.015);
  // arms reach forward to a compact rifle
  const shL = new V3(-0.29, 1.45, 0), shR = new V3(0.29, 1.45, 0), hR = new V3(0.13, 1.26, 0.32), hL = new V3(0.05, 1.3, 0.6);
  const elR = new V3(0.3, 1.2, 0.15), elL = new V3(-0.18, 1.22, 0.32);
  limb(shR, elR, 0.06, arms); limb(elR, hR, 0.052, arms); limb(shL, elL, 0.06, arms); limb(elL, hL, 0.052, arms);
  add(CG.sph, skin, hR.x, hR.y, hR.z, 0.055, 0.055, 0.055); add(CG.sph, skin, hL.x, hL.y, hL.z, 0.055, 0.055, 0.055);
  const out = { group: g, inner, legL, legR, bodyMat, flash: null, wings: null, rsign: 1 };
  // ---- per-character details
  if (kind === 'knight') {
    add(CG.box, steel, 0, 1.2, -0.005, 0.5, 0.62, 0.25); bodyMat.color.setHex(D.body); add(CG.box, bodyMat, 0, 1.12, 0.13, 0.36, 0.6, 0.02);
    add(CG.box, M(0xc9a227), 0, 1.25, 0.145, 0.12, 0.12, 0.01, 0, 0, Math.PI / 4);
    add(CG.cyl, steel, 0, 1.72, 0, 0.175, 0.28, 0.175); add(CG.half, steel, 0, 1.86, 0, 0.175, 0.1, 0.175);
    add(CG.box, dark, 0, 1.73, 0.17, 0.2, 0.025, 0.02); add(CG.cone, M(0xb02020), 0, 1.98, -0.05, 0.05, 0.22, 0.05, -0.5);
    for (const sx of [-1, 1]) add(CG.sph, steel, sx * 0.3, 1.47, 0, 0.11, 0.08, 0.11);
  } else if (kind === 'ginger') {
    const icing = M(0xf8f4ec);
    add(CG.box, icing, 0, 1.6, 0.14, 0.08, 0.012, 0.01); // smile
    for (const [y, c] of [[1.32, 0xd02a2a], [1.2, 0x2a9a3a], [1.08, 0xf8f4ec]]) add(CG.sph, M(c), 0, y, 0.19, 0.035, 0.035, 0.03);
    for (const p of [legL, legR]) add(CG.cyl, icing, 0, -0.68, 0, 0.1, 0.02, 0.1, 0, 0, 0, p);
    add(CG.cyl, icing, hR.x, hR.y, hR.z - 0.05, 0.06, 0.015, 0.06, Math.PI / 2); add(CG.cyl, icing, hL.x, hL.y, hL.z - 0.05, 0.06, 0.015, 0.06, Math.PI / 2);
    for (const sx of [-1, 1]) add(CG.box, icing, sx * 0.08, 1.79, 0.1, 0.05, 0.01, 0.01, 0, 0, sx * 0.3);
  } else if (kind === 'ogre') {
    const vest = M(0x5a3a1e);
    for (const sx of [-1, 1]) add(CG.box, vest, sx * 0.17, 1.22, 0.02, 0.16, 0.62, 0.3);
    add(CG.box, vest, 0, 1.22, -0.13, 0.5, 0.62, 0.03); add(CG.box, M(0x2a1c10), 0, 0.92, 0, 0.5, 0.08, 0.29);
    for (const sx of [-1, 1]) { add(CG.cyl, skin, sx * 0.2, 1.8, 0, 0.025, 0.12, 0.025, 0, 0, sx * 1.0); add(CG.cylT, skin, sx * 0.26, 1.83, 0, 0.045, 0.05, 0.045, 0, 0, sx * 1.0); }
    add(CG.box, skin, 0, 1.77, 0.14, 0.2, 0.04, 0.05); add(CG.sph, skin, 0, 1.68, 0.18, 0.04, 0.035, 0.04);
  } else if (kind === 'fairy') {
    add(CG.cone, bodyMat, 0, 0.92, 0, 0.32, 0.5, 0.32, Math.PI); add(CG.half, M(0xf1d36a), 0, 1.74, -0.01, 0.165, 0.12, 0.17);
    add(CG.sph, M(0xf1d36a), 0, 1.8, -0.15, 0.08, 0.08, 0.08);
    const wm = new THREE.MeshBasicMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
    out.wings = [];
    for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 0.05, 1.35, -0.15); inner.add(piv);
      const w = new THREE.Mesh(CG.plane, wm); w.scale.set(0.5, 0.65, 1); w.position.set(sx * 0.25, 0.1, 0); w.rotation.y = Math.PI / 2 * 0.1; piv.add(w); piv.userData.sx = sx; out.wings.push(piv); }
  } else if (kind === 'guard') {
    add(CG.box, M(0xc9a227), 0, 0.93, 0, 0.5, 0.06, 0.29); add(CG.box, M(0xc9a227), 0, 1.25, 0.14, 0.04, 0.5, 0.01);
    add(CG.cyl, steel, 0, 1.82, 0, 0.27, 0.025, 0.27); add(CG.half, steel, 0, 1.82, 0, 0.165, 0.15, 0.165);
  } else if (kind === 'goblin') {
    for (const sx of [-1, 1]) add(CG.cone, skin, sx * 0.22, 1.74, -0.02, 0.05, 0.24, 0.03, 0, 0, -sx * 1.35);
    add(CG.cone, skin, 0, 1.68, 0.19, 0.03, 0.12, 0.03, Math.PI / 2);
    for (const sx of [-1, 1]) add(CG.sph, M(0xffe060, true), sx * 0.055, 1.73, 0.135, 0.024, 0.02, 0.012);
    add(CG.box, M(0x3a2a1a), 0, 0.95, 0, 0.4, 0.12, 0.28);
  } else if (kind === 'troll') {
    for (const sx of [-1, 1]) add(CG.cone, M(0xf2ead8), sx * 0.07, 1.67, 0.17, 0.02, 0.08, 0.02, -0.3);
    add(CG.box, skin, 0, 1.79, 0.13, 0.28, 0.05, 0.06); add(CG.box, M(0x5a4028), 0, 0.92, 0, 0.52, 0.22, 0.3);
    for (const sx of [-1, 1]) add(CG.sph, M(0xff5a3a, true), sx * 0.06, 1.74, 0.155, 0.022, 0.018, 0.012);
    head.position.z = 0.06;
  } else if (kind === 'archer') {
    add(CG.cone, bodyMat, 0, 1.8, -0.05, 0.2, 0.42, 0.2, -0.35); add(CG.box, bodyMat, 0, 1.05, -0.16, 0.5, 1.0, 0.03, 0.1);
    add(CG.cyl, M(0x5a3a1e), 0.12, 1.3, -0.18, 0.06, 0.5, 0.06, 0.4);
  }
  if (kind === 'witch') { add(CG.cylT, M(0x1a1020), 0, 1.86, 0, 0.28, 0.02, 0.28); add(CG.cone, M(0x1a1020), 0, 2.07, -0.04, 0.13, 0.42, 0.13, -0.25); }
  if (kind === 'wolf') { for (const sx of [-1, 1]) add(CG.cone, M(0x5a524a), sx * 0.08, 1.86, -0.02, 0.05, 0.13, 0.03, 0, 0, -sx * 0.25); add(CG.box, M(0x6a625a), 0, 1.67, 0.17, 0.09, 0.07, 0.14); }
  return out;
}
// ============================================================ REALISTIC CHARACTERS (rigged + animated soldier, per-class tint & props)
// The animated base mesh is three.js's "Soldier" example (Mixamo). Falls back to procedural models if it can't load.
Object.assign(CHAR, {
  wolf: { scale: 1.02, skin: 0x7a7068, body: 0x5a4e46, pants: 0x3a3430, boots: 0x2a2420, arms: 0x7a7068, tint: 0x8a8278 },
  witch: { scale: 0.95, skin: 0x9ac08a, body: 0x3a2a4a, pants: 0x2a1a3a, boots: 0x1a1018, arms: 0x3a2a4a, slim: true, tint: 0x8a70a8 },
});
const TINT = { knight: 0xe6eaf2, ginger: 0xd08a4a, ogre: 0x9ccc5c, fairy: 0xe2c6ff, wolf: 0x8e867c, witch: 0x8a6aaa, guard: 0xe48070, goblin: 0xc6d06a, troll: 0x9aaab8, archer: 0x7aaa78 };
const VISOR = { knight: 0x2a3550, ogre: 0x2a3a1a, ginger: 0x3a2010, fairy: 0x6a3a9a, wolf: 0x201a18, witch: 0x2a102a, guard: 0x401010, goblin: 0x3a3a10, troll: 0x202830, archer: 0x103010 };
const _ik = { s: new V3(), e: new V3(), h: new V3(), u: new V3(), p: new V3(), el: new V3(), qa: new THREE.Quaternion(), qb: new THREE.Quaternion(), dc: new V3(), dd: new V3(), t1: new V3(), t2: new V3(), pole: new V3() };
function aimBone(bone, child, target) {
  bone.getWorldPosition(_ik.t1); child.getWorldPosition(_ik.t2);
  _ik.dc.subVectors(_ik.t2, _ik.t1).normalize(); _ik.dd.subVectors(target, _ik.t1).normalize();
  _ik.qa.setFromUnitVectors(_ik.dc, _ik.dd); bone.getWorldQuaternion(_ik.qb); _ik.qb.premultiply(_ik.qa);
  bone.parent.getWorldQuaternion(_ik.qa).invert(); bone.quaternion.copy(_ik.qa.multiply(_ik.qb)); bone.updateMatrixWorld(true);
}
function ikArm(o, side, target, pole) {
  const B = o.bones, up = B[side + 'Arm'], fo = B[side + 'ForeArm'], ha = B[side + 'Hand']; if (!up || !fo || !ha) return;
  up.getWorldPosition(_ik.s); fo.getWorldPosition(_ik.e); ha.getWorldPosition(_ik.h);
  const a = _ik.s.distanceTo(_ik.e), b = _ik.e.distanceTo(_ik.h); let d = _ik.s.distanceTo(target);
  _ik.u.subVectors(target, _ik.s).normalize(); d = clamp(d, Math.abs(a - b) + 1e-3, (a + b) * 0.999);
  const x = (a * a - b * b + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a * a - x * x));
  _ik.p.copy(pole).addScaledVector(_ik.u, -pole.dot(_ik.u)).normalize();
  _ik.el.copy(_ik.s).addScaledVector(_ik.u, x).addScaledVector(_ik.p, hh);
  aimBone(up, fo, _ik.el); aimBone(fo, ha, target);
}
function makeSoldierChar(kind, opt) {
  const D = CHAR[kind] || CHAR.guard, sc = opt.scale || D.scale, A = window.BP_ASSETS.soldier;
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(sc); g.add(inner);
  const root = window.BP_SkeletonUtils.clone(A.scene); root.rotation.y = Math.PI; inner.add(root); // model faces -Z; game characters face +Z
  let bodyMat = null; const bones = {};
  root.traverse(o => {
    if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    if (o.isMesh) {
      o.castShadow = true; o.frustumCulled = false; const old = o.material;
      if (/visor/i.test(o.name) || /visor/i.test(old.name)) o.material = new THREE.MeshPhongMaterial({ color: VISOR[kind] || 0x222a33, specular: 0xffffff, shininess: 90 });
      else { o.material = new THREE.MeshLambertMaterial({ map: old.map, color: TINT[kind] || 0xffffff }); bodyMat = o.material; }
    }
  });
  const mixer = new THREE.AnimationMixer(root), act = {};
  for (const c of A.animations) act[c.name] = mixer.clipAction(c);
  (act.Idle || Object.values(act)[0]).play();
  g.updateMatrixWorld(true);
  const rp = new V3(); if (bones.RightArm) { bones.RightArm.getWorldPosition(rp); inner.worldToLocal(rp); }
  const out = { group: g, inner, bodyMat, mixer, act, bones, animState: 'Idle', legL: null, legR: null, skinned: true, rsign: rp.x >= 0 ? 1 : -1, wings: null };
  out.headAcc = new THREE.Group(); out.chestAcc = new THREE.Group(); inner.add(out.headAcc, out.chestAcc);
  addAccessories(kind, out);
  return out;
}
function addAccessories(kind, o) {
  const H = o.headAcc, C = o.chestAcc, Lm = c => new THREE.MeshLambertMaterial({ color: c });
  const add = (par, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; par.add(m); return m; };
  const s = o.rsign;
  if (kind === 'knight') { add(H, CG.cone, Lm(0xb02020), 0, 0.27, -0.03, -0.4, 0, 0, 0.045, 0.22, 0.045); add(C, CG.box, Lm(0x2c4a9a), 0, 0.0, 0.13, 0, 0, 0, 0.32, 0.45, 0.02); add(C, CG.box, GMAT.gold, 0, 0.05, 0.142, 0, 0, Math.PI / 4, 0.1, 0.1, 0.01); }
  else if (kind === 'ogre') for (const sd of [-1, 1]) { add(H, CG.cyl, Lm(0x86a33a), sd * 0.12, 0.14, 0, 0, 0, sd * 1.0, 0.025, 0.12, 0.025); add(H, CG.cylT, Lm(0x86a33a), sd * 0.175, 0.17, 0, 0, 0, sd * 1.0, 0.045, 0.05, 0.045); }
  else if (kind === 'ginger') { for (const [y, c] of [[0.1, 0xd02a2a], [-0.02, 0x2a9a3a], [-0.14, 0xf8f4ec]]) add(C, CG.sph, Lm(c), 0, y, 0.15, 0, 0, 0, 0.035, 0.035, 0.03); }
  else if (kind === 'fairy') { const wm = new THREE.MeshBasicMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }); o.wings = [];
    for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sd * 0.05, 0.05, -0.15); C.add(piv); const w = new THREE.Mesh(CG.plane, wm); w.scale.set(0.5, 0.7, 1); w.position.set(sd * 0.26, 0.12, 0); piv.add(w); piv.userData.sx = sd; o.wings.push(piv); } }
  else if (kind === 'witch') { add(H, CG.cylT, Lm(0x1a1020), 0, 0.2, 0, 0, 0, 0, 0.28, 0.02, 0.28); add(H, CG.cone, Lm(0x1a1020), 0, 0.42, -0.04, -0.25, 0, 0, 0.13, 0.42, 0.13); add(H, CG.cyl, Lm(0x7a3aa0), 0, 0.235, 0, 0, 0, 0, 0.135, 0.04, 0.135); }
  else if (kind === 'wolf') { for (const sd of [-1, 1]) add(H, CG.cone, Lm(0x5a524a), sd * 0.08, 0.27, -0.02, 0, 0, -sd * 0.25, 0.05, 0.13, 0.03); add(H, CG.box, Lm(0x6a625a), 0, 0.08, 0.15, 0.15, 0, 0, 0.09, 0.07, 0.14); add(H, CG.sph, Lm(0x111111), 0, 0.1, 0.225, 0, 0, 0, 0.025, 0.02, 0.02); }
  else if (kind === 'guard') { add(H, CG.cyl, Lm(0x9aa3ad), 0, 0.2, 0, 0, 0, 0, 0.26, 0.02, 0.26); add(C, CG.box, Lm(0xa52a2a), 0, -0.02, 0.13, 0, 0, 0, 0.34, 0.5, 0.02); }
  else if (kind === 'goblin') for (const sd of [-1, 1]) add(H, CG.cone, Lm(0xa3b23e), sd * 0.16, 0.13, 0, 0, 0, -sd * 1.3, 0.04, 0.22, 0.025);
  else if (kind === 'troll') { for (const sd of [-1, 1]) add(H, CG.cone, Lm(0xf2ead8), sd * 0.06, 0.04, 0.13, -0.3, 0, 0, 0.02, 0.08, 0.02); }
  else if (kind === 'archer') add(H, CG.cone, Lm(0x2f5a2f), 0, 0.2, -0.08, -0.6, 0, 0, 0.17, 0.4, 0.17);
}
function makeCharacter(kind, opt = {}) {
  let o = null;
  try { if (window.BP_ASSETS && window.BP_ASSETS.soldier && window.BP_SkeletonUtils && settings.quality !== 'low') o = makeSoldierChar(kind, opt); } catch (e) { console.warn('soldier model failed, using fallback', e); o = null; }
  if (!o) o = makeProcChar(kind, opt);
  o.kind = kind; setCharWeapon(o, opt.weapon || 'rifle');
  if (opt.sash !== undefined) { const m = new THREE.Mesh(CG.box, new THREE.MeshBasicMaterial({ color: opt.sash })); m.scale.set(0.5, 0.07, 0.3); m.rotation.z = 0.7; m.position.y = o.skinned ? 0 : 1.22; (o.chestAcc || o.inner).add(m); }
  return o;
}
function setCharWeapon(o, id) {
  if (o.weaponId === id && o.gunHolder) return;
  if (o.gunHolder) o.inner.remove(o.gunHolder);
  const gm = buildGun(id, {}, false); gm.g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  const holder = new THREE.Group(); gm.g.rotation.y = Math.PI; holder.add(gm.g);
  const gp = gm.gripPt.position, s = o.rsign || 1;
  holder.position.set(0.12 * s, 1.24, 0.24); gm.g.position.set(gp.x, -gp.y, gp.z); // put the grip at the holder origin
  if (gm.forePt === null || !gm.forePt) holder.rotation.x = -0.6; // melee: blade raised
  o.inner.add(holder); o.gunHolder = holder; o.gun = gm; o.weaponId = id;
  o.flash = gm.flash; gm.flash.scale.set(0.45, 0.45, 0.45);
  o.muzzlePt = gm.muzzlePt;
}
const _cv = new V3(), _cf = new V3(), _cr = new V3();
function animChar(o, dt, speed, pitch = 0) {
  if (o.gunHolder) o.gunHolder.rotation.x = (o.gun && !o.gun.forePt ? -0.6 : 0) - pitch;
  if (o.mixer) {
    const st = speed < 0.4 ? 'Idle' : speed < 3.4 ? 'Walk' : 'Run';
    if (st !== o.animState && o.act[st]) { const from = o.act[o.animState], to = o.act[st]; to.reset(); to.play(); if (from) from.crossFadeTo(to, 0.25, false); o.animState = st; }
    if (o.act.Walk) o.act.Walk.timeScale = clamp(speed / 1.6, 0.6, 1.7); if (o.act.Run) o.act.Run.timeScale = clamp(speed / 5, 0.7, 1.4);
    o.mixer.update(dt);
    o.group.updateMatrixWorld(true);
    // inverse kinematics: hands onto the weapon
    const yaw = o.group.rotation.y; _cf.set(Math.sin(yaw), 0, Math.cos(yaw)); _cr.set(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(o.rsign);
    if (o.gun && o.gun.gripPt) { o.gun.gripPt.getWorldPosition(_cv); _ik.pole.set(0, -1, 0).addScaledVector(_cr, 0.8).addScaledVector(_cf, -0.3); ikArm(o, 'Right', _cv, _ik.pole); }
    if (o.gun && o.gun.forePt) { o.gun.forePt.getWorldPosition(_cv); _ik.pole.set(0, -1, 0).addScaledVector(_cr, -0.8); ikArm(o, 'Left', _cv, _ik.pole); }
    if (o.bones.Head) { o.bones.Head.getWorldPosition(_cv); o.inner.worldToLocal(_cv); o.headAcc.position.copy(_cv); }
    if (o.bones.Spine2) { o.bones.Spine2.getWorldPosition(_cv); o.inner.worldToLocal(_cv); o.chestAcc.position.copy(_cv); }
  } else {
    o.walk = (o.walk || 0) + Math.min(speed, 9) * dt * 2.4; const sw = Math.sin(o.walk) * Math.min(speed / 3, 1) * 0.7;
    if (o.legL) { o.legL.rotation.x = sw; o.legR.rotation.x = -sw; }
  }
  flapWings(o, performance.now() / 1000);
}

function flapWings(o, t) { if (o.wings) for (const w of o.wings) w.rotation.y = w.userData.sx * (0.35 + Math.sin(t * 22) * 0.35); }

const _v1 = new V3(), _v2 = new V3(), _v3 = new V3();
// ============================================================ BOTS — human-like aim, cover, flanking, reloads, grenades, hearing
const ETYPES = {
  grunt: { model: 'guard', name: 'Royal Guard', hp: 100, speed: 4.2, scale: 1, weapon: 'rifle', dmgScale: 0.42, skill: 0.75, sight: 70, reaction: 0.5, score: 100, nades: 0.35 },
  rusher: { model: 'goblin', name: 'Goblin', hp: 75, speed: 6.4, scale: 0.9, weapon: 'shotgun', dmgScale: 0.5, skill: 0.8, sight: 60, reaction: 0.3, score: 120, rush: true },
  heavy: { model: 'troll', name: 'Troll', hp: 300, speed: 2.8, scale: 1.25, weapon: 'lmg', dmgScale: 0.32, skill: 0.7, sight: 70, reaction: 0.65, score: 220 },
  sniper: { model: 'archer', name: 'Marksman', hp: 80, speed: 3.6, scale: 1, weapon: 'sniper', dmgScale: 0.42, skill: 1.05, sight: 100, reaction: 0.6, score: 160, sniper: true, aim: 1.1 },
};
const BOT_NAMES = ['Sir Lancelot', 'Gretel', 'Hansel', 'Rumpel', 'Goldilocks', 'Jack', 'Red Hood', 'Old King Cole', 'Little John', 'Rapunzel', 'Tom Thumb', 'Bo Peep', 'Sir Galahad', 'Pied Piper', 'Snowdrop', 'Woodcutter', 'Grumpkin', 'Mother Goose', 'Thumbelina', 'Prince Charming'];
const BOT_SKILL = { easy: 0.6, normal: 0.92, hard: 1.25 }, BOT_DMG = { easy: 0.55, normal: 0.8, hard: 1.0 };
const PREF_RANGE = { shotgun: [3, 9], smg: [5, 14], pistol: [6, 15], revolver: [6, 16], rifle: [10, 26], ak: [10, 24], lmg: [12, 30], dmr: [20, 45], sniper: [25, 60] };
const isAlly = (a, b) => !!(BD.teams && game.mode === 'botdm' && a && b && a.team >= 0 && a.team === b.team);
const PLAYER_T = { get team() { return BD.teams ? 0 : -1; }, isPlayer: true, get pos() { return player.pos; }, get vel() { return player.vel; }, get h() { return player.h + 0.07; }, get dead() { return !player.alive; }, s: 1, name: 'You' };
// noise: wakes bots up and pulls them toward fights
function noise(p, radius, src) {
  for (const e of enemies) {
    if (e.dead || e === src || isAlly(src, e)) continue; const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z); if (d > radius) continue;
    if (e.visible) continue; e.alertT = 4;
    if (!e.bot || src === PLAYER_T || !e.target) { e.investigate = new V3(p.x + rand(-3, 3) * d / radius, p.y, p.z + rand(-3, 3) * d / radius); if (src) e.target = src; e.lostT = Math.min(e.lostT, 1); e.repathT = 0; }
  }
}
const _ea = new V3(), _eb = new V3(), _ed = new V3(), _eo = new V3();
class Enemy {
  constructor(type, x, z, wave, opt = {}) {
    this.bot = type === 'bot'; this.type = type;
    const T = this.T = this.bot ? opt.T : ETYPES[type];
    this.W = WEAPONS[widx(T.weapon)];
    const D = DIFF[settings.difficulty];
    this.skill = clamp((this.bot ? BOT_SKILL[settings.botDiff || 'normal'] : (T.skill || 1) * D.acc) * rand(0.85, 1.15), 0.3, 1.6);
    this.dmgMul = this.bot ? BOT_DMG[settings.botDiff || 'normal'] * 0.85 : T.dmgScale * D.dmg;
    this.maxHp = this.hp = Math.round(this.bot ? T.hp : T.hp * D.hp * (1 + 0.04 * (wave - 1)));
    this.s = T.scale; this.r = 0.34 * T.scale; this.h = 1.82 * T.scale; this.name = opt.name || T.name;
    this.pos = new V3(x, (opt.y || 0) + 0.05, z); this.vel = new V3(); this.onGround = false; this.stepSmooth = 0;
    this.yaw = Math.atan2(player.pos.x - x, player.pos.z - z); this.aimYaw = this.yaw; this.aimPitch = 0; this.errX = 0; this.errY = 0; this.recoilP = 0;
    this.path = null; this.pi = 0; this.repathT = 0; this.goal = null;
    this.target = this.bot ? null : PLAYER_T; this.visible = false; this.seeT = 0; this.lostT = 0; this.losT = rand(0, 0.2); this.alertT = 0;
    this.lastKnown = new V3(player.pos.x + rand(-8, 8), player.pos.y, player.pos.z + rand(-8, 8)); this.investigate = this.bot ? null : this.lastKnown.clone();
    this.mag = this.W.mag; this.reloadT = 0; this.fireT = rand(0.3, 0.8); this.burst = 0; this.aimT = 0;
    this.grenades = this.bot ? 1 : Math.random() < (T.nades || 0) ? 1 : 0; this.nadeCD = rand(4, 8);
    this.state = 'hunt'; this.cover = null; this.coverT = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 0; this.jumpCD = rand(1, 3);
    this.flashT = 0; this.mflash = 0; this.dead = false; this.deadT = 0; this.stuckT = 0; this.lastPos = this.pos.clone(); this.lastFired = -99; this.spawnT = 0.5;
    this.lookT = 0; this.lookYaw = 0; this.attacker = null; this.headPref = Math.random() < 0.18 * this.skill;
    Object.assign(this, makeCharacter(T.model, { scale: T.scale, weapon: this.W.id, sash: opt.sash }));
    this.group.position.copy(this.pos); world.group.add(this.group);
    if (T.sniper) {
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      this.laser = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.85 })); this.laser.frustumCulled = false; this.laser.visible = false; world.group.add(this.laser);
    }
  }
  get canSee() { return this.visible; }
  eye(out) { return out.set(this.pos.x, this.pos.y + 1.62 * this.s, this.pos.z); }
  gunPos(out) { if (this.muzzlePt) { this.muzzlePt.getWorldPosition(out); return out; } return this.eye(out); }
  candidates() { const l = []; if (player.alive && (!MP.active) && !isAlly(this, PLAYER_T)) l.push(PLAYER_T); if (this.bot) for (const e of enemies) if (e !== this && !e.dead && e.bot && !isAlly(this, e)) l.push(e); return l; }
  aimPoint(t, out, head) { const hh = t.isPlayer ? player.h - 0.12 : t.h * (head ? 0.9 : 0.62); return out.set(t.pos.x, t.pos.y + (t.isPlayer ? (head ? hh : hh - 0.45) : hh), t.pos.z); }
  perceive() {
    const e = this.eye(_ea); let best = null, bs = 1e9;
    for (const c of this.candidates()) {
      const p = this.aimPoint(c, _eb, false), dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz); if (d > this.T.sight) continue;
      const ang = Math.abs(angDiff(this.yaw, Math.atan2(dx, dz)));
      if (ang > (this.alertT > 0 ? 2.4 : 1.25) && d > 4) continue;
      if (!los(e.x, e.y, e.z, p.x, p.y, p.z)) { const hp = this.aimPoint(c, _ed, true); if (!los(e.x, e.y, e.z, hp.x, hp.y, hp.z)) continue; }
      const sc = d * (c === this.target ? 0.6 : 1) * (c === this.attacker ? 0.5 : 1); if (sc < bs) { bs = sc; best = c; }
    }
    if (best) { if (best !== this.target) { this.seeT = 0; this.errX = rand(-1, 1) * 0.09 / this.skill; this.errY = rand(-1, 1) * 0.05 / this.skill; } this.target = best; this.visible = true; this.lastKnown.copy(best.pos); this.lostT = 0; }
    else this.visible = false;
  }
  findCover() { // a nearby reachable spot the target cannot see
    if (!this.target) return null; const t = this.aimPoint(this.target, _eb, true), nav = world.nav; let best = null, bd = 1e9;
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2 + rand(0, 0.3), r = rand(2.5, 10), x = this.pos.x + Math.cos(a) * r, z = this.pos.z + Math.sin(a) * r;
      const n = nav.nodeAt(x, this.pos.y, z, 1); if (n < 0) continue; const [nx, ny, nz] = nav.nodePos(n); if (Math.abs(ny - this.pos.y) > 1.5) continue;
      if (los(t.x, t.y, t.z, nx, ny + 1.3 * this.s, nz)) continue;
      const d = Math.hypot(nx - this.pos.x, nz - this.pos.z) + Math.hypot(nx - this.target.pos.x, nz - this.target.pos.z) * -0.15; if (d < bd) { bd = d; best = new V3(nx, ny, nz); }
    }
    return best;
  }
  setGoal(p, run) { if (!p) return; if (!this.goal || this.goal.distanceTo(p) > 1.2) { this.goal = p.clone(); this.repathT = 0; } this.run = !!run; }
  followPath(dt) { // returns desired horizontal direction
    const nav = world.nav; if (!this.goal) return null;
    this.repathT -= dt;
    if (this.repathT <= 0 || !this.path) { this.repathT = rand(0.7, 1.2); this.path = nav.pathTo(this.pos.x, this.pos.y, this.pos.z, this.goal.x, this.goal.y, this.goal.z); this.pi = 0; }
    if (!this.path || this.pi >= this.path.length) return null;
    for (let k = 0; k < 2 && this.pi + 1 < this.path.length; k++) { const q = this.path[this.pi + 1]; if (Math.abs(q[1] - this.pos.y) < 0.3 && nav.lineFreeAt(this.pos.x, this.pos.y, this.pos.z, q[0], q[1], q[2])) this.pi++; else break; }
    const w = this.path[this.pi], wx = w[0] - this.pos.x, wz = w[2] - this.pos.z, wd = Math.hypot(wx, wz);
    if (wd < 0.45 && Math.abs(w[1] - this.pos.y) < 1.4) { this.pi++; return null; }
    return [wx / wd, wz / wd];
  }
  update(dt) {
    if (this.dead) {
      this.deadT += dt; const k = Math.min(this.deadT / 0.5, 1); this.group.rotation.x = -this.fallDir * k * k * 1.45;
      if (this.deadT > 2.5) this.group.position.y -= dt * 0.7;
      if (this.deadT > 4) { world.group.remove(this.group); if (this.laser) world.group.remove(this.laser); return false; }
      return true;
    }
    const T = this.T, W = this.W;
    if (this.spawnT > 0) { this.spawnT -= dt; this.group.scale.set(1, clamp(1 - this.spawnT / 0.5, 0.05, 1), 1); }
    this.alertT -= dt; this.nadeCD -= dt; this.jumpCD -= dt;
    // ---- perception
    this.losT -= dt; if (this.losT <= 0) { this.losT = 0.1 + Math.random() * 0.08; this.perceive(); }
    if (this.target && this.target.dead) { this.target = this.bot ? null : PLAYER_T; this.visible = false; }
    if (this.visible) this.seeT += dt; else { this.seeT = 0; this.lostT += dt; }
    if (!this.bot && !this.visible && this.lostT > 3.5) { this.lostT = 1.5; this.investigate = new V3(player.pos.x + rand(-6, 6), player.pos.y, player.pos.z + rand(-6, 6)); } // survival: they always sense you eventually
    // ---- reload
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) { this.mag = W.mag; if (Math.hypot(this.pos.x - player.pos.x, this.pos.z - player.pos.z) < 18) sfx.play('magin', spatial(this.pos)); } }
    else if (this.mag <= 0 || (!this.visible && this.mag < W.mag * 0.35 && this.lostT > 1)) this.startReload();
    // ---- decide where to go
    const t = this.target, dist = t ? Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z) : 99;
    const pr = PREF_RANGE[W.id] || [8, 20];
    let mx = 0, mz = 0, spd = T.speed * 0.6, wantRun = false;
    const hurt = this.hp < this.maxHp * 0.4;
    if (this.visible && t) {
      this.investigate = null;
      if ((hurt || this.reloadT > 0) && this.state !== 'cover' && Math.random() < dt * 2 && !T.rush) { const c = this.findCover(); if (c) { this.state = 'cover'; this.cover = c; this.coverT = rand(1.4, 2.8); } }
      if (this.state === 'cover' && this.cover) { this.setGoal(this.cover, true); const d = this.followPath(dt); if (d) { mx = d[0]; mz = d[1]; spd = T.speed; } }
      else {
        this.state = 'engage';
        const ux = (t.pos.x - this.pos.x) / (dist || 1), uz = (t.pos.z - this.pos.z) / (dist || 1), nav = world.nav;
        this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = Math.random() < 0.7 ? -this.strafe : this.strafe; this.strafeT = rand(0.35, 1.4) / Math.max(0.6, this.skill); }
        let sx = -uz * this.strafe, sz = ux * this.strafe;
        if (!nav.freeAt(this.pos.x + sx * 1.2, this.pos.y, this.pos.z + sz * 1.2)) { this.strafe *= -1; sx = -sx; sz = -sz; }
        const still = T.sniper || (W.id === 'sniper' || W.id === 'lmg') && Math.random() < 0.6;
        if (T.rush || dist > pr[1] + 4) { this.setGoal(t.pos, false); const d = this.followPath(dt); if (d) { mx = d[0]; mz = d[1]; } if (T.rush) { spd = T.speed; if (dist < 6 && nav.lineFreeAt(this.pos.x, this.pos.y, this.pos.z, t.pos.x, t.pos.y, t.pos.z)) { mx = ux + sx * 0.4; mz = uz + sz * 0.4; } } }
        else if (dist < pr[0] && nav.freeAt(this.pos.x - ux * 1.2, this.pos.y, this.pos.z - uz * 1.2)) { mx = -ux * 0.8 + sx * 0.5; mz = -uz * 0.8 + sz * 0.5; }
        else if (!still) { mx = sx; mz = sz; spd = T.speed * (0.45 + 0.25 * this.skill); }
        if (this.aimT > 0) { mx = mz = 0; }
        if (this.jumpCD <= 0 && this.onGround && dist < 16 && Math.random() < dt * 0.6 * this.skill && !T.sniper) { this.vel.y = 6.8; this.jumpCD = rand(2.5, 6); }
      }
    } else {
      if (this.state === 'cover' && this.cover) { // hide, then peek out toward the last known position
        this.setGoal(this.cover, true); const d = this.followPath(dt); if (d) { mx = d[0]; mz = d[1]; spd = T.speed; } else { this.coverT -= dt; if (this.coverT <= 0 && this.reloadT <= 0) { this.state = 'hunt'; this.cover = null; if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 20); this.investigate = this.lastKnown.clone(); } }
      } else {
        // grenade the spot they were last seen hiding behind
        if (this.grenades > 0 && this.nadeCD <= 0 && t && this.lostT > 1.5 && this.lostT < 6) { const d = this.pos.distanceTo(this.lastKnown); if (d > 7 && d < 22) this.throwNade(this.lastKnown); }
        // flank: approach the last known position from the side instead of head-on
        if (t && this.lostT > 2 && this.lostT < 2.1 && this.skill > 0.8 && Math.random() < 0.5) {
          const ux = this.lastKnown.x - this.pos.x, uz = this.lastKnown.z - this.pos.z, l = Math.hypot(ux, uz) || 1, side = Math.random() < 0.5 ? 1 : -1;
          const n = world.nav.nodeAt(this.lastKnown.x - uz / l * 9 * side, this.lastKnown.y, this.lastKnown.z + ux / l * 9 * side, 3); if (n >= 0) { const [x, y, z] = world.nav.nodePos(n); this.investigate = new V3(x, y, z); this.state = 'flank'; }
        }
        let goal = this.investigate || (t ? this.lastKnown : null);
        if (!goal && this.bot) { // roam
          if ((!this.roam || this.pos.distanceTo(this.roam) < 2) && isAlly(this, PLAYER_T) && player.alive && Math.random() < 0.6) this.roam = new V3(player.pos.x + rand(-6, 6), player.pos.y, player.pos.z + rand(-6, 6));
          if (!this.roam || this.pos.distanceTo(this.roam) < 2) { const n = world.nav.randomNode(); if (n >= 0) { const [x, y, z] = world.nav.nodePos(n); this.roam = new V3(x, y, z); } }
          goal = this.roam;
        }
        if (goal) {
          this.setGoal(goal, this.pos.distanceTo(goal) > 12); const d = this.followPath(dt); spd = T.speed * (this.run ? 1 : 0.7); wantRun = this.run;
          if (d) { mx = d[0]; mz = d[1]; } else if (this.pos.distanceTo(goal) < 2.2) { // arrived: look around
            if (this.investigate) { this.investigate = null; this.lookT = rand(1.5, 3); this.state = 'hunt'; }
          }
        }
      }
    }
    // separation
    for (const o of enemies) { if (o === this || o.dead) continue; const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, d2 = ox * ox + oz * oz; if (d2 < 1.44 && d2 > 1e-4 && Math.abs(o.pos.y - this.pos.y) < 1.5) { const d = Math.sqrt(d2); mx += ox / d * (1.2 - d) * 1.6; mz += oz / d * (1.2 - d) * 1.6; } }
    { const px = this.pos.x - player.pos.x, pz = this.pos.z - player.pos.z, d = Math.hypot(px, pz); if (d < 1.0 && d > 1e-3 && Math.abs(player.pos.y - this.pos.y) < 1.5) { mx += px / d * 1.5; mz += pz / d * 1.5; } }
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    const k = this.onGround ? 10 : 1.5;
    this.vel.x = damp(this.vel.x, mx * spd, k, dt); this.vel.z = damp(this.vel.z, mz * spd, k, dt);
    this.stepSmooth = 0; moveBody(this, dt);
    if (this.pos.y < -10) { this.hp = 0; this.die(false, true); return true; }
    this.stuckT += dt;
    if (this.stuckT > 1.0) { const moved = Math.hypot(this.pos.x - this.lastPos.x, this.pos.z - this.lastPos.z); if (ml > 0.3 && spd > 0 && moved < 0.25) { this.repathT = 0; this.path = null; this.vel.x += rand(-3, 3); this.vel.z += rand(-3, 3); this.strafe *= -1; if (this.onGround && Math.random() < 0.4) this.vel.y = 6; } this.lastPos.copy(this.pos); this.stuckT = 0; }
    // ---- aim (human-like: limited turn speed, settling error, recoil)
    const hs = Math.hypot(this.vel.x, this.vel.z);
    let dYaw, dPitch;
    if (t && (this.visible || this.lostT < 1.2)) {
      const ap = this.aimPoint(t, _eb, this.headPref), e = this.eye(_ea), lead = 0.08 + (1.2 - this.skill) * 0.05;
      if (t.vel) { ap.x += t.vel.x * lead; ap.z += t.vel.z * lead; }
      dYaw = Math.atan2(ap.x - e.x, ap.z - e.z); dPitch = Math.atan2(ap.y - e.y, Math.hypot(ap.x - e.x, ap.z - e.z));
      if (t.vel) { const lat = Math.abs(t.vel.x * Math.cos(dYaw) - t.vel.z * Math.sin(dYaw)) / Math.max(4, dist); this.errX += rand(-1, 1) * lat * dt * 1.6 / this.skill; }
    } else if (this.lookT > 0) { this.lookT -= dt; if (Math.random() < dt * 1.2) this.lookYaw = this.yaw + rand(-1.6, 1.6); dYaw = this.lookYaw; dPitch = 0; }
    else { dYaw = hs > 0.5 ? Math.atan2(this.vel.x, this.vel.z) : this.aimYaw; dPitch = 0; }
    const maxTurn = (2.2 + 4.2 * this.skill) * dt, dy = angDiff(this.aimYaw, dYaw);
    this.aimYaw += clamp(dy * (1 - Math.exp(-9 * dt)), -maxTurn, maxTurn);
    this.aimPitch = damp(this.aimPitch, dPitch, 8, dt);
    this.errX *= Math.exp(-dt * (1.2 + 2.2 * this.skill)); this.errY *= Math.exp(-dt * (1.2 + 2.2 * this.skill));
    this.errX += rand(-1, 1) * 0.0025; this.errY += rand(-1, 1) * 0.0018;
    this.recoilP *= Math.exp(-dt * (4 + 4 * this.skill));
    this.yaw += angDiff(this.yaw, this.aimYaw) * (1 - Math.exp(-14 * dt));
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z); this.group.rotation.y = this.yaw;
    animChar(this, dt, hs, this.aimPitch + this.recoilP);
    if (this.flashT > 0) { this.flashT -= dt; const f = Math.max(0, this.flashT / 0.12); this.bodyMat.emissive.setRGB(f, f * 0.9, f * 0.9); }
    else if (player.pulseT > 0) { const q = 0.35 + 0.25 * Math.sin(game.time * 6); this.bodyMat.emissive.setRGB(q, q * 0.6, 0); } else this.bodyMat.emissive.setRGB(0, 0, 0);
    if (this.mflash > 0) { this.mflash -= dt; if (this.flash) { this.flash.visible = this.mflash > 0; this.flash.material.rotation = Math.random() * 6; } } else if (this.flash) this.flash.visible = false;
    // ---- shooting
    this.fireT -= dt;
    const onTarget = t && this.visible && Math.abs(angDiff(this.aimYaw, dYaw)) < 0.12;
    const ready = onTarget && this.seeT > T.reaction * (DIFF[settings.difficulty].react || 1) / Math.max(0.6, this.skill) && this.spawnT <= 0 && this.reloadT <= 0 && this.mag > 0 && dist < (this.W.melee ? 3 : 140);
    if (T.sniper) {
      if (this.aimT > 0) { if (!this.visible) { this.aimT = 0; this.laser.visible = false; } else { this.aimT -= dt; this.updateLaser(); if (this.aimT <= 0) { this.laser.visible = false; this.errX *= 0.3; this.errY *= 0.3; this.shoot(dist); this.fireT = rand(2.2, 3.2); } } }
      else if (ready && this.fireT <= 0) { this.aimT = T.aim * (settings.difficulty === 'hard' ? 0.85 : settings.difficulty === 'easy' ? 1.3 : 1); this.laser.visible = true; this.updateLaser(); const sp = spatial(this.pos); sfx.play('charge', { vol: Math.max(0.35, sp.vol), pan: sp.pan }); }
    } else if (ready && this.fireT <= 0) {
      const auto = W.auto && !W.shell;
      if (auto) { if (this.burst <= 0) this.burst = dist > 25 ? randi(2, 4) : randi(3, Math.round(4 + 5 * this.skill)); this.shoot(dist); this.burst--; this.fireT = this.burst > 0 ? 60 / W.rpm : rand(0.15, 0.5) * (dist > 25 ? 1.6 : 1); }
      else { this.shoot(dist); this.fireT = 60 / W.rpm + rand(0.06, 0.3) / this.skill; }
    }
    return true;
  }
  startReload() { if (this.reloadT > 0 || this.mag >= this.W.mag) return; this.reloadT = this.W.reload * rand(1.0, 1.25) * (this.W.shell ? 3 : 1); if (Math.hypot(this.pos.x - player.pos.x, this.pos.z - player.pos.z) < 18) sfx.play('magout', spatial(this.pos)); }
  throwNade(at) {
    this.grenades--; this.nadeCD = rand(8, 14); const from = this.eye(new V3()), tt = 1.15;
    const vel = new V3((at.x - from.x) / tt, (at.y + 0.3 - from.y + 0.5 * G * tt * tt) / tt, (at.z - from.z) / tt);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshLambertMaterial({ color: 0x3b4a2a, emissive: 0x220000 }));
    mesh.position.copy(from); fx.add(mesh); grenades.push({ pos: from, vel, mesh, t: 2.0, owner: this });
    if (Math.hypot(this.pos.x - player.pos.x, this.pos.z - player.pos.z) < 30) { sfx.play('throw', spatial(this.pos)); if (this.target === PLAYER_T) showHint('GRENADE!', '#ff6b5a'); }
  }
  updateLaser() {
    const g = this.gunPos(_ea), h = playerHead(_eb); h.y -= 0.25; const a = this.laser.geometry.attributes.position.array;
    a[0] = g.x; a[1] = g.y; a[2] = g.z; a[3] = h.x; a[4] = h.y; a[5] = h.z; this.laser.geometry.attributes.position.needsUpdate = true;
    this.laser.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(game.time * (this.aimT < 0.4 ? 40 : 14)));
  }
  shoot(dist) { // fires a real ray along the bot's (imperfect) aim
    const W = this.W, n = W.pellets || 1, moving = Math.hypot(this.vel.x, this.vel.z) > 1.5, o = this.eye(new V3()), muzzle = this.gunPos(new V3());
    const spread = (W.spread + (moving ? W.move * 1.2 : 0) + (this.onGround ? 0 : W.air)) * (W.pellets ? 1 : 0.8);
    let hitP = false, dmgP = 0, headP = false, end = null;
    for (let i = 0; i < n; i++) {
      const yaw = this.aimYaw + this.errX + rand(-spread, spread), pitch = this.aimPitch + this.errY + this.recoilP + rand(-spread, spread) * 0.8;
      const d = _ed.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const hit = raycast(o, d, 300, this.bot, this);
      // the player's hitboxes
      let pt = -1, ph = false;
      if (player.alive && !MP.active && (this.bot || this.target === PLAYER_T) && !isAlly(this, PLAYER_T)) {
        const P = player.pos, hh = player.h + 0.07;
        const th = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, P.x - 0.2, P.y + hh * 0.8, P.z - 0.2, P.x + 0.2, P.y + hh * 1.02, P.z + 0.2, hit.t);
        if (th >= 0) { pt = th; ph = true; } const tb = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, P.x - 0.33, P.y, P.z - 0.33, P.x + 0.33, P.y + hh * 0.8, P.z + 0.33, pt >= 0 ? pt : hit.t); if (tb >= 0) { pt = tb; ph = false; }
      }
      const range = pt >= 0 ? pt : hit.t, [r0, r1, rmin] = W.range, fall = range <= r0 ? 1 : range >= r1 ? rmin : lerp(1, rmin, (range - r0) / (r1 - r0));
      if (!end) end = o.clone().addScaledVector(d, Math.min(range, 120));
      if (pt >= 0) { hitP = true; headP = headP || ph; dmgP += W.dmg * fall * (ph ? 1.6 : 1) * this.dmgMul; }
      else if (hit.enemy && !isAlly(this, hit.enemy)) hit.enemy.damage(W.dmg * fall * (hit.head ? W.head : 1) * (this.bot ? BOT_DMG[settings.botDiff || 'normal'] : 1), hit.head, { x: d.x * 1.5, z: d.z * 1.5 }, this);
      else if (hit.box && hit.t < 300 && i < 2) { _eo.copy(o).addScaledVector(d, hit.t); if (hit.box.barrel) hit.box.barrel.hit(W.dmg); else if (Math.random() < 0.5) sparks.burst(_eo.x, _eo.y, _eo.z, 3, 3, 1, 0.75, 0.4, 0.2, 1, hit.nx, hit.ny, hit.nz); }
      // near miss on the player: supersonic crack
      if (!hitP && player.alive && i === 0) { const ph2 = playerHead(_eb), w = _ea.subVectors(ph2, o), proj = w.dot(d); if (proj > 2 && proj < range) { const miss = w.addScaledVector(d, -proj).length(); if (miss < 1.6) sfx.play('whiz', { vol: 0.7, pan: rand(-0.5, 0.5) }); } }
    }
    spawnTracer(muzzle, end, 0xffc070, 180, W.pellets ? 0.03 : 0.035);
    this.mflash = 0.06; this.lastFired = game.time; this.mag--; this.recoilP += W.kick * rand(0.5, 1) * (1.4 - this.skill * 0.5);
    const sp = spatial(this.pos); sfx.gun(W.snd, { dist: sp.dist, pan: sp.pan });
    if (this.bot) noise(this.pos, 40, this);
    if (hitP) damagePlayer(dmgP, this.pos, this, headP);
  }
  damage(d, head, impulse, attacker) {
    if (this.dead) return false;
    this.hp -= d; this.flashT = 0.12; this.losT = 0; this.alertT = 5;
    const src = attacker === 'player' || attacker === undefined ? PLAYER_T : attacker instanceof Enemy ? attacker : null;
    if (isAlly(src, this)) { this.hp += d; return false; } // friendly fire is off
    if (src && !this.visible && (this.bot || src === PLAYER_T)) { this.target = src; this.attacker = src; this.lastKnown.copy(src.pos); this.investigate = src.pos.clone(); this.lostT = 0; this.repathT = 0; this.yaw += angDiff(this.yaw, Math.atan2(src.pos.x - this.pos.x, src.pos.z - this.pos.z)) * 0.5; }
    if (impulse) { this.vel.x += impulse.x; this.vel.z += impulse.z; }
    if (this.aimT > 0 && head) this.aimT += 0.35;
    this.errX += rand(-1, 1) * 0.05; this.errY += rand(-0.5, 1) * 0.04; // flinch
    if (this.hp <= 0) { this.die(head, false, src); return true; }
    return false;
  }
  die(head, silent, killer) {
    this.dead = true; this.fallDir = Math.random() < 0.5 ? 1 : -1; if (this.flash) this.flash.visible = false;
    if (this.laser) this.laser.visible = false;
    this.bodyMat.emissive.setRGB(0, 0, 0); this.bodyMat.color.multiplyScalar(0.5);
    if (silent) return;
    if (this.bot) botKilled(this, killer, head);
    else onKill(this, head);
  }
}

// ============================================================ BOT DEATHMATCH
const BD = { stats: [], limit: 20, time: 480, matchT: 0, respawn: [], lastAttacker: null };
function botProfile(i) {
  const keys = Object.keys(CLASSES), c = keys[i % keys.length], C = CLASSES[c], lo = DEFAULT_LO[c];
  const prims = WEAPONS.filter(w => w.slot === 'primary').map(w => w.id), weapon = Math.random() < 0.5 ? lo[0] : pick(prims);
  return { name: BOT_NAMES[i % BOT_NAMES.length], cls: c, color: PCOLORS[(i + 1) % PCOLORS.length], T: { model: C.model, name: BOT_NAMES[i % BOT_NAMES.length], hp: C.hp, speed: 4.6 * C.speed, scale: CHAR[C.model].scale, weapon, sight: 90, reaction: 0.35, score: 0 } };
}
function dmSpawnPoint(avoid, near) {
  const L = world.L, cands = L.enemySpawns.map(([x, z]) => [x, 0.05, z]).concat([[L.spawn.x, L.spawn.y + 0.05, L.spawn.z]]);
  let best = cands[0], bs = -1e9;
  for (const c of cands) { let md = 1e9; for (const p of avoid) md = Math.min(md, Math.hypot(p.x - c[0], p.z - c[2]));
    let sc = Math.min(md, 60) + rand(0, 10); if (near && near.length) { let nd = 1e9; for (const p of near) nd = Math.min(nd, Math.hypot(p.x - c[0], p.z - c[2])); sc = (md > 14 ? 100 : md) - nd * 0.8 + rand(0, 4); }
    if (sc > bs) { bs = sc; best = c; } }
  return best;
}
const TEAMC = [0x3fa7ff, 0xff5a5a];
function combatants() { return enemies.filter(e => !e.dead).map(e => ({ pos: e.pos, team: e.team })).concat(player.alive ? [{ pos: player.pos, team: BD.teams ? 0 : -1 }] : []); }
function teamSpawn(team) { const all = combatants(); if (!BD.teams) return dmSpawnPoint(all.map(c => c.pos)); return dmSpawnPoint(all.filter(c => c.team !== team).map(c => c.pos), all.filter(c => c.team === team).map(c => c.pos)); }
function spawnBot(st) {
  const [x, y, z] = teamSpawn(st.team);
  const k = world.nav.nearestFree(x + rand(-2, 2), z + rand(-2, 2), 6), [cx, cz] = k >= 0 ? world.nav.center(k) : [x, z];
  const e = new Enemy('bot', cx, cz, 1, { T: st.T, name: st.name, sash: st.color, y: 0 }); e.stat = st; e.team = st.team; enemies.push(e);
  if (BD.teams && st.team === 0) { e.tag = makeNameTag(st.name, TEAMC[0]); e.tag.position.y = 2.25 / e.s; e.inner.add(e.tag); }
}
function startBotMatch() {
  sfx.init(); music.play('start'); resize();
  if (!world || world.def !== MAPS[settings.map] || world.shadows !== QUALITY[settings.quality].shadows) { loadMap(settings.map); world.shadows = QUALITY[settings.quality].shadows; }
  resetRun(); game.mode = 'botdm'; game.phase = 'dm';
  BD.limit = settings.botLimit || 20; BD.time = 480; BD.matchT = BD.time; BD.respawn = [];
  const n = clamp(settings.bots || 5, 1, 11), teams = BD.teams = settings.botMode === 'tdm'; BD.teamKills = [0, 0];
  if (teams) BD.limit = settings.botLimit || 30;
  BD.stats = [{ name: settings.name || 'You', me: true, cls: settings.cls, kills: 0, deaths: 0, color: teams ? TEAMC[0] : PCOLORS[0], team: teams ? 0 : -1 }];
  const allies = teams ? Math.floor(n / 2) : 0;
  for (let i = 0; i < n; i++) { const p = botProfile(i + Math.floor(Math.random() * 6)); p.name = BOT_NAMES[(i * 3 + 5) % BOT_NAMES.length]; p.T.name = p.name; p.kills = 0; p.deaths = 0; p.team = teams ? (i < allies ? 0 : 1) : -1; if (teams) p.color = TEAMC[p.team]; BD.stats.push(p); }
  const L = world.L; player.alive = true; player.pos.set(L.spawn.x, L.spawn.y + 0.05, L.spawn.z);
  for (const st of BD.stats) if (!st.me && st.team === 1) spawnBot(st);
  if (teams) { const [x, y, z] = teamSpawn(0); player.pos.set(x, y, z); } else { const [x, y, z] = dmSpawnPoint(enemies.map(e => e.pos)); player.pos.set(x, y, z); }
  for (const st of BD.stats) if (!st.me && st.team !== 1) spawnBot(st);
  player.yaw = Math.atan2(player.pos.x, player.pos.z); player.protT = game.time + 1.5;
  game.state = 'play'; showScreen(null); camera.fov = settings.fov; requestLock(); hudCache = {};
  showMsg(teams ? 'TEAM DEATHMATCH' : 'BOT DEATHMATCH', teams ? `BLUE (${allies + 1}) vs RED (${n - allies}) · FIRST TEAM TO ${BD.limit}` : `FIRST TO ${BD.limit} KILLS · ${n} BOTS`, 3.5);
}
function botKilled(victim, killer, head) {
  const vs = victim.stat; if (vs) vs.deaths++;
  let kname = 'the swamp';
  if (killer === PLAYER_T) { const me = BD.stats[0]; me.kills++; game.kills++; if (head) game.heads++; kname = 'You'; sfx.play('kill'); hitMarker(true, head); if (head) { sfx.play('head'); showHint('HEADSHOT', '#ff6b5a'); }
    if (game.time - game.lastKill < 3) game.streak++; else game.streak = 1; game.lastKill = game.time; const names = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUAD KILL', 5: 'RAMPAGE' }; if (game.streak >= 2) showStreak(names[Math.min(game.streak, 5)]); }
  else if (killer && killer.stat) { killer.stat.kills++; kname = killer.name; }
  if (BD.teams && killer && killer.team >= 0 && killer.team !== victim.team) BD.teamKills[killer.team]++;
  const tc = t => (BD.teams && t >= 0 ? `<span style="color:${t ? '#ff7a7a' : '#7ac4ff'}">` : '<span>');
  addFeed(`${tc(killer && killer.team)}${esc(kname)}</span> ${head ? '◎' : '✕'} ${tc(victim.team)}${esc(victim.name)}</span>`, head);
  if (vs) BD.respawn.push({ st: vs, t: 3 });
  checkBotEnd();
}
function botPlayerDie() {
  const k = BD.lastAttacker instanceof Enemy ? BD.lastAttacker : null; BD.stats[0].deaths++;
  if (k && k.stat) k.stat.kills++; if (BD.teams && k) BD.teamKills[k.team]++;
  addFeed(`${esc(k ? k.name : 'You')} ✕ ${esc(BD.stats[0].name)}`, false);
  player.alive = false; MP.respawnT = 3.5; game.deadT = 0; mouseL = mouseR = false; wst.reloading = false;
  showMsg('ELIMINATED', k ? 'by ' + k.name : '', 3); checkBotEnd();
}
function checkBotEnd() { if (BD.teams) { for (const t of [0, 1]) if (BD.teamKills[t] >= BD.limit) endBotMatch((t ? 'Red' : 'Blue') + ' team reached ' + BD.limit + ' kills'); return; } const top = BD.stats.reduce((a, b) => (b.kills > a.kills ? b : a)); if (top.kills >= BD.limit) endBotMatch(top.name + ' reached the kill limit'); }
function updateBotMatch(dt) {
  BD.matchT -= dt; if (BD.matchT <= 0) return endBotMatch('Time limit reached');
  for (let i = BD.respawn.length - 1; i >= 0; i--) { BD.respawn[i].t -= dt; if (BD.respawn[i].t <= 0) { spawnBot(BD.respawn[i].st); BD.respawn.splice(i, 1); } }
  if (!player.alive) { MP.respawnT -= dt; game.deadT = (game.deadT || 0) + dt; if (MP.respawnT <= 0) { mpRespawn(); const [x, y, z] = teamSpawn(0); player.pos.set(x, y, z); player.yaw = Math.atan2(x, z); } }
}
function endBotMatch(why) {
  if (game.state !== 'play' && game.state !== 'paused') return;
  game.state = 'mpover'; if (document.pointerLockElement) document.exitPointerLock();
  const rows = BD.stats.slice().sort((a, b) => (BD.teams ? a.team - b.team : 0) || b.kills - a.kills || a.deaths - b.deaths);
  let won;
  if (BD.teams) { const [b, r] = BD.teamKills; won = b > r; $('mpWinner').textContent = b === r ? 'DRAW' : b > r ? 'BLUE TEAM WINS' : 'RED TEAM WINS'; $('mpWhy').textContent = `${why} · Blue ${b} – ${r} Red`; }
  else { won = rows[0].me; $('mpWinner').textContent = rows[0].me ? 'YOU WIN!' : rows[0].name.toUpperCase() + ' WINS'; $('mpWhy').textContent = why; }
  $('mpBoard').innerHTML = botTable(rows); $('mpToLobby').textContent = 'BACK TO MENU';
  showScreen('mpover'); music.play(won ? 'win' : 'lose');
}
function botTable(rows) {
  return `<table class="sb"><tr><th>#</th><th>PLAYER</th><th>CLASS</th><th>K</th><th>D</th></tr>` + rows.map((p, i) => `<tr class="${p.me ? 'me' : ''}"><td>${i + 1}</td><td><i style="background:#${new THREE.Color(p.color).getHexString()}"></i>${esc(p.name)}${p.me ? '' : ' 🤖'}</td><td>${esc(CLASSES[p.cls] ? CLASSES[p.cls].name : '')}</td><td>${p.kills}</td><td>${p.deaths}</td></tr>`).join('') + '</table>';
}

// ============================================================ PLAYER
const player = {
  pos: new V3(), vel: new V3(), r: 0.33, h: 1.75, onGround: false, ground: null, stepSmooth: 0, yaw: 0, pitch: 0,
  crouch: 0, sliding: false, slideT: 0, slideCD: 0, coyote: 0, jumpBuf: 0, hp: 100, regenCap: 100, lastDmgT: 99, alive: true,
  grenades: 2, gcd: 0, stepAcc: 0, bob: 0, landKick: 0, tilt: 0, sprinting: false, sprintLock: 0, crouchKeyPrev: false,
  maxHp: 100, protT: 0, abilityCD: 0, stimT: 0, shield: 0, shieldT: 0, pulseT: 0,
};
function playerHead(out) { return out.set(player.pos.x, player.pos.y + player.h - 0.12, player.pos.z); }

// ============================================================ CLASSES
const CLASSES = {
  assault: { model: 'knight', glove: 0x9aa3ad, sleeve: 0x7d858f, name: 'KNIGHT', desc: 'Armoured all-rounder of the realm.', passive: 'Faster health regen', hp: 100, speed: 1, jump: 1, nades: 2, nadeMax: 3, headMul: 1, regen: 20,
    ability: 'RALLY', abDesc: 'Heal 40 HP and move 30% faster for 4s', cd: 20 },
  scout: { model: 'ginger', glove: 0xb5703a, sleeve: 0xb5703a, name: 'GINGERBREAD', desc: 'Run, run, as fast as you can. Small and quick.', passive: '+12% speed, higher jumps', hp: 85, speed: 1.12, jump: 1.12, nades: 1, nadeMax: 2, headMul: 1, regen: 14,
    ability: 'SUGAR RUSH', abDesc: 'Burst forward in your move direction', cd: 6 },
  heavy: { model: 'ogre', glove: 0x86a33a, sleeve: 0xd8cfb0, name: 'OGRE', desc: 'Big, green and very hard to put down.', passive: 'Carries 4 grenades', hp: 150, speed: 0.9, jump: 0.95, nades: 3, nadeMax: 4, headMul: 1, regen: 14,
    ability: 'THICK HIDE', abDesc: '+60 shield that absorbs damage for 6s', cd: 25 },
  recon: { model: 'fairy', glove: 0xf3d0b0, sleeve: 0xb58be0, name: 'FAIRY', desc: 'Sharp-eyed scout with a touch of magic.', passive: '+20% headshot damage', hp: 100, speed: 1, jump: 1, nades: 2, nadeMax: 3, headMul: 1.2, regen: 14,
    ability: 'FAIRY SIGHT', abDesc: 'Reveal all enemies on radar and through walls for 7s', cd: 18 },
  wolf: { model: 'wolf', glove: 0x6a6058, sleeve: 0x5a5048, name: 'BIG BAD WOLF', desc: 'Huffs, puffs and blows your cover down.', passive: 'Keen ears: radar shows foes within 20m', hp: 95, speed: 1.08, jump: 1.05, nades: 1, nadeMax: 2, headMul: 1, regen: 16,
    ability: 'HUFF & PUFF', abDesc: 'Shockwave: up to 60 damage and huge knockback within 7m', cd: 16 },
  witch: { model: 'witch', glove: 0x3a2a4a, sleeve: 0x4a2a6a, name: 'WITCH', desc: 'Brews trouble. Area-denial specialist.', passive: '+1 grenade, bigger blasts', hp: 90, speed: 1, jump: 1, nades: 3, nadeMax: 4, headMul: 1, regen: 14,
    ability: 'CURSED BREW', abDesc: 'Lob a cauldron that leaves a toxic cloud: 25 dmg/s for 5s', cd: 20 },
};
let THUMBS = {}; let previewSelect = () => {}; let refreshAvatar = () => {}; let botBoard = () => botTable(BD.stats.slice().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths));
const clouds = [];
function areaDamage(x, y, z, r, dmg, kb, attacker) { // damages enemies / remote players around a point (not the local player)
  let n = 0;
  for (const list of [enemies, remoteList]) for (const e of list) {
    if (e.dead || isAlly(attacker === 'player' ? PLAYER_T : attacker, e)) continue; const cx = e.pos.x, cy = e.pos.y + e.h * 0.5, cz = e.pos.z, d = Math.hypot(cx - x, cy - y, cz - z); if (d > r) continue;
    const f = 1 - (d / r) * 0.5, dx = (cx - x) / (d || 1), dz = (cz - z) / (d || 1);
    if (e.damage(dmg * f, false, { x: dx * kb * f, z: dz * kb * f }, attacker) !== undefined) n++;
  }
  return n;
}
function updateClouds(dt) {
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i]; c.t -= dt; c.tick -= dt;
    if (Math.random() < 0.7) debris.emit(c.x + rand(-c.r, c.r) * 0.8, c.y + rand(0, 1.2), c.z + rand(-c.r, c.r) * 0.8, rand(-0.3, 0.3), rand(0.2, 0.8), rand(-0.3, 0.3), 0.35, 0.8, 0.25, 1.4, -0.05);
    if (c.tick <= 0) { c.tick = 0.25;
      if (c.owner === MP.myId || !MP.active) { const n = areaDamage(c.x, c.y + 0.8, c.z, c.r, 25 * 0.25, 0, 'player'); if (n) hitMarker(false, false); }
      if (c.owner !== MP.myId && player.alive && Math.hypot(player.pos.x - c.x, player.pos.z - c.z) < c.r && Math.abs(player.pos.y - c.y) < 2.5) damagePlayer(25 * 0.25 * (c.owner ? 1 : 0), null, c.owner);
    }
    if (c.t <= 0) clouds.splice(i, 1);
  }
}
if (!CLASSES[settings.cls]) settings.cls = 'assault';
const cls = () => CLASSES[settings.cls];
function useAbility() {
  const C = cls(), P = player;
  if (!P.alive || P.abilityCD > 0) { if (P.alive) showHint(C.ability + ' RECHARGING', '#ff6b5a'); return; }
  P.abilityCD = C.cd;
  if (settings.cls === 'assault') { P.hp = Math.min(P.maxHp, P.hp + 40); P.regenCap = Math.max(P.regenCap, Math.ceil(P.hp / 25) * 25); P.stimT = 4; sfx.play('pad'); showHint('RALLY — +40 HP', '#5dff9a'); }
  else if (settings.cls === 'scout') {
    const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let wx = -sy * f + cy * st, wz = -cy * f - sy * st; const l = Math.hypot(wx, wz); if (l < 0.1) { wx = -sy; wz = -cy; } else { wx /= l; wz /= l; }
    P.vel.x = wx * 17; P.vel.z = wz * 17; if (P.onGround) P.vel.y = 2.5; sfx.play('slide'); vm.kick = 0.4;
  }
  else if (settings.cls === 'heavy') { P.shield = 60; P.shieldT = 6; sfx.play('wave'); showHint('THICK HIDE ACTIVE', '#6dc8ff'); }
  else if (settings.cls === 'wolf') {
    sfx.play('howl'); game.shake = Math.min(1, game.shake + 0.4);
    for (let i = 0; i < 60; i++) { const a = i / 60 * 6.28; sparks.emit(P.pos.x, P.pos.y + 1, P.pos.z, Math.cos(a) * 14, rand(0, 1), Math.sin(a) * 14, 0.8, 0.85, 1, 0.45, 0); }
    const n = areaDamage(P.pos.x, P.pos.y + 1, P.pos.z, 7, 60, 16, 'player'); if (n) { hitMarker(false, false); showHint('HUFF & PUFF — ' + n + ' HIT', '#ffcf6b'); } else showHint('HUFF & PUFF', '#ffcf6b');
  }
  else if (settings.cls === 'witch') {
    aimBasis(); const pos = camera.position.clone().addScaledVector(_f, 0.6), vel = _f.clone().multiplyScalar(14).add(new V3(0, 4, 0));
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshLambertMaterial({ color: 0x3a2a4a, emissive: 0x30ff60, emissiveIntensity: 0.4 }));
    mesh.position.copy(pos); fx.add(mesh); grenades.push({ pos, vel, mesh, t: 1.3, owner: MP.myId, brew: true }); sfx.play('brew');
    if (MP.active) netSend({ t: 'nade', p: v3a(pos), v: v3a(vel), brew: 1 });
  }
  else { P.pulseT = 7; sfx.play('charge'); showHint('FAIRY SIGHT — ENEMIES REVEALED', '#ffcf6b'); for (const e of enemies) if (!e.dead) e.revealed = true; }
}

// ============================================================ WEAPONS
const WEAPONS = [
  { id: 'pistol', slot: 'secondary', vkick: 0.9, desc: 'Accurate semi-auto 9mm. Infinite reserve ammo.', short: 'PISTOL', name: '9MM SERVICE PISTOL', dmg: 30, head: 2.2, rpm: 420, auto: false, mag: 12, res: Infinity, reload: 1.15, spread: 0.006, bloom: 0.012, maxBloom: 0.045, move: 0.022, air: 0.05, ads: 0.45, zoom: 1.2, kick: 0.016, kickYaw: 0.006, range: [20, 45, 0.6], snd: 'pistol', hip: [0.12, -0.12, -0.38], adsPos: [0, -0.05, -0.34], adsSpeed: 13, swap: 0.25 },
  { id: 'revolver', slot: 'secondary', vkick: 1.9, desc: '.357 hand cannon. Two-tap kills, heavy kick. Infinite reserve.', short: 'REVOLVER', name: '.357 REVOLVER', dmg: 55, head: 2.0, rpm: 150, auto: false, mag: 6, res: Infinity, reload: 2.0, spread: 0.004, bloom: 0.03, maxBloom: 0.06, move: 0.03, air: 0.06, ads: 0.4, zoom: 1.25, kick: 0.05, kickYaw: 0.012, range: [25, 50, 0.65], snd: 'revolver', hip: [0.12, -0.12, -0.38], adsPos: [0, -0.05, -0.34], adsSpeed: 11, swap: 0.3 },
  { id: 'rifle', slot: 'primary', vkick: 0.6, pattern: [0.15, 0.35, 0.55, 0.3, -0.15, -0.55, -0.8, -0.45, 0.2, 0.6, 0.85, 0.4, -0.3, -0.6], desc: 'AR-15 pattern all-rounder. Controllable full-auto.', short: 'CARBINE', name: '5.56 CARBINE', dmg: 22, head: 1.9, rpm: 640, auto: true, mag: 30, res: 180, maxRes: 270, pickup: 60, reload: 1.9, spread: 0.005, bloom: 0.006, maxBloom: 0.05, move: 0.035, air: 0.07, ads: 0.3, zoom: 1.45, kick: 0.0105, kickYaw: 0.007, range: [25, 60, 0.65], snd: 'rifle', hip: [0.13, -0.135, -0.44], adsPos: [0, -0.09, -0.26], adsSpeed: 9, swap: 0.35 },
  { id: 'ak', slot: 'primary', vkick: 0.95, pattern: [0.1, 0.3, 0.6, 0.8, 0.5, 0.1, -0.4, -0.8, -1, -0.6, -0.1, 0.4, 0.8, 1, 0.6], desc: 'Hard-hitting 7.62. Strong but learnable recoil.', short: 'AK', name: '7.62 ASSAULT RIFLE', dmg: 30, head: 1.9, rpm: 600, auto: true, mag: 30, res: 150, maxRes: 240, pickup: 60, reload: 2.3, spread: 0.006, bloom: 0.008, maxBloom: 0.06, move: 0.04, air: 0.08, ads: 0.32, zoom: 1.4, kick: 0.0145, kickYaw: 0.009, range: [30, 70, 0.7], snd: 'ak', hip: [0.13, -0.135, -0.44], adsPos: [0, -0.06, -0.27], adsSpeed: 8.5, swap: 0.38 },
  { id: 'smg', slot: 'primary', vkick: 0.45, pattern: [0.5, -0.3, 0.6, -0.45, 0.7, -0.6, 0.4, -0.7, 0.55, -0.4], desc: 'Very fast fire, accurate on the move. Weak at range.', short: 'SMG', name: '9MM SMG', dmg: 15, head: 1.7, rpm: 900, auto: true, mag: 32, res: 192, maxRes: 288, pickup: 64, reload: 1.6, spread: 0.009, bloom: 0.005, maxBloom: 0.055, move: 0.012, air: 0.04, ads: 0.5, zoom: 1.3, kick: 0.007, kickYaw: 0.009, range: [12, 35, 0.5], snd: 'smg', hip: [0.13, -0.13, -0.4], adsPos: [0, -0.06, -0.28], adsSpeed: 13, swap: 0.28, speedMul: 1.04 },
  { id: 'lmg', slot: 'primary', vkick: 0.65, pattern: [0.3, -0.2, 0.5, -0.4, 0.2, -0.6, 0.6, -0.3], desc: '100-round belt. Suppress everything. Slow to aim and reload.', short: 'LMG', name: '5.56 LIGHT MACHINE GUN', dmg: 21, head: 1.7, rpm: 780, auto: true, mag: 100, res: 200, maxRes: 300, pickup: 100, reload: 4.4, spread: 0.009, bloom: 0.004, maxBloom: 0.07, move: 0.06, air: 0.1, ads: 0.4, zoom: 1.35, kick: 0.0085, kickYaw: 0.01, range: [25, 60, 0.65], snd: 'lmg', hip: [0.14, -0.15, -0.46], adsPos: [0, -0.1, -0.3], adsSpeed: 5.5, swap: 0.6, speedMul: 0.88 },
  { id: 'shotgun', slot: 'primary', vkick: 2.3, desc: '12-gauge pump, nine pellets. Devastating up close.', short: 'SHOTGUN', name: '12GA PUMP SHOTGUN', dmg: 12, head: 1.5, pellets: 9, rpm: 75, auto: true, mag: 6, res: 30, maxRes: 42, pickup: 12, reload: 0.5, shell: true, spread: 0.06, bloom: 0.01, maxBloom: 0.02, move: 0.012, air: 0.02, ads: 0.7, zoom: 1.15, kick: 0.05, kickYaw: 0.012, range: [8, 24, 0.3], snd: 'shotgun', hip: [0.13, -0.13, -0.44], adsPos: [0, -0.04, -0.32], adsSpeed: 10, swap: 0.4 },
  { id: 'dmr', slot: 'primary', vkick: 1.4, desc: '7.62 marksman rifle, 4× scope. Rounds pierce one enemy.', short: 'MARKSMAN', name: '7.62 MARKSMAN RIFLE', dmg: 68, head: 2.4, rpm: 105, auto: false, mag: 10, res: 30, maxRes: 50, pickup: 10, reload: 2.2, spread: 0.05, bloom: 0.02, maxBloom: 0.05, move: 0.06, air: 0.1, ads: 0.035, zoom: 3.6, scope: true, pierce: true, kick: 0.045, kickYaw: 0.01, range: [70, 140, 0.8], snd: 'dmr', hip: [0.13, -0.135, -0.44], adsPos: [0, -0.075, -0.24], adsSpeed: 7, swap: 0.45 },
  { id: 'sniper', slot: 'primary', vkick: 2.8, desc: '.338 bolt action, 6× scope. One-shot headshots.', short: 'SNIPER', name: '.338 SNIPER RIFLE', dmg: 115, head: 2.5, rpm: 46, auto: false, mag: 5, res: 20, maxRes: 30, pickup: 5, reload: 3.0, spread: 0.07, bloom: 0.02, maxBloom: 0.07, move: 0.08, air: 0.12, ads: 0.02, zoom: 6, scope: true, pierce: true, bolt: true, kick: 0.07, kickYaw: 0.012, range: [120, 250, 0.85], snd: 'sniper', hip: [0.14, -0.15, -0.46], adsPos: [0, -0.1, -0.22], adsSpeed: 5.5, swap: 0.5, speedMul: 0.95 },
  { id: 'knife', slot: 'melee', melee: true, desc: 'Fast slashes. Backstabs are instant kills.', short: 'KNIFE', name: 'COMBAT KNIFE', dmg: 55, backstab: 250, reach: 2.1, swing: 0.42, hitAt: 0.12, snd: 'stab', speedMul: 1.08, rpm: 143, auto: true, mag: 1, res: Infinity, reload: 1, spread: 0, bloom: 0, maxBloom: 0, move: 0, air: 0, ads: 1, zoom: 1, kick: 0, kickYaw: 0, range: [3, 3, 1], hip: [0.17, -0.17, -0.36], adsPos: [0, 0, -0.36], adsSpeed: 10, swap: 0.22, head: 1.4 },
  { id: 'sword', slot: 'melee', melee: true, desc: 'Long reach; a heavy cleave can hit two foes.', short: 'SWORD', name: "KNIGHT'S LONGSWORD", dmg: 85, backstab: 150, reach: 2.7, swing: 0.7, hitAt: 0.25, cleave: 2, snd: 'stab', rpm: 86, auto: true, mag: 1, res: Infinity, reload: 1, spread: 0, bloom: 0, maxBloom: 0, move: 0, air: 0, ads: 1, zoom: 1, kick: 0, kickYaw: 0, range: [3, 3, 1], hip: [0.17, -0.17, -0.36], adsPos: [0, 0, -0.36], adsSpeed: 10, swap: 0.22, head: 1.4 },
  { id: 'pan', slot: 'melee', melee: true, desc: 'Cast iron. Huge knockback. Very, very loud.', short: 'PAN', name: 'CAST-IRON PAN', dmg: 65, backstab: 130, reach: 2.3, swing: 0.6, hitAt: 0.2, knock: 16, snd: 'clang', rpm: 100, auto: true, mag: 1, res: Infinity, reload: 1, spread: 0, bloom: 0, maxBloom: 0, move: 0, air: 0, ads: 1, zoom: 1, kick: 0, kickYaw: 0, range: [3, 3, 1], hip: [0.17, -0.17, -0.36], adsPos: [0, 0, -0.36], adsSpeed: 10, swap: 0.22, head: 1.4 },
];
let inv = [];
let carry = [2, 0, 9];
const widx = id => WEAPONS.findIndex(w => w.id === id);
const DEFAULT_LO = { assault: ['rifle', 'pistol', 'sword'], scout: ['smg', 'pistol', 'knife'], heavy: ['lmg', 'revolver', 'pan'], recon: ['dmr', 'pistol', 'knife'], wolf: ['shotgun', 'revolver', 'knife'], witch: ['ak', 'pistol', 'pan'] };
if (!settings.loadouts || typeof settings.loadouts !== 'object') settings.loadouts = {};
if (!settings.att || typeof settings.att !== 'object') settings.att = {};
function getLO(c = settings.cls) { // per-class loadout, validated
  const d = DEFAULT_LO[c] || DEFAULT_LO.assault, lo = Object.assign({ primary: d[0], secondary: d[1], melee: d[2] }, settings.loadouts[c] || {});
  for (const slot of ['primary', 'secondary', 'melee']) { const k = widx(lo[slot]); if (k < 0 || WEAPONS[k].slot !== slot) lo[slot] = d[['primary', 'secondary', 'melee'].indexOf(slot)]; }
  return lo;
}
function setLO(slot, id) { const lo = getLO(); lo[slot] = id; settings.loadouts[settings.cls] = lo; saveSettings(); }
const loadoutIdx = () => { const lo = getLO(); return [widx(lo.primary), widx(lo.secondary), widx(lo.melee)]; };
const wst = { swingT: 0, swingHit: true, quick: false, quickFrom: -1, boltT: 0, cur: 2, last: 0, fireCD: 0, reloadT: 0, reloading: false, switchT: 0, ads: 0, bloom: 0, held: false, consec: 0, sinceShot: 9, pumpT: 0 };
// ---- viewmodels
const vmRoot = new THREE.Group(); vmScene.add(vmRoot); vmScene.add(vmCam);
const vmModels = [];
const gloveMat = new THREE.MeshLambertMaterial({ color: 0x9aa3ad }), sleeveMat = new THREE.MeshLambertMaterial({ color: 0x7d858f });
const GMAT = {
  steel: new THREE.MeshPhongMaterial({ color: 0x2e3035, specular: 0x5a5a5a, shininess: 50 }),
  black: new THREE.MeshPhongMaterial({ color: 0x18191c, specular: 0x262626, shininess: 14 }),
  park: new THREE.MeshPhongMaterial({ color: 0x34362f, specular: 0x333333, shininess: 22 }),
  poly: new THREE.MeshPhongMaterial({ color: 0x1d1e20, specular: 0x1a1a1a, shininess: 8 }),
  fde: new THREE.MeshPhongMaterial({ color: 0x9c8a68, specular: 0x222222, shininess: 10 }),
  od: new THREE.MeshPhongMaterial({ color: 0x4a5038, specular: 0x111111, shininess: 6 }),
  wood: new THREE.MeshPhongMaterial({ color: 0x7a4a24, specular: 0x2a1608, shininess: 28 }),
  bakelite: new THREE.MeshPhongMaterial({ color: 0x5c2412, specular: 0x331a10, shininess: 30 }),
  brass: new THREE.MeshPhongMaterial({ color: 0xc9a245, specular: 0x886622, shininess: 70 }),
  blued: new THREE.MeshPhongMaterial({ color: 0x23272e, specular: 0x6a7280, shininess: 80 }),
  blade: new THREE.MeshPhongMaterial({ color: 0xb8bec6, specular: 0xffffff, shininess: 120 }),
  leather: new THREE.MeshPhongMaterial({ color: 0x4a2c18, specular: 0x111111, shininess: 6 }),
  gold: new THREE.MeshPhongMaterial({ color: 0xc9a227, specular: 0xffe08a, shininess: 80 }),
  iron: new THREE.MeshPhongMaterial({ color: 0x2a2a2c, specular: 0x777777, shininess: 60 }),
  lens: new THREE.MeshBasicMaterial({ color: 0x4f9adf, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
  dot: new THREE.MeshBasicMaterial({ color: 0xff2a2a }), trit: new THREE.MeshBasicMaterial({ color: 0x9cff6a }), red: new THREE.MeshBasicMaterial({ color: 0xff4020 }),
};
const _gBox = new THREE.BoxGeometry(1, 1, 1);
// Build a weapon. Coordinates: x = forward along the bore (metres), y = up. Converted to three.js (-z forward).
function buildGun(id, att = {}, withHands = true) {
  const g = new THREE.Group(), parts = {}, M = GMAT;
  const add = (m, par = g) => { par.add(m); return m; };
  const P = (pts, w, mat, par = g, holes, s = 0) => {
    const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath();
    if (holes) for (const hp of holes) { const h = new THREE.Path(); h.moveTo(hp[0][0], hp[0][1]); for (let i = 1; i < hp.length; i++) h.lineTo(hp[i][0], hp[i][1]); h.closePath(); sh.holes.push(h); }
    const bev = Math.min(0.0022, w * 0.18), geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.0005, w - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 4 });
    geo.translate(0, 0, -(w - bev * 2) / 2); geo.rotateY(Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.position.x = s; return add(m, par);
  };
  const X = (x0, x1, y0, y1, w, mat, s = 0, par = g) => { const m = new THREE.Mesh(_gBox, mat); m.scale.set(w, y1 - y0, x1 - x0); m.position.set(s, (y0 + y1) / 2, -(x0 + x1) / 2); return add(m, par); };
  const Cz = (r, x0, x1, y, mat, seg = 14, rFront, par = g, s = 0, open = false) => { const geo = new THREE.CylinderGeometry(rFront !== undefined ? rFront : r, r, 1, seg, 1, open); const m = new THREE.Mesh(geo, mat); m.scale.y = x1 - x0; m.rotation.x = -Math.PI / 2; m.position.set(s, y, -(x0 + x1) / 2); return add(m, par); };
  const sub = () => { const s = new THREE.Group(); g.add(s); return s; };
  const mark = (x, y, s = 0) => { const o = new THREE.Object3D(); o.position.set(s, y, -x); g.add(o); return o; };
  const limb = (a, b, r, mat) => { const d = new V3().subVectors(b, a), len = d.length(); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 1, 10), mat); m.position.addVectors(a, b).multiplyScalar(0.5); m.scale.y = len; m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); g.add(m); return m; };
  const hands = (rg, lf) => { // [forward, up, side]
    parts.gripPt = mark(rg[0], rg[1], rg[2] || 0); parts.forePt = lf ? mark(lf[0], lf[1], lf[2] || 0) : null;
    if (!withHands) return;
    const R = new V3(rg[2] || 0.002, rg[1], -rg[0]);
    X(rg[0] - 0.035, rg[0] + 0.03, rg[1] - 0.04, rg[1] + 0.035, 0.05, gloveMat, R.x); X(rg[0] + 0.0, rg[0] + 0.05, rg[1] + 0.015, rg[1] + 0.04, 0.052, gloveMat, R.x - 0.005);
    limb(new V3(R.x + 0.005, R.y - 0.03, R.z + 0.04), new V3(R.x + 0.08, R.y - 0.22, R.z + 0.38), 0.036, sleeveMat);
    if (lf) { const L = new V3(lf[2] || 0, lf[1], -lf[0]); X(lf[0] - 0.045, lf[0] + 0.045, lf[1] - 0.03, lf[1] + 0.025, 0.054, gloveMat, L.x); X(lf[0] - 0.03, lf[0] + 0.03, lf[1], lf[1] + 0.03, 0.018, gloveMat, L.x + 0.03);
      limb(new V3(L.x - 0.01, L.y - 0.02, L.z + 0.03), new V3(L.x - 0.17, L.y - 0.26, L.z + 0.44), 0.036, sleeveMat); }
  };
  const rail = (x0, x1, y, w = 0.021) => { X(x0, x1, y - 0.006, y, w, M.black); for (let x = x0 + 0.003; x < x1 - 0.004; x += 0.011) X(x, x + 0.005, y, y + 0.0035, w, M.black); return y + 0.0035; };
  const optic = (kind, cx, ry) => { // returns sight line height
    if (kind === 'reddot') { X(cx - 0.025, cx + 0.025, ry, ry + 0.016, 0.024, M.black); Cz(0.02, cx - 0.03, cx + 0.03, ry + 0.04, M.black, 18, undefined, g, 0, true);
      const l = add(new THREE.Mesh(new THREE.CircleGeometry(0.019, 16), M.lens)); l.position.set(0, ry + 0.04, -(cx + 0.028)); X(cx + 0.024, cx + 0.025, ry + 0.0388, ry + 0.0412, 0.0024, M.dot); return ry + 0.04; }
    if (kind === 'holo') { X(cx - 0.04, cx + 0.04, ry, ry + 0.014, 0.04, M.black); for (const sd of [-1, 1]) X(cx - 0.005, cx + 0.04, ry + 0.014, ry + 0.06, 0.004, M.black, sd * 0.019); X(cx - 0.005, cx + 0.04, ry + 0.056, ry + 0.062, 0.042, M.black);
      const l = add(new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.04), M.lens)); l.position.set(0, ry + 0.035, -(cx + 0.03));
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0006, 4, 24), M.dot)); ring.position.set(0, ry + 0.036, -(cx + 0.029)); X(cx + 0.029, cx + 0.03, ry + 0.0355, ry + 0.0365, 0.001, M.dot); return ry + 0.036; }
    if (kind === 'acog' || kind === 'scope') { const big = kind === 'scope', y = ry + (big ? 0.042 : 0.036);
      for (const x of [cx - 0.04, cx + 0.04]) X(x - 0.007, x + 0.007, ry, y, big ? 0.03 : 0.024, M.black);
      Cz(big ? 0.016 : 0.015, cx - 0.06, cx + 0.07, y, M.black); Cz(big ? 0.016 : 0.015, cx + 0.07, cx + (big ? 0.13 : 0.1), y, M.black, 16, big ? 0.027 : 0.021);
      Cz(big ? 0.022 : 0.019, cx - (big ? 0.12 : 0.095), cx - 0.06, y, M.black, 16, big ? 0.016 : 0.015);
      const tur = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.022, 12), M.black)); tur.position.set(0, y + 0.024, -cx);
      if (big) { const t2 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.022, 12), M.black)); t2.rotation.z = Math.PI / 2; t2.position.set(0.024, y, -cx); }
      else X(cx - 0.03, cx + 0.05, y + 0.014, y + 0.018, 0.004, M.red);
      const l = add(new THREE.Mesh(new THREE.CircleGeometry(big ? 0.025 : 0.019, 16), M.lens)); l.position.set(0, y, -(cx + (big ? 0.131 : 0.101))); return y; }
    return 0;
  };
  const muzzle = (kind, mx, my, r, def) => {
    if (kind === 'supp') { Cz(r * 2.4, mx, mx + 0.17, my, M.black, 18); Cz(r * 0.7, mx + 0.17, mx + 0.1705, my, M.steel, 10); return mx + 0.17; }
    if (kind === 'comp') { Cz(r * 1.6, mx, mx + 0.055, my, M.steel, 6); for (const sd of [-1, 1]) X(mx + 0.015, mx + 0.03, my - 0.004, my + 0.004, 0.002, M.black, sd * r * 1.55); X(mx + 0.02, mx + 0.04, my + r * 1.4, my + r * 1.62, 0.006, M.black); return mx + 0.055; }
    if (def) def(); return mx + (def ? 0.05 : 0);
  };
  const extMag = (grp, topY) => { if (att.mag === 'ext') { grp.scale.y = 1.42; grp.position.y = topY - topY * 1.42; } };
  let mz = 0.6, my = 0.02, sightY = 0.05, eject = null, casing = 'brass';
  const O = att.optic || 'iron';
  switch (id) {
    case 'pistol': { // polymer-frame 9mm service pistol
      const S = parts.slide = sub();
      P([[-0.035, 0.013], [0.15, 0.013], [0.158, 0.021], [0.158, 0.036], [0.15, 0.045], [-0.03, 0.045], [-0.035, 0.04]], 0.026, M.steel, S);
      for (let i = 0; i < 7; i++) X(-0.03 + i * 0.006, -0.027 + i * 0.006, 0.017, 0.042, 0.0266, M.black, 0, S);
      X(0.03, 0.07, 0.0445, 0.0462, 0.016, M.black, 0, S);
      for (const sd of [-1, 1]) { X(-0.026, -0.014, 0.045, 0.053, 0.007, M.black, sd * 0.0075, S); X(-0.0145, -0.0135, 0.0495, 0.0515, 0.002, M.trit, sd * 0.0075, S); }
      X(0.136, 0.145, 0.045, 0.0535, 0.0042, M.black, 0, S); X(0.1355, 0.1365, 0.0505, 0.0525, 0.0024, M.trit, 0, S);
      Cz(0.0066, 0.152, 0.1585, 0.029, M.black, 12, undefined, S);
      P([[-0.035, 0.015], [0.15, 0.015], [0.15, 0.003], [0.07, 0.0], [0.068, -0.026], [0.06, -0.031], [0.02, -0.032], [0.006, -0.015], [0.0, -0.011], [-0.022, -0.108], [-0.056, -0.112], [-0.052, -0.09], [-0.044, -0.03], [-0.038, 0.004]], 0.024, M.poly, g,
        [[[0.058, -0.004], [0.058, -0.025], [0.024, -0.027], [0.012, -0.009]]]);
      X(0.09, 0.145, -0.005, 0.003, 0.02, M.poly); X(0.03, 0.036, -0.021, -0.006, 0.0045, M.black);
      const MG = parts.mag = sub(); X(-0.06, -0.021, -0.121, -0.111, 0.026, M.poly, 0, MG); extMag(MG, -0.0);
      if (att.mag === 'ext') { MG.scale.y = 1; X(-0.062, -0.022, -0.16, -0.111, 0.022, M.poly, 0, MG); }
      hands([-0.03, -0.06], [-0.035, -0.072, -0.02]);
      mz = muzzle(att.muzzle, 0.159, 0.029, 0.007); my = 0.029; sightY = 0.0515; eject = [0.05, 0.04, 0.016]; break;
    }
    case 'revolver': {
      P([[-0.028, 0.002], [0.075, 0.002], [0.075, 0.05], [0.05, 0.054], [-0.005, 0.054], [-0.02, 0.048], [-0.028, 0.03]], 0.028, M.blued);
      const C = parts.cyl = sub(); C.position.set(0, 0.027, -0.035);
      const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.046, 18), M.blued); cm.rotation.x = Math.PI / 2; C.add(cm);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, f = new THREE.Mesh(_gBox, M.black); f.scale.set(0.006, 0.006, 0.04); f.position.set(Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0); f.rotation.z = a; C.add(f); }
      Cz(0.0105, 0.075, 0.205, 0.034, M.blued, 16); P([[0.075, 0.006], [0.205, 0.009], [0.205, 0.026], [0.075, 0.028]], 0.019, M.blued);
      X(0.075, 0.205, 0.042, 0.048, 0.012, M.blued); P([[0.183, 0.048], [0.2, 0.048], [0.2, 0.061], [0.193, 0.061]], 0.004, M.blued); Cz(0.0048, 0.2052, 0.2058, 0.034, M.black, 10);
      for (const sd of [-1, 1]) X(-0.008, 0.0, 0.054, 0.0615, 0.004, M.blued, sd * 0.0045);
      P([[-0.025, 0.04], [-0.012, 0.05], [-0.016, 0.066], [-0.03, 0.062]], 0.008, M.steel);
      P([[0.032, 0.002], [0.036, -0.012], [0.02, -0.03], [-0.005, -0.028], [-0.012, -0.012], [-0.008, 0.002]], 0.008, M.blued, g, [[[0.028, 0.0], [0.03, -0.01], [0.018, -0.025], [0.0, -0.023], [-0.005, -0.011], [-0.003, -0.001]]]);
      X(0.012, 0.017, -0.019, 0.0, 0.004, M.steel);
      P([[-0.028, 0.004], [0.002, 0.0], [-0.004, -0.03], [-0.012, -0.092], [-0.03, -0.104], [-0.052, -0.098], [-0.05, -0.06], [-0.04, -0.01]], 0.032, M.wood);
      hands([-0.025, -0.05], [-0.03, -0.062, -0.022]);
      mz = 0.207; my = 0.034; sightY = 0.061; eject = null; break;
    }
    case 'rifle': case 'dmr': { // AR-15 carbine / SR-25 style marksman
      const dmr = id === 'dmr', hgE = dmr ? 0.5 : 0.42, bE = dmr ? 0.7 : 0.56, rec = dmr ? M.fde : M.park;
      X(-0.085, 0.175, 0.0, 0.048, 0.044, rec); X(0.0, 0.055, 0.01, 0.032, 0.0455, M.black);
      Cz(0.007, -0.02, 0.01, 0.035, M.black, 10, undefined, g, 0.024);
      const ry = rail(-0.085, 0.175, 0.054);
      Cz(0.027, 0.175, hgE, 0.022, M.black, 8); rail(0.175, hgE, 0.054, 0.019);
      for (let x = 0.2; x < hgE - 0.03; x += 0.045) for (const sd of [-1, 1]) X(x, x + 0.025, 0.012, 0.022, 0.002, M.poly, sd * 0.026);
      Cz(0.0085, hgE, bE, 0.022, M.steel, 12);
      P([[-0.085, 0.0], [0.165, 0.0], [0.165, -0.012], [0.13, -0.018], [0.125, -0.034], [0.055, -0.034], [0.05, -0.022], [-0.03, -0.022], [-0.085, -0.008]], 0.042, rec);
      X(-0.005, 0.05, -0.045, -0.041, 0.012, rec); X(0.046, 0.05, -0.045, -0.022, 0.012, rec); X(0.02, 0.025, -0.037, -0.022, 0.006, M.steel);
      P([[-0.012, -0.02], [0.01, -0.02], [-0.02, -0.11], [-0.024, -0.114], [-0.054, -0.114], [-0.052, -0.098], [-0.03, -0.03], [-0.03, -0.02]], 0.03, M.black);
      const MG = parts.mag = sub();
      if (dmr) P([[0.06, -0.034], [0.125, -0.034], [0.13, -0.12], [0.065, -0.12]], 0.03, M.black, MG);
      else P([[0.058, -0.034], [0.12, -0.034], [0.13, -0.1], [0.145, -0.17], [0.152, -0.2], [0.092, -0.212], [0.083, -0.17], [0.072, -0.1]], 0.026, M.fde, MG);
      extMag(MG, -0.034);
      X(-0.1, -0.085, 0.036, 0.046, 0.03, M.black);
      if (dmr) { P([[-0.085, 0.04], [-0.33, 0.05], [-0.34, 0.04], [-0.34, -0.085], [-0.32, -0.09], [-0.2, -0.035], [-0.085, -0.01]], 0.044, M.black); X(-0.3, -0.15, 0.05, 0.068, 0.03, M.black); }
      else { Cz(0.0145, -0.25, -0.085, 0.02, M.black, 12); P([[-0.17, 0.036], [-0.3, 0.036], [-0.31, 0.03], [-0.31, -0.072], [-0.298, -0.078], [-0.26, -0.02], [-0.18, 0.0], [-0.17, 0.01]], 0.04, M.black); }
      if (O === 'iron') { X(-0.075, -0.052, ry, ry + 0.03, 0.022, M.black); X(-0.066, -0.06, ry + 0.022, ry + 0.03, 0.023, M.dot ? M.black : M.black);
        X(hgE - 0.035, hgE - 0.015, ry, ry + 0.02, 0.016, M.black); X(hgE - 0.028, hgE - 0.024, ry + 0.02, ry + 0.031, 0.003, M.black); sightY = ry + 0.029; }
      else sightY = optic(dmr ? 'scope' : O, 0.03, ry);
      hands([-0.03, -0.062], [hgE - 0.13, -0.012]);
      mz = muzzle(att.muzzle, bE, 0.022, 0.009, () => Cz(0.0115, bE, bE + 0.05, 0.022, M.black, 8)); my = 0.022; eject = [0.025, 0.022, 0.024]; break;
    }
    case 'ak': {
      P([[-0.09, 0.0], [0.2, 0.0], [0.2, 0.038], [0.17, 0.042], [-0.06, 0.046], [-0.085, 0.04], [-0.09, 0.03]], 0.042, M.blued);
      X(-0.06, 0.15, 0.044, 0.048, 0.034, M.blued);
      P([[0.17, 0.038], [0.235, 0.038], [0.235, 0.05], [0.205, 0.057], [0.17, 0.052]], 0.03, M.blued);
      P([[0.2, -0.008], [0.39, -0.004], [0.39, 0.03], [0.2, 0.036]], 0.046, M.wood); Cz(0.014, 0.235, 0.37, 0.05, M.wood, 12);
      P([[0.37, 0.02], [0.4, 0.02], [0.4, 0.064], [0.37, 0.064]], 0.022, M.blued); Cz(0.0085, 0.39, 0.62, 0.026, M.blued, 12);
      P([[0.57, 0.014], [0.6, 0.014], [0.6, 0.068], [0.585, 0.068], [0.57, 0.04]], 0.02, M.blued); X(0.583, 0.587, 0.05, 0.059, 0.003, M.black);
      const MG = parts.mag = sub(); P([[0.06, 0.0], [0.125, 0.0], [0.15, -0.08], [0.19, -0.17], [0.205, -0.19], [0.15, -0.215], [0.125, -0.18], [0.09, -0.1], [0.065, -0.04]], 0.028, M.bakelite, MG); extMag(MG, 0.0);
      P([[-0.015, 0.0], [0.012, 0.0], [-0.012, -0.096], [-0.046, -0.1], [-0.04, -0.02]], 0.03, M.bakelite);
      X(-0.005, 0.06, -0.027, -0.023, 0.012, M.blued); X(0.056, 0.06, -0.027, 0.0, 0.012, M.blued); X(0.025, 0.03, -0.018, 0.0, 0.006, M.steel);
      X(0.08, 0.1, 0.02, 0.032, 0.012, M.blued, 0.027);
      P([[-0.09, 0.038], [-0.09, -0.012], [-0.15, -0.038], [-0.33, -0.1], [-0.345, -0.095], [-0.345, 0.008], [-0.33, 0.022], [-0.16, 0.034]], 0.042, M.wood); X(-0.352, -0.345, -0.1, 0.012, 0.044, M.blued);
      if (O === 'iron') sightY = 0.057; else { X(-0.03, 0.09, 0.046, 0.058, 0.03, M.black); sightY = optic(O, 0.03, 0.058); }
      hands([-0.03, -0.055], [0.29, 0.008]);
      mz = muzzle(att.muzzle, 0.62, 0.026, 0.009, () => Cz(0.012, 0.62, 0.66, 0.026, M.blued, 6)); my = 0.026; eject = [0.03, 0.03, 0.022]; break;
    }
    case 'smg': {
      Cz(0.023, -0.06, 0.2, 0.024, M.black, 16); X(-0.04, 0.18, 0.044, 0.05, 0.016, M.black);
      X(0.18, 0.2, 0.044, 0.05, 0.02, M.black); const hood = add(new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 16), M.black)); hood.position.set(0, 0.062, -0.19);
      X(0.188, 0.192, 0.047, 0.059, 0.003, M.black);
      Cz(0.012, -0.05, -0.03, 0.061, M.black, 14); X(-0.055, -0.025, 0.044, 0.05, 0.024, M.black);
      Cz(0.008, 0.1, 0.235, 0.048, M.steel); X(0.2, 0.215, 0.045, 0.06, 0.005, M.black, -0.02);
      P([[0.1, -0.01], [0.25, -0.005], [0.26, 0.012], [0.25, 0.04], [0.1, 0.04]], 0.05, M.black); Cz(0.008, 0.25, 0.29, 0.024, M.steel);
      P([[-0.07, 0.002], [0.06, 0.002], [0.06, -0.02], [0.04, -0.03], [0.0, -0.03], [-0.04, -0.022], [-0.07, -0.012]], 0.036, M.black);
      P([[-0.028, -0.022], [-0.005, -0.022], [-0.03, -0.105], [-0.062, -0.108], [-0.055, -0.03]], 0.032, M.black);
      const MG = parts.mag = sub(); P([[0.06, 0.0], [0.09, 0.0], [0.105, -0.07], [0.135, -0.15], [0.11, -0.16], [0.082, -0.08], [0.062, -0.03]], 0.022, M.steel, MG); extMag(MG, 0.0);
      for (const sd of [-1, 1]) Cz(0.004, -0.24, -0.06, 0.03, M.steel, 8, undefined, g, sd * 0.014); P([[-0.25, 0.045], [-0.235, 0.045], [-0.235, -0.04], [-0.25, -0.045]], 0.045, M.black);
      if (O === 'iron') sightY = 0.06; else sightY = optic(O, 0.05, 0.05);
      hands([-0.04, -0.062], [0.18, 0.0]);
      mz = muzzle(att.muzzle, 0.29, 0.024, 0.008, () => Cz(0.011, 0.27, 0.29, 0.024, M.black, 6)); my = 0.024; eject = [0.02, 0.03, 0.024]; break;
    }
    case 'shotgun': {
      P([[-0.05, -0.012], [0.17, -0.012], [0.17, 0.046], [0.0, 0.048], [-0.03, 0.042], [-0.05, 0.03]], 0.046, M.blued);
      X(0.02, 0.1, 0.005, 0.034, 0.002, M.black, 0.0235);
      Cz(0.0135, 0.17, 0.66, 0.026, M.blued, 16); X(0.17, 0.66, 0.039, 0.044, 0.008, M.blued); X(0.645, 0.65, 0.044, 0.049, 0.004, M.brass);
      Cz(0.0125, 0.17, 0.56, -0.006, M.blued, 14); Cz(0.014, 0.56, 0.58, -0.006, M.blued, 14);
      const PP = parts.pump = sub(); Cz(0.023, 0.25, 0.42, -0.006, M.wood, 16, undefined, PP); for (let x = 0.27; x < 0.41; x += 0.018) Cz(0.0235, x, x + 0.004, -0.006, M.black, 16, undefined, PP);
      P([[-0.05, 0.032], [-0.08, 0.03], [-0.38, 0.01], [-0.39, 0.012], [-0.395, -0.12], [-0.375, -0.128], [-0.14, -0.06], [-0.1, -0.07], [-0.08, -0.05], [-0.05, -0.01]], 0.044, M.wood); X(-0.408, -0.394, -0.126, 0.012, 0.044, M.black);
      X(-0.02, 0.05, -0.036, -0.032, 0.012, M.blued); X(0.046, 0.05, -0.036, -0.012, 0.012, M.blued); X(0.015, 0.02, -0.03, -0.012, 0.005, M.steel);
      if (O === 'iron') sightY = 0.047; else sightY = optic(O, 0.06, 0.048);
      hands([-0.07, -0.042], [0.33, -0.022]);
      mz = 0.66; my = 0.026; eject = [0.06, 0.02, 0.024]; casing = 'shell'; break;
    }
    case 'lmg': {
      P([[-0.12, -0.01], [0.2, -0.01], [0.2, 0.058], [-0.1, 0.062], [-0.12, 0.05]], 0.06, M.park);
      P([[-0.08, 0.058], [0.16, 0.058], [0.16, 0.078], [-0.06, 0.082], [-0.08, 0.075]], 0.058, M.park); const ry = rail(-0.06, 0.15, 0.084);
      X(0.2, 0.36, 0.03, 0.05, 0.032, M.black); Cz(0.011, 0.2, 0.66, 0.03, M.steel, 12); Cz(0.009, 0.2, 0.48, 0.008, M.steel);
      P([[0.2, -0.01], [0.34, -0.006], [0.34, 0.028], [0.2, 0.03]], 0.06, M.black);
      for (const sd of [-1, 1]) Cz(0.005, 0.38, 0.62, 0.0, M.black, 8, undefined, g, sd * 0.012); X(0.48, 0.5, -0.008, 0.02, 0.04, M.black);
      for (const x of [0.25, 0.33]) X(x, x + 0.012, 0.05, 0.1, 0.01, M.black); X(0.25, 0.345, 0.095, 0.106, 0.014, M.black);
      const MG = parts.mag = sub(); P([[0.0, -0.01], [0.14, -0.01], [0.145, -0.14], [0.0, -0.14]], 0.1, M.od, MG, null, -0.02); X(0.02, 0.12, -0.06, -0.05, 0.102, M.black, -0.02, MG);
      P([[-0.025, -0.01], [0.0, -0.01], [-0.03, -0.1], [-0.064, -0.104], [-0.06, -0.03]], 0.032, M.black);
      P([[-0.12, 0.04], [-0.36, 0.04], [-0.37, 0.03], [-0.37, -0.09], [-0.35, -0.095], [-0.2, -0.03], [-0.12, -0.01]], 0.044, M.black, g, [[[-0.33, 0.015], [-0.22, 0.015], [-0.2, -0.008], [-0.335, -0.06]]]);
      if (O === 'iron') { X(-0.045, -0.025, ry, ry + 0.022, 0.02, M.black); X(0.6, 0.606, 0.041, ry + 0.02, 0.004, M.black); sightY = ry + 0.019; }
      else sightY = optic(O, 0.02, ry);
      hands([-0.045, -0.06], [0.27, 0.0]);
      mz = muzzle(att.muzzle, 0.66, 0.03, 0.011, () => Cz(0.014, 0.66, 0.71, 0.03, M.black, 6)); my = 0.03; eject = [0.05, -0.01, 0.0]; break;
    }
    case 'sniper': {
      P([[0.08, -0.035], [0.47, -0.03], [0.48, -0.01], [0.47, 0.02], [0.08, 0.022]], 0.052, M.fde);
      Cz(0.019, -0.1, 0.13, 0.03, M.steel, 16);
      const B = parts.bolt = sub(); Cz(0.009, -0.13, -0.05, 0.03, M.steel, 12, undefined, B); X(-0.082, -0.072, 0.012, 0.032, 0.04, M.steel, 0.03, B);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), M.black); kn.position.set(0.052, 0.012, 0.077); B.add(kn);
      Cz(0.014, 0.13, 0.82, 0.03, M.steel, 14, 0.012);
      P([[0.82, 0.014], [0.88, 0.014], [0.88, 0.046], [0.82, 0.046]], 0.03, M.black); for (const x of [0.835, 0.85, 0.865]) X(x, x + 0.005, 0.018, 0.042, 0.032, M.steel);
      const MG = parts.mag = sub(); X(0.0, 0.09, -0.07, -0.015, 0.036, M.black, 0, MG);
      X(-0.02, 0.05, -0.045, -0.041, 0.012, M.black); X(0.046, 0.05, -0.045, -0.02, 0.012, M.black); X(0.02, 0.025, -0.037, -0.02, 0.005, M.steel);
      P([[-0.04, -0.01], [-0.015, -0.01], [-0.04, -0.1], [-0.072, -0.104], [-0.066, -0.03]], 0.034, M.fde);
      P([[-0.1, 0.03], [-0.15, 0.035], [-0.42, 0.042], [-0.43, 0.03], [-0.43, -0.12], [-0.41, -0.13], [-0.3, -0.09], [-0.22, -0.05], [-0.12, -0.035], [-0.1, -0.02]], 0.05, M.fde, g, [[[-0.36, 0.0], [-0.26, 0.0], [-0.24, -0.03], [-0.34, -0.07]]]);
      X(-0.38, -0.2, 0.042, 0.07, 0.03, M.black); X(-0.442, -0.43, -0.13, 0.042, 0.05, M.black);
      sightY = optic('scope', 0.0, 0.06);
      hands([-0.055, -0.062], [0.3, -0.04]);
      mz = muzzle(att.muzzle, 0.88, 0.03, 0.014); my = 0.03; eject = [-0.05, 0.035, 0.02]; break;
    }
    case 'knife': {
      P([[0.0, 0.0], [0.15, 0.003], [0.185, 0.012], [0.16, 0.022], [0.0, 0.022]], 0.0045, M.blade); X(0.005, 0.14, 0.017, 0.019, 0.005, M.steel);
      X(-0.01, 0.0, -0.012, 0.034, 0.03, M.black); Cz(0.013, -0.115, -0.01, 0.011, M.black, 10); for (let x = -0.1; x < -0.02; x += 0.012) Cz(0.0136, x, x + 0.003, 0.011, M.poly, 10);
      parts.gripPt = mark(-0.06, 0.011); if (withHands) { X(-0.095, -0.025, -0.02, 0.04, 0.05, gloveMat); limb(new V3(0.0, -0.01, 0.06), new V3(0.08, -0.22, 0.4), 0.036, sleeveMat); }
      mz = 0.18; my = 0.01; sightY = 0; break;
    }
    case 'sword': {
      P([[0.0, -0.016], [0.62, -0.014], [0.7, 0.0], [0.62, 0.014], [0.0, 0.016]], 0.006, M.blade); X(0.02, 0.6, -0.002, 0.002, 0.0065, M.steel);
      X(-0.012, 0.0, -0.06, 0.06, 0.022, M.gold); Cz(0.015, -0.14, -0.012, 0.0, M.leather, 10); const pm = add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), M.gold)); pm.position.set(0, 0, 0.15);
      parts.gripPt = mark(-0.07, 0.0); if (withHands) { X(-0.11, -0.03, -0.03, 0.03, 0.05, gloveMat); limb(new V3(0.0, -0.02, 0.07), new V3(0.08, -0.22, 0.4), 0.036, sleeveMat); }
      mz = 0.7; my = 0; sightY = 0; break;
    }
    case 'pan': {
      Cz(0.011, -0.12, 0.1, 0.0, M.iron, 10); const pan = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.105, 0.035, 22), M.iron)); pan.rotation.z = Math.PI / 2; pan.position.set(0, 0, -0.2);
      const inside = add(new THREE.Mesh(new THREE.CircleGeometry(0.103, 22), GMAT.steel)); inside.rotation.y = -Math.PI / 2; inside.position.set(-0.0182, 0, -0.2);
      parts.gripPt = mark(-0.07, 0.0); if (withHands) { X(-0.11, -0.03, -0.03, 0.03, 0.05, gloveMat); limb(new V3(0.0, -0.02, 0.07), new V3(0.08, -0.22, 0.4), 0.036, sleeveMat); }
      mz = 0.32; my = 0; sightY = 0; break;
    }
  }
  parts.muzzlePt = mark(mz, my);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flash, color: 0xffe0a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.position.set(0, my, -(mz + 0.04)); flash.visible = false; g.add(flash);
  return Object.assign(parts, { g, flash, muzzle: -mz, sightY, eject: eject ? new V3(eject[2], eject[1], -eject[0]) : null, casing, slideT: 0, cylRot: 0 });
}
function makeGun(w) {
  const m = buildGun(w.id, settings.att[w.id] || {}, true);
  if (!w.melee) w.adsPos[1] = -m.sightY; // align the actual sights with the screen centre
  m.g.traverse(o => { if (o.isMesh) o.renderOrder = 1; });
  m.g.visible = false; vmRoot.add(m.g); return m;
}
// spent casings in view-model space
const casings = [];
function initCasings() {
  const bg = new THREE.CylinderGeometry(0.0045, 0.0045, 0.02, 8), sg = new THREE.CylinderGeometry(0.009, 0.009, 0.032, 10), sm = new THREE.MeshPhongMaterial({ color: 0xb02a2a, shininess: 30 });
  for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(bg, GMAT.brass); m.visible = false; vmScene.add(m); casings.push({ m, v: new V3(), s: new V3(), t: 0, bg, sg, sm }); }
}
let casingI = 0;
function ejectCasing(model) {
  if (!model.eject) return;
  const c = casings[casingI]; casingI = (casingI + 1) % casings.length;
  vmRoot.updateMatrixWorld(); c.m.position.copy(model.eject).applyMatrix4(model.g.matrixWorld);
  const shell = model.casing === 'shell'; c.m.geometry = shell ? c.sg : c.bg; c.m.material = shell ? c.sm : GMAT.brass;
  c.v.set(rand(0.9, 1.4), rand(0.9, 1.4), rand(0.1, 0.5)); c.s.set(rand(-20, 20), rand(-20, 20), rand(-20, 20)); c.t = 0.55; c.m.visible = true;
}
function updateCasings(dt) {
  for (const c of casings) { if (c.t <= 0) continue; c.t -= dt; c.v.y -= 6 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.s.x * dt; c.m.rotation.y += c.s.y * dt; c.m.rotation.z += c.s.z * dt; if (c.t <= 0) c.m.visible = false; }
}
function setGloves() { const C = cls(); gloveMat.color.setHex(C.glove); sleeveMat.color.setHex(C.sleeve); }
// ---- attachments
const ATT_OPTS = {
  optic: { rifle: ['iron', 'reddot', 'holo', 'acog'], ak: ['iron', 'reddot', 'holo', 'acog'], smg: ['iron', 'reddot', 'holo'], lmg: ['iron', 'reddot', 'holo', 'acog'], shotgun: ['iron', 'reddot', 'holo'] },
  muzzle: { rifle: 1, ak: 1, smg: 1, lmg: 1, dmr: 1, sniper: 1, pistol: 1 },
  mag: { rifle: 1, ak: 1, smg: 1, pistol: 1, dmr: 1 },
};
const ATT_NAMES = { iron: 'Iron sights', reddot: 'Red dot', holo: 'Holographic', acog: '3× optic', none: 'Standard', supp: 'Suppressor', comp: 'Compensator', std: 'Standard mag', ext: 'Extended mag' };
function applyAttachments(w) {
  if (!w.base) w.base = { mag: w.mag, reload: w.reload, zoom: w.zoom, adsSpeed: w.adsSpeed, kick: w.kick, kickYaw: w.kickYaw, range: w.range.slice(), scope: !!w.scope, vkick: w.vkick || 1 };
  const B = w.base, a = settings.att[w.id] || {};
  Object.assign(w, { mag: B.mag, reload: B.reload, zoom: B.zoom, adsSpeed: B.adsSpeed, kick: B.kick, kickYaw: B.kickYaw, range: B.range.slice(), scope: B.scope, vkick: B.vkick, supp: false, comp: false, scopeStyle: B.scope ? 'scope' : '' });
  if (w.melee) return;
  if (a.optic === 'reddot') w.zoom *= 1.05; else if (a.optic === 'holo') w.zoom *= 1.03; else if (a.optic === 'acog') { w.zoom = 2.6; w.scope = true; w.scopeStyle = 'acog'; w.adsSpeed *= 0.8; } else if (!B.scope) w.adsSpeed *= 1.1;
  if (a.muzzle === 'supp') { w.supp = true; w.range[0] *= 0.9; w.range[1] *= 0.9; w.kick *= 0.95; }
  if (a.muzzle === 'comp') { w.comp = true; w.kick *= 0.78; w.kickYaw *= 0.82; w.vkick *= 0.85; }
  if (a.mag === 'ext') { w.mag = Math.round(B.mag * 1.5); w.reload *= 1.15; w.adsSpeed *= 0.92; }
}


let muzzleLight;

// ============================================================ INPUT
const keys = {}; let mL = false, mR = false, mouseL = false, mouseR = false, locked = false, mdx = 0, mdy = 0;
addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyB' && game.state === 'armory' && !e.repeat) { resumeGame(); return; }
  if (keys[e.code]) return; keys[e.code] = true;
  if (game.state !== 'play') return;
  if (e.code === 'KeyB') openArmory();
  if (e.code === 'KeyR') startReload();
  if (e.code === 'Digit1') switchTo(carry[0]);
  if (e.code === 'Digit2') switchTo(carry[1]);
  if (e.code === 'Digit3') switchTo(carry[2]);
  if (e.code === 'Digit4') throwGrenade();
  if (e.code === 'KeyV') quickMelee();
  if (e.code === 'KeyT') toggleView();
  if (e.code === 'KeyQ') switchTo(wst.cur === carry[0] ? carry[1] : carry[0]);
  if (e.code === 'KeyG') throwGrenade();
  if (e.code === 'KeyE' || e.code === 'KeyF') useAbility();
  if (e.code === 'Space') player.jumpBuf = 0.14;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; });
renderer.domElement.addEventListener('mousedown', e => {
  if (game.state === 'play' && !locked) { requestLock(); return; }
  if (e.button === 0) { mouseL = mL = true; wst.held = false; }
  if (e.button === 2) { mouseR = mR = true; wst.adsOn = !wst.adsOn; }
});
addEventListener('mouseup', e => { if (e.button === 0) mouseL = mL = false; if (e.button === 2) mouseR = mR = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => { if (game.state !== 'play') return; const k = carry.indexOf(wst.cur); switchTo(carry[(k + (e.deltaY > 0 ? 1 : 2)) % 3]); }, { passive: true });
addEventListener('mousemove', e => {
  if (!locked || game.state !== 'play' || !player.alive) return;
  const dx = clamp(e.movementX, -300, 300), dy = clamp(e.movementY, -300, 300);
  const zoom = lerp(1, WEAPONS[wst.cur].zoom, wst.ads);
  const s = 0.0022 * settings.sens / zoom;
  player.yaw -= dx * s; player.pitch = clamp(player.pitch - dy * s * (settings.invertY ? -1 : 1), -1.5, 1.5);
  mdx += dx; mdy += dy;
});
function requestLock() {
  try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => { $('lockmsg').style.display = 'block'; }); } catch (e) { $('lockmsg').style.display = 'block'; }
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  $('lockmsg').style.display = locked || game.state !== 'play' ? 'none' : 'block';
  if (!locked && game.state === 'play') pauseGame();
});

// ============================================================ GAME STATE
const game = { state: 'menu', time: 0, score: 0, kills: 0, heads: 0, shots: 0, hits: 0, wave: 0, queue: [], spawnT: 0, interT: 0, phase: 'inter', streak: 0, lastKill: -9, shake: 0, runTime: 0 };

function disposeGroup(g) {
  const shared = new Set([...Object.values(CG), ...Object.values(PG), ...ROCKS, barrelGeo, bandGeo, potionGeo, roundGeo, hpGeo, amGeo, ringGeo, crossA, crossB]);
  g.traverse(o => { if (o.geometry && !shared.has(o.geometry)) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
}
let radarImg = null;
function loadMap(i) {
  if (world) { scene.remove(world.group); disposeGroup(world.group); }
  enemies = []; pickups = []; barrels = []; grenades.forEach(g => fx.remove(g.mesh)); grenades = [];
  const def = MAPS[i], th = def.theme, L = new LevelBuilder(); def.build(L);
  world = { def, L, boxes: L.boxes, group: new THREE.Group() };
  skyMat.uniforms.top.value.setHex(th.skyTop); skyMat.uniforms.bottom.value.setHex(th.skyBottom);
  skyMat.uniforms.sunColor.value.setHex(th.sunColor); skyMat.uniforms.sunDir.value.set(...th.sunDir).normalize();
  scene.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
  if (stars) { scene.remove(stars); stars = null; } if (th.stars) { stars = makeStars(); scene.add(stars); }
  world.group.add(new THREE.HemisphereLight(th.hemiSky, th.hemiGround, th.hemi));
  const sun = new THREE.DirectionalLight(th.sunLight, th.sun);
  const sd = new V3(...th.shadowSun).normalize(); sun.position.copy(sd).multiplyScalar(60); sun.target.position.set(0, 0, 0);
  world.group.add(sun, sun.target);
  shadowsOn = QUALITY[settings.quality].shadows; renderer.shadowMap.enabled = shadowsOn;
  muzzleLight.visible = boomLight.visible = settings.quality !== 'low';
  if (shadowsOn) {
    sun.castShadow = true; const [x0, z0, x1, z1] = L.bounds, ext = Math.max(x1 - x0, z1 - z0) * 0.62;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 160 });
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.camera.updateProjectionMatrix();
  }
  buildLevelMeshes(L, th, world.group);
  world.nav = new Nav(L.boxes, L.bounds, L.links);
  world.anim = {}; buildScenery(L, th, world.group); buildEnvironment(L, th, world.group, world.anim);
  for (const [x, z] of L.barrels) barrels.push(new Barrel(x, z));
  for (const [t, x, y, z] of L.pickups) { const p = new Pickup(t, x, y, z, false); p.idx = pickups.length; pickups.push(p); }
  scene.add(world.group);
  // radar
  const [x0, z0, x1, z1] = L.bounds, RS = 3; const c = document.createElement('canvas'); c.width = (x1 - x0 + 4) * RS; c.height = (z1 - z0 + 4) * RS;
  const g = c.getContext('2d'); g.fillStyle = 'rgba(60,70,85,.35)'; g.fillRect(0, 0, c.width, c.height);
  for (const b of L.boxes.slice().sort((a, b) => a.y1 - b.y1)) {
    if (b.y1 <= 0.3) continue; const v = clamp(90 + b.y1 * 16, 90, 230) | 0;
    g.fillStyle = b.pad ? '#39ff88' : `rgb(${v},${v},${v + 10})`; g.fillRect((b.x0 - x0 + 2) * RS, (b.z0 - z0 + 2) * RS, (b.x1 - b.x0) * RS, (b.z1 - b.z0) * RS);
  }
  radarImg = { c, x0: x0 - 2, z0: z0 - 2, RS };
}

function resetRun() {
  for (const e of enemies) { world.group.remove(e.group); if (e.laser) world.group.remove(e.laser); }
  enemies = []; grenades.forEach(g => fx.remove(g.mesh)); grenades = [];
  for (const p of pickups) if (p.temp) world.group.remove(p.mesh);
  pickups = pickups.filter(p => !p.temp); pickups.forEach(p => { p.active = true; p.mesh.visible = true; });
  barrels.forEach(b => { b.box.dead = false; b.hp = 30; b.fuse = 0; b.mesh.visible = true; });
  const s = world.L.spawn;
  const C = cls();
  Object.assign(player, { protT: 0, maxHp: C.hp, hp: C.hp, regenCap: C.hp, abilityCD: 0, stimT: 0, shield: 0, shieldT: 0, pulseT: 0, lastDmgT: 99, alive: true, grenades: C.nades, gcd: 0, crouch: 0, sliding: false, slideT: 0, slideCD: 0, h: 1.75, onGround: false, stepSmooth: 0, landKick: 0, yaw: s.yaw, pitch: 0, sprintLock: 0 });
  player.pos.set(s.x, s.y + 0.05, s.z); player.vel.set(0, 0, 0);
  inv = WEAPONS.map(w => ({ mag: w.mag, res: w.res }));
  carry = loadoutIdx(); rebuildViewmodels(); renderSlots(); setGloves();
  Object.assign(wst, { cur: carry[0], last: carry[1], fireCD: 0, reloadT: 0, reloading: false, switchT: 0, ads: 0, bloom: 0, held: false, consec: 0, sinceShot: 9 });
  vmModels.forEach((m, i) => m.g.visible = i === carry[0]);
  game.mode = 'survival';
  Object.assign(game, { time: 0, score: 0, kills: 0, heads: 0, shots: 0, hits: 0, wave: 0, queue: [], spawnT: 0, interT: 3, phase: 'inter', streak: 0, lastKill: -9, shake: 0, runTime: 0 });
  recoil.p = recoil.y = 0;
  $('feed').innerHTML = ''; hudCache = {};
  showMsg('GET READY', world.def.name, 2.5);
}

// ============================================================ WAVES
function makeWave(n) {
  const total = Math.min(5 + n * 2, 32), list = [];
  for (let i = 0; i < total; i++) {
    const r = Math.random();
    list.push(n >= 4 && r < 0.12 ? 'heavy' : n >= 3 && r < 0.27 ? 'sniper' : n >= 2 && r < 0.5 ? 'rusher' : 'grunt');
  }
  if (n % 5 === 0) list.push('heavy', 'heavy');
  return list;
}
function startWave(n) {
  game.wave = n; game.queue = makeWave(n); game.phase = 'fight'; game.spawnT = 0.5; game.maxAlive = Math.min(3 + n, 10);
  showMsg('WAVE ' + n, game.queue.length + ' HOSTILES INBOUND', 2.5); sfx.play('wave');
}
function spawnEnemy(type) {
  const sp = world.L.enemySpawns; const ph = playerHead(new V3());
  let best = null, bs = -1e9;
  for (const [x, z] of sp) {
    const d = Math.hypot(x - player.pos.x, z - player.pos.z);
    let s = Math.min(d, 45) / 6 + rand(0, 4);
    if (d < 14) s -= 30;
    if (los(x, 1.6, z, ph.x, ph.y, ph.z)) s -= 6;
    if (enemies.some(e => !e.dead && Math.hypot(e.pos.x - x, e.pos.z - z) < 1.5)) s -= 10;
    if (s > bs) { bs = s; best = [x, z]; }
  }
  const k = world.nav.nearestFree(best[0], best[1], 6); const [cx, cz] = k >= 0 ? world.nav.center(k) : best;
  const e = new Enemy(type, cx + rand(-0.2, 0.2), cz + rand(-0.2, 0.2), game.wave); enemies.push(e);
  const c = new THREE.Color(e.T.visor);
  sparks.burst(cx, 1, cz, 24, 5, c.r, c.g, c.b, 0.6, -0.2);
  const s = spatial(e.pos); sfx.play('spawn', s);
}
function updateWaves(dt) {
  const alive = enemies.filter(e => !e.dead).length;
  if (game.phase === 'inter') {
    game.interT -= dt;
    if (game.interT <= 0) startWave(game.wave + 1);
  } else {
    game.spawnT -= dt;
    if (game.spawnT <= 0 && game.queue.length && alive < game.maxAlive) { spawnEnemy(game.queue.shift()); game.spawnT = rand(0.5, 1.3); }
    if (!game.queue.length && alive === 0) {
      const bonus = 250 * game.wave; game.score += bonus; game.phase = 'inter'; game.interT = 8;
      player.hp = Math.min(player.maxHp, player.hp + 25); player.regenCap = Math.min(player.maxHp, Math.max(player.regenCap, Math.ceil(player.hp / 25) * 25));
      if (player.grenades < cls().nadeMax) player.grenades++;
      showMsg('WAVE CLEARED', '+' + bonus + '  ·  +25 HP  ·  +1 GRENADE', 3); sfx.play('clear');
    }
  }
}
function onKill(e, head) {
  game.kills++; if (head) game.heads++;
  let pts = e.T.score + (head ? Math.round(e.T.score * 0.5) : 0);
  if (game.time - game.lastKill < 2.5) game.streak++; else game.streak = 1;
  game.lastKill = game.time;
  const names = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUAD KILL', 5: 'RAMPAGE' };
  if (game.streak >= 2) { const b = 50 * game.streak; pts += b; showStreak((names[Math.min(game.streak, 5)] || 'RAMPAGE') + '  +' + b); }
  game.score += pts;
  addFeed(`${head ? '◎ ' : '✕ '}${e.T.name}  <b>+${pts}</b>`, head);
  sfx.play('kill'); hitMarker(true, head); if (head) { sfx.play('head'); showHint('HEADSHOT', '#ff6b5a'); }
  const r = Math.random();
  if (r < 0.22) pickups.push(new Pickup('ammo', e.pos.x, e.pos.y, e.pos.z, true));
  else if (r < 0.34) pickups.push(new Pickup('health', e.pos.x, e.pos.y, e.pos.z, true));
}

// ============================================================ PLAYER COMBAT
function damagePlayer(d, from, attacker, head) {
  if (!player.alive || game.time < player.protT) return;
  if (attacker instanceof Enemy) BD.lastAttacker = attacker;
  if (MP.active && attacker) { MP.lastAttacker = attacker; MP.lastAttackT = game.time; MP.lastHead = !!head; }
  if (player.shield > 0) { const a = Math.min(player.shield, d); player.shield -= a; d -= a; if (d <= 0) { sfx.play('hit'); hud.vig = Math.min(1, hud.vig + 0.05); return; } }
  player.hp -= d; player.lastDmgT = 0; player.regenCap = Math.max(25, Math.ceil(player.hp / 25) * 25);
  hud.vig = Math.min(1, hud.vig + d / 35); game.shake = Math.min(1, game.shake + d / 120);
  sfx.play('hurt', { vol: 0.7 });
  if (from) { const a = Math.atan2(from.x - player.pos.x, from.z - player.pos.z); addDmgDir(a); }
  if (player.hp <= 0) { player.hp = 0; die(); }
}
const recoil = { p: 0, y: 0 };
const spring = { x: [0, 0, 0, 0], v: [0, 0, 0, 0] }, camPunch = { x: 0, v: 0 };
function meleeSwing() { const w = WEAPONS[wst.cur]; if (!w.melee) return; wst.swingT = w.swing; wst.swingHit = false; sfx.play('swing', { vol: 0.8 }); }
function quickMelee() { if (!player.alive || wst.quick || wst.swingT > 0) return; const w = WEAPONS[wst.cur]; if (w.melee) return meleeSwing(); wst.quickFrom = wst.cur; switchTo(carry[2]); wst.switchT = 0.08; wst.quick = 1; }
function meleeHit(w) {
  aimBasis(); const eye = camera.position, cands = [];
  for (const list of [enemies, remoteList]) for (const e of list) {
    if (e.dead) continue; const cx = e.pos.x, cy = e.pos.y + e.h * 0.6, cz = e.pos.z, dx = cx - eye.x, dy = cy - eye.y, dz = cz - eye.z, d = Math.hypot(dx, dy, dz);
    if (d > w.reach + 0.5 || isAlly(PLAYER_T, e)) continue; if ((dx * _f.x + dy * _f.y + dz * _f.z) / d < 0.7) continue; if (!los(eye.x, eye.y, eye.z, cx, cy, cz)) continue; cands.push([d, e]);
  }
  cands.sort((a, b) => a[0] - b[0]); let hits = 0;
  for (const [, e] of cands.slice(0, w.cleave || 1)) {
    const fy = e.isRemote ? e.yaw + Math.PI : e.yaw, tx = player.pos.x - e.pos.x, tz = player.pos.z - e.pos.z, tl = Math.hypot(tx, tz) || 1;
    const behind = (Math.sin(fy) * tx + Math.cos(fy) * tz) / tl < -0.4, dmg = behind ? w.backstab : w.dmg, kb = w.knock || 4;
    const hp = new V3(e.pos.x, e.pos.y + e.h * 0.6, e.pos.z);
    const killed = e.damage(dmg, false, { x: _f.x * kb, z: _f.z * kb }, 'player'); hits++; game.hits++;
    dmgNumber(hp, dmg, behind); if (!killed) hitMarker(false, behind); debris.burst(hp.x, hp.y, hp.z, 10, 3, 0.7, 0.06, 0.05, 0.5, 1);
    if (behind) showHint('BACKSTAB!', '#ff6b5a');
  }
  game.shots++;
  if (hits) { sfx.play(w.snd); game.shake = Math.min(1, game.shake + 0.15); spring.v[1] -= 6; }
  else { const h = raycast(eye, _f, w.reach, false); if (h.box && h.t < w.reach) { sfx.play(w.id === 'pan' ? 'clang' : 'impact'); sparks.burst(eye.x + _f.x * h.t, eye.y + _f.y * h.t, eye.z + _f.z * h.t, 6, 3, 1, 0.8, 0.5, 0.25, 1); spring.v[1] -= 5; } }
}
function switchTo(i) {
  if (i === wst.cur || !carry.includes(i) || !player.alive) return;
  wst.last = wst.cur; wst.cur = i; wst.switchT = WEAPONS[i].swap; wst.reloading = false; wst.reloadT = 0; wst.consec = 0;
  vmModels.forEach((m, k) => { m.g.visible = k === i; m.flash.visible = false; });
  sfx.play('switch');
}
function startReload() {
  const w = WEAPONS[wst.cur], s = inv[wst.cur]; if (w.melee) return;
  if (wst.reloading || s.mag >= w.mag || s.res <= 0 || wst.switchT > 0) return;
  wst.reloading = true; wst.reloadT = w.shell ? w.reload + 0.15 : w.reload * (s.mag > 0 ? 0.85 : 1); wst.reloadTotal = wst.reloadT;
  sfx.play(w.shell ? 'shell' : 'magout');
}
function updateReload(dt) {
  if (!wst.reloading) return;
  const w = WEAPONS[wst.cur], s = inv[wst.cur];
  wst.reloadT -= dt;
  if (wst.reloadT <= 0) {
    if (w.shell) {
      s.mag++; if (isFinite(s.res)) s.res--; sfx.play('shell');
      if (s.mag < w.mag && s.res > 0) { wst.reloadT = w.reload; wst.reloadTotal = w.reload; }
      else { wst.reloading = false; sfx.play('pump'); wst.pumpT = 0.3; }
    } else {
      const need = w.mag - s.mag, take = isFinite(s.res) ? Math.min(need, s.res) : need;
      s.mag += take; if (isFinite(s.res)) s.res -= take; wst.reloading = false; sfx.play('magin');
    }
  }
}
const _f = new V3(), _r = new V3(), _u = new V3(), _o = new V3(), _d = new V3(), _hp = new V3();
function aimBasis() {
  camera.updateMatrixWorld(); const e = camera.matrixWorld.elements;
  _r.set(e[0], e[1], e[2]); _u.set(e[4], e[5], e[6]); _f.set(-e[8], -e[9], -e[10]);
}
function currentSpread(w) {
  const sp = Math.hypot(player.vel.x, player.vel.z);
  const firstShot = !w.pellets && wst.sinceShot > 0.32 && !(w.scope && wst.ads < 0.5) ? 0.35 : 1; // tap-firing is rewarded
  let s = (w.spread * firstShot + wst.bloom) * lerp(1, w.ads, wst.ads);
  s += w.move * clamp(sp / 6, 0, 1.4) * lerp(1, 0.5, wst.ads);
  if (!player.onGround) s += w.air;
  if (player.crouch > 0.5 && player.onGround && !player.sliding) s *= 0.75;
  return s;
}
function fire() {
  const w = WEAPONS[wst.cur], s = inv[wst.cur];
  s.mag--; wst.consec++; wst.sinceShot = 0; game.shots++;
  aimBasis();
  const spread = currentSpread(w), n = w.pellets || 1;
  _o.copy(camera.position);
  // muzzle world pos (approx) for tracers
  const mz = lerp(0.55, 0.5, wst.ads);
  const muzzleW = new V3().copy(_o).addScaledVector(_f, mz).addScaledVector(_r, lerp(0.14, 0, wst.ads)).addScaledVector(_u, lerp(-0.12, -0.05, wst.ads));
  let anyHit = false, killed = 0; const dmgAcc = new Map(); let firstEnd = null;
  const rot = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    let a, rr;
    if (n > 1) { // fixed, learnable shotgun pattern: 1 centre, inner ring of 4, outer ring of 4
      const ring = i === 0 ? 0 : i <= 4 ? 0.5 : 1; a = rot + (i <= 4 ? i : i + 0.5) * Math.PI / 2 + rand(-0.15, 0.15);
      rr = (ring + rand(-0.06, 0.06)) * Math.tan(spread);
    } else { a = Math.random() * Math.PI * 2; rr = Math.sqrt(Math.random()) * Math.tan(spread); }
    _d.copy(_f).addScaledVector(_r, Math.cos(a) * rr).addScaledVector(_u, Math.sin(a) * rr).normalize();
    let origin = _o.clone(), ignore = null, pierce = w.pierce ? 2 : 1, dmgMul = 1, travelled = 0;
    while (pierce-- > 0) {
      const hit = raycast(origin, _d, 300, true, ignore);
      _hp.copy(origin).addScaledVector(_d, hit.t);
      const dist = travelled + hit.t; if (!firstEnd) firstEnd = _hp.clone();
      if (i < 3 || n === 1) spawnTracer(i === 0 ? muzzleW : origin, _hp, 0xffe2a0, 360, 0.02);
      if (hit.enemy && isAlly(PLAYER_T, hit.enemy)) break; // teammate: no friendly fire
      if (hit.enemy) {
        const [r0, r1, rmin] = w.range; const fall = dist <= r0 ? 1 : dist >= r1 ? rmin : lerp(1, rmin, (dist - r0) / (r1 - r0));
        const dmg = w.dmg * fall * (hit.head ? w.head * cls().headMul : 1) * dmgMul;
        const k = hit.enemy.damage(dmg, hit.head, { x: _d.x * (n > 1 ? 1.2 : 2), z: _d.z * (n > 1 ? 1.2 : 2) });
        const acc = dmgAcc.get(hit.enemy) || { d: 0, head: false, p: _hp.clone() }; acc.d += dmg; acc.head = acc.head || hit.head; dmgAcc.set(hit.enemy, acc);
        if (k) killed++;
        anyHit = true;
        debris.burst(_hp.x, _hp.y, _hp.z, hit.head ? 10 : 5, 3, 0.75, 0.08, 0.06, 0.5, 1, -_d.x, -_d.y, -_d.z);
        if (!k) hitMarker(false, hit.head);
        if (w.pierce) { ignore = hit.enemy; origin = _hp.clone().addScaledVector(_d, 0.05); travelled = dist; dmgMul = 0.7; continue; }
      } else if (hit.box) {
        if (hit.box.barrel) hit.box.barrel.hit(w.dmg);
        else if (hit.t < 300) { addDecal(_hp, hit.nx, hit.ny, hit.nz); if (i < 4) sparks.burst(_hp.x, _hp.y, _hp.z, 4, 4, 1, 0.75, 0.4, 0.25, 1, hit.nx, hit.ny, hit.nz); if (i < 3 && Math.random() < 0.6) debris.burst(_hp.x, _hp.y, _hp.z, 2, 2, 0.35, 0.33, 0.3, 0.6, 1, hit.nx, hit.ny, hit.nz); }
      }
      break;
    }
  }
  if (anyHit) game.hits++;
  if (anyHit && !killed) sfx.play('hit');
  for (const v of dmgAcc.values()) dmgNumber(v.p, v.d, v.head);
  if (s.mag > 0 && s.mag <= Math.ceil(w.mag * 0.25)) sfx.play('low');
  if (MP.active && firstEnd) netSend({ t: 'shot', a: v3a(muzzleW), b: v3a(firstEnd), w: w.id });
  // recoil
  const climb = 1 + Math.min(wst.consec, 10) * 0.05;
  const kk = w.kick * climb * lerp(1, 0.75, wst.ads) * (player.crouch > 0.5 ? 0.8 : 1);
  recoil.p += kk * 0.7; player.pitch = clamp(player.pitch + kk * 0.3, -1.5, 1.5);
  const vk = (w.vkick || 1) * (1 - wst.ads * 0.35) * (player.crouch > 0.5 ? 0.85 : 1); // spring-driven weapon kick: back, up, random roll
  spring.v[0] += 1.5 * vk; spring.v[1] += 10 * vk; spring.v[2] += rand(-2.5, 2.5) * vk; spring.v[3] += rand(-6, 6) * vk; camPunch.v += rand(-0.6, 0.6) * vk;
  if (w.bolt) wst.boltT = 60 / w.rpm;
  recoil.y += (w.pattern ? w.pattern[(wst.consec - 1) % w.pattern.length] + rand(-0.2, 0.2) : rand(-1, 1)) * w.kickYaw; vm.kick = Math.min(vm.kick + (w.id === 'shotgun' || w.id === 'dmr' ? 1 : 0.55), 1.4);
  wst.bloom = Math.min(w.maxBloom, wst.bloom + w.bloom);
  wst.fireCD += 60 / w.rpm;
  if (w.id === 'shotgun') { wst.pumpT = 0.45; setTimeout(() => sfx.play('pump', { vol: 0.8 }), 280); }
  const m = vmModels[wst.cur]; m.flash.visible = true; m.flash.material.rotation = Math.random() * 6; const fs = w.id === 'shotgun' || w.id === 'revolver' ? 0.32 : w.id === 'pistol' || w.id === 'smg' ? 0.18 : 0.24; m.flash.scale.set(fs, fs, fs);
  vm.flashT = 0.045; muzzleLight.position.copy(muzzleW); muzzleLight.intensity = 25;
  m.slideT = 1; if (m.cyl) m.cylTarget = (m.cylTarget || 0) + Math.PI / 3;
  if (w.id === 'shotgun') setTimeout(() => { if (vmModels[wst.cur] === m) ejectCasing(m); }, 300); else ejectCasing(m);
  if (w.id !== 'smg') debris.burst(muzzleW.x, muzzleW.y, muzzleW.z, w.id === 'shotgun' || w.id === 'dmr' ? 5 : 2, 0.6, 0.5, 0.5, 0.5, 0.8, -0.15, _f.x * 0.5, 0.3, _f.z * 0.5);
  sfx.gun(w.snd, { supp: w.supp, comp: w.comp });
  // gunfire alerts nearby enemies
  noise(player.pos, w.supp ? 14 : 45, PLAYER_T);
}
function updateWeapon(dt) {
  const w = WEAPONS[wst.cur], s = inv[wst.cur];
  wst.sinceShot += dt;
  if (wst.switchT > 0) wst.switchT -= dt;
  wst.fireCD = Math.max(wst.fireCD - dt, w.auto ? -dt : -1);
  if (wst.fireCD < 0 && !mouseL) wst.fireCD = 0;
  if (wst.sinceShot > 0.08) wst.bloom = Math.max(0, wst.bloom - w.maxBloom * 3 * dt);
  if (!mouseL) wst.consec = 0;
  updateReload(dt);
  if (wst.swingT > 0) { wst.swingT -= dt; if (!wst.swingHit && w.swing - wst.swingT >= w.hitAt) { wst.swingHit = true; meleeHit(w); } }
  if (wst.quick && wst.switchT <= 0) { if (wst.quick === 1 && w.melee) { wst.quick = 2; meleeSwing(); } else if (wst.quick === 2 && wst.swingT <= 0) { wst.quick = false; switchTo(wst.quickFrom); } }
  if (wst.boltT > 0) { const b0 = wst.boltT; wst.boltT -= dt; const m = vmModels[wst.cur]; if (b0 > 0.75 && wst.boltT <= 0.75) sfx.play('bolt'); if (b0 > 0.55 && wst.boltT <= 0.55 && m) ejectCasing(m); }
  const adsWanted = !w.melee && wst.boltT <= 0.2 && (settings.adsToggle ? wst.adsOn : mouseR) && !player.sprinting && wst.switchT <= 0 && !(wst.reloading && !w.shell) && player.alive;
  wst.ads = damp(wst.ads, adsWanted ? 1 : 0, w.adsSpeed * 1.4, dt);
  if (wst.ads < 0.01 && !adsWanted) wst.ads = 0;
  if (w.melee) { if (mouseL && player.alive && wst.switchT <= 0 && wst.swingT <= 0 && !wst.quick) meleeSwing(); if (!mouseL) wst.held = false; return; }
  if (mouseL && player.alive && wst.switchT <= 0 && player.sprintLock <= 0 && wst.boltT <= 0) {
    if (!w.auto && wst.held) return;
    if (wst.reloading && w.shell && s.mag > 0) { wst.reloading = false; }
    if (wst.reloading) return;
    if (wst.fireCD <= 0) {
      if (s.mag <= 0) { if (!wst.held) sfx.play('empty'); wst.held = true; wst.fireCD = 0.25; startReload(); return; }
      let guard = 0;
      while (wst.fireCD <= 0 && s.mag > 0 && guard++ < 3) { fire(); if (!w.auto) break; }
      wst.held = true;
      if (s.mag <= 0 && s.res > 0) setTimeout(() => { if (inv[wst.cur] === s && s.mag <= 0) startReload(); }, 250);
    }
  }
  if (!mouseL) wst.held = false;
}
function throwGrenade() {
  if (player.grenades <= 0 || player.gcd > 0 || !player.alive) return;
  player.grenades--; player.gcd = 0.9; aimBasis();
  const pos = camera.position.clone().addScaledVector(_f, 0.5).addScaledVector(_r, 0.15);
  const vel = _f.clone().multiplyScalar(16).add(new V3(0, 3.5, 0)).addScaledVector(player.vel, 0.6);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshLambertMaterial({ color: 0x3b4a2a, emissive: 0x220000 }));
  mesh.position.copy(pos); fx.add(mesh); grenades.push({ pos, vel, mesh, t: 2.0, owner: MP.myId });
  if (MP.active) netSend({ t: 'nade', p: v3a(pos), v: v3a(vel) });
  sfx.play('throw'); vm.kick = 0.6;
}
function pointInBox(x, y, z, r) { for (const b of world.boxes) if (!b.dead && x + r > b.x0 && x - r < b.x1 && y + r > b.y0 && y - r < b.y1 && z + r > b.z0 && z - r < b.z1) return true; return false; }
function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i]; g.t -= dt; g.vel.y -= G * dt;
    const axes = ['x', 'y', 'z'];
    for (const a of axes) {
      g.pos[a] += g.vel[a] * dt;
      if (pointInBox(g.pos.x, g.pos.y, g.pos.z, 0.1)) {
        g.pos[a] -= g.vel[a] * dt;
        if (Math.abs(g.vel[a]) > 2.5) sfx.play('bounce', spatial(g.pos));
        g.vel[a] *= -0.4; for (const o of axes) if (o !== a) g.vel[o] *= 0.75;
      }
    }
    g.mesh.position.copy(g.pos); g.mesh.material.emissive.setRGB(Math.floor(g.t * (g.t < 0.8 ? 12 : 4)) % 2 ? 0.8 : 0.1, 0, 0);
    if (g.t <= 0) { fx.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); grenades.splice(i, 1);
      if (g.brew) { clouds.push({ x: g.pos.x, y: g.pos.y - 0.1, z: g.pos.z, r: 4, t: 5, tick: 0, owner: g.owner }); sfx.play('brew', spatial(g.pos)); }
      else explosion(g.pos.clone(), 6.5 * (g.owner === MP.myId && settings.cls === 'witch' ? 1.2 : 1), 160, g.owner); }
  }
}
function explosion(p, radius, dmg, owner) {
  spawnBoom(p, radius * 0.75);
  sparks.burst(p.x, p.y, p.z, 50, 12, 1, 0.6, 0.2, 0.7, 0.6);
  debris.burst(p.x, p.y, p.z, 24, 6, 0.15, 0.13, 0.12, 1.4, 0.2, 0, 0.5, 0);
  const s = spatial(p); sfx.boom(s.dist, s.pan, 1.2); noise(p, 60, null);
  const dp = Math.hypot(p.x - player.pos.x, p.y - player.pos.y - 1, p.z - player.pos.z);
  game.shake = Math.min(1.2, game.shake + clamp(1 - dp / 30, 0, 1) * 0.8);
  for (const e of enemies) {
    if (e.dead) continue;
    const cx = e.pos.x, cy = e.pos.y + e.h * 0.5, cz = e.pos.z, d = Math.hypot(cx - p.x, cy - p.y, cz - p.z);
    if (d < radius) {
      let f = 1 - d / radius; if (!los(p.x, p.y + 0.2, p.z, cx, cy, cz)) f *= 0.35;
      const dir = { x: (cx - p.x) / (d || 1) * 9 * f, z: (cz - p.z) / (d || 1) * 9 * f };
      const atk = owner instanceof Enemy ? owner : 'player'; if (isAlly(atk === 'player' ? PLAYER_T : atk, e)) continue; if (!e.damage(dmg * f, false, dir, atk) && f > 0 && atk === 'player') hitMarker(false, false);
    }
  }
  if (player.alive && dp < radius) {
    let f = 1 - dp / radius; const ph = playerHead(new V3()); if (!los(p.x, p.y + 0.2, p.z, ph.x, ph.y - 0.6, ph.z)) f *= 0.35;
    if (!isAlly(owner, PLAYER_T)) damagePlayer(dmg * f * (owner instanceof Enemy ? 0.6 : MP.active && owner !== MP.myId ? 1 : 0.45), p, owner);
    const dx = player.pos.x - p.x, dy = player.pos.y + 0.9 - p.y, dz = player.pos.z - p.z, l = Math.hypot(dx, dy, dz) || 1;
    player.vel.x += dx / l * 11 * f; player.vel.y += Math.max(3, dy / l * 11) * f; player.vel.z += dz / l * 11 * f; player.onGround = false;
  }
  for (const b of barrels) if (!b.box.dead && b.fuse <= 0 && Math.hypot(b.x - p.x, 0.6 - p.y, b.z - p.z) < radius * 0.9) b.fuse = 0.18 + Math.random() * 0.1;
}

// ============================================================ PLAYER MOVEMENT
function accelerate(wx, wz, wishspeed, accel, cap, dt) {
  const cur = player.vel.x * wx + player.vel.z * wz;
  const add = Math.min(wishspeed, cap) - cur; if (add <= 0) return;
  const a = Math.min(accel * wishspeed * dt, add);
  player.vel.x += a * wx; player.vel.z += a * wz;
}
function updatePlayer(dt) {
  const P = player;
  if (!P.alive) { P.vel.x *= 0.9; P.vel.z *= 0.9; P.stepSmooth = 0; moveBody(P, dt); return; }
  let fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (gp.on && (gp.mx || gp.my)) { fwd = -gp.my; str = gp.mx; }
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  let wx = -sy * fwd + cy * str, wz = -cy * fwd - sy * str; const wmag = Math.min(1, Math.hypot(wx, wz)); const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
  const crouchKey = !!(keys.KeyC || keys.ControlLeft);
  const speed = Math.hypot(P.vel.x, P.vel.z);
  P.sprinting = !!(keys.ShiftLeft || keys.ShiftRight) && fwd > 0 && !mouseL && wst.ads < 0.3 && !crouchKey && !P.sliding;
  if (P.sprinting) P.sprintLock = 0.14; else P.sprintLock = Math.max(0, P.sprintLock - dt);
  // slide
  if (crouchKey && !P.crouchKeyPrev && P.onGround && speed > 6.2 && P.slideCD <= 0 && !P.sliding) {
    P.sliding = true; P.slideT = 0.9; const boost = Math.min(speed * 1.35 + 1, 13.5); P.vel.x *= boost / speed; P.vel.z *= boost / speed;
    sfx.play('slide'); vm.kick = 0.3;
  }
  P.crouchKeyPrev = crouchKey;
  if (P.sliding) { P.slideT -= dt; if (!crouchKey || P.slideT <= 0 || speed < 3.5) { P.sliding = false; P.slideCD = 0.5; } }
  P.slideCD -= dt;
  // crouch height
  const wantCrouch = crouchKey || P.sliding;
  if (wantCrouch) P.crouch = Math.min(1, P.crouch + dt * 8);
  else if (P.crouch > 0) { if (!anyOverlap(P.pos.x, P.pos.y, P.pos.z, P.r, 1.75)) P.crouch = Math.max(0, P.crouch - dt * 7); }
  P.h = lerp(1.75, 1.1, P.crouch);
  // move
  let max = (P.crouch > 0.5 ? 3.0 : P.sprinting ? 8.6 : 5.8) * (WEAPONS[wst.cur].speedMul || 1);
  max *= lerp(1, 0.62, wst.ads) * cls().speed * (P.stimT > 0 ? 1.3 : 1);
  if (P.onGround) {
    const f = P.sliding ? 0.8 : 7.5;
    if (speed > 0) { const drop = (P.sliding ? speed : Math.max(speed, 2.5)) * f * dt; const ns = Math.max(speed - drop, 0) / speed; P.vel.x *= ns; P.vel.z *= ns; }
    if (!P.sliding && wl > 0) accelerate(wx, wz, max * Math.max(0.35, wmag), 11, max * Math.max(0.35, wmag), dt);
    if (P.sliding && wl > 0) accelerate(wx, wz, 2, 3, 2, dt);
  } else if (wl > 0) accelerate(wx, wz, max, 10, 1.0, dt);
  // jump
  P.jumpBuf -= dt; P.coyote = P.onGround ? 0.1 : P.coyote - dt;
  if (P.jumpBuf > 0 && P.coyote > 0) {
    P.vel.y = 7.4 * cls().jump; P.jumpBuf = 0; P.coyote = 0; P.onGround = false;
    if (P.sliding) { P.sliding = false; P.slideCD = 0.3; }
    sfx.play('jump');
  }
  // pads
  if (P.onGround && P.ground && P.ground.pad) {
    const pd = P.ground.pad; P.vel.y = pd.vy; P.vel.x = pd.px + P.vel.x * 0.3; P.vel.z = pd.pz + P.vel.z * 0.3; P.onGround = false;
    sfx.play('pad'); sparks.burst(P.pos.x, P.pos.y + 0.2, P.pos.z, 20, 5, 0.2, 1, 0.5, 0.6, -0.3);
  }
  const vyBefore = P.vel.y, wasGround = P.onGround;
  moveBody(P, dt);
  if (!wasGround && P.onGround && vyBefore < -5) { P.landKick = Math.min(-vyBefore * 0.008, 0.12); sfx.play('land', { vol: clamp(-vyBefore / 14, 0.3, 1) }); }
  if (P.pos.y < -15) { const s = world.L.spawn; P.pos.set(s.x, s.y + 0.1, s.z); P.vel.set(0, 0, 0); }
  // footsteps
  if (P.onGround && !P.sliding && speed > 2) { P.stepAcc += speed * dt; if (P.stepAcc > (P.sprinting ? 2.7 : 2.1)) { P.stepAcc = 0; if (P.crouch < 0.5) noise(P.pos, P.sprinting ? 14 : 7, PLAYER_T); sfx.play('step', { vol: P.crouch > 0.5 ? 0.3 : P.sprinting ? 0.9 : 0.6 }); } }
}

// ============================================================ VIEWMODEL & CAMERA
const vm = { kick: 0, swayX: 0, swayY: 0, bob: 0, flashT: 0, sprint: 0 };
function updateCamera(dt) {
  const P = player, w = WEAPONS[wst.cur];
  P.stepSmooth = damp(P.stepSmooth, 0, 16, dt); P.landKick = damp(P.landKick, 0, 9, dt);
  const speed = Math.hypot(P.vel.x, P.vel.z);
  if (P.onGround && !P.sliding && speed > 0.5) P.bob += dt * speed * 1.55;
  const bobAmt = P.onGround && !P.sliding ? clamp(speed / 6, 0, 1.4) : 0;
  const by = Math.abs(Math.sin(P.bob)) * 0.045 * bobAmt * (1 - wst.ads * 0.8);
  const strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  P.tilt = damp(P.tilt, P.sliding ? 0.06 : -strafe * 0.012, 8, dt);
  recoil.p = damp(recoil.p, 0, wst.sinceShot > 0.06 ? 9 : 2, dt); recoil.y = damp(recoil.y, 0, 7, dt);
  game.shake = Math.max(0, game.shake - dt * 1.6);
  const sh = game.shake * game.shake * 0.05;
  let breathe = 0, breatheY = 0;
  if (w.scope && wst.ads > 0.9) { const k = (keys.ShiftLeft || keys.ShiftRight) ? 0.15 : 1; breathe = Math.sin(game.time * 1.3) * 0.004 * k; breatheY = Math.sin(game.time * 0.9) * 0.003 * k; }
  camera.position.set(P.pos.x, P.pos.y + P.h - 0.12 + P.stepSmooth + by - P.landKick - (P.alive ? 0 : 0), P.pos.z);
  camera.rotation.set(clamp(P.pitch + recoil.p + rand(-sh, sh) + breatheY, -1.55, 1.55), P.yaw + recoil.y + rand(-sh, sh) + breathe, P.tilt + camPunch.x * 0.02);
  if (!P.alive && MP.active) { const k = Math.min(1, (game.deadT || 0) / 0.8); camera.position.y -= k * 1.1; camera.rotation.z += k * 0.5; }
  const zoom = lerp(1, w.zoom, wst.ads);
  const base = settings.fov + (P.sprinting ? 6 : 0) + (P.sliding ? 8 : 0);
  const fovT = 2 * Math.atan(Math.tan(base * Math.PI / 360) / zoom) * 180 / Math.PI;
  camera.fov = damp(camera.fov, fovT, 14, dt); camera.updateProjectionMatrix();
  sky.position.copy(camera.position); if (stars) stars.position.copy(camera.position);
  // viewmodel
  const hip = w.hip, ap = w.adsPos, a = wst.ads;
  vm.swayX = damp(vm.swayX, clamp(-mdx * 0.0004, -0.05, 0.05), 10, dt); vm.swayY = damp(vm.swayY, clamp(mdy * 0.0004, -0.05, 0.05), 10, dt); mdx = mdy = 0;
  vm.kick = damp(vm.kick, 0, 14, dt);
  for (let i = 0; i < 4; i++) { const ac = -260 * spring.x[i] - 20 * spring.v[i]; spring.v[i] += ac * dt; spring.x[i] += spring.v[i] * dt; }
  { const ac = -160 * camPunch.x - 14 * camPunch.v; camPunch.v += ac * dt; camPunch.x += camPunch.v * dt; }
  vm.sprint = damp(vm.sprint, P.sprinting ? 1 : 0, 10, dt);
  const sw = (1 - a * 0.9);
  let x = lerp(hip[0], ap[0], a) + vm.swayX * sw + Math.sin(P.bob) * 0.012 * bobAmt * sw;
  let y = lerp(hip[1], ap[1], a) + vm.swayY * sw - by * 0.3 - P.landKick * 0.5 - vm.sprint * 0.05;
  let z = lerp(hip[2], ap[2], a) + vm.kick * 0.06;
  let rx = vm.kick * 0.12 * (1 - a * 0.6) - vm.sprint * 0.25, ry = vm.sprint * 0.55 + vm.swayX * 2 * sw, rz = vm.sprint * 0.25 + P.tilt * 2;
  if (wst.reloading) {
    const p = 1 - wst.reloadT / wst.reloadTotal, k = Math.sin(Math.PI * clamp(p, 0, 1));
    if (w.shell) { rx -= 0.2; rz += 0.3; y -= 0.03 + Math.sin(p * Math.PI) * 0.02; }
    else { rx -= k * 0.7; rz += k * 0.35; y -= k * 0.08; }
  }
  if (wst.switchT > 0) { const k = wst.switchT / w.swap; y -= k * 0.35; rx -= k * 0.6; }
  if (!P.alive) y -= 0.5;
  z += spring.x[0] * 0.045; rx += spring.x[1] * 0.012; ry += spring.x[2] * 0.012; rz += spring.x[3] * 0.012;
  if (w.melee && wst.swingT > 0) { const p = 1 - wst.swingT / w.swing, k = Math.sin(Math.min(1, p / 0.7) * Math.PI);
    if (w.id === 'knife') { z -= k * 0.22; x -= k * 0.08; rx += k * 0.3; ry += k * 0.6; }
    else if (w.id === 'pan') { rx += -1.2 + Math.min(1, p / 0.45) * 2.0 - (p > 0.45 ? (p - 0.45) * 1.5 : 0); y += 0.12 * (1 - p); z -= k * 0.1; }
    else { ry += 1.1 - Math.min(1, p / 0.6) * 2.4; x += 0.15 - Math.min(1, p / 0.6) * 0.35; rz += 0.6 * k; z -= k * 0.08; } }
  else if (w.melee) { rx += 0.25; ry += 0.3; rz -= 0.2; }
  if (wst.boltT > 0) { const bm = vmModels[wst.cur]; const cyc = 60 / w.rpm, p = 1 - wst.boltT / cyc, k = p > 0.25 && p < 0.75 ? Math.sin((p - 0.25) / 0.5 * Math.PI) : 0;
    if (bm && bm.bolt) bm.bolt.position.z = k * 0.08; rz -= k * 0.25; y -= k * 0.03; }
  vmRoot.position.set(x, y, z); vmRoot.rotation.set(rx, ry, rz);
  const m = vmModels[wst.cur];
  if (m.pump) { wst.pumpT = Math.max(0, wst.pumpT - dt); const k = wst.pumpT > 0 ? Math.sin((1 - wst.pumpT / 0.45) * Math.PI) : 0; m.pump.position.z = k * 0.07; }
  m.slideT = Math.max(0, (m.slideT || 0) - dt * 14);
  if (m.slide) m.slide.position.z = (inv[wst.cur].mag === 0 ? 1 : m.slideT) * 0.028; // slide locks back on empty
  if (m.cyl) { m.cylRot = damp(m.cylRot || 0, m.cylTarget || 0, 18, dt); m.cyl.rotation.z = m.cylRot; }
  if (m.mag) { let my = 0; if (wst.reloading && !w.shell) { const p = 1 - wst.reloadT / wst.reloadTotal; my = p < 0.12 ? 0 : p < 0.4 ? (p - 0.12) / 0.28 : p < 0.55 ? 1 : p < 0.82 ? 1 - (p - 0.55) / 0.27 : 0; } m.mag.position.y = -my * 0.22; m.mag.visible = my < 0.95; }
  updateCasings(dt);
  vm.flashT -= dt; if (vm.flashT <= 0) m.flash.visible = false;
  muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 600);
  m.g.visible = !(w.scope && a > 0.92);
  vmCam.fov = 60;
}

// ============================================================ HUD
const hud = { vig: 0, hitT: 0, msgT: 0, streakT: 0, hintT: 0 };
let hudCache = {};
const setText = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).innerHTML = v; } };
function showMsg(h, p, t) { $('msgh').textContent = h; $('msgp').textContent = p || ''; hud.msgT = t; }
function showStreak(t) { $('streak').textContent = t; hud.streakT = 1.6; }
function showHint(t, c) { const el = $('hint'); el.textContent = t; el.style.color = c || '#ffcf6b'; hud.hintT = 1.4; }
function hitMarker(kill, head) { const h = $('hit'); h.classList.toggle('head', !!head || kill); hud.hitT = kill ? 0.35 : 0.18; hud.hitScale = kill ? 1.5 : 1; if (head && !kill) sfx.play('head'); }
function addFeed(html, hs) {
  const f = $('feed'), d = document.createElement('div'); d.innerHTML = html; if (hs) d.className = 'hs'; f.prepend(d);
  while (f.children.length > 5) f.lastChild.remove();
  setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 450); }, 3500);
}
const dmgDirs = [...document.querySelectorAll('#dirs div')].map(el => ({ el, t: 0, a: 0 })); let dmgI = 0;
function addDmgDir(a) { const d = dmgDirs[dmgI]; dmgI = (dmgI + 1) % dmgDirs.length; d.a = a; d.t = 1.2; }
const radarCtx = $('radar').getContext('2d');
function drawRadar() {
  const g = radarCtx, S = 170, R = 2.2; g.clearRect(0, 0, S, S);
  g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, 7); g.clip();
  g.translate(S / 2, S / 2); g.rotate(player.yaw); g.scale(R / radarImg.RS, R / radarImg.RS);
  g.translate(-(player.pos.x - radarImg.x0) * radarImg.RS, -(player.pos.z - radarImg.z0) * radarImg.RS);
  g.globalAlpha = 0.85; g.drawImage(radarImg.c, 0, 0); g.globalAlpha = 1;
  g.restore();
  g.save(); g.translate(S / 2, S / 2); g.rotate(player.yaw);
  for (const p of pickups) { if (!p.active) continue; g.fillStyle = p.type === 'health' ? '#5dff9a' : '#ffc933'; g.fillRect((p.pos.x - player.pos.x) * R - 2, (p.pos.z - player.pos.z) * R - 2, 4, 4); }
  for (const r of remoteList) {
    if (r.dead) continue; const dx = r.pos.x - player.pos.x, dz = r.pos.z - player.pos.z;
    if (game.time - r.lastFired < 1.5 || Math.hypot(dx, dz) < (settings.cls === 'wolf' ? 20 : 8) || player.pulseT > 0) { g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(dx * R, dz * R, 3.5, 0, 7); g.fill(); }
  }
  for (const e of enemies) {
    if (e.dead) continue; const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz);
    if (isAlly(PLAYER_T, e)) { g.fillStyle = '#4fb4ff'; g.beginPath(); g.arc(dx * R, dz * R, 3.2, 0, 7); g.fill(); continue; }
    if (game.time - e.lastFired < 2 || d < (settings.cls === 'wolf' ? 20 : 12) || e.aimT > 0 || player.pulseT > 0) { g.fillStyle = e.T.sniper ? '#ff3030' : '#ff5a4a'; g.beginPath(); g.arc(dx * R, dz * R, e.T.scale > 1.1 ? 4.5 : 3.2, 0, 7); g.fill(); }
  }
  g.restore();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(S / 2, S / 2 - 7); g.lineTo(S / 2 + 5, S / 2 + 5); g.lineTo(S / 2, S / 2 + 2); g.lineTo(S / 2 - 5, S / 2 + 5); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(S / 2, S / 2, 12 * R, 0, 7); g.stroke();
}
let fpsAcc = 0, fpsN = 0;
function updateHUD(dt) {
  const w = WEAPONS[wst.cur], s = inv[wst.cur];
  const alive = enemies.filter(e => !e.dead).length;
  if (MP.active || game.mode === 'botdm') {
    const bd = game.mode === 'botdm', t = Math.max(0, Math.ceil(bd ? BD.matchT : MP.matchT)); setText('wavel', 'TIME'); setText('wave', Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'));
    if (bd && BD.teams) { setText('leftl', 'BLUE · YOU'); setText('left', `<span style="color:#7ac4ff">${BD.teamKills[0]}</span> / ${BD.limit}`); setText('scorel', 'RED'); setText('score', `<span style="color:#ff7a7a">${BD.teamKills[1]}</span> / ${BD.limit}`); }
    else { let lead = null; for (const p of bd ? BD.stats : Object.values(MP.players)) if (!lead || p.kills > lead.kills) lead = p;
    setText('leftl', 'LEADER'); setText('left', lead ? esc(lead.name.slice(0, 10)) + ' ' + lead.kills : '–');
    setText('scorel', 'YOUR KILLS'); setText('score', (bd ? BD.stats[0].kills : game.kills) + ' / ' + (bd ? BD.limit : MP.limit)); }
    if (!player.alive) { $('hint').textContent = 'RESPAWNING IN ' + Math.max(0, Math.ceil(MP.respawnT)); $('hint').style.color = '#ffcf6b'; hud.hintT = 0.3; }
  } else { setText('wavel', 'WAVE'); setText('scorel', 'SCORE'); setText('wave', String(game.wave || '–')); }
  if (MP.active || game.mode === 'botdm') {} else if (game.phase === 'inter') { setText('leftl', 'NEXT WAVE'); setText('left', Math.ceil(Math.max(0, game.interT)) + 's'); }
  else { setText('leftl', 'HOSTILES'); setText('left', String(alive + game.queue.length)); }
  if (!MP.active && game.mode !== 'botdm') setText('score', String(game.score));
  setText('hpn', String(Math.ceil(player.hp))); setText('regen', String(player.regenCap));
  const hpf = $('hpfill'); const hpw = (player.hp / player.maxHp * 100) + '%';
  $('shfill').style.width = (player.shield / 60 * 100) + '%';
  const C = cls(); setText('abn', C.ability); setText('abk', player.abilityCD > 0 ? Math.ceil(player.abilityCD) + 's' : 'READY · E');
  $('abfill').style.width = ((1 - player.abilityCD / C.cd) * 100) + '%'; $('abil').classList.toggle('ready', player.abilityCD <= 0); if (hpf.style.width !== hpw) { hpf.style.width = hpw; hpf.style.background = player.hp < 35 ? 'linear-gradient(90deg,#ff3b3b,#ff8a6b)' : 'linear-gradient(90deg,#3ddc84,#9cf5c1)'; }
  setText('wname', w.name + (wst.reloading ? ' · RELOADING' : ''));
  setText('mag', w.melee ? 'MELEE' : `${s.mag} <span>/ ${isFinite(s.res) ? s.res : '∞'}</span>`);
  $('mag').classList.toggle('low', s.mag <= Math.ceil(w.mag * 0.25));
  const slots = $('slots').children; for (let i = 0; i < slots.length; i++) { const on = +slots[i].dataset.w === wst.cur; if (slots[i].classList.contains('on') !== on) slots[i].classList.toggle('on', on); }
  // inventory overlay (hold Tab) + armory hint
  const showInv = !!keys.Tab && player.alive;
  if (hudCache.inv !== showInv) { hudCache.inv = showInv; $('invp').style.display = showInv ? 'block' : 'none'; if (showInv) renderInventory(); }
  const canArm = game.phase === 'inter' && player.alive;
  if (hudCache.arm !== canArm) { hudCache.arm = canArm; $('armhint').style.opacity = canArm ? 1 : 0; }
  setText('nades', 'GRENADES ' + ('●'.repeat(player.grenades) + '○'.repeat(Math.max(0, cls().nadeMax - player.grenades))));
  // crosshair
  const spread = currentSpread(w), px = Math.tan(spread) * (innerHeight / 2) / Math.tan(camera.fov * Math.PI / 360);
  const gap = 4 + px, xh = $('xh');
  const op = (1 - wst.ads * 1.6) * (player.sprinting ? 0.3 : 1) * (settings.xhair === 'none' ? 0 : 1);
  xh.style.opacity = Math.max(0, op); if (hudCache.xs !== settings.xhair + settings.xcolor) { hudCache.xs = settings.xhair + settings.xcolor; xh.className = 'x-' + (settings.xhair || 'cross'); xh.style.setProperty('--xc', settings.xcolor || '#ffffff'); }
  if (hudCache.gap !== (gap | 0)) { hudCache.gap = gap | 0; const c = xh.children; c[0].style.top = (-gap - 9) + 'px'; c[1].style.top = gap + 'px'; c[2].style.left = (-gap - 9) + 'px'; c[3].style.left = gap + 'px'; }
  $('dot').style.opacity = w.id === 'rifle' && wst.ads > 0.85 ? 1 : 0;
  $('scope').style.opacity = w.scope && wst.ads > 0.92 ? 1 : 0; if (hudCache.sc !== w.scopeStyle) { hudCache.sc = w.scopeStyle; $('scope').className = w.scopeStyle === 'acog' ? 'acog' : ''; }
  // hitmarker
  hud.hitT -= dt; const hm = $('hit'); hm.style.opacity = Math.max(0, hud.hitT * 5); hm.style.transform = `scale(${(hud.hitScale || 1) + Math.max(0, hud.hitT) * 2})`;
  // vignette
  hud.vig = Math.max(0, hud.vig - dt * 0.9);
  $('vig').style.opacity = Math.min(1, hud.vig + (player.hp < 35 ? 0.35 + Math.sin(game.time * 5) * 0.12 : 0));
  for (const d of dmgDirs) { if (d.t > 0) { d.t -= dt; d.el.style.opacity = Math.max(0, Math.min(1, d.t)); d.el.style.transform = `rotate(${(player.yaw - d.a + Math.PI)}rad)`; } }
  hud.msgT -= dt; $('msg').style.opacity = clamp(hud.msgT * 2, 0, 1);
  hud.streakT -= dt; const st = $('streak'); st.style.opacity = clamp(hud.streakT * 2, 0, 1); st.style.transform = `scale(${1 + Math.max(0, hud.streakT - 1.3) * 1.5})`;
  if (hud.hintT > 0) hud.hintT -= dt;
  else if (s.mag === 0 && s.res > 0 && !wst.reloading) { $('hint').textContent = 'PRESS R TO RELOAD'; $('hint').style.color = '#ffcf6b'; hud.hintT = 0.01; }
  else if (s.mag === 0 && s.res === 0) { $('hint').textContent = 'NO AMMO — SWITCH WEAPON'; $('hint').style.color = '#ff6b5a'; hud.hintT = 0.01; }
  $('hint').style.opacity = hud.hintT > 0 ? clamp(hud.hintT * 3, 0, 1) : 0;
  drawRadar();
}

// ============================================================ FLOW
function showScreen(id) { for (const s of ['menu', 'pause', 'over', 'armory', 'mp', 'mpover']) $(s).classList.toggle('on', s === id); $('hud').classList.toggle('on', id === null || id === 'pause'); }
function startGame() {
  sfx.init(); music.play('start'); resize(); if (MP.peer) { sayBye(); mpCleanup(); }
  if (!world || world.def !== MAPS[settings.map] || world.shadows !== QUALITY[settings.quality].shadows) { loadMap(settings.map); world.shadows = QUALITY[settings.quality].shadows; }
  resetRun(); game.state = 'play'; showScreen(null); camera.fov = settings.fov; requestLock();
}
function pauseGame() { if (game.state !== 'play') return; game.state = 'paused'; showScreen('pause'); mouseL = mouseR = false; for (const k in keys) keys[k] = false; $('restart').style.display = MP.active ? 'none' : 'block'; $('quit').textContent = MP.active ? 'LEAVE MATCH' : 'QUIT TO MENU'; }
function resumeGame() { game.state = 'play'; showScreen(null); requestLock(); }
function renderSlots() { $('slots').innerHTML = carry.map((wi, k) => `<div data-w="${wi}">${k + 1} ${WEAPONS[wi].short}</div>`).join(''); }
function rebuildViewmodels() { // apply attachments and rebuild the weapons the player carries
  WEAPONS.forEach(applyAttachments);
  for (const i of carry) { const old = vmModels[i]; if (old) vmRoot.remove(old.g); vmModels[i] = makeGun(WEAPONS[i]); }
  vmModels.forEach((m, i) => { if (m) m.g.visible = i === wst.cur; });
}
function renderInventory() {
  $('invlist').innerHTML = (MP.active ? scoreTable(Object.entries(MP.players).sort((a, b) => b[1].kills - a[1].kills)) : game.mode === 'botdm' ? botBoard() : '') + carry.map((wi, k) => { const w = WEAPONS[wi], s = inv[wi];
    return `<div class="invrow${wi === wst.cur ? ' on' : ''}"><kbd>${k + 1}</kbd><div><b>${w.name}</b><small>${['PRIMARY', 'SECONDARY', 'MELEE'][k]} · ${w.desc}</small></div><span>${w.melee ? '—' : s.mag + ' / ' + (isFinite(s.res) ? s.res : '∞')}</span></div>`; }).join('')
    + `<div class="invrow"><kbd>E</kbd><div><b>${cls().name} · ${cls().ability}</b><small>${cls().abDesc} · ${cls().passive}</small></div><span>${player.abilityCD > 0 ? Math.ceil(player.abilityCD) + 's' : 'READY'}</span></div>`
    + `<div class="invrow"><kbd>G</kbd><div><b>FRAG GRENADE</b><small>2s fuse · bounces · damages you too</small></div><span>${player.grenades} / ${cls().nadeMax}</span></div>`;
}
function statBars(w) {
  const rows = [['DAMAGE', w.dmg * (w.pellets || 1) / 110], ['FIRE RATE', w.rpm / 900], ['RANGE', w.range[1] / 140], ['CONTROL', 1 - clamp(w.kick / 0.06, 0, 0.9)], ['HANDLING', 1 - (w.swap - 0.22) / 0.3]];
  return rows.map(([n, v]) => `<div class="bar"><small>${n}</small><i><u style="width:${Math.round(clamp(v, 0.06, 1) * 100)}%"></u></i></div>`).join('');
}
function renderLoadout(el, onChange) {
  el.innerHTML = '';
  const lo = getLO(); const hd = document.createElement('div'); hd.className = 'lohead'; hd.textContent = 'Loadout for ' + cls().name + ' — each class remembers its own'; el.appendChild(hd);
  for (const slot of ['primary', 'secondary', 'melee']) {
    const h = document.createElement('div'); h.className = 'lslot'; h.textContent = { primary: 'PRIMARY  [1]', secondary: 'SECONDARY  [2]', melee: 'MELEE  [3] · quick melee [V]' }[slot]; el.appendChild(h);
    const row = document.createElement('div'); row.className = 'wcards';
    for (const w of WEAPONS.filter(w => w.slot === slot)) {
      const b = document.createElement('button'); b.className = 'wcard' + (lo[slot] === w.id ? ' on' : ''); b.dataset.w = w.id;
      const th = THUMBS[w.id] ? `<img class="thumb" src="${THUMBS[w.id]}" alt="">` : '<div class="thumb"></div>';
      b.innerHTML = th + `<b>${w.name}</b><span>${w.desc}</span>` + (w.melee ? `<em>${w.dmg} damage · ${w.backstab} backstab · reach ${w.reach}m</em>` : `${statBars(w)}<em>${w.mag} rounds · ${w.auto && !w.shell ? 'full-auto' : w.shell ? 'pump' : w.bolt ? 'bolt-action' : 'semi-auto'} · headshot ×${w.head}</em>`);
      b.onclick = () => { setLO(slot, w.id); renderLoadout(el, onChange); onChange && onChange(); previewSelect(w.id); };
      b.onmouseenter = () => previewSelect(w.id);
      row.appendChild(b);
    }
    el.appendChild(row);
    const sel = WEAPONS[widx(lo[slot])];
    const kinds = [['optic', ATT_OPTS.optic[sel.id] || []], ['muzzle', ATT_OPTS.muzzle[sel.id] ? ['none', 'supp', 'comp'] : []], ['mag', ATT_OPTS.mag[sel.id] ? ['std', 'ext'] : []]].filter(k => k[1].length > 1);
    if (kinds.length) {
      const ab = document.createElement('div'); ab.className = 'attrow'; ab.innerHTML = `<small>${sel.short} ATTACHMENTS</small>`;
      for (const [kind, opts] of kinds) { const cur = (settings.att[sel.id] || {})[kind] || opts[0]; const grp = document.createElement('div'); grp.className = 'seg sm';
        for (const o of opts) { const bt = document.createElement('button'); bt.textContent = ATT_NAMES[o]; if (o === cur) bt.className = 'on';
          bt.onclick = () => { settings.att[sel.id] = Object.assign({}, settings.att[sel.id], { [kind]: o }); saveSettings(); applyAttachments(sel); renderLoadout(el, onChange); onChange && onChange(); previewSelect(sel.id, true); };
          grp.appendChild(bt); }
        ab.appendChild(grp); }
      el.appendChild(ab);
    }
  }
}
function applyLoadoutMidRun() {
  const nc = loadoutIdx();
  carry = nc; rebuildViewmodels(); nc.forEach(i => { inv[i] = { mag: WEAPONS[i].mag, res: WEAPONS[i].res }; });
  wst.cur = carry[0]; wst.last = carry[1]; wst.reloading = false; wst.switchT = WEAPONS[carry[0]].swap;
  vmModels.forEach((m, i) => { if (m) { m.g.visible = i === wst.cur; m.flash.visible = false; } }); renderSlots(); hudCache = {}; refreshAvatar();
}
function openArmory() {
  if (MP.active || game.mode === 'botdm') { showHint('ARMORY: SURVIVAL ONLY — CHANGE LOADOUT IN THE LOBBY', '#ff6b5a'); return; }
  if (game.state !== 'play' || game.phase !== 'inter' || !player.alive) { if (game.state === 'play') showHint('ARMORY OPENS BETWEEN WAVES', '#ff6b5a'); return; }
  game.state = 'armory'; mouseL = mouseR = false; for (const k in keys) keys[k] = false;
  if (document.pointerLockElement) document.exitPointerLock();
  renderLoadout($('armlist'), applyLoadoutMidRun); showScreen('armory');
}
function toMenu() { setTimeout(() => { if (game.state === 'menu') music.play('title'); }, 50); $('ping').style.display = 'none'; if (MP.active) { sayBye(); mpCleanup(); clearRemotes(); } game.state = 'menu'; showScreen('menu'); if (document.pointerLockElement) document.exitPointerLock(); renderBest(); }
function die() {
  if (MP.active) return mpDie();
  if (game.mode === 'botdm') return botPlayerDie();
  player.alive = false; game.state = 'dying'; game.dieT = 1.6; mouseL = mouseR = false; wst.reloading = false;
  showMsg('YOU DIED', '', 1.5);
}
function finishDeath() {
  game.state = 'over'; music.play('lose'); if (document.pointerLockElement) document.exitPointerLock();
  $('overmap').textContent = world.def.name + ' · ' + { easy: 'RECRUIT', normal: 'VETERAN', hard: 'ELITE' }[settings.difficulty];
  $('s_score').textContent = game.score; $('s_wave').textContent = game.wave; $('s_kills').textContent = game.kills; $('s_hs').textContent = game.heads;
  $('s_acc').textContent = (game.shots ? Math.round(game.hits / game.shots * 100) : 0) + '%';
  const t = Math.floor(game.runTime); $('s_time').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  const key = 'bp_best_' + settings.map + '_' + settings.difficulty; let best = 0; try { best = +localStorage.getItem(key) || 0; } catch (e) {}
  if (game.score > best) { try { localStorage.setItem(key, game.score); } catch (e) {} $('newbest').textContent = 'NEW BEST SCORE'; } else $('newbest').textContent = 'BEST: ' + best;
  showScreen('over');
}

// ============================================================ DAMAGE NUMBERS
const dnPool = []; let dnI = 0;
function initDmgNumbers() {
  const host = $('dnums');
  for (let i = 0; i < 18; i++) { const el = document.createElement('div'); el.className = 'dn'; host.appendChild(el); dnPool.push({ el, t: 0, p: new V3() }); }
}
function dmgNumber(p, d, head) {
  const n = dnPool[dnI]; dnI = (dnI + 1) % dnPool.length;
  n.p.copy(p); n.t = 0.8; n.el.textContent = Math.round(d); n.el.className = 'dn' + (head ? ' head' : '');
}
const _dp = new V3();
function updateDmgNumbers(dt) {
  for (const n of dnPool) {
    if (n.t <= 0) { if (n.el.style.opacity !== '0') n.el.style.opacity = '0'; continue; }
    n.t -= dt; _dp.copy(n.p); _dp.y += (0.8 - n.t) * 0.9; _dp.project(camera);
    if (_dp.z > 1) { n.el.style.opacity = '0'; continue; }
    n.el.style.transform = `translate(${(_dp.x * 0.5 + 0.5) * innerWidth}px,${(-_dp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%) scale(${1 + Math.max(0, n.t - 0.6) * 2})`;
    n.el.style.opacity = String(clamp(n.t * 3, 0, 1));
  }
}

// ============================================================ MULTIPLAYER (peer-to-peer via WebRTC / PeerJS)
// Topology: the lobby host is the hub. Clients send to the host, the host stamps the sender id and relays.
// Damage is applied by the victim's own client (so class abilities like Overshield work), scores are kept by the host.
const MP = { seen: {}, lastHost: 0, active: false, peer: null, isHost: false, conns: new Map(), uconns: new Map(), mesh: new Map(), hostU: null, seq: 0, pingTimer: 0, host: null, myId: '', code: '', players: {}, map: 0, limit: 20, time: 480, matchT: 0, sendT: 0, joined: false, lastAttacker: null, lastAttackT: -99, lastHead: false, pickPending: -1, respawnT: 0, nextColor: 1 };
const remotes = new Map();
const PCOLORS = [0xff7a1a, 0x3fa7ff, 0x5dff9a, 0xff4fd8, 0xffd23a, 0xa07aff, 0xff5a5a, 0x4fffe8];
const PREFIX = 'breachpoint-v1-';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cleanName = n => String(n || '').replace(/[^\w \-.]/g, '').trim().slice(0, 16) || 'Player';
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const v3a = v => [Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100, Math.round(v.z * 100) / 100];
const arrV3 = a => (Array.isArray(a) && a.length === 3 ? new V3(clamp(num(a[0]), -200, 200), clamp(num(a[1]), -50, 100), clamp(num(a[2]), -200, 200)) : null);
const pname = id => (MP.players[id] ? MP.players[id].name : 'Player');
if (!settings.name) settings.name = 'Player' + randi(100, 999);

function peerOpts() {
  const q = new URLSearchParams(location.search).get('peerserver'); // only for local testing
  if (q) { const [host, port] = q.split(':'); return { host, port: +port || 9000, path: '/', secure: false, debug: 0 }; }
  return { debug: 0 };
}
function makeCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 5; i++) c += A[Math.random() * A.length | 0]; return c; }
function setMpStatus(t, bad) { const el = $('mpStatus'); el.textContent = t || ''; el.style.color = bad ? '#ff6b5a' : '#ffcf6b'; }
function mpView(v) { $('mpJoin').style.display = v === 'join' ? 'block' : 'none'; $('mpLobby').style.display = v === 'lobby' ? 'block' : 'none'; }
function meInfo() { return { name: cleanName(settings.name), cls: settings.cls, kills: 0, deaths: 0, color: 0 }; }
function mpCleanup() {
  clearRemotes();
  try { if (MP.peer) MP.peer.destroy(); } catch (e) {}
  clearInterval(MP.pingTimer);
  Object.assign(MP, { active: false, peer: null, isHost: false, host: null, hostU: null, myId: '', code: '', players: {}, joined: false, nextColor: 1, pingTimer: 0 });
  MP.conns = new Map(); MP.uconns = new Map(); MP.mesh = new Map(); MP.seen = {};
}
function hostLobby() {
  if (typeof Peer === 'undefined') return setMpStatus('Networking library failed to load.', true);
  mpCleanup(); MP.isHost = true; MP.code = makeCode(); setMpStatus('Creating lobby…');
  const peer = MP.peer = new Peer(PREFIX + MP.code, peerOpts());
  peer.on('open', id => {
    MP.myId = id; MP.players = { [id]: meInfo() }; MP.players[id].ping = 0; setMpStatus(''); mpView('lobby'); renderLobby();
    let tick = 0;
    MP.pingTimer = setInterval(() => { // measure round-trip time to every client, share results every 2s
      const now = performance.now();
      for (const id in MP.players) if (id !== MP.myId && now - (MP.seen[id] || now) > 7000) { const c = MP.conns.get(id); dropPlayer(id); try { c && c.close(); } catch (e) {} } // silent for 7s = gone
      for (const id of MP.conns.keys()) sendTo(id, { t: 'pi', c: now }, true);
      if (++tick % 2 === 0) { const p = {}; for (const id in MP.players) p[id] = MP.players[id].ping | 0; bcast({ t: 'pings', p }); if (!MP.active) renderLobby(); }
    }, 1000);
  });
  peer.on('connection', conn => {
    if (conn.metadata && conn.metadata.ch === 'u') { // fast lane: unordered channel for positions + pings
      conn.on('open', () => MP.uconns.set(conn.peer, conn));
      conn.on('data', d => hostRecv(conn.peer, d));
      conn.on('close', () => MP.uconns.delete(conn.peer));
      return;
    }
    conn.on('open', () => {
      if (Object.keys(MP.players).length >= 8 || MP.active) { conn.send({ t: 'full', why: MP.active ? 'Match already in progress — try again when it ends.' : 'Lobby is full (8 players).' }); setTimeout(() => conn.close(), 400); return; }
      MP.conns.set(conn.peer, conn);
    });
    conn.on('data', d => hostRecv(conn.peer, d));
    conn.on('close', () => dropPlayer(conn.peer));
    conn.on('error', () => dropPlayer(conn.peer));
  });
  peer.on('error', e => {
    if (e.type === 'unavailable-id') return hostLobby();
    if (!MP.myId) { try { peer.destroy(); } catch (x) {} MP.peer = null; }
    setMpStatus(e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' ? 'Could not reach the matchmaking server. Check your connection and try again.' : 'Network error: ' + e.type, true);
  });
  let tries = 0;
  peer.on('disconnected', () => { if (MP.peer === peer && MP.myId && tries++ < 3) setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) {} }, 1500 * tries); });
}
function joinLobby(raw) {
  if (typeof Peer === 'undefined') return setMpStatus('Networking library failed to load.', true);
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (code.length !== 5) return setMpStatus('Enter the 5-character lobby code.', true);
  mpCleanup(); MP.code = code; setMpStatus('Connecting to ' + code + '…');
  const peer = MP.peer = new Peer(undefined, peerOpts());
  peer.on('open', id => {
    MP.myId = id;
    const c = MP.host = peer.connect(PREFIX + code, { reliable: true });
    const to = MP.joinTO = setTimeout(() => { if (!MP.joined && MP.peer === peer) setMpStatus('Could not reach lobby ' + code + '. Check the code and try again.', true); }, 10000);
    c.on('open', () => {
      c.send({ t: 'hello', name: settings.name, cls: settings.cls });
      const u = MP.hostU = peer.connect(PREFIX + code, { reliable: false, metadata: { ch: 'u' } });
      u.on('data', clientRecv);
    });
    c.on('data', d => {
      if (!MP.joined) { MP.joined = true; clearTimeout(to); MP.lastHost = performance.now(); MP.pingTimer = setInterval(() => { if (performance.now() - MP.lastHost > 7000) hostGone(); }, 1000); }
      clientRecv(d);
    });
    c.on('close', hostGone);
  });
  peer.on('connection', conn => { // direct client<->client links for movement (skips the host hop)
    if (!conn.metadata || conn.metadata.ch !== 'm') return conn.close();
    conn.on('open', () => { if (MP.players[conn.peer]) MP.mesh.set(conn.peer, conn); else conn.close(); });
    conn.on('data', d => meshRecv(conn.peer, d));
    conn.on('close', () => MP.mesh.delete(conn.peer));
  });
  peer.on('error', e => {
    clearTimeout(MP.joinTO);
    if (e.type !== 'peer-unavailable') { try { peer.destroy(); } catch (x) {} MP.peer = null; }
    setMpStatus(e.type === 'peer-unavailable' ? 'Lobby ' + code + ' not found. Check the code.' : e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' ? 'Could not reach the matchmaking server. Check your connection and try again.' : 'Network error: ' + e.type, true);
  });
}
function sayBye() {
  if (!MP.peer) return;
  try { if (MP.isHost) bcast({ t: 'bye' }); else if (MP.host && MP.host.open) MP.host.send({ t: 'bye' }); } catch (e) {}
}
addEventListener('pagehide', () => { sayBye(); try { MP.peer && MP.peer.destroy(); } catch (e) {} });
function leaveLobby() { sayBye(); mpCleanup(); mpView('join'); setMpStatus(''); }
function hostGone() {
  if (!MP.peer || MP.isHost) return;
  const wasActive = MP.active; mpCleanup();
  if (wasActive || game.state === 'mpover') { toMenu(); }
  openMpScreen(); setMpStatus('The host left the lobby.', true);
}
function sendTo(id, msg, fast) {
  const u = fast && MP.uconns.get(id), c = u && u.open ? u : MP.conns.get(id);
  if (c && c.open) { try { c.send(msg); } catch (e) {} }
}
function bcast(msg, except, fast) { for (const id of MP.conns.keys()) if (id !== except) sendTo(id, msg, fast); }
function netSend(msg) {
  msg.id = MP.myId;
  const fast = msg.t === 'st';
  if (fast) msg.q = ++MP.seq;
  if (MP.isHost) { bcast(msg, null, fast); if (msg.t === 'die') hostDeath(msg); if (msg.t === 'pickreq') hostPick(MP.myId, msg.k); return; }
  const c = fast && MP.hostU && MP.hostU.open ? MP.hostU : MP.host;
  if (c && c.open) { try { c.send(msg); } catch (e) {} }
  if (fast) for (const m of MP.mesh.values()) if (m.open) { try { m.send(msg); } catch (e) {} }
}
function meshRecv(from, d) { if (d && typeof d === 'object' && d.t === 'st' && MP.players[from]) { d.id = from; handleGame(d); } }
function connectMesh() { // each client links directly to every other client (lower id dials) — falls back to host relay if it fails
  for (const id in MP.players) {
    if (id === MP.myId || id === MP.hostId || MP.mesh.has(id) || id < MP.myId) continue;
    const c = MP.peer.connect(id, { reliable: false, metadata: { ch: 'm' } });
    c.on('open', () => MP.mesh.set(id, c)); c.on('data', d => meshRecv(id, d)); c.on('close', () => MP.mesh.delete(id));
  }
}
function lobbyMsg() { return { t: 'lobby', players: MP.players, map: MP.map, limit: MP.limit, time: MP.time, hostId: MP.myId }; }
function broadcastLobby() { bcast(lobbyMsg()); renderLobby(); }
function hostRecv(from, d) {
  if (!d || typeof d !== 'object' || typeof d.t !== 'string') return;
  MP.seen[from] = performance.now();
  if (d.t === 'bye') { const c = MP.conns.get(from); dropPlayer(from); try { c && c.close(); } catch (e) {} return; }
  if (d.t === 'hello') {
    if (MP.players[from] || !MP.conns.has(from)) return;
    MP.players[from] = { name: cleanName(d.name), cls: CLASSES[d.cls] ? d.cls : 'assault', kills: 0, deaths: 0, color: MP.nextColor++ % PCOLORS.length };
    broadcastLobby(); sfx.play('pickup'); return;
  }
  if (d.t === 'info') { const p = MP.players[from]; if (p) { p.name = cleanName(d.name); p.cls = CLASSES[d.cls] ? d.cls : p.cls; broadcastLobby(); } return; }
  if (!MP.players[from]) return;
  d.id = from;
  if (d.t === 'po') { const rtt = performance.now() - num(d.c, 0); if (rtt >= 0 && rtt < 5000) { const p = MP.players[from]; p.ping = p.ping ? lerp(p.ping, rtt, 0.3) : rtt; } return; }
  if (d.t === 'pickreq') return hostPick(from, d.k);
  if (!['st', 'shot', 'hit', 'die', 'nade'].includes(d.t)) return;
  bcast(d, from, d.t === 'st');
  if (d.t === 'die') hostDeath(d);
  handleGame(d);
}
function dropPlayer(id) {
  if (!MP.isHost || !MP.players[id]) { MP.conns.delete(id); return; }
  const name = MP.players[id].name; delete MP.players[id]; MP.conns.delete(id);
  bcast({ t: 'left', id }); removeRemote(id); broadcastLobby();
  if (MP.active) { addFeed(esc(name) + ' left the match'); if (Object.keys(MP.players).length < 2) hostEndMatch('Not enough players'); }
}
function clientRecv(d) {
  if (!d || typeof d !== 'object' || typeof d.t !== 'string') return;
  MP.lastHost = performance.now();
  if (d.t === 'bye') return hostGone();
  switch (d.t) {
    case 'pi': { const c = MP.hostU && MP.hostU.open ? MP.hostU : MP.host; if (c && c.open) c.send({ t: 'po', c: d.c }); return; }
    case 'pings': if (d.p && typeof d.p === 'object') { for (const id in d.p) if (MP.players[id]) MP.players[id].ping = clamp(num(d.p[id]) | 0, 0, 9999); if (!MP.active) renderLobby(); } return;
    case 'full': setMpStatus(d.why ? String(d.why).slice(0, 80) : 'Lobby unavailable.', true); return;
    case 'lobby': {
      const ps = {}; if (d.players && typeof d.players === 'object') for (const id of Object.keys(d.players).slice(0, 8)) { const p = d.players[id] || {}; ps[id] = { name: cleanName(p.name), cls: CLASSES[p.cls] ? p.cls : 'assault', kills: num(p.kills) | 0, deaths: num(p.deaths) | 0, color: num(p.color) | 0, ping: num(p.ping) | 0 }; }
      MP.players = ps; MP.map = clamp(num(d.map) | 0, 0, MAPS.length - 1); MP.limit = clamp(num(d.limit, 20) | 0, 1, 100); MP.time = clamp(num(d.time, 480) | 0, 60, 1800); MP.hostId = String(d.hostId || '');
      if (!MP.active && game.state !== 'mpover') { setMpStatus(''); mpView('lobby'); } renderLobby(); return;
    }
    case 'start': startMatch(d); return;
    case 'end': endMatch(d); return;
    case 'score': if (d.players && typeof d.players === 'object') for (const id in d.players) if (MP.players[id]) { MP.players[id].kills = num(d.players[id].kills) | 0; MP.players[id].deaths = num(d.players[id].deaths) | 0; } return;
    case 'left': { const n = pname(d.id); const m = MP.mesh.get(d.id); if (m) { try { m.close(); } catch (e) {} MP.mesh.delete(d.id); } delete MP.players[d.id]; removeRemote(d.id); if (MP.active) addFeed(esc(n) + ' left the match'); renderLobby(); return; }
    case 'picked': handlePicked(d); return;
    default: handleGame(d);
  }
}
function handleGame(d) {
  if (!MP.active || typeof d.id !== 'string' || d.id === MP.myId) return;
  const r = remotes.get(d.id);
  switch (d.t) {
    case 'st': if (r) r.push(d); break;
    case 'shot': {
      const a = arrV3(d.a), b = arrV3(d.b); if (!a || !b) break;
      spawnTracer(a, b, 0xffd27a, 300, 0.03); if (r) r.mflash = 0.06;
      const w = WEAPONS.find(x => x.id === d.w); const sp = spatial(a); sfx.gun(w ? w.snd : 'rifle', { dist: sp.dist, pan: sp.pan, supp: !!d.s });
      if (r) r.lastFired = game.time;
      break;
    }
    case 'hit':
      if (d.to === MP.myId && player.alive) damagePlayer(clamp(num(d.dmg), 0, 250), r ? r.pos : null, d.id, !!d.head);
      break;
    case 'die': {
      const victim = d.id, killer = typeof d.by === 'string' ? d.by : victim;
      addFeed(killer === victim ? `✕ ${esc(pname(victim))}` : `${esc(pname(killer))} ${d.head ? '◎' : '✕'} ${esc(pname(victim))}`, !!d.head);
      if (killer === MP.myId && victim !== MP.myId) mpKillConfirm(victim, !!d.head);
      break;
    }
    case 'nade': {
      const p = arrV3(d.p), v = arrV3(d.v); if (!p || !v) break;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshLambertMaterial({ color: 0x3b4a2a, emissive: 0x220000 }));
      mesh.position.copy(p); fx.add(mesh); grenades.push({ pos: p, vel: v, mesh, t: d.brew ? 1.3 : 2.0, owner: d.id, brew: !!d.brew });
      break;
    }
  }
}
function mpKillConfirm(victim, head) {
  game.kills++; if (head) game.heads++;
  if (game.time - game.lastKill < 3) game.streak++; else game.streak = 1; game.lastKill = game.time;
  const names = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUAD KILL', 5: 'RAMPAGE' };
  if (game.streak >= 2) showStreak(names[Math.min(game.streak, 5)]);
  sfx.play('kill'); hitMarker(true, head); showHint((head ? 'HEADSHOT · ' : '') + 'ELIMINATED ' + pname(victim).toUpperCase(), head ? '#ff6b5a' : '#ffcf6b');
}
function hostDeath(d) {
  const v = MP.players[d.id]; if (!v || !MP.active) return;
  v.deaths++;
  const k = typeof d.by === 'string' && d.by !== d.id ? MP.players[d.by] : null; if (k) k.kills++;
  const sc = {}; for (const id in MP.players) sc[id] = { kills: MP.players[id].kills, deaths: MP.players[id].deaths };
  bcast({ t: 'score', players: sc });
  if (k && k.kills >= MP.limit) hostEndMatch(k.name + ' reached the kill limit');
}
function hostPick(from, k) {
  k = num(k, -1) | 0; const p = pickups[k];
  if (!MP.active || !p || !p.active) return;
  const msg = { t: 'picked', k, by: from }; bcast(msg); handlePicked(msg);
}
function handlePicked(d) {
  const p = pickups[num(d.k, -1) | 0]; if (!p) return;
  p.active = false; p.timer = 22; p.mesh.visible = false;
  if (d.by === MP.myId) { p.apply(true); sfx.play('pickup'); }
  if (MP.pickPending === d.k) MP.pickPending = -1;
}
// ---- remote players
function makeNameTag(name, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.font = 'bold 34px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(name, 128, 32);
  g.fillStyle = '#' + new THREE.Color(color).getHexString(); g.fillText(name, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.scale.set(1.6, 0.4, 1); sp.position.y = 2.25; return sp;
}
class Remote {
  constructor(id, info) {
    this.id = id; this.name = info.name; const color = PCOLORS[info.color % PCOLORS.length];
    const C = CLASSES[info.cls] || CLASSES.assault; this.cls = C;
    Object.assign(this, makeCharacter(C.model, { sash: color, weapon: 'rifle' })); this.isRemote = true;
    this.baseColor = this.bodyMat.color.getHex();
    this.s = CHAR[C.model].scale; this.h = 1.82 * this.s; this.pos = new V3(0, -50, 0); this.dead = true; this.snaps = []; this.yaw = 0; this.walk = 0;
    this.flashT = 0; this.mflash = 0; this.lastFired = -99; this.deadT = 0;
    this.tag = makeNameTag(this.name, color); this.group.add(this.tag);
    this.group.visible = false; world.group.add(this.group);
  }
  push(d) {
    const p = arrV3(d.p); if (!p) return;
    const q = num(d.q, 0); if (q && q <= (this.lastQ || 0)) return; this.lastQ = q; // unordered channel + mesh/relay duplicates
    const now = performance.now();
    if (this.lastArr) { const iv = Math.min(now - this.lastArr, 500); this.ivAvg = lerp(this.ivAvg || 33, iv, 0.1); this.jit = lerp(this.jit || 5, Math.abs(iv - this.ivAvg), 0.1); }
    this.lastArr = now;
    this.delay = clamp((this.ivAvg || 33) + (this.jit || 5) * 2.5 + 8, 40, 220); // just enough buffer to hide this connection's jitter
    this.snaps.push({ w: typeof d.w === 'string' ? d.w : this.weaponId, pitch: clamp(num(d.pt), -1.5, 1.5), t: now, x: p.x, y: p.y, z: p.z, yaw: num(d.yaw), h: clamp(num(d.h, 1.75), 1, 1.8), alive: !!d.alive });
    if (this.snaps.length > 40) this.snaps.shift();
  }
  update(dt) {
    const n = this.snaps.length; if (!n) return;
    const rt = performance.now() - (this.delay || 80); let a = this.snaps[n - 1], b = a, k = 0;
    if (n > 1 && rt > this.snaps[n - 1].t) { a = this.snaps[n - 2]; b = this.snaps[n - 1]; k = 1 + Math.min(rt - b.t, 100) / Math.max(1, b.t - a.t); k = Math.min(k, 1.5); } // brief extrapolation if a packet is late
    else for (let i = n - 1; i > 0; i--) if (this.snaps[i - 1].t <= rt) { a = this.snaps[i - 1]; b = this.snaps[i]; k = clamp((rt - a.t) / Math.max(1, b.t - a.t), 0, 1); break; }
    const px = this.pos.x, pz = this.pos.z;
    if (Math.hypot(b.x - a.x, b.z - a.z) > 6) k = 1; // teleport (respawn) — don't interpolate across the map
    this.pos.set(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));
    this.yaw = a.yaw + angDiff(a.yaw, b.yaw) * Math.min(k, 1); this.h = (b.h / 1.75) * 1.82 * this.s;
    const alive = b.alive;
    if (alive && this.dead) { this.dead = false; this.group.rotation.x = 0; this.bodyMat.color.setHex(this.baseColor); }
    if (!alive && !this.dead) { this.dead = true; this.deadT = 0; this.fallDir = Math.random() < 0.5 ? 1 : -1; this.bodyMat.color.multiplyScalar(0.5); }
    this.group.visible = alive || this.deadT < 2.5;
    if (this.dead) { this.deadT += dt; this.group.rotation.x = -this.fallDir * Math.min(1, this.deadT / 0.5) * 1.45; }
    const sp = Math.hypot(this.pos.x - px, this.pos.z - pz) / Math.max(dt, 1e-3);
    if (b.w && b.w !== this.weaponId && widx(b.w) >= 0) setCharWeapon(this, b.w);
    animChar(this, dt, Math.min(sp, 9), b.pitch || 0);
    this.inner.scale.y = this.s * clamp(this.h / (1.82 * this.s), 0.55, 1); flapWings(this, game.time);
    this.group.position.copy(this.pos); this.group.rotation.y = this.yaw + Math.PI; // remote yaw is camera yaw (faces -z)
    this.tag.visible = alive; this.tag.position.y = this.h + 0.45;
    if (player.pulseT > 0 && alive) { const q = 0.35 + 0.25 * Math.sin(game.time * 6); this.bodyMat.emissive.setRGB(q, q * 0.6, 0); }
    else if (this.flashT > 0) { this.flashT -= dt; const f = Math.max(0, this.flashT / 0.12); this.bodyMat.emissive.setRGB(f, f, f); }
    else this.bodyMat.emissive.setRGB(0, 0, 0);
    if (this.mflash > 0) { this.mflash -= dt; this.flash.visible = this.mflash > 0; } else this.flash.visible = false;
  }
  damage(d, head) {
    if (this.dead) return false;
    netSend({ t: 'hit', to: this.id, dmg: Math.round(d), head: !!head }); this.flashT = 0.12; return false;
  }
}
function clearRemotes() { for (const r of remotes.values()) if (world) world.group.remove(r.group); remotes.clear(); remoteList = []; }
function removeRemote(id) { const r = remotes.get(id); if (r && world) world.group.remove(r.group); remotes.delete(id); remoteList = [...remotes.values()]; }
// ---- match flow
function mpSpawnPoint() {
  const L = world.L, cands = L.enemySpawns.map(([x, z]) => [x, 0.05, z]).concat([[L.spawn.x, L.spawn.y + 0.05, L.spawn.z]]);
  let best = cands[0], bs = -1;
  for (const c of cands) {
    let md = 1e9; for (const r of remoteList) if (!r.dead) md = Math.min(md, Math.hypot(r.pos.x - c[0], r.pos.z - c[2]));
    const sc = Math.min(md, 60) + rand(0, 8); if (sc > bs) { bs = sc; best = c; }
  }
  return best;
}
function mpRespawn() {
  const C = cls(), [x, y, z] = mpSpawnPoint();
  Object.assign(player, { maxHp: C.hp, hp: C.hp, regenCap: C.hp, alive: true, grenades: C.nades, shield: 0, shieldT: 0, stimT: 0, crouch: 0, sliding: false, h: 1.75, onGround: false, stepSmooth: 0, pitch: 0, protT: game.time + 1.5, lastDmgT: 99 });
  player.pos.set(x, y, z); player.vel.set(0, 0, 0); player.yaw = Math.atan2(x, z); // face the map centre
  inv = WEAPONS.map(w => ({ mag: w.mag, res: w.res })); setGloves();
  wst.cur = carry[0]; wst.reloading = false; wst.switchT = 0.3; vmModels.forEach((m, i) => m.g.visible = i === wst.cur);
  MP.lastAttacker = null; game.deadT = 0;
}
function hostStartMatch() {
  if (!MP.isHost || Object.keys(MP.players).length < 2) return;
  for (const id in MP.players) { MP.players[id].kills = 0; MP.players[id].deaths = 0; }
  const msg = { t: 'start', map: MP.map, limit: MP.limit, time: MP.time, players: MP.players, hostId: MP.myId };
  bcast(msg); startMatch(msg);
}
function startMatch(d) {
  sfx.init(); music.play('start'); if (!MP.isHost && typeof d.hostId === 'string') MP.hostId = d.hostId;
  MP.map = clamp(num(d.map) | 0, 0, MAPS.length - 1); MP.limit = clamp(num(d.limit, 20) | 0, 1, 100); MP.time = clamp(num(d.time, 480) | 0, 60, 1800);
  for (const id in MP.players) { MP.players[id].kills = 0; MP.players[id].deaths = 0; }
  if (!world || world.def !== MAPS[MP.map]) { loadMap(MP.map); world.shadows = QUALITY[settings.quality].shadows; }
  resetRun(); clearRemotes();
  game.mode = 'dm'; game.phase = 'dm'; MP.active = true; MP.matchT = MP.time; MP.pickPending = -1;
  for (const b of barrels) { b.box.dead = true; b.mesh.visible = false; b.respawn = 1e9; }
  for (const id in MP.players) if (id !== MP.myId) remotes.set(id, new Remote(id, MP.players[id]));
  remoteList = [...remotes.values()];
  if (!MP.isHost) connectMesh();
  mpRespawn(); hudCache = {};
  game.state = 'play'; showScreen(null); camera.fov = settings.fov; requestLock(); $('ping').style.display = 'block';
  showMsg('DEATHMATCH', `FIRST TO ${MP.limit} KILLS`, 3); sfx.play('wave');
}
function hostEndMatch(why) {
  if (!MP.isHost || !MP.active) return;
  const msg = { t: 'end', why, players: MP.players }; bcast(msg); endMatch(msg);
}
function endMatch(d) {
  if (!MP.active) return;
  if (d.players && typeof d.players === 'object') for (const id in d.players) if (MP.players[id]) { MP.players[id].kills = num(d.players[id].kills) | 0; MP.players[id].deaths = num(d.players[id].deaths) | 0; }
  MP.active = false; $('ping').style.display = 'none'; clearRemotes(); grenades.forEach(g => fx.remove(g.mesh)); grenades = [];
  game.state = 'mpover'; if (document.pointerLockElement) document.exitPointerLock();
  const rows = Object.entries(MP.players).sort((a, b) => b[1].kills - a[1].kills || a[1].deaths - b[1].deaths);
  $('mpWinner').textContent = rows.length ? `${rows[0][1].name} WINS` : 'MATCH OVER';
  $('mpWhy').textContent = d.why ? String(d.why).slice(0, 80) : '';
  $('mpBoard').innerHTML = scoreTable(rows);
  showScreen('mpover'); music.play(rows.length && rows[0][0] === MP.myId ? 'win' : 'lose');
}
function scoreTable(rows) {
  const hostId = MP.isHost ? MP.myId : MP.hostId;
  return `<table class="sb"><tr><th>#</th><th>PLAYER</th><th>CLASS</th><th>K</th><th>D</th><th>PING</th></tr>` + rows.map(([id, p], i) =>
    `<tr class="${id === MP.myId ? 'me' : ''}"><td>${i + 1}</td><td><i style="background:#${new THREE.Color(PCOLORS[p.color % PCOLORS.length]).getHexString()}"></i>${esc(p.name)}</td><td>${esc(CLASSES[p.cls] ? CLASSES[p.cls].name : '')}</td><td>${p.kills}</td><td>${p.deaths}</td><td>${pingHtml(id, hostId)}</td></tr>`).join('') + '</table>';
}
function pingHtml(id, hostId) {
  if (id === hostId) return '<span class="pg g">host</span>';
  const p = MP.players[id] ? MP.players[id].ping | 0 : 0; if (!p) return '<span class="pg">…</span>';
  return `<span class="pg ${p < 80 ? 'g' : p < 160 ? 'y' : 'r'}">${p} ms</span>`;
}
function updateMP(dt) {
  const me = MP.players[MP.myId];
  setText('ping', MP.isHost ? 'HOST · 0 ms' : me && me.ping ? 'PING ' + (me.ping | 0) + ' ms' : 'PING …');
  const pc = MP.isHost || !me ? 'g' : me.ping < 80 ? 'g' : me.ping < 160 ? 'y' : 'r';
  if (hudCache.pc !== pc) { hudCache.pc = pc; $('ping').className = 'pg ' + pc; }
  for (const r of remoteList) r.update(dt);
  MP.sendT -= dt;
  if (MP.sendT <= 0) {
    MP.sendT = 1 / 30;
    netSend({ t: 'st', p: v3a(player.pos), yaw: Math.round(player.yaw * 1000) / 1000, pt: Math.round(player.pitch * 100) / 100, h: Math.round(player.h * 100) / 100, alive: player.alive, w: WEAPONS[wst.cur].id });
  }
  if (!player.alive) { MP.respawnT -= dt; game.deadT = (game.deadT || 0) + dt; if (MP.respawnT <= 0) mpRespawn(); }
  MP.matchT -= dt;
  if (MP.isHost && MP.matchT <= 0) hostEndMatch('Time limit reached');
}
function mpDie() {
  player.alive = false; MP.respawnT = 3.5; game.deadT = 0; mouseL = mouseR = false; wst.reloading = false;
  const by = MP.lastAttacker && game.time - MP.lastAttackT < 8 ? MP.lastAttacker : MP.myId;
  netSend({ t: 'die', by, head: MP.lastHead });
  showMsg('ELIMINATED', by === MP.myId ? 'Respawning…' : 'by ' + pname(by), 3);
}
// ---- lobby UI
function openMpScreen() {
  sfx.init(); $('mpname').value = settings.name; showScreen('mp');
  if (!MP.peer) { mpView('join'); const j = new URLSearchParams(location.search).get('join'); if (j && !$('mpcode').value) $('mpcode').value = j.toUpperCase().slice(0, 5); }
  else { mpView('lobby'); renderLobby(); }
}
function renderLobby() {
  if (!MP.peer) return;
  $('mpCodeTxt').textContent = MP.code;
  const ids = Object.keys(MP.players), hostId = MP.isHost ? MP.myId : MP.hostId;
  $('mpCount').textContent = ids.length;
  $('mpPlayers').innerHTML = ids.map(id => { const p = MP.players[id]; return `<div class="pl"><i style="background:#${new THREE.Color(PCOLORS[p.color % PCOLORS.length]).getHexString()}"></i><b>${esc(p.name)}</b><span>${esc(CLASSES[p.cls] ? CLASSES[p.cls].name : '')}</span><span class="png">${pingHtml(id, hostId)}</span>${id === hostId ? '<em>HOST</em>' : ''}${id === MP.myId ? '<em class="you">YOU</em>' : ''}</div>`; }).join('');
  $('mpHostCtl').style.display = MP.isHost ? 'grid' : 'none';
  $('mpInfo').textContent = `${MAPS[MP.map].name} · first to ${MP.limit} kills · ${Math.round(MP.time / 60)} min`;
  const can = ids.length >= 2;
  $('mpStart').style.display = MP.isHost ? 'block' : 'none';
  $('mpStart').disabled = !can; $('mpStart').textContent = can ? 'START MATCH' : 'WAITING FOR PLAYERS (1/2)';
  $('mpWait').style.display = MP.isHost ? 'none' : 'block';
}
function initMpUI() {
  const ms = $('mpMap'); MAPS.forEach((m, i) => { const o = document.createElement('option'); o.value = i; o.textContent = m.name; ms.appendChild(o); });
  ms.onchange = () => { MP.map = +ms.value; broadcastLobby(); };
  $('mpLimit').onchange = () => { MP.limit = +$('mpLimit').value; broadcastLobby(); };
  $('mpTime').onchange = () => { MP.time = +$('mpTime').value; broadcastLobby(); };
  $('mpname').onchange = () => { settings.name = cleanName($('mpname').value); $('mpname').value = settings.name; saveSettings(); sendInfo(); };
  $('mpHost').onclick = () => { settings.name = cleanName($('mpname').value); saveSettings(); hostLobby(); };
  $('mpJoinBtn').onclick = () => { settings.name = cleanName($('mpname').value); saveSettings(); joinLobby($('mpcode').value); };
  $('mpcode').onkeydown = e => { if (e.key === 'Enter') $('mpJoinBtn').click(); };
  $('mpStart').onclick = hostStartMatch;
  $('mpLeave').onclick = leaveLobby;
  $('mpBack').onclick = () => { showScreen('menu'); };
  $('mpCopy').onclick = () => {
    const url = location.origin + location.pathname + '?join=' + MP.code;
    const done = () => { $('mpCopy').textContent = 'Link copied!'; setTimeout(() => $('mpCopy').textContent = 'Copy invite link', 1500); };
    try { navigator.clipboard.writeText(url).then(done, () => prompt('Invite link:', url)); } catch (e) { prompt('Invite link:', url); }
  };
  $('mpToLobby').onclick = () => { if (game.mode === 'botdm') { $('mpToLobby').textContent = 'BACK TO LOBBY'; game.mode = 'survival'; return toMenu(); } game.state = 'menu'; openMpScreen(); if (!MP.peer) setMpStatus('Lobby closed.', true); };
  if (new URLSearchParams(location.search).get('join')) openMpScreen();
}
function sendInfo() {
  if (!MP.peer) return;
  if (MP.isHost) { const p = MP.players[MP.myId]; if (p) { p.name = cleanName(settings.name); p.cls = settings.cls; broadcastLobby(); } }
  else if (MP.host && MP.host.open) MP.host.send({ t: 'info', name: settings.name, cls: settings.cls });
}

// ============================================================ MENU PREVIEW (live 3D) + THUMBNAILS
const PV = { r: null, scene: null, cam: null, obj: null, mode: 'char', t: 0, id: null };
function initPreview() {
  const cv = $('preview'); if (!cv) return;
  try { PV.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  PV.r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); PV.r.outputColorSpace = THREE.SRGBColorSpace;
  PV.scene = new THREE.Scene(); PV.cam = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
  PV.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3328, 1.6)); const d = new THREE.DirectionalLight(0xfff0dd, 2.2); d.position.set(2, 4, 3); PV.scene.add(d);
  const rim = new THREE.DirectionalLight(0x88aaff, 1.2); rim.position.set(-3, 2, -3); PV.scene.add(rim);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })); disc.rotation.x = -Math.PI / 2; PV.scene.add(disc); PV.disc = disc;
  previewSelect = (id, force) => { PV.mode = 'gun'; PV.id = id; PV.hold = 3.5; buildPreview(); };
  buildPreview(); makeThumbs();
}
function buildPreview() {
  if (!PV.scene) return; if (PV.obj) { PV.scene.remove(PV.obj); PV.obj = null; }
  const C = cls(), lo = getLO();
  if (PV.mode === 'gun' && PV.id) { const w = WEAPONS[widx(PV.id)], g = buildGun(PV.id, settings.att[PV.id] || {}, false).g; const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new V3()); g.position.sub(c); const h = new THREE.Group(); h.add(g); h.position.y = 1.0; PV.obj = h; PV.disc.visible = false;
    const len = box.getSize(new V3()).length(); PV.cam.position.set(0, 1.04, len * 1.45 + 0.05); PV.cam.lookAt(0, 1.0, 0); PV.label = w.name; }
  else { const ch = makeCharacter(C.model, { weapon: lo.primary }); PV.char = ch; PV.obj = ch.group; PV.disc.visible = true; PV.cam.position.set(0, 1.25, 4.3); PV.cam.lookAt(0, 0.95, 0); PV.label = C.name + ' · ' + WEAPONS[widx(lo.primary)].short; }
  PV.scene.add(PV.obj); $('pvlabel').textContent = PV.label;
}
function updatePreview(dt) {
  if (!PV.r || game.state !== 'menu' || !PV.obj) return;
  const cv = PV.r.domElement, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  if (cv.width !== Math.floor(w * PV.r.getPixelRatio())) { PV.r.setSize(w, h, false); PV.cam.aspect = w / h; PV.cam.updateProjectionMatrix(); }
  PV.t += dt; PV.obj.rotation.y = PV.mode === 'gun' ? Math.PI / 2 + Math.sin(PV.t * 0.6) * 0.6 : PV.t * 0.5;
  if (PV.mode === 'char' && PV.char) animChar(PV.char, dt, 0, Math.sin(PV.t * 0.7) * 0.15);
  if (PV.mode === 'gun') { PV.hold -= dt; if (PV.hold <= 0) { PV.mode = 'char'; buildPreview(); } }
  PV.r.render(PV.scene, PV.cam);
}
function snap(obj, camPos, look, w = 220, h = 120) {
  const sc = new THREE.Scene(); PV.scene.children.filter(o => o.isLight).forEach(l => sc.add(l.clone())); sc.add(obj);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.01, 50); cam.position.copy(camPos); cam.lookAt(look);
  const prev = new THREE.Vector2(); PV.r.getSize(prev); PV.r.setSize(w, h, false); PV.r.setClearColor(0x000000, 0); PV.r.clear(); PV.r.render(sc, cam);
  const url = PV.r.domElement.toDataURL('image/png'); PV.r.setSize(prev.x, prev.y, false); return url;
}
function makeThumbs() {
  if (!PV.r) return;
  for (const w of WEAPONS) { const g = buildGun(w.id, {}, false).g, box = new THREE.Box3().setFromObject(g), c = box.getCenter(new V3()); g.position.sub(c); g.rotation.y = Math.PI / 2; const len = box.getSize(new V3()).length();
    THUMBS[w.id] = snap(g, new V3(0, 0.03, len * 1.25 + 0.05), new V3(0, 0, 0)); }
  for (const k in CLASSES) { const ch = makeCharacter(CLASSES[k].model, { weapon: DEFAULT_LO[k][0] }); ch.group.rotation.y = 0.5; animChar(ch, 0.016, 0, 0); THUMBS['cls_' + k] = snap(ch.group, new V3(0, 1.2, 3.4), new V3(0, 0.95, 0), 160, 160); }
  renderLoadout($('loadout')); if (window.renderClassesUI) window.renderClassesUI();
}
// map thumbnails are captured from the menu background the first time each map is shown
let mapThumbPending = false;
function captureMapThumb() {
  try { const c = document.createElement('canvas'); c.width = 240; c.height = 120; c.getContext('2d').drawImage(renderer.domElement, 0, 0, 240, 120); const url = c.toDataURL('image/jpeg', 0.7);
    const key = 'bp_mthumb_' + world.def.name; try { localStorage.setItem(key, url); } catch (e) {} applyMapThumbs(); } catch (e) {}
}
function applyMapThumbs() { MAPS.forEach((m, i) => { let u = null; try { u = localStorage.getItem('bp_mthumb_' + m.name); } catch (e) {} const card = $('maps').children[i]; if (card && u) card.style.backgroundImage = `linear-gradient(180deg,rgba(12,14,19,.15),rgba(12,14,19,.92)),url(${u})`; }); }

// ============================================================ GAMEPAD (Xbox / PlayStation via the Gamepad API)
const gp = { on: false, prev: [], fire: false, ads: false, mx: 0, my: 0, sprint: false };
function pollGamepad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let g = null; for (const p of pads) if (p && p.connected) { g = p; break; }
  if (!g) { if (gp.on) { gp.on = false; gp.fire = gp.ads = false; gp.mx = gp.my = 0; } return; }
  if (!gp.on) { gp.on = true; showHint('CONTROLLER CONNECTED', '#6dc8ff'); }
  const dz = v => (Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84), b = i => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.4)), pr = i => b(i) && !gp.prev[i];
  gp.mx = dz(g.axes[0] || 0); gp.my = dz(g.axes[1] || 0);
  const lx = dz(g.axes[2] || 0), ly = dz(g.axes[3] || 0);
  if (game.state === 'play') {
    const zoom = lerp(1, WEAPONS[wst.cur].zoom, wst.ads); let slow = 1;
    if (player.alive) { aimBasis(); for (const list of [enemies, remoteList]) for (const e of list) { if (e.dead) continue; const dx = e.pos.x - camera.position.x, dy = e.pos.y + e.h * 0.6 - camera.position.y, dz2 = e.pos.z - camera.position.z, d = Math.hypot(dx, dy, dz2); if (d > 70) continue; if ((dx * _f.x + dy * _f.y + dz2 * _f.z) / d > 0.9975) slow = 0.5; } }
    const s = 3.0 * settings.sens * slow / zoom;
    player.yaw -= Math.sign(lx) * lx * lx * s * dt; player.pitch = clamp(player.pitch - (settings.invertY ? -1 : 1) * Math.sign(ly) * ly * ly * s * 0.7 * dt, -1.5, 1.5);
    gp.fire = b(7); gp.ads = b(6);
    if (pr(0)) player.jumpBuf = 0.14; if (b(1) !== !!gp.prev[1]) keys.KeyC = b(1);
    if (pr(2)) startReload(); if (pr(3)) switchTo(wst.cur === carry[0] ? carry[1] : carry[0]);
    if (pr(4)) throwGrenade(); if (pr(5)) useAbility(); if (pr(11)) quickMelee();
    if (pr(10)) gp.sprint = !gp.sprint; if (gp.my > -0.3) gp.sprint = false; if (gp.sprint) keys.ShiftLeft = true; else if (gp.wasSprint) keys.ShiftLeft = false; gp.wasSprint = gp.sprint;
    mouseL = gp.fire || mL; mouseR = gp.ads || mR;
    if (pr(12) || pr(13)) { const k = carry.indexOf(wst.cur); switchTo(carry[(k + (pr(12) ? 2 : 1)) % 3]); }
    if (pr(14)) $('invp') && (keys.Tab = !keys.Tab);
    if (pr(8)) toggleView(); if (pr(9)) { if (document.pointerLockElement) document.exitPointerLock(); pauseGame(); }
  } else {
    if (pr(0)) { const id = { menu: 'play', paused: 'resume', over: 'retry', mpover: 'mpToLobby', armory: 'armback' }[game.state]; if (id && $(id)) $(id).click(); }
    if (pr(1) && game.state === 'paused') $('quit').click();
    if (pr(9) && game.state === 'paused') $('resume').click();
  }
  gp.prev = g.buttons.map((x, i) => b(i));
}
addEventListener('gamepadconnected', () => showHint('CONTROLLER CONNECTED', '#6dc8ff'));

// ============================================================ THIRD-PERSON VIEW
let avatar = null;
function toggleView() { settings.view = settings.view === 'third' ? 'first' : 'third'; saveSettings(); showHint(settings.view === 'third' ? 'THIRD-PERSON VIEW' : 'FIRST-PERSON VIEW', '#ffcf6b'); refreshAvatar(); }
refreshAvatar = () => { if (avatar && world) world.group.remove(avatar.group); avatar = null; };
function updateAvatar(dt) {
  const third = settings.view === 'third' && (game.state === 'play' || game.state === 'paused' || game.state === 'dying');
  if (!third) { if (avatar) avatar.group.visible = false; return false; }
  if (!avatar || avatar.cls !== settings.cls) { refreshAvatar(); avatar = makeCharacter(cls().model, { weapon: WEAPONS[wst.cur].id }); avatar.cls = settings.cls; world.group.add(avatar.group); }
  setCharWeapon(avatar, WEAPONS[wst.cur].id);
  avatar.group.visible = true; avatar.group.position.set(player.pos.x, player.pos.y, player.pos.z); avatar.group.rotation.y = player.yaw + Math.PI;
  avatar.group.rotation.x = player.alive ? 0 : -Math.min(1, (game.deadT || 0) / 0.5) * 1.4;
  avatar.inner.scale.y = (CHAR[cls().model] || { scale: 1 }).scale * (player.h / 1.75);
  animChar(avatar, dt, Math.hypot(player.vel.x, player.vel.z), player.pitch);
  if (avatar.flash) avatar.flash.visible = vm.flashT > 0;
  // over-the-shoulder camera with collision
  const piv = new V3(player.pos.x, player.pos.y + player.h - 0.05, player.pos.z); aimBasis();
  const dist = lerp(2.9, 1.5, wst.ads), want = piv.clone().addScaledVector(_f, -dist).addScaledVector(_r, lerp(0.6, 0.45, wst.ads)).addScaledVector(_u, 0.25);
  const dir = want.clone().sub(piv), len = dir.length(); dir.divideScalar(len); const h = raycast(piv, dir, len, false);
  camera.position.copy(piv).addScaledVector(dir, Math.max(0.3, Math.min(len, h.t - 0.25)));
  return true;
}

// ============================================================ MAIN LOOP
let last = performance.now(), menuT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = (now - last) / 1000; const dt = Math.min(rawDt, 0.05); last = now;
  fpsAcc += rawDt; fpsN++; if (fpsAcc > 0.5) { setText('fps', Math.round(fpsN / fpsAcc) + ' FPS' + (dynScale < 0.99 ? ' · ' + Math.round(dynScale * 100) + '% res' : '')); fpsAcc = 0; fpsN = 0; }
  // dynamic resolution: keep the game smooth on weak CPUs / integrated graphics
  if (game.state === 'play' && rawDt < 0.5) {
    dynAcc += rawDt; dynN++;
    if (dynAcc > 1.0) {
      const fps = dynN / dynAcc, prev = dynScale;
      if (fps < 42) dynScale = Math.max(0.4, dynScale * (fps < 25 ? 0.75 : 0.88));
      else if (fps > 57) dynScale = Math.min(1, dynScale * 1.06);
      if (Math.abs(prev - dynScale) > 0.01) resize();
      dynAcc = 0; dynN = 0;
    }
  }
  const tA = performance.now(); pollGamepad(dt);
  if (game.state === 'play' || game.state === 'dying' || (MP.active && (game.state === 'paused' || game.state === 'armory'))) {
    game.time += dt; if (game.state === 'play') game.runTime += dt;
    const steps = Math.ceil(dt / 0.0167), sdt = dt / steps;
    for (let i = 0; i < steps; i++) updatePlayer(sdt);
    player.gcd -= dt; player.lastDmgT += dt;
    if (player.alive && player.lastDmgT > 4.5 && player.hp < player.regenCap) player.hp = Math.min(player.regenCap, player.hp + cls().regen * dt);
    player.abilityCD = Math.max(0, player.abilityCD - dt); player.stimT -= dt; player.pulseT -= dt;
    if (player.shieldT > 0) { player.shieldT -= dt; if (player.shieldT <= 0) player.shield = 0; }
    if (player.alive) updateWeapon(dt);
    if (MP.active) updateMP(dt); else if (game.mode === 'botdm') updateBotMatch(dt); else updateWaves(dt);
    if (game.state === 'play') ambience.update(dt);
    enemies = enemies.filter(e => e.update(dt));
    barrels.forEach(b => b.update(dt));
    pickups = pickups.filter(p => p.update(dt, game.time));
    updateGrenades(dt); updateClouds(dt);
    updateCamera(dt); const third = updateAvatar(dt);
    if (game.state === 'dying') {
      game.dieT -= dt; camera.position.y -= (1 - game.dieT / 1.6) * 1.1; camera.rotation.z = (1 - game.dieT / 1.6) * 0.5;
      if (game.dieT <= 0) finishDeath();
    }
    updateHUD(dt); updateDmgNumbers(dt);
  } else if ((game.state === 'menu' || game.state === 'mpover') && world) {
    menuT += dt * 0.05; const [x0, z0, x1, z1] = world.L.bounds, r = Math.max(x1 - x0, z1 - z0) * 0.42;
    camera.position.set(Math.sin(menuT) * r, 9, Math.cos(menuT) * r); camera.fov = 70; camera.updateProjectionMatrix();
    camera.lookAt(0, 1.5, 0); sky.position.copy(camera.position); if (stars) stars.position.copy(camera.position);
    barrels.forEach(b => b.update(dt)); pickups.forEach(p => p.inner.rotation.y += dt);
  }
  updateEnvironment(dt);
  if (game.state !== 'paused' && game.state !== 'over' && game.state !== 'armory') { sparks.update(dt); debris.update(dt); updateTracers(dt); updateBooms(dt); }
  const tB = performance.now();
  renderer.clear();
  renderer.render(scene, camera);
  prof.js += tB - tA; prof.n++;
  if ((game.state === 'play' || game.state === 'paused' || game.state === 'dying' || game.state === 'armory') && settings.view !== 'third') { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
  if (game.state === 'menu') { if (mapThumbPending && world) { mapThumbPending = false; captureMapThumb(); } updatePreview(dt); }
  prof.render += performance.now() - tB;
}
const prof = { js: 0, render: 0, n: 0 };

// ============================================================ MENU UI
function renderBest() {
  let b = 0; try { b = +localStorage.getItem('bp_best_' + settings.map + '_' + settings.difficulty) || 0; } catch (e) {}
  $('best').textContent = b ? `Best on ${MAPS[settings.map].name} (${{ easy: 'Recruit', normal: 'Veteran', hard: 'Elite' }[settings.difficulty]}): ${b}` : '';
}
function initUI() {
  const maps = $('maps');
  MAPS.forEach((m, i) => {
    const b = document.createElement('button'); b.className = 'card' + (i === settings.map ? ' on' : '');
    b.innerHTML = `<b>${m.name}</b><span>${m.desc}</span><em>${m.tag}</em>`;
    b.onclick = () => { settings.map = i; saveSettings(); [...maps.children].forEach((c, k) => c.classList.toggle('on', k === i)); loadMap(i); world.shadows = QUALITY[settings.quality].shadows; renderBest(); let has = null; try { has = localStorage.getItem('bp_mthumb_' + MAPS[i].name); } catch (e) {} if (!has) setTimeout(() => { mapThumbPending = true; }, 1500); };
    maps.appendChild(b);
  });
  const diff = $('diff');
  const setD = () => [...diff.children].forEach(c => c.classList.toggle('on', c.dataset.v === settings.difficulty));
  diff.onclick = e => { if (e.target.dataset.v) { settings.difficulty = e.target.dataset.v; saveSettings(); setD(); renderBest(); } }; setD();
  const bind = (id, key, fmt, cb) => { const el = $(id); el.value = settings[key]; const upd = () => { settings[key] = el.type === 'range' ? +el.value : el.value; if ($(id + 'v')) $(id + 'v').textContent = fmt(settings[key]); saveSettings(); cb && cb(); }; el.oninput = upd; el.onchange = upd; if ($(id + 'v')) $(id + 'v').textContent = fmt(settings[key]); };
  bind('sens', 'sens', v => v.toFixed(2)); bind('fov', 'fov', v => v + '°');
  $('mus').value = settings.music; $('musv').textContent = Math.round(settings.music * 100) + '%';
  $('mus').oninput = () => { settings.music = +$('mus').value; $('musv').textContent = Math.round(settings.music * 100) + '%'; sfx.setMusic(settings.music); saveSettings(); };
  $('vol').value = settings.volume; $('volv').textContent = Math.round(settings.volume * 100) + '%';
  $('vol').oninput = () => { settings.volume = +$('vol').value; $('volv').textContent = Math.round(settings.volume * 100) + '%'; sfx.setVol(settings.volume); saveSettings(); };
  $('quality').value = settings.quality;
  $('quality').onchange = () => { settings.quality = $('quality').value; saveSettings(); resize(); loadMap(settings.map); world.shadows = QUALITY[settings.quality].shadows; };
  $('play').onclick = startGame;
  $('mpbtn').onclick = openMpScreen;
  $('botbtn').onclick = startBotMatch;
  for (const [id, key, def] of [['bots', 'bots', 5], ['botDiff', 'botDiff', 'normal'], ['botMode', 'botMode', 'ffa']]) { const el = $(id); el.value = settings[key] || def; el.onchange = () => { settings[key] = id === 'bots' ? +el.value : el.value; saveSettings(); }; }
  renderLoadout($('loadout'));
  const cl = $('classes');
  const renderClasses = window.renderClassesUI = () => { cl.innerHTML = ''; for (const k in CLASSES) { const C = CLASSES[k]; const b = document.createElement('button'); b.className = 'wcard cls' + (settings.cls === k ? ' on' : '');
    b.innerHTML = `<b>${C.name}</b><span>${C.desc}</span><em>${C.hp} HP · ${C.passive}</em><em class="ab">[E] ${C.ability}: ${C.abDesc} · ${C.cd}s</em>`;
    if (THUMBS['cls_' + k]) b.insertAdjacentHTML('afterbegin', `<img class="thumb tall" src="${THUMBS['cls_' + k]}" alt="">`);
    b.onclick = () => { settings.cls = k; saveSettings(); renderClasses(); sendInfo(); renderLoadout($('loadout')); PV.mode = 'char'; buildPreview(); }; cl.appendChild(b); } };
  renderClasses();
  $('armback').onclick = resumeGame;
  $('resume').onclick = resumeGame;
  $('restart').onclick = () => { if (game.mode === 'botdm') return startBotMatch(); resetRun(); resumeGame(); };
  $('quit').onclick = toMenu;
  $('retry').onclick = startGame;
  $('tomenu').onclick = toMenu;
  renderBest();
}

// ============================================================ BOOT
makeTextures();
sparks = new Particles(500, true, 0.12); debris = new Particles(300, false, 0.1);
initTracers(); initDecals();
boomLight = new THREE.PointLight(0xff9040, 0, 22, 2); scene.add(boomLight);
muzzleLight = new THREE.PointLight(0xffb060, 0, 9, 2); scene.add(muzzleLight);
WEAPONS.forEach(w => { applyAttachments(w); vmModels.push(makeGun(w)); }); initCasings();
resize(); loadMap(settings.map); world.shadows = QUALITY[settings.quality].shadows;
initUI(); initMpUI(); initDmgNumbers(); initPreview(); applyMapThumbs();
{ let has = null; try { has = localStorage.getItem('bp_mthumb_' + MAPS[settings.map].name); } catch (e) {} if (!has) setTimeout(() => { mapThumbPending = true; }, 2500); }
addEventListener('bp-assets', () => { makeThumbs(); PV.mode = 'char'; buildPreview(); });
for (const [id, key, conv] of [['xhair', 'xhair', String], ['xcolor', 'xcolor', String], ['invertY', 'invertY', v => v === '1'], ['adsToggle', 'adsToggle', v => v === '1'], ['view', 'view', String], ['ambience', 'ambience', v => v === '1']]) {
  const el = $(id); if (!el) continue; const cur = settings[key]; el.value = typeof cur === 'boolean' ? (cur ? '1' : '0') : (cur || el.value); el.onchange = () => { settings[key] = conv(el.value); saveSettings(); };
}
const firstTouch = () => { sfx.init(); if (game.state === 'menu') setTimeout(() => music.play(music.pending || 'title'), 100); removeEventListener('pointerdown', firstTouch); removeEventListener('keydown', firstTouch); };
addEventListener('pointerdown', firstTouch); addEventListener('keydown', firstTouch);
requestAnimationFrame(frame);
window.__bp = { equip: id => { const i = widx(id); carry[0] = i; rebuildViewmodels(); inv[i] = { mag: WEAPONS[i].mag, res: WEAPONS[i].res }; wst.cur = i; wst.switchT = 0; vmModels.forEach((m, k) => { if (m) m.g.visible = k === i; }); }, WEAPONS, settingsRef: () => settings, makeCharacter, animChar, MP, remotes, pickupsList: () => pickups, prof, renderer, game, player, enemies: () => enemies, startGame, settings, wst, inv: () => inv, keys, world: () => world, setMouse: (l, r) => { mouseL = mL = l; mouseR = mR = r; } };
})();
