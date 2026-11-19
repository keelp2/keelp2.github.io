// ============================================================ THIRD-PERSON VIEW
let avatar = null;
function toggleView() { settings.view = settings.view === 'third' ? 'first' : 'third'; saveSettings(); showHint(settings.view === 'third' ? 'THIRD-PERSON VIEW' : 'FIRST-PERSON VIEW', '#ffcf6b'); refreshAvatar(); }
refreshAvatar = () => { if (avatar && world) world.group.remove(avatar.group); avatar = null; };
function updateAvatar(dt) {
  const outroShow = !!(game.outro && game.outro.t > 1.4), third = (settings.view === 'third' || (game.intro && game.intro.showAvatar) || outroShow) && (game.state === 'play' || game.state === 'paused' || game.state === 'dying');
  if (!third) { if (avatar) avatar.group.visible = false; return false; }
  if (!avatar || avatar.cls !== settings.cls) { refreshAvatar(); avatar = makeCharacter(cls().model, { weapon: WEAPONS[wst.cur].id, faction: MP.active && MP.mode === 'tdm' ? mpTeamOf(PLAYER_T) : 0, seed: PROFILE.id, byClass: true }); avatar.cls = settings.cls; world.group.add(avatar.group); }
  setCharWeapon(avatar, WEAPONS[wst.cur].id);
  avatar.group.visible = true; avatar.group.position.set(player.pos.x, player.pos.y, player.pos.z); avatar.group.rotation.y = player.yaw + Math.PI;
  avatar.group.rotation.x = player.alive ? 0 : -Math.min(1, (game.deadT || 0) / 0.5) * 1.4;
  if (avatar.skinned) { avatar.crouchK = clamp((1.75 - player.h) / 0.65, 0, 1); avatar.inner.scale.y = (CHAR[cls().model] || { scale: 1 }).scale; } else avatar.inner.scale.y = (CHAR[cls().model] || { scale: 1 }).scale * (player.h / 1.75);
  avatar.sliding = player.sliding; animChar(avatar, dt, Math.hypot(player.vel.x, player.vel.z), player.pitch);
  if (avatar.flash) avatar.flash.visible = vm.flashT > 0;
  if (outroShow) return true; // the outro camera frames the operator itself
  // over-the-shoulder camera with collision
  const piv = new V3(player.pos.x, player.pos.y + player.h - 0.05, player.pos.z); aimBasis();
  const dist = lerp(2.9, 1.5, wst.ads), want = piv.clone().addScaledVector(_f, -dist).addScaledVector(_r, lerp(0.6, 0.45, wst.ads)).addScaledVector(_u, 0.25);
  const dir = want.clone().sub(piv), len = dir.length(); dir.divideScalar(len); const h = raycast(piv, dir, len, false);
  camera.position.copy(piv).addScaledVector(dir, Math.max(0.3, Math.min(len, h.t - 0.25)));
  return true;
}

