import * as THREE from 'three';
import { textSprite, disposeSprite } from '../world/toon';
import type { BotState, SimulationBot, TaskPlace } from '../../shared/simulation';
import { bubbleFor, bubbleSprite } from './bubble';

/** A small house resident. Its pose is presentation only; no execution state is synthesized. */
export class Resident {
  readonly root = new THREE.Group();
  readonly figure = new THREE.Group();
  private arms: THREE.Mesh[] = [];
  private legs: THREE.Mesh[] = [];
  private eyes: THREE.Mesh[] = [];
  private label: THREE.Sprite;
  private bubble: THREE.Sprite | null = null;
  private bubbleKey = '';
  private ring: THREE.Mesh;
  private skin: THREE.MeshStandardMaterial;
  private bulb: THREE.MeshStandardMaterial;
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private name: string;
  private state: BotState = 'unknown';
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
    this.bulb.emissive = new THREE.Color('#000000');
    const part = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      this.geometries.push(g);
      const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true;
      this.figure.add(o); return o;
    };
    part(new THREE.CapsuleGeometry(.29, .32, 6, 12), this.skin, 0, .65, 0);
    part(new THREE.SphereGeometry(.25, 16, 12), white, 0, .74, .15).scale.set(1,.68,.6);
    for (const side of [-1,1]) {
      this.eyes.push(part(new THREE.SphereGeometry(.045, 10, 8), dark, side * .1, .75, .30));
      // Arms hinge at the shoulder so reaching and stirring read from above.
      this.arms.push(part(new THREE.CapsuleGeometry(.068, .22, 4, 8).translate(0, -.12, 0), this.skin, side * .35, .67, 0));
      this.legs.push(part(new THREE.CapsuleGeometry(.085, .12, 4, 8), dark, side * .14, .15, .04));
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
    this.state = bot.state;
    this.skin.color.set(bot.color);
    const glow = ({ working:'#94bc7b',idle:'#aab3d0',waiting:'#e4bd72',error:'#cc8170',offline:'#a5aaa3',unknown:'#aab7a2' })[bot.state];
    this.bulb.color.set(glow);
    this.bulb.emissive.set(bot.state === 'working' || bot.state === 'error' || bot.state === 'waiting' ? glow : '#000000');
    const look = bubbleFor(bot), key = look ? `${look.icon}|${look.text}|${look.tint}` : '';
    if (key !== this.bubbleKey) {
      this.bubbleKey = key;
      if (this.bubble) { this.root.remove(this.bubble); disposeSprite(this.bubble); this.bubble = null; }
      if (look) { this.bubble = bubbleSprite(look); this.root.add(this.bubble); }
    }
  }
  selected(value: boolean) { this.ring.visible = value; }
  pose(t: number, walking: boolean, activity: TaskPlace, sleeping: boolean) {
    const working = this.state === 'working' && !walking && !sleeping;
    this.figure.rotation.set(sleeping ? -Math.PI/2 : 0,0,walking ? Math.sin(t*8)*.06 : 0);
    this.figure.position.y = sleeping ? .38 : Math.sin(t*2)*.015;
    this.label.position.y = sleeping ? 1.05 : 1.65;
    if (this.bubble) {
      this.bubble.position.y = (sleeping ? 1.35 : 1.95) + Math.sin(t*1.6)*.04;
      this.bubble.material.opacity = this.state === 'idle' ? .55 + Math.sin(t*1.2)*.25 : 1;
    }
    this.bulb.emissiveIntensity = working ? .55 + Math.sin(t*4)*.35 : this.state === 'error' ? .8 : .4;
    for (const [i, leg] of this.legs.entries()) leg.rotation.x = walking ? Math.sin(t*8)*.45*(i ? -1 : 1) : 0;
    const [left, right] = this.arms;
    for (const arm of this.arms) arm.rotation.set(walking ? Math.sin(t*8)*.45*(arm === left ? -1 : 1) : 0, 0, 0);
    for (const eye of this.eyes) eye.scale.y = sleeping ? .15 : 1;
    if (walking || sleeping) return;
    if (this.state === 'waiting') { right.rotation.set(-2.7, 0, Math.sin(t*6)*.35); return; }
    if (this.state === 'error') { this.figure.rotation.x = .18; left.rotation.x = right.rotation.x = .15; return; }
    if (!working) return;
    gesture(activity, t, left, right, this.figure);
  }
  dispose() {
    this.root.removeFromParent(); disposeSprite(this.label);
    if (this.bubble) disposeSprite(this.bubble);
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
  }
}

/** Per-activity body language at a station. */
function gesture(activity: TaskPlace, t: number, left: THREE.Mesh, right: THREE.Mesh, body: THREE.Group) {
  switch (activity) {
    case 'coding':
      left.rotation.x = -1.15 + Math.sin(t*13)*.1; right.rotation.x = -1.15 + Math.sin(t*13+1.7)*.1;
      body.rotation.x = .06; break;
    case 'cooking':
      left.rotation.x = -.8;
      right.rotation.set(-1.0 + Math.sin(t*4)*.18, 0, Math.cos(t*4)*.3); break;
    case 'writing':
      left.rotation.x = -.7; right.rotation.set(-.95 + Math.sin(t*9)*.05, 0, Math.sin(t*5)*.12);
      body.rotation.x = .14; break;
    case 'analysis':
      right.rotation.set(-2.1 + Math.sin(t*1.4)*.25, 0, -.2); left.rotation.x = -.2;
      body.rotation.z = Math.sin(t*.9)*.04; break;
    case 'travel':
      right.rotation.set(-1.3, 0, Math.sin(t*2.2)*.6); left.rotation.x = -.3; break;
    case 'meeting':
      left.rotation.x = -.6 + Math.sin(t*2.6)*.35; right.rotation.x = -.6 + Math.sin(t*2.6+Math.PI)*.35;
      body.rotation.x = Math.max(0, Math.sin(t*1.8))*.08; break;
    default:
      right.rotation.set(-1.9, 0, .5); body.rotation.z = Math.sin(t*1.1)*.05;
  }
}
