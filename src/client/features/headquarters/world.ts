import * as THREE from 'three';
import type { DeskView } from '../../world/types';
import type { Fixture } from '../../world/office/fixture';
import { piece } from '../../world/models';
import { finish } from './materials';

export interface StudioScreen {
  deskId: string;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
}

declare module '../../world/types' {
  interface OfficeHandles {
    studioScreens: StudioScreen[];
  }
}

/** Keeps every operational anchor and the actual spinning chair object. */
export function refitDesk(desk: DeskView, furniture: THREE.Object3D, chair: THREE.Object3D): void {
  const keep = new Set<THREE.Object3D>([desk.laptopAnchor, desk.seatAnchor, desk.stage, desk.vacancy, desk.chair]);
  for (const child of desk.group.children) if (!keep.has(child)) child.visible = false;
  for (const child of desk.chair.children) child.visible = false;
  desk.chair.add(chair);
  desk.group.add(furniture);
}

/** Two real seats, not a parallel world or synthetic agent store. */
export const headquarters: Fixture<'studioScreens'> = (site) => {
  const studioScreens: StudioScreen[] = [];
  for (const id of ['desk-1', 'desk-2']) {
    const desk = site.desks.get(id);
    if (!desk) continue;
    const furniture = piece('headquarters', 'desk', finish);
    const chair = piece('headquarters', 'chair', finish);
    const surface = furniture.getObjectByName('screen') as THREE.Mesh | undefined;
    // Missing/incomplete assets leave the original usable furniture in place.
    if (!surface?.isMesh || !chair.children.length) continue;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 408;
    const texture = new THREE.CanvasTexture(canvas);
    // glTF UVs follow the image convention of its loader, unlike a runtime PlaneGeometry.
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    material.userData.outlineParameters = { visible: false };
    surface.material = material;
    surface.castShadow = false;
    surface.receiveShadow = false;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#141b1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d4ded8';
    ctx.font = '24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Available workstation', 512, 216);
    refitDesk(desk, furniture, chair);
    desk.vacancyY = 1.72;
    desk.vacancy.position.y = desk.vacancyY;
    studioScreens.push({ deskId: id, canvas, texture });
  }
  return { handle: { studioScreens } };
};
