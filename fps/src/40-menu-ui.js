// ============================================================ MENU UI
function renderBest() {
  let b = 0; try { b = +localStorage.getItem('bp_best_' + settings.map + '_' + settings.difficulty) || 0; } catch (e) {}
  $('best').textContent = b ? `Best on ${MAPS[settings.map].name} (${{ easy: 'Recruit', normal: 'Veteran', hard: 'Elite' }[settings.difficulty]}): ${b}` : '';
}
function initUI() {
  const maps = $('maps');
  MAPS.forEach((m, i) => {
    const b = document.createElement('button'); b.className = 'card' + (i === settings.map ? ' on' : '');
    b.innerHTML = `<b>${m.name}</b><em>${m.tag}</em>`; b.onmouseenter = b.onfocus = () => mapInfo(i); b.onmouseleave = () => mapInfo();
    b.onclick = () => { settings.map = i; saveSettings(); mapInfo(); [...maps.children].forEach((c, k) => c.classList.toggle('on', k === i)); loadMap(i); world.shadows = QUALITY[settings.quality].shadows; renderBest(); };
    maps.appendChild(b);
  });
  const diff = $('diff');
  const setD = () => [...diff.children].forEach(c => c.classList.toggle('on', c.dataset.v === settings.difficulty));
  diff.onclick = e => { if (e.target.dataset.v) { settings.difficulty = e.target.dataset.v; saveSettings(); setD(); renderBest(); } }; setD();
  const bind = (id, key, fmt, cb) => { const el = $(id); el.value = settings[key]; const upd = () => { settings[key] = el.type === 'range' ? +el.value : el.value; if ($(id + 'v')) $(id + 'v').textContent = fmt(settings[key]); saveSettings(); cb && cb(); }; el.oninput = upd; el.onchange = upd; if ($(id + 'v')) $(id + 'v').textContent = fmt(settings[key]); };
  bind('sens', 'sens', v => v.toFixed(2)); bind('fov', 'fov', v => v + '°');
  $('mus').value = settings.music; $('musv').textContent = Math.round(settings.music * 100) + '%';
  $('mus').oninput = () => { settings.music = +$('mus').value; $('musv').textContent = Math.round(settings.music * 100) + '%'; sfx.setMusic(settings.music); saveSettings(); };
  $('vol').value = settings.volume; $('volv').textContent = Math.round(settings.volume * 100) + '%';
  $('vol').oninput = () => { settings.volume = +$('vol').value; $('volv').textContent = Math.round(settings.volume * 100) + '%'; sfx.setVol(settings.volume); saveSettings(); };
  $('quality').value = settings.quality;
  $('quality').onchange = () => { settings.quality = $('quality').value; saveSettings(); location.reload(); }; // materials & renderer are built for one tier
  $('play').onclick = () => deploy('SURVIVAL · ' + { easy: 'RECRUIT', normal: 'VETERAN', hard: 'ELITE' }[settings.difficulty], startGame);
  $('botMode').addEventListener('change', () => setTimeout(botOpts, 0));
  $('mpbtn').onclick = openMpScreen;
  $('botbtn').onclick = () => deploy(settings.botMode === 'tdm' ? 'TEAM DEATHMATCH · ' + ((+settings.bots + 1) / 2) + ' VS ' + ((+settings.bots + 1) / 2) : 'FREE-FOR-ALL · ' + (+settings.bots + 1) + ' PLAYERS', startBotMatch);
  // ---- tabs
  const tabs = [...document.querySelectorAll('#mtabs button')];
  const showTab = name => { tabs.forEach(t => t.classList.toggle('on', t.dataset.tab === name)); document.querySelectorAll('.mtab').forEach(s => s.classList.toggle('on', s.dataset.tab === name));
    const slot = document.querySelector(`.pvslot[data-pv="${name}"]`); if (slot && $('pvbox').parentNode !== slot) slot.appendChild($('pvbox')); menuTab = name; if (gp.focus) gpFocus(tabs.find(t => t.dataset.tab === name)); sfx.play('switch'); };
  tabs.forEach(t => t.onclick = () => showTab(t.dataset.tab)); window.menuShowTab = showTab;
  window.menuCycleTab = d => { const i = tabs.findIndex(t => t.dataset.tab === menuTab); showTab(tabs[(i + d + tabs.length) % tabs.length].dataset.tab); };
  document.querySelectorAll('#menu select, #pause select, #mp select').forEach(spinify);
  customs(); $('psetBtn').onclick = () => pauseSettings(true); $('psetBack').onclick = () => pauseSettings(false);
  if (cloudCfg()) cloudInit();
  renderCareer(); renderRank(); mapInfo(); menuRefresh(); $('mclass').textContent = cls().name + ' · ' + WEAPONS[widx(getLO().primary)].short;
  const botOpts = () => { const tdm = settings.botMode === 'tdm', el = $('bots'), lim = $('botLimit'), cur = +settings.bots || (tdm ? 7 : 5);
    el.innerHTML = (tdm ? [2, 3, 4, 5, 6].map(n => `<option value="${2 * n - 1}">${n} vs ${n}</option>`) : [4, 6, 8, 10, 12].map(n => `<option value="${n - 1}">${n} players</option>`)).join('');
    el.value = String(cur); if (el.selectedIndex < 0) { el.selectedIndex = 1; } settings.bots = +el.value;
    lim.innerHTML = (tdm ? [25, 50, 75, 100, 150] : [10, 20, 30, 50, 75]).map(n => `<option value="${n}">${n} kills</option>`).join(''); lim.value = String(tdm ? settings.botLimitT || 50 : settings.botLimitF || 30);
    const desc = () => { const n = +settings.bots, d = $('botDesc'); if (!d) return; d.textContent = tdm ? `You + ${(n - 1) / 2} bot teammate${(n - 1) / 2 === 1 ? '' : 's'} vs ${(n + 1) / 2} enemy bots` : `You vs ${n} bots · every player for themselves`; };
    el.onchange = () => { settings.bots = +el.value; saveSettings(); desc(); }; desc();
    if (window.spinify) window.spinify(el), window.spinify(lim); lim.onchange = () => { if (tdm) settings.botLimitT = +lim.value; else settings.botLimitF = +lim.value; saveSettings(); }; };
  botOpts(); $('botTime').value = String(settings.botTime === undefined ? 600 : settings.botTime); $('botTime').onchange = () => { settings.botTime = +$('botTime').value; saveSettings(); };
  $('health').value = settings.health; $('health').onchange = () => { settings.health = $('health').value; saveSettings(); };
  for (const [id, key, def] of [['botDiff', 'botDiff', 'normal'], ['botMode', 'botMode', 'ffa']]) { const el = $(id); el.value = settings[key] || def; el.onchange = () => { settings[key] = id === 'bots' ? +el.value : el.value; saveSettings(); }; }
  botOpts(); setTimeout(syncSpins, 0); // labels must match the saved values
  renderLoadout($('loadout'));
  const cl = $('classes');
  const renderClasses = window.renderClassesUI = () => { cl.innerHTML = ''; for (const k in CLASSES) { const C = CLASSES[k]; const b = document.createElement('button'); b.className = 'wcard cls' + (settings.cls === k ? ' on' : '');
    b.innerHTML = `<b>${C.name}</b><span>${C.desc}</span><em>${C.hp} HP · ${C.passive}</em><em class="ab">[E] ${C.ability}: ${C.abDesc} · ${C.cd}s</em>`;
    if (THUMBS['cls_' + k]) b.insertAdjacentHTML('afterbegin', `<img class="thumb tall" src="${THUMBS['cls_' + k]}" alt="">`);
    b.onclick = () => { const L = customs()[settings.activeLO]; L.cls = k; applyCustom(settings.activeLO); renderClasses(); sendInfo(); renderLoadout($('loadout')); PV.mode = 'char'; PV.weapon = null; buildPreview(); }; cl.appendChild(b); } };
  renderClasses();
  $('armback').onclick = resumeGame;
  $('resume').onclick = resumeGame;
  $('restart').onclick = () => { if (game.mode === 'botdm') return startBotMatch(); resetRun(); resumeGame(); };
  $('quit').onclick = toMenu;
  $('retry').onclick = startGame;
  $('tomenu').onclick = toMenu;
  renderBest();
}

