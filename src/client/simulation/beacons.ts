import * as THREE from 'three';
import { placeForBot, type SimulationBot, type TaskPlace } from '../../shared/simulation';
import { PLACES } from './places';

/** Soft pulsing floor rings under the rooms where a Bot is verifiably working right now. */
export class Beacons {
  private rings = new Map<TaskPlace, THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>>();
  private active = new Set<TaskPlace>();
  private geometry = new THREE.RingGeometry(.9, 1.6, 48);
  constructor(scene: THREE.Scene) {
    for (const p of PLACES) {
      if (p.id === 'rest') continue;
      const ring = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, .09, p.z); ring.visible = false; ring.renderOrder = 2;
      scene.add(ring); this.rings.set(p.id, ring);
    }
  }
  sync(bots: SimulationBot[]) {
    this.active = new Set(bots.filter(b => b.state === 'working').map(placeForBot));
  }
  update(t: number) {
    for (const [id, ring] of this.rings) {
      const target = this.active.has(id) ? .22 + Math.sin(t * 2.4) * .08 : 0;
      ring.material.opacity += (target - ring.material.opacity) * .08;
      ring.visible = ring.material.opacity > .01;
      ring.scale.setScalar(1 + Math.sin(t * 2.4) * .05);
    }
  }
}
