import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Optional Node bridge ships without runtime TypeScript dependencies.
import { rosterSnapshot, readOnlyFetch, decodeHistory, STREAM_LIMIT } from '../scripts/lib/grok-bot-roster.mjs';
// @ts-expect-error Optional Node bridge ships without runtime TypeScript dependencies.
import { ActivityTracker, classify, readEntry, IDLE_AFTER, REPLY_SETTLE } from '../scripts/lib/grok-bot-activity.mjs';
test('bridge retains only owned identities and their role, never a state, from the roster',()=>{
  const bots=[{id:'abc',name:'Chef',title:'Home cook',description:'Cooking dinner',viewerIsOwner:true,accessToken:'secret'}, {id:'team',name:'Team',viewerIsOwner:false}];
  const result=rosterSnapshot({bots,truncated:false},123);
  assert.equal(result.bots.length,1);assert.equal(result.bots[0].name,'Chef');assert.equal(result.bots[0].state,'unknown');
  assert.equal(result.bots[0].role,'Home cook · Cooking dinner');assert.equal(result.bots[0].activity,undefined);
  assert.ok(!JSON.stringify(result).includes('secret'));
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
test('transcript watch streams through the boundary but is capped per connection',async()=>{
  const url='https://api2.cursor.sh/aiserver.v1.GrokBotService/WatchGrokBotTranscripts';
  const chunk=new Uint8Array(1024*1024);let sent=0;
  const endless=()=>new Response(new ReadableStream({pull(c){sent++;c.enqueue(chunk);}}));
  const response=await readOnlyFetch(url,{method:'POST'},async()=>endless());
  const reader=response.body!.getReader();
  assert.equal((await reader.read()).value?.byteLength,chunk.byteLength,'frames arrive before the stream ends');
  await assert.rejects(async()=>{for(;;){const {done}=await reader.read();if(done)break;}},/RESPONSE_TOO_LARGE/);
  assert.ok(sent*chunk.byteLength>STREAM_LIMIT);
});
test('history decodes base64 bodies oldest-first and resumes after the newest row',()=>{
  const row=(seq:string,body:object)=>({seq,updatedSeq:seq,entryKind:(body as {kind:string}).kind,body:Buffer.from(JSON.stringify(body)).toString('base64')});
  const history=decodeHistory({generation:4,entries:[row('9',{kind:'send-message',message:{type:'text',content:'Done'}}),row('8',{kind:'user-message',text:'Plan a trip to Lisbon'}),{seq:'7',body:'%%%'}]});
  assert.equal(history.generation,4);assert.equal(history.afterUpdatedSeq,'9');
  assert.deepEqual(history.entries.map((e:{kind:string})=>e.kind),['user-message','send-message']);
});
test('requests and roles map to rooms; vague text stays unclassified',()=>{
  assert.equal(classify('Fix the login bug and open a pull request'),'coding');
  assert.equal(classify('Find a vegetarian lasagna recipe for dinner'),'cooking');
  assert.equal(classify('Build an itinerary for my Lisbon trip with hotels'),'travel');
  assert.equal(classify('Draft a newsletter post about the launch'),'writing');
  assert.equal(classify('Research sponsors and compare their pricing'),'analysis');
  assert.equal(classify('Schedule a standup with the partners'),'meeting');
  assert.equal(classify('hello there'),undefined);
  assert.equal(classify('',['run_shell_command']),'coding');
  assert.equal(readEntry('user-message',{text:'hi'}).who,'user');
  assert.equal(readEntry('send-message',{message:{role:'user',content:'hi'}}).who,'user');
  assert.equal(readEntry('tool-call',{toolName:'browser.search'}).tool,'browser.search');
  assert.equal(readEntry('send-message',{message:{type:'text',content:'ok'}}).who,'bot');
});
test('tracker: history never looks busy; live work, replies, failures and quiet are distinct',()=>{
  const t=new ActivityTracker('Sponsor research');
  t.seed([{kind:'user-message',body:{text:'Write a blog post about our launch'}}]);
  assert.equal(t.view(0).state,'unknown','no watch yet means no claim');
  t.watching=true;
  let v=t.view(1000);assert.equal(v.state,'idle');assert.equal(v.task,'Write a blog post about our launch');assert.equal(v.activity,'writing');
  t.observe({type:'entry',data:{entryKind:'user-message',entry:{text:'Find a lasagna recipe'}}},2000);
  v=t.view(2001);assert.equal(v.state,'working');assert.equal(v.activity,'cooking');assert.equal(v.activitySource,'task');assert.equal(v.since,2001);
  t.observe({type:'message',data:{text:'Here is the recipe!'}},5000);
  assert.equal(t.view(5000+REPLY_SETTLE-1).state,'working');assert.equal(t.view(5000+REPLY_SETTLE+1).state,'idle');
  t.observe({type:'entry',data:{entryKind:'user-message',entry:{text:'ok thanks'}}},100000);
  v=t.view(100001);assert.equal(v.activity,'analysis');assert.equal(v.activitySource,'role','vague requests fall back to the role');
  assert.equal(t.view(100000+IDLE_AFTER+1).state,'idle');
  t.observe({type:'turn.failed',data:{}},300000);assert.equal(t.view(300001).state,'error');
  t.observe({type:'reset',data:{}},400000);assert.equal(t.view(400000).task,undefined);
  assert.ok(!t.kinds.has('../evil')&&t.kinds.has('user-message'));
});
