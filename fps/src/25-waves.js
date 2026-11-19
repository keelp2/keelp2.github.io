// ============================================================ WAVES
function makeWave(n) {
  const total = Math.min(5 + n * 2, 32), list = [];
  for (let i = 0; i < total; i++) {
    const r = Math.random();
    list.push(n >= 4 && r < 0.12 ? 'heavy' : n >= 3 && r < 0.27 ? 'sniper' : n >= 2 && r < 0.5 ? 'rusher' : 'grunt');
  }
  if (n % 5 === 0) list.push('heavy', 'heavy');
  return list;
}
function startWave(n) {
  game.wave = n; game.queue = makeWave(n); game.phase = 'fight'; game.spawnT = 0.5; game.maxAlive = Math.min(3 + n, 10);
  showMsg('WAVE ' + n, game.queue.length + ' HOSTILES INBOUND', 2.5); sfx.play('wave');
}
function spawnEnemy(type) {
  const sp = world.L.enemySpawns; const ph = playerHead(new V3());
  let best = null, bs = -1e9;
  for (const [x, z] of sp) {
    const d = Math.hypot(x - player.pos.x, z - player.pos.z);
    let s = Math.min(d, 45) / 6 + rand(0, 4);
    if (d < 14) s -= 30;
    if (los(x, 1.6, z, ph.x, ph.y, ph.z)) s -= 6;
    if (enemies.some(e => !e.dead && Math.hypot(e.pos.x - x, e.pos.z - z) < 1.5)) s -= 10;
    if (s > bs) { bs = s; best = [x, z]; }
  }
  const k = world.nav.nearestFree(best[0], best[1], 6); const [cx, cz] = k >= 0 ? world.nav.center(k) : best;
  const e = new Enemy(type, cx + rand(-0.2, 0.2), cz + rand(-0.2, 0.2), game.wave); enemies.push(e); e.etype = type;
  if (MP.active && MP.isHost && MP.mode === 'surv') { e.netId = 'z-' + (MP.zSeq = (MP.zSeq || 0) + 1); e.q = 0; e.isEnemyNpc = true; }
  const c = new THREE.Color(e.T.visor);
  sparks.burst(cx, 1, cz, 24, 5, c.r, c.g, c.b, 0.6, -0.2);
  const s = spatial(e.pos); sfx.play('spawn', s);
}
function updateWaves(dt) {
  const alive = enemies.filter(e => !e.dead).length;
  if (game.phase === 'inter') {
    game.interT -= dt;
    if (game.interT <= 0) startWave(game.wave + 1);
  } else {
    game.spawnT -= dt;
    if (game.spawnT <= 0 && game.queue.length && alive < game.maxAlive) { spawnEnemy(game.queue.shift()); game.spawnT = rand(0.5, 1.3); }
    if (!game.queue.length && alive === 0) {
      const bonus = 250 * game.wave; game.score += bonus; addCash(500 + 100 * game.wave, 'WAVE BONUS'); game.phase = 'inter'; game.interT = survOn() ? 20 : 8;
      player.hp = Math.min(player.maxHp, player.hp + 25); player.regenCap = Math.min(player.maxHp, Math.max(player.regenCap, Math.ceil(player.hp / 25) * 25));
      if (player.grenades < cls().nadeMax) player.grenades++; player.tacticals = Math.min(3, (player.tacticals || 0) + 1);
      showMsg('WAVE CLEARED', '+' + bonus + '  ·  +25 HP  ·  +1 GRENADE' + (survOn() ? '  ·  20s to visit an armory' : ''), 3); sfx.play('clear');
    }
  }
}
function onKill(e, head) {
  game.kills++; if (head) game.heads++; statKill(head, 'ai');
  let pts = e.T.score + (head ? Math.round(e.T.score * 0.5) : 0);
  if (game.time - game.lastKill < 2.5) game.streak++; else game.streak = 1;
  game.lastKill = game.time;
  const names = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUAD KILL', 5: 'RAMPAGE' };
  if (game.streak >= 2) { const b = 50 * game.streak; pts += b; showStreak((names[Math.min(game.streak, 5)] || 'RAMPAGE') + '  +' + b); }
  game.score += pts; addCash(pts, head ? 'HEADSHOT' : '');
  killFeed(settings.name || 'You', '#ffd27a', killLabel(), head, e.T.name + '  +' + pts, null, true);
  hitMarker(true, head); if (head) { sfx.play('head'); showHint('HEADSHOT', '#ff6b5a'); }
  const r = Math.random();
  if (r < 0.22) pickups.push(new Pickup('ammo', e.pos.x, e.pos.y, e.pos.z, true));
  else if (r < 0.34) pickups.push(new Pickup('health', e.pos.x, e.pos.y, e.pos.z, true));
}

