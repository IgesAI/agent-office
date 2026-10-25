/** Only these read operations may leave the bridge, even if a future caller uses the SDK incorrectly. */
const ALLOWED=new Map([
  ['/auth/poll','GET'],
  ['/aiserver.v1.DashboardService/GetMe','POST'],
  ['/aiserver.v1.GrokBotService/ListGrokBotAgents','POST'],
]);
export async function readOnlyFetch(input,init={},fetchImpl=fetch) {
  const url=new URL(input);
  if(url.origin!=='https://api2.cursor.sh'||url.username||url.password||url.hash||ALLOWED.get(url.pathname)!==(init.method??'GET'))throw new Error('READ_ONLY_BOUNDARY');
  if(url.pathname!=='/auth/poll'&&url.search)throw new Error('READ_ONLY_BOUNDARY');
  const response=await fetchImpl(url,{...init,redirect:'error'});
  // Bound response allocation before handing JSON back to the SDK.
  const reader=response.body?.getReader();if(!reader)return response;
  let size=0;const chunks=[];
  try {
    for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024*1024)throw new Error('RESPONSE_TOO_LARGE');chunks.push(value);}
  } finally {await reader.cancel().catch(()=>{});}
  return new Response(Buffer.concat(chunks),{status:response.status,statusText:response.statusText,headers:response.headers});
}
export function rosterSnapshot(result,now=Date.now()) {
  if(!result||result.truncated!==false||!Array.isArray(result.bots)||result.bots.length>200)throw new Error('INCOMPLETE_ROSTER');
  const ids=new Set();
  const bots=result.bots.filter(b=>b.viewerIsOwner===true).map(b=>{
    if(typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(b.id)||ids.has(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>160)throw new Error('INVALID_IDENTITY');
    ids.add(b.id);
    return {id:b.id,name:b.name,state:'unknown',observedAt:now,color:/^#[a-f0-9]{6}$/i.test(b.avatarColor)?b.avatarColor:'#659b8c'};
  });
  return {version:1,source:'grok-bot',connection:'connected',observedAt:now,bots};
}
