// ============================================================ BOTS — human-like aim, cover, flanking, reloads, grenades, hearing
const ETYPES = {
  grunt: { model: 'guard', name: 'Rifleman', hp: 100, speed: 4.2, scale: 1, weapon: 'rifle', dmgScale: 0.42, skill: 0.75, sight: 70, reaction: 0.5, score: 100, nades: 0.35 },
  rusher: { model: 'goblin', name: 'Rusher', hp: 75, speed: 6.4, scale: 0.97, weapon: 'shotgun', dmgScale: 0.5, skill: 0.8, sight: 60, reaction: 0.3, score: 120, rush: true },
  heavy: { model: 'troll', name: 'Juggernaut', hp: 300, speed: 2.8, scale: 1.12, weapon: 'lmg', dmgScale: 0.32, skill: 0.7, sight: 70, reaction: 0.65, score: 220 },
  sniper: { model: 'archer', name: 'Marksman', hp: 80, speed: 3.6, scale: 1, weapon: 'sniper', dmgScale: 0.42, skill: 1.05, sight: 100, reaction: 0.6, score: 160, sniper: true, aim: 1.1 },
};
const BOT_NAMES = ['Viper', 'Havoc', 'Nomad', 'Sarge', 'Hawk', 'Rook', 'Maverick', 'Bishop', 'Frost', 'Kilo', 'Echo', 'Blaze', 'Raptor', 'Torque', 'Gunner', 'Duke', 'Spectre', 'Ranger', 'Cobra', 'Diesel'];
const BOT_SKILL = { easy: 0.6, normal: 0.92, hard: 1.25 }, BOT_DMG = { easy: 0.55, normal: 0.8, hard: 1.0 };
const PREF_RANGE = { scar: [12, 30], bullpup: [10, 24], vector: [3, 10], ump: [6, 16], autoshotgun: [3, 9], fifty: [30, 70], mpistol: [4, 10], shotgun: [3, 9], smg: [5, 14], pistol: [6, 15], revolver: [6, 16], rifle: [10, 26], ak: [10, 24], lmg: [12, 30], dmr: [20, 45], sniper: [25, 60] };
const mpTeamOf = x => { if (!x) return -1; const id = x === PLAYER_T || x.isPlayer ? MP.myId : x.netId || x.id; const p = MP.players[id]; return p && p.team !== undefined ? p.team : -1; };
const isAlly = (a, b) => { if (!a || !b) return false; if (MP.active && MP.mode === 'surv' && (a.isEnemyNpc || b.isEnemyNpc)) return !!(a.isEnemyNpc && b.isEnemyNpc); if (MP.active && MP.mode === 'tdm') { const ta = mpTeamOf(a), tb = mpTeamOf(b); return ta >= 0 && ta === tb; } if (MP.active && MP.mode === 'surv') { const h = x => x === PLAYER_T || x.isPlayer || x.isRemote; return h(a) && h(b); } return !!(BD.teams && game.mode === 'botdm' && a.team >= 0 && a.team === b.team); };
const PLAYER_T = { get team() { return MP.active && MP.mode === 'tdm' ? mpTeamOf(PLAYER_T) : BD.teams ? 0 : -1; }, isPlayer: true, get pos() { return player.pos; }, get vel() { return player.vel; }, get h() { return player.h + 0.07; }, get dead() { return !player.alive; }, s: 1, name: 'You' };
// noise: wakes bots up and pulls them toward fights
// ---- footsteps & hearing: everyone's steps are positional, louder when sprinting, near-silent when sneaking, muffled through walls/floors
const SURF = { planks: 'wood', wood: 'wood', crate: 'wood', logwall: 'wood', staves: 'wood', bark: 'wood', metal: 'metal', carpaint: 'metal', gold: 'metal', rune: 'metal', pad: 'metal', container: 'metal', grate: 'metal', tire: 'metal',
  castle: 'stone', stone: 'stone', stonewall: 'stone', flag: 'stone', sandstone: 'stone', brickW: 'stone', cliff: 'stone', rock: 'stone', tiles: 'stone', slate: 'stone', roof: 'stone', hutwall: 'stone',
  concrete: 'concrete', pavement: 'concrete', wallP1: 'concrete', wallP2: 'concrete', wallP3: 'concrete', shutter: 'metal', acunit: 'metal', metalwall: 'metal', hull: 'metal', crane: 'metal', fuel: 'metal', forklift: 'metal', canvas: 'dirt', plasterA: 'concrete', plasterB: 'concrete', floor: 'concrete', hesco: 'sand', sandbag: 'sand', hay: 'dirt', thatch: 'dirt', leaf: 'grass' };
const GROUNDSURF = { dirtroad: 'dirt', grassMud: 'grass', cobble: 'stone', asphalt: 'concrete', sand: 'sand', swampMud: 'dirt', mud: 'dirt' };
function surfaceAt(x, y, z) {
  if (!world || !world.nav) return 'concrete'; let best = null, by = -1e9;
  for (const b of world.nav.bucket(x, z)) if (x >= b.x0 - 0.05 && x <= b.x1 + 0.05 && z >= b.z0 - 0.05 && z <= b.z1 + 0.05 && b.y1 <= y + 0.3 && b.y1 > y - 0.45 && b.y1 > by) { by = b.y1; best = b; }
  if (best && best.y1 > 0.05) return SURF[best.m] || 'concrete';
  for (const w of world.L.water || []) if (x > w[0] && x < w[2] && z > w[1] && z < w[3] && y < w[4] + 0.2) return 'water';
  if (best && best.m !== 'floor') return SURF[best.m] || 'concrete';
  return GROUNDSURF[world.L.ground] || 'dirt';
}
const GAIT = { sneak: { radius: 7, vol: 0.18, bots: 0 }, walk: { radius: 24, vol: 0.62, bots: 9 }, sprint: { radius: 38, vol: 1, bots: 16 } };
function gaitOf(speed, crouched, quiet) { return crouched || quiet ? 'sneak' : speed > 6.9 ? 'sprint' : 'walk'; } /* sneaking is a choice (crouch / Alt), not a speed: a strafing or aiming enemy is still heard */
// called every frame for a bot / remote player; plays their footstep where you can hear it
function footTick(ent, dt, speed, crouched, onGround, foe, quiet) {
  if (!onGround || speed < 1.2) { ent.stepAcc = Math.min(ent.stepAcc || 0, 1.4); return; }
  const gait = gaitOf(speed, crouched, quiet); ent.stepAcc = (ent.stepAcc || 0) + speed * dt; if (ent.stepAcc < (gait === 'sprint' ? 2.6 : 1.95)) return; ent.stepAcc = 0;
  const G = GAIT[gait];
  if (G.bots && ent.bot) noise(ent.pos, G.bots * 0.8, ent);
  const dx = ent.pos.x - camera.position.x, dy = ent.pos.y + 0.1 - camera.position.y, dz = ent.pos.z - camera.position.z, d = Math.hypot(dx, dy, dz); if (d > G.radius) return;
  let muffle = 0; if (!los(camera.position.x, camera.position.y, camera.position.z, ent.pos.x, ent.pos.y + 0.4, ent.pos.z)) muffle = 0.55; if (Math.abs(ent.pos.y - player.pos.y) > 2.4) muffle = Math.max(muffle, 0.7);
  const fall = Math.pow(1 - d / G.radius, 1.6), sp = spatial(ent.pos);
  sfx.step(surfaceAt(ent.pos.x, ent.pos.y, ent.pos.z), { pan: sp.pan, pos: { x: ent.pos.x, y: ent.pos.y + 0.05, z: ent.pos.z }, vol: G.vol * fall * (foe ? 1.1 : 0.7) * (1 - muffle * 0.45), muffle, gait });
}
function noise(p, radius, src) { // like CoD: the nearest two or three react (the third swings wide); anyone already in a fight or holding a spot mostly ignores it
  const near = enemies.filter(e => !e.dead && e !== src && !isAlly(src, e) && !e.visible && Math.hypot(e.pos.x - p.x, e.pos.z - p.z) <= radius).sort((a, b) => Math.hypot(a.pos.x - p.x, a.pos.z - p.z) - Math.hypot(b.pos.x - p.x, b.pos.z - p.z));
  let k = 0;
  for (const e of near) { const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z); e.alertT = 4;
    if (e.bot) { const busy = e.target && e.lostT < 3, holding = e.role === 'anchor' && e.holdT > 0; if (k >= 3 || (busy && Math.random() < 0.75) || (holding && d > 18)) continue; }
    let ix = p.x + rand(-3, 3) * d / radius, iz = p.z + rand(-3, 3) * d / radius;
    if (e.bot && k === 2) { const ux = p.x - e.pos.x, uz = p.z - e.pos.z, l = Math.hypot(ux, uz) || 1, sd = Math.random() < 0.5 ? 1 : -1, n = world.nav.nearestSafe(p.x - uz / l * 10 * sd, p.y, p.z + ux / l * 10 * sd, 6); if (n >= 0) { const q = world.nav.nodePos(n); ix = q[0]; iz = q[2]; } }
    e.investigate = new V3(ix, p.y, iz); if (src) e.target = src; e.lostT = Math.min(e.lostT, 1); e.repathT = 0; k++;
  }
}
const _ea = new V3(), _eb = new V3(), _ed = new V3(), _eo = new V3();
class Enemy {
  constructor(type, x, z, wave, opt = {}) {
    this.bot = type === 'bot'; this.type = type; // CoD-style bot roles: slayers push, flankers take side routes, anchors hold rooms/roofs, supports move with a teammate
    this.role = this.bot ? ['slayer', 'slayer', 'flanker', 'anchor', 'support'][hashStr(String((opt && opt.name) || Math.random())) % 5] : null;
    const T = this.T = this.bot ? opt.T : ETYPES[type];
    this.W = WEAPONS[widx(T.weapon)];
    const D = DIFF[settings.difficulty];
    this.skill = clamp((this.bot ? BOT_SKILL[settings.botDiff || 'normal'] : (T.skill || 1) * D.acc) * rand(0.85, 1.15), 0.3, 1.6);
    this.dmgMul = this.bot ? BOT_DMG[settings.botDiff || 'normal'] * 0.85 : T.dmgScale * D.dmg;
    this.maxHp = this.hp = Math.round((this.bot ? T.hp : T.hp * D.hp * (1 + 0.04 * (wave - 1))) * hpMul());
    this.s = T.scale; this.r = 0.34 * T.scale; this.h = 1.82 * T.scale; this.name = opt.name || T.name;
    this.pos = new V3(x, (opt.y || 0) + 0.05, z); this.vel = new V3(); this.onGround = false; this.stepSmooth = 0;
    this.yaw = Math.atan2(player.pos.x - x, player.pos.z - z); this.aimYaw = this.yaw; this.aimPitch = 0; this.errX = 0; this.errY = 0; this.recoilP = 0;
    this.path = null; this.pi = 0; this.repathT = 0; this.goal = null;
    this.target = this.bot ? null : PLAYER_T; this.visible = false; this.seeT = 0; this.lostT = 0; this.losT = rand(0, 0.2); this.alertT = 0;
    this.lastKnown = new V3(player.pos.x + rand(-8, 8), player.pos.y, player.pos.z + rand(-8, 8)); this.investigate = this.bot ? null : this.lastKnown.clone();
    this.mag = this.W.mag; this.reloadT = 0; this.fireT = rand(0.3, 0.8); this.burst = 0; this.aimT = 0;
    this.grenades = this.bot ? 1 : Math.random() < (T.nades || 0) ? 1 : 0; this.nadeCD = rand(4, 8);
    this.state = 'hunt'; this.cover = null; this.coverT = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = 0; this.jumpCD = rand(1, 3);
    this.flashT = 0; this.mflash = 0; this.dead = false; this.deadT = 0; this.stuckT = 0; this.lastPos = this.pos.clone(); this.lastFired = -99; this.spawnT = 0.5;
    this.lookT = 0; this.lookYaw = 0; this.attacker = null; this.headPref = Math.random() < 0.18 * this.skill;
    Object.assign(this, makeCharacter(T.model, { scale: T.scale, weapon: this.W.id, sash: opt.sash, faction: opt.faction, seed: opt.name || T.name + ':' + Math.random() }));
    this.group.position.copy(this.pos); world.group.add(this.group);
    if (T.sniper) {
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      this.laser = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.85 })); this.laser.frustumCulled = false; this.laser.visible = false; world.group.add(this.laser);
    }
  }
  get canSee() { return this.visible; }
  eye(out) { return out.set(this.pos.x, this.pos.y + (1.62 - 0.55 * (this.crouchK || 0)) * this.s, this.pos.z); }
  gunPos(out) { if (this.muzzlePt) { this.muzzlePt.getWorldPosition(out); return out; } return this.eye(out); }
  candidates() { const l = []; if (player.alive && (!MP.active || this.netId) && !isAlly(this, PLAYER_T)) l.push(PLAYER_T); if (this.bot) for (const e of enemies) if (e !== this && !e.dead && e.bot && !isAlly(this, e)) l.push(e); if (this.netId) for (const r of remoteList) if (!r.dead && !r.downed && !r.isEnemyNpc && r.pos.y > -20 && !isAlly(this, r)) l.push(r); if (player.downed) { const i = l.indexOf(PLAYER_T); if (i >= 0) l.splice(i, 1); } return l; }
  aimPoint(t, out, head) { const hh = t.isPlayer ? player.h - 0.12 : t.h * (head ? 0.9 : 0.62); return out.set(t.pos.x, t.pos.y + (t.isPlayer ? (head ? hh : hh - 0.45) : hh), t.pos.z); }
  perceive() {
    if (this.blindT > 0) { this.visible = false; return; }
    const e = this.eye(_ea); let best = null, bs = 1e9;
    for (const c of this.candidates()) {
      const p = this.aimPoint(c, _eb, false), dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz); if (d > this.T.sight) continue;
      const ang = Math.abs(angDiff(this.yaw, Math.atan2(dx, dz)));
      if (ang > (this.alertT > 0 ? 2.4 : 1.25) && d > 4) continue;
      if (smokeBlocked(e.x, e.y, e.z, p.x, p.y, p.z)) continue;
      if (!los(e.x, e.y, e.z, p.x, p.y, p.z)) { const hp = this.aimPoint(c, _ed, true); if (!los(e.x, e.y, e.z, hp.x, hp.y, hp.z)) continue; }
      const sc = d * (c === this.target ? 0.6 : 1) * (c === this.attacker ? 0.5 : 1); if (sc < bs) { bs = sc; best = c; }
    }
    if (best) { if (best !== this.target) { this.seeT = 0; this.errX = rand(-1, 1) * 0.09 / this.skill; this.errY = rand(-1, 1) * 0.05 / this.skill; } this.target = best; this.visible = true; this.lastKnown.copy(best.pos); this.lostT = 0; }
    else this.visible = false;
  }
  findCover() { // a nearby reachable spot the target cannot see
    if (!this.target) return null; const t = this.aimPoint(this.target, _eb, true), nav = world.nav; let best = null, bd = 1e9;
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2 + rand(0, 0.3), r = rand(2.5, 10), x = this.pos.x + Math.cos(a) * r, z = this.pos.z + Math.sin(a) * r;
      const n = nav.nodeAt(x, this.pos.y, z, 1); if (n < 0) continue; const [nx, ny, nz] = nav.nodePos(n); if (Math.abs(ny - this.pos.y) > 1.5) continue;
      if (los(t.x, t.y, t.z, nx, ny + 1.3 * this.s, nz)) continue;
      if (enemies.some(o => o !== this && !o.dead && ((o.cover && Math.hypot(o.cover.x - nx, o.cover.z - nz) < 3.5) || Math.hypot(o.pos.x - nx, o.pos.z - nz) < 2.5))) continue; /* don't pile into a spot someone already holds */
      const d = Math.hypot(nx - this.pos.x, nz - this.pos.z) + Math.hypot(nx - this.target.pos.x, nz - this.target.pos.z) * -0.15; if (d < bd) { bd = d; best = new V3(nx, ny, nz); }
    }
    if (this.bot) for (const n of navPosts()) { // or duck into a nearby house / up a stairwell
      const [nx, ny, nz] = nav.nodePos(n), dd = Math.hypot(nx - this.pos.x, nz - this.pos.z); if (dd > 16 || dd < 2 || Math.abs(ny - this.pos.y) > 4.5) continue;
      if (los(t.x, t.y, t.z, nx, ny + 1.3 * this.s, nz)) continue; const d = dd * 0.8 - 2.5 - Math.hypot(nx - this.target.pos.x, nz - this.target.pos.z) * 0.15; if (d < bd) { bd = d; best = new V3(nx, ny, nz); } }
    return best;
  }
  findLowCover() { // tuck in right behind something waist-high (crate, sandbags, low wall, car): hidden crouched, can shoot standing
    if (!this.target) return null; const t = this.target, te = this.aimPoint(t, new V3(), true), nav = world.nav, seen = new Set(); let best = null, bd = 1e9;
    for (let gx = -12; gx <= 12; gx += 4) for (let gz = -12; gz <= 12; gz += 4) for (const bx of nav.bucket(this.pos.x + gx, this.pos.z + gz)) {
      if (seen.has(bx) || bx.dead || bx.glass) continue; seen.add(bx); const base = this.pos.y, ht = bx.y1 - base;
      if (ht < 0.8 || ht > 1.45 || bx.y0 > base + 0.3 || Math.max(bx.x1 - bx.x0, bx.z1 - bx.z0) < 0.5) continue;
      const cx = (bx.x0 + bx.x1) / 2, cz = (bx.z0 + bx.z1) / 2; let dx = cx - t.pos.x, dz = cz - t.pos.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      if (dl < 6 || Math.hypot(cx - this.pos.x, cz - this.pos.z) > 14) continue;
      const ext = Math.abs(dx) * (bx.x1 - bx.x0) / 2 + Math.abs(dz) * (bx.z1 - bx.z0) / 2, x = cx + dx * (ext + 0.5), z = cz + dz * (ext + 0.5); // the far side, facing the enemy
      const n = nav.nodeAt(x, base, z, 0.5); if (n < 0) continue; const [nx, ny, nz] = nav.nodePos(n); if (Math.abs(ny - base) > 0.5) continue;
      if (los(te.x, te.y, te.z, nx, ny + 0.95 * this.s, nz) || !los(te.x, te.y, te.z, nx, ny + 1.6 * this.s, nz)) continue;
      const d = Math.hypot(nx - this.pos.x, nz - this.pos.z) + Math.random() * 1.5; if (d < bd) { bd = d; best = new V3(nx, ny, nz); }
    }
    return best;
  }
  lowCoverTick(dt) { // returns [mx, mz] while moving there, null once in place; drives the duck / pop-up rhythm
    const lc = this.lcover, d = Math.hypot(lc.x - this.pos.x, lc.z - this.pos.z);
    if (d > 0.6 && !this.lcIn) { this.setGoal(lc, true); this.wantCrouch = 0; return this.followPath(dt) || [0, 0]; }
    this.lcIn = true; this.lcT -= dt;
    if (this.lcT <= 0) { this.lcUp = !this.lcUp; this.lcT = this.lcUp ? rand(1.1, 2.4) : rand(0.7, 1.6); if (!this.lcUp) { this.lcCycles = (this.lcCycles || 0) + 1; if (this.mag < this.W.mag * 0.5) this.startReload(); } }
    this.wantCrouch = this.lcUp && this.reloadT <= 0 ? 0 : 1;
    const t = this.target; if (!t || t.dead || this.lcCycles > 3 || Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z) < 5) { this.state = 'hunt'; this.lcover = null; this.lcIn = false; this.lcCycles = 0; this.wantCrouch = 0; }
    return null;
  }
  setGoal(p, run) { if (!p) return; if (!this.goal || this.goal.distanceTo(p) > 1.2) { this.goal = p.clone(); this.repathT = 0; } this.run = !!run; }
  followPath(dt) { // returns desired horizontal direction
    const nav = world.nav; if (!this.goal) return null;
    this.repathT -= dt;
    if (this.repathT <= 0 && this.path && this.pi < this.path.length && (Math.abs(this.path[this.pi][1] - this.pos.y) > 0.3 || this.path[this.pi][3] || (this.pi > 0 && this.path[this.pi - 1][3])) && !this.forceRepath) this.repathT = 0.4; // climbing a staircase: keep the current route
    this.forceRepath = false;
    if (this.repathT <= 0 || !this.path) { this.repathT = rand(0.7, 1.2); this.path = nav.pathTo(this.pos.x, this.pos.y, this.pos.z, this.goal.x, this.goal.y, this.goal.z); this.pi = 0; }
    if (!this.path || this.pi >= this.path.length) return null;
    for (let k = 0; k < 2 && this.pi + 1 < this.path.length; k++) { const q = this.path[this.pi + 1]; if (Math.abs(q[1] - this.pos.y) < 0.3 && nav.lineFreeAt(this.pos.x, this.pos.y, this.pos.z, q[0], q[1], q[2])) this.pi++; else break; }
    const w = this.path[this.pi], wx = w[0] - this.pos.x, wz = w[2] - this.pos.z, wd = Math.hypot(wx, wz);
    if (wd < 0.45 && Math.abs(w[1] - this.pos.y) < 1.4) { this.pi++; return null; }
    if (wd < 0.8 && w[1] - this.pos.y >= 1.4) { this.path = null; this.repathT = 0; return null; } // waypoint on another floor right here: re-plan
    return [wx / wd, wz / wd];
  }
  update(dt) {
    if (this.dead) {
      this.deadT += dt; const k = Math.min(this.deadT / 0.5, 1); this.group.rotation.x = -this.fallDir * k * k * 1.45;
      if (this.deadT > 2.5) this.group.position.y -= dt * 0.7;
      if (this.deadT > 4) { world.group.remove(this.group); if (this.laser) world.group.remove(this.laser); return false; }
      return true;
    }
    const T = this.T, W = this.W;
    if (this.spawnT > 0) { this.spawnT -= dt; this.group.scale.set(1, clamp(1 - this.spawnT / 0.5, 0.05, 1), 1); }
    this.alertT -= dt; this.nadeCD -= dt; this.jumpCD -= dt; if (this.blindT > 0) { this.blindT -= dt; this.visible = false; }
    // ---- perception
    this.losT -= dt; if (this.losT <= 0) { this.losT = 0.1 + Math.random() * 0.08; this.perceive(); }
    if (this.target && this.target.dead) { this.target = this.bot ? null : PLAYER_T; this.visible = false; }
    if (this.visible) { if (this.seeT === 0 && this.lostT > 4 && Math.random() < 0.4) callout('contact', this.pos, this.vpitch || (this.vpitch = rand(95, 155))); this.seeT += dt; } else { this.seeT = 0; this.lostT += dt; }
    if (!this.bot && !this.visible && this.lostT > 3.5) { this.lostT = 1.5; this.investigate = new V3(player.pos.x + rand(-6, 6), player.pos.y, player.pos.z + rand(-6, 6)); } // survival: they always sense you eventually
    // ---- reload
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) { this.mag = W.mag; if (Math.hypot(this.pos.x - player.pos.x, this.pos.z - player.pos.z) < 18) sfx.play('magin', spatial(this.pos)); } }
    else if (this.mag <= 0 || (!this.visible && this.mag < W.mag * 0.35 && this.lostT > 1)) this.startReload();
    // ---- decide where to go
    const t = this.target, dist = t ? Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z) : 99;
    const pr = PREF_RANGE[W.id] || [8, 20];
    let mx = 0, mz = 0, spd = T.speed * 0.6, wantRun = false;
    const hurt = this.hp < this.maxHp * 0.4;
    if (this.visible && t) {
      this.investigate = null;
      if ((hurt || this.reloadT > 0) && this.state !== 'cover' && Math.random() < dt * 2 && !T.rush) { const c = this.findCover(); if (c) { this.state = 'cover'; this.cover = c; this.coverT = rand(1.4, 2.8); } }
      if (this.state === 'cover' && this.cover) { this.setGoal(this.cover, true); const d = this.followPath(dt); if (d) { mx = d[0]; mz = d[1]; spd = T.speed; } this.wantCrouch = this.reloadT > 0 ? 1 : 0; this.coverT -= dt * (d ? 0.35 : 1); if (this.coverT <= 0 && this.reloadT <= 0) { this.state = 'engage'; this.cover = null; } } // reload behind it, then push back out
      else if (this.state === 'lowcover' && this.lcover) { const d = this.lowCoverTick(dt); if (d) { mx = d[0]; mz = d[1]; spd = T.speed; } }
      else {
        this.wantCrouch = 0; this.lcSearch = (this.lcSearch || rand(0.5, 2)) - dt;
        this.cpT = (this.cpT || 0) - dt; if (this.cpT <= 0) { this.cpT = rand(1.5, 3.5); this.cpOn = !T.rush && dist > 10 && Math.random() < 0.35 ? rand(0.6, 1.5) : 0; } if (this.cpOn > 0) { this.cpOn -= dt; this.wantCrouch = 1; } // crouch mid-fight to shrink the target
        if (!T.rush && this.lcSearch <= 0 && dist > 7) { this.lcSearch = rand(1.5, 3); if (Math.random() < 0.7 + 0.2 * this.skill) { const c = this.findLowCover(); if (c) { this.state = 'lowcover'; this.lcover = c; this.lcIn = false; this.lcUp = false; this.lcT = rand(0.4, 1); this.lcCycles = 0; } } }
        this.state = 'engage';
        const ux = (t.pos.x - this.pos.x) / (dist || 1), uz = (t.pos.z - this.pos.z) / (dist || 1), nav = world.nav;
        this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = Math.random() < 0.7 ? -this.strafe : this.strafe; this.strafeT = rand(0.35, 1.4) / Math.max(0.6, this.skill); }
        let sx = -uz * this.strafe, sz = ux * this.strafe;
        if (!nav.freeAt(this.pos.x + sx * 1.2, this.pos.y, this.pos.z + sz * 1.2)) { this.strafe *= -1; sx = -sx; sz = -sz; }
        const still = T.sniper || (W.id === 'sniper' || W.id === 'lmg') && Math.random() < 0.6;
        if (T.rush || dist > pr[1] + 4) { this.setGoal(t.pos, false); const d = this.followPath(dt); if (d) { mx = d[0]; mz = d[1]; } if (T.rush) { spd = T.speed; if (dist < 6 && nav.lineFreeAt(this.pos.x, this.pos.y, this.pos.z, t.pos.x, t.pos.y, t.pos.z)) { mx = ux + sx * 0.4; mz = uz + sz * 0.4; } } }
        else if (dist < pr[0] && nav.freeAt(this.pos.x - ux * 1.2, this.pos.y, this.pos.z - uz * 1.2)) { mx = -ux * 0.8 + sx * 0.5; mz = -uz * 0.8 + sz * 0.5; }
        else if (!still) { mx = sx; mz = sz; spd = T.speed * (0.45 + 0.25 * this.skill); }
        else if (dist > 18) this.wantCrouch = 1; // planted at range: drop to a crouch for stability
        if (this.aimT > 0) { mx = mz = 0; }
        if (this.jumpCD <= 0 && this.onGround && dist < 16 && Math.random() < dt * 0.6 * this.skill && !T.sniper) { this.vel.y = 6.8; this.jumpCD = rand(2.5, 6); }
      }
    } else {
      if (this.state === 'lowcover' && this.lcover) { const d = this.lowCoverTick(dt); if (d) { mx = d[0]; mz = d[1]; spd = T.speed; } }
      else if (this.state === 'cover' && this.cover) { // hide, then peek out toward the last known position
        this.wantCrouch = this.reloadT > 0 ? 1 : 0;
        this.setGoal(this.cover, true); const d = this.followPath(dt); if (d) { mx = d[0]; mz = d[1]; spd = T.speed; } else { this.coverT -= dt; if (this.coverT <= 0 && this.reloadT <= 0) { this.state = 'hunt'; this.cover = null; if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 20); this.investigate = this.lastKnown.clone(); } }
      } else {
        // grenade the spot they were last seen hiding behind
        if (this.grenades > 0 && this.nadeCD <= 0 && t && this.lostT > 1.5 && this.lostT < 6) { const d = this.pos.distanceTo(this.lastKnown); if (d > 7 && d < 22) this.throwNade(this.lastKnown); }
        // flank: approach the last known position from the side instead of head-on
        if (t && this.lostT > 2 && this.lostT < 2.1 && Math.random() < (this.role === 'flanker' ? 0.95 : this.role === 'anchor' ? 0.05 : this.skill > 0.8 ? 0.4 : 0.15)) {
          const ux = this.lastKnown.x - this.pos.x, uz = this.lastKnown.z - this.pos.z, l = Math.hypot(ux, uz) || 1, side = Math.random() < 0.5 ? 1 : -1;
          const n = world.nav.nearestSafe(this.lastKnown.x - uz / l * 9 * side, this.lastKnown.y, this.lastKnown.z + ux / l * 9 * side, 4); if (n >= 0) { const [x, y, z] = world.nav.nodePos(n); this.investigate = new V3(x, y, z); this.state = 'flank'; }
        }
        let goal = this.investigate || (t ? this.lastKnown : null);
        if (!goal && this.bot) { // roam
          if ((!this.roam || this.pos.distanceTo(this.roam) < 2) && this.role === 'support' && Math.random() < 0.75) { // move with a teammate, a few bodies back and off to one side
            const mates = [...(isAlly(this, PLAYER_T) && player.alive ? [PLAYER_T] : []), ...enemies.filter(o => o !== this && !o.dead && isAlly(this, o) && o.role !== 'support')];
            if (!this.buddy || this.buddy.dead || !mates.includes(this.buddy)) this.buddy = mates.length ? mates[Math.floor(Math.random() * mates.length)] : null;
            const B = this.buddy; if (B) { const a = Math.random() * 6.28, r = rand(8, 14), n = world.nav.nearestSafe(B.pos.x + Math.cos(a) * r, B.pos.y, B.pos.z + Math.sin(a) * r, 10); if (n >= 0) { const [x, y, z] = world.nav.nodePos(n); this.roam = new V3(x, y, z); this.roamPost = false; this.holdDone = true; } } }
          if (this.holdT > 0 && this.roam && this.pos.distanceTo(this.roam) < 2.5) { this.holdT -= dt; if (this.lookT <= 0) this.lookT = rand(0.8, 1.6); } // holding a room / rooftop
          else if (!this.roam || this.pos.distanceTo(this.roam) < 2) { const P = navPosts(); if (this.roam && this.roamPost && !this.holdDone) { this.holdT = this.role === 'anchor' ? rand(9, 20) : this.role === 'slayer' ? rand(2, 5) : rand(4, 11); this.holdDone = true; this.lookT = rand(1, 2); } else { this.holdDone = false; this.roamPost = false; this.roam = null;
            const pPost = { anchor: 0.9, slayer: 0.25, flanker: 0.4, support: 0.5 }[this.role] || 0.55, spreadOK = (x, z) => !enemies.some(o => o !== this && !o.dead && o.roam && Math.hypot(o.roam.x - x, o.roam.z - z) < (isAlly(this, o) ? 14 : 6)); // teammates spread out
            if (P.length && Math.random() < pPost) { for (let q = 0; q < 8; q++) { const m = P[Math.floor(Math.random() * P.length)], [x, y, z] = world.nav.nodePos(m); if (!spreadOK(x, z)) continue; this.roam = new V3(x, y, z); this.roamPost = true; break; } } // go use a building / stairs / roof
            if (!this.roamPost && (this.role === 'slayer' || this.role === 'flanker')) { // slayers hunt where the fighting is; flankers swing wide around the edges
              const foes = [...(!isAlly(this, PLAYER_T) && player.alive ? [PLAYER_T] : []), ...enemies.filter(o => o !== this && !o.dead && !isAlly(this, o)), ...remoteList.filter(r => !r.dead && !isAlly(this, r))], [bx0, bz0, bx1, bz1] = world.L.bounds, cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
              for (let q = 0; q < 10 && !this.roam; q++) { let x, z;
                if (this.role === 'slayer' && foes.length) { const F = foes[Math.floor(Math.random() * foes.length)]; x = F.pos.x + rand(-14, 14); z = F.pos.z + rand(-14, 14); }
                else { const a = Math.random() * 6.28, k = rand(0.55, 0.85); x = cx + Math.cos(a) * (bx1 - bx0) / 2 * k; z = cz + Math.sin(a) * (bz1 - bz0) / 2 * k; }
                const n = world.nav.nearestSafe(x, 0, z, 8); if (n >= 0) { const [px, py, pz] = world.nav.nodePos(n); if (spreadOK(px, pz)) this.roam = new V3(px, py, pz); } }
              if (this.roam && this.roam.distanceTo(this.pos) < 2) this.roam = null; else if (this.roam) this.roamPost = false; }
            if (!this.roamPost && !(this.roam && this.roam.distanceTo(this.pos) >= 2)) { let n = world.nav.randomNode(); if (Math.random() < 0.35) for (let q = 0; q < 24; q++) { const m = world.nav.randomNode(); if (m >= 0 && world.nav.nodeH[m] > Math.max(2.2, n >= 0 ? world.nav.nodeH[n] : 0)) n = m; } // humans like high ground
            if (n >= 0) { const [x, y, z] = world.nav.nodePos(n); this.roam = new V3(x, y, z); } } } }
          goal = this.holdT > 0 && this.roam && this.pos.distanceTo(this.roam) < 2.5 ? null : this.roam;
        }
        if (goal) {
          this.setGoal(goal, this.pos.distanceTo(goal) > 12); const d = this.followPath(dt); spd = T.speed * (this.run ? 1 : 0.7); wantRun = this.run;
          if (!d && !this.path && this.repathT > 0 && this.pos.distanceTo(goal) >= 2.2) { if (goal === this.roam) this.roam = null; else if (goal === this.investigate) this.investigate = null; } // unreachable spot: pick another
          if (d) { mx = d[0]; mz = d[1]; } else if (this.pos.distanceTo(goal) < 2.2) { // arrived: look around
            if (this.investigate) { this.investigate = null; this.lookT = rand(1.5, 3); this.state = 'hunt'; }
          }
        }
      }
    }
    // separation: never overlap; and squad spacing — teammates spread to ~5 m instead of walking shoulder to shoulder (reads as a clump)
    for (const o of enemies) { if (o === this || o.dead) continue; const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, d2 = ox * ox + oz * oz; if (d2 < 1e-4 || Math.abs(o.pos.y - this.pos.y) > 1.5) continue;
      if (d2 < 1.44) { const d = Math.sqrt(d2); mx += ox / d * (1.2 - d) * 1.6; mz += oz / d * (1.2 - d) * 1.6; } else if (d2 < 25 && this.bot && isAlly(this, o) && this.state !== 'cover') { const d = Math.sqrt(d2); mx += ox / d * (5 - d) / 5 * 0.85; mz += oz / d * (5 - d) / 5 * 0.85; } }
    { const px = this.pos.x - player.pos.x, pz = this.pos.z - player.pos.z, d = Math.hypot(px, pz); if (d < 1.0 && d > 1e-3 && Math.abs(player.pos.y - this.pos.y) < 1.5) { mx += px / d * 1.5; mz += pz / d * 1.5; } }
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    { const want = this.wantCrouch && !this.dead ? 1 : 0; if (want < (this.crouchK || 0) && anyOverlap(this.pos.x, this.pos.y, this.pos.z, this.r * 0.9, 1.82 * this.s)) {} else this.crouchK = damp(this.crouchK || 0, want, 9, dt); this.h = 1.82 * this.s * (1 - 0.36 * this.crouchK); spd *= 1 - 0.5 * this.crouchK; }
    const k = this.onGround ? 10 : 1.5;
    this.vel.x = damp(this.vel.x, mx * spd, k, dt); this.vel.z = damp(this.vel.z, mz * spd, k, dt);
    this.stepSmooth = 0; moveBody(this, dt);
    if (this.pos.y < -10) { this.hp = 0; this.die(false, true); return true; }
    footTick(this, dt, Math.hypot(this.vel.x, this.vel.z), (this.crouchK || 0) > 0.5, this.onGround, !isAlly(PLAYER_T, this));
    this.progT = (this.progT || 0) + dt; // long-window watchdog: wanting to move but getting nowhere
    if (this.progT >= 3) { const pp = this.progP || (this.progP = this.pos.clone()), moved = Math.hypot(this.pos.x - pp.x, this.pos.z - pp.z); this.progT = 0; this.progP.copy(this.pos);
      if (moved < 1.0 && ml > 0.3 && spd > 0 && !this.visible) this.noProg = (this.noProg || 0) + 3; else this.noProg = 0;
      if (this.noProg >= 6) { this.roam = null; this.investigate = null; this.path = null; this.goal = null; this.cover = null; this.lcover = null; this.state = 'hunt'; this.forceRepath = true; }
      if (this.noProg >= 12) { const nav = world.nav, sf = nav.safe; let best = -1, bd = 1e9; if (sf) for (let q = 0; q < sf.length; q += 7) { const [x, y, z] = nav.nodePos(sf[q]); const d = Math.hypot(x - this.pos.x, z - this.pos.z) + Math.abs(y - this.pos.y) * 2; if (d > 0.8 && d < bd) { bd = d; best = sf[q]; } }
        if (best >= 0 && bd < 12) { const [x, y, z] = nav.nodePos(best); this.pos.set(x, y + 0.05, z); this.vel.set(0, 0, 0); } this.noProg = 0; } }
    { const op = this.oscP || (this.oscP = this.pos.clone()); this.oscT = (this.oscT || 0) + dt; this.oscL = (this.oscL || 0) + Math.hypot(this.vel.x, this.vel.z) * dt; // pacing back and forth without getting anywhere
      if (this.oscT >= 12) { if (!this.visible && this.oscL > 12 && Math.hypot(this.pos.x - op.x, this.pos.z - op.z) < 3) { this.roam = null; this.investigate = null; this.path = null; this.goal = null; this.cover = null; this.lcover = null; this.state = 'hunt'; this.forceRepath = true; const n = world.nav.randomNode(); if (n >= 0) { const [x, y, z] = world.nav.nodePos(n); this.roam = new V3(x, y, z); } }
        this.oscT = 0; this.oscL = 0; op.copy(this.pos); } }
    this.stuckT += dt;
    if (this.stuckT > 1.0) { const moved = Math.hypot(this.pos.x - this.lastPos.x, this.pos.z - this.lastPos.z); if (ml > 0.3 && spd > 0 && moved < 0.25) { this.repathT = 0; this.path = null; this.forceRepath = true; this.vel.x += rand(-3, 3); this.vel.z += rand(-3, 3); this.strafe *= -1; if (this.onGround && Math.random() < 0.4) this.vel.y = 6; } this.lastPos.copy(this.pos); this.stuckT = 0; }
    // ---- aim (human-like: limited turn speed, settling error, recoil)
    const hs = Math.hypot(this.vel.x, this.vel.z);
    let dYaw, dPitch;
    if (t && (this.visible || this.lostT < 1.2)) {
      const ap = this.aimPoint(t, _eb, this.headPref), e = this.eye(_ea), lead = 0.08 + (1.2 - this.skill) * 0.05;
      if (t.vel) { ap.x += t.vel.x * lead; ap.z += t.vel.z * lead; }
      dYaw = Math.atan2(ap.x - e.x, ap.z - e.z); dPitch = Math.atan2(ap.y - e.y, Math.hypot(ap.x - e.x, ap.z - e.z));
      if (t.vel) { const lat = Math.abs(t.vel.x * Math.cos(dYaw) - t.vel.z * Math.sin(dYaw)) / Math.max(4, dist); this.errX += rand(-1, 1) * lat * dt * 1.6 / this.skill; }
    } else if (this.lookT > 0) { this.lookT -= dt; if (Math.random() < dt * 1.2) this.lookYaw = this.yaw + rand(-1.6, 1.6); dYaw = this.lookYaw; dPitch = 0; }
    else { dYaw = hs > 0.5 ? Math.atan2(this.vel.x, this.vel.z) : this.aimYaw; dPitch = 0; }
    const maxTurn = (2.2 + 4.2 * this.skill) * dt, dy = angDiff(this.aimYaw, dYaw);
    this.aimYaw += clamp(dy * (1 - Math.exp(-9 * dt)), -maxTurn, maxTurn);
    this.aimPitch = damp(this.aimPitch, dPitch, 8, dt);
    this.errX *= Math.exp(-dt * (1.2 + 2.2 * this.skill)); this.errY *= Math.exp(-dt * (1.2 + 2.2 * this.skill));
    this.errX += rand(-1, 1) * 0.0025; this.errY += rand(-1, 1) * 0.0018;
    this.recoilP *= Math.exp(-dt * (4 + 4 * this.skill));
    this.yaw += angDiff(this.yaw, this.aimYaw) * (1 - Math.exp(-14 * dt));
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z); this.group.rotation.y = this.yaw;
    animChar(this, dt, hs, this.aimPitch + this.recoilP);
    if (this.flashT > 0) { this.flashT -= dt; const f = Math.max(0, this.flashT / 0.12); this.bodyMat.emissive.setRGB(f, f * 0.9, f * 0.9); }
    else if (player.pulseT > 0) { const q = 0.35 + 0.25 * Math.sin(game.time * 6); this.bodyMat.emissive.setRGB(q, q * 0.6, 0); } else this.bodyMat.emissive.setRGB(0, 0, 0);
    if (this.mflash > 0) { this.mflash -= dt; if (this.flash) { this.flash.visible = this.mflash > 0; this.flash.material.rotation = Math.random() * 6; } } else if (this.flash) this.flash.visible = false;
    // ---- shooting
    this.fireT -= dt;
    const onTarget = t && this.visible && Math.abs(angDiff(this.aimYaw, dYaw)) < 0.12;
    const ready = onTarget && this.seeT > T.reaction * (DIFF[settings.difficulty].react || 1) / Math.max(0.6, this.skill) && this.spawnT <= 0 && this.reloadT <= 0 && this.mag > 0 && dist < (this.W.melee ? 3 : 140);
    if (T.sniper) {
      if (this.aimT > 0) { if (!this.visible) { this.aimT = 0; this.laser.visible = false; } else { this.aimT -= dt; this.updateLaser(); if (this.aimT <= 0) { this.laser.visible = false; this.errX *= 0.3; this.errY *= 0.3; this.shoot(dist); this.fireT = rand(2.2, 3.2); } } }
      else if (ready && this.fireT <= 0) { this.aimT = T.aim * (settings.difficulty === 'hard' ? 0.85 : settings.difficulty === 'easy' ? 1.3 : 1); this.laser.visible = true; this.updateLaser(); const sp = spatial(this.pos); sfx.play('charge', { vol: Math.max(0.35, sp.vol), pan: sp.pan }); }
    } else if (ready && this.fireT <= 0) {
      const auto = W.auto && !W.shell;
      if (W.burst) { if (this.burst <= 0) this.burst = W.burst; this.shoot(dist); this.burst--; this.fireT = this.burst > 0 ? 60 / W.burstRpm : 60 / W.rpm + rand(0.05, 0.35) / this.skill; }
      else if (auto) { if (this.burst <= 0) this.burst = dist > 25 ? randi(2, 4) : randi(3, Math.round(4 + 5 * this.skill)); this.shoot(dist); this.burst--; this.fireT = this.burst > 0 ? 60 / W.rpm : rand(0.15, 0.5) * (dist > 25 ? 1.6 : 1); }
      else { this.shoot(dist); this.fireT = 60 / W.rpm + rand(0.06, 0.3) / this.skill; }
    }
    return true;
  }
  startReload() { if (this.reloadT > 0 || this.mag >= this.W.mag) return; if (Math.random() < 0.45) callout('reload', this.pos, this.vpitch); this.reloadT = this.W.reload * rand(1.0, 1.25) * (this.W.shell ? 3 : 1); if (Math.hypot(this.pos.x - player.pos.x, this.pos.z - player.pos.z) < 18) sfx.play('magout', spatial(this.pos)); }
  throwNade(at) {
    this.grenades--; this.nadeCD = rand(8, 14); const from = this.eye(new V3()), tt = 1.15; callout('nade', this.pos, this.vpitch); { const sp = spatial(this.pos); sfx.voice('effort', { pos: sp.pos, vol: sp.vol * 1.4, pitch: this.vpitch || 120 }); }
    const vel = new V3((at.x - from.x) / tt, (at.y + 0.3 - from.y + 0.5 * G * tt * tt) / tt, (at.z - from.z) / tt);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), MAT({ color: 0x3b4a2a, emissive: 0x220000 }));
    mesh.position.copy(from); fx.add(mesh); grenades.push({ pos: from, vel, mesh, t: 2.0, owner: this });
    if (Math.hypot(this.pos.x - player.pos.x, this.pos.z - player.pos.z) < 30) { sfx.play('throw', spatial(this.pos)); if (this.target === PLAYER_T) showHint('GRENADE!', '#ff6b5a'); }
  }
  updateLaser() {
    const g = this.gunPos(_ea), h = playerHead(_eb); h.y -= 0.25; const a = this.laser.geometry.attributes.position.array;
    a[0] = g.x; a[1] = g.y; a[2] = g.z; a[3] = h.x; a[4] = h.y; a[5] = h.z; this.laser.geometry.attributes.position.needsUpdate = true;
    this.laser.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(game.time * (this.aimT < 0.4 ? 40 : 14)));
  }
  shoot(dist) { // fires a real ray along the bot's (imperfect) aim
    const W = this.W, n = W.pellets || 1, moving = Math.hypot(this.vel.x, this.vel.z) > 1.5, o = this.eye(new V3()), muzzle = this.gunPos(new V3());
    const spread = (W.spread + (moving ? W.move * 1.2 : 0) + (this.onGround ? 0 : W.air)) * (W.pellets ? 1 : 0.8);
    let hitP = false, dmgP = 0, headP = false, end = null;
    for (let i = 0; i < n; i++) {
      const yaw = this.aimYaw + this.errX + rand(-spread, spread), pitch = this.aimPitch + this.errY + this.recoilP + rand(-spread, spread) * 0.8;
      const d = _ed.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const hit = raycast(o, d, 300, this.bot || !!this.netId, this, true);
      // the player's hitboxes
      let pt = -1, ph = false;
      if (player.alive && (!MP.active || this.netId) && (this.bot || this.target === PLAYER_T) && !isAlly(this, PLAYER_T)) {
        const P = player.pos, hh = player.h + 0.07;
        const th = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, P.x - 0.2, P.y + hh * 0.8, P.z - 0.2, P.x + 0.2, P.y + hh * 1.02, P.z + 0.2, hit.t);
        if (th >= 0) { pt = th; ph = true; } const tb = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, P.x - 0.33, P.y, P.z - 0.33, P.x + 0.33, P.y + hh * 0.8, P.z + 0.33, pt >= 0 ? pt : hit.t); if (tb >= 0) { pt = tb; ph = false; }
      }
      const range = pt >= 0 ? pt : hit.t, [r0, r1, rmin] = W.range, fall = range <= r0 ? 1 : range >= r1 ? rmin : lerp(1, rmin, (range - r0) / (r1 - r0));
      if (!end) end = o.clone().addScaledVector(d, Math.min(range, 120));
      if (pt >= 0) { hitP = true; headP = headP || ph; dmgP += W.dmg * fall * (ph ? 1.6 : 1) * this.dmgMul; }
      else if (hit.enemy && !isAlly(this, hit.enemy) && (bloodHit(o.clone().addScaledVector(d, hit.t), d, hit.head), true)) hit.enemy.damage(W.dmg * fall * (hit.head ? W.head : 1) * (this.bot ? BOT_DMG[settings.botDiff || 'normal'] : 1), hit.head, { x: d.x * 1.5, z: d.z * 1.5 }, this);
      else if (hit.box && hit.t < 300 && i < 2) { _eo.copy(o).addScaledVector(d, hit.t); if (hit.box.barrel) hit.box.barrel.hit(W.dmg); else if (hit.box.board) hitPane(hit.box.board, W.dmg); else if (Math.random() < 0.6) { impactFx(_eo, hit.nx, hit.ny, hit.nz, hit.box, false); if (Math.random() < 0.5) addDecal(_eo, hit.nx, hit.ny, hit.nz); } }
      // near miss on the player: supersonic crack
      if (!hitP && player.alive && i === 0) { const ph2 = playerHead(_eb), w = _ea.subVectors(ph2, o), proj = w.dot(d); if (proj > 2 && proj < range) { const miss = w.addScaledVector(d, -proj).length(); if (miss < 1.6) sfx.play('whiz', { vol: 0.7, pan: rand(-0.5, 0.5) }); } }
    }
    if (W.pellets || Math.random() < 0.45) spawnTracer(muzzle, end, 0xffc070, 700, W.pellets ? 0.016 : 0.014);
    if (this.netId && MP.active && MP.isHost && end) bcast({ t: 'shot', id: this.netId, a: v3a(muzzle), b: v3a(end), w: W.id });
    this.mflash = 0.06; this.lastFired = game.time; this.protT = 0; this.mag--; this.recoilP += W.kick * rand(0.5, 1) * (1.4 - this.skill * 0.5);
    const sp = spatial(this.pos); sfx.gun(W.snd, { dist: sp.dist, pan: sp.pan, pos: sp.pos, occl: !los(camera.position.x, camera.position.y, camera.position.z, this.pos.x, this.pos.y + 1.4, this.pos.z) });
    if (this.bot) noise(this.pos, 40, this);
    if (hitP) damagePlayer(dmgP, this.pos, this, headP);
  }
  damage(d, head, impulse, attacker) {
    if (this.dead) return false;
    if (this.protT && game.time < this.protT) return false; // fresh spawn
    this.hp -= d; this.flashT = 0.12; this.losT = 0; this.alertT = 5;
    const src = attacker === 'player' || attacker === undefined ? PLAYER_T : attacker instanceof Enemy ? attacker : null;
    if (isAlly(src, this)) { this.hp += d; return false; } // friendly fire is off
    if (src && !this.visible && (this.bot || src === PLAYER_T)) { this.target = src; this.attacker = src; this.lastKnown.copy(src.pos); this.investigate = src.pos.clone(); this.lostT = 0; this.repathT = 0; this.yaw += angDiff(this.yaw, Math.atan2(src.pos.x - this.pos.x, src.pos.z - this.pos.z)) * 0.5; }
    if (impulse) { this.vel.x += impulse.x; this.vel.z += impulse.z; }
    if (this.aimT > 0 && head) this.aimT += 0.35;
    this.errX += rand(-1, 1) * 0.05; this.errY += rand(-0.5, 1) * 0.04; // flinch
    if (this.hp <= 0) { this.die(head, false, src); return true; }
    if (!this.vT || game.time - this.vT > 0.45) { this.vT = game.time; const sp = spatial(this.pos); sfx.voice(d > 30 ? 'hurt' : 'pain', { pos: sp.pos, vol: sp.vol * 1.6, pitch: this.vpitch || (this.vpitch = rand(95, 155)), occl: true }); if (this.hp < this.maxHp * 0.5 && Math.random() < 0.3) callout('hurt', this.pos, this.vpitch); }
    return false;
  }
  die(head, silent, killer) {
    this.dead = true; this.fallDir = Math.random() < 0.5 ? 1 : -1; if (this.flash) this.flash.visible = false;
    if (this.laser) this.laser.visible = false;
    this.bodyMat.emissive.setRGB(0, 0, 0); this.bodyMat.color.multiplyScalar(0.5);
    if (silent) return;
    if (this.netId) { if (this.netId.startsWith('z-')) mpZDied(this, killer, head); else mpBotDied(this, killer, head); }
    if (!head || Math.random() < 0.4) { const sp = spatial(this.pos); sfx.voice('death', { pos: sp.pos, vol: sp.vol * 1.8, pitch: this.vpitch || rand(95, 155) }); }
    if (this.netId) return;
    if (this.bot) botKilled(this, killer, head);
    else onKill(this, head);
  }
}

