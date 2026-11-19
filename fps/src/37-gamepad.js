// ============================================================ GAMEPAD (Xbox / PlayStation via the Gamepad API)
const gp = { on: false, prev: [], fire: false, ads: false, mx: 0, my: 0, sprint: false, crouch: false, pad: null, navT: 0, navDir: '', focus: null, wasAds: false, snapT: 0, snapYaw: 0, snapPitch: 0, viewHeld: false };
function rumble(weak, strong, ms) { const a = gp.on && gp.pad && gp.pad.vibrationActuator; if (!a || settings.rumble === false) return; try { a.playEffect('dual-rumble', { duration: ms, weakMagnitude: clamp(weak, 0, 1), strongMagnitude: clamp(strong, 0, 1) }); } catch (e) {} }
// aim assist target: nearest visible enemy chest near the crosshair
function aaTarget(cone) {
  aimBasis(); let best = null, bd = -1;
  for (const list of [enemies, remoteList]) for (const e of list) {
    if (e.dead || (game.mode === 'botdm' && isAlly(PLAYER_T, e))) continue; const tx = e.pos.x, ty = e.pos.y + e.h * 0.62, tz = e.pos.z, dx = tx - camera.position.x, dy = ty - camera.position.y, dz2 = tz - camera.position.z, d = Math.hypot(dx, dy, dz2);
    if (d > 80 || d < 0.5) continue; const c = (dx * _f.x + dy * _f.y + dz2 * _f.z) / d; if (c < cone || c < bd) continue;
    if (!los(camera.position.x, camera.position.y, camera.position.z, tx, ty, tz) || smokeBlocked(camera.position.x, camera.position.y, camera.position.z, tx, ty, tz)) continue; bd = c; best = { x: tx, y: ty, z: tz, d };
  }
  return best;
}
const yawTo = t => Math.atan2(-(t.x - camera.position.x), -(t.z - camera.position.z)), pitchTo = t => Math.atan2(t.y - camera.position.y, Math.hypot(t.x - camera.position.x, t.z - camera.position.z));
function pollGamepad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let g = null; for (const p of pads) if (p && p.connected) { g = p; break; }
  if (!g) { if (gp.on) { gp.on = false; gp.fire = gp.ads = false; gp.mx = gp.my = 0; gpFocus(null); } return; }
  gp.pad = g; if (!gp.on) { gp.on = true; showHint('CONTROLLER CONNECTED', '#6dc8ff'); }
  const dz = v => (Math.abs(v) < 0.14 ? 0 : (v - Math.sign(v) * 0.14) / 0.86), b = i => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.35)), pr = i => b(i) && !gp.prev[i], rl = i => !b(i) && gp.prev[i]; gp.held = [0, 1, 2, 3].map(b);
  gp.mx = dz(g.axes[0] || 0); gp.my = dz(g.axes[1] || 0);
  const lx = dz(g.axes[2] || 0), ly = dz(g.axes[3] || 0);
  if (game.state === 'play' && SURV.tgt) { const sp = tabletScale() * 0.55 * dt; tabletMove((gp.mx + lx) * sp, (gp.my + ly) * sp); if (b(4)) tabletRotate(-2.4 * dt); if (b(5)) tabletRotate(2.4 * dt); if (pr(7)) tabletConfirm(); if (pr(1) || pr(15)) supportCancel();
    gp.mx = gp.my = 0; gp.fire = gp.ads = false; mouseL = mL; mouseR = mR; gp.prev = g.buttons.map((x, i) => b(i)); return; }
  if (game.state === 'play') {
    gpFocus(null);
    const w = WEAPONS[wst.cur], zoom = lerp(1, w.zoom, wst.ads); let slow = 1; const aaMode = settings.aimAssist === false || settings.aimAssist === 'off' ? 'off' : settings.aimAssist === 'precision' ? 'precision' : 'standard', aa = aaMode !== 'off' && player.alive;
    // aim assist 1: slowdown over a target; 2: ADS snap; 3: rotational tracking while you move
    const near = aa ? aaTarget(aaMode === 'precision' ? 0.9992 : 0.9975) : null; if (near) slow = aaMode === 'precision' ? 0.5 : 0.62; // slowdown over a target
    gp.fire = b(7); gp.ads = b(6);
    if (aaMode === 'standard' && gp.ads && !gp.wasAds) { const t = aaTarget(0.9968); if (t) { gp.snapT = 0.12; gp.snapYaw = player.yaw + angDiff(player.yaw, yawTo(t)) * 0.6; gp.snapPitch = player.pitch + (pitchTo(t) - player.pitch) * 0.6; } } // light ADS pull, not a lock
    if (gp.snapT > 0) { gp.snapT -= dt; const k = 1 - Math.exp(-28 * dt); player.yaw += angDiff(player.yaw, gp.snapYaw) * k; player.pitch += (gp.snapPitch - player.pitch) * k; }
    else if (aaMode === 'standard' && near && (Math.abs(gp.mx) + Math.abs(gp.my) > 0.2 || Math.hypot(player.vel.x, player.vel.z) > 1)) { const k = (gp.ads ? 1.6 : 0.9) * dt; player.yaw += clamp(angDiff(player.yaw, yawTo(near)), -0.035, 0.035) * k * 5; } // rotational: helps track while you move
    gp.wasAds = gp.ads;
    // look: response curve with acceleration at full deflection (like console shooters)
    const mag = Math.hypot(lx, ly), curve = mag > 0 ? Math.pow(mag, 1.8) / mag : 0; gp.accel = mag > 0.95 ? Math.min(1, (gp.accel || 0) + dt * 2.2) : 0;
    const s = 2.6 * settings.sens * slow * (1 + gp.accel * 0.7) / zoom;
    player.yaw -= lx * curve * s * dt; player.pitch = clamp(player.pitch - (settings.invertY ? -1 : 1) * ly * curve * s * 0.75 * dt, -1.5, 1.5);
    // A jump · B crouch (tap toggles, slides while sprinting) · X reload · Y swap · RB lethal · LB tactical · L3 sprint · R3 melee
    if (pr(0)) { player.jumpBuf = 0.14; gp.crouch = false; }
    if (pr(1)) { if (player.sprinting || Math.hypot(player.vel.x, player.vel.z) > 6.2) { gp.crouch = true; gp.slideStand = true; gp.sprint = false; } else gp.crouch = !gp.crouch; }
    if (gp.slideStand && gp.crouch && !player.sliding && gp.prevSliding) { gp.crouch = false; gp.slideStand = false; } gp.prevSliding = player.sliding;
    if (gp.crouch !== gp.crouchPrev) { keys.KeyC = gp.crouch; gp.crouchPrev = gp.crouch; }
    if (SURV.open) { if (pr(12) || pr(13)) { const n = ARMORY[SURV.open.kind].items().length; SURV.sel = (SURV.sel + (pr(13) ? 1 : n - 1)) % n; renderBuy(); gp.prev[12] = gp.prev[13] = true; } if (pr(0)) { buyItem(SURV.sel); gp.prev[0] = true; } if (pr(1)) { closeBuy(); gp.prev[1] = true; } }
    if (pr(2) && (SURV.open || nearStation())) { if (SURV.open) closeBuy(); else openBuy(nearStation()); } else if (pr(2)) startReload(); if (pr(3)) { if (!player.alive && (MP.active || game.mode === 'botdm')) pauseGame(); else switchTo(wst.cur === carry[0] ? carry[1] : carry[0]); }
    if (pr(5)) nadeQuickStart('lethal'); if (pr(4)) nadeQuickStart('tactical'); if ((rl(5) || rl(4)) && ng.quick) nadeRelease(); if (pr(11)) quickMelee();
    if (pr(10)) { gp.sprint = !gp.sprint; gp.crouch = false; }
    if (gp.my > -0.35 || gp.ads || gp.fire) gp.sprint = false; // releasing the stick, aiming or firing ends a sprint
    if (gp.sprint) keys.ShiftLeft = true; else if (gp.wasSprint) keys.ShiftLeft = false; gp.wasSprint = gp.sprint;
    mouseL = gp.fire || mL; mouseR = gp.ads || mR;
    // D-pad: up = 1st/3rd person · left/right = cycle weapons · down = armory (survival)
    if (pr(15) && supOn() && (SURV.support.length || SURV.tgt)) { supportStart(); gp.prev[15] = true; }
    else if (pr(14) || pr(15)) { const k = carry.indexOf(wst.cur); switchTo(carry[(k + (pr(14) ? 2 : 1)) % 3]); }
    if (pr(12)) useAbility(); if (pr(13)) { if (game.mode === 'survival' && game.phase === 'inter') openArmory(); else toggleView(); }
    // View (hold) = scoreboard · Menu = pause
    if (b(8)) { keys.Tab = true; gp.viewHeld = true; } else if (gp.viewHeld) { keys.Tab = false; gp.viewHeld = false; }
    if (pr(9)) { if (document.pointerLockElement) document.exitPointerLock(); pauseGame(); }
  } else {
    if (gp.sprint || gp.crouch) { gp.sprint = gp.crouch = gp.crouchPrev = false; keys.ShiftLeft = false; keys.KeyC = false; }
    if (gp.viewHeld) { keys.Tab = false; gp.viewHeld = false; }
    gpMenu(g, b, pr, dt);
  }
  gp.prev = g.buttons.map((x, i) => b(i));
}
// ---- controller menu navigation: D-pad / left stick moves a highlight, A selects, B goes back, left/right changes sliders & dropdowns
// one focus ring that glides between items; mouse hover and controller / keyboard share it
const navRing = document.createElement('div'); navRing.id = 'navring'; document.body.appendChild(navRing);
function recoverFocus() { // a re-render replaced the focused button: land on its twin (same label + kind) or whatever now sits where it was
  const L = gp.last; if (!L) return null; const items = navItems(); if (!items.length) return null;
  let best = items.find(e => e.tagName === L.tag && e.className.replace(' gpfocus', '') === L.cls && e.textContent.trim().slice(0, 40) === L.txt);
  if (!best) { let bd = 1e9; for (const e of items) { const r = e.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - L.x, r.top + r.height / 2 - L.y); if (d < bd) { bd = d; best = e; } } }
  if (best) gpFocus(best, true); return best;
}
function placeRing() {
  if (gp.focus && !gp.focus.isConnected && game.state !== 'play') recoverFocus();
  const el = gp.focus; if (!el || !el.isConnected || el.offsetParent === null || game.state === 'play') { navRing.style.opacity = '0'; return; }
  const r = el.getBoundingClientRect(); navRing.style.opacity = '1'; navRing.style.transform = `translate(${r.left - 3}px, ${r.top - 3}px)`; navRing.style.width = (r.width + 6) + 'px'; navRing.style.height = (r.height + 6) + 'px';
}
function gpFocus(el, fromMouse) {
  if (el && el.closest && el.closest('#maps')) { const i = [...$('maps').children].indexOf(el); if (i >= 0) mapInfo(i); }
  if (gp.focus === el) return; if (gp.focus) gp.focus.classList.remove('gpfocus'); gp.focus = el;
  if (el) { const r = el.getBoundingClientRect(); gp.last = { tag: el.tagName, cls: el.className.replace(' gpfocus', ''), txt: el.textContent.trim().slice(0, 40), x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  if (el) { el.classList.add('gpfocus'); if (!fromMouse) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
  placeRing();
}
function navItems() {
  if (picker) return [...picker.box.children];
  const scr = document.querySelector('.screen.on'); if (!scr) return [];
  return [...scr.querySelectorAll('button, select, input, [data-nav]')].filter(e => !e.disabled && e.offsetParent !== null && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
}
function spinify(sel) { // replace a <select> with a controller-friendly ◀ value ▶ control (the select stays as the source of truth)
  if (!sel || sel.tagName !== 'SELECT') return; let sp = sel.nextElementSibling && sel.nextElementSibling.classList && sel.nextElementSibling.classList.contains('spin') ? sel.nextElementSibling : null;
  if (!sp) { sp = document.createElement('button'); sp.type = 'button'; sp.className = 'spin'; sp.innerHTML = '<span></span><i>▾</i>'; sel.after(sp); sel.style.display = 'none';
    sp._sel = sel; sp.addEventListener('click', () => openPicker(sp)); sel.addEventListener('change', () => spinLabel(sp)); }
  spinLabel(sp);
}
let picker = null;
function openPicker(sp) { // CoD-style pop-out list: up/down to choose, A / click to confirm, B / Esc to cancel
  closePicker(); const s = sp._sel, r = sp.getBoundingClientRect(), box = document.createElement('div'); box.className = 'picker';
  [...s.options].forEach((o, i) => { const b = document.createElement('button'); b.textContent = o.textContent; if (i === s.selectedIndex) b.className = 'on';
    b.onclick = () => { s.selectedIndex = i; s.dispatchEvent(new Event('change', { bubbles: true })); spinLabel(sp); sfx.play('pickup'); closePicker(); gpFocus(sp); }; box.appendChild(b); });
  document.body.appendChild(box); const h = box.offsetHeight, top = r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4;
  box.style.left = Math.min(r.left, innerWidth - box.offsetWidth - 8) + 'px'; box.style.top = top + 'px'; box.style.minWidth = r.width + 'px';
  picker = { box, sp }; gpFocus(box.children[Math.max(0, s.selectedIndex)]); sfx.play('switch');
}
function closePicker() { if (!picker) return; const sp = picker.sp; picker.box.remove(); picker = null; if (gp.focus && !gp.focus.isConnected) gpFocus(sp); }
addEventListener('mousedown', e => { if (picker && !picker.box.contains(e.target) && e.target !== picker.sp && !picker.sp.contains(e.target)) closePicker(); }, true);
function syncSpins() { document.querySelectorAll('.spin').forEach(sp => sp._sel && spinLabel(sp)); }
function spinLabel(sp) { const s = sp._sel, o = s.options[s.selectedIndex]; sp.querySelector('span').textContent = o ? o.textContent : ''; sp.classList.toggle('first', s.selectedIndex <= 0); sp.classList.toggle('last', s.selectedIndex >= s.options.length - 1); }
function spinStep(sp, d) { const s = sp._sel; const n = clamp(s.selectedIndex + d, 0, s.options.length - 1); if (n === s.selectedIndex) return; s.selectedIndex = n; s.dispatchEvent(new Event('change', { bubbles: true })); spinLabel(sp); sfx.play('pickup'); }
window.spinify = spinify;
function updatePrompts() { const el = document.querySelector('.mfoot .hints'); if (!el) return; const pad = gp.on, k = pad ? ['LB', 'RB', 'A', 'B', '◀▶', 'Menu'] : ['[', ']', 'Enter', 'Esc', '← →', 'Click'];
  const html = `<kbd>${k[0]}</kbd><kbd>${k[1]}</kbd> tabs · <kbd>${k[2]}</kbd> select / open · <kbd>${k[3]}</kbd> back` + (pad ? ' · <kbd>LT</kbd><kbd>RT</kbd> categories · <kbd>R-stick</kbd> rotate operator · <kbd>Menu</kbd> deploy' : ' · drag the operator to rotate'); if (el.innerHTML !== html) el.innerHTML = html; }
function menuNav(dir, f, items) {

  const horiz = dir === 'left' || dir === 'right', sgn = dir === 'left' || dir === 'up' ? -1 : 1;
  if (horiz && f.tagName === 'SELECT') { f.selectedIndex = clamp(f.selectedIndex + sgn, 0, f.options.length - 1); f.dispatchEvent(new Event('change', { bubbles: true })); sfx.play('pickup'); return; }
  if (horiz && f.type === 'range') { const st = +f.step || 1; f.value = clamp(+f.value + sgn * st * (f.max - f.min > 20 * st ? 5 : 1), +f.min, +f.max); f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); return; }
  const r0 = f.getBoundingClientRect(), cx = (r0.left + r0.right) / 2, cy = (r0.top + r0.bottom) / 2; let best = null, bs = 1e9;
  for (const e of items) { if (e === f) continue; const r = e.getBoundingClientRect(), ex = (r.left + r.right) / 2, ey = (r.top + r.bottom) / 2, dx = ex - cx, dy = ey - cy;
    const along = horiz ? dx * sgn : dy * sgn, across = horiz ? Math.abs(dy) : Math.abs(dx); if (along <= 4) continue;
    const sc = along + across * (horiz ? 3 : 2.2) + (e.closest('.mtab') !== f.closest('.mtab') ? 400 : 0); if (sc < bs) { bs = sc; best = e; } }
  if (best) { gpFocus(best); sfx.play('hit'); }
}
addEventListener('keydown', e => {
  if (game.state === 'play' || game.state === 'dying' || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== 'range')) return;
  const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
  const items = navItems(); if (!items.length) return;
  if (dir) { e.preventDefault(); if (gp.focus && !gp.focus.isConnected) recoverFocus(); if (!gp.focus || !items.includes(gp.focus)) gpFocus(items.find(x => x.classList.contains('big') || x.classList.contains('mode')) || items[0]); else menuNav(dir, gp.focus, items); }
  else if (e.key === 'Enter' && gp.focus && items.includes(gp.focus)) { e.preventDefault(); gp.focus.click(); }
  else if (e.key === 'Escape' && picker) { e.preventDefault(); closePicker(); }
  else if ((e.key === '[' || e.key === ']') && document.querySelector('#menu.on') && window.menuCycleTab) window.menuCycleTab(e.key === '[' ? -1 : 1);
});
function gpMenu(g, b, pr, dt) {
  if (game.state === 'menu' && document.querySelector('#menu.on') && window.menuCycleTab) { if (pr(4)) window.menuCycleTab(-1); if (pr(5)) window.menuCycleTab(1);
    if ((pr(6) || pr(7)) && menuTab === 'loadout') { const ch = [...document.querySelectorAll('#loadout .chips button')]; if (ch.length) { const i = ch.findIndex(c => c.classList.contains('on')); ch[(i + (pr(7) ? 1 : ch.length - 1)) % ch.length].click(); } } }
  { const rx = g.axes[2] || 0, ry = g.axes[3] || 0; if ((Math.abs(rx) > 0.2 || Math.abs(ry) > 0.2) && $('preview').offsetParent) { PV.userRot = (PV.userRot || 0) + rx * dt * 2.6; PV.zoom = clamp((PV.zoom || 1) * (1 + ry * dt * 1.2), 0.55, 1.4); PV.idleT = 0; } } // right stick: rotate / zoom the operator
  const items = navItems(); if (!items.length) return;
  if (gp.focus && !gp.focus.isConnected) recoverFocus();
  if (!gp.focus || !items.includes(gp.focus)) gpFocus(items.find(e => e.classList.contains('big')) || items[0]);
  const f = gp.focus, ax = g.axes[0] || 0, ay = g.axes[1] || 0;
  let dir = b(12) || ay < -0.55 ? 'up' : b(13) || ay > 0.55 ? 'down' : b(14) || ax < -0.55 ? 'left' : b(15) || ax > 0.55 ? 'right' : '';
  gp.navT -= dt; if (!dir) { gp.navDir = ''; gp.navT = 0; }
  if (dir && (dir !== gp.navDir || gp.navT <= 0)) {
    gp.navT = dir === gp.navDir ? 0.09 : 0.26; gp.navDir = dir; menuNav(dir, f, items);
    if (false) {}
    else if (horiz && f.type === 'range') { const st = +f.step || 1; f.value = clamp(+f.value + sgn * st * (f.max - f.min > 20 * st ? 5 : 1), +f.min, +f.max); f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); }
    else {
      const r0 = f.getBoundingClientRect(), cx = (r0.left + r0.right) / 2, cy = (r0.top + r0.bottom) / 2; let best = null, bs = 1e9;
      for (const e of items) { if (e === f) continue; const r = e.getBoundingClientRect(), ex = (r.left + r.right) / 2, ey = (r.top + r.bottom) / 2, dx = ex - cx, dy = ey - cy;
        const along = horiz ? dx * sgn : dy * sgn, across = horiz ? Math.abs(dy) : Math.abs(dx); if (along <= 4) continue;
        const sc = along + across * 2.2; if (sc < bs) { bs = sc; best = e; } }
      if (best) { gpFocus(best); sfx.play('hit'); }
    }
  }
  if (pr(0)) { if (f.tagName === 'SELECT') { f.selectedIndex = (f.selectedIndex + 1) % f.options.length; f.dispatchEvent(new Event('change', { bubbles: true })); } else if (f.tagName === 'INPUT' && (f.type === 'text' || !f.type)) f.focus(); else if (f.type === 'checkbox') { f.checked = !f.checked; f.dispatchEvent(new Event('change', { bubbles: true })); } else f.click(); }
  if (pr(1) && picker) { closePicker(); gp.prev[1] = true; } else if (pr(1)) { // back
    const back = { pause: 'resume', armory: 'armback', mp: MP.peer ? 'mpLeave' : 'mpBack', over: 'tomenu', mpover: 'mpToLobby' }[game.state === 'paused' ? 'pause' : game.state === 'mp' ? 'mp' : game.state]
      || (document.querySelector('#mp.on') ? (MP.peer ? 'mpLeave' : 'mpBack') : null);
    if (game.state === 'paused' && $('psettings') && $('psettings').style.display === 'block') { pauseSettings(false); return; }
    if (back && $(back) && $(back).offsetParent !== null) $(back).click();
  }
  if (pr(9)) { const id = { menu: 'play', paused: 'resume', over: 'retry', mpover: 'mpToLobby', armory: 'armback' }[game.state]; if (id && $(id) && $(id).offsetParent !== null) $(id).click(); }
}
addEventListener('mouseover', e => { const t = e.target.closest && e.target.closest('button, select, input'); if (t && game.state !== 'play' && navItems().includes(t)) gpFocus(t, true); });
addEventListener('scroll', placeRing, true); addEventListener('resize', placeRing);
addEventListener('gamepadconnected', () => showHint('CONTROLLER CONNECTED', '#6dc8ff'));

