// ============================================================ MENU TABS, MAP INFO & LOADING SCREEN
let menuTab = 'play';
const LAYOUT = {};
function mapLayout(i) { // top-down plan: buildings shaded by height, water, spawns, pickups
  if (LAYOUT[i]) return LAYOUT[i]; const L = new LevelBuilder(); try { MAPS[i].build(L); } catch (e) { return null; }
  const [x0, z0, x1, z1] = L.bounds, W = 300, H = Math.round(W * (z1 - z0) / (x1 - x0)), k = W / (x1 - x0), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#2a2620'; g.fillRect(0, 0, W, H); for (const w of L.water) { g.fillStyle = '#2f5566'; g.fillRect((w[0] - x0) * k, (w[1] - z0) * k, (w[2] - w[0]) * k, (w[3] - w[1]) * k); }
  for (const b of L.boxes.concat(L.decor).filter(b => b.y1 > 0.05 && b.x1 - b.x0 < 150 && !b.noRender).sort((a, b) => a.y1 - b.y1)) { const v = clamp(70 + b.y1 * 14, 70, 235) | 0; g.fillStyle = b.m === 'container' ? `rgb(${v * 0.9 | 0},${v * 0.55 | 0},${v * 0.4 | 0})` : b.m === 'hesco' || b.m === 'sandbag' ? `rgb(${v},${v * 0.9 | 0},${v * 0.65 | 0})` : `rgb(${v},${v},${v})`; g.fillRect((b.x0 - x0) * k, (b.z0 - z0) * k, Math.max(1, (b.x1 - b.x0) * k), Math.max(1, (b.z1 - b.z0) * k)); }
  const dot = (x, z, col, r) => { g.fillStyle = col; g.beginPath(); g.arc((x - x0) * k, (z - z0) * k, r, 0, 7); g.fill(); };
  if (L.teamSpawns) { L.teamSpawns[0].forEach(([x, z]) => dot(x, z, '#3fa7ff', 3)); L.teamSpawns[1].forEach(([x, z]) => dot(x, z, '#ff5a5a', 3)); }
  for (const [kind, x, , z] of L.pickups) dot(x, z, kind === 'health' ? '#5dff9a' : '#ffcf6b', 1.8);
  return (LAYOUT[i] = c.toDataURL());
}
function mapInfo(i = settings.map) { const m = MAPS[i], el = $('mapinfo'); try { (mapInfo.pre || (mapInfo.pre = {}))[i] || (mapInfo.pre[i] = Object.assign(new Image(), { src: MAPHD(i) })); } catch (e) {} if (!el) return; const lay = mapLayout(i);
  el.innerHTML = `<div class="mitext"><b>${m.name}</b><span>${m.desc}</span><em>${m.tag}</em><small class="mileg"><i style="background:#3fa7ff"></i>Coalition spawn <i style="background:#ff5a5a"></i>Rep. Guard spawn <i style="background:#5dff9a"></i>Health <i style="background:#ffcf6b"></i>Ammo · lighter = taller</small></div>` + (lay ? `<img class="milay" src="${lay}" alt="">` : ''); }
const TIPS = ['Crouch-walking and holding Alt are silent — sneak up for a knife backstab.', 'Listen: sprinting enemies are loud, and footsteps sound different on metal, wood and gravel.',
  'Hold G (or RB) to cook a grenade, then release to throw. Do not hold it too long.', 'Aiming down sights stops your sprint — pre-aim corners before you round them.', 'Sprint, then press C to slide into cover.',
  'Headshots deal roughly double damage. Recon operators get +20% on top.', 'The Breacher\'s heartbeat sensor shows enemies within 20 m on the radar.', 'Unsuppressed gunfire is heard by every enemy within 45 m.',
  'High ground wins fights: climb the container stairs in Freight Yard and the watchtowers on Firebase.', 'On a gaming PC, try Ultra graphics for ambient occlusion and the sharpest shadows.',
  'Reload behind cover: an empty magazine takes longer to reload than a partial one.', 'Spawns avoid enemy sight lines — push as a team to control where they appear.'];
// ---- end of match: slow motion + banner, the camera pulls up and away, then the results
