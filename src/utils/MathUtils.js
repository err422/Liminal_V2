import * as THREE from 'three';

export const MathUtils = {
  clamp:   (v, min, max) => Math.max(min, Math.min(max, v)),
  lerp:    (a, b, t)     => a + (b - a) * t,
  damp:    (a, b, lambda, dt) => MathUtils.lerp(a, b, 1 - Math.exp(-lambda * dt)),
  remap:   (v, inMin, inMax, outMin, outMax) => outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin),
  randomRange: (min, max) => Math.random() * (max - min) + min,
  randomInt:   (min, max) => Math.floor(MathUtils.randomRange(min, max + 1)),
  degToRad: (deg) => deg * (Math.PI / 180),
  radToDeg: (rad) => rad * (180 / Math.PI),
  vec3Distance: (a, b) => a.distanceTo(b),
  flatDistance: (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2),
};
