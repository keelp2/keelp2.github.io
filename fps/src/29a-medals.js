// ============================================================ MEDALS — CoD-style pop-ups for your kills, plus killstreak call-outs in the feed
// Multi-kills (Double → Frenzy), kills in one life (Bloodthirsty 5 → Nuclear 25), and skill medals (Headshot, Longshot,
// Point Blank, Backstab, First Blood, Revenge, Buzzkill). Up to three stack on screen; extra ones queue behind them.
const MEDAL_STYLE = { multi: ['#ff9a3c', 'hex'], life: ['#ff4d4d', 'shield'], skill: ['#5ab8ff', 'circle'], gold: ['#ffcf3a', 'star'] };
const MEDAL_GLYPH = {
  hex: '<path d="M32 4 56 18v28L32 60 8 46V18z"/>', shield: '<path d="M32 4 56 12v18c0 15-10 25-24 30C18 55 8 45 8 30V12z"/>',
  circle: '<circle cx="32" cy="32" r="27"/>', star: '<path d="M32 4l7.6 17.6L58 23l-14 12.6L48.2 54 32 44.6 15.8 54 20 35.6 6 23l18.4-1.4z"/>' };
const MEDAL_MARK = {
  skull: '<path d="M32 17c-8.3 0-14 5.6-14 13 0 4.6 2.2 7.6 5 9.4V45h18v-5.6c2.8-1.8 5-4.8 5-9.4 0-7.4-5.7-13-14-13z" fill="#111"/><circle cx="26.5" cy="31" r="3.2"/><circle cx="37.5" cy="31" r="3.2"/><path d="M27 45v-4M32 45v-4M37 45v-4" stroke="#111" stroke-width="1.8"/>',
  cross: '<circle cx="32" cy="32" r="12" fill="none" stroke="#111" stroke-width="3.2"/><path d="M32 14v10M32 40v10M14 32h10M40 32h10" stroke="#111" stroke-width="3.2"/><circle cx="32" cy="32" r="2.6" fill="#111"/>',
  knife: '<path d="M20 44 42 20l4 2-20 26z" fill="#111"/><path d="M18 46l6-6 3 3-6 6z" fill="#111"/>',
  num: '' };
const MEDALS = { q: [], live: [] };
function medal(name, kind = 'skill', mark = 'cross', num) {
  MEDALS.q.push({ name, kind, mark, num }); if (MEDALS.q.length > 6) MEDALS.q.shift(); }
function medalTick(dt) {
  let box = $('medals'); if (!box) { box = document.createElement('div'); box.id = 'medals'; $('hud').appendChild(box); }
  for (const m of MEDALS.live) m.t += dt;
  while (MEDALS.live.length && MEDALS.live[0].t > 2.3) { const m = MEDALS.live.shift(); m.el.remove(); }
  if (MEDALS.q.length && MEDALS.live.length < 3 && (!MEDALS.live.length || MEDALS.live[MEDALS.live.length - 1].t > 0.28)) {
    const M = MEDALS.q.shift(), [col, shape] = MEDAL_STYLE[M.kind] || MEDAL_STYLE.skill, el = document.createElement('div'); el.className = 'medal';
    el.innerHTML = `<svg viewBox="0 0 64 64"><g fill="${col}" stroke="rgba(0,0,0,.55)" stroke-width="2">${MEDAL_GLYPH[shape]}</g><g fill="#111">${M.num ? `<text x="32" y="41" text-anchor="middle" font-size="24" font-weight="900" font-family="Inter,Arial">${M.num}</text>` : MEDAL_MARK[M.mark] || ''}</g></svg><b>${esc(M.name)}</b>`;
    box.appendChild(el); MEDALS.live.push({ el, t: 0 }); sfx.play('medal');
    if (el.animate) el.animate([{ transform: 'scale(1.9)', opacity: 0, filter: 'brightness(2.4)' }, { transform: 'scale(0.94)', opacity: 1, filter: 'brightness(1.4)', offset: 0.55 }, { transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' }], { duration: 300, easing: 'ease-out' }); }
  for (const m of MEDALS.live) { const k = m.t > 1.9 ? 1 - (m.t - 1.9) / 0.4 : 1; m.el.style.opacity = clamp(k, 0, 1); }
}
const MULTI = [, , 'DOUBLE KILL', 'TRIPLE KILL', 'FURY KILL', 'FRENZY KILL', 'SUPER KILL', 'MEGA KILL', 'ULTRA KILL', 'KILL CHAIN'];
const LIFE = { 5: 'BLOODTHIRSTY', 10: 'MERCILESS', 15: 'RUTHLESS', 20: 'RELENTLESS', 25: 'NUCLEAR' };
/* call on every kill YOU make. o = { head, dist, melee, back, victimKey, victimStreak, ks } */
function killMedals(o) {
  const st = game.streak || 1; if (st >= 2) medal(MULTI[Math.min(st, 9)], 'multi', null, st);
  game.lifeK = (game.lifeK || 0) + 1; if (LIFE[game.lifeK]) { medal(LIFE[game.lifeK], 'life', 'skull', game.lifeK); feedStreak('You', game.lifeK, true); }
  if (!game.firstBlood) { game.firstBlood = true; medal('FIRST BLOOD', 'gold', 'skull'); }
  if (o.victimKey && game.nemesis && o.victimKey === game.nemesis) { game.nemesis = null; medal('REVENGE', 'gold', 'skull'); }
  if (o.victimStreak >= 5) { medal('BUZZKILL', 'gold', 'skull'); }
  if (o.ks) return; /* killstreak kills: no weapon-skill medals */
  if (o.back) medal('BACKSTAB', 'skill', 'knife'); else if (o.melee) medal('MELEE KILL', 'skill', 'knife');
  if (o.head && !o.melee) medal('HEADSHOT', 'skill', 'cross');
  if (o.dist > 45 && !o.melee) medal('LONGSHOT', 'skill', 'cross'); else if (o.dist < 3.5 && !o.melee) medal('POINT BLANK', 'skill', 'cross');
}
/* anyone's streak: a feed line at 5, 10, 15 ... like CoD's "is on a killstreak" */
function feedStreak(name, n, mine) { if (n >= 5 && n % 5 === 0) addFeed(`<span class="fn">${esc(name)}</span> <span class="fks2">${mine ? 'are' : 'is'} on a ${n} killstreak</span>`, false, mine); }
function feedEnded(killer, victim, n, mine) { if (n >= 5) addFeed(`<span class="fn">${esc(killer)}</span> <span class="fks2">ended</span> <span class="fn">${esc(victim)}</span><span class="fks2">'s ${n} killstreak</span>`, false, mine); }
