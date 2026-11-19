// ============================================================ REALISTIC CHARACTERS (rigged + animated soldier, per-class tint & props)
// The animated base mesh is three.js's "Soldier" example (Mixamo). Falls back to procedural models if it can't load.
Object.assign(CHAR, {
  wolf: { scale: 1.02, skin: 0x7a7068, body: 0x5a4e46, pants: 0x3a3430, boots: 0x2a2420, arms: 0x7a7068, tint: 0x8a8278 },
  witch: { scale: 0.95, skin: 0x9ac08a, body: 0x3a2a4a, pants: 0x2a1a3a, boots: 0x1a1018, arms: 0x3a2a4a, slim: true, tint: 0x8a70a8 },
});
const TINT = { knight: 0xc9b896, ginger: 0xd6cab0, ogre: 0x8a8a84, fairy: 0x96a27a, wolf: 0x6a6c72, witch: 0xb8a47e, guard: 0x868c74, goblin: 0xaea486, troll: 0x5a5c60, archer: 0x86946e };
const VISOR = { knight: 0x1a1e24, ogre: 0x14161a, ginger: 0x2a2620, fairy: 0x1a2016, wolf: 0x101012, witch: 0x221e18, guard: 0x161616, goblin: 0x201c18, troll: 0x101010, archer: 0x141a12 };
const _ik = { s: new V3(), e: new V3(), h: new V3(), u: new V3(), p: new V3(), el: new V3(), qa: new THREE.Quaternion(), qb: new THREE.Quaternion(), dc: new V3(), dd: new V3(), t1: new V3(), t2: new V3(), pole: new V3() };
function aimBone(bone, child, target) {
  bone.getWorldPosition(_ik.t1); child.getWorldPosition(_ik.t2);
  _ik.dc.subVectors(_ik.t2, _ik.t1).normalize(); _ik.dd.subVectors(target, _ik.t1).normalize();
  _ik.qa.setFromUnitVectors(_ik.dc, _ik.dd); bone.getWorldQuaternion(_ik.qb); _ik.qb.premultiply(_ik.qa);
  bone.parent.getWorldQuaternion(_ik.qa).invert(); bone.quaternion.copy(_ik.qa.multiply(_ik.qb)); bone.updateMatrixWorld(true);
}
function ikArm(o, side, target, pole) {
  const B = o.bones, up = B[side + 'Arm'], fo = B[side + 'ForeArm'], ha = B[side + 'Hand']; if (!up || !fo || !ha) return;
  up.getWorldPosition(_ik.s); fo.getWorldPosition(_ik.e); ha.getWorldPosition(_ik.h);
  const a = _ik.s.distanceTo(_ik.e), b = _ik.e.distanceTo(_ik.h); let d = _ik.s.distanceTo(target);
  _ik.u.subVectors(target, _ik.s).normalize(); d = clamp(d, Math.abs(a - b) + 1e-3, (a + b) * 0.999);
  const x = (a * a - b * b + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a * a - x * x));
  _ik.p.copy(pole).addScaledVector(_ik.u, -pole.dot(_ik.u)).normalize();
  _ik.el.copy(_ik.s).addScaledVector(_ik.u, x).addScaledVector(_ik.p, hh);
  aimBone(up, fo, _ik.el); aimBone(fo, ha, target);
}
// per-class uniform: the soldier's texture is desaturated, then a camouflage pattern is overlaid so shading and detail survive
const CAMO = { knight: ['#b59c72', '#8a7550', '#5e6a43', '#d2c19a'], ginger: ['#d4c095', '#b89a6a', '#e8dab8', '#c8ae80'], ogre: ['#8c8e90', '#5a5c60', '#babcbe', '#3a3c40'],
  fairy: ['#6a7a48', '#3e4a2a', '#8a7a50', '#2a2c20'], wolf: ['#3c3e42', '#26282c', '#4c4e52', '#1c1c1e'], witch: ['#8a7a54', '#6a6a44', '#a89870', '#55503a'],
  guard: ['#6a6e58', '#4a4e3c', '#8a8a6a', '#33362a'], goblin: ['#a89878', '#7a6a50', '#c8b898', '#5a4a38'], troll: ['#2e3032', '#1e2022', '#45474a', '#101012'], archer: ['#5e6c44', '#3a4628', '#7a7048', '#262a1c'] };
const CAMOTEX = {};
function camoTex(kind, base) {
  if (CAMOTEX[kind]) return CAMOTEX[kind]; const img = base && base.image; if (!img || !img.width) return base;
  try { const w = Math.min(1024, img.width), h = Math.min(1024, img.height), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), P = CAMO[kind] || CAMO.knight;
    g.drawImage(img, 0, 0, w, h); g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    const pc = document.createElement('canvas'); pc.width = w; pc.height = h; const q = pc.getContext('2d'); q.fillStyle = P[0]; q.fillRect(0, 0, w, h);
    const R = seeded(kind.length * 7919 + kind.charCodeAt(0)); for (let L = 1; L < 4; L++) { q.fillStyle = P[L]; for (let i = 0; i < 120; i++) { let x = R() * w, y = R() * h; const a = R() * 3, n = 3 + Math.floor(R() * 4); for (let k = 0; k < n; k++) { const rx = (0.004 + R() * 0.012) * w, ry = rx * (0.4 + R() * 0.6); q.beginPath(); q.ellipse(x, y, rx, ry, a + R() * 0.8, 0, 7); q.fill(); x += Math.cos(a) * rx * 1.3 + (R() - 0.5) * rx; y += Math.sin(a) * rx * 1.3 + (R() - 0.5) * rx; } } }
    // lift the desaturated base toward white-ish so multiplying keeps its folds/seams but takes the camo's hue and value
    g.globalCompositeOperation = 'screen'; g.fillStyle = '#383838'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'multiply'; g.drawImage(pc, 0, 0); g.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c); t.flipY = base.flipY; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = base.wrapS; t.wrapT = base.wrapT; t.anisotropy = 4; return (CAMOTEX[kind] = t);
  } catch (e) { return base; }
}
// ---- FACTIONS (Gulf War, 1991): the US-led Coalition vs Saddam Hussein's Republican Guard. Desert maps, AR vs AK.
const FACTIONS = [
  { id: 'coalition', name: 'COALITION', short: 'COALITION', desc: 'US-led Coalition · Operation Desert Storm, 1991', camo: ['#b39d74', '#94805c', '#6e5536', '#c8b48a'], style: 'blot', vest: 0x9a8462, helm: 0xb8a27a, boots: 0x8a6e4e, glove: 0x6a5a44, belt: 0x6e5e44 },
  { id: 'guard', name: 'REPUBLICAN GUARD', short: 'REP. GUARD', desc: "Iraqi Republican Guard · Saddam Hussein's Ba'athist regime, 1991", camo: ['#5c5a3c', '#46452c', '#6e5c3c', '#3a3a28'], style: 'lizard', vest: 0x4a4a30, helm: 0x4e5236, boots: 0x1e1c1a, glove: 0x2a2826, belt: 0x3a3426, beret: 0x8a1c1c },
];
const SKIN = [0xf2cfb0, 0xe3b48e, 0xcf9a72, 0xb27a52, 0x8e5a3a, 0x6a4128, 0x4e2e1c], HAIR = [0x1a1410, 0x2e2018, 0x4a3420, 0x6e5232, 0x9a7a4a, 0x2a2a2a];
const UNIF = {};
function uniformTex(f) { // tileable cloth camo: soft blots (desert) or vertical 'lizard' dashes
  if (UNIF[f]) return UNIF[f]; const F = FACTIONS[f], c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), R = seeded(911 + f * 37);
  g.fillStyle = F.camo[0]; g.fillRect(0, 0, 128, 128);
  for (let L = 1; L < 4; L++) { g.fillStyle = F.camo[L]; for (let i = 0; i < (F.style === 'lizard' ? 70 : 26); i++) { const x = R() * 128, y = R() * 128;
    if (F.style === 'lizard') { g.fillRect(x, y, 1.5 + R() * 2, 5 + R() * 12); g.fillRect(x + 128 * (x < 8), y, 1.5, 6); }
    else for (const ox of [0, -128, 128]) for (const oy of [0, -128, 128]) { g.beginPath(); g.ellipse(x + ox, y + oy, 4 + R() * 9, 3 + R() * 6, R() * 3, 0, 6.3); g.fill(); } } }
  const im = g.getImageData(0, 0, 128, 128); for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() - 0.5) * 16; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; } g.putImageData(im, 0, 0); // weave
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.4, 2); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (UNIF[f] = t);
}
const _tap = {};
const tapered = k => _tap[k] || (_tap[k] = new THREE.CylinderGeometry(k, 1, 1, 12, 1));
// Build a real soldier on the animated skeleton: every part is rigid on its bone (laid out in model space at the bind pose),
// so the Mixamo animations drive it. Purely visual: hitboxes are the same capsule for everyone.
function dressSoldier(out, inner, bones, look) {
  const F = FACTIONS[look.faction], M = (c, r = 0.85) => MAT({ color: c, roughness: r }), cloth = MAT({ map: uniformTex(look.faction), color: 0xffffff, roughness: 0.92 });
  const skin = MAT({ color: look.skin, roughness: 0.62 }), hair = M(look.hair, 0.8), dark = M(0x15120f, 0.5), boot = M(F.boots, 0.7), glove = look.gloves ? M(F.glove, 0.8) : skin;
  inner.updateMatrixWorld(true); const iq = inner.getWorldQuaternion(new THREE.Quaternion()), isc = inner.getWorldScale(new V3()).x, tmp = new V3();
  const P = n => inner.worldToLocal(bones[n].getWorldPosition(new V3()));
  const attach = n => { const b = bones[n], gq = new THREE.Group(); gq.quaternion.copy(b.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(iq)); gq.scale.setScalar(isc / b.getWorldScale(tmp).x); b.add(gq); return gq; };
  const mesh = (par, geo, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; par.add(m); return m; };
  const limb = (a, b, r0, r1, mat, sx = 1, sz = 1, joint = true) => { if (!bones[a] || !bones[b]) return null; const G = attach(a), d = P(b).sub(P(a)), L = d.length(), m = new THREE.Mesh(tapered(+(r1 / r0).toFixed(2)), mat);
    m.position.copy(d).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize()); m.scale.set(r0 * sx, L * 1.04, r0 * sz); m.castShadow = true; G.add(m);
    if (joint) mesh(G, CG.sph, mat, 0, 0, 0, r0 * sx * 0.98, r0 * 0.98, r0 * sz * 0.98); return G; };
  const fem = look.female, w = fem ? 0.9 : 1;
  // legs + boots
  for (const sd of ['Left', 'Right']) {
    limb(sd + 'UpLeg', sd + 'Leg', 0.088 * (fem ? 1.02 : 1), 0.072, cloth); const sh = limb(sd + 'Leg', sd + 'Foot', 0.068, 0.052, cloth);
    if (look.kneepads && sh) mesh(sh, CG.half, M(0x2a2a26, 0.6), 0, 0, 0.045, 0.06, 0.07, 0.05);
    const ft = attach(sd + 'Foot'), toe = P(sd + 'ToeBase').sub(P(sd + 'Foot')); mesh(ft, CG.cyl, boot, 0, 0.04, 0, 0.058, 0.16, 0.058);
    mesh(ft, CG.box, boot, toe.x * 0.4, toe.y * 0.5 - 0.04, toe.z * 0.4, 0.09, 0.085, Math.abs(toe.z) + 0.05);
    // arms: sleeves, gloves
    limb(sd + 'Shoulder', sd + 'Arm', 0.07 * w, 0.064 * w, cloth, 1, 1, false); limb(sd + 'Arm', sd + 'ForeArm', 0.062 * w, 0.053 * w, cloth); limb(sd + 'ForeArm', sd + 'Hand', 0.052 * w, 0.04 * w, look.rolled ? skin : cloth);
    if (look.rolled) { const fa = attach(sd + 'ForeArm'), d = P(sd + 'Hand').sub(P(sd + 'ForeArm')); const m = mesh(fa, tapered(0.95), cloth, d.x * 0.12, d.y * 0.12, d.z * 0.12, 0.058 * w, 0.06, 0.058 * w); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); }
    const hd = sd + 'HandMiddle2'; if (bones[hd]) { limb(sd + 'Hand', hd, 0.04, 0.033, glove, 1.25, 0.6); limb(sd + 'Hand', sd + 'HandThumb2', 0.017, 0.014, glove); }
  }
  // pelvis, torso, belt
  const hip = attach('Hips'); mesh(hip, CG.sph, cloth, 0, -0.02, 0, 0.165 * (fem ? 1.04 : 1), 0.13, 0.12); mesh(hip, CG.cyl, M(F.belt, 0.7), 0, 0.05, 0, 0.17 * (fem ? 1.03 : 1), 0.05, 0.125);
  limb('Spine', 'Spine2', 0.155 * w, 0.165 * w, cloth, 1, 0.74); const ch = limb('Spine2', 'Neck', 0.17 * w, 0.15 * w, cloth, 1.04, 0.74);
  limb('Neck', 'Head', 0.052, 0.048, skin, 1, 1, false);
  // head: skull, jaw, face, ears, hair
  const H = attach('Head'), hs = fem ? 0.95 : 1, fwd = 0.1;
  mesh(H, CG.sph, skin, 0, 0.1, 0.0, 0.098 * hs, 0.118 * hs, 0.108 * hs); mesh(H, CG.sph, skin, 0, 0.05, 0.02, (fem ? 0.07 : 0.08) * hs, 0.06, 0.08 * hs);
  mesh(H, CG.box, skin, 0, 0.088, 0.112, 0.022, 0.04, 0.03); for (const sx of [-1, 1]) { mesh(H, CG.sph, M(0xf4f0ea, 0.4), sx * 0.034, 0.112, 0.1, 0.015, 0.011, 0.008); mesh(H, CG.sph, dark, sx * 0.034, 0.112, 0.106, 0.008, 0.008, 0.004); mesh(H, CG.box, hair, sx * 0.035, 0.13, 0.106, 0.034, 0.008, 0.012); mesh(H, CG.sph, skin, sx * 0.097 * hs, 0.098, -0.005, 0.016, 0.03, 0.022); }
  mesh(H, CG.box, M(0x7a4a3a, 0.6), 0, 0.058, 0.1, 0.03, 0.006, 0.01); // mouth
  if (look.stache) mesh(H, CG.box, hair, 0, 0.07, 0.104, 0.05, 0.012, 0.014);
  if (look.beard) mesh(H, CG.sph, hair, 0, 0.035, 0.03, 0.084, 0.055, 0.084);
  if (!look.hood) { mesh(H, CG.half, hair, 0, 0.138, -0.03, 0.102 * hs, 0.09 * hs, 0.1 * hs); if (fem) mesh(H, CG.sph, hair, 0, 0.1, -0.115, 0.045, 0.04, 0.04); } // hair (bun for women)
  out.bodyMat = cloth; out.skinMat = skin; out.look = look; out.chestBone = ch;
}
function lookFor(seed, faction, kind) { // deterministic per player name / id, so everyone sees the same soldier
  const R = seeded(hashStr(String(seed || Math.random())) ^ (faction * 7177)), female = R() < 0.3;
  return { faction, female, skin: SKIN[Math.floor(R() * SKIN.length)], hair: HAIR[Math.floor(R() * HAIR.length)], stache: !female && R() < (faction ? 0.55 : 0.2), beard: !female && R() < 0.12,
    gloves: faction === 0 ? R() < 0.7 : R() < 0.25, rolled: R() < 0.25, kneepads: kind === 'fairy' || R() < 0.2 };
}
function makeSoldierChar(kind, opt) {
  const D = CHAR[kind] || CHAR.guard, sc = opt.scale || D.scale, A = window.BP_ASSETS.soldier;
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(sc); g.add(inner);
  const root = window.BP_SkeletonUtils.clone(A.scene); root.rotation.y = Math.PI; inner.add(root); // model faces -Z; game characters face +Z
  let bodyMat = null; const bones = {};
  root.traverse(o => {
    if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    if (o.isMesh) {
      o.castShadow = true; o.frustumCulled = false; const old = o.material;
      if (/visor/i.test(o.name) || /visor/i.test(old.name)) o.material = PHONG({ color: VISOR[kind] || 0x222a33, specular: 0xffffff, shininess: 90 });
      else { o.material = MAT({ map: camoTex(kind, old.map), color: 0xffffff, roughness: 0.85 }); bodyMat = o.material; }
      o.visible = false; // the sci-fi armour suit only lends its skeleton now; dressSoldier builds the person
    }
  });
  const faction = opt.faction !== undefined ? opt.faction : (CHAR[kind] && CHAR[kind].foe ? 1 : 0), look = lookFor(opt.seed !== undefined ? opt.seed : opt.name, faction, kind);
  const mixer = new THREE.AnimationMixer(root), act = {};
  for (const c of A.animations) act[c.name] = mixer.clipAction(c);
  (act.Idle || Object.values(act)[0]).play();
  g.updateMatrixWorld(true);
  const rp = new V3(); if (bones.RightArm) { bones.RightArm.getWorldPosition(rp); inner.worldToLocal(rp); }
  const out = { group: g, inner, bodyMat, mixer, act, bones, animState: 'Idle', legL: null, legR: null, skinned: true, rsign: rp.x >= 0 ? 1 : -1, wings: null };
  out.headAcc = new THREE.Group(); out.chestAcc = new THREE.Group(); inner.add(out.headAcc, out.chestAcc);
  const iq = inner.getWorldQuaternion(new THREE.Quaternion()).invert(), bq = b => b ? iq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())).invert() : null;
  out.headBind = bq(bones.Head); out.chestBind = bq(bones.Spine2);
  try { dressSoldier(out, inner, bones, look); } catch (e) { console.warn('dress failed', e); root.traverse(m => { if (m.isMesh) m.visible = true; }); }
  addAccessories(kind, out);
  return out;
}
function addAccessories(kind, o) { // per-class kit, in each faction's period gear
  const H = o.headAcc, C = o.chestAcc, Lm = (c, r = 0.85) => MAT({ color: c, roughness: r }), lk = o.look || { faction: 0 }, F = FACTIONS[lk.faction], g1 = lk.faction === 1;
  const add = (par, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; par.add(m); return m; };
  const s = o.rsign, vestM = Lm(F.vest, 0.95), pouchM = Lm(g1 ? 0x3e3e28 : 0x8a7656, 0.95), strap = Lm(g1 ? 0x34331f : 0x7a6a4c, 0.9);
  const vest = (heavy) => { // Coalition: flak vest / plates · Guard: Chicom-style chest rig
    if (g1 && !heavy) { add(C, CG.box, vestM, 0, -0.1, 0.12, 0, 0, 0, 0.27, 0.15, 0.05); for (const x of [-0.085, 0, 0.085]) add(C, CG.box, pouchM, x, -0.1, 0.15, 0, 0, 0, 0.075, 0.12, 0.035); for (const sd of [-1, 1]) add(C, CG.box, strap, sd * 0.08, 0.05, 0.02, 0, 0, sd * 0.2, 0.035, 0.32, 0.26); return; }
    const w = heavy ? 1.12 : 1; add(C, CG.box, vestM, 0, -0.04, 0.115, 0, 0, 0, 0.3 * w, 0.32, 0.055 * w); add(C, CG.box, vestM, 0, -0.04, -0.13, 0, 0, 0, 0.3 * w, 0.34, 0.055 * w);
    for (const sd of [-1, 1]) { add(C, CG.box, vestM, sd * 0.155 * w, -0.06, -0.005, 0, 0, 0, 0.04, 0.26, 0.22); add(C, CG.box, strap, sd * 0.08, 0.13, -0.005, 0, 0, 0, 0.06, 0.04, 0.26); }
    for (const x of [-0.08, 0, 0.08]) add(C, CG.box, pouchM, x, -0.12, 0.155, 0, 0, 0, 0.07, 0.11, 0.035);
    if (heavy) { for (const sd of [-1, 1]) add(C, CG.box, vestM, sd * 0.21, 0.09, 0, 0, 0, sd * 0.35, 0.12, 0.05, 0.2); add(C, CG.box, vestM, 0, 0.17, 0.02, 0, 0, 0, 0.27, 0.07, 0.27); add(C, CG.box, vestM, 0, -0.27, 0.11, 0, 0, 0, 0.16, 0.12, 0.04); } };
  const helmet = (goggles, nvg) => { const hm = Lm(F.helm, 0.75); // PASGT 'Fritz' with a desert cover / Soviet-style SSh-68 steel helmet
    if (!g1) { add(H, CG.half, hm, 0, 0.112, -0.012, 0, 0, 0, 0.145, 0.13, 0.162); add(H, CG.cylT, hm, 0, 0.1, -0.012, 0, 0, 0, 0.152, 0.03, 0.168); add(H, CG.cyl, Lm(0x3a3226, 0.9), 0, 0.15, -0.012, 0, 0, 0, 0.142, 0.012, 0.158); }
    else { add(H, CG.half, hm, 0, 0.118, -0.008, 0, 0, 0, 0.14, 0.135, 0.15); add(H, CG.cylT, hm, 0, 0.11, -0.008, 0, 0, 0, 0.158, 0.026, 0.166); }
    if (goggles) { add(H, CG.box, Lm(0x1a1a1a, 0.5), 0, 0.165, 0.135, -0.3, 0, 0, 0.16, 0.035, 0.03); add(H, CG.box, PHONG({ color: 0x6a7a80, specular: 0xffffff, shininess: 80 }), 0, 0.165, 0.148, -0.3, 0, 0, 0.13, 0.025, 0.01); }
    if (nvg) add(H, CG.box, Lm(0x1a1a1a, 0.5), 0, 0.19, 0.15, 0, 0, 0, 0.05, 0.03, 0.03); };
  const beret = () => { const bm = Lm(F.beret || 0x3a3a30, 0.95); add(H, CG.sph, bm, s * 0.02, 0.2, -0.01, 0, 0, s * 0.22, 0.125, 0.04, 0.125); add(H, CG.cyl, Lm(0x1a1410, 0.8), 0, 0.172, -0.005, 0, 0, 0, 0.108, 0.015, 0.12); };
  const cap = () => { const cm = Lm(F.helm, 0.95); add(H, CG.cyl, cm, 0, 0.19, -0.005, 0, 0, 0, 0.105, 0.07, 0.115); add(H, CG.box, cm, 0, 0.165, 0.12, -0.15, 0, 0, 0.17, 0.01, 0.09); };
  const boonie = () => { const bm = Lm(g1 ? 0x48502f : 0xb4a07a, 1); add(H, CG.half, bm, 0, 0.14, -0.005, 0, 0, 0, 0.115, 0.08, 0.125); add(H, CG.cyl, bm, 0, 0.143, -0.005, 0, 0, 0, 0.19, 0.01, 0.2); };
  const ghillie = c => { const R = seeded(c), cols = (g1 ? [0x3a4026, 0x4a4a30, 0x2e3420, 0x5a5236] : [0xa8946a, 0x8a7652, 0xc0ac80, 0x7a6644]).map(x => Lm(x, 1));
    for (let i = 0; i < 40; i++) { const a = R() * 6.28, par = i < 14 ? H : C, r = par === H ? 0.13 + R() * 0.03 : 0.18 + R() * 0.05;
      add(par, CG.box, cols[i % cols.length], Math.cos(a) * r, par === H ? 0.1 + R() * 0.1 : 0.05 + R() * 0.15, Math.sin(a) * r * 0.85 - 0.03, (R() - 0.5) * 0.6, -a + Math.PI / 2, (R() - 0.5) * 0.5 + 0.25, 0.04 + R() * 0.03, 0.1 + R() * 0.08, 0.012); } };
  const radio = () => { add(C, CG.box, Lm(0x2e3026, 0.7), 0, -0.04, -0.2, 0, 0, 0, 0.2, 0.26, 0.09); add(C, CG.cyl, Lm(0x111111, 0.6), s * 0.08, 0.28, -0.2, 0, 0, 0, 0.006, 0.4, 0.006); };
  const pack = (h = 0.3) => add(C, CG.box, Lm(g1 ? 0x45452c : 0x9a8664), 0, -0.06, -0.22, 0, 0, 0, 0.28, h, 0.13);
  const bandolier = () => { add(C, CG.box, Lm(0x3a3022, 0.8), 0, -0.02, 0.16, 0, 0, 0.8, 0.05, 0.52, 0.03); for (let i = -2; i <= 2; i++) add(C, CG.cyl, Lm(0x6a6a40, 0.6), i * 0.042, -0.02 - i * 0.045, 0.18, Math.PI / 2, 0, 0, 0.018, 0.04, 0.018); };
  const gasmask = () => { add(H, CG.cylT, Lm(0x22241e, 0.6), 0, 0.06, 0.11, Math.PI / 2, 0, 0, 0.05, 0.07, 0.05); for (const sd of [-1, 1]) add(H, CG.sph, PHONG({ color: 0x2a3036, specular: 0xffffff, shininess: 80 }), sd * 0.036, 0.112, 0.104, 0, 0, 0, 0.026, 0.026, 0.012); };
  if (kind === 'knight') { vest(false); radio(); helmet(false, !g1); }                                          // Assault
  else if (kind === 'ginger') { vest(false); if (g1) beret(); else cap(); for (const sd of [-1, 1]) add(H, CG.cyl, Lm(0x1a1a1a, 0.5), sd * 0.105, 0.1, 0, 0, 0, Math.PI / 2, 0.035, 0.025, 0.035); } // Scout: soft cap/beret + headset
  else if (kind === 'ogre' || kind === 'troll') { vest(true); helmet(false, false); pack(0.36); }             // Heavy / Juggernaut
  else if (kind === 'fairy' || kind === 'archer') { ghillie(kind === 'fairy' ? 11 : 23); boonie(); }          // Recon / Marksman
  else if (kind === 'wolf') { vest(false); helmet(true, false); if (g1) gasmask(); }                          // Breacher: goggles (gas mask on the Guard)
  else if (kind === 'witch') { vest(false); bandolier(); pack(0.3); if (g1) beret(); else helmet(false, false); } // Grenadier
  else if (kind === 'guard') { vest(false); helmet(false, false); }
  else if (kind === 'goblin') { vest(false); beret(); }
  else { vest(false); helmet(false, false); }
}
// ---- realistic troops: 4 per faction. Players get the soldier for their class; bots/NPCs a varied pick by name.
// each class has its own soldier per faction (assault, scout, heavy, recon, breacher, grenadier); survival enemies wear the Guard's
const TROOPS = [['ca', 'cs', 'ch', 'cr', 'cb', 'cg'], ['ga', 'gs', 'gh', 'gr', 'gb', 'gg']];
const CLASS_TROOP = [{ knight: 'ca', ginger: 'cs', ogre: 'ch', fairy: 'cr', wolf: 'cb', witch: 'cg', guard: 'ca', goblin: 'cs', troll: 'ch', archer: 'cr' }, { knight: 'ga', ginger: 'gs', ogre: 'gh', fairy: 'gr', wolf: 'gb', witch: 'gg', guard: 'ga', goblin: 'gs', troll: 'gh', archer: 'gr' }];
function troopId(kind, faction, seed, byClass) { const f = faction ? 1 : 0; if (CLASS_TROOP[f][kind]) return CLASS_TROOP[f][kind]; /* classes always read at a glance, like CoD */ const L = TROOPS[f]; return L[hashStr(String(seed === undefined ? Math.random() : seed)) % L.length]; }
function makeTroopChar(kind, opt, gl, tid, faction) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const root = window.BP_SkeletonUtils.clone(gl.scene); inner.add(root);
  const bones = {}; let bodyMat = null;
  root.traverse(o => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (/fatigue|vest|shirt/i.test(o.material.name || '')) { o.material = o.material.clone(); if (!bodyMat || /shirt/i.test(o.material.name)) bodyMat = o.material; } } });
  if (!bodyMat) root.traverse(o => { if (!bodyMat && o.isMesh) { o.material = o.material.clone(); bodyMat = o.material; } });
  if (!bodyMat.emissive) bodyMat.emissive = new THREE.Color(0);
  // everyone stands the same height (fairness: no smaller target), and the hitbox never depends on the model
  root.updateMatrixWorld(true); const hb = bones.HeadTop_End || bones.Head; let h = 1.8; if (hb) { const v = new V3(); hb.getWorldPosition(v); h = v.y + (bones.HeadTop_End ? 0.02 : 0.12); }
  inner.scale.setScalar((1.8 / Math.max(1.2, h)) * (opt.scale || (CHAR[kind] && CHAR[kind].scale) || 1));
  const mixer = new THREE.AnimationMixer(root), act = {};
  for (const c of gl.animations) { const n = c.name, nm = /crouch.*walk/i.test(n) ? 'CrouchWalk' : /crouch/i.test(n) ? 'CrouchIdle' : /strafe left/i.test(n) ? 'StrafeL' : /strafe right/i.test(n) ? 'StrafeR' : /walk back/i.test(n) ? 'Back' : /sprint/i.test(n) ? 'Sprint' : /idle/i.test(n) ? 'Idle' : /run/i.test(n) ? 'Run' : /walk/i.test(n) ? 'Walk' : n; act[nm] = mixer.clipAction(c); }
  (act.Idle || Object.values(act)[0]).play(); g.updateMatrixWorld(true);
  const rp = new V3(); if (bones.RightArm) { bones.RightArm.getWorldPosition(rp); inner.worldToLocal(rp); }
  const out = { group: g, inner, bodyMat, mixer, act, bones, animState: 'Idle', legL: null, legR: null, skinned: true, rsign: rp.x >= 0 ? 1 : -1, wings: null, troop: tid, look: { faction, female: tid === 'c3' } };
  out.headAcc = new THREE.Group(); out.chestAcc = new THREE.Group(); inner.add(out.headAcc, out.chestAcc);
  const iq = inner.getWorldQuaternion(new THREE.Quaternion()).invert(), bq = b => b ? iq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())).invert() : null;
  out.headBind = bq(bones.Head); out.chestBind = bq(bones.Spine2);
  if (tid === 'cr' || tid === 'gr') try { ghillieSuit(out, inner, bones, faction); } catch (e) { console.warn('ghillie failed', e); }
  return out;
}
// Ghillie suit + boonie: thousands of burlap/leaf tufts on every limb, merged into one mesh per bone so they follow the animation cheaply
function ghillieSuit(o, inner, bones, faction) {
  inner.updateMatrixWorld(true); const iq = inner.getWorldQuaternion(new THREE.Quaternion()), tmp = new V3(), R = seeded(faction ? 4242 : 2424);
  const cols = (faction ? [0x3c4226, 0x4a4a2e, 0x2e3420, 0x5a5236, 0x434a2c, 0x6a6040] : [0xa8946a, 0x8a7652, 0xc0ac80, 0x7a6644, 0x9a8a5c, 0xb5a175]).map(c => new THREE.Color(c));
  const mat = MAT({ vertexColors: true, roughness: 1 }); mat.side = THREE.DoubleSide;
  const P = n => inner.worldToLocal(bones[n].getWorldPosition(new V3()));
  const attach = n => { const b = bones[n], gq = new THREE.Group(); gq.quaternion.copy(b.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(iq)); gq.scale.setScalar(1 / b.getWorldScale(tmp).x * inner.getWorldScale(new V3()).x); b.add(gq); return gq; };
  const tuft = (pos, nrm, col, len, out) => { // one shaggy strip: a thin quad hanging along/away from the surface
    const w = 0.02 + R() * 0.025, h = len * (0.7 + R() * 0.6), down = new V3(0, -1, 0).lerp(nrm, 0.35 + R() * 0.4).normalize(), side = new V3().crossVectors(down, nrm).normalize().multiplyScalar(w);
    const a = pos.clone().add(side), b2 = pos.clone().sub(side), c = pos.clone().addScaledVector(down, h).sub(side.clone().multiplyScalar(0.3)), d = pos.clone().addScaledVector(down, h).add(side.clone().multiplyScalar(0.3));
    for (const v of [a, b2, c, a, c, d]) { out.p.push(v.x, v.y, v.z); out.n.push(nrm.x, nrm.y, nrm.z); const k = 0.8 + R() * 0.4; out.c.push(col.r * k, col.g * k, col.b * k); } };
  const limb = (a, b, r, n, len) => { if (!bones[a] || !bones[b]) return; const A = P(a), B = P(b), ax = B.clone().sub(A), L = ax.length(); ax.normalize();
    const u = new V3(0, 1, 0).cross(ax); if (u.lengthSq() < 1e-4) u.set(1, 0, 0); u.normalize(); const v = new V3().crossVectors(ax, u);
    const out = { p: [], n: [], c: [] };
    for (let i = 0; i < n; i++) { const t = R(), ang = R() * 6.283, nrm = u.clone().multiplyScalar(Math.cos(ang)).addScaledVector(v, Math.sin(ang)); const pos = A.clone().addScaledVector(ax, t * L).addScaledVector(nrm, r * (0.9 + R() * 0.3)).sub(A);
      tuft(pos, nrm, cols[Math.floor(R() * cols.length)], len, out); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(out.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(out.c, 3));
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.frustumCulled = false; attach(a).add(m); };
  limb('Hips', 'Spine1', 0.17, 150, 0.2); limb('Spine1', 'Neck', 0.18, 220, 0.22); limb('Neck', 'Head', 0.09, 50, 0.16);
  for (const sd of ['Left', 'Right']) { limb(sd + 'Shoulder', sd + 'Arm', 0.08, 50, 0.15); limb(sd + 'Arm', sd + 'ForeArm', 0.07, 90, 0.13); limb(sd + 'ForeArm', sd + 'Hand', 0.055, 60, 0.1); limb(sd + 'UpLeg', sd + 'Leg', 0.095, 120, 0.17); limb(sd + 'Leg', sd + 'Foot', 0.07, 80, 0.13); }
  // boonie hat with a hood of tufts over the head
  if (bones.Head) { const H = attach('Head'), top = bones.HeadTop_End ? P('HeadTop_End').sub(P('Head')) : new V3(0, 0.2, 0), hc = MAT({ color: cols[0].getHex(), roughness: 1 });
    const crown = new THREE.Mesh(CG.half, hc); crown.position.copy(top).multiplyScalar(0.8); crown.scale.set(0.11, 0.075, 0.12); H.add(crown);
    const brim = new THREE.Mesh(CG.cyl, hc); brim.position.copy(top).multiplyScalar(0.78); brim.scale.set(0.19, 0.008, 0.2); H.add(brim);
    const out = { p: [], n: [], c: [] }; for (let i = 0; i < 70; i++) { const a = R() * 6.283, nrm = new V3(Math.cos(a), 0.15, Math.sin(a)).normalize(); tuft(top.clone().multiplyScalar(0.8).addScaledVector(nrm, 0.17), nrm, cols[Math.floor(R() * cols.length)], 0.14, out); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(out.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(out.c, 3)); H.add(new THREE.Mesh(g, mat)); }
}
function makeCharacter(kind, opt = {}) {
  let o = null;
  try { const T = window.BP_TROOPS, f = opt.faction !== undefined ? opt.faction : (CHAR[kind] && CHAR[kind].foe ? 1 : 0), tid = opt.troop || troopId(kind, f, opt.seed !== undefined ? opt.seed : opt.name, opt.byClass), gl = T && (T[tid] || T[TROOPS[f ? 1 : 0].find(x => T[x])]);
    if (gl && window.BP_SkeletonUtils) o = makeTroopChar(kind, opt, gl, tid, f ? 1 : 0); } catch (e) { console.warn('troop model failed, using fallback', e); o = null; }
  try { if (!o && window.BP_ASSETS && window.BP_ASSETS.soldier && window.BP_SkeletonUtils) o = makeSoldierChar(kind, opt); } catch (e) { console.warn('soldier model failed, using fallback', e); o = null; }
  if (!o) o = makeProcChar(kind, opt);
  o.kind = kind; setCharWeapon(o, opt.weapon || 'rifle');
  if (opt.sash !== undefined && !o.troop) { const m = new THREE.Mesh(CG.box, new THREE.MeshBasicMaterial({ color: opt.sash })); m.scale.set(0.5, 0.07, 0.3); m.rotation.z = 0.7; m.position.y = o.skinned ? 0 : 1.22; (o.chestAcc || o.inner).add(m); }
  return o;
}
function setCharWeapon(o, id) {
  const ak = o.showAtt ? JSON.stringify(settings.att[id] || {}) : ''; if (o.weaponId === id && o.gunHolder && o.attKey === ak) return; o.attKey = ak;
  if (o.gunHolder) o.inner.remove(o.gunHolder);
  const gm = buildGun(id, o.showAtt ? settings.att[id] || {} : {}, false); gm.g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  const holder = new THREE.Group(); gm.g.rotation.y = Math.PI; holder.add(gm.g);
  const gp = gm.gripPt.position, s = o.rsign || 1;
  holder.position.set(0.12 * s, 1.24, 0.24); gm.g.position.set(gp.x, -gp.y, gp.z); // put the grip at the holder origin
  if (gm.forePt === null || !gm.forePt) holder.rotation.x = -0.6; // melee: blade raised
  o.inner.add(holder); o.gunHolder = holder; o.gun = gm; o.weaponId = id;
  o.flash = gm.flash; gm.flash.scale.set(0.45, 0.45, 0.45);
  o.muzzlePt = gm.muzzlePt;
}
const _cv = new V3(), _cf = new V3(), _cr = new V3(), _aq = new THREE.Quaternion(), _bq = new THREE.Quaternion();
const CROUCH = { u: -1.25, l: 2.1, f: -0.75, s: 0.28 };
const SLIDE = { lu: -1.32, ll: 0.1, lf: -0.35, tu: -0.4, tl: 2.0, tf: 0.5, s: -0.42, s1: -0.2, h: 0.5, drop: 0.6, gun: -0.1 }, _sq = new THREE.Quaternion();
function animChar(o, dt, speed, pitch = 0) {
  if (o.gunHolder) o.gunHolder.rotation.x = (o.gun && !o.gun.forePt ? -0.6 : 0) - pitch;
  if (o.mixer) {
    let st = speed < 0.4 ? 'Idle' : speed < 3.4 ? 'Walk' : 'Run'; const dir = !!o.act.StrafeL; // mocap troops: pick the clip from where you move vs where you face
    if (dir) { const gp = o.group.position; if (o._lp && dt > 0) { o._vx = damp(o._vx || 0, (gp.x - o._lp.x) / dt, 10, dt); o._vz = damp(o._vz || 0, (gp.z - o._lp.z) / dt, 10, dt); } o._lp = (o._lp || new V3()).copy(gp);
      const yaw = o.group.rotation.y, fw = Math.sin(yaw) * (o._vx || 0) + Math.cos(yaw) * (o._vz || 0), rt = (o.rsign || 1) * (Math.cos(yaw) * (o._vx || 0) - Math.sin(yaw) * (o._vz || 0)), crouch = (o.crouchK || 0) > 0.45;
      st = speed < 0.4 ? (crouch ? 'CrouchIdle' : 'Idle') : crouch ? 'CrouchWalk' : Math.abs(rt) > Math.abs(fw) * 1.25 ? (rt > 0 ? 'StrafeR' : 'StrafeL') : fw < -0.25 ? 'Back' : speed < 3.4 ? 'Walk' : speed < 5.7 || !o.act.Sprint ? 'Run' : 'Sprint'; }
    o.slideK = damp(o.slideK || 0, o.sliding ? 1 : 0, o.sliding ? 14 : 7, dt); if (o.slideK > 0.05 && dir) st = 'Idle'; /* the slide pose is built on the standing clip */
    if (st !== o.animState && o.act[st]) { const from = o.act[o.animState], to = o.act[st]; to.reset(); to.play(); if (from) from.crossFadeTo(to, 0.22, false); o.animState = st; }
    for (const [k, base, lo, hi] of [['Walk', 1.6, 0.6, 1.7], ['Back', 1.4, 0.6, 1.6], ['StrafeL', 1.5, 0.6, 1.7], ['StrafeR', 1.5, 0.6, 1.7], ['CrouchWalk', 1.3, 0.6, 1.6], ['Run', 5, 0.7, 1.4], ['Sprint', 6.5, 0.8, 1.3]]) if (o.act[k]) o.act[k].timeScale = clamp(speed / base, lo, hi);
    if (o._slSave) { for (const [bn, q] of o._slSave) bn.quaternion.copy(q); o._slSave = null; } /* undo last frame's slide pose (the mixer doesn't rewrite every bone every frame) */
    o.mixer.update(dt);
    if (dir && o.act.CrouchIdle) { o.inner.position.y = 0; o._ck = damp(o._ck || 0, (o.crouchK || 0) > 0.45 ? 1 : 0, 9, dt); if (o.gunHolder) { o.gunHolder.position.y = 1.24 - 0.5 * o._ck; o.gunHolder.position.z = 0.24 + 0.06 * o._ck; } } else { /* the crouch clip lowers the body, so the gun comes down with it */ const c = o.crouchK || 0, B = o.bones; o.inner.position.y = -0.5 * c;
      if (c > 0.01) { for (const sd of ['Left', 'Right']) { if (B[sd + 'UpLeg']) B[sd + 'UpLeg'].rotation.x += CROUCH.u * c; if (B[sd + 'Leg']) B[sd + 'Leg'].rotation.x += CROUCH.l * c; if (B[sd + 'Foot']) B[sd + 'Foot'].rotation.x += CROUCH.f * c; } if (B.Spine) B.Spine.rotation.x += CROUCH.s * c; } }
    if (o.slideK > 0.01 && dir) { const k = o.slideK, B = o.bones; /* slide: lead leg out straight, back leg tucked under, torso leaned back, hips near the floor */
      o.inner.position.y = -SLIDE.drop * k; if (o.gunHolder) { o.gunHolder.position.y = lerp(o.gunHolder.position.y, 1.24 - SLIDE.gun, k); o.gunHolder.rotation.z = 0.2 * k * (o.rsign || 1); }
      o.group.updateMatrixWorld(true); _cr.set(1, 0, 0).applyQuaternion(o.group.getWorldQuaternion(_aq)); /* the body's own sideways axis: + tips forward */
      for (const [n, a] of [['RightUpLeg', SLIDE.lu], ['RightLeg', SLIDE.ll], ['RightFoot', SLIDE.lf], ['LeftUpLeg', SLIDE.tu], ['LeftLeg', SLIDE.tl], ['LeftFoot', SLIDE.tf], ['Spine', SLIDE.s], ['Spine1', SLIDE.s1], ['Head', SLIDE.h]]) { const bn = B[n]; if (!bn || !a) continue;
        (o._slSave || (o._slSave = [])).push([bn, bn.quaternion.clone()]); bn.parent.updateWorldMatrix(true, false); bn.parent.getWorldQuaternion(_bq); _sq.setFromAxisAngle(_cr, a * k); bn.quaternion.premultiply(_bq.clone().invert().multiply(_sq).multiply(_bq)); } }
    else if (o.gunHolder && o.gunHolder.rotation.z) o.gunHolder.rotation.z = 0;
    o.group.updateMatrixWorld(true);
    // inverse kinematics: hands onto the weapon
    const yaw = o.group.rotation.y; _cf.set(Math.sin(yaw), 0, Math.cos(yaw)); _cr.set(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(o.rsign);
    if (o.gun && o.gun.gripPt) { o.gun.gripPt.getWorldPosition(_cv); _ik.pole.set(0, -1, 0).addScaledVector(_cr, 0.8).addScaledVector(_cf, -0.3); ikArm(o, 'Right', _cv, _ik.pole); }
    if (o.gun && o.gun.forePt) { o.gun.forePt.getWorldPosition(_cv); _ik.pole.set(0, -1, 0).addScaledVector(_cr, -0.8); ikArm(o, 'Left', _cv, _ik.pole); }
    o.inner.getWorldQuaternion(_aq).invert();
    if (o.bones.Head) { o.bones.Head.getWorldPosition(_cv); o.inner.worldToLocal(_cv); o.headAcc.position.copy(_cv); if (o.headBind) o.headAcc.quaternion.copy(_aq).multiply(o.bones.Head.getWorldQuaternion(_bq)).multiply(o.headBind); }
    if (o.bones.Spine2) { o.bones.Spine2.getWorldPosition(_cv); o.inner.worldToLocal(_cv); o.chestAcc.position.copy(_cv); if (o.chestBind) o.chestAcc.quaternion.copy(_aq).multiply(o.bones.Spine2.getWorldQuaternion(_bq)).multiply(o.chestBind); }
  } else {
    o.walk = (o.walk || 0) + Math.min(speed, 9) * dt * 2.4; const sw = Math.sin(o.walk) * Math.min(speed / 3, 1) * 0.7;
    if (o.legL) { o.legL.rotation.x = sw; o.legR.rotation.x = -sw; }
  }
  flapWings(o, performance.now() / 1000);
}

function flapWings(o, t) { if (o.wings) for (const w of o.wings) w.rotation.y = w.userData.sx * (0.35 + Math.sin(t * 22) * 0.35); }

const _v1 = new V3(), _v2 = new V3(), _v3 = new V3();
