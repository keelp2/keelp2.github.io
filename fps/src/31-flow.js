// ============================================================ FLOW
function showScreen(id) { for (const s of ['menu', 'pause', 'over', 'armory', 'mp', 'mpover']) $(s).classList.toggle('on', s === id); $('hud').classList.toggle('on', id === null || id === 'pause'); if (id) setTimeout(syncSpins, 0); }
function survivalStart() { // MW3-style: pistol + knife, one frag, $500 — everything else is bought on the map
  SURV.cash = 500; SURV.eq = { lethal: 'frag', tactical: 'flash' }; closeBuy();
  const pi = widx('pistol'), kn = widx('knife') >= 0 ? widx('knife') : carry[2]; carry = [pi, pi, kn]; inv[pi] = { mag: WEAPONS[pi].mag, res: WEAPONS[pi].res }; rebuildViewmodels(); renderSlots();
  Object.assign(wst, { cur: pi, last: pi }); vmModels.forEach((m, i) => m.g.visible = i === pi); player.grenades = 1; player.tacticals = 0; placeArmories();
}
function startGame() {
  sfx.init(); music.stop(); resize(); if (MP.peer) { sayBye(); mpCleanup(); }
  if (!world || world.def !== MAPS[settings.map] || world.shadows !== QUALITY[settings.quality].shadows) { loadMap(settings.map); world.shadows = QUALITY[settings.quality].shadows; }
  resetRun(); survivalStart(); game.state = 'play'; showScreen(null); camera.fov = settings.fov; requestLock();
  startIntro('SURVIVAL · ' + { easy: 'RECRUIT', normal: 'VETERAN', hard: 'ELITE' }[settings.difficulty], 'Start with a pistol. Earn cash, buy guns and gear at the armories.');
}
function pauseGame() { if (game.state !== 'play') return; if (game.intro) { game.intro.t = game.intro.dur; updateIntro(0); } game.state = 'paused'; showScreen('pause'); renderPauseClasses(); pauseSettings(false); $('ptitle').textContent = MP.active ? 'MATCH IN PROGRESS' : 'PAUSED'; $('resume').textContent = MP.active ? 'BACK TO MATCH' : 'RESUME'; $('ponline').style.display = MP.active ? 'block' : 'none'; mouseL = mouseR = false; for (const k in keys) keys[k] = false; $('restart').style.display = MP.active ? 'none' : 'block'; $('quit').textContent = MP.active ? 'LEAVE MATCH' : 'QUIT TO MENU'; }
function renderPauseClasses() {
  const el = $('pcls'); if (!el) return; el.innerHTML = ''; const cur = settings.pendingLO !== undefined && settings.pendingLO !== null ? settings.pendingLO : settings.activeLO;
  customs().forEach((L, i) => { const b = document.createElement('button'); b.className = 'wcard cls lochoose' + (i === cur ? ' on' : ''); b.innerHTML = `<b>${loName(i)}</b>`; b.onclick = () => changeLoadout(i); el.appendChild(b); });
  $('pclsnote').textContent = game.mode === 'survival' && !MP.active ? 'Survival: class changes apply during the break between waves.' : 'Your new class takes effect next time you spawn.';
}
function changeLoadout(i) {
  const now = game.mode === 'survival' && !MP.active && game.phase === 'inter' && player.alive;
  if (now || i === settings.activeLO) { settings.pendingLO = null; if (i !== settings.activeLO || now) { applyCustom(i); applyClassNow(); } }
  else { settings.pendingLO = i; showHint(customs()[i].name + ' — ON NEXT SPAWN', '#ffcf6b'); }
  saveSettings(); renderPauseClasses();
}
function changeClass(k) {
  if (!CLASSES[k]) return; const now = game.mode === 'survival' && !MP.active && game.phase === 'inter' && player.alive;
  if (now || k === settings.cls) { settings.pendingCls = null; if (k !== settings.cls) { settings.cls = k; applyClassNow(); } }
  else { settings.pendingCls = k; showHint(CLASSES[k].name + ' — ON NEXT SPAWN', '#ffcf6b'); }
  saveSettings(); renderPauseClasses();
}
function applyClassNow() { const C = cls(); player.abilityCD = 0; player.grenades = Math.min(player.grenades, C.nadeMax); setGloves(); applyLoadoutMidRun(); refreshAvatar(); if (MP.active) sendInfo(); showHint(C.name + ' DEPLOYED', '#5dff9a'); }
function applyPendingClass() { if (settings.pendingLO !== undefined && settings.pendingLO !== null) { applyCustom(settings.pendingLO); settings.pendingLO = null; saveSettings(); applyLoadoutMidRun(); refreshAvatar(); if (MP.active) sendInfo(); return; } if (settings.pendingCls && CLASSES[settings.pendingCls]) { settings.cls = settings.pendingCls; settings.pendingCls = null; saveSettings(); applyLoadoutMidRun(); refreshAvatar(); if (MP.active) sendInfo(); } }
function pauseSettings(open) { // borrow the settings panels from the main menu while paused
  const sg = document.querySelector('.sgroups'), host = $('psettings'), home = document.querySelector('.mtab[data-tab="settings"]'); if (!sg || !host || !home) return;
  if (open) { host.appendChild(sg); host.style.display = 'block'; $('pmain').style.display = 'none'; const q = $('quality').closest('label'); if (q) q.style.display = 'none'; }
  else { home.appendChild(sg); host.style.display = 'none'; $('pmain').style.display = 'block'; const q = $('quality').closest('label'); if (q) q.style.display = ''; }
}
function resumeGame() { pauseSettings(false); game.state = 'play'; showScreen(null); requestLock(); }
function renderSlots() { $('slots').innerHTML = carry.map((wi, k) => `<div data-w="${wi}">${k + 1} ${WEAPONS[wi].short}</div>`).join(''); }
function rebuildViewmodels() { // apply attachments and rebuild the weapons the player carries
  WEAPONS.forEach(applyAttachments);
  for (const i of carry) { const old = vmModels[i]; if (old) vmRoot.remove(old.g); vmModels[i] = makeGun(WEAPONS[i]); }
  vmModels.forEach((m, i) => { if (m) m.g.visible = i === wst.cur; });
}
function renderInventory() {
  $('invlist').innerHTML = (MP.active ? scoreTable(Object.entries(MP.players).sort((a, b) => b[1].kills - a[1].kills)) : game.mode === 'botdm' ? botBoard() : '') + carry.map((wi, k) => { const w = WEAPONS[wi], s = inv[wi];
    return `<div class="invrow${wi === wst.cur ? ' on' : ''}"><kbd>${k + 1}</kbd><div><b>${w.name}</b><small>${['PRIMARY', 'SECONDARY', 'MELEE'][k]} · ${w.desc}</small></div><span>${w.melee ? '—' : s.mag + ' / ' + (isFinite(s.res) ? s.res : '∞')}</span></div>`; }).join('')
    + `<div class="invrow"><kbd>E</kbd><div><b>${cls().name} · ${cls().ability}</b><small>${cls().abDesc} · ${cls().passive}</small></div><span>${player.abilityCD > 0 ? Math.ceil(player.abilityCD) + 's' : 'READY'}</span></div>`
    + `<div class="invrow"><kbd>G</kbd><div><b>FRAG GRENADE</b><small>2s fuse · bounces · damages you too</small></div><span>${player.grenades} / ${cls().nadeMax}</span></div>`;
}
function statBars(w) {
  const rows = [['DAMAGE', w.dmg * (w.pellets || 1) / 110], ['FIRE RATE', w.rpm / 900], ['RANGE', w.range[1] / 140], ['CONTROL', 1 - clamp(w.kick / 0.06, 0, 0.9)], ['HANDLING', 1 - (w.swap - 0.22) / 0.3]];
  return rows.map(([n, v]) => `<div class="bar"><small>${n}</small><i><u style="width:${Math.round(clamp(v, 0.06, 1) * 100)}%"></u></i></div>`).join('');
}
const CAT_ORDER = ['AR', 'SMG', 'LMG', 'SHOTGUN', 'MARKSMAN', 'SNIPER', 'PISTOL', 'LAUNCHER', 'MELEE'];
const CAT_NAMES = { AR: 'ASSAULT RIFLES', SMG: 'SUBMACHINE GUNS', LMG: 'LIGHT MACHINE GUNS', SHOTGUN: 'SHOTGUNS', MARKSMAN: 'MARKSMAN RIFLES', SNIPER: 'SNIPER RIFLES', PISTOL: 'HANDGUNS', LAUNCHER: 'LAUNCHERS', MELEE: 'MELEE' };
let LO_SLOT = 'primary', LO_CAT = 'ALL';
function refreshMenuChar() { if (window.renderClassesUI) window.renderClassesUI(); if (typeof sendInfo === 'function' && MP.peer) sendInfo(); PV.mode = 'char'; PV.weapon = null; buildPreview(); const mc = $('mclass'); if (mc) mc.textContent = cls().name + ' · ' + WEAPONS[widx(getLO().primary)].short; }
function renderLoadout(el, onChange) {
  el.innerHTML = ''; el.classList.add('lopick'); const lo = getLO(), mk = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };
  const SLOTS = [['primary', 'PRIMARY', '1'], ['secondary', 'SECONDARY', '2'], ['melee', 'MELEE', '3 / V'], ['lethal', 'LETHAL', 'G'], ['tactical', 'TACTICAL', 'Q']], isW = k => k === 'primary' || k === 'secondary' || k === 'melee';
  const left = mk('div', 'loslots'), tabs = mk('div', 'lotabs');
  customs().forEach((L, i) => { const b = mk('button', 'lotab' + (settings.activeLO === i ? ' on' : '')); b.textContent = i + 1; b.title = L.name; b.onclick = () => { applyCustom(i); LO_SLOT = 'primary'; renderLoadout(el, onChange); onChange && onChange(); refreshMenuChar(); }; tabs.appendChild(b); });
  left.appendChild(tabs); const nm = mk('button', 'loname'); nm.innerHTML = `<b>${esc(customs()[settings.activeLO].name)}</b><small>✎ rename</small>`; nm.onclick = () => { const v = prompt('Loadout name', customs()[settings.activeLO].name); if (v) { customs()[settings.activeLO].name = v.slice(0, 18).toUpperCase(); saveSettings(); renderLoadout(el, onChange); } }; left.appendChild(nm);
  { const C = cls(), b = mk('button', 'loslot' + (LO_SLOT === 'operator' ? ' on' : '')); b.innerHTML = `<small>OPERATOR</small><b>${C.name}</b>` + (THUMBS['cls_' + settings.cls] ? `<img src="${THUMBS['cls_' + settings.cls]}" alt="">` : ''); b.onclick = () => { LO_SLOT = 'operator'; renderLoadout(el, onChange); }; left.appendChild(b); }
  for (const [k, label, key] of SLOTS) { const it = isW(k) ? WEAPONS[widx(lo[k])] : EQUIP[lo[k]], b = mk('button', 'loslot' + (LO_SLOT === k ? ' on' : ''));
    b.innerHTML = `<small>${label} <kbd>${key}</kbd></small><b>${it.name}</b>` + (isW(k) && THUMBS[it.id] ? `<img src="${THUMBS[it.id]}" alt="">` : '');
    b.onclick = () => { LO_SLOT = k; LO_CAT = 'ALL'; renderLoadout(el, onChange); if (isW(k)) previewSelect(lo[k]); }; b.onmouseenter = b.onfocus = () => { if (isW(k)) previewSelect(lo[k]); }; left.appendChild(b); }
  const right = mk('div', 'lochoices');
  if (LO_SLOT === 'operator') { const grid = mk('div', 'wcards');
    for (const k in CLASSES) { const C = CLASSES[k], b = mk('button', 'wcard cls' + (settings.cls === k ? ' on' : '')); b.innerHTML = (THUMBS['cls_' + k] ? `<img class="thumb" src="${THUMBS['cls_' + k]}" alt="">` : '') + `<b>${C.name}</b><span>${C.desc}</span><em>${C.passive}</em><em class="ab">[E] ${C.ability}: ${C.abDesc}</em>`;
      b.onclick = () => { const L = customs()[settings.activeLO]; L.cls = k; applyCustom(settings.activeLO); renderLoadout(el, onChange); onChange && onChange(); refreshMenuChar(); }; grid.appendChild(b); }
    right.appendChild(grid);
  } else if (isW(LO_SLOT)) {
    const all = WEAPONS.filter(w => w.slot === LO_SLOT).sort((a, b) => CAT_ORDER.indexOf(a.cat || 'MELEE') - CAT_ORDER.indexOf(b.cat || 'MELEE')), cats = [...new Set(all.map(w => w.cat || 'MELEE'))];
    if (cats.length > 1) { const chips = mk('div', 'chips'); for (const c of ['ALL'].concat(cats)) { const b = mk('button', LO_CAT === c ? 'on' : ''); b.textContent = c === 'ALL' ? 'ALL' : CAT_NAMES[c]; b.onclick = () => { LO_CAT = c; renderLoadout(el, onChange); }; chips.appendChild(b); } right.appendChild(chips); }
    const grid = mk('div', 'wcards');
    for (const w of all.filter(w => LO_CAT === 'ALL' || (w.cat || 'MELEE') === LO_CAT)) {
      const lk = !isUnlocked(w.id), b = mk('button', 'wcard' + (lo[LO_SLOT] === w.id ? ' on' : '') + (lk ? ' locked' : '')); b.dataset.w = w.id;
      b.innerHTML = (THUMBS[w.id] ? `<img class="thumb" src="${THUMBS[w.id]}" alt="">` : '<div class="thumb"></div>') + `<b>${w.name}</b><span>${w.desc}</span>` + (w.melee ? `<em>${w.dmg} damage · ${w.backstab} backstab · reach ${w.reach}m</em>` : `${statBars(w)}<em>${w.mag} rounds · ${w.launcher ? 'rocket' : w.auto && !w.shell ? 'full-auto' : w.shell ? 'pump / semi' : w.bolt ? 'bolt-action' : 'semi-auto'}</em>`);
      if (lk) b.insertAdjacentHTML('beforeend', `<i class="lock">🔒 LEVEL ${unlockLvl(w.id)}</i>`);
      b.onclick = () => { if (lk) { sfx.play('hit'); showMenuToast(`${w.name} unlocks at level ${unlockLvl(w.id)}`); previewSelect(w.id); return; } setLO(LO_SLOT, w.id); renderLoadout(el, onChange); onChange && onChange(); previewSelect(w.id); }; b.onmouseenter = () => previewSelect(w.id); grid.appendChild(b); }
    right.appendChild(grid);
    const sel = WEAPONS[widx(lo[LO_SLOT])], kinds = [['optic', ATT_OPTS.optic[sel.id] || []], ['muzzle', ATT_OPTS.muzzle[sel.id] ? ['none', 'supp', 'comp'] : []], ['mag', ATT_OPTS.mag[sel.id] ? ['std', 'ext'] : []]].filter(k => k[1].length > 1);
    if (kinds.length) { const ab = mk('div', 'attrow'); ab.innerHTML = `<small>${sel.short} ATTACHMENTS</small>`;
      for (const [kind, opts] of kinds) { const cur = (settings.att[sel.id] || {})[kind] || opts[0], grp = mk('div', 'seg sm');
        for (const o of opts) { const bt = mk('button', o === cur ? 'on' : ''); bt.textContent = ATT_NAMES[o]; bt.onclick = () => { settings.att[sel.id] = Object.assign({}, settings.att[sel.id], { [kind]: o }); saveSettings(); applyAttachments(sel); renderLoadout(el, onChange); onChange && onChange(); previewSelect(sel.id, true); }; grp.appendChild(bt); }
        ab.appendChild(grp); } right.appendChild(ab); }
  } else { const grid = mk('div', 'wcards');
    for (const id in EQUIP) { const E = EQUIP[id]; if (E.slot !== LO_SLOT) continue; const lk = !isUnlocked(id), b = mk('button', 'wcard' + (lo[LO_SLOT] === id ? ' on' : '') + (lk ? ' locked' : '')); b.innerHTML = `<b>${E.name}</b><span>${E.desc}</span>` + (lk ? `<i class="lock">🔒 LEVEL ${unlockLvl(id)}</i>` : ''); b.onclick = () => { if (lk) { sfx.play('hit'); showMenuToast(`${E.name} unlocks at level ${unlockLvl(id)}`); return; } setLO(LO_SLOT, id); renderLoadout(el, onChange); onChange && onChange(); }; grid.appendChild(b); }
    right.appendChild(grid); }
  el.appendChild(left); el.appendChild(right);
}
function applyLoadoutMidRun() {
  const nc = loadoutIdx();
  carry = nc; rebuildViewmodels(); nc.forEach(i => { inv[i] = { mag: WEAPONS[i].mag, res: WEAPONS[i].res }; });
  wst.cur = carry[0]; wst.last = carry[1]; wst.reloading = false; wst.switchT = WEAPONS[carry[0]].swap;
  vmModels.forEach((m, i) => { if (m) { m.g.visible = i === wst.cur; m.flash.visible = false; } }); renderSlots(); hudCache = {}; refreshAvatar();
}
function openArmory() {
  if (survOn()) { showHint('FIND AN ARMORY ON THE MAP', '#ffcf6b'); return; }
  if (MP.active || game.mode === 'botdm') { showHint('ARMORY: SURVIVAL ONLY — CHANGE LOADOUT IN THE LOBBY', '#ff6b5a'); return; }
  if (game.state !== 'play' || game.phase !== 'inter' || !player.alive) { if (game.state === 'play') showHint('ARMORY OPENS BETWEEN WAVES', '#ff6b5a'); return; }
  game.state = 'armory'; mouseL = mouseR = false; for (const k in keys) keys[k] = false;
  if (document.pointerLockElement) document.exitPointerLock();
  renderLoadout($('armlist'), applyLoadoutMidRun); showScreen('armory');
}
function toMenu() { setTimeout(() => { if (game.state === 'menu') music.play('title'); }, 50); $('ping').style.display = 'none'; if (MP.active) { sayBye(); mpCleanup(); clearRemotes(); } game.state = 'menu'; showScreen('menu'); if (document.pointerLockElement) document.exitPointerLock(); renderBest(); }
function die() {
  if (MP.active) return mpDie();
  if (game.mode === 'botdm') return botPlayerDie();
  player.alive = false; sfx.voice('death', { self: true, pitch: settings.vpitch || 120, vol: 0.8 }); game.state = 'dying'; game.dieT = 1.6; mouseL = mouseR = false; wst.reloading = false;
  showMsg('YOU DIED', '', 1.5);
}
function finishDeath() {
  game.state = 'over'; music.play('lose'); if (document.pointerLockElement) document.exitPointerLock();
  $('overmap').textContent = world.def.name + ' · ' + { easy: 'RECRUIT', normal: 'VETERAN', hard: 'ELITE' }[settings.difficulty];
  $('s_score').textContent = game.score; $('s_wave').textContent = game.wave; $('s_kills').textContent = game.kills; $('s_hs').textContent = game.heads;
  $('s_acc').textContent = (game.shots ? Math.round(game.hits / game.shots * 100) : 0) + '%';
  const t = Math.floor(game.runTime); $('s_time').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); statEnd('SURVIVAL', 'run', 1);
  const key = 'bp_best_' + settings.map + '_' + settings.difficulty; let best = 0; try { best = +localStorage.getItem(key) || 0; } catch (e) {}
  if (game.score > best) { try { localStorage.setItem(key, game.score); } catch (e) {} $('newbest').textContent = 'NEW BEST SCORE'; } else $('newbest').textContent = 'BEST: ' + best;
  showScreen('over');
}

