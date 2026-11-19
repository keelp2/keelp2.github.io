// ============================================================ PLAYER
const player = {
  pos: new V3(), vel: new V3(), r: 0.33, h: 1.75, onGround: false, ground: null, stepSmooth: 0, yaw: 0, pitch: 0,
  crouch: 0, sliding: false, slideT: 0, slideCD: 0, coyote: 0, jumpBuf: 0, hp: 100, regenCap: 100, lastDmgT: 99, alive: true,
  grenades: 2, gcd: 0, stepAcc: 0, bob: 0, landKick: 0, tilt: 0, sprinting: false, sprintLock: 0, crouchKeyPrev: false,
  maxHp: 100, protT: 0, abilityCD: 0, stimT: 0, shield: 0, shieldT: 0, pulseT: 0,
};
function playerHead(out) { return out.set(player.pos.x, player.pos.y + player.h - 0.12, player.pos.z); }

