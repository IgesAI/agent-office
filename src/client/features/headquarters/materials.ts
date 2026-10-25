import * as THREE from 'three';

// Owned by the office, shared by both desks for its lifetime. Never mutate the toon cache.
const materials = new Map<string, THREE.Material>();
const finishes: Record<string, [string, number, number]> = {
  Walnut: ['#654936', .66, 0], Edge: ['#392e27', .78, 0], Graphite: ['#303a39', .48, .35],
  Bronze: ['#9c8563', .4, .65], Fabric: ['#527a70', .95, 0], Piping: ['#324e48', .92, 0],
  Porcelain: ['#e3ded1', .44, 0], Rubber: ['#202726', .96, 0], Light: ['#ffe6b5', .6, 0],
};

export function finish(name: string): THREE.Material {
  const existing = materials.get(name);
  if (existing) return existing;
  const [color, roughness, metalness] = finishes[name] ?? ['#141b1d', .8, 0];
  const material = new THREE.MeshStandardMaterial({ name: `headquarters-${name}`, color, roughness, metalness });
  if (name === 'Light') { material.emissive.set('#ffe6b5'); material.emissiveIntensity = .35; }
  // The bevels and upholstered seams carry the silhouette, not a thick toon border.
  material.userData.outlineParameters = { visible: false };
  materials.set(name, material);
  return material;
}
