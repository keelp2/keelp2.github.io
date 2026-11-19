// ============================================================ HUD
const hud = { vig: 0, hitT: 0, msgT: 0, streakT: 0, hintT: 0, flashT: 0 };
let hudCache = {};
const setText = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).innerHTML = v; } };
function showMsg(h, p, t) { $('msgh').textContent = h; $('msgp').textContent = p || ''; hud.msgT = t; }
function showStreak(t) { $('streak').textContent = t; hud.streakT = 1.6; }
function showHint(t, c) { const el = $('hint'); el.textContent = t; el.style.color = c || '#ffcf6b'; hud.hintT = 1.4; }
function hitMarker(kill, head, kind) { // kind: undefined (bullet) | 'nade' | 'fire' | 'stun'
  const h = $('hit'), cls = kill ? 'kill' : kind === 'stun' ? 'stun' : head ? 'head' : '';
  if (!(hud.hitT > 0 && hud.hitCls === 'kill' && !kill)) { h.className = cls; hud.hitCls = cls; } // a kill marker isn't overwritten by trailing pellets
  hud.hitT = kill ? 0.55 : 0.3; hud.hitDur = hud.hitT; hud.hitPop = kill ? 11 : head ? 8 : 6;
  const now = performance.now();
  if (kill) { sfx.play('hmkill'); hud.hmSnd = now; }
  else if (now - (hud.hmSnd || 0) > 45) { hud.hmSnd = now; sfx.play(kind === 'stun' ? 'hmstun' : head ? 'hmhead' : 'hm'); }
}
function addFeed(html, hs, mine) {
  const f = $('feed'), d = document.createElement('div'); d.innerHTML = html; d.className = (hs ? 'hs' : '') + (mine ? ' me' : ''); f.prepend(d);
  while (f.children.length > 6) f.lastChild.remove();
  setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 450); }, 6000);
}
// killer [WEAPON] (◎ = headshot) victim
const wShort = id => { const w = WEAPONS.find(x => x.id === id); return w ? w.short : id === 'nade' ? 'GRENADE' : ''; };
function hitCap(w, head) { const W = typeof w === 'string' && WEAPONS.find(x => x.id === w); if (!W || W.melee || W.launcher) return 250; return Math.ceil(W.dmg * (W.pellets || 1) * (head ? (W.head || 2) * 1.2 : 1) * 1.1) + 1; }
function killFeed(killer, kc, weapon, head, victim, vc, mine) {
  potgEvent('kill', { k: killer, v: String(victim || '').replace(/\s+\+\d+$/, ''), h: !!head, w: weapon, kc, vc, vn: victim });
  feedLine(killer, kc, weapon, head, victim, vc, mine);
}
function feedLine(killer, kc, weapon, head, victim, vc, mine) {
  const nm = (n, c) => `<span class="fn"${c ? ` style="color:${c}"` : ''}>${esc(n)}</span>`;
  const mid = `<span class="fw">${esc(weapon || '✕')}</span>${head ? '<span class="fh">◎</span>' : ''}`;
  addFeed(killer ? `${nm(killer, kc)} ${mid} ${nm(victim, vc)}` : `${mid} ${nm(victim, vc)}`, head, mine);
}
const dmgDirs = [...document.querySelectorAll('#dirs div')].map(el => ({ el, t: 0, a: 0 })); let dmgI = 0;
function addDmgDir(a) { const d = dmgDirs[dmgI]; dmgI = (dmgI + 1) % dmgDirs.length; d.a = a; d.t = 1.2; }
const radarCtx = $('radar').getContext('2d');
function drawRadar() {
  const g = radarCtx, S = 170, R = 2.2; g.clearRect(0, 0, S, S);
  g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, 7); g.clip();
  g.translate(S / 2, S / 2); g.rotate(player.yaw); g.scale(R / radarImg.RS, R / radarImg.RS);
  g.translate(-(player.pos.x - radarImg.x0) * radarImg.RS, -(player.pos.z - radarImg.z0) * radarImg.RS);
  g.globalAlpha = 0.85; g.drawImage(radarImg.c, 0, 0); g.globalAlpha = 1;
  g.restore();
  g.save(); g.translate(S / 2, S / 2); g.rotate(player.yaw);
  for (const p of pickups) { if (!p.active) continue; g.fillStyle = p.type === 'health' ? '#5dff9a' : '#ffc933'; g.fillRect((p.pos.x - player.pos.x) * R - 2, (p.pos.z - player.pos.z) * R - 2, 4, 4); }
  for (const r of remoteList) {
    if (r.dead) continue; const dx = r.pos.x - player.pos.x, dz = r.pos.z - player.pos.z;
    if (game.time - r.lastFired < 2 || (settings.cls === 'wolf' && Math.hypot(dx, dz) < 20) || player.pulseT > 0 || game.uavT > 0) { g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(dx * R, dz * R, 3.5, 0, 7); g.fill(); }
  }
  for (const e of enemies) {
    if (e.dead) continue; const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz);
    if (isAlly(PLAYER_T, e)) { g.fillStyle = '#4fb4ff'; g.beginPath(); g.arc(dx * R, dz * R, 3.2, 0, 7); g.fill(); continue; }
    if (game.time - e.lastFired < 2 || (settings.cls === 'wolf' && d < 20) || player.pulseT > 0 || game.uavT > 0) /* CoD rules: unsuppressed fire, heartbeat, or UAV (no free proximity / 'he is aiming at you' pings) */ { g.fillStyle = e.T.sniper ? '#ff3030' : '#ff5a4a'; g.beginPath(); g.arc(dx * R, dz * R, e.T.scale > 1.1 ? 4.5 : 3.2, 0, 7); g.fill(); }
  }
  g.restore();
  if (game.uavT > 0) { const a = game.time * 3.2; g.save(); g.translate(S / 2, S / 2); const gr = g.createConicGradient ? g.createConicGradient(a, 0, 0) : null; if (gr) { gr.addColorStop(0, 'rgba(122,196,255,0.45)'); gr.addColorStop(0.12, 'rgba(122,196,255,0)'); gr.addColorStop(1, 'rgba(122,196,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, S / 2, 0, 7); g.fill(); } g.strokeStyle = 'rgba(122,196,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, S / 2 - 2, 0, 7); g.stroke(); g.restore(); }
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(S / 2, S / 2 - 7); g.lineTo(S / 2 + 5, S / 2 + 5); g.lineTo(S / 2, S / 2 + 2); g.lineTo(S / 2 - 5, S / 2 + 5); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(S / 2, S / 2, 12 * R, 0, 7); g.stroke();
}
let fpsAcc = 0, fpsN = 0;
