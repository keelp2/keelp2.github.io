// ============================================================ NAV GRID (A*)
// ============================================================ LAYERED NAVIGATION (multi-floor: stairs, walkways, rooftops)
const DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1];
// ---------------------------------------------------------------- TERRAIN: rolling hills in open ground, eased flat around buildings
let TERR = null;
function TH(x, z) { const T = TERR; if (!T) return 0; const fx = (x - T.x0) / T.cs, fz = (z - T.z0) / T.cs; if (!(fx >= 0 && fz >= 0 && fx < T.nx - 1 && fz < T.nz - 1)) return 0;
  const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, H = T.h, n = T.nx, k = j * n + i; return (H[k] * (1 - u) + H[k + 1] * u) * (1 - v) + (H[k + n] * (1 - u) + H[k + n + 1] * u) * v; }
function terrRay(ox, oy, oz, dx, dy, dz, maxT) { // first t where the ray dips under the hills (or -1)
  const T = TERR; if (!T) return -1; const top = T.max + 0.02; let t0 = 0, t1 = maxT;
  if (oy > top) { if (dy >= -1e-4) return -1; t0 = (top - oy) / dy; if (t0 > maxT) return -1; } else if (dy > 1e-4) t1 = Math.min(maxT, (top - oy) / dy);
  const st = 0.45; let pt = t0;
  for (let t = t0; t <= t1 + st; t += st) { const tt = Math.min(t, t1), x = ox + dx * tt, z = oz + dz * tt, y = oy + dy * tt;
    if (y < TH(x, z) - 0.01) { let a = pt, b = tt; for (let q = 0; q < 6; q++) { const m = (a + b) / 2; if (oy + dy * m < TH(ox + dx * m, oz + dz * m)) b = m; else a = m; } return b; }
    pt = tt; if (tt >= t1) break; }
  return -1; }
// ---- edges: no more giant flat boundary walls. Rural/desert maps rise into a natural berm (the wall turns invisible at the ridge);
// town maps get real building facades on the inside of their boundary.
// Cover pass (every map): Meridian-standard rule "cover within a short sprint everywhere" + protected spawns.
// Finds open ground with no cover within ~7.5 m and fills it with small, map-themed cover clusters; puts a
// head-high screen between each team spawn and the map so nobody can be shot the moment they spawn.
// Deterministic (seeded by map name) so every online client builds the identical map.
function coverPass(L, name) {
  const R = seeded(hashStr((name || 'map') + ':cover')), [bx0, bz0, bx1, bz1] = L.bounds, cs = 1, nx = Math.ceil((bx1 - bx0) / cs) + 1, nz = Math.ceil((bz1 - bz0) / cs) + 1, N = nx * nz;
  const occ = new Uint8Array(N), d = new Float32Array(N), keep = new Uint8Array(N), idx = (x, z) => { const i = Math.round((x - bx0) / cs), j = Math.round((z - bz0) / cs); return i < 0 || j < 0 || i >= nx || j >= nz ? -1 : j * nx + i; };
  const mark = (x0, z0, x1, z1, arr) => { for (let j = Math.max(0, Math.floor((z0 - bz0) / cs)); j <= Math.min(nz - 1, Math.ceil((z1 - bz0) / cs)); j++) for (let i = Math.max(0, Math.floor((x0 - bx0) / cs)); i <= Math.min(nx - 1, Math.ceil((x1 - bx0) / cs)); i++) arr[j * nx + i] = 1; };
  for (const b of L.boxes) { if (b.y1 <= 0.5 || b.y0 > 2.4) continue; mark(b.x0, b.z0, b.x1, b.z1, occ); }
  for (const p of L.props) if (p.k === 'tree' || p.k === 'pine' || p.k === 'palm' || p.k === 'rock' && (p.s || 1) > 1.1) mark(p.x - 0.5, p.z - 0.5, p.x + 0.5, p.z + 0.5, occ);
  for (const [a, b, c, e] of L.water || []) mark(a - 2, b - 2, c + 2, e + 2, keep);
  for (const [a, b, c, e] of L.keepOpen || []) mark(a, b, c, e, keep);
  const pts = [].concat(L.enemySpawns || [], L.teamSpawns ? L.teamSpawns[0].concat(L.teamSpawns[1]) : [], L.spawn ? [[L.spawn.x, L.spawn.z]] : [], (L.pickups || []).map(p => [p[1], p[3]]), (L.barrels || []));
  for (const [x, z] of pts) mark(x - 2.5, z - 2.5, x + 2.5, z + 2.5, keep);
  for (const l of L.links || []) { mark(l[0] - 2.5, l[2] - 2.5, l[0] + 2.5, l[2] + 2.5, keep); mark(l[3] - 2.5, l[5] - 2.5, l[3] + 2.5, l[5] + 2.5, keep); }
  const m = 6; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = bx0 + i * cs, z = bz0 + j * cs; if (x < bx0 + m || x > bx1 - m || z < bz0 + m || z > bz1 - m) keep[j * nx + i] = 1; }
  const dist = () => { for (let k = 0; k < N; k++) d[k] = occ[k] ? 0 : 1e6;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; let v = d[k]; if (i > 0) v = Math.min(v, d[k - 1] + 1); if (j > 0) { v = Math.min(v, d[k - nx] + 1); if (i > 0) v = Math.min(v, d[k - nx - 1] + 1.414); if (i < nx - 1) v = Math.min(v, d[k - nx + 1] + 1.414); } d[k] = v; }
    for (let j = nz - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const k = j * nx + i; let v = d[k]; if (i < nx - 1) v = Math.min(v, d[k + 1] + 1); if (j < nz - 1) { v = Math.min(v, d[k + nx] + 1); if (i < nx - 1) v = Math.min(v, d[k + nx + 1] + 1.414); if (i > 0) v = Math.min(v, d[k + nx - 1] + 1.414); } d[k] = v; } };
  const kit = L.coverKit || 'mil', free = (x, z, r) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const k = idx(x + dx, z + dz); if (k < 0 || occ[k] || (keep[k] && Math.abs(dx) <= 1 && Math.abs(dz) <= 1)) return false; } return true; };
  const piece = (x, z, axis, tall) => { // one cover piece ≤ 3 m so it sits on the slope instead of flattening it
    const r = R(); if (tall) { crates(L, x, z, 2, kit !== 'town' && r < 0.5); }
    else if (kit === 'mil') { if (r < 0.6) sandbags(L, x, z, 3, axis); else if (r < 0.8) L.B(x, z, axis === 'x' ? 2.8 : 1.1, axis === 'x' ? 1.1 : 2.8, 1.15, 0, 'hesco'); else crates(L, x, z, 1, true); }
    else if (kit === 'urban' || kit === 'yard') { if (r < 0.55) barrier(L, x, z, axis); else if (r < 0.8) crates(L, x, z, r < 0.7 ? 2 : 1); else sandbags(L, x, z, 3, axis); }
    else { if (r < 0.45) crates(L, x, z, r < 0.2 ? 2 : 1); else if (r < 0.75) { L.prop('cart', x, 0, z, 1, { ry: axis === 'x' ? Math.PI / 2 : 0 }); L.B(x, z, axis === 'x' ? 3 : 2, axis === 'x' ? 2 : 3, 1.4, 0, 'wood').noRender = true; } else L.B(x, z, axis === 'x' ? 3 : 0.6, axis === 'x' ? 0.6 : 3, 1.1, 0, 'stone'); }
    mark(x - 2, z - 2, x + 2, z + 2, occ); };
  // 1) spawn screens: head-high cover between each team spawn and the centre of the map
  if (L.teamSpawns) for (const list of L.teamSpawns) for (const [sx, sz] of list) { const l = Math.hypot(sx, sz) || 1, ux = -sx / l, uz = -sz / l;
    for (const off of [5, 6.5, 8]) { const x = Math.round(sx + ux * off), z = Math.round(sz + uz * off); if (free(x, z, 2)) { piece(x, z, Math.abs(ux) > Math.abs(uz) ? 'z' : 'x', true); const px = Math.round(x - uz * 2.6), pz = Math.round(z + ux * 2.6); if (free(px, pz, 2)) piece(px, pz, Math.abs(ux) > Math.abs(uz) ? 'z' : 'x', false); break; } } }
  // 2) fill open ground, worst spot first
  const gap = L.coverGap || 7.5; let placed = 0;
  for (let it = 0; it < 90; it++) { dist(); let bk = -1, bv = gap; for (let k = 0; k < N; k++) if (!keep[k] && d[k] > bv + (R() - 0.5) * 0.6) { bv = d[k]; bk = k; } if (bk < 0) break;
    const x = bx0 + (bk % nx) * cs, z = bz0 + Math.floor(bk / nx) * cs, ax = R() < 0.5 ? 'x' : 'z', o = ax === 'x' ? 'z' : 'x', sg = R() < 0.5 ? 1 : -1, P = (u, v) => ax === 'x' ? [x + u, z + v * sg] : [x + v * sg, z + u];
    if (kit === 'mil' && free(x, z, 3)) { // sandbag fighting position: a U open to the rear, sometimes with an ammo crate inside
      sandbags(L, ...P(0, 1.5), 3, ax); sandbags(L, ...P(-1.95, -0.1), 2.4, o); sandbags(L, ...P(1.95, -0.1), 2.4, o); if (R() < 0.5) crates(L, ...P(0.9, -0.6), 1); mark(x - 3.5, z - 3.5, x + 3.5, z + 3.5, occ); }
    else if (kit === 'urban' && free(x, z, 3)) { barrier(L, ...P(-1.7, 0), ax); barrier(L, ...P(1.7, 0.5), ax); if (R() < 0.6) crates(L, ...P(0, -1.6), R() < 0.5 ? 2 : 1); mark(x - 3.5, z - 3.5, x + 3.5, z + 3.5, occ); }
    else if (kit === 'yard' && free(x, z, 3)) { crates(L, ...P(-0.9, 0), 2, true); crates(L, ...P(0.9, 0.1), 1, true); crates(L, ...P(0.2, -1.5), 1); mark(x - 3.5, z - 3.5, x + 3.5, z + 3.5, occ); }
    else if (kit === 'town' && free(x, z, 3)) { const [cx, cz] = P(0, 0.6); L.prop('cart', cx, 0, cz, 1, { ry: ax === 'x' ? Math.PI / 2 : 0 }); L.B(cx, cz, ax === 'x' ? 3 : 2, ax === 'x' ? 2 : 3, 1.4, 0, 'wood').noRender = true; crates(L, ...P(2.2, -0.6), R() < 0.5 ? 2 : 1); L.prop('keg', ...((q) => [q[0], 0, q[1]])(P(-2, -0.8))); mark(x - 3.5, z - 3.5, x + 3.5, z + 3.5, occ); }
    else piece(x, z, ax, false);
    placed++; }
  L.coverPlaced = placed;
}
function dressEdges(L, name) {
  const [x0, z0, x1, z1] = L.bounds, R = seeded(hashStr(name + 'edges'));
  for (const b of L.boxes) { if (b.y1 - b.y0 < 3.5 || Math.max(b.x1 - b.x0, b.z1 - b.z0) < 30) continue;
    const side = b.z0 >= z1 - 1.5 ? 's' : b.z1 <= z0 + 1.5 ? 'n' : b.x0 >= x1 - 1.5 ? 'w' : b.x1 <= x0 + 1.5 ? 'e' : null; if (!side) continue; b.boundary = true;
    if (L.edge === 'berm') b.noRender = true;
    else if (L.edge === 'town') { const fx0 = side === 'e' ? b.x1 - 0.01 : b.x0, fx1 = side === 'w' ? b.x0 + 0.01 : b.x1, fz0 = side === 'n' ? b.z1 - 0.01 : b.z0, fz1 = side === 's' ? b.z0 + 0.01 : b.z1;
      const along = side === 'n' || side === 's', a0 = along ? Math.max(b.x0, x0) : Math.max(b.z0, z0), a1 = along ? Math.min(b.x1, x1) : Math.min(b.z1, z1), seg = 9 + R() * 5;
      for (let a = a0; a < a1 - 2; a += seg) { const e = Math.min(a1, a + seg), h = b.y1 - b.y0; // facade in segments so the frontage reads as separate buildings
        if (along) facade(L, R, a, side === 's' ? b.z0 : b.z1 - 0.01, e, side === 's' ? b.z0 + 0.01 : b.z1, h, side === 's' ? 's' : 'n');
        else facade(L, R, side === 'w' ? b.x0 : b.x1 - 0.01, a, side === 'w' ? b.x0 + 0.01 : b.x1, e, h, side === 'w' ? 'w' : 'e');
        if (R() < 0.6) { const c = (a + e) / 2, w = e - a; if (along) L.box(a + 0.2, h, side === 's' ? b.z0 - 0.35 : b.z1, e - 0.2, h + 0.35, side === 's' ? b.z0 : b.z1 + 0.35, 'stone', { col: false }); else L.box(side === 'w' ? b.x0 - 0.35 : b.x1, h, a + 0.2, side === 'w' ? b.x0 : b.x1 + 0.35, h + 0.35, e - 0.2, 'stone', { col: false }); } } } }
  if (L.edge === 'berm') for (const p of L.props) { const out = p.x < x0 || p.x > x1 || p.z < z0 || p.z > z1; if (out && p.y >= 4) p.y = (L.edgeBerm || 0) * 0.85; } // trees that stood on the old cliff wall now stand on the ridge
  if (L.edge === 'berm') for (let i = 0; i < 70; i++) { const t = R(), sd = Math.floor(R() * 4), u = sd < 2 ? lerp(x0, x1, t) : lerp(z0, z1, t), inset = 1.5 + R() * (L.edgeW || 12) * 0.7; // outcrops along the ridge
    const x = sd === 2 ? x0 + inset : sd === 3 ? x1 - inset : u, z = sd === 0 ? z0 + inset : sd === 1 ? z1 - inset : u; L.prop('rock', x, 0, z, 1.2 + R() * 2.4, { sy: 0.5 + R() * 0.6, c: L.rockC || 0xc8a882 }); }
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function buildTerrain(L, name) {
  TERR = null; const amp = L.hills || 0; if (!amp && !L.edgeBerm) return;
  const [x0, z0, x1, z1] = L.bounds, cs = 1, nx = Math.ceil((x1 - x0) / cs) + 2, nz = Math.ceil((z1 - z0) / cs) + 2, N = nx * nz, occ = new Uint8Array(N);
  const isStruct = b => b.stair || (b.y1 - b.y0) > 2.6 || Math.max(b.x1 - b.x0, b.z1 - b.z0) > 3 || (b.x1 - b.x0) * (b.z1 - b.z0) > 5;
  for (const b of L.boxes) { if (b.y1 <= 0.4 || b.y0 > 0.4 || !isStruct(b) || (b.boundary && L.edge === 'berm')) continue; b.struct = true;
    const i0 = Math.max(0, Math.floor((b.x0 - 0.5 - x0) / cs)), i1 = Math.min(nx - 1, Math.ceil((b.x1 + 0.5 - x0) / cs)), j0 = Math.max(0, Math.floor((b.z0 - 0.5 - z0) / cs)), j1 = Math.min(nz - 1, Math.ceil((b.z1 + 0.5 - z0) / cs));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) occ[j * nx + i] = 1; }
  for (const [ax, az, bx, bz] of L.flatZones || []) for (let j = Math.max(0, Math.floor((az - 1 - z0) / cs)); j <= Math.min(nz - 1, Math.ceil((bz + 1 - z0) / cs)); j++) for (let i = Math.max(0, Math.floor((ax - 1 - x0) / cs)); i <= Math.min(nx - 1, Math.ceil((bx + 1 - x0) / cs)); i++) occ[j * nx + i] = 1; // building interiors stay flat
  for (const [ax, az, bx, bz] of L.water || []) for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * cs, z = z0 + j * cs; if (x > ax - 4 && x < bx + 4 && z > az - 4 && z < bz + 4) occ[j * nx + i] = 1; }
  const d = new Float32Array(N); for (let k = 0; k < N; k++) d[k] = occ[k] ? 0 : 1e6; // chamfer distance transform (metres to the nearest structure)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; let v = d[k]; if (i > 0) v = Math.min(v, d[k - 1] + 1); if (j > 0) { v = Math.min(v, d[k - nx] + 1); if (i > 0) v = Math.min(v, d[k - nx - 1] + 1.414); if (i < nx - 1) v = Math.min(v, d[k - nx + 1] + 1.414); } d[k] = v; }
  for (let j = nz - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const k = j * nx + i; let v = d[k]; if (i < nx - 1) v = Math.min(v, d[k + 1] + 1); if (j < nz - 1) { v = Math.min(v, d[k + nx] + 1); if (i < nx - 1) v = Math.min(v, d[k + nx + 1] + 1.414); if (i > 0) v = Math.min(v, d[k + nx - 1] + 1.414); } d[k] = v; }
  const R = seeded(hashStr(name || 'map')), G = 64, grid = Float32Array.from({ length: G * G }, () => R()); // smooth value noise
  const vn = (x, z) => { const xi = Math.floor(x), zi = Math.floor(z), u = x - xi, v = z - zi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), g = (a, b) => grid[(((b % G) + G) % G) * G + (((a % G) + G) % G)];
    return lerp(lerp(g(xi, zi), g(xi + 1, zi), su), lerp(g(xi, zi + 1), g(xi + 1, zi + 1), su), sv); };
  const fl = L.hillFlat || 1.2, rp = L.hillRamp || 7, sc = L.hillScale || 26, h = new Float32Array(N); let mx = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, x = x0 + i * cs, z = z0 + j * cs;
    const f = vn(x / sc, z / sc) * 0.62 + vn(x / (sc * 0.45) + 17, z / (sc * 0.45) + 9) * 0.28 + vn(x / (sc * 0.18) + 41, z / (sc * 0.18) + 3) * 0.1;
    const edge = smooth(0, 4, Math.min(x - x0, x1 - x, z - z0, z1 - z)), v = amp * Math.pow(f, 1.5) * 1.6 * smooth(fl, rp, d[k]) * edge * (L.hillMask ? L.hillMask(x, z) : 1);
    const be = L.edgeBerm ? L.edgeBerm * Math.pow(smooth(L.edgeW || 12, 0, Math.min(x - x0, x1 - x, z - z0, z1 - z)), 1.3) * smooth(2, 7, d[k]) : 0; // rising ground at the map edge
    h[k] = v + be; if (h[k] > mx) mx = h[k]; }
  { const st = Math.tan((L.hillMaxSlope || 28) * Math.PI / 180) * cs, sd = st * Math.SQRT2; // slope limiter: nothing steeper than ~28 deg (walkable, readable hills)
    for (let it = 0; it < 3; it++) {
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; let v = h[k]; if (i > 0) v = Math.min(v, h[k - 1] + st); if (j > 0) { v = Math.min(v, h[k - nx] + st); if (i > 0) v = Math.min(v, h[k - nx - 1] + sd); if (i < nx - 1) v = Math.min(v, h[k - nx + 1] + sd); } h[k] = v; }
      for (let j = nz - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const k = j * nx + i; let v = h[k]; if (i < nx - 1) v = Math.min(v, h[k + 1] + st); if (j < nz - 1) { v = Math.min(v, h[k + nx] + st); if (i < nx - 1) v = Math.min(v, h[k + nx + 1] + sd); if (i > 0) v = Math.min(v, h[k + nx - 1] + sd); } h[k] = v; } }
    const g = h.slice(); for (let j = 1; j < nz - 1; j++) for (let i = 1; i < nx - 1; i++) { const k = j * nx + i; if (h[k] > 0.01) g[k] = (h[k] * 4 + h[k - 1] + h[k + 1] + h[k - nx] + h[k + nx]) / 8; } h.set(g); // soften creases
    mx = 0; for (let k = 0; k < N; k++) if (h[k] > mx) mx = h[k]; }
  TERR = { x0, z0, cs, nx, nz, h, max: mx, box: { x0: -1e9, y0: -1e9, z0: -1e9, x1: 1e9, y1: 0, z1: 1e9, m: L.ground || 'dirt', terrain: true } };
  // set everything that stands on the ground onto the slope
  const lift = b => { const y = TH((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2); if (y > 0.01) { b.y0 += y; b.y1 += y; } };
  for (const b of L.boxes) if (!b.struct && b.y0 < 2.2 && b.y1 > 0.02) lift(b);
  for (const b of L.decor) if (b.y0 < 2.2 && b.y1 > 0.02) lift(b);
  for (const p of L.props) if (p.y < 0.3 && !p.bg) p.y += TH(p.x, p.z);
  for (const g of L.glows) if (g[1] < 3.5) g[1] += TH(g[0], g[2]);
  for (const pk of L.pickups) if (pk[2] < 0.3) pk[2] += TH(pk[1], pk[3]);
  if (L.spawn) L.spawn.y = Math.max(L.spawn.y || 0, TH(L.spawn.x, L.spawn.z));
  const og = L.groundY; L.groundY = (x, z) => (og ? og(x, z) : 0) + TH(x, z);
}
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
      for (const b of this.bucket(cx, cz)) if (cx >= b.x0 - 0.01 && cx <= b.x1 + 0.01 && cz >= b.z0 - 0.01 && cz <= b.z1 + 0.01 && b.y1 < 18) tops.add(Math.round((b.y1 < 0.05 && TERR ? Math.max(b.y1, TH(cx, cz)) : b.y1) * 100) / 100);
      for (const h of [...tops].sort((a, b) => a - b)) if (!this.blocked(cx, h + 0.47, cz, R, HT - 0.45) && !this.blocked(cx, h + 0.02, cz, 0.02, 0.44)) { nodeH.push(h); nodeCell.push(k); } // no phantom nodes buried under a thin slab
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
          } else if (dh < -0.6 && dh > -7.2 && !diag) { // drop down a ledge (one way; a roof-to-street hop is fine)
            if (this.blocked(cx + DI[d] * cs * 0.9, h1 + 0.47, cz + DJ[d] * cs * 0.9, R, HT - 0.45)) continue;
            if (this.blocked(cx + DI[d] * cs, h2 + 0.47, cz + DJ[d] * cs, R * 0.9, h1 - h2 + HT - 0.6)) continue; // a body must fit all the way down
            { let floor = false; for (let q = cellStart[nk]; q < cellStart[nk + 1]; q++) if (q !== m && this.nodeH[q] > h2 + 0.3 && this.nodeH[q] < h1 + 0.6) floor = true; if (floor) continue; } // something solid between the ledge and the landing
            eTo.push(m); eC.push(2.5);
          }
        }
      }
    }
    eS[this.n] = eTo.length; this.eS = eS; this.eTo = Int32Array.from(eTo); this.eC = Float32Array.from(eC);
    this.g = new Float32Array(this.n); this.from = new Int32Array(this.n); this.stamp = new Uint32Array(this.n); this.closed = new Uint32Array(this.n); this.cur = 0;
    // ground-layer compatibility grid
    this.blk = new Uint8Array(N); for (let k = 0; k < N; k++) { let g = false; const gy = TERR ? TH(x0 + ((k % this.W) + 0.5) * cs, z0 + (Math.floor(k / this.W) + 0.5) * cs) : 0; for (let m = cellStart[k]; m < cellStart[k + 1]; m++) if (this.nodeH[m] < gy + 0.3) g = true; this.blk[k] = g ? 0 : 1; }
  }
  bucket(x, z) { const i = clamp(Math.floor((x - this.x0) / 4), 0, this.hw - 1), j = clamp(Math.floor((z - this.z0) / 4), 0, this.hh - 1); return this.hash[j * this.hw + i]; }
  blocked(x, y, z, r, h) {
    for (const bx of [x - r, x + r]) for (const bz of [z - r, z + r]) for (const b of this.bucket(bx, bz)) if (overlapBox(b, x, y, z, r, h)) return true;
    return false;
  }
  surfaceAt(x, z, maxY) { let best = null; for (const b of this.bucket(x, z)) if (x >= b.x0 - 0.05 && x <= b.x1 + 0.05 && z >= b.z0 - 0.05 && z <= b.z1 + 0.05 && b.y1 <= maxY && (best === null || b.y1 > best)) best = b.y1; if (best !== null && best < 0.05 && TERR) best = Math.max(best, TH(x, z)); return best; }
  hasNear(i, j, h1, h2) { if (i < 0 || j < 0 || i >= this.W || j >= this.H) return false; const k = j * this.W + i; for (let m = this.cellStart[k]; m < this.cellStart[k + 1]; m++) { const h = this.nodeH[m]; if (Math.abs(h - h1) < 0.6 || Math.abs(h - h2) < 0.6) return true; } return false; }
  cellIdx(x, z) { const i = Math.floor((x - this.x0) / this.cs), j = Math.floor((z - this.z0) / this.cs); if (i < 0 || j < 0 || i >= this.W || j >= this.H) return -1; return j * this.W + i; }
  nodeAt(x, y, z, maxRm = 5) {
    const cs = this.cs, maxR = Math.ceil(maxRm / cs), ci = Math.floor((x - this.x0) / cs), cj = Math.floor((z - this.z0) / cs); let best = -1, bs = 1e9;
    for (let r = 0; r <= maxR; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= this.W || j >= this.H) continue;
        const k = j * this.W + i; for (let m = this.cellStart[k]; m < this.cellStart[k + 1]; m++) { const h = this.nodeH[m], dy = h - y; const sc = Math.hypot(di, dj) * cs + (Math.abs(dy) > 0.7 ? Math.abs(dy) * 3 : Math.abs(dy) * 1.2) + (this.eS && this.eS[m + 1] === this.eS[m] ? 6 : 0); if (sc < bs) { bs = sc; best = m; } }
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
    while (heap.size && it++ < 220000) {
      const n = heap.pop(); if (this.closed[n] === st) continue; this.closed[n] = st; if (n === t) break;
      for (let e = this.eS[n]; e < this.eS[n + 1]; e++) { const m = this.eTo[e]; if (this.closed[m] === st) continue; const ng = this.g[n] + this.eC[e];
        if (this.stamp[m] !== st || ng < this.g[m]) { this.stamp[m] = st; this.g[m] = ng; this.from[m] = n; heap.push(m, ng + h(m)); } }
    }
    if (this.closed[t] !== st) return null;
    const ids = []; for (let n = t; n !== -1; n = this.from[n]) ids.push(n); ids.reverse();
    const out = []; for (let i = 1; i < ids.length; i++) { const v = this.via.get(ids[i - 1] + ',' + ids[i]); if (v) for (const p of v) out.push([p[0], p[1], p[2], 1]); out.push(this.nodePos(ids[i])); }
    return out;
  }
  freeAt(x, y, z) { const k = this.cellIdx(x, z); if (k < 0) return false; for (let m = this.cellStart[k]; m < this.cellStart[k + 1]; m++) if (Math.abs(this.nodeH[m] - y) < 0.6) return true; return false; }
  lineFreeAt(ax, ay, az, bx, by, bz) { const dx = bx - ax, dz = bz - az, n = Math.ceil(Math.hypot(dx, dz) / 0.45); for (let i = 1; i <= n; i++) { const t = i / n; if (!this.freeAt(ax + dx * t, ay + (by - ay) * t, az + dz * t)) return false; } return true; }
  randomNode() { if (this.safe && this.safe.length) return this.safe[Math.floor(Math.random() * this.safe.length)]; return this.n ? Math.floor(Math.random() * this.n) : -1; }
  markSafe(sx, sy, sz) { // nodes you can reach from spawn AND get back from: the only places bots wander to
    const s0 = this.nodeAt(sx, sy, sz, 5); if (s0 < 0) return; const fw = new Uint8Array(this.n), bw = new Uint8Array(this.n), rev = Array.from({ length: this.n }, () => []);
    for (let n = 0; n < this.n; n++) for (let e = this.eS[n]; e < this.eS[n + 1]; e++) rev[this.eTo[e]].push(n);
    let st = [s0]; fw[s0] = 1; while (st.length) { const n = st.pop(); for (let e = this.eS[n]; e < this.eS[n + 1]; e++) { const q = this.eTo[e]; if (!fw[q]) { fw[q] = 1; st.push(q); } } }
    st = [s0]; bw[s0] = 1; while (st.length) { const n = st.pop(); for (const q of rev[n]) if (!bw[q]) { bw[q] = 1; st.push(q); } }
    const out = []; this.safeMask = new Uint8Array(this.n); for (let n = 0; n < this.n; n++) if (fw[n] && bw[n]) { out.push(n); this.safeMask[n] = 1; } this.safe = Int32Array.from(out); }
  nearestSafe(x, y, z, maxRm = 10) { // closest node you can get to and back from (falls back to any node)
    if (!this.safeMask) return this.nodeAt(x, y, z, maxRm); const cs = this.cs, R = Math.ceil(maxRm / cs), ci = Math.floor((x - this.x0) / cs), cj = Math.floor((z - this.z0) / cs); let best = -1, bs = 1e9;
    for (let r = 0; r <= R; r++) { for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= this.W || j >= this.H) continue; const k = j * this.W + i;
      for (let m = this.cellStart[k]; m < this.cellStart[k + 1]; m++) { if (!this.safeMask[m]) continue; const sc = Math.hypot(di, dj) * cs + Math.abs(this.nodeH[m] - y) * 2; if (sc < bs) { bs = sc; best = m; } } } if (best >= 0 && bs < (r + 1) * cs) break; }
    return best; }
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

