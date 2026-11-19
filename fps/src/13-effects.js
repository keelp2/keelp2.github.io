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
  if (POTG.on && game.state === 'play') potgEvent('tr', { a: [a.x, a.y, a.z], b: [b.x, b.y, b.z] });
  const tr = tracers[tracerI]; tracerI = (tracerI + 1) % tracers.length;
  tr.a.copy(a); tr.b.copy(b); tr.dir.subVectors(b, a); tr.len = tr.dir.length(); if (tr.len < 0.5) return; tr.dir.divideScalar(tr.len);
  tr.t = 0; tr.speed = speed; tr.live = true; tr.m.visible = false; tr.m.material.color.setHex(color); tr.w = width; /* shown on its first update, never with a stale transform */
}
const _ta = new V3(), _tb = new V3();
function updateTracers(dt) {
  for (const tr of tracers) {
    if (!tr.live) continue;
    tr.t += dt; const run = tr.t * tr.speed, head = Math.min(tr.len, run), tail = Math.max(0, run - Math.min(6, tr.speed * 0.008)); /* the tail keeps flying after the head lands, so every tracer finishes */
    if (tail >= tr.len - 0.01 || tr.t > 3) { tr.live = false; tr.m.visible = false; continue; }
    _ta.copy(tr.a).addScaledVector(tr.dir, tail); _tb.copy(tr.a).addScaledVector(tr.dir, head);
    if (head - tail < 0.01) continue; tr.m.visible = true; tr.m.position.addVectors(_ta, _tb).multiplyScalar(0.5); tr.m.lookAt(_tb);
    tr.m.scale.set(tr.w, tr.w, Math.max(0.01, head - tail)); tr.m.material.opacity = 1;
  }
}
// decals
const decals = []; let decalI = 0;
function initDecals() {
  const g = new THREE.PlaneGeometry(0.16, 0.16);
  const mat = new THREE.MeshBasicMaterial({ map: TEX.decal, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, color: 0x222222 });
  for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(g, mat); m.visible = false; fx.add(m); decals.push(m); }
}
function surfOfBox(b) { return b && b.m === 'floor' && b.y1 <= 0.05 ? (GROUNDSURF[world.L.ground] || 'dirt') : (b && SURF[b.m]) || 'concrete'; }
function impactFx(p, nx, ny, nz, box, snd) {
  potgEvent('imp', { p: [p.x, p.y, p.z], n: [nx, ny, nz], b: box });
  const k = surfOfBox(box), x = p.x + nx * 0.03, y = p.y + ny * 0.03, z = p.z + nz * 0.03;
  if (k === 'metal') { sparks.burst(x, y, z, 9, 6, 1, 0.85, 0.45, 0.25, 1, nx, ny, nz); }
  else if (k === 'wood') { debris.burst(x, y, z, 5, 3, 0.45, 0.32, 0.18, 0.7, 1, nx, ny, nz); debris.burst(x, y, z, 3, 1, 0.6, 0.52, 0.4, 1, 0.2, nx, ny, nz); }
  else if (k === 'grass' || k === 'dirt' || k === 'sand') { debris.burst(x, y, z, 7, 3.5, 0.42, 0.34, 0.24, 0.8, 1.4, nx, ny + 1.2, nz); debris.burst(x, y, z, 4, 1, 0.55, 0.48, 0.38, 1.4, 0.15, nx, ny, nz); }
  else { debris.burst(x, y, z, 4, 3, 0.55, 0.53, 0.5, 0.6, 1, nx, ny, nz); debris.burst(x, y, z, 5, 0.8, 0.7, 0.68, 0.64, 1.3, 0.1, nx, ny, nz); if (Math.random() < 0.3) sparks.burst(x, y, z, 2, 3, 1, 0.8, 0.5, 0.15, 1, nx, ny, nz); } // dust puff + chips
  if (snd && camera.position.distanceTo(p) < 40) { const sp = spatial(p); sfx.play('imp_' + k, { vol: 0.5 / (1 + sp.dist * 0.08), pan: sp.pan }); if (k !== 'grass' && k !== 'dirt' && k !== 'sand' && Math.random() < 0.08) sfx.play('ric', { vol: 0.4, pan: sp.pan }); }
}
let nmT = 0;
function nearMiss(a, b) { // a round that passes close to your head cracks past
  if (!player.alive || game.time - nmT < 0.08) return; const h = playerHead(new V3()), d = b.clone().sub(a), L = d.length(); if (L < 2) return; d.divideScalar(L);
  const w = h.clone().sub(a), t = w.dot(d); if (t < 2 || t > L + 1) return; const miss = w.addScaledVector(d, -t).length(); if (miss > 0.25 && miss < 1.8) { nmT = game.time; sfx.play('whiz', { vol: 0.75, pan: rand(-0.6, 0.6) }); }
}
// ---- blood
const bloodDecals = []; let bloodI = 0;
function initBlood() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = Math.random() * 40, s = 4 + Math.random() * 16 * (1 - r / 50); g.fillStyle = `rgba(${90 + Math.random() * 40 | 0},0,0,${0.55 + Math.random() * 0.4})`; g.beginPath(); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, s, 0, 7); g.fill(); }
  for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, r = 30 + Math.random() * 30; g.fillStyle = 'rgba(110,0,0,.8)'; g.beginPath(); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1 + Math.random() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, color: 0x9a1010 }), geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(geo, mat); m.visible = false; fx.add(m); bloodDecals.push(m); }
  // screen-edge splatter when you take damage
  const sc = document.createElement('canvas'); sc.width = 1280; sc.height = 720; const q = sc.getContext('2d');
  const vg = q.createRadialGradient(640, 360, 250, 640, 360, 760); vg.addColorStop(0, 'rgba(90,0,0,0)'); vg.addColorStop(1, 'rgba(110,0,0,.75)'); q.fillStyle = vg; q.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 260; i++) { const side = Math.floor(Math.random() * 4), e = Math.random(), d = Math.pow(Math.random(), 2.2) * 150, x = side < 2 ? e * 1280 : side === 2 ? d : 1280 - d, y = side === 0 ? d : side === 1 ? 720 - d : e * 720;
    q.fillStyle = `rgba(${110 + Math.random() * 50 | 0},0,0,${0.25 + Math.random() * 0.45})`; q.beginPath(); q.arc(x, y, 1 + Math.pow(Math.random(), 3) * 9, 0, 7); q.fill(); }
  const ov = document.createElement('div'); ov.id = 'bloodov'; ov.style.backgroundImage = `url(${sc.toDataURL()})`; $('hud').appendChild(ov);
}
// blood mist: a soft red puff that blooms and fades at the hit point (alongside the spray, droplets and splatter decals)
const mists = []; let mistTex = null;
function bloodMist(p, dir, s) {
  if (!mistTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(150,10,10,0.95)'); gr.addColorStop(0.45, 'rgba(110,6,6,0.55)'); gr.addColorStop(1, 'rgba(80,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); mistTex = new THREE.CanvasTexture(c); mistTex.colorSpace = THREE.SRGBColorSpace; }
  const m = mists.find(x => !x.on) || (() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false })); scene.add(sp); const o = { sp }; mists.push(o); return o; })();
  m.on = true; m.t = 0; m.life = 0.38 + s * 0.12; m.s = s; m.sp.visible = true; m.sp.position.copy(p).addScaledVector(dir, 0.08); m.v = dir.clone().multiplyScalar(0.9); m.sp.material.rotation = Math.random() * 6.28;
}
function updateMists(dt) { for (const m of mists) if (m.on) { m.t += dt; const k = m.t / m.life; if (k >= 1) { m.on = false; m.sp.visible = false; continue; } m.sp.position.addScaledVector(m.v, dt); m.sp.scale.setScalar((0.18 + 0.55 * Math.sqrt(k)) * m.s); m.sp.material.opacity = (1 - k) * 0.85; } }
function bloodHit(p, dir, head) { // spray + splatter on whatever is behind (and below) the victim
  if (settings.blood === false) return; potgEvent('blood', { p: [p.x, p.y, p.z], d: [dir.x, dir.y, dir.z], h: head ? 1 : 0 });
  bloodMist(p, dir, head ? 1.25 : 0.9); if (head) bloodMist(p.clone().addScaledVector(dir, 0.15), dir, 0.8);
  debris.burst(p.x, p.y, p.z, head ? 10 : 6, head ? 6 : 4.5, 0.5, 0.03, 0.03, 0.4, 2.0, dir.x * 1.4, dir.y * 1.4, dir.z * 1.4); // exit spray, fast droplets
  debris.burst(p.x, p.y, p.z, head ? 14 : 8, head ? 4 : 3, 0.42, 0.02, 0.02, 0.55, 1.3, dir.x, dir.y, dir.z);
  debris.burst(p.x, p.y, p.z, 6, 1.2, 0.5, 0.03, 0.03, 0.9, 0.4, -dir.x * 0.4, 0.2, -dir.z * 0.4);
  const h = raycast(p, dir, 3.2, false); if (h.t < 3.2 && h.box) placeBlood(p.clone().addScaledVector(dir, h.t), h.nx, h.ny, h.nz, rand(0.35, 0.8) * (head ? 1.3 : 1));
  else { const dn = raycast(p.clone().addScaledVector(dir, 0.6), new V3(0, -1, 0), 3, false); if (dn.t < 3 && dn.box) placeBlood(p.clone().addScaledVector(dir, 0.6).add(new V3(0, -dn.t, 0)), 0, 1, 0, rand(0.4, 0.9)); }
}
function placeBlood(p, nx, ny, nz, s) { const m = bloodDecals[bloodI]; bloodI = (bloodI + 1) % bloodDecals.length; m.position.set(p.x + nx * 0.015, p.y + ny * 0.015, p.z + nz * 0.015); m.lookAt(m.position.x + nx, m.position.y + ny, m.position.z + nz); m.rotation.z = Math.random() * 6.28; m.scale.set(s, s, s); m.visible = true; }
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

