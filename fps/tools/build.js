#!/usr/bin/env node
// Builds fps/game.js from the section files in fps/src (listed, in order, in src/ORDER).
// The game still runs as ONE script in one shared scope (the IIFE opens in 00-core.js and closes in 41-boot.js),
// so splitting the source changes nothing at runtime; this is plain concatenation, no transpiling, no bundler.
//   node fps/tools/build.js          rebuild game.js
//   node fps/tools/build.js --check  exit 1 if game.js is out of date with src/ (use before committing)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = path.join(root, 'src'), out = path.join(root, 'game.js');
const order = fs.readFileSync(path.join(src, 'ORDER'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const missing = order.filter(f => !fs.existsSync(path.join(src, f)));
if (missing.length) { console.error('missing section files: ' + missing.join(', ')); process.exit(1); }
const extra = fs.readdirSync(src).filter(f => f.endsWith('.js') && !order.includes(f));
if (extra.length) { console.error('section files not listed in src/ORDER: ' + extra.join(', ')); process.exit(1); }
const code = order.map(f => fs.readFileSync(path.join(src, f), 'utf8')).join('');
try { new Function(code); } catch (e) { console.error('syntax error in the built game.js: ' + e.message); process.exit(1); }
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (cur !== code) { console.error('game.js is out of date: run  node fps/tools/build.js'); process.exit(1); }
  console.log('game.js is up to date (' + order.length + ' sections)'); process.exit(0);
}
fs.writeFileSync(out, code); console.log('built game.js from ' + order.length + ' sections, ' + code.length + ' bytes');
