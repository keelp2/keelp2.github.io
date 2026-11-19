// ============================================================ WEAPONS
const WEAPONS = [
  { id: 'pistol', cat: 'PISTOL', slot: 'secondary', vkick: 0.9, desc: 'Accurate semi-auto 9mm. Infinite reserve ammo.', short: 'PISTOL', name: '9MM SERVICE PISTOL', dmg: 30, head: 2.2, rpm: 420, auto: false, mag: 12, res: Infinity, reload: 1.15, spread: 0.006, bloom: 0.012, maxBloom: 0.045, move: 0.022, air: 0.05, ads: 0.45, zoom: 1.2, kick: 0.016, kickYaw: 0.006, range: [20, 45, 0.6], snd: 'pistol', hip: [0.12, -0.12, -0.38], adsPos: [0, -0.05, -0.34], adsSpeed: 13, swap: 0.25 },
  { id: 'revolver', cat: 'PISTOL', slot: 'secondary', vkick: 1.9, desc: '.357 hand cannon. Two-tap kills, heavy kick. Infinite reserve.', short: 'REVOLVER', name: '.357 REVOLVER', dmg: 55, head: 2.0, rpm: 150, auto: false, mag: 6, res: Infinity, reload: 2.0, spread: 0.004, bloom: 0.03, maxBloom: 0.06, move: 0.03, air: 0.06, ads: 0.4, zoom: 1.25, kick: 0.05, kickYaw: 0.012, range: [25, 50, 0.65], snd: 'revolver', hip: [0.12, -0.12, -0.38], adsPos: [0, -0.05, -0.34], adsSpeed: 11, swap: 0.3 },
  { id: 'rifle', cat: 'AR', slot: 'primary', vkick: 0.6, pattern: [0.15, 0.35, 0.55, 0.3, -0.15, -0.55, -0.8, -0.45, 0.2, 0.6, 0.85, 0.4, -0.3, -0.6], desc: 'AR-15 pattern all-rounder. Controllable full-auto.', short: 'CARBINE', name: '5.56 CARBINE', dmg: 22, head: 1.9, rpm: 640, auto: true, mag: 30, res: 180, maxRes: 270, pickup: 60, reload: 1.9, spread: 0.005, bloom: 0.006, maxBloom: 0.05, move: 0.035, air: 0.07, ads: 0.3, zoom: 1.45, kick: 0.0105, kickYaw: 0.007, range: [25, 60, 0.65], snd: 'rifle', hip: [0.13, -0.135, -0.44], adsPos: [0, -0.09, -0.26], adsSpeed: 9, swap: 0.35 },
  { id: 'ak', cat: 'AR', slot: 'primary', vkick: 0.95, pattern: [0.1, 0.3, 0.6, 0.8, 0.5, 0.1, -0.4, -0.8, -1, -0.6, -0.1, 0.4, 0.8, 1, 0.6], desc: 'Hard-hitting 7.62. Strong but learnable recoil.', short: 'AK', name: '7.62 ASSAULT RIFLE', dmg: 30, head: 1.9, rpm: 600, auto: true, mag: 30, res: 150, maxRes: 240, pickup: 60, reload: 2.3, spread: 0.006, bloom: 0.008, maxBloom: 0.06, move: 0.04, air: 0.08, ads: 0.32, zoom: 1.4, kick: 0.0145, kickYaw: 0.009, range: [30, 70, 0.7], snd: 'ak', hip: [0.13, -0.135, -0.44], adsPos: [0, -0.06, -0.27], adsSpeed: 8.5, swap: 0.38 },
  { id: 'smg', cat: 'SMG', slot: 'primary', vkick: 0.45, pattern: [0.5, -0.3, 0.6, -0.45, 0.7, -0.6, 0.4, -0.7, 0.55, -0.4], desc: 'Very fast fire, accurate on the move. Weak at range.', short: 'SMG', name: '9MM SMG', dmg: 15, head: 1.7, rpm: 900, auto: true, mag: 32, res: 192, maxRes: 288, pickup: 64, reload: 1.6, spread: 0.009, bloom: 0.005, maxBloom: 0.055, move: 0.012, air: 0.04, ads: 0.5, zoom: 1.3, kick: 0.007, kickYaw: 0.009, range: [12, 35, 0.5], snd: 'smg', hip: [0.13, -0.13, -0.4], adsPos: [0, -0.06, -0.28], adsSpeed: 13, swap: 0.28, speedMul: 1.04 },
  { id: 'lmg', cat: 'LMG', slot: 'primary', vkick: 0.65, pattern: [0.3, -0.2, 0.5, -0.4, 0.2, -0.6, 0.6, -0.3], desc: '100-round belt. Suppress everything. Slow to aim and reload.', short: 'LMG', name: '5.56 LIGHT MACHINE GUN', dmg: 21, head: 1.7, rpm: 780, auto: true, mag: 100, res: 200, maxRes: 300, pickup: 100, reload: 4.4, spread: 0.009, bloom: 0.004, maxBloom: 0.07, move: 0.06, air: 0.1, ads: 0.4, zoom: 1.35, kick: 0.0085, kickYaw: 0.01, range: [25, 60, 0.65], snd: 'lmg', hip: [0.14, -0.15, -0.46], adsPos: [0, -0.1, -0.3], adsSpeed: 5.5, swap: 0.6, speedMul: 0.88 },
  { id: 'shotgun', cat: 'SHOTGUN', slot: 'primary', vkick: 2.3, desc: '12-gauge pump, nine pellets. Devastating up close.', short: 'SHOTGUN', name: '12GA PUMP SHOTGUN', dmg: 12, head: 1.5, pellets: 9, rpm: 75, auto: true, mag: 6, res: 30, maxRes: 42, pickup: 12, reload: 0.5, shell: true, spread: 0.06, bloom: 0.01, maxBloom: 0.02, move: 0.012, air: 0.02, ads: 0.7, zoom: 1.15, kick: 0.05, kickYaw: 0.012, range: [8, 24, 0.3], snd: 'shotgun', hip: [0.13, -0.13, -0.44], adsPos: [0, -0.04, -0.32], adsSpeed: 10, swap: 0.4 },
  { id: 'dmr', cat: 'MARKSMAN', slot: 'primary', vkick: 1.4, desc: '7.62 marksman rifle, 4× scope. Rounds pierce one enemy.', short: 'MARKSMAN', name: '7.62 MARKSMAN RIFLE', dmg: 68, head: 2.4, rpm: 105, auto: false, mag: 10, res: 30, maxRes: 50, pickup: 10, reload: 2.2, spread: 0.05, bloom: 0.02, maxBloom: 0.05, move: 0.06, air: 0.1, ads: 0.035, zoom: 3.6, scope: true, pierce: true, kick: 0.045, kickYaw: 0.01, range: [70, 140, 0.8], snd: 'dmr', hip: [0.13, -0.135, -0.44], adsPos: [0, -0.075, -0.24], adsSpeed: 7, swap: 0.45 },
  { id: 'sniper', cat: 'SNIPER', slot: 'primary', vkick: 2.8, desc: '.338 bolt action, 6× scope. One-shot headshots.', short: 'SNIPER', name: '.338 SNIPER RIFLE', dmg: 115, head: 2.5, rpm: 46, auto: false, mag: 5, res: 20, maxRes: 30, pickup: 5, reload: 3.0, spread: 0.07, bloom: 0.02, maxBloom: 0.07, move: 0.08, air: 0.12, ads: 0.02, zoom: 6, scope: true, pierce: true, bolt: true, kick: 0.07, kickYaw: 0.012, range: [120, 250, 0.85], snd: 'sniper', hip: [0.14, -0.15, -0.46], adsPos: [0, -0.1, -0.22], adsSpeed: 5.5, swap: 0.5, speedMul: 0.95 },
  { id: 'scar', cat: 'AR', geo: 'rifle', finish: 'fde', gscale: 1.08, slot: 'primary', vkick: 1.05, pattern: [0.2, 0.5, 0.8, 0.5, 0, -0.5, -0.8, -0.4, 0.3, 0.7], desc: 'Battle rifle, 7.62. Slow, brutal, three-shot kills.', short: 'BATTLE RIFLE', name: '7.62 BATTLE RIFLE', dmg: 36, head: 1.9, rpm: 500, auto: true, mag: 20, res: 120, maxRes: 180, pickup: 40, reload: 2.2, spread: 0.005, bloom: 0.009, maxBloom: 0.06, move: 0.04, air: 0.08, ads: 0.3, zoom: 1.45, kick: 0.017, kickYaw: 0.009, range: [30, 75, 0.75], snd: 'battle', hip: [0.13, -0.135, -0.44], adsPos: [0, -0.09, -0.26], adsSpeed: 8, swap: 0.4, speedMul: 0.97 },
  { id: 'bullpup', cat: 'AR', geo: 'rifle', finish: 'od', gscale: 0.86, slot: 'primary', vkick: 0.5, pattern: [0.3, -0.2, 0.4, -0.35, 0.5, -0.4, 0.3, -0.5], desc: 'Compact 5.56 bullpup. Very fast fire, tight recoil, quick handling.', short: 'BULLPUP', name: '5.56 BULLPUP RIFLE', dmg: 19, head: 1.9, rpm: 800, auto: true, mag: 30, res: 180, maxRes: 270, pickup: 60, reload: 2.0, spread: 0.006, bloom: 0.006, maxBloom: 0.05, move: 0.03, air: 0.07, ads: 0.32, zoom: 1.4, kick: 0.0085, kickYaw: 0.008, range: [22, 50, 0.65], snd: 'bullpup', hip: [0.13, -0.135, -0.42], adsPos: [0, -0.09, -0.24], adsSpeed: 10.5, swap: 0.32 },
  { id: 'vector', cat: 'SMG', geo: 'smg', finish: 'poly', gscale: 0.92, slot: 'primary', vkick: 0.4, pattern: [0.2, -0.1, 0.25, -0.2, 0.3, -0.25], desc: '.45 hyper-SMG. 1100 RPM — melts at close range, empties fast.', short: 'HYPER SMG', name: '.45 HYPER SMG', dmg: 14, head: 1.6, rpm: 1100, auto: true, mag: 25, res: 175, maxRes: 250, pickup: 50, reload: 1.7, spread: 0.01, bloom: 0.005, maxBloom: 0.06, move: 0.012, air: 0.04, ads: 0.5, zoom: 1.3, kick: 0.006, kickYaw: 0.008, range: [9, 26, 0.5], snd: 'hyper', hip: [0.13, -0.13, -0.4], adsPos: [0, -0.06, -0.28], adsSpeed: 13, swap: 0.26, speedMul: 1.05 },
  { id: 'ump', cat: 'SMG', geo: 'smg', finish: 'black', gscale: 1.1, slot: 'primary', vkick: 0.6, pattern: [0.4, -0.2, 0.5, -0.4, 0.5, -0.5], desc: '.45 compact SMG. Hard-hitting, effective further out than other SMGs.', short: '.45 SMG', name: '.45 COMPACT SMG', dmg: 21, head: 1.7, rpm: 650, auto: true, mag: 25, res: 175, maxRes: 250, pickup: 50, reload: 1.9, spread: 0.008, bloom: 0.006, maxBloom: 0.05, move: 0.016, air: 0.05, ads: 0.45, zoom: 1.3, kick: 0.009, kickYaw: 0.008, range: [15, 40, 0.55], snd: 'ump45', hip: [0.13, -0.13, -0.4], adsPos: [0, -0.06, -0.28], adsSpeed: 12, swap: 0.3, speedMul: 1.02 },
  { id: 'autoshotgun', cat: 'SHOTGUN', geo: 'shotgun', finish: 'black', slot: 'primary', vkick: 1.9, desc: 'Semi-auto 12-gauge, 8 shells. Fires as fast as you can pull the trigger.', short: 'AUTO SHOTGUN', name: '12GA AUTO SHOTGUN', dmg: 10, head: 1.5, pellets: 8, rpm: 220, auto: false, mag: 8, res: 32, maxRes: 48, pickup: 16, reload: 0.45, shell: true, spread: 0.068, bloom: 0.012, maxBloom: 0.025, move: 0.014, air: 0.02, ads: 0.72, zoom: 1.15, kick: 0.042, kickYaw: 0.012, range: [7, 20, 0.3], snd: 'autosg', hip: [0.13, -0.13, -0.44], adsPos: [0, -0.04, -0.32], adsSpeed: 10, swap: 0.42 },
  { id: 'fifty', cat: 'SNIPER', geo: 'sniper', finish: 'od', gscale: 1.12, slot: 'primary', vkick: 3.4, desc: '.50 anti-materiel rifle, semi-auto. Body-shot kills, punches through cover. Heavy.', short: '.50 CAL', name: '.50 ANTI-MATERIEL RIFLE', dmg: 150, head: 2.0, rpm: 80, auto: false, mag: 5, res: 15, maxRes: 25, pickup: 5, reload: 3.6, spread: 0.08, bloom: 0.03, maxBloom: 0.08, move: 0.09, air: 0.14, ads: 0.025, zoom: 7, scope: true, pierce: true, kick: 0.09, kickYaw: 0.016, range: [140, 300, 0.9], snd: 'fifty', hip: [0.14, -0.15, -0.46], adsPos: [0, -0.1, -0.22], adsSpeed: 4.5, swap: 0.6, speedMul: 0.9 },
  { id: 'mpistol', cat: 'PISTOL', geo: 'pistol', finish: 'black', slot: 'secondary', vkick: 0.55, pattern: [0.5, -0.4, 0.6, -0.5, 0.4, -0.6], desc: 'Full-auto 9mm machine pistol. A close-range panic button.', short: 'MACHINE PISTOL', name: '9MM MACHINE PISTOL', dmg: 16, head: 1.8, rpm: 950, auto: true, mag: 20, res: 120, maxRes: 160, pickup: 40, reload: 1.4, spread: 0.012, bloom: 0.008, maxBloom: 0.07, move: 0.018, air: 0.05, ads: 0.5, zoom: 1.2, kick: 0.008, kickYaw: 0.01, range: [8, 22, 0.5], snd: 'mpistol', hip: [0.12, -0.12, -0.38], adsPos: [0, -0.05, -0.34], adsSpeed: 13, swap: 0.24 },
  { id: 'rpg', cat: 'LAUNCHER', slot: 'secondary', launcher: true, vkick: 2.6, desc: 'Shoulder-fired rocket launcher. Blast radius kills squads and blows open cover. 3 rockets.', short: 'RPG', name: 'RPG LAUNCHER', dmg: 220, head: 1, rpm: 30, auto: false, mag: 1, res: 2, maxRes: 3, pickup: 1, reload: 3.2, spread: 0.004, bloom: 0, maxBloom: 0.01, move: 0.03, air: 0.06, ads: 0.6, zoom: 1.35, kick: 0.05, kickYaw: 0.01, range: [80, 160, 1], snd: 'shotgun', hip: [0.15, -0.12, -0.4], adsPos: [0, -0.085, -0.3], adsSpeed: 6, swap: 0.6, speedMul: 0.92 },
  { id: 'knife', slot: 'melee', melee: true, desc: 'Fast slashes. Backstabs are instant kills.', short: 'KNIFE', name: 'COMBAT KNIFE', dmg: 55, backstab: 250, reach: 2.1, swing: 0.32, hitAt: 0.09, snd: 'stab', speedMul: 1.08, rpm: 143, auto: true, mag: 1, res: Infinity, reload: 1, spread: 0, bloom: 0, maxBloom: 0, move: 0, air: 0, ads: 1, zoom: 1, kick: 0, kickYaw: 0, range: [3, 3, 1], hip: [0.17, -0.17, -0.36], adsPos: [0, 0, -0.36], adsSpeed: 10, swap: 0.22, head: 1.4 },
  { id: 'sword', slot: 'melee', melee: true, desc: 'Heavy blade, long reach; a cleave can hit two foes.', short: 'MACHETE', name: 'COMBAT MACHETE', dmg: 85, backstab: 150, reach: 2.7, swing: 0.5, hitAt: 0.14, cleave: 2, snd: 'stab', rpm: 86, auto: true, mag: 1, res: Infinity, reload: 1, spread: 0, bloom: 0, maxBloom: 0, move: 0, air: 0, ads: 1, zoom: 1, kick: 0, kickYaw: 0, range: [3, 3, 1], hip: [0.17, -0.17, -0.36], adsPos: [0, 0, -0.36], adsSpeed: 10, swap: 0.22, head: 1.4 },
  { id: 'pan', slot: 'melee', melee: true, desc: 'Cast iron. Huge knockback. Very, very loud.', short: 'PAN', name: 'CAST-IRON PAN', dmg: 65, backstab: 130, reach: 2.3, swing: 0.45, hitAt: 0.13, knock: 16, snd: 'clang', rpm: 100, auto: true, mag: 1, res: Infinity, reload: 1, spread: 0, bloom: 0, maxBloom: 0, move: 0, air: 0, ads: 1, zoom: 1, kick: 0, kickYaw: 0, range: [3, 3, 1], hip: [0.17, -0.17, -0.36], adsPos: [0, 0, -0.36], adsSpeed: 10, swap: 0.22, head: 1.4 },
];
// more guns: variants of the base models with their own handling, finish and voice
for (const [id, base, o] of [
  ['grau', 'rifle', { finish: 'od', name: '5.56 TACTICAL RIFLE', short: 'TAC RIFLE', desc: 'Long-barrel 5.56. Laser-flat recoil, great at range, lower damage.', dmg: 20, rpm: 720, kick: 0.008, kickYaw: 0.005, range: [32, 70, 0.7], vkick: 0.5, snd: 'rifle', gscale: 1.06 }],
  ['krig', 'ak', { finish: 'black', name: '6.8 HEAVY RIFLE', short: 'HEAVY RIFLE', desc: 'Hard-hitting 6.8 with a punchy, vertical climb.', dmg: 31, rpm: 560, mag: 30, kick: 0.016, kickYaw: 0.006, vkick: 1.0, snd: 'battle' }],
  ['mp5', 'smg', { finish: 'black', name: '9MM CLASSIC SMG', short: 'CLASSIC SMG', desc: 'Roller-delayed 9mm. Smooth, accurate, a little slower firing.', dmg: 17, rpm: 800, mag: 30, kick: 0.006, kickYaw: 0.006, spread: 0.007, snd: 'smg' }],
  ['p90', 'smg', { finish: 'fde', name: '5.7 PDW', short: 'PDW', desc: 'Top-loaded 50-round PDW. Bullet hose with a light punch.', dmg: 14, rpm: 920, mag: 50, res: 200, maxRes: 300, reload: 2.3, kick: 0.0065, snd: 'hyper' }],
  ['mg', 'lmg', { finish: 'black', name: '7.62 GPMG', short: 'GPMG', desc: 'General-purpose 7.62 belt-fed. Devastating, slow to move and reload.', dmg: 31, rpm: 620, mag: 75, reload: 5.0, kick: 0.016, speedMul: 0.86, snd: 'battle', gscale: 1.05 }],
  ['db', 'shotgun', { finish: 'wood', name: 'DOUBLE BARREL', short: 'DOUBLE BARREL', desc: 'Two shells, both barrels fast. Unmatched up close, then reload.', dmg: 13, pellets: 10, rpm: 260, mag: 2, res: 24, reload: 1.9, shell: false, snd: 'shotgun' }],
  ['semi', 'dmr', { finish: 'fde', name: '7.62 MARKSMAN', short: 'MARKSMAN', desc: 'Semi-auto 7.62 with a fast follow-up. Two to the chest, one to the head.', dmg: 58, rpm: 160, mag: 15, kick: 0.03, snd: 'dmr' }],
  ['bolt', 'sniper', { finish: 'od', name: 'LIGHT SNIPER', short: 'LIGHT SNIPER', desc: 'Fast-cycling bolt gun. One-shot to the head, quick to aim.', dmg: 92, rpm: 70, ads: 0.36, speedMul: 1.0, snd: 'sniper' }],
  ['deagle', 'pistol', { finish: 'steel', name: '.50 HAND CANNON', short: 'HAND CANNON', desc: 'Huge .50 semi-auto. Two hits kill, if you can hold it down.', dmg: 62, rpm: 200, mag: 7, kick: 0.06, kickYaw: 0.016, vkick: 2.0, reload: 1.7, snd: 'revolver' }],
  ['burst', 'rifle', { finish: 'fde', name: '5.56 BURST RIFLE', short: 'BURST', desc: '3-round burst. Land two bursts and they drop — miss and you are slow.', dmg: 28, burst: 3, burstRpm: 900, rpm: 260, auto: false, range: [35, 75, 0.75], kick: 0.011, vkick: 0.7, snd: 'rifle', gscale: 1.02 }],
  ['blackout', 'rifle', { finish: 'black', name: '.300 SHORT CARBINE', short: 'SHORT CARBINE', desc: 'Short-barrel .300 carbine. SMG pace up close, falls off fast at range.', dmg: 26, rpm: 640, mag: 30, range: [15, 40, 0.55], speedMul: 1.02, kick: 0.012, gscale: 0.9, snd: 'battle' }],
  ['mini', 'smg', { finish: 'black', name: '9MM MINI SMG', short: 'MINI SMG', desc: 'Tiny 9mm bullet hose. Fastest handling in the game, little range.', dmg: 17, rpm: 1000, mag: 32, range: [8, 22, 0.45], speedMul: 1.08, kick: 0.0075, gscale: 0.82, snd: 'hyper' }],
  ['rpk', 'lmg', { finish: 'wood', name: '7.62 LIGHT SUPPORT GUN', short: 'SUPPORT GUN', desc: 'Rifle-handling 60-round LMG. Moves and aims faster than the belt-feds.', dmg: 24, rpm: 680, mag: 60, reload: 3.4, speedMul: 0.93, kick: 0.012, snd: 'battle' }],
  ['lever', 'dmr', { finish: 'wood', name: '.45-70 LEVER ACTION', short: 'LEVER ACTION', desc: 'Two-shot body kills inside 40 m, one to the head. Every round counts.', dmg: 80, head: 2.0, rpm: 90, mag: 6, reload: 2.6, range: [40, 90, 0.75], pierce: false, kick: 0.04, snd: 'revolver', gscale: 0.95, geo: 'rifle', scope: false, zoom: 1.6, ads: 0.12, adsPos: [0, -0.09, -0.26], adsSpeed: 8 }],
  ['slug', 'shotgun', { finish: 'black', name: '12GA SLUG SHOTGUN', short: 'SLUG', desc: 'Pump gun loaded with slugs: one heavy round, two-shot kills out to 25 m.', dmg: 85, head: 1.8, pellets: 0, rpm: 70, spread: 0.006, range: [25, 55, 0.6], snd: 'shotgun' }],
]) { const b = WEAPONS.find(w => w.id === base); if (b) WEAPONS.splice(WEAPONS.indexOf(WEAPONS.find(w => w.id === 'rpg')), 0, Object.assign({}, b, { id, geo: b.geo || base }, o)); }
// ---- balance pass (150 HP, body shots). Close-range TTK targets: SMGs ~440–530 ms, ARs ~430–560 ms, LMGs ~480–540 ms,
// shotguns one-shot inside ~8 m, marksman 3-shot (one-shot heads on the DMR), .338 sniper one-shot body; everything falls off at its range.
for (const [id, o] of Object.entries({
  rifle: { dmg: 25 }, ak: { dmg: 29, rpm: 560 }, krig: { dmg: 26, rpm: 600 }, bolt: { rpm: 80 }, scar: { rpm: 450 },
  smg: { dmg: 19 }, vector: { dmg: 17 }, ump: { dmg: 25 }, mp5: { dmg: 21, rpm: 850 }, p90: { dmg: 18 },
  mg: { dmg: 27 }, shotgun: { dmg: 19 }, db: { dmg: 16 }, dmr: { rpm: 120 }, revolver: { rpm: 175 },
  sniper: { dmg: 155, desc: '.338 bolt action, 6× scope. One shot to the body kills — slow bolt, slow aim.' },
  fifty: { dmg: 100, rpm: 75, desc: 'Semi-auto .50, no damage drop-off. Two to the body, one to the head. Heavy.' },
})) { const w = WEAPONS.find(q => q.id === id); if (w) Object.assign(w, o); }
// ---- CoD-style unlock ladder (level each item becomes available)
const UNLOCK = { rifle: 1, smg: 1, shotgun: 1, lmg: 1, dmr: 1, pistol: 1, knife: 1, frag: 1, smoke: 1, flash: 1, ak: 2, revolver: 3, sword: 3, sniper: 4, ump: 5, semtex: 5, grau: 6, mp5: 7, pan: 7, autoshotgun: 8, molotov: 8,
  scar: 9, mpistol: 10, bullpup: 11, p90: 12, krig: 13, semi: 14, vector: 15, mg: 16, db: 17, bolt: 18, deagle: 19, fifty: 20, rpg: 22,
  blackout: 4, mini: 6, slug: 9, burst: 10, lever: 12, rpk: 14 };
const unlockLvl = id => UNLOCK[id] || 1, isUnlocked = id => { try { return settings.unlockAll === true || lvlOf(STATS.xp).l >= unlockLvl(id); } catch (e) { return unlockLvl(id) <= 1; } };
const unlocksAt = l => Object.keys(UNLOCK).filter(k => UNLOCK[k] === l);
let inv = [];
let carry = [2, 0, 9];
const widx = id => WEAPONS.findIndex(w => w.id === id);
const EQUIP = {
  frag: { slot: 'lethal', name: 'FRAG GRENADE', short: 'FRAG', desc: 'Bounces and rolls. Hold to cook — 3.5 s fuse.', fuse: 3.5, cook: true },
  semtex: { slot: 'lethal', name: 'SEMTEX', short: 'SEMTEX', desc: 'Sticks to walls, floors and people. 2.2 s fuse after it lands.', fuse: 2.2, stick: true },
  molotov: { slot: 'lethal', name: 'MOLOTOV', short: 'MOLOTOV', desc: 'Shatters on impact and sets the area ablaze for 6 s.', fuse: 6, impact: true },
  smoke: { slot: 'tactical', name: 'SMOKE GRENADE', short: 'SMOKE', desc: 'A thick smoke screen for 15 s. Blocks line of sight — bots can\'t see through it.', fuse: 1.6 },
  flash: { slot: 'tactical', name: 'FLASHBANG', short: 'FLASH', desc: 'Blinds and deafens anyone looking toward it, including bots.', fuse: 1.4 },
};
const DEFAULT_EQ = { assault: ['frag', 'flash'], scout: ['semtex', 'smoke'], heavy: ['frag', 'smoke'], recon: ['semtex', 'smoke'], wolf: ['frag', 'flash'], witch: ['molotov', 'flash'] };
const DEFAULT_LO = { assault: ['rifle', 'pistol', 'knife'], scout: ['smg', 'pistol', 'knife'], heavy: ['lmg', 'pistol', 'knife'], recon: ['dmr', 'pistol', 'knife'], wolf: ['shotgun', 'pistol', 'knife'], witch: ['rifle', 'pistol', 'knife'] }; // every default is level-1 gear
if (!settings.loadouts || typeof settings.loadouts !== 'object') settings.loadouts = {};
if (!settings.att || typeof settings.att !== 'object') settings.att = {};
function getLO(c = settings.cls) { // per-class loadout, validated
  const d = DEFAULT_LO[c] || DEFAULT_LO.assault, lo = Object.assign({ primary: d[0], secondary: d[1], melee: d[2] }, settings.loadouts[c] || {});
  for (const slot of ['primary', 'secondary', 'melee']) { const k = widx(lo[slot]); if (k < 0 || WEAPONS[k].slot !== slot || !isUnlocked(lo[slot])) lo[slot] = d[['primary', 'secondary', 'melee'].indexOf(slot)]; }
  const de = DEFAULT_EQ[c] || DEFAULT_EQ.assault; if (!EQUIP[lo.lethal] || EQUIP[lo.lethal].slot !== 'lethal' || !isUnlocked(lo.lethal)) lo.lethal = isUnlocked(de[0]) ? de[0] : 'frag'; if (!EQUIP[lo.tactical] || EQUIP[lo.tactical].slot !== 'tactical' || !isUnlocked(lo.tactical)) lo.tactical = isUnlocked(de[1]) ? de[1] : 'flash';
  return lo;
}
function setLO(slot, id) { const lo = getLO(); lo[slot] = id; settings.loadouts[settings.cls] = lo; const C = customs()[settings.activeLO]; if (C) C[slot] = id; saveSettings(); }
function customs() {
  if (!Array.isArray(settings.custom) || settings.custom.length !== 5) {
    const order = ['assault', 'scout', 'heavy', 'recon', 'wolf']; settings.custom = order.map((c, i) => { const lo = getLO(c); return { name: 'LOADOUT ' + (i + 1), cls: c, primary: lo.primary, secondary: lo.secondary, melee: lo.melee, lethal: lo.lethal, tactical: lo.tactical }; });
    settings.activeLO = Math.max(0, order.indexOf(settings.cls)); }
  return settings.custom;
}
function applyCustom(i) { const L = customs()[i]; if (!L) return; settings.activeLO = i; if (CLASSES[L.cls]) settings.cls = L.cls; settings.loadouts[settings.cls] = { primary: L.primary, secondary: L.secondary, melee: L.melee, lethal: L.lethal, tactical: L.tactical }; const v = getLO(); Object.assign(L, v); saveSettings(); }
function loName(i) { const L = customs()[i]; return `${esc(L.name)}<small>${CLASSES[L.cls] ? CLASSES[L.cls].name : ''} · ${WEAPONS[widx(L.primary)] ? WEAPONS[widx(L.primary)].short : ''} + ${WEAPONS[widx(L.secondary)] ? WEAPONS[widx(L.secondary)].short : ''}</small>`; }
const loadoutIdx = () => { const lo = getLO(); return [widx(lo.primary), widx(lo.secondary), widx(lo.melee)]; };
const wst = { swingT: 0, swingHit: true, quick: false, quickFrom: -1, boltT: 0, cur: 2, last: 0, fireCD: 0, reloadT: 0, reloading: false, switchT: 0, ads: 0, bloom: 0, held: false, consec: 0, sinceShot: 9, pumpT: 0 };
// ---- viewmodels
const vmRoot = new THREE.Group(); vmScene.add(vmRoot); vmScene.add(vmCam);
const vmModels = [];
const gloveMat = MAT({ color: 0x2a2a2a, roughness: 0.75 }), sleeveMat = MAT({ map: (() => { const t = getTex('camo').clone(); t.needsUpdate = true; t.repeat.set(1.5, 0.6); return t; })(), color: 0xa89a7c, roughness: 0.95 });
const GMAT = {
  steel: PHONG({ color: 0x2e3035, specular: 0x5a5a5a, shininess: 50 }),
  black: PHONG({ color: 0x18191c, specular: 0x262626, shininess: 14 }),
  park: PHONG({ color: 0x34362f, specular: 0x333333, shininess: 22 }),
  poly: PHONG({ color: 0x1d1e20, specular: 0x1a1a1a, shininess: 8 }),
  fde: PHONG({ color: 0x9c8a68, specular: 0x222222, shininess: 10 }),
  od: PHONG({ color: 0x4a5038, specular: 0x111111, shininess: 6 }),
  wood: PHONG({ color: 0x7a4a24, specular: 0x2a1608, shininess: 28 }),
  bakelite: PHONG({ color: 0x5c2412, specular: 0x331a10, shininess: 30 }),
  brass: PHONG({ color: 0xc9a245, specular: 0x886622, shininess: 70 }),
  blued: PHONG({ color: 0x23272e, specular: 0x6a7280, shininess: 80 }),
  blade: PHONG({ color: 0xb8bec6, specular: 0xffffff, shininess: 120 }),
  leather: PHONG({ color: 0x4a2c18, specular: 0x111111, shininess: 6 }),
  gold: PHONG({ color: 0xc9a227, specular: 0xffe08a, shininess: 80 }),
  iron: PHONG({ color: 0x2a2a2c, specular: 0x777777, shininess: 60 }),
  lens: new THREE.MeshBasicMaterial({ color: 0x4f9adf, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
  dot: new THREE.MeshBasicMaterial({ color: 0xff2a2a }), trit: new THREE.MeshBasicMaterial({ color: 0x9cff6a }), red: new THREE.MeshBasicMaterial({ color: 0xff4020 }),
};
const _gBox = new THREE.BoxGeometry(1, 1, 1);
// Build a weapon. Coordinates: x = forward along the bore (metres), y = up. Converted to three.js (-z forward).
function buildGun(id, att = {}, withHands = true) {
  const g = new THREE.Group(), parts = {}, M = GMAT, W0 = WEAPONS.find(x => x.id === id) || {}, gid = W0.geo || id;
  const add = (m, par = g) => { par.add(m); return m; };
  const P = (pts, w, mat, par = g, holes, s = 0) => {
    const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath();
    if (holes) for (const hp of holes) { const h = new THREE.Path(); h.moveTo(hp[0][0], hp[0][1]); for (let i = 1; i < hp.length; i++) h.lineTo(hp[i][0], hp[i][1]); h.closePath(); sh.holes.push(h); }
    const bev = Math.min(0.0022, w * 0.18), geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.0005, w - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 4 });
    geo.translate(0, 0, -(w - bev * 2) / 2); geo.rotateY(Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.position.x = s; return add(m, par);
  };
  const X = (x0, x1, y0, y1, w, mat, s = 0, par = g) => { const m = new THREE.Mesh(_gBox, mat); m.scale.set(w, y1 - y0, x1 - x0); m.position.set(s, (y0 + y1) / 2, -(x0 + x1) / 2); return add(m, par); };
  const Cz = (r, x0, x1, y, mat, seg = 14, rFront, par = g, s = 0, open = false) => { const geo = new THREE.CylinderGeometry(rFront !== undefined ? rFront : r, r, 1, seg, 1, open); const m = new THREE.Mesh(geo, mat); m.scale.y = x1 - x0; m.rotation.x = -Math.PI / 2; m.position.set(s, y, -(x0 + x1) / 2); return add(m, par); };
  const sub = () => { const s = new THREE.Group(); g.add(s); return s; };
  const mark = (x, y, s = 0) => { const o = new THREE.Object3D(); o.position.set(s, y, -x); g.add(o); return o; };
  const limb = (a, b, r, mat) => { const d = new V3().subVectors(b, a), len = d.length(); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 1, 10), mat); m.position.addVectors(a, b).multiplyScalar(0.5); m.scale.y = len; m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); g.add(m); return m; };
  const hands = (rg, lf) => { // [forward, up, side]
    parts.gripPt = mark(rg[0], rg[1], rg[2] || 0); parts.forePt = lf ? mark(lf[0], lf[1], lf[2] || 0) : null;
    if (!withHands) return;
    const R = new V3(rg[2] || 0.002, rg[1], -rg[0]);
    X(rg[0] - 0.035, rg[0] + 0.03, rg[1] - 0.04, rg[1] + 0.035, 0.05, gloveMat, R.x); X(rg[0] + 0.0, rg[0] + 0.05, rg[1] + 0.015, rg[1] + 0.04, 0.052, gloveMat, R.x - 0.005);
    limb(new V3(R.x + 0.005, R.y - 0.03, R.z + 0.04), new V3(R.x + 0.08, R.y - 0.22, R.z + 0.38), 0.036, sleeveMat);
    if (lf) { const L = new V3(lf[2] || 0, lf[1], -lf[0]); X(lf[0] - 0.045, lf[0] + 0.045, lf[1] - 0.03, lf[1] + 0.025, 0.054, gloveMat, L.x); X(lf[0] - 0.03, lf[0] + 0.03, lf[1], lf[1] + 0.03, 0.018, gloveMat, L.x + 0.03);
      limb(new V3(L.x - 0.01, L.y - 0.02, L.z + 0.03), new V3(L.x - 0.17, L.y - 0.26, L.z + 0.44), 0.036, sleeveMat); }
  };
  const rail = (x0, x1, y, w = 0.021) => { X(x0, x1, y - 0.006, y, w, M.black); for (let x = x0 + 0.003; x < x1 - 0.004; x += 0.011) X(x, x + 0.005, y, y + 0.0035, w, M.black); return y + 0.0035; };
  const optic = (kind, cx, ry) => { // returns sight line height
    if (kind === 'reddot') { X(cx - 0.025, cx + 0.025, ry, ry + 0.016, 0.024, M.black); Cz(0.02, cx - 0.03, cx + 0.03, ry + 0.04, M.black, 18, undefined, g, 0, true);
      const l = add(new THREE.Mesh(new THREE.CircleGeometry(0.019, 16), M.lens)); l.position.set(0, ry + 0.04, -(cx + 0.028)); X(cx + 0.024, cx + 0.025, ry + 0.0388, ry + 0.0412, 0.0024, M.dot); return ry + 0.04; }
    if (kind === 'holo') { X(cx - 0.04, cx + 0.04, ry, ry + 0.014, 0.04, M.black); for (const sd of [-1, 1]) X(cx - 0.005, cx + 0.04, ry + 0.014, ry + 0.06, 0.004, M.black, sd * 0.019); X(cx - 0.005, cx + 0.04, ry + 0.056, ry + 0.062, 0.042, M.black);
      const l = add(new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.04), M.lens)); l.position.set(0, ry + 0.035, -(cx + 0.03));
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0006, 4, 24), M.dot)); ring.position.set(0, ry + 0.036, -(cx + 0.029)); X(cx + 0.029, cx + 0.03, ry + 0.0355, ry + 0.0365, 0.001, M.dot); return ry + 0.036; }
    if (kind === 'acog' || kind === 'scope') { const big = kind === 'scope', y = ry + (big ? 0.042 : 0.036);
      for (const x of [cx - 0.04, cx + 0.04]) X(x - 0.007, x + 0.007, ry, y, big ? 0.03 : 0.024, M.black);
      Cz(big ? 0.016 : 0.015, cx - 0.06, cx + 0.07, y, M.black); Cz(big ? 0.016 : 0.015, cx + 0.07, cx + (big ? 0.13 : 0.1), y, M.black, 16, big ? 0.027 : 0.021);
      Cz(big ? 0.022 : 0.019, cx - (big ? 0.12 : 0.095), cx - 0.06, y, M.black, 16, big ? 0.016 : 0.015);
      const tur = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.022, 12), M.black)); tur.position.set(0, y + 0.024, -cx);
      if (big) { const t2 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.022, 12), M.black)); t2.rotation.z = Math.PI / 2; t2.position.set(0.024, y, -cx); }
      else X(cx - 0.03, cx + 0.05, y + 0.014, y + 0.018, 0.004, M.red);
      const l = add(new THREE.Mesh(new THREE.CircleGeometry(big ? 0.025 : 0.019, 16), M.lens)); l.position.set(0, y, -(cx + (big ? 0.131 : 0.101))); return y; }
    return 0;
  };
  const muzzle = (kind, mx, my, r, def) => {
    if (kind === 'supp') { Cz(r * 2.4, mx, mx + 0.17, my, M.black, 18); Cz(r * 0.7, mx + 0.17, mx + 0.1705, my, M.steel, 10); return mx + 0.17; }
    if (kind === 'comp') { Cz(r * 1.6, mx, mx + 0.055, my, M.steel, 6); for (const sd of [-1, 1]) X(mx + 0.015, mx + 0.03, my - 0.004, my + 0.004, 0.002, M.black, sd * r * 1.55); X(mx + 0.02, mx + 0.04, my + r * 1.4, my + r * 1.62, 0.006, M.black); return mx + 0.055; }
    if (def) def(); return mx + (def ? 0.05 : 0);
  };
  const extMag = (grp, topY) => { if (att.mag === 'ext') { grp.scale.y = 1.42; grp.position.y = topY - topY * 1.42; } };
  let mz = 0.6, my = 0.02, sightY = 0.05, eject = null, casing = 'brass';
  const O = att.optic || 'iron';
  switch (gid) {
    case 'pistol': { // polymer-frame 9mm service pistol
      const S = parts.slide = sub();
      P([[-0.035, 0.013], [0.15, 0.013], [0.158, 0.021], [0.158, 0.036], [0.15, 0.045], [-0.03, 0.045], [-0.035, 0.04]], 0.026, M.steel, S);
      for (let i = 0; i < 7; i++) X(-0.03 + i * 0.006, -0.027 + i * 0.006, 0.017, 0.042, 0.0266, M.black, 0, S);
      X(0.03, 0.07, 0.0445, 0.0462, 0.016, M.black, 0, S);
      for (const sd of [-1, 1]) { X(-0.026, -0.014, 0.045, 0.053, 0.007, M.black, sd * 0.0075, S); X(-0.0145, -0.0135, 0.0495, 0.0515, 0.002, M.trit, sd * 0.0075, S); }
      X(0.136, 0.145, 0.045, 0.0535, 0.0042, M.black, 0, S); X(0.1355, 0.1365, 0.0505, 0.0525, 0.0024, M.trit, 0, S);
      Cz(0.0066, 0.152, 0.1585, 0.029, M.black, 12, undefined, S);
      P([[-0.035, 0.015], [0.15, 0.015], [0.15, 0.003], [0.07, 0.0], [0.068, -0.026], [0.06, -0.031], [0.02, -0.032], [0.006, -0.015], [0.0, -0.011], [-0.022, -0.108], [-0.056, -0.112], [-0.052, -0.09], [-0.044, -0.03], [-0.038, 0.004]], 0.024, M.poly, g,
        [[[0.058, -0.004], [0.058, -0.025], [0.024, -0.027], [0.012, -0.009]]]);
      X(0.09, 0.145, -0.005, 0.003, 0.02, M.poly); X(0.03, 0.036, -0.021, -0.006, 0.0045, M.black);
      const MG = parts.mag = sub(); X(-0.06, -0.021, -0.121, -0.111, 0.026, M.poly, 0, MG); extMag(MG, -0.0);
      if (att.mag === 'ext') { MG.scale.y = 1; X(-0.062, -0.022, -0.16, -0.111, 0.022, M.poly, 0, MG); }
      hands([-0.03, -0.06], [-0.035, -0.072, -0.02]);
      mz = muzzle(att.muzzle, 0.159, 0.029, 0.007); my = 0.029; sightY = 0.0515; eject = [0.05, 0.04, 0.016]; break;
    }
    case 'revolver': {
      P([[-0.028, 0.002], [0.075, 0.002], [0.075, 0.05], [0.05, 0.054], [-0.005, 0.054], [-0.02, 0.048], [-0.028, 0.03]], 0.028, M.blued);
      const C = parts.cyl = sub(); C.position.set(0, 0.027, -0.035);
      const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.046, 18), M.blued); cm.rotation.x = Math.PI / 2; C.add(cm);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, f = new THREE.Mesh(_gBox, M.black); f.scale.set(0.006, 0.006, 0.04); f.position.set(Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0); f.rotation.z = a; C.add(f); }
      Cz(0.0105, 0.075, 0.205, 0.034, M.blued, 16); P([[0.075, 0.006], [0.205, 0.009], [0.205, 0.026], [0.075, 0.028]], 0.019, M.blued);
      X(0.075, 0.205, 0.042, 0.048, 0.012, M.blued); P([[0.183, 0.048], [0.2, 0.048], [0.2, 0.061], [0.193, 0.061]], 0.004, M.blued); Cz(0.0048, 0.2052, 0.2058, 0.034, M.black, 10);
      for (const sd of [-1, 1]) X(-0.008, 0.0, 0.054, 0.0615, 0.004, M.blued, sd * 0.0045);
      P([[-0.025, 0.04], [-0.012, 0.05], [-0.016, 0.066], [-0.03, 0.062]], 0.008, M.steel);
      P([[0.032, 0.002], [0.036, -0.012], [0.02, -0.03], [-0.005, -0.028], [-0.012, -0.012], [-0.008, 0.002]], 0.008, M.blued, g, [[[0.028, 0.0], [0.03, -0.01], [0.018, -0.025], [0.0, -0.023], [-0.005, -0.011], [-0.003, -0.001]]]);
      X(0.012, 0.017, -0.019, 0.0, 0.004, M.steel);
      P([[-0.028, 0.004], [0.002, 0.0], [-0.004, -0.03], [-0.012, -0.092], [-0.03, -0.104], [-0.052, -0.098], [-0.05, -0.06], [-0.04, -0.01]], 0.032, M.wood);
      hands([-0.025, -0.05], [-0.03, -0.062, -0.022]);
      mz = 0.207; my = 0.034; sightY = 0.061; eject = null; break;
    }
    case 'rifle': case 'dmr': { // AR-15 carbine / SR-25 style marksman
      const dmr = gid === 'dmr', hgE = dmr ? 0.5 : 0.42, bE = dmr ? 0.7 : 0.56, rec = W0.finish ? M[W0.finish] : dmr ? M.fde : M.park;
      X(-0.085, 0.175, 0.0, 0.048, 0.044, rec); X(0.0, 0.055, 0.01, 0.032, 0.0455, M.black);
      Cz(0.007, -0.02, 0.01, 0.035, M.black, 10, undefined, g, 0.024);
      const ry = rail(-0.085, 0.175, 0.054);
      Cz(0.027, 0.175, hgE, 0.022, M.black, 8); rail(0.175, hgE, 0.054, 0.019);
      for (let x = 0.2; x < hgE - 0.03; x += 0.045) for (const sd of [-1, 1]) X(x, x + 0.025, 0.012, 0.022, 0.002, M.poly, sd * 0.026);
      Cz(0.0085, hgE, bE, 0.022, M.steel, 12);
      P([[-0.085, 0.0], [0.165, 0.0], [0.165, -0.012], [0.13, -0.018], [0.125, -0.034], [0.055, -0.034], [0.05, -0.022], [-0.03, -0.022], [-0.085, -0.008]], 0.042, rec);
      X(-0.005, 0.05, -0.045, -0.041, 0.012, rec); X(0.046, 0.05, -0.045, -0.022, 0.012, rec); X(0.02, 0.025, -0.037, -0.022, 0.006, M.steel);
      P([[-0.012, -0.02], [0.01, -0.02], [-0.02, -0.11], [-0.024, -0.114], [-0.054, -0.114], [-0.052, -0.098], [-0.03, -0.03], [-0.03, -0.02]], 0.03, M.black);
      const MG = parts.mag = sub();
      if (dmr) P([[0.06, -0.034], [0.125, -0.034], [0.13, -0.12], [0.065, -0.12]], 0.03, M.black, MG);
      else P([[0.058, -0.034], [0.12, -0.034], [0.13, -0.1], [0.145, -0.17], [0.152, -0.2], [0.092, -0.212], [0.083, -0.17], [0.072, -0.1]], 0.026, M.fde, MG);
      extMag(MG, -0.034);
      X(-0.1, -0.085, 0.036, 0.046, 0.03, M.black);
      if (dmr) { P([[-0.085, 0.04], [-0.33, 0.05], [-0.34, 0.04], [-0.34, -0.085], [-0.32, -0.09], [-0.2, -0.035], [-0.085, -0.01]], 0.044, M.black); X(-0.3, -0.15, 0.05, 0.068, 0.03, M.black); }
      else { Cz(0.0145, -0.25, -0.085, 0.02, M.black, 12); P([[-0.17, 0.036], [-0.3, 0.036], [-0.31, 0.03], [-0.31, -0.072], [-0.298, -0.078], [-0.26, -0.02], [-0.18, 0.0], [-0.17, 0.01]], 0.04, M.black); }
      if (O === 'iron') { X(-0.075, -0.052, ry, ry + 0.03, 0.022, M.black); X(-0.066, -0.06, ry + 0.022, ry + 0.03, 0.023, M.dot ? M.black : M.black);
        X(hgE - 0.035, hgE - 0.015, ry, ry + 0.02, 0.016, M.black); X(hgE - 0.028, hgE - 0.024, ry + 0.02, ry + 0.031, 0.003, M.black); sightY = ry + 0.029; }
      else sightY = optic(dmr ? 'scope' : O, 0.03, ry);
      hands([-0.03, -0.062], [hgE - 0.13, -0.012]);
      mz = muzzle(att.muzzle, bE, 0.022, 0.009, () => Cz(0.0115, bE, bE + 0.05, 0.022, M.black, 8)); my = 0.022; eject = [0.025, 0.022, 0.024]; break;
    }
    case 'ak': {
      P([[-0.09, 0.0], [0.2, 0.0], [0.2, 0.038], [0.17, 0.042], [-0.06, 0.046], [-0.085, 0.04], [-0.09, 0.03]], 0.042, M.blued);
      X(-0.06, 0.15, 0.044, 0.048, 0.034, M.blued);
      P([[0.17, 0.038], [0.235, 0.038], [0.235, 0.05], [0.205, 0.057], [0.17, 0.052]], 0.03, M.blued);
      P([[0.2, -0.008], [0.39, -0.004], [0.39, 0.03], [0.2, 0.036]], 0.046, M.wood); Cz(0.014, 0.235, 0.37, 0.05, M.wood, 12);
      P([[0.37, 0.02], [0.4, 0.02], [0.4, 0.064], [0.37, 0.064]], 0.022, M.blued); Cz(0.0085, 0.39, 0.62, 0.026, M.blued, 12);
      P([[0.57, 0.014], [0.6, 0.014], [0.6, 0.068], [0.585, 0.068], [0.57, 0.04]], 0.02, M.blued); X(0.583, 0.587, 0.05, 0.059, 0.003, M.black);
      const MG = parts.mag = sub(); P([[0.06, 0.0], [0.125, 0.0], [0.15, -0.08], [0.19, -0.17], [0.205, -0.19], [0.15, -0.215], [0.125, -0.18], [0.09, -0.1], [0.065, -0.04]], 0.028, M.bakelite, MG); extMag(MG, 0.0);
      P([[-0.015, 0.0], [0.012, 0.0], [-0.012, -0.096], [-0.046, -0.1], [-0.04, -0.02]], 0.03, M.bakelite);
      X(-0.005, 0.06, -0.027, -0.023, 0.012, M.blued); X(0.056, 0.06, -0.027, 0.0, 0.012, M.blued); X(0.025, 0.03, -0.018, 0.0, 0.006, M.steel);
      X(0.08, 0.1, 0.02, 0.032, 0.012, M.blued, 0.027);
      P([[-0.09, 0.038], [-0.09, -0.012], [-0.15, -0.038], [-0.33, -0.1], [-0.345, -0.095], [-0.345, 0.008], [-0.33, 0.022], [-0.16, 0.034]], 0.042, M.wood); X(-0.352, -0.345, -0.1, 0.012, 0.044, M.blued);
      if (O === 'iron') sightY = 0.057; else { X(-0.03, 0.09, 0.046, 0.058, 0.03, M.black); sightY = optic(O, 0.03, 0.058); }
      hands([-0.03, -0.055], [0.29, 0.008]);
      mz = muzzle(att.muzzle, 0.62, 0.026, 0.009, () => Cz(0.012, 0.62, 0.66, 0.026, M.blued, 6)); my = 0.026; eject = [0.03, 0.03, 0.022]; break;
    }
    case 'smg': {
      Cz(0.023, -0.06, 0.2, 0.024, M.black, 16); X(-0.04, 0.18, 0.044, 0.05, 0.016, M.black);
      X(0.18, 0.2, 0.044, 0.05, 0.02, M.black); const hood = add(new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 16), M.black)); hood.position.set(0, 0.062, -0.19);
      X(0.188, 0.192, 0.047, 0.059, 0.003, M.black);
      Cz(0.012, -0.05, -0.03, 0.061, M.black, 14); X(-0.055, -0.025, 0.044, 0.05, 0.024, M.black);
      Cz(0.008, 0.1, 0.235, 0.048, M.steel); X(0.2, 0.215, 0.045, 0.06, 0.005, M.black, -0.02);
      P([[0.1, -0.01], [0.25, -0.005], [0.26, 0.012], [0.25, 0.04], [0.1, 0.04]], 0.05, M.black); Cz(0.008, 0.25, 0.29, 0.024, M.steel);
      P([[-0.07, 0.002], [0.06, 0.002], [0.06, -0.02], [0.04, -0.03], [0.0, -0.03], [-0.04, -0.022], [-0.07, -0.012]], 0.036, M.black);
      P([[-0.028, -0.022], [-0.005, -0.022], [-0.03, -0.105], [-0.062, -0.108], [-0.055, -0.03]], 0.032, M.black);
      const MG = parts.mag = sub(); P([[0.06, 0.0], [0.09, 0.0], [0.105, -0.07], [0.135, -0.15], [0.11, -0.16], [0.082, -0.08], [0.062, -0.03]], 0.022, M.steel, MG); extMag(MG, 0.0);
      for (const sd of [-1, 1]) Cz(0.004, -0.24, -0.06, 0.03, M.steel, 8, undefined, g, sd * 0.014); P([[-0.25, 0.045], [-0.235, 0.045], [-0.235, -0.04], [-0.25, -0.045]], 0.045, M.black);
      if (O === 'iron') sightY = 0.06; else sightY = optic(O, 0.05, 0.05);
      hands([-0.04, -0.062], [0.18, 0.0]);
      mz = muzzle(att.muzzle, 0.29, 0.024, 0.008, () => Cz(0.011, 0.27, 0.29, 0.024, M.black, 6)); my = 0.024; eject = [0.02, 0.03, 0.024]; break;
    }
    case 'shotgun': {
      P([[-0.05, -0.012], [0.17, -0.012], [0.17, 0.046], [0.0, 0.048], [-0.03, 0.042], [-0.05, 0.03]], 0.046, M.blued);
      X(0.02, 0.1, 0.005, 0.034, 0.002, M.black, 0.0235);
      Cz(0.0135, 0.17, 0.66, 0.026, M.blued, 16); X(0.17, 0.66, 0.039, 0.044, 0.008, M.blued); X(0.645, 0.65, 0.044, 0.049, 0.004, M.brass);
      Cz(0.0125, 0.17, 0.56, -0.006, M.blued, 14); Cz(0.014, 0.56, 0.58, -0.006, M.blued, 14);
      const PP = parts.pump = sub(); Cz(0.023, 0.25, 0.42, -0.006, M.wood, 16, undefined, PP); for (let x = 0.27; x < 0.41; x += 0.018) Cz(0.0235, x, x + 0.004, -0.006, M.black, 16, undefined, PP);
      P([[-0.05, 0.032], [-0.08, 0.03], [-0.38, 0.01], [-0.39, 0.012], [-0.395, -0.12], [-0.375, -0.128], [-0.14, -0.06], [-0.1, -0.07], [-0.08, -0.05], [-0.05, -0.01]], 0.044, M.wood); X(-0.408, -0.394, -0.126, 0.012, 0.044, M.black);
      X(-0.02, 0.05, -0.036, -0.032, 0.012, M.blued); X(0.046, 0.05, -0.036, -0.012, 0.012, M.blued); X(0.015, 0.02, -0.03, -0.012, 0.005, M.steel);
      if (O === 'iron') sightY = 0.047; else sightY = optic(O, 0.06, 0.048);
      hands([-0.07, -0.042], [0.33, -0.022]);
      mz = 0.66; my = 0.026; eject = [0.06, 0.02, 0.024]; casing = 'shell'; break;
    }
    case 'lmg': {
      P([[-0.12, -0.01], [0.2, -0.01], [0.2, 0.058], [-0.1, 0.062], [-0.12, 0.05]], 0.06, M.park);
      P([[-0.08, 0.058], [0.16, 0.058], [0.16, 0.078], [-0.06, 0.082], [-0.08, 0.075]], 0.058, M.park); const ry = rail(-0.06, 0.15, 0.084);
      X(0.2, 0.36, 0.03, 0.05, 0.032, M.black); Cz(0.011, 0.2, 0.66, 0.03, M.steel, 12); Cz(0.009, 0.2, 0.48, 0.008, M.steel);
      P([[0.2, -0.01], [0.34, -0.006], [0.34, 0.028], [0.2, 0.03]], 0.06, M.black);
      for (const sd of [-1, 1]) Cz(0.005, 0.38, 0.62, 0.0, M.black, 8, undefined, g, sd * 0.012); X(0.48, 0.5, -0.008, 0.02, 0.04, M.black);
      for (const x of [0.25, 0.33]) X(x, x + 0.012, 0.05, 0.1, 0.01, M.black); X(0.25, 0.345, 0.095, 0.106, 0.014, M.black);
      const MG = parts.mag = sub(); P([[0.0, -0.01], [0.14, -0.01], [0.145, -0.14], [0.0, -0.14]], 0.1, M.od, MG, null, -0.02); X(0.02, 0.12, -0.06, -0.05, 0.102, M.black, -0.02, MG);
      P([[-0.025, -0.01], [0.0, -0.01], [-0.03, -0.1], [-0.064, -0.104], [-0.06, -0.03]], 0.032, M.black);
      P([[-0.12, 0.04], [-0.36, 0.04], [-0.37, 0.03], [-0.37, -0.09], [-0.35, -0.095], [-0.2, -0.03], [-0.12, -0.01]], 0.044, M.black, g, [[[-0.33, 0.015], [-0.22, 0.015], [-0.2, -0.008], [-0.335, -0.06]]]);
      if (O === 'iron') { X(-0.045, -0.025, ry, ry + 0.022, 0.02, M.black); X(0.6, 0.606, 0.041, ry + 0.02, 0.004, M.black); sightY = ry + 0.019; }
      else sightY = optic(O, 0.02, ry);
      hands([-0.045, -0.06], [0.27, 0.0]);
      mz = muzzle(att.muzzle, 0.66, 0.03, 0.011, () => Cz(0.014, 0.66, 0.71, 0.03, M.black, 6)); my = 0.03; eject = [0.05, -0.01, 0.0]; break;
    }
    case 'sniper': {
      P([[0.08, -0.035], [0.47, -0.03], [0.48, -0.01], [0.47, 0.02], [0.08, 0.022]], 0.052, M.fde);
      Cz(0.019, -0.1, 0.13, 0.03, M.steel, 16);
      const B = parts.bolt = sub(); Cz(0.009, -0.13, -0.05, 0.03, M.steel, 12, undefined, B); X(-0.082, -0.072, 0.012, 0.032, 0.04, M.steel, 0.03, B);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), M.black); kn.position.set(0.052, 0.012, 0.077); B.add(kn);
      Cz(0.014, 0.13, 0.82, 0.03, M.steel, 14, 0.012);
      P([[0.82, 0.014], [0.88, 0.014], [0.88, 0.046], [0.82, 0.046]], 0.03, M.black); for (const x of [0.835, 0.85, 0.865]) X(x, x + 0.005, 0.018, 0.042, 0.032, M.steel);
      const MG = parts.mag = sub(); X(0.0, 0.09, -0.07, -0.015, 0.036, M.black, 0, MG);
      X(-0.02, 0.05, -0.045, -0.041, 0.012, M.black); X(0.046, 0.05, -0.045, -0.02, 0.012, M.black); X(0.02, 0.025, -0.037, -0.02, 0.005, M.steel);
      P([[-0.04, -0.01], [-0.015, -0.01], [-0.04, -0.1], [-0.072, -0.104], [-0.066, -0.03]], 0.034, M.fde);
      P([[-0.1, 0.03], [-0.15, 0.035], [-0.42, 0.042], [-0.43, 0.03], [-0.43, -0.12], [-0.41, -0.13], [-0.3, -0.09], [-0.22, -0.05], [-0.12, -0.035], [-0.1, -0.02]], 0.05, M.fde, g, [[[-0.36, 0.0], [-0.26, 0.0], [-0.24, -0.03], [-0.34, -0.07]]]);
      X(-0.38, -0.2, 0.042, 0.07, 0.03, M.black); X(-0.442, -0.43, -0.13, 0.042, 0.05, M.black);
      sightY = optic('scope', 0.0, 0.06);
      hands([-0.055, -0.062], [0.3, -0.04]);
      mz = muzzle(att.muzzle, 0.88, 0.03, 0.014); my = 0.03; eject = [-0.05, 0.035, 0.02]; break;
    }
    case 'knife': {
      P([[0.0, 0.0], [0.15, 0.003], [0.185, 0.012], [0.16, 0.022], [0.0, 0.022]], 0.0045, M.blade); X(0.005, 0.14, 0.017, 0.019, 0.005, M.steel);
      X(-0.01, 0.0, -0.012, 0.034, 0.03, M.black); Cz(0.013, -0.115, -0.01, 0.011, M.black, 10); for (let x = -0.1; x < -0.02; x += 0.012) Cz(0.0136, x, x + 0.003, 0.011, M.poly, 10);
      parts.gripPt = mark(-0.06, 0.011); if (withHands) { X(-0.095, -0.025, -0.02, 0.04, 0.05, gloveMat); limb(new V3(0.0, -0.01, 0.06), new V3(0.08, -0.22, 0.4), 0.036, sleeveMat); }
      mz = 0.18; my = 0.01; sightY = 0; break;
    }
    case 'sword': {
      P([[0.0, -0.022], [0.38, -0.03], [0.47, -0.012], [0.5, 0.012], [0.46, 0.03], [0.0, 0.02]], 0.004, M.black); P([[0.01, -0.03], [0.38, -0.038], [0.47, -0.02], [0.47, -0.012], [0.38, -0.03], [0.01, -0.022]], 0.0045, M.blade);
      X(-0.012, 0.0, -0.03, 0.03, 0.02, M.poly); Cz(0.016, -0.14, -0.012, 0.0, M.poly, 10); X(-0.145, -0.125, -0.02, 0.02, 0.026, M.poly);
      parts.gripPt = mark(-0.07, 0.0); if (withHands) { X(-0.11, -0.03, -0.03, 0.03, 0.05, gloveMat); limb(new V3(0.0, -0.02, 0.07), new V3(0.08, -0.22, 0.4), 0.036, sleeveMat); }
      mz = 0.5; my = 0; sightY = 0; break;
    }
    case 'rpg': { // shoulder-fired launcher: tube, warhead, grips, iron sight
      Cz(0.036, -0.48, 0.5, 0.03, M.od, 16); Cz(0.042, -0.5, -0.42, 0.03, M.black, 16); Cz(0.041, 0.44, 0.52, 0.03, M.black, 16);
      const WH = parts.warhead = sub(); Cz(0.034, 0.52, 0.6, 0.03, M.od, 14, 0.044, WH); Cz(0.044, 0.6, 0.72, 0.03, M.od, 14, 0.044, WH); Cz(0.044, 0.72, 0.84, 0.03, M.od, 14, 0.008, WH);
      X(0.02, 0.2, -0.06, 0.0, 0.03, M.wood); P([[0.0, -0.005], [0.03, -0.005], [0.0, -0.12], [-0.03, -0.12]], 0.03, M.black); P([[0.22, -0.005], [0.25, -0.005], [0.24, -0.1], [0.21, -0.1]], 0.03, M.black);
      X(0.1, 0.13, 0.066, 0.1, 0.012, M.black, -0.022); X(0.1, 0.104, 0.1, 0.112, 0.004, M.black, -0.022); sightY = 0.106;
      hands([0.0, -0.06], [0.22, -0.055]); mz = 0.85; my = 0.03; eject = null; break;
    }
    case 'pan': {
      Cz(0.011, -0.12, 0.1, 0.0, M.iron, 10); const pan = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.105, 0.035, 22), M.iron)); pan.rotation.z = Math.PI / 2; pan.position.set(0, 0, -0.2);
      const inside = add(new THREE.Mesh(new THREE.CircleGeometry(0.103, 22), GMAT.steel)); inside.rotation.y = -Math.PI / 2; inside.position.set(-0.0182, 0, -0.2);
      parts.gripPt = mark(-0.07, 0.0); if (withHands) { X(-0.11, -0.03, -0.03, 0.03, 0.05, gloveMat); limb(new V3(0.0, -0.02, 0.07), new V3(0.08, -0.22, 0.4), 0.036, sleeveMat); }
      mz = 0.32; my = 0; sightY = 0; break;
    }
  }
  parts.muzzlePt = mark(mz, my);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flash, color: 0xffe0a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.position.set(0, my, -(mz + 0.04)); flash.visible = false; g.add(flash);
  if (W0.gscale) { g.scale.z = W0.gscale; mz *= W0.gscale; }
  if (W0.finish && gid !== 'rifle' && gid !== 'dmr') { const F = M[W0.finish], swap = new Set([M.park, M.blued, M.fde, M.od, M.wood, M.poly]); g.traverse(o => { if (o.isMesh && swap.has(o.material) && o.material !== F) o.material = F; }); }
  return Object.assign(parts, { g, flash, muzzle: -mz, sightY, eject: eject ? new V3(eject[2], eject[1], -eject[0]) : null, casing, slideT: 0, cylRot: 0 });
}
function makeGun(w) {
  const m = buildGun(w.id, settings.att[w.id] || {}, true);
  if (!w.melee) w.adsPos[1] = -m.sightY; // align the actual sights with the screen centre
  m.g.traverse(o => { if (o.isMesh) o.renderOrder = 1; });
  m.g.visible = false; vmRoot.add(m.g); return m;
}
// spent casings in view-model space
const casings = [];
function initCasings() {
  const bg = new THREE.CylinderGeometry(0.0045, 0.0045, 0.02, 8), sg = new THREE.CylinderGeometry(0.009, 0.009, 0.032, 10), sm = PHONG({ color: 0xb02a2a, shininess: 30 });
  for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(bg, GMAT.brass); m.visible = false; vmScene.add(m); casings.push({ m, v: new V3(), s: new V3(), t: 0, bg, sg, sm }); }
}
let casingI = 0;
function ejectCasing(model) {
  if (!model.eject) return;
  const c = casings[casingI]; casingI = (casingI + 1) % casings.length;
  vmRoot.updateMatrixWorld(); c.m.position.copy(model.eject).applyMatrix4(model.g.matrixWorld);
  const shell = model.casing === 'shell'; c.m.geometry = shell ? c.sg : c.bg; c.m.material = shell ? c.sm : GMAT.brass;
  c.v.set(rand(0.9, 1.4), rand(0.9, 1.4), rand(0.1, 0.5)); c.s.set(rand(-20, 20), rand(-20, 20), rand(-20, 20)); c.t = 0.55; c.m.visible = true;
}
function updateCasings(dt) {
  for (const c of casings) { if (c.t <= 0) continue; c.t -= dt; c.v.y -= 6 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.s.x * dt; c.m.rotation.y += c.s.y * dt; c.m.rotation.z += c.s.z * dt; if (c.t <= 0) c.m.visible = false; }
}
function setGloves() { const C = cls(); gloveMat.color.setHex(C.glove); sleeveMat.color.setHex(C.sleeve).multiplyScalar(0.82); }
// ---- attachments
const ATT_OPTS = {
  optic: { rifle: ['iron', 'reddot', 'holo', 'acog'], ak: ['iron', 'reddot', 'holo', 'acog'], scar: ['iron', 'reddot', 'holo', 'acog'], bullpup: ['iron', 'reddot', 'holo', 'acog'], smg: ['iron', 'reddot', 'holo'], vector: ['iron', 'reddot', 'holo'], ump: ['iron', 'reddot', 'holo'], lmg: ['iron', 'reddot', 'holo', 'acog'], shotgun: ['iron', 'reddot', 'holo'], autoshotgun: ['iron', 'reddot', 'holo'] },
  muzzle: { rifle: 1, ak: 1, scar: 1, bullpup: 1, smg: 1, vector: 1, ump: 1, lmg: 1, dmr: 1, sniper: 1, fifty: 1, pistol: 1, mpistol: 1 },
  mag: { rifle: 1, ak: 1, scar: 1, bullpup: 1, smg: 1, vector: 1, ump: 1, pistol: 1, mpistol: 1, dmr: 1, autoshotgun: 1 },
};
// newer guns share a base model, so they share its attachment options (minus what makes no sense, e.g. a double barrel's mag)
for (const [id, base, noMag] of [['grau', 'rifle'], ['krig', 'ak'], ['burst', 'rifle'], ['blackout', 'rifle'], ['mp5', 'smg'], ['p90', 'smg'], ['mini', 'smg'], ['mg', 'lmg'], ['rpk', 'lmg'], ['db', 'shotgun', 1], ['slug', 'shotgun', 1], ['semi', 'dmr'], ['bolt', 'sniper'], ['deagle', 'pistol'], ['lever', 'shotgun', 1]]) {
  if (ATT_OPTS.optic[base]) ATT_OPTS.optic[id] = ATT_OPTS.optic[base].slice(); if (ATT_OPTS.muzzle[base] || id === 'lever' || id === 'slug') ATT_OPTS.muzzle[id] = 1; if (ATT_OPTS.mag[base] && !noMag) ATT_OPTS.mag[id] = 1; }
const attCode = a => a ? [a.optic, a.muzzle, a.mag].map(x => x || '').join('|') : '';
const attDecode = c => { const [optic, muzzle, mag] = String(c).slice(0, 40).split('|'), o = {}; if (ATT_NAMES[optic]) o.optic = optic; if (ATT_NAMES[muzzle]) o.muzzle = muzzle; if (ATT_NAMES[mag]) o.mag = mag; return o; };
const ATT_NAMES = { iron: 'Iron sights', reddot: 'Red dot', holo: 'Holographic', acog: '3× optic', none: 'Standard', supp: 'Suppressor', comp: 'Compensator', std: 'Standard mag', ext: 'Extended mag' };
function applyAttachments(w) {
  if (!w.base) w.base = { mag: w.mag, reload: w.reload, zoom: w.zoom, adsSpeed: w.adsSpeed, kick: w.kick, kickYaw: w.kickYaw, range: w.range.slice(), scope: !!w.scope, vkick: w.vkick || 1 };
  const B = w.base, a = settings.att[w.id] || {};
  Object.assign(w, { mag: B.mag, reload: B.reload, zoom: B.zoom, adsSpeed: B.adsSpeed, kick: B.kick, kickYaw: B.kickYaw, range: B.range.slice(), scope: B.scope, vkick: B.vkick, supp: false, comp: false, scopeStyle: B.scope ? 'scope' : '' });
  if (w.melee) return;
  if (a.optic === 'reddot') w.zoom *= 1.05; else if (a.optic === 'holo') w.zoom *= 1.03; else if (a.optic === 'acog') { w.zoom = 2.6; w.scope = true; w.scopeStyle = 'acog'; w.adsSpeed *= 0.8; } else if (!B.scope) w.adsSpeed *= 1.1;
  if (a.muzzle === 'supp') { w.supp = true; w.range[0] *= 0.9; w.range[1] *= 0.9; w.kick *= 0.95; }
  if (a.muzzle === 'comp') { w.comp = true; w.kick *= 0.78; w.kickYaw *= 0.82; w.vkick *= 0.85; }
  if (a.mag === 'ext') { w.mag = Math.round(B.mag * 1.5); w.reload *= 1.15; w.adsSpeed *= 0.92; }
}


let muzzleLight;

