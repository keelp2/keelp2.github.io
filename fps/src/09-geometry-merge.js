// ============================================================ GEOMETRY MERGE
const FACES = [
  { n: [1, 0, 0], c: b => [[b.x1, b.y0, b.z1], [b.x1, b.y0, b.z0], [b.x1, b.y1, b.z0], [b.x1, b.y1, b.z1]], uv: p => [-p[2], p[1]], ul: (x, y, z) => [1 - z, y] },
  { n: [-1, 0, 0], c: b => [[b.x0, b.y0, b.z0], [b.x0, b.y0, b.z1], [b.x0, b.y1, b.z1], [b.x0, b.y1, b.z0]], uv: p => [p[2], p[1]], ul: (x, y, z) => [z, y] },
  { n: [0, 1, 0], c: b => [[b.x0, b.y1, b.z1], [b.x1, b.y1, b.z1], [b.x1, b.y1, b.z0], [b.x0, b.y1, b.z0]], uv: p => [p[0], -p[2]], ul: (x, y, z) => [x, 1 - z] },
  { n: [0, -1, 0], c: b => [[b.x0, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y0, b.z1], [b.x0, b.y0, b.z1]], uv: p => [p[0], p[2]], ul: (x, y, z) => [x, z] },
  { n: [0, 0, 1], c: b => [[b.x0, b.y0, b.z1], [b.x1, b.y0, b.z1], [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1]], uv: p => [p[0], p[1]], ul: (x, y, z) => [x, y] },
  { n: [0, 0, -1], c: b => [[b.x1, b.y0, b.z0], [b.x0, b.y0, b.z0], [b.x0, b.y1, b.z0], [b.x1, b.y1, b.z0]], uv: p => [-p[0], p[1]], ul: (x, y, z) => [1 - x, y] },
];
function buildLevelMeshes(L, theme, group) {
  const byMat = {};
  for (const b of L.boxes.concat(L.decor)) if (!b.noRender && b.m !== 'barrel') (byMat[b.m] || (byMat[b.m] = [])).push(b);
  for (const m in byMat) {
    const { def, mat } = matFor(m, theme);
    const pos = [], nor = [], uv = [], col = [], idx = [];
    for (const b of byMat[m]) {
      const base = new THREE.Color(b.tint !== undefined ? b.tint : 0xffffff);
      const j = def.e !== undefined ? 1 : rand(0.86, 1.04);
      const sx = b.x1 - b.x0, sy = b.y1 - b.y0, sz = b.z1 - b.z0;
      for (const f of FACES) {
        if (f.n[1] === -1 && b.y0 <= 0.001) continue; // never visible
        const cs = f.c(b), vi = pos.length / 3;
        for (const p of cs) {
          pos.push(p[0], p[1], p[2]); nor.push(f.n[0], f.n[1], f.n[2]);
          let u, v;
          if (def.local) [u, v] = f.ul((p[0] - b.x0) / sx, (p[1] - b.y0) / sy, (p[2] - b.z0) / sz);
          else { const s = def.s || 4; [u, v] = f.uv(p); u /= s; v /= s; }
          uv.push(u, v);
          let sh = j;
          if (def.e === undefined) {
            if (f.n[1] === 0 && p[1] === b.y0 && b.y0 <= 0.01) sh *= 0.62; // contact shadow
            else if (f.n[1] === 0 && p[1] === b.y0) sh *= 0.85;
            if (f.n[1] === -1) sh *= 0.55;
          }
          col.push(base.r * sh, base.g * sh, base.b * sh);
        }
        const a = cs[0], b1 = cs[1], c2 = cs[2];
        const ux = b1[0] - a[0], uy = b1[1] - a[1], uz = b1[2] - a[2], wx = c2[0] - a[0], wy = c2[1] - a[1], wz = c2[2] - a[2];
        const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
        if (cx * f.n[0] + cy * f.n[1] + cz * f.n[2] >= 0) idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
        else idx.push(vi, vi + 2, vi + 1, vi, vi + 3, vi + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = def.e === undefined && m !== 'floor'; mesh.receiveShadow = def.e === undefined;
    group.add(mesh);
  }
}

