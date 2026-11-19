/* CALL OF DOODIE (formerly Breachpoint) — a lightweight FPS. Pure Three.js + WebAudio.
   GENERATED FILE — do not edit game.js directly. Edit the section files in fps/src/ and run:  node fps/tools/build.js */
(() => {
'use strict';
const V3 = THREE.Vector3;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const pick = a => a[Math.floor(Math.random() * a.length)];
const $ = id => document.getElementById(id);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

