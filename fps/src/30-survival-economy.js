// ============================================================ SURVIVAL ECONOMY (MW3-style): start light, earn cash, buy at armories on the map
const SURV = { cash: 0, eq: {}, stations: [], open: null, sel: 0, markers: [], support: [], tgt: null };
const ARMORY = {
  weapons: { name: 'WEAPON ARMORY', col: 0xff8a3d, items: () => [['ammo', 'Refill ammo (all guns)', 300]].concat([['smg', 1000], ['mp5', 1200], ['ump', 1300], ['shotgun', 1200], ['rifle', 1500], ['ak', 1700], ['grau', 1800], ['p90', 1800], ['dmr', 2000], ['scar', 2300], ['autoshotgun', 2200], ['lmg', 2500], ['sniper', 2600], ['mg', 3000], ['revolver', 700], ['deagle', 900], ['rpg', 4000]].map(([id, c]) => ['w:' + id, (WEAPONS[widx(id)] || {}).name || id, c])) },
  equipment: { name: 'EQUIPMENT ARMORY', col: 0x52b8ff, items: () => [['e:frag', 'Frag grenades ×2', 400, 'Lethal · throw with G / RB'], ['e:semtex', 'Semtex ×2', 500, 'Lethal · sticks · G / RB'], ['e:molotov', 'Molotov ×2', 500, 'Lethal · fire zone · G / RB'], ['e:flash', 'Flashbangs ×2', 300, 'Tactical · blinds · Q / LB'], ['e:smoke', 'Smoke grenades ×2', 250, 'Tactical · cover · Q / LB'], ['armor', 'Armor plates (+75)', 750, 'Applied instantly · blue bar'], ['heal', 'Field medkit (full health)', 400, 'Applied instantly']] },
  support: { name: 'AIR SUPPORT', col: 0xff5a5a, items: () => [['air', 'Precision airstrike', 2500, 'Stored · press Z / D-pad right to aim, click / RT to call in'], ['air3', 'Carpet bombing run', 4500, 'Stored · Z / D-pad right · a long line of bombs']] },
};
const survOn = () => game.mode === 'survival' && world && SURV.stations.length;
const eqKind = slot => (game.mode === 'survival' && SURV.eq[slot]) || getLO()[slot];
function addCash(n, why) { SURV.cash = Math.max(0, SURV.cash + Math.round(n)); if (n > 0 && why) { const el = document.createElement('div'); el.className = 'xppop cashpop'; el.innerHTML = `<b>+$${Math.round(n)}</b> ${why}`; $('hud').appendChild(el); setTimeout(() => el.remove(), 1500); } }
function labelSprite(text, col) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'), hex = '#' + new THREE.Color(col).getHexString();
  g.fillStyle = 'rgba(8,10,14,0.78)'; g.beginPath(); g.roundRect ? g.roundRect(8, 16, 496, 96, 18) : g.rect(8, 16, 496, 96); g.fill(); g.strokeStyle = hex; g.lineWidth = 6; g.stroke();
  g.font = '800 46px Inter, Arial, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true })); sp.scale.set(2.6, 0.65, 1); return sp;
}
function placeArmories() {
  for (const st of SURV.stations) { world.group.remove(st.g); const i = world.boxes.indexOf(st.box); if (i >= 0) world.boxes.splice(i, 1); }
  SURV.stations = []; const nav = world.nav, sf = nav.safe || [], L = world.L, Rg = seeded(hashStr(world.def.name + 'armory')), S = L.spawn, picks = [];
  const open = (x, y, z) => { for (let a = 0; a < 8; a++) if (!nav.freeAt(x + Math.cos(a * 0.785) * 1.3, y, z + Math.sin(a * 0.785) * 1.3)) return false; return true; };
  for (const [kind, r0, r1] of [['weapons', 7, 16], ['equipment', 18, 34], ['support', 30, 55]]) {
    let best = null; for (let tries = 0; tries < 900 && !best; tries++) { const n = sf[Math.floor(Rg() * sf.length)]; if (n === undefined) break; const [x, y, z] = nav.nodePos(n), d = Math.hypot(x - S.x, z - S.z);
      if (d < r0 || d > r1 || y > TH(x, z) + 0.3 || !open(x, y, z) || picks.some(p => Math.hypot(p[0] - x, p[2] - z) < 14)) continue; best = [x, y, z]; }
    if (!best) { const [x, y, z] = nav.nodePos(sf[Math.floor(Rg() * sf.length)] || 0); best = [x, y, z]; } picks.push(best);
    const A = ARMORY[kind], [x, y, z] = best, g = new THREE.Group(); g.position.set(x, y, z); world.group.add(g);
    const crate = new THREE.Mesh(_gBox, MAT({ color: 0x3a4030, roughness: 0.8 })); crate.scale.set(1.5, 0.95, 0.85); crate.position.y = 0.475; crate.castShadow = true; g.add(crate);
    const lid = new THREE.Mesh(_gBox, MAT({ color: 0x2a2e26, roughness: 0.6 })); lid.scale.set(1.56, 0.08, 0.9); lid.position.y = 0.99; g.add(lid);
    const strip = new THREE.Mesh(_gBox, new THREE.MeshBasicMaterial({ color: A.col })); strip.scale.set(1.52, 0.07, 0.87); strip.position.y = 0.7; g.add(strip);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6, 1, true), new THREE.MeshBasicMaterial({ color: A.col, transparent: true, opacity: 0.25, depthWrite: false })); beam.position.y = 4; beam.userData.noAO = true; g.add(beam);
    const sp = labelSprite(A.name, A.col); sp.position.y = 2.1; g.add(sp);
    const box = { x0: x - 0.75, y0: y, z0: z - 0.43, x1: x + 0.75, y1: y + 1.03, z1: z + 0.43, m: 'metal' }; world.boxes.push(box);
    SURV.stations.push({ kind, x, y, z, g, box, sp, strip });
  }
  if (!SURV.markers.length) for (let i = 0; i < 3; i++) { const d = document.createElement('div'); d.className = 'armk'; $('hud').appendChild(d); SURV.markers.push(d); }
}
function nearStation() { if (!survOn() || !player.alive) return null; for (const st of SURV.stations) if (Math.hypot(st.x - player.pos.x, st.z - player.pos.z) < 2.3 && Math.abs(st.y - player.pos.y) < 1.6) return st; return null; }
function openBuy(st) { SURV.open = st; SURV.sel = 0; sfx.play('switch'); renderBuy(); }
function closeBuy() { SURV.open = null; const b = $('buymenu'); if (b) b.classList.remove('on'); }
function renderBuy() {
  let b = $('buymenu'); if (!b) { b = document.createElement('div'); b.id = 'buymenu'; $('hud').appendChild(b); }
  const st = SURV.open; if (!st) return b.classList.remove('on'); const A = ARMORY[st.kind], items = A.items();
  b.innerHTML = `<h4 style="border-color:#${new THREE.Color(A.col).getHexString()}">${A.name}<span>$${SURV.cash}</span></h4>` + items.map((it, i) => { const [id, name, cost] = it, owned = id.startsWith('w:') && carry.includes(widx(id.slice(2)));
    return `<div class="bi${i === SURV.sel ? ' on' : ''}${SURV.cash < cost ? ' poor' : ''}"><kbd>${i < 9 ? i + 1 : ''}</kbd><b>${esc(name)}${owned ? ' <em>OWNED</em>' : ''}${it[3] ? `<small class="how">${esc(it[3])}</small>` : ''}</b><i>$${cost}</i></div>`; }).join('') + `<small>1–9 or ↑↓ + Enter · D-pad + A · F / B to close</small>`;
  b.classList.add('on');
}
function buyItem(i) {
  const st = SURV.open; if (!st) return; const it = ARMORY[st.kind].items()[i]; if (!it) return; const [id, name, cost] = it;
  if (SURV.cash < cost) { sfx.play('hit'); showHint('NOT ENOUGH CASH', '#ff6b5a'); return; }
  if (id.startsWith('w:')) { const k = widx(id.slice(2)), W = WEAPONS[k]; if (carry.includes(k)) { inv[k] = { mag: W.mag, res: W.res }; } else { const slot = W.slot === 'secondary' ? 1 : 0; carry[slot] = k; inv[k] = { mag: W.mag, res: W.res }; rebuildViewmodels(); renderSlots(); switchTo(k); } }
  else if (id === 'ammo') { for (const k of carry) { const W = WEAPONS[k]; if (W && !W.melee) inv[k] = { mag: W.mag, res: W.res }; } }
  else if (id.startsWith('e:')) { const k = id.slice(2), E = EQUIP[k]; SURV.eq[E.slot] = k; if (E.slot === 'lethal') player.grenades = Math.min((player.grenades || 0) + 2, 4); else player.tacticals = Math.min((player.tacticals || 0) + 2, 4); SURV.how = (E.slot === 'lethal' ? 'G / RB' : 'Q / LB') + ' TO THROW'; }
  else if (id === 'armor') { player.shield = Math.min(150, (player.shield || 0) + 75); player.shieldT = 1e9; }
  else if (id === 'heal') { player.hp = player.maxHp; player.regenCap = player.maxHp; }
  else if (id === 'air' || id === 'air3') { if (SURV.support.length >= 3) { showHint('SUPPORT SLOTS FULL (3)', '#ff6b5a'); return; } SURV.support.push(id); SURV.how = 'Z / D-PAD RIGHT TO TARGET IT'; }
  SURV.cash -= cost; sfx.play('pickup'); showHint('PURCHASED · ' + name.toUpperCase() + (SURV.how ? ' · ' + SURV.how : ''), '#9cff8a'); SURV.how = ''; renderBuy();
}
// ---- PvP killstreaks (kills without dying): UAV 3 · precision airstrike 5 · carpet bombing 7. Earned ones are kept through death.
const KS_ICON = {
  uav: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".6"/><path d="M12 12 L19.5 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="16" cy="15" r="1.4" fill="currentColor"/></svg>',
  air: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c.8 0 1.3 1 1.3 2.4V9l7.7 4.6v2l-7.7-2.3v4.3l2.4 1.8v1.6L12 20l-3.7 1v-1.6l2.4-1.8v-4.3L3 15.6v-2L10.7 9V4.4C10.7 3 11.2 2 12 2z"/></svg>',
  air3: '<svg viewBox="0 0 24 24"><g fill="currentColor"><path d="M6 3h3v6l1.5 2h-6L6 9z"/><path d="M15 3h3v6l1.5 2h-6L15 9z"/><path d="M10.5 12h3v6l1.5 2H9l1.5-2z"/></g></svg>' };
const STREAKS = [['uav', 3, 'UAV', 'Enemies show on your radar for 25 s'], ['air', 5, 'PRECISION AIRSTRIKE', 'Aim the marker, call in 4 heavy bombs'], ['air3', 7, 'CARPET BOMBING', 'A long line of bombs along your aim']];
const pvpOn = () => game.mode === 'botdm' || (MP.active && MP.mode !== 'surv');
const supOn = () => survOn() || pvpOn();
/* button prompts for whichever device you are using (CoD-style): a big key cap, or a drawn D-pad with the right arm lit */
const DPAD_R = '<svg class="dpad" viewBox="0 0 30 30"><path d="M11 2h8v9h9v8h-9v9h-8v-9H2v-8h9z" fill="rgba(255,255,255,.32)" stroke="#fff" stroke-width="1.4"/><path d="M19 11h9v8h-9z" fill="#ffcf6b"/><path d="M22 12.5l4 2.5-4 2.5z" fill="#111"/></svg>';
const supKey = () => gp.on ? DPAD_R : '<kbd class="big">Z</kbd>';
const supFire = () => gp.on ? '<kbd class="big">RT</kbd>' : '<kbd class="big">CLICK</kbd>';
const supBack = () => gp.on ? '<kbd>B</kbd>' : '<kbd>RIGHT-CLICK</kbd>';
function ksKill() { if (!pvpOn()) return; game.ks = (game.ks || 0) + 1;
  for (const [id, n, name, desc] of STREAKS) if (game.ks === n) { if (SURV.support.length < 3) SURV.support.push(id); ksBanner(id, name, desc); } }
function ksReset() { game.ks = 0; }
function ksBanner(id, name, desc) { let b = $('ksbanner'); if (!b) { b = document.createElement('div'); b.id = 'ksbanner'; $('hud').appendChild(b); }
  b.innerHTML = `<i>${KS_ICON[id]}</i><div><small>KILLSTREAK READY</small><b>${name}</b><em>${desc}</em></div><div class="kskey">${supKey()}<small>${gp.on ? 'D-PAD RIGHT' : 'PRESS'}</small></div>`; game.ksbT = 4.2; sfx.play('levelup'); rumble(0.4, 0.6, 250); }
function ksTrack() { /* the CoD stack: next streaks with progress pips */ let t = $('kstrack'); if (!t) { t = document.createElement('div'); t.id = 'kstrack'; $('hud').appendChild(t); }
  if (!pvpOn() || !player.alive && !MP.active) { t.style.display = 'none'; return; } t.style.display = 'flex'; const k = game.ks || 0;
  setHTML(t, STREAKS.map(([id, n, name]) => { const have = SURV.support.includes(id), got = k >= n; return `<div class="ks${have ? ' rdy' : got ? ' got' : ''}" title="${name}"><i>${KS_ICON[id]}</i><b>${n}</b>${have ? '' : `<u style="width:${Math.min(100, k / n * 100)}%"></u>`}</div>`; }).join('')); }
function supportStart() { /* CoD-style: pull up the designator, put the marker where you want it, click to call it in */
  if (!supOn() || !player.alive || game.state !== 'play') return; if (SURV.tgt) return supportCancel(); if (!SURV.support.length) { showHint(survOn() ? 'NO AIR SUPPORT · BUY IT AT THE RED ARMORY' : 'NO KILLSTREAK READY · ' + STREAKS[0][1] + ' KILLS IN A ROW FOR A UAV', '#ff6b5a'); return; }
  if (SURV.support[0] === 'uav') { SURV.support.shift(); game.uavT = 25; showHint('UAV ONLINE', '#7ac4ff'); sfx.play('wave'); ambience.flyby && ambience.flyby(false); return; }
  if (SURV.open) closeBuy(); SURV.tgt = { id: SURV.support[0], ok: false, at: new V3(), arm: 0.25, r0: !!mouseR }; sfx.play('switch'); mouseL = mL = false;
  if (!SURV.mk) { const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.0, 40), m); ring.rotation.x = -Math.PI / 2; g.add(ring); const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.55, 20), m); ring2.rotation.x = -Math.PI / 2; g.add(ring2);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 30, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.35, depthWrite: false })); beam.position.y = 15; g.add(beam); SURV.mk = g; SURV.mkMat = m; }
  scene.add(SURV.mk); SURV.mk.visible = true;
}
function supportCancel() { SURV.tgt = null; if (SURV.mk) SURV.mk.visible = false; sfx.play('switch'); }
const setHTML = (el, h) => { if (el._h !== h) { el._h = h; el.innerHTML = h; } };
function supportTick(dt) {
  const T = SURV.tgt; let tile = $('suptile'); if (!tile) { tile = document.createElement('div'); tile.id = 'suptile'; $('hud').appendChild(tile); }
  const n = SURV.support.length, nm = id => id === 'air3' ? 'CARPET BOMBING' : id === 'uav' ? 'UAV' : 'AIRSTRIKE'; if (game.uavT > 0) game.uavT -= dt; ksTrack();
  { const b = $('ksbanner'); if (b && (game.ksbT > 0 || b._v)) { game.ksbT = (game.ksbT || 0) - dt; const t = 4.2 - game.ksbT, k = clamp(Math.min(t / 0.22, game.ksbT / 0.35), 0, 1); b._v = k > 0; b.style.opacity = k; b.style.transform = `translate(-50%, ${((1 - Math.min(1, t / 0.3)) * -16).toFixed(1)}px) scale(${(1 + (1 - Math.min(1, t / 0.3)) * 0.06).toFixed(3)})`; } } /* driven from the game loop: CSS transitions stall on some setups */
  tile.style.display = supOn() && (n || T) ? 'block' : 'none';
  if (T && (!player.alive || game.state !== 'play')) { supportCancel(); return; }
  if (!T) { if (n) setHTML(tile, `<span class="skey">${supKey()}</span><b>${nm(SURV.support[0])}${n > 1 ? ' +' + (n - 1) : ''}</b><small>READY · ${SURV.support[0] === 'uav' ? 'press to launch' : 'press to aim'}</small>`); return; }
  aimBasis(); const h = raycast(camera.position, _f, 220, false), d = Math.min(h.t, 220); T.at.copy(camera.position).addScaledVector(_f, d); T.at.y = TH(T.at.x, T.at.z) + 0.05;
  const far = Math.hypot(T.at.x - player.pos.x, T.at.z - player.pos.z); T.ok = h.t < 220 && far > 6; T.arm -= dt;
  SURV.mk.position.copy(T.at); SURV.mk.children[0].scale.setScalar(T.id === 'air3' ? 1.6 : 1); SURV.mkMat.color.setHex(T.ok ? 0xff3b30 : 0x888888);
  setHTML(tile, `<b>${nm(T.id)} · TARGETING</b><small>${T.ok ? `${supFire()} call it in · ${supBack()} cancel · ${Math.round(far)} m` : far <= 6 ? 'TOO CLOSE — aim further away' : 'aim at the ground'}</small>`);
  if (!mouseR) T.r0 = false; if (mouseR && !T.r0) { supportCancel(); mouseR = mR = false; wst.adsOn = false; return; }
  if (mouseL && T.arm <= 0) { mouseL = mL = false; if (!T.ok) { sfx.play('hit'); return; } SURV.support.shift(); SURV.tgt = null; callAirstrike(T.at.clone(), T.id === 'air3');
    SURV.mkMat.color.setHex(0xffb020); const t = 2200 + (T.id === 'air3' ? 9 * 240 : 4 * 330); setTimeout(() => { if (SURV.mk && !SURV.tgt) SURV.mk.visible = false; }, t); }
}
function callAirstrike(at, carpet, owner, pts) { // jets roar over, then a string of heavy impacts walks across the target
  showHint(carpet ? 'CARPET BOMBING INBOUND' : 'AIRSTRIKE INBOUND', '#ff6b5a'); ambience.flyby && ambience.flyby(true);
  const n = carpet ? 9 : 4, mine = !owner; let dir = new V3(rand(-1, 1), 0, rand(-1, 1)).normalize(); if (mine) { aimBasis(); if (Math.hypot(_f.x, _f.z) > 0.1) dir.set(_f.x, 0, _f.z).normalize(); } /* bombs walk along your line of sight */
  if (!pts) { pts = []; for (let i = 0; i < n; i++) { const p = at.clone().addScaledVector(dir, (i - n / 2) * (carpet ? 5 : 3.5)); p.x += rand(-1.5, 1.5); p.z += rand(-1.5, 1.5); p.y = TH(p.x, p.z) + 0.3; pts.push(p); } }
  if (mine && MP.active) netSend({ t: 'air', c: carpet ? 1 : 0, pts: pts.map(v3a) });
  pts.forEach((p, i) => setTimeout(() => { if (game.state !== 'play' && game.state !== 'dying') return; game.ownSupport = mine; game.ksKind = carpet ? 'air3' : 'air'; try { explosion(p, carpet ? 6.5 : 7.5, carpet ? 170 : 220, mine ? 'player' : owner); } finally { game.ownSupport = false; game.ksKind = null; } }, 2200 + i * (carpet ? 240 : 330)));
}
function updateSurvival(dt) {
  supportTick(dt);
  if (survOn() && !SURV.tip && game.time > 2.5 && game.state === 'play') { SURV.tip = 1; showHint('KILLS EARN CASH · WALK TO A GLOWING ARMORY · F / X TO BUY', '#ffcf6b'); hud.hintT = 6; }
  if (!survOn()) { for (const m of SURV.markers) m.style.display = 'none'; return; }
  const ns = nearStation(); if (SURV.open && SURV.open !== ns) closeBuy();
  setText('cash', '$' + SURV.cash); const pr = $('interact'); if (pr) { pr.style.opacity = ns && !SURV.open ? 1 : 0; if (ns) pr.innerHTML = `<kbd>F</kbd> / <kbd>X</kbd> ${ARMORY[ns.kind].name}`; }
  SURV.stations.forEach((st, i) => { st.strip.material.color.setHex(ARMORY[st.kind].col).multiplyScalar(0.7 + 0.3 * Math.sin(game.time * 4 + i)); const m = SURV.markers[i]; if (!m) return; // on-screen waypoint
    const v = new V3(st.x, st.y + 2.6, st.z).project(camera), d = Math.hypot(st.x - player.pos.x, st.z - player.pos.z), behind = v.z > 1;
    let x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight; if (behind) { x = innerWidth - x; y = innerHeight - 40; } x = clamp(x, 40, innerWidth - 40); y = clamp(y, 60, innerHeight - 40);
    m.style.display = d < 3 ? 'none' : 'block'; m.style.transform = `translate(${x}px,${y}px)`; m.style.setProperty('--c', '#' + new THREE.Color(ARMORY[st.kind].col).getHexString()); m.innerHTML = `<b>${{ weapons: '⌖', equipment: '◆', support: '✈' }[st.kind]}</b><small>${Math.round(d)}m</small>`; });
}
function hitTick(dt) { /* pops out, snaps in, then fades */
  hud.hitT -= dt; const hm = $('hit'), k = Math.max(0, hud.hitT) / (hud.hitDur || 0.3), e = k * k * k;
  hm.style.opacity = Math.min(1, k * 3.2); hm.style.setProperty('--g', (5 + e * (hud.hitPop || 6)).toFixed(2) + 'px'); hm.style.transform = hud.hitCls === 'kill' ? `scale(${1 + e * 0.25})` : '';
}
function updateHUD(dt) {
  const w = WEAPONS[wst.cur], s = inv[wst.cur];
  const alive = enemies.filter(e => !e.dead).length;
  if ((MP.active && MP.mode !== 'surv') || game.mode === 'botdm') {
    const bd = game.mode === 'botdm', t = Math.max(0, Math.ceil(bd ? BD.matchT : MP.matchT)); setText('wavel', 'TIME'); setText('wave', t > 1e8 ? '∞' : Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'));
    if (!bd && MP.mode === 'tdm') { const [b, r] = MP.teamScore || [0, 0], my = mpTeamOf(PLAYER_T); setText('leftl', 'COALITION' + (my === 0 ? ' · YOU' : '')); setText('left', `<span style="color:#7ac4ff">${b}</span> / ${MP.limit}`); setText('scorel', 'REP. GUARD' + (my === 1 ? ' · YOU' : '')); setText('score', `<span style="color:#ff7a7a">${r}</span> / ${MP.limit}`); }
    else if (bd && BD.teams) { setText('leftl', 'COALITION · YOU'); setText('left', `<span style="color:#7ac4ff">${BD.teamKills[0]}</span> / ${BD.limit}`); setText('scorel', 'REP. GUARD'); setText('score', `<span style="color:#ff7a7a">${BD.teamKills[1]}</span> / ${BD.limit}`); }
    else { let lead = null; for (const p of bd ? BD.stats : Object.values(MP.players)) if (!lead || p.kills > lead.kills) lead = p;
    setText('leftl', 'LEADER'); setText('left', lead ? esc(lead.name.slice(0, 10)) + ' ' + lead.kills : '–');
    setText('scorel', 'YOUR KILLS'); setText('score', (bd ? BD.stats[0].kills : game.kills) + ' / ' + (bd ? BD.limit : MP.limit)); }
    if (!player.alive) { $('hint').textContent = 'RESPAWNING IN ' + Math.max(0, Math.ceil(MP.respawnT)) + (settings.pendingLO !== undefined && settings.pendingLO !== null ? ' WITH ' + customs()[settings.pendingLO].name : '') + (gp.on ? '  ·  Y — CHANGE LOADOUT' : '  ·  C — CHANGE LOADOUT'); $('hint').style.color = '#ffcf6b'; hud.hintT = 0.3; }
  } else { setText('wavel', 'WAVE'); setText('scorel', 'SCORE'); setText('wave', String(game.wave || '–')); }
  if ((MP.active && MP.mode !== 'surv') || game.mode === 'botdm') {} else if (game.phase === 'inter') { setText('leftl', 'NEXT WAVE'); setText('left', Math.ceil(Math.max(0, game.interT)) + 's'); }
  else { setText('leftl', 'HOSTILES'); setText('left', String(MP.active && !MP.isHost ? MP.zLeft | 0 : alive + game.queue.length)); }
  if ((!MP.active || MP.mode === 'surv') && game.mode !== 'botdm') setText('score', String(game.score));
  { const pc = $('protcue'); if (pc) { const on = player.alive && player.protT > game.time; if (pc._on !== on) { pc._on = on; pc.style.opacity = on ? 1 : 0; } } }
  setText('hpn', String(Math.ceil(player.hp))); setText('regen', String(player.regenCap));
  const hpf = $('hpfill'); const hpw = (player.hp / player.maxHp * 100) + '%';
  $('shfill').style.width = (player.shield / 60 * 100) + '%';
  const C = cls(); setText('abn', C.ability); setText('abk', player.abilityCD > 0 ? Math.ceil(player.abilityCD) + 's' : 'READY · E');
  $('abfill').style.width = ((1 - player.abilityCD / C.cd) * 100) + '%'; $('abil').classList.toggle('ready', player.abilityCD <= 0); if (hpf.style.width !== hpw) { hpf.style.width = hpw; hpf.style.background = player.hp < 35 ? 'linear-gradient(90deg,#ff3b3b,#ff8a6b)' : 'linear-gradient(90deg,#3ddc84,#9cf5c1)'; }
  setText('wname', w.name + (wst.reloading ? ' · RELOADING' : ''));
  setText('mag', w.melee ? 'MELEE' : `${s.mag} <span>/ ${isFinite(s.res) ? s.res : '∞'}</span>`);
  $('mag').classList.toggle('low', s.mag <= Math.ceil(w.mag * 0.25));
  const slots = $('slots').children; for (let i = 0; i < slots.length; i++) { const on = +slots[i].dataset.w === wst.cur; if (slots[i].classList.contains('on') !== on) slots[i].classList.toggle('on', on); }
  // inventory overlay (hold Tab) + armory hint
  { const sb = !!keys.Tab && MP.active, el = $('mpsb'); if (el) { if (sb) { hud.sbT = (hud.sbT || 0) - dt; if (hud.sbT <= 0) { hud.sbT = 0.3; const rows = Object.entries(MP.players).sort((a, b) => MP.mode === 'surv' ? (b[1].score | 0) - (a[1].score | 0) : b[1].kills - a[1].kills); el.innerHTML = `<h4>${MP.mode === 'surv' ? 'SURVIVAL CO-OP · WAVE ' + game.wave : MP.mode === 'tdm' ? 'TEAM DEATHMATCH' : 'FREE-FOR-ALL'}</h4>` + scoreTable(rows); } } el.style.display = sb ? 'block' : 'none'; } }
  const showInv = !!keys.Tab && !MP.active && (player.alive || game.mode === 'botdm');
  if (hudCache.inv !== showInv) { hudCache.inv = showInv; $('invp').style.display = showInv ? 'block' : 'none'; }
  if (showInv) { hud.invT = (hud.invT || 0) - dt; if (hud.invT <= 0) { hud.invT = 0.4; renderInventory(); } }
  const canArm = game.phase === 'inter' && player.alive;
  if (hudCache.arm !== canArm) { hudCache.arm = canArm; $('armhint').style.opacity = canArm ? 1 : 0; $('armhint').textContent = survOn() ? 'BREAK — SPEND YOUR CASH AT AN ARMORY (FOLLOW THE ICONS)' : 'PRESS B — ARMORY (CHANGE WEAPONS)'; }
  if (hud.blood > 0 || hud.bloodOn) { hud.blood = Math.max(0, (hud.blood || 0) - dt * 0.6); const bo = $('bloodov'); if (bo) bo.style.opacity = String(Math.min(0.6, hud.blood)); hud.bloodOn = hud.blood > 0; }
  if (hud.flashT > 0 || hud.flashOn) { hud.flashT = Math.max(0, hud.flashT - dt); const fo = $('flashov'); fo.style.opacity = String(Math.min(1, hud.flashT / 1.3)); hud.flashOn = hud.flashT > 0; }
  { const lo = { lethal: eqKind('lethal'), tactical: eqKind('tactical') }; setText('nades', EQUIP[lo.lethal].short + ' ' + '●'.repeat(player.grenades) + '○'.repeat(Math.max(0, cls().nadeMax - player.grenades)) + ' · ' + EQUIP[lo.tactical].short + ' ' + '●'.repeat(player.tacticals || 0)); }
  // crosshair
  const spread = currentSpread(w), px = Math.tan(spread) * (innerHeight / 2) / Math.tan(camera.fov * Math.PI / 360);
  const gap = 4 + px, xh = $('xh');
  const op = (1 - wst.ads * 1.6) * (player.sprinting ? 0.3 : 1) * (settings.xhair === 'none' ? 0 : 1);
  xh.style.opacity = game.potg ? game.potg.xh || 0 : Math.max(0, op); if (hudCache.xs !== settings.xhair + settings.xcolor) { hudCache.xs = settings.xhair + settings.xcolor; xh.className = 'x-' + (settings.xhair || 'cross'); xh.style.setProperty('--xc', settings.xcolor || '#ffffff'); }
  if (hudCache.gap !== (gap | 0)) { hudCache.gap = gap | 0; const c = xh.children; c[0].style.top = (-gap - 9) + 'px'; c[1].style.top = gap + 'px'; c[2].style.left = (-gap - 9) + 'px'; c[3].style.left = gap + 'px'; }
  $('dot').style.opacity = w.id === 'rifle' && wst.ads > 0.85 ? 1 : 0;
  $('scope').style.opacity = w.scope && wst.ads > 0.92 ? 1 : 0; if (hudCache.sc !== w.scopeStyle) { hudCache.sc = w.scopeStyle; $('scope').className = w.scopeStyle === 'acog' ? 'acog' : ''; }
  // hitmarker
  hitTick(dt);
  // vignette
  hud.vig = Math.max(0, hud.vig - dt * 0.9);
  $('vig').style.opacity = Math.min(1, hud.vig + (player.hp < 35 ? 0.35 + Math.sin(game.time * 5) * 0.12 : 0));
  for (const d of dmgDirs) { if (d.t > 0) { d.t -= dt; d.el.style.opacity = Math.max(0, Math.min(1, d.t)); d.el.style.transform = `rotate(${(player.yaw - d.a + Math.PI)}rad)`; } }
  hud.msgT -= dt; $('msg').style.opacity = clamp(hud.msgT * 2, 0, 1);
  hud.streakT -= dt; const st = $('streak'); st.style.opacity = clamp(hud.streakT * 2, 0, 1); st.style.transform = `scale(${1 + Math.max(0, hud.streakT - 1.3) * 1.5})`;
  if (hud.hintT > 0) hud.hintT -= dt;
  else if (s.mag === 0 && s.res > 0 && !wst.reloading) { $('hint').textContent = 'PRESS R TO RELOAD'; $('hint').style.color = '#ffcf6b'; hud.hintT = 0.01; }
  else if (s.mag === 0 && s.res === 0) { $('hint').textContent = 'NO AMMO — SWITCH WEAPON'; $('hint').style.color = '#ff6b5a'; hud.hintT = 0.01; }
  $('hint').style.opacity = hud.hintT > 0 ? clamp(hud.hintT * 3, 0, 1) : 0;
  drawRadar();
}

