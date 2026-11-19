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
  mushrooms: () => { const out = []; for (let i = 0; i < 3; i++) { const sz = rand(0.15, 0.4); out.push(['rock', pick(ROCKS), M4(rand(-0.5, 0.5), sz * 0.3, rand(-0.5, 0.5), rand(0, 3), rand(0, 3), 0, sz, sz * 0.6, sz), tint(0x9a9488, 0.1)]); } return out; }, // small stones
  bigmush: () => [['metal', PG.cyl, M4(0, -0.02, 0, 0, 0, 0, 0.95, 0.3, 0.95)], ['dark', PG.cyl, M4(0, 0.13, 0, 0, 0, 0, 0.8, 0.02, 0.8)], ['gold', PG.cyl, M4(0, 0.125, 0, 0, 0, 0, 0.92, 0.015, 0.92)]], // launch plate
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
  palm: () => { const out = [], lean = rand(-0.18, 0.18), h = rand(5.5, 7);
    for (let i = 0; i < 6; i++) { const t = i / 6; out.push(['bark', PG.cylT, M4(lean * h * (t + 1 / 12), h * (t + 1 / 12), 0, 0, 0, -lean, 0.2 - t * 0.06, h / 6 + 0.05, 0.2 - t * 0.06), tint(0x9a7a58, 0.08)]); }
    const tx = lean * h, lc = tint(0x5a8a3a, 0.12);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + rand(-0.2, 0.2), r = rand(1.6, 2.2); out.push(['leaf', PG.blob, M4(tx + Math.cos(a) * r * 0.8, h - 0.3 - r * 0.25, Math.sin(a) * r * 0.8, 0, -a, 0.45, r, 0.12, 0.45), tint(lc, 0.08)]); }
    out.push(['bark', PG.sph, M4(tx, h, 0, 0, 0, 0, 0.35, 0.3, 0.35), tint(0x6a5030)]); return out; },
  car: p => { const c = new THREE.Color(p.c || 0x6a1c1c), out = [['carpaint', PG.box, M4(0, 0.62, 0, 0, 0, 0, 1.85, 0.62, 4.3), c], ['carpaint', PG.box, M4(0, 1.18, -0.2, 0, 0, 0, 1.6, 0.52, 2.1), c],
      [p.burnt ? 'burnt' : 'carglass', PG.box, M4(0, 1.2, -0.2, 0, 0, 0, 1.62, 0.36, 1.7)], ['metal', PG.box, M4(0, 0.42, 2.17, 0, 0, 0, 1.8, 0.22, 0.08)], ['metal', PG.box, M4(0, 0.42, -2.17, 0, 0, 0, 1.8, 0.22, 0.08)]];
    for (const [x, z] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) out.push(['tire', PG.cyl, M4(x, 0.34, z, 0, 0, Math.PI / 2, 0.34, 0.24, 0.34)]);
    if (p.burnt) out.push(['burnt', PG.box, M4(0, 0.95, 1.4, 0.15, 0, 0.1, 1.7, 0.05, 1.2)]);
    return out; },
  sandbags: p => { const out = [], n = Math.max(2, Math.round(p.len / 0.62)); for (let r = 0; r < 3; r++) for (let i = 0; i < n - (r % 2); i++) { const x = -p.len / 2 + 0.31 + i * (p.len - 0.62) / (n - 1) + (r % 2) * 0.31;
      out.push(['sandbag', PG.blob, M4(x, 0.17 + r * 0.31, rand(-0.04, 0.04), 0, rand(-0.2, 0.2), 0, 0.33, 0.17, 0.42), tint(0xffffff, 0.08)]); } return out; },
  bollard: () => [['metal', PG.cyl, M4(0, 0.35, 0, 0, 0, 0, 0.18, 0.7, 0.18)], ['metal', PG.cyl, M4(0, 0.72, 0, 0, 0, 0, 0.26, 0.06, 0.26)]],
  cranewheel: () => [['metal', PG.box, M4(0, 0.5, 0, 0, 0, 0, 1.8, 1, 1.4)], ['tire', PG.cyl, M4(0, 0.4, 0.5, 0, 0, Math.PI / 2, 0.4, 1.9, 0.4)], ['tire', PG.cyl, M4(0, 0.4, -0.5, 0, 0, Math.PI / 2, 0.4, 1.9, 0.4)]],
  forklift: () => { const out = [['forklift', PG.box, M4(0, 0.75, -0.2, 0, 0, 0, 1.2, 1.0, 1.9)], ['metal', PG.box, M4(-0.45, 1.4, 1.0, 0, 0, 0, 0.1, 2.6, 0.1)], ['metal', PG.box, M4(0.45, 1.4, 1.0, 0, 0, 0, 0.1, 2.6, 0.1)],
      ['metal', PG.box, M4(-0.3, 0.12, 1.6, 0, 0, 0, 0.12, 0.05, 1.1)], ['metal', PG.box, M4(0.3, 0.12, 1.6, 0, 0, 0, 0.12, 0.05, 1.1)], ['metal', PG.box, M4(0, 2.1, -0.3, 0, 0, 0, 1.1, 0.06, 1.2)],
      ['metal', PG.box, M4(-0.5, 1.6, -0.85, 0, 0, 0, 0.06, 1.2, 0.06)], ['metal', PG.box, M4(0.5, 1.6, -0.85, 0, 0, 0, 0.06, 1.2, 0.06)], ['dark', PG.box, M4(0, 1.35, -0.4, 0, 0, 0, 0.5, 0.25, 0.5)]];
    for (const [x, z] of [[-0.62, 0.55], [0.62, 0.55], [-0.62, -0.75], [0.62, -0.75]]) out.push(['tire', PG.cyl, M4(x, 0.3, z, 0, 0, Math.PI / 2, 0.3, 0.22, 0.3)]); return out; },
  heli: () => { const c = new THREE.Color(0x5a5f48); return [['carpaint', PG.box, M4(0, 1.3, 0.4, 0.05, 0, 0.12, 2.2, 2.0, 5), c], ['carglass', PG.box, M4(0, 1.5, 3.1, 0.3, 0, 0.12, 1.8, 1.3, 1.1)], ['carpaint', PG.box, M4(0.2, 1.9, -4.2, 0, 0, 0.12, 0.5, 0.55, 5.2), c],
      ['carpaint', PG.box, M4(0.3, 2.6, -6.6, 0, 0, 0.12, 0.1, 1.5, 0.9), c], ['metal', PG.box, M4(1.0, 0.12, 0.4, 0, 0, 0, 0.1, 0.1, 4.6)], ['metal', PG.box, M4(-1.0, 0.12, 0.4, 0, 0, 0, 0.1, 0.1, 4.6)],
      ['metal', PG.box, M4(0, 2.5, 0.4, 0, 0.6, 0.12, 0.3, 0.06, 7.5)], ['metal', PG.box, M4(1.5, 1.2, 2, 0.4, 1.9, 0.5, 0.3, 0.06, 3.5)], ['burnt', PG.box, M4(0, 1.95, 0.6, 0, 0, 0.12, 1.6, 0.6, 3)], ['metal', PG.cyl, M4(0, 2.4, 0.4, 0, 0, 0, 0.3, 0.3, 0.3)]]; },
  fueltank: () => [['fuel', PG.cyl, M4(0, 1.6, 0, 0, 0, 0, 1.55, 3.2, 1.55)], ['fuel', PG.cyl, M4(0, 3.25, 0, 0, 0, 0, 1.35, 0.1, 1.35)], ['metal', PG.box, M4(1.6, 1.6, 0, 0, 0, 0, 0.05, 3.2, 0.05)], ['red', PG.box, M4(0, 2.2, 1.56, 0, 0, 0, 1.2, 0.3, 0.02)]],
  mast: () => { const out = [['crane', PG.box, M4(0, 12, 0, 0, 0, 0, 0.22, 24, 0.22)]]; for (let y = 2; y < 24; y += 3) { out.push(['crane', PG.box, M4(0, y, 0, 0, 0, 0, 1.4, 0.08, 0.08)], ['crane', PG.box, M4(0, y + 1.5, 0, 0, 0, 0, 0.08, 0.08, 1.4)]); }
    out.push(['white', PG.cyl, M4(0.6, 18, 0, 0, 0, Math.PI / 2, 0.7, 0.15, 0.7)], ['white', PG.cyl, M4(-0.5, 21, 0.3, Math.PI / 2, 0, 0, 0.5, 0.12, 0.5)], ['red', PG.sph, M4(0, 24.2, 0, 0, 0, 0, 0.2, 0.2, 0.2)]); return out; },
  tank: () => { const c = new THREE.Color(0x4a4a3a), out = [['carpaint', PG.box, M4(0, 1.0, 0, 0, 0, 0, 3.2, 1.1, 6.6), c], ['carpaint', PG.box, M4(0, 1.55, 2.9, -0.5, 0, 0, 3.0, 0.15, 1.2), c], ['tire', PG.box, M4(1.55, 0.5, 0, 0, 0, 0, 0.7, 1.0, 7)], ['tire', PG.box, M4(-1.55, 0.5, 0, 0, 0, 0, 0.7, 1.0, 7)],
      ['carpaint', PG.box, M4(0, 2.0, -0.4, 0, 0.35, 0, 2.2, 0.8, 2.8), c], ['metal', PG.cyl, M4(0.9, 2.0, 2.2, Math.PI / 2 - 0.12, 0.35, 0, 0.11, 4.2, 0.11)], ['metal', PG.cyl, M4(0.2, 2.5, -0.8, 0, 0, 0, 0.35, 0.15, 0.35)], ['burnt', PG.box, M4(0, 1.56, -1.5, 0, 0, 0, 2.8, 0.02, 3)]];
    for (let i = -3; i <= 3; i++) out.push(['metal', PG.cyl, M4(1.62, 0.45, i, 0, 0, Math.PI / 2, 0.36, 0.5, 0.36)], ['metal', PG.cyl, M4(-1.62, 0.45, i, 0, 0, Math.PI / 2, 0.36, 0.5, 0.36)]); return out; },
  wire: p => { const out = [], n = 8, sag = p.sag || 0.6; let prev = new V3(0, 0, 0); // sagging cable from the prop origin to (ex, ey, ez)
    for (let k = 1; k <= n; k++) { const t = k / n, cur = new V3(p.ex * t, (p.ey || 0) * t - sag * 4 * t * (1 - t), p.ez * t), mid = prev.clone().add(cur).multiplyScalar(0.5), d = cur.clone().sub(prev), len = d.length();
      out.push(['dark', PG.box, new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), d.normalize()), new V3(0.022, 0.022, len + 0.01))]); prev = cur; } return out; },
  laundry: p => { const out = PROPT.wire({ ex: p.ex, ey: 0, ez: p.ez, sag: 0.35 }), ang = Math.atan2(p.ex, p.ez), cols = [0xe8e4dc, 0xc03030, 0x3060a0, 0xe0c040, 0x50a060, 0x9a6ab0, 0xf0f0f0];
    for (let k = 1; k < 6; k++) { const t = k / 6, y = -0.35 * 4 * t * (1 - t); if (Math.random() < 0.25) continue; const w = rand(0.4, 0.8), h = rand(0.5, 0.9);
      out.push(['cloth', PG.box, M4(p.ex * t, y - h / 2, p.ez * t, 0, ang + Math.PI / 2, rand(-0.05, 0.05), w, h, 0.015), new THREE.Color(pick(cols))]); } return out; },
  stall: p => { const c = new THREE.Color(p.c || 0xb33a3a), out = [['planks', PG.box, M4(0, 0.85, 0, 0, 0, 0, 2.0, 0.08, 1.0)], ['cloth', PG.box, M4(0, 2.3, 0.1, 0.18, 0, 0, 2.4, 0.04, 1.6), c]];
    for (const [x, z] of [[-0.95, -0.45], [0.95, -0.45], [-0.95, 0.45], [0.95, 0.45]]) out.push(['wood', PG.box, M4(x, 0.42, z, 0, 0, 0, 0.06, 0.85, 0.06)]);
    for (const [x, z] of [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.8], [1.1, 0.8]]) out.push(['wood', PG.box, M4(x, z > 0 ? 1.1 : 1.2, z, 0, 0, 0, 0.05, z > 0 ? 2.2 : 2.4, 0.05)]);
    for (let i = 0; i < 9; i++) out.push(['leaf', PG.blob, M4(rand(-0.8, 0.8), 0.98, rand(-0.35, 0.35), 0, 0, 0, 0.1, 0.09, 0.1), new THREE.Color(pick([0xd04020, 0xe0a020, 0x60a030, 0xe8d050, 0x8a3060]))]);
    return out; },
  trash: () => { const out = []; for (let i = 0; i < 4; i++) { const s = rand(0.25, 0.42); out.push(['dark', PG.blob, M4(rand(-0.5, 0.5), s * 0.7, rand(-0.5, 0.5), rand(0, 3), rand(0, 3), 0, s, s * 0.8, s), new THREE.Color(pick([0x222428, 0x2a3a2a, 0x3a3020]))]); } return out; },
  tires: () => { const out = []; for (let i = 0; i < 3; i++) out.push(['tire', PG.cyl, M4(rand(-0.05, 0.05), 0.12 + i * 0.23, rand(-0.05, 0.05), 0, rand(0, 3), 0, 0.38, 0.22, 0.38)]); return out; },
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
  const q = { low: 0, medium: 0.32, high: 0.75, ultra: 1 }[settings.quality] * (L.grass || 0);
  if (q > 0) {
    const [x0, z0, x1, z1] = L.bounds, n = Math.round((x1 - x0) * (z1 - z0) * q);
    const inWater = (x, z) => L.water.some(w => x > w[0] && x < w[2] && z > w[1] && z < w[3]);
    for (let i = 0; i < n; i++) {
      const x = rand(x0 + 0.6, x1 - 0.6), z = rand(z0 + 0.6, z1 - 0.6);
      if (!world.nav.free(x, z) && Math.random() < 0.85) continue; if (inWater(x, z)) continue;
      const s = rand(0.45, 0.9), a = rand(0, 3.14), c = tint(L.grassTint || 0xffffff, 0.12);
      const gy = TH(x, z); push('grassBlade', PG.plane, M4(x, gy + s * 0.42, z, 0, a, 0, s * 1.1, s * 0.85, 1), c);
      push('grassBlade', PG.plane, M4(x, gy + s * 0.42, z, 0, a + 1.57, 0, s * 1.1, s * 0.85, 1), c);
      if (Math.random() < 0.06 * (L.flowers || 1)) push('flower', PG.blob0, M4(x + 0.1, gy + s * 0.7, z, 0, 0, 0, 0.05, 0.04, 0.05), new THREE.Color(pick([0xffe14d, 0xffffff, 0xd85ad8, 0xff6a5a, 0x7ab8ff])));
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
      mat = MAT({ map: getTex('grassBlade'), alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true });
      // gentle wind sway in the vertex shader (top of each blade only)
      mat.onBeforeCompile = sh => { sh.uniforms.uTime = windU; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat sway = uv.y * 0.12; transformed.x += sin(uTime * 1.7 + position.x * 0.4 + position.z * 0.3) * sway; transformed.z += cos(uTime * 1.3 + position.z * 0.5) * sway * 0.6;'); };
      geo.computeVertexNormals(); for (let i = 0; i < nor.length; i += 3) { nor[i] = 0; nor[i + 1] = 1; nor[i + 2] = 0; } // grass lit like the ground
    } else if (mk === 'flower') mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    else mat = matFor(mk, th).mat;
    if (mk === 'leaf' && mat.map) { mat.map = mat.map.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(2, 2); }
    if (mk === 'mountain' || mk === 'snow') mat.vertexColors = true;
    const mesh = new THREE.Mesh(geo, mat); if (mk === 'grassBlade' || mk === 'flower') mesh.userData.noAO = true;
    mesh.castShadow = !['grassBlade', 'flower', 'mountain', 'snow', 'glass', 'lampglow'].includes(mk); mesh.receiveShadow = !['mountain', 'snow'].includes(mk);
    if (mk === 'mountain' || mk === 'snow') mesh.renderOrder = -2;
    group.add(mesh);
  }
}
const windU = { value: 0 };
// ground, water, glows, fireflies, clouds
function buildEnvironment(L, th, group, anim) {
  buildBackdrop(L, th, group);
  const [x0, z0, x1, z1] = L.bounds;
  // detailed play-area ground with vertex-colour variation + soft darkening near walls
  const W = x1 - x0 + 8, D = z1 - z0 + 8, seg = TERR ? Math.min(220, Math.ceil(Math.max(x1 - x0, z1 - z0) / 0.8)) : L.big ? 128 : 64, gg = new THREE.PlaneGeometry(W, D, seg, seg); gg.rotateX(-Math.PI / 2); gg.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const P = gg.attributes.position, uv = gg.attributes.uv, col = new Float32Array(P.count * 3), s = USE_PHOTO && GROUNDPHOTO[L.ground] ? GROUNDPHOTO[L.ground][1] : L.groundScale || 4;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i); uv.setXY(i, x / s, -z / s); if (L.groundY) P.setY(i, L.groundY(x, z));
    const n = 0.86 + NZ(x * 0.08 + 50, z * 0.08 + 50, 256) * 0.28; let ao = 1;
    const dw = Math.min(x - x0, x1 - x, z - z0, z1 - z); if (dw < 2.5) ao = 0.65 + 0.35 * (dw / 2.5);
    const c = new THREE.Color(L.groundTint || 0xffffff); col[i * 3] = c.r * n * ao; col[i * 3 + 1] = c.g * n * ao; col[i * 3 + 2] = c.b * n * ao;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); if (L.groundY) gg.computeVertexNormals();
  const gm = matFor('ground_', { mats: { ground_: { t: L.ground, s: 1, bump: 0, photo: GROUNDPHOTO[L.ground] ? [GROUNDPHOTO[L.ground][0], 1, GROUNDPHOTO[L.ground][2]] : undefined } } }).mat;
  if (gm.map) { gm.map.anisotropy = Math.min(4, maxAniso); }
  const ground = new THREE.Mesh(gg, gm); ground.receiveShadow = true; group.add(ground);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), MAT({ color: th.farGround || 0x4a5a3a }));
  far.position.y = -0.05; if (!L.backdrop) group.add(far); // the layered backdrop brings its own floor
  // water
  if (L.water.length) {
    const wt = getTex('water').clone(); wt.needsUpdate = true; wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
    const pos = [], uvs = [];
    for (const [a, b, c, d, y = 0.03] of L.water) { pos.push(a, y, b, a, y, d, c, y, d, a, y, b, c, y, d, c, y, b); uvs.push(a / 4, b / 4, a / 4, d / 4, c / 4, d / 4, a / 4, b / 4, c / 4, d / 4, c / 4, b / 4); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); wg.computeVertexNormals();
    const wm = MAT({ map: wt, color: th.water || 0x6a8a70, transparent: true, opacity: 0.88, emissive: new THREE.Color(th.water || 0x6a8a70).multiplyScalar(0.18) });
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
    if (settings.quality !== 'low') for (const [x, y, z, c, i, d] of L.lights) { const l = new THREE.PointLight(c, i, d, 1.6); l.position.set(x, y, z); group.add(l); }
    if (HQ) { // a few real lights for the brightest fires
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
  // smoke columns rising from burning wrecks
  if (L.smoke && L.smoke.length && settings.quality !== 'low') {
    const per = 16, n = L.smoke.length * per, pos = new Float32Array(n * 3), seed = []; for (let i = 0; i < n; i++) { const s0 = L.smoke[Math.floor(i / per)]; seed.push([s0[0], s0[1], s0[2], Math.random() * 12, rand(0.7, 1.3)]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 5, map: getTex('puff'), color: 0x4a4641, transparent: true, opacity: 0.5, depthWrite: false })); pts.frustumCulled = false; group.add(pts); anim.smoke = { geo, seed };
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
  if (A.smoke) { const p = A.smoke.geo.attributes.position; A.smoke.seed.forEach((s, i) => { const k = ((t * 0.09 * s[4] + s[3] / 12) % 1); p.setXYZ(i, s[0] + Math.sin(k * 5 + s[3]) * k * 2.5 + k * 4, s[1] + k * 22, s[2] + Math.cos(k * 4 + s[3]) * k * 2); }); p.needsUpdate = true; }
  if (A.flames) A.flames.material.size = 0.4 + Math.sin(t * 13) * 0.05;
  if (A.flies) { const p = A.flies.geo.attributes.position; A.flies.seed.forEach((s, i) => {
    if (A.flies.rise) { const y = (s[1] + t * s[4] * 0.8) % 7; p.setXYZ(i, s[0] + Math.sin(t * 0.7 + s[3]) * 0.6, y, s[2] + Math.cos(t * 0.6 + s[3]) * 0.6); }
    else p.setXYZ(i, s[0] + Math.sin(t * s[4] + s[3]) * 1.2, s[1] + Math.sin(t * 1.3 * s[4] + s[3] * 2) * 0.4, s[2] + Math.cos(t * 0.8 * s[4] + s[3]) * 1.2); });
    p.needsUpdate = true; A.flies.geo.attributes.position.needsUpdate = true; }
}
function mountains(L, colors, snow) { L.backdrop = L.backdrop || (snow ? 'alpine' : 'desert'); } // replaced by layered ridgelines (buildBackdrop)
// layered panoramic backdrop: near foothills in the map's own ground colour, mid ranges, far peaks dissolving into the sky haze
const BACKDROPS = {
  desert: [{ d0: 0, d1: 340, h: [0, 0], c: [0xb08a5a, 0xbf9a68], hz: 0.1, f: 1, floor: true }, { d0: 0, d1: 100, h: [3, 12], c: [0xb48d5c, 0xcca674], hz: 0.04, f: 7, near: true }, { d0: 80, d1: 200, h: [22, 56], c: [0x9a6c44, 0xb8885a], hz: 0.16, f: 5, mesa: 0.72 }, { d0: 220, d1: 320, h: [55, 110], c: [0x957a68, 0xb59e88], hz: 0.36, f: 4 }],
  dusty: [{ d0: 0, d1: 340, h: [0, 0], c: [0xa88a64, 0xb89a74], hz: 0.1, f: 1, floor: true }, { d0: 0, d1: 100, h: [3, 11], c: [0xae9068, 0xc4a47e], hz: 0.08, f: 8, near: true }, { d0: 80, d1: 210, h: [18, 46], c: [0x96765a, 0xb09272], hz: 0.26, f: 6, mesa: 0.8 }, { d0: 230, d1: 320, h: [45, 95], c: [0x948472, 0xb0a08e], hz: 0.46, f: 4 }],
  alpine: [{ d0: 0, d1: 340, h: [0, 0], c: [0x40602c, 0x50703a], hz: 0.1, f: 1, floor: true }, { d0: 0, d1: 110, h: [5, 18], c: [0x3a5a28, 0x587a3a], hz: 0.1, f: 8, near: true, forest: true }, { d0: 90, d1: 210, h: [28, 62], c: [0x46623e, 0x647c58], hz: 0.2, f: 6 }, { d0: 230, d1: 330, h: [80, 150], c: [0x546c8a, 0x7a90ae], hz: 0.3, f: 5, snow: 0.64 }],
  urban: [{ d0: 0, d1: 340, h: [0, 0], c: [0x5c5e5a, 0x6a6c66], hz: 0.1, f: 1, floor: true }, { d0: 110, d1: 230, h: [16, 40], c: [0x62665c, 0x7a7e72], hz: 0.32, f: 6 }, { d0: 240, d1: 330, h: [40, 85], c: [0x6e7076, 0x8c8e94], hz: 0.5, f: 4 }],
  medi: [{ d0: 0, d1: 340, h: [0, 0], c: [0x6a6448, 0x787052], hz: 0.1, f: 1, floor: true }, { d0: 0, d1: 110, h: [6, 20], c: [0x56603a, 0x77804c], hz: 0.06, f: 8, near: true, forest: true }, { d0: 100, d1: 230, h: [30, 70], c: [0x8a7a5e, 0xb09c78], hz: 0.22, f: 6, mesa: 0.85 }, { d0: 240, d1: 335, h: [70, 130], c: [0x6a7c96, 0x93a4ba], hz: 0.4, f: 4 }],
  coast: [{ d0: 0, d1: 340, h: [0, 0], c: [0x3e4a54, 0x4a5660], hz: 0.1, f: 1, floor: true }, { d0: 190, d1: 290, h: [20, 60], c: [0x56504e, 0x726860], hz: 0.4, f: 5 }, { d0: 270, d1: 335, h: [50, 110], c: [0x66646e, 0x86808a], hz: 0.56, f: 3 }],
};
function buildBackdrop(L, th, group) {
  const preset = typeof L.backdrop === 'string' ? BACKDROPS[L.backdrop] : L.backdrop; if (!preset) return;
  const [x0, z0, x1, z1] = L.bounds, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hw = (x1 - x0) / 2 + 1, hd = (z1 - z0) / 2 + 1, haze = new THREE.Color(th.fog), R0 = seeded(hashStr(L.backdropSeed || String(hw * 7 + hd)));
  const edge = a => Math.min(hw / Math.max(1e-3, Math.abs(Math.cos(a))), hd / Math.max(1e-3, Math.abs(Math.sin(a)))); // distance to the map's rectangular edge
  const sun = new V3(...th.sunDir).normalize();
  preset.forEach((Ly, li) => {
    const sa = 360, sr = Ly.near ? 12 : 8, ph = [...Array(6)].map(() => R0() * 6.28), am = [1, 0.55, 0.3, 0.18, 0.1, 0.06];
    const prof = a => { let n = 0, t = 0; for (let k = 0; k < 6; k++) { n += am[k] * Math.sin(a * Math.round(Ly.f * (k + 1) * (1 + k * 0.37)) + ph[k]); t += am[k]; } /* whole-number frequencies: no seam where the ring wraps */ n = 0.5 + 0.5 * n / t; return Math.pow(n, 1.6); };
    const pos = [], base = [], hzv = [], idx = [], lo = new THREE.Color(Ly.c[0]), hi = new THREE.Color(Ly.c[1]), snow = new THREE.Color(0xf2f5fa);
    for (let ia = 0; ia <= sa; ia++) { const a = ia / sa * Math.PI * 2, H = lerp(Ly.h[0], Ly.h[1], prof(a)), e0 = edge(a), dirx = Math.cos(a), dirz = Math.sin(a);
      for (let ir = 0; ir <= sr; ir++) { const t = ir / sr, r = e0 + lerp(Ly.near ? -1 : Ly.d0, Ly.d1, t) + (Ly.near ? 0 : Math.sin(a * 23 + li) * 2);
        let y = H * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.12)), 0.85) * (0.92 + 0.08 * Math.sin(a * 61 + t * 9 + li * 3));
        if (Ly.mesa) y = Math.min(y, H * Ly.mesa) / Ly.mesa * (Ly.mesa + (1 - Ly.mesa) * 0.25); // flat-topped mesas
        if (Ly.near) y = y * smooth(0.05, 0.4, t) + 0.3 + (L.edgeBerm || 0) * (1 - smooth(0, 0.3, t) * 0.4); // rises from the map's own ground (or berm) right at the boundary
        if (Ly.floor) y = 1.96 + (L.edgeBerm || 0) * 0.6; // ends up just under ground level
        pos.push(cx + dirx * r, y - (Ly.near ? 0 : 2), cz + dirz * r);
        const k = clamp(y / Ly.h[1], 0, 1), c = lo.clone().lerp(hi, k * 0.85 + 0.15 * Math.sin(a * 37 + ir) ** 2);
        if (Ly.forest) c.multiplyScalar(0.84 + 0.22 * (0.5 + 0.5 * Math.sin(a * 140 + ir * 1.7)));
        if (Ly.snow && y > Ly.h[1] * Ly.snow) c.lerp(snow, smooth(Ly.h[1] * Ly.snow, Ly.h[1] * (Ly.snow + 0.1), y));
        if (Ly.mesa || L.backdrop === 'desert' || L.backdrop === 'dusty') c.multiplyScalar(0.93 + 0.07 * Math.sin(y * 0.9 + a * 3)); // rock strata
        base.push(c); hzv.push(Ly.floor ? lerp(Ly.hz, 0.5, Math.pow(t, 1.3)) : clamp(Ly.hz + t * 0.1, 0, 0.92)); } }
    for (let ia = 0; ia < sa; ia++) for (let ir = 0; ir < sr; ir++) { const a = ia * (sr + 1) + ir, b = a + sr + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); } // counter-clockwise from above: faces up/inward
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const N = g.attributes.normal, col = new Float32Array(base.length * 3), nv = new V3();
    for (let i = 0; i < base.length; i++) { nv.fromBufferAttribute(N, i); const sh = 0.56 + 0.62 * Math.max(0, nv.dot(sun)) + 0.1 * nv.y; // soft baked sun: no black backlit faces
      const c = base[i].clone().multiplyScalar(sh).lerp(haze, hzv[i]); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false })); m.userData.noAO = true; m.frustumCulled = false; group.add(m); // colours are authored as final (ACES would wash them out)
  });
}

// ---------------------------------------------------------------- MAP 1: BOGWATER SWAMP
function wallX2(L, x0, x1, z, th, y0, h, ops, m) {
  let cur = x0;
  for (const o of (ops || []).slice().sort((a, b) => a.c - b.c)) {
    const a = o.c - o.w / 2, b = o.c + o.w / 2;
    if (a > cur) L.box(cur, y0, z - th / 2, a, y0 + h, z + th / 2, m);
    if (o.y0 > 0) L.box(a, y0, z - th / 2, b, y0 + o.y0, z + th / 2, m);
    if (o.y1 < h) L.box(a, y0 + o.y1, z - th / 2, b, y0 + h, z + th / 2, m);
    if (o.y0 > 0.5) { L.box(a - 0.05, y0 + o.y0 - 0.08, z - th / 2 - 0.08, b + 0.05, y0 + o.y0, z + th / 2 + 0.08, 'stone', { col: false }); winOpening(L, 'x', a, b, z, th, y0 + o.y0, y0 + Math.min(o.y1, h), o); }
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
    if (o.y0 > 0.5) { L.box(x - th / 2 - 0.08, y0 + o.y0 - 0.08, a - 0.05, x + th / 2 + 0.08, y0 + o.y0, b + 0.05, 'stone', { col: false }); winOpening(L, 'z', a, b, x, th, y0 + o.y0, y0 + Math.min(o.y1, h), o); }
    cur = b;
  }
  if (cur < z1) L.box(x - th / 2, y0, cur, x + th / 2, y0 + h, z1, m);
}
const D2 = c => ({ c, w: 1.8, y0: 0, y1: 2.5 }), W2 = c => ({ c, w: 1.8, y0: 0.75, y1: 2.8 }); // windows: 1.95 m tall, sill at hip height: vault straight through standing
// a real window in a wall opening: wooden frame + a fill chosen from the position (same on every client)
function winOpening(L, ax, a, b, c, th, y0, y1, o) {
  if (o.open || y1 - y0 < 0.5) return;
  const F = 0.07, d = th / 2 + 0.035, fr = (x0, yy0, x1, yy1) => ax === 'x' ? L.box(x0, yy0, c - d, x1, yy1, c + d, 'wood', { col: false }) : L.box(c - d, yy0, x0, c + d, yy1, x1, 'wood', { col: false });
  fr(a - F, y0, a, y1); fr(b, y0, b + F, y1); fr(a - F, y1, b + F, y1 + F); // jambs + head (outside the opening, so it stays vaultable)
  const v = Math.sin(a * 12.9898 + c * 78.233 + y0 * 37.719) * 43758.5453, hsh = v - Math.floor(v);
  const type = o.glass || (y1 - y0 < 1.0 ? (hsh < 0.7 ? 'glass' : 'broken') : hsh < 0.4 ? 'glass' : hsh < 0.52 ? 'frosted' : hsh < 0.66 ? 'boarded' : hsh < 0.8 ? 'shutter' : 'broken');
  (L.windows || (L.windows = [])).push({ ax, a, b, c, th, y0, y1, type });
}
// two-storey house: doors {n,s,e,w: [centers]}, interior stair along the north wall, upper-floor windows on every side, pitched roof
function house2(L, x0, z0, w, d, o = {}) {
  (L.flatZones || (L.flatZones = [])).push([x0, z0, x0 + w, z0 + d]);
  const fh = 3.4, th = 0.4, x1 = x0 + w, z1 = z0 + d, m = o.m || 'tudor', run = clamp(w - 3.4, 3.8, 5.6), sw = 1.8;
  const dr = o.doors || {}, wn = (a, b) => { const r = []; for (let c = a + 1.6; c < b - 1.2; c += 2.6) r.push(W2(c)); return r; };
  const stx0 = x0 + th + 1.1 - 0.9, stx1 = x0 + th + 1.1 + run + 0.9; // no ground-floor window on the north wall where the stair runs behind it
  const gOps = (side, a, b) => (dr[side] || []).map(D2).concat(o.gwin === false ? [] : wn(a, b).filter(wo => !(dr[side] || []).some(dc => Math.abs(dc - wo.c) < 2) && !(side === 'n' && wo.c > stx0 && wo.c < stx1)));
  wallX2(L, x0, x1, z1 - th / 2, th, 0, fh, gOps('n', x0, x1), m); wallX2(L, x0, x1, z0 + th / 2, th, 0, fh, gOps('s', x0, x1), m);
  wallZ2(L, z0 + th, z1 - th, x1 - th / 2, th, 0, fh, gOps('e', z0, z1), m); wallZ2(L, z0 + th, z1 - th, x0 + th / 2, th, 0, fh, gOps('w', z0, z1), m);
  const y2 = fh + 0.25;
  wallX2(L, x0, x1, z1 - th / 2, th, y2, fh - 0.25, wn(x0, x1), m); wallX2(L, x0, x1, z0 + th / 2, th, y2, fh - 0.25, wn(x0, x1), m);
  wallZ2(L, z0 + th, z1 - th, x1 - th / 2, th, y2, fh - 0.25, wn(z0, z1), m); wallZ2(L, z0 + th, z1 - th, x0 + th / 2, th, y2, fh - 0.25, wn(z0, z1), m);
  L.box(x0 - 0.08, fh, z0 - 0.08, x1 + 0.08, y2, z0 + 0.02, 'stone', { col: false }); L.box(x0 - 0.08, fh, z1 - 0.02, x1 + 0.08, y2, z1 + 0.08, 'stone', { col: false });
  L.box(x0 - 0.08, fh, z0 + 0.02, x0 + 0.02, y2, z1 - 0.02, 'stone', { col: false }); L.box(x1 - 0.02, fh, z0 + 0.02, x1 + 0.08, y2, z1 - 0.02, 'stone', { col: false });
  // upper floor slab with a stairwell along the north wall
  const sx0 = x0 + th + 1.1, sx1 = sx0 + run, sz0 = z1 - th - sw, hz = sz0 - 0.55;
  L.box(x0 + th, fh, z0 + th, x1 - th, y2, hz, 'planks'); L.box(sx1, fh, hz, x1 - th, y2, z1 - th, 'planks');
  L.stairs(sx0, sz0 + sw / 2, 'px', sw, 0, y2, run, 'planks');
  L.box(x0 + th, fh + 0.9, hz - 0.06, sx1 + 0.2, fh + 1.0, hz, 'planks', { col: false });
  L.box(x0 - 0.3, fh * 2, z0 - 0.3, x1 + 0.3, fh * 2 + 0.2, z1 + 0.3, o.roofM === 'thatch' ? 'thatch' : 'roof');
  L.prop('gable', (x0 + x1) / 2, fh * 2 + 0.2, (z0 + z1) / 2, 1, { w: w + 0.6, d: d + 0.6, h: Math.min(w, d) * 0.45, oh: 0.35, axis: w >= d ? 'x' : 'z', mat: o.roofM || 'tiles' });
  L.prop('chimney', x1 - 1.4, fh * 2 + 0.2, z0 + 1.4, 1, { h: Math.min(w, d) * 0.45 + 0.6 });
  if (!L.noLamps) for (let c = x0 + 1.6; c < x1 - 1.2; c += 2.6) L.glow(c, y2 + 1.6, z0 - 0.3, 0xffc070, 0.9);
}
// stair tower with belfry (three levels)
function stairTower(L, x0, z0, s, m) {
  (L.flatZones || (L.flatZones = [])).push([x0, z0, x0 + s, z0 + s]);
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
  L.links.pop(); L.links.push([wc, 0, iz0 + 0.45, wc, f2, iz0 + 1.25, run * 2 + 3, [[wc, f1, iz0 + 1.0 + run + 0.3], [ec, f1, iz0 + 1.0 + run + 0.3], [ec, f2, iz0 + 1.15]]]); // one link up both flights via the landing
  L.box(ix0, f2 - 0.25, iz0, half, f2, iz1, 'planks');                                        // belfry floor
  L.box(x0 - 0.3, H, z0 - 0.3, x1 + 0.3, H + 0.3, z1 + 0.3, 'stone');
  L.prop('coneroof', (x0 + x1) / 2, H + 0.3, (z0 + z1) / 2, 1, { r: s * 0.78, h: 5, mat: 'slate' });
  L.prop('brazier', (half + ix1) / 2, f2 - 0.05, iz0 + 0.6, 0.5);
}

// ---------------------------------------------------------------- MAP 4: MILLBROOK VILLAGE (large, three lanes, river)
function buildMillbrook(L) {
  L.coverKit = 'town';
  L.edge = 'berm'; L.edgeBerm = 4.5; L.edgeW = 12; L.rockC = 0x8a8a80;
  L.hills = 4.4; L.hillScale = 34; L.hillRamp = 10; L.hillMask = (x, z) => smooth(6, 12, Math.abs(x));
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
  L.stairs(bx0 + 12.5, bz0 + 1.5, 'nx', 1.9, 0, 4.45, 5.5, 'planks');
  L.box(bx0 + 7.0, 4.45, bz0 + 2.4, bx0 + 7.1, 5.4, bz0 + bd - 0.5, 'planks', { col: false });
  L.box(bx0 - 0.3, bh, bz0 - 0.3, bx0 + bw + 0.3, bh + 0.2, bz0 + bd + 0.3, 'roof');
  L.prop('gable', bx0 + bw / 2, bh + 0.2, bz0 + bd / 2, 1, { w: bw + 0.6, d: bd + 0.6, h: 5.5, oh: 0.4, axis: 'x', mat: 'tiles' });
  for (const [x, z, h] of [[27, -6, 1], [29, -6, 2], [27, 2, 1], [36, -4, 1], [36, 3, 2], [33, -0.5, 1]]) for (let k = 0; k < h; k++) L.B(x, z, 1.8, 1.2, 1, k, 'hay');
  for (const [x, z] of [[26, -7], [26, 3]]) L.B(x, z, 1.4, 1.4, 1, 4.45, 'hay');
  house2(L, 44, 14, 10, 9, { doors: { w: [18.5], s: [49] }, m: 'tudor2', roofM: 'thatch' });   // farmhouse
  house2(L, 6.5, -30, 9, 8, { doors: { e: [-26], n: [11] }, m: 'hutwall', roofM: 'thatch' });   // mill
  const wheel = L.prop('octo', 5.6, -0.6, -26, 1, { r: 2.6, h: 0.6, mat: 'planks' }); wheel.k = 'wheel';
  L.octo(50, -24, 3, 12, 'stonewall'); L.prop('coneroof', 50, 12, -24, 1, { r: 3.6, h: 3, mat: 'tiles' });   // silo
  watchtower(L, 57, -32, 'nx'); // hunting tower on the farm side (counter: barn loft, mill, the bell tower across the river)
  for (let x = 16; x <= 52; x += 6) for (let z = 28; z <= 44; z += 6) { const tx = x + rand(-1, 1), tz = z + rand(-1, 1); L.B(tx, tz, 0.6, 0.6, 3, 0, 'bark').noRender = true; L.prop('oak', tx, 0, tz, rand(0.85, 1.05), { leaf: pick([0x4a7a35, 0x5a8a3a, 0x6a8a30]) }); } // orchard
  for (const [x, z, len, ry] of [[22, 24, 24, 0], [56, 6, 16, Math.PI / 2], [22, -34, 22, 0], [14, -14, 12, Math.PI / 2]]) { L.prop('fence', x, 0, z, 1, { len, ry }); if (ry) L.box(x - 0.1, 0, z - len / 2, x + 0.1, 1, z + len / 2, 'wood').noRender = true; else L.box(x - len / 2, 0, z - 0.1, x + len / 2, 1, z + 0.1, 'wood').noRender = true; }
  for (const [x, z] of [[46, -8], [52, 0], [18, -40], [30, -40], [58, -36], [12, 10], [16, 18]]) { L.B(x, z, 1.8, 1.2, 1, 0, 'hay'); if (Math.random() < 0.5) L.B(x, z, 1.8, 1.2, 1, 1, 'hay'); }
  for (const [x, z, st] of [[18, -2, 1], [44, -14, 0], [56, 30, 1], [10, 36, 0], [40, -36, 1], [20, 8, 0]]) { L.B(x, z, 1.2, 1.2, 1.2, 0, 'crate'); if (st) L.B(x, z, 1.2, 1.2, 1.2, 1.2, 'crate'); }
  for (const [x, z] of [[14, 0], [42, 8], [34, -20], [20, -24], [56, -10], [8, 40]]) L.prop('lantern', x, 0, z, 1);
  for (let i = 0; i < 40; i++) { const x = rand(-60, 60), z = rand(-44, 44); if (Math.abs(x) < 5) continue; L.prop(Math.random() < 0.5 ? 'bush' : 'mushrooms', x, 0, z, rand(0.7, 1.2)); }
  mountains(L, [0x6a8098, 0x7a90a6, 0x5d7489], true);
  L.pad(-8, -40, 0, 15, 0, 6); L.pad(18, 40, 0, 15, 0, -6);
  L.spawn = { x: -58, y: 0, z: 0, yaw: -Math.PI / 2 };
  L.teamSpawns = [[[-58, -2], [-60, -30], [-60, 30], [-50, -40], [-50, 40], [-48, 0]], [[58, 0], [58, -18], [60, 24], [50, 40], [50, -42], [48, 0]]];
  L.enemySpawns = [[58, 0], [58, -20], [58, 20], [40, 42], [40, -42], [-10, 44], [-10, -44], [-58, -40], [-58, 40], [20, -44], [30, 20], [-40, -44]];
  L.pickups = [['health', -34.5, 0, 23.5], ['ammo', -25.2, 7.6, 13.5], ['health', 28, 4.45, -2.5], ['ammo', 32, 0, 5], ['health', -53.5, 3.65, -8], ['ammo', 48.5, 3.65, 20],
    ['health', 0, 0, 0], ['ammo', 0, 0, 30], ['health', 11, 3.65, -24], ['ammo', -22, 0, 4], ['health', 40, 0, 30], ['ammo', -40, 0, -24]];
  L.barrels = [[-14, -10], [14, 4], [-30, 12], [22, -16], [46, 28], [-46, -28], [6, 22], [-6, -24]];
}

// ---------------------------------------------------------------- MAP: OLD QUARTER (souk · tower square · rampart)
function solid(L, x0, z0, x1, z1, h, m, o = {}) { // a building block that frames the lanes: walls, windows, parapet, awnings
  L.box(x0, 0, z0, x1, h, z1, m);
  L.box(x0 - 0.12, h, z0 - 0.12, x1 + 0.12, h + 0.35, z1 + 0.12, o.trim || 'sandstone', { col: false });
  const win = (x, z, nx, nz) => { L.box(x - 0.55 * Math.abs(nz), 2.3, z - 0.55 * Math.abs(nx), x + 0.55 * Math.abs(nz), 3.6, z + 0.55 * Math.abs(nx), Math.random() < 0.25 ? 'glass' : 'dark', { col: false }); };
  for (let x = x0 + 2.5; x < x1 - 1.5; x += rand(4, 7)) { if (h > 4) { win(x, z0 - 0.03, 0, -1); win(x, z1 + 0.03, 0, 1); } }
  for (let z = z0 + 2.5; z < z1 - 1.5; z += rand(4, 7)) { if (h > 4) { win(x0 - 0.03, z, -1, 0); win(x1 + 0.03, z, 1, 0); } }
  if (o.roof) L.prop('gable', (x0 + x1) / 2, h + 0.35, (z0 + z1) / 2, 1, { w: x1 - x0, d: z1 - z0, h: Math.min(x1 - x0, z1 - z0) * 0.3, oh: 0.3, axis: x1 - x0 >= z1 - z0 ? 'x' : 'z', mat: 'tiles' });
}
function doorway(L, x0, x1, z, gap0, gap1, h = 5.5, m = 'plasterB', th = 0.7) { // wall across a lane with an opening + lintel
  L.box(x0, 0, z - th / 2, gap0, h, z + th / 2, m); L.box(gap1, 0, z - th / 2, x1, h, z + th / 2, m); L.box(gap0, 3.2, z - th / 2, gap1, h, z + th / 2, m);
  L.box(gap0 - 0.25, 3.2, z - th / 2 - 0.1, gap1 + 0.25, 3.5, z + th / 2 + 0.1, 'sandstone', { col: false });
  L.box(gap0 - 0.05, 0, z - th / 2 - 0.9, gap0 + 0.1, 3.1, z - th / 2, 'planks', { col: false }); L.box(gap1 - 0.1, 0, z - th / 2 - 0.9, gap1 + 0.05, 3.1, z - th / 2, 'planks', { col: false }); // open door leaves
}
function crates(L, x, z, n = 1, big = false) { const s = big ? 1.6 : 1.2; L.B(x, z, s, s, s, 0, 'crate'); if (n > 1) L.B(x + 0.05, z - 0.05, s, s, s, s, 'crate'); }
function buildOldQuarter(L) {
  L.coverKit = 'town';
  L.edge = 'town';
  L.postcard = { hk: 0.36, dk: 1.15 };
  L.hills = 1.8; L.hillScale = 22; L.hillFlat = 1.0; L.hillRamp = 7.5;
  L.bounds = [-52, -46, 52, 46]; L.ground = 'cobble'; L.groundScale = 3.2; L.groundTint = 0xf0dcbc; L.grass = 0.05; L.big = true; L.padStyle = 'rune';
  L.box(-56, -1, -50, 56, 0, 50, 'floor').noRender = true;
  L.box(-53, 0, -47, 53, 9, -46, 'plasterB'); L.box(-53, 0, 46, 53, 9, 47, 'plasterB'); L.box(-53, 0, -46, -52, 9, 46, 'plasterB'); L.box(52, 0, -46, 53, 9, 46, 'plasterB');
  // ---- OLD QUARTER (original layout). Mirror-symmetric north/south so both teams get the same map.
  // WEST = covered souk (close quarters, arches, stalls) · CENTRE = clock-tower square (power position, countered by the
  // upper windows of four houses around it) · EAST = street under a raised rampart walk (long sightline; drop off anywhere).
  // Cross-alleys at z ±20 and passages at z 0 tie the lanes together; houses double as connectors.
  const half = sg => {
    const Z = (a, b) => sg > 0 ? [a, b] : [-b, -a], bx = (x0, y0, za, x1, y1, zb, m, o) => { const [z0, z1] = Z(za, zb); return L.box(x0, y0, z0, x1, y1, z1, m, o); };
    const sol = (x0, za, x1, zb, h, m, o) => { const [z0, z1] = Z(za, zb); solid(L, x0, z0, x1, z1, h, m, o); };
    const h2 = (x0, z0, w, d, o, dr) => { const md = {}; for (const k in dr) { const kk = sg > 0 ? k : k === 'n' ? 's' : k === 's' ? 'n' : k; md[kk] = k === 'e' || k === 'w' ? dr[k].map(v => v * sg) : dr[k]; } house2(L, x0, sg > 0 ? z0 : -(z0 + d), w, d, Object.assign({ roofM: 'tiles', doors: md }, o)); };
    // west / centre blocks
    sol(-52, 0, -46, 34, 7, 'plasterB');
    h2(-36, 22, 14, 12, { m: 'plasterA' }, { w: [28], s: [-29] }); sol(-22, 22, -4, 34, 6, 'plasterB', { roof: true });
    h2(-30, 2, 16, 12, { m: 'plasterB' }, { s: [-18], e: [8] }); // passage door kept clear of the stairwell (it runs along the far wall) sol(-36, 2, -30, 18, 6, 'plasterA'); sol(-30, 14, -14, 18, 6, 'plasterA');
    // east blocks
    h2(14, 2, 16, 12, { m: 'plasterA' }, { w: [8], s: [26] }); sol(30, 2, 32, 18, 6, 'plasterB'); sol(14, 14, 30, 18, 6, 'plasterB');
    h2(18, 22, 14, 12, { m: 'plasterB' }, { e: [28], s: [25] }); sol(4, 22, 18, 34, 6, 'plasterA', { roof: true });
    // chokepoints: arches across the souk and the mid street (alternate routes: the cross-alleys & houses)
    { const z = 26 * sg; doorway(L, -46, -36, z, -42.6, -39.4, 6, 'plasterB'); doorway(L, -4, 4, z, -1.7, 1.7, 6, 'plasterA'); }
    // east rampart: stairs at its end, parapet with gaps (one-way drops into the street)
    L.stairs(49, 32 * sg, sg > 0 ? 'nz' : 'pz', 3, 0, 3.4, 6, 'sandstone');
    for (let z = 2; z < 26; z += 6) bx(46, 3.4, z, 46.4, 4.4, z + 3.6, 'sandstone');
    crates(L, 50, 14 * sg, 1); crates(L, 50.2, 20 * sg, 2);
    // souk dressing: stalls, awnings, lanterns under the covered stretch
    const st = (x, z, ry, c) => { L.B(x, z * sg, 1.5, 1.5, 0.9, 0, 'planks').noRender = true; L.prop('stall', x, 0, z * sg, 1, { ry, c }); };
    st(-44, 8, 1.57, 0xb33a3a); st(-38, 16, -1.57, 0x2f6fae); st(-44.2, 30, 1.57, 0x3f8f4a);
    for (const [x, z] of [[-41, 6], [-41, 14]]) L.glow(x, 3.0, z * sg, 0xffb060, 1.1);
    L.B(-41, 21 * sg, 9.6, 2.6, 0.1, 3.3, 'cloth', { col: false, tint: sg > 0 ? 0xb33a3a : 0x2f6fae });
    // square + mid street cover
    L.B(-9, 9 * sg, 2.6, 1.2, 1.0, 0, 'stone'); L.B(9, 9 * sg, 1.2, 2.6, 1.0, 0, 'stone');
    crates(L, -2.2, 18 * sg, 2); crates(L, 2.4, 30 * sg); L.prop('cart', 9, 0, 20 * sg, 1, { ry: 1.57 }); L.B(9, 20 * sg, 3, 2, 1.4, 0, 'wood').noRender = true;
    // east street: carts & a low wall breaking the long sightline
    L.prop('cart', 36, 0, 12 * sg, 1, { ry: 0.2 }); L.B(36, 12 * sg, 2, 3, 1.4, 0, 'wood').noRender = true; bx(39, 0, 24, 43, 1.1, 24.6, 'stone'); crates(L, 34, 29 * sg, 2);
    // spawn plaza: fountains, palms, kegs; awnings on the house fronts
    L.octo(-22, 40 * sg, 2.2, 0.85, 'stone'); L.water.push([-23.6, 40 * sg - 1.6, -20.4, 40 * sg + 1.6, 0.75]); L.octo(22, 40 * sg, 2.2, 0.85, 'stone'); L.water.push([20.4, 40 * sg - 1.6, 23.6, 40 * sg + 1.6, 0.75]);
    for (const x of [-44, -8, 8, 44]) { L.B(x, 43.5 * sg, 0.5, 0.5, 4, 0, 'bark').noRender = true; L.prop('palm', x, 0, 43.5 * sg, 1.05); }
    for (const [x, z] of [[-30, 36], [30, 36], [-2, 36], [44, 36], [-46, 36]]) L.prop('lantern', x, 0, z * sg, 1);
    L.prop('keg', -14, 0, 36 * sg); L.prop('keg', 15, 0, 35.5 * sg);
    const awn = [0xb33a3a, 0x2f6fae, 0x3f8f4a, 0xd98a2b, 0x8a4ab0];
    for (const [x, w] of [[-13, 6], [11, 6]]) L.B(x, 35 * sg, w, 1.6, 0.1, 3.2, 'cloth', { col: false, tint: pick(awn) });
  };
  half(1); half(-1);
  // souk roof over the middle stretch + passage arches
  L.box(-46, 3.4, -12, -36, 3.7, 12, 'roof'); for (const z of [-8, 0, 8]) L.glow(-41, 3.0, z, 0xffb060, 1.1);
  { const st = (x, z, ry, c) => { L.B(x, z, 1.5, 1.5, 0.9, 0, 'planks').noRender = true; L.prop('stall', x, 0, z, 1, { ry, c }); }; st(-44, -3.5, 1.57, 0xd98a2b); st(-38, 3.5, -1.57, 0x8a4ab0); }
  for (const [x0, x1] of [[-36, -30], [30, 32]]) L.box(x0, 3.4, -2.3, x1, 4.2, 2.3, 'sandstone'); // lintels over the passage mouths
  // the clock tower in the square (three levels; belfry sees both mid streets)
  stairTower(L, -3, -3, 6, 'castle');
  // east rampart walk (solid below) + its middle stair from the passage
  L.box(46, 0, -26, 52, 3.4, 26, 'sandstone'); L.box(45.9, 3.4, -26, 52, 3.5, 26, 'stone', { col: false });
  L.stairs(40, 0, 'px', 3, 0, 3.4, 6, 'sandstone');
  for (const [x, z] of [[-2, 16.5], [2, -16.5], [-24, 20], [24, -20]]) L.prop('lantern', x, 0, z, 1);
  mountains(L, [0xc2a882, 0xb39a76, 0xcab28c], false);
  L.spawn = { x: 0, y: 0, z: 40, yaw: 0 };
  L.teamSpawns = [[[-40, 40], [-30, 41], [-12, 41], [0, 41], [12, 41], [30, 41], [40, 40]], [[-40, -40], [-30, -41], [-12, -41], [0, -41], [12, -41], [30, -41], [40, -40]]];
  L.enemySpawns = L.teamSpawns[1].concat([[-41, -20], [-41, 20], [39, -16], [39, 16], [-20, 20], [20, -20], [-9, -12], [9, 12]]);
  L.pickups = [['health', -10, 0, -11], ['ammo', 10, 0, 11], ['health', -41, 0, 0], ['ammo', 38, 0, -8], ['ammo', 49, 3.4, 8], ['health', 49, 3.4, -8], ['ammo', -24, 0, 0], ['health', 24, 0, 0]];
  L.barrels = [[-12, 20], [12, -20], [38, 22], [-40, -24], [-30, 0], [30, 0]];
}

// ---------------------------------------------------------------- MAP 6: CROSSROADS (large war-torn city)
// Structural layout uses a seeded RNG so every multiplayer client builds the identical map.
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function car(L, x, z, rot, burnt) { // rot: 0 = along z, 1 = along x
  const w = 1.9, l = 4.4; L.B(x, z, rot ? l : w, rot ? w : l, 1.45, 0, 'carpaint').noRender = true;
  L.prop('car', x, 0, z, 1, { ry: (rot ? Math.PI / 2 : 0) + (Math.random() - 0.5) * 0.25, c: burnt ? 0x2a2725 : pick([0x6a1c1c, 0x2c3e5a, 0xb8b4a8, 0x3a4a32, 0x1c1c1e, 0x8a7a52]), burnt });
  if (burnt) { L.glow(x + rand(-0.4, 0.4), 1.4, z + rand(-0.4, 0.4), 0xff7a20, 1.6, true); L.smoke.push([x, 1.6, z]); }
}
function sandbags(L, x, z, len, axis) { // waist-high cover
  if (axis === 'x') L.box(x - len / 2, 0, z - 0.45, x + len / 2, 1.0, z + 0.45, 'sandbag').noRender = true; else L.box(x - 0.45, 0, z - len / 2, x + 0.45, 1.0, z + len / 2, 'sandbag').noRender = true;
  L.prop('sandbags', x, 0, z, 1, { len, ry: axis === 'x' ? 0 : Math.PI / 2 });
}
function barrier(L, x, z, axis) { if (axis === 'x') L.B(x, z, 3, 0.7, 1.05, 0, 'concrete'); else L.B(x, z, 0.7, 3, 1.05, 0, 'concrete'); }
function rubble(L, x, z, r, R) { for (let i = 0; i < 5; i++) { const s = rand(0.3, 0.8) * r; L.prop('rock', x + rand(-r, r), 0, z + rand(-r, r), 1, { sy: s * 0.7, c: pick([0xb0aca4, 0x9a8a7a, 0x8a8680]) }); } L.B(x, z, r * 1.1, r * 1.1, 0.7 * r, 0, 'concrete').noRender = true; }
function ruin(L, x0, z0, x1, z1, R) { // bombed-out shell: broken walls with gaps, rubble inside
  const m = R() < 0.5 ? 'brickW' : 'concrete', th = 0.45;
  const wall = (a, b, fixed, axis) => { let c = a; while (c < b - 0.5) { const seg = 2 + R() * 4, gap = R() < 0.55 ? 1.8 + R() * 1.6 : 0, e = Math.min(b, c + seg), h = 1.3 + R() * 3.2;
    if (axis === 'x') L.box(c, 0, fixed - th / 2, e, h, fixed + th / 2, m); else L.box(fixed - th / 2, 0, c, fixed + th / 2, h, e, m); c = e + gap; } };
  wall(x0, x1, z0, 'x'); wall(x0, x1, z1, 'x'); wall(z0 + th, z1 - th, x0, 'z'); wall(z0 + th, z1 - th, x1, 'z');
  rubble(L, (x0 + x1) / 2 + (R() - 0.5) * 3, (z0 + z1) / 2 + (R() - 0.5) * 3, 1.4, R);
  if (R() < 0.6) crates(L, x0 + 2 + R() * (x1 - x0 - 4), z0 + 2 + R() * (z1 - z0 - 4), R() < 0.5 ? 2 : 1);
}
function yard(L, x0, z0, x1, z1, R) { // walled courtyard with a parked car
  const m = 'concrete', h = 1.15, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  L.box(x0, 0, z0, cx - 1.4, h, z0 + 0.3, m); L.box(cx + 1.4, 0, z0, x1, h, z0 + 0.3, m); L.box(x0, 0, z1 - 0.3, cx - 1.4, h, z1, m); L.box(cx + 1.4, 0, z1 - 0.3, x1, h, z1, m);
  L.box(x0, 0, z0, x0 + 0.3, h, cz - 1.4, m); L.box(x0, 0, cz + 1.4, x0 + 0.3, h, z1, m); L.box(x1 - 0.3, 0, z0, x1, h, cz - 1.4, m); L.box(x1 - 0.3, 0, cz + 1.4, x1, h, z1, m);
  car(L, cx + (R() - 0.5) * 2, cz + (R() - 0.5) * 2, (x1 - x0) > (z1 - z0) ? 1 : 0, R() < 0.4);
  crates(L, x0 + 1.5, z1 - 1.5, 2); L.prop('keg', x1 - 1.2, 0, z0 + 1.2);
}
function tower(L, x0, z0, x1, z1, R) { // tall apartment block (solid), flat roof with parapet & AC units
  const h = 8 + Math.floor(R() * 4) * 1.5, m = pick(['concrete', 'brickW', 'plasterA', 'concrete']);
  solid(L, x0, z0, x1, z1, h, m, { trim: 'concrete' });
  L.box(x0, h + 0.35, z0, x1, h + 1.1, z0 + 0.25, m, { col: false }); L.box(x0, h + 0.35, z1 - 0.25, x1, h + 1.1, z1, m, { col: false });
  L.box(x0, h + 0.35, z0, x0 + 0.25, h + 1.1, z1, m, { col: false }); L.box(x1 - 0.25, h + 0.35, z0, x1, h + 1.1, z1, m, { col: false });
  for (let i = 0; i < 2; i++) L.B(lerp(x0 + 2, x1 - 2, Math.random()), lerp(z0 + 2, z1 - 2, Math.random()), 1.2, 0.9, 0.9, h + 0.35, 'metal', { col: false });
  for (let y = 3.2; y < h - 1; y += 3) L.box(x0 - 0.06, y, z0 - 0.06, x1 + 0.06, y + 0.14, z1 + 0.06, 'concrete', { col: false }); // floor bands
}
function cityBlock(L, x0, z0, x1, z1, R) {
  L.box(x0, 0, z0, x1, 0.03, z1, 'pavement', { col: false });
  const alleyX = R() < 0.75, alleyZ = R() < 0.75, mx = (x0 + x1) / 2 + (R() - 0.5) * 4, mz = (z0 + z1) / 2 + (R() - 0.5) * 4, a = 1.7;
  const lots = [];
  const xs = alleyX ? [[x0 + 1, mx - a], [mx + a, x1 - 1]] : [[x0 + 1, x1 - 1]], zs = alleyZ ? [[z0 + 1, mz - a], [mz + a, z1 - 1]] : [[z0 + 1, z1 - 1]];
  for (const [ax, bx] of xs) for (const [az, bz] of zs) lots.push([ax, az, bx, bz]);
  let houses = 0;
  lots.forEach(([lx0, lz0, lx1, lz1], i) => {
    const w = lx1 - lx0, d = lz1 - lz0; let t = R();
    if (i === lots.length - 1 && !houses) t = 0;
    if (t < 0.38 && w >= 9 && d >= 8) { houses++; const hw = Math.min(w, 16), hd = Math.min(d, 12), hx = lx0 + (w - hw) / 2, hz = lz0 + (d - hd) / 2;
      house2(L, hx, hz, hw, hd, { m: pick(['brickW', 'plasterA', 'concrete', 'plasterB']), roofM: 'tiles', doors: { n: [hx + hw * 0.7], s: [hx + hw * 0.4], e: [hz + hd / 2], w: [hz + hd / 2] } });
      if (w - hw > 3) crates(L, lx0 + 0.9, lz0 + 1.2); }
    else if (t < 0.62) tower(L, lx0, lz0, lx1, lz1, R);
    else if (t < 0.86) ruin(L, lx0, lz0, lx1, lz1, R);
    else yard(L, lx0, lz0, lx1, lz1, R);
  });
  if (alleyX && alleyZ) { crates(L, mx, mz + 0.6); L.prop('keg', mx + 0.8, 0, mz - 0.8); }
}
function buildCrossroads(L) {
  L.coverKit = 'urban';
  L.edge = 'town';
  L.backdrop = 'urban';
  L.hills = 2.6; L.hillScale = 28; L.hillRamp = 9;
  const R = seeded(1337);
  L.bounds = [-96, -80, 96, 80]; L.ground = 'asphalt'; L.groundScale = 6; L.groundTint = 0xd8d6d0; L.grass = 0; L.big = true; L.padStyle = 'rune'; L.smoke = L.smoke || []; L.noLamps = true;
  L.box(-100, -1, -84, 100, 0, 84, 'floor').noRender = true;
  // perimeter: tall burnt-out buildings close the city off
  L.box(-97, 0, -81, 97, 14, -80, 'brickW'); L.box(-97, 0, 80, 97, 14, 81, 'brickW'); L.box(-97, 0, -80, -96, 14, 80, 'brickW'); L.box(96, 0, -80, 97, 14, 80, 'brickW');
  for (let x = -96; x < 96; x += 12) for (const s of [-1, 1]) { const h = 16 + Math.random() * 26; L.box(x, 0, s > 0 ? 81 : -95, x + 11, h, s > 0 ? 95 : -81, pick(['concrete', 'brickW', 'concrete']), { col: false }); }
  for (let z = -80; z < 80; z += 12) for (const s of [-1, 1]) { const h = 16 + Math.random() * 26; L.box(s > 0 ? 97 : -111, 0, z, s > 0 ? 111 : -97, h, z + 11, pick(['concrete', 'brickW']), { col: false }); }
  // street grid: avenues at x = -52, 0, 52 and z = -44, 0, 44
  const XR = [[-92, -57], [-47, -7], [7, 47], [57, 92]], ZR = [[-76, -49], [-39, -7], [7, 39], [49, 76]];
  for (const [x0, x1] of XR) for (const [z0, z1] of ZR) { if (Math.abs((x0 + x1) / 2) < 30 && Math.abs((z0 + z1) / 2) < 25) {} cityBlock(L, x0, z0, x1, z1, R); }
  // road markings & sidewalk curbs (visual)
  for (const x of [-52, 0, 52]) { const hw = x ? 5 : 7; for (let z = -78; z < 78; z += 6) L.box(x - 0.12, 0, z, x + 0.12, 0.035, z + 3, 'white', { col: false }); L.box(x - hw - 0.3, 0, -80, x - hw, 0.12, 80, 'concrete', { col: false }); L.box(x + hw, 0, -80, x + hw + 0.3, 0.12, 80, 'concrete', { col: false }); }
  for (const z of [-44, 0, 44]) { const hw = z ? 5 : 7; for (let x = -94; x < 94; x += 6) if (Math.abs(x) > 8 && Math.abs(x - 52) > 6 && Math.abs(x + 52) > 6) L.box(x, 0, z - 0.12, x + 3, 0.035, z + 0.12, 'white', { col: false }); }
  // central plaza: monument, wrecked convoy, sandbag positions
  L.B(0, 0, 5, 5, 1.2, 0, 'concrete'); L.B(0, 0, 2.2, 2.2, 1.6, 1.2, 'stone'); L.prop('statue', 0, 2.8, 0, 1.6);
  for (const [x, z, a] of [[-4.5, 10, 'x'], [4.5, -10, 'x'], [10, 4.5, 'z'], [-10, -4.5, 'z']]) sandbags(L, x, z, 4.5, a);
  car(L, 3.5, 18, 0, true); car(L, -3.2, -20, 0, false); car(L, 20, -3, 1, true); car(L, -22, 2.5, 1, false); car(L, 2.5, 33, 0, false); car(L, -2.5, -36, 0, true);
  car(L, 33, 2.5, 1, false); car(L, -35, -2.5, 1, true);
  // side streets: abandoned cars, barriers, checkpoint sandbags
  for (const x of [-52, 52]) for (const z of [-62, -24, 22, 62]) { if (R() < 0.6) car(L, x + (R() < 0.5 ? -2.6 : 2.6), z + (R() - 0.5) * 8, 0, R() < 0.35); else barrier(L, x + (R() - 0.5) * 4, z, 'x'); }
  for (const z of [-44, 44]) for (const x of [-74, -28, 28, 74]) { if (R() < 0.6) car(L, x + (R() - 0.5) * 8, z + (R() < 0.5 ? -2.6 : 2.6), 1, R() < 0.35); else barrier(L, x, z + (R() - 0.5) * 4, 'z'); }
  for (const [x, z, a] of [[0, 46.5, 'x'], [0, -46.5, 'x'], [-52, 4.5, 'x'], [52, -4.5, 'x'], [-49, 44, 'z'], [49, -44, 'z']]) sandbags(L, x, z, 4, a);
  for (const [x, z] of [[-6, 60], [6, -60], [-46, 30], [46, -30], [-58, -14], [58, 14], [30, 48], [-30, -48]]) barrier(L, x, z, Math.abs(x) % 52 < 8 ? 'x' : 'z');
  // street lights & power poles
  for (const x of [-7.8, 7.8]) for (let z = -72; z <= 72; z += 16) L.prop('lantern', x, 0, z, 1.3, { ry: x < 0 ? 0 : Math.PI });
  for (const z of [-7.8, 7.8]) for (let x = -88; x <= 88; x += 16) if (Math.abs(x) > 10) L.prop('lantern', x, 0, z, 1.3, { ry: z < 0 ? Math.PI / 2 : -Math.PI / 2 });
  for (let i = 0; i < 18; i++) { const x = pick([-58.5, -45.5, 45.5, 58.5]), z = rand(-74, 74); L.prop('pine', x, 0, z, rand(0.8, 1.1), { leaf: 0x3a4a2a }); }
  L.spawn = { x: 0, y: 0, z: 70, yaw: 0 };
  L.teamSpawns = [[[-40, 78], [-20, 78], [0, 72], [20, 78], [40, 78], [-52, 70], [52, 70], [0, 64]], [[-40, -78], [-20, -78], [0, -72], [20, -78], [40, -78], [-52, -70], [52, -70], [0, -64]]];
  L.enemySpawns = L.teamSpawns[1].concat([[-80, 0], [80, 0], [-52, -30], [52, 30], [-30, 0], [30, 0], [0, -30], [0, 30], [-80, 44], [80, -44], [-80, -44], [80, 44]]);
  L.pickups = [['health', 0, 0, 12], ['ammo', 0, 0, -12], ['health', -52, 0, 0], ['ammo', 52, 0, 0], ['health', 52, 0, 44], ['ammo', -52, 0, -44], ['health', -52, 0, 44], ['ammo', 52, 0, -44],
    ['health', -26, 0, 0], ['ammo', 26, 0, 0], ['health', 0, 0, 44], ['ammo', 0, 0, -44], ['health', -80, 0, 0], ['ammo', 80, 0, 0]];
  L.barrels = [[-6, 24], [6, -24], [-24, 6], [24, -6], [-52, 16], [52, -16], [16, 44], [-16, -44]];
}

// ---------------------------------------------------------------- shared military props
function container(L, x, z, len, axis, stack = 1, col, y0 = 0, solid = true) { // ISO shipping container(s): 12.2 / 6.1 x 2.44 x 2.6 m
  const c = col !== undefined ? col : pick([0xa8382a, 0x2f5f8a, 0x3f7a4a, 0xc08a2a, 0x8a8f94, 0x6a3a6a, 0xb85a20]);
  for (let k = 0; k < stack; k++) {
    const y = y0 + k * 2.6, cc = k ? pick([0xa8382a, 0x2f5f8a, 0x3f7a4a, 0xc08a2a, 0x8a8f94]) : c, w = axis === 'x' ? len : 2.44, d = axis === 'x' ? 2.44 : len;
    L.B(x, z, w, d, 2.6, y, 'container', { tint: cc, col: solid });
    for (const e of [-1, 1]) { // door / end frames
      if (axis === 'x') L.box(x + e * len / 2 - 0.06, y + 0.05, z - 1.25, x + e * len / 2 + 0.06, y + 2.55, z + 1.25, 'metal', { col: false });
      else L.box(x - 1.25, y + 0.05, z + e * len / 2 - 0.06, x + 1.25, y + 2.55, z + e * len / 2 + 0.06, 'metal', { col: false });
    }
  }
}
function hesco(L, x0, z0, x1, z1, h = 2.2) { L.box(x0, 0, z0, x1, h, z1, 'hesco'); }
function watchtower(L, cx, cz, dir, y = 4.5) { // stilted tower with sandbag parapet; stairs leave towards dir
  const s = 2.2; for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.B(cx + dx * (s - 0.15), cz + dz * (s - 0.15), 0.3, 0.3, y, 0, 'wood');
  L.B(cx, cz, s * 2, s * 2, 0.25, y - 0.25, 'planks');
  const e = 0.3, ph = 1.0; // parapet (gap on the stair side)
  if (dir !== 'nz') L.box(cx - s, y, cz - s, cx + s, y + ph, cz - s + e, 'sandbag'); if (dir !== 'pz') L.box(cx - s, y, cz + s - e, cx + s, y + ph, cz + s, 'sandbag');
  if (dir !== 'nx') L.box(cx - s, y, cz - s, cx - s + e, y + ph, cz + s, 'sandbag'); if (dir !== 'px') L.box(cx + s - e, y, cz - s, cx + s, y + ph, cz + s, 'sandbag');
  L.box(cx - s - 0.2, y + 2.6, cz - s - 0.2, cx + s + 0.2, y + 2.8, cz + s + 0.2, 'canvas', { col: false });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) L.box(cx + dx * (s - 0.1) - 0.06, y, cz + dz * (s - 0.1) - 0.06, cx + dx * (s - 0.1) + 0.06, y + 2.6, cz + dz * (s - 0.1) + 0.06, 'wood', { col: false });
  const run = y / 0.34 * 0.45, sw = 1.7;
  if (dir === 'pz') L.stairs(cx, cz + s + run, 'nz', sw, 0, y, run, 'wood');
  else if (dir === 'nz') L.stairs(cx, cz - s - run, 'pz', sw, 0, y, run, 'wood');
  else if (dir === 'px') L.stairs(cx + s + run, cz, 'nx', sw, 0, y, run, 'wood');
  else L.stairs(cx - s - run, cz, 'px', sw, 0, y, run, 'wood');
}
function bunker(L, x0, z0, w, d, doors, m = 'concrete') { // single-storey building with interior; doors {n,s,e,w:[centres]}, flat roof
  (L.flatZones || (L.flatZones = [])).push([x0, z0, x0 + w, z0 + d]);
  const h = 3.2, th = 0.4, x1 = x0 + w, z1 = z0 + d, ops = side => (doors[side] || []).map(D2).concat([]);
  const wins = (a, b, side) => { const r = []; for (let c = a + 2.2; c < b - 1.6; c += 3.6) if (!(doors[side] || []).some(dc => Math.abs(dc - c) < 2.3)) r.push({ c, w: 1.5, y0: 0.85, y1: 2.85 }); return r; };
  wallX2(L, x0, x1, z1 - th / 2, th, 0, h, ops('n').concat(wins(x0, x1, 'n')), m); wallX2(L, x0, x1, z0 + th / 2, th, 0, h, ops('s').concat(wins(x0, x1, 's')), m);
  wallZ2(L, z0 + th, z1 - th, x1 - th / 2, th, 0, h, ops('e').concat(wins(z0, z1, 'e')), m); wallZ2(L, z0 + th, z1 - th, x0 + th / 2, th, 0, h, ops('w').concat(wins(z0, z1, 'w')), m);
  L.box(x0 - 0.25, h, z0 - 0.25, x1 + 0.25, h + 0.3, z1 + 0.25, m);
  L.box(x0 - 0.25, h + 0.3, z0 - 0.25, x1 + 0.25, h + 0.6, z0 + 0.05, m, { col: false }); L.box(x0 - 0.25, h + 0.3, z1 - 0.05, x1 + 0.25, h + 0.6, z1 + 0.25, m, { col: false });
}
function warehouse(L, x0, z0, w, d, o = {}) { // big shed: corrugated walls, roll-up doors, catwalk mezzanine with stairs
  (L.flatZones || (L.flatZones = [])).push([x0, z0, x0 + w, z0 + d]);
  const h = 9, th = 0.35, x1 = x0 + w, z1 = z0 + d, m = 'metalwall', big = c => ({ c, w: 5.5, y0: 0, y1: 4.8 });
  wallX2(L, x0, x1, z1 - th / 2, th, 0, h, (o.n || []).map(big), m); wallX2(L, x0, x1, z0 + th / 2, th, 0, h, (o.s || []).map(big), m);
  wallZ2(L, z0 + th, z1 - th, x1 - th / 2, th, 0, h, (o.e || []).map(big), m); wallZ2(L, z0 + th, z1 - th, x0 + th / 2, th, 0, h, (o.w || []).map(big), m);
  L.box(x0 - 0.4, h, z0 - 0.4, x1 + 0.4, h + 0.3, z1 + 0.4, 'metalwall');
  L.prop('gable', (x0 + x1) / 2, h + 0.3, (z0 + z1) / 2, 1, { w: w + 0.8, d: d + 0.8, h: Math.min(w, d) * 0.12, oh: 0.1, axis: w >= d ? 'x' : 'z', mat: 'metalwall' });
  // mezzanine along the back wall
  const mx0 = o.backX === 'min' ? x0 + th : x1 - th - 4, mx1 = mx0 + 4, my = 4.2, mz0 = z0 + 9, mz1 = z1 - 2;
  L.box(mx0, my - 0.2, mz0, mx1, my, mz1, 'grate');
  L.box(o.backX === 'min' ? mx1 - 0.08 : mx0, my, mz0, o.backX === 'min' ? mx1 : mx0 + 0.08, my + 1.05, mz1, 'metal', { col: false });
  L.box(o.backX === 'min' ? mx1 - 0.1 : mx0, my - 0.2, mz0, o.backX === 'min' ? mx1 : mx0 + 0.1, my + 1.0, mz0 + 0.1, 'metal', { col: false });
  L.stairs((mx0 + mx1) / 2, z0 + 1.2, 'pz', 2.4, 0, my, mz0 - z0 - 1.2, 'grate');
  for (let z = mz0 + 1; z < mz1; z += 3.2) L.box(o.backX === 'min' ? mx1 - 0.05 : mx0, my, z - 0.04, o.backX === 'min' ? mx1 : mx0 + 0.05, my + 1.05, z + 0.04, 'metal', { col: false });
  for (let z = z0 + 5; z < z1 - 3; z += 8) { L.glow((x0 + x1) / 2, h - 0.6, z, 0xfff2d8, 1.4); L.box((x0 + x1) / 2 - 0.9, h - 0.5, z - 0.2, (x0 + x1) / 2 + 0.9, h - 0.4, z + 0.2, 'lampglow', { col: false }); }
  for (let z = z0 + 4; z < z1 - 4; z += 9) L.box(x0 + w * 0.3, h + 0.28, z, x1 - w * 0.3, h + 0.32, z + 2.2, 'skylight', { col: false }); // skylights
  L.box(x0 + th, 0, z0 + th, x1 - th, 0.025, z1 - th, 'pavement', { col: false }); // concrete slab floor
  L.lights.push([(x0 + x1) / 2, h - 1.2, z0 + d * 0.3, 0xfff0d8, 60, 30], [(x0 + x1) / 2, h - 1.2, z0 + d * 0.72, 0xfff0d8, 60, 30]);
}
// ---------------------------------------------------------------- MAP: FREIGHT YARD (CoD-style container port, medium)
function buildFreight(L) {
  L.coverKit = 'yard';
  L.backdrop = 'coast';
  L.postcard = { sx: -1, sz: 1, hk: 0.14, dk: 0.85 };
  L.hills = 2.1; L.hillScale = 26; L.hillRamp = 9;
  const R = seeded(77);
  L.bounds = [-64, -50, 64, 50]; L.ground = 'asphalt'; L.groundScale = 6; L.groundTint = 0xc8c4bc; L.grass = 0; L.big = true; L.noLamps = true;
  L.box(-68, -1, -54, 68, 0, 54, 'floor').noRender = true;
  L.box(-65, 0, -51, 65, 4, -50, 'concrete'); L.box(-65, 0, -50, -64, 4, 48, 'concrete'); L.box(64, 0, -50, 65, 4, 48, 'concrete');
  L.box(-65, 0, 48, 65, 1.2, 49, 'concrete'); L.box(-65, 1.2, 48, 65, 6, 49, 'floor').noRender = true; // quay edge (invisible guard)
  for (let x = -60; x <= 60; x += 8) L.prop('bollard', x, 1.2, 48.5, 1);
  // docked cargo ship beyond the quay
  L.box(-70, -6, 51, 58, 9, 68, 'hull', { col: false }); L.box(-70, 9, 51, 58, 9.4, 68, 'metal', { col: false }); L.box(30, 9.4, 53, 50, 22, 66, 'white', { col: false });
  for (let x = -60; x < 26; x += 13) { container(L, x, 57, 12.2, 'x', 2, undefined, 9.4, false); container(L, x + 1, 62, 12.2, 'x', 1, undefined, 9.4, false); }
  L.water.push([-90, 49, 90, 120, 0.03]);
  warehouse(L, -62, -24, 26, 44, { e: [-12, 10], n: [-49], backX: 'min' });
  warehouse(L, 36, -24, 26, 44, { w: [-12, 10], n: [49], backX: 'max' });
  // container yard: lanes, stacks, climbable single stacks
  const C = [[-22, -32, 12.2, 'x', 1], [-6, -32, 6.1, 'x', 2], [10, -32, 12.2, 'x', 1], [24, -30, 6.1, 'z', 2],
    [-28, -18, 12.2, 'z', 2], [-15, -20, 12.2, 'z', 1], [0, -18, 6.1, 'z', 2], [14, -20, 12.2, 'z', 1], [27, -14, 6.1, 'x', 1],
    [-20, -5, 12.2, 'x', 2], [18, -6, 12.2, 'x', 1], [-3, -7, 6.1, 'x', 1],
    [-18, 7, 12.2, 'x', 1], [20, 6, 12.2, 'x', 2], [3, 7, 6.1, 'x', 1],
    [-27, 16, 6.1, 'x', 1], [-14, 20, 12.2, 'z', 1], [0, 18, 6.1, 'z', 2], [15, 20, 12.2, 'z', 1], [28, 18, 12.2, 'z', 2],
    [-24, 31, 6.1, 'z', 2], [-10, 32, 12.2, 'x', 1], [6, 32, 6.1, 'x', 2], [22, 32, 12.2, 'x', 1]];
  for (const [x, z, len, ax, st] of C) container(L, x, z, len, ax, st);
  // metal stairs up onto four single containers (high ground over the lanes)
  L.stairs(-22, -27.35, 'nz', 2.2, 0, 2.6, 3.4, 'grate'); L.stairs(18, -10.65, 'pz', 2.2, 0, 2.6, 3.4, 'grate');
  L.stairs(-18, 11.65, 'nz', 2.2, 0, 2.6, 3.4, 'grate'); L.stairs(22, 27.35, 'pz', 2.2, 0, 2.6, 3.4, 'grate');
  L.stairs(-3, -2.4, 'nz', 2.2, 0, 2.6, 3.4, 'grate'); L.stairs(3, 2.4, 'pz', 2.2, 0, 2.6, 3.4, 'grate');      // centre pair: hold mid, countered from the stacks
  L.stairs(-28, -4.9, 'nz', 2.2, 0, 5.2, 7, 'grate'); L.stairs(28, 4.9, 'pz', 2.2, 0, 5.2, 7, 'grate');         // up onto the double stacks (power positions)
  // gantry crane straddling the yard
  for (const [x, z] of [[-31, -38], [31, -38], [-31, 38], [31, 38]]) { L.B(x, z, 1.1, 1.1, 22, 0, 'crane'); L.prop('cranewheel', x, 0, z, 1); }
  L.box(-32, 20, -38.6, 32, 22, -37.4, 'crane', { col: false }); L.box(-32, 20, 37.4, 32, 22, 38.6, 'crane', { col: false });
  L.box(-32, 21, -38, -30, 23, 38, 'crane', { col: false }); L.box(30, 21, -38, 32, 23, 38, 'crane', { col: false }); L.box(-6, 17, -4, 6, 21, 4, 'crane', { col: false });
  // south: harbour office (two storeys) + truck lot
  house2(L, -8, -47, 16, 10, { m: 'concrete', roofM: 'tiles', doors: { n: [0], e: [-42], w: [-42] } });
  for (const x of [-28, 26]) { L.B(x, -43, 2.6, 13, 1.25, 0, 'metal'); container(L, x, -44.5, 12.2, 'z', 1, 0x8a8f94, 1.25); L.B(x, -36.6, 2.5, 2.6, 2.9, 0, 'carpaint', { tint: 0xd0d0d0 }); }
  for (const [x, z] of [[-46, -34], [48, 30], [-33, 41], [33, -43]]) { L.B(x, z, 1.4, 2.6, 2.1, 0, 'forklift').noRender = true; L.prop('forklift', x, 0, z, 1, { ry: R() * 6.28 }); }
  for (const [x, z] of [[-34, 0], [34, 0], [-6, 44], [10, -44], [-34, -42], [34, 44], [-2, 0], [0, 26], [0, -26]]) crates(L, x, z, R() < 0.5 ? 2 : 1);
  for (const [x, z, a] of [[-34, 26, 'z'], [34, -26, 'z'], [-8, 40, 'x'], [8, -40, 'x']]) sandbags(L, x, z, 3.6, a);
  for (const [x, z] of [[-34, -46], [34, -46], [-34, 46], [34, 46], [0, 0]]) L.prop('lantern', x, 0, z, 2.2, { ry: R() * 6.28 });
  L.spawn = { x: -50, y: 0, z: 0, yaw: -Math.PI / 2 };
  L.teamSpawns = [[[-50, -14], [-50, -2], [-50, 10], [-44, -18], [-44, 14], [-54, 4], [-46, 30], [-46, -32]], [[50, -14], [50, -2], [50, 10], [44, -18], [44, 14], [54, 4], [46, 30], [46, -32]]];
  L.enemySpawns = L.teamSpawns[1].concat(L.teamSpawns[0], [[0, 40], [0, -40], [-8, 0], [8, 0], [-34, 34], [34, -34]]);
  L.pickups = [['health', 0, 0, 0], ['ammo', 3, 0, 26], ['ammo', -3, 0, -26], ['health', -22, 2.6, -32], ['health', 22, 2.6, 32], ['ammo', -60, 4.2, 5], ['ammo', 60, 4.2, 5], ['health', -34, 0, 12], ['health', 34, 0, -12], ['ammo', 0, 0, 44]];
  L.barrels = [[-34, -8], [34, 8], [-10, -12], [10, 12], [-4, 40], [4, -40]];
}
// ---------------------------------------------------------------- MAP: FIREBASE (Battlefield-style desert outpost, huge)
// ---------------------------------------------------------------- MAP: MERIDIAN (purpose-built competitive 3-lane, mirror-symmetric)
// Lanes: NORTH = raised terrace, long sightline (snipers/DMRs) with a clock-house power position at its heart;
// MIDDLE = walled street through chokepoint gates (with vault windows as the alternate) into a fountain plaza (centre of action);
// SOUTH = chain of market halls (close quarters). Two cross-alleys per side link the lanes for flanks; terrace edges are one-way drops.
function buildMeridian(L) {
  L.coverKit = 'town';
  L.hills = 0; L.backdrop = 'medi'; L.postcard = { hk: 0.34, dk: 1.05 };
  L.bounds = [-50, -34, 50, 34]; L.ground = 'cobble'; L.groundScale = 3; L.groundTint = 0xf2e6d4; L.grass = 0.08; L.noLamps = true; L.smoke = [];
  L.box(-56, -1, -40, 56, 0, 40, 'floor').noRender = true;
  const R = seeded(31337), mats = ['plasterA', 'plasterB', 'sandstone', 'wallP2', 'wallP3'];
  for (const z0 of [34, -38]) for (let x = -54; x < 54; x += 12) solid(L, x, z0, x + 12, z0 + 4, 7 + Math.round(R() * 4), mats[Math.floor(R() * mats.length)], { roof: R() < 0.5 }); // the edges are a real town
  for (const sx of [-1, 1]) solid(L, sx > 0 ? 50 : -54, -34, sx > 0 ? 54 : -50, 34, 10, 'sandstone');
  for (const sx of [-1, 1]) { // ---- one side; the other is its mirror
    const X = (a, b) => sx > 0 ? [a, b] : [-b, -a], mx = v => v * sx, dW = d => sx > 0 ? d : { n: (d.n || []).map(mx), s: (d.s || []).map(mx), e: d.w, w: d.e };
    const H2 = (x0, z0, w, d, o) => { const [a] = X(x0, x0 + w); house2(L, a, z0, w, d, Object.assign({}, o, { doors: dW(o.doors || {}) })); };
    const BK = (x0, z0, w, d, doors, m) => { const [a] = X(x0, x0 + w); bunker(L, a, z0, w, d, dW(doors), m); };
    const SO = (x0, z0, x1, z1, h, m, o) => { const [a, b] = X(x0, x1); solid(L, a, z0, b, z1, h, m, o); };
    // spawn courtyard: a house and a hall shield it from the lanes
    H2(38, 18, 10, 10, { m: 'plasterA', roofM: 'tiles', doors: { s: [43], w: [23] } });
    BK(38, -28, 10, 9, { n: [43], w: [-23.5] }, 'plasterB');
    crates(L, mx(42), 6, 2); crates(L, mx(43), -7, 1); L.prop('palm', mx(46), 0, 13, 1.1); L.B(mx(46), 13, 0.5, 0.5, 4, 0, 'bark').noRender = true; L.prop('palm', mx(46), 0, -14, 1); L.B(mx(46), -14, 0.5, 0.5, 4, 0, 'bark').noRender = true;
    // blocks between the lanes, split by a cross-alley (x 26..29) for flanks
    SO(18, 9, 26, 16, 7, 'plasterB', {}); SO(29, 9, 37, 16, 8, 'plasterA', { roof: true }); SO(18, -16, 26, -9, 8, 'sandstone', { roof: true }); SO(29, -16, 37, -9, 7, 'plasterB', {});
    // MIDDLE: the gate wall is the chokepoint — main arch plus two vault windows as the riskier alternate
    { const x = mx(18); wallZ2(L, -9, 9, x, 0.6, 0, 4.6, [{ c: 0, w: 3.6, y0: 0, y1: 3.4, open: true }, Object.assign(W2(-5.6), { glass: 'broken' }), Object.assign(W2(5.6), { glass: 'broken' })], 'sandstone');
      L.box(Math.min(x, x + sx * 0.01) - 0.4, 4.6, -9.2, Math.max(x, x + sx * 0.01) + 0.4, 4.9, 9.2, 'stone', { col: false }); }
    car(L, mx(27), -3.5, 1, R() < 0.5); sandbags(L, mx(22), 4.5, 3, 'x'); crates(L, mx(33), 3, 1); sandbags(L, mx(34), -4, 3, 'z');
    // NORTH: raised terrace (1.5 m), planters as cover, ramps from the cross-alley, the plaza end and the spawn end
    { const [a, b] = X(10, 37); L.box(a, 0, 19, b, 1.5, 32, 'stone'); L.box(a, 1.5, 32, b, 2.4, 32.6, 'stonewall'); }
    L.stairs(mx(27.5), 16.1, 'pz', 2.4, 0, 1.5, 2.8, 'stone'); L.stairs(mx(6.05), 31, sx > 0 ? 'px' : 'nx', 1.8, 0, 1.5, 3.9, 'stone'); L.stairs(mx(41.5), 30.5, sx > 0 ? 'nx' : 'px', 2.2, 0, 1.5, 4.3, 'stone');
    for (const [x, z] of [[15, 23.5], [21, 28], [26.5, 23], [32.5, 27.5]]) L.B(mx(x), z, 2.6, 1, 0.95, 1.5, 'stonewall');
    for (const x of [14, 24, 34]) { L.prop('palm', mx(x), 1.5, 30.8, 0.9); L.B(mx(x), 30.8, 0.5, 0.5, 4, 1.5, 'bark').noRender = true; }
    // SOUTH: market halls in a chain (doors line up), close quarters inside, a corridor street outside
    BK(10, -31, 12, 12, { n: [16], e: [-25], w: [-25] }, 'plasterA'); BK(24, -31, 12, 12, { n: [30], e: [-25], w: [-25] }, 'sandstone');
    for (const [x, z] of [[14, -27], [18, -22], [28, -28], [32, -23]]) crates(L, mx(x), z, 1);
    L.B(mx(16), -24.5, 3.2, 1, 1.0, 0, 'planks'); L.B(mx(30), -26, 1, 3.2, 1.0, 0, 'planks'); // counters to fight around
    sandbags(L, mx(23), -17.5, 3, 'x');
  }
  // shared centre: plaza (centre of action) + clock house (power position) + centre hall
  L.octo(0, 0, 2.8, 0.85, 'stone'); L.B(0, 0, 0.9, 0.9, 3.4, 0.85, 'stone'); L.water.push([-2.2, -2.2, 2.2, 2.2, 0.75]);
  for (const [x, z] of [[-9, -5], [9, 5], [-9, 5.5], [9, -5.5]]) L.B(x, z, 2.6, 1, 1.0, 0, 'stonewall');
  const stall = (x, z, ry, c) => { L.B(x, z, 1.5, 1.5, 0.9, 0, 'planks').noRender = true; L.prop('stall', x, 0, z, 1, { ry, c }); };
  stall(-4.5, 7.2, 0, 0xb33a3a); stall(4.5, -7.2, Math.PI, 0x2f6fae); stall(13, 7, 1.57, 0x3f8f4a); stall(-13, -7, -1.57, 0xd98a2b);
  car(L, 12, -4, 0, true); car(L, -12, 4, 0, true);
  house2(L, -6, 19, 12, 11, { m: 'sandstone', roofM: 'tiles', doors: { s: [-2.5, 2.5], e: [24.5], w: [24.5] } });
  L.prop('chimney', 4, 8.2, 26, 1, { h: 3 }); L.glow(0, 5.2, 18.7, 0xfff0c0, 1.1);
  bunker(L, -6, -31, 12, 12, { n: [0], e: [-25], w: [-25] }, 'plasterB');
  for (const [x, z] of [[-16, 10], [16, -10], [-16, -10], [16, 10]]) L.prop('lantern', x, 0, z, 1);
  L.spawn = { x: -44, y: 0, z: 0, yaw: -Math.PI / 2 };
  L.teamSpawns = [[[-44, 0], [-44, -8], [-44, 8], [-42, 12], [-42, -12], [-46, 4]], [[44, 0], [44, 8], [44, -8], [42, -12], [42, 12], [46, -4]]];
  L.enemySpawns = L.teamSpawns[1].concat(L.teamSpawns[0], [[0, -14], [0, 14], [-28, 0], [28, 0]]);
  L.pickups = [['health', 0, 0, -11.5], ['ammo', 0, 0, 11.5], ['ammo', 22, 1.5, 26], ['ammo', -22, 1.5, 26], ['health', 16, 0, -25], ['health', -16, 0, -25], ['health', 0, 3.65, 26]];
  L.barrels = [[24, 6], [-24, -6], [14, -19], [-14, 19]];
}
// ---------------------------------------------------------------- MAP: OASIS (golden-hour desert oasis: pond, caravanserai fort, mud-brick village, dunes)
function buildOasis(L) {
  L.coverKit = 'mil';
  L.edge = 'berm'; L.edgeBerm = 5; L.edgeW = 13; L.rockC = 0xc8a882;
  L.hills = 4.2; L.hillScale = 30; L.hillRamp = 10; L.backdrop = 'desert'; L.postcard = { hk: 0.26 };
  const R = seeded(7777);
  L.bounds = [-72, -56, 72, 56]; L.ground = 'sand'; L.groundScale = 5; L.groundTint = 0xf6dcb8; L.grass = 0; L.big = true; L.noLamps = true; L.smoke = [];
  L.box(-76, -1, -60, 76, 0, 60, 'floor').noRender = true;
  for (const [a, b, c, d] of [[-73, -57, 73, -56], [-73, 56, 73, 57], [-73, -56, -72, 56], [72, -56, 73, 56]]) L.box(a, 0, b, c, 9, d, 'cliff', { tint: 0xd8b48c });
  // ---- the oasis: a palm-ringed pond with reeds, stepping stones and a ruined well house
  L.water.push([-10, -6, 10, 6, 0.06]);
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.28 + R() * 0.2, rx = 12 + R() * 3, rz = 8 + R() * 2.5, x = Math.cos(a) * rx, z = Math.sin(a) * rz; L.prop('palm', x, 0, z, 0.9 + R() * 0.5); L.B(x, z, 0.5, 0.5, 4, 0, 'bark').noRender = true; }
  for (let i = 0; i < 26; i++) { const a = R() * 6.28, x = Math.cos(a) * (9 + R() * 2), z = Math.sin(a) * (5.5 + R() * 1.5); L.prop('reeds', x, 0, z, 0.8 + R() * 0.5); }
  for (const [x, z] of [[-3, -1], [-1, 0.6], [1.4, -0.4], [3.5, 0.8]]) L.B(x, z, 1.1, 1.1, 0.35, 0, 'stone');
  L.prop('well', 14, 0, -12); L.B(14, -12, 1.8, 1.8, 1, 0, 'stonewall').noRender = true;
  // ---- caravanserai (north): high walls, two gates, corner towers you can climb, a rampart walk with a parapet
  const fx0 = -16, fz0 = 20, fx1 = 16, fz1 = 46, fh = 6, ft = 1;
  wallX2(L, fx0, fx1, fz0 + ft / 2, ft, 0, fh, [{ c: 0, w: 4, y0: 0, y1: 4.4, open: true }], 'sandstone');
  wallX2(L, fx0, fx1, fz1 - ft / 2, ft, 0, fh, [{ c: 4, w: 3.2, y0: 0, y1: 3.6, open: true }], 'sandstone');
  wallZ2(L, fz0 + ft, fz1 - ft, fx0 + ft / 2, ft, 0, fh, [{ c: 33, w: 1.5, y0: 2.4, y1: 4.4 }], 'sandstone'); wallZ2(L, fz0 + ft, fz1 - ft, fx1 - ft / 2, ft, 0, fh, [{ c: 33, w: 1.5, y0: 2.4, y1: 4.4 }], 'sandstone');
  L.box(fx0 - 0.15, fh, fz0 - 0.15, fx1 + 0.15, fh + 0.3, fz0 + ft + 0.15, 'stone', { col: false }); L.box(fx0 - 0.15, fh, fz1 - ft - 0.15, fx1 + 0.15, fh + 0.3, fz1 + 0.15, 'stone', { col: false });
  L.box(fx0 + ft, 3.4, fz1 - ft - 2.2, fx1 - ft, 3.7, fz1 - ft, 'planks'); L.box(fx0 + ft, 3.7, fz1 - ft - 2.25, fx1 - ft, 4.7, fz1 - ft - 2.1, 'sandstone'); // north rampart + parapet
  L.stairs(fx1 - ft - 1, fz1 - ft - 2.2 - 4.2, 'pz', 1.8, 0, 3.7, 4.2, 'sandstone'); L.stairs(fx0 + ft + 1, fz1 - ft - 2.2 - 4.2, 'pz', 1.8, 0, 3.7, 4.2, 'sandstone');
  for (const x of [-9, -3, 3, 9]) { L.B(x, 27, 1, 1, 3.2, 0, 'sandstone'); L.B(x, 27, 1.4, 1.4, 0.4, 3.2, 'stone'); } L.box(-9.7, 3.6, 26.3, 9.7, 3.9, 27.7, 'sandstone'); // arcade
  for (const [x, z, n] of [[-6, 32, 2], [7, 35, 1], [-11, 39, 1], [10, 30, 2], [0, 38, 1]]) crates(L, x, z, n);
  L.B(-2, 33, 3, 1.4, 1, 0, 'stonewall'); L.B(4, 41, 1.4, 3, 1, 0, 'stonewall'); // courtyard troughs = waist cover
  stairTower(L, fx0 - 5, fz1 - 6, 6, 'castle'); stairTower(L, fx1 - 1, fz0 - 1, 6, 'castle');
  // ---- mud-brick village (south): enterable two-storey houses and flat-roofed homes around a market
  house2(L, -40, -36, 10, 9, { m: 'plasterA', roofM: 'tiles', doors: { n: [-35], e: [-31.5] } });
  house2(L, -22, -44, 9, 9, { m: 'sandstone', roofM: 'tiles', doors: { n: [-17.5], w: [-39.5] } });
  house2(L, 18, -40, 10, 9, { m: 'plasterB', roofM: 'tiles', doors: { n: [23], w: [-35.5] } });
  house2(L, 36, -30, 9, 10, { m: 'plasterA', roofM: 'tiles', doors: { w: [-25], s: [40.5] } });
  bunker(L, -8, -50, 14, 8, { n: [-1] }, 'plasterB'); bunker(L, 40, -50, 12, 8, { n: [46], w: [-46] }, 'plasterA');
  bunker(L, -58, -20, 10, 12, { e: [-14], n: [-53] }, 'sandstone'); bunker(L, 50, 6, 12, 10, { w: [11], s: [56] }, 'plasterB');
  L.stairs(-52, -24.7, 'pz', 1.8, 0, 3.5, 4.7, 'sandstone'); L.stairs(45.3, 14, 'px', 1.8, 0, 3.5, 4.7, 'plasterB'); // flat roofs you can climb
  const awn = [0xc04a2a, 0x2f6fae, 0x3f8f4a, 0xd98a2b, 0x8a4ab0];
  [[-6, -24, 1], [2, -26, 1], [10, -23, 0], [-12, -30, 0], [6, -33, 1]].forEach(([cx, cz, r], i) => { const w = r ? 3.4 : 1, d = r ? 1 : 3.4, aw = r ? 4 : 2.6, ad = r ? 2.6 : 4;
    L.B(cx, cz, w, d, 1.1, 0, 'planks'); L.B(cx, cz, aw, ad, 0.1, 2.7, 'cloth', { col: false, tint: awn[i] }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.B(cx + sx * (aw / 2 - 0.1), cz + sz * (ad / 2 - 0.1), 0.12, 0.12, 2.7, 0, 'planks', { col: false }); });
  for (const [x, z, ry] of [[-26, -22, 0.4], [28, -18, 2.2]]) { L.prop('cart', x, 0, z, 1, { ry }); L.B(x, z, 1.8, 2.8, 1.2, 0, 'wood').noRender = true; }
  // ---- west ruins & east rocky ridge
  for (const [x0, z0, x1, z1] of [[-62, 14, -50, 26], [-46, 30, -36, 40], [-64, -46, -54, -36]]) ruin(L, x0, z0, x1, z1, R);
  watchtower(L, -40, 12, 'nx'); watchtower(L, 40, -12, 'px'); // flank-lane overwatch, each countered from the caravanserai towers & village roofs
  for (let i = 0; i < 12; i++) { const x = 52 + R() * 16, z = -40 + R() * 80, w = 3 + R() * 6, d = 3 + R() * 6, h = 1.2 + R() * 4; if (Math.abs(z - 11) < 8 && x < 63) continue; L.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, 'cliff', { tint: 0xd8b48c }); L.prop('rock', x, h, z, 1 + R(), { sy: 0.5 }); }
  for (const [x, z, a] of [[-30, 4, 'z'], [30, -4, 'z'], [-20, 14, 'x'], [22, 12, 'x'], [-44, -8, 'x'], [44, 22, 'z']]) sandbags(L, x, z, 4, a);
  for (const [x, z, ry] of [[-30, 26, 0.8], [34, 40, 2.4]]) { const k = Math.round(ry / (Math.PI / 2)); L.B(x, z, k % 2 ? 7 : 3.6, k % 2 ? 3.6 : 7, 2.4, 0, 'carpaint').noRender = true; L.prop('tank', x, 0, z, 1, { ry: k * (Math.PI / 2) }); }
  for (let i = 0; i < 30; i++) { const x = (R() - 0.5) * 130, z = (R() - 0.5) * 100; if (Math.hypot(x, z) < 16 || (Math.abs(x) < 18 && z > 18 && z < 48)) continue; L.prop('rock', x, 0, z, 0.6 + R(), { sy: 0.4 + R() * 0.5, c: 0xc8a882 }); }
  for (const [x, z] of [[-24, 4], [24, -6], [0, 16], [-8, -14]]) L.prop('palm', x, 0, z, 1.1), L.B(x, z, 0.5, 0.5, 4, 0, 'bark').noRender = true;
  L.spawn = { x: -64, y: 0, z: 0, yaw: -Math.PI / 2 };
  L.teamSpawns = [[[-64, 0], [-64, -8], [-64, 8], [-60, 34], [-60, -30], [-56, 0]], [[64, 0], [64, -12], [64, 14], [46, 32], [60, -36], [56, 0]]];
  L.enemySpawns = L.teamSpawns[1].concat(L.teamSpawns[0], [[0, 40], [0, -40], [-30, -10], [30, 10], [0, 14], [0, -14]]);
  L.pickups = [['health', 0, 0, 33], ['ammo', 0, 0, -28], ['health', -40, 0, 0], ['ammo', 40, 0, 0], ['health', 16, 0, -12], ['ammo', -16, 0, 12], ['health', 0, 3.7, 43.5], ['ammo', -50, 0, -40]];
  L.barrels = [[-12, -18], [12, 20], [-36, 18], [36, -12], [-20, 30], [20, -32]];
}
function buildFirebase(L) {
  L.coverKit = 'mil'; L.coverGap = 9;
  L.edge = 'berm'; L.edgeBerm = 6; L.edgeW = 16; L.rockC = 0xc8ac88;
  L.hills = 5.5; L.hillScale = 38; L.hillRamp = 11;
  const R = seeded(4242);
  L.bounds = [-100, -90, 100, 90]; L.ground = 'sand'; L.groundScale = 5; L.groundTint = 0xf2e2c4; L.grass = 0; L.big = true; L.noLamps = true; L.smoke = [];
  L.box(-104, -1, -94, 104, 0, 94, 'floor').noRender = true;
  for (const [a, b, c, d] of [[-101, -91, 101, -90], [-101, 90, 101, 91], [-101, -90, -100, 90], [100, -90, 101, 90]]) L.box(a, 0, b, c, 10, d, 'cliff', { tint: 0xd8c0a0 });
  // ---- the compound: HESCO perimeter with four gates
  const X0 = -38, X1 = 38, Z0 = -32, Z1 = 32, g = 4;
  hesco(L, X0, Z0, -g, Z0 + 1.1); hesco(L, g, Z0, X1, Z0 + 1.1); hesco(L, X0, Z1 - 1.1, -g, Z1); hesco(L, g, Z1 - 1.1, X1, Z1);
  hesco(L, X0, Z0 + 1.1, X0 + 1.1, -g); hesco(L, X0, g, X0 + 1.1, Z1 - 1.1); hesco(L, X1 - 1.1, Z0 + 1.1, X1, -g); hesco(L, X1 - 1.1, g, X1, Z1 - 1.1);
  hesco(L, -20, Z0, -17, Z0 + 1.1, 1.1); hesco(L, 17, Z1 - 1.1, 20, Z1, 1.1); // knee-high breaches you can vault
  for (const [x, z] of [[-g - 0.6, Z0 - 2], [g + 0.6, Z0 - 2], [-g - 0.6, Z1 + 2], [g + 0.6, Z1 + 2]]) L.B(x, z, 0.6, 0.6, 3, 0, 'hesco');
  watchtower(L, X0 + 4, Z0 + 4, 'pz'); watchtower(L, X1 - 4, Z0 + 4, 'pz'); watchtower(L, X0 + 4, Z1 - 4, 'nz'); watchtower(L, X1 - 4, Z1 - 4, 'nz');
  // command post (two storeys), barracks, motor pool
  house2(L, -30, -24, 16, 12, { m: 'concrete', roofM: 'tiles', doors: { n: [-26, -18], e: [-18], s: [-22] } });
  bunker(L, 10, -26, 18, 9, { n: [14, 24], w: [-21.5] }); bunker(L, 10, 17, 18, 9, { s: [14, 24], e: [21.5] }); bunker(L, -28, 14, 12, 9, { s: [-22], e: [18.5] });
  L.stairs(32.7, -18.5, 'nx', 1.8, 0, 3.5, 4.7, 'concrete'); L.stairs(32.7, 18.5, 'nx', 1.8, 0, 3.5, 4.7, 'concrete'); L.stairs(-32.7, 21, 'px', 1.8, 0, 3.5, 4.7, 'concrete'); // bunker roofs = mid-height positions
  // helipad + downed helicopter
  L.box(-7, 0, -7, 7, 0.06, 7, 'concrete', { col: false }); L.box(-0.3, 0.06, -4, 0.3, 0.07, 4, 'white', { col: false }); L.box(-3, 0.06, -0.3, 3, 0.07, 0.3, 'white', { col: false });
  L.B(2, 1, 3, 9, 2.6, 0, 'carpaint', { tint: 0x5a5f48 }).noRender = true; L.prop('heli', 2, 0, 1, 1, { ry: 0.35 }); L.glow(1.5, 2.2, 3, 0xff8030, 2, true); L.smoke.push([1.5, 2.6, 3]);
  // fuel farm & comms mast
  for (const [x, z] of [[-30, -4], [-24, -4]]) { L.B(x, z, 3.2, 3.2, 3.2, 0, 'fuel').noRender = true; L.prop('fueltank', x, 0, z, 1); }
  L.B(28, 0, 1.2, 1.2, 24, 0, 'crane').noRender = true; L.prop('mast', 28, 0, 0, 1);
  for (const [x, z, rot] of [[-12, 22, 1], [-4, 22, 1], [22, 6, 0], [26, -8, 0]]) car(L, x, z, rot, false);
  for (const [x, z, a] of [[-8, -26, 'x'], [8, 26, 'x'], [-32, 8, 'z'], [32, -8, 'z'], [0, -12, 'x'], [0, 12, 'x'], [-14, 0, 'z'], [14, 0, 'z']]) sandbags(L, x, z, 4, a);
  for (const [x, z] of [[-16, -12], [16, 12], [-6, 28], [6, -28], [-34, -16], [34, 16]]) crates(L, x, z, R() < 0.5 ? 2 : 1);
  // ---- west: shelled village
  for (const [x0, z0, w, d] of [[-86, -48, 14, 11], [-70, -16, 12, 10], [-88, 14, 14, 11], [-72, 40, 12, 10]]) house2(L, x0, z0, w, d, { m: pick(['plasterA', 'plasterB', 'sandstone']), roofM: 'tiles', doors: { n: [x0 + w / 2], s: [x0 + w * 0.3], e: [z0 + d / 2], w: [z0 + d / 2] } });
  for (const [x0, z0, x1, z1] of [[-90, -24, -78, -14], [-66, -42, -54, -30], [-62, 12, -50, 24], [-90, 34, -80, 46], [-66, 58, -52, 70], [-88, -70, -76, -60]]) ruin(L, x0, z0, x1, z1, R);
  for (const [x, z] of [[-60, 0], [-80, 0], [-74, 28], [-78, -36]]) { L.prop('palm', x, 0, z, rand(0.9, 1.2)); L.B(x, z, 0.5, 0.5, 4, 0, 'bark').noRender = true; }
  // ---- east: rocky ridge with a fighting position
  for (let i = 0; i < 16; i++) { const x = 56 + R() * 36, z = -70 + R() * 140, w = 3 + R() * 7, d = 3 + R() * 7, h = 1.2 + R() * 5; L.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, 'cliff', { tint: 0xd8bc98 }); for (let k = 0; k < 3; k++) L.prop('rock', x + rand(-w, w) * 0.6, 0, z + rand(-d, d) * 0.6, rand(1.2, 2.4), { sy: rand(0.5, 1.1), c: 0xc8ac88 }); }
  bunker(L, 66, -6, 10, 8, { w: [-2], s: [70] }, 'sandstone');
  watchtower(L, -58, -56, 'pz'); watchtower(L, 58, 56, 'nz'); // desert lane overwatch towers (counter: compound towers, wrecks)
  // ---- open desert: wrecks, berms and nests
  for (const [x, z, ry] of [[-24, -58, 0.4], [30, 60, 2.1], [52, -50, 1.2], [-46, 62, 2.8], [12, -74, 0.2]]) { const k = Math.round(ry / (Math.PI / 2)); L.B(x, z, k % 2 ? 7 : 3.6, k % 2 ? 3.6 : 7, 2.4, 0, 'carpaint').noRender = true; L.prop('tank', x, 0, z, 1, { ry: k * (Math.PI / 2) }); if (R() < 0.6) { L.glow(x, 2.6, z, 0xff7a20, 1.6, true); L.smoke.push([x, 2.8, z]); } }
  for (const [x, z, a] of [[0, -50, 'x'], [0, 50, 'x'], [-30, -44, 'x'], [30, 44, 'x'], [44, -20, 'z'], [-46, 20, 'z'], [40, -64, 'x'], [-36, 72, 'x']]) sandbags(L, x, z, 5, a);
  for (const [x, z, w, d] of [[-14, -66, 14, 1.6], [18, 70, 14, 1.6], [46, 40, 1.6, 12], [-50, -34, 1.6, 12]]) L.B(x, z, w, d, 1.3, 0, 'hesco');
  for (let i = 0; i < 30; i++) { const x = (R() - 0.5) * 180, z = (R() - 0.5) * 160; if (Math.abs(x) < 44 && Math.abs(z) < 38) continue; L.prop('rock', x, 0, z, rand(0.6, 1.6), { sy: rand(0.4, 0.9), c: 0xc8ac88 }); }
  for (const [x, z] of [[-g - 1.5, Z0 - 1], [g + 1.5, Z1 + 1], [X0 - 1, -6], [X1 + 1, 6]]) L.prop('lantern', x, 0, z, 2, { ry: R() * 6 });
  mountains(L, [0xb89a76, 0xa88a68, 0xc8aa84], false);
  L.spawn = { x: 0, y: 0, z: 82, yaw: 0 };
  L.teamSpawns = [[[-40, 82], [-20, 84], [0, 82], [20, 84], [40, 82], [-60, 80], [60, 80], [0, 74]], [[-40, -82], [-20, -84], [0, -82], [20, -84], [40, -82], [-60, -80], [60, -80], [0, -74]]];
  L.enemySpawns = L.teamSpawns[1].concat(L.teamSpawns[0], [[-80, -4], [-56, 30], [80, 30], [80, -30], [0, -20], [0, 20], [-20, 0], [20, 0]]);
  L.pickups = [['health', 0, 0, -18], ['ammo', 0, 0, 18], ['health', -22, 0, 2], ['ammo', 22, 0, -2], ['health', -78, 0, 0], ['ammo', 74, 0, 20], ['health', 0, 0, -60], ['ammo', 0, 0, 60], ['health', -34, 4.5, -28], ['ammo', 34, 4.5, 28]];
  L.barrels = [[-20, -8], [20, 8], [-26, 4], [6, -20], [-60, -10], [46, -4]];
}

// ---------------------------------------------------------------- MAP: BAZAAR (dense MW2-style market district, organic alleys)
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1), 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
function polyDist(px, pz, pts) { let d = 1e9; for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(px, pz, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return d; }
// facade detail on one exposed face of a building block: shopfronts, windows, shutters, balconies, AC units, signs, posters
function facade(L, R, x0, z0, x1, z1, h, side) {
  const along = side === 'n' || side === 's', a0 = along ? x0 : z0, a1 = along ? x1 : z1, fixed = side === 'n' ? z1 : side === 's' ? z0 : side === 'e' ? x1 : x0, out = side === 'n' || side === 'e' ? 1 : -1;
  const B = (c0, c1, y0, y1, d0, d1, m, o) => { const f0 = fixed + out * d0, f1 = fixed + out * d1; return along ? L.box(c0, y0, Math.min(f0, f1), c1, y1, Math.max(f0, f1), m, Object.assign({ col: false }, o)) : L.box(Math.min(f0, f1), y0, c0, Math.max(f0, f1), y1, c1, m, Object.assign({ col: false }, o)); };
  const len = a1 - a0, floors = Math.round(h / 3.2), awn = [0xb33a3a, 0x2f6fae, 0x3f8f4a, 0xd98a2b, 0x8a4ab0, 0xc8b050];
  for (let f = 0; f < floors; f++) {
    const y = f * 3.2, n = Math.max(1, Math.floor(len / 2.6));
    for (let k = 0; k < n; k++) {
      const c = a0 + (k + 0.5) * len / n, r = R();
      if (f === 0) {
        if (r < 0.45) { B(c - 1.1, c + 1.1, 0, 2.5, -0.02, 0.06, 'shutter'); B(c - 1.2, c + 1.2, 2.5, 2.7, 0, 0.1, 'metal'); if (R() < 0.6) B(c - 1.3, c + 1.3, 2.75, 2.85, 0, 1.2, 'cloth', { tint: awn[Math.floor(R() * awn.length)] }); }
        else if (r < 0.7) { B(c - 0.55, c + 0.55, 0, 2.2, -0.02, 0.04, 'dark'); B(c - 0.7, c + 0.7, 2.2, 2.35, 0, 0.08, 'stone'); }
        if (R() < 0.35) B(c - 0.9, c + 0.9, 2.95, 3.5, 0, 0.08, 'sign', { tint: awn[Math.floor(R() * awn.length)] });
        if (R() < 0.3) B(c - 0.3, c + 0.25, 1.1, 1.75, 0, 0.012, 'poster', { tint: [0xf0e0c0, 0xd0a080, 0xe8e8e0, 0xc06050][Math.floor(R() * 4)] });
      } else if (r < 0.82) {
        B(c - 0.5, c + 0.5, y + 0.9, y + 2.2, -0.02, 0.03, R() < 0.35 ? 'carglass' : 'dark'); B(c - 0.6, c + 0.6, y + 0.82, y + 0.92, 0, 0.12, 'stone');
        if (R() < 0.35) { const sc = [0x3f6f5a, 0x7a3a2a, 0x2f5f8a, 0x8a7a4a][Math.floor(R() * 4)]; B(c - 0.98, c - 0.52, y + 0.9, y + 2.2, 0, 0.05, 'planks', { tint: sc }); B(c + 0.52, c + 0.98, y + 0.9, y + 2.2, 0, 0.05, 'planks', { tint: sc }); }
        if (R() < 0.16) { B(c - 0.9, c + 0.9, y - 0.05, y + 0.1, 0, 0.85, 'concrete'); B(c - 0.9, c + 0.9, y + 0.1, y + 1.0, 0.8, 0.85, 'metal'); B(c - 0.9, c - 0.85, y + 0.1, y + 1.0, 0, 0.85, 'metal'); B(c + 0.85, c + 0.9, y + 0.1, y + 1.0, 0, 0.85, 'metal'); }
        else if (R() < 0.22) { B(c - 0.38, c + 0.38, y + 0.3, y + 0.82, 0, 0.42, 'acunit'); }
      }
    }
    if (f > 0) B(a0, a1, y - 0.06, y + 0.06, 0, 0.05, 'stone');
  }
  if (R() < 0.5) { const c = R() < 0.5 ? a0 + 0.15 : a1 - 0.15; B(c - 0.05, c + 0.05, 0, h, 0, 0.1, 'metal'); } // drainpipe
}
function buildBazaar(L) {
  L.coverKit = 'town';
  L.edge = 'town';
  L.backdrop = 'dusty';
  L.hills = 4.6; L.hillScale = 22; L.hillFlat = 0.9; L.hillRamp = 6;
  const R = seeded(9001);
  L.bounds = [-70, -54, 70, 54]; L.ground = 'dirtroad'; L.groundScale = 4; L.groundTint = 0xf0e6d8; L.grass = 0; L.big = true; L.noLamps = true; L.smoke = [];
  L.box(-74, -1, -58, 74, 0, 58, 'floor').noRender = true;
  for (const [a, b, c, d] of [[-71, -55, 71, -54], [-71, 54, 71, 55], [-71, -54, -70, 54], [70, -54, 71, 54]]) L.box(a, 0, b, c, 12, d, 'wallP1', { tint: 0xd8c8b0 });
  const ALLEYS = [
    { w: 7.5, p: [[-72, -4], [-50, 0], [-30, -7], [-12, -3], [6, 3], [24, -2], [44, 4], [72, 0]] },   // market street
    { w: 4.6, p: [[-40, -56], [-37, -30], [-30, -7], [-34, 14], [-27, 33], [-33, 56]] },
    { w: 4.2, p: [[10, -56], [3, -33], [6, 3], [15, 21], [9, 40], [14, 56]] },
    { w: 4.6, p: [[42, -56], [47, -26], [44, 4], [51, 27], [45, 56]] },
    { w: 4.0, p: [[-72, 31], [-50, 26], [-27, 33], [-6, 29], [15, 21], [33, 30], [51, 27], [72, 34]] },
    { w: 4.0, p: [[-72, -33], [-52, -29], [-37, -30], [-14, -37], [3, -33], [26, -27], [47, -26], [72, -31]] },
    { w: 3.0, p: [[-58, -54], [-56, -40], [-52, -29]] }, { w: 3.0, p: [[-14, -37], [-18, -20], [-12, -3]] }, { w: 3.2, p: [[24, -2], [27, -14], [26, -27]] },
    { w: 3.0, p: [[-50, 0], [-54, 14], [-50, 26]] }, { w: 3.0, p: [[-6, 29], [-9, 44], [-4, 55]] }, { w: 3.2, p: [[60, 1], [62, 16], [58, 29]] }];
  const PLAZAS = [[-12, -3, 9.5], [33, 30, 7], [-52, -29, 5.5], [24, -2, 5]];
  const cs = 4, nx = 34, nz = 26, gx0 = -68, gz0 = -52, open = [], H = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const cx = gx0 + (i + 0.5) * cs, cz = gz0 + (j + 0.5) * cs; let o = false;
    for (const a of ALLEYS) if (polyDist(cx, cz, a.p) < a.w / 2 + 1.6) { o = true; break; }
    for (const [px, pz, pr] of PLAZAS) if (Math.hypot(cx - px, cz - pz) < pr + 1.5) o = true;
    open.push(o); H.push(0);
  }
  const isOpen = (i, j) => i < 0 || j < 0 || i >= nx || j >= nz || open[j * nx + i];
  const cellB = (i, j) => [gx0 + i * cs, gz0 + j * cs, gx0 + (i + 1) * cs, gz0 + (j + 1) * cs];
  // a few enterable two-storey houses (2x2 cells) fronting an alley
  const used = new Set(); let houses = 0;
  for (let t = 0; t < 400 && houses < 9; t++) {
    const i = 1 + Math.floor(R() * (nx - 3)), j = 1 + Math.floor(R() * (nz - 3)), cells = [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]];
    if (cells.some(([a, b]) => isOpen(a, b) || used.has(a + ',' + b))) continue;
    const [x0, z0] = cellB(i, j), x1 = x0 + 2 * cs, z1 = z0 + 2 * cs, doors = {};
    if (isOpen(i, j + 2) || isOpen(i + 1, j + 2)) doors.n = [x0 + (isOpen(i, j + 2) ? 2 : 6)]; if (isOpen(i, j - 1) || isOpen(i + 1, j - 1)) doors.s = [x0 + (isOpen(i, j - 1) ? 2 : 6)];
    if (isOpen(i + 2, j) || isOpen(i + 2, j + 1)) doors.e = [z0 + (isOpen(i + 2, j) ? 2 : 6)]; if (isOpen(i - 1, j) || isOpen(i - 1, j + 1)) doors.w = [z0 + (isOpen(i - 1, j) ? 2 : 6)];
    if (!Object.keys(doors).length) continue;
    cells.forEach(([a, b]) => { used.add(a + ',' + b); H[b * nx + a] = -1; });
    house2(L, x0 + 0.1, z0 + 0.1, 2 * cs - 0.2, 2 * cs - 0.2, { m: pick(['wallP2', 'wallP3', 'plasterA']), roofM: 'tiles', doors }); houses++;
  }
  // packed building masses with stepped rooflines
  const walls = ['wallP1', 'wallP2', 'wallP3', 'plasterA', 'plasterB', 'brickW', 'concrete'], tints = [0xffffff, 0xf2e6d0, 0xe8d8c0, 0xd8e0e8, 0xf0d8c8, 0xe0e8d8, 0xf4ecd8];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (isOpen(i, j) || H[j * nx + i] < 0) continue;
    const r = R(), hn = (Math.sin(i * 0.7) + Math.cos(j * 0.55)) * 0.5, floors = clamp(Math.round(1.6 + hn + r * 1.6), 1, 4), h = floors * 3.2; H[j * nx + i] = h;
    const [x0, z0, x1, z1] = cellB(i, j), m = walls[Math.floor(R() * walls.length)], tn = tints[Math.floor(R() * tints.length)];
    const jx0 = isOpen(i - 1, j) ? R() * 0.5 : 0, jx1 = isOpen(i + 1, j) ? R() * 0.5 : 0, jz0 = isOpen(i, j - 1) ? R() * 0.5 : 0, jz1 = isOpen(i, j + 1) ? R() * 0.5 : 0;
    const bx0 = x0 + jx0, bx1 = x1 - jx1, bz0 = z0 + jz0, bz1 = z1 - jz1;
    L.box(bx0, 0, bz0, bx1, h, bz1, m, { tint: tn });
    L.box(bx0 - 0.08, h, bz0 - 0.08, bx1 + 0.08, h + 0.12, bz1 + 0.08, 'concrete', { tint: 0xd8d0c0 }); // roof slab lip
    for (const [side, ok] of [['n', isOpen(i, j + 1)], ['s', isOpen(i, j - 1)], ['e', isOpen(i + 1, j)], ['w', isOpen(i - 1, j)]]) if (ok) facade(L, R, bx0, bz0, bx1, bz1, h, side);
  }
  // rooftop parapets where a roof edge drops into an alley, and outdoor staircases up to single-storey roofs
  let stairs = 0, rstairs = 0; const busy = new Set(), rlinks = [], street = new Set(); const openIn = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && open[j * nx + i]; // stairs never start outside the map
  const Hh = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz ? 0 : H[j * nx + i]);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { // rooftop stairs: climb from a roof onto the next storey up
    const h = Hh(i, j); if (h <= 0 || h > 7 || rstairs >= 34 || R() > 0.45) continue; const [x0, z0, x1, z1] = cellB(i, j), y = h + 0.12;
    if (Math.abs(Hh(i + 1, j) - h - 3.2) < 0.1) { const nb = L.boxes.length; if (!L.stairs(x0 + 0.3, (z0 + z1) / 2, 'px', 1.7, y, y + 3.2, 3.6, 'concrete')) { } else { busy.add(i + ',' + j); rstairs++; } if (L.boxes.length > nb) rlinks.push([i, j, i + (1), j + (0), L.boxes.slice(nb), L.links[L.links.length - 1]]); }
    else if (Math.abs(Hh(i, j + 1) - h - 3.2) < 0.1) { const nb = L.boxes.length; if (!L.stairs((x0 + x1) / 2, z0 + 0.3, 'pz', 1.7, y, y + 3.2, 3.6, 'concrete')) { } else { busy.add(i + ',' + j); rstairs++; } if (L.boxes.length > nb) rlinks.push([i, j, i + (0), j + (1), L.boxes.slice(nb), L.links[L.links.length - 1]]); }
    else if (Math.abs(Hh(i - 1, j) - h - 3.2) < 0.1) { const nb = L.boxes.length; if (!L.stairs(x1 - 0.3, (z0 + z1) / 2, 'nx', 1.7, y, y + 3.2, 3.6, 'concrete')) { } else { busy.add(i + ',' + j); rstairs++; } if (L.boxes.length > nb) rlinks.push([i, j, i + (-1), j + (0), L.boxes.slice(nb), L.links[L.links.length - 1]]); }
    else if (Math.abs(Hh(i, j - 1) - h - 3.2) < 0.1) { const nb = L.boxes.length; if (!L.stairs((x0 + x1) / 2, z1 - 0.3, 'nz', 1.7, y, y + 3.2, 3.6, 'concrete')) { } else { busy.add(i + ',' + j); rstairs++; } if (L.boxes.length > nb) rlinks.push([i, j, i + (0), j + (-1), L.boxes.slice(nb), L.links[L.links.length - 1]]); }
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const h = H[j * nx + i]; if (h <= 0) continue; const [x0, z0, x1, z1] = cellB(i, j);
    if (h <= 3.3 && stairs < 30 && R() < 0.6) { // street stairs up the side wall onto a single-storey roof
      if (openIn(i - 1, j) && openIn(i - 2, j) && L.stairs(x0 - 3.6, z1 - 1.05, 'px', 1.7, 0, h + 0.12, 3.6, 'concrete', true)) { stairs++; busy.add(i + ',' + j); street.add(j * nx + i); continue; }
      if (openIn(i, j - 1) && openIn(i, j - 2) && L.stairs(x1 - 1.05, z0 - 3.6, 'pz', 1.7, 0, h + 0.12, 3.6, 'concrete', true)) { stairs++; busy.add(i + ',' + j); street.add(j * nx + i); continue; }
      if (openIn(i + 1, j) && openIn(i + 2, j) && L.stairs(x1 + 3.6, z0 + 1.05, 'nx', 1.7, 0, h + 0.12, 3.6, 'concrete', true)) { stairs++; busy.add(i + ',' + j); street.add(j * nx + i); continue; }
      if (openIn(i, j + 1) && openIn(i, j + 2) && L.stairs(x0 + 1.05, z1 + 3.6, 'nz', 1.7, 0, h + 0.12, 3.6, 'concrete', true)) { stairs++; busy.add(i + ',' + j); street.add(j * nx + i); continue; }
    }
    if (!busy.has(i + ',' + j)) { const rr = R(), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; // rooftop clutter: water tanks, antennas, AC units
      if (rr < 0.14) L.prop('fueltank', cx, h + 0.12, cz, 0.38); else if (rr < 0.24) L.prop('mast', x0 + 0.6, h + 0.12, z0 + 0.6, 0.12); else if (rr < 0.36) L.B(cx, cz, 0.8, 0.6, 0.55, h + 0.12, 'acunit'); }
    const lip = (a, b, c, d) => L.box(a, h + 0.12, b, c, h + 0.95, d, 'wallP2', { tint: 0xe8dcc8 });
    if (isOpen(i, j + 1) && R() < 0.8) lip(x0, z1 - 0.25, x1, z1); if (isOpen(i, j - 1) && R() < 0.8) lip(x0, z0, x1, z0 + 0.25);
  }
  { // every rooftop network you can see a staircase on must connect to the street: union roofs (same height, side by side) + roof-to-roof stairs
    const par = Int32Array.from({ length: nx * nz }, (_, k) => k), f = k => { while (par[k] !== k) k = par[k] = par[par[k]]; return k; }, U = (a, b) => { a = f(a); b = f(b); if (a !== b) par[a] = b; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const h = H[j * nx + i]; if (h <= 0) continue; if (i + 1 < nx && Math.abs(H[j * nx + i + 1] - h) < 0.1) U(j * nx + i, j * nx + i + 1); if (j + 1 < nz && Math.abs(H[(j + 1) * nx + i] - h) < 0.1) U(j * nx + i, (j + 1) * nx + i); }
    for (const [i, j, a, b] of rlinks) if (a >= 0 && b >= 0 && a < nx && b < nz) U(j * nx + i, b * nx + a);
    const grounded = new Set(); for (const k of street) grounded.add(f(k));
    const want = new Set(); for (const [i, j] of rlinks) if (!grounded.has(f(j * nx + i))) want.add(f(j * nx + i));
    for (let j = 0; j < nz && want.size; j++) for (let i = 0; i < nx && want.size; i++) { const k = j * nx + i, h = H[k], root = f(k); if (h <= 0 || h > 6.6 || !want.has(root) || busy.has(i + ',' + j)) continue;
      const [x0, z0, x1, z1] = cellB(i, j), run = (h + 0.12) * 1.12, y = h + 0.12; let ok = false;
      const nc = Math.ceil((run + 0.4) / cs), clear = (di, dj) => { for (let q = 1; q <= nc; q++) { const a = i + di * q, b = j + dj * q; if (!openIn(a, b)) return false; // the run stays in the open...
        const wa = di ? a : (di === 0 && dj ? (dj < 0 ? i + 1 : i - 1) : a), wb = di ? (di < 0 ? b + 1 : b - 1) : b; if (openIn(wa, wb)) return false; } return true; }; // ...but hugs a building wall the whole way (never a free-standing ramp in the street)
      if (clear(-1, 0) && L.stairs(x0 - run, z1 - 1.05, 'px', 1.7, 0, y, run, 'concrete', true)) ok = true;
      else if (clear(1, 0) && L.stairs(x1 + run, z0 + 1.05, 'nx', 1.7, 0, y, run, 'concrete', true)) ok = true;
      else if (clear(0, -1) && L.stairs(x1 - 1.05, z0 - run, 'pz', 1.7, 0, y, run, 'concrete', true)) ok = true;
      else if (clear(0, 1) && L.stairs(x0 + 1.05, z1 + run, 'nz', 1.7, 0, y, run, 'concrete', true)) ok = true;
      if (!ok) continue; want.delete(root); busy.add(i + ',' + j); stairs++;
      // clear any rooftop clutter where the stair lands
      for (let q = L.boxes.length - 1; q >= 0; q--) { const b = L.boxes[q]; if (Math.abs(b.y0 - y) < 0.05 && b.x0 < x1 && b.x1 > x0 && b.z0 < z1 && b.z1 > z0 && !b.stair) L.boxes.splice(q, 1); }
      for (let q = L.props.length - 1; q >= 0; q--) { const pr = L.props[q]; if (Math.abs(pr.y - y) < 0.05 && pr.x > x0 && pr.x < x1 && pr.z > z0 && pr.z < z1) L.props.splice(q, 1); } }
    // networks that still can't reach the street: take their stairs away rather than promise a route that isn't there
    const drop = new Set(), dl = new Set(); for (const r of rlinks) if (want.has(f(r[1] * nx + r[0]))) { for (const b of r[4]) drop.add(b); dl.add(r[5]); }
    if (drop.size) { for (let q = L.boxes.length - 1; q >= 0; q--) if (drop.has(L.boxes[q])) L.boxes.splice(q, 1); for (let q = L.links.length - 1; q >= 0; q--) if (dl.has(L.links[q])) L.links.splice(q, 1); }
    L.rstairs = rlinks.filter(r => !dl.has(r[5])).map(r => ({ boxes: r[4], link: r[5] })); // checked again against the real nav at load
  }
  // power lines & laundry across the alleys (MW2 vibe)
  const main = ALLEYS[0].p, along = (pts, f) => { let tot = 0; const seg = []; for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(l); tot += l; } let d = f * tot; for (let k = 0; k < seg.length; k++) { if (d <= seg[k]) { const t = d / seg[k]; return [lerp(pts[k][0], pts[k + 1][0], t), lerp(pts[k][1], pts[k + 1][1], t), Math.atan2(pts[k + 1][1] - pts[k][1], pts[k + 1][0] - pts[k][0])]; } d -= seg[k]; } return [pts[pts.length - 1][0], pts[pts.length - 1][1], 0]; };
  for (const [ai, n] of [[0, 11], [4, 9], [5, 9], [1, 6], [2, 6], [3, 6]]) {
    const a = ALLEYS[ai]; let prev = null;
    for (let k = 1; k < n; k++) {
      const [x, z, ang] = along(a.p, k / n), off = (a.w / 2 - 0.4) * (k % 2 ? 1 : -1), px = x - Math.sin(ang) * off, pz = z + Math.cos(ang) * off;
      L.B(px, pz, 0.24, 0.24, 7.5, 0, 'wood'); L.box(px - 0.7, 7.0, pz - 0.05, px + 0.7, 7.1, pz + 0.05, 'wood', { col: false }); L.prop('lantern', px, 0, pz, 1.4, { ry: ang + Math.PI / 2 });
      if (prev) for (const dy of [7.05, 6.8, 6.5]) L.prop('wire', prev[0], dy, prev[1], 1, { ex: px - prev[0], ey: 0, ez: pz - prev[1], sag: 0.9 });
      if (R() < 0.5) L.prop('wire', px, 6.6, pz, 1, { ex: Math.sin(ang) * off * 2.2, ey: -1.2, ez: -Math.cos(ang) * off * 2.2, sag: 0.4 }); // drop to a building
      prev = [px, pz];
    }
    for (let k = 0; k < n; k++) if (R() < 0.45) { const [x, z, ang] = along(a.p, (k + 0.5) / n), w = a.w + 0.8; L.prop('laundry', x + Math.sin(ang) * w / 2, 4.2 + R() * 2, z - Math.cos(ang) * w / 2, 1, { ex: -Math.sin(ang) * w, ez: Math.cos(ang) * w }); }
  }
  // market: stalls around the main plaza and along the street
  const stall = (x, z, ry) => { L.B(x, z, 1.5, 1.5, 0.9, 0, 'planks').noRender = true; L.prop('stall', x, 0, z, 1, { ry, c: pick([0xb33a3a, 0x2f6fae, 0x3f8f4a, 0xd98a2b, 0xe0d0a0]) }); };
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.3; stall(-12 + Math.cos(a) * 6.5, -3 + Math.sin(a) * 6.5, -a + Math.PI / 2); }
  L.B(-12, -3, 2.4, 2.4, 0.7, 0, 'stone'); L.prop('well', -12, 0, -3, 1.1);
  for (const f of [0.12, 0.3, 0.62, 0.8, 0.92]) { const [x, z, ang] = along(main, f); stall(x + Math.sin(ang) * 2.4, z - Math.cos(ang) * 2.4, ang); }
  // clutter: cars, crates, kegs, trash, tires, rubble, burning wreck
  for (const f of [0.2, 0.45, 0.7, 0.86]) { const [x, z, ang] = along(main, f); const k = Math.round(ang / (Math.PI / 2)); car(L, x - Math.sin(ang) * 2.2, z + Math.cos(ang) * 2.2, Math.abs(k) % 2 ? 0 : 1, f === 0.45); }
  for (const a of ALLEYS) for (let k = 0; k < 4; k++) { const [x, z, ang] = along(a.p, 0.1 + R() * 0.8), s = (R() < 0.5 ? 1 : -1) * (a.w / 2 - 0.7), cx = x - Math.sin(ang) * s, cz = z + Math.cos(ang) * s, t = R();
    if (t < 0.35) crates(L, cx, cz, R() < 0.4 ? 2 : 1); else if (t < 0.55) L.prop('keg', cx, 0, cz); else if (t < 0.8) L.prop('trash', cx, 0, cz, 1); else L.prop('tires', cx, 0, cz, 1); }
  for (const [x, z] of [[33, 30], [-52, -29], [24, -2]]) { L.B(x, z, 1.6, 1.6, 0.9, 0, 'concrete'); L.prop('trash', x + 1.4, 0, z + 0.6, 1); }
  // spawns: west and east ends of the market street; pickups along the alleys
  L.spawn = { x: -66, y: 0, z: -3, yaw: -Math.PI / 2 };
  L.teamSpawns = [[[-66, -4], [-66, 0], [-62, -2], [-60, 2], [-66, 30], [-66, -32], [-38, -50], [-30, 50]], [[66, 0], [66, -3], [62, 2], [60, -2], [66, 33], [66, -30], [42, -50], [46.2, 50]]];
  const es = []; for (const a of ALLEYS) for (const f of [0.25, 0.5, 0.75]) { const [x, z] = along(a.p, f); es.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10]); }
  L.enemySpawns = L.teamSpawns[0].concat(L.teamSpawns[1], es);
  L.pickups = []; ALLEYS.slice(0, 6).forEach((a, k) => { const [x, z] = along(a.p, 0.38); const [x2, z2] = along(a.p, 0.66); L.pickups.push([k % 2 ? 'ammo' : 'health', x, 0, z], [k % 2 ? 'health' : 'ammo', x2, 0, z2]); });
  L.barrels = []; for (const a of ALLEYS.slice(1, 6)) { const [x, z, ang] = along(a.p, 0.55); L.barrels.push([x + Math.sin(ang) * (a.w / 2 - 0.6), z - Math.cos(ang) * (a.w / 2 - 0.6)]); }
}

const MAPS = [
  {
    name: 'OLD QUARTER', desc: 'Sun-baked old town: a covered souk, a clock-tower square and a rampart walk over the east street, stitched together by alleys and houses.', tag: 'Three lanes · tower square', build: buildOldQuarter,
    theme: {
      skyTop: 0x3f86d6, skyBottom: 0xf4e2c0, sunColor: 0xfff0d0, sunDir: [0.4, 0.7, -0.35], fog: 0xe8dcc4, fogNear: 70, fogFar: 240,
      hemiSky: 0xe8f0ff, hemiGround: 0xa08a64, hemi: 1.3, sun: 2.8, sunLight: 0xfff0d8, shadowSun: [0.4, 1, -0.35], farGround: 0xc8b08a, clouds: 6, cloudColor: 0xffffff,
      mats: {},
    },
  },
  {
    name: 'BAZAAR', desc: 'Dense market district in the dusty afternoon haze: winding alleys, packed buildings with balconies and shutters, rooftop routes, power lines and laundry overhead.', tag: 'Medium · close quarters · rooftops', build: buildBazaar,
    theme: {
      skyTop: 0x7090b0, skyBottom: 0xecd8b4, sunColor: 0xffe0b0, sunDir: [0.55, 0.5, 0.3], fog: 0xd6c6aa, fogNear: 30, fogFar: 170,
      hemiSky: 0xe6ecf4, hemiGround: 0x8a7458, hemi: 1.3, sun: 2.6, sunLight: 0xffe2c0, shadowSun: [0.55, 0.85, 0.3], farGround: 0xb09a78, clouds: 10, cloudColor: 0xf0e0c8,
      mats: {},
    },
  },
  {
    name: 'CROSSROADS', desc: 'Huge war-torn city: a street grid around a wrecked plaza, enterable two-storey houses, ruins, burning convoys.', tag: 'Huge · all ranges · urban warfare', build: buildCrossroads,
    theme: {
      skyTop: 0x5f7184, skyBottom: 0xd2c8b6, sunColor: 0xffe4c0, sunDir: [-0.5, 0.45, 0.35], fog: 0xb4b0a6, fogNear: 45, fogFar: 230,
      hemiSky: 0xd8dde6, hemiGround: 0x6a645a, hemi: 1.2, sun: 2.4, sunLight: 0xffe8cc, shadowSun: [-0.5, 0.9, 0.35], farGround: 0x5a5650, clouds: 22, cloudColor: 0xb8b8b8,
      mats: {},
    },
  },
  {
    name: 'FREIGHT YARD', desc: 'Container port at sunset: three lanes through stacked containers, warehouses with catwalks, a docked cargo ship.', tag: 'Medium · close–mid · CoD-style lanes', build: buildFreight,
    theme: {
      skyTop: 0x557aa6, skyBottom: 0xf0c89a, sunColor: 0xffc890, sunDir: [0.65, 0.3, -0.45], fog: 0xbcbcb8, fogNear: 45, fogFar: 210,
      hemiSky: 0xd8e2f0, hemiGround: 0x5a5650, hemi: 1.2, sun: 2.4, sunLight: 0xffd8b0, shadowSun: [0.65, 0.75, -0.45], farGround: 0x4a4a48, water: 0x2f5566, clouds: 14, cloudColor: 0xf0d8c0,
      mats: {},
    },
  },
  {
    name: 'FIREBASE', desc: 'Huge desert outpost: HESCO compound with watchtowers, a shelled village, rocky ridges and burning armour.', tag: 'Huge · long range · Battlefield-style', build: buildFirebase,
    theme: {
      skyTop: 0x4a82c8, skyBottom: 0xf2dcb4, sunColor: 0xfff2d8, sunDir: [0.3, 0.75, 0.45], fog: 0xe4d4b8, fogNear: 70, fogFar: 280,
      hemiSky: 0xe8f0ff, hemiGround: 0xa08a64, hemi: 1.25, sun: 2.8, sunLight: 0xfff0d8, shadowSun: [0.3, 1, 0.45], farGround: 0xcaac84, clouds: 8, cloudColor: 0xffffff,
      mats: {},
    },
  },
  {
    name: 'MERIDIAN', desc: 'Competitive Mediterranean town built for 6v6: a sniper terrace with a clock-house power position, a gated street into a fountain plaza, and market halls for close quarters — mirrored, with flank alleys between every lane.', tag: 'Medium · competitive · 3 lanes', build: buildMeridian,
    theme: {
      skyTop: 0x3a7ccc, skyBottom: 0xf4e6cc, sunColor: 0xfff0d4, sunDir: [-0.45, 0.6, 0.35], fog: 0xe6dfd0, fogNear: 55, fogFar: 230,
      hemiSky: 0xeaf2ff, hemiGround: 0x9a8a6a, hemi: 1.2, sun: 2.8, sunLight: 0xfff0d8, shadowSun: [-0.45, 1, 0.35], farGround: 0x8a8264, clouds: 7, cloudColor: 0xffffff,
      mats: {},
    },
  },
  {
    name: 'OASIS', desc: 'Golden-hour desert oasis: a palm-ringed pond, a walled caravanserai with climbable towers and a rampart, a mud-brick village market and rolling dunes.', tag: 'Large · all ranges · elevation', build: buildOasis,
    theme: {
      skyTop: 0x2f5f9e, skyBottom: 0xffc28a, sunColor: 0xffd09a, sunDir: [0.62, 0.26, -0.42], fog: 0xe9c79e, fogNear: 60, fogFar: 270,
      hemiSky: 0xffe4c4, hemiGround: 0xa07a54, hemi: 1.15, sun: 2.9, sunLight: 0xffd8a8, shadowSun: [0.62, 0.55, -0.42], farGround: 0xcaa47c, clouds: 6, cloudColor: 0xffe6cc,
      mats: {},
    },
  },
  {
    name: 'MILLBROOK', desc: 'Countryside village, three lanes: river crossings, a climbable bell tower, two-storey houses, a barn with a hayloft.', tag: 'Large · all ranges · multi-floor', build: buildMillbrook,
    theme: {
      skyTop: 0x4a82c8, skyBottom: 0xf0d8b0, sunColor: 0xffe2b0, sunDir: [0.55, 0.42, 0.3], fog: 0xc8d0c8, fogNear: 60, fogFar: 220,
      hemiSky: 0xdfeaff, hemiGround: 0x5a6a3a, hemi: 1.25, sun: 2.5, sunLight: 0xffe6c0, shadowSun: [0.55, 0.8, 0.3], farGround: 0x4a5a32, water: 0x4f7a78, clouds: 18, cloudColor: 0xfff0dc,
      mats: {},
    },
  },

];
if (!MAPS[settings.map]) settings.map = 0;

