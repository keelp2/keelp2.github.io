// ============================================================ RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: GFX === 'medium' && !/aa=0/.test(location.search), powerPreference: 'high-performance', stencil: false });
renderer.autoClear = false;
renderer.shadowMap.type = HQ ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
if (GFX !== 'low') { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = HQ ? 1.05 : 1.15; }
// materials: physically based (metal/roughness, normal maps, sky reflections) on High/Ultra, cheap Lambert/Phong below
function MAT(p = {}) {
  p = Object.assign({}, p);
  if (HQ) { if (p.roughness === undefined) p.roughness = 0.82; if (p.metalness === undefined) p.metalness = 0; return new THREE.MeshStandardMaterial(p); }
  for (const k of ['roughness', 'metalness', 'envMapIntensity', 'roughnessMap', 'metalnessMap']) delete p[k];
  if (GFX === 'low') { delete p.normalMap; delete p.normalScale; }
  return new THREE.MeshLambertMaterial(p);
}
function PHONG(p = {}) {
  if (!HQ) return new THREE.MeshPhongMaterial(p);
  const q = Object.assign({}, p), sp = new THREE.Color(p.specular !== undefined ? p.specular : 0x111111), sh = p.shininess !== undefined ? p.shininess : 30;
  delete q.specular; delete q.shininess; const lum = (sp.r + sp.g + sp.b) / 3;
  q.roughness = clamp(1 - Math.sqrt(sh / 140), 0.18, 0.9); q.metalness = lum > 0.28 ? 0.85 : lum > 0.12 ? 0.35 : 0.05;
  return new THREE.MeshStandardMaterial(q);
}
$('game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(85, 1, 0.05, 600);
camera.rotation.order = 'YXZ';
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(54, 1, 0.045, 10);
vmScene.add(new THREE.HemisphereLight(0xdde6ff, 0x3a3530, 1.5));
const vmSun = new THREE.DirectionalLight(0xffffff, 1.8); vmSun.position.set(0.4, 1, 0.5); vmScene.add(vmSun);
let shadowsOn = false;
let dynScale = 1, dynAcc = 0, dynN = 0;
let composer = null, postFailed = false;
function setupPost() {
  if (!HQ || composer || postFailed || !window.BP_POST) return; const P = window.BP_POST;
  try {
    const c = new P.EffectComposer(renderer); c.setPixelRatio(renderer.getPixelRatio()); c.setSize(innerWidth, innerHeight);
    c.addPass(new P.RenderPass(scene, camera));
    if (ULTRA) { const ao = new P.GTAOPass(scene, camera, innerWidth, innerHeight); ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 16 }); ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 }); ao.blendIntensity = 0.9; c.addPass(ao); }
    c.addPass(new P.UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), ULTRA ? 0.32 : 0.22, 0.45, 0.88));
    c.addPass(new P.OutputPass());
    c.addPass(new P.SMAAPass(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio()));
    composer = c;
  } catch (e) { console.warn('post-processing unavailable', e); postFailed = true; composer = null; }
}
addEventListener('bp-post', () => setupPost());
let menuRes = false, dynUp = 0;
function resize() {
  renderer.setPixelRatio(QUALITY[settings.quality].pr() * dynScale * (menuRes ? 0.6 : 1)); // the menu's backdrop sits behind dimmed panels: render it lighter
  renderer.setSize(innerWidth, innerHeight);
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
  camera.aspect = vmCam.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
}
addEventListener('resize', resize);

