// ============================================================ MENU PREVIEW (live 3D) + THUMBNAILS
const PV = { r: null, scene: null, cam: null, obj: null, mode: 'char', t: 0, id: null };
function initPreview() {
  const cv = $('preview'); if (!cv) return;
  try { PV.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  PV.r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); PV.r.outputColorSpace = THREE.SRGBColorSpace;
  if (GFX !== 'low') { PV.r.toneMapping = THREE.ACESFilmicToneMapping; PV.r.toneMappingExposure = 0.95; }
  PV.scene = new THREE.Scene(); PV.cam = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
  if (HQ) try { const pm = new THREE.PMREMGenerator(PV.r), es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12), skyMat)); PV.scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose(); } catch (e) {}
  PV.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3328, 0.9)); const d = new THREE.DirectionalLight(0xfff0dd, 2.4); d.position.set(2.5, 4, 3); PV.scene.add(d); if (PV.scene.environment) PV.scene.environmentIntensity = 0.6;
  const rim = new THREE.DirectionalLight(0x88aaff, 1.2); rim.position.set(-3, 2, -3); PV.scene.add(rim);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })); disc.rotation.x = -Math.PI / 2; PV.scene.add(disc); PV.disc = disc;
  { const cv = $('preview'); let drag = null; // drag to rotate, wheel to zoom
    cv.addEventListener('pointerdown', e => { drag = e.clientX; cv.setPointerCapture(e.pointerId); PV.idleT = 0; });
    cv.addEventListener('pointermove', e => { if (drag === null) return; PV.userRot = (PV.userRot || 0) + (e.clientX - drag) * 0.012; drag = e.clientX; PV.idleT = 0; });
    cv.addEventListener('pointerup', () => { drag = null; }); cv.addEventListener('wheel', e => { e.preventDefault(); PV.zoom = clamp((PV.zoom || 1) * (e.deltaY > 0 ? 1.08 : 0.93), 0.55, 1.4); PV.idleT = 0; }, { passive: false }); cv.style.cursor = 'grab'; }
  previewSelect = (id, force) => { if (menuTab === 'loadout' || game.state === 'armory') { PV.weapon = id; PV.mode = 'char'; if (PV.char && PV.obj === PV.char.group) { setCharWeapon(PV.char, id); PV.label = cls().name + ' · ' + WEAPONS[widx(id)].short; $('pvlabel').textContent = PV.label; } else buildPreview(); return; } PV.mode = 'gun'; PV.id = id; PV.hold = 3.5; buildPreview(); }; // in the loadout your operator holds what you pick
  buildPreview(); makeThumbs();
}
function buildPreview() {
  if (!PV.scene) return; if (PV.obj) { PV.scene.remove(PV.obj); PV.obj = null; }
  const C = cls(), lo = getLO();
  if (PV.mode === 'gun' && PV.id) { const w = WEAPONS[widx(PV.id)], ck = PV.id + JSON.stringify(settings.att[PV.id] || {}), g = (PV.gc || (PV.gc = {}))[ck] || (PV.gc[ck] = buildGun(PV.id, settings.att[PV.id] || {}, false).g); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new V3()); g.position.sub(c); const h = new THREE.Group(); h.add(g); h.position.y = 1.0; PV.obj = h; PV.disc.visible = false;
    const len = box.getSize(new V3()).length(); PV.cam.position.set(0, 1.04, len * 1.45 + 0.05); PV.cam.lookAt(0, 1.0, 0); PV.label = w.name; }
  else { const wpn = PV.weapon && widx(PV.weapon) >= 0 ? PV.weapon : lo.primary, ch = makeCharacter(C.model, { weapon: wpn, faction: 0, seed: PROFILE.id, byClass: true }); ch.showAtt = true; setCharWeapon(ch, wpn); PV.char = ch; PV.obj = ch.group; PV.disc.visible = true; PV.label = C.name + ' · ' + WEAPONS[widx(wpn)].short; }
  PV.scene.add(PV.obj); $('pvlabel').textContent = PV.label;
}
function updatePreview(dt) {
  if (!PV.r || game.state !== 'menu' || !PV.obj) return;
  const cv = PV.r.domElement, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  if (cv.width !== Math.floor(w * PV.r.getPixelRatio()) || cv.height !== Math.floor(h * PV.r.getPixelRatio())) { PV.r.setSize(w, h, false); PV.cam.aspect = w / h; PV.cam.updateProjectionMatrix(); }
  PV.t += dt; const lt = menuTab === 'loadout';
  if (PV.mode === 'char') { const zm = PV.zoom || 1, cz = (lt ? 3.7 : 4.3) * zm, cy = lt ? 1.2 : 1.25, ly = lt ? 0.98 : 0.95; PV.cz = damp(PV.cz || cz, cz, 5, dt); PV.cy = damp(PV.cy || cy, cy, 5, dt); PV.ly = damp(PV.ly || ly, ly, 5, dt); PV.cam.position.set(lt ? 0.25 : 0, PV.cy, PV.cz); PV.cam.lookAt(0, PV.ly, 0); }
  PV.idleT = (PV.idleT || 0) + dt; const auto = PV.idleT > 4; if (auto) PV.userRot = damp(PV.userRot || 0, 0, 1.5, dt);
  PV.obj.rotation.y = (PV.mode === 'gun' ? Math.PI / 2 + Math.sin(PV.t * 0.6) * 0.6 : lt ? 0.55 + (auto ? Math.sin(PV.t * 0.45) * 0.3 : 0) : PV.t * 0.5) + (PV.userRot || 0); // loadout: hold a three-quarter view so the gun reads
  if (PV.mode === 'char' && PV.char) animChar(PV.char, dt, 0, Math.sin(PV.t * 0.7) * 0.15);
  if (PV.mode === 'gun') { PV.hold -= dt; if (PV.hold <= 0) { PV.mode = 'char'; buildPreview(); } }
  PV.r.render(PV.scene, PV.cam);
}
function snap(obj, camPos, look, w = 220, h = 120) {
  const sc = new THREE.Scene(); PV.scene.children.filter(o => o.isLight).forEach(l => sc.add(l.clone())); sc.add(obj);
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.01, 50); cam.position.copy(camPos); cam.lookAt(look);
  const prev = new THREE.Vector2(); PV.r.getSize(prev); PV.r.setSize(w, h, false); PV.r.setClearColor(0x000000, 0); PV.r.clear(); PV.r.render(sc, cam);
  const url = PV.r.domElement.toDataURL('image/webp', 0.92); PV.r.setSize(prev.x, prev.y, false); return url; // webp keeps alpha, encodes far faster than png
}
function makeThumbs() { // built in small slices while the browser is idle, so the menu never freezes
  if (!PV.r) return; const jobs = [];
  for (const w of WEAPONS) jobs.push(() => { const g = buildGun(w.id, {}, false).g, box = new THREE.Box3().setFromObject(g), c = box.getCenter(new V3()); g.position.sub(c); g.rotation.y = Math.PI / 2; const len = box.getSize(new V3()).length(); THUMBS[w.id] = snap(g, new V3(0, 0.03, len * 1.25 + 0.05), new V3(0, 0, 0)); });
  for (const k in CLASSES) jobs.push(() => { const ch = makeCharacter(CLASSES[k].model, { weapon: DEFAULT_LO[k][0], faction: 0, seed: 'class-' + k, byClass: true }); ch.group.rotation.y = 0.5; animChar(ch, 0.016, 0, 0); THUMBS['cls_' + k] = snap(ch.group, new V3(0, 1.05, 4.4), new V3(0, 0.98, 0), 160, 160);  });
  let i = 0; const later = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 250 }) : f => setTimeout(f, 16);
  const step = () => { if (game.state === 'play' || game.state === 'potg' || game.state === 'dying') { setTimeout(step, 1500); return; } /* never render thumbnails mid-match: each one is an off-screen render + encode */ const t = performance.now(); while (i < jobs.length && performance.now() - t < 10) { try { jobs[i](); } catch (e) {} i++; }
    if (i < jobs.length) { if (i % 12 < 3 && document.querySelector('.mtab.on[data-tab="loadout"]')) renderLoadout($('loadout')); later(step); }
    else { renderLoadout($('loadout')); if (window.renderClassesUI) window.renderClassesUI(); } };
  later(step);
}
// map thumbnails are captured from the menu background the first time each map is shown
let mapThumbPending = false;
// a deliberate aerial "postcard" of the loaded map (used to bake the shipped map images in fps/thumbs/)
function postcard(o = {}) {
  const L = world.L, [x0, z0, x1, z1] = L.bounds, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0, S = Math.max(W, D);
  const q = Object.assign({ sx: 1, sz: 1, hk: 0.24, dk: 1 }, L.postcard || {}, o), pc = Object.assign({ p: [cx + q.sx * W * 0.34 * q.dk, S * q.hk, cz + q.sz * D * 0.36 * q.dk], t: [cx - q.sx * W * 0.06, 0, cz - q.sz * D * 0.04], fov: 48 }, q.p ? { p: q.p, t: q.t } : {}, { fov: q.fov || 48 });
  const src = renderer.domElement, cam = new THREE.PerspectiveCamera(pc.fov, src.width / src.height, 0.5, 1200); cam.position.set(...pc.p); cam.lookAt(...pc.t); cam.updateMatrixWorld();
  const fog = scene.fog; if (fog) scene.fog = new THREE.Fog(fog.color, fog.near * 3, fog.far * 3); sky.position.copy(cam.position);
  if (world.sun && shadowsOn) { world.shadowExt = -1; const ext = world.shadowFull; Object.assign(world.sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext }); world.sun.shadow.camera.updateProjectionMatrix(); world.sun.target.position.set(cx, 0, cz); world.sun.position.set(cx, 0, cz).addScaledVector(world.sunDir, 160); world.sun.target.updateMatrixWorld(); }
  renderer.render(scene, cam); const w = o.w || 1280, h = o.h || 640, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const sa = src.width / src.height, ta = w / h, sw = sa > ta ? src.height * ta : src.width, sh = sa > ta ? src.height : src.width / ta; g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h);
  scene.fog = fog; return c.toDataURL('image/jpeg', o.q || 0.84);
}
function captureMapThumb() {
  try { const c = document.createElement('canvas'); const src = renderer.domElement, W = Math.min(1280, src.width), H = Math.round(W * src.height / src.width); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, W, H); const url = c.toDataURL('image/jpeg', 0.8); // big enough to fill the loading screen sharply
    const key = 'bp_mthumb2_' + world.def.name; try { for (const m of MAPS) localStorage.removeItem('bp_mthumb_' + m.name); localStorage.setItem(key, url); } catch (e) {} applyMapThumbs(); } catch (e) {}
}
const MAPIMG = i => `thumbs/${i}.jpg?v=7`, MAPHD = i => `thumbs/${i}_hd.jpg?v=1`; // full-res art for the loading screen (preloaded on hover/select) // baked aerial postcards (see postcard())
function applyMapThumbs() { MAPS.forEach((m, i) => { const u = MAPIMG(i); const card = $('maps').children[i]; if (card && u) { card.style.backgroundImage = `linear-gradient(180deg,rgba(12,14,19,0) 25%,rgba(12,14,19,.55) 60%,rgba(12,14,19,.9)),url(${u})`; card.style.backgroundSize = 'cover'; card.style.backgroundPosition = 'center 68%'; } }); }

