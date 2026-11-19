// ============================================================ MAIN LOOP
let last = performance.now(), menuT = 0;
/* one bad frame (a rare edge case in a bot, a malformed packet) must never freeze the game: log it once, still draw, carry on */
const FRAME_ERR = new Set();
function frame(now) { requestAnimationFrame(frame); try { frameStep(now); } catch (e) { const k = String(e && e.message); if (FRAME_ERR.size < 20 && !FRAME_ERR.has(k)) { FRAME_ERR.add(k); console.error('frame error', e); } last = now; try { renderer.setRenderTarget(null); renderer.render(scene, camera); } catch (e2) {} } }
function frameStep(now) {
  const rawDt = (now - last) / 1000; let dt = Math.min(rawDt, 0.05); last = now;
  if (game.outro) { updateOutro(dt); if (game.outro && game.outro.t < 1.8) dt *= 0.3; } // end-of-match slow motion
  fpsAcc += rawDt; fpsN++; if (fpsAcc > 0.5) { setText('fps', Math.round(fpsN / fpsAcc) + ' FPS' + (dynScale < 0.99 ? ' · ' + Math.round(dynScale * 100) + '% res' : '')); fpsAcc = 0; fpsN = 0; }
  // dynamic resolution: keep the game smooth on weak CPUs / integrated graphics
  if (game.state === 'play' && rawDt < 0.5) {
    dynAcc += rawDt; dynN++;
    if (dynAcc > 1.0) {
      const fps = dynN / dynAcc, prev = dynScale;
      if (fps < 42) dynScale = Math.max(0.4, dynScale * (fps < 25 ? 0.75 : 0.88));
      else if (fps > 57 && dynScale < 1 && ++dynUp >= 3) { dynScale = Math.min(1, dynScale * 1.06); dynUp = 0; } /* scale back up only after 3 steady seconds: no resize ping-pong */
      if (fps <= 57) dynUp = 0;
      if (Math.abs(prev - dynScale) > 0.01) resize();
      dynAcc = 0; dynN = 0;
    }
  }
  const tA = performance.now(); pollGamepad(dt);
  if (game.state === 'play' || game.state === 'dying' || (MP.active && (game.state === 'paused' || game.state === 'armory'))) {
    game.time += dt; if (game.state === 'play') game.runTime += dt;
    if (game.introT > 0 && game.state === 'play') { updateIntro(dt); if (game.intro && game.intro.showAvatar) { const c = camera.position.clone(), r = camera.quaternion.clone(); updateAvatar(dt); camera.position.copy(c); camera.quaternion.copy(r); } else updateAvatar(dt); updateHUD(dt); } else {
    const steps = Math.ceil(dt / 0.0167), sdt = dt / steps;
    for (let i = 0; i < steps; i++) updatePlayer(sdt);
    player.gcd -= dt; player.lastDmgT += dt;
    if (player.alive && player.lastDmgT > 4.5 && player.hp < player.regenCap) player.hp = Math.min(player.regenCap, player.hp + cls().regen * hpMul() * dt);
    player.abilityCD = Math.max(0, player.abilityCD - dt); player.stimT -= dt; player.pulseT -= dt;
    if (player.shieldT > 0) { player.shieldT -= dt; if (player.shieldT <= 0) player.shield = 0; }
    if (player.alive) updateWeapon(dt);
    if (MP.active) updateMP(dt); else if (game.mode === 'botdm') updateBotMatch(dt); else updateWaves(dt);
    if (game.state === 'play') ambience.update(dt); else if (ambience.wind) ambience.stopWind();
    enemies = enemies.filter(e => e.update(dt)); potgRecord(dt);
    barrels.forEach(b => b.update(dt));
    pickups = pickups.filter(p => p.update(dt, game.time));
    updateGrenades(dt); updateRockets(dt); updateClouds(dt);
    updateCamera(dt); const third = updateAvatar(dt); killcamTick(dt);
    if (game.state === 'dying') {
      game.dieT -= dt;
      if (game.dieT <= 0) finishDeath();
    }
    updateHUD(dt); updateSurvival(dt); updateDmgNumbers(dt);
    }
  } else if (game.state === 'potg') { game.time += dt; updatePotg(dt); barrels.forEach(b => b.update(dt));
  } else if ((game.state === 'menu' || game.state === 'mpover') && world) {
    menuT += dt * 0.05; const [x0, z0, x1, z1] = world.L.bounds, r = Math.max(x1 - x0, z1 - z0) * 0.42;
    camera.position.set(Math.sin(menuT) * r, 9, Math.cos(menuT) * r); camera.fov = 70; camera.updateProjectionMatrix();
    camera.lookAt(0, 1.5, 0); sky.position.copy(camera.position); if (stars) stars.position.copy(camera.position);
    barrels.forEach(b => b.update(dt)); pickups.forEach(p => p.inner.rotation.y += dt);
  }
  updateEnvironment(dt);
  if (game.state !== 'paused' && game.state !== 'over' && game.state !== 'armory') { sparks.update(dt); debris.update(dt); updateTracers(dt); updateBooms(dt); nukeTick(Math.min(rawDt, 0.05)); /* real time: the end-of-match slow motion must not stretch the white-out */ updateMists(dt); }
  const tB = performance.now();
  const menuFrame = game.state === 'menu' || game.state === 'mpover'; menuTick = (menuTick + 1) % 2; if (menuFrame !== menuRes) { menuRes = menuFrame; resize(); }
  if (game.state !== 'play') { placeRing(); if (game.state === 'menu') updatePrompts(); } else if (navRing.style.opacity !== '0') navRing.style.opacity = '0';
  sfx.listen(camera);
  updateSunShadow(); if (!composer && window.BP_POST) setupPost();
  if (menuFrame && menuTick === 1) { if (game.state === 'menu') updatePreview(dt * 2); prof.render += performance.now() - tB; return; } // menu: world and preview take turns
  if (composer && !menuFrame) { composer.render(dt); renderer.setRenderTarget(null); }
  else { renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera); } // no post-processing behind the menu
  prof.js += tB - tA; prof.n++;
  if ((game.state === 'play' || game.state === 'paused' || game.state === 'dying' || game.state === 'armory') && settings.view !== 'third' && !(game.intro && (game.intro.showAvatar || game.intro.t < 3.95)) && !(game.outro && game.outro.t > 1.4) && !game.potg && !PRED.on && !game.nukeEnd) { renderer.clearDepth(); renderer.render(vmScene, vmCam); }

  prof.render += performance.now() - tB;
}
const prof = { js: 0, render: 0, n: 0 }; let menuTick = 0;

