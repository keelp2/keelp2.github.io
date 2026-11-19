// Loads optional 3D assets (glTF). If this fails (e.g. opened from file://), the game uses procedural models.
import { GLTFLoader } from './GLTFLoader.js';
import * as SkeletonUtils from './SkeletonUtils.js';
window.BP_SkeletonUtils = SkeletonUtils;
const loader = new GLTFLoader();
loader.load('models/soldier.glb', gltf => {
  window.BP_ASSETS = { soldier: gltf };
  window.dispatchEvent(new Event('bp-assets'));
  loadTroops();
}, undefined, err => { console.warn('Character model failed to load; using fallback models.', err); loadTroops(); });
// realistic soldiers (CC0 MakeHuman, built with ara3d): both factions, loaded one after another in the background
function loadTroops() {
  const ids = ['c1', 'g1', 'c2', 'g2', 'c3', 'g3', 'c4', 'g4']; window.BP_TROOPS = {};
  const next = i => { if (i >= ids.length) { window.dispatchEvent(new Event('bp-troops')); return; }
    loader.load('models/troops/' + ids[i] + '.glb?v=1', g => { window.BP_TROOPS[ids[i]] = g; next(i + 1); }, undefined, e => { console.warn('troop model failed', ids[i], e); next(i + 1); }); };
  next(0);
}
