// ============================================================ SETTINGS
const settings = { xhair: 'cross', xcolor: '#ffffff', invertY: false, adsToggle: false, view: 'first', sens: 1, fov: 85, quality: 'medium', difficulty: 'normal', map: 0, volume: 0.6, primary: 'rifle', secondary: 'pistol', cls: 'assault', music: 0.5, ambience: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem('breachpoint') || '{}')); } catch (e) {}
const saveSettings = () => { try { localStorage.setItem('breachpoint', JSON.stringify(settings)); } catch (e) {} };
const QUALITY = { // graphics tiers: each player picks their own (auto-detected the first time)
  medium: { pr: () => Math.min(window.devicePixelRatio || 1, 1) * 0.9, shadows: true, sm: 1024, ext: 38 },
  high: { pr: () => Math.min(window.devicePixelRatio || 1, 1.5), shadows: true, sm: 2048, ext: 48 },
  ultra: { pr: () => Math.min(window.devicePixelRatio || 1, 2), shadows: true, sm: 4096, ext: 60 },
};
function detectGfx() {
  try { const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return 'medium';
    const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    if (/nvidia|geforce|rtx|gtx|quadro|radeon\s*(rx|pro|vii)|arc\s*a\d|apple m\d/i.test(r)) return 'high';
    return 'medium'; } catch (e) { return 'medium'; }
}
if (settings.aimAssist === true || settings.aimAssist === undefined) settings.aimAssist = 'standard'; else if (settings.aimAssist === false) settings.aimAssist = 'off';
if (settings.qv !== 2) { settings.quality = detectGfx(); settings.qv = 2; saveSettings(); }
if (!QUALITY[settings.quality]) settings.quality = 'medium'; // 'low' was removed: weak machines get Medium + dynamic resolution
const GFX = settings.quality, HQ = GFX === 'high' || GFX === 'ultra', ULTRA = GFX === 'ultra';
const DIFF = {
  easy: { dmg: 0.55, acc: 0.75, react: 1.45, hp: 0.85 },
  normal: { dmg: 1, acc: 1, react: 1, hp: 1 },
  hard: { dmg: 1.35, acc: 1.15, react: 0.7, hp: 1.15 },
};

