import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { DESK_SIZE } from '../src/shared/layout';
import { openModel } from './glb';

const model = openModel('headquarters');
function bounds(name: string): Box3 {
  const i = model.byName(name), node = model.nodes[i];
  assert.ok(node, `${name} exists`);
  const box = new Box3();
  for (const p of model.gltf.meshes[node.mesh!].primitives) {
    const a = model.gltf.accessors[p.attributes.POSITION];
    box.union(new Box3(new Vector3(...a.min!), new Vector3(...a.max!)).applyMatrix4(model.worldMatrix(i)));
  }
  return box;
}

test('headquarters model keeps desk footprint, surface clearance and chair seat contract', () => {
  const desk = bounds('desk');
  assert.ok(desk.min.x >= -DESK_SIZE.width / 2 && desk.max.x <= DESK_SIZE.width / 2);
  assert.ok(desk.min.z >= -DESK_SIZE.depth / 2 && desk.max.z <= DESK_SIZE.depth / 2);
  assert.ok(desk.min.y >= -.001 && desk.max.y < 1.6);
  const chair = bounds('chair');
  assert.ok(chair.min.y >= -.001 && chair.min.y < .01, 'casters touch the floor');
  assert.ok(chair.max.y < 1.1 && chair.max.x < .37 && chair.min.x > -.37);
  const screen = bounds('screen');
  assert.ok(screen.min.y > DESK_SIZE.height + .15, 'screen leaves laptop/hand clearance');
  assert.equal(model.parentName(model.byName('screen')), 'desk');
});

test('the live screen has UVs and every material has a documented runtime finish', () => {
  const node = model.nodes[model.byName('screen')];
  for (const p of model.gltf.meshes[node.mesh!].primitives) assert.ok(p.attributes.TEXCOORD_0 !== undefined);
  const names = ['Walnut', 'Edge', 'Graphite', 'Bronze', 'Fabric', 'Piping', 'Porcelain', 'Rubber', 'Light', 'Screen'];
  for (const name of model.materials()) assert.ok(names.includes(name), name);
  assert.ok(model.triangles() < 15000, 'asset has not grown unexpectedly beyond the reviewed 11k-triangle slice');
});
