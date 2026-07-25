// 파일명: effectRegistry.js

export const ProjectileRegistry = new Map();
export const ShockwaveRegistry = new Map();
export const VisualFXRegistry = new Map();

export function registerProjectile(type, renderFn) { ProjectileRegistry.set(type, renderFn); }
export function registerShockwave(type, renderFn) { ShockwaveRegistry.set(type, renderFn); }
export function registerVisualFX(type, renderFn) { VisualFXRegistry.set(type, renderFn); }

export function getProjectileRenderer(type) { return ProjectileRegistry.get(type) || ProjectileRegistry.get('default'); }
export function getShockwaveRenderer(type) { return ShockwaveRegistry.get(type) || ShockwaveRegistry.get('default'); }
export function getVisualFXRenderer(type) { return VisualFXRegistry.get(type); }
