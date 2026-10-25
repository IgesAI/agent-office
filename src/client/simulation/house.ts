import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import headquartersUrl from '../models/headquarters.glb?url';
import landmarksUrl from '../models/simulation.glb?url';
import kitchenUrl from '../models/kitchen.glb?url';
import plantsUrl from '../models/plants.glb?url';
import loungeUrl from '../models/lounge.glb?url';

const colors: Record<string, string> = {
  Walnut: '#795d43', Edge: '#433c32', Graphite: '#35443f', Bronze: '#b19b70', Fabric: '#6c9587', Piping: '#3d6357',
  Porcelain: '#eae5d6', Rubber: '#303934', Light: '#fff0cf', Screen: '#253d39', Linen: '#ece6db', Blanket: '#92af9c',
  Ocean: '#719eaf', Land: '#dbd5b2', BookRed: '#b57f6c', BookBlue: '#7193a1', Paper: '#eee7d8', Board: '#425c52',
  Cabinet: '#9fb6a2', Wood: '#b9966d', Chrome: '#b4b4a5', Dark: '#39423c', White: '#efece0', Fridge: '#e6ddc6',
  Note: '#d3b777', Memo: '#a1bab3', Red: '#ac7567', Glow: '#e9ae78', Sofa: '#b6bd9f', WoodDark: '#725e47', Frame: '#4c6056', Cloth: '#c7b48f',
  Bark: '#796649', LeafDark: '#416b47', Leaf: '#739b5b', Pot: '#bd9571', Soil: '#5b4c3b', Glaze: '#d4d5b5',
};
const finishes = new Map<string, THREE.MeshStandardMaterial>();
function finish(name: string, original: THREE.Color, vertexColors: boolean) {
  const key = `${name}:${original.getHexString()}:${vertexColors}`;
  if (!finishes.has(key)) finishes.set(key, new THREE.MeshStandardMaterial({ color: colors[name] ?? original,
    vertexColors, side: name.startsWith('Leaf') ? THREE.DoubleSide : THREE.FrontSide,
    roughness: name === 'Bronze' || name === 'Chrome' ? .45 : .85, metalness: name === 'Bronze' || name === 'Chrome' ? .45 : 0 }));
  return finishes.get(key)!;
}
export async function buildHouse(scene: THREE.Scene) {
  const loader = new GLTFLoader();
  const assets = await Promise.allSettled([headquartersUrl, landmarksUrl, kitchenUrl, plantsUrl, loungeUrl].map(u => loader.loadAsync(u)));
  const house = new THREE.Group();
  scene.add(house);
  const missing: number[] = [];
  assets.forEach((a, i) => { if (a.status === 'rejected') missing.push(i); });
  function item(asset: number, part: string, x: number, z: number, rot = 0, scale = 1, y = 0) {
    const loaded = assets[asset];
    if (loaded.status !== 'fulfilled') return;
    const node = loaded.value.scene.getObjectByName(part)?.clone(true);
    if (!node) return;
    node.position.set(x, y, z); node.rotation.y = rot; node.scale.setScalar(scale);
    node.traverse(o => { if (o instanceof THREE.Mesh) {
      const material = o.material as THREE.MeshStandardMaterial;
      o.material = finish(material.name, material.color, material.vertexColors); o.castShadow = true; o.receiveShadow = true;
    } });
    house.add(node);
    return node;
  }
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  function box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, radius = .025) {
    if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: .88 }));
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, h / 3)), mats.get(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; house.add(mesh); return mesh;
  }
  box(0, -.34, 0, 22.4, .62, 16.1, '#d8d7c7', .16);
  // Oak planks with a restrained, deterministic grain of alternating warm tones.
  const plank = new RoundedBoxGeometry(2.72,.055,.478,2,.008), matrix = new THREE.Matrix4();
  for (let tint=0;tint<3;tint++) {
    const tiles: [number,number][]=[];
    for(let row=0;row<32;row++)for(let col=0;col<8;col++)if((row*7+col)%3===tint)tiles.push([-9.61+col*2.75,-7.65+row*.49]);
    const batch=new THREE.InstancedMesh(plank,new THREE.MeshStandardMaterial({color:['#cdb790','#d3bf9b','#c6af89'][tint],roughness:.88}),tiles.length);
    tiles.forEach(([x,z],i)=>batch.setMatrixAt(i,matrix.makeTranslation(x,-.005,z)));
    batch.receiveShadow=true;house.add(batch);
  }
  // Back walls, full-height windows, and low cutaway room dividers keep every station visible.
  box(0, 1.35, -7.9, 22.2, 2.7, .18, '#e0dfcd');
  box(-11.05, .78, 0, .18, 1.56, 15.8, '#d7dac9');
  box(11.05, .32, 0, .18, .64, 15.8, '#d7dac9');
  box(0, .12, 7.9, 22.2, .24, .18, '#e0dfcd');
  for (const x of [-7, 0, 7]) {
    box(x, 1.72, -7.78, 4.3, 1.54, .09, '#b7ced0');
    box(x, .95, -7.62, 4.5, .12, .36, '#f2ecde');
    for (const dx of [-2.12, 0, 2.12]) box(x + dx, 1.75, -7.69, .07, 1.60, .12, '#f2ecde');
    box(x, 2.50, -7.68, 4.32, .09, .12, '#f2ecde');
  }
  for (const x of [-3.65, 3.65]) box(x, .50, -4.6, .15, 1, 6.5, '#e0dfcd');
  // Area rugs make the purpose of each room readable from the overhead camera.
  box(-7, .04, -4.2, 5.7, .045, 4.6, '#93a69b', .12);
  box(0, .04, -4.8, 5.8, .05, 4.1, '#d9c9aa', .10);
  box(7.3, .04, -4.7, 5.8, .05, 4.6, '#b3afc1', .12);
  box(-7.2, .04, 3.8, 5.6, .045, 5.1, '#c3aa91', .12);
  box(-.3, .04, 3.9, 5.1, .05, 4.3, '#aeb597', .16);
  box(7.4, .04, 4, 4.9, .045, 4.8, '#a6bdc0', .12);
  for (const x of [-8.5,-5.6]) { item(0,'desk',x,-5.5); item(0,'chair',x,-4.2); }
  item(2,'counter',-.7,-6.5,0,.72);
  item(2,'fridge',2.25,-6.5,0,.85);
  item(1,'oven',1.15,-6.3);
  item(2,'coffee_machine',-1.9,-6.4,0,.8,.75);
  item(1,'bed',5.9,-5.3); item(1,'bed',8.6,-5.3);
  box(7.25,.39,-6.1,.57,.78,.59,'#ac9374',.04);
  item(3,'succulent',7.25,-6.1,0,.9,.79);
  item(1,'shelf',-9.6,3.4,Math.PI/2,1.2);
  item(4,'sofa',-6.7,5.5,Math.PI,1.1);
  item(4,'coffee_table',-6.7,3.4,0,1.2);
  const table = item(4,'coffee_table',-.8,3.3,0,2.1);
  if(table)table.scale.y=1.4;
  // The authored chair faces local -Z, so its back points away from the table.
  for (let i=0;i<4;i++) { const a=i*Math.PI/2; item(0,'chair',-.8+Math.sin(a)*1.8,3.3+Math.cos(a)*1.8,a); }
  item(1,'board',3.0,2.1,-Math.PI/7);
  item(1,'globe',7.8,3.6,0,1.3);
  item(4,'pouf',6.2,5.5,0,1.1);
  item(4,'pouf',9.0,5.5,0,1.1);
  for(const [x,z] of [[-10,-6.8],[-10,.3],[3,-7],[10,-1.5],[-3,6.8],[10,6.7]]) item(3,'monstera',x,z,0,1.1);
  // Paper and binding on the library table: a readable writing landmark.
  box(-6.7,.66,3.4,.64,.045,.42,'#eee7d8',.008);
  box(-6.7,.69,3.4,.018,.025,.43,'#8a6c52',.004);
  return { house, missing };
}
