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
const settings = { sens: 1, fov: 85, quality: 'medium', difficulty: 'normal', map: 0, volume: 0.6, primary: 'rifle', secondary: 'pistol', cls: 'assault' };
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
const vmCam = new THREE.PerspectiveCamera(60, 1, 0.01, 10);
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

// ============================================================ AUDIO (synthesized)
const sfx = {
  ctx: null,
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C();
    this.master = c.createGain(); this.master.gain.value = settings.volume;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 5;
    this.master.connect(comp); comp.connect(c.destination);
    const len = c.sampleRate; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nb = buf;
  },
  setVol(v) { if (this.master) this.master.gain.value = v; },
  out(pan) {
    if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(this.master); return p; }
    return this.master;
  },
  noise(o) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.nb;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur); f.Q.value = o.q || 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g), t + (o.a || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(this.out(o.pan));
    src.start(t, Math.random() * 0.5); src.stop(t + o.dur + 0.05);
  },
  tone(o) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g), t + (o.a || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(this.out(o.pan)); osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  play(n, o = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const v = o.vol === undefined ? 1 : o.vol, p = o.pan || 0;
    const N = (x) => this.noise(Object.assign({ pan: p }, x, { g: x.g * v }));
    const T = (x) => this.tone(Object.assign({ pan: p }, x, { g: x.g * v }));
    switch (n) {
      case 'pistol': N({ dur: 0.16, f: 4000, f2: 700, g: 0.7 }); T({ f: 180, f2: 55, dur: 0.1, g: 0.5 }); N({ dur: 0.4, f: 900, f2: 200, g: 0.08, delay: 0.03 }); break;
      case 'rifle': N({ dur: 0.13, type: 'bandpass', f: 2200, f2: 600, q: 0.6, g: 0.9 }); T({ type: 'triangle', f: 140, f2: 45, dur: 0.09, g: 0.45 }); N({ dur: 0.35, f: 700, f2: 150, g: 0.06, delay: 0.02 }); break;
      case 'shotgun': N({ dur: 0.38, f: 2600, f2: 250, g: 1.1 }); T({ f: 95, f2: 32, dur: 0.28, g: 0.9 }); N({ dur: 0.7, f: 600, f2: 120, g: 0.12, delay: 0.04 }); break;
      case 'dmr': N({ dur: 0.08, type: 'highpass', f: 3000, g: 0.7 }); N({ dur: 0.5, f: 3000, f2: 300, g: 0.9 }); T({ f: 120, f2: 30, dur: 0.35, g: 0.8 }); N({ dur: 1.0, f: 500, f2: 100, g: 0.12, delay: 0.06 }); break;
      case 'smg': N({ dur: 0.09, type: 'bandpass', f: 2800, f2: 900, q: 0.7, g: 0.7 }); T({ type: 'triangle', f: 190, f2: 70, dur: 0.06, g: 0.3 }); break;
      case 'revolver': N({ dur: 0.3, f: 3500, f2: 400, g: 1.0 }); T({ f: 110, f2: 35, dur: 0.22, g: 0.8 }); N({ dur: 0.7, f: 700, f2: 120, g: 0.12, delay: 0.04 }); break;
      case 'eRifle': N({ dur: 0.12, type: 'bandpass', f: 1500, f2: 500, q: 0.8, g: 0.55 }); T({ type: 'square', f: 220, f2: 80, dur: 0.06, g: 0.08 }); break;
      case 'eShotgun': N({ dur: 0.3, f: 1800, f2: 200, g: 0.8 }); T({ f: 80, f2: 35, dur: 0.2, g: 0.4 }); break;
      case 'eHeavy': N({ dur: 0.08, type: 'bandpass', f: 1100, q: 1, g: 0.45 }); T({ type: 'sawtooth', f: 160, f2: 60, dur: 0.05, g: 0.08 }); break;
      case 'eSniper': N({ dur: 0.6, f: 2500, f2: 200, g: 1 }); T({ f: 900, f2: 120, dur: 0.25, g: 0.3, type: 'sawtooth' }); break;
      case 'charge': T({ type: 'sine', f: 600, f2: 1800, dur: 1.0, g: 0.18, a: 0.3 }); break;
      case 'empty': N({ dur: 0.04, type: 'highpass', f: 3000, g: 0.4 }); break;
      case 'magout': N({ dur: 0.06, type: 'bandpass', f: 1800, q: 3, g: 0.4 }); T({ f: 300, f2: 200, dur: 0.05, g: 0.15 }); break;
      case 'magin': N({ dur: 0.05, type: 'bandpass', f: 2500, q: 2, g: 0.5 }); N({ dur: 0.05, type: 'bandpass', f: 1200, q: 2, g: 0.5, delay: 0.06 }); break;
      case 'shell': N({ dur: 0.07, type: 'bandpass', f: 1600, q: 2, g: 0.45 }); break;
      case 'pump': N({ dur: 0.08, type: 'bandpass', f: 900, q: 2, g: 0.5 }); N({ dur: 0.08, type: 'bandpass', f: 1400, q: 2, g: 0.5, delay: 0.13 }); break;
      case 'switch': N({ dur: 0.08, type: 'bandpass', f: 1300, q: 2, g: 0.3 }); break;
      case 'hit': T({ type: 'square', f: 1700, dur: 0.05, g: 0.12 }); break;
      case 'head': T({ type: 'sine', f: 2400, dur: 0.18, g: 0.35 }); T({ type: 'sine', f: 3600, dur: 0.12, g: 0.15 }); break;
      case 'kill': T({ type: 'triangle', f: 700, dur: 0.08, g: 0.3 }); T({ type: 'triangle', f: 1050, dur: 0.14, g: 0.3, delay: 0.07 }); break;
      case 'hurt': N({ dur: 0.18, f: 600, f2: 150, g: 0.7 }); T({ f: 90, f2: 50, dur: 0.15, g: 0.5 }); break;
      case 'step': N({ dur: 0.07, f: rand(500, 800), f2: 150, g: 0.18 }); break;
      case 'land': N({ dur: 0.14, f: 500, f2: 100, g: 0.45 }); break;
      case 'jump': N({ dur: 0.08, f: 900, f2: 300, g: 0.12 }); break;
      case 'slide': N({ dur: 0.6, type: 'bandpass', f: 900, f2: 300, q: 0.8, g: 0.25, a: 0.05 }); break;
      case 'pad': T({ type: 'sine', f: 200, f2: 1200, dur: 0.35, g: 0.35 }); N({ dur: 0.4, type: 'bandpass', f: 600, f2: 3000, g: 0.25 }); break;
      case 'explode': N({ dur: 1.4, f: 1800, f2: 60, g: 1.3 }); T({ f: 70, f2: 22, dur: 0.9, g: 1.0 }); break;
      case 'pickup': T({ type: 'triangle', f: 660, dur: 0.08, g: 0.3 }); T({ type: 'triangle', f: 990, dur: 0.12, g: 0.3, delay: 0.08 }); break;
      case 'wave': T({ type: 'sawtooth', f: 110, dur: 0.9, g: 0.25, a: 0.05 }); T({ type: 'sawtooth', f: 165, dur: 0.9, g: 0.18, a: 0.05 }); break;
      case 'clear': [523, 659, 784, 1046].forEach((f, i) => T({ type: 'triangle', f, dur: 0.25, g: 0.25, delay: i * 0.09 })); break;
      case 'whiz': N({ dur: 0.15, type: 'bandpass', f: 4000, f2: 1500, q: 4, g: 0.35, a: 0.05 }); break;
      case 'throw': N({ dur: 0.15, type: 'bandpass', f: 600, f2: 1500, g: 0.2 }); break;
      case 'bounce': T({ type: 'triangle', f: 900, f2: 600, dur: 0.06, g: 0.15 }); break;
      case 'spawn': T({ type: 'sine', f: 1500, f2: 300, dur: 0.4, g: 0.15 }); break;
      case 'impact': N({ dur: 0.05, type: 'highpass', f: 2500, g: 0.12 }); break;
    }
  },
};
function spatial(p) {
  const dx = p.x - camera.position.x, dy = p.y - camera.position.y, dz = p.z - camera.position.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  return { vol: 1 / (1 + d * 0.07), pan: clamp((dx * rx + dz * rz) / d, -1, 1) * 0.8 };
}

// ============================================================ LEVEL BUILDER
class LevelBuilder {
  constructor() { this.boxes = []; this.decor = []; this.pads = []; this.barrels = []; this.pickups = []; this.enemySpawns = []; this.spawn = { x: 0, y: 0, z: 0, yaw: 0 }; this.bounds = [-30, -30, 30, 30]; }
  box(x0, y0, z0, x1, y1, z1, m = 'wall', o = {}) {
    const b = { x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), m, tint: o.tint };
    (o.col === false ? this.decor : this.boxes).push(b); return b;
  }
  B(cx, cz, w, d, h, y = 0, m = 'wall', o) { return this.box(cx - w / 2, y, cz - d / 2, cx + w / 2, y + h, cz + d / 2, m, o); }
  stairs(x, z, dir, w, h0, h1, run, m = 'metal') {
    const n = Math.max(1, Math.ceil((h1 - h0) / 0.34)), sd = run / n;
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
  pad(x, z, y, vy, px, pz) { const b = this.B(x, z, 2, 2, 0.14, y, 'pad'); b.pad = { vy, px, pz }; this.pads.push(b); this.B(x, z, 2.4, 2.4, 0.06, y, 'trimB', { col: false }); return b; }
}
const door = c => ({ c, w: 2.2, y0: 0, y1: 2.6 });
const win = c => ({ c, w: 1.6, y0: 1.15, y1: 2.1 });

// ---------------------------------------------------------------- MAP 1: FOUNDRY
function buildFoundry(L) {
  L.bounds = [-32, -24, 32, 24];
  L.box(-34, -1, -26, 34, 0, 26, 'floor');
  L.box(-33, 0, -25, 33, 12, -24); L.box(-33, 0, 24, 33, 12, 25); L.box(-33, 0, -24, -32, 12, 24); L.box(32, 0, -24, 33, 12, 24);
  L.box(-32, 0, -24, 32, 0.6, -23.9, 'hazard', { col: false }); L.box(-32, 0, 23.9, 32, 0.6, 24, 'hazard', { col: false });
  L.box(-32, 0, -24, -31.9, 0.6, 24, 'hazard', { col: false }); L.box(31.9, 0, -24, 32, 0.6, 24, 'hazard', { col: false });
  for (let x = -24; x <= 24; x += 12) { L.box(x - 3.5, 6.5, 23.85, x + 3.5, 9.8, 24, 'glass', { col: false }); L.box(x - 3.5, 6.5, -24, x + 3.5, 9.8, -23.85, 'glass', { col: false }); }
  for (let z = -12; z <= 12; z += 12) { L.box(-32, 6.5, z - 3, -31.85, 9.8, z + 3, 'glass', { col: false }); L.box(31.85, 6.5, z - 3, 32, 9.8, z + 3, 'glass', { col: false }); }
  // catwalks
  for (const s of [1, -1]) {
    const ez = 19 * s;
    L.box(-28, 3.5, ez, 28, 3.8, 24 * s, 'metal');
    L.box(-28, 4.7, ez - 0.05, 28, 4.8, ez + 0.05, 'beam', { col: false });
    for (let x = -28; x <= 28; x += 4) L.box(x - 0.05, 3.8, ez - 0.05, x + 0.05, 4.7, ez + 0.05, 'beam', { col: false });
    for (let x = -24; x <= 24; x += 8) L.B(x, ez + s * 0.4, 0.4, 0.4, 3.5, 0, 'beam');
    for (const x of [-24, 24]) L.stairs(x, 13 * s, s > 0 ? 'pz' : 'nz', 3, 0, 3.8, 6, 'metal');
    L.B(-10, 21.5 * s, 1.2, 1.2, 1.2, 3.8, 'crate'); L.B(10, 21.5 * s, 3, 0.6, 1.0, 3.8, 'hazard');
  }
  // central deck
  const deck = L.B(0, 0, 12, 10, 1.4, 0, 'concrete');
  L.box(deck.x0 - 0.02, 1.3, deck.z0 - 0.02, deck.x1 + 0.02, 1.42, deck.z1 + 0.02, 'hazard', { col: false });
  L.stairs(9, 0, 'nx', 4, 0, 1.4, 3, 'metal'); L.stairs(-9, 0, 'px', 4, 0, 1.4, 3, 'metal');
  L.B(0, -2.6, 4, 0.6, 1.0, 1.4, 'hazard'); L.B(0, 2.6, 4, 0.6, 1.0, 1.4, 'hazard');
  L.B(-4.2, -3.6, 1.2, 1.2, 1.2, 1.4, 'crate'); L.B(4.2, 3.6, 1.2, 1.2, 1.2, 1.4, 'crate');
  // containers
  const RED = 0xb5452f, BLUE = 0x2f6db5, GREEN = 0x3f8f4a, YEL = 0xc9a227;
  L.B(-16, -9, 6, 2.5, 2.6, 0, 'container', { tint: RED });
  L.B(-16, 9, 2.5, 6, 2.6, 0, 'container', { tint: BLUE });
  L.B(16, -9, 2.5, 6, 2.6, 0, 'container', { tint: GREEN });
  L.B(16, 9, 6, 2.5, 2.6, 0, 'container', { tint: YEL });
  L.B(-25, -2, 2.5, 6, 2.6, 0, 'container', { tint: GREEN }); L.B(-25, -2.5, 2.5, 5, 2.6, 2.6, 'container', { tint: RED });
  L.B(25, 2, 2.5, 6, 2.6, 0, 'container', { tint: BLUE }); L.B(25, 2.5, 2.5, 5, 2.6, 2.6, 'container', { tint: YEL });
  // crate steps up onto containers
  L.B(-12.4, -9.6, 1.2, 1.2, 1.2, 0, 'crate'); L.B(-12.4, -8.4, 1.2, 1.2, 1.2, 0, 'crate'); L.B(-12.4, -8.4, 1.2, 1.2, 1.2, 1.2, 'crate');
  L.B(12.4, 9.6, 1.2, 1.2, 1.2, 0, 'crate'); L.B(12.4, 8.4, 1.2, 1.2, 1.2, 0, 'crate'); L.B(12.4, 8.4, 1.2, 1.2, 1.2, 1.2, 'crate');
  // crate clusters
  for (const [x, z, st] of [[-6, 14, 1], [-4.8, 14.2, 0], [6, -14, 1], [4.8, -14.2, 0], [-28, 12, 1], [28, -12, 1], [-10, -16, 0], [10, 16, 0], [-21, 16, 0], [21, -16, 0]]) {
    L.B(x, z, 1.2, 1.2, 1.2, 0, 'crate'); if (st) L.B(x + 0.1, z - 0.1, 1.2, 1.2, 1.2, 1.2, 'crate');
  }
  for (const [x, z] of [[-10, 6], [10, -6], [-10, -6], [10, 6]]) L.B(x, z, 1.2, 1.2, 12, 0, 'concrete');
  L.B(0, -14, 5, 0.6, 1.1, 0, 'hazard'); L.B(0, 14, 5, 0.6, 1.1, 0, 'hazard');
  L.B(-20, 0, 0.6, 4, 1.1, 0, 'hazard'); L.B(20, 0, 0.6, 4, 1.1, 0, 'hazard');
  // roof structure & lamps
  for (let z = -16; z <= 16; z += 8) L.box(-32, 10.6, z - 0.3, 32, 11.3, z + 0.3, 'beam', { col: false });
  L.box(-0.3, 11.3, -24, 0.3, 11.8, 24, 'beam', { col: false });
  for (const x of [-20, 0, 20]) for (const z of [-8, 8]) { L.box(x - 1.2, 9.5, z - 0.25, x + 1.2, 9.7, z + 0.25, 'lamp', { col: false }); L.box(x - 0.03, 9.7, z - 0.03, x + 0.03, 10.6, z + 0.03, 'beam', { col: false }); }
  L.pad(12, 15, 0, 14, 0, 6); L.pad(-12, -15, 0, 14, 0, -6);
  L.spawn = { x: 0, y: 1.4, z: 0, yaw: 0 };
  L.enemySpawns = [[-29, -21], [29, 21], [-29, 21], [29, -21], [-29, 8], [29, -8], [0, -21], [0, 21], [-14, -21], [14, 21]];
  L.pickups = [['health', -20, 0, 3], ['health', 20, 0, -3], ['ammo', 0, 3.8, 21.5], ['ammo', 0, 3.8, -21.5], ['ammo', -16, 2.6, -9], ['health', 16, 2.6, 9]];
  L.barrels = [[-8, -10], [8, 10], [-27, 15], [27, -15], [-3, -20], [3, 20], [-22, -6], [22, 6]];
}

// ---------------------------------------------------------------- MAP 2: DUSTYARD
function buildDustyard(L) {
  L.bounds = [-36, -36, 36, 36];
  L.box(-40, -1, -40, 40, 0, 40, 'floor');
  L.box(-37, 0, -37, 37, 7, -36, 'wall'); L.box(-37, 0, 36, 37, 7, 37, 'wall'); L.box(-37, 0, -36, -36, 7, 36, 'wall'); L.box(36, 0, -36, 37, 7, 36, 'wall');
  L.box(-37.2, 7, -37.2, 37.2, 7.4, -35.8, 'stone', { col: false }); L.box(-37.2, 7, 35.8, 37.2, 7.4, 37.2, 'stone', { col: false });
  L.box(-37.2, 7, -36, -35.8, 7.4, 36, 'stone', { col: false }); L.box(35.8, 7, -36, 37.2, 7.4, 36, 'stone', { col: false });
  // buildings
  L.building(-30, 14, -16, 28, 4.5, { s: [door(-23)], e: [door(21)], n: [win(-26), win(-20)], w: [win(21)], roofGap: [-29.4, -26.6] }, 'house', 'roof', 0.7);
  L.stairs(-28, 6, 'pz', 2.4, 0, 4.8, 8, 'stone');
  L.building(16, -28, 30, -14, 4.5, { n: [door(23)], w: [door(-21)], s: [win(20), win(26)], e: [win(-21)] }, 'house2', 'roof', 0);
  L.box(16 - 0.2, 4.8, -28.2, 30.2, 5.5, -27.85, 'house2'); L.box(29.85, 4.8, -28.2, 30.2, 5.5, -13.8, 'house2'); L.box(15.8, 4.8, -28.2, 16.15, 5.5, -13.8, 'house2');
  L.box(15.8, 4.8, -14.15, 26.6, 5.5, -13.8, 'house2');
  L.stairs(28, -6, 'nz', 2.4, 0, 4.8, 8, 'stone');
  L.building(18, 18, 26, 26, 6, { s: [door(22)], w: [door(22)], n: [win(22)], e: [win(22)] }, 'house', 'roof', 0.7);
  L.building(-26, -26, -18, -18, 6, { n: [door(-22)], e: [door(-22)], s: [win(-22)], w: [win(-22)] }, 'house2', 'roof', 0.7);
  L.pad(22, 14, 0, 17, 0, 5); L.pad(-22, -14, 0, 17, 0, -5);
  // plaza
  L.B(0, 0, 7, 7, 0.7, 0, 'stone'); L.B(0, 0, 6.2, 6.2, 0.06, 0.66, 'water', { col: false });
  L.B(0, 0, 1.2, 1.2, 2.6, 0, 'stone'); L.B(0, 0, 2.6, 2.6, 0.3, 2.6, 'stone');
  const awn = [0xb33a3a, 0x2f6fae, 0x3f8f4a, 0xd98a2b];
  [[-11, 0, 0], [11, 0, 0], [0, 11, 1], [0, -11, 1]].forEach(([cx, cz, r], i) => {
    const w = r ? 3.4 : 1, d = r ? 1 : 3.4, aw = r ? 4 : 2.6, ad = r ? 2.6 : 4;
    L.B(cx, cz, w, d, 1.1, 0, 'wood');
    L.B(cx, cz, aw, ad, 0.12, 2.7, 'cloth', { col: false, tint: awn[i] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.B(cx + sx * (aw / 2 - 0.1), cz + sz * (ad / 2 - 0.1), 0.12, 0.12, 2.7, 0, 'wood', { col: false });
  });
  for (const [x, z, w, d] of [[-12, -15, 5, 1], [12, 15, 5, 1], [-6, 22, 1, 4], [6, -22, 1, 4], [-21, 2, 1, 5], [21, -2, 1, 5], [-30, -30, 4, 1], [30, 30, 4, 1]]) L.B(x, z, w, d, 1.0, 0, 'bags');
  L.B(-10, -26, 0.6, 12, 3, 0, 'house'); L.B(10, 26, 0.6, 12, 3, 0, 'house');
  L.B(27, 6, 9, 0.6, 3, 0, 'house2'); L.B(-27, -6, 9, 0.6, 3, 0, 'house2');
  // arches into the plaza
  for (const [x, z, rot] of [[-17, -9, 0], [17, 9, 0]]) {
    L.B(x, z - 2, 0.8, 0.8, 4, 0, 'stone'); L.B(x, z + 2, 0.8, 0.8, 4, 0, 'stone'); L.B(x, z, 0.9, 5, 0.8, 4, 'stone');
  }
  for (const [x, z] of [[-15, 9], [15, -9], [-5, 31], [5, -31], [31, -24], [-31, 24]]) {
    L.B(x, z, 0.4, 0.4, 5.2, 0, 'trunk');
    L.B(x, z, 3.6, 1.0, 0.25, 5.1, 'leaf', { col: false }); L.B(x, z, 1.0, 3.6, 0.25, 5.2, 'leaf', { col: false }); L.B(x, z, 1.6, 1.6, 0.5, 5.0, 'leaf', { col: false });
  }
  for (const [x, z, st] of [[-6, -7, 1], [7, 6, 0], [-14, -30, 1], [14, 30, 1], [29, 32, 0], [-29, -32, 0], [-30, 8, 0], [30, -8, 1], [-4, -18, 0], [4, 18, 0]]) {
    L.B(x, z, 1.2, 1.2, 1.2, 0, 'crate'); if (st) L.B(x, z, 1.2, 1.2, 1.2, 1.2, 'crate');
  }
  L.spawn = { x: 0, y: 0, z: -32, yaw: Math.PI };
  L.enemySpawns = [[-33, 33], [33, 33], [0, 34], [-34, 0], [34, 0], [-33, -33], [33, -33], [20, 9], [-20, -9], [-12, 32], [12, -33]];
  L.pickups = [['health', -23, 0, 21], ['health', 23, 0, -21], ['health', 22, 6.3, 22], ['ammo', -22, 6.3, -22], ['ammo', -23, 4.8, 18], ['ammo', 23, 4.8, -18], ['health', 2.6, 0.7, 2.6], ['ammo', -22, 0, -22]];
  L.barrels = [[-8, -20], [8, 20], [-30, 0], [30, 10], [-14, 12], [14, -12], [-3, 8], [3, -8]];
}

// ---------------------------------------------------------------- MAP 3: NEON SPIRE
function buildNeon(L) {
  L.bounds = [-30, -30, 30, 30];
  L.box(-32, -1, -32, 32, 0, 32, 'floor');
  L.box(-31, 0, -31, 31, 10, -30); L.box(-31, 0, 30, 31, 10, 31); L.box(-31, 0, -30, -30, 10, 30); L.box(30, 0, -30, 31, 10, 30);
  for (const y of [0.25, 9.3]) {
    const m = y < 1 ? 'trimA' : 'trimB';
    L.box(-30, y, -30, 30, y + 0.12, -29.92, m, { col: false }); L.box(-30, y, 29.92, 30, y + 0.12, 30, m, { col: false });
    L.box(-30, y, -30, -29.92, y + 0.12, 30, m, { col: false }); L.box(29.92, y, -30, 30, y + 0.12, 30, m, { col: false });
  }
  // elevated ring with gaps mid-side
  const ring = [
    [-30, 26, -2, 30], [2, 26, 30, 30], [-30, -30, -2, -26], [2, -30, 30, -26],
    [26, -26, 30, -2], [26, 2, 30, 26], [-30, -26, -26, -2], [-30, 2, -26, 26],
  ];
  for (const [x0, z0, x1, z1] of ring) { const b = L.box(x0, 4, z0, x1, 4.4, z1, 'metal'); L.trim(b, 'trimA', 0.02); }
  for (const [x, z, w, d] of [[-14, 28, 2.2, 1], [14, -28, 2.2, 1], [28, 14, 1, 2.2], [-28, -14, 1, 2.2], [14, 28, 1, 1], [-14, -28, 1, 1]]) { const b = L.B(x, z, w, d, 1, 4.4, 'wall'); L.trim(b, 'trimB'); }
  L.stairs(20, 14, 'pz', 3, 0, 4.4, 12, 'metal'); L.stairs(-20, -14, 'nz', 3, 0, 4.4, 12, 'metal');
  L.stairs(-14, 20, 'nx', 3, 0, 4.4, 12, 'metal'); L.stairs(14, -20, 'px', 3, 0, 4.4, 12, 'metal');
  // centre
  const c = L.B(0, 0, 7, 7, 1.2, 0, 'metal'); L.trim(c, 'trimA');
  const sp = L.B(0, 0, 2.6, 2.6, 7, 0, 'wall'); L.trim(sp, 'trimB');
  L.B(0, 0, 2.7, 2.7, 0.1, 3.5, 'trimA', { col: false });
  L.stairs(5.5, 0, 'nx', 2.4, 0, 1.2, 2, 'metal'); L.stairs(-5.5, 0, 'px', 2.4, 0, 1.2, 2, 'metal');
  L.stairs(0, 5.5, 'nz', 2.4, 0, 1.2, 2, 'metal'); L.stairs(0, -5.5, 'pz', 2.4, 0, 1.2, 2, 'metal');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const b = L.B(10 * sx, 10 * sz, 2, 2, 3.6, 0, 'wall'); L.trim(b, sx * sz > 0 ? 'trimA' : 'trimB'); }
  for (const [x, z, w, d] of [[0, 13, 7, 0.8], [0, -13, 7, 0.8], [13, 0, 0.8, 7], [-13, 0, 0.8, 7]]) { const b = L.B(x, z, w, d, 1.2, 0, 'metal'); L.trim(b, 'trimA'); }
  for (const [x, z, w, d] of [[-18, 6, 1, 4], [18, -6, 1, 4], [6, 19, 4, 1], [-6, -19, 4, 1], [-22, -22, 2, 2], [22, 22, 2, 2]]) { const b = L.B(x, z, w, d, 2.2, 0, 'wall'); L.trim(b, 'trimB'); }
  L.pad(16, 8, 0, 15, 10, 0); L.pad(-16, -8, 0, 15, -10, 0); L.pad(8, -16, 0, 15, 0, -10); L.pad(-8, 16, 0, 15, 0, 10);
  L.spawn = { x: 0, y: 1.2, z: -2.6, yaw: 0 };
  L.enemySpawns = [[-27, -27], [27, 27], [-27, 27], [27, -27], [0, 27], [0, -27], [27, 0], [-27, 0]];
  L.pickups = [['health', 15, 4.4, 28], ['health', -15, 4.4, -28], ['ammo', 28, 4.4, -15], ['ammo', -28, 4.4, 15], ['health', 0, 0, 20], ['ammo', 0, 0, -20]];
  L.barrels = [[-10, 4], [10, -4], [22, -25], [-22, 25], [4, 10], [-4, -10]];
}

const MAPS = [
  {
    name: 'FOUNDRY', desc: 'Industrial hall. Catwalks, stacked containers and a raised central deck.', tag: 'Close–mid range · verticality', build: buildFoundry,
    theme: {
      skyTop: 0x1f2a44, skyBottom: 0xc0895a, sunColor: 0xffa860, sunDir: [0.5, 0.55, 0.35], fog: 0x5d5a5c, fogNear: 25, fogFar: 120,
      hemiSky: 0xc4d2f0, hemiGround: 0x6a5a4a, hemi: 1.9, sun: 1.6, sunLight: 0xffd2a0, shadowSun: [0.35, 1, 0.25],
      mats: {
        floor: { t: 'tiles', c: 0x8b9096, s: 4 }, wall: { t: 'panel', c: 0x8796aa, s: 4 }, metal: { t: 'panel', c: 0x8b9199, s: 2 },
        crate: { t: 'wood', local: true }, container: { t: 'corrugated', s: 2.6 }, hazard: { t: 'hazard', s: 1 }, concrete: { t: 'concrete', c: 0xa9a59e, s: 3 },
        beam: { t: 'panel', c: 0x5a606b, s: 2 }, lamp: { e: 0xfff0c8 }, glass: { e: 0x8fb4d8 }, pad: { e: 0x39ff88 }, trimB: { e: 0x1a8a4a }, barrel: {},
      },
    },
  },
  {
    name: 'DUSTYARD', desc: 'Sun-baked market town. Rooftops, alleys and a central plaza.', tag: 'Mid–long range · rooftops', build: buildDustyard,
    theme: {
      skyTop: 0x3c84d0, skyBottom: 0xf1dcb6, sunColor: 0xfff1c8, sunDir: [-0.5, 0.75, 0.4], fog: 0xe6d6b8, fogNear: 45, fogFar: 170,
      hemiSky: 0xd3e6ff, hemiGround: 0xb08a5a, hemi: 1.2, sun: 2.4, sunLight: 0xfff0d6, shadowSun: [-0.5, 1, 0.4],
      mats: {
        floor: { t: 'sand', c: 0xffffff, s: 6 }, wall: { t: 'plaster', c: 0xd5c4a2, s: 4 }, house: { t: 'plaster', c: 0xe8d6b4, s: 3 }, house2: { t: 'plaster', c: 0xd9b48c, s: 3 },
        roof: { t: 'concrete', c: 0xa38c6d, s: 3 }, stone: { t: 'concrete', c: 0xc9bca6, s: 2 }, wood: { t: 'planks', s: 1.5 }, crate: { t: 'wood', local: true },
        bags: { t: 'bags', s: 1 }, cloth: { c: 0xffffff }, trunk: { t: 'planks', c: 0x9b7b5a, s: 1 }, leaf: { c: 0x5c9a40 }, water: { e: 0x4fb3d9 },
        pad: { e: 0x39ff88 }, trimB: { e: 0x1a8a4a },
      },
    },
  },
  {
    name: 'NEON SPIRE', desc: 'Night arena with an elevated ring, jump pads and a central spire.', tag: 'Fast · arena flow', build: buildNeon,
    theme: {
      skyTop: 0x05030f, skyBottom: 0x341463, sunColor: 0x7d8cff, sunDir: [-0.3, 0.45, -0.6], fog: 0x150b2a, fogNear: 22, fogFar: 95, stars: true,
      hemiSky: 0x9a8dff, hemiGround: 0x2a1040, hemi: 1.5, sun: 1.1, sunLight: 0xa0b0ff, shadowSun: [-0.3, 1, -0.5],
      mats: {
        floor: { t: 'grid', s: 4 }, wall: { t: 'panel', c: 0x454b70, s: 3 }, metal: { t: 'panel', c: 0x6f7596, s: 2 },
        trimA: { e: 0x00e5ff }, trimB: { e: 0xff2bd6 }, pad: { e: 0x39ff88 },
      },
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
  for (const b of L.boxes.concat(L.decor)) (byMat[b.m] || (byMat[b.m] = [])).push(b);
  for (const m in byMat) {
    const def = theme.mats[m] || { c: 0xff00ff };
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
    let mat;
    if (def.e !== undefined) mat = new THREE.MeshBasicMaterial({ color: def.e, vertexColors: true });
    else mat = new THREE.MeshLambertMaterial({ map: def.t ? TEX[def.t] : null, color: def.c !== undefined ? def.c : 0xffffff, vertexColors: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = def.e === undefined && m !== 'floor'; mesh.receiveShadow = def.e === undefined;
    group.add(mesh);
  }
}

// ============================================================ NAV GRID (A*)
const DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1];
class Nav {
  constructor(boxes, bounds) {
    const [x0, z0, x1, z1] = bounds; this.x0 = x0; this.z0 = z0; this.W = Math.ceil(x1 - x0); this.H = Math.ceil(z1 - z0);
    const N = this.W * this.H; this.blk = new Uint8Array(N); const m = 0.45;
    const rel = boxes.filter(b => b.y1 > 0.45 && b.y0 < 1.9);
    for (let j = 0; j < this.H; j++) for (let i = 0; i < this.W; i++) {
      const cx = x0 + i + 0.5, cz = z0 + j + 0.5;
      for (const b of rel) if (cx > b.x0 - m && cx < b.x1 + m && cz > b.z0 - m && cz < b.z1 + m) { this.blk[j * this.W + i] = 1; break; }
    }
    this.g = new Float32Array(N); this.from = new Int32Array(N); this.stamp = new Uint32Array(N); this.closed = new Uint32Array(N); this.cur = 0;
  }
  idx(x, z) { const i = Math.floor(x - this.x0), j = Math.floor(z - this.z0); if (i < 0 || j < 0 || i >= this.W || j >= this.H) return -1; return j * this.W + i; }
  free(x, z) { const k = this.idx(x, z); return k >= 0 && !this.blk[k]; }
  center(k) { return [this.x0 + (k % this.W) + 0.5, this.z0 + Math.floor(k / this.W) + 0.5]; }
  nearestFree(x, z, maxR = 8) {
    const k = this.idx(x, z); if (k >= 0 && !this.blk[k]) return k;
    const ci = Math.floor(x - this.x0), cj = Math.floor(z - this.z0);
    for (let r = 1; r <= maxR; r++) {
      let best = -1, bd = 1e9;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= this.W || j >= this.H) continue;
        const kk = j * this.W + i; if (this.blk[kk]) continue; const d = di * di + dj * dj; if (d < bd) { bd = d; best = kk; }
      }
      if (best >= 0) return best;
    }
    return -1;
  }
  path(sx, sz, tx, tz) {
    const s = this.nearestFree(sx, sz, 4), t = this.nearestFree(tx, tz, 10); if (s < 0 || t < 0) return null;
    if (s === t) return [this.center(t)];
    const W = this.W, H = this.H, st = ++this.cur, ti = t % W, tj = (t / W) | 0;
    const h = k => { const dx = Math.abs(k % W - ti), dz = Math.abs(((k / W) | 0) - tj); return dx + dz - 0.5858 * Math.min(dx, dz); };
    const heap = new Heap(); this.g[s] = 0; this.stamp[s] = st; this.from[s] = -1; heap.push(s, h(s));
    let it = 0;
    while (heap.size && it++ < 7000) {
      const k = heap.pop(); if (this.closed[k] === st) continue; this.closed[k] = st; if (k === t) break;
      const i = k % W, j = (k / W) | 0;
      for (let d = 0; d < 8; d++) {
        const di = DI[d], dj = DJ[d], ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const nk = nj * W + ni; if (this.blk[nk] || this.closed[nk] === st) continue;
        if (di && dj && (this.blk[j * W + ni] || this.blk[nj * W + i])) continue;
        const ng = this.g[k] + (di && dj ? 1.4142 : 1);
        if (this.stamp[nk] !== st || ng < this.g[nk]) { this.stamp[nk] = st; this.g[nk] = ng; this.from[nk] = k; heap.push(nk, ng + h(nk)); }
      }
    }
    if (this.closed[t] !== st) return null;
    const out = []; for (let k = t; k !== -1 && k !== s; k = this.from[k]) out.push(this.center(k));
    return out.reverse();
  }
  lineFree(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, n = Math.ceil(Math.hypot(dx, dz) / 0.4);
    for (let i = 1; i <= n; i++) { const t = i / n; if (!this.free(ax + dx * t, az + dz * t)) return false; }
    return true;
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
let enemies = [], pickups = [], barrels = [], grenades = [];
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
  if (withEnemies) for (const e of enemies) {
    if (e.dead || e === ignore) continue;
    const s = e.s, x = e.pos.x, y = e.pos.y, z = e.pos.z;
    let t = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, x - 0.2 * s, y + 1.45 * s, z - 0.2 * s, x + 0.2 * s, y + 1.86 * s, z + 0.2 * s, best);
    if (t >= 0 && t < best) { best = t; he = e; head = true; hb = null; nx = RN[0]; ny = RN[1]; nz = RN[2]; }
    t = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, x - 0.33 * s, y, z - 0.33 * s, x + 0.33 * s, y + 1.45 * s, z + 0.33 * s, best);
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
    const body = new THREE.Mesh(barrelGeo, new THREE.MeshLambertMaterial({ color: 0xb8322a }));
    body.position.y = 0.55; body.castShadow = true; this.mesh.add(body);
    for (const y of [0.3, 0.8]) { const band = new THREE.Mesh(bandGeo, new THREE.MeshLambertMaterial({ map: TEX.hazard })); band.position.y = y; this.mesh.add(band); }
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
const amGeo = new THREE.BoxGeometry(0.65, 0.34, 0.42), ringGeo = new THREE.RingGeometry(0.45, 0.6, 24);
class Pickup {
  constructor(type, x, y, z, temp) {
    this.type = type; this.pos = new V3(x, y, z); this.active = true; this.timer = 0; this.temp = temp; this.life = temp ? 20 : 0;
    const g = this.mesh = new THREE.Group(); const inner = this.inner = new THREE.Group(); g.add(inner);
    if (type === 'health') {
      inner.add(new THREE.Mesh(hpGeo, new THREE.MeshLambertMaterial({ color: 0xf2f2f2 })));
      const red = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
      const a = new THREE.Mesh(crossA, red), b = new THREE.Mesh(crossB, red); a.position.y = b.position.y = 0.12; inner.add(a, b);
    } else {
      inner.add(new THREE.Mesh(amGeo, new THREE.MeshLambertMaterial({ color: 0x5b6b3a })));
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.43), new THREE.MeshBasicMaterial({ color: 0xffc933 })); inner.add(st);
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
      let took = false;
      if (this.type === 'health' && player.hp < player.maxHp) { player.hp = Math.min(player.maxHp, player.hp + 50); player.regenCap = Math.max(player.regenCap, Math.ceil(player.hp / 25) * 25); took = true; showHint('+50 HEALTH', '#5dff9a'); }
      if (this.type === 'ammo') {
        let any = false;
        carry.forEach(i => { const w = WEAPONS[i]; if (isFinite(w.res) && inv[i].res < w.maxRes) { inv[i].res = Math.min(w.maxRes, inv[i].res + w.pickup); any = true; } });
        if (player.grenades < cls().nadeMax) { player.grenades++; any = true; }
        if (any) { took = true; showHint('+AMMO  +GRENADE', '#ffc933'); }
      }
      if (took) {
        sfx.play('pickup');
        if (this.temp) { world.group.remove(this.mesh); return false; }
        this.active = false; this.timer = 22; this.mesh.visible = false;
      }
    }
    return true;
  }
}

// ============================================================ ENEMIES
const ETYPES = {
  grunt: { name: 'Grunt', hp: 100, speed: 3.8, color: 0xd9822b, visor: 0x66e0ff, scale: 1, desired: 13, range: 45, sight: 70, acc: 0.3, dmg: 7, burst: [3, 6], interval: 0.11, pause: [0.7, 1.3], score: 100, reaction: 0.55, snd: 'eRifle', tracer: 0xffb35a },
  rusher: { name: 'Rusher', hp: 70, speed: 6.6, color: 0xc0392b, visor: 0xffe066, scale: 0.92, desired: 2.5, range: 13, sight: 60, acc: 0.6, dmg: 6, pellets: 6, burst: [1, 1], interval: 0.1, pause: [1.0, 1.25], score: 120, reaction: 0.3, rush: true, snd: 'eShotgun', tracer: 0xffd27a },
  heavy: { name: 'Heavy', hp: 300, speed: 2.5, color: 0x6c4bb4, visor: 0xff4d6d, scale: 1.2, desired: 12, range: 40, sight: 70, acc: 0.27, dmg: 6, burst: [10, 18], interval: 0.075, pause: [1.4, 2.0], score: 220, reaction: 0.7, snd: 'eHeavy', tracer: 0xff7ad9 },
  sniper: { name: 'Marksman', hp: 80, speed: 3.3, color: 0x2a9d8f, visor: 0xff2222, scale: 1, desired: 26, range: 90, sight: 90, acc: 0.95, dmg: 45, sniper: true, aim: 1.15, burst: [1, 1], pause: [2.2, 3.0], score: 160, reaction: 0.6, snd: 'eSniper', tracer: 0xff4040 },
};
const eBox = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const EG = { leg: eBox(0.2, 0.8, 0.22), torso: eBox(0.56, 0.66, 0.34), head: eBox(0.34, 0.34, 0.34), visor: eBox(0.28, 0.09, 0.05), arm: eBox(0.14, 0.52, 0.14), gun: eBox(0.08, 0.11, 0.6), pack: eBox(0.4, 0.4, 0.16) };
function makeEnemyMesh(T) {
  const g = new THREE.Group(), s = T.scale;
  const body = new THREE.MeshLambertMaterial({ color: T.color }), dark = new THREE.MeshLambertMaterial({ color: 0x23272e });
  const visor = new THREE.MeshBasicMaterial({ color: T.visor });
  const inner = new THREE.Group(); inner.scale.setScalar(s); g.add(inner);
  const mk = (geo, mat, x, y, z, parent = inner) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-0.14, 0.8, 0); legR.position.set(0.14, 0.8, 0); inner.add(legL, legR);
  mk(EG.leg, dark, 0, -0.4, 0, legL); mk(EG.leg, dark, 0, -0.4, 0, legR);
  mk(EG.torso, body, 0, 1.12, 0); mk(EG.pack, dark, 0, 1.15, -0.24);
  mk(EG.head, body, 0, 1.64, 0); mk(EG.visor, visor, 0, 1.67, 0.17);
  const armR = mk(EG.arm, dark, 0.34, 1.2, 0.16); armR.rotation.x = -1.1;
  const armL = mk(EG.arm, dark, -0.2, 1.2, 0.26); armL.rotation.x = -1.3; armL.rotation.z = -0.5;
  mk(EG.gun, dark, 0.18, 1.25, 0.45);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flash, color: 0xffd090, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.position.set(0.18, 1.27, 0.8); flash.scale.set(0.5, 0.5, 0.5); flash.visible = false; inner.add(flash);
  return { group: g, legL, legR, bodyMat: body, flash };
}
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3();
let laserGeoTpl = null;
class Enemy {
  constructor(type, x, z, wave) {
    const T = this.T = ETYPES[type]; this.type = type; const D = DIFF[settings.difficulty];
    this.maxHp = this.hp = Math.round(T.hp * D.hp * (1 + 0.04 * (wave - 1)));
    this.s = T.scale; this.r = 0.34 * T.scale; this.h = 1.82 * T.scale;
    this.pos = new V3(x, 0.05, z); this.vel = new V3(); this.onGround = false; this.stepSmooth = 0;
    this.yaw = Math.atan2(player.pos.x - x, player.pos.z - z);
    this.path = null; this.pi = 0; this.repathT = 0;
    this.lastKnown = new V3(player.pos.x + rand(-6, 6), 0, player.pos.z + rand(-6, 6));
    this.canSee = false; this.seeT = 0; this.losT = rand(0, 0.2); this.lostT = 0;
    this.fireT = rand(0.4, 1.2); this.burst = 0; this.aimT = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 0;
    this.flashT = 0; this.mflash = 0; this.dead = false; this.deadT = 0; this.walk = rand(0, 6); this.stuckT = 0; this.lastPos = new V3(x, 0, z);
    this.lastFired = -99; this.spawnT = 0.5;
    Object.assign(this, makeEnemyMesh(T));
    this.group.position.copy(this.pos); world.group.add(this.group);
    if (T.sniper) {
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      this.laser = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.85 }));
      this.laser.frustumCulled = false; this.laser.visible = false; world.group.add(this.laser);
    }
  }
  eye(out) { return out.set(this.pos.x, this.pos.y + 1.66 * this.s, this.pos.z); }
  gun(out) { const c = Math.cos(this.yaw), s = Math.sin(this.yaw); return out.set(this.pos.x + (0.18 * c + 0.8 * s) * this.s, this.pos.y + 1.27 * this.s, this.pos.z + (-0.18 * s + 0.8 * c) * this.s); }
  update(dt) {
    if (this.dead) {
      this.deadT += dt; const k = Math.min(this.deadT / 0.5, 1);
      this.group.rotation.x = -this.fallDir * k * k * 1.45;
      if (this.deadT > 2.5) this.group.position.y -= dt * 0.7;
      if (this.deadT > 4) { world.group.remove(this.group); return false; }
      return true;
    }
    const T = this.T, D = DIFF[settings.difficulty], nav = world.nav;
    if (this.spawnT > 0) { this.spawnT -= dt; const k = 1 - this.spawnT / 0.5; this.group.scale.set(1, clamp(k, 0.05, 1), 1); }
    const px = player.pos.x, pz = player.pos.z, dx = px - this.pos.x, dz = pz - this.pos.z, dist = Math.hypot(dx, dz) || 0.001;
    // perception
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = 0.12 + Math.random() * 0.08;
      const e = this.eye(_v1); const ph = playerHead(_v2);
      this.canSee = player.alive && dist < T.sight && los(e.x, e.y, e.z, ph.x, ph.y, ph.z);
    }
    if (this.canSee) { this.seeT += dt; this.lostT = 0; this.lastKnown.set(px, 0, pz); }
    else { this.seeT = 0; this.lostT += dt; if (this.lostT > 2.8) { this.lostT = 0; this.lastKnown.set(px + rand(-4, 4), 0, pz + rand(-4, 4)); this.repathT = 0; } }
    // movement intent
    let mx = 0, mz = 0, spd = T.speed;
    const ux = dx / dist, uz = dz / dist;
    if (this.aimT > 0) { spd = 0; }
    else if (this.canSee && !T.rush && dist < T.desired + 5 && dist > T.desired - 5) {
      this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe *= -1; this.strafeT = rand(0.6, 1.8); }
      let sx = -uz * this.strafe, sz = ux * this.strafe;
      if (!nav.free(this.pos.x + sx * 1.2, this.pos.z + sz * 1.2)) { this.strafe *= -1; sx = -sx; sz = -sz; this.strafeT = rand(0.6, 1.8); }
      mx = sx; mz = sz; spd = T.speed * 0.6;
    } else if (this.canSee && !T.rush && dist <= T.desired - 5) {
      if (nav.free(this.pos.x - ux * 1.2, this.pos.z - uz * 1.2)) { mx = -ux; mz = -uz; spd = T.speed * 0.75; }
      else { mx = -uz * this.strafe; mz = ux * this.strafe; spd = T.speed * 0.6; }
    } else if (T.rush && this.canSee && dist < 7 && nav.lineFree(this.pos.x, this.pos.z, px, pz)) {
      if (dist > 1.6) { mx = ux; mz = uz; } else { mx = -uz * this.strafe; mz = ux * this.strafe; spd = T.speed * 0.5; }
    } else {
      const tx = this.canSee ? px : this.lastKnown.x, tz = this.canSee ? pz : this.lastKnown.z;
      this.repathT -= dt;
      if (this.repathT <= 0 || !this.path) { this.repathT = rand(0.6, 1.0); this.path = nav.path(this.pos.x, this.pos.z, tx, tz); this.pi = 0; }
      if (this.path && this.pi < this.path.length) {
        for (let n = 0; n < 2 && this.pi + 1 < this.path.length; n++) { const q = this.path[this.pi + 1]; if (nav.lineFree(this.pos.x, this.pos.z, q[0], q[1])) this.pi++; else break; }
        const w = this.path[this.pi], wx = w[0] - this.pos.x, wz = w[1] - this.pos.z, wd = Math.hypot(wx, wz);
        if (wd < 0.45) this.pi++; else { mx = wx / wd; mz = wz / wd; }
      }
    }
    // separation
    for (const o of enemies) {
      if (o === this || o.dead) continue;
      const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, d2 = ox * ox + oz * oz;
      if (d2 < 1.44 && d2 > 1e-4) { const d = Math.sqrt(d2); mx += ox / d * (1.2 - d) * 1.6; mz += oz / d * (1.2 - d) * 1.6; }
    }
    if (dist < 1.0 && Math.abs(player.pos.y - this.pos.y) < 1.5) { mx -= ux * 1.5; mz -= uz * 1.5; }
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    const k = this.onGround ? 10 : 1.5;
    this.vel.x = damp(this.vel.x, mx * spd, k, dt); this.vel.z = damp(this.vel.z, mz * spd, k, dt);
    this.stepSmooth = 0; moveBody(this, dt);
    if (this.pos.y < -10) { this.hp = 0; this.die(false, true); return true; }
    // stuck detection
    this.stuckT += dt;
    if (this.stuckT > 1.0) {
      const moved = Math.hypot(this.pos.x - this.lastPos.x, this.pos.z - this.lastPos.z);
      if (ml > 0.3 && spd > 0 && moved < 0.25) { this.repathT = 0; this.vel.x += rand(-3, 3); this.vel.z += rand(-3, 3); this.strafe *= -1; }
      this.lastPos.copy(this.pos); this.stuckT = 0;
    }
    // facing
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const ty = this.canSee || this.aimT > 0 ? Math.atan2(dx, dz) : hs > 0.5 ? Math.atan2(this.vel.x, this.vel.z) : this.yaw;
    this.yaw += angDiff(this.yaw, ty) * (1 - Math.exp(-10 * dt));
    // anim
    this.walk += hs * dt * 2.4; const sw = Math.sin(this.walk) * Math.min(hs / 3, 1) * 0.7;
    this.legL.rotation.x = sw; this.legR.rotation.x = -sw;
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z); this.group.rotation.y = this.yaw;
    if (player.pulseT > 0) { const k = 0.35 + 0.25 * Math.sin(game.time * 6); this.bodyMat.emissive.setRGB(k, k * 0.6, 0); this.bodyMat.depthTest = false; this.group.renderOrder = 5; }
    else if (this.bodyMat.depthTest === false) { this.bodyMat.depthTest = true; this.bodyMat.emissive.setRGB(0, 0, 0); this.group.renderOrder = 0; }
    if (this.flashT > 0) { this.flashT -= dt; const f = Math.max(0, this.flashT / 0.12); this.bodyMat.emissive.setRGB(f, f * 0.9, f * 0.9); }
    if (this.mflash > 0) { this.mflash -= dt; this.flash.visible = this.mflash > 0; this.flash.material.rotation = Math.random() * 6; }
    // combat
    this.fireT -= dt;
    const ready = this.canSee && this.seeT > T.reaction * D.react && player.alive && this.spawnT <= 0;
    if (T.sniper) {
      if (this.aimT > 0) {
        if (!this.canSee) { this.aimT = 0; this.laser.visible = false; this.fireT = rand(0.6, 1.2); }
        else {
          this.aimT -= dt; this.updateLaser();
          if (this.aimT <= 0) { this.laser.visible = false; this.shoot(dist); this.fireT = rand(T.pause[0], T.pause[1]); }
        }
      } else if (ready && this.fireT <= 0 && dist < T.range) {
        this.aimT = T.aim * (settings.difficulty === 'hard' ? 0.85 : settings.difficulty === 'easy' ? 1.3 : 1);
        this.laser.visible = true; this.updateLaser(); const sp = spatial(this.pos); sfx.play('charge', { vol: Math.max(0.35, sp.vol), pan: sp.pan });
      }
    } else if (ready && this.fireT <= 0 && dist < T.range) {
      if (this.burst <= 0) this.burst = randi(T.burst[0], T.burst[1]);
      this.shoot(dist); this.burst--;
      this.fireT = this.burst > 0 ? T.interval : rand(T.pause[0], T.pause[1]);
    }
    return true;
  }
  updateLaser() {
    const g = this.gun(_v1), h = playerHead(_v2); h.y -= 0.25;
    const a = this.laser.geometry.attributes.position.array;
    a[0] = g.x; a[1] = g.y; a[2] = g.z; a[3] = h.x; a[4] = h.y; a[5] = h.z;
    this.laser.geometry.attributes.position.needsUpdate = true;
    this.laser.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(game.time * (this.aimT < 0.4 ? 40 : 14)));
  }
  shoot(dist) {
    const T = this.T, D = DIFF[settings.difficulty];
    const speed = Math.hypot(player.vel.x, player.vel.z);
    let p = T.acc * D.acc * clamp(1.15 - dist / T.range, 0.12, 1);
    p *= T.sniper ? 1 - clamp(speed / 9, 0, 0.75) : 1 - clamp(speed / 14, 0, 0.5);
    if (!player.onGround) p *= 0.8;
    if (player.crouch > 0.5 && !T.sniper) p *= 0.85;
    if (player.sliding) p *= 0.75;
    const n = T.pellets || 1; let dmg = 0;
    for (let i = 0; i < n; i++) if (Math.random() < p) dmg += T.dmg * D.dmg;
    const from = this.gun(new V3()); const to = playerHead(new V3()); to.y -= 0.45;
    if (!dmg) { to.x += rand(-1, 1) * 1.4; to.y += rand(-0.6, 1); to.z += rand(-1, 1) * 1.4; to.sub(from).multiplyScalar(1.6).add(from); }
    spawnTracer(from, to, T.tracer, T.sniper ? 500 : 140, T.sniper ? 0.05 : 0.035);
    this.mflash = 0.06; this.flash.visible = true; this.lastFired = game.time;
    const sp = spatial(this.pos); sfx.play(T.snd, sp);
    if (dmg > 0) damagePlayer(dmg, this.pos);
    else if (dist > 4 && Math.random() < 0.5) sfx.play('whiz', { vol: 0.6, pan: rand(-0.5, 0.5) });
  }
  damage(d, head, impulse) {
    if (this.dead) return false;
    this.hp -= d; this.flashT = 0.12; this.lastKnown.copy(player.pos); this.lostT = 0; this.losT = 0; this.repathT = 0;
    if (impulse) { this.vel.x += impulse.x; this.vel.z += impulse.z; }
    if (this.aimT > 0 && head) this.aimT += 0.35;
    this.fireT = Math.max(this.fireT, 0.06);
    if (this.hp <= 0) { this.die(head); return true; }
    return false;
  }
  die(head, silent) {
    this.dead = true; this.fallDir = Math.random() < 0.5 ? 1 : -1; this.flash.visible = false;
    if (this.laser) this.laser.visible = false;
    this.bodyMat.emissive.setRGB(0, 0, 0); this.bodyMat.color.multiplyScalar(0.5);
    if (silent) return;
    onKill(this, head);
  }
}

// ============================================================ PLAYER
const player = {
  pos: new V3(), vel: new V3(), r: 0.33, h: 1.75, onGround: false, ground: null, stepSmooth: 0, yaw: 0, pitch: 0,
  crouch: 0, sliding: false, slideT: 0, slideCD: 0, coyote: 0, jumpBuf: 0, hp: 100, regenCap: 100, lastDmgT: 99, alive: true,
  grenades: 2, gcd: 0, stepAcc: 0, bob: 0, landKick: 0, tilt: 0, sprinting: false, sprintLock: 0, crouchKeyPrev: false,
  maxHp: 100, abilityCD: 0, stimT: 0, shield: 0, shieldT: 0, pulseT: 0,
};
function playerHead(out) { return out.set(player.pos.x, player.pos.y + player.h - 0.12, player.pos.z); }

// ============================================================ CLASSES
const CLASSES = {
  assault: { name: 'ASSAULT', desc: 'Balanced frontline fighter.', passive: 'Faster health regen', hp: 100, speed: 1, jump: 1, nades: 2, nadeMax: 3, headMul: 1, regen: 20,
    ability: 'STIM', abDesc: 'Heal 40 HP and move 30% faster for 4s', cd: 20 },
  scout: { name: 'SCOUT', desc: 'Fast flanker with high mobility.', passive: '+12% speed, higher jumps', hp: 85, speed: 1.12, jump: 1.12, nades: 1, nadeMax: 2, headMul: 1, regen: 14,
    ability: 'DASH', abDesc: 'Burst forward in your move direction', cd: 6 },
  heavy: { name: 'HEAVY', desc: 'Slow tank that soaks damage.', passive: 'Carries 4 grenades', hp: 150, speed: 0.9, jump: 0.95, nades: 3, nadeMax: 4, headMul: 1, regen: 14,
    ability: 'OVERSHIELD', abDesc: '+60 shield that absorbs damage for 6s', cd: 25 },
  recon: { name: 'RECON', desc: 'Marksman who controls information.', passive: '+20% headshot damage', hp: 100, speed: 1, jump: 1, nades: 2, nadeMax: 3, headMul: 1.2, regen: 14,
    ability: 'PULSE', abDesc: 'Reveal all enemies on radar and through walls for 7s', cd: 18 },
};
if (!CLASSES[settings.cls]) settings.cls = 'assault';
const cls = () => CLASSES[settings.cls];
function useAbility() {
  const C = cls(), P = player;
  if (!P.alive || P.abilityCD > 0) { if (P.alive) showHint(C.ability + ' RECHARGING', '#ff6b5a'); return; }
  P.abilityCD = C.cd;
  if (settings.cls === 'assault') { P.hp = Math.min(P.maxHp, P.hp + 40); P.regenCap = Math.max(P.regenCap, Math.ceil(P.hp / 25) * 25); P.stimT = 4; sfx.play('pad'); showHint('STIM — +40 HP', '#5dff9a'); }
  else if (settings.cls === 'scout') {
    const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let wx = -sy * f + cy * st, wz = -cy * f - sy * st; const l = Math.hypot(wx, wz); if (l < 0.1) { wx = -sy; wz = -cy; } else { wx /= l; wz /= l; }
    P.vel.x = wx * 17; P.vel.z = wz * 17; if (P.onGround) P.vel.y = 2.5; sfx.play('slide'); vm.kick = 0.4;
  }
  else if (settings.cls === 'heavy') { P.shield = 60; P.shieldT = 6; sfx.play('wave'); showHint('OVERSHIELD ACTIVE', '#6dc8ff'); }
  else { P.pulseT = 7; sfx.play('charge'); showHint('PULSE — ENEMIES REVEALED', '#ffcf6b'); for (const e of enemies) if (!e.dead) e.revealed = true; }
}

// ============================================================ WEAPONS
const WEAPONS = [
  { id: 'pistol', slot: 'secondary', desc: 'Accurate semi-auto. Infinite reserve ammo.', short: 'PISTOL', name: 'P9 SIDEARM', dmg: 30, head: 2.2, rpm: 420, auto: false, mag: 12, res: Infinity, reload: 1.15, spread: 0.006, bloom: 0.012, maxBloom: 0.045, move: 0.022, air: 0.05, ads: 0.45, zoom: 1.2, kick: 0.016, kickYaw: 0.006, range: [20, 45, 0.6], snd: 'pistol', hip: [0.2, -0.2, -0.46], adsPos: [0, -0.0715, -0.42], adsSpeed: 13, swap: 0.25, accent: 0x6dd3ff },
  { id: 'revolver', slot: 'secondary', desc: 'Hand cannon. Two-tap kills, heavy kick. Infinite reserve.', short: 'REVOLVER', name: 'MAGNUM .44', dmg: 55, head: 2.0, rpm: 150, auto: false, mag: 6, res: Infinity, reload: 2.0, spread: 0.004, bloom: 0.03, maxBloom: 0.06, move: 0.03, air: 0.06, ads: 0.4, zoom: 1.25, kick: 0.05, kickYaw: 0.012, range: [25, 50, 0.65], snd: 'revolver', hip: [0.2, -0.2, -0.46], adsPos: [0, -0.058, -0.42], adsSpeed: 11, swap: 0.3, accent: 0xe0b050 },
  { id: 'rifle', slot: 'primary', desc: 'All-rounder. Controllable full-auto at any range.', short: 'RIFLE', name: 'AR-7 CARBINE', dmg: 22, head: 1.9, rpm: 640, auto: true, mag: 30, res: 180, maxRes: 270, pickup: 60, reload: 1.9, spread: 0.005, bloom: 0.006, maxBloom: 0.05, move: 0.035, air: 0.07, ads: 0.3, zoom: 1.45, kick: 0.0105, kickYaw: 0.007, range: [25, 60, 0.65], snd: 'rifle', hip: [0.2, -0.21, -0.5], adsPos: [0, -0.096, -0.42], adsSpeed: 9, swap: 0.35, accent: 0xff7a1a },
  { id: 'smg', slot: 'primary', desc: 'Very fast fire, accurate while moving. Weak at range.', short: 'SMG', name: 'VX-9 SMG', dmg: 15, head: 1.7, rpm: 900, auto: true, mag: 32, res: 192, maxRes: 288, pickup: 64, reload: 1.6, spread: 0.009, bloom: 0.005, maxBloom: 0.055, move: 0.012, air: 0.04, ads: 0.5, zoom: 1.3, kick: 0.007, kickYaw: 0.009, range: [12, 35, 0.5], snd: 'smg', hip: [0.2, -0.2, -0.46], adsPos: [0, -0.079, -0.4], adsSpeed: 13, swap: 0.28, accent: 0x5ad1ff },
  { id: 'shotgun', slot: 'primary', desc: 'Nine-pellet pump. Devastating up close.', short: 'SHOTGUN', name: 'BREACHER 12', dmg: 12, head: 1.5, pellets: 9, rpm: 75, auto: true, mag: 6, res: 30, maxRes: 42, pickup: 12, reload: 0.5, shell: true, spread: 0.06, bloom: 0.01, maxBloom: 0.02, move: 0.012, air: 0.02, ads: 0.7, zoom: 1.15, kick: 0.05, kickYaw: 0.012, range: [8, 24, 0.3], snd: 'shotgun', hip: [0.2, -0.21, -0.5], adsPos: [0, -0.064, -0.46], adsSpeed: 10, swap: 0.4, accent: 0xd94848 },
  { id: 'dmr', slot: 'primary', desc: '4x scope. Shots pierce through one enemy.', short: 'DMR', name: 'LANCER DMR', dmg: 68, head: 2.4, rpm: 105, auto: false, mag: 6, res: 24, maxRes: 36, pickup: 10, reload: 2.2, spread: 0.05, bloom: 0.02, maxBloom: 0.05, move: 0.06, air: 0.1, ads: 0.035, zoom: 3.6, scope: true, pierce: true, kick: 0.045, kickYaw: 0.01, range: [70, 140, 0.8], snd: 'dmr', hip: [0.2, -0.21, -0.52], adsPos: [0, -0.1, -0.3], adsSpeed: 7, swap: 0.45, accent: 0x9be564 },
];
let inv = [];
let carry = [2, 0];
const widx = id => WEAPONS.findIndex(w => w.id === id);
if (widx(settings.primary) < 0 || WEAPONS[widx(settings.primary)].slot !== 'primary') settings.primary = 'rifle';
if (widx(settings.secondary) < 0 || WEAPONS[widx(settings.secondary)].slot !== 'secondary') settings.secondary = 'pistol';
const loadoutIdx = () => [widx(settings.primary), widx(settings.secondary)];
const wst = { cur: 2, last: 0, fireCD: 0, reloadT: 0, reloading: false, switchT: 0, ads: 0, bloom: 0, held: false, consec: 0, sinceShot: 9, pumpT: 0 };
// ---- viewmodels
const vmRoot = new THREE.Group(); vmScene.add(vmRoot); vmScene.add(vmCam);
const vmModels = [];
function makeGun(w) {
  const g = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2e35 }), mid = new THREE.MeshLambertMaterial({ color: 0x4b525d });
  const acc = new THREE.MeshLambertMaterial({ color: w.accent }), glove = new THREE.MeshLambertMaterial({ color: 0x35332f }), wood = new THREE.MeshLambertMaterial({ color: 0x7a5233 });
  const B = (sx, sy, sz, x, y, z, m, rx = 0) => { const me = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); me.position.set(x, y, z); me.rotation.x = rx; g.add(me); return me; };
  let muzzle = -0.6, pump = null;
  if (w.id === 'pistol') {
    B(0.05, 0.05, 0.21, 0, 0.035, -0.06, mid); B(0.046, 0.04, 0.18, 0, -0.005, -0.05, dark);
    B(0.044, 0.13, 0.06, 0, -0.075, 0.02, dark, 0.22); B(0.012, 0.016, 0.012, 0, 0.068, -0.15, acc); B(0.03, 0.016, 0.012, 0, 0.068, 0.03, dark);
    B(0.075, 0.1, 0.1, 0, -0.09, 0.04, glove); B(0.06, 0.06, 0.24, 0.02, -0.12, 0.2, glove, -0.2);
    muzzle = -0.17;
  } else if (w.id === 'revolver') {
    B(0.034, 0.034, 0.2, 0, 0.03, -0.14, mid); B(0.05, 0.06, 0.1, 0, 0.012, -0.02, dark);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 8), mid); cyl.rotation.x = Math.PI / 2; cyl.position.set(0, 0.012, -0.03); g.add(cyl);
    B(0.042, 0.12, 0.055, 0, -0.07, 0.04, new THREE.MeshLambertMaterial({ color: 0x6b4527 }), 0.35); B(0.01, 0.016, 0.01, 0, 0.052, -0.23, acc); B(0.012, 0.02, 0.02, 0, 0.045, 0.03, dark);
    B(0.075, 0.1, 0.1, 0, -0.09, 0.05, glove); B(0.06, 0.06, 0.24, 0.02, -0.12, 0.21, glove, -0.2);
    muzzle = -0.25;
  } else if (w.id === 'smg') {
    B(0.06, 0.08, 0.3, 0, 0, -0.04, dark); B(0.05, 0.02, 0.24, 0, 0.05, -0.06, mid); B(0.03, 0.03, 0.12, 0, 0.012, -0.24, mid);
    B(0.04, 0.2, 0.05, 0, -0.13, -0.08, dark); B(0.04, 0.1, 0.05, 0, -0.08, 0.06, dark, 0.3); B(0.02, 0.05, 0.22, 0, -0.01, 0.2, mid);
    B(0.035, 0.03, 0.04, 0, 0.073, -0.12, acc); B(0.035, 0.03, 0.03, 0, 0.073, 0.03, dark); B(0.012, 0.03, 0.22, 0.036, 0, -0.06, acc);
    B(0.075, 0.075, 0.1, 0, -0.065, -0.2, glove); B(0.075, 0.085, 0.09, 0, -0.1, 0.07, glove); B(0.06, 0.06, 0.25, 0.02, -0.12, 0.23, glove, -0.2);
    muzzle = -0.31;
  } else if (w.id === 'rifle') {
    B(0.06, 0.08, 0.38, 0, 0, -0.05, dark); B(0.05, 0.02, 0.32, 0, 0.05, -0.08, mid); B(0.068, 0.07, 0.22, 0, -0.004, -0.33, mid);
    B(0.024, 0.024, 0.16, 0, 0.012, -0.52, dark); B(0.045, 0.15, 0.07, 0, -0.1, -0.09, dark, 0.22); B(0.05, 0.075, 0.2, 0, -0.02, 0.22, mid);
    B(0.04, 0.1, 0.05, 0, -0.08, 0.07, dark, 0.3); B(0.045, 0.04, 0.08, 0, 0.08, -0.03, dark); B(0.03, 0.022, 0.005, 0, 0.096, -0.07, new THREE.MeshBasicMaterial({ color: 0x55ffee, transparent: true, opacity: 0.35 }));
    B(0.01, 0.01, 0.01, 0, 0.096, -0.05, new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    B(0.012, 0.03, 0.3, 0.036, 0, -0.1, acc);
    B(0.075, 0.075, 0.1, 0, -0.065, -0.32, glove); B(0.075, 0.085, 0.09, 0, -0.1, 0.08, glove); B(0.06, 0.06, 0.25, 0.02, -0.12, 0.24, glove, -0.2);
    muzzle = -0.61;
  } else if (w.id === 'shotgun') {
    B(0.07, 0.09, 0.3, 0, 0, 0, dark); B(0.042, 0.042, 0.56, 0, 0.026, -0.42, mid); B(0.036, 0.036, 0.46, 0, -0.026, -0.36, dark);
    pump = B(0.068, 0.068, 0.17, 0, -0.026, -0.38, wood); B(0.055, 0.085, 0.26, 0, -0.035, 0.26, wood, 0.08); B(0.012, 0.014, 0.012, 0, 0.054, -0.68, acc);
    B(0.012, 0.02, 0.2, 0.036, 0.0, -0.05, acc);
    B(0.08, 0.08, 0.1, 0, -0.07, -0.38, glove); B(0.075, 0.085, 0.09, 0, -0.09, 0.1, glove); B(0.06, 0.06, 0.25, 0.02, -0.12, 0.25, glove, -0.2);
    muzzle = -0.71;
  } else {
    B(0.06, 0.085, 0.46, 0, 0, -0.06, dark); B(0.026, 0.026, 0.34, 0, 0.012, -0.45, mid); B(0.045, 0.12, 0.08, 0, -0.09, -0.06, dark, 0.1);
    B(0.055, 0.09, 0.24, 0, -0.02, 0.27, mid); B(0.04, 0.1, 0.05, 0, -0.08, 0.1, dark, 0.3);
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12), dark); sc.rotation.x = Math.PI / 2; sc.position.set(0, 0.1, -0.06); g.add(sc);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.027, 12), new THREE.MeshBasicMaterial({ color: 0x77c7ff })); lens.position.set(0, 0.1, -0.211); lens.rotation.y = Math.PI; g.add(lens);
    B(0.02, 0.04, 0.02, 0, 0.06, -0.14, dark); B(0.02, 0.04, 0.02, 0, 0.06, 0.04, dark); B(0.012, 0.03, 0.34, 0.036, 0, -0.1, acc);
    B(0.075, 0.075, 0.1, 0, -0.065, -0.3, glove); B(0.075, 0.085, 0.09, 0, -0.1, 0.1, glove); B(0.06, 0.06, 0.25, 0.02, -0.12, 0.26, glove, -0.2);
    muzzle = -0.64;
  }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flash, color: 0xffe0a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.position.set(0, 0.012, muzzle - 0.05); flash.visible = false; g.add(flash);
  g.visible = false; vmRoot.add(g);
  return { g, flash, pump, muzzle };
}
let muzzleLight;

// ============================================================ INPUT
const keys = {}; let mouseL = false, mouseR = false, locked = false, mdx = 0, mdy = 0;
addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyB' && game.state === 'armory' && !e.repeat) { resumeGame(); return; }
  if (keys[e.code]) return; keys[e.code] = true;
  if (game.state !== 'play') return;
  if (e.code === 'KeyB') openArmory();
  if (e.code === 'KeyR') startReload();
  if (e.code === 'Digit1') switchTo(carry[0]);
  if (e.code === 'Digit2') switchTo(carry[1]);
  if (e.code === 'Digit3') throwGrenade();
  if (e.code === 'KeyQ') switchTo(wst.cur === carry[0] ? carry[1] : carry[0]);
  if (e.code === 'KeyG') throwGrenade();
  if (e.code === 'KeyE' || e.code === 'KeyF') useAbility();
  if (e.code === 'Space') player.jumpBuf = 0.14;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; });
renderer.domElement.addEventListener('mousedown', e => {
  if (game.state === 'play' && !locked) { requestLock(); return; }
  if (e.button === 0) { mouseL = true; wst.held = false; }
  if (e.button === 2) mouseR = true;
});
addEventListener('mouseup', e => { if (e.button === 0) mouseL = false; if (e.button === 2) mouseR = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => { if (game.state !== 'play') return; switchTo(wst.cur === carry[0] ? carry[1] : carry[0]); }, { passive: true });
addEventListener('mousemove', e => {
  if (!locked || game.state !== 'play' || !player.alive) return;
  const dx = clamp(e.movementX, -300, 300), dy = clamp(e.movementY, -300, 300);
  const zoom = lerp(1, WEAPONS[wst.cur].zoom, wst.ads);
  const s = 0.0022 * settings.sens / zoom;
  player.yaw -= dx * s; player.pitch = clamp(player.pitch - dy * s, -1.5, 1.5);
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
  g.traverse(o => { if (o.geometry && !Object.values(EG).includes(o.geometry) && o.geometry !== barrelGeo && o.geometry !== bandGeo && o.geometry !== hpGeo && o.geometry !== amGeo && o.geometry !== ringGeo && o.geometry !== crossA && o.geometry !== crossB) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
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
  world.nav = new Nav(L.boxes, L.bounds);
  for (const [x, z] of L.barrels) barrels.push(new Barrel(x, z));
  for (const [t, x, y, z] of L.pickups) pickups.push(new Pickup(t, x, y, z, false));
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
  Object.assign(player, { maxHp: C.hp, hp: C.hp, regenCap: C.hp, abilityCD: 0, stimT: 0, shield: 0, shieldT: 0, pulseT: 0, lastDmgT: 99, alive: true, grenades: C.nades, gcd: 0, crouch: 0, sliding: false, slideT: 0, slideCD: 0, h: 1.75, onGround: false, stepSmooth: 0, landKick: 0, yaw: s.yaw, pitch: 0, sprintLock: 0 });
  player.pos.set(s.x, s.y + 0.05, s.z); player.vel.set(0, 0, 0);
  inv = WEAPONS.map(w => ({ mag: w.mag, res: w.res }));
  carry = loadoutIdx(); renderSlots();
  Object.assign(wst, { cur: carry[0], last: carry[1], fireCD: 0, reloadT: 0, reloading: false, switchT: 0, ads: 0, bloom: 0, held: false, consec: 0, sinceShot: 9 });
  vmModels.forEach((m, i) => m.g.visible = i === carry[0]);
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
function damagePlayer(d, from) {
  if (!player.alive) return;
  if (player.shield > 0) { const a = Math.min(player.shield, d); player.shield -= a; d -= a; if (d <= 0) { sfx.play('hit'); hud.vig = Math.min(1, hud.vig + 0.05); return; } }
  player.hp -= d; player.lastDmgT = 0; player.regenCap = Math.max(25, Math.ceil(player.hp / 25) * 25);
  hud.vig = Math.min(1, hud.vig + d / 35); game.shake = Math.min(1, game.shake + d / 120);
  sfx.play('hurt', { vol: 0.7 });
  if (from) { const a = Math.atan2(from.x - player.pos.x, from.z - player.pos.z); addDmgDir(a); }
  if (player.hp <= 0) { player.hp = 0; die(); }
}
const recoil = { p: 0, y: 0 };
function switchTo(i) {
  if (i === wst.cur || !carry.includes(i) || !player.alive) return;
  wst.last = wst.cur; wst.cur = i; wst.switchT = WEAPONS[i].swap; wst.reloading = false; wst.reloadT = 0; wst.consec = 0;
  vmModels.forEach((m, k) => { m.g.visible = k === i; m.flash.visible = false; });
  sfx.play('switch');
}
function startReload() {
  const w = WEAPONS[wst.cur], s = inv[wst.cur];
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
  let s = (w.spread + wst.bloom) * lerp(1, w.ads, wst.ads);
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
  let anyHit = false, killed = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * Math.tan(spread);
    _d.copy(_f).addScaledVector(_r, Math.cos(a) * rr).addScaledVector(_u, Math.sin(a) * rr).normalize();
    let origin = _o.clone(), ignore = null, pierce = w.pierce ? 2 : 1, dmgMul = 1, travelled = 0;
    while (pierce-- > 0) {
      const hit = raycast(origin, _d, 300, true, ignore);
      _hp.copy(origin).addScaledVector(_d, hit.t);
      const dist = travelled + hit.t;
      if (i < 3 || n === 1) spawnTracer(i === 0 ? muzzleW : origin, _hp, 0xffe2a0, 360, 0.02);
      if (hit.enemy) {
        const [r0, r1, rmin] = w.range; const fall = dist <= r0 ? 1 : dist >= r1 ? rmin : lerp(1, rmin, (dist - r0) / (r1 - r0));
        const dmg = w.dmg * fall * (hit.head ? w.head * cls().headMul : 1) * dmgMul;
        const k = hit.enemy.damage(dmg, hit.head, { x: _d.x * (n > 1 ? 1.2 : 2), z: _d.z * (n > 1 ? 1.2 : 2) });
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
  // recoil
  const climb = 1 + Math.min(wst.consec, 10) * 0.05;
  const kk = w.kick * climb * lerp(1, 0.75, wst.ads) * (player.crouch > 0.5 ? 0.8 : 1);
  recoil.p += kk * 0.7; player.pitch = clamp(player.pitch + kk * 0.3, -1.5, 1.5);
  recoil.y += rand(-1, 1) * w.kickYaw; vm.kick = Math.min(vm.kick + (w.id === 'shotgun' || w.id === 'dmr' ? 1 : 0.55), 1.4);
  wst.bloom = Math.min(w.maxBloom, wst.bloom + w.bloom);
  wst.fireCD += 60 / w.rpm;
  if (w.id === 'shotgun') { wst.pumpT = 0.45; setTimeout(() => sfx.play('pump', { vol: 0.8 }), 280); }
  const m = vmModels[wst.cur]; m.flash.visible = true; m.flash.material.rotation = Math.random() * 6; const fs = w.id === 'shotgun' || w.id === 'revolver' ? 0.32 : w.id === 'pistol' || w.id === 'smg' ? 0.18 : 0.24; m.flash.scale.set(fs, fs, fs);
  vm.flashT = 0.045; muzzleLight.position.copy(muzzleW); muzzleLight.intensity = 25;
  sfx.play(w.snd);
  // gunfire alerts nearby enemies
  for (const e of enemies) if (!e.dead && !e.canSee && e.pos.distanceToSquared(player.pos) < 40 * 40) { e.lastKnown.set(player.pos.x + rand(-2, 2), 0, player.pos.z + rand(-2, 2)); e.lostT = 0; e.repathT = Math.min(e.repathT, 0.2); }
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
  const adsWanted = mouseR && !player.sprinting && wst.switchT <= 0 && !(wst.reloading && !w.shell) && player.alive;
  wst.ads = damp(wst.ads, adsWanted ? 1 : 0, w.adsSpeed * 1.4, dt);
  if (wst.ads < 0.01 && !adsWanted) wst.ads = 0;
  if (mouseL && player.alive && wst.switchT <= 0 && player.sprintLock <= 0) {
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
  mesh.position.copy(pos); fx.add(mesh); grenades.push({ pos, vel, mesh, t: 2.0 });
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
    if (g.t <= 0) { fx.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); grenades.splice(i, 1); explosion(g.pos.clone(), 6.5, 160); }
  }
}
function explosion(p, radius, dmg) {
  spawnBoom(p, radius * 0.75);
  sparks.burst(p.x, p.y, p.z, 50, 12, 1, 0.6, 0.2, 0.7, 0.6);
  debris.burst(p.x, p.y, p.z, 24, 6, 0.15, 0.13, 0.12, 1.4, 0.2, 0, 0.5, 0);
  const s = spatial(p); sfx.play('explode', { vol: Math.max(0.3, s.vol * 1.5), pan: s.pan });
  const dp = Math.hypot(p.x - player.pos.x, p.y - player.pos.y - 1, p.z - player.pos.z);
  game.shake = Math.min(1.2, game.shake + clamp(1 - dp / 30, 0, 1) * 0.8);
  for (const e of enemies) {
    if (e.dead) continue;
    const cx = e.pos.x, cy = e.pos.y + e.h * 0.5, cz = e.pos.z, d = Math.hypot(cx - p.x, cy - p.y, cz - p.z);
    if (d < radius) {
      let f = 1 - d / radius; if (!los(p.x, p.y + 0.2, p.z, cx, cy, cz)) f *= 0.35;
      const dir = { x: (cx - p.x) / (d || 1) * 9 * f, z: (cz - p.z) / (d || 1) * 9 * f };
      if (!e.damage(dmg * f, false, dir) && f > 0) hitMarker(false, false);
    }
  }
  if (player.alive && dp < radius) {
    let f = 1 - dp / radius; const ph = playerHead(new V3()); if (!los(p.x, p.y + 0.2, p.z, ph.x, ph.y - 0.6, ph.z)) f *= 0.35;
    damagePlayer(dmg * f * 0.45, p);
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
  const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  let wx = -sy * fwd + cy * str, wz = -cy * fwd - sy * str; const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
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
  let max = P.crouch > 0.5 ? 3.0 : P.sprinting ? 8.6 : 5.8;
  max *= lerp(1, 0.62, wst.ads) * cls().speed * (P.stimT > 0 ? 1.3 : 1);
  if (P.onGround) {
    const f = P.sliding ? 0.8 : 7.5;
    if (speed > 0) { const drop = (P.sliding ? speed : Math.max(speed, 2.5)) * f * dt; const ns = Math.max(speed - drop, 0) / speed; P.vel.x *= ns; P.vel.z *= ns; }
    if (!P.sliding && wl > 0) accelerate(wx, wz, max, 11, max, dt);
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
  if (P.onGround && !P.sliding && speed > 2) { P.stepAcc += speed * dt; if (P.stepAcc > (P.sprinting ? 2.7 : 2.1)) { P.stepAcc = 0; sfx.play('step', { vol: P.crouch > 0.5 ? 0.3 : P.sprinting ? 0.9 : 0.6 }); } }
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
  camera.rotation.set(clamp(P.pitch + recoil.p + rand(-sh, sh) + breatheY, -1.55, 1.55), P.yaw + recoil.y + rand(-sh, sh) + breathe, P.tilt);
  const zoom = lerp(1, w.zoom, wst.ads);
  const base = settings.fov + (P.sprinting ? 6 : 0) + (P.sliding ? 8 : 0);
  const fovT = 2 * Math.atan(Math.tan(base * Math.PI / 360) / zoom) * 180 / Math.PI;
  camera.fov = damp(camera.fov, fovT, 14, dt); camera.updateProjectionMatrix();
  sky.position.copy(camera.position); if (stars) stars.position.copy(camera.position);
  // viewmodel
  const hip = w.hip, ap = w.adsPos, a = wst.ads;
  vm.swayX = damp(vm.swayX, clamp(-mdx * 0.0004, -0.05, 0.05), 10, dt); vm.swayY = damp(vm.swayY, clamp(mdy * 0.0004, -0.05, 0.05), 10, dt); mdx = mdy = 0;
  vm.kick = damp(vm.kick, 0, 14, dt);
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
  vmRoot.position.set(x, y, z); vmRoot.rotation.set(rx, ry, rz);
  const m = vmModels[wst.cur];
  if (m.pump) { wst.pumpT = Math.max(0, wst.pumpT - dt); const k = wst.pumpT > 0 ? Math.sin((1 - wst.pumpT / 0.45) * Math.PI) : 0; m.pump.position.z = -0.38 + k * 0.1; }
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
  for (const e of enemies) {
    if (e.dead) continue; const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz);
    if (game.time - e.lastFired < 2 || d < 12 || e.aimT > 0 || player.pulseT > 0) { g.fillStyle = e.T.sniper ? '#ff3030' : '#ff5a4a'; g.beginPath(); g.arc(dx * R, dz * R, e.T.scale > 1.1 ? 4.5 : 3.2, 0, 7); g.fill(); }
  }
  g.restore();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(S / 2, S / 2 - 7); g.lineTo(S / 2 + 5, S / 2 + 5); g.lineTo(S / 2, S / 2 + 2); g.lineTo(S / 2 - 5, S / 2 + 5); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(S / 2, S / 2, 12 * R, 0, 7); g.stroke();
}
let fpsAcc = 0, fpsN = 0;
function updateHUD(dt) {
  const w = WEAPONS[wst.cur], s = inv[wst.cur];
  setText('wave', String(game.wave || '–'));
  const alive = enemies.filter(e => !e.dead).length;
  if (game.phase === 'inter') { setText('leftl', 'NEXT WAVE'); setText('left', Math.ceil(Math.max(0, game.interT)) + 's'); }
  else { setText('leftl', 'HOSTILES'); setText('left', String(alive + game.queue.length)); }
  setText('score', String(game.score));
  setText('hpn', String(Math.ceil(player.hp))); setText('regen', String(player.regenCap));
  const hpf = $('hpfill'); const hpw = (player.hp / player.maxHp * 100) + '%';
  $('shfill').style.width = (player.shield / 60 * 100) + '%';
  const C = cls(); setText('abn', C.ability); setText('abk', player.abilityCD > 0 ? Math.ceil(player.abilityCD) + 's' : 'READY · E');
  $('abfill').style.width = ((1 - player.abilityCD / C.cd) * 100) + '%'; $('abil').classList.toggle('ready', player.abilityCD <= 0); if (hpf.style.width !== hpw) { hpf.style.width = hpw; hpf.style.background = player.hp < 35 ? 'linear-gradient(90deg,#ff3b3b,#ff8a6b)' : 'linear-gradient(90deg,#3ddc84,#9cf5c1)'; }
  setText('wname', w.name + (wst.reloading ? ' · RELOADING' : ''));
  setText('mag', `${s.mag} <span>/ ${isFinite(s.res) ? s.res : '∞'}</span>`);
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
  const op = (1 - wst.ads * 1.6) * (player.sprinting ? 0.3 : 1);
  xh.style.opacity = Math.max(0, op);
  if (hudCache.gap !== (gap | 0)) { hudCache.gap = gap | 0; const c = xh.children; c[0].style.top = (-gap - 9) + 'px'; c[1].style.top = gap + 'px'; c[2].style.left = (-gap - 9) + 'px'; c[3].style.left = gap + 'px'; }
  $('dot').style.opacity = !w.scope && wst.ads > 0.7 ? 1 : 0;
  $('scope').style.opacity = w.scope && wst.ads > 0.92 ? 1 : 0;
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
function showScreen(id) { for (const s of ['menu', 'pause', 'over', 'armory']) $(s).classList.toggle('on', s === id); $('hud').classList.toggle('on', id === null || id === 'pause'); }
function startGame() {
  sfx.init(); resize();
  if (!world || world.def !== MAPS[settings.map] || world.shadows !== QUALITY[settings.quality].shadows) { loadMap(settings.map); world.shadows = QUALITY[settings.quality].shadows; }
  resetRun(); game.state = 'play'; showScreen(null); camera.fov = settings.fov; requestLock();
}
function pauseGame() { if (game.state !== 'play') return; game.state = 'paused'; showScreen('pause'); mouseL = mouseR = false; }
function resumeGame() { game.state = 'play'; showScreen(null); requestLock(); }
function renderSlots() { $('slots').innerHTML = carry.map((wi, k) => `<div data-w="${wi}">${k + 1} ${WEAPONS[wi].short}</div>`).join(''); }
function renderInventory() {
  $('invlist').innerHTML = carry.map((wi, k) => { const w = WEAPONS[wi], s = inv[wi];
    return `<div class="invrow${wi === wst.cur ? ' on' : ''}"><kbd>${k + 1}</kbd><div><b>${w.name}</b><small>${k ? 'SECONDARY' : 'PRIMARY'} · ${w.desc}</small></div><span>${s.mag} / ${isFinite(s.res) ? s.res : '∞'}</span></div>`; }).join('')
    + `<div class="invrow"><kbd>E</kbd><div><b>${cls().name} · ${cls().ability}</b><small>${cls().abDesc} · ${cls().passive}</small></div><span>${player.abilityCD > 0 ? Math.ceil(player.abilityCD) + 's' : 'READY'}</span></div>`
    + `<div class="invrow"><kbd>G</kbd><div><b>FRAG GRENADE</b><small>2s fuse · bounces · damages you too</small></div><span>${player.grenades} / ${cls().nadeMax}</span></div>`;
}
function statBars(w) {
  const rows = [['DAMAGE', w.dmg * (w.pellets || 1) / 110], ['FIRE RATE', w.rpm / 900], ['RANGE', w.range[1] / 140], ['CONTROL', 1 - clamp(w.kick / 0.06, 0, 0.9)], ['HANDLING', 1 - (w.swap - 0.22) / 0.3]];
  return rows.map(([n, v]) => `<div class="bar"><small>${n}</small><i><u style="width:${Math.round(clamp(v, 0.06, 1) * 100)}%"></u></i></div>`).join('');
}
function renderLoadout(el, onChange) {
  el.innerHTML = '';
  for (const slot of ['primary', 'secondary']) {
    const h = document.createElement('div'); h.className = 'lslot'; h.textContent = slot === 'primary' ? 'PRIMARY  [1]' : 'SECONDARY  [2]'; el.appendChild(h);
    const row = document.createElement('div'); row.className = 'wcards';
    for (const w of WEAPONS.filter(w => w.slot === slot)) {
      const b = document.createElement('button'); b.className = 'wcard' + (settings[slot] === w.id ? ' on' : '');
      b.innerHTML = `<b>${w.name}</b><span>${w.desc}</span>${statBars(w)}<em>${w.mag} rounds · ${w.auto && !w.shell ? 'full-auto' : w.shell ? 'pump' : 'semi-auto'} · headshot ×${w.head}</em>`;
      b.onclick = () => { settings[slot] = w.id; saveSettings(); renderLoadout(el, onChange); onChange && onChange(); };
      row.appendChild(b);
    }
    el.appendChild(row);
  }
}
function applyLoadoutMidRun() {
  const nc = loadoutIdx();
  nc.forEach(i => { if (!carry.includes(i)) inv[i] = { mag: WEAPONS[i].mag, res: WEAPONS[i].res }; });
  carry = nc; wst.cur = carry[0]; wst.last = carry[1]; wst.reloading = false; wst.switchT = WEAPONS[carry[0]].swap;
  vmModels.forEach((m, i) => { m.g.visible = i === wst.cur; m.flash.visible = false; }); renderSlots(); hudCache = {};
}
function openArmory() {
  if (game.state !== 'play' || game.phase !== 'inter' || !player.alive) { if (game.state === 'play') showHint('ARMORY OPENS BETWEEN WAVES', '#ff6b5a'); return; }
  game.state = 'armory'; mouseL = mouseR = false; for (const k in keys) keys[k] = false;
  if (document.pointerLockElement) document.exitPointerLock();
  renderLoadout($('armlist'), applyLoadoutMidRun); showScreen('armory');
}
function toMenu() { game.state = 'menu'; showScreen('menu'); if (document.pointerLockElement) document.exitPointerLock(); renderBest(); }
function die() {
  player.alive = false; game.state = 'dying'; game.dieT = 1.6; mouseL = mouseR = false; wst.reloading = false;
  showMsg('YOU DIED', '', 1.5);
}
function finishDeath() {
  game.state = 'over'; if (document.pointerLockElement) document.exitPointerLock();
  $('overmap').textContent = world.def.name + ' · ' + { easy: 'RECRUIT', normal: 'VETERAN', hard: 'ELITE' }[settings.difficulty];
  $('s_score').textContent = game.score; $('s_wave').textContent = game.wave; $('s_kills').textContent = game.kills; $('s_hs').textContent = game.heads;
  $('s_acc').textContent = (game.shots ? Math.round(game.hits / game.shots * 100) : 0) + '%';
  const t = Math.floor(game.runTime); $('s_time').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  const key = 'bp_best_' + settings.map + '_' + settings.difficulty; let best = 0; try { best = +localStorage.getItem(key) || 0; } catch (e) {}
  if (game.score > best) { try { localStorage.setItem(key, game.score); } catch (e) {} $('newbest').textContent = 'NEW BEST SCORE'; } else $('newbest').textContent = 'BEST: ' + best;
  showScreen('over');
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
  const tA = performance.now();
  if (game.state === 'play' || game.state === 'dying') {
    game.time += dt; if (game.state === 'play') game.runTime += dt;
    const steps = Math.ceil(dt / 0.0167), sdt = dt / steps;
    for (let i = 0; i < steps; i++) updatePlayer(sdt);
    player.gcd -= dt; player.lastDmgT += dt;
    if (player.alive && player.lastDmgT > 4.5 && player.hp < player.regenCap) player.hp = Math.min(player.regenCap, player.hp + cls().regen * dt);
    player.abilityCD = Math.max(0, player.abilityCD - dt); player.stimT -= dt; player.pulseT -= dt;
    if (player.shieldT > 0) { player.shieldT -= dt; if (player.shieldT <= 0) player.shield = 0; }
    if (player.alive) updateWeapon(dt);
    updateWaves(dt);
    enemies = enemies.filter(e => e.update(dt));
    barrels.forEach(b => b.update(dt));
    pickups = pickups.filter(p => p.update(dt, game.time));
    updateGrenades(dt);
    updateCamera(dt);
    if (game.state === 'dying') {
      game.dieT -= dt; camera.position.y -= (1 - game.dieT / 1.6) * 1.1; camera.rotation.z = (1 - game.dieT / 1.6) * 0.5;
      if (game.dieT <= 0) finishDeath();
    }
    updateHUD(dt);
  } else if (game.state === 'menu' && world) {
    menuT += dt * 0.05; const [x0, z0, x1, z1] = world.L.bounds, r = Math.max(x1 - x0, z1 - z0) * 0.42;
    camera.position.set(Math.sin(menuT) * r, 9, Math.cos(menuT) * r); camera.fov = 70; camera.updateProjectionMatrix();
    camera.lookAt(0, 1.5, 0); sky.position.copy(camera.position); if (stars) stars.position.copy(camera.position);
    barrels.forEach(b => b.update(dt)); pickups.forEach(p => p.inner.rotation.y += dt);
  }
  if (game.state !== 'paused' && game.state !== 'over' && game.state !== 'armory') { sparks.update(dt); debris.update(dt); updateTracers(dt); updateBooms(dt); }
  const tB = performance.now();
  renderer.clear();
  renderer.render(scene, camera);
  prof.js += tB - tA; prof.n++;
  if (game.state === 'play' || game.state === 'paused' || game.state === 'dying' || game.state === 'armory') { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
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
    b.onclick = () => { settings.map = i; saveSettings(); [...maps.children].forEach((c, k) => c.classList.toggle('on', k === i)); loadMap(i); world.shadows = QUALITY[settings.quality].shadows; renderBest(); };
    maps.appendChild(b);
  });
  const diff = $('diff');
  const setD = () => [...diff.children].forEach(c => c.classList.toggle('on', c.dataset.v === settings.difficulty));
  diff.onclick = e => { if (e.target.dataset.v) { settings.difficulty = e.target.dataset.v; saveSettings(); setD(); renderBest(); } }; setD();
  const bind = (id, key, fmt, cb) => { const el = $(id); el.value = settings[key]; const upd = () => { settings[key] = el.type === 'range' ? +el.value : el.value; if ($(id + 'v')) $(id + 'v').textContent = fmt(settings[key]); saveSettings(); cb && cb(); }; el.oninput = upd; el.onchange = upd; if ($(id + 'v')) $(id + 'v').textContent = fmt(settings[key]); };
  bind('sens', 'sens', v => v.toFixed(2)); bind('fov', 'fov', v => v + '°');
  $('vol').value = settings.volume; $('volv').textContent = Math.round(settings.volume * 100) + '%';
  $('vol').oninput = () => { settings.volume = +$('vol').value; $('volv').textContent = Math.round(settings.volume * 100) + '%'; sfx.setVol(settings.volume); saveSettings(); };
  $('quality').value = settings.quality;
  $('quality').onchange = () => { settings.quality = $('quality').value; saveSettings(); resize(); loadMap(settings.map); world.shadows = QUALITY[settings.quality].shadows; };
  $('play').onclick = startGame;
  renderLoadout($('loadout'));
  const cl = $('classes');
  const renderClasses = () => { cl.innerHTML = ''; for (const k in CLASSES) { const C = CLASSES[k]; const b = document.createElement('button'); b.className = 'wcard' + (settings.cls === k ? ' on' : '');
    b.innerHTML = `<b>${C.name}</b><span>${C.desc}</span><em>${C.hp} HP · ${C.passive}</em><em class="ab">[E] ${C.ability}: ${C.abDesc} · ${C.cd}s</em>`;
    b.onclick = () => { settings.cls = k; saveSettings(); renderClasses(); }; cl.appendChild(b); } };
  renderClasses();
  $('armback').onclick = resumeGame;
  $('resume').onclick = resumeGame;
  $('restart').onclick = () => { resetRun(); resumeGame(); };
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
WEAPONS.forEach(w => vmModels.push(makeGun(w)));
resize(); loadMap(settings.map); world.shadows = QUALITY[settings.quality].shadows;
initUI();
requestAnimationFrame(frame);
window.__bp = { prof, renderer, game, player, enemies: () => enemies, startGame, settings, wst, inv: () => inv, keys, world: () => world, setMouse: (l, r) => { mouseL = l; mouseR = r; } };
})();
