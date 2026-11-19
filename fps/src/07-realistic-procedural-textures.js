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
  asphalt: () => pixCanvas(512, (x, y, o) => { // worn tarmac with aggregate, patches and cracks
    const n = fbm(NZ, x, y, 512, 4, 5), m = fbm(NZ2, x, y, 512, 2, 4), g = NZ(x * 1.3, y * 1.3, 733), crack = Math.abs(fbm(NZ2, x, y, 512, 6, 3) - 0.5) < 0.006 ? 0.55 : 1;
    let v = (58 + n * 34 + (g > 0.8 ? 26 : 0)) * (m > 0.62 ? 0.82 : 1) * crack; o[0] = v; o[1] = v * 0.99; o[2] = v * 0.96;
  }),
  concrete: () => pixCanvas(512, (x, y, o) => { // cast concrete: blotches, rain streaks, form-panel seams and tie holes
    const n = fbm(NZ, x, y, 512, 4, 5), st = fbm(NZ2, x, y, 512, 8, 3, 1, 8), fine = NZ(x * 1.1, y * 1.1, 311);
    let v = 150 + n * 50 + fine * 14 - Math.max(0, st - 0.55) * 120; if (x % 256 < 2 || y % 128 < 2) v *= 0.72; const hx = (x % 128) - 64, hy = (y % 128) - 64; if (hx * hx + hy * hy < 9) v *= 0.55;
    o[0] = v * 0.98; o[1] = v * 0.97; o[2] = v * 0.94;
  }),
  hesco: () => pixCanvas(256, (x, y, o) => { // HESCO bastion: sand-filled geotextile behind welded wire mesh
    const n = fbm(NZ, x, y, 256, 6, 4), w = ((x >> 1) + (y >> 1)) % 2 ? 0.92 : 1.04, wire = (x % 32 < 2 || y % 32 < 2) ? 0.45 : 1, seam = x % 128 < 3 ? 0.7 : 1, sag = 1 - Math.max(0, fbm(NZ2, x, y, 256, 2, 3) - 0.6) * 0.8;
    const v = (165 + n * 55) * w * wire * seam * sag; o[0] = v * 0.98; o[1] = v * 0.88; o[2] = v * 0.68;
  }),
  dirtroad: () => TEXF.concrete(),
  burlap: () => pixCanvas(128, (x, y, o) => { const w = ((x >> 1) + (y >> 1)) % 2 ? 0.88 : 1.06, n = fbm(NZ, x, y, 128, 8, 3), v = (150 + n * 60) * w; o[0] = v; o[1] = v * 0.88; o[2] = v * 0.66; }),
  camo: () => pixCanvas(256, (x, y, o) => { // multi-tone camouflage fabric with weave
    const a = fbm(NZ, x, y, 256, 3, 4), b = fbm(NZ2, x, y, 256, 4, 3), weave = ((x + y) % 4 < 2 ? 0.96 : 1.04) * (0.94 + NZ(x * 1.7, y * 1.7, 977) * 0.12);
    let c = a > 0.58 ? [0.62, 0.55, 0.42] : b > 0.6 ? [0.42, 0.44, 0.34] : a < 0.38 ? [0.86, 0.8, 0.66] : [0.74, 0.68, 0.54]; if (b < 0.3 && a > 0.45) c = [0.3, 0.27, 0.22];
    o[0] = c[0] * 255 * weave; o[1] = c[1] * 255 * weave; o[2] = c[2] * 255 * weave;
  }),
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
  puff: () => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    for (let i = 0; i < 7; i++) { const x = 20 + Math.random() * 24, y = 20 + Math.random() * 24, r = 12 + Math.random() * 14, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
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
  const c = f(); const noRepeat = name === 'grassBlade' || name === 'cloud' || name === 'puff';
  return (TEXC[name] = canvasTex(c, !noRepeat));
}
// tangent-space normal map derived from a texture's luminance (High/Ultra): gives bricks, stones and planks real relief
const NRMC = {};
function getNormal(name, strength = 2.2) {
  const key = name + strength; if (NRMC[key] !== undefined) return NRMC[key];
  const t = getTex(name), img = t && t.image; if (!img || !img.width || !img.getContext) return (NRMC[key] = null);
  const w = img.width, h = img.height, src = img.getContext('2d').getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), out = g.createImageData(w, h), d = out.data;
  const at = (x, y) => L[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) * strength;
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4; d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  g.putImageData(out, 0, 0); const nt = new THREE.CanvasTexture(c); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.anisotropy = maxAniso; nt.colorSpace = THREE.NoColorSpace;
  return (NRMC[key] = nt);
}
// ---- photographed CC0 surfaces (Poly Haven) on Medium and above: [file id, metres per tile, tint]
const PHOTO = {
  wallP1: ['peeling_painted_wall', 3], wallP2: ['painted_plaster_wall', 3], wallP3: ['blue_plaster_weathered', 3], shutter: ['painted_metal_shutter', 2.5],
  plasterA: ['damaged_plaster', 3.2, 0xfff4e4], plasterB: ['clay_plaster', 3, 0xffffff], brickW: ['brick_wall_001', 1.8], concrete: ['chipped_concrete', 3.2], pavement: ['concrete_tiles', 2.4],
  planks: ['brown_planks_03', 2], sandstone: ['large_sandstone_blocks', 3], castle: ['stone_wall', 3], stone: ['stone_wall', 2.2], stonewall: ['old_stone_wall', 2], hutwall: ['old_stone_wall', 2],
  tiles: ['clay_roof_tiles', 2.2], container: ['corrugated_iron', 2.6], metalwall: ['rusty_corrugated_iron', 3], hull: ['rusty_corrugated_iron', 6, 0xb08070], grate: ['metal_grate_rusty', 1.2],
  metal: ['metal_plate', 1.5, 0x9a9a9a], cliff: ['cliff_side', 6], rock: ['cliff_side', 2.5], roof: ['chipped_concrete', 3, 0xbbbbbb], floor: ['chipped_concrete', 3],
};
const GROUNDPHOTO = { dirtroad: ['stony_dirt_path', 4], asphalt: ['asphalt_02', 5], cobble: ['cobblestone_floor_01', 3], sand: ['dry_ground_01', 5, 0xfff0dc], grassMud: ['sparse_grass', 4] };
const PHC = {}, phLoader = new THREE.TextureLoader();
function photoTex(id, kind) {
  const k = id + kind; if (PHC[k]) return PHC[k];
  const t = phLoader.load('tex/' + id + '_' + kind + '.jpg', undefined, undefined, () => console.warn('texture failed', id));
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; t.colorSpace = kind === 'diff' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return (PHC[k] = t);
}
const USE_PHOTO = GFX !== 'low' && !/nophoto/.test(location.search);
// material definitions shared by level boxes and props: t=texture, s=world metres per tile, c=tint, e=emissive colour
const MATDEF = {
  cliff: { t: 'cliff', s: 6 }, castle: { t: 'castle', s: 3 }, stone: { t: 'castle', c: 0xd8d2c4, s: 2 }, stonewall: { t: 'brick', c: 0xb8b0a0, s: 2 },
  planks: { t: 'planks', s: 2 }, crate: { t: 'wood', local: true }, bark: { t: 'bark', s: 2 }, logwall: { t: 'bark', s: 1.2 }, hutwall: { t: 'brick', c: 0xa88a68, s: 2 },
  tudor: { t: 'tudor', s: 3 }, tudor2: { t: 'tudor', c: 0xf2dcc0, s: 3 }, roof: { t: 'castle', c: 0x8f8476, s: 3 }, hay: { t: 'hay', s: 1.2 }, cloth: { t: 'stripes', s: 1.3 },
  rope: { c: 0x8a7350 }, thatch: { t: 'thatch', s: 2 }, tiles: { t: 'rooftiles', s: 2 }, slate: { t: 'rooftiles', c: 0x6a7a9a, s: 2 }, flag: { t: 'flagstone', s: 4 },
  pad: { e: 0x6dff9a }, rune: { e: 0x6fd8ff }, skylight: { e: 0xdfe8f0 }, glass: { e: 0xffc870 }, lampglow: { e: 0xffd890 }, dark: { c: 0x1a1714 },
  leaf: { t: 'leaves', vc: true }, rock: { t: 'cliff', s: 2 }, mushcap: { t: 'mushcap' }, stem: { c: 0xe8dcc0 }, reed: { c: 0x8a9a5a }, metal: { c: 0x3a3a40, mt: 0.7, r: 0.45 },
  wood: { t: 'planks', s: 1 }, banner: { t: 'stripes' }, staves: { t: 'staves' }, mountain: { c: 0xffffff, fogless: true }, snow: { c: 0xf4f6fa, fogless: true },
  gold: { c: 0xc9a227, mt: 1, r: 0.35 },
  brickW: { t: 'brick', c: 0xc49a84, s: 2.4 }, concrete: { t: 'concrete', s: 4, r: 0.92 }, pavement: { t: 'concrete', c: 0xc8c4bc, s: 2, r: 0.95 }, carpaint: { c: 0xffffff, mt: 0.55, r: 0.4, env: 1 },
  sandbag: { t: 'burlap', c: 0xc8b894, s: 1 }, container: { t: 'corrugated', s: 2.6, mt: 0.35, r: 0.55 }, metalwall: { t: 'corrugated', c: 0xd4d8dc, s: 3, mt: 0.12, r: 0.65 },
  grate: { t: 'corrugated', c: 0x46484c, s: 0.8, mt: 0.6, r: 0.5 }, hesco: { t: 'hesco', s: 2.2, r: 0.95 }, canvas: { t: 'burlap', c: 0x8a8664 }, hull: { t: 'corrugated', c: 0x7a2a22, s: 6, mt: 0.3, r: 0.6 },
  crane: { c: 0xd8a020, mt: 0.4, r: 0.5 }, wallP1: { t: 'plaster', s: 3 }, wallP2: { t: 'plaster', c: 0xf0e4d0, s: 3 }, wallP3: { t: 'plaster', c: 0xc8d8e8, s: 3 }, shutter: { t: 'corrugated', c: 0x9aa0a6, s: 2, mt: 0.3, r: 0.6 },
  acunit: { c: 0xd0d0c8, mt: 0.3, r: 0.5 }, sign: { c: 0xffffff, r: 0.6 }, poster: { c: 0xffffff, r: 0.95 }, fuel: { c: 0xc8c8c0, mt: 0.3, r: 0.45 }, forklift: { c: 0xe0a020, mt: 0.2, r: 0.5 }, tire: { c: 0x161616, r: 0.95 }, carglass: { c: 0x1c242c, mt: 0.3, r: 0.12, env: 1.4 }, burnt: { c: 0x2a2725, r: 0.95 }, red: { c: 0x9a2a2a }, white: { c: 0xf0ece4 },
  plasterA: { t: 'plaster', c: 0xecd6b0, s: 3, nrm: 0.4 }, plasterB: { t: 'plaster', c: 0xdcb88e, s: 3, nrm: 0.4 }, sandstone: { t: 'castle', c: 0xdcc49a, s: 3 }, palmleaf: { t: 'leaves', vc: true },
};
// ground-contact grime on vertical surfaces: dirt and damp near the ground, the way real walls weather
function addGrime(mat) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = 'varying vec3 vGW; varying vec3 vGN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGW = (modelMatrix * vec4(position, 1.0)).xyz; vGN = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = 'varying vec3 vGW; varying vec3 vGN;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat gH = smoothstep(0.0, 1.6, vGW.y) * 0.75 + 0.25 * smoothstep(0.0, 0.25, vGW.y); float gV = 1.0 - abs(vGN.y);\ndiffuseColor.rgb *= mix(1.0, mix(0.55, 1.0, gH), gV * 0.8);');
  };
  mat.customProgramCacheKey = () => 'grime';
}
function matFor(key, theme) {
  const def = Object.assign({}, MATDEF[key] || {}, (theme.mats || {})[key] || {});
  const ph = USE_PHOTO && (def.photo || PHOTO[key]);
  if (ph && def.e === undefined && !def.local) { // photo material: real albedo + normal map, world-scaled UVs
    def.s = ph[1]; const mat = MAT({ map: photoTex(ph[0], 'diff'), normalMap: photoTex(ph[0], 'nor'), color: ph[2] !== undefined ? ph[2] : 0xffffff, vertexColors: true, fog: !def.fogless, roughness: def.r !== undefined ? def.r : 0.9, metalness: def.mt || 0, envMapIntensity: def.env !== undefined ? def.env : 0.6 });
    if (mat.normalScale) mat.normalScale.set(1, 1);
    if (def.e === undefined && def.grime !== 0 && key !== 'ground_') addGrime(mat);
    return { def, mat };
  }
  if (def.e !== undefined) return { def, mat: new THREE.MeshBasicMaterial({ color: def.e, vertexColors: true }) };
  const map = def.t ? getTex(def.t) : null;
  const nrm = HQ && map && def.t !== 'leaves' && def.t !== 'mushcap' && def.nrm !== 0 ? getNormal(def.t) : null, ns = def.nrm !== undefined ? def.nrm : def.bump === 0 ? 0.55 : 1;
  const mat = MAT({ map, color: def.c !== undefined ? def.c : 0xffffff, vertexColors: true, fog: !def.fogless, roughness: def.r !== undefined ? def.r : 0.88, metalness: def.mt || 0, normalMap: nrm, envMapIntensity: def.env !== undefined ? def.env : 0.7 });
  if (nrm) mat.normalScale.set(ns, -ns);
  if (GFX !== 'low' && def.e === undefined && def.grime !== 0 && def.t && def.t !== 'leaves' && !def.fogless && key !== 'ground_') addGrime(mat);
  if (!HQ && map && def.t !== 'leaves' && def.t !== 'mushcap' && settings.quality !== 'low' && def.bump !== 0) { mat.bumpMap = map; mat.bumpScale = def.bump !== undefined ? def.bump : 2.2; }
  return { def, mat };
}

