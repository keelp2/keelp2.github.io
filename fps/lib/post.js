// Optional post-processing for the High / Ultra graphics settings (ambient occlusion, bloom, anti-aliasing).
import { EffectComposer } from './postprocessing/EffectComposer.js';
import { RenderPass } from './postprocessing/RenderPass.js';
import { OutputPass } from './postprocessing/OutputPass.js';
import { UnrealBloomPass } from './postprocessing/UnrealBloomPass.js';
import { GTAOPass } from './postprocessing/GTAOPass.js';
import { SMAAPass } from './postprocessing/SMAAPass.js';
window.BP_POST = { EffectComposer, RenderPass, OutputPass, UnrealBloomPass, GTAOPass, SMAAPass };
window.dispatchEvent(new Event('bp-post'));
