import * as THREE from 'three';
import { textSprite, disposeSprite } from '../world/toon';
import type { SimulationBot, TaskPlace } from '../../shared/simulation';

/** A small house resident. Its pose is presentation only; no execution state is synthesized. */
export class Resident {
  readonly root = new THREE.Group();
  readonly figure = new THREE.Group();
  private limbs: THREE.Mesh[] = [];
  private eyes: THREE.Mesh[] = [];
  private label: THREE.Sprite;
  private ring: THREE.Mesh;
  private skin: THREE.MeshStandardMaterial;
  private bulb: THREE.MeshStandardMaterial;
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private name: string;
  constructor(bot: SimulationBot) {
    this.name = bot.name;
    this.root.userData.botId = bot.id;
    const material = (color: string) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: .65 });
      this.materials.push(m); return m;
    };
    this.skin = material(bot.color);
    const dark = material('#35443e'), white = material('#fff9e5');
    this.bulb = material('#aab7a2');
    const part = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      this.geometries.push(g);
      const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true;
      this.figure.add(o); return o;
    };
    part(new THREE.CapsuleGeometry(.29, .32, 6, 12), this.skin, 0, .65, 0);
    part(new THREE.SphereGeometry(.25, 16, 12), white, 0, .74, .15).scale.set(1,.68,.6);
    for (const side of [-1,1]) {
      this.eyes.push(part(new THREE.SphereGeometry(.045, 10, 8), dark, side * .1, .75, .30));
      this.limbs.push(part(new THREE.CapsuleGeometry(.068, .22, 4, 8), this.skin, side * .35, .55, 0));
      this.limbs.push(part(new THREE.CapsuleGeometry(.085, .12, 4, 8), dark, side * .14, .15, .04));
      part(new THREE.SphereGeometry(.077, 10, 8), dark, side * .29, .8, 0);
    }
    part(new THREE.TorusGeometry(.29,.023,6,18,Math.PI), dark,0,.8,0);
    part(new THREE.CylinderGeometry(.017,.017,.22,6), dark,0,1.11,0);
    part(new THREE.SphereGeometry(.065,12,8),this.bulb,0,1.24,0);
    this.label = this.makeLabel();
    this.geometries.push(new THREE.RingGeometry(.45,.51,40));
    const ringMat = new THREE.MeshBasicMaterial({ color:'#758b62', side:THREE.DoubleSide, transparent:true, opacity:.8 });
    this.materials.push(ringMat);
    this.ring = new THREE.Mesh(this.geometries.at(-1),ringMat);
    this.ring.rotation.x = -Math.PI/2; this.ring.position.y = .09; this.ring.visible = false;
    this.root.add(this.figure,this.label,this.ring);
  }
  private makeLabel() {
    const sprite = textSprite(this.name, { bg:'#faf9ef', color:'#355348', size:30, border:'#c6d3bd' });
    if (sprite.scale.x > 3) sprite.scale.multiplyScalar(3 / sprite.scale.x);
    sprite.position.y = 1.65; return sprite;
  }
  sync(bot: SimulationBot) {
    if (this.name !== bot.name) {
      this.name = bot.name; this.root.remove(this.label); disposeSprite(this.label);
      this.label = this.makeLabel(); this.root.add(this.label);
    }
    this.skin.color.set(bot.color);
    this.bulb.color.set(({ working:'#94bc7b',idle:'#aab3d0',waiting:'#e4bd72',error:'#cc8170',offline:'#a5aaa3',unknown:'#aab7a2' })[bot.state]);
  }
  selected(value: boolean) { this.ring.visible = value; }
  pose(t: number, walking: boolean, activity: TaskPlace, sleeping: boolean) {
    this.figure.rotation.set(sleeping ? -Math.PI/2 : 0,0,walking ? Math.sin(t*8)*.06 : 0);
    this.figure.position.y = sleeping ? .38 : Math.sin(t*2)*.015;
    this.label.position.y = sleeping ? 1.05 : 1.65;
    for (let i=0;i<this.limbs.length;i++) {
      const limb=this.limbs[i], side=i<2 ? 1 : -1;
      limb.rotation.x = walking ? Math.sin(t*8)*.45*side : 0;
      if (!walking && !sleeping && i%2===0 && activity !== 'general' && activity !== 'rest') {
        limb.rotation.x = -.9 + Math.sin(t*(activity==='coding'?11:2.5)+i)*.13;
      }
    }
    for (const eye of this.eyes) eye.scale.y = sleeping ? .15 : 1;
  }
  dispose() {
    this.root.removeFromParent(); disposeSprite(this.label);
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
  }
}
