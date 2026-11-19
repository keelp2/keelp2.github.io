// ============================================================ BOT DEATHMATCH
const BD = { stats: [], limit: 20, time: 480, matchT: 0, respawn: [], lastAttacker: null };
function botProfile(i) {
  const keys = Object.keys(CLASSES), c = keys[i % keys.length], C = CLASSES[c], lo = DEFAULT_LO[c];
  const prims = WEAPONS.filter(w => w.slot === 'primary').map(w => w.id), weapon = Math.random() < 0.2 ? lo[0] : pick(prims); // bots carry the whole arsenal
  return { name: BOT_NAMES[i % BOT_NAMES.length], cls: c, color: PCOLORS[(i + 1) % PCOLORS.length], T: { model: C.model, name: BOT_NAMES[i % BOT_NAMES.length], hp: C.hp, speed: 4.6 * C.speed, scale: CHAR[C.model].scale, weapon, sight: 90, reaction: 0.35, score: 0 } };
}
// Spawn selection: never in an enemy's line of sight, not too close, near teammates in TDM, and spread across the map
// Interior rooms, upper floors and rooftops worth holding: bots go there and use the stairs to get there.
function navPosts() { const nav = world.nav; if (nav._posts) return nav._posts; const out = [], seen = new Set(), up = new V3(0, 1, 0), o = new V3();
  const S = nav.safe || [], step = Math.max(1, Math.floor(S.length / 5000)), off = Math.floor(Math.random() * step);
  for (let i = off; i < S.length && out.length < 400; i += step) { const n = S[i]; const [x, y, z] = nav.nodePos(n), key = Math.round(x / 4) + ',' + Math.round(y / 2) + ',' + Math.round(z / 4); if (seen.has(key)) continue; seen.add(key);
    if (y - TH(x, z) > 2.2) { out.push(n); continue; } o.set(x, y + 1.2, z); const h = raycast(o, up, 5, false); if (h.t < 5) out.push(n); }
  return (nav._posts = out); }
function pickSpawn(foes, friends, list, _fb) {
  // Anti spawn-camp: never spawn in an enemy's sight or within ~18 m of one; if every listed spawn
  // (e.g. a TDM home base being camped) is compromised, the spawn "flips" to the safest spot on the map.
  const L = world.L, nav = world.nav, cands = (list || L.enemySpawns.concat([[L.spawn.x, L.spawn.z]], L.teamSpawns ? L.teamSpawns[0].concat(L.teamSpawns[1]) : [])).map(([x, z]) => [x, 0.05, z]);
  const [bx0, bz0, bx1, bz1] = L.bounds, inside = (x, z, m) => x > bx0 + m && x < bx1 - m && z > bz0 + m && z < bz1 - m; // never at the very edge of the map
  for (let i = 0; i < (list ? 0 : 56); i++) { const n = nav.randomNode(); if (n < 0) continue; const [x, y, z] = nav.nodePos(n); if (y - TH(x, z) < 0.3 && inside(x, z, 9) && nav.nodeAt(x, y, z, 1) >= 0 && nav.freeAt(x, y, z)) cands.push([x, y + 0.05, z]); }
  if (friends && friends.length) for (const f of friends) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28, r = rand(4, 9), k = nav.nodeAt(f.x + Math.cos(a) * r, f.y, f.z + Math.sin(a) * r, 2); if (k >= 0 && (!nav.safeMask || nav.safeMask[k])) { const [x, y, z] = nav.nodePos(k); if (inside(x, z, 6)) cands.push([x, y + 0.05, z]); } }
  let best = cands[0], bs = -1e9, bestSafe = false;
  for (const c of cands) {
    if (!nav.freeAt(c[0], c[1], c[2])) continue;
    let md = 1e9, seen = 0; for (const p of foes) { const d = Math.hypot(p.x - c[0], p.z - c[2]); md = Math.min(md, d); if (d < 90 && seen < 3 && los(p.x, p.y + 1.6, p.z, c[0], c[1] + 1.5, c[2])) seen++; }
    const safe = md > 18 && !seen;
    let sc = (md < 18 ? md * 4 - 140 : Math.min(md, 50)) - seen * 90 + rand(0, 8) + (safe ? 200 : 0);
    if (friends && friends.length) { let fd = 1e9; for (const f of friends) fd = Math.min(fd, Math.hypot(f.x - c[0], f.z - c[2])); sc += 30 - Math.min(fd, 60) * 0.6; }
    else if (md > 95) sc -= (md - 95) * 0.4; // FFA: near the action, not the far corner
    if (sc > bs) { bs = sc; best = c; bestSafe = safe; }
  }
  if (!bestSafe && list && !_fb && foes.length) return pickSpawn(foes, friends, null, true); // home spawn camped → flip
  return best;
}
function dmSpawnPoint(avoid, near, list) { return pickSpawn(avoid, near, list); }
function dmSpawnPointOld(avoid, near, list) {
  const L = world.L, cands = list ? list.map(([x, z]) => [x, TH(x, z) + 0.05, z]) : L.enemySpawns.map(([x, z]) => [x, TH(x, z) + 0.05, z]).concat([[L.spawn.x, L.spawn.y + 0.05, L.spawn.z]]);
  let best = cands[0], bs = -1e9;
  for (const c of cands) { let md = 1e9; for (const p of avoid) md = Math.min(md, Math.hypot(p.x - c[0], p.z - c[2]));
    let sc = Math.min(md, 60) + rand(0, 10); if (near && near.length) { let nd = 1e9; for (const p of near) nd = Math.min(nd, Math.hypot(p.x - c[0], p.z - c[2])); sc = (md > 14 ? 100 : md) - nd * 0.8 + rand(0, 4); }
    if (sc > bs) { bs = sc; best = c; } }
  return best;
}
const TEAMC = [0x3fa7ff, 0xff5a5a];
function combatants() { return enemies.filter(e => !e.dead).map(e => ({ pos: e.pos, team: e.team })).concat(player.alive ? [{ pos: player.pos, team: BD.teams ? 0 : -1 }] : []); }
function teamSpawn(team) { const all = combatants(); if (!BD.teams) return dmSpawnPoint(all.map(c => c.pos)); const ts = world.L.teamSpawns, foes = all.filter(c => c.team !== team).map(c => c.pos), mates = all.filter(c => c.team === team).map(c => c.pos);
  if (ts && ts[team] && (!foes.length || game.time - (BD.startT || 0) < 6)) return pickSpawn(foes, null, ts[team]); // match start: home base
  if (ts && ts[team]) return pickSpawn(foes, mates, ts[team].concat(mates.length ? [] : ts[team])); return dmSpawnPoint(all.filter(c => c.team !== team).map(c => c.pos), all.filter(c => c.team === team).map(c => c.pos)); }
function spawnBot(st) {
  const [x, y, z] = teamSpawn(st.team);
  const k = world.nav.nearestFree(x + rand(-2, 2), z + rand(-2, 2), 6), [cx, cz] = k >= 0 ? world.nav.center(k) : [x, z];
  const e = new Enemy('bot', cx, cz, 1, { T: st.T, name: st.name, sash: st.color, y: 0, faction: BD.teams ? st.team : hashStr(st.name) & 1 }); e.stat = st; e.team = st.team; e.protT = game.time + 2.5; enemies.push(e);
  if (BD.teams && st.team === 0) { e.tag = makeNameTag(st.name, TEAMC[0]); e.tag.position.y = 2.25 / e.s; e.inner.add(e.tag); }
}
function startBotMatch() {
  sfx.init(); music.stop(); resize();
  if (!world || world.def !== MAPS[settings.map] || world.shadows !== QUALITY[settings.quality].shadows) { loadMap(settings.map); world.shadows = QUALITY[settings.quality].shadows; }
  resetRun(); game.mode = 'botdm'; game.phase = 'dm'; potgReset();
  BD.startT = game.time; BD.time = settings.botTime === undefined ? 600 : +settings.botTime; BD.matchT = BD.time || 1e9; BD.respawn = [];
  const n = clamp(settings.bots || 5, 1, 11), teams = BD.teams = settings.botMode === 'tdm'; BD.teamKills = [0, 0];
  BD.limit = +(teams ? settings.botLimitT || 50 : settings.botLimitF || 30);
  BD.stats = [{ name: settings.name || 'You', me: true, cls: settings.cls, kills: 0, deaths: 0, color: teams ? TEAMC[0] : PCOLORS[0], team: teams ? 0 : -1 }];
  const allies = teams ? Math.floor(n / 2) : 0;
  for (let i = 0; i < n; i++) { const p = botProfile(i + Math.floor(Math.random() * 6)); p.name = BOT_NAMES[(i * 3 + 5) % BOT_NAMES.length]; p.T.name = p.name; p.kills = 0; p.deaths = 0; p.team = teams ? (i < allies ? 0 : 1) : -1; if (teams) p.color = TEAMC[p.team]; BD.stats.push(p); }
  const L = world.L; player.alive = true; player.pos.set(L.spawn.x, L.spawn.y + 0.05, L.spawn.z);
  for (const st of BD.stats) if (!st.me && st.team === 1) spawnBot(st);
  if (teams) { const [x, y, z] = teamSpawn(0); player.pos.set(x, y, z); } else { const [x, y, z] = dmSpawnPoint(enemies.map(e => e.pos)); player.pos.set(x, y, z); }
  for (const st of BD.stats) if (!st.me && st.team !== 1) spawnBot(st);
  player.yaw = Math.atan2(player.pos.x, player.pos.z); player.protT = game.time + 2.5;
  game.state = 'play'; showScreen(null); camera.fov = settings.fov; requestLock(); hudCache = {};
  startIntro(teams ? 'TEAM DEATHMATCH' : 'FREE-FOR-ALL', teams ? `Coalition (${allies + 1}) vs Republican Guard (${n - allies}) · first side to ${BD.limit} kills` : `First to ${BD.limit} kills · ${n} bots`);
  if (!game.intro) showMsg(teams ? 'TEAM DEATHMATCH' : 'BOT DEATHMATCH', teams ? `COALITION (${allies + 1}) vs REPUBLICAN GUARD (${n - allies}) · FIRST TO ${BD.limit}` : `FIRST TO ${BD.limit} KILLS · ${n} BOTS`, 3.5);
}
function botKilled(victim, killer, head) {
  const vs = victim.stat; if (vs) vs.deaths++;
  let kname = 'the swamp';
  if (killer === PLAYER_T) { const me = BD.stats[0]; me.kills++; game.kills++; ksKill(); if (head) game.heads++; statKill(head, 'bot'); kname = 'You'; hitMarker(true, head); if (head) { sfx.play('head'); showHint('HEADSHOT', '#ff6b5a'); }
    if (game.time - game.lastKill < 3) game.streak++; else game.streak = 1; game.lastKill = game.time; const names = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUAD KILL', 5: 'RAMPAGE' }; if (game.streak >= 2) showStreak(names[Math.min(game.streak, 5)]); }
  else if (killer && killer.stat) { killer.stat.kills++; kname = killer.name; }
  if (BD.teams && killer && killer.team >= 0 && killer.team !== victim.team) BD.teamKills[killer.team]++;
  const tc = t => (BD.teams && t >= 0 ? (t ? '#ff7a7a' : '#7ac4ff') : null), mine = killer === PLAYER_T;
  killFeed(kname, tc(killer ? (mine ? 0 : killer.team) : -1), mine ? killLabel() : killer && killer.W ? killer.W.short : '', head, victim.name, tc(victim.team), mine);
  if (vs) BD.respawn.push({ st: vs, t: 3 });
  checkBotEnd();
}
function botPlayerDie() {
  ksReset(); if (SURV.tgt) supportCancel();
  const k = BD.lastAttacker instanceof Enemy ? BD.lastAttacker : null; BD.stats[0].deaths++;
  if (k && k.stat) k.stat.kills++; if (BD.teams && k) BD.teamKills[k.team]++;
  { const tc = t => (BD.teams && t >= 0 ? (t ? '#ff7a7a' : '#7ac4ff') : null); killFeed(k ? k.name : null, k ? tc(k.team) : null, k && k.W ? k.W.short : '', !!BD.lastHead, BD.stats[0].name, tc(0), true); }
  player.alive = false; sfx.voice('death', { self: true, pitch: settings.vpitch || 120, vol: 0.8 }); MP.respawnT = 3.5; game.deadT = 0; mouseL = mouseR = false; wst.reloading = false;
  showMsg('ELIMINATED', k ? 'by ' + k.name : '', 3); checkBotEnd(); if (k && k._pid) potgKillcam(k._pid);
}
function checkBotEnd() { if (BD.teams) { for (const t of [0, 1]) if (BD.teamKills[t] >= BD.limit) endBotMatch((t ? 'The Republican Guard' : 'The Coalition') + ' reached ' + BD.limit + ' kills'); return; } const top = BD.stats.reduce((a, b) => (b.kills > a.kills ? b : a)); if (top.kills >= BD.limit) endBotMatch(top.name + ' reached the kill limit'); }
function updateBotMatch(dt) {
  BD.matchT -= dt; if (BD.matchT <= 0) return endBotMatch('Time limit reached');
  for (let i = BD.respawn.length - 1; i >= 0; i--) { BD.respawn[i].t -= dt; if (BD.respawn[i].t <= 0) { spawnBot(BD.respawn[i].st); BD.respawn.splice(i, 1); } }
  if (!player.alive) { MP.respawnT -= dt; game.deadT = (game.deadT || 0) + dt; if (MP.respawnT <= 0) { mpRespawn(); const [x, y, z] = teamSpawn(0); player.pos.set(x, y, z); player.yaw = Math.atan2(x, z); } }
}
function endBotMatch(why) {
  if (game.outro || (game.state !== 'play' && game.state !== 'paused')) return;
  let res; if (BD.teams) { const [b, r] = BD.teamKills; res = b === r ? 'draw' : b > r ? 'win' : 'loss'; } else { const top = BD.stats.reduce((a, b) => (b.kills > a.kills ? b : a)); res = top.me ? 'win' : 'loss'; }
  startOutro(res, why, () => endBotMatchNow(why));
}
function endBotMatchNow(why) {
  if (game.state !== 'play' && game.state !== 'paused') return;
  game.state = 'mpover'; if (document.pointerLockElement) document.exitPointerLock();
  const rows = BD.stats.slice().sort((a, b) => (BD.teams ? a.team - b.team : 0) || b.kills - a.kills || a.deaths - b.deaths);
  let won;
  if (BD.teams) { const [b, r] = BD.teamKills; won = b > r; $('mpWinner').textContent = b === r ? 'DRAW' : b > r ? 'COALITION VICTORY' : 'REPUBLICAN GUARD VICTORY'; $('mpWhy').textContent = `${why} · Coalition ${b} – ${r} Rep. Guard`; }
  else { won = rows[0].me; $('mpWinner').textContent = rows[0].me ? 'YOU WIN!' : rows[0].name.toUpperCase() + ' WINS'; $('mpWhy').textContent = why; }
  $('mpBoard').innerHTML = botTable(rows) + `<div class="mysum">${statEnd(BD.teams ? 'TEAM DEATHMATCH' : 'BOT FFA', BD.teams && BD.teamKills[0] === BD.teamKills[1] ? 'draw' : won ? 'win' : 'loss', BD.stats[0].deaths)}</div>`; $('mpToLobby').textContent = 'BACK TO MENU';
  showScreen('mpover');
}
function botTable(rows) {
  return `<table class="sb"><tr><th>#</th><th>PLAYER</th><th>CLASS</th><th>K</th><th>D</th></tr>` + rows.map((p, i) => `<tr class="${p.me ? 'me' : ''}"><td>${i + 1}</td><td><i style="background:#${new THREE.Color(p.color).getHexString()}"></i>${esc(p.name)}${p.me ? '' : ' 🤖'}</td><td>${esc(CLASSES[p.cls] ? CLASSES[p.cls].name : '')}</td><td>${p.kills}</td><td>${p.deaths}</td></tr>`).join('') + '</table>';
}

