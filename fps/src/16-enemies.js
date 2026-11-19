// ============================================================ ENEMIES
// ============================================================ CHARACTERS (original fairy-tale cast)
const CG = { sph: new THREE.SphereGeometry(1, 16, 12), cyl: new THREE.CylinderGeometry(1, 1, 1, 12), cylT: new THREE.CylinderGeometry(0.8, 1, 1, 12), box: new THREE.BoxGeometry(1, 1, 1), cone: new THREE.ConeGeometry(1, 1, 12), half: new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), plane: new THREE.PlaneGeometry(1, 1) };
const CHAR = {
  // player classes
  knight: { scale: 1, skin: 0xc8a07a, body: 0x8a7a5a, pants: 0x7a6c50, boots: 0x3a3228, arms: 0x8a7a5a },
  ginger: { scale: 1, skin: 0xb08060, body: 0xa89878, pants: 0x8a7c60, boots: 0x4a3c2c, arms: 0xa89878 },
  ogre: { scale: 1, skin: 0xd0a888, body: 0x4a4c48, pants: 0x55574f, boots: 0x222222, arms: 0x4a4c48 },
  fairy: { scale: 1, skin: 0xc09070, body: 0x5a6a42, pants: 0x4e5a3a, boots: 0x2e2a20, arms: 0x5a6a42 },
  // enemies
  guard: { foe: true, scale: 1, skin: 0xc8a07a, body: 0x4a5040, pants: 0x3e4436, boots: 0x22201a, arms: 0x4a5040 },
  goblin: { foe: true, scale: 0.97, skin: 0xb08060, body: 0x6a5e48, pants: 0x4a4436, boots: 0x22201a, arms: 0x6a5e48 },
  troll: { foe: true, scale: 1.12, skin: 0xa08070, body: 0x303234, pants: 0x2c2e30, boots: 0x161616, arms: 0x303234 },
  archer: { foe: true, scale: 1, skin: 0xc8a07a, body: 0x4a5a3a, pants: 0x3e4a30, boots: 0x22201a, arms: 0x4a5a3a },
};
function makeProcChar(kind, opt = {}) {
  const D = CHAR[kind] || CHAR.guard, sc = opt.scale || D.scale;
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(sc); g.add(inner);
  const cache = {}; const M = (c, basic) => cache[c + (basic ? 'b' : '')] || (cache[c + (basic ? 'b' : '')] = basic ? new THREE.MeshBasicMaterial({ color: c }) : MAT({ color: c }));
  const add = (geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, parent = inner) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m; };
  const limb = (a, b, r, mat, parent = inner) => { const d = new V3().subVectors(b, a), len = d.length(); const m = new THREE.Mesh(CG.cyl, mat); m.position.addVectors(a, b).multiplyScalar(0.5); m.scale.set(r, len, r); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); m.castShadow = true; parent.add(m); return m; };
  const bodyMat = MAT({ color: D.body }); // hit-flash target
  const skin = M(D.skin), pants = M(D.pants), boots = M(D.boots), arms = M(D.arms), dark = M(0x161616), steel = M(0x9aa3ad), gunM = M(0x1d1e21);
  // legs
  const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-0.12, 0.88, 0); legR.position.set(0.12, 0.88, 0); inner.add(legL, legR);
  for (const L of [legL, legR]) { add(CG.cylT, pants, 0, -0.4, 0, D.slim ? 0.075 : 0.095, 0.8, D.slim ? 0.075 : 0.095, 0, 0, 0, L); add(CG.box, boots, 0, -0.83, 0.04, 0.14, 0.11, 0.26, 0, 0, 0, L); }
  // torso + head
  if (D.round) add(CG.sph, bodyMat, 0, 1.2, 0, 0.28, 0.36, 0.2); else add(CG.box, bodyMat, 0, 1.2, 0, D.slim ? 0.38 : 0.48, 0.64, 0.27);
  add(CG.cyl, skin, 0, 1.55, 0, 0.06, 0.08, 0.06);
  const head = add(CG.sph, skin, 0, 1.7, 0.01, D.bigHead ? 0.19 : 0.155, D.bigHead ? 0.17 : 0.17, D.bigHead ? 0.18 : 0.16);
  for (const sx of [-1, 1]) add(CG.sph, dark, sx * 0.055, 1.72, D.bigHead ? 0.16 : 0.14, 0.022, 0.022, 0.015);
  // arms reach forward to a compact rifle
  const shL = new V3(-0.29, 1.45, 0), shR = new V3(0.29, 1.45, 0), hR = new V3(0.13, 1.26, 0.32), hL = new V3(0.05, 1.3, 0.6);
  const elR = new V3(0.3, 1.2, 0.15), elL = new V3(-0.18, 1.22, 0.32);
  limb(shR, elR, 0.06, arms); limb(elR, hR, 0.052, arms); limb(shL, elL, 0.06, arms); limb(elL, hL, 0.052, arms);
  add(CG.sph, skin, hR.x, hR.y, hR.z, 0.055, 0.055, 0.055); add(CG.sph, skin, hL.x, hL.y, hL.z, 0.055, 0.055, 0.055);
  const out = { group: g, inner, legL, legR, bodyMat, flash: null, wings: null, rsign: 1 };
  // ---- per-character details
  if (kind === 'knight') {
    add(CG.box, steel, 0, 1.2, -0.005, 0.5, 0.62, 0.25); bodyMat.color.setHex(D.body); add(CG.box, bodyMat, 0, 1.12, 0.13, 0.36, 0.6, 0.02);
    add(CG.box, M(0xc9a227), 0, 1.25, 0.145, 0.12, 0.12, 0.01, 0, 0, Math.PI / 4);
    add(CG.cyl, steel, 0, 1.72, 0, 0.175, 0.28, 0.175); add(CG.half, steel, 0, 1.86, 0, 0.175, 0.1, 0.175);
    add(CG.box, dark, 0, 1.73, 0.17, 0.2, 0.025, 0.02); add(CG.cone, M(0xb02020), 0, 1.98, -0.05, 0.05, 0.22, 0.05, -0.5);
    for (const sx of [-1, 1]) add(CG.sph, steel, sx * 0.3, 1.47, 0, 0.11, 0.08, 0.11);
  } else if (kind === 'ginger') {
    const icing = M(0xf8f4ec);
    add(CG.box, icing, 0, 1.6, 0.14, 0.08, 0.012, 0.01); // smile
    for (const [y, c] of [[1.32, 0xd02a2a], [1.2, 0x2a9a3a], [1.08, 0xf8f4ec]]) add(CG.sph, M(c), 0, y, 0.19, 0.035, 0.035, 0.03);
    for (const p of [legL, legR]) add(CG.cyl, icing, 0, -0.68, 0, 0.1, 0.02, 0.1, 0, 0, 0, p);
    add(CG.cyl, icing, hR.x, hR.y, hR.z - 0.05, 0.06, 0.015, 0.06, Math.PI / 2); add(CG.cyl, icing, hL.x, hL.y, hL.z - 0.05, 0.06, 0.015, 0.06, Math.PI / 2);
    for (const sx of [-1, 1]) add(CG.box, icing, sx * 0.08, 1.79, 0.1, 0.05, 0.01, 0.01, 0, 0, sx * 0.3);
  } else if (kind === 'ogre') {
    const vest = M(0x5a3a1e);
    for (const sx of [-1, 1]) add(CG.box, vest, sx * 0.17, 1.22, 0.02, 0.16, 0.62, 0.3);
    add(CG.box, vest, 0, 1.22, -0.13, 0.5, 0.62, 0.03); add(CG.box, M(0x2a1c10), 0, 0.92, 0, 0.5, 0.08, 0.29);
    for (const sx of [-1, 1]) { add(CG.cyl, skin, sx * 0.2, 1.8, 0, 0.025, 0.12, 0.025, 0, 0, sx * 1.0); add(CG.cylT, skin, sx * 0.26, 1.83, 0, 0.045, 0.05, 0.045, 0, 0, sx * 1.0); }
    add(CG.box, skin, 0, 1.77, 0.14, 0.2, 0.04, 0.05); add(CG.sph, skin, 0, 1.68, 0.18, 0.04, 0.035, 0.04);
  } else if (kind === 'fairy') {
    add(CG.cone, bodyMat, 0, 0.92, 0, 0.32, 0.5, 0.32, Math.PI); add(CG.half, M(0xf1d36a), 0, 1.74, -0.01, 0.165, 0.12, 0.17);
    add(CG.sph, M(0xf1d36a), 0, 1.8, -0.15, 0.08, 0.08, 0.08);
    const wm = new THREE.MeshBasicMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
    out.wings = [];
    for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 0.05, 1.35, -0.15); inner.add(piv);
      const w = new THREE.Mesh(CG.plane, wm); w.scale.set(0.5, 0.65, 1); w.position.set(sx * 0.25, 0.1, 0); w.rotation.y = Math.PI / 2 * 0.1; piv.add(w); piv.userData.sx = sx; out.wings.push(piv); }
  } else if (kind === 'guard') {
    add(CG.box, M(0xc9a227), 0, 0.93, 0, 0.5, 0.06, 0.29); add(CG.box, M(0xc9a227), 0, 1.25, 0.14, 0.04, 0.5, 0.01);
    add(CG.cyl, steel, 0, 1.82, 0, 0.27, 0.025, 0.27); add(CG.half, steel, 0, 1.82, 0, 0.165, 0.15, 0.165);
  } else if (kind === 'goblin') {
    for (const sx of [-1, 1]) add(CG.cone, skin, sx * 0.22, 1.74, -0.02, 0.05, 0.24, 0.03, 0, 0, -sx * 1.35);
    add(CG.cone, skin, 0, 1.68, 0.19, 0.03, 0.12, 0.03, Math.PI / 2);
    for (const sx of [-1, 1]) add(CG.sph, M(0xffe060, true), sx * 0.055, 1.73, 0.135, 0.024, 0.02, 0.012);
    add(CG.box, M(0x3a2a1a), 0, 0.95, 0, 0.4, 0.12, 0.28);
  } else if (kind === 'troll') {
    for (const sx of [-1, 1]) add(CG.cone, M(0xf2ead8), sx * 0.07, 1.67, 0.17, 0.02, 0.08, 0.02, -0.3);
    add(CG.box, skin, 0, 1.79, 0.13, 0.28, 0.05, 0.06); add(CG.box, M(0x5a4028), 0, 0.92, 0, 0.52, 0.22, 0.3);
    for (const sx of [-1, 1]) add(CG.sph, M(0xff5a3a, true), sx * 0.06, 1.74, 0.155, 0.022, 0.018, 0.012);
    head.position.z = 0.06;
  } else if (kind === 'archer') {
    add(CG.cone, bodyMat, 0, 1.8, -0.05, 0.2, 0.42, 0.2, -0.35); add(CG.box, bodyMat, 0, 1.05, -0.16, 0.5, 1.0, 0.03, 0.1);
    add(CG.cyl, M(0x5a3a1e), 0.12, 1.3, -0.18, 0.06, 0.5, 0.06, 0.4);
  }
  if (kind === 'witch') { add(CG.cylT, M(0x1a1020), 0, 1.86, 0, 0.28, 0.02, 0.28); add(CG.cone, M(0x1a1020), 0, 2.07, -0.04, 0.13, 0.42, 0.13, -0.25); }
  if (kind === 'wolf') { for (const sx of [-1, 1]) add(CG.cone, M(0x5a524a), sx * 0.08, 1.86, -0.02, 0.05, 0.13, 0.03, 0, 0, -sx * 0.25); add(CG.box, M(0x6a625a), 0, 1.67, 0.17, 0.09, 0.07, 0.14); }
  return out;
}
