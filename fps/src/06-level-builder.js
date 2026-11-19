// ============================================================ LEVEL BUILDER
class LevelBuilder {
  constructor() { this.lights = []; this.smoke = []; this.links = []; this.props = []; this.water = []; this.glows = []; this.padStyle = 'mushroom'; this.boxes = []; this.decor = []; this.pads = []; this.barrels = []; this.pickups = []; this.enemySpawns = []; this.spawn = { x: 0, y: 0, z: 0, yaw: 0 }; this.bounds = [-30, -30, 30, 30]; }
  box(x0, y0, z0, x1, y1, z1, m = 'wall', o = {}) {
    const b = { x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), m, tint: o.tint };
    (o.col === false ? this.decor : this.boxes).push(b); return b;
  }
  B(cx, cz, w, d, h, y = 0, m = 'wall', o) { return this.box(cx - w / 2, y, cz - d / 2, cx + w / 2, y + h, cz + d / 2, m, o); }
  stairs(x, z, dir, w, h0, h1, run, m = 'metal', strict = false) {
    { const fx0 = dir === 'px' ? x : dir === 'nx' ? x - run : x - w / 2, fx1 = dir === 'px' ? x + run : dir === 'nx' ? x : x + w / 2, fz0 = dir === 'pz' ? z : dir === 'nz' ? z - run : z - w / 2, fz1 = dir === 'pz' ? z + run : dir === 'nz' ? z : z + w / 2, e = 0.05;
      const hit = b => b.x0 < fx1 - e && b.x1 > fx0 + e && b.z0 < fz1 - e && b.z1 > fz0 + e; // never build a staircase through another one (or, strict, through anything at its foot)
      if (this.boxes.some(b => hit(b) && (b.stair || (strict && b.y1 > h0 + 0.3 && b.y0 < h0 + 0.6)))) return false; }
    const n = Math.max(1, Math.ceil(Math.abs(h1 - h0) / 0.21)), sd = run / n; // low risers = smooth climbing
    { const dx = dir === 'px' ? 1 : dir === 'nx' ? -1 : 0, dz = dir === 'pz' ? 1 : dir === 'nz' ? -1 : 0; // nav link bottom -> top
      this.links.push([x - dx * 0.6, h0, z - dz * 0.6, x + dx * (run + 0.6), h1, z + dz * (run + 0.6), run + 1.2]); }
    for (let i = 0; i < n; i++) {
      const top = h0 + (h1 - h0) * (i + 1) / n, a = i * sd, b = (i + 1) * sd;
      const sb = dir === 'px' ? this.box(x + a, h0, z - w / 2, x + b, top, z + w / 2, m) : dir === 'nx' ? this.box(x - b, h0, z - w / 2, x - a, top, z + w / 2, m) : dir === 'pz' ? this.box(x - w / 2, h0, z + a, x + w / 2, top, z + b, m) : this.box(x - w / 2, h0, z - b, x + w / 2, top, z - a, m); sb.stair = true;
    }
    return true;
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
    if (this.padStyle === 'mushroom') { b = this.B(x, z, 1.7, 1.7, 0.3, y, 'pad'); b.noRender = true; this.prop('bigmush', x, y, z, 1); this.glow(x, y + 0.3, z, 0xffb040, 0.7); }
    else { b = this.B(x, z, 2, 2, 0.08, y, 'rune'); this.B(x, z, 2.5, 2.5, 0.05, y, 'castle', { col: false }); this.glow(x, y + 0.4, z, 0x6fd8ff, 2); }
    b.pad = { vy, px, pz }; this.pads.push(b); return b;
  }
  prop(k, x, y, z, s = 1, o = {}) {
    const fixed = ['log', 'gable', 'octo', 'coneroof', 'house', 'tower', 'mountain', 'chimney', 'wire', 'laundry'].includes(k);
    const p = Object.assign({ k, x, y, z, s, ry: fixed ? 0 : rand(0, 6.28) }, o); this.props.push(p);
    if (k === 'keg') this.B(x, z, 0.62, 0.62, 0.9 * s, y, 'wood').noRender = true; // you can't walk through barrels
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

