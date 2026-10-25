// Opt-in, read-only compatibility bridge. No desktop credential access or token persistence.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { rosterSnapshot, readOnlyFetch, decodeHistory } from './lib/grok-bot-roster.mjs';
import { ActivityTracker } from './lib/grok-bot-activity.mjs';

const PIN='0b499a88a48c3b038010758fb6cd4d73ed4e022a';
const args=process.argv.slice(2);
const flags=new Set(['--experimental','--login','--activity']);
const values=new Set(['--sdk','--data-dir','--account']);
const options=new Map();
for(let i=0;i<args.length;i++) {
  const key=args[i];
  if(flags.has(key))options.set(key,true);
  else if(values.has(key)&&args[i+1]&&!args[i+1].startsWith('--'))options.set(key,args[++i]);
  else throw new Error('Unknown option. See docs/grok-bot.md for setup.');
}
if(!options.has('--experimental')||!options.has('--login')) {
  console.log('Optional unofficial Grok Bot bridge. Review docs/grok-bot.md first.\nUsage: node scripts/grok-bot-bridge.mjs --experimental --login [--activity] [--data-dir PATH] [--account ID]');
  process.exit(0);
}
const sdkDir=path.resolve(options.get('--sdk')??'artifacts/grok-bot-sdk-review');
const dataDir=path.resolve(options.get('--data-dir')??'.agent-office');
const account=options.get('--account');
const scope=account?createHash('sha256').update(account).digest('hex'):'shared';
const dir=path.join(dataDir,'grok-bot',scope);
const watchActivity=options.has('--activity');
let lock,locked=false,stopped=false;
const controller=new AbortController();
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;controller.abort();});
let requestJSON,clientHeaders,API_ORIGIN;
let roster={version:1,source:'grok-bot',connection:'disconnected',observedAt:0,bots:[]};
let snapshot=roster,written='';
/** Bot id → its tracker and the abort handle of its transcript watch. */
const watches=new Map();
function compose() {
  const now=Date.now();
  return {...roster,bots:roster.bots.map(b=>{
    const w=watches.get(b.id);
    return w&&roster.connection==='connected'?{...b,...w.tracker.view(now),observedAt:now}:b;
  })};
}
async function save() {
  snapshot=compose();
  const text=JSON.stringify(snapshot);
  if(text===written)return;
  await writeFile(path.join(dir,'snapshot.tmp'),text,{mode:0o600});
  await rename(path.join(dir,'snapshot.tmp'),path.join(dir,'snapshot.json'));
  written=text;
}
let saving=Promise.resolve();
const queueSave=()=>{saving=saving.then(save,save).catch(()=>{});return saving;};
const seenKinds=new Set();
async function watchBot(client,headers,bot,w) {
  let cursor,resumeFrom,backoff=2000;
  try {
    const tail=await requestJSON(`${API_ORIGIN}/aiserver.v1.GrokBotService/ListGrokBotTranscriptEntries`,{headers:headers(),body:{agentId:bot.id,sessionId:bot.sessionId,limit:12},fetchImpl:readOnly,signal:w.abort.signal});
    if(tail.ok){const history=decodeHistory(tail.data);w.tracker.seed(history.entries);cursor={generation:history.generation,afterUpdatedSeq:history.afterUpdatedSeq};}
  } catch {}
  while(!stopped&&!w.abort.signal.aborted) {
    try {
      const from=resumeFrom?{resumeFrom}:cursor?{cursor}:{};
      for await(const event of client.watchBot({botId:bot.id,sessionId:bot.sessionId,signal:w.abort.signal,...from})) {
        w.tracker.watching=true;backoff=2000;
        if(event.id){resumeFrom=event.id;cursor=undefined;}
        if(event.type==='resync-required'){resumeFrom=undefined;cursor=undefined;break;}
        w.tracker.observe(event);
        for(const kind of w.tracker.kinds)if(!seenKinds.has(kind)){seenKinds.add(kind);console.log(`Transcript entry kind seen: ${kind}`);}
        queueSave();
      }
    } catch {
      w.tracker.watching=false;queueSave();
    }
    await delay(backoff,undefined,{signal:w.abort.signal}).catch(()=>{});backoff=Math.min(backoff*2,60000);
  }
}
const readOnly=(url,init)=>readOnlyFetch(url,{...init,signal:AbortSignal.any([controller.signal,init?.signal??new AbortController().signal])});
try {
  const git=(...rest)=>execFileSync('git',['-C',sdkDir,...rest],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}).trim();
  if(git('rev-parse','HEAD')!==PIN||git('status','--porcelain','--untracked-files=all'))throw new Error('SDK_PIN_MISMATCH');
  await mkdir(dir,{recursive:true,mode:0o700});
  lock=await open(path.join(dir,'bridge.lock'),'wx',0o600);locked=true;
  await lock.writeFile(String(process.pid));
  const {createLogin,pollLogin,GrokBotClient}=await import(pathToFileURL(path.join(sdkDir,'sdk.mjs')).href);
  ({requestJSON,clientHeaders,API_ORIGIN}=await import(pathToFileURL(path.join(sdkDir,'core.mjs')).href));
  const flow=createLogin(),url=new URL(flow.loginUrl);
  if(url.origin!=='https://cursor.com'||url.pathname!=='/loginDeepControl')throw new Error('LOGIN_ORIGIN_REJECTED');
  console.log('Experimental roster connection. Sign in only if you accept the unofficial adapter described in docs/grok-bot.md.');
  console.log('Tokens stay in this process until it exits. Open this sign-in URL:\n'+url.href);
  const login=await pollLogin(flow,{fetchImpl:readOnly,sleep:ms=>delay(ms,undefined,{signal:controller.signal})});
  if(stopped)throw new Error('STOPPED');
  const credentials={accessToken:login.accessToken,teamId:login.selectedTeamId,version:'0.70.2'};
  const client=new GrokBotClient({...credentials,fetchImpl:readOnly});
  const headers=()=>clientHeaders(credentials);
  await client.getMe();
  console.log(watchActivity
    ?'Signed in. Reading Bot names every 10 seconds and watching transcripts for task activity.'
    :'Signed in. Reading personal Bot names every 10 seconds. Add --activity to watch task activity.');
  const ticker=setInterval(()=>{if(watchActivity)queueSave();},2000);
  while(!stopped) {
    try {
      const result=await client.listBots({includeTeamAgents:false});
      roster=rosterSnapshot(result);
      if(watchActivity) {
        const live=new Map(result.bots.filter(b=>roster.bots.some(r=>r.id===b.id)).map(b=>[b.id,b]));
        for(const [id,w] of watches)if(!live.has(id)){w.abort.abort();watches.delete(id);}
        for(const [id,bot] of live) {
          const role=roster.bots.find(r=>r.id===id)?.role??'';
          const existing=watches.get(id);
          if(existing){existing.tracker.role=role;continue;}
          const w={tracker:new ActivityTracker(role),abort:new AbortController()};
          controller.signal.addEventListener('abort',()=>w.abort.abort(),{once:true});
          watches.set(id,w);
          void watchBot(client,headers,{id,sessionId:typeof bot.sessionId==='string'?bot.sessionId:''},w);
        }
      }
      await queueSave();
    } catch {
      roster={...roster,connection:'error',bots:roster.bots.map(b=>({...b,state:'unknown'}))};
      await queueSave();console.error('Roster unavailable; retaining the last household. No task state is assumed.');
    }
    await delay(10000,undefined,{signal:controller.signal}).catch(()=>{});
  }
  clearInterval(ticker);
} catch {
  // SDK/provider errors may contain credentials or response bodies. Never print them.
  if(!stopped){console.error('Bridge could not start. Check the pinned, clean SDK, ensure no other bridge owns this scope, and retry sign-in. See docs/grok-bot.md.');process.exitCode=1;}
} finally {
  if(locked) {
    for(const w of watches.values())w.abort.abort();watches.clear();
    roster={...roster,connection:'disconnected',bots:roster.bots.map(b=>({...b,state:'unknown'}))};
    await saving;await save().catch(()=>{});await lock.close();await unlink(path.join(dir,'bridge.lock')).catch(()=>{});
  }
}
