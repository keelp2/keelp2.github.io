// ============================================================ TEXTURES
const TEX = {};
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function tex(size, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return t;
}
function speckle(g, s, n, a) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${Math.random() * a})` : `rgba(255,255,255,${Math.random() * a})`;
    const w = 1 + Math.random() * 2.5; g.fillRect(Math.random() * s, Math.random() * s, w, w);
  }
}
function blotch(g, s, n, rgb, a) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${rgb},${Math.random() * a})`; g.beginPath();
    g.arc(Math.random() * s, Math.random() * s, 8 + Math.random() * 40, 0, 7); g.fill();
  }
}
function makeTextures() {
  TEX.concrete = tex(256, (g, s) => { g.fillStyle = '#bdbdbd'; g.fillRect(0, 0, s, s); blotch(g, s, 40, '0,0,0', 0.05); speckle(g, s, 3000, 0.15); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2); });
  TEX.tiles = tex(256, (g, s) => {
    const n = 4, ts = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 165 + Math.random() * 35 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * ts, j * ts, ts, ts); }
    blotch(g, s, 20, '0,0,0', 0.06); speckle(g, s, 2500, 0.12);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * ts, 0); g.lineTo(i * ts, s); g.stroke(); g.beginPath(); g.moveTo(0, i * ts); g.lineTo(s, i * ts); g.stroke(); }
  });
  TEX.panel = tex(256, (g, s) => {
    g.fillStyle = '#a8a8a8'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 2) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(x, 0, 2, s); }
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, 0, s, 3); g.fillRect(0, s / 2, s, 3); g.fillRect(0, 0, 3, s);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 3, s, 2); g.fillRect(0, s / 2 + 3, s, 2);
    for (const y of [12, s / 2 - 10, s / 2 + 14, s - 10]) for (const x of [12, s / 2, s - 10]) {
      g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(x - 1, y - 1, 1.4, 0, 7); g.fill();
    }
    blotch(g, s, 12, '0,0,0', 0.06); speckle(g, s, 800, 0.1);
  });
  TEX.wood = tex(256, (g, s) => {
    const n = 5, h = s / n;
    for (let i = 0; i < n; i++) {
      const v = 150 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v * 0.78 | 0},${v * 0.52 | 0})`; g.fillRect(0, i * h, s, h);
      for (let k = 0; k < 12; k++) { g.strokeStyle = `rgba(60,30,10,${Math.random() * 0.25})`; g.beginPath(); const y = i * h + Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(s / 3, y + rand(-4, 4), 2 * s / 3, y + rand(-4, 4), s, y); g.stroke(); }
      g.fillStyle = 'rgba(40,20,5,.6)'; g.fillRect(0, i * h, s, 2);
    }
    g.strokeStyle = 'rgba(55,28,8,.85)'; g.lineWidth = 16; g.strokeRect(8, 8, s - 16, s - 16);
    g.lineWidth = 12; g.beginPath(); g.moveTo(14, 14); g.lineTo(s - 14, s - 14); g.stroke();
  });
  TEX.planks = tex(256, (g, s) => {
    const n = 6, h = s / n;
    for (let i = 0; i < n; i++) { const v = 150 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v * 0.78 | 0},${v * 0.52 | 0})`; g.fillRect(0, i * h, s, h); g.fillStyle = 'rgba(40,20,5,.5)'; g.fillRect(0, i * h, s, 2); }
    speckle(g, s, 1200, 0.12);
  });
  TEX.corrugated = tex(128, (g, s) => {
    for (let x = 0; x < s; x++) { const v = 150 + Math.sin(x / s * Math.PI * 2 * 8) * 55 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, s); }
    blotch(g, s, 10, '60,30,0', 0.12); speckle(g, s, 600, 0.15); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, s, 4);
  });
  TEX.hazard = tex(128, (g, s) => {
    g.fillStyle = '#e8b923'; g.fillRect(0, 0, s, s); g.fillStyle = '#1d1d1d';
    for (let i = -s; i < s * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 - s, s); g.lineTo(i - s, s); g.closePath(); g.fill(); }
    speckle(g, s, 500, 0.2);
  });
  TEX.plaster = tex(256, (g, s) => { g.fillStyle = '#ddd6c8'; g.fillRect(0, 0, s, s); blotch(g, s, 40, '90,70,40', 0.07); blotch(g, s, 30, '255,255,255', 0.08); speckle(g, s, 2500, 0.1); });
  TEX.sand = tex(256, (g, s) => {
    g.fillStyle = '#d8c39a'; g.fillRect(0, 0, s, s); blotch(g, s, 30, '150,110,60', 0.08);
    for (let y = 0; y < s; y += 6) { g.strokeStyle = `rgba(120,90,50,${0.05 + Math.random() * 0.06})`; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x * 0.0245 * 4 + y) * 2); g.stroke(); }
    speckle(g, s, 5000, 0.15);
  });
  TEX.bags = tex(128, (g, s) => {
    g.fillStyle = '#b9a477'; g.fillRect(0, 0, s, s);
    for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) { const x = c * 64 + (r % 2) * 32, y = r * 32; g.fillStyle = `rgba(255,240,200,${0.1 + Math.random() * 0.1})`; g.beginPath(); g.ellipse(x + 32, y + 16, 30, 13, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(70,50,20,.5)'; g.lineWidth = 2; g.stroke(); }
    speckle(g, s, 800, 0.15);
  });
  TEX.grid = tex(256, (g, s) => {
    g.fillStyle = '#1b1e30'; g.fillRect(0, 0, s, s); speckle(g, s, 1500, 0.08);
    g.strokeStyle = 'rgba(0,229,255,.6)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
    g.strokeStyle = 'rgba(0,229,255,.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
  });
  TEX.decal = tex(64, (g, s) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.25, 'rgba(10,10,10,.95)'); gr.addColorStop(0.45, 'rgba(30,30,30,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }, false);
  TEX.flash = tex(64, (g, s) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.3, 'rgba(255,200,90,.9)'); gr.addColorStop(1, 'rgba(255,120,20,0)');
    g.fillStyle = gr; g.beginPath();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = i % 2 ? 12 : 32; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    g.fill();
  }, false);
  TEX.dot = tex(32, (g, s) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, false);
}

