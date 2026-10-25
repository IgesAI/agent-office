/** Only these read operations may leave the bridge, even if a future caller uses the SDK incorrectly. */
const ALLOWED=new Map([
  ['/auth/poll','GET'],
  ['/aiserver.v1.DashboardService/GetMe','POST'],
  ['/aiserver.v1.GrokBotService/ListGrokBotAgents','POST'],
  ['/aiserver.v1.GrokBotService/ListGrokBotTranscriptEntries','POST'],
  ['/aiserver.v1.GrokBotService/WatchGrokBotTranscripts','POST'],
]);
const STREAMING='/aiserver.v1.GrokBotService/WatchGrokBotTranscripts';
export const RESPONSE_LIMIT=1024*1024;
export const STREAM_LIMIT=16*1024*1024;
export async function readOnlyFetch(input,init={},fetchImpl=fetch) {
  const url=new URL(input);
  if(url.origin!=='https://api2.cursor.sh'||url.username||url.password||url.hash||ALLOWED.get(url.pathname)!==(init.method??'GET'))throw new Error('READ_ONLY_BOUNDARY');
  if(url.pathname!=='/auth/poll'&&url.search)throw new Error('READ_ONLY_BOUNDARY');
  const response=await fetchImpl(url,{...init,redirect:'error'});
  const reader=response.body?.getReader();if(!reader)return response;
  if(url.pathname===STREAMING) {
    // A watch is long-lived: pass frames through as they arrive, but cap one connection's total bytes.
    let size=0;
    const body=new ReadableStream({
      async pull(c){const {value,done}=await reader.read();if(done)return c.close();size+=value.byteLength;if(size>STREAM_LIMIT){await reader.cancel().catch(()=>{});return c.error(new Error('RESPONSE_TOO_LARGE'));}c.enqueue(value);},
      cancel(){return reader.cancel().catch(()=>{});},
    });
    return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
  }
  // Bound response allocation before handing JSON back to the SDK.
  let size=0;const chunks=[];
  try {
    for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>RESPONSE_LIMIT)throw new Error('RESPONSE_TOO_LARGE');chunks.push(value);}
  } finally {await reader.cancel().catch(()=>{});}
  return new Response(Buffer.concat(chunks),{status:response.status,statusText:response.statusText,headers:response.headers});
}
const roleOf=b=>[b.title,b.description].filter(v=>typeof v==='string'&&v.trim()).join(' · ').replace(/\s+/g,' ').trim().slice(0,160);
export function rosterSnapshot(result,now=Date.now()) {
  if(!result||result.truncated!==false||!Array.isArray(result.bots)||result.bots.length>200)throw new Error('INCOMPLETE_ROSTER');
  const ids=new Set();
  const bots=result.bots.filter(b=>b.viewerIsOwner===true).map(b=>{
    if(typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(b.id)||ids.has(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>160)throw new Error('INVALID_IDENTITY');
    ids.add(b.id);
    const role=roleOf(b);
    return {id:b.id,name:b.name,state:'unknown',observedAt:now,color:/^#[a-f0-9]{6}$/i.test(b.avatarColor)?b.avatarColor:'#659b8c',...role?{role}:{}};
  });
  return {version:1,source:'grok-bot',connection:'connected',observedAt:now,bots};
}
/** Decode the newest transcript rows (base64 JSON bodies) oldest-first; undecodable rows are skipped. */
export function decodeHistory(data) {
  const rows=Array.isArray(data?.entries)?data.entries:[];
  const seq=r=>{try{return BigInt(String(r.updatedSeq??r.seq??0));}catch{return 0n;}};
  const latest=rows.reduce((max,r)=>seq(r)>max?seq(r):max,0n);
  const entries=[...rows].sort((a,b)=>seq(a)<seq(b)?-1:seq(a)>seq(b)?1:0).flatMap(r=>{
    try{const body=JSON.parse(Buffer.from(String(r.body??''),'base64').toString('utf8'));return body&&typeof body==='object'?[{kind:r.entryKind??body.kind,body}]:[];}catch{return [];}
  });
  const generation=Number.isInteger(data?.generation)&&data.generation>=0?data.generation:0;
  return {generation,afterUpdatedSeq:String(latest),entries};
}
