// Loads optional 3D assets (glTF). If this fails (e.g. opened from file://), the game uses procedural models.
import { GLTFLoader } from './GLTFLoader.js';
import * as SkeletonUtils from './SkeletonUtils.js';
window.BP_SkeletonUtils = SkeletonUtils;
new GLTFLoader().load('models/soldier.glb', gltf => {
  window.BP_ASSETS = { soldier: gltf };
  window.dispatchEvent(new Event('bp-assets'));
}, undefined, err => console.warn('Character model failed to load; using fallback models.', err));
