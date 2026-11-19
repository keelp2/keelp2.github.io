// ============================================================ MULTIPLAYER (peer-to-peer via WebRTC / PeerJS)
// Topology: the lobby host is the hub. Clients send to the host, the host stamps the sender id and relays.
// Damage is applied by the victim's own client (so class abilities like Overshield work), scores are kept by the host.
const MP = { seen: {}, lastHost: 0, active: false, peer: null, isHost: false, conns: new Map(), uconns: new Map(), mesh: new Map(), hostU: null, seq: 0, pingTimer: 0, host: null, myId: '', code: '', players: {}, map: 0, limit: 20, time: 480, matchT: 0, sendT: 0, joined: false, lastAttacker: null, lastAttackT: -99, lastHead: false, pickPending: -1, respawnT: 0, nextColor: 1 };
const remotes = new Map();
const PCOLORS = [0xff7a1a, 0x3fa7ff, 0x5dff9a, 0xff4fd8, 0xffd23a, 0xa07aff, 0xff5a5a, 0x4fffe8];
const PREFIX = 'breachpoint-v1-'; // internal id (kept so online lobbies and saves survive the rename)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cleanName = n => String(n || '').replace(/[^\w \-.]/g, '').trim().slice(0, 16) || 'Player';
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const v3a = v => [Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100, Math.round(v.z * 100) / 100];
const arrV3 = a => (Array.isArray(a) && a.length === 3 ? new V3(clamp(num(a[0]), -200, 200), clamp(num(a[1]), -50, 100), clamp(num(a[2]), -200, 200)) : null);
const pname = id => (MP.players[id] ? MP.players[id].name : 'Player');
if (!settings.name) settings.name = 'Player' + randi(100, 999);

function peerOpts() {
  const q = new URLSearchParams(location.search).get('peerserver'); // only for local testing
  if (q) { const [host, port] = q.split(':'); return { host, port: +port || 9000, path: '/', secure: false, debug: 0 }; }
  return { debug: 0 };
}
function makeCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 5; i++) c += A[Math.random() * A.length | 0]; return c; }
function setMpStatus(t, bad) { const el = $('mpStatus'); el.textContent = t || ''; el.style.color = bad ? '#ff6b5a' : '#ffcf6b'; }
function mpView(v) { $('mpJoin').style.display = v === 'join' ? 'block' : 'none'; $('mpLobby').style.display = v === 'lobby' ? 'block' : 'none'; }
function meInfo() { return { name: cleanName(settings.name), tag: PROFILE.tag, cls: settings.cls, kills: 0, deaths: 0, color: 0 }; }
function mpCleanup() {
  clearRemotes(); pubBeaconStop();
  try { if (MP.peer) MP.peer.destroy(); } catch (e) {}
  clearInterval(MP.pingTimer);
  Object.assign(MP, { active: false, peer: null, isHost: false, host: null, hostU: null, myId: '', code: '', players: {}, joined: false, nextColor: 1, pingTimer: 0 });
  MP.conns = new Map(); MP.uconns = new Map(); MP.mesh = new Map(); MP.seen = {};
}
function hostLobby(pub, bots) {
  if (typeof Peer === 'undefined') return setMpStatus('Networking library failed to load.', true);
  const keepPub = pub === undefined ? !!MP.public : !!pub, keepBots = bots === undefined ? (MP.botN || 0) : bots;
  mpCleanup(); MP.isHost = true; MP.code = makeCode(); MP.public = keepPub; MP.botN = keepBots; MP.mode = MP.mode || 'ffa'; setMpStatus(keepPub ? 'Creating public match…' : 'Creating lobby…');
  const peer = MP.peer = new Peer(PREFIX + MP.code, peerOpts());
  peer.on('open', id => {
    MP.myId = id; MP.players = { [id]: meInfo() }; MP.players[id].ping = 0; mpBotDefs(MP.botN || 0); setMpStatus(''); mpView('lobby'); if ($('mpBots')) $('mpBots').value = String(MP.botN || 0); if ($('mpPublic')) $('mpPublic').value = MP.public ? '1' : '0'; if (MP.public) pubBeaconStart(); renderLobby();
    let tick = 0;
    MP.pingTimer = setInterval(() => { // measure round-trip time to every client, share results every 2s
      const now = performance.now();
      for (const id in MP.players) if (id !== MP.myId && now - (MP.seen[id] || now) > (MP.active && game.time < 30 ? 25000 : 12000)) // generous while slow machines build the map { const c = MP.conns.get(id); dropPlayer(id); try { c && c.close(); } catch (e) {} } // silent for 7s = gone
      for (const id of MP.conns.keys()) sendTo(id, { t: 'pi', c: now }, true);
      if (++tick % 2 === 0) { const p = {}; for (const id in MP.players) p[id] = MP.players[id].ping | 0; bcast({ t: 'pings', p }); if (!MP.active) renderLobby(); }
    }, 1000);
  });
  peer.on('connection', conn => {
    if (conn.metadata && conn.metadata.ch === 'u') { // fast lane: unordered channel for positions + pings
      conn.on('open', () => MP.uconns.set(conn.peer, conn));
      conn.on('data', d => hostRecv(conn.peer, d));
      conn.on('close', () => MP.uconns.delete(conn.peer));
      return;
    }
    conn.on('open', () => {
      if (Object.keys(MP.players).length >= 8 && !MP.active) { const b = Object.keys(MP.players).find(id => MP.players[id].bot); if (b) { delete MP.players[b]; broadcastLobby(); } } // a real player takes a bot's slot
      if (Object.keys(MP.players).length >= 8 || MP.active) { conn.send({ t: 'full', why: MP.active ? 'Match already in progress — try again when it ends.' : 'Lobby is full (8 players).' }); setTimeout(() => conn.close(), 400); return; }
      MP.conns.set(conn.peer, conn);
    });
    conn.on('data', d => hostRecv(conn.peer, d));
    conn.on('close', () => dropPlayer(conn.peer));
    conn.on('error', () => dropPlayer(conn.peer));
  });
  peer.on('error', e => {
    if (e.type === 'unavailable-id') return hostLobby();
    if (!MP.myId) { try { peer.destroy(); } catch (x) {} MP.peer = null; }
    setMpStatus(e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' ? 'Could not reach the matchmaking server. Check your connection and try again.' : 'Network error: ' + e.type, true);
  });
  let tries = 0;
  peer.on('disconnected', () => { if (MP.peer === peer && MP.myId && tries++ < 3) setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) {} }, 1500 * tries); });
}
function joinLobby(raw) {
  if (typeof Peer === 'undefined') return setMpStatus('Networking library failed to load.', true);
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (code.length !== 5) return setMpStatus('Enter the 5-character lobby code.', true);
  mpCleanup(); MP.code = code; setMpStatus('Connecting to ' + code + '…');
  const peer = MP.peer = new Peer(undefined, peerOpts());
  peer.on('open', id => {
    MP.myId = id;
    const c = MP.host = peer.connect(PREFIX + code, { reliable: true });
    const to = MP.joinTO = setTimeout(() => { if (!MP.joined && MP.peer === peer) setMpStatus('Could not reach lobby ' + code + '. Check the code and try again.', true); }, 10000);
    c.on('open', () => {
      c.send({ t: 'hello', name: settings.name, tag: PROFILE.tag, cls: settings.cls });
      const u = MP.hostU = peer.connect(PREFIX + code, { reliable: false, metadata: { ch: 'u' } });
      u.on('data', clientRecv);
    });
    c.on('data', d => {
      if (!MP.joined) { MP.joined = true; clearTimeout(to); MP.lastHost = performance.now(); MP.pingTimer = setInterval(() => { if (performance.now() - MP.lastHost > (MP.active && game.time < 30 ? 25000 : 12000)) hostGone(); }, 1000); }
      clientRecv(d);
    });
    c.on('close', hostGone);
  });
  peer.on('connection', conn => { // direct client<->client links for movement (skips the host hop)
    if (!conn.metadata || conn.metadata.ch !== 'm') return conn.close();
    conn.on('open', () => { if (MP.players[conn.peer]) MP.mesh.set(conn.peer, conn); else conn.close(); });
    conn.on('data', d => meshRecv(conn.peer, d));
    conn.on('close', () => MP.mesh.delete(conn.peer));
  });
  peer.on('error', e => {
    clearTimeout(MP.joinTO);
    if (e.type !== 'peer-unavailable') { try { peer.destroy(); } catch (x) {} MP.peer = null; }
    setMpStatus(e.type === 'peer-unavailable' ? 'Lobby ' + code + ' not found. Check the code.' : e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' ? 'Could not reach the matchmaking server. Check your connection and try again.' : 'Network error: ' + e.type, true);
  });
}
function sayBye() {
  if (!MP.peer) return;
  try { if (MP.isHost) bcast({ t: 'bye' }); else if (MP.host && MP.host.open) MP.host.send({ t: 'bye' }); } catch (e) {}
}
addEventListener('pagehide', () => { sayBye(); try { MP.peer && MP.peer.destroy(); } catch (e) {} });
function leaveLobby() { sayBye(); mpCleanup(); mpView('join'); setMpStatus(''); }
function hostGone() {
  if (!MP.peer || MP.isHost) return;
  const wasActive = MP.active; mpCleanup();
  if (wasActive || game.state === 'mpover') { toMenu(); }
  openMpScreen(); setMpStatus('The host left the lobby.', true);
}
function sendTo(id, msg, fast) {
  const u = fast && MP.uconns.get(id), c = u && u.open ? u : MP.conns.get(id);
  if (c && c.open) { try { c.send(msg); } catch (e) {} }
}
function bcast(msg, except, fast) { for (const id of MP.conns.keys()) if (id !== except) sendTo(id, msg, fast); }
function netSend(msg) {
  msg.id = MP.myId;
  const fast = msg.t === 'st';
  if (fast) msg.q = ++MP.seq;
  if (MP.isHost) { bcast(msg, null, fast); if (msg.t === 'down') coopStat(MP.myId, 'downs'); if (msg.t === 'revive') { coopStat(MP.myId, 'revives'); handleGame(Object.assign({}, msg, { id: MP.myId + '#' })); } if (msg.t === 'die') hostDeath(msg); if (msg.t === 'pickreq') hostPick(MP.myId, msg.k); return; }
  const c = fast && MP.hostU && MP.hostU.open ? MP.hostU : MP.host;
  if (c && c.open) { try { c.send(msg); } catch (e) {} }
  if (fast) for (const m of MP.mesh.values()) if (m.open) { try { m.send(msg); } catch (e) {} }
}
function meshRecv(from, d) { if (d && typeof d === 'object' && d.t === 'st' && MP.players[from]) { d.id = from; handleGame(d); } }
function connectMesh() { // each client links directly to every other client (lower id dials) — falls back to host relay if it fails
  for (const id in MP.players) {
    if (id === MP.myId || id === MP.hostId || MP.mesh.has(id) || id < MP.myId || (MP.players[id] && MP.players[id].bot)) continue;
    const c = MP.peer.connect(id, { reliable: false, metadata: { ch: 'm' } });
    c.on('open', () => MP.mesh.set(id, c)); c.on('data', d => meshRecv(id, d)); c.on('close', () => MP.mesh.delete(id));
  }
}
function mpAssignTeams() { if (MP.mode !== 'tdm') { for (const id in MP.players) delete MP.players[id].team; return; } const ids = Object.keys(MP.players).sort((a, b) => (MP.players[a].bot ? 1 : 0) - (MP.players[b].bot ? 1 : 0)); ids.forEach((id, i) => MP.players[id].team = i % 2); }
function lobbyMsg() { mpAssignTeams(); return { t: 'lobby', players: MP.players, map: MP.map, limit: MP.limit, time: MP.time, hostId: MP.myId, mode: MP.mode || 'ffa' }; }
function broadcastLobby() { bcast(lobbyMsg()); renderLobby(); }
function hostRecv(from, d) {
  if (!d || typeof d !== 'object' || typeof d.t !== 'string') return;
  MP.seen[from] = performance.now();
  if (d.t === 'bye') { const c = MP.conns.get(from); dropPlayer(from); try { c && c.close(); } catch (e) {} return; }
  if (d.t === 'hello') {
    if (MP.players[from] || !MP.conns.has(from)) return;
    MP.players[from] = { name: cleanName(d.name), tag: cleanTag(d.tag), cls: CLASSES[d.cls] ? d.cls : 'assault', kills: 0, deaths: 0, color: MP.nextColor++ % PCOLORS.length };
    broadcastLobby(); sfx.play('pickup'); return;
  }
  if (d.t === 'info') { const p = MP.players[from]; if (p) { p.name = cleanName(d.name); if (d.tag !== undefined) p.tag = cleanTag(d.tag); p.cls = CLASSES[d.cls] ? d.cls : p.cls; broadcastLobby(); } return; }
  if (!MP.players[from]) return;
  d.id = from;
  if (d.t === 'po') { const rtt = performance.now() - num(d.c, 0); if (rtt >= 0 && rtt < 5000) { const p = MP.players[from]; p.ping = p.ping ? lerp(p.ping, rtt, 0.3) : rtt; } return; }
  if (d.t === 'pickreq') return hostPick(from, d.k);
  if (d.t === 'down' && MP.players[from]) { coopStat(from, 'downs'); } if (d.t === 'revive' && MP.players[from]) { coopStat(from, 'revives'); }
  if (!['st', 'shot', 'hit', 'hm', 'pane', 'die', 'nade', 'rocket', 'down', 'revive', 'rvp', 'air'].includes(d.t)) return;
  bcast(d, from, d.t === 'st');
  if (d.t === 'die') hostDeath(d);
  handleGame(d);
}
function dropPlayer(id) {
  if (!MP.isHost || !MP.players[id]) { MP.conns.delete(id); return; }
  const name = MP.players[id].name; delete MP.players[id]; MP.conns.delete(id);
  bcast({ t: 'left', id }); removeRemote(id); broadcastLobby();
  if (MP.active) { addFeed(esc(name) + ' left the match'); if (Object.keys(MP.players).length < 2) hostEndMatch('Not enough players'); }
}
function clientRecv(d) {
  if (!d || typeof d !== 'object' || typeof d.t !== 'string') return;
  MP.lastHost = performance.now();
  if (d.t === 'bye') return hostGone();
  switch (d.t) {
    case 'pi': { const c = MP.hostU && MP.hostU.open ? MP.hostU : MP.host; if (c && c.open) c.send({ t: 'po', c: d.c }); return; }
    case 'pings': if (d.p && typeof d.p === 'object') { for (const id in d.p) if (MP.players[id]) MP.players[id].ping = clamp(num(d.p[id]) | 0, 0, 9999); if (!MP.active) renderLobby(); } return;
    case 'full': setMpStatus(d.why ? String(d.why).slice(0, 80) : 'Lobby unavailable.', true); return;
    case 'lobby': {
      const ps = {}; if (d.players && typeof d.players === 'object') for (const id of Object.keys(d.players).slice(0, 8)) { const p = d.players[id] || {}; ps[id] = { name: cleanName(p.name), tag: cleanTag(p.tag), cls: CLASSES[p.cls] ? p.cls : 'assault', kills: num(p.kills) | 0, deaths: num(p.deaths) | 0, color: num(p.color) | 0, ping: num(p.ping) | 0, bot: p.bot === true && /^bot-\d$/.test(id), team: p.team === 0 || p.team === 1 ? p.team : undefined }; }
      MP.players = ps; MP.map = clamp(num(d.map) | 0, 0, MAPS.length - 1); MP.limit = clamp(num(d.limit, 20) | 0, 1, 200); MP.time = clamp(num(d.time, 480) | 0, 60, 3600); MP.health = HEALTH[d.hp] ? d.hp : MP.health; MP.hostId = String(d.hostId || ''); MP.mode = ['ffa', 'tdm', 'surv'].includes(d.mode) ? d.mode : 'ffa';
      if (!MP.active && game.state !== 'mpover') { setMpStatus(''); mpView('lobby'); } renderLobby(); return;
    }
    case 'start': startMatch(d); return;
    case 'end': endMatch(d); return;
    case 'score': if (Array.isArray(d.ts)) MP.teamScore = [num(d.ts[0]) | 0, num(d.ts[1]) | 0]; if (d.players && typeof d.players === 'object') for (const id in d.players) if (MP.players[id]) { const q = d.players[id], m = MP.players[id]; m.kills = num(q.kills) | 0; m.deaths = num(q.deaths) | 0; m.downs = num(q.downs) | 0; m.revives = num(q.revives) | 0; m.score = num(q.score) | 0; } return;
    case 'zdie': handleZDie(d); return;
    case 'wave': handleWave(d); return;
    case 'down': if (r) r.downed = true; addFeed(esc(pname(d.id)) + ' is down — revive them!'); return;
    case 'rvp': if (d.to === MP.myId) { MP.beingRev = { by: d.id, p: clamp(num(d.p), 0, 1), t: game.time }; } return;
    case 'revive': if (d.to === MP.myId && player.downed) { player.downed = false; player.hp = Math.round(player.maxHp * 0.5); player.regenCap = player.hp; player.protT = game.time + 2; MP.beingRev = null; sfx.play('clear'); showHint('REVIVED BY ' + pname(String(d.id).replace('#', '')).toUpperCase(), '#9cff8a'); } else if (remotes.get(d.to)) remotes.get(d.to).downed = false; return;
    case 'left': { const n = pname(d.id); const m = MP.mesh.get(d.id); if (m) { try { m.close(); } catch (e) {} MP.mesh.delete(d.id); } delete MP.players[d.id]; removeRemote(d.id); if (MP.active) addFeed(esc(n) + ' left the match'); renderLobby(); return; }
    case 'picked': handlePicked(d); return;
    default: handleGame(d);
  }
}
function handleGame(d) {
  if (!MP.active || typeof d.id !== 'string' || d.id === MP.myId) return;
  const r = remotes.get(d.id);
  switch (d.t) {
    case 'st': if (r) r.push(d); else if (MP.mode === 'surv' && /^z-\d+$/.test(d.id) && ETYPES[d.tp]) { const nr = new Remote(d.id, { name: ETYPES[d.tp].name, cls: 'assault', color: 0, model: ETYPES[d.tp].model }); remotes.set(d.id, nr); remoteList = [...remotes.values()]; nr.push(d); } break;
    case 'shot': {
      const a = arrV3(d.a), b = arrV3(d.b); if (!a || !b) break;
      spawnTracer(a, b, 0xffd27a, 750, 0.014); if (r) r.mflash = 0.06; nearMiss(a, b); { const dv = b.clone().sub(a), L = dv.length(); if (L > 0.1) { RAY_SEND = false; try { raycast(a, dv.divideScalar(L), L + 0.15, false, null, true); } finally { RAY_SEND = true; } } }
      const w = WEAPONS.find(x => x.id === d.w); const sp = spatial(a); sfx.gun(w ? w.snd : 'rifle', { dist: sp.dist, pan: sp.pan, pos: sp.pos, supp: !!d.s, occl: !los(camera.position.x, camera.position.y, camera.position.z, a.x, a.y, a.z) });
      if (r && !d.s) r.lastFired = game.time; /* suppressed fire stays off the radar */
      break;
    }
    case 'hit': d.dmg = Math.min(clamp(num(d.dmg), 0, 250), hitCap(d.w, !!d.head)); /* no gun can do more than its own max per hit */
      if (d.to === MP.myId && player.alive) { if (typeof d.w === 'string') MP.lastWeapon = d.w.slice(0, 12); } const atk = typeof d.by === 'string' && MP.players[d.by] && MP.players[d.by].bot ? d.by : d.id;
      if (d.to === MP.myId && player.alive) { MP.viaHit = true; try { damagePlayer(clamp(num(d.dmg), 0, 250), (remotes.get(atk) || r || {}).pos || null, atk, !!d.head); } finally { MP.viaHit = false; } }
      if (MP.isHost && typeof d.to === 'string' && (d.to.startsWith('bot-') || d.to.startsWith('z-'))) { const e = enemies.find(x => x.netId === d.to && !x.dead); if (e) { e.mpAttacker = d.id; const rr = remotes.get(d.id); if (rr && !e.visible) { e.target = rr; e.attacker = rr; e.lastKnown.copy(rr.pos); } e.damage(clamp(num(d.dmg), 0, 250), !!d.head, null, null); } }
      break;
    case 'pane': { const pn = panes[num(d.i, -1)]; if (pn) breakPane(pn, false, true); break; }
    case 'hm': if (d.to === MP.myId && game.state === 'play') hitMarker(!!d.kill, false, d.k === 'stun' ? 'stun' : 'nade'); break;
    case 'die': {
      const victim = d.id, killer = typeof d.by === 'string' ? d.by : victim; if (r && victim !== MP.myId) { const sp = spatial(r.pos); sfx.voice('death', { pos: sp.pos, vol: sp.vol * 1.8, pitch: 95 + (hashStr(String(victim)) % 60) }); }
      killFeed(killer === victim ? null : pname(killer), null, wShort(d.w), !!d.head && killer !== victim, pname(victim), null, killer === MP.myId || victim === MP.myId);
      if (killer === MP.myId && victim !== MP.myId) mpKillConfirm(victim, !!d.head);
      break;
    }
    case 'rocket': { const p = arrV3(d.p), v = arrV3(d.v); if (p && v && v.length() < 80) { spawnRocket(p, v, d.id); const sp = spatial(p); sfx.boom(sp.dist + 4, sp.pan, 0.3); } break; }
    case 'air': { const pts = Array.isArray(d.pts) ? d.pts.slice(0, 9).map(arrV3).filter(Boolean) : []; if (pts.length) { callAirstrike(pts[0], !!d.c, d.id, pts); showHint((d.c ? 'ENEMY CARPET BOMBING' : 'ENEMY AIRSTRIKE') + ' INBOUND', '#ff6b5a'); } break; }
    case 'nade': {
      const p = arrV3(d.p), v = arrV3(d.v); if (!p || !v) break;
      const kind = EQUIP[d.k] ? d.k : 'frag', nm = nadeMesh(kind); nm.g.position.copy(p); fx.add(nm.g);
      grenades.push({ pos: p, vel: v, mesh: nm.g, em: nm.em, t: d.brew ? 1.3 : d.f !== undefined ? clamp(num(d.f), 0.05, 6) : 2.0, owner: d.id, brew: !!d.brew, kind, spin: new V3(6, 1, 0) });
      break;
    }
  }
}
function mpKillConfirm(victim, head) {
  ksKill();
  const vb = MP.players[victim] && MP.players[victim].bot; if (!vb) { game.kills++; if (head) game.heads++; } statKill(head, vb ? 'bot' : 'pvp'); // bot kills earn XP but stay out of your PvP K/D
  if (game.time - game.lastKill < 3) game.streak++; else game.streak = 1; game.lastKill = game.time;
  const names = { 2: 'DOUBLE KILL', 3: 'TRIPLE KILL', 4: 'QUAD KILL', 5: 'RAMPAGE' };
  if (game.streak >= 2) showStreak(names[Math.min(game.streak, 5)]);
  hitMarker(true, head); showHint((head ? 'HEADSHOT · ' : '') + 'ELIMINATED ' + pname(victim).toUpperCase(), head ? '#ff6b5a' : '#ffcf6b');
}
function hostDeath(d) {
  const v = MP.players[d.id]; if (!v || !MP.active) return;
  v.deaths++;
  const k = MP.mode !== 'surv' && typeof d.by === 'string' && d.by !== d.id ? MP.players[d.by] : null; if (k) k.kills++;
  if (MP.mode === 'tdm' && k && k.team !== v.team && k.team >= 0) MP.teamScore[k.team]++;
  const sc = {}; for (const id in MP.players) { const q = MP.players[id]; sc[id] = { kills: q.kills, deaths: q.deaths, downs: q.downs | 0, revives: q.revives | 0, score: q.score | 0 }; }
  bcast({ t: 'score', players: sc, ts: MP.teamScore });
  if (MP.mode === 'tdm') { for (const t of [0, 1]) if (MP.teamScore[t] >= MP.limit) hostEndMatch((t ? 'The Republican Guard' : 'The Coalition') + ' reached ' + MP.limit + ' kills'); }
  else if (k && k.kills >= MP.limit) hostEndMatch(k.name + ' reached the kill limit');
}
// ---- bots in online matches: the host runs them as Enemies, everyone else sees them as Remotes
// ---- co-op survival online: host runs waves; downs, revives, shared wave state, per-player score
function coopStat(id, k) { const p = MP.players[id]; if (!p || !MP.active) return; p[k] = (p[k] | 0) + 1; hostDeath0(); }
function hostDeath0() { const sc = {}; for (const id in MP.players) { const q = MP.players[id]; sc[id] = { kills: q.kills, deaths: q.deaths, downs: q.downs | 0, revives: q.revives | 0, score: q.score | 0 }; } bcast({ t: 'score', players: sc, ts: MP.teamScore }); }
function mpZDied(e, killer, head) {
  const by = killer === PLAYER_T ? MP.myId : (e.mpAttacker || ''), pts = e.T.score + (head ? Math.round(e.T.score * 0.5) : 0), msg = { t: 'zdie', id: e.netId, by, head: !!head, pts, nm: e.T.name };
  const k = MP.players[by]; if (k) { k.kills++; k.score = (k.score | 0) + pts; } bcast(msg); handleZDie(msg); hostDeath0();
}
function handleZDie(d) {
  const mine = d.by === MP.myId, pts = num(d.pts) | 0;
  if (mine) { game.kills++; if (d.head) game.heads++; statKill(!!d.head, 'ai'); game.score += pts; addCash(pts, d.head ? 'HEADSHOT' : ''); hitMarker(true, !!d.head); if (d.head) sfx.play('head'); }
  killFeed(mine ? 'You' : pname(d.by), mine ? '#ffd27a' : null, '', !!d.head, String(d.nm || 'Hostile').slice(0, 20) + (mine ? '  +' + pts : ''), null, mine);
}
function handleWave(d) {
  const ph = d.ph === 'inter' ? 'inter' : 'wave', was = MP.lastPh || 'inter'; MP.lastPh = ph; game.wave = num(d.w) | 0; game.interT = num(d.it); MP.zLeft = num(d.left) | 0;
  if (!MP.isHost) game.phase = ph;
  if (ph === 'inter' && was === 'wave' && game.wave > 0) { // wave cleared: rewards, revive the downed, bring back the fallen
    if (!MP.isHost) { addCash(500 + 100 * game.wave, 'WAVE BONUS'); showMsg('WAVE ' + game.wave + ' CLEARED', '+25 HP · +1 GRENADE · 20s to visit an armory', 3); sfx.play('clear'); player.hp = Math.min(player.maxHp, player.hp + 25); if (player.grenades < 4) player.grenades++; }
    if (player.downed) { player.downed = false; player.hp = Math.round(player.maxHp * 0.5); }
    if (!player.alive) { mpRespawn(); showHint('BACK IN THE FIGHT', '#9cff8a'); }
  }
  if (ph === 'wave' && was === 'inter' && !MP.isHost) showMsg('WAVE ' + game.wave, 'Hold the line', 2.5);
}
function goDown() {
  player.downed = true; player.hp = 1; player.bleedT = 30; player.sprinting = false; MP.beingRev = null; sfx.play('fallhurt'); rumble(0.8, 0.8, 300);
  const pi = carry[1]; if (pi !== undefined && wst.cur !== pi) switchTo(pi); netSend({ t: 'down' }); showMsg('YOU ARE DOWN', 'Stay alive — a teammate can revive you', 2.5);
}
function coopTick(dt) { // runs on every client in co-op
  if (player.downed) { player.bleedT -= dt; player.crouch = 1; if (player.bleedT <= 0) { player.downed = false; player.hp = 0; die(); } }
  const rv = $('revive'); let txt = '';
  if (player.downed) { const br = MP.beingRev && game.time - MP.beingRev.t < 0.4 ? MP.beingRev : null; txt = br ? `<b>BEING REVIVED BY ${esc(pname(br.by)).toUpperCase()}</b>${ring(br.p, '#9cff8a')}` : `<b>DOWN — ${Math.ceil(player.bleedT)}s</b><small>Crawl to cover. A teammate can revive you.</small>${ring(player.bleedT / 30, '#ff6b5a')}`; }
  else if (player.alive) { // reviving someone: stand over them and hold the interact button
    let tgt = null, bd = 1.9; for (const r of remoteList) if (r.downed && !r.dead && !r.isEnemyNpc) { const d = Math.hypot(r.pos.x - player.pos.x, r.pos.z - player.pos.z); if (d < bd) { bd = d; tgt = r; } }
    const hold = !!(keys.KeyF || (gp.held && gp.held[2]));
    if (tgt && hold) { MP.revT = (MP.revT || 0) + dt; MP.revSendT = (MP.revSendT || 0) - dt; if (MP.revSendT <= 0) { MP.revSendT = 0.1; netSend({ t: 'rvp', to: tgt.id, p: Math.min(1, MP.revT / 3) }); }
      txt = `<b>REVIVING ${esc(tgt.name).toUpperCase()}</b>${ring(MP.revT / 3, '#9cff8a')}`; if (MP.revT >= 3) { netSend({ t: 'revive', to: tgt.id }); tgt.downed = false; MP.revT = 0; addCash(250, 'REVIVE'); sfx.play('clear'); } }
    else { MP.revT = 0; if (tgt) txt = `<small><kbd>F</kbd> / <kbd>X</kbd> HOLD TO REVIVE ${esc(tgt.name).toUpperCase()}</small>`; }
  }
  player.revK = damp(player.revK || 0, MP.revT > 0 ? 1 : 0, 8, dt); player.dnK = damp(player.dnK || 0, player.downed ? 1 : 0, player.downed ? 6 : 2.2, dt); // smooth fall / get-up and crouch-over-teammate
  if (rv) { rv.innerHTML = txt; rv.style.opacity = txt ? 1 : 0; }
  $('hud').classList.toggle('downed', !!player.downed);
}
function ring(k, col) { const a = clamp(k, 0, 1) * 360; return `<i class="rring" style="background:conic-gradient(${col} ${a}deg, rgba(255,255,255,.12) ${a}deg)"></i>`; }
function hostCoopTick(dt) {
  updateWaves(dt); MP.waveT = (MP.waveT || 0) - dt;
  if (MP.waveT <= 0) { MP.waveT = 0.5; const msg = { t: 'wave', w: game.wave, ph: game.phase, it: Math.round(game.interT * 10) / 10, left: enemies.filter(e => !e.dead && e.netId).length + game.queue.length }; bcast(msg); handleWave(msg);
    const humans = [{ out: !player.alive || player.downed }].concat(remoteList.filter(r => !r.isEnemyNpc).map(r => ({ out: r.dead || r.downed }))); // everyone down: overrun
    if (game.phase !== 'inter' && humans.every(h => h.out)) { MP.allOutT = (MP.allOutT || 0) + 0.5; if (MP.allOutT >= 1.5) hostEndMatch('Overrun on wave ' + game.wave); } else MP.allOutT = 0; }
}
function mpBotDefs(n) { // fill the lobby's bot slots (kept in MP.players so scores, feeds and remotes just work)
  for (const id of Object.keys(MP.players)) if (MP.players[id].bot) delete MP.players[id];
  for (let i = 0; i < n && Object.keys(MP.players).length < 8; i++) { const pr = botProfile(i + 3); MP.players['bot-' + i] = { name: pr.name, cls: pr.cls, kills: 0, deaths: 0, color: (i + 4) % PCOLORS.length, bot: true, ping: 0, weapon: pr.T.weapon }; }
}
function mpSpawnBot(id) {
  const p = MP.players[id]; if (!p) return; const pr = botProfile(+id.slice(4) + 3); pr.T.weapon = p.weapon || pr.T.weapon; pr.T.name = p.name;
  const avoid = [player.pos].concat(remoteList.filter(r => !r.dead).map(r => r.pos), enemies.filter(e => !e.dead).map(e => e.pos)), [x, , z] = dmSpawnPoint(avoid);
  const k = world.nav.nearestFree(x + rand(-2, 2), z + rand(-2, 2), 6), [cx, cz] = k >= 0 ? world.nav.center(k) : [x, z];
  const e = new Enemy('bot', cx, cz, 1, { T: pr.T, name: p.name, sash: MP.mode === 'tdm' && p.team >= 0 ? TEAMC[p.team] : PCOLORS[p.color % PCOLORS.length], y: 0, faction: MP.mode === 'tdm' && p.team >= 0 ? p.team : hashStr(p.name || id) & 1 }); e.netId = id; e.protT = game.time + 2.5; e.team = MP.mode === 'tdm' && p.team >= 0 ? p.team : -1; e.bot = true; e.q = 0; enemies.push(e);
}
function mpBotDied(e, killer, head) {
  const by = killer === PLAYER_T ? MP.myId : killer && killer.netId ? killer.netId : (e.mpAttacker || e.netId);
  const msg = { t: 'die', id: e.netId, by, head: !!head, w: game.ksKind || (game.nadeDmg ? 'nade' : killer === PLAYER_T ? WEAPONS[wst.cur].id : killer && killer.W ? killer.W.id : (e.mpAttacker ? 'rifle' : '')) };
  bcast(msg); hostDeath(msg); handleGame(msg); (MP.botRespawn || (MP.botRespawn = [])).push({ id: e.netId, t: 3.5 });
}
function mpBotsTick(dt) { // host: stream bot positions, respawn the fallen
  MP.botSendT = (MP.botSendT || 0) - dt;
  if (MP.botSendT <= 0) { MP.botSendT = 1 / 20; for (const e of enemies) if (e.netId && !(e.dead && e.deadT > 3)) bcast({ t: 'st', id: e.netId, tp: e.etype, ad: e.visible && e.target ? 1 : 0, p: v3a(e.pos), yaw: Math.round((e.yaw + Math.PI) * 1000) / 1000, pt: Math.round((e.aimPitch || 0) * 100) / 100, h: Math.round(e.h / 1.82 / e.s * 1.75 * 100) / 100, alive: !e.dead, w: e.W.id, q: ++e.q }, null, true); }
  if (MP.botRespawn) for (let i = MP.botRespawn.length - 1; i >= 0; i--) { const r = MP.botRespawn[i]; r.t -= dt; if (r.t <= 0) { MP.botRespawn.splice(i, 1); if (MP.players[r.id] && !enemies.some(e => e.netId === r.id && !e.dead)) mpSpawnBot(r.id); } }
}
function hostPick(from, k) {
  k = num(k, -1) | 0; const p = pickups[k];
  if (!MP.active || !p || !p.active) return;
  const msg = { t: 'picked', k, by: from }; bcast(msg); handlePicked(msg);
}
function handlePicked(d) {
  const p = pickups[num(d.k, -1) | 0]; if (!p) return;
  p.active = false; p.timer = 22; p.mesh.visible = false;
  if (d.by === MP.myId) { p.apply(true); sfx.play('pickup'); }
  if (MP.pickPending === d.k) MP.pickPending = -1;
}
// ---- remote players
function makeNameTag(name, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.font = 'bold 34px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(name, 128, 32);
  g.fillStyle = '#' + new THREE.Color(color).getHexString(); g.fillText(name, 128, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.scale.set(1.6, 0.4, 1); sp.position.y = 2.25; return sp;
}
class Remote {
  constructor(id, info) {
    this.id = id; this.name = info.name; const color = MP.mode === 'tdm' && (info.team === 0 || info.team === 1) ? TEAMC[info.team] : PCOLORS[info.color % PCOLORS.length];
    const C = CLASSES[info.cls] || CLASSES.assault; this.cls = C;
    Object.assign(this, makeCharacter(info.model || C.model, { sash: color, weapon: 'rifle', faction: info.model ? 1 : MP.mode === 'tdm' && info.team >= 0 ? info.team : hashStr(info.name || '') & 1, seed: (info.name || '') + (info.tag || ''), byClass: !info.model && !info.bot })); this.isRemote = true; this.isEnemyNpc = !!info.model;
    this.baseColor = this.bodyMat.color.getHex();
    this.s = CHAR[C.model].scale; this.h = 1.82 * this.s; this.pos = new V3(0, -50, 0); this.dead = true; this.snaps = []; this.yaw = 0; this.walk = 0;
    this.flashT = 0; this.mflash = 0; this.lastFired = -99; this.deadT = 0;
    this.tag = makeNameTag(this.name, color); this.group.add(this.tag);
    this.group.visible = false; world.group.add(this.group);
  }
  push(d) {
    const p = arrV3(d.p); if (!p) return;
    const q = num(d.q, 0); if (q && q <= (this.lastQ || 0)) return; this.lastQ = q; // unordered channel + mesh/relay duplicates
    const now = performance.now();
    if (this.lastArr) { const iv = Math.min(now - this.lastArr, 500); this.ivAvg = lerp(this.ivAvg || 33, iv, 0.1); this.jit = lerp(this.jit || 5, Math.abs(iv - this.ivAvg), 0.1); }
    this.lastArr = now;
    this.delay = clamp((this.ivAvg || 33) + (this.jit || 5) * 2.5 + 8, 40, 220); // just enough buffer to hide this connection's jitter
    this.lastAd = clamp(num(d.ad, 0), 0, 1); if (typeof d.at === 'string') this.att = attDecode(d.at); this.lastSl = d.sl ? 1 : 0; this.lastH = clamp(num(d.h, 1.75), 1, 1.8);
    this.snaps.push({ w: typeof d.w === 'string' ? d.w : this.weaponId, pitch: clamp(num(d.pt), -1.5, 1.5), t: now, x: p.x, y: p.y, z: p.z, yaw: num(d.yaw), h: clamp(num(d.h, 1.75), 1, 1.8), alive: !!d.alive, dn: !!d.dn });
    if (this.snaps.length > 40) this.snaps.shift();
  }
  update(dt) {
    const n = this.snaps.length; if (!n) return;
    const rt = performance.now() - (this.delay || 80); let a = this.snaps[n - 1], b = a, k = 0;
    if (n > 1 && rt > this.snaps[n - 1].t) { a = this.snaps[n - 2]; b = this.snaps[n - 1]; k = 1 + Math.min(rt - b.t, 100) / Math.max(1, b.t - a.t); k = Math.min(k, 1.5); } // brief extrapolation if a packet is late
    else for (let i = n - 1; i > 0; i--) if (this.snaps[i - 1].t <= rt) { a = this.snaps[i - 1]; b = this.snaps[i]; k = clamp((rt - a.t) / Math.max(1, b.t - a.t), 0, 1); break; }
    const px = this.pos.x, pz = this.pos.z;
    if (Math.hypot(b.x - a.x, b.z - a.z) > 6) k = 1; // teleport (respawn) — don't interpolate across the map
    this.pos.set(lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.z, b.z, k));
    this.yaw = a.yaw + angDiff(a.yaw, b.yaw) * Math.min(k, 1); this.h = (b.h / 1.75) * 1.82 * this.s;
    const alive = b.alive;
    if (alive && this.dead) { this.dead = false; this.group.rotation.x = 0; this.bodyMat.color.setHex(this.baseColor); }
    if (!alive && !this.dead) { this.dead = true; this.deadT = 0; this.fallDir = Math.random() < 0.5 ? 1 : -1; this.bodyMat.color.multiplyScalar(0.5); }
    this.group.visible = alive || this.deadT < 2.5;
    if (this.dead) { this.deadT += dt; this.group.rotation.x = -this.fallDir * Math.min(1, this.deadT / 0.5) * 1.45; }
    else { this.downed = !!b.dn; this.dnK = damp(this.dnK || 0, this.downed ? 1 : 0, 5, dt); this.group.rotation.x = this.dnK * 1.2; if (this.downed) this.crouchK = 1; } // downed: on the ground, propped on an elbow
    const sp = Math.hypot(this.pos.x - px, this.pos.z - pz) / Math.max(dt, 1e-3);
    this.spS = lerp(this.spS || 0, Math.min(sp, 10), Math.min(1, dt * 8)); if (alive) footTick(this, dt, this.spS, b.h < 1.45, Math.abs(this.pos.y - (this.lastY === undefined ? this.pos.y : this.lastY)) < 0.08 || this.spS > 0, true, this.spS < 4 && !(this.lastAd > 0.5)); /* remotes don't send Alt: slow and not aiming reads as a quiet walk */ this.lastY = this.pos.y;
    if (b.w && b.w !== this.weaponId && widx(b.w) >= 0) setCharWeapon(this, b.w);
    this.sliding = !!this.lastSl && alive; animChar(this, dt, Math.min(sp, 9), b.pitch || 0);
    if (this.skinned) { this.crouchK = clamp((1.82 * this.s - this.h) / (0.65 * this.s), 0, 1); this.inner.scale.y = this.s; } else this.inner.scale.y = this.s * clamp(this.h / (1.82 * this.s), 0.55, 1); flapWings(this, game.time);
    this.group.position.copy(this.pos); this.group.rotation.y = this.yaw + Math.PI; // remote yaw is camera yaw (faces -z)
    this.tag.visible = alive; this.tag.position.y = this.h + 0.45;
    if (player.pulseT > 0 && alive) { const q = 0.35 + 0.25 * Math.sin(game.time * 6); this.bodyMat.emissive.setRGB(q, q * 0.6, 0); }
    else if (this.flashT > 0) { this.flashT -= dt; const f = Math.max(0, this.flashT / 0.12); this.bodyMat.emissive.setRGB(f, f, f); }
    else this.bodyMat.emissive.setRGB(0, 0, 0);
    if (this.mflash > 0) { this.mflash -= dt; this.flash.visible = this.mflash > 0; } else this.flash.visible = false;
  }
  damage(d, head, impulse, attacker) {
    if (this.dead) return false;
    if (attacker && attacker.netId) { netSend({ t: 'hit', to: this.id, dmg: Math.round(d), head: !!head, w: attacker.W ? attacker.W.id : 'rifle', by: attacker.netId }); return false; }
    netSend({ t: 'hit', to: this.id, dmg: Math.round(d), head: !!head, w: game.nadeDmg ? 'nade' : WEAPONS[wst.cur].id }); this.flashT = 0.12;
    if (!this.vT || game.time - this.vT > 0.45) { this.vT = game.time; const sp = spatial(this.pos); sfx.voice('pain', { pos: sp.pos, vol: sp.vol * 1.6, pitch: 95 + (hashStr(String(this.id)) % 60) }); } return false;
  }
}
function clearRemotes() { for (const r of remotes.values()) if (world) world.group.remove(r.group); remotes.clear(); remoteList = []; }
function removeRemote(id) { const r = remotes.get(id); if (r && world) world.group.remove(r.group); remotes.delete(id); remoteList = [...remotes.values()]; }
// ---- match flow
function mpSpawnPoint() { if (MP.mode === 'tdm') { const my = mpTeamOf(PLAYER_T), ts = world.L.teamSpawns, foes = remoteList.filter(r => !r.dead && mpTeamOf(r) !== my).map(r => r.pos), mates = remoteList.filter(r => !r.dead && mpTeamOf(r) === my).map(r => r.pos); if (ts && ts[my]) return pickSpawn(foes, mates, ts[my]); return pickSpawn(foes, mates, null); } return pickSpawn(remoteList.filter(r => !r.dead).map(r => r.pos), null, null); }
function mpSpawnPointOld() {
  const L = world.L, cands = L.enemySpawns.map(([x, z]) => [x, TH(x, z) + 0.05, z]).concat([[L.spawn.x, L.spawn.y + 0.05, L.spawn.z]]);
  let best = cands[0], bs = -1;
  for (const c of cands) {
    let md = 1e9; for (const r of remoteList) if (!r.dead) md = Math.min(md, Math.hypot(r.pos.x - c[0], r.pos.z - c[2]));
    const sc = Math.min(md, 60) + rand(0, 8); if (sc > bs) { bs = sc; best = c; }
  }
  return best;
}
function mpRespawn() { if (game.potg && game.potg.killcam) endPotg(); game.killcamQ = null; ng.on = false; ng.cook = -1; ng.throwT = 0; applyPendingClass();
  const C = cls(), [x, y, z] = mpSpawnPoint();
  const HP0 = Math.round(C.hp * hpMul()); Object.assign(player, { maxHp: HP0, hp: HP0, regenCap: HP0, alive: true, grenades: C.nades, tacticals: 2, shield: 0, shieldT: 0, stimT: 0, crouch: 0, sliding: false, h: 1.75, onGround: false, stepSmooth: 0, pitch: 0, protT: game.time + 2.5, lastDmgT: 99 });
  player.pos.set(x, y, z); player.vel.set(0, 0, 0); player.yaw = Math.atan2(x, z); // face the map centre
  inv = WEAPONS.map(w => ({ mag: w.mag, res: w.res })); setGloves();
  wst.cur = carry[0]; wst.reloading = false; wst.switchT = 0.3; vmModels.forEach((m, i) => m.g.visible = i === wst.cur);
  MP.lastAttacker = null; game.deadT = 0;
}
function hostStartMatch() {
  if (!MP.isHost || Object.keys(MP.players).length < 2) return;
  for (const id in MP.players) { MP.players[id].kills = 0; MP.players[id].deaths = 0; }
  mpAssignTeams(); const msg = { t: 'start', map: MP.map, limit: MP.limit, time: MP.time, hp: MP.health || settings.health, players: MP.players, hostId: MP.myId, mode: MP.mode || 'ffa' };
  bcast(msg); startMatch(msg);
}
function startMatch(d) { if (!d._ld) { d._ld = 1; return deploy('MULTIPLAYER · ' + Object.keys(MP.players || {}).length + ' PLAYERS', () => startMatch(d), clamp(num(d.map, 0), 0, MAPS.length - 1) | 0); }
  sfx.init(); music.stop(); MP.ending = false; if (!MP.isHost && typeof d.hostId === 'string') MP.hostId = d.hostId; if (game.potg) endPotg();
  MP.mode = ['ffa', 'tdm', 'surv'].includes(d.mode) ? d.mode : 'ffa'; MP.teamScore = [0, 0]; setTimeout(potgReset, 0);
  if (d.players && typeof d.players === 'object') for (const id in d.players) if (MP.players[id] && (d.players[id].team === 0 || d.players[id].team === 1)) MP.players[id].team = d.players[id].team;
  MP.map = clamp(num(d.map) | 0, 0, MAPS.length - 1); MP.limit = clamp(num(d.limit, 20) | 0, 1, 200); MP.time = clamp(num(d.time, 480) | 0, 60, 3600); MP.health = HEALTH[d.hp] ? d.hp : 'core';
  for (const id in MP.players) { MP.players[id].kills = 0; MP.players[id].deaths = 0; }
  if (!world || world.def !== MAPS[MP.map]) { loadMap(MP.map); world.shadows = QUALITY[settings.quality].shadows; }
  resetRun(); clearRemotes();
  game.mode = MP.mode === 'surv' ? 'survival' : 'dm'; game.phase = MP.mode === 'surv' ? 'inter' : 'dm'; MP.active = true; player.downed = false; MP.beingRev = null; MP.zSeq = 0; MP.zLeft = 0; MP.lastPh = 'inter'; MP.matchT = MP.time; MP.pickPending = -1;
  for (const b of barrels) { b.box.dead = true; b.mesh.visible = false; b.respawn = 1e9; }
  for (const id in MP.players) if (id !== MP.myId && !(MP.isHost && MP.players[id].bot)) remotes.set(id, new Remote(id, MP.players[id]));
  if (MP.mode === 'surv') { Object.assign(game, { wave: 0, queue: [], spawnT: 0, interT: 12, phase: 'inter', score: 0 }); survivalStart(); MP.matchT = 1e9; for (const id in MP.players) Object.assign(MP.players[id], { downs: 0, revives: 0, score: 0 }); }
  MP.botRespawn = []; MP.botDeaths = 0; if (MP.isHost) for (const id in MP.players) if (MP.players[id].bot) mpSpawnBot(id);
  remoteList = [...remotes.values()];
  if (!MP.isHost) connectMesh();
  mpRespawn(); hudCache = {};
  game.state = 'play'; showScreen(null); camera.fov = settings.fov; requestLock(); $('ping').style.display = 'block';
  startIntro('MULTIPLAYER DEATHMATCH', `First to ${MP.limit} kills`); if (!game.intro) showMsg('DEATHMATCH', `FIRST TO ${MP.limit} KILLS`, 3); sfx.play('wave');
}
function hostEndMatch(why) {
  if (!MP.isHost || !MP.active || MP.ending) return; MP.ending = true;
  const msg = { t: 'end', why, players: MP.players }; bcast(msg); endMatch(msg);
}
function endMatch(d) {
  if (!MP.active || game.outro) return; const ps = d.players && typeof d.players === 'object' ? d.players : MP.players;
  const top = Object.entries(ps).sort((a, b) => (num(b[1].kills) - num(a[1].kills)))[0];
  if (MP.mode === 'tdm') { const [b, r] = MP.teamScore || [0, 0], my = mpTeamOf(PLAYER_T); return startOutro(b === r ? 'draw' : (b > r ? 0 : 1) === my ? 'win' : 'loss', d.why ? String(d.why).slice(0, 80) : '', () => endMatchNow(d)); }
  startOutro(top && top[0] === MP.myId ? 'win' : 'loss', d.why ? String(d.why).slice(0, 80) : '', () => endMatchNow(d));
}
function endMatchNow(d) {
  if (!MP.active) return;
  if (d.players && typeof d.players === 'object') for (const id in d.players) if (MP.players[id]) { MP.players[id].kills = num(d.players[id].kills) | 0; MP.players[id].deaths = num(d.players[id].deaths) | 0; }
  MP.active = false; $('ping').style.display = 'none'; clearRemotes(); grenades.forEach(g => fx.remove(g.mesh)); grenades = [];
  game.state = 'mpover'; if (document.pointerLockElement) document.exitPointerLock();
  const rows = Object.entries(MP.players).sort((a, b) => b[1].kills - a[1].kills || a[1].deaths - b[1].deaths);
  const tdm = MP.mode === 'tdm', [tb, tr] = MP.teamScore || [0, 0], myT = mpTeamOf(PLAYER_T), tRes = tb === tr ? 'draw' : (tb > tr ? 0 : 1) === myT ? 'win' : 'loss';
  const sv = MP.mode === 'surv'; if (sv) rows.sort((a, b) => (b[1].score | 0) - (a[1].score | 0));
  $('mpWinner').textContent = sv ? `SURVIVED ${Math.max(0, game.wave - 1)} WAVE${game.wave === 2 ? '' : 'S'}` : tdm ? (tb === tr ? 'DRAW' : tb > tr ? 'COALITION VICTORY' : 'REPUBLICAN GUARD VICTORY') : rows.length ? `${rows[0][1].name} WINS` : 'MATCH OVER';
  $('mpWhy').textContent = d.why ? String(d.why).slice(0, 80) : '';
  if (tdm) $('mpWhy').textContent = (d.why ? String(d.why).slice(0, 60) + ' · ' : '') + `Coalition ${tb} – ${tr} Rep. Guard`;
  $('mpBoard').innerHTML = scoreTable(rows) + `<div class="mysum">${statEnd(sv ? 'SURVIVAL' : 'MULTIPLAYER', sv ? 'run' : tdm ? tRes : rows.length && rows[0][0] === MP.myId ? 'win' : 'loss', Math.max(0, (MP.players[MP.myId] ? MP.players[MP.myId].deaths : 0) - (MP.botDeaths || 0)))}</div>`;
  showScreen('mpover');
}
function scoreTable(rows) {
  const hostId = MP.isHost ? MP.myId : MP.hostId;
  if (MP.mode === 'surv') return `<table class="sb"><tr><th>#</th><th>PLAYER</th><th>KILLS</th><th>DOWNS</th><th>REVIVES</th><th>SCORE</th><th>PING</th></tr>` + rows.map(([id, p], i) => `<tr class="${id === MP.myId ? 'me' : ''}"><td>${i + 1}</td><td>${esc(p.name)}</td><td>${p.kills | 0}</td><td>${p.downs | 0}</td><td>${p.revives | 0}</td><td>${p.score | 0}</td><td>${pingHtml(id, hostId)}</td></tr>`).join('') + '</table>';
  return `<table class="sb"><tr><th>#</th><th>PLAYER</th><th>CLASS</th><th>K</th><th>D</th><th>PING</th></tr>` + rows.map(([id, p], i) =>
    `<tr class="${id === MP.myId ? 'me' : ''}"><td>${i + 1}</td><td><i style="background:#${new THREE.Color(MP.mode === 'tdm' && p.team >= 0 ? TEAMC[p.team] : PCOLORS[p.color % PCOLORS.length]).getHexString()}"></i>${esc(p.name)}${p.bot ? ' <em class="botb">BOT</em>' : ''}</td><td>${esc(CLASSES[p.cls] ? CLASSES[p.cls].name : '')}</td><td>${p.kills}</td><td>${p.deaths}</td><td>${pingHtml(id, hostId)}</td></tr>`).join('') + '</table>';
}
function pingHtml(id, hostId) {
  if (id === hostId) return '<span class="pg g">host</span>';
  const p = MP.players[id] ? MP.players[id].ping | 0 : 0; if (!p) return '<span class="pg">…</span>';
  return `<span class="pg ${p < 80 ? 'g' : p < 160 ? 'y' : 'r'}">${p} ms</span>`;
}
function updateMP(dt) {
  const me = MP.players[MP.myId];
  setText('ping', MP.isHost ? 'HOST · 0 ms' : me && me.ping ? 'PING ' + (me.ping | 0) + ' ms' : 'PING …');
  const pc = MP.isHost || !me ? 'g' : me.ping < 80 ? 'g' : me.ping < 160 ? 'y' : 'r';
  if (hudCache.pc !== pc) { hudCache.pc = pc; $('ping').className = 'pg ' + pc; }
  for (const r of remoteList) r.update(dt);
  if (MP.isHost) mpBotsTick(dt); if (MP.mode === 'surv') { if (MP.isHost) hostCoopTick(dt); coopTick(dt); for (const r of remoteList) if (r.isEnemyNpc && r.dead && r.deadT > 4) removeRemote(r.id); }
  MP.sendT -= dt;
  if (MP.sendT <= 0) {
    MP.sendT = 1 / 30;
    netSend({ t: 'st', p: v3a(player.pos), yaw: Math.round(player.yaw * 1000) / 1000, pt: Math.round(player.pitch * 100) / 100, h: Math.round(player.h * 100) / 100, alive: player.alive, w: WEAPONS[wst.cur].id, dn: player.downed ? 1 : 0, ad: Math.round(wst.ads * 10) / 10, sl: player.sliding ? 1 : 0, at: attCode(settings.att[WEAPONS[wst.cur].id]) });
  }
  if (!player.alive) { MP.respawnT -= dt; game.deadT = (game.deadT || 0) + dt; if (MP.respawnT <= 0 && MP.mode !== 'surv') mpRespawn(); }
  MP.matchT -= dt;
  if (MP.isHost && MP.matchT <= 0) hostEndMatch('Time limit reached');
}
function mpDie() {
  ksReset(); if (SURV.tgt) supportCancel();
  player.alive = false; sfx.voice('death', { self: true, pitch: settings.vpitch || 120, vol: 0.8 }); MP.respawnT = 3.5; game.deadT = 0; mouseL = mouseR = false; wst.reloading = false;
  const by = MP.lastAttacker && game.time - MP.lastAttackT < 8 ? MP.lastAttacker : MP.myId;
  if (MP.players[by] && MP.players[by].bot) MP.botDeaths = (MP.botDeaths || 0) + 1;
  netSend({ t: 'die', by, head: MP.lastHead, w: by === MP.myId ? '' : MP.lastWeapon || '' });
  showMsg('ELIMINATED', by === MP.myId ? 'Respawning…' : 'by ' + pname(by), 3); if (by !== MP.myId) { const ke = enemies.find(e => e.netId === by); potgKillcam(ke ? ke._pid : 'r' + by); }
}
// ---- lobby UI
function openMpScreen() {
  sfx.init(); $('mpname').value = settings.name; showScreen('mp');
  if (!MP.peer) { mpView('join'); const j = new URLSearchParams(location.search).get('join'); if (j && !$('mpcode').value) $('mpcode').value = j.toUpperCase().slice(0, 5); refreshPublic(); }
  else { mpView('lobby'); renderLobby(); }
}
function renderLobby() {
  if (!MP.peer) return;
  $('mpCodeTxt').textContent = MP.code;
  const ids = Object.keys(MP.players), hostId = MP.isHost ? MP.myId : MP.hostId;
  $('mpCount').textContent = ids.length;
  $('mpPlayers').innerHTML = ids.map(id => { const p = MP.players[id]; return `<div class="pl"><i style="background:#${new THREE.Color(MP.mode === 'tdm' && p.team >= 0 ? TEAMC[p.team] : PCOLORS[p.color % PCOLORS.length]).getHexString()}"></i><b>${esc(p.name)}${p.tag ? `<em class="ptag">#${p.tag}</em>` : ''}</b><span>${esc(CLASSES[p.cls] ? CLASSES[p.cls].name : '')}</span>${p.bot ? '<em class="botb">BOT</em>' : ''}<span class="png">${pingHtml(id, hostId)}</span>${id === hostId ? '<em>HOST</em>' : ''}${id === MP.myId ? '<em class="you">YOU</em>' : ''}</div>`; }).join('');
  $('mpHostCtl').style.display = MP.isHost ? 'grid' : 'none';
  const MN = { ffa: 'FREE-FOR-ALL', tdm: 'TEAM DEATHMATCH', surv: 'SURVIVAL CO-OP' }[MP.mode || 'ffa'];
  $('mpInfo').textContent = MP.mode === 'surv' ? `${MN} · ${MAPS[MP.map].name} · hold out together` : `${MN} · ${MAPS[MP.map].name} · ${MP.mode === 'tdm' ? 'team ' : ''}first to ${MP.limit} kills · ${Math.round(MP.time / 60)} min`;
  if ($('mpMode') && MP.isHost) { $('mpMode').value = MP.mode || 'ffa'; const sv = MP.mode === 'surv'; for (const id of ['mpBots', 'mpLimit', 'mpTime']) { const el = $(id); if (el && el.closest('label')) el.closest('label').style.display = sv ? 'none' : ''; } }
  const can = ids.length >= 2;
  $('mpStart').style.display = MP.isHost ? 'block' : 'none';
  $('mpStart').disabled = !can; $('mpStart').textContent = can ? 'START MATCH' : 'WAITING FOR PLAYERS (1/2)';
  $('mpWait').style.display = MP.isHost ? 'none' : 'block';
}
function initMpUI() {
  const ms = $('mpMap'); MAPS.forEach((m, i) => { const o = document.createElement('option'); o.value = i; o.textContent = m.name; ms.appendChild(o); });
  ms.onchange = () => { MP.map = +ms.value; broadcastLobby(); };
  $('mpLimit').onchange = () => { MP.limit = +$('mpLimit').value; broadcastLobby(); };
  $('mpTime').onchange = () => { MP.time = +$('mpTime').value; broadcastLobby(); };
  if ($('mpHealth')) { $('mpHealth').value = settings.health; MP.health = settings.health; $('mpHealth').onchange = () => { MP.health = $('mpHealth').value; broadcastLobby(); }; }
  $('mpname').onchange = () => { settings.name = cleanName($('mpname').value); $('mpname').value = settings.name; saveSettings(); sendInfo(); };
  $('mpHost').onclick = () => { settings.name = cleanName($('mpname').value); saveSettings(); hostLobby(false, 0); };
  $('mpHostPub').onclick = () => { settings.name = cleanName($('mpname').value); saveSettings(); hostLobby(true, 3); };
  $('mpQuick').onclick = quickPlay; $('mpRefresh').onclick = () => refreshPublic();
  $('mpMode').onchange = () => { MP.mode = $('mpMode').value; if (MP.mode === 'surv') { MP.botN = 0; mpBotDefs(0); } broadcastLobby(); };
  $('mpBots').onchange = () => { MP.botN = +$('mpBots').value; mpBotDefs(MP.botN); broadcastLobby(); };
  $('mpPublic').onchange = () => { MP.public = $('mpPublic').value === '1'; if (MP.public) pubBeaconStart(); else pubBeaconStop(); };
  $('mpJoinBtn').onclick = () => { settings.name = cleanName($('mpname').value); saveSettings(); joinLobby($('mpcode').value); };
  $('mpcode').onkeydown = e => { if (e.key === 'Enter') $('mpJoinBtn').click(); };
  $('mpStart').onclick = hostStartMatch;
  $('mpLeave').onclick = leaveLobby;
  $('mpBack').onclick = () => { showScreen('menu'); };
  $('mpCopy').onclick = () => {
    const url = location.origin + location.pathname + '?join=' + MP.code;
    const done = () => { $('mpCopy').textContent = 'Link copied!'; setTimeout(() => $('mpCopy').textContent = 'Copy invite link', 1500); };
    try { navigator.clipboard.writeText(url).then(done, () => prompt('Invite link:', url)); } catch (e) { prompt('Invite link:', url); }
  };
  $('mpToLobby').onclick = () => { if (game.mode === 'botdm') { $('mpToLobby').textContent = 'BACK TO LOBBY'; game.mode = 'survival'; return toMenu(); } game.state = 'menu'; openMpScreen(); if (!MP.peer) setMpStatus('Lobby closed.', true); };
  if (new URLSearchParams(location.search).get('join')) openMpScreen();
  $('onlinechip').onclick = () => { $('onlinepanel').classList.toggle('on'); refreshOnline(); };
  setTimeout(() => { presenceStart(); setTimeout(refreshOnline, 2500); }, 1500); setInterval(() => { if (game.state === 'menu' && document.visibilityState === 'visible') refreshOnline(); }, 45000);
}
// ---- public matches: a hosting player also claims one of a few well-known 'beacon' ids; browsers probe them all
const PUB_SLOTS = 16;
function pubBeaconStart() {
  if (MP.beacon || !MP.isHost) return; let slot = 0;
  const tryS = () => { if (!MP.isHost || !MP.public || MP.beacon || slot >= PUB_SLOTS) return; const b = new Peer(PREFIX + 'pub-' + slot, peerOpts());
    b.on('open', () => { if (!MP.isHost || !MP.public) { try { b.destroy(); } catch (e) {} return; } MP.beacon = b; });
    b.on('error', e => { if (e.type === 'unavailable-id') { try { b.destroy(); } catch (x) {} slot++; tryS(); } });
    b.on('connection', c => { c.on('open', () => { const ids = Object.keys(MP.players), humans = ids.filter(i => !MP.players[i].bot).length;
      try { c.send({ t: 'pub', code: MP.code, host: cleanName(settings.name), humans, bots: ids.length - humans, max: 8, map: MP.map, active: !!MP.active, limit: MP.limit, mode: MP.mode || 'ffa' }); } catch (x) {} setTimeout(() => { try { c.close(); } catch (x) {} }, 1500); }); }); };
  tryS();
}
function pubBeaconStop() { try { if (MP.beacon) MP.beacon.destroy(); } catch (e) {} MP.beacon = null; }
function browsePublic(cb) {
  if (typeof Peer === 'undefined') return cb([]); const peer = new Peer(undefined, peerOpts()), found = new Map(); let done = false;
  const fin = () => { if (done) return; done = true; try { peer.destroy(); } catch (e) {} cb([...found.values()]); };
  peer.on('open', () => { for (let i = 0; i < PUB_SLOTS; i++) { const c = peer.connect(PREFIX + 'pub-' + i, { reliable: true }); c.on('data', d => { if (d && d.t === 'pub' && typeof d.code === 'string' && /^[A-Z0-9]{5}$/.test(d.code)) found.set(d.code, d); }); } setTimeout(fin, 3200); });
  peer.on('error', e => { if (e.type !== 'peer-unavailable') fin(); }); setTimeout(fin, 7000);
}
function renderPublic(list) {
  const el = $('mpPubList'); if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="pubempty">No public matches right now — QUICK PLAY will start one (with bots) that others can join.</div>'; return; }
  list.sort((a, b) => (a.active - b.active) || (b.humans - a.humans));
  el.innerHTML = list.map(L => { const full = L.humans >= 8, map = MAPS[clamp(num(L.map) | 0, 0, MAPS.length - 1)].name;
    return `<div class="pubrow"><b>${esc(cleanName(L.host))}'s match</b><small>${{ ffa: 'FFA', tdm: 'TDM', surv: 'SURVIVAL' }[L.mode] || 'FFA'} · ${esc(map)} · ${L.humans | 0} player${L.humans === 1 ? '' : 's'}${L.bots ? ' + ' + (L.bots | 0) + ' bots' : ''}${L.active ? ' · IN MATCH' : ''}</small><button class="btn2" data-code="${esc(L.code)}" ${L.active || full ? 'disabled' : ''}>${L.active ? 'PLAYING' : full ? 'FULL' : 'JOIN'}</button></div>`; }).join('');
  el.querySelectorAll('button[data-code]').forEach(b => b.onclick = () => { settings.name = cleanName($('mpname').value); saveSettings(); joinLobby(b.dataset.code); });
}
function refreshPublic(after) { const el = $('mpPubList'); if (el) el.innerHTML = '<div class="pubempty">Searching for public matches…</div>'; browsePublic(list => { renderPublic(list); MP.pubList = list; after && after(list); }); }
function quickPlay() {
  settings.name = cleanName($('mpname').value); saveSettings(); setMpStatus('Finding a match…');
  refreshPublic(list => { const open = list.filter(L => !L.active && L.humans < 8).sort((a, b) => b.humans - a.humans);
    if (open.length) joinLobby(open[0].code); else { setMpStatus('No open matches — starting a public one with bots…'); hostLobby(true, 3); } });
}
// ---- who's online: every open game claims a presence slot; the menu probes them (coarse location = timezone city only)
const PRES_SLOTS = 48, PRES = { peer: null, list: [], t: 0 };
const myPlace = () => { try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; const city = tz.split('/').pop().replace(/_/g, ' '); return city && city !== 'UTC' ? city : 'Unknown'; } catch (e) { return 'Unknown'; } };
function presenceStatus() { return MP.active ? (MP.mode === 'surv' ? 'In co-op survival' : MP.mode === 'tdm' ? 'In team deathmatch' : 'In free-for-all') : game.state === 'play' ? (game.mode === 'botdm' ? 'In a bot match' : 'In survival') : MP.peer ? 'In a lobby' : 'In the menu'; }
function presenceStart() {
  if (PRES.peer || typeof Peer === 'undefined' || settings.presence === false) return; let slot = Math.floor(Math.random() * PRES_SLOTS), tries = 0;
  const go = () => { if (tries++ >= PRES_SLOTS || settings.presence === false) return; const p = new Peer(PREFIX + 'on-' + slot, peerOpts());
    p.on('open', () => { PRES.peer = p; PRES.slot = slot; });
    p.on('error', e => { if (e.type === 'unavailable-id') { try { p.destroy(); } catch (x) {} slot = (slot + 1) % PRES_SLOTS; go(); } });
    p.on('connection', c => { c.on('open', () => { try { c.send({ t: 'here', place: myPlace(), st: presenceStatus() }); } catch (x) {} setTimeout(() => { try { c.close(); } catch (x) {} }, 1200); }); }); };
  go();
}
function presenceStop() { try { if (PRES.peer) PRES.peer.destroy(); } catch (e) {} PRES.peer = null; }
function presenceProbe(cb) {
  if (typeof Peer === 'undefined') return cb([]); const peer = new Peer(undefined, peerOpts()), found = []; let done = false;
  const fin = () => { if (done) return; done = true; try { peer.destroy(); } catch (e) {} cb(found); };
  let want = 0; const seen = new Set(), tick = id => { if (id) seen.add(id); if (seen.size >= want) fin(); };
  peer.on('open', () => { for (let i = 0; i < PRES_SLOTS; i++) { if (PRES.peer && i === PRES.slot) continue; want++; const c = peer.connect(PREFIX + 'on-' + i, { reliable: true }); c.on('data', d => { if (d && d.t === 'here' && !seen.has(c.peer)) { found.push({ place: cleanName(d.place).slice(0, 24) || 'Unknown', st: String(d.st || '').slice(0, 30) }); tick(c.peer); } }); } setTimeout(fin, 12000); });
  peer.on('error', e => { if (e.type !== 'peer-unavailable') return fin(); const m = /(breachpoint\S+)/.exec(String(e.message || '')); tick(m ? m[1] : null); }); setTimeout(fin, 15000); // done when every slot has answered or reported empty
}
function refreshOnline() {
  if (PRES.busy) { PRES.again = true; return; } PRES.busy = true;
  presenceProbe(list => { PRES.busy = false; if (PRES.again) { PRES.again = false; setTimeout(refreshOnline, 50); } const me = PRES.peer ? [{ place: myPlace() + ' (you)', st: presenceStatus(), me: true }] : []; PRES.list = me.concat(list); PRES.t = performance.now();
    const n = $('onlineN'); if (n) n.textContent = PRES.list.length || (settings.presence === false ? '—' : 1); renderOnline(); });
}
function renderOnline() {
  const el = $('onlinepanel'); if (!el) return; const by = {}; for (const p of PRES.list) { const k = p.place; (by[k] || (by[k] = [])).push(p); }
  el.innerHTML = `<h4>${PRES.list.length} PLAYER${PRES.list.length === 1 ? '' : 'S'} ONLINE</h4>` + Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `<div class="orow"><span>${esc(k)}${v.length > 1 ? ' ×' + v.length : ''}</span><small>${esc(v.map(x => x.st).filter((x, i, a) => a.indexOf(x) === i).join(' · '))}</small></div>`).join('') + `<p>Location is each player's timezone city — no IP lookups. Hide yourself in Settings → Audio.</p>`;
}
function sendInfo() {
  if (!MP.peer) return;
  if (MP.isHost) { const p = MP.players[MP.myId]; if (p) { p.name = cleanName(settings.name); p.tag = PROFILE.tag; p.cls = settings.cls; broadcastLobby(); } }
  else if (MP.host && MP.host.open) MP.host.send({ t: 'info', name: settings.name, tag: PROFILE.tag, cls: settings.cls });
}

