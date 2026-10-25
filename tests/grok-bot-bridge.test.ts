import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Optional Node bridge ships without runtime TypeScript dependencies.
import { rosterSnapshot, readOnlyFetch } from '../scripts/lib/grok-bot-roster.mjs';
test('bridge retains only owned identities and cannot infer activity from descriptions',()=>{
  const bots=[{id:'abc',name:'Chef',description:'Cooking dinner',viewerIsOwner:true,accessToken:'secret'}, {id:'team',name:'Team',viewerIsOwner:false}];
  const result=rosterSnapshot({bots,truncated:false},123);
  assert.equal(result.bots.length,1);assert.equal(result.bots[0].name,'Chef');assert.equal(result.bots[0].state,'unknown');
  assert.ok(!JSON.stringify(result).includes('secret'));assert.ok(!JSON.stringify(result).includes('Cooking'));
  assert.throws(()=>rosterSnapshot({bots,truncated:true}));assert.throws(()=>rosterSnapshot({bots}));
});
test('bridge network boundary rejects mutations and redirected or foreign endpoints',async()=>{
  let calls=0;
  const fetchImpl=async(_url:URL,init:RequestInit)=>{calls++;assert.equal(init.redirect,'error');return new Response('{}');};
  for(const url of ['https://api2.cursor.sh/aiserver.v1.GrokBotService/SendGrokBotUserMessage','https://example.com/auth/poll','https://api2.cursor.sh/auth/poll#x']) {
    await assert.rejects(()=>readOnlyFetch(url,{method:'POST'},fetchImpl));
  }
  assert.equal(calls,0);
  const response=await readOnlyFetch('https://api2.cursor.sh/aiserver.v1.GrokBotService/ListGrokBotAgents',{method:'POST'},fetchImpl);
  assert.equal(await response.text(),'{}');assert.equal(calls,1);
  await assert.rejects(()=>readOnlyFetch('https://api2.cursor.sh/auth/poll',{},async()=>new Response('x'.repeat(1024*1024+1))));
});
