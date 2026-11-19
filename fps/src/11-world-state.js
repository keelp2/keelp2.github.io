// ============================================================ WORLD STATE
let world = null;
let enemies = [], pickups = [], barrels = [], grenades = [], remoteList = [];
const RN = [0, 0, 0];
function rayAABB(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1, tmax) {
  let tmin = 0, t1 = tmax, ax = -1, sg = 0;
  if (Math.abs(dx) < 1e-9) { if (ox < x0 || ox > x1) return -1; } else {
    const inv = 1 / dx; let a = (x0 - ox) * inv, b = (x1 - ox) * inv, s = -1; if (a > b) { const t = a; a = b; b = t; s = 1; }
    if (a > tmin) { tmin = a; ax = 0; sg = s; } if (b < t1) t1 = b; if (tmin > t1) return -1;
  }
  if (Math.abs(dy) < 1e-9) { if (oy < y0 || oy > y1) return -1; } else {
    const inv = 1 / dy; let a = (y0 - oy) * inv, b = (y1 - oy) * inv, s = -1; if (a > b) { const t = a; a = b; b = t; s = 1; }
    if (a > tmin) { tmin = a; ax = 1; sg = s; } if (b < t1) t1 = b; if (tmin > t1) return -1;
  }
  if (Math.abs(dz) < 1e-9) { if (oz < z0 || oz > z1) return -1; } else {
    const inv = 1 / dz; let a = (z0 - oz) * inv, b = (z1 - oz) * inv, s = -1; if (a > b) { const t = a; a = b; b = t; s = 1; }
    if (a > tmin) { tmin = a; ax = 2; sg = s; } if (b < t1) t1 = b; if (tmin > t1) return -1;
  }
  RN[0] = RN[1] = RN[2] = 0; if (ax >= 0) RN[ax] = sg;
  return tmin;
}
const _glassHits = []; let RAY_SEND = true;
function raycast(o, d, maxT, withEnemies, ignore, shoot) { // shoot: a bullet/blade, so glass doesn't stop it but shatters
  let best = maxT, hb = null, he = null, head = false, nx = 0, ny = 0, nz = 0; if (shoot) _glassHits.length = 0;
  for (const b of world.boxes) {
    if (b.dead) continue;
    if (b.glass && shoot) { const t = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, maxT); if (t >= 0) _glassHits.push([t, b.glass]); continue; }
    const t = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, best);
    if (t >= 0 && t < best) { best = t; hb = b; nx = RN[0]; ny = RN[1]; nz = RN[2]; }
  }
  if (withEnemies) for (const list of [enemies, remoteList]) for (const e of list) {
    if (e.dead || e === ignore) continue;
    const s = e.s, x = e.pos.x, y = e.pos.y, z = e.pos.z, hy = y + e.h * 0.8;
    let t = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, x - 0.2 * s, hy, z - 0.2 * s, x + 0.2 * s, y + e.h * 1.02, z + 0.2 * s, best);
    if (t >= 0 && t < best) { best = t; he = e; head = true; hb = null; nx = RN[0]; ny = RN[1]; nz = RN[2]; }
    t = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, x - 0.33 * s, y, z - 0.33 * s, x + 0.33 * s, hy, z + 0.33 * s, best);
    if (t >= 0 && t < best) { best = t; he = e; head = false; hb = null; nx = RN[0]; ny = RN[1]; nz = RN[2]; }
  }
  if (TERR) { const tt = terrRay(o.x, o.y, o.z, d.x, d.y, d.z, best); if (tt >= 0 && tt < best) { best = tt; hb = TERR.box; he = null; const hx = o.x + d.x * tt, hz = o.z + d.z * tt, gx = TH(hx + 0.3, hz) - TH(hx - 0.3, hz), gz = TH(hx, hz + 0.3) - TH(hx, hz - 0.3), l = Math.hypot(gx, 0.6, gz); nx = -gx / l; ny = 0.6 / l; nz = -gz / l; } }
  if (shoot) for (const [t, g] of _glassHits) if (t < best) breakPane(g, RAY_SEND);
  return { t: best, box: hb, enemy: he, head, nx, ny, nz };
}
function los(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz); if (d < 1e-3) return true;
  const ix = dx / d, iy = dy / d, iz = dz / d;
  for (const b of world.boxes) { if (b.dead || b.barrel || b.seeThru) continue; if (rayAABB(ax, ay, az, ix, iy, iz, b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, d - 0.05) >= 0) return false; }
  if (TERR && terrRay(ax, ay, az, ix, iy, iz, d - 0.05) >= 0) return false; // behind a crest
  return true;
}

