// ============================================================ PLAYER COMBAT
function damagePlayer(d, from, attacker, head) {
  if (!player.alive || game.time < player.protT) return;
  if (attacker instanceof Enemy) { BD.lastAttacker = attacker; BD.lastHead = !!head; }
  if (MP.active && attacker && attacker.netId) attacker = attacker.netId; // an online bot
  if (MP.active && attacker) { MP.lastAttacker = attacker; MP.lastAttackT = game.time; MP.lastHead = !!head; if (game.nadeDmg) MP.lastWeapon = game.ksKind || 'nade'; if (!MP.viaHit && typeof attacker === 'string' && attacker !== MP.myId && d > 0.5) { const t = performance.now(); if (t - (MP.hmT || 0) > 120) { MP.hmT = t; netSend({ t: 'hm', to: attacker }); } } }
  if (player.shield > 0) { const a = Math.min(player.shield, d); player.shield -= a; d -= a; if (d <= 0) { sfx.play('hit'); hud.vig = Math.min(1, hud.vig + 0.05); return; } }
  if (!player.vT || game.time - player.vT > 0.4) { player.vT = game.time; sfx.voice(d > 35 ? 'hurt' : 'pain', { self: true, pitch: settings.vpitch || (settings.vpitch = rand(100, 140)), vol: 0.8 }); }
  rumble(0.6, 0.8, 160); player.hp -= d; player.lastDmgT = 0; if (settings.blood !== false) hud.blood = Math.min(1, (hud.blood || 0) + d / 60); player.regenCap = Math.max(25, Math.ceil(player.hp / 25) * 25);
  hud.vig = Math.min(1, hud.vig + d / 35); game.shake = Math.min(1, game.shake + d / 120);
  sfx.play('hurt', { vol: 0.7 });
  if (from) { const a = Math.atan2(from.x - player.pos.x, from.z - player.pos.z); addDmgDir(a); }
  if (player.hp <= 0 && MP.active && MP.mode === 'surv') { if (!player.downed) goDown(); else { player.bleedT -= d * 0.15; } player.hp = 1; return; }
  if (player.hp <= 0) { player.hp = 0; die(); }
}
const recoil = { p: 0, y: 0 };
const spring = { x: [0, 0, 0, 0], v: [0, 0, 0, 0] }, camPunch = { x: 0, v: 0 };
function meleeSwing() { const w = WEAPONS[wst.cur]; if (!w.melee) return; const quick = wst.quick === 2; wst.swingDur = quick ? 0.3 : w.swing; wst.hitAtT = quick ? 0.08 : w.hitAt; // quick melee is always a fast lunge, whatever the blade
  wst.swingT = wst.swingDur; wst.swingHit = false; wst.hitStop = 0; wst.side = -(wst.side || -1);
  wst.stab = quick; // quick melee off a gun = forward thrust; repeated knife attacks = alternating slashes
  sfx.play(w.id === 'knife' ? 'kslash' : 'swing', { vol: 0.85 }); camPunch.v += wst.side * (wst.stab ? 0.3 : 0.9);
  if (!player.alive) return; aimBasis(); const eye = camera.position; let best = null, bd = (w.reach || 2) + 1.7; // CoD-style lunge onto a close target in front of you
  for (const list of [enemies, remoteList]) for (const e of list) { if (e.dead || isAlly(PLAYER_T, e)) continue; const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz); if (d > bd || Math.abs(e.pos.y - player.pos.y) > 1.6) continue;
    if (d > 0.6 && (dx * _f.x + dz * _f.z) / (d * Math.hypot(_f.x, _f.z) || 1) < 0.7) continue; if (!los(eye.x, eye.y, eye.z, e.pos.x, e.pos.y + e.h * 0.6, e.pos.z)) continue; bd = d; best = e; }
  wst.lock = best; // CoD-style melee lock: the lunge and your aim pull onto the target for the whole swing (see meleeLock)
}
function meleeLock(dt) { // runs every frame of a swing that locked a target
  const e = wst.lock; if (!e || e.dead || wst.swingT <= 0 || !player.alive) { wst.lock = null; return; }
  const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz) || 1, eh = (e.pos.y + (e.h || 1.8) * 0.62) - (player.pos.y + player.h - 0.12);
  const sp = d > 0.95 ? clamp((d - 0.85) * 9, 3, 13) : 0; player.vel.x = dx / d * sp; player.vel.z = dz / d * sp; // close the gap fast
  const k = 1 - Math.exp(-28 * dt); player.yaw += angDiff(player.yaw, Math.atan2(-dx, -dz)) * k; player.pitch += (Math.atan2(eh, d) - player.pitch) * k;
}
function quickMelee() { if (!player.alive || wst.quick || wst.swingT > 0) return; const w = WEAPONS[wst.cur]; if (w.melee) return meleeSwing(); wst.quickFrom = wst.cur; switchTo(carry[2]); wst.switchT = 0.04; wst.quick = 1; }
function meleeHit(w) {
  aimBasis(); const eye = camera.position, cands = [];
  const mh = raycast(eye, _f, (w.reach || 1.6) + 0.3, false, null, true); if (mh.box && mh.box.board) hitPane(mh.box.board, 60, true);
  for (const list of [enemies, remoteList]) for (const e of list) {
    if (e.dead) continue; const cx = e.pos.x, cy = e.pos.y + e.h * 0.6, cz = e.pos.z, dx = cx - eye.x, dy = cy - eye.y, dz = cz - eye.z, d = Math.hypot(dx, dy, dz);
    if (isAlly(PLAYER_T, e)) continue; if (e === wst.lock && d < w.reach + 1.1) { cands.push([0, e]); continue; } // locked target always connects
    if (d > w.reach + 0.5) continue; if ((dx * _f.x + dy * _f.y + dz * _f.z) / d < 0.6) continue; if (!los(eye.x, eye.y, eye.z, cx, cy, cz)) continue; cands.push([d, e]);
  }
  cands.sort((a, b) => a[0] - b[0]); let hits = 0;
  for (const [, e] of cands.slice(0, w.cleave || 1)) {
    const fy = e.isRemote ? e.yaw + Math.PI : e.yaw, tx = player.pos.x - e.pos.x, tz = player.pos.z - e.pos.z, tl = Math.hypot(tx, tz) || 1;
    const behind = (Math.sin(fy) * tx + Math.cos(fy) * tz) / tl < -0.4, dmg = Math.max(behind ? w.backstab : w.dmg, e.maxHp ? e.maxHp + 1 : 250), kb = w.knock || 4; /* CoD rule: melee is a one-hit kill, every melee weapon, from any side */
    const hp = new V3(e.pos.x, e.pos.y + e.h * 0.6, e.pos.z);
    const killed = e.damage(dmg, false, { x: _f.x * kb, z: _f.z * kb }, 'player'); hits++; game.hits++;
    dmgNumber(hp, dmg, behind); if (!killed) hitMarker(false, behind); debris.burst(hp.x, hp.y, hp.z, 18, 3.5, 0.62, 0.04, 0.03, 0.55, 1, _f.x * 0.8, 0.2, _f.z * 0.8); bloodHit(hp.clone(), _f.clone(), false);
    if (behind) showHint('BACKSTAB!', '#ff6b5a');
  }
  game.shots++;
  if (hits) { sfx.play(w.snd); game.shake = Math.min(1, game.shake + 0.22); spring.v[1] -= 7; wst.hitStop = 0.06; rumble(0.7, 0.4, 120); }
  else if (mh.box && !mh.box.terrain && mh.t < (w.reach || 1.6) + 0.2) { const p = camera.position.clone().addScaledVector(_f, mh.t); sfx.play(w.id === 'pan' ? 'clang' : 'kwall', { vol: 0.9 }); sparks.burst(p.x, p.y, p.z, 8, 4, 1, 0.85, 0.5, 0.2, 1, mh.nx, mh.ny, mh.nz); addDecal(p, mh.nx, mh.ny, mh.nz); spring.v[1] -= 4; wst.hitStop = 0.04; }
  else { const h = raycast(eye, _f, w.reach, false); if (h.box && h.t < w.reach) { sfx.play(w.id === 'pan' ? 'clang' : 'impact'); sparks.burst(eye.x + _f.x * h.t, eye.y + _f.y * h.t, eye.z + _f.z * h.t, 6, 3, 1, 0.8, 0.5, 0.25, 1); spring.v[1] -= 5; } }
}
function switchTo(i) {
  if (player.downed && i !== carry[1]) return; // downed: sidearm only
  if (ng.on && ng.throwT <= 0) { if (ng.cook >= 0) { ng.cook = -1; showHint('THROW CANCELLED', '#ffcf6b'); } nadeExit(); if (i === wst.cur) { sfx.play('switch'); return; } } else if (ng.on) return; // switching cancels a held throw
  if (i === wst.cur || !carry.includes(i) || !player.alive) return;
  wst.last = wst.cur; wst.cur = i; wst.switchT = WEAPONS[i].swap; wst.reloading = false; wst.reloadT = 0; wst.consec = 0;
  vmModels.forEach((m, k) => { m.g.visible = k === i; m.flash.visible = false; });
  sfx.play('switch');
}
function startReload() {
  const w = WEAPONS[wst.cur], s = inv[wst.cur]; if (w.melee) return;
  if (wst.reloading || s.mag >= w.mag || s.res <= 0 || wst.switchT > 0) return;
  wst.reloading = true; wst.reloadT = w.shell ? w.reload + 0.15 : w.reload * (s.mag > 0 ? 0.85 : 1); wst.reloadTotal = wst.reloadT; wst.rlEmpty = s.mag === 0 && !w.shell; wst.rlEv = 0;
  sfx.play(w.shell ? 'shell' : 'magout');
}
function updateReload(dt) {
  if (!wst.reloading) return;
  const w = WEAPONS[wst.cur], s = inv[wst.cur];
  wst.reloadT -= dt;
  if (!w.shell) { const p = 1 - wst.reloadT / wst.reloadTotal; // choreographed beats, synced to the viewmodel
    if (wst.rlEv < 1 && p > 0.2) { wst.rlEv = 1; spring.v[1] -= 3; }
    if (wst.rlEv < 2 && p > 0.62) { wst.rlEv = 2; sfx.play('magin'); spring.v[1] += 7; spring.v[0] += 1.5; rumble(0.15, 0.3, 60); }
    if (wst.rlEv < 3 && p > 0.7) { wst.rlEv = 3; sfx.play('mtap', { vol: 0.6 }); }
    if (wst.rlEmpty && wst.rlEv < 4 && p > 0.8) { wst.rlEv = 4; sfx.play(w.cat === 'PISTOL' ? 'magout' : 'rack', { vol: 0.9 }); spring.v[0] -= 3; spring.v[3] -= 4; } }
  if (wst.reloadT <= 0) {
    if (w.shell) {
      s.mag++; if (isFinite(s.res)) s.res--; sfx.play('shell');
      if (s.mag < w.mag && s.res > 0) { wst.reloadT = w.reload; wst.reloadTotal = w.reload; }
      else { wst.reloading = false; sfx.play('pump'); wst.pumpT = 0.3; }
    } else {
      const need = w.mag - s.mag, take = isFinite(s.res) ? Math.min(need, s.res) : need;
      s.mag += take; if (isFinite(s.res)) s.res -= take; wst.reloading = false; if (!(wst.rlEv >= 2)) sfx.play('magin');
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
  if (SURV.tgt) return; /* holding the designator */
  const w = WEAPONS[wst.cur], s = inv[wst.cur]; if (w.launcher) return fireRocket(w, s); rumble(w.vkick > 1.5 ? 0.5 : 0.25, w.vkick > 1.5 ? 0.9 : 0.35, w.vkick > 1.5 ? 140 : 70);
  s.mag--; wst.consec++; wst.sinceShot = 0; game.shots++; if (player.protT > game.time) player.protT = 0; // firing ends spawn protection wstat(w.id).shots++;
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
      const hit = raycast(origin, _d, 300, true, ignore, true);
      _hp.copy(origin).addScaledVector(_d, hit.t);
      const dist = travelled + hit.t; if (!firstEnd) firstEnd = _hp.clone();
      if ((i < 3 || n === 1) && (w.pellets || wst.consec % (w.auto ? 3 : 1) === 1 || !w.auto)) spawnTracer(i === 0 ? muzzleW : origin, _hp, 0xffd890, 850, 0.011);
      if (hit.enemy && isAlly(PLAYER_T, hit.enemy)) break; // teammate: no friendly fire
      if (hit.enemy) {
        const [r0, r1, rmin] = w.range; const fall = dist <= r0 ? 1 : dist >= r1 ? rmin : lerp(1, rmin, (dist - r0) / (r1 - r0));
        const dmg = w.dmg * fall * (hit.head ? w.head * cls().headMul : 1) * dmgMul;
        const k = hit.enemy.damage(dmg, hit.head, { x: _d.x * (n > 1 ? 1.2 : 2), z: _d.z * (n > 1 ? 1.2 : 2) });
        const acc = dmgAcc.get(hit.enemy) || { d: 0, head: false, p: _hp.clone() }; acc.d += dmg; acc.head = acc.head || hit.head; dmgAcc.set(hit.enemy, acc);
        if (k) killed++;
        anyHit = true;
        bloodHit(_hp.clone(), _d, hit.head);
        if (!k) hitMarker(false, hit.head);
        if (w.pierce) { ignore = hit.enemy; origin = _hp.clone().addScaledVector(_d, 0.05); travelled = dist; dmgMul = 0.7; continue; }
      } else if (hit.box) {
        if (hit.box.barrel) hit.box.barrel.hit(w.dmg);
        else if (hit.box.board) { hitPane(hit.box.board, w.dmg * (w.pellets ? 1.5 : 1), true); impactFx(_hp, hit.nx, hit.ny, hit.nz, hit.box, i === 0); }
        else if (hit.t < 300) { addDecal(_hp, hit.nx, hit.ny, hit.nz); if (i < 4) impactFx(_hp, hit.nx, hit.ny, hit.nz, hit.box, i === 0); if (i < 3 && Math.random() < 0.6) debris.burst(_hp.x, _hp.y, _hp.z, 2, 2, 0.35, 0.33, 0.3, 0.6, 1, hit.nx, hit.ny, hit.nz); }
      }
      break;
    }
  }
  if (anyHit) { game.hits++; wstat(w.id).hits++; }

  for (const v of dmgAcc.values()) dmgNumber(v.p, v.d, v.head);
  if (s.mag > 0 && s.mag <= Math.ceil(w.mag * 0.25)) sfx.play('low');
  if (MP.active && firstEnd) netSend({ t: 'shot', a: v3a(muzzleW), b: v3a(firstEnd), w: w.id, s: w.supp ? 1 : 0 });
  // recoil
  const climb = 1 + Math.min(wst.consec, 10) * 0.05;
  const kk = w.kick * climb * lerp(1, 0.75, wst.ads) * (player.crouch > 0.5 ? 0.8 : 1);
  recoil.p += kk * 0.7; player.pitch = clamp(player.pitch + kk * 0.3, -1.5, 1.5);
  const vk = (w.vkick || 1) * (1 - wst.ads * 0.35) * (player.crouch > 0.5 ? 0.85 : 1); // spring-driven weapon kick: back, up, random roll
  spring.v[0] += 1.5 * vk; spring.v[1] += 10 * vk; spring.v[2] += rand(-2.5, 2.5) * vk; spring.v[3] += rand(-6, 6) * vk; camPunch.v += rand(-0.6, 0.6) * vk;
  if (w.bolt) wst.boltT = 60 / w.rpm;
  recoil.y += (w.pattern ? w.pattern[(wst.consec - 1) % w.pattern.length] + rand(-0.2, 0.2) : rand(-1, 1)) * w.kickYaw; vm.kick = Math.min(vm.kick + (w.id === 'shotgun' || w.id === 'dmr' ? 1 : 0.55), 1.4);
  wst.bloom = Math.min(w.maxBloom, wst.bloom + w.bloom);
  wst.fireCD += 60 / (w.burst ? w.burstRpm : w.rpm);
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
  if (game.outro) { wst.ads = damp(wst.ads, 0, 8, dt); return; }
  if (ng.on) { if (wst.switchT > 0) wst.switchT -= dt; wst.ads = damp(wst.ads, 0, 14, dt); updateNade(dt); return; }
  wst.sinceShot += dt;
  if (wst.switchT > 0) wst.switchT -= dt;
  wst.fireCD = Math.max(wst.fireCD - dt, w.auto ? -dt : -1);
  if (wst.fireCD < 0 && !mouseL) wst.fireCD = 0;
  if (wst.sinceShot > 0.08) wst.bloom = Math.max(0, wst.bloom - w.maxBloom * 3 * dt);
  if (!mouseL) wst.consec = 0;
  updateReload(dt);
  if (wst.swingT > 0) { meleeLock(dt); if (wst.hitStop > 0) wst.hitStop -= dt; else wst.swingT -= dt; if (!wst.swingHit && (wst.swingDur || w.swing) - wst.swingT >= (wst.hitAtT || w.hitAt)) { wst.swingHit = true; meleeHit(w); } } // brief hit-stop on contact sells the impact
  if (wst.quick && wst.switchT <= 0) { if (wst.quick === 1 && w.melee) { wst.quick = 2; meleeSwing(); } else if (wst.quick === 2 && wst.swingT <= 0) { wst.quick = false; switchTo(wst.quickFrom); wst.switchT = Math.min(wst.switchT, 0.16); } }
  if (wst.boltT > 0) { const b0 = wst.boltT; wst.boltT -= dt; const m = vmModels[wst.cur]; if (b0 > 0.75 && wst.boltT <= 0.75) sfx.play('bolt'); if (b0 > 0.55 && wst.boltT <= 0.55 && m) ejectCasing(m); }
  const adsWanted = !w.melee && wst.boltT <= 0.2 && (settings.adsToggle ? wst.adsOn : mouseR) && !player.sprinting && wst.switchT <= 0 && !(wst.reloading && !w.shell) && player.alive;
  wst.ads = damp(wst.ads, adsWanted ? 1 : 0, w.adsSpeed * 1.4, dt);
  if (wst.ads < 0.01 && !adsWanted) wst.ads = 0;
  if (w.melee) { if (mouseL && player.alive && wst.switchT <= 0 && wst.swingT <= 0 && !wst.quick) meleeSwing(); if (!mouseL) wst.held = false; return; }
  if (w.burst && wst.burstLeft > 0) { // the rest of a 3-round burst fires on its own
    if (s.mag <= 0 || wst.reloading || !player.alive || wst.switchT > 0) wst.burstLeft = 0;
    else if (wst.fireCD <= 0) { fire(); if (--wst.burstLeft <= 0 || s.mag <= 0) { wst.burstLeft = 0; wst.fireCD += 60 / w.rpm; } }
    if (!mouseL) wst.held = false; return; }
  if (mouseL && player.alive && wst.switchT <= 0 && player.sprintLock <= 0 && wst.boltT <= 0) {
    if (!w.auto && !w.burst && wst.held) return;
    if (wst.reloading && w.shell && s.mag > 0) { wst.reloading = false; }
    if (wst.reloading) return;
    if (wst.fireCD <= 0) {
      if (s.mag <= 0) { if (!wst.held) sfx.play('empty'); wst.held = true; wst.fireCD = 0.25; startReload(); return; }
      let guard = 0;
      while (wst.fireCD <= 0 && s.mag > 0 && guard++ < 3) { fire(); if (!w.auto) break; }
      if (w.burst) { wst.burstLeft = w.burst - 1; if (wst.burstLeft <= 0 || s.mag <= 0) { wst.burstLeft = 0; wst.fireCD += 60 / w.rpm; } }
      wst.held = true;
      if (s.mag <= 0 && s.res > 0) setTimeout(() => { if (inv[wst.cur] === s && s.mag <= 0) startReload(); }, 250);
    }
  }
  if (!mouseL) wst.held = false;
}
// ---- rockets (launcher): fast projectile with a smoke trail, explodes on contact
const rockets = [];
function spawnRocket(pos, vel, owner) {
  const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.5, 10), MAT({ color: 0x4a5038, roughness: 0.6 })); body.rotation.x = Math.PI / 2; g.add(body);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb040 })); fl.position.z = 0.3; g.add(fl);
  g.position.copy(pos); g.lookAt(pos.clone().add(vel)); fx.add(g); rockets.push({ pos: pos.clone(), vel: vel.clone(), g, t: 5, owner, trail: 0 });
}
function fireRocket(w, s) {
  s.mag--; game.shots++; wstat(w.id).shots++; aimBasis(); wst.fireCD += 60 / w.rpm; wst.sinceShot = 0;
  const pos = camera.position.clone().addScaledVector(_f, 0.8).addScaledVector(_r, lerp(0.12, 0, wst.ads)).addScaledVector(_u, -0.05), vel = _f.clone().multiplyScalar(48);
  spawnRocket(pos, vel, MP.active ? MP.myId : 'player'); if (MP.active) netSend({ t: 'rocket', p: v3a(pos), v: v3a(vel) });
  sfx.boom(4, 0, 0.35); sfx.play('slide', { vol: 0.8 }); rumble(0.8, 1, 260); noise(player.pos, 45, PLAYER_T);
  spring.v[0] += 4; spring.v[1] += 16; camPunch.v += rand(-1, 1); recoil.p += w.kick; vm.kick = 1.2;
  for (let i = 0; i < 18; i++) sparks.emit(pos.x - _f.x * 1.4, pos.y - _f.y * 1.4, pos.z - _f.z * 1.4, -_f.x * rand(3, 8) + rand(-1, 1), rand(0, 1.5), -_f.z * rand(3, 8) + rand(-1, 1), 0.7, 0.7, 0.7, 0.6, 0);
  const m = vmModels[wst.cur]; if (m && m.warhead) m.warhead.visible = false;
}
function updateRockets(dt) {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i]; r.t -= dt; r.vel.y -= 2.5 * dt; const step = r.vel.length() * dt, dir = r.vel.clone().normalize();
    const hit = raycast(r.pos, dir, step + 0.1, false); let hitT = hit.t < step + 0.099 ? hit.t : Infinity;
    for (const list of [enemies, remoteList]) for (const e of list) { if (e.dead || e === r.owner || (e.id !== undefined && e.id === r.owner)) continue; const c = new V3(e.pos.x, e.pos.y + e.h * 0.55, e.pos.z), d = c.clone().sub(r.pos), along = d.dot(dir); if (along < 0 || along > step + 0.5) continue; if (d.clone().addScaledVector(dir, -along).length() < 0.6) hitT = Math.min(hitT, along); }
    if (r.owner !== 'player' && r.owner !== MP.myId && player.alive) { const c = new V3(player.pos.x, player.pos.y + 1, player.pos.z), d = c.clone().sub(r.pos), along = d.dot(dir); if (along > 0 && along < step + 0.5 && d.clone().addScaledVector(dir, -along).length() < 0.6) hitT = Math.min(hitT, along); }
    if (hitT <= step + 0.1 || r.t <= 0 || r.pos.y < -5) {
      const at = r.pos.clone().addScaledVector(dir, Math.max(0, Math.min(hitT, step) - 0.15)); fx.remove(r.g); rockets.splice(i, 1);
      explosion(at, 7, 220, r.owner === 'player' ? 'player' : r.owner); game.shake = Math.min(1.4, game.shake + 0.5); continue;
    }
    r.pos.addScaledVector(r.vel, dt); r.g.position.copy(r.pos); r.g.lookAt(r.pos.clone().add(r.vel));
    r.trail -= dt; if (r.trail <= 0) { r.trail = 0.012; debris.emit(r.pos.x - dir.x * 0.4, r.pos.y - dir.y * 0.4, r.pos.z - dir.z * 0.4, rand(-0.3, 0.3), rand(0.2, 0.8), rand(-0.3, 0.3), 0.55, 0.55, 0.55, 1.4, 0); sparks.emit(r.pos.x, r.pos.y, r.pos.z, -dir.x * 4, -dir.y * 4, -dir.z * 4, 1, 0.7, 0.3, 0.12, 0); }
  }
}
// ---- CoD-style frag grenades: [4] equips (LMB throw / RMB underhand), [G] / RB = hold to cook, release to throw
const NADE_FUSE = 3.5;
const ng = { on: false, cook: -1, under: false, quick: false, throwT: 0, from: -1, prevL: false, prevR: false, raise: 0, kind: 'frag', slot: 'lethal' };
function nadeVel(under) { aimBasis(); const d = _f.clone(); d.y += under ? 0.15 : 0.13; d.normalize(); return under ? d.multiplyScalar(11.5).add(new V3(0, 2.4, 0)).addScaledVector(player.vel, 0.5) : d.multiplyScalar(21.5).add(new V3(0, 2.4, 0)).addScaledVector(player.vel, 0.6); } // ~25 m max at full loft, 15-20 m on a normal throw (CoD/BF-like, scaled to these maps)
const NG = { body: new THREE.SphereGeometry(0.075, 12, 9), cyl: new THREE.CylinderGeometry(0.045, 0.045, 0.15, 12), box: new THREE.BoxGeometry(0.11, 0.06, 0.11), neck: new THREE.CylinderGeometry(0.018, 0.035, 0.1, 10) };
function nadeMesh(kind) { // a recognisable model for each throwable
  const g = new THREE.Group(), em = MAT({ color: 0x3b4a2a, emissive: 0x000000, roughness: 0.6 }); let m;
  if (kind === 'smoke') { m = new THREE.Mesh(NG.cyl, MAT({ color: 0x6a7a5a, roughness: 0.6 })); g.add(m); const t = new THREE.Mesh(NG.neck, em); t.position.y = 0.1; t.scale.set(0.6, 0.4, 0.6); g.add(t); }
  else if (kind === 'flash') { m = new THREE.Mesh(NG.cyl, MAT({ color: 0x22262a, metalness: 0.6, roughness: 0.4 })); g.add(m); const t = new THREE.Mesh(NG.neck, em); t.position.y = 0.1; t.scale.set(0.6, 0.4, 0.6); g.add(t); }
  else if (kind === 'semtex') { m = new THREE.Mesh(NG.box, MAT({ color: 0x8a8a7a, roughness: 0.7 })); g.add(m); const t = new THREE.Mesh(NG.box, em); t.scale.set(0.35, 0.5, 0.35); t.position.y = 0.04; g.add(t); }
  else if (kind === 'molotov') { m = new THREE.Mesh(NG.cyl, MAT({ color: 0x5a3a18, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 })); m.scale.set(0.9, 1.3, 0.9); g.add(m); const n = new THREE.Mesh(NG.neck, MAT({ color: 0x5a3a18, roughness: 0.15 })); n.position.y = 0.14; g.add(n); const rag = new THREE.Mesh(NG.neck, MAT({ color: 0xd8c8a0, emissive: 0xff6010, emissiveIntensity: 0.8 })); rag.position.y = 0.21; rag.scale.set(0.8, 0.5, 0.8); g.add(rag); }
  else { m = new THREE.Mesh(NG.body, em); m.scale.y = 1.15; g.add(m); const t = new THREE.Mesh(NG.neck, MAT({ color: 0x6a6a60, metalness: 0.7, roughness: 0.4 })); t.position.y = 0.09; t.scale.set(0.5, 0.35, 0.5); g.add(t); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return { g, em };
}
function throwGrenade(fuse = 2.0, under = false, kind = 'frag', slot = 'lethal') {
  if (!player.alive || (slot === 'tactical' ? player.tacticals : player.grenades) <= 0) return;
  if (slot === 'tactical') player.tacticals--; else player.grenades--; player.gcd = 0.5; aimBasis();
  const pos = camera.position.clone().addScaledVector(_f, 0.5).addScaledVector(_r, 0.15).add(new V3(0, under ? -0.4 : 0, 0));
  const vel = nadeVel(under);
  const nm = nadeMesh(kind); nm.g.position.copy(pos); fx.add(nm.g); grenades.push({ pos, vel, mesh: nm.g, em: nm.em, t: fuse, owner: MP.active ? MP.myId : 'player', kind, spin: new V3(rand(4, 9), rand(-3, 3), rand(-2, 2)) });
  if (MP.active) netSend({ t: 'nade', p: v3a(pos), v: v3a(vel), f: Math.round(fuse * 100) / 100, k: kind });
  sfx.play('throw'); sfx.voice('effort', { self: true, pitch: settings.vpitch || 120, vol: 0.7 }); vm.kick = 0.6; noise(player.pos, 6, PLAYER_T);
}
function nadeEquip(quick, slot = 'lethal') {
  const have = slot === 'tactical' ? player.tacticals : player.grenades, kind = eqKind(slot);
  if (!player.alive || have <= 0 || ng.throwT > 0 || ng.cook >= 0) { if (have <= 0 && player.alive) showHint('NO ' + EQUIP[kind].short + ' LEFT', '#ff6b5a'); return false; }
  if (!ng.on || ng.slot !== slot) { ng.on = true; ng.from = wst.cur; ng.raise = 0; wst.reloading = false; wst.ads = 0; sfx.play('switch'); }
  ng.slot = slot; ng.kind = kind; nadeVMKind(kind); ng.quick = !!quick; return true;
}
function nadeExit() { if (!ng.on) return; ng.on = false; ng.cook = -1; ng.quick = false; arcShow(false); wst.switchT = WEAPONS[wst.cur].swap * 0.6; }
// dotted throw arc while a grenade is held, ending at the first thing it would hit
const arcPts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.75, depthWrite: false }));
arcPts.frustumCulled = false; arcPts.visible = false; scene.add(arcPts);
const arcEnd = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.32, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffcf6b, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })); arcEnd.visible = false; scene.add(arcEnd);
function arcShow(on) {
  arcPts.visible = arcEnd.visible = !!on && settings.nadeArc !== false; if (!arcPts.visible) return;
  aimBasis(); const p = camera.position.clone().addScaledVector(_f, 0.5).addScaledVector(_r, 0.15).add(new V3(0, ng.under ? -0.4 : 0, 0)), v = nadeVel(ng.under), a = arcPts.geometry.attributes.position; let n = 0, hit = false;
  for (let i = 0; i < 90 && n < 60; i++) { const dt = 0.025; v.y -= G * dt; const q = p.clone().addScaledVector(v, dt); if (pointInBox(q.x, q.y, q.z, 0.08)) { hit = true; break; } p.copy(q); if (i % 2 === 0) a.setXYZ(n++, p.x, p.y, p.z); }
  for (let k = n; k < 60; k++) a.setXYZ(k, p.x, p.y, p.z); a.needsUpdate = true; arcEnd.position.copy(p); arcEnd.visible = hit;
}
function nadePull(under) { if (!ng.on || ng.cook >= 0 || ng.throwT > 0 || (ng.slot === 'tactical' ? player.tacticals : player.grenades) <= 0) return; ng.cook = 0; ng.under = !!under; sfx.play('pin'); }
function nadeRelease() {
  if (!ng.on || ng.cook < 0) return; const E = EQUIP[ng.kind], fuse = E.cook ? Math.max(0.05, E.fuse - ng.cook - 0.14) : E.fuse; ng.cook = -1;
  ng.pending = { fuse, under: ng.under, kind: ng.kind, slot: ng.slot }; ng.throwT = NADE_THROW; arcShow(false); sfx.play('swing', { vol: 0.35 }); // the grenade leaves the hand at the top of the swing
}
const NADE_THROW = 0.52, NADE_REL = 0.14;
function nadeQuickStart(slot = 'lethal') { if (nadeEquip(true, slot)) nadePull(false); }
function updateNade(dt) {
  ng.raise = Math.min(1, ng.raise + dt * 5);
  if (ng.throwT > 0) { if (ng.pending && NADE_THROW - ng.throwT >= NADE_REL) { const q = ng.pending; ng.pending = null; throwGrenade(q.fuse, q.under, q.kind, q.slot); } ng.throwT -= dt; if (ng.throwT <= 0) { if (ng.quick || player.grenades <= 0) nadeExit(); } return; }
  if (!player.alive) { nadeExit(); return; }
  const L = mouseL, R = mouseR;
  if (!ng.quick && ng.raise > 0.6) { if (L && !ng.prevL) nadePull(false); else if (R && !ng.prevR) nadePull(true); if (ng.cook >= 0 && ((!ng.under && !L) || (ng.under && !R))) nadeRelease(); }
  ng.prevL = L; ng.prevR = R;
  if (ng.cook >= 0) {
    ng.cook += dt; const E = EQUIP[ng.kind], left = E.fuse - ng.cook; arcShow(true);
    if (E.cook) { $('hint').textContent = 'COOKING · ' + Math.max(0, left).toFixed(1) + 's'; $('hint').style.color = left < 1.2 ? '#ff5a4a' : '#ffcf6b'; hud.hintT = 0.15;
      if (Math.floor(ng.cook * 2) !== Math.floor((ng.cook - dt) * 2)) sfx.play('tick'); }
    if (E.cook && left <= 0) { arcShow(false); ng.cook = -1; player.grenades--; explosion(player.pos.clone().add(new V3(0, 1, 0)), 6.5, 160, MP.active ? MP.myId : 'player'); damagePlayer(500, null, null); nadeExit(); }
  }
}
// first-person grenade in hand
const nadeVM = new THREE.Group(); { const body = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), MAT({ color: 0x3e4a30, roughness: 0.6 })); body.scale.y = 1.15; nadeVM.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.022, 10), PHONG({ color: 0x6a6a60, specular: 0x666666, shininess: 50 })); top.position.y = 0.042; nadeVM.add(top);
  const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.014), PHONG({ color: 0x8a8a80, specular: 0x777777, shininess: 60 })); spoon.position.set(0.026, 0.02, 0); spoon.rotation.z = -0.25; nadeVM.add(spoon);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0022, 6, 14), PHONG({ color: 0xb0b0a8, specular: 0xffffff, shininess: 80 })); ring.position.set(-0.016, 0.05, 0); ring.rotation.y = Math.PI / 2; nadeVM.add(ring); nadeVM.userData.ring = ring;
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.06, 0.09), gloveMat); hand.position.set(0.012, -0.03, 0.02); nadeVM.add(hand);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.42, 10), sleeveMat); arm.position.set(0.05, -0.11, 0.2); arm.rotation.x = 1.15; nadeVM.add(arm);
  nadeVM.visible = false; vmScene.add(nadeVM); }
function nadeVMKind(kind) { const b = nadeVM.children[0], c = { frag: 0x3e4a30, semtex: 0x8a8a7a, molotov: 0x5a3a18, smoke: 0x6a7a5a, flash: 0x22262a }[kind] || 0x3e4a30;
  b.material.color.setHex(c); b.scale.set(kind === 'molotov' ? 0.8 : 1, kind === 'frag' ? 1.15 : kind === 'molotov' ? 2.2 : kind === 'semtex' ? 0.7 : 1.7, kind === 'molotov' ? 0.8 : 1); }
const trailMesh = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.4, 24, 1, 0, 1.6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
trailMesh.position.set(0.02, -0.12, -0.5); trailMesh.renderOrder = 3; vmScene.add(trailMesh);
function knifeTrail(side, k) { trailMesh.material.opacity = k * 0.34; trailMesh.visible = k > 0.01; trailMesh.rotation.set(-0.25, 0, side > 0 ? 2.1 : -0.55); trailMesh.scale.set(side, 1, 1); }
function updateNadeVM(dt) {
  if (!(WEAPONS[wst.cur].id === 'knife' && wst.swingT > 0)) trailMesh.visible = false;
  nadeVM.visible = ng.on && player.alive; vmRoot.visible = !ng.on; if (!ng.on) return;
  const P = player, bob = Math.sin(P.bob || 0) * 0.01, t = ng.throwT > 0 ? 1 - ng.throwT / NADE_THROW : 0, cook = ng.cook >= 0 ? 1 : 0, low = 1 - ng.raise;
  let x = 0.16, y = -0.15 - low * 0.25 + bob, z = -0.36, rx = 0, rz = 0;
  if (cook) { if (ng.under) { y -= 0.08; z += 0.05; rx = 0.4; } else { y += 0.06; z += 0.12; x += 0.03; rx = -0.6; } }
  let ry = 0.3; const rel = NADE_REL / NADE_THROW;
  if (t > 0) { const e = (a, b) => smooth(a, b, t);
    if (!ng.under) { const wind = e(0, rel * 0.8) * (1 - e(rel * 0.8, rel * 1.5)), whip = e(rel * 0.55, rel * 1.7), fol = e(rel * 1.4, 1); // overarm: cock back -> whip -> follow through across the body
      x += 0.06 * wind - 0.12 * fol; y += 0.13 * wind + 0.14 * whip * (1 - fol) - 0.42 * fol; z += 0.12 * wind - 0.38 * whip * (1 - fol * 0.5); rx += -0.9 * wind + 1.5 * whip * (1 - fol * 0.3) + 0.4 * fol; rz += -0.35 * wind + 0.5 * fol; ry += 0.3 * wind - 0.5 * fol; }
    else { const back = e(0, rel) * (1 - e(rel, rel * 1.8)), swing = e(rel * 0.6, rel * 1.8), fol = e(rel * 1.6, 1); // underhand: dip back, lob up and forward
      y += -0.1 * back + 0.08 * swing * (1 - fol) - 0.3 * fol; z += 0.08 * back - 0.25 * swing; rx += 0.7 * back - 0.9 * swing; } }
  nadeVM.position.set(x, y, z); nadeVM.rotation.set(rx, ry, rz); nadeVM.userData.ring.visible = !cook && t <= 0;
  const held = !(t > rel); nadeVM.children[0].visible = held; nadeVM.children[1].visible = nadeVM.children[2].visible = held;
}
function pointInBox(x, y, z, r) { for (const b of world.boxes) if (!b.dead && x + r > b.x0 && x - r < b.x1 && y + r > b.y0 && y - r < b.y1 && z + r > b.z0 && z - r < b.z1) return true; return !!TERR && y - r < TH(x, z); }
const smokes = [];
function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i], K = EQUIP[g.kind] || EQUIP.frag; g.t -= dt;
    if (g.att) { if (g.att.dead) g.att = null; else g.pos.set(g.att.pos.x + g.off.x, g.att.pos.y + g.off.y, g.att.pos.z + g.off.z); }
    else if (!g.stuck) {
      g.vel.y -= G * dt; let hitAny = false;
      for (const a of ['x', 'y', 'z']) {
        g.pos[a] += g.vel[a] * dt;
        if (pointInBox(g.pos.x, g.pos.y, g.pos.z, 0.08)) {
          g.pos[a] -= g.vel[a] * dt; hitAny = true;
          if (Math.abs(g.vel[a]) > 2.2) sfx.play('bounce', spatial(g.pos));
          if (K.stick) { g.stuck = true; g.vel.set(0, 0, 0); g.t = Math.min(g.t, K.fuse); sfx.play('bounce', spatial(g.pos)); break; }
          g.vel[a] *= a === 'y' ? -0.3 : -0.42; for (const o of ['x', 'y', 'z']) if (o !== a) g.vel[o] *= a === 'y' ? 0.72 : 0.8; // bounce, lose speed
          if (a === 'y' && Math.abs(g.vel.y) < 1.2) { g.vel.y = 0; g.vel.x *= Math.max(0, 1 - 3.5 * dt); g.vel.z *= Math.max(0, 1 - 3.5 * dt); } // rolls to a stop
        }
      }
      if (K.impact && hitAny && !g.burst) { g.burst = true; g.t = 0; }
      if (K.stick && !g.stuck) for (const list of [enemies, remoteList]) for (const e of list) { if (e.dead) continue; const c = new V3(e.pos.x, e.pos.y + e.h * 0.55, e.pos.z); if (c.distanceTo(g.pos) < 0.55) { g.stuck = true; g.att = e; g.off = g.pos.clone().sub(e.pos); g.vel.set(0, 0, 0); if (g.owner === 'player' || g.owner === MP.myId) showHint('STUCK!', '#ff6b5a'); } }
      const sp = g.vel.length(); if (g.spin) { g.mesh.rotation.x += g.spin.x * dt * Math.min(1, sp / 6); g.mesh.rotation.z += g.spin.z * dt * Math.min(1, sp / 6); }
    }
    g.mesh.position.copy(g.pos);
    const em = g.em || (g.mesh.material && g.mesh.material.emissive ? g.mesh.material : null); if (em && (K === EQUIP.frag || K === EQUIP.semtex)) em.emissive.setRGB(Math.floor(g.t * (g.t < 0.8 ? 12 : 4)) % 2 ? 0.8 : 0.05, 0, 0);
    if (g.t <= 0) { fx.remove(g.mesh); if (g.mesh.isMesh) { g.mesh.geometry.dispose(); g.mesh.material.dispose(); } grenades.splice(i, 1); detonate(g); }
  }
  updateSmokes(dt); updateNadeIndicator();
}
function detonate(g) {
  const p = g.pos.clone(), k = g.kind || 'frag';
  if (g.brew) { clouds.push({ x: p.x, y: p.y - 0.1, z: p.z, r: 4, t: 5, tick: 0, owner: g.owner }); sfx.play('brew', spatial(p)); return; }
  if (k === 'molotov') { const sp = spatial(p); sfx.boom(sp.dist + 8, sp.pan, 0.35); sfx.play('slide', { vol: 0.6 }); clouds.push({ x: p.x, y: p.y - 0.1, z: p.z, r: 3.6, t: 6.5, tick: 0, owner: g.owner, fire: true }); noise(p, 25, null); return; }
  if (k === 'smoke') { const sp = spatial(p); sfx.play('slide', Object.assign({ vol: 0.9 }, sp)); makeSmoke(p); return; }
  if (k === 'flash') { flashBang(p, g.owner); return; }
  explosion(p, 6.5 * (g.owner === MP.myId && settings.cls === 'witch' ? 1.2 : 1), 160, g.owner);
}
function makeSmoke(p) {
  const n = 110, pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()), h = Math.random(); seed.push([Math.cos(a) * r, h, Math.sin(a) * r, rand(0.6, 1.2)]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 5.5, map: getTex('puff'), color: 0xc4c6c8, transparent: true, opacity: 0.0, depthWrite: false })); pts.frustumCulled = false; fx.add(pts);
  smokes.push({ x: p.x, y: p.y, z: p.z, r: 0.5, t: 15, age: 0, pts, seed });
}
function updateSmokes(dt) {
  for (let i = smokes.length - 1; i >= 0; i--) {
    const s = smokes[i]; s.t -= dt; s.age += dt; s.r = Math.min(6.2, 0.5 + s.age * 3.2); const a = s.pts.geometry.attributes.position, drift = s.age * 0.15;
    s.seed.forEach((q, k) => a.setXYZ(k, s.x + q[0] * s.r + Math.sin(s.age * 0.3 + k) * 0.3 + drift, s.y + 0.3 + q[1] * Math.min(4.2, s.r * 0.75) * q[3], s.z + q[2] * s.r)); a.needsUpdate = true;
    s.pts.material.opacity = Math.min(0.95, s.age * 1.2) * Math.min(1, s.t / 2.5);
    if (s.t <= 0) { fx.remove(s.pts); s.pts.geometry.dispose(); s.pts.material.dispose(); smokes.splice(i, 1); }
  }
}
function smokeBlocked(ax, ay, az, bx, by, bz) { // does a sight line pass through dense smoke?
  for (const s of smokes) { if (s.age < 0.6 || s.t < 1.5) continue; const cx = s.x, cy = s.y + 1.6, cz = s.z, dx = bx - ax, dy = by - ay, dz = bz - az, L2 = dx * dx + dy * dy + dz * dz || 1;
    const t = clamp(((cx - ax) * dx + (cy - ay) * dy + (cz - az) * dz) / L2, 0, 1), px = ax + dx * t - cx, py = ay + dy * t - cy, pz = az + dz * t - cz; if (px * px + py * py * 2.2 + pz * pz < (s.r * 0.82) ** 2) return true; }
  return false;
}
function flashBang(p, owner) {
  const sp = spatial(p); sfx.boom(sp.dist * 0.6, sp.pan, 0.55); sfx.play('hit', { vol: 1.6 }); noise(p, 40, null);
  sparks.burst ? sparks.burst(p.x, p.y, p.z, 40, 14, 1, 1, 1, 0.4, 0.3) : 0;
  if (player.alive) { aimBasis(); const d = camera.position.distanceTo(p), dir = p.clone().sub(camera.position).normalize(), facing = Math.max(0, dir.dot(_f));
    if (d < 26 && los(camera.position.x, camera.position.y, camera.position.z, p.x, p.y + 0.15, p.z) && !smokeBlocked(camera.position.x, camera.position.y, camera.position.z, p.x, p.y, p.z)) {
      const k = (1 - d / 26) * (0.25 + 0.75 * facing); if (k > 0.04) { hud.flashT = Math.max(hud.flashT || 0, 0.4 + 3.6 * k); sfx.ring(0.4 + 3.6 * k); rumble(0.6, 0.6, 300); if (MP.active && typeof owner === 'string' && owner !== MP.myId) netSend({ t: 'hm', to: owner, k: 'stun' }); } } }
  for (const e of enemies) { if (e.dead) continue; const ey = e.pos.y + e.h * 0.9, d = Math.hypot(e.pos.x - p.x, ey - p.y, e.pos.z - p.z); if (d > 22) continue; if (!los(e.pos.x, ey, e.pos.z, p.x, p.y + 0.15, p.z)) continue;
    const ang = Math.abs(angDiff(e.yaw, Math.atan2(p.x - e.pos.x, p.z - e.pos.z))), k = (1 - d / 22) * (ang < 1.4 ? 1 : 0.35); if (k > 0.08) { e.blindT = Math.max(e.blindT || 0, 0.8 + 3.2 * k); e.visible = false; if (owner === 'player' || owner === MP.myId || (!MP.active && !(owner instanceof Enemy))) hitMarker(false, false, 'stun'); } }
}
// CoD-style danger indicator for live grenades near you
const nadeInd = [...Array(3)].map(() => { const d = document.createElement('div'); d.className = 'nind'; d.innerHTML = '<b>●</b><small>GRENADE</small>'; document.getElementById('hud').appendChild(d); return d; });
function updateNadeIndicator() {
  let k = 0; if (player.alive && game.state === 'play') for (const g of grenades) { if (k >= 3) break; const K = EQUIP[g.kind] || EQUIP.frag; if (K.slot === 'tactical' && g.kind !== 'flash') continue; const d = Math.hypot(g.pos.x - player.pos.x, g.pos.z - player.pos.z); if (d > 9 || g.kind === 'molotov') continue;
    const a = Math.atan2(g.pos.x - player.pos.x, g.pos.z - player.pos.z) - Math.atan2(-Math.sin(player.yaw), -Math.cos(player.yaw)), el = nadeInd[k++], r = 110;
    el.style.display = 'block'; el.style.transform = `translate(${Math.sin(-a) * r}px, ${-Math.cos(a) * r}px)`; el.style.opacity = String(0.5 + 0.5 * (1 - d / 9)); }
  for (; k < 3; k++) nadeInd[k].style.display = 'none';
}
function explosion(p, radius, dmg, owner) { game.nadeDmg = game.lastNadeKill = true; try { explosion0(p, radius, dmg, owner); } finally { game.nadeDmg = game.lastNadeKill = false; } }
// how much of a body a blast can reach: rays to feet, chest and head. Solid walls stop it almost entirely; partial cover helps
function blastExposure(p, x, y, z, h) { let n = 0; for (const t of [0.25, 0.55, 0.9]) if (los(p.x, p.y + 0.25, p.z, x, y + h * t, z)) n++; return n === 0 ? 0.08 : 0.4 + 0.6 * n / 3; }
function explosion0(p, radius, dmg, owner) {
  potgEvent('boom', { p: [p.x, p.y, p.z] });
  spawnBoom(p, radius * 0.75);
  sparks.burst(p.x, p.y, p.z, 50, 12, 1, 0.6, 0.2, 0.7, 0.6);
  debris.burst(p.x, p.y, p.z, 24, 6, 0.15, 0.13, 0.12, 1.4, 0.2, 0, 0.5, 0);
  const s = spatial(p); sfx.boom(s.dist, s.pan, 1.2, s.pos); noise(p, 60, null); { const dd = p.distanceTo(player.pos); if (dd < 25) rumble(1 - dd / 25, 1 - dd / 25, 300); }
  const dp = Math.hypot(p.x - player.pos.x, p.y - player.pos.y - 1, p.z - player.pos.z);
  game.shake = Math.min(1.2, game.shake + clamp(1 - dp / 30, 0, 1) * 0.8);
  for (const e of enemies) {
    if (e.dead) continue;
    const cx = e.pos.x, cy = e.pos.y + e.h * 0.5, cz = e.pos.z, d = Math.hypot(cx - p.x, cy - p.y, cz - p.z);
    if (d < radius) {
      let f = (1 - d / radius) * blastExposure(p, e.pos.x, e.pos.y, e.pos.z, e.h);
      const dir = { x: (cx - p.x) / (d || 1) * 9 * f, z: (cz - p.z) / (d || 1) * 9 * f };
      if (typeof owner === 'string' && owner !== 'player' && MP.active) { if (owner === MP.myId) { /* mine, as sent back */ } else { if (MP.isHost && e.netId) { e.mpAttacker = owner; e.damage(dmg * f, false, dir, null); } continue; } } /* another player's blast: credit them, not the host */
      const atk = owner instanceof Enemy ? owner : 'player'; if (isAlly(atk === 'player' ? PLAYER_T : atk, e)) continue; if (!e.damage(dmg * f, false, dir, atk) && f > 0 && atk === 'player') hitMarker(false, false, 'nade');
    }
  }
  if (player.alive && dp < radius) {
    let f = (1 - dp / radius) * blastExposure(p, player.pos.x, player.pos.y, player.pos.z, player.h || 1.75);
    if (!isAlly(owner, PLAYER_T) && !game.ownSupport) damagePlayer(dmg * f * (owner instanceof Enemy ? 0.6 : MP.active && owner !== MP.myId ? 1 : 0.45) * (settings.cls === 'heavy' ? 0.6 : 1), p, owner);
    const dx = player.pos.x - p.x, dy = player.pos.y + 0.9 - p.y, dz = player.pos.z - p.z, l = Math.hypot(dx, dy, dz) || 1;
    player.vel.x += dx / l * 11 * f; player.vel.y += Math.max(3, dy / l * 11) * f; player.vel.z += dz / l * 11 * f; player.onGround = false;
  }
  for (const b of barrels) if (!b.box.dead && b.fuse <= 0 && Math.hypot(b.x - p.x, 0.6 - p.y, b.z - p.z) < radius * 0.9) b.fuse = 0.18 + Math.random() * 0.1;
  for (const pn of panes) if (!pn.box.dead && Math.hypot(pn.cx - p.x, pn.cy - p.y, pn.cz - p.z) < radius * (pn.kind === 'board' ? 0.6 : 1.3)) breakPane(pn, false, true);
}

