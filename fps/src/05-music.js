// ============================================================ MUSIC — tiny sequencer with silly instruments
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz
const INSTR = {
  pad(dest, t, f, d, v) { const c = sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4; lp.connect(g); g.connect(dest);
    const a = Math.min(1.4, d * 0.35); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.09, t + a); g.gain.setValueAtTime(v * 0.09, t + d - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.8);
    for (const det of [-8, 8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + 0.9); } }, /* two voices, not three: thick pads were the main cause of overload */
  strings(dest, t, f, d, v) { const c = sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.11, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.95);
    for (const det of [-6, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d); } },
  sub(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.32, t + 0.08); g.gain.setValueAtTime(v * 0.3, t + d * 0.85); g.gain.linearRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05); },
  tom(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.35); g.gain.setValueAtTime(v * 0.75, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.75);
    const n = c.createBufferSource(), lp = c.createBiquadFilter(), ng = c.createGain(); n.buffer = sfx.nb; lp.type = 'lowpass'; lp.frequency.value = 600; ng.gain.setValueAtTime(v * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); n.connect(lp); lp.connect(ng); ng.connect(dest); n.start(t, Math.random()); n.stop(t + 0.2); },
  hat(dest, t, f, d, v) { const c = sfx.ctx, n = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(); n.buffer = sfx.nb; hp.type = 'highpass'; hp.frequency.value = 7500; g.gain.setValueAtTime(v * 0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); n.connect(hp); hp.connect(g); g.connect(dest); n.start(t, Math.random()); n.stop(t + 0.06); },
  horn(dest, t, f, d, v) { const c = sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1400, t + 0.25); lp.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.16, t + 0.18); g.gain.setValueAtTime(v * 0.15, t + d * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.3);
    for (const det of [-4, 4]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + 0.35); } },
  tuba(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.04);
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 2; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.55, t + 0.025); g.gain.exponentialRampToValueAtTime(v * 0.25, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(lp); lp.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05); },
  kazoo(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), o2 = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); o2.frequency.setValueAtTime(f * 1.003, t);
    lfo.frequency.value = 6.5; lg.gain.value = f * 0.018; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.6; const m = c.createGain(); m.gain.value = 0.5; o.connect(bp); o2.connect(m); m.connect(bp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.5, t + 0.03); g.gain.setValueAtTime(v * 0.45, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    bp.connect(g); g.connect(dest); for (const x of [o, o2, lfo]) { x.start(t); x.stop(t + d + 0.05); } },
  accordion(dest, t, f, d, v) { const c = sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.18, t + 0.02); g.gain.setValueAtTime(v * 0.16, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    for (const det of [-7, 7]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + 0.05); } },
  bell(dest, t, f, d, v) { const c = sfx.ctx; for (const [m, a] of [[1, 1], [2.76, 0.3], [5.4, 0.12]]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f * m; g.gain.setValueAtTime(v * 0.25 * a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 1.5); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d * 1.5 + 0.05); } },
  brass(dest, t, f, d, v) { const c = sfx.ctx, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.linearRampToValueAtTime(2600, t + 0.08); lp.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.3, t + 0.04); g.gain.setValueAtTime(v * 0.26, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    for (const det of [-5, 0, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + 0.05); } },
  trombone(dest, t, f, d, v, bend) { const c = sfx.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); if (bend) o.frequency.linearRampToValueAtTime(f * bend, t + d);
    lfo.frequency.setValueAtTime(5, t); lfo.frequency.linearRampToValueAtTime(7, t + d); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.03, t + d); lfo.connect(lg); lg.connect(o.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 1200; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.5, t + 0.05); g.gain.setValueAtTime(v * 0.45, t + d * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(lp); lp.connect(g); g.connect(dest); o.start(t); lfo.start(t); o.stop(t + d + 0.05); lfo.stop(t + d + 0.05); },
  kick(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(v * 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3); },
  snare(dest, t, f, d, v) { const c = sfx.ctx, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = sfx.nb; bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 0.7;
    g.gain.setValueAtTime(v * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (d || 0.15)); s.connect(bp); bp.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + (d || 0.15) + 0.05); },
  tamb(dest, t, f, d, v) { const c = sfx.ctx, s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(); s.buffer = sfx.nb; hp.type = 'highpass'; hp.frequency.value = 7000;
    g.gain.setValueAtTime(v * 0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); s.connect(hp); hp.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + 0.1); },
  boing(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 4, t + d * 0.5); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + d);
    g.gain.setValueAtTime(v * 0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05); },
};
// ---- rock section: distorted power-chord guitars (root + fifth + octave through an amp/cab model), picked bass, real kit
const _dist = (() => { let cv = null; return () => { if (cv) return cv; cv = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1024 - 1; cv[i] = Math.tanh(x * 6) * 0.9 + Math.tanh(x * 2) * 0.1; } return cv; }; })();
Object.assign(INSTR, {
  gtr(dest, t, f, d, v, mode) { const c = sfx.ctx, mute = mode === 'mute', pre = c.createGain(), ws = c.createWaveShaper(), hp = c.createBiquadFilter(), cab = c.createBiquadFilter(), mid = c.createBiquadFilter(), g = c.createGain();
    pre.gain.value = mute ? 5 : 7; ws.curve = _dist(); ws.oversample = '2x'; hp.type = 'highpass'; hp.frequency.value = 85; cab.type = 'lowpass'; cab.frequency.value = mute ? 1500 : 3600; cab.Q.value = 0.9; mid.type = 'peaking'; mid.frequency.value = 750; mid.gain.value = -4; mid.Q.value = 0.8;
    pre.connect(ws); ws.connect(hp); hp.connect(mid); mid.connect(cab); cab.connect(g); g.connect(dest);
    const len = mute ? Math.min(d, 0.16) : d; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * (mute ? 0.085 : 0.075), t + 0.006); if (mute) g.gain.exponentialRampToValueAtTime(0.0001, t + len); else { g.gain.setValueAtTime(v * 0.07, t + len * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.25); }
    for (const [m, a] of [[1, 1], [1.4983, 0.8], [2, 0.55]]) for (const det of [-7, 7]) { const o = c.createOscillator(), og = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f * m; o.detune.value = det; og.gain.value = a * 0.25; o.connect(og); og.connect(pre); o.start(t); o.stop(t + len + 0.3); } },
  bass(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), s2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; s2.type = 'sine'; s2.frequency.value = f / 2;
    lp.type = 'lowpass'; lp.Q.value = 1.2; lp.frequency.setValueAtTime(1100, t); lp.frequency.exponentialRampToValueAtTime(280, t + Math.min(0.25, d)); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * 0.32, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.95);
    const sg = c.createGain(); sg.gain.value = 0.6; o.connect(lp); s2.connect(sg); sg.connect(lp); lp.connect(g); g.connect(dest); for (const x of [o, s2]) { x.start(t); x.stop(t + d + 0.05); } },
  kick2(dest, t, f, d, v) { const c = sfx.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.09); g.gain.setValueAtTime(v * 0.95, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.35);
    const n = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain(); n.buffer = sfx.nb; bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 1.5; ng.gain.setValueAtTime(v * 0.18, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.012); n.connect(bp); bp.connect(ng); ng.connect(dest); n.start(t, Math.random()); n.stop(t + 0.03); },
  snare2(dest, t, f, d, v) { const c = sfx.ctx, n = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), o = c.createOscillator(), og = c.createGain(); n.buffer = sfx.nb; bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.6;
    g.gain.setValueAtTime(v * 0.55, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19); n.connect(bp); bp.connect(g); g.connect(dest); n.start(t, Math.random()); n.stop(t + 0.22);
    o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.08); og.gain.setValueAtTime(v * 0.4, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(og); og.connect(dest); o.start(t); o.stop(t + 0.12); },
  crash(dest, t, f, d, v) { const c = sfx.ctx, n = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(); n.buffer = sfx.nb; n.loop = true; hp.type = 'bandpass'; hp.frequency.value = 6500; hp.Q.value = 0.5;
    g.gain.setValueAtTime(v * 0.09, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); n.connect(hp); hp.connect(g); g.connect(dest); n.start(t, Math.random()); n.stop(t + 1.9); },
});
// "Call of Doodie" main theme — D minor, 140 bpm, 32 bars: string ostinato intro -> drums + chugging guitars -> brass chorus -> breakdown -> final chorus
function rockTheme() {
  const ev = [], R = { Dm: 38, Bb: 34, C: 36, A: 33, F: 41, Gm: 31 }, P = { Dm: [50, 53, 57], Bb: [46, 50, 53], C: [48, 52, 55], A: [45, 49, 52], F: [41, 45, 48], Gm: [43, 46, 50] };
  const verse = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A'], chorus = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'];
  const bar = (i, ch, part) => { const b = i * 4, r = R[ch], n = P[ch];
    for (const x of n) ev.push([b, 'pad', x, 4, part === 'intro' ? 1 : 0.7]);
    for (let k = 0; k < 16; k++) if (part !== 'chorus' || k % 2 === 0) ev.push([b + k * 0.25, 'strings', [n[0] + 12, n[2] + 12, n[1] + 12, n[2] + 12][k % 4], 0.22, k % 4 === 0 ? 0.9 : 0.55]);
    if (part === 'intro') { for (const o of [0, 1.5, 2, 3, 3.5]) ev.push([b + o, 'tomhz', o === 0 ? 92 : 110, 0.5, i % 4 === 3 ? 1 : 0.7]); if (i % 4 === 3) for (const o of [2, 2.5, 3, 3.25, 3.5, 3.75]) ev.push([b + o, 'snare2', 0, 0.2, 0.4 + o / 8]); return; }
    const half = part === 'break';
    for (let k = 0; k < 8; k++) ev.push([b + k * 0.5, 'hat', 0, 0.1, k % 2 ? 0.22 : 0.42]);
    for (const o of half ? [0, 2.5] : [0, 1.5, 2, 2.75]) ev.push([b + o, 'kick2', 0, 0.3, 1]);
    for (const o of half ? [2] : [1, 3]) ev.push([b + o, 'snare2', 0, 0.2, 1]);
    if (part === 'chorus') { ev.push([b, 'gtr', r, 1.9, 1], [b + 2, 'gtr', r, 1.4, 0.95]); for (const o of [3.5]) ev.push([b + o, 'gtr', r, 0.5, 0.85, 'mute']); }
    else if (half) { for (const o of [0, 0.75, 1, 1.5, 2, 2.75, 3, 3.5]) ev.push([b + o, 'gtr', r, 0.25, o % 1 ? 0.8 : 1, 'mute']); }
    else for (let k = 0; k < 8; k++) ev.push([b + k * 0.5, 'gtr', r, 0.5, k % 2 ? 0.75 : 1, 'mute']);
    for (let k = 0; k < 8; k++) ev.push([b + k * 0.5, 'bass', r - 12 + (k === 7 && !half ? 2 : 0), 0.45, k % 2 ? 0.7 : 1]);
  };
  for (let i = 0; i < 4; i++) bar(i, verse[i * 2 % 8], 'intro');
  for (let i = 4; i < 12; i++) bar(i, verse[i - 4], 'verse');
  for (let i = 12; i < 20; i++) bar(i, chorus[i - 12], 'chorus');
  for (let i = 20; i < 24; i++) bar(i, ['Dm', 'Bb', 'Dm', 'A'][i - 20], 'break');
  for (let i = 24; i < 32; i++) bar(i, chorus[i - 24], 'chorus');
  for (const b of [16, 48, 64, 80, 96, 112]) ev.push([b, 'crash', 0, 2, b === 16 || b === 48 || b === 96 ? 1 : 0.7]);
  const mel = [[0, 62, 3], [3, 65, 1], [4, 69, 4], [8, 67, 2], [10, 65, 2], [12, 64, 3], [15, 62, 1], [16, 62, 4], [20, 58, 2], [22, 62, 2], [24, 61, 6], [30, 57, 2]];
  for (const st of [48, 96]) for (const [o, n, l] of mel) ev.push([st + o, 'brass', n, l, 1], [st + o, 'horn', n - 12, l, 0.7]);
  return { bpm: 140, len: 128, loop: true, ev };
}
function rockSting() { const ev = [];
  for (const o of [0, 0.5, 0.75, 1, 1.5, 1.75, 2, 2.5, 2.75]) ev.push([o, 'tomhz', 80 + o * 14, 0.4, 0.8]);
  ev.push([3, 'crash', 0, 2, 1], [3, 'kick2', 0, 0.3, 1], [3, 'gtr', 38, 3, 1], [3, 'bass', 26, 3, 1], [3, 'brass', 62, 3, 0.9], [3, 'brass', 57, 3, 0.8], [3, 'brass', 50, 3, 0.8]);
  for (const x of [50, 53, 57]) ev.push([3, 'pad', x, 4, 1.2]);
  return { bpm: 120, len: 7, loop: false, ev };
}
function rockWin() { const ev = [];
  [['F', 41, 0], ['C', 36, 2], ['Dm', 38, 4], ['Bb', 34, 6], ['F', 41, 8]].forEach(([ch, r, b]) => { ev.push([b, 'gtr', r, b === 8 ? 4 : 1.9, 1], [b, 'bass', r - 12, b === 8 ? 4 : 1.9, 1], [b, 'kick2', 0, 0.3, 1], [b + 1, 'snare2', 0, 0.2, 0.9]); });
  [[0, 65], [1, 69], [2, 72], [3, 76], [4, 74], [5, 72], [6, 70], [7, 74], [8, 77]].forEach(([b, n]) => ev.push([b, 'brass', n, b === 8 ? 4 : 1, 1.05]));
  ev.push([0, 'crash', 0, 2, 1], [8, 'crash', 0, 2, 1]); for (let k = 0; k < 16; k++) ev.push([k * 0.5, 'hat', 0, 0.1, k % 2 ? 0.5 : 0.9]);
  return { bpm: 112, len: 13, loop: false, ev };
}
// Songs: list of [beat, instrument, midi, lengthInBeats, velocity, extra]
// ---- score: cinematic military themes (synthesised: string pads, ostinato, sub bass, taiko, brass)
const CHORDS = { Dm: [50, 53, 57], Bb: [46, 50, 53], F: [41, 45, 48], C: [48, 52, 55], Gm: [43, 46, 50], A: [45, 49, 52] };
function mainTheme() { // old orchestral theme — D minor, 84 bpm, 16 bars
  const ev = [], prog = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'];
  prog.forEach((ch, i) => { const b = i * 8, n = CHORDS[ch];
    for (const x of n) ev.push([b, 'pad', x, 8, 1]);
    ev.push([b, 'sub', n[0] - 12, 8, 1]);
    for (let k = 0; k < 16; k++) ev.push([b + k * 0.5, 'strings', [n[0] + 12, n[2] + 12, n[1] + 12, n[2] + 12][k % 4], 0.45, k % 4 === 0 ? 1 : 0.7]);
    for (const [o, f, vv] of [[0, 110, 1], [1.5, 82, 0.6], [2, 98, 0.8], [4, 110, 1], [5.5, 82, 0.6], [6, 98, 0.7], [7, 92, 0.6], [7.5, 92, 0.6]]) if (i >= 2 || o === 0 || o === 4) ev.push([b + o, 'tom', 0, 0.5, vv * (i >= 2 ? 1 : 0.6)]);
    if (i >= 4) for (let k = 0; k < 16; k++) ev.push([b + k * 0.5, 'hat', 0, 0.1, k % 2 ? 0.5 : 1]);
  });
  // brass theme over the second half
  [[32, 62, 3], [35, 65, 1], [36, 69, 4], [40, 67, 2], [42, 65, 2], [44, 64, 3], [47, 62, 1], [48, 62, 4], [52, 58, 2], [54, 62, 2], [56, 61, 6], [62, 57, 2]].forEach(([b, n, l]) => { ev.push([b, 'horn', n, l, 1], [b, 'horn', n - 12, l, 0.6]); });
  for (const t of ev) if (t[1] === 'tom') t[2] = 0; // toms use their own pitch
  return { bpm: 84, len: 64, loop: true, ev: ev.map(e => e[1] === 'tom' ? [e[0], 'tomhz', [110, 82, 98, 92][Math.floor(e[4] * 10) % 4], e[3], e[4]] : e) };
}
function deploySting() { const ev = [];
  for (const x of CHORDS.Dm) ev.push([0, 'pad', x, 6, 1.4]); ev.push([0, 'sub', 38, 6, 1.2], [0, 'horn', 50, 3, 1], [0, 'horn', 57, 3, 0.8], [3, 'horn', 53, 3, 1], [3, 'horn', 58, 3, 0.8]);
  for (let k = 0; k < 24; k++) ev.push([k * 0.25, 'strings', k % 2 ? 62 : 69, 0.22, 0.5 + k / 30]);
  for (const b of [0, 1.5, 3, 4, 4.5, 5, 5.5]) ev.push([b, 'tomhz', b < 4 ? 90 : 120, 0.5, 1]);
  return { bpm: 100, len: 7, loop: false, ev };
}
function winTheme() { const ev = [];
  [['F', 0], ['C', 2], ['Dm', 4], ['Bb', 6], ['F', 8]].forEach(([ch, b]) => { const n = CHORDS[ch]; for (const x of n) { ev.push([b, 'horn', x + 12, b === 8 ? 4 : 2, 1], [b, 'pad', x, b === 8 ? 5 : 2, 1]); } ev.push([b, 'sub', n[0] - 12, 2, 1], [b, 'tomhz', 0, 0.5, 1]); ev[ev.length - 1][2] = 100; });
  [[0, 65], [1, 69], [2, 72], [3, 76], [4, 74], [5, 72], [6, 70], [7, 74], [8, 77]].forEach(([b, n]) => ev.push([b, 'horn', n, b === 8 ? 4 : 1, 1.1]));
  for (let k = 0; k < 8; k++) ev.push([k, 'hat', 0, 0.1, 1]);
  return { bpm: 92, len: 13, loop: false, ev };
}
function loseTheme() { const ev = [];
  [['Dm', 0], ['Bb', 3], ['Gm', 6], ['A', 9]].forEach(([ch, b]) => { for (const x of CHORDS[ch]) ev.push([b, 'pad', x, 3, 1]); ev.push([b, 'sub', CHORDS[ch][0] - 12, 3, 0.9]); });
  [[0, 62], [3, 58], [6, 55], [9, 57]].forEach(([b, n]) => ev.push([b, 'horn', n, 2.6, 0.7]));
  ev.push([0, 'tomhz', 70, 1, 0.8], [6, 'tomhz', 70, 1, 0.6], [12, 'bell', 74, 3, 0.35]);
  return { bpm: 70, len: 15, loop: false, ev };
}
const SONGS = { title: rockTheme, start: rockSting, win: rockWin, lose: loseTheme, orchestral: mainTheme };
// Your own music: drop MP3s at these paths and they replace the generated score (missing files fall back to it).
const MUSIC_FILES = { title: 'audio/music/menu.mp3', start: 'audio/music/deploy.mp3', win: 'audio/music/victory.mp3', lose: 'audio/music/defeat.mp3' };
const MUSIC_OK = {};
for (const [k, u] of Object.entries(MUSIC_FILES)) { try { fetch(u + '?v=1', { method: 'HEAD' }).then(r => { MUSIC_OK[k] = r.ok && /audio|mpeg|octet/.test(r.headers.get('content-type') || 'audio'); if (MUSIC_OK[k] && k === 'title' && music.name === 'title' && !music.file) { music.name = ''; music.play('title'); } }).catch(() => {}); } catch (e) {} }
const music = {
  cur: null, name: '', file: null,
  playFile(name) { const c = sfx.ctx, el = new Audio(MUSIC_FILES[name] + '?v=1'); el.crossOrigin = 'anonymous'; el.loop = name === 'title'; el.preload = 'auto';
    const src = c.createMediaElementSource(el), g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(name === 'title' ? 0.8 : 0.95, c.currentTime + 0.6); src.connect(g); g.connect(sfx.musicBus);
    el.play().catch(() => {}); this.file = { el, g }; this.name = name; if (!el.loop) el.onended = () => { if (this.file && this.file.el === el) { this.file = null; this.name = ''; } }; },
  play(name) {
    if (name === 'title' && (game.state === 'play' || game.state === 'potg')) return; /* never during a match */
    if (!sfx.ok()) { this.pending = name; return; }
    if (MUSIC_OK[name]) { if (this.name === name && this.file && this.file.el.loop) return; this.stop(); this.playFile(name); return; }
    if (this.name === name && this.cur && SONGS[name]().loop) return;
    this.stop(); const song = SONGS[name](), c = sfx.ctx, out = c.createGain(); out.gain.value = name === 'title' ? 0.75 : 0.9; out.connect(sfx.musicBus);
    const spb = 60 / song.bpm, ev = song.ev.slice().sort((a, b) => a[0] - b[0]);
    const st = { out, t0: c.currentTime + 0.08, i: 0, loopN: 0, timer: 0 };
    const tick = () => {
      const horizon = c.currentTime + 1.2; /* schedule well ahead: a render hitch on the main thread can no longer starve the music */
      for (;;) {
        if (st.i >= ev.length) { if (!song.loop) return; st.i = 0; st.loopN++; }
        const e = ev[st.i], at = st.t0 + (e[0] + st.loopN * song.len) * spb; if (at > horizon) break;
        if (at > c.currentTime - 0.12) INSTR[e[1] === 'tomhz' ? 'tom' : e[1]](out, Math.max(at, c.currentTime), e[1] === 'boing' || e[1] === 'tomhz' ? e[2] : NOTE(e[2]), e[3] * spb, e[4], e[5]);
        st.i++;
      }
    };
    tick(); st.timer = setInterval(tick, 120);
    this.cur = st; this.name = name;
    if (!song.loop) setTimeout(() => { if (this.cur === st && name !== 'title') { this.cur = null; this.name = ''; } }, (song.len * spb + 1) * 1000);
  },
  stop() { if (this.file) { const f = this.file, c = sfx.ctx; this.file = null; this.name = ''; f.g.gain.setValueAtTime(f.g.gain.value, c.currentTime); f.g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.5); setTimeout(() => { f.el.pause(); f.el.src = ''; }, 600); }
    if (!this.cur) return; clearInterval(this.cur.timer); const g = this.cur.out.gain, c = sfx.ctx; g.setValueAtTime(g.value, c.currentTime); g.linearRampToValueAtTime(0.0001, c.currentTime + 0.4); const o = this.cur.out; setTimeout(() => o.disconnect(), 600); this.cur = null; this.name = ''; },
};

