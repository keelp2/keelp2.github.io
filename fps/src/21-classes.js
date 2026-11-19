// ============================================================ CLASSES
const CLASSES = {
  assault: { model: 'knight', glove: 0x2a2a2a, sleeve: 0xc8b48e, name: 'ASSAULT', desc: 'Frontline rifleman. Solid at every range.', passive: 'Faster health regen', hp: 100, speed: 1, jump: 1, nades: 2, nadeMax: 3, headMul: 1, regen: 20,
    ability: 'ADRENALINE', abDesc: 'Heal 40 HP and move 30% faster for 4s', cd: 20 },
  scout: { model: 'ginger', glove: 0x8a7656, sleeve: 0xd8c8a4, name: 'SCOUT', desc: 'Light kit, fast feet. First into every fight.', passive: '+12% speed, higher jumps', hp: 100, speed: 1.12, jump: 1.12, nades: 1, nadeMax: 2, headMul: 1, regen: 14,
    ability: 'DASH', abDesc: 'Burst forward in your move direction', cd: 6 },
  heavy: { model: 'ogre', glove: 0x1e1e1e, sleeve: 0x8a8a84, name: 'HEAVY', desc: 'Blast-rated armour and a big gun. Slow, but shrugs off explosions.', passive: '40% less explosive damage · 4 grenades', hp: 100, speed: 0.9, jump: 0.95, nades: 3, nadeMax: 4, headMul: 1, regen: 14,
    ability: 'ARMOR PLATES', abDesc: '+60 shield that absorbs damage for 6s', cd: 25 },
  recon: { model: 'fairy', glove: 0x4a4a3a, sleeve: 0x8f9a72, name: 'RECON', desc: 'Ghillie-suited marksman with eyes in the sky.', passive: '+20% headshot damage', hp: 100, speed: 1, jump: 1, nades: 2, nadeMax: 3, headMul: 1.2, regen: 14,
    ability: 'UAV SCAN', abDesc: 'Reveal all enemies on radar and through walls for 7s', cd: 18 },
  wolf: { model: 'wolf', glove: 0x1a1a1a, sleeve: 0x5a5c60, name: 'BREACHER', desc: 'Door-kicker. Clears rooms and blows cover open.', passive: 'Heartbeat sensor: radar shows foes within 20m', hp: 100, speed: 1.08, jump: 1.05, nades: 1, nadeMax: 2, headMul: 1, regen: 16,
    ability: 'CONCUSSION BLAST', abDesc: 'Shockwave: up to 60 damage and huge knockback within 7m', cd: 16 },
  witch: { model: 'witch', glove: 0x5a4a32, sleeve: 0xb0a080, name: 'GRENADIER', desc: 'Explosives expert. Owns choke points.', passive: '+1 grenade, bigger blasts', hp: 100, speed: 1, jump: 1, nades: 3, nadeMax: 4, headMul: 1, regen: 14,
    ability: 'GAS CANISTER', abDesc: 'Lob a canister that leaves a toxic cloud: 25 dmg/s for 5s', cd: 20 },
};
let THUMBS = {}; let previewSelect = () => {}; let refreshAvatar = () => {}; let botBoard = () => botTable(BD.stats.slice().sort((a, b) => b.kills - a.kills || a.deaths - b.deaths));
const clouds = [];
function areaDamage(x, y, z, r, dmg, kb, attacker) { // damages enemies / remote players around a point (not the local player)
  let n = 0;
  for (const list of [enemies, remoteList]) for (const e of list) {
    if (e.dead || isAlly(attacker === 'player' ? PLAYER_T : attacker, e)) continue; const cx = e.pos.x, cy = e.pos.y + e.h * 0.5, cz = e.pos.z, d = Math.hypot(cx - x, cy - y, cz - z); if (d > r) continue;
    const f = 1 - (d / r) * 0.5, dx = (cx - x) / (d || 1), dz = (cz - z) / (d || 1);
    if (e.damage(dmg * f, false, { x: dx * kb * f, z: dz * kb * f }, attacker) !== undefined) n++;
  }
  return n;
}
function updateClouds(dt) {
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i]; c.t -= dt; c.tick -= dt;
    if (c.fire) { for (let q = 0; q < 3; q++) sparks.emit(c.x + rand(-c.r, c.r) * 0.75, c.y + 0.1, c.z + rand(-c.r, c.r) * 0.75, rand(-0.3, 0.3), rand(1.5, 3.5), rand(-0.3, 0.3), 1, rand(0.35, 0.6), 0.1, rand(0.4, 0.8), -0.2); if (Math.random() < 0.3) debris.emit(c.x + rand(-c.r, c.r) * 0.6, c.y + 1, c.z + rand(-c.r, c.r) * 0.6, 0, 1.2, 0, 0.15, 0.14, 0.13, 2, -0.1); }
    else if (Math.random() < 0.7) debris.emit(c.x + rand(-c.r, c.r) * 0.8, c.y + rand(0, 1.2), c.z + rand(-c.r, c.r) * 0.8, rand(-0.3, 0.3), rand(0.2, 0.8), rand(-0.3, 0.3), 0.35, 0.8, 0.25, 1.4, -0.05);
    if (c.tick <= 0) { c.tick = 0.25;
      if (c.owner === MP.myId || c.owner === 'player' || !MP.active) { const n = areaDamage(c.x, c.y + 0.8, c.z, c.r, (c.fire ? 32 : 25) * 0.25, 0, 'player'); if (n) hitMarker(false, false, c.fire ? 'fire' : 'nade'); }
      if (c.owner !== MP.myId && player.alive && Math.hypot(player.pos.x - c.x, player.pos.z - c.z) < c.r && Math.abs(player.pos.y - c.y) < 2.5) damagePlayer(25 * 0.25 * (c.owner ? 1 : 0), null, c.owner);
    }
    if (c.t <= 0) clouds.splice(i, 1);
  }
}
if (!CLASSES[settings.cls]) settings.cls = 'assault';
const HEALTH = { hardcore: 40, classic: 100, core: 150 }; if (settings.hv !== 3) { if (settings.health !== 'hardcore') settings.health = 'core'; settings.hv = 3; } if (!HEALTH[settings.health]) settings.health = 'core'; // 150 HP is the default: the guns are balanced for it (~0.45-0.55 s TTK)
const hpMul = () => (MP.active ? (HEALTH[MP.health] || 150) : HEALTH[settings.health]) / 100; // everyone shares one value; online the host decides
const cls = () => CLASSES[settings.cls];
function useAbility() {
  const C = cls(), P = player;
  if (!P.alive || P.abilityCD > 0) { if (P.alive) showHint(C.ability + ' RECHARGING', '#ff6b5a'); return; }
  P.abilityCD = C.cd;
  if (settings.cls === 'assault') { P.hp = Math.min(P.maxHp, P.hp + 40); P.regenCap = Math.max(P.regenCap, Math.ceil(P.hp / 25) * 25); P.stimT = 4; sfx.play('pad'); showHint('ADRENALINE — +40 HP', '#5dff9a'); }
  else if (settings.cls === 'scout') {
    const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let wx = -sy * f + cy * st, wz = -cy * f - sy * st; const l = Math.hypot(wx, wz); if (l < 0.1) { wx = -sy; wz = -cy; } else { wx /= l; wz /= l; }
    P.vel.x = wx * 17; P.vel.z = wz * 17; if (P.onGround) P.vel.y = 2.5; sfx.play('slide'); vm.kick = 0.4;
  }
  else if (settings.cls === 'heavy') { P.shield = 60; P.shieldT = 6; sfx.play('wave'); showHint('ARMOR PLATES ON', '#6dc8ff'); }
  else if (settings.cls === 'wolf') {
    sfx.play('howl'); game.shake = Math.min(1, game.shake + 0.4);
    for (let i = 0; i < 60; i++) { const a = i / 60 * 6.28; sparks.emit(P.pos.x, P.pos.y + 1, P.pos.z, Math.cos(a) * 14, rand(0, 1), Math.sin(a) * 14, 0.8, 0.85, 1, 0.45, 0); }
    const n = areaDamage(P.pos.x, P.pos.y + 1, P.pos.z, 7, 60, 16, 'player'); if (n) { hitMarker(false, false, 'nade'); showHint('CONCUSSION — ' + n + ' HIT', '#ffcf6b'); } else showHint('CONCUSSION BLAST', '#ffcf6b');
  }
  else if (settings.cls === 'witch') {
    aimBasis(); const pos = camera.position.clone().addScaledVector(_f, 0.6), vel = _f.clone().multiplyScalar(14).add(new V3(0, 4, 0));
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), MAT({ color: 0x4a5a3a, emissive: 0x30a040, emissiveIntensity: 0.25, metalness: 0.6, roughness: 0.4 }));
    mesh.position.copy(pos); fx.add(mesh); grenades.push({ pos, vel, mesh, t: 1.3, owner: MP.myId, brew: true }); sfx.play('brew');
    if (MP.active) netSend({ t: 'nade', p: v3a(pos), v: v3a(vel), brew: 1 });
  }
  else { P.pulseT = 7; sfx.play('charge'); showHint('UAV ONLINE — ENEMIES REVEALED', '#ffcf6b'); for (const e of enemies) if (!e.dead) e.revealed = true; }
}

