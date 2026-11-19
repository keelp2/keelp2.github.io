// ============================================================ PHYSICS
const G = 21, STEP = 0.46;
function overlapBox(b, x, y, z, r, h) { return x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1 && y + h > b.y0 + 1e-4 && y < b.y1 - 1e-4; }
function anyOverlap(x, y, z, r, h) { for (const b of world.boxes) if (!b.dead && overlapBox(b, x, y, z, r, h)) return b; return null; }
function moveBody(e, dt) {
  const boxes = world.boxes, wasGround = e.onGround;
  const dx = e.vel.x * dt;
  if (dx) {
    e.pos.x += dx;
    for (const b of boxes) {
      if (b.dead || !overlapBox(b, e.pos.x, e.pos.y, e.pos.z, e.r, e.h)) continue;
      const rise = b.y1 - e.pos.y;
      if (wasGround && rise > 0 && rise <= STEP && !anyOverlap(e.pos.x, b.y1, e.pos.z, e.r, e.h)) { e.pos.y = b.y1; e.stepSmooth -= rise; continue; }
      e.pos.x = dx > 0 ? b.x0 - e.r - 1e-3 : b.x1 + e.r + 1e-3; e.vel.x = 0;
    }
  }
  const dz = e.vel.z * dt;
  if (dz) {
    e.pos.z += dz;
    for (const b of boxes) {
      if (b.dead || !overlapBox(b, e.pos.x, e.pos.y, e.pos.z, e.r, e.h)) continue;
      const rise = b.y1 - e.pos.y;
      if (wasGround && rise > 0 && rise <= STEP && !anyOverlap(e.pos.x, b.y1, e.pos.z, e.r, e.h)) { e.pos.y = b.y1; e.stepSmooth -= rise; continue; }
      e.pos.z = dz > 0 ? b.z0 - e.r - 1e-3 : b.z1 + e.r + 1e-3; e.vel.z = 0;
    }
  }
  e.vel.y -= G * dt;
  const prevY = e.pos.y; e.pos.y += e.vel.y * dt; e.onGround = false; e.ground = null;
  for (const b of boxes) {
    if (b.dead || !overlapBox(b, e.pos.x, e.pos.y, e.pos.z, e.r, e.h)) continue;
    if (e.vel.y <= 0 && prevY >= b.y1 - 0.06) { e.pos.y = b.y1; e.vel.y = 0; e.onGround = true; e.ground = b; }
    else if (e.vel.y > 0 && prevY + e.h <= b.y0 + 0.06) { e.pos.y = b.y0 - e.h - 1e-3; e.vel.y = 0; }
  }
  if (TERR) { const th = TH(e.pos.x, e.pos.z); // hills: stand on them, and stick to them walking downhill
    if (e.pos.y < th || (!e.onGround && wasGround && e.vel.y <= 0 && e.pos.y - th < 0.32 && e.pos.y - th >= 0 && !anyOverlap(e.pos.x, th, e.pos.z, e.r * 0.8, 0.2))) { if (e.pos.y < th - 0.25 && e.stepSmooth !== undefined) e.stepSmooth -= th - e.pos.y; e.pos.y = th; if (e.vel.y < 0) e.vel.y = 0; e.onGround = true; e.ground = TERR.box; } }
  if (!e.onGround && wasGround && e.vel.y <= 0) { // snap down stairs
    let best = -1e9, gb = null;
    for (const b of boxes) {
      if (b.dead) continue;
      if (e.pos.x + e.r > b.x0 && e.pos.x - e.r < b.x1 && e.pos.z + e.r > b.z0 && e.pos.z - e.r < b.z1 && b.y1 <= e.pos.y + 1e-3 && b.y1 >= e.pos.y - 0.55 && b.y1 > best) { best = b.y1; gb = b; }
    }
    if (gb && !anyOverlap(e.pos.x, best, e.pos.z, e.r, e.h)) { e.stepSmooth += e.pos.y - best; e.pos.y = best; e.vel.y = 0; e.onGround = true; e.ground = gb; }
  }
}

