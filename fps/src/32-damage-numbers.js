// ============================================================ DAMAGE NUMBERS
const dnPool = []; let dnI = 0;
function initDmgNumbers() {
  const host = $('dnums');
  for (let i = 0; i < 18; i++) { const el = document.createElement('div'); el.className = 'dn'; host.appendChild(el); dnPool.push({ el, t: 0, p: new V3() }); }
}
function dmgNumber(p, d, head) {
  if (!settings.dmgNums) return; /* off by default, like CoD multiplayer: the hit marker is the feedback */
  const n = dnPool[dnI]; dnI = (dnI + 1) % dnPool.length;
  n.p.copy(p); n.t = 0.8; n.el.textContent = Math.round(d); n.el.className = 'dn' + (head ? ' head' : '');
}
const _dp = new V3();
function updateDmgNumbers(dt) {
  for (const n of dnPool) {
    if (n.t <= 0) { if (n.el.style.opacity !== '0') n.el.style.opacity = '0'; continue; }
    n.t -= dt; _dp.copy(n.p); _dp.y += (0.8 - n.t) * 0.9; _dp.project(camera);
    if (_dp.z > 1) { n.el.style.opacity = '0'; continue; }
    n.el.style.transform = `translate(${(_dp.x * 0.5 + 0.5) * innerWidth}px,${(-_dp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%) scale(${1 + Math.max(0, n.t - 0.6) * 2})`;
    n.el.style.opacity = String(clamp(n.t * 3, 0, 1));
  }
}

