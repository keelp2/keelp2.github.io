// ============================================================ BARRELS / PICKUPS
// ---------------------------------------------------------------- WINDOWS: clear / frosted glass (shatters), boards (splinter), shutters, already-broken
let panes = []; const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _ps = new V3(), _pp = new V3(), ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
function buildWindows(L) {
  panes = []; const W = L.windows || []; if (!W.length) return;
  const outSign = w => { // which side is outdoors: the side without a ceiling above it
    const ym = (w.y0 + w.y1) / 2, u = (w.a + w.b) / 2, roofed = sg => { const px = w.ax === 'x' ? u : w.c + sg * 1.4, pz = w.ax === 'x' ? w.c + sg * 1.4 : u; return world.boxes.some(b => px > b.x0 && px < b.x1 && pz > b.z0 && pz < b.z1 && b.y0 > ym && b.y0 < ym + 6); };
    const p = roofed(1), n = roofed(-1); return p && !n ? -1 : 1; };
  const glassM = MAT({ color: 0xa8ccd8, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.26, depthWrite: false }), frostM = MAT({ color: 0xe4ecee, roughness: 0.55, transparent: true, opacity: 0.86 });
  const bt = getTex('planks'), boardM = MAT(bt ? { map: bt, color: 0xb8946c, roughness: 0.95 } : { color: 0x7a5a3a, roughness: 0.95 });
  const specs = { glass: [], frost: [], board: [] }, deco = [];
  for (const w of W) {
    const sg = outSign(w), u0 = w.a, u1 = w.b, uw = u1 - u0, h = w.y1 - w.y0, um = (u0 + u1) / 2, ym = (w.y0 + w.y1) / 2;
    const P = (u, y, n) => w.ax === 'x' ? [u, y, w.c + n] : [w.c + n, y, u]; // (along-wall, height, normal offset) -> world
    const add = (kind, u, y, n, su, sy, sn, rz = 0, col = true) => { const [x, yy, z] = P(u, y, n); const sx = w.ax === 'x' ? su : sn, sz = w.ax === 'x' ? sn : su; specs[kind].push({ x, y: yy, z, sx, sy, sz, rz, col, ax: w.ax, sg }); };
    if (w.type === 'glass' || w.type === 'frosted') { add(w.type === 'glass' ? 'glass' : 'frost', um, ym, 0, uw, h, 0.03); }
    else if (w.type === 'boarded') { const n = h > 1.2 ? 4 : 3; for (let i = 0; i < n; i++) add('board', um, w.y0 + h * (i + 0.5) / n, sg * (w.th / 2 + 0.03), uw + 0.22, 0.17, 0.035, (Math.sin(i * 7.3 + w.a) * 0.12)); }
    else if (w.type === 'broken') { for (const [fu, fy, s] of [[0.12, 0.85, 0.3], [0.88, 0.9, 0.24], [0.15, 0.12, 0.22], [0.9, 0.1, 0.18], [0.5, 0.95, 0.16]]) add('glass', u0 + uw * fu, w.y0 + h * fy, 0, uw * s, h * s * 0.8, 0.02, fu * 3 + fy, false); } // jagged remnants left in the frame
    else if (w.type === 'shutter') deco.push({ w, sg });
  }
  const mk = (kind, mat) => { const S = specs[kind]; if (!S.length) return null; const im = new THREE.InstancedMesh(_gBox, mat, S.length); im.castShadow = kind === 'board'; im.receiveShadow = true; if (kind !== 'board') im.userData.noAO = true;
    S.forEach((q, i) => { _pq.setFromEuler(new THREE.Euler(0, 0, 0)); if (q.rz) _pq.setFromAxisAngle(q.ax === 'x' ? new V3(0, 0, 1) : new V3(1, 0, 0), q.rz); im.setMatrixAt(i, _pm.compose(_pp.set(q.x, q.y, q.z), _pq, _ps.set(q.sx, q.sy, q.sz)));
      if (!q.col) return; const hx = q.sx / 2, hz = q.sz / 2, hy = q.sy / 2 + (q.rz ? Math.abs(Math.sin(q.rz)) * q.sx / 2 * 0.5 : 0);
      const pn = { kind: kind === 'board' ? 'board' : 'glass', frost: kind === 'frost', im, idx: i, cx: q.x, cy: q.y, cz: q.z, nx: q.ax === 'x' ? 0 : 1, nz: q.ax === 'x' ? 1 : 0, hp: 70, i: panes.length };
      pn.box = { x0: q.x - hx, y0: q.y - hy, z0: q.z - hz, x1: q.x + hx, y1: q.y + hy, z1: q.z + hz, m: kind === 'board' ? 'planks' : 'glass', seeThru: kind !== 'frost', [kind === 'board' ? 'board' : 'glass']: pn };
      pn.box.noRender = true; world.boxes.push(pn.box); panes.push(pn); });
    im.instanceMatrix.needsUpdate = true; world.group.add(im); return im; };
  mk('glass', glassM); mk('frost', frostM); mk('board', boardM);
  const SC = [0x2f5a6a, 0x6a3a2a, 0x3e5a3a, 0x8a7a5a, 0x2a3a5a];
  for (const { w, sg } of deco) { // open wooden shutters folded back against the outside wall
    const uw = w.b - w.a, h = w.y1 - w.y0, pw = uw / 2, col = SC[Math.floor(Math.abs(Math.sin(w.a * 3.1 + w.c)) * SC.length) % SC.length], m = MAT({ color: col, roughness: 0.9 });
    for (const side of [-1, 1]) { const hu = side < 0 ? w.a : w.b, ang = 0.35, mesh = new THREE.Mesh(_gBox, m), nOff = sg * (w.th / 2 + 0.02);
      const du = side * Math.cos(ang) * pw / 2, dn = sg * Math.sin(ang) * pw / 2, u = hu + du - side * 0.0, ym = (w.y0 + w.y1) / 2;
      if (w.ax === 'x') { mesh.position.set(u, ym, w.c + nOff + dn); mesh.scale.set(pw, h, 0.04); mesh.rotation.y = -side * sg * ang; }
      else { mesh.position.set(w.c + nOff + dn, ym, u); mesh.scale.set(0.04, h, pw); mesh.rotation.y = side * sg * ang; }
      mesh.castShadow = true; world.group.add(mesh);
      for (let k = 1; k < 6; k++) { const sl = new THREE.Mesh(_gBox, MAT({ color: tint(col, 0.08).getHex(), roughness: 0.9 })); sl.position.set(0, -0.5 + k / 6, 0); sl.scale.set(w.ax === 'x' ? 0.98 : 1.6, 0.012, w.ax === 'x' ? 1.6 : 0.98); mesh.add(sl); } } // louvre lines
  }
}
function breakPane(p, send, quiet) {
  if (!p || p.box.dead) return; p.box.dead = true; p.im.setMatrixAt(p.idx, ZERO_M); p.im.instanceMatrix.needsUpdate = true;
  const sp = spatial({ x: p.cx, y: p.cy, z: p.cz });
  if (p.kind === 'glass') { for (const sgn of [-1, 1]) debris.burst(p.cx, p.cy, p.cz, 16, 3.2, 0.78, 0.88, 0.94, 1.1, 1, p.nx * sgn * 0.8, 0.2, p.nz * sgn * 0.8); sparks.burst(p.cx, p.cy, p.cz, 10, 2.5, 0.85, 0.95, 1, 0.25, 0.6); sfx.play('glass', { vol: sp.vol * 1.6, pan: sp.pan, pos: sp.pos }); }
  else { debris.burst(p.cx, p.cy, p.cz, 14, 3.5, 0.45, 0.32, 0.18, 1.0, 1, p.nx, 0.3, p.nz); sfx.play('board', { vol: sp.vol * 1.4, pan: sp.pan, pos: sp.pos }); }
  if (!quiet && typeof noise === 'function') noise(new V3(p.cx, p.cy, p.cz), p.kind === 'glass' ? 22 : 14, null);
  if (send && MP.active) netSend({ t: 'pane', i: p.i });
}
function hitPane(p, dmg, send) { if (!p || p.box.dead) return; p.hp -= dmg; debris.burst(p.cx, p.cy, p.cz, 4, 2, 0.5, 0.36, 0.2, 0.6, 1, p.nx, 0, p.nz); if (p.hp <= 0) breakPane(p, send); }
const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.1, 14);
const bandGeo = new THREE.CylinderGeometry(0.41, 0.41, 0.18, 14);
class Barrel {
  constructor(x, z) {
    this.x = x; this.z = z; this.y = TH(x, z); this.hp = 30; this.fuse = 0; this.respawn = 0; const y = this.y;
    this.box = { x0: x - 0.4, y0: y, z0: z - 0.4, x1: x + 0.4, y1: y + 1.1, z1: z + 0.4, m: 'barrel', barrel: this };
    world.boxes.push(this.box);
    this.mesh = new THREE.Group();
    const body = new THREE.Mesh(barrelGeo, MAT({ map: getTex('staves'), color: 0xd8b088 }));
    body.position.y = 0.55; body.castShadow = true; this.mesh.add(body);
    for (const y of [0.12, 0.98]) { const band = new THREE.Mesh(bandGeo, MAT({ color: 0x2c2a28 })); band.position.y = y; band.scale.y = 0.4; this.mesh.add(band); }
    const label = new THREE.Mesh(bandGeo, MAT({ color: 0xa0221c })); label.position.y = 0.55; label.scale.set(1.005, 1.3, 1.005); this.mesh.add(label);
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 6), MAT({ color: 0x3a2a1a })); fuse.position.set(0.15, 1.2, 0); fuse.rotation.z = 0.4; this.mesh.add(fuse);
    this.mesh.position.set(x, y, z); world.group.add(this.mesh);
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
    explosion(new V3(this.x, this.y + 0.6, this.z), 6, 150);
  }
}
const hpGeo = new THREE.BoxGeometry(0.55, 0.35, 0.55), crossA = new THREE.BoxGeometry(0.56, 0.12, 0.16), crossB = new THREE.BoxGeometry(0.16, 0.12, 0.56);
const potionGeo = new THREE.SphereGeometry(0.17, 16, 12), roundGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8);
const amGeo = new THREE.BoxGeometry(0.65, 0.34, 0.42), ringGeo = new THREE.RingGeometry(0.45, 0.6, 24);
class Pickup {
  constructor(type, x, y, z, temp) {
    this.type = type; this.pos = new V3(x, y, z); this.active = true; this.timer = 0; this.temp = temp; this.life = temp ? 20 : 0;
    const g = this.mesh = new THREE.Group(); const inner = this.inner = new THREE.Group(); g.add(inner);
    if (type === 'health') { // field medkit
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.3, 0.36), MAT({ color: 0xe8e4dc, roughness: 0.5 })); inner.add(body);
      const red = MAT({ color: 0xc81e1e, emissive: 0x400000, roughness: 0.5 });
      for (const [w, d] of [[0.26, 0.08], [0.08, 0.26]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), red); c.position.y = 0.156; inner.add(c); }
      for (const [w, h] of [[0.2, 0.06], [0.06, 0.2]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), red); c.position.z = 0.186; inner.add(c); }
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), MAT({ color: 0x222222 })); hd.position.y = 0.19; inner.add(hd);
    } else { // ammunition crate with rounds on top
      inner.add(new THREE.Mesh(amGeo, MAT({ map: getTex('planks'), color: 0x9aa070 })));
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.43), MAT({ color: 0x3a3a30 })); st.position.y = 0.06; inner.add(st);
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

