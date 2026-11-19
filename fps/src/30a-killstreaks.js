// ============================================================ KILLSTREAKS — pick 3 per loadout; each is earned once per life
// UAV 4 · Predator Missile 5 · Precision Airstrike 6 · Carpet Bombing 8 · Attack Helicopter 10. Dying resets the count;
// kills made BY a killstreak don't count toward the next one (modern CoD rules). Each streak looks and plays differently.
var KS_DEFS = {
  uav: { n: 4, name: 'UAV', desc: 'Enemies show on your radar for 30 s — even past its edge' },
  pred: { n: 5, name: 'PREDATOR MISSILE', desc: 'Fly a missile down from the sky: steer it, boost it, hit them' },
  air: { n: 6, name: 'PRECISION AIRSTRIKE', desc: 'Pick a spot on your tablet: 3 jets drop heavy bombs on it' },
  air3: { n: 8, name: 'CARPET BOMBING', desc: 'Lay a run on your tablet: a bomber walks 9 bombs down it' },
  heli: { n: 10, name: 'ATTACK HELICOPTER', desc: 'A gunship circles the map for 45 s and hunts enemies' } };
var KS_ORDER = ['uav', 'pred', 'air', 'air3', 'heli'], KS_DEFAULT = ['uav', 'pred', 'air'];
Object.assign(KS_ICON, {
  pred: '<svg viewBox="0 0 24 24"><g fill="currentColor"><path d="M12 1.5c1.6 1.5 2.3 3.6 2.3 6v9.2l2.2 2.3v2.5l-2.6-1.4h-3.8l-2.6 1.4V19l2.2-2.3V7.5c0-2.4.7-4.5 2.3-6z"/><path d="M10.6 22h2.8l-1.4 1.5z" opacity=".7"/></g></svg>',
  heli: '<svg viewBox="0 0 24 24"><g fill="currentColor"><rect x="2" y="3.2" width="20" height="1.6" rx=".8"/><rect x="11.3" y="4" width="1.4" height="3"/><path d="M5 9.5c0-1.4 1.6-2.5 4-2.5h4.5c2.6 0 4.5 1.6 4.5 3.6v1.9c0 1-.8 1.5-1.8 1.5H8.5C6.4 14 5 12.2 5 9.5z"/><rect x="17" y="10" width="5.5" height="1.5" rx=".7"/><path d="M7 16h11l1 1.4H6z"/><rect x="9" y="14" width="1.2" height="2"/><rect x="15" y="14" width="1.2" height="2"/></g></svg>' });
Object.assign(KS_FEED, { pred: 'PREDATOR MISSILE', heli: 'ATTACK HELICOPTER' });
function ksPicked(lo = getLO()) { const v = Array.isArray(lo.streaks) ? lo.streaks.filter((id, i, a) => KS_DEFS[id] && a.indexOf(id) === i).slice(0, 3) : null; return (v && v.length ? v : KS_DEFAULT).slice().sort((a, b) => KS_DEFS[a].n - KS_DEFS[b].n); }
const STREAKS = () => ksPicked().map(id => [id, KS_DEFS[id].n, KS_DEFS[id].name, KS_DEFS[id].desc]);

// ---- shared bits: moving FX objects (planes, bombs, missile, gunship) ticked from supportTick
const KSFX = [];
function ksFxTick(dt) { for (let i = KSFX.length - 1; i >= 0; i--) if (KSFX[i](dt) === false) KSFX.splice(i, 1); }
const ksMat = (c, r = 0.55, m = 0.4) => MAT({ color: c, roughness: r, metalness: m });
function makeJet(big) { /* low-poly fighter (or a heavy bomber): grey, swept wings, glowing exhaust */
  const g = new THREE.Group(), body = ksMat(big ? 0x3a3f3a : 0x6f777e), dark = ksMat(0x25292c), s = big ? 2.3 : 1;
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * s, 0.75 * s, 11 * s, 10), body); fus.rotation.x = Math.PI / 2; g.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55 * s, 2.6 * s, 10), body); nose.rotation.x = Math.PI / 2; nose.position.z = 6.8 * s; g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry((big ? 26 : 9) * s / (big ? 2.3 : 1), 0.16 * s, (big ? 3.2 : 3.6) * s), body); wing.position.z = big ? 0.5 : -0.6; if (!big) wing.rotation.y = 0; g.add(wing);
  if (!big) for (const sd of [-1, 1]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 1.6), body); sw.position.set(sd * 2.6, 0, -1.6); sw.rotation.y = sd * 0.5; g.add(sw); }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 2.2 * s, 2.0 * s), body); fin.position.set(0, 1.2 * s, -4.6 * s); g.add(fin);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4.6 * s, 0.12 * s, 1.4 * s), body); tail.position.set(0, 0.2 * s, -4.8 * s); g.add(tail);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 10, 8), ksMat(0x101820, 0.1, 0.8)); glass.scale.set(1, 0.7, 2); glass.position.set(0, 0.55 * s, 3.4 * s); g.add(glass);
  if (big) for (const x of [-7, -3.6, 3.6, 7]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.6, 8), dark); e.rotation.x = Math.PI / 2; e.position.set(x, -0.7, 1.2); g.add(e); }
  const ex = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa040 })); ex.position.z = -5.6 * s; g.add(ex);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g;
}
function makeBomb(big) { const g = new THREE.Group(), m = ksMat(0x2f3529), s = big ? 1.4 : 0.9;
  const b = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.22 * s, 1.1 * s, 4, 8) : new THREE.CylinderGeometry(0.22 * s, 0.22 * s, 1.5 * s, 8), m); g.add(b);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4 * s, 0.32 * s), m); f.rotation.y = i * Math.PI / 2; f.position.set(Math.cos(i * Math.PI / 2) * 0.16 * s, 0.75 * s, Math.sin(i * Math.PI / 2) * 0.16 * s); g.add(f); }
  return g; }
/* a plane that crosses `over` at time tCross (s from now), heading `dir`, at altitude `alt` */
function flyover(over, dir, tCross, alt, speed, big, side = 0) {
  const g = makeJet(big), d = dir.clone().normalize(), lat = new V3(-d.z, 0, d.x), base = over.clone().addScaledVector(lat, side); base.y = Math.max(over.y, TH(over.x, over.z)) + alt;
  g.lookAt(d.x, 0, d.z); scene.add(g); let t = -tCross; const life = 260 / speed;
  KSFX.push(dt => { t += dt; if (t > life) { scene.remove(g); return false; } g.position.copy(base).addScaledVector(d, t * speed); g.rotation.set(0, Math.atan2(d.x, d.z), big ? 0 : Math.sin(t * 2) * 0.06); return true; });
  setTimeout(() => { const sp = spatial(over); sfx.boom(sp.dist + 40, sp.pan, 0.12, sp.pos); }, Math.max(0, tCross * 1000 - 300)); }
/* a bomb that falls onto p, landing exactly at tImpact (s from now) */
function dropBomb(p, tImpact, big, drift) { const g = makeBomb(big), fall = Math.min(1.6, tImpact), h0 = 9.81 * fall * fall / 2 + 2; let t = 0, born = false; const t0 = tImpact - fall;
  KSFX.push(dt => { t += dt; if (t < t0) return true; if (!born) { born = true; scene.add(g); } const u = t - t0; if (u >= fall) { scene.remove(g); return false; }
    g.position.set(p.x - drift.x * (fall - u) * 14, p.y + h0 - 9.81 * u * u / 2, p.z - drift.z * (fall - u) * 14); g.rotation.set(Math.atan2(14, 9.81 * u + 1) * 0.6 - Math.PI, Math.atan2(drift.x, drift.z), 0); return true; }); }
function bigFireball(p, big) { /* the extra punch on top of the normal explosion: a rising fireball column and a ground shockwave of dust */
  debris.burst(p.x, p.y + 0.5, p.z, big ? 40 : 22, big ? 12 : 8, 1, 0.55, 0.18, big ? 1.1 : 0.8, 0.4, 0, 1.4, 0);
  debris.burst(p.x, p.y + 0.2, p.z, big ? 30 : 26, big ? 9 : 11, 0.42, 0.36, 0.28, 1.4, 0.6, 0, 0.15, 0);
  game.shake = Math.min(1.4, game.shake + clamp(1 - p.distanceTo(player.pos) / (big ? 60 : 40), 0, 1) * (big ? 0.9 : 0.5)); }

// ---- airstrikes (all three kinds share one entry point; online, everyone simulates the same impact points)
function callAirstrike(at, kind, owner, pts, heading) {
  if (kind === true) kind = 'air3'; else if (!kind) kind = 'air';
  const carpet = kind === 'air3', pred = kind === 'pred', mine = !owner, n = pred ? 1 : carpet ? 9 : 3;
  if (!pred) { showHint(mine ? (carpet ? 'BOMBER INBOUND' : 'JETS INBOUND') : (carpet ? 'ENEMY CARPET BOMBING' : 'ENEMY AIRSTRIKE') + ' INBOUND', '#ff6b5a'); }
  const dir = heading ? heading.clone().setY(0).normalize() : pts && pts.length > 1 ? pts[pts.length - 1].clone().sub(pts[0]).setY(0).normalize() : new V3(rand(-1, 1), 0, rand(-1, 1)).normalize();
  const ground = (x, z) => { const h = raycast(new V3(x, 80, z), new V3(0, -1, 0), 100, false); return h.t < 100 ? 80 - h.t + 0.2 : TH(x, z) + 0.3; }; /* the first thing a falling bomb meets: a roof, a walkway, the street */
  if (!pts) { pts = []; for (let i = 0; i < n; i++) { const p = at.clone().addScaledVector(dir, carpet ? (i - (n - 1) / 2) * 5 : (i - 1) * 4.5); const sc = carpet ? 1.3 : 2.2; p.x += rand(-sc, sc); p.z += rand(-sc, sc); p.y = ground(p.x, p.z); pts.push(p); } }
  if (mine && MP.active) netSend({ t: 'air', k: kind, pts: pts.map(v3a), h: [Math.round(dir.x * 1000) / 1000, Math.round(dir.z * 1000) / 1000] });
  const R = pred ? 9 : carpet ? 6 : 8.5, DMG = pred ? 320 : carpet ? 160 : 260, t0 = pred ? 0 : carpet ? 3.2 : 2.6, step = carpet ? 0.22 : 0.16;
  const mid = pts[Math.floor(pts.length / 2)];
  if (carpet) { flyover(mid, dir, t0 + step * (pts.length - 1) / 2, 46, 55, true); pts.forEach((p, i) => dropBomb(p, t0 + i * step, false, dir)); ambience.flyby && ambience.flyby(true); }
  else if (!pred) { [-9, 0, 9].forEach((sd, j) => flyover(mid, dir, t0 - 0.9 + j * 0.12, 34 + j * 2, 110, false, sd)); pts.forEach((p, i) => dropBomb(p, t0 + i * step, true, dir)); ambience.flyby && ambience.flyby(true); }
  pts.forEach((p, i) => setTimeout(() => { if (game.state !== 'play' && game.state !== 'dying') return; game.ownSupport = mine; game.ksKind = kind;
    try { explosion(p, R, DMG, mine ? 'player' : owner); bigFireball(p, !carpet); } finally { game.ownSupport = false; game.ksKind = null; } }, (t0 + i * step) * 1000));
}

// ---- Predator missile: you ride it down. Mouse / stick steer, click / RT boosts, it hits whatever it meets.
const PRED = { on: false };
function predStart() {
  SURV.support.shift(); const L = world.L, [x0, z0, x1, z1] = L.bounds; aimBasis();
  const tgt = player.pos.clone().addScaledVector(new V3(_f.x, 0, _f.z).normalize(), 30), start = tgt.clone().add(new V3(-_f.x * 70, 0, -_f.z * 70)); start.x = clamp(start.x, x0 - 40, x1 + 40); start.z = clamp(start.z, z0 - 40, z1 + 40); start.y = 120;
  const g = new THREE.Group(), m = ksMat(0xd8dcd6, 0.4, 0.5); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.4, 8), m); body.rotation.x = Math.PI / 2; g.add(body);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.2, 8), new THREE.MeshBasicMaterial({ color: 0xffb050 })); flame.rotation.x = -Math.PI / 2; flame.position.z = -1.7; g.add(flame); g.visible = false; scene.add(g); /* you are the camera: the body would only block the view */
  const d = tgt.clone().sub(start).normalize();
  Object.assign(PRED, { on: true, g, flame, pos: start, yaw: Math.atan2(d.x, d.z), pitch: Math.asin(d.y), t: 0, boost: false, life: 10, trail: 0 });
  const ov = $('predov') || (() => { const o = document.createElement('div'); o.id = 'predov'; o.innerHTML = '<div class="pret"></div><div class="pbox"></div><div class="ptop"><b>PREDATOR MISSILE</b><span></span></div><div class="pbar"><u></u></div><div class="phelp"></div>'; $('hud').appendChild(o); return o; })();
  ov.classList.add('on'); $('hud').classList.add('predmode'); renderer.domElement.style.filter = 'grayscale(1) contrast(1.35) brightness(1.08)'; mouseL = mL = false; showHint('PREDATOR MISSILE AWAY', '#ff6b5a'); sfx.play('wave');
}
function predSteer(dx, dy) { if (!PRED.on) return; PRED.yaw -= dx; PRED.pitch = clamp(PRED.pitch - dy, -1.5, -0.25); }
function predEnd(boom) {
  if (!PRED.on) return; PRED.on = false; scene.remove(PRED.g); const ov = $('predov'); if (ov) ov.classList.remove('on'); $('hud').classList.remove('predmode'); renderer.domElement.style.filter = '';
  if (boom) callAirstrike(PRED.pos.clone(), 'pred', null, [PRED.pos.clone()]);
}
function predTick(dt) {
  if (!PRED.on) return; const P = PRED; if (!player.alive || game.state !== 'play') return predEnd(false);
  P.t += dt; if (mouseL || (gp.on && gp.fire)) P.boost = true;
  const sp = P.boost ? 95 : 32, d = new V3(Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), Math.cos(P.yaw) * Math.cos(P.pitch)), step = sp * dt;
  const h = raycast(P.pos, d, step + 0.5, false), hitW = h.t < step + 0.49; let hitE = null; /* a miss reports the full ray length */
  for (const list of [enemies, remoteList]) for (const e of list) { if (e.dead) continue; if (Math.hypot(e.pos.x - P.pos.x, e.pos.y + 1 - P.pos.y, e.pos.z - P.pos.z) < 1.6 + step) hitE = e; }
  if (hitW || hitE || P.pos.y + d.y * step < TH(P.pos.x, P.pos.z) + 0.3 || P.t > P.life) { if (hitW) P.pos.addScaledVector(d, Math.max(0, h.t - 0.2)); return predEnd(true); }
  P.pos.addScaledVector(d, step); P.g.position.copy(P.pos); P.g.lookAt(P.pos.clone().add(d)); P.flame.scale.setScalar(P.boost ? 1.8 + Math.random() * 0.4 : 1 + Math.random() * 0.2);
  P.trail -= dt; if (P.trail <= 0) { P.trail = 0.02; debris.emit && debris.emit(P.pos.x - d.x * 3, P.pos.y - d.y * 3, P.pos.z - d.z * 3, rand(-0.3, 0.3), rand(0.2, 0.6), rand(-0.3, 0.3), 0.75, 0.75, 0.72, 1.2, 0.05); }
  camera.position.copy(P.pos).addScaledVector(d, 0.3); /* the nose camera: trail and body stay behind you */ camera.lookAt(P.pos.clone().addScaledVector(d, 10)); camera.fov = 62; camera.updateProjectionMatrix(); sky.position.copy(camera.position);
  const ov = $('predov'); if (!ov) return; ov.querySelector('.pbar u').style.width = (100 * (1 - P.t / P.life)).toFixed(1) + '%';
  setHTML(ov.querySelector('.ptop span'), `ALT ${Math.max(0, Math.round(P.pos.y - TH(P.pos.x, P.pos.z)))} m${P.boost ? ' · BOOST' : ''}`);
  setHTML(ov.querySelector('.phelp'), P.boost ? 'BOOSTING' : (gp.on ? '<kbd>STICKS</kbd> steer · <kbd class="big">RT</kbd> boost' : '<kbd>MOUSE</kbd> steer · <kbd class="big">CLICK</kbd> boost'));
  let html = ''; for (const list of [enemies, remoteList]) for (const e of list) { if (e.dead || isAlly(PLAYER_T, e)) continue; const v = new V3(e.pos.x, e.pos.y + 1, e.pos.z).project(camera); if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
    html += `<i style="left:${((v.x * 0.5 + 0.5) * 100).toFixed(2)}%;top:${((-v.y * 0.5 + 0.5) * 100).toFixed(2)}%"></i>`; } /* thermal: every enemy boxed in red */
  const bx = ov.querySelector('.pbox'); if (bx._h !== html) { bx._h = html; bx.innerHTML = html; }
}

// ---- Attack helicopter: circles the map, picks visible enemies, fires minigun bursts. Online it streams its position.
const HELI = { on: false, ghosts: {} };
function makeHeli() { const g = new THREE.Group(), body = ksMat(0x3c4434, 0.6, 0.3), dark = ksMat(0x1c1f1c, 0.5, 0.5);
  const cab = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), body); cab.scale.set(1, 0.9, 1.9); g.add(cab);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), ksMat(0x0c1418, 0.1, 0.8)); glass.scale.set(0.9, 0.7, 1); glass.position.set(0, 0.3, 1.7); g.add(glass);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.45, 6, 8), body); boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.4, -4.4); g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.9), body); fin.position.set(0, 1.1, -7.2); g.add(fin);
  for (const sd of [-1, 1]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.6), dark); sk.position.set(sd * 1.1, -1.5, 0); g.add(sk); const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8), dark); pod.rotation.x = Math.PI / 2; pod.position.set(sd * 1.7, -0.4, 0.6); g.add(pod); }
  const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 6), dark); gun.rotation.x = Math.PI / 2; gun.position.set(0, -1.1, 2.4); g.add(gun);
  const rotor = new THREE.Group(); rotor.position.y = 1.6; for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 6.4), dark); b.rotation.y = i * Math.PI / 4 * 2; b.position.set(0, 0, 0); rotor.add(b); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(6.4, 28), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2; rotor.add(disc); g.add(rotor);
  const tr = new THREE.Group(); tr.position.set(0.25, 1.2, -7.2); for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.12), dark); b.rotation.x = i * Math.PI / 2; tr.add(b); } g.add(tr);
  g.userData = { rotor, tr }; g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g; }
function heliStart() {
  SURV.support.shift(); const [x0, z0, x1, z1] = world.L.bounds, c = new V3((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const g = makeHeli(); scene.add(g); Object.assign(HELI, { on: true, g, c, r: Math.max(18, Math.min(x1 - x0, z1 - z0) * 0.32), ang: Math.atan2(player.pos.z - c.z, player.pos.x - c.x), t: 45, burst: 0, cd: 1.5, tgt: null, look: 0, send: 0, snd: 0, pos: new V3() });
  showHint('ATTACK HELICOPTER INBOUND', '#ff6b5a'); sfx.play('wave');
}
function heliTick(dt) {
  for (const id in HELI.ghosts) { const G = HELI.ghosts[id]; G.age += dt; G.g.position.lerp(G.p, 1 - Math.exp(-dt * 6)); G.g.rotation.y += angDiff(G.g.rotation.y, G.yaw) * (1 - Math.exp(-dt * 6)); G.g.userData.rotor.rotation.y += dt * 30; if (G.age > 2) { scene.remove(G.g); delete HELI.ghosts[id]; } }
  if (!HELI.on) return; const H = HELI; H.t -= dt; if (H.t <= 0 || game.state !== 'play' && game.state !== 'dying') { scene.remove(H.g); H.on = false; if (MP.active) netSend({ t: 'heli', end: 1 }); return; }
  H.ang += dt * 0.16; const ground = TH(H.c.x + Math.cos(H.ang) * H.r, H.c.z + Math.sin(H.ang) * H.r);
  H.pos.set(H.c.x + Math.cos(H.ang) * H.r, Math.max(ground, 0) + 24 + Math.sin(H.t * 0.9) * 1.2, H.c.z + Math.sin(H.ang) * H.r);
  if (H.t > 43) H.pos.y += (H.t - 43) * 30; /* swoops in */
  H.g.position.copy(H.pos); const tg = H.tgt && !H.tgt.dead ? H.tgt : null, faceYaw = tg ? Math.atan2(tg.pos.x - H.pos.x, tg.pos.z - H.pos.z) : H.ang + Math.PI;
  H.g.rotation.y += angDiff(H.g.rotation.y, faceYaw) * (1 - Math.exp(-dt * 3)); H.g.rotation.x = 0.12; H.g.userData.rotor.rotation.y += dt * 32; H.g.userData.tr.rotation.x += dt * 50;
  H.snd -= dt; if (H.snd <= 0) { H.snd = 0.11; const sp = spatial(H.pos); sfx.play('heli', { pan: sp.pan, pos: sp.pos, vol: Math.max(0.15, sp.vol) }); }
  if (MP.active) { H.send -= dt; if (H.send <= 0) { H.send = 0.2; netSend({ t: 'heli', p: v3a(H.pos), y: Math.round(H.g.rotation.y * 100) / 100 }); } }
  H.look -= dt; if (H.look <= 0) { H.look = 0.3; let best = null, bd = 1e9; /* nearest enemy it can actually see */
    for (const list of [enemies, remoteList]) for (const e of list) { if (e.dead || isAlly(PLAYER_T, e)) continue; const d = e.pos.distanceTo(H.pos); if (d > 75 || d > bd) continue; if (!los(H.pos.x, H.pos.y - 1.2, H.pos.z, e.pos.x, e.pos.y + 1.2, e.pos.z)) continue; best = e; bd = d; }
    if (best !== H.tgt) { H.tgt = best; if (best) H.cd = Math.max(H.cd, 0.6); } }
  H.cd -= dt; if (!tg || H.cd > 0) return;
  H.burst = (H.burst || 0) + dt; if (H.burst > 1.1) { H.burst = 0; H.cd = rand(0.9, 1.5); return; }
  H.fire = (H.fire || 0) - dt; if (H.fire > 0) return; H.fire = 0.075;
  const mz = H.g.localToWorld(new V3(0, -1.1, 3)), aim = new V3(tg.pos.x + rand(-0.9, 0.9), tg.pos.y + rand(0.3, 1.7), tg.pos.z + rand(-0.9, 0.9)), dirv = aim.clone().sub(mz), L = dirv.length(); dirv.divideScalar(L);
  const h = raycast(mz, dirv, L + 1, false); const end = mz.clone().addScaledVector(dirv, Math.min(h.t, L + 1)); spawnTracer(mz, end, 0xffc070, 600, 0.03);
  if (MP.active) netSend({ t: 'shot', a: v3a(mz), b: v3a(end), w: 'heli' });
  { const sp = spatial(mz); sfx.gun('lmg', { dist: sp.dist, pan: sp.pan, pos: sp.pos, vol: 0.7 }); }
  if (h.t >= L - 0.4 && Math.hypot(end.x - tg.pos.x, end.z - tg.pos.z) < 0.75) { game.ksKind = 'heli'; try { bloodHit(end.clone(), dirv.clone(), false); tg.damage(34, false, { x: dirv.x * 2, z: dirv.z * 2 }, 'player'); } finally { game.ksKind = null; } }
  else impactFx && impactFx(end, -dirv.x, -dirv.y, -dirv.z, h.box, false);
}
function heliGhost(id, d) { if (d.end) { const G = HELI.ghosts[id]; if (G) { scene.remove(G.g); delete HELI.ghosts[id]; } return; } const p = arrV3(d.p); if (!p) return;
  let G = HELI.ghosts[id]; if (!G) { G = HELI.ghosts[id] = { g: makeHeli(), p: p.clone(), yaw: 0, age: 0 }; G.g.position.copy(p); scene.add(G.g); showHint('ENEMY ATTACK HELICOPTER', '#ff6b5a'); }
  G.p.copy(p); G.yaw = num(d.y, 0); G.age = 0; }

// ---- loadout: the KILLSTREAKS slot (pick up to 3)
function ksLoadoutPanel(right, lo, rerender) {
  const cur = ksPicked(lo), grid = document.createElement('div'); grid.className = 'wcards kscards';
  const tip = document.createElement('div'); tip.className = 'kstip'; tip.innerHTML = `Pick <b>3</b> — earned by kills in a row (dying resets the count; kills made by a killstreak don't count). Use with <kbd>Z</kbd> / D-pad right.`; right.appendChild(tip);
  for (const id of KS_ORDER) { const D = KS_DEFS[id], on = cur.includes(id), b = document.createElement('button'); b.className = 'wcard kscard' + (on ? ' on' : '');
    b.innerHTML = `<i class="ksi">${KS_ICON[id]}</i><b>${D.name}</b><span>${D.desc}</span><em>${D.n} KILLS</em>${on ? '<i class="kson">✓</i>' : ''}`;
    b.onclick = () => { let v = cur.slice(); if (on) { if (v.length <= 1) { showMenuToast('Keep at least one killstreak'); return; } v = v.filter(x => x !== id); } else { if (v.length >= 3) { showMenuToast("You can carry 3 — tap one of yours to remove it first"); sfx.play("hit"); return; } v.push(id); } setLO('streaks', v); rerender(); };
    grid.appendChild(b); }
  right.appendChild(grid);
}
