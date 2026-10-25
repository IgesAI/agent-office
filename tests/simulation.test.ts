import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { emptySimulation, parseSimulation, placeForBot, SNAPSHOT_TTL } from '../src/shared/simulation';
import { botScope, readSimulation } from '../src/server/simulation/snapshot';
import { reconcile } from '../src/client/simulation/feed';
import { assignSpots, route, STATIONS } from '../src/client/simulation/movement';
import { openModel } from './glb';
import { loginDestination } from '../src/shared/entry';
const now=Date.now();
const bot={id:'bot-1',name:'Exact Bot Name',state:'working' as const,color:'#789abc',observedAt:now,activity:'coding' as const};
const snapshot={...emptySimulation(),connection:'connected' as const,observedAt:now,bots:[bot]};

test('login returns to the requested local view without accepting external redirects',()=>{
  assert.equal(loginDestination('/office'),'/office.html');assert.equal(loginDestination('/lite.html'),'/lite');
  for(const url of ['//evil.test','https://evil.test','/../office','/office?next=evil',null])assert.equal(loginDestination(url),'/');
});

test('Bot snapshots whitelist data, preserve exact names, reject ambiguous identities',()=>{
  const parsed=parseSimulation({...snapshot,token:'secret',bots:[{...bot,accessToken:'secret',transcript:'secret'}]},now);
  assert.equal(parsed.bots[0].name,bot.name);assert.ok(!JSON.stringify(parsed).includes('secret'));
  assert.throws(()=>parseSimulation({...snapshot,bots:[bot,bot]},now));
  assert.throws(()=>parseSimulation({...snapshot,bots:[{...bot,id:'../other'}]},now));
  assert.throws(()=>parseSimulation({...snapshot,observedAt:Infinity},now));
});
test('missing, stale and disconnected activity never becomes idle or working',()=>{
  const stale=parseSimulation(snapshot,now+SNAPSHOT_TTL+1);
  assert.equal(stale.connection,'stale');assert.equal(stale.bots[0].state,'unknown');assert.equal(stale.bots[0].activity,undefined);
  assert.equal(parseSimulation(stale,now+SNAPSHOT_TTL+2).connection,'stale');
  assert.equal(placeForBot({...bot,state:'unknown'}),'general');
  assert.equal(placeForBot({...bot,state:'idle'}),'rest');
  assert.equal(placeForBot({...bot,activity:undefined,task:'coding something'}),'general');
});
test('only a complete connected roster removes Bots; reconnect updates identities',()=>{
  const failed=reconcile(snapshot,{...emptySimulation(),connection:'error'});
  assert.equal(failed.bots.length,1);assert.equal(failed.bots[0].state,'unknown');
  assert.equal(reconcile(failed,{...snapshot,bots:[]}).bots.length,0);
  assert.equal(reconcile(failed,{...snapshot,bots:[{...bot,name:'Renamed'}]}).bots[0].name,'Renamed');
});
test('station reservations are stable, bounded and release when Bots disappear',()=>{
  const bots=Array.from({length:3},(_,i)=>({...bot,id:`bot-${i}`}));
  assert.deepEqual(assignSpots(bots),assignSpots([...bots].reverse()));
  assert.equal([...assignSpots(bots).values()].filter(Boolean).length,2);
  assert.ok(assignSpots([bots[2]]).get(bots[2].id));
  const path=route({x:-6.7,z:4.6,y:0,facing:0},{x:7.8,z:2.35,y:0,facing:0});
  assert.ok(path.some(p=>p.z===-.25),'cross room travel uses the clear central aisle');
  assert.equal(path[0].x,-4.3,'library exit goes around the writing table');
  const board=route({x:0,z:-.25,y:0,facing:0},STATIONS.analysis![0]);
  assert.ok(board.some(p=>p.x===4.6&&p.z>3),'reach the front of the board around its right edge');
});
test('server isolates account snapshots and fails closed on malformed data',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'office-simulation-'));
  try {
    const scope=path.join(dir,'grok-bot',botScope('alice'));await mkdir(scope,{recursive:true});
    await writeFile(path.join(scope,'snapshot.json'),JSON.stringify({...snapshot,bots:[{...bot,token:'secret'}]}));
    assert.equal((await readSimulation(dir,'alice')).bots.length,1);
    assert.equal((await readSimulation(dir,'bob')).bots.length,0);
    assert.equal((await readSimulation(dir)).bots.length,0);
    assert.match(botScope('../escape'),/^[a-f0-9]{64}$/);
    await writeFile(path.join(scope,'snapshot.json'),'invalid');
    assert.equal((await readSimulation(dir,'alice')).connection,'error');
    await writeFile(path.join(scope,'snapshot.json'),'x'.repeat(1024*1024+1));
    assert.equal((await readSimulation(dir,'alice')).bots.length,0);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('all five original simulation landmarks exist within the asset budget',()=>{
  const model=openModel('simulation');
  for(const name of ['bed','globe','oven','shelf','board'])assert.ok(model.nodes[model.byName(name)],name);
  assert.ok(model.triangles()<30000);
});
