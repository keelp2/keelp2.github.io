// ============================================================ PLAYER MOVEMENT
function accelerate(wx, wz, wishspeed, accel, cap, dt) {
  const cur = player.vel.x * wx + player.vel.z * wz;
  const add = Math.min(wishspeed, cap) - cur; if (add <= 0) return;
  const a = Math.min(accel * wishspeed * dt, add);
  player.vel.x += a * wx; player.vel.z += a * wz;
}
function updatePlayer(dt) {
  const P = player;
  if (game.outro && P.alive) { P.vel.x *= 0.85; P.vel.z *= 0.85; P.sprinting = false; moveBody(P, dt); return; }
  if (!P.alive) { P.vel.x *= 0.9; P.vel.z *= 0.9; P.stepSmooth = 0; moveBody(P, dt); return; }
  let fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); if (PRED.on) fwd = str = 0; /* your body waits while you fly the missile */
  if (gp.on && (gp.mx || gp.my)) { fwd = -gp.my; str = gp.mx; }
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
  let wx = -sy * fwd + cy * str, wz = -cy * fwd - sy * str; const wmag = Math.min(1, Math.hypot(wx, wz)); const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }
  const crouchKey = !!(keys.KeyC || (kbLocked && keys.ControlLeft));
  const speed = Math.hypot(P.vel.x, P.vel.z);
  const aimHeld = settings.adsToggle ? wst.adsOn : mouseR;
  P.sprinting = !!(keys.ShiftLeft || keys.ShiftRight) && fwd > 0 && !mouseL && !aimHeld && wst.ads < 0.3 && !crouchKey && !P.sliding;
  if (P.sprinting) P.sprintLock = 0.14; else P.sprintLock = Math.max(0, P.sprintLock - dt);
  // slide
  if (crouchKey && !P.crouchKeyPrev && P.onGround && speed > 6.2 && P.slideCD <= 0 && !P.sliding) {
    P.sliding = true; P.slideT = 0.9; sfx.play('slide', { vol: 0.9 }); debris.burst(P.pos.x, P.pos.y + 0.05, P.pos.z, 10, 2.2, 0.5, 0.45, 0.38, 0.7, 0.4, P.vel.x * 0.1, 0.25, P.vel.z * 0.1); camPunch.v -= 3; const boost = Math.min(speed * 1.35 + 1, 13.5); P.vel.x *= boost / speed; P.vel.z *= boost / speed;
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
  if (P.downed || MP.revT > 0) { P.sprinting = false; P.jumpBuf = 0; }
  let max = (P.downed ? 1.2 : MP.revT > 0 ? 0 : P.crouch > 0.5 ? 3.0 : P.sprinting ? 7.8 : 5.8) * (WEAPONS[wst.cur].speedMul || 1);
  max *= lerp(1, 0.62, wst.ads) * cls().speed * (P.stimT > 0 ? 1.3 : 1) * (keys.AltLeft && !P.sprinting ? 0.6 : 1); // Alt = slow, quiet walk
  if (P.onGround) {
    const f = P.sliding ? 0.8 : 7.5;
    if (speed > 0) { const drop = (P.sliding ? speed : Math.max(speed, 2.5)) * f * dt; const ns = Math.max(speed - drop, 0) / speed; P.vel.x *= ns; P.vel.z *= ns; }
    if (!P.sliding && wl > 0) accelerate(wx, wz, max * Math.max(0.35, wmag), 11, max * Math.max(0.35, wmag), dt);
    if (P.sliding && wl > 0) accelerate(wx, wz, 2, 3, 2, dt);
  } else if (wl > 0) accelerate(wx, wz, max, 10, 1.0, dt);
  // jump
  P.jumpBuf -= dt; P.coyote = P.onGround ? 0.1 : P.coyote - dt;
  if (P.mantle) { const M = P.mantle; M.t += dt; const k = Math.min(1, M.t / M.dur), e = k * k * (3 - 2 * k);
    if (M.peak !== undefined) { const h = k < 0.45 ? lerp(M.a.y, M.peak, smooth(0, 0.45, k)) : lerp(M.peak, M.b.y, smooth(0.45, 1, k)); P.pos.set(lerp(M.a.x, M.b.x, e), h, lerp(M.a.z, M.b.z, e)); } // vault through: one arc over the sill
    else P.pos.set(lerp(M.a.x, M.b.x, smooth(0.35, 1, k)), lerp(M.a.y, M.b.y, Math.min(1, e * 1.5)), lerp(M.a.z, M.b.z, smooth(0.35, 1, k))); P.vel.set(0, 0, 0); if (M.crouch) P.crouch = 1;
    if (k >= 1) { P.mantle = null; P.onGround = true; } return; }
  if ((P.jumpBuf > 0 || (keys.Space && !P.onGround)) && fwd > 0.3 && !P.sliding) { // look for a ledge just ahead
    // forgiving ledge/window search: several distances ahead (up to ~1.1 m) and the direction you're moving, not just where you look
    const mvx = P.vel.x, mvz = P.vel.z, mvl = Math.hypot(mvx, mvz), lfx = -Math.sin(P.yaw), lfz = -Math.cos(P.yaw), fx = mvl > 1.5 ? (lfx * 0.5 + mvx / mvl * 0.5) : lfx, fz = mvl > 1.5 ? (lfz * 0.5 + mvz / mvl * 0.5) : lfz, fl = Math.hypot(fx, fz) || 1;
    let top = null, px = 0, pz = 0;
    for (const dd of [0.45, 0.65, 0.85, 1.1]) { const qx = P.pos.x + fx / fl * dd, qz = P.pos.z + fz / fl * dd; let t = null;
      for (const b of world.nav.bucket(qx, qz)) if (!b.dead && qx > b.x0 && qx < b.x1 && qz > b.z0 && qz < b.z1 && b.y1 > P.pos.y + 0.35 && b.y1 < P.pos.y + (P.onGround ? 1.85 : 2.1) && (t === null || b.y1 > t)) t = b.y1;
      if (t !== null) { top = t; px = qx; pz = qz; break; } }
    if (top !== null) for (const b of world.boxes) if (b.glass && !b.dead && overlapBox(b, px, top + 0.03, pz, P.r * 0.9, 1.1)) { breakPane(b.glass, true); game.shake = Math.min(1, game.shake + 0.2); }
    if (top !== null && !anyOverlap(px, top + 0.03, pz, P.r * 0.9, 1.1)) { // thin sill with room beyond (a window, a low wall): vault straight through and land on the far side
      const nfx = fx / fl, nfz = fz / fl, d0 = Math.hypot(px - P.pos.x, pz - P.pos.z); let far = 0; for (let d = d0 + 0.05; d <= d0 + 1.2; d += 0.08) { const qx = P.pos.x + nfx * d, qz = P.pos.z + nfz * d; if (!world.nav.bucket(qx, qz).some(b => !b.dead && !b.glass && qx > b.x0 && qx < b.x1 && qz > b.z0 && qz < b.z1 && b.y1 > top - 0.05 && b.y0 < top + 1.2)) { far = d; break; } } // glass doesn't count: the vault smashes it
      if (far && far - d0 < 1.0) for (const off of [0.45, 0.65, 0.9, 1.15]) { const lx = P.pos.x + nfx * (far + off), lz = P.pos.z + nfz * (far + off), hit = raycast(new V3(lx, top + 0.4, lz), new V3(0, -1, 0), 4, false), gy = top + 0.4 - hit.t;
        for (const g of world.boxes) if (g.glass && !g.dead && Math.hypot((g.x0 + g.x1) / 2 - px, (g.z0 + g.z1) / 2 - pz) < 1.4 && g.y1 > top && g.y0 < top + 1.5) breakPane(g.glass, true); // crash through the pane
        if (hit.t < 4 && gy > top - 3.2 && gy < top + 0.1 && !anyOverlap(lx, gy + 0.03, lz, P.r * 0.9, 1.7) && !anyOverlap(lx, top + 0.15, lz, P.r * 0.9, 1.0)) {
          P.mantle = { t: 0, dur: 0.42 + Math.max(0, top - P.pos.y) * 0.08 + off * 0.12, a: P.pos.clone(), b: new V3(lx, gy + 0.02, lz), peak: top + 0.12, crouch: false }; P.jumpBuf = 0; sfx.play('land', { vol: 0.35 }); vm.kick = 0.35; noise(P.pos, 6, PLAYER_T); return; } }
      const stand = !anyOverlap(px, top + 0.03, pz, P.r * 0.9, 1.75);
      P.mantle = { t: 0, dur: 0.3 + (top - P.pos.y) * 0.12, a: P.pos.clone(), b: new V3(px, top + 0.02, pz), crouch: !stand }; P.jumpBuf = 0; sfx.play('land', { vol: 0.4 }); vm.kick = 0.4; noise(P.pos, 6, PLAYER_T); return; } }
  if (P.jumpBuf > 0 && P.coyote > 0) {
    P.vel.y = 7.4 * cls().jump; P.jumpBuf = 0; P.coyote = 0; P.onGround = false;
    if (P.sliding) { P.sliding = false; P.slideCD = 0.3; }
    sfx.play('jump'); if (Math.random() < 0.3) sfx.voice('effort', { self: true, pitch: settings.vpitch || 120, vol: 0.5 });
  }
  // pads
  if (P.onGround && P.ground && P.ground.pad) {
    const pd = P.ground.pad; P.vel.y = pd.vy; P.vel.x = pd.px + P.vel.x * 0.3; P.vel.z = pd.pz + P.vel.z * 0.3; P.onGround = false;
    sfx.play('pad'); sparks.burst(P.pos.x, P.pos.y + 0.2, P.pos.z, 20, 5, 0.2, 1, 0.5, 0.6, -0.3);
  }
  const vyBefore = P.vel.y, wasGround = P.onGround;
  moveBody(P, dt);
  if (!wasGround && P.onGround && vyBefore < -11.5 && !P.mantle && game.time > (P.protT || 0)) { // fall damage (≈3.2 m+; 7 m ≈ half your health, ~11 m+ (a Bazaar rooftop) deadly), loud and obvious
    const dmg = Math.round(Math.pow(-vyBefore - 11.5, 1.3) * 4.9 * hpMul()); if (dmg > 0) { damagePlayer(dmg, null, null); sfx.play('fallhurt'); game.shake = Math.min(1.2, game.shake + 0.6); showHint('FALL DAMAGE −' + dmg, '#ff6b5a'); noise(P.pos, 14, PLAYER_T); } }
  if (P.alive && P.hp < P.maxHp * 0.33) { P.brT = (P.brT || 0) - dt; if (P.brT <= 0) { P.brT = rand(1.5, 2.2); sfx.voice('breath', { self: true, vol: 0.7 }); } } // hurt: you can hear yourself breathing hard
  if (!wasGround && P.onGround && vyBefore < -5) { P.landKick = Math.min(-vyBefore * 0.008, 0.12); sfx.play('land', { vol: clamp(-vyBefore / 14, 0.3, 1) }); sfx.step(surfaceAt(P.pos.x, P.pos.y, P.pos.z), { vol: clamp(-vyBefore / 12, 0.3, 1), gait: 'sprint', near: true }); if (-vyBefore > 6) noise(P.pos, 12, PLAYER_T); }
  if (P.pos.y < -15) { const s = world.L.spawn; P.pos.set(s.x, s.y + 0.1, s.z); P.vel.set(0, 0, 0); }
  // footsteps
  if (P.onGround && !P.sliding && speed > 1.2) { P.stepAcc += speed * dt; if (P.stepAcc > (P.sprinting ? 2.7 : 2.1)) { P.stepAcc = 0; const gait = gaitOf(speed, P.crouch > 0.5, keys.AltLeft && !P.sprinting); P.gait = gait; if (GAIT[gait].bots) noise(P.pos, GAIT[gait].bots, PLAYER_T); sfx.step(surfaceAt(P.pos.x, P.pos.y, P.pos.z), { vol: gait === 'sneak' ? 0.22 : gait === 'sprint' ? 0.75 : 0.5, gait, near: true }); } } else if (speed < 1.2) P.gait = 'still';
}

