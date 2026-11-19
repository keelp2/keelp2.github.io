// ============================================================ PLAY OF THE GAME
// Every client records its own view of the match (~20 snapshots/s: everyone's position, facing, aim, alive) plus tracers,
// explosions and kills. At the end the best ~8 s is scored from the kill feed (which every client shares, so everyone picks
// the same hero) and replayed over the hero's shoulder before the results. Nothing extra goes over the network.
const POTG = { on: false, t: 0, acc: 0, frames: [], ev: [], actors: {}, names: {}, nid: 0 };
function potgReset() { const on = game.mode === 'botdm' || (MP.active && MP.mode !== 'surv'); Object.assign(POTG, { on, t: 0, acc: 0, frames: [], ev: [], actors: {}, names: {}, nid: 0 }); }
function potgActor(id, info) { if (!POTG.actors[id]) { POTG.actors[id] = info; for (const n of info.names) POTG.names[n] = id; } }
function potgRecord(dt) {
  if (!POTG.on || game.outro || game.introT > 0) return; POTG.t += dt; POTG.acc += dt; if (POTG.acc < 0.05) return; POTG.acc = 0;
  if (POTG.frames.length > 20 * 900) POTG.frames.splice(0, 20 * 60); // keep at most 15 minutes
  const a = [], myTeam = MP.active && MP.mode === 'tdm' ? mpTeamOf(PLAYER_T) : 0;
  potgActor('me', { names: ['You', cleanName(settings.name)], name: cleanName(settings.name) + '#' + PROFILE.tag, kind: cls().model, faction: myTeam, seed: PROFILE.id, human: true });
  a.push(['me', player.pos.x, player.pos.y, player.pos.z, player.yaw + Math.PI, player.pitch || 0, player.alive ? 1 : 0, WEAPONS[wst.cur].id, Math.round(wst.ads * 10) / 10, Math.round((player.crouch || 0) * 10) / 10, player.sliding ? 1 : 0]);
  for (const e of enemies) { if (!e._pid) e._pid = 'e' + (POTG.nid++); potgActor(e._pid, { names: [e.T && e.T.name, e.netId && MP.players[e.netId] && MP.players[e.netId].name].filter(Boolean), name: (e.T && e.T.name) || 'Bot', kind: e.kind, faction: e.look ? e.look.faction : 1, seed: e.T && e.T.name, human: false, troop: e.troop });
    a.push([e._pid, e.pos.x, e.pos.y, e.pos.z, e.yaw, e.aimPitch || 0, e.dead ? 0 : 1, e.W ? e.W.id : 'rifle', e.visible && e.target && (e.aimT > 0 || e.state === 'engage') ? 1 : 0, Math.round((e.crouchK || 0) * 10) / 10]); }
  for (const r of remoteList) { const id = 'r' + r.id; potgActor(id, { names: [r.name], name: r.name, kind: r.kind, faction: r.look ? r.look.faction : 0, seed: r.name, look: r.look, human: !(MP.players[r.id] && MP.players[r.id].bot), troop: r.troop });
    a.push([id, r.pos.x, r.pos.y, r.pos.z, r.yaw + Math.PI, r.pitch || 0, r.dead ? 0 : 1, r.weaponId || 'rifle', r.lastAd || 0, r.lastH ? clamp((1.75 - r.lastH) / 0.6, 0, 1) : 0, r.lastSl || 0]); }
  { const A = POTG.actors.me; (A.att || (A.att = {}))[WEAPONS[wst.cur].id] = Object.assign({}, settings.att[WEAPONS[wst.cur].id]); }
  for (const r of remoteList) if (r.att && r.weaponId) { const A = POTG.actors['r' + r.id]; if (A) (A.att || (A.att = {}))[r.weaponId] = r.att; }
  POTG.frames.push({ t: POTG.t, a });
}
const potgEvent = (type, o) => { if (POTG.on && !game.outro && game.state === 'play' && !game.potg) POTG.ev.push(Object.assign({ t: POTG.t, type }, o)); };
function potgPick() { // CoD-style scoring: kills, headshots, kill chains, long shots, the match winner; online, real players beat bots
  const posAt = (id, t) => { let best = null, bd = 1e9; for (let i = Math.max(0, Math.floor(POTG.frames.length * t / Math.max(POTG.t, 1)) - 40); i < POTG.frames.length; i++) { const f = POTG.frames[i], d = Math.abs(f.t - t); if (d < bd) { bd = d; best = f; } else if (f.t > t) break; } const a = best && best.a.find(x => x[0] === id); return a ? new V3(a[1], a[2], a[3]) : null; };
  const kills = POTG.ev.filter(e => e.type === 'kill' && e.k && POTG.names[e.k] && POTG.names[e.k] !== POTG.names[e.v]), last = kills[kills.length - 1];
  const byHero = {}; for (const e of kills) (byHero[POTG.names[e.k]] || (byHero[POTG.names[e.k]] = [])).push(e);
  const anyHuman = Object.keys(byHero).some(id => POTG.actors[id] && POTG.actors[id].human); let best = null;
  for (const id in byHero) { if (MP.active && anyHuman && !POTG.actors[id].human) continue; const ks = byHero[id];
    for (let i = 0; i < ks.length; i++) { let j = i; while (j + 1 < ks.length && ks[j + 1].t - ks[j].t < 4.5 && ks[j + 1].t - ks[i].t < 9) j++; // a chain of kills, each within 4.5 s of the last
      const win = ks.slice(i, j + 1), n = win.length; let sc = 0;
      for (const k of win) { sc += 100 + (k.h ? 60 : 0); const a = posAt(id, k.t), v = posAt(POTG.names[k.v], k.t - 0.1); if (a && v && a.distanceTo(v) > 30) sc += 40; if (k === last) sc += 80; }
      sc += n > 1 ? 150 * (n - 1) * (1 + 0.25 * (n - 2)) : 0; if (id === 'me' && !MP.active) sc += 30;
      if (!best || sc > best.sc) best = { id, sc, n, t0: Math.max(win[0].t - 3.0, POTG.frames[0] ? POTG.frames[0].t : 0), t1: Math.min(win[n - 1].t + 1.8, win[0].t - 3 + 12), kills: win }; } }
  return best && POTG.frames.length > 10 ? best : null;
}
// Killcam: when you die, replay the last few seconds through your killer's eyes while you wait to respawn
function potgKillcam(id) { if (!MP.active || !POTG.on || !id || !POTG.actors[id]) return; game.killcamQ = { id, t: POTG.t, at: game.time + 0.8 }; MP.respawnT = Math.max(MP.respawnT, 4.4); } // online only
function killcamTick(dt) {
  const Q = game.killcamQ; if (Q && !game.potg && !player.alive && game.time >= Q.at) { game.killcamQ = null; const t1 = Math.min(Q.t + 0.9, POTG.t), ev = POTG.ev.filter(e => e.type === 'kill' && e.t >= Q.t - 0.5 && e.t <= Q.t + 0.5);
    startPotg(() => {}, { id: Q.id, sc: 0, n: 1, t0: Math.max(0, t1 - 3.4), t1, kills: ev }, true); }
  if (game.potg && game.potg.killcam) { if (player.alive) endPotg(); else updatePotg(dt); }
}
function startPotg(done, Bk, killcam) {
  const B = Bk || potgPick(); if (!killcam) POTG.on = false; if (!B) return done();
  const A = POTG.actors[B.id], fr = POTG.frames.filter(f => f.t >= B.t0 - 0.2 && f.t <= B.t1 + 0.2); if (fr.length < 4) return done();
  const ghosts = {}, hidden = [];
  for (const o of [...enemies, ...remoteList]) if (o.group && o.group.visible) { o.group.visible = false; hidden.push(o); } if (avatar) { avatar.group.visible = false; hidden.push(avatar); }
  const ids = new Set(); for (const f of fr) for (const a of f.a) ids.add(a[0]);
  for (const id of ids) { const I = POTG.actors[id]; if (!I) continue; const ch = makeCharacter(I.kind || 'knight', { weapon: (fr[0].a.find(a => a[0] === id) || [])[7] || 'rifle', faction: I.faction, seed: I.seed, byClass: I.human, troop: I.troop }); ch.group.visible = false; world.group.add(ch.group); ghosts[id] = ch; }
  const ov = $('potgov') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'potgov' }));
  ov.innerHTML = killcam ? `<div class="ptitle"><small>KILLCAM</small><b>${esc(A.name.toUpperCase())}</b><i>HOW YOU WENT DOWN</i></div><div class="pcall" id="potgCall"></div><div class="pscope" id="potgScope"></div><div class="pskip">${gp.on ? 'A' : 'SPACE / CLICK'} — SKIP</div>` : `<div class="ptitle"><small>PLAY OF THE GAME</small><b>${esc(A.name.toUpperCase())}</b><i>${B.n > 1 ? ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'RAMPAGE'][Math.min(5, B.n)] : 'CLUTCH ELIMINATION'}</i></div><div class="pcall" id="potgCall"></div><div class="pscope" id="potgScope"></div><div class="pskip">${gp.on ? 'A' : 'SPACE / CLICK'} — SKIP</div>`;
  ov.className = 'on' + (killcam ? ' kc' : ''); if (killcam) $('hud').classList.add('kcmode'); else { $('hud').classList.add('potgmode'); $('feed').innerHTML = ''; } $('hint').textContent = ''; hud.hintT = 0; // killcam keeps the score bar up
  game.potg = { t: B.t0, B, fr, ghosts, hidden, done, ei: POTG.ev.findIndex(e => e.t >= B.t0), cam: null, kc: 0, skip: false, real: 0, killcam: !!killcam };
  if (!killcam) { game.state = 'potg'; sfx.play('levelup'); }
  const sk = e => { if (game.potg && (e.type !== 'keydown' || e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) game.potg.skip = true; }; addEventListener('keydown', sk); addEventListener('mousedown', sk); game.potg.unbind = () => { removeEventListener('keydown', sk); removeEventListener('mousedown', sk); };
}
function updatePotg(dt) {
  const G = game.potg; if (!G) return; G.real += dt; if (gp.on && gp.pressed && gp.pressed('a')) G.skip = true;
  if (G.killcam) for (const o of [...enemies, ...remoteList]) if (o.group && o.group.visible) { o.group.visible = false; G.hidden.includes(o) || G.hidden.push(o); }
  const lastK = G.B.kills[G.B.kills.length - 1], dk = lastK ? G.t - lastK.t : -9; G.sl = damp(G.sl || 0, dk > -0.45 && dk < 0.9 ? 1 : 0, 7, dt); const slow = lerp(1, 0.32, G.sl); G.t += dt * slow; // slow-mo only for the final kill
  if (G.t >= G.B.t1 || G.skip || G.real > 16) return endPotg();
  let i = G.fi || 0; if (G.fr[i] && G.fr[i].t > G.t) i = 0; while (i < G.fr.length - 2 && G.fr[i + 1].t < G.t) i++; G.fi = i; const f0 = G.fr[i], f1 = G.fr[i + 1] || f0, fm = G.fr[i - 1] || f0, f2 = G.fr[i + 2] || f1, k = clamp((G.t - f0.t) / Math.max(1e-3, f1.t - f0.t), 0, 1);
  /* Catmull-Rom through the 20 Hz samples (straight lines between them read as jitter, worst on the camera); falls back to linear across a teleport */
  const CR = (p0, p1, p2, p3, u) => 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
  for (const id in G.ghosts) { const ch = G.ghosts[id], a0 = f0.a.find(a => a[0] === id), a1 = f1.a.find(a => a[0] === id) || a0;
    if (!a0) { ch.group.visible = false; continue; }
    if (!a0[6]) { if (!ch._seen) { ch.group.visible = false; continue; } /* died in the clip: drop where they stood, the same fall as in game */
      if (ch._deadT == null) { ch._deadT = 0; ch._fallDir = Math.random() < 0.5 ? -1 : 1; } ch._deadT += dt * slow; const fk = Math.min(1, ch._deadT / 0.5);
      ch.group.rotation.x = -ch._fallDir * fk * fk * 1.45; ch.group.position.y = ch._ly - 0.05 * fk; if (ch.mixer) ch.mixer.update(0); continue; }
    if (ch._deadT != null) { ch._deadT = null; ch.group.rotation.x = 0; } ch._seen = true; ch.group.visible = true;
    let am = fm.a.find(a => a[0] === id) || a0, a2 = f2.a.find(a => a[0] === id) || a1; const jump = (p, q) => Math.abs(p[1] - q[1]) + Math.abs(p[3] - q[3]) > 3 || !p[6] !== !q[6];
    if (jump(am, a0)) am = a0; if (jump(a1, a2)) a2 = a1; const lin = jump(a0, a1);
    const P = j => lin ? lerp(a0[j], a1[j], k) : CR(am[j], a0[j], a1[j], a2[j], k), Y0 = a0[4] + angDiff(a0[4], am[4]), Y2 = a0[4] + angDiff(a0[4], a1[4]), Y3 = Y2 + angDiff(a1[4], a2[4]);
    const x = P(1), y = P(2), z = P(3), yaw = lin ? a0[4] + angDiff(a0[4], a1[4]) * k : CR(Y0, a0[4], Y2, Y3, k), pitch = clamp(P(5), -1.5, 1.5);
    const sp0 = Math.hypot(a1[1] - a0[1], a1[3] - a0[3]) / Math.max(1e-3, f1.t - f0.t), sp = ch._sp = lin ? 0 : damp(ch._sp == null ? sp0 : ch._sp, sp0, 6, dt * slow);
    ch.group.position.set(x, y, z); ch._ly = y; ch.group.rotation.y = yaw; ch.sliding = !!a0[10]; if (ch.weaponId !== a0[7] && a0[7]) { try { setCharWeapon(ch, a0[7]); ch.weaponId = a0[7]; } catch (e) {} } animChar(ch, dt * slow, sp, a0[5]);
    if (id === G.B.id) { G.hero = { x, y, z, yaw, pitch, snap: lin, ads: lerp(a0[8] || 0, a1[8] || 0, k), crouch: lerp(a0[9] || 0, a1[9] || 0, k), slide: G.slK = damp(G.slK || 0, a0[10] ? 1 : 0, 10, dt) }; G.spd = sp; if (G.vmId !== a0[7] && a0[7]) potgViewmodel(G, a0[7], ((POTG.actors[id] || {}).att || {})[a0[7]]); } }
  for (; G.ei >= 0 && G.ei < POTG.ev.length && POTG.ev[G.ei].t <= G.t; G.ei++) { const e = POTG.ev[G.ei]; if (e.t < G.B.t0) continue; const cp = camera.position;
    if (e.type === 'tr') { const mine = G.hero && Math.hypot(e.a[0] - G.hero.x, e.a[2] - G.hero.z) < 1.6; if (mine) { G.lastTr = { t: e.t, b: e.b }; G.kick = 1; if (G.vm && G.vm.userData.flash) { G.vm.userData.flash.visible = true; setTimeout(() => { if (G.vm) G.vm.userData.flash.visible = false; }, 50); } }
      spawnTracer(mine && G.vm ? G.vm.localToWorld(new V3(0, 0.03, -0.75)) : new V3(...e.a), new V3(...e.b), 0xffd890, 700, 0.016); const d = Math.hypot(e.a[0] - cp.x, e.a[2] - cp.z); sfx.gun(e.g || 'rifle', { dist: d, pos: { x: e.a[0], y: e.a[1], z: e.a[2] }, vol: 0.9 }); }
    else if (e.type === 'blood') { bloodHit(new V3(...e.p), new V3(...e.d), !!e.h); const L = G.lastTr; if (L && e.t - L.t < 0.15 && Math.hypot(e.p[0] - L.b[0], e.p[1] - L.b[1], e.p[2] - L.b[2]) < 1.6) { hitMarker(false, !!e.h); G.lastTr = null; } }
    else if (e.type === 'imp') impactFx(new V3(...e.p), e.n[0], e.n[1], e.n[2], e.b, false);
    else if (e.type === 'boom') { sfx.boom(Math.hypot(e.p[0] - cp.x, e.p[2] - cp.z), 0, 1, { x: e.p[0], y: e.p[1], z: e.p[2] }); debris.burst(e.p[0], e.p[1] + 0.3, e.p[2], 24, 9, 1, 0.75, 0.4, 0.9, 1); }
    else if (e.type === 'kill' && e.vn != null && !(POTG.names[e.k] === G.B.id)) feedLine(e.k, e.kc, e.w, e.h, e.vn, e.vc, false);
    if (e.type === 'kill' && POTG.names[e.k] === G.B.id) { if (e.vn != null) feedLine(e.k, e.kc, e.w, e.h, e.vn, e.vc, true); hitMarker(true, !!e.h); G.kc++; const c = $('potgCall'); if (c) { c.textContent = (e.h ? 'HEADSHOT · ' : '') + (['', 'ELIMINATED ' + (e.v || '').toUpperCase(), 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'RAMPAGE'][Math.min(5, G.kc)]); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } if (e.h) sfx.play('hmhead'); } }
  const H = G.hero; if (!H) return; // through the hero's eyes, with their gun in hand
  const eye = new V3(H.x, H.y + 1.62 - 0.55 * H.crouch - 0.2 * (H.slide || 0), H.z), Wp = WEAPONS[widx(G.vmId || 'rifle')] || WEAPONS[0], ads = H.ads > 0.5 ? 1 : H.ads * 2, scoped = !!Wp.scope && H.ads > 0.85; // exactly what they saw: same aim, stance and zoom
  camera.position.copy(eye); camera.lookAt(eye.x + Math.sin(H.yaw) * 20 * Math.cos(H.pitch), eye.y + Math.sin(H.pitch) * 20, eye.z + Math.cos(H.yaw) * 20 * Math.cos(H.pitch));
  if (H.slide > 0.01) camera.rotateZ(0.11 * H.slide);
  { const q = camera.quaternion; if (!G.cq || H.snap || G.cq.angleTo(q) > 0.9) G.cq = q.clone(); else G.cq.slerp(q, 1 - Math.exp(-dt * 38)); q.copy(G.cq); } /* a light filter on top: takes the edge off steppy aim without visible lag */
  camera.fov = settings.fov / lerp(1, Wp.zoom || 1.3, ads); camera.updateProjectionMatrix(); sky.position.copy(camera.position);
  const sc = $('potgScope'); if (sc) sc.style.opacity = scoped ? 1 : 0; G.xh = settings.xhair === 'none' ? 0 : Math.max(0, 1 - H.ads * 1.6) * (G.spd > 5.5 && H.ads < 0.2 ? 0.3 : 1); $('xh').style.opacity = G.xh; if (!G.killcam) hitTick(dt);
  const hg = G.ghosts[G.B.id]; if (hg) hg.group.visible = false;
  if (G.vm) { G.kick = Math.max(0, (G.kick || 0) - dt * 9); const bob = Math.sin(G.real * 9) * 0.004 * Math.min(1, (G.spd || 0) / 3);
    const hp = Wp.hip || [0.12, -0.13, -0.36], ap = Wp.adsPos || [0, -0.07, -0.3], aa = H.ads; G.vm.visible = !scoped;
    G.vm.position.copy(camera.position); G.vm.quaternion.copy(camera.quaternion); G.vm.translateX(lerp(hp[0], ap[0], aa)); G.vm.translateY(lerp(hp[1], ap[1], aa) + bob * (1 - aa) - G.kick * 0.01); G.vm.translateZ(lerp(hp[2], ap[2], aa) + G.kick * 0.05); G.vm.rotateX(G.kick * 0.08 * (1 - 0.6 * aa)); }
}
function potgViewmodel(G, id, att) { // the hero's weapon, held in first person for the replay
  if (G.vm) { scene.remove(G.vm); G.vm = null; } G.vmId = id; const i = widx(id); if (i < 0) return;
  try { const gm = buildGun(id, att || {}, true), g = new THREE.Group(); gm.g.traverse(m => { if (m.isMesh) { m.frustumCulled = false; m.renderOrder = 10; } }); g.add(gm.g); g.userData.flash = gm.flash; if (gm.flash) gm.flash.visible = false; scene.add(g); G.vm = g; } catch (e) { G.vm = null; }
}
function endPotg() {
  const G = game.potg; if (!G) return; game.potg = null; G.unbind && G.unbind(); if (G.vm) scene.remove(G.vm);
  for (const id in G.ghosts) { const g = G.ghosts[id].group; if (g.parent) g.parent.remove(g); } for (const o of G.hidden) o.group.visible = true;
  $('xh').style.opacity = 0; hud.hitT = 0; $('hit').style.opacity = 0;
  const ov = $('potgov'); if (ov) ov.className = ''; $('hud').classList.remove('cine'); $('hud').classList.remove('potgmode'); $('hud').classList.remove('kcmode');
  if (!G.killcam) game.state = 'play'; camera.fov = settings.fov; camera.updateProjectionMatrix(); G.done();
}
function startOutro(res, why, done) {
  if (game.state === 'paused') { game.state = 'play'; showScreen(null); }
  game.outro = { t: 0, res, done, from: null }; mouseL = mouseR = false; for (const k in keys) keys[k] = false; nadeExit && nadeExit();
  $('outroTitle').textContent = res === 'win' ? 'VICTORY' : res === 'draw' ? 'DRAW' : 'DEFEAT'; $('outroWhy').textContent = why || ''; $('outroov').className = 'on ' + res;
  music.stop(); setTimeout(() => music.play(res === 'win' ? 'win' : 'lose'), 250); sfx.play(res === 'win' ? 'go' : 'cd'); rumble(0.5, 0.5, 400);
}
function updateOutro(dt) {
  const O = game.outro; O.t += dt;
  if (O.t > 4.4) { game.outro = null; $('outroov').className = ''; const fin = () => { if (document.pointerLockElement) document.exitPointerLock(); O.done(); const sc = document.querySelector('.screen.on .panel'); if (sc) { sc.classList.remove('fadein'); void sc.offsetWidth; sc.classList.add('fadein'); } animateXP(); }; if (POTG.on) startPotg(fin); else fin(); }
}
function outroCam() { // after the final moment: cut to a low, slow orbit that pulls back from your operator (no more floating off into the sky)
  const O = game.outro; if (!O || O.t < 1.4) return; const P = player, k = smooth(1.4, 4.4, O.t), chest = new V3(P.pos.x, P.pos.y + 1.25, P.pos.z), piv = new V3(P.pos.x, P.pos.y + 1.5, P.pos.z);
  if (O.a0 === undefined) { let best = 0, bs = -1; for (let i = 0; i < 10; i++) { const a = P.yaw + (i - 4.5) * 0.45, v = new V3(-Math.sin(a) * 4.6, 0.7, -Math.cos(a) * 4.6), l = v.length(), h = raycast(piv, v.clone().divideScalar(l), l, false), sc = Math.min(1, h.t / l) - Math.abs(i - 4.5) * 0.02; if (sc > bs) { bs = sc; best = a; } } O.a0 = best; } // prefer a view of your front
  const a = O.a0 + k * 0.6, dist = lerp(2.4, 4.6, k), hgt = lerp(0.2, 0.75, k), dir = new V3(-Math.sin(a), 0, -Math.cos(a)).multiplyScalar(dist).add(new V3(0, hgt, 0)), l = dir.length(); dir.divideScalar(l);
  const h = raycast(piv, dir, l + 0.3, false), allow = Math.max(0.8, Math.min(l, h.t - 0.3)); O.boom = O.boom === undefined ? allow : Math.min(allow, damp(O.boom, allow, 3, 1 / 60));
  camera.position.copy(piv).addScaledVector(dir, O.boom); camera.lookAt(chest); camera.rotation.z = 0; sky.position.copy(camera.position);
}
function animateXP() { const b = document.querySelector('#mpover .xpres u, #over .xpres u'); if (!b) return; const w = b.dataset.to || '0'; b.style.transition = 'none'; b.style.width = (b.dataset.from || 0) + '%'; requestAnimationFrame(() => { b.style.transition = 'width 1.6s cubic-bezier(.2,.8,.2,1) .4s'; b.style.width = w + '%'; }); }
function startIntro(mode, obj) {
  if (settings.intro === false) return; const P = player;
  game.intro = { t: 0, dur: 5.4, glide: 3.0, last: 4, yaw: P.yaw };
  game.introT = 5.4; $('hud').classList.add('cine'); $('introMap').textContent = world.def.name; $('introMode').textContent = mode; $('introObj').textContent = obj || ''; $('introov').className = 'on'; $('ifade').style.opacity = 1;
}
// Cinematic deploy, one continuous move (no cuts): from high above the area the camera swoops down along a smooth curve and
// settles exactly into your eyes, then 3-2-1-GO in first person. The start point is chosen for a clear line to your operator
// (indoors it starts just under the ceiling), and collision can only shorten a smoothed distance, so it never pops.
const _bz = (a, b, c, d, t) => { const u = 1 - t; return new V3().addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t); };
function updateIntro(dt0) {
  const I = game.intro; if (!I) { game.introT = 0; return; }
  const loading = $('loading').classList.contains('on'), dt = loading ? 0 : Math.min(dt0, 1 / 20); // hold until the loading screen is gone
  I.t += dt; game.introT = I.dur - I.t; const P = player, fx = -Math.sin(I.yaw), fz = -Math.cos(I.yaw), rx = Math.cos(I.yaw), rz = -Math.sin(I.yaw);
  const eye = new V3(P.pos.x, P.pos.y + P.h - 0.12, P.pos.z), at = (u, f, r) => new V3(P.pos.x + fx * f + rx * r, P.pos.y + u, P.pos.z + fz * f + rz * r);
  $('ifade').style.opacity = clamp(1 - smooth(0, 0.6, I.t), 0, 1).toFixed(3);
  if (!I.path) { // pick the clearest start: behind-high, either side, or (indoors) just under the ceiling
    const up = raycast(eye, new V3(0, 1, 0), 40, false), ceil = up.t < 40 ? Math.max(0.6, up.t - 0.5) : 40;
    const clearTo = v => { const d = v.clone().sub(eye), l = d.length(); if (l < 0.05) return 1; const h = raycast(eye, d.divideScalar(l), l + 0.5, false); return Math.min(1, h.t / (l + 0.5)); };
    let best = null, bs = -1;
    for (const [u, f, r, pen] of [[24, -26, 10, 0], [24, -26, -10, 0], [30, -12, 18, 0.04], [30, -12, -18, 0.04], [20, 18, 12, 0.1], [14, -14, 6, 0.06], [9, -9, 4, 0.1]]) {
      const H = Math.min(u, ceil + (P.h - 0.12)), sc0 = at(H, f * (H / u), r * (H / u)), mid = at(H * 0.45, f * 0.35 * (H / u), r * 0.3 * (H / u));
      const sc = Math.min(clearTo(sc0), clearTo(mid)) - pen; if (sc > bs) { bs = sc; best = sc0; } }
    const S = best, back = new V3(fx, 0, fz);
    I.path = [S, S.clone().lerp(eye, 0.35).setY(S.y * 0.82 + eye.y * 0.18), eye.clone().addScaledVector(back, -3.2).add(new V3(0, 1.0, 0)), eye]; I.boom = null;
  }
  if (I.t < I.glide) {
    const k0 = clamp(I.t / I.glide, 0, 1), k = k0 * k0 * k0 * (k0 * (k0 * 6 - 15) + 10); // smootherstep: gentle start, gentle landing
    const want = _bz(I.path[0], I.path[1], I.path[2], I.path[3], k), dv = want.clone().sub(eye), dl = dv.length();
    let allow = dl; if (dl > 0.05) { dv.divideScalar(dl); const h = raycast(eye, dv, dl + 0.3, false); if (h.t < dl + 0.3) allow = Math.max(0.3, h.t - 0.3); }
    I.boom = I.boom === null ? allow : Math.min(allow, damp(I.boom, allow, 4, dt), dl); camera.position.copy(eye).addScaledVector(dv, Math.min(dl, I.boom));
    const look = new V3(P.pos.x, P.pos.y + 1.1, P.pos.z).lerp(eye.clone().add(new V3(fx * 12 * Math.cos(P.pitch || 0), 12 * Math.sin(P.pitch || 0), fz * 12 * Math.cos(P.pitch || 0))), smooth(0.25, 1, k)); camera.lookAt(look);
    camera.fov = lerp(52, settings.fov, smooth(0.55, 1, k)); I.showAvatar = camera.position.distanceTo(eye) > 1.5;
  } else { I.showAvatar = false; if (camera.fov !== settings.fov) camera.fov = settings.fov; updateCamera(dt); if ($('introov').className !== 'on cd') { $('introov').className = 'on cd'; $('hud').classList.remove('cine'); } }
  camera.updateProjectionMatrix(); sky.position.copy(camera.position);
  const n = Math.ceil(I.dur - I.t - 0.35); if (I.t > I.glide && n !== I.last && n >= 0 && n <= 3) { I.last = n; const el = $('introCount'); el.textContent = n > 0 ? n : 'GO'; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); sfx.play(n > 0 ? 'cd' : 'go'); if (n === 0) rumble(0.4, 0.4, 200); }
  if (I.t >= I.dur) { game.introT = 0; game.intro = null; $('introov').className = ''; $('hud').classList.remove('cine'); $('ifade').style.opacity = 0; }
}
function deploy(label, fn, mi) {
  if (mi === undefined) mi = settings.map; sfx.init(); if (game.state === 'menu') requestLock(); // pointer lock / fullscreen must start inside the click
  const m = MAPS[mi], L = $('loading'), th = MAPIMG(mi);
  $('ldbg').style.backgroundImage = th ? `url(${MAPHD(mi)}), url(${th})` : 'radial-gradient(ellipse at 30% 40%,#3a4456,#0a0c10)'; $('ldmap').textContent = m.name; $('lddesc').textContent = m.desc; $('ldmode').textContent = label;
  $('ldtip').textContent = pick(TIPS); const fill = $('ldfill'); fill.style.transition = 'none'; fill.style.width = '0%'; L.classList.add('on');
  requestAnimationFrame(() => { fill.style.transition = ''; fill.style.width = '72%'; requestAnimationFrame(() => setTimeout(() => {
    const t0 = performance.now(); try { fn(); } catch (e) { console.error(e); }
    try { renderer.compile(scene, camera); renderer.compile(vmScene, vmCam); } catch (e) {}
    fill.style.width = '100%'; setTimeout(() => L.classList.remove('on'), Math.max(350, 1100 - (performance.now() - t0)));
  }, 60)); });
}
