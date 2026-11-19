// ============================================================ AUDIO — layered, CoD-style weapon audio + reverb + battle ambience
const GUNSND = { // crack, body (lowpass f, dur, gain), thump (f0 -> f1, dur, gain), mech click delay
  pistol: { crack: 0.55, bf: 3600, bd: 0.12, bg: 0.9, t0: 170, t1: 60, td: 0.08, tg: 0.55, mech: 0.05 },
  revolver: { crack: 0.85, bf: 3000, bd: 0.26, bg: 1.15, t0: 125, t1: 40, td: 0.2, tg: 0.95, mech: 0 },
  rifle: { crack: 0.75, bf: 4300, bd: 0.1, bg: 0.85, t0: 145, t1: 55, td: 0.07, tg: 0.6, mech: 0.03 },
  ak: { crack: 0.85, bf: 3000, bd: 0.14, bg: 1.0, t0: 115, t1: 45, td: 0.1, tg: 0.8, mech: 0.035 },
  smg: { crack: 0.45, bf: 4800, bd: 0.07, bg: 0.7, t0: 190, t1: 75, td: 0.05, tg: 0.4, mech: 0.025 },
  lmg: { crack: 0.75, bf: 3500, bd: 0.11, bg: 0.95, t0: 125, t1: 50, td: 0.08, tg: 0.75, mech: 0.03 },
  shotgun: { crack: 0.95, bf: 2500, bd: 0.32, bg: 1.3, t0: 95, t1: 35, td: 0.26, tg: 1.15, mech: 0 },
  dmr: { crack: 1.0, bf: 3500, bd: 0.2, bg: 1.15, t0: 110, t1: 40, td: 0.2, tg: 1.0, mech: 0.04 },
  sniper: { crack: 1.25, bf: 3000, bd: 0.38, bg: 1.4, t0: 90, t1: 30, td: 0.36, tg: 1.35, mech: 0, mf: 700, mg: 0.35 },
  battle: { crack: 0.95, bf: 2600, bd: 0.17, bg: 1.15, t0: 100, t1: 38, td: 0.13, tg: 0.95, mech: 0.035, mf: 620, mg: 0.45 },
  bullpup: { crack: 0.7, bf: 4800, bd: 0.08, bg: 0.8, t0: 160, t1: 60, td: 0.06, tg: 0.5, mech: 0.025, mf: 1800, mg: 0.3 },
  hyper: { crack: 0.35, bf: 5200, bd: 0.05, bg: 0.6, t0: 210, t1: 90, td: 0.04, tg: 0.32, mech: 0.02, mf: 2600, mg: 0.35 },
  ump45: { crack: 0.3, bf: 3400, bd: 0.09, bg: 0.8, t0: 150, t1: 60, td: 0.07, tg: 0.55, mech: 0.03, mf: 1100, mg: 0.35 },
  autosg: { crack: 0.85, bf: 2800, bd: 0.26, bg: 1.25, t0: 100, t1: 38, td: 0.22, tg: 1.05, mech: 0.06, mf: 900, mg: 0.4 },
  fifty: { crack: 1.5, bf: 2200, bd: 0.5, bg: 1.6, t0: 70, t1: 24, td: 0.5, tg: 1.6, mech: 0.05, mf: 480, mg: 0.55 },
  mpistol: { crack: 0.4, bf: 4200, bd: 0.07, bg: 0.7, t0: 200, t1: 80, td: 0.05, tg: 0.4, mech: 0.02, mf: 2300, mg: 0.3 },
};
for (const [k, mf, mg] of [['pistol', 1900, 0.3], ['revolver', 900, 0.45], ['rifle', 1500, 0.35], ['ak', 820, 0.5], ['smg', 2200, 0.3], ['lmg', 1000, 0.4], ['shotgun', 750, 0.45], ['dmr', 950, 0.4]]) Object.assign(GUNSND[k], { mf, mg });
// Recorded clips: list them in audio/sfx/manifest.json ({ "gun_rifle": ["rifle_1.mp3", "rifle_2.mp3"], ... }) and they replace
// the generated sound for that key (a random take each time); anything not listed keeps the generated version. See audio/README.md.
const SAMPLES = {}, GUNALIAS = { battle: 'ak', bullpup: 'rifle', hyper: 'smg', ump45: 'smg', autosg: 'shotgun', fifty: 'sniper', mpistol: 'smg', revolver: 'pistol', dmr: 'sniper' };
const HM_SOUNDS = ['punch', 'snap', 'thump', 'tight', 'clean'];
function loadHitmarker(c, preview) { const k = HM_SOUNDS.includes(settings.hmSound) ? settings.hmSound : 'punch'; /* the hit-marker clip (one of five treatments) */
  fetch('audio/sfx/hm_' + k + '.wav?v=1').then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(ab => c.decodeAudioData(ab)).then(buf => { SAMPLES.hitmarker = [buf]; if (preview) [0, 94, 188, 282].forEach((d, i) => setTimeout(() => sfx.play(i === 3 ? 'hmkill' : 'hm'), d)); }).catch(() => {}); }
function loadSamples(c) { loadHitmarker(c);
  fetch('audio/sfx/manifest.json?v=' + (window.BP_AUDIO_V || 1)).then(r => r.ok ? r.json() : null).then(m => { if (!m) return;
  for (const [key, files] of Object.entries(m)) for (const f of [].concat(files)) fetch('audio/sfx/' + f).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(ab => c.decodeAudioData(ab)).then(buf => (SAMPLES[key] || (SAMPLES[key] = [])).push(buf)).catch(() => {}); }).catch(() => {}); }
// Hit-marker sounds: a high-register 808 kick. Each layer is a sine whose pitch dives fast (the "punch"), with a
// sub-millisecond click on top, then everything is driven into tanh saturation for weight.
function hmSynth(kind, sr, seed) {
  let r = seed * 9301 + 49297; const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  const pv = 1 + (rnd() - 0.5) * 0.05, K = kind === 'hmkill', Hd = kind === 'hmhead';
  /* layers: [start Hz, end Hz, pitch-dive time, amp decay, gain] */
  const L = K ? [[1500, 420, 0.012, 0.055, 0.9], [260, 62, 0.03, 0.11, 1.0]]
    : Hd ? [[2300, 760, 0.008, 0.03, 0.9], [420, 150, 0.014, 0.04, 0.55]]
    : [[2000, 640, 0.008, 0.026, 0.9], [380, 130, 0.014, 0.034, 0.6]];
  const len = Math.round(sr * (K ? 0.3 : Hd ? 0.2 : 0.11)), o = new Float32Array(len), ph = L.map(() => 0);
  for (let i = 0; i < len; i++) { const t = i / sr; let v = 0;
    L.forEach((l, j) => { const f = (l[1] + (l[0] - l[1]) * Math.exp(-t / l[2])) * pv; ph[j] += 2 * Math.PI * f / sr; v += Math.sin(ph[j]) * Math.exp(-t / l[3]) * l[4]; });
    if (t < 0.0015) v += (rnd() * 2 - 1) * (1 - t / 0.0015) * 0.7; /* the click */
    if (Hd) v += (Math.sin(2 * Math.PI * 3700 * pv * t) * 0.22 + Math.sin(2 * Math.PI * 5550 * pv * t) * 0.08) * Math.exp(-t / 0.05) * Math.min(1, t / 0.003); /* headshot ping */
    if (K && t > 0.022) { const u = t - 0.022; v += Math.sin(2 * Math.PI * (900 + 1300 * Math.exp(-u / 0.006)) * pv * u) * Math.exp(-u / 0.03) * 0.55; } /* second hit of the kill */
    o[i] = Math.tanh(v * (K ? 2.6 : 2.2)); }
  let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(o[i])); const G = (K ? 0.75 : Hd ? 0.66 : 0.6) / (pk || 1);
  for (let i = 0; i < len; i++) o[i] *= G * Math.min(1, (len - i) / (sr * 0.004)); return o;
}
const sfx = {
  ctx: null,
  sample(key, dest, t) { const L = SAMPLES[key]; if (!L || !L.length) return false; const c = this.ctx, s = c.createBufferSource(); s.buffer = L[Math.floor(Math.random() * L.length)]; s.playbackRate.value = 0.97 + Math.random() * 0.06; s.connect(dest); s.start(t === undefined ? c.currentTime : Math.max(t, c.currentTime)); return true; },
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C();
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = settings.volume;
    this.musicBus = c.createGain(); this.musicBus.gain.value = settings.music;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.18;
    const tame = c.createBiquadFilter(); tame.type = 'highshelf'; tame.frequency.value = 7500; tame.gain.value = -5; // less hiss and fizz, easier on the ears
    this.sfxBus.connect(tame); tame.connect(comp); comp.connect(c.destination); { const lim = c.createDynamicsCompressor(); lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 14; lim.attack.value = 0.003; lim.release.value = 0.18; this.musicBus.connect(lim); lim.connect(c.destination); } /* the music gets its own limiter: stacked synth voices used to clip (the grainy sound) */
    this.verb = c.createConvolver(); this.verb.buffer = this.impulse(2.4, 2.8); this.verbIn = c.createGain(); this.verbIn.gain.value = 0.55;
    this.verbIn.connect(this.verb); this.verb.connect(this.sfxBus);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nb = buf; loadSamples(c);
  },
  impulse(sec, decay) { // synthetic outdoor/room reverb: early reflections + diffuse tail
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (t < 0.02 ? 0.4 : 1); }
      for (let k = 0; k < 6; k++) { const at = Math.floor(c.sampleRate * (0.01 + Math.random() * 0.09)); d[at] += (Math.random() < 0.5 ? -1 : 1) * 0.6; } }
    return b;
  },
  listen(cam) { // the listener is your head: position + facing, so 3D sounds are front/back/up/down correct
    if (!this.ok()) return; const L = this.ctx.listener, e = cam.matrixWorld.elements, f = [-e[8], -e[9], -e[10]], u = [e[4], e[5], e[6]], p = cam.position;
    if (L.positionX) { const t = this.ctx.currentTime; L.positionX.setTargetAtTime(p.x, t, 0.01); L.positionY.setTargetAtTime(p.y, t, 0.01); L.positionZ.setTargetAtTime(p.z, t, 0.01); L.forwardX.setTargetAtTime(f[0], t, 0.01); L.forwardY.setTargetAtTime(f[1], t, 0.01); L.forwardZ.setTargetAtTime(f[2], t, 0.01); L.upX.setTargetAtTime(u[0], t, 0.01); L.upY.setTargetAtTime(u[1], t, 0.01); L.upZ.setTargetAtTime(u[2], t, 0.01); }
    else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f[0], f[1], f[2], u[0], u[1], u[2]); }
    this.indoorT = (this.indoorT || 0) - 1; if (this.indoorT <= 0 && world) { this.indoorT = 20; const h = raycast(p, new V3(0, 1, 0), 9, false); this.indoor = h.t < 9; }
  },
  setVol(v) { if (this.sfxBus) this.sfxBus.gain.value = v; },
  setMusic(v) { if (this.musicBus) this.musicBus.gain.value = v; },
  // chain: pan + optional lowpass (distance) + dry/wet split
  chain(pan = 0, wet = 0.2, lp = 0, vol = 1, pos = null) {
    const c = this.ctx, g = c.createGain(); g.gain.value = vol; let head = g;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); head = f; }
    let out = head;
    if (pos && c.createPanner && settings.hrtf !== false) { const p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1; p.rolloffFactor = 0; // direction only; loudness is ours
      if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z); head.connect(p); out = p; this.lastPanner = p; }
    else if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); head.connect(p); out = p; }
    out.connect(this.sfxBus);
    if (wet > 0) { const w = c.createGain(); w.gain.value = wet; out.connect(w); w.connect(this.verbIn); }
    return g;
  },
  // human voices from a pitched source through vocal-tract formants (spatial like everything else)
  voice(kind, o = {}) {
    if (!this.ok() || (settings.voices !== true && kind !== 'breath')) return; const c = this.ctx, t = c.currentTime + (o.delay || 0), p0 = o.pitch || 120, v = (o.vol === undefined ? 1 : o.vol);
    const V = { pain: { d: rand(0.16, 0.26), f: [640, 1190, 2390], p: [1.35, 0.92], g: 0.55, br: 0.25 }, hurt: { d: rand(0.32, 0.45), f: [700, 1220, 2600], p: [1.5, 0.8], g: 0.7, br: 0.35 },
      death: { d: rand(0.6, 0.9), f: [780, 1150, 2800], p: [1.55, 0.55], g: 0.75, br: 0.4, vib: 1 }, effort: { d: rand(0.1, 0.15), f: [420, 1500, 2500], p: [1.05, 0.95], g: 0.35, br: 0.5 },
      breath: { d: 0.5, f: [500, 1400, 2600], p: [1, 1], g: 0.0, br: 1 } }[kind]; if (!V) return;
    const dest = this.chain(o.pan || 0, o.wet || 0.12, o.lp || 0, v * (o.self ? 0.55 : 1), o.pos);
    if (V.g > 0) { const src = c.createOscillator(); src.type = 'sawtooth'; src.frequency.setValueAtTime(p0 * V.p[0], t); src.frequency.exponentialRampToValueAtTime(p0 * V.p[1], t + V.d);
      if (V.vib) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = rand(5, 7); lg.gain.value = p0 * 0.05; lfo.connect(lg); lg.connect(src.frequency); lfo.start(t); lfo.stop(t + V.d + 0.05); }
      const env = c.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(V.g, t + 0.02); env.gain.setValueAtTime(V.g * 0.8, t + V.d * 0.55); env.gain.exponentialRampToValueAtTime(0.0001, t + V.d);
      src.connect(env); V.f.forEach((f, i) => { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * rand(0.94, 1.06) * (p0 > 150 ? 1.12 : 1); bp.Q.value = [6, 9, 12][i]; const g = c.createGain(); g.gain.value = [1, 0.55, 0.25][i] * 3.2; env.connect(bp); bp.connect(g); g.connect(dest); });
      src.start(t); src.stop(t + V.d + 0.05); }
    this.nz(dest, { t, dur: V.d * (kind === 'breath' ? 1 : 0.7), type: 'bandpass', f: kind === 'breath' ? 1300 : 1700, q: 0.9, g: V.br * 0.35, a: kind === 'breath' ? 0.18 : 0.01 }); // breath / rasp
  },
  nz(dest, o) {
    const c = this.ctx, t = o.t !== undefined ? o.t : c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.nb;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur); f.Q.value = o.q || 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g), t + (o.a || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * 1.5); src.stop(t + o.dur + 0.05);
  },
  osc(dest, o) {
    const c = this.ctx, t = o.t !== undefined ? o.t : c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(10, o.f2), t + o.dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g), t + (o.a || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur); osc.connect(g); g.connect(dest); osc.start(t); osc.stop(t + o.dur + 0.05);
  },
  ok() { return this.ctx && this.ctx.state === 'running'; },
  gun(id, o = {}) { // o: dist, pan, pos, vol, supp, comp, occl
    if (!this.ok()) return; const P = GUNSND[id] || GUNSND.rifle, d = o.dist || 0, far = clamp(d / 90, 0, 1), sup = !!o.supp, occ = o.occl ? 1 : 0;
    const lpF = (far > 0.02 ? 12000 - far * 10200 : 0) || (occ ? 14000 : 0), lp = occ ? Math.min(lpF || 14000, 1400) : lpF;
    const dest = this.chain(o.pan || 0, sup ? 0.12 : (this.indoor ? 0.55 : 0.2) + far * 0.55, lp, (o.vol === undefined ? 1 : o.vol) * (o.comp ? 1.12 : 1) * (occ ? 0.62 : 1) / (1 + d * 0.025), o.pos);
    const t = this.ctx.currentTime + (d > 12 ? Math.min(0.9, d / 343) : 0); // sound arrives after the flash
    if (this.sample(sup ? 'gun_suppressed' : 'gun_' + id, dest, t) || (!sup && GUNALIAS[id] && this.sample('gun_' + GUNALIAS[id], dest, t))) return;
    if (!sup) this.nz(dest, { t, dur: 0.03, type: 'bandpass', f: 3400, q: 0.8, g: P.crack * 0.8 * (1 - far * 0.85) * (occ ? 0.4 : 1) }); // crack, without the fizzy top end
    if (!sup && d < 4) this.osc(dest, { t, type: 'sine', f: 95, f2: 38, dur: 0.11, g: 0.55 * Math.min(1.3, P.tg) }); // chest punch on your own shots
    this.nz(dest, { t, dur: sup ? P.bd * 0.6 : P.bd, type: 'lowpass', f: sup ? P.bf * 0.32 : P.bf, f2: P.bf * 0.2, g: P.bg * (sup ? 0.45 : 1), a: 0.001 });
    if (P.mf) this.nz(dest, { t: t + 0.004, dur: (sup ? 0.05 : 0.09) + P.bd * 0.4, type: 'bandpass', f: P.mf, f2: P.mf * 0.6, q: 1.3, g: P.mg * (sup ? 0.35 : 1) }); // the weapon's "bark"
    this.osc(dest, { t, type: 'sine', f: P.t0, f2: P.t1, dur: P.td, g: P.tg * (sup ? 0.35 : 1) * (1 - far * 0.5) });
    if (!sup && !far) this.nz(dest, { t: t + 0.02, dur: 0.5, type: 'bandpass', f: 700, f2: 180, q: 0.6, g: 0.12 });
    if (P.mech && d < 7) this.nz(dest, { t: t + P.mech, dur: 0.03, type: 'bandpass', f: 3300, q: 5, g: 0.18 });
    if (!this.indoor && !sup && d > 6) { const e = this.chain(0, 0.6, 1800 - far * 900, 0.32 * (o.vol === undefined ? 1 : o.vol) / (1 + d * 0.02), null); this.nz(e, { t: t + 0.12 + Math.random() * 0.25, dur: P.bd * 2.2, type: 'lowpass', f: 1200, f2: 200, g: P.bg * 0.7, a: 0.01 }); } // slap-back off the buildings
  },
  // footsteps: o = { pan, vol, muffle (0..1, walls/floors between), gait: 'sneak'|'walk'|'sprint', near (own steps) }
  step(surf, o = {}) {
    if (!this.ok()) return; const v = o.vol === undefined ? 1 : o.vol; if (v < 0.01) return;
    const mf = o.muffle || 0, dest = this.chain(o.pan || 0, o.near ? 0.04 : 0.12 + mf * 0.2, mf > 0.05 ? 3200 - mf * 2700 : 0, v, o.pos), t = this.ctx.currentTime + Math.random() * 0.01;
    if (this.sample('step_' + (surf || 'concrete'), dest, t) || this.sample('step_concrete', dest, t)) return;
    const N = x => this.nz(dest, Object.assign({ t: t + (x.d || 0) }, x)), T = x => this.osc(dest, Object.assign({ t: t + (x.d || 0) }, x)), j = rand(0.88, 1.14), hard = o.gait === 'sprint' ? 1.25 : o.gait === 'sneak' ? 0.55 : 1;
    switch (surf) {
      case 'wood': T({ f: 190 * j, f2: 120, dur: 0.12, g: 0.5 * hard }); N({ type: 'bandpass', f: 850 * j, q: 2.2, dur: 0.09, g: 0.4 * hard }); N({ type: 'bandpass', f: 1600 * j, q: 3, dur: 0.04, g: 0.15, d: 0.05 });
        if (Math.random() < 0.12) T({ type: 'sawtooth', f: 330 * j, f2: 300, dur: 0.18, g: 0.018, d: 0.04 }); break; // floorboard creak
      case 'metal': N({ type: 'highpass', f: 2400, dur: 0.045, g: 0.35 * hard }); T({ type: 'triangle', f: 540 * j, dur: 0.28, g: 0.09 * hard }); T({ f: 1330 * j, dur: 0.2, g: 0.05 * hard }); T({ f: 95, f2: 60, dur: 0.07, g: 0.3 * hard }); N({ type: 'bandpass', f: 3100, q: 6, dur: 0.12, g: 0.06, d: 0.02 }); break;
      case 'grass': N({ f: 950 * j, f2: 260, dur: 0.15, g: 0.38 * hard, a: 0.02 }); N({ type: 'highpass', f: 4800, dur: 0.1, g: 0.06 * hard, a: 0.02 }); T({ f: 80, f2: 50, dur: 0.06, g: 0.12 * hard }); break;
      case 'sand': for (let i = 0; i < 4; i++) N({ type: 'bandpass', f: rand(2300, 3800), q: 1.6, dur: 0.022, g: 0.13 * hard, d: i * rand(0.012, 0.022) }); N({ f: 420, dur: 0.09, g: 0.25 * hard }); break;
      case 'water': N({ type: 'bandpass', f: 1300 * j, f2: 450, q: 1.2, dur: 0.26, g: 0.45 * hard, a: 0.02 }); N({ type: 'highpass', f: 4200, dur: 0.14, g: 0.12 * hard, d: 0.03 }); break;
      case 'dirt': N({ f: 650 * j, f2: 200, dur: 0.11, g: 0.45 * hard }); N({ type: 'bandpass', f: 1900, q: 1.5, dur: 0.04, g: 0.1 * hard, d: 0.01 }); T({ f: 85, f2: 55, dur: 0.06, g: 0.2 * hard }); break;
      case 'stone': N({ type: 'bandpass', f: 2100 * j, q: 1.4, dur: 0.045, g: 0.5 * hard }); T({ f: 120, f2: 65, dur: 0.06, g: 0.3 * hard }); N({ type: 'bandpass', f: 2800 * j, q: 2, dur: 0.03, g: 0.22 * hard, d: 0.045 }); T({ f: 1900 * j, dur: 0.05, g: 0.015 }); break;
      default: /* concrete / asphalt */ N({ type: 'bandpass', f: 1450 * j, q: 1.2, dur: 0.05, g: 0.5 * hard }); T({ f: 110, f2: 60, dur: 0.065, g: 0.34 * hard }); N({ type: 'highpass', f: 3600, dur: 0.03, g: 0.1 * hard, d: 0.02 }); N({ type: 'bandpass', f: 2000 * j, q: 1.4, dur: 0.03, g: 0.24 * hard, d: 0.048 });
    }
    if (o.gait === 'sprint') { N({ type: 'bandpass', f: 4600, q: 8, dur: 0.03, g: 0.06, d: 0.03 }); N({ type: 'bandpass', f: 3800, q: 7, dur: 0.025, g: 0.04, d: 0.07 }); } // gear rattle
  },
  ring(sec) { // flashbang tinnitus: a high tone, everything else ducked
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.frequency.value = 3600; o.type = 'sine';
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + sec); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + sec + 0.1);
    const b = this.sfxBus.gain; b.cancelScheduledValues(t); b.setValueAtTime(settings.volume * 0.15, t + 0.02); b.linearRampToValueAtTime(settings.volume, t + sec);
  },
  boom(dist = 0, pan = 0, big = 1, pos = null) {
    if (!this.ok()) return; const far = clamp(dist / 120, 0, 1);
    const dest = this.chain(pan, 0.45 + far * 0.5, far > 0.02 ? 6000 - far * 5200 : 0, big / (1 + dist * 0.02), pos), t = this.ctx.currentTime + (dist > 15 ? Math.min(1.2, dist / 343) : 0);
    if (this.sample(far > 0.5 ? 'explosion_far' : 'explosion', dest, t) || this.sample('explosion', dest, t)) return;
    this.nz(dest, { t, dur: 0.05, type: 'highpass', f: 1500, g: 0.9 * (1 - far) });
    this.nz(dest, { t, dur: 1.8, type: 'lowpass', f: 1600, f2: 70, g: 1.4, a: 0.004 });
    this.osc(dest, { t, type: 'sine', f: 70, f2: 22, dur: 1.2, g: 1.3 });
    for (let i = 0; i < 8 && !far; i++) this.nz(dest, { t: t + 0.15 + Math.random() * 0.9, dur: 0.05, type: 'bandpass', f: 1500 + Math.random() * 3000, q: 3, g: 0.08 });
  },
  hmPlay(n, dest) { /* pre-rendered so the attack is sample-sharp; 4 slight variants each so rapid fire doesn't sound like a machine */
    const c = this.ctx, H = SAMPLES.hitmarker && SAMPLES.hitmarker[0]; if (H) { /* the recorded clip: body hits as-is, headshots a touch higher with a ping, kills lower and heavier */
      const src = c.createBufferSource(), g = c.createGain(); src.buffer = H; src.playbackRate.value = (n === 'hmhead' ? 1.07 : n === 'hmkill' ? 0.86 : 1) * (0.985 + Math.random() * 0.03); g.gain.value = n === 'hmkill' ? 1.1 : 1; src.connect(g); g.connect(dest); src.start();
      if (n === 'hmhead') this.osc(dest, { type: 'sine', f: 3700, dur: 0.09, g: 0.07 });
      if (n === 'hmkill') { const s2 = c.createBufferSource(), g2 = c.createGain(); s2.buffer = H; s2.playbackRate.value = 1.12; g2.gain.value = 0.55; s2.connect(g2); g2.connect(dest); s2.start(c.currentTime + 0.035); }
      return; }
    const B = this.hmB || (this.hmB = {}), L = B[n] || (B[n] = [0, 1, 2, 3].map(i => { const d = hmSynth(n, c.sampleRate, i + 1), b = c.createBuffer(1, d.length, c.sampleRate); b.copyToChannel(d, 0); return b; }));
    const src = c.createBufferSource(); src.buffer = L[(Math.random() * 4) | 0]; src.connect(dest); src.start();
  },
  play(n, o = {}) {
    if (!this.ok()) return;
    const v = o.vol === undefined ? 1 : o.vol, dest = this.chain(o.pan || 0, o.wet || 0.05, 0, v, o.pos);
    const N = x => this.nz(dest, x), T = x => this.osc(dest, x);
    if (!/^(eRifle|eShotgun|eHeavy|eSniper|pistol|revolver|rifle|ak|smg|lmg|shotgun|dmr|sniper)$/.test(n) && this.sample(n, dest)) return;
    switch (n) {
      case 'eRifle': return this.gun('rifle', o); case 'eShotgun': return this.gun('shotgun', o); case 'eHeavy': return this.gun('lmg', o); case 'eSniper': return this.gun('sniper', o);
      case 'pistol': case 'revolver': case 'rifle': case 'ak': case 'smg': case 'lmg': case 'shotgun': case 'dmr': case 'sniper': return this.gun(n, o);
      case 'charge': T({ type: 'sine', f: 600, f2: 1800, dur: 1.0, g: 0.18, a: 0.3 }); break;
      case 'medal': T({ type: 'triangle', f: 1320, dur: 0.12, g: 0.09 }); T({ type: 'sine', f: 1980, dur: 0.22, g: 0.06, delay: 0.05 }); N({ dur: 0.03, type: 'highpass', f: 6000, g: 0.12 }); break;
      case 'nukeSiren': T({ type: 'sawtooth', f: 420, f2: 760, dur: 0.5, g: 0.09 }); T({ type: 'sawtooth', f: 760, f2: 420, dur: 0.45, g: 0.09, delay: 0.5 }); break;
      case 'heli': N({ dur: 0.09, type: 'lowpass', f: 260, f2: 90, g: 0.55 }); T({ f: 58, f2: 38, dur: 0.08, g: 0.35 }); break; // rotor thump
      case 'empty': N({ dur: 0.035, type: 'bandpass', f: 3500, q: 6, g: 0.4 }); break;
      case 'magout': N({ dur: 0.07, type: 'bandpass', f: 1800, q: 4, g: 0.45 }); N({ dur: 0.12, type: 'bandpass', f: 900, q: 2, g: 0.2, delay: 0.05 }); break;
      case 'magin': N({ dur: 0.05, type: 'bandpass', f: 2600, q: 3, g: 0.55 }); N({ dur: 0.06, type: 'bandpass', f: 1200, q: 3, g: 0.55, delay: 0.07 }); N({ dur: 0.04, type: 'highpass', f: 4000, g: 0.4, delay: 0.25 }); break;
      case 'rack': N({ dur: 0.06, type: 'bandpass', f: 1300, q: 3, g: 0.55 }); N({ dur: 0.05, type: 'bandpass', f: 2400, q: 4, g: 0.6, delay: 0.11 }); T({ type: 'square', f: 180, f2: 90, dur: 0.04, g: 0.05, delay: 0.11 }); break; // charging handle back & slam home
      case 'mtap': N({ dur: 0.03, type: 'bandpass', f: 1500, q: 2, g: 0.35 }); break;
      case 'bolt': N({ dur: 0.08, type: 'bandpass', f: 1500, q: 3, g: 0.5 }); N({ dur: 0.08, type: 'bandpass', f: 2200, q: 3, g: 0.5, delay: 0.18 }); break;
      case 'shell': N({ dur: 0.07, type: 'bandpass', f: 1700, q: 3, g: 0.5 }); break;
      case 'pump': N({ dur: 0.09, type: 'bandpass', f: 900, q: 2, g: 0.6 }); N({ dur: 0.09, type: 'bandpass', f: 1500, q: 2, g: 0.6, delay: 0.14 }); break;
      case 'switch': N({ dur: 0.08, type: 'bandpass', f: 1300, q: 2, g: 0.35 }); N({ dur: 0.05, type: 'bandpass', f: 2600, q: 3, g: 0.25, delay: 0.1 }); break;
      case 'hit': N({ dur: 0.018, type: 'bandpass', f: 5200, q: 4, g: 0.42 }); T({ type: 'triangle', f: 2900, f2: 2500, dur: 0.045, g: 0.13 }); T({ type: 'sine', f: 1450, dur: 0.03, g: 0.06 }); break; // crisp 'tick'
      case 'head': T({ type: 'sine', f: 2600, dur: 0.2, g: 0.3 }); N({ dur: 0.04, type: 'bandpass', f: 5000, q: 6, g: 0.5 }); break;
      case 'kill': N({ dur: 0.02, type: 'bandpass', f: 4600, q: 3, g: 0.5 }); T({ type: 'triangle', f: 2300, f2: 2000, dur: 0.06, g: 0.12 }); T({ type: 'sine', f: 180, f2: 70, dur: 0.16, g: 0.5 }); N({ dur: 0.12, type: 'lowpass', f: 900, f2: 200, g: 0.35, delay: 0.005 }); break; // tick + body thump
      case 'glass': { N({ dur: 0.07, type: 'highpass', f: 2400, q: 0.6, g: 0.9 }); N({ dur: 0.25, type: 'bandpass', f: 5200, q: 1.2, g: 0.45, delay: 0.02 }); // smash, then falling shards tinkling
        for (let i = 0; i < 9; i++) T({ type: 'sine', f: rand(2800, 7200), dur: rand(0.04, 0.12), g: rand(0.03, 0.08), delay: 0.05 + i * rand(0.03, 0.07) }); N({ dur: 0.12, type: 'bandpass', f: 3800, q: 2, g: 0.25, delay: rand(0.35, 0.5) }); break; }
      case 'board': N({ dur: 0.09, type: 'bandpass', f: 900, q: 1.2, g: 0.8 }); T({ type: 'triangle', f: 190, f2: 90, dur: 0.12, g: 0.35 }); N({ dur: 0.05, type: 'bandpass', f: 2400, q: 2, g: 0.35, delay: 0.04 }); break;
      // CoD-style hit markers: dry, crisp tick you can feel through a firefight
      case 'hm': case 'hmhead': case 'hmkill': this.hmPlay(n, dest); break;
      case 'hmstun': N({ dur: 0.02, type: 'highpass', f: 2200, q: 0.7, g: 0.4 }); T({ type: 'sine', f: 2100, f2: 2400, dur: 0.09, g: 0.1 }); break;
      case 'hurt': N({ dur: 0.2, f: 700, f2: 150, g: 0.7 }); T({ f: 90, f2: 45, dur: 0.18, g: 0.55 }); break;
      case 'step': N({ dur: 0.08, f: rand(450, 750), f2: 140, g: 0.2 }); N({ dur: 0.03, type: 'highpass', f: 3000, g: 0.03, delay: 0.01 }); break;
      case 'land': N({ dur: 0.16, f: 500, f2: 90, g: 0.5 }); break;
      case 'imp_concrete': case 'imp_stone': N({ dur: 0.04, type: 'bandpass', f: rand(1800, 2600), q: 1.5, g: 0.5 }); N({ dur: 0.08, f: 900, f2: 300, g: 0.25, delay: 0.01 }); break;
      case 'imp_metal': N({ dur: 0.02, type: 'highpass', f: 4000, g: 0.4 }); T({ type: 'triangle', f: rand(1800, 2800), dur: 0.18, g: 0.08 }); T({ f: rand(3500, 4500), dur: 0.12, g: 0.04 }); break;
      case 'imp_wood': T({ f: rand(220, 320), f2: 140, dur: 0.07, g: 0.35 }); N({ dur: 0.05, type: 'bandpass', f: 1100, q: 2, g: 0.35 }); break;
      case 'imp_grass': case 'imp_dirt': case 'imp_sand': N({ dur: 0.07, f: 700, f2: 200, g: 0.35 }); N({ dur: 0.04, type: 'bandpass', f: 2600, q: 1.2, g: 0.12 }); break;
      case 'imp_water': N({ dur: 0.15, type: 'bandpass', f: 1400, f2: 500, q: 1.3, g: 0.4 }); break;
      case 'ric': T({ type: 'sine', f: rand(2400, 3400), f2: rand(900, 1400), dur: rand(0.25, 0.4), g: 0.12, a: 0.005 }); break;
      case 'fallhurt': N({ dur: 0.12, f: 400, f2: 80, g: 0.9 }); N({ dur: 0.05, type: 'bandpass', f: 1600, q: 2, g: 0.6, delay: 0.02 }); T({ type: 'sawtooth', f: 180, f2: 110, dur: 0.28, g: 0.12, delay: 0.05, a: 0.02 }); T({ f: 70, f2: 40, dur: 0.3, g: 0.6 }); break;
      case 'cd': T({ type: 'square', f: 660, dur: 0.12, g: 0.12 }); T({ type: 'sine', f: 110, f2: 70, dur: 0.25, g: 0.35 }); break;
      case 'go': T({ type: 'square', f: 990, dur: 0.35, g: 0.12 }); T({ type: 'sawtooth', f: 220, dur: 0.6, g: 0.12, a: 0.02 }); T({ type: 'sawtooth', f: 330, dur: 0.6, g: 0.1, a: 0.02 }); N({ dur: 0.5, f: 2000, f2: 200, g: 0.4 }); break;
      case 'pin': N({ dur: 0.05, type: 'bandpass', f: 3800, q: 6, g: 0.45 }); T({ type: 'triangle', f: 2400, f2: 1800, dur: 0.08, g: 0.08, delay: 0.03 }); N({ dur: 0.04, type: 'bandpass', f: 2600, q: 5, g: 0.3, delay: 0.12 }); break;
      case 'tick': N({ dur: 0.015, type: 'bandpass', f: 3000, q: 8, g: 0.12 }); break;
      case 'jump': N({ dur: 0.08, f: 900, f2: 300, g: 0.12 }); break;
      case 'slide': N({ dur: 0.6, type: 'bandpass', f: 900, f2: 300, q: 0.8, g: 0.28, a: 0.05 }); break;
      case 'pad': T({ type: 'sine', f: 200, f2: 1200, dur: 0.35, g: 0.35 }); N({ dur: 0.4, type: 'bandpass', f: 600, f2: 3000, g: 0.25 }); break;
      case 'explode': return this.boom(o.dist || 0, o.pan || 0, o.vol || 1);
      case 'pickup': T({ type: 'triangle', f: 660, dur: 0.08, g: 0.3 }); T({ type: 'triangle', f: 990, dur: 0.12, g: 0.3, delay: 0.08 }); break;
      case 'wave': T({ type: 'sawtooth', f: 110, dur: 0.9, g: 0.22, a: 0.05 }); T({ type: 'sawtooth', f: 165, dur: 0.9, g: 0.16, a: 0.05 }); N({ dur: 1.2, f: 400, f2: 60, g: 0.5 }); break;
      case 'clear': [523, 659, 784, 1046].forEach((f, i) => T({ type: 'triangle', f, dur: 0.25, g: 0.22, delay: i * 0.09 })); break;
      case 'whiz': N({ dur: 0.02, type: 'highpass', f: 5000, g: 0.6 }); N({ dur: 0.16, type: 'bandpass', f: 4200, f2: 1300, q: 5, g: 0.4, a: 0.03 }); break;
      case 'throw': N({ dur: 0.15, type: 'bandpass', f: 600, f2: 1500, g: 0.25 }); break;
      case 'bounce': T({ type: 'triangle', f: 900, f2: 600, dur: 0.06, g: 0.15 }); break;
      case 'spawn': T({ type: 'sine', f: 1500, f2: 300, dur: 0.4, g: 0.12 }); break;
      case 'low': T({ type: 'square', f: 2600, dur: 0.025, g: 0.05 }); break;
      case 'swing': N({ dur: 0.18, type: 'bandpass', f: 900, f2: 2600, q: 1.2, g: 0.45, a: 0.04 }); break;
      case 'stab': T({ type: 'sine', f: 125, f2: 45, dur: 0.15, g: 0.75 }); N({ dur: 0.07, type: 'bandpass', f: 720, q: 1.3, g: 0.95 }); N({ dur: 0.06, type: 'lowpass', f: 420, g: 0.7, delay: 0.012 }); N({ dur: 0.035, type: 'bandpass', f: 3300, q: 3, g: 0.28, delay: 0.025 }); break; // thud + wet impact + blade scrape
      case 'levelup': { const nt = [523.25, 659.25, 783.99, 1046.5, 1318.5]; nt.forEach((f, i) => { T({ type: 'triangle', f, dur: 0.5, g: 0.16, delay: i * 0.075 }); T({ type: 'sine', f: f * 2, dur: 0.35, g: 0.04, delay: i * 0.075 }); });
        T({ type: 'sine', f: 1046.5, dur: 1.2, g: 0.08, delay: 0.38 }); T({ type: 'sine', f: 1568, dur: 1.0, g: 0.05, delay: 0.42 }); N({ dur: 0.6, type: 'highpass', f: 7000, g: 0.05, delay: 0.3 }); break; } // rising chime + shimmer
      case 'kslash': N({ dur: 0.13, type: 'bandpass', f: 650, f2: 4200, q: 1.7, g: 0.6, a: 0.015 }); N({ dur: 0.07, type: 'highpass', f: 5200, g: 0.14, delay: 0.03 }); break; // sharp swish
      case 'kwall': T({ type: 'sine', f: 2650, dur: 0.14, g: 0.16 }); T({ type: 'sine', f: 3960, dur: 0.08, g: 0.08 }); N({ dur: 0.03, type: 'highpass', f: 3000, g: 0.45 }); N({ dur: 0.05, type: 'bandpass', f: 900, q: 1, g: 0.3 }); break;
      case 'clang': T({ type: 'triangle', f: 1800, dur: 0.25, g: 0.2 }); N({ dur: 0.05, type: 'highpass', f: 4000, g: 0.3 }); break;
      case 'howl': T({ type: 'sawtooth', f: 300, f2: 620, dur: 0.5, g: 0.15, a: 0.1 }); T({ type: 'sawtooth', f: 620, f2: 380, dur: 0.9, g: 0.12, delay: 0.45, a: 0.05 }); break;
      case 'brew': T({ type: 'sine', f: 300, f2: 900, dur: 0.4, g: 0.25 }); for (let i = 0; i < 5; i++) T({ type: 'sine', f: rand(400, 900), f2: rand(900, 1400), dur: 0.08, g: 0.1, delay: 0.1 + i * 0.07 }); break;
    }
  },
};
function spatial(p) {
  const dx = p.x - camera.position.x, dy = p.y - camera.position.y, dz = p.z - camera.position.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  return { vol: 1 / (1 + d * 0.07), pan: clamp((dx * rx + dz * rz) / d, -1, 1) * 0.8, dist: d, pos: { x: p.x, y: p.y, z: p.z } };
}
// spoken callouts (bots): short, throttled, volume by distance
const callout = (() => { let last = 0; const L = { contact: ['Contact!', 'Enemy spotted!', 'Contact front!', 'Got eyes on one!'], reload: ['Reloading!', 'Changing mags!', 'Cover me, reloading!'], nade: ['Frag out!', 'Grenade out!'],
  kill: ['Got one!', 'Tango down!', 'Enemy down!'], hurt: ["I'm hit!", 'Taking fire!', "I'm hit, I'm hit!"], nadeWarn: ['Grenade!', 'Frag, move!'] };
  return (kind, pos, pitch) => { try { if (settings.voices !== true || !window.speechSynthesis || !sfx.ok()) return; const now = performance.now(); if (now - last < 2600) return;
    const d = pos ? Math.hypot(pos.x - camera.position.x, pos.z - camera.position.z) : 0; if (d > 32) return; last = now;
    const u = new SpeechSynthesisUtterance(pick(L[kind] || [kind])); u.rate = rand(1.1, 1.3); u.pitch = clamp((pitch || 120) / 120 * rand(0.85, 1.05), 0.5, 1.6); u.volume = clamp(0.85 - d / 40, 0.1, 0.85) * (settings.sfxVol === undefined ? 1 : settings.sfxVol);
    const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); if (vs.length) u.voice = vs[Math.floor(((pitch || 120) * 7.3) % vs.length)]; speechSynthesis.speak(u); } catch (e) {} }; })();
// distant battle (only while a match is running)
const ambience = { t: 2,
  far(dist) { const a = Math.random() * 6.28, c = camera.position; return { x: c.x + Math.sin(a) * dist, y: c.y + rand(5, 40), z: c.z + Math.cos(a) * dist, a }; },
  update(dt) {
    if (!sfx.ok() || settings.ambience === false) return;
    if (!this.wind) this.startWind();
    this.t -= dt; if (this.t > 0) return; this.t = rand(1.2, 5); const r = Math.random();
    if (r < 0.5) { const id = pick(['rifle', 'ak', 'lmg', 'smg', 'battle', 'rifle', 'lmg']), n = randi(3, 12), dist = rand(120, 320), P = this.far(dist), gap = id === 'lmg' ? 0.075 : id === 'smg' ? 0.065 : rand(0.09, 0.22);
      for (let i = 0; i < n; i++) setTimeout(() => sfx.gun(id, { dist, pos: P, vol: 0.34 }), i * gap * 1000 * rand(0.85, 1.15)); }
    else if (r < 0.7) { const dist = rand(250, 600), P = this.far(dist), k = randi(1, 4); for (let i = 0; i < k; i++) setTimeout(() => sfx.boom(dist, 0, 0.7, P), i * rand(500, 1400)); } // artillery salvo
    else if (r < 0.8) { const dist = rand(150, 320), P = this.far(dist); for (let i = 0; i < 3; i++) setTimeout(() => sfx.gun('sniper', { dist, pos: P, vol: 0.45 }), i * rand(1200, 2400)); }
    else if (r < 0.9) this.flyby(true); else this.flyby(false);
  },
  startWind() { // soft, slowly breathing wind bed under the battle (stops with the match)
    const c = sfx.ctx, n = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), W = SAMPLES.amb_wind; n.buffer = W ? W[0] : sfx.nb; n.loop = true;
    if (W) { g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.35, c.currentTime + 3); n.connect(g); g.connect(sfx.sfxBus); n.start(); this.wind = { n, lfo: { stop() {} }, g }; return; }
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.5; lfo.frequency.value = 0.07; lg.gain.value = 220; lfo.connect(lg); lg.connect(lp.frequency);
    g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(0.07, c.currentTime + 3); n.connect(lp); lp.connect(g); g.connect(sfx.sfxBus); n.start(); lfo.start(); this.wind = { n, lfo, g };
  },
  stopWind() { const w = this.wind; if (!w) return; this.wind = null; try { const c = sfx.ctx; w.g.gain.setValueAtTime(w.g.gain.value, c.currentTime); w.g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1); w.n.stop(c.currentTime + 1.1); w.lfo.stop(c.currentTime + 1.1); } catch (e) {} },
  flyby(jet) { // a moving 3D source: the panner glides across the sky
    const c = sfx.ctx, t = c.currentTime, dur = jet ? 5 : 9, a = Math.random() * 6.28, cam = camera.position, R = jet ? 500 : 260, h = jet ? 120 : 45;
    const p = c.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1; p.rolloffFactor = 0;
    const set = (prm, v0, v1) => { prm.setValueAtTime(v0, t); prm.linearRampToValueAtTime(v1, t + dur); };
    if (p.positionX) { set(p.positionX, cam.x + Math.cos(a) * R, cam.x - Math.cos(a) * R); set(p.positionY, cam.y + h, cam.y + h); set(p.positionZ, cam.z + Math.sin(a) * R, cam.z - Math.sin(a) * R); }
    const g = c.createGain(), f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = jet ? 0.7 : 1.5; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(jet ? 0.5 : 0.28, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.frequency.setValueAtTime(jet ? 1800 : 260, t); f.frequency.exponentialRampToValueAtTime(jet ? 500 : 200, t + dur); // Doppler-ish fall
    const n = c.createBufferSource(); n.buffer = sfx.nb; n.loop = true; n.connect(f);
    if (!jet) { const am = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 17; lg.gain.value = 0.5; am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain); f.connect(am); am.connect(g); lfo.start(t); lfo.stop(t + dur + 0.1); } else f.connect(g); // rotor chop
    g.connect(p); p.connect(sfx.sfxBus); n.start(t); n.stop(t + dur + 0.1);
  },
};

