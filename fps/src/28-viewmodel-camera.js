// ============================================================ VIEWMODEL & CAMERA
const vm = { kick: 0, swayX: 0, swayY: 0, bob: 0, flashT: 0, sprint: 0 };
function deathCam(t) { // knees buckle, then the body tips over sideways and hits the ground
  const P = player; if (P.fallSide === undefined || t < 0.05) P.fallSide = Math.random() < 0.5 ? 1 : -1;
  const k1 = smooth(0, 0.35, t), k2 = smooth(0.25, 0.95, t), bounce = t > 0.95 && t < 1.25 ? Math.sin((t - 0.95) / 0.3 * Math.PI) * 0.05 : 0;
  camera.position.y -= k1 * 0.55 + k2 * (P.h - 0.9) - bounce; camera.position.x += Math.cos(P.yaw) * P.fallSide * 0.35 * k2; camera.position.z -= Math.sin(P.yaw) * P.fallSide * 0.35 * k2;
  camera.rotation.z += P.fallSide * (0.15 * k1 + 1.15 * k2); camera.rotation.x += 0.35 * k1 - 0.1 * k2;
}
function updateCamera(dt) {
  const P = player, w = WEAPONS[wst.cur];
  P.stepSmooth = damp(P.stepSmooth, 0, 16, dt); P.landKick = damp(P.landKick, 0, 9, dt);
  const speed = Math.hypot(P.vel.x, P.vel.z);
  if (P.onGround && !P.sliding && speed > 0.5) P.bob += dt * speed * 1.55;
  const bobAmt = P.onGround && !P.sliding ? clamp(speed / 6, 0, 1.4) : 0;
  const by = Math.abs(Math.sin(P.bob)) * 0.045 * bobAmt * (1 - wst.ads * 0.8);
  const strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  P.slK = damp(P.slK || 0, P.sliding ? 1 : 0, P.sliding ? 12 : 6, dt);
  P.tilt = damp(P.tilt, P.sliding ? 0.11 : -strafe * 0.012, 9, dt);
  recoil.p = damp(recoil.p, 0, wst.sinceShot > 0.06 ? 9 : 2, dt); recoil.y = damp(recoil.y, 0, 7, dt);
  game.shake = Math.max(0, game.shake - dt * 1.6);
  const sh = game.shake * game.shake * 0.05;
  let breathe = 0, breatheY = 0;
  if (w.scope && wst.ads > 0.9) { const k = (keys.ShiftLeft || keys.ShiftRight) ? 0.15 : 1; breathe = Math.sin(game.time * 1.3) * 0.004 * k; breatheY = Math.sin(game.time * 0.9) * 0.003 * k; }
  camera.position.set(P.pos.x, P.pos.y + P.h - 0.12 + P.stepSmooth + by - P.landKick - P.slK * 0.2 + (P.sliding ? rand(-1, 1) * 0.0035 * Math.min(1, speed / 9) : 0), P.pos.z); /* sliding: lower, and the ground buzzes through the camera */
  camera.rotation.set(clamp(P.pitch + recoil.p + rand(-sh, sh) + breatheY - (P.revK || 0) * 0.55, -1.55, 1.55), P.yaw + recoil.y + rand(-sh, sh) + breathe, P.tilt + camPunch.x * 0.02 + (P.dnK || 0) * 0.22);
  if (P.dnK) camera.position.y -= P.dnK * 0.55; if (P.revK) camera.position.y -= P.revK * 0.45; // downed: on the ground, tilted · reviving: kneel over them
  if (!P.alive) deathCam(game.state === 'dying' ? 1.6 - game.dieT : (game.deadT || 0));
  outroCam();
  const zoom = lerp(1, w.zoom, wst.ads);
  const base = settings.fov + (P.sprinting ? 6 : 0) + (P.sliding ? 8 : 0) + (wst.lock ? 7 : 0); // melee lunge surges the view forward
  const fovT = 2 * Math.atan(Math.tan(base * Math.PI / 360) / zoom) * 180 / Math.PI;
  camera.fov = damp(camera.fov, fovT, 14, dt); camera.updateProjectionMatrix();
  sky.position.copy(camera.position); if (stars) stars.position.copy(camera.position);
  // viewmodel
  const hip = w.hip, ap = w.adsPos, a = wst.ads;
  vm.swayX = damp(vm.swayX, clamp(-mdx * 0.0004, -0.05, 0.05), 10, dt); vm.swayY = damp(vm.swayY, clamp(mdy * 0.0004, -0.05, 0.05), 10, dt); mdx = mdy = 0;
  vm.kick = damp(vm.kick, 0, 14, dt);
  for (let i = 0; i < 4; i++) { const ac = -260 * spring.x[i] - 20 * spring.v[i]; spring.v[i] += ac * dt; spring.x[i] += spring.v[i] * dt; }
  { const ac = -160 * camPunch.x - 14 * camPunch.v; camPunch.v += ac * dt; camPunch.x += camPunch.v * dt; }
  vm.sprint = damp(vm.sprint, P.sprinting ? 1 : 0, 10, dt);
  const sw = (1 - a * 0.9);
  let x = lerp(hip[0], ap[0], a) + vm.swayX * sw + Math.sin(P.bob) * 0.012 * bobAmt * sw;
  let y = lerp(hip[1], ap[1], a) + vm.swayY * sw - by * 0.3 - P.landKick * 0.5 - vm.sprint * 0.05;
  let z = lerp(hip[2], ap[2], a) + vm.kick * 0.06;
  let rx = vm.kick * 0.12 * (1 - a * 0.6) - vm.sprint * 0.25, ry = vm.sprint * 0.55 + vm.swayX * 2 * sw, rz = vm.sprint * 0.25 + P.tilt * 2;
  if (P.slK > 0.01) { const k = P.slK * (1 - a * 0.85); rz += 0.42 * k; ry -= 0.1 * k; rx += 0.06 * k; x -= 0.035 * k; y -= 0.025 * k; z += 0.03 * k; } /* slide: gun canted over, tucked in to the body */
  if (wst.reloading) {
    const p = 1 - wst.reloadT / wst.reloadTotal, k = Math.sin(Math.PI * clamp(p, 0, 1));
    if (w.shell) { const bump = Math.sin(clamp((p - 0.35) / 0.4, 0, 1) * Math.PI); rx -= 0.24 - bump * 0.09; rz += 0.38; ry += 0.12; y -= 0.045 - bump * 0.018; x -= 0.03; } // rolled over, thumbing each shell in
    else { const e = (a, b) => smooth(a, b, p), C = w.cat, roll = C === 'PISTOL' ? 0.35 : C === 'LMG' ? 0.6 : 0.5, pitch = C === 'PISTOL' ? 0.28 : C === 'LMG' ? 0.42 : 0.36;
      const tilt = e(0, 0.14) * (1 - e(0.84, 1)), out = e(0.16, 0.26) * (1 - e(0.26, 0.4)), seat = e(0.52, 0.62) * (1 - e(0.62, 0.72)), rack = wst.rlEmpty ? e(0.72, 0.79) * (1 - e(0.82, 0.92)) : 0;
      rz += tilt * roll - rack * 0.65; rx += -tilt * pitch + out * 0.1 + seat * 0.14 + Math.sin(p * 19) * 0.008 * tilt; ry += tilt * 0.22 + rack * 0.15; // present the mag well -> drop -> seat -> rack
      x -= tilt * 0.045 - rack * 0.03; y -= tilt * (C === 'LMG' ? 0.08 : 0.055) + out * 0.025 - seat * 0.03; z += rack * 0.045 - seat * 0.015; }
  }
  if (wst.switchT > 0) { const k = wst.switchT / w.swap; y -= k * 0.35; rx -= k * 0.6; }
  if (P.revK) { y -= P.revK * 0.32; rx -= P.revK * 0.7; rz += P.revK * 0.5; x += P.revK * 0.08; } // gun lowered aside while you work on a teammate
  if (!P.alive) y -= 0.5;
  z += spring.x[0] * 0.045; rx += spring.x[1] * 0.012; ry += spring.x[2] * 0.012; rz += spring.x[3] * 0.012;
  if (w.melee && wst.swingT > 0) { const p = 1 - wst.swingT / (wst.swingDur || w.swing), k = Math.sin(Math.min(1, p / 0.7) * Math.PI);
    if (w.id === 'knife' || w.id === 'sword' || wst.stab) { const S = wst.side || 1, e = (a, b) => smooth(a, b, p);
      if (wst.stab) { const wind = e(0, 0.14) * (1 - e(0.14, 0.24)), th = e(0.1, 0.26) * (1 - e(0.48, 1)); // thrust straight at the target
        z += 0.07 * wind - 0.34 * th; y += 0.03 * wind + 0.04 * th; x -= 0.1 * th; rx += -0.3 * wind + 0.12 * th; ry += 0.35 * th; rz -= 0.25 * th; knifeTrail(S, 0); }
      else { const wind = e(0, 0.16) * (1 - e(0.16, 0.26)), cut = e(0.12, 0.3), rec = e(0.42, 1), a = cut * (1 - rec); // wind up, rip across, recover
        x += S * (0.13 * wind - 0.28 * a); y += 0.07 * wind - 0.04 * a + 0.04 * rec * (1 - rec); z += 0.03 * wind - 0.17 * a; rz += S * (0.95 * wind - 1.25 * a); ry += S * (-0.6 * wind + 1.05 * a); rx += -0.32 * wind + 0.28 * a;
        knifeTrail(S, p > 0.12 && p < 0.42 ? Math.sin((p - 0.12) / 0.3 * Math.PI) : 0); } }
    else if (w.id === 'pan') { rx += -1.2 + Math.min(1, p / 0.45) * 2.0 - (p > 0.45 ? (p - 0.45) * 1.5 : 0); y += 0.12 * (1 - p); z -= k * 0.1; }
    else { ry += 1.1 - Math.min(1, p / 0.6) * 2.4; x += 0.15 - Math.min(1, p / 0.6) * 0.35; rz += 0.6 * k; z -= k * 0.08; } }
  else if (w.melee) { rx += 0.25; ry += 0.3; rz -= 0.2; }
  if (wst.boltT > 0) { const bm = vmModels[wst.cur]; const cyc = 60 / w.rpm, p = 1 - wst.boltT / cyc, k = p > 0.25 && p < 0.75 ? Math.sin((p - 0.25) / 0.5 * Math.PI) : 0;
    if (bm && bm.bolt) bm.bolt.position.z = k * 0.08; rz -= k * 0.25; y -= k * 0.03; }
  vmRoot.position.set(x, y, z); vmRoot.rotation.set(rx, ry, rz);
  const m = vmModels[wst.cur];
  if (m.pump) { wst.pumpT = Math.max(0, wst.pumpT - dt); const k = wst.pumpT > 0 ? Math.sin((1 - wst.pumpT / 0.45) * Math.PI) : 0; m.pump.position.z = k * 0.07; }
  m.slideT = Math.max(0, (m.slideT || 0) - dt * 14);
  if (m.warhead) m.warhead.visible = inv[wst.cur].mag > 0 || (wst.reloading && wst.reloadT < wst.reloadTotal * 0.45);
  if (m.slide) m.slide.position.z = (inv[wst.cur].mag === 0 ? 1 : m.slideT) * 0.028; // slide locks back on empty
  if (m.cyl) { m.cylRot = damp(m.cylRot || 0, m.cylTarget || 0, 18, dt); m.cyl.rotation.z = m.cylRot; }
  if (m.mag) { let my = 0; if (wst.reloading && !w.shell) { const p = 1 - wst.reloadT / wst.reloadTotal; my = p < 0.14 ? 0 : p < 0.3 ? (p - 0.14) / 0.16 : p < 0.42 ? 1 : p < 0.62 ? 1 - (p - 0.42) / 0.2 : 0; } m.mag.position.y = -my * 0.22; m.mag.visible = my < 0.95; }
  updateCasings(dt);
  vm.flashT -= dt; if (vm.flashT <= 0) m.flash.visible = false;
  muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 600);
  m.g.visible = !(w.scope && a > 0.92);
  vmCam.fov = 60; updateNadeVM(dt);
}

