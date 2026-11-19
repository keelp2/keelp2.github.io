// ============================================================ GAME STATE
// ---- career stats (saved in this browser)
const BUCKET = () => ({ matches: 0, wins: 0, losses: 0, draws: 0, kills: 0, deaths: 0, heads: 0, shots: 0, hits: 0 });
const STATS = (() => { let d = null; try { d = JSON.parse(localStorage.getItem('bp_stats') || 'null'); } catch (e) {}
  d = d || {}; if (!d.pvp) { const ai = BUCKET(); for (const k in ai) if (typeof d[k] === 'number') ai[k] = d[k]; d = { ai, pvp: BUCKET(), time: d.time || 0, bestStreak: d.bestStreak || 0, bestWave: d.bestWave || 0, bestScore: d.bestScore || 0, runs: d.runs || 0, weapons: d.weapons || {}, recent: d.recent || [], xp: d.xp || 0 }; } // migrate: old totals were all vs bots
  return Object.assign({ ai: BUCKET(), pvp: BUCKET(), time: 0, bestStreak: 0, bestWave: 0, bestScore: 0, runs: 0, weapons: {}, recent: [], xp: 0 }, d, { ai: Object.assign(BUCKET(), d.ai), pvp: Object.assign(BUCKET(), d.pvp) }); })();
const saveStats = () => { try { localStorage.setItem('bp_stats', JSON.stringify(STATS)); } catch (e) {} cloudQueue(); };
const freshStats = () => ({ ai: BUCKET(), pvp: BUCKET(), time: 0, bestStreak: 0, bestWave: 0, bestScore: 0, runs: 0, weapons: {}, recent: [], xp: 0, xpv: 2 });
function replaceStats(d) { d = d || {}; for (const k of Object.keys(STATS)) delete STATS[k]; Object.assign(STATS, freshStats(), d, { ai: Object.assign(BUCKET(), d.ai), pvp: Object.assign(BUCKET(), d.pvp), weapons: d.weapons || {}, recent: Array.isArray(d.recent) ? d.recent : [] }); STATS.xpv = 2; try { localStorage.setItem('bp_stats', JSON.stringify(STATS)); } catch (e) {} }
// ---- PLAYER PROFILE: a permanent identity (like a Battle.net / Activision ID). Rename freely; the #TAG stays, so people
// still know it's you. Lives in this browser as a guest; signing in (Supabase) links it to an account on every device.
const PROFILE = (() => { let p = null; try { p = JSON.parse(localStorage.getItem('bp_profile') || 'null'); } catch (e) {}
  if (!p || !/^[0-9a-f]{32}$/.test(p.id || '')) { const a = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256 | 0);
    const id = [...a].map(b => b.toString(16).padStart(2, '0')).join(''); p = { id, tag: id.slice(0, 4).toUpperCase(), created: Date.now() }; }
  try { localStorage.setItem('bp_profile', JSON.stringify(p)); } catch (e) {} return p; })();
const saveProfile = () => { try { localStorage.setItem('bp_profile', JSON.stringify(PROFILE)); } catch (e) {} };
const cleanTag = t => /^[0-9A-F]{4}$/.test(String(t || '')) ? String(t) : '';
const wstat = id => STATS.weapons[id] || (STATS.weapons[id] = { kills: 0, shots: 0, hits: 0 });
// Level curve: L2 after about one match; every unlock (L22) takes ~60 bot matches or ~20-25 online matches.
const xpNeed = l => 1500 + (l - 1) * 300;
const lvlOf = xp => { let l = 1, need = xpNeed(1); while (xp >= need && l < 150) { xp -= need; l++; need = xpNeed(l); } return { l, cur: xp, need }; };
{ if (STATS.xpv !== 2) { // keep everyone's level when the curve changed: same level, same progress through it
  let xp = STATS.xp || 0, l = 1, need = 1000; while (xp >= need && l < 150) { xp -= need; l++; need = 1000 + (l - 1) * 200; }
  let cum = 0; for (let k = 1; k < l; k++) cum += xpNeed(k); STATS.xp = cum + Math.round(xp / need * xpNeed(l)); STATS.xpv = 2; saveStats(); } }
// kill XP by victim: a real player is worth the most; bots and survival enemies (which come in waves of dozens) far less
const KILL_XP = { pvp: [100, 50], bot: [50, 25], ai: [15, 10] };
function statKill(head, kind = 'ai') { const id = game.lastNadeKill ? 'nade' : WEAPONS[wst.cur].id; wstat(id).kills++; STATS.bestStreak = Math.max(STATS.bestStreak, game.streak || 1); const [b, h] = KILL_XP[kind] || KILL_XP.ai; gainXP(b + (head ? h : 0), head ? 'HEADSHOT' : 'KILL'); }
// XP lands the moment you earn it (CoD-style): a small +N popup, and a full level-up moment mid-match
function gainXP(n, label) {
  const amt = Math.round(n * (MP.active ? 1.5 : 1)), before = lvlOf(STATS.xp).l; STATS.xp += amt; game.xpGiven = (game.xpGiven || 0) + amt; const after = lvlOf(STATS.xp).l;
  const el = document.createElement('div'); el.className = 'xppop'; el.innerHTML = `<b>+${amt}</b>${label ? ' ' + label : ''}`; $('hud').appendChild(el); setTimeout(() => el.remove(), 1500);
  if (after > before) levelUpFx(after);
}
function showMenuToast(msg) { let t = document.getElementById('mtoast'); if (!t) { t = document.createElement('div'); t.id = 'mtoast'; document.body.appendChild(t); } t.textContent = msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); clearTimeout(showMenuToast.t); showMenuToast.t = setTimeout(() => t.classList.remove('on'), 2200); }
function levelUpFx(l) {
  saveStats(); renderRank(); sfx.play('levelup'); rumble(0.3, 0.5, 250);
  let b = $('lvlup'); if (!b) { b = document.createElement('div'); b.id = 'lvlup'; $('hud').appendChild(b); }
  const un = unlocksAt(l).map(k => (WEAPONS.find(w => w.id === k) || EQUIP[k] || {}).name).filter(Boolean);
  b.innerHTML = `${emblem(l, 64)}<div><small>LEVEL UP</small><b>LEVEL ${l}</b><i>${rankName(l)}</i>${un.length ? `<em>UNLOCKED: ${un.join(' · ')}</em>` : ''}</div>`; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  clearTimeout(levelUpFx.t); levelUpFx.t = setTimeout(() => b.classList.remove('on'), 3600);
}
function statEnd(mode, result, deaths) { // result: 'win' | 'loss' | 'draw' | 'run' — only real multiplayer counts toward K/D, W/L and accuracy
  if (game.statDone) return ''; game.statDone = true; const B = mode === 'MULTIPLAYER' ? STATS.pvp : STATS.ai;
  B.matches++; if (result === 'win') B.wins++; else if (result === 'loss') B.losses++; else if (result === 'draw') B.draws++; else STATS.runs++;
  B.kills += game.kills; B.deaths += deaths; B.heads += game.heads; B.shots += game.shots; B.hits += game.hits; STATS.time += game.runTime || game.time || 0;
  if (mode === 'SURVIVAL') { STATS.bestWave = Math.max(STATS.bestWave, game.wave); STATS.bestScore = Math.max(STATS.bestScore, game.score); }
  const vsAI = mode !== 'MULTIPLAYER', bonus = Math.round((result === 'win' ? 600 : result === 'draw' ? 300 : result === 'loss' ? 150 : game.wave * 60) * (vsAI ? (result === 'run' ? 1 : 0.6) : 1.5)); // match bonus; kill XP was granted live
  const given = game.xpGiven || 0, xp = given + bonus, before = lvlOf(STATS.xp - given).l, rest = bonus; STATS.xp += rest; const after = lvlOf(STATS.xp).l; if (lvlOf(STATS.xp - rest).l < after && game.state !== 'menu') levelUpFx(after); // kill XP was already granted live
  STATS.recent.unshift({ mode, map: world ? world.def.name : '', result, k: game.kills, d: deaths, acc: game.shots ? Math.round(game.hits / game.shots * 100) : 0, at: Date.now() }); STATS.recent = STATS.recent.slice(0, 10);
  saveStats(); renderCareer(); renderRank(); const L1 = lvlOf(STATS.xp), L0 = lvlOf(STATS.xp - Math.max(xp, given)), from = L1.l > L0.l ? 0 : Math.round(L0.cur / L0.need * 100), to = Math.round(L1.cur / L1.need * 100);
  return `<div class="xpres">${emblem(L1.l, 34)}<b>LEVEL ${L1.l}</b><i><u data-from="${from}" data-to="${to}" style="width:${from}%"></u></i></div>${game.kills} kills · ${deaths} deaths · ${game.shots ? Math.round(game.hits / game.shots * 100) : 0}% accuracy · <b>+${xp} XP</b>${after > before ? ` · <b class="lvup">LEVEL UP — ${after}</b>` : ''}${mode === 'MULTIPLAYER' ? '' : ' · <small>(vs AI: not counted in PvP K/D)</small>'}`;
}
const RANKS = ['RECRUIT', 'PRIVATE', 'CORPORAL', 'SERGEANT', 'STAFF SERGEANT', 'LIEUTENANT', 'CAPTAIN', 'MAJOR', 'COLONEL', 'GENERAL'];
function rankName(l) { return RANKS[Math.min(RANKS.length - 1, Math.floor((l - 1) / 10))]; }
function emblem(l, size = 44) { // evolves every level: tier colour per 10 levels, chevrons within the tier, stars at the top
  const tier = Math.min(9, Math.floor((l - 1) / 10)), within = (l - 1) % 10, T = [['#7a4a2a', '#c8874a'], ['#6a4026', '#e0a060'], ['#5a6068', '#c8d0d8'], ['#6a7078', '#eef2f6'], ['#7a5a10', '#f0c040'], ['#8a6a10', '#ffe080'], ['#2a6a7a', '#9ae8ff'], ['#6a1a1a', '#ff6a5a'], ['#18181c', '#f0c040'], ['#101014', '#ffffff']][tier];
  const chev = 1 + Math.floor(within / 3.4), stars = tier >= 5 ? tier - 4 : 0, wings = tier >= 7;
  let g = `<path d="M50 4 L92 22 L92 58 Q92 84 50 98 Q8 84 8 58 L8 22 Z" fill="${T[0]}" stroke="${T[1]}" stroke-width="5"/>`;
  if (wings) g += `<path d="M8 40 L-8 30 L2 52 Z M92 40 L108 30 L98 52 Z" fill="${T[1]}"/>`;
  for (let i = 0; i < chev; i++) { const y = 62 - i * 13; g += `<path d="M26 ${y} L50 ${y - 12} L74 ${y} L74 ${y + 7} L50 ${y - 5} L26 ${y + 7} Z" fill="${T[1]}"/>`; }
  for (let i = 0; i < stars; i++) { const x = 50 + (i - (stars - 1) / 2) * 17, y = 20; g += `<path d="M${x} ${y - 7} L${x + 2.2} ${y - 2} L${x + 7} ${y - 2} L${x + 3} ${y + 1.5} L${x + 4.5} ${y + 7} L${x} ${y + 3.5} L${x - 4.5} ${y + 7} L${x - 3} ${y + 1.5} L${x - 7} ${y - 2} L${x - 2.2} ${y - 2} Z" fill="${T[1]}"/>`; }
  return `<svg class="emblem" viewBox="-10 0 120 102" width="${size}" height="${size}">${g}</svg>`;
}
function renderRank() { const L = lvlOf(STATS.xp), el = $('mrank'); if (el) el.innerHTML = `${emblem(L.l, 46)}<div class="rk"><b>${L.l}</b><small>${rankName(L.l)}</small><i><u style="width:${Math.round(L.cur / L.need * 100)}%"></u></i></div>`; }
// ---- CLOUD ACCOUNTS (Supabase): optional. Fill fps/cloud-config.js with your project URL + publishable (anon) key.
var CLOUD = { sb: null, user: null, state: 'off', msg: '', t: 0, busy: false, fromLink: /access_token|[?&]code=|type=magiclink|type=signup/.test(location.hash + location.search) };
const cloudCfg = () => { const c = window.BP_SUPA; return c && c.url && c.key ? c : null; };
function loadSupa() { return window.supabase && window.supabase.createClient ? Promise.resolve() : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'vendor/supabase.js?v=2.45.4'; sc.onload = res; sc.onerror = () => rej(new Error('Could not load the sign-in library')); document.head.appendChild(sc); }); }
async function cloudInit() {
  const c = cloudCfg(); if (!c || CLOUD.sb) return;
  try { await loadSupa(); CLOUD.sb = window.supabase.createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'bp_auth' } });
    CLOUD.sb.auth.onAuthStateChange((ev, session) => { const u = session && session.user;
      if (u && (!CLOUD.user || CLOUD.user.id !== u.id)) { CLOUD.user = u; setTimeout(cloudPull, 0); }
      else if (!u && CLOUD.user) { CLOUD.user = null; CLOUD.state = 'off'; delete PROFILE.cloud; saveProfile(); renderCareer(); } });
    if (/access_token|error_description/.test(location.hash)) setTimeout(() => { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }, 1500);
  } catch (e) { CLOUD.state = 'error'; CLOUD.msg = e.message; renderCareer(); }
}
async function cloudPull() {
  const sb = CLOUD.sb, u = CLOUD.user; if (!sb || !u) return; CLOUD.state = 'sync'; CLOUD.msg = ''; renderCareer();
  try {
    const { data, error } = await sb.from('profiles').select('*').eq('user_id', u.id).maybeSingle(); if (error) throw error;
    if (!data) { // first sign-in: this browser's profile becomes the account
      const { error: e2 } = await sb.from('profiles').insert({ user_id: u.id, player_id: PROFILE.id, tag: PROFILE.tag, name: cleanName(settings.name), stats: STATS, xp: STATS.xp | 0 }); if (e2) throw e2;
    } else { // the account's identity wins; progress: whichever copy is further along
      PROFILE.id = /^[0-9a-f]{32}$/.test(data.player_id) ? data.player_id : PROFILE.id; PROFILE.tag = cleanTag(data.tag) || PROFILE.tag; settings.name = cleanName(data.name); saveSettings();
      if ((data.xp | 0) >= (STATS.xp | 0) && data.stats && data.stats.pvp) replaceStats(data.stats); else await cloudPush(true);
    }
    PROFILE.cloud = u.id; saveProfile(); CLOUD.state = 'on'; CLOUD.t = Date.now(); if (CLOUD.fromLink) { CLOUD.fromLink = false; welcomeBack(!data); }
  } catch (e) { CLOUD.state = 'error'; CLOUD.msg = e.message || String(e); }
  renderCareer(); renderRank(); try { menuRefresh(); } catch (e) {}
}
function cloudQueue() { if (!CLOUD || !CLOUD.user || CLOUD.state !== 'on') return; clearTimeout(cloudQueue.t); cloudQueue.t = setTimeout(() => cloudPush(), 4000); }
async function cloudPush(now) {
  const sb = CLOUD.sb, u = CLOUD.user; if (!sb || !u) return;
  try { const { error } = await sb.from('profiles').update({ name: cleanName(settings.name), stats: STATS, xp: STATS.xp | 0, updated_at: new Date().toISOString() }).eq('user_id', u.id); if (error) throw error; CLOUD.t = Date.now(); if (CLOUD.state === 'error') { CLOUD.state = 'on'; CLOUD.msg = ''; } }
  catch (e) { CLOUD.state = 'error'; CLOUD.msg = e.message || String(e); }
}
async function cloudSignIn(kind, email) {
  await cloudInit(); const sb = CLOUD.sb; if (!sb) return; const to = location.origin + location.pathname;
  try {
    if (kind === 'google') { const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: to } }); if (error) throw error; }
    else { if (!/^\S+@\S+\.\S+$/.test(email || '')) { CLOUD.msg = 'Enter a valid email address.'; renderCareer(); return; }
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: to } }); if (error) throw error; CLOUD.state = 'sent'; CLOUD.msg = 'Orders sent! Look for an email from "Supabase Auth" titled "Your sign-in link" (check spam), then open it in this browser.'; }
  } catch (e) { CLOUD.state = 'error'; CLOUD.msg = e.message || String(e); }
  renderCareer();
}
function welcomeBack(first) { // the branded landing after the (plain) sign-in email: rank, name, #TAG, then into the menu
  const L = lvlOf(STATS.xp), el = document.createElement('div'); el.id = 'welcome';
  el.innerHTML = `<div class="wb"><small>${first ? 'ENLISTMENT CONFIRMED' : 'IDENTITY CONFIRMED'}</small><h1>${first ? 'WELCOME TO THE LATRINE,' : 'WELCOME BACK,'}<br><span>${esc(cleanName(settings.name).toUpperCase())}<em>#${PROFILE.tag}</em></span></h1>
    <div class="wrank">${emblem(L.l, 72)}<div><b>LEVEL ${L.l}</b><i>${rankName(L.l)}</i></div></div>
    <p>${first ? 'Your profile is now saved to your account. Sign in on any device to bring it with you.' : 'Your rank, stats and loadouts are synced to this device.'}</p><button class="pbtn" id="wbGo">REPORT FOR DUTY ›</button><u>— Sgt. Stinky, Recruitment Office 💩</u></div>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
  const close = () => { if (!el.isConnected) return; el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
  el.querySelector('#wbGo').onclick = close; el.addEventListener('click', e => { if (e.target === el) close(); }); setTimeout(close, 9000);
  try { sfx.play('levelup'); } catch (e) {}
}
async function cloudSignOut() { try { await cloudPush(true); await CLOUD.sb.auth.signOut(); } catch (e) {} CLOUD.user = null; CLOUD.state = 'off'; delete PROFILE.cloud; saveProfile(); renderCareer(); }
// export / import: move a guest profile to another device without an account
function exportCode() { return 'BP1.' + btoa(unescape(encodeURIComponent(JSON.stringify({ p: { id: PROFILE.id, tag: PROFILE.tag, created: PROFILE.created }, n: settings.name, s: STATS })))); }
function importCode(code) { try { const j = JSON.parse(decodeURIComponent(escape(atob(String(code).trim().replace(/^BP1\./, ''))))); if (!j.p || !/^[0-9a-f]{32}$/.test(j.p.id) || !j.s || !j.s.pvp) throw 0;
  Object.assign(PROFILE, { id: j.p.id, tag: cleanTag(j.p.tag) || j.p.id.slice(0, 4).toUpperCase(), created: j.p.created || Date.now() }); saveProfile(); settings.name = cleanName(j.n); saveSettings(); replaceStats(j.s); cloudQueue(); return true; } catch (e) { return false; } }
function resetProgress() { replaceStats(freshStats()); if (CLOUD.user) cloudPush(true); renderCareer(); renderRank(); try { menuRefresh(); } catch (e) {} }
function menuRefresh() { const e = $('mpname2'); if (e) e.innerHTML = esc((settings.name || 'OPERATOR').toUpperCase()) + `<em class="ptag">#${PROFILE.tag}</em>`; }
function profileCard() {
  const cfg = !!cloudCfg(), u = CLOUD.user, since = new Date(PROFILE.created || Date.now()).toLocaleDateString();
  const acct = !cfg ? `<p class="cnote">Cloud accounts aren't set up on this server yet — your profile is saved in this browser. Use an export code to move it.</p>`
    : u ? `<div class="prow"><span class="pchip on">SIGNED IN</span><span class="pmail">${esc(u.email || 'account')}</span><span class="psync">${CLOUD.state === 'sync' ? 'Syncing…' : CLOUD.state === 'error' ? 'Sync problem' : 'Saved to your account'}</span><button class="pbtn" id="pfOut">SIGN OUT</button></div>`
    : `<div class="prow"><span class="pchip">GUEST</span><span class="psync">Sign in to keep this profile on every device.</span></div><div class="prow"><input class="mpin" id="pfMail" type="email" placeholder="you@example.com" autocomplete="email"><button class="pbtn" id="pfMailBtn">EMAIL ME A SIGN-IN LINK</button>${window.BP_SUPA && window.BP_SUPA.google ? '<button class="pbtn" id="pfGoogle">GOOGLE</button>' : ''}</div>`;
  return `<div class="pcard"><div class="ptop"><div class="pname"><b id="pfName">${esc(cleanName(settings.name))}</b><em>#${PROFILE.tag}</em></div><small>Player ID ${PROFILE.id.slice(0, 8).toUpperCase()}… · since ${since}</small></div>
    <div class="prow"><input class="mpin" id="pfRename" maxlength="16" value="${esc(cleanName(settings.name))}"><button class="pbtn" id="pfRenameBtn">RENAME</button><span class="psync">Your #${PROFILE.tag} never changes, so friends still know it's you.</span></div>
    ${acct}${CLOUD.msg ? `<p class="cnote pmsg">${esc(CLOUD.msg)}</p>` : ''}
    <div class="prow"><button class="pbtn" id="pfExport">EXPORT CODE</button><button class="pbtn" id="pfImport">IMPORT CODE</button><button class="pbtn warn" id="pfReset">RESET PROGRESS</button></div><textarea class="mpin pcode" id="pfCode" style="display:none" spellcheck="false"></textarea></div>`;
}
function wireProfile() {
  const on = (id, f) => { const e = $(id); if (e) e.onclick = f; };
  on('pfRenameBtn', () => { settings.name = cleanName($('pfRename').value); saveSettings(); try { sendInfo(); } catch (e) {} if ($('mpname')) $('mpname').value = settings.name; cloudQueue(); renderCareer(); try { menuRefresh(); } catch (e) {} showMenuToast('Name changed to ' + settings.name + '#' + PROFILE.tag); });
  on('pfMailBtn', () => cloudSignIn('email', $('pfMail').value.trim())); on('pfGoogle', () => cloudSignIn('google')); on('pfOut', cloudSignOut);
  on('pfExport', () => { const t = $('pfCode'); t.style.display = 'block'; t.value = exportCode(); t.select(); try { navigator.clipboard.writeText(t.value).then(() => showMenuToast('Export code copied — paste it into IMPORT on your other device'), () => showMenuToast('Copy the code below and paste it into IMPORT on your other device')); } catch (e) {} });
  on('pfImport', () => { const t = $('pfCode'); if (t.style.display !== 'block' || !t.value || t.value === exportCode()) { t.style.display = 'block'; t.value = ''; t.placeholder = 'Paste an export code here, then press IMPORT CODE again'; t.focus(); return; }
    if (importCode(t.value)) { showMenuToast('Profile imported'); renderCareer(); renderRank(); try { menuRefresh(); } catch (e) {} } else showMenuToast('That code is not a valid profile'); });
  on('pfReset', () => { const b = $('pfReset'); if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'PRESS AGAIN TO WIPE LEVEL & STATS'; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'RESET PROGRESS'; } }, 4000); return; }
    resetProgress(); showMenuToast('Progress reset — your name and #' + PROFILE.tag + ' stay'); });
}
function renderCareer() {
  const el = $('career'); if (!el) return; const P = STATS.pvp, A = STATS.ai, L = lvlOf(STATS.xp);
  const kd = B => (B.kills / Math.max(1, B.deaths)).toFixed(2), acc = B => (B.shots ? (B.hits / B.shots * 100).toFixed(1) : '0.0') + '%', wl = B => (B.wins / Math.max(1, B.losses)).toFixed(2), hs = B => (B.kills ? Math.round(B.heads / B.kills * 100) : 0) + '%';
  const t = Math.floor(STATS.time), tp = Math.floor(t / 3600) + 'h ' + Math.floor(t / 60) % 60 + 'm';
  const big = [['PVP K/D', kd(P)], ['PVP W/L', wl(P)], ['PVP ACCURACY', acc(P)], ['PVP WINS', P.wins], ['PVP KILLS', P.kills], ['PVP HEADSHOT %', hs(P)], ['LEVEL', L.l], ['BEST STREAK', STATS.bestStreak]];
  const ai = [['Matches vs AI', A.matches], ['Kills / deaths', A.kills + ' / ' + A.deaths], ['K/D vs AI', kd(A)], ['Accuracy vs AI', acc(A)], ['Survival runs', STATS.runs], ['Best wave', STATS.bestWave], ['Best score', STATS.bestScore], ['Time played', tp]];
  const ws = Object.entries(STATS.weapons).filter(([id, w]) => w.kills || w.shots).sort((a, b) => b[1].kills - a[1].kills).slice(0, 8);
  const wname = id => id === 'nade' ? 'GRENADES & EXPLOSIVES' : (WEAPONS.find(w => w.id === id) || { name: id }).name;
  el.innerHTML = profileCard() + `<div class="xpbar">${emblem(L.l, 60)}<b>LEVEL ${L.l} · ${rankName(L.l)}</b><i><u style="width:${Math.round(L.cur / L.need * 100)}%"></u></i><small>${L.cur} / ${L.need} XP to level ${L.l + 1}</small></div>
    <div class="cbig">${big.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
    <p class="cnote">K/D, W/L and accuracy above count real multiplayer matches only. Bot matches and survival are tracked separately.</p>
    <div class="ccols"><div><h3>Vs AI</h3><table class="ktab">${ai.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table></div>
    <div><h3>Weapons (all modes)</h3><table class="ktab"><tr><th>WEAPON</th><th>KILLS</th><th>ACC</th></tr>${ws.length ? ws.map(([id, w]) => `<tr><td>${esc(wname(id))}</td><td>${w.kills}</td><td>${w.shots ? Math.round(w.hits / w.shots * 100) + '%' : '—'}</td></tr>`).join('') : '<tr><td colspan="3">Play a match to start tracking.</td></tr>'}</table></div>
    <div><h3>Recent matches</h3><table class="ktab"><tr><th>MODE</th><th>RESULT</th><th>K/D</th><th>ACC</th></tr>${STATS.recent.length ? STATS.recent.map(r => `<tr><td>${esc(r.mode)}<br><small>${esc(r.map)}</small></td><td class="r_${r.result}">${r.result.toUpperCase()}</td><td>${r.k}/${r.d}</td><td>${r.acc}%</td></tr>`).join('') : '<tr><td colspan="4">No matches yet.</td></tr>'}</table></div></div>`;
  wireProfile();
}
const game = { state: 'menu', time: 0, score: 0, kills: 0, heads: 0, shots: 0, hits: 0, wave: 0, queue: [], spawnT: 0, interT: 0, phase: 'inter', streak: 0, lastKill: -9, shake: 0, runTime: 0 };

function disposeGroup(g) {
  const shared = new Set([...Object.values(CG), ...Object.values(PG), ...ROCKS, barrelGeo, bandGeo, potionGeo, roundGeo, hpGeo, amGeo, ringGeo, crossA, crossB]);
  g.traverse(o => { if (o.geometry && !shared.has(o.geometry)) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
}
let radarImg = null;
function loadMap(i) {
  SURV.support = []; SURV.tgt = null; game.ks = 0; game.uavT = 0; if (SURV.mk) SURV.mk.visible = false;
  if (world) { scene.remove(world.group); disposeGroup(world.group); }
  enemies = []; pickups = []; barrels = []; grenades.forEach(g => fx.remove(g.mesh)); grenades = [];
  const def = MAPS[i], th = def.theme, L = new LevelBuilder(); def.build(L);
  world = { def, L, boxes: L.boxes, group: new THREE.Group() };
  skyMat.uniforms.top.value.setHex(th.skyTop); skyMat.uniforms.bottom.value.setHex(th.skyBottom);
  skyMat.uniforms.sunColor.value.setHex(th.sunColor); skyMat.uniforms.sunDir.value.set(...th.sunDir).normalize();
  scene.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
  if (stars) { scene.remove(stars); stars = null; } if (th.stars) { stars = makeStars(); scene.add(stars); }
  world.group.add(new THREE.HemisphereLight(th.hemiSky, th.hemiGround, th.hemi * (HQ ? 0.55 : 1)));
  if (HQ) makeEnvMap(th);
  const sun = new THREE.DirectionalLight(th.sunLight, th.sun * (HQ ? 1.12 : 1)); world.sun = sun; world.sunDir = new V3(...th.shadowSun).normalize();
  const sd = new V3(...th.shadowSun).normalize(); sun.position.copy(sd).multiplyScalar(60); sun.target.position.set(0, 0, 0);
  world.group.add(sun, sun.target);
  shadowsOn = QUALITY[settings.quality].shadows; renderer.shadowMap.enabled = shadowsOn;
  muzzleLight.visible = boomLight.visible = settings.quality !== 'low';
  if (shadowsOn) {
    sun.castShadow = true; const [x0, z0, x1, z1] = L.bounds, ext = Math.max(x1 - x0, z1 - z0) * 0.62;
    const Q = QUALITY[settings.quality]; sun.shadow.mapSize.set(Q.sm, Q.sm); world.shadowFull = ext; world.shadowExt = -1; Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 260 });
    sun.shadow.bias = HQ ? -0.0003 : -0.0006; sun.shadow.normalBias = HQ ? 0.02 : 0.03; if (HQ) sun.shadow.radius = 3; sun.shadow.camera.updateProjectionMatrix();
  }
  for (let i = L.decor.length - 1; i >= 0; i--) { const b = L.decor[i], h = b.y1 - b.y0, a = (b.x1 - b.x0) * (b.z1 - b.z0);
    if (h >= 0.04 && h <= 0.35 && a >= 0.8 && b.y1 > 0.6 && !['lampglow', 'glass', 'skylight', 'carglass', 'white', 'pavement'].includes(b.m) && Math.min(b.x1 - b.x0, b.z1 - b.z0) >= 0.5) { L.decor.splice(i, 1); L.boxes.push(b); } }
  for (const pr of L.props) if (pr.k === 'cloth' || pr.k === 'stall') {} // stalls already have a solid table
  dressEdges(L, def.name);
  coverPass(L, def.name);
  buildTerrain(L, def.name);
  buildWindows(L); // before the nav grid: bots must know intact glass and boards block a window
  world.nav = new Nav(L.boxes, L.bounds, L.links);
  for (let pass = 0; pass < 3 && L.rstairs && L.rstairs.length; pass++) { // rooftop stairs must lead somewhere you can actually get to and off
    const N = world.nav, s0 = N.nodeAt(L.spawn.x, L.spawn.y, L.spawn.z, 5), seen = new Uint8Array(N.n), st = s0 >= 0 ? [s0] : []; if (s0 >= 0) seen[s0] = 1;
    while (st.length) { const n = st.pop(); for (let e = N.eS[n]; e < N.eS[n + 1]; e++) { const q = N.eTo[e]; if (!seen[q]) { seen[q] = 1; st.push(q); } } }
    const ok = (x, y, z) => { const n = N.nodeAt(x, y, z, 1.5); return n >= 0 && seen[n] && Math.abs(N.nodeH[n] - y) < 1; };
    const dead = L.rstairs.filter(r => r.link && !(ok(r.link[0], r.link[1], r.link[2]) && ok(r.link[3], r.link[4], r.link[5])));
    if (dead.length) { const db = new Set(), dl = new Set(); for (const r of dead) { r.boxes.forEach(b => db.add(b)); dl.add(r.link); }
      for (let q = L.boxes.length - 1; q >= 0; q--) if (db.has(L.boxes[q])) L.boxes.splice(q, 1); for (let q = L.links.length - 1; q >= 0; q--) if (dl.has(L.links[q])) L.links.splice(q, 1);
      world.boxes = L.boxes; world.nav = new Nav(L.boxes, L.bounds, L.links); L.rstairs = L.rstairs.filter(r => !dl.has(r.link)); } else break;
  }
  world.nav.markSafe(L.spawn.x, L.spawn.y, L.spawn.z);
  buildLevelMeshes(L, th, world.group);
  world.anim = {}; buildScenery(L, th, world.group); buildEnvironment(L, th, world.group, world.anim);
  for (const pk of L.pickups) if (!world.nav.freeAt(pk[1], pk[2], pk[3]) && !world.nav.freeAt(pk[1], TH(pk[1], pk[3]), pk[3])) { const k = world.nav.nearestFree(pk[1], pk[3], 5); if (k >= 0) { const [cx, cz] = world.nav.center(k); pk[1] = cx; pk[2] = TH(cx, cz); pk[3] = cz; } }
  for (const br of L.barrels) if (!world.nav.freeAt(br[0], 0, br[1])) { const k = world.nav.nearestFree(br[0], br[1], 5); if (k >= 0) { const [cx, cz] = world.nav.center(k); br[0] = cx; br[1] = cz; } }
  for (const [x, z] of L.barrels) barrels.push(new Barrel(x, z));
  for (const [t, x, y, z] of L.pickups) { const p = new Pickup(t, x, y, z, false); p.idx = pickups.length; pickups.push(p); }
  scene.add(world.group);
  // radar
  const [x0, z0, x1, z1] = L.bounds, RS = 3; const c = document.createElement('canvas'); c.width = (x1 - x0 + 4) * RS; c.height = (z1 - z0 + 4) * RS;
  const g = c.getContext('2d'); g.fillStyle = 'rgba(60,70,85,.35)'; g.fillRect(0, 0, c.width, c.height);
  for (const b of L.boxes.slice().sort((a, b) => a.y1 - b.y1)) {
    if (b.y1 <= 0.3) continue; const v = clamp(90 + b.y1 * 16, 90, 230) | 0;
    g.fillStyle = b.pad ? '#39ff88' : `rgb(${v},${v},${v + 10})`; g.fillRect((b.x0 - x0 + 2) * RS, (b.z0 - z0 + 2) * RS, (b.x1 - b.x0) * RS, (b.z1 - b.z0) * RS);
  }
  radarImg = { c, x0: x0 - 2, z0: z0 - 2, RS };
}

// sky reflections for physically based materials
let envRT = null;
function makeEnvMap(th) {
  try {
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    const skyC = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat); es.add(skyC);
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(99, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(th.farGround || 0x5a5a4a).multiplyScalar(0.7) })); gnd.position.y = -2; es.add(gnd);
    if (envRT) envRT.dispose(); envRT = pm.fromScene(es, 0.02); pm.dispose(); skyC.geometry.dispose(); gnd.geometry.dispose(); gnd.material.dispose();
    scene.environment = envRT.texture; vmScene.environment = envRT.texture;
  } catch (e) { console.warn('env map failed', e); }
}
// keep the sun's shadow map centred on the camera so shadows stay sharp on big maps
function updateSunShadow() {
  if (!shadowsOn || !world || !world.sun) return; const sun = world.sun, Q = QUALITY[settings.quality];
  const near = game.state === 'play' || game.state === 'dying' || game.state === 'paused', ext = near ? Math.min(Q.ext || 48, world.shadowFull) : world.shadowFull;
  const c = near ? camera.position : new V3(0, 0, 0), step = (2 * ext) / Q.sm * 4, cx = Math.round(c.x / step) * step, cz = Math.round(c.z / step) * step;
  if (ext !== world.shadowExt) { world.shadowExt = ext; Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext }); sun.shadow.camera.updateProjectionMatrix(); }
  sun.target.position.set(cx, 0, cz); sun.position.set(cx, 0, cz).addScaledVector(world.sunDir, 120); sun.target.updateMatrixWorld();
}
function resetRun() {
  closeBuy(); for (const st of SURV.stations) { if (world) world.group.remove(st.g); const i = world ? world.boxes.indexOf(st.box) : -1; if (i >= 0) world.boxes.splice(i, 1); } SURV.stations = []; SURV.eq = {}; for (const m of SURV.markers) m.style.display = 'none'; SURV.support = []; SURV.tgt = null; if (SURV.mk) SURV.mk.visible = false;
  ng.on = false; ng.cook = -1; ng.throwT = 0; ng.pending = null; if (settings.pendingLO !== undefined && settings.pendingLO !== null) { applyCustom(settings.pendingLO); settings.pendingLO = null; }
  for (const e of enemies) { world.group.remove(e.group); if (e.laser) world.group.remove(e.laser); }
  enemies = []; grenades.forEach(g => fx.remove(g.mesh)); grenades = [];
  for (const p of pickups) if (p.temp) world.group.remove(p.mesh);
  pickups = pickups.filter(p => !p.temp); pickups.forEach(p => { p.active = true; p.mesh.visible = true; });
  barrels.forEach(b => { b.box.dead = false; b.hp = 30; b.fuse = 0; b.mesh.visible = true; });
  const s = world.L.spawn;
  const C = cls();
  const HP0 = Math.round(C.hp * hpMul()); Object.assign(player, { protT: 0, maxHp: HP0, hp: HP0, regenCap: HP0, abilityCD: 0, stimT: 0, shield: 0, shieldT: 0, pulseT: 0, lastDmgT: 99, alive: true, grenades: C.nades, tacticals: 2, gcd: 0, crouch: 0, sliding: false, slideT: 0, slideCD: 0, h: 1.75, onGround: false, stepSmooth: 0, landKick: 0, yaw: s.yaw, pitch: 0, sprintLock: 0 });
  player.pos.set(s.x, s.y + 0.05, s.z); player.vel.set(0, 0, 0);
  inv = WEAPONS.map(w => ({ mag: w.mag, res: w.res }));
  carry = loadoutIdx(); rebuildViewmodels(); renderSlots(); setGloves();
  Object.assign(wst, { cur: carry[0], last: carry[1], fireCD: 0, reloadT: 0, reloading: false, switchT: 0, ads: 0, bloom: 0, held: false, consec: 0, sinceShot: 9 });
  vmModels.forEach((m, i) => m.g.visible = i === carry[0]);
  game.mode = 'survival';
  Object.assign(game, { statDone: false, xpGiven: 0, time: 0, score: 0, kills: 0, heads: 0, shots: 0, hits: 0, wave: 0, queue: [], spawnT: 0, interT: 3, phase: 'inter', streak: 0, lastKill: -9, shake: 0, runTime: 0 });
  recoil.p = recoil.y = 0;
  $('feed').innerHTML = ''; hudCache = {};
  if (settings.intro === false) showMsg('GET READY', world.def.name, 2.5);
}

