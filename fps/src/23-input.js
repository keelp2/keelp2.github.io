// ============================================================ INPUT
const keys = {}; let mL = false, mR = false, mouseL = false, mouseR = false, locked = false, mdx = 0, mdy = 0;
addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
  const typing = e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  if (!typing && (game.state === 'play' || game.state === 'dying') && (e.ctrlKey || e.metaKey || e.altKey)) e.preventDefault(); // Ctrl-crouch + D/S/A etc. must not bookmark, save or select the page
  if (e.code === 'KeyB' && game.state === 'armory' && !e.repeat) { resumeGame(); return; }
  if (SURV.open && game.state === 'play' && /^Digit[1-9]$/.test(e.code)) { buyItem(+e.code.slice(5) - 1); e.preventDefault(); return; }
  if (SURV.open && (e.code === 'Escape' || e.code === 'KeyB')) { closeBuy(); return; }
  if (SURV.open && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) { const n = ARMORY[SURV.open.kind].items().length; SURV.sel = (SURV.sel + (e.code === 'ArrowDown' ? 1 : n - 1)) % n; renderBuy(); e.preventDefault(); return; }
  if (SURV.open && e.code === 'Enter') { buyItem(SURV.sel); return; }
  if (SURV.tgt && game.state === 'play') { if (e.code === 'KeyQ' || e.code === 'KeyE') { tabletRotate(e.code === 'KeyE' ? 0.26 : -0.26); return; } if (e.code === 'Escape') { supportCancel(); return; } if (e.code === 'Enter') { tabletConfirm(); return; } }
  if ((e.code === 'ControlLeft' || e.code === 'ControlRight') && !kbLocked && game.state === 'play' && !hud.ctrlWarned) { hud.ctrlWarned = true; showHint('C = CROUCH · Ctrl+W CLOSES THE TAB OUTSIDE FULLSCREEN', '#ff9b6b'); }
  if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault();
  if (e.code === 'Escape' && game.state === 'play' && !e.repeat) { if (document.pointerLockElement) document.exitPointerLock(); pauseGame(); return; } // with keyboard lock, Esc reaches the page
  if (e.code === 'KeyC' && game.state === 'play' && !player.alive && (MP.active || game.mode === 'botdm') && !e.repeat) { pauseGame(); return; }
  if (keys[e.code]) return; keys[e.code] = true;
  if (game.state !== 'play') return;
  if (e.code === 'KeyB') openArmory();
  if (e.code === 'KeyR') startReload();
  if (e.code === 'Digit1') switchTo(carry[0]);
  if (e.code === 'Digit2') switchTo(carry[1]);
  if (e.code === 'Digit3') switchTo(carry[2]);
  if (e.code === 'KeyV') quickMelee();
  if (e.code === 'KeyT') toggleView();
  if ((e.code === 'KeyZ' || e.code === 'Digit6') && game.state === 'play') { supportStart(); return; }
  if (e.code === 'KeyG' && game.state === 'play') nadeQuickStart('lethal');
  if (e.code === 'KeyQ' && game.state === 'play') nadeQuickStart('tactical');
  if (e.code === 'Digit4' && game.state === 'play') { if (ng.on && ng.slot === 'lethal') switchTo(wst.cur); else nadeEquip(false, 'lethal'); }
  if (e.code === 'Digit5' && game.state === 'play') { if (ng.on && ng.slot === 'tactical') switchTo(wst.cur); else nadeEquip(false, 'tactical'); }
  if (e.code === 'KeyF' && !e.repeat && game.state === 'play' && (SURV.open || nearStation())) { if (SURV.open) closeBuy(); else openBuy(nearStation()); return; }
  if (e.code === 'KeyE' || e.code === 'KeyF') useAbility();
  if (e.code === 'Space') player.jumpBuf = 0.14;
});
addEventListener('keyup', e => { keys[e.code] = false; if ((e.code === 'KeyG' || e.code === 'KeyQ') && ng.quick) nadeRelease(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseL = mouseR = false; });
renderer.domElement.addEventListener('mousedown', e => {
  if (game.state === 'play' && !locked) { requestLock(); return; }
  if (e.button === 0) { mouseL = mL = true; wst.held = false; }
  if (e.button === 2) { mouseR = mR = true; wst.adsOn = !wst.adsOn; }
});
addEventListener('mouseup', e => { if (e.button === 0) mouseL = mL = false; if (e.button === 2) mouseR = mR = false; });
addEventListener('contextmenu', e => e.preventDefault());
// in fullscreen the Keyboard Lock API lets the game own Ctrl+W/T/N etc. (Chrome / Edge); elsewhere Ctrl is not used for crouch
function lockKeys() { if (document.fullscreenElement && navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock().then(() => { kbLocked = true; }).catch(() => { kbLocked = false; }); }
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) { kbLocked = false; try { navigator.keyboard && navigator.keyboard.unlock(); } catch (e) {} } });
addEventListener('beforeunload', e => { if (game.state === 'play' || game.state === 'paused' || game.state === 'dying' || MP.active) { e.preventDefault(); e.returnValue = ''; } }); // Ctrl+W can't be blocked: ask before closing mid-match
addEventListener('wheel', e => { if (game.state !== 'play') return; if (SURV.tgt) { tabletRotate(e.deltaY > 0 ? 0.2 : -0.2); return; } const k = carry.indexOf(wst.cur); switchTo(carry[(k + (e.deltaY > 0 ? 1 : 2)) % 3]); }, { passive: true });
addEventListener('mousemove', e => {
  if (!locked || game.state !== 'play' || !player.alive) return;
  const dx = clamp(e.movementX, -300, 300), dy = clamp(e.movementY, -300, 300);
  if (SURV.tgt) { const k = tabletScale() / 520 * settings.sens; tabletMove(dx * k, dy * k); return; } /* holding the tablet: the mouse moves the marker, not your view */
  const zoom = lerp(1, WEAPONS[wst.cur].zoom, wst.ads);
  const s = 0.0022 * settings.sens / zoom;
  player.yaw -= dx * s; player.pitch = clamp(player.pitch - dy * s * (settings.invertY ? -1 : 1), -1.5, 1.5);
  mdx += dx; mdy += dy;
});
let kbLocked = false;
function requestLock() {
  if (settings.fullscreen !== false && document.documentElement.requestFullscreen && !document.fullscreenElement) {
    try { document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(lockKeys).catch(() => {}); } catch (e) {}
  } else lockKeys();
  try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => { $('lockmsg').style.display = 'block'; }); } catch (e) { $('lockmsg').style.display = 'block'; }
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  $('lockmsg').style.display = locked || game.state !== 'play' ? 'none' : 'block';
  if (!locked && game.state === 'play') pauseGame();
});

