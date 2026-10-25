// Opt-in, read-only compatibility bridge. No desktop credential access or token persistence.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { rosterSnapshot, readOnlyFetch } from './lib/grok-bot-roster.mjs';

const PIN='0b499a88a48c3b038010758fb6cd4d73ed4e022a';
const args=process.argv.slice(2);
const flags=new Set(['--experimental','--login']);
const values=new Set(['--sdk','--data-dir','--account']);
const options=new Map();
for(let i=0;i<args.length;i++) {
  const key=args[i];
  if(flags.has(key))options.set(key,true);
  else if(values.has(key)&&args[i+1]&&!args[i+1].startsWith('--'))options.set(key,args[++i]);
  else throw new Error('Unknown option. See docs/grok-bot.md for setup.');
}
if(!options.has('--experimental')||!options.has('--login')) {
  console.log('Optional unofficial Grok Bot bridge. Review docs/grok-bot.md first.\nUsage: node scripts/grok-bot-bridge.mjs --experimental --login [--data-dir PATH] [--account ID]');
  process.exit(0);
}
const sdkDir=path.resolve(options.get('--sdk')??'artifacts/grok-bot-sdk-review');
const dataDir=path.resolve(options.get('--data-dir')??'.agent-office');
const account=options.get('--account');
const scope=account?createHash('sha256').update(account).digest('hex'):'shared';
const dir=path.join(dataDir,'grok-bot',scope);
let lock,locked=false,stopped=false;
const controller=new AbortController();
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;controller.abort();});
let snapshot={version:1,source:'grok-bot',connection:'disconnected',observedAt:0,bots:[]};
async function save() {
  await writeFile(path.join(dir,'snapshot.tmp'),JSON.stringify(snapshot),{mode:0o600});
  await rename(path.join(dir,'snapshot.tmp'),path.join(dir,'snapshot.json'));
}
try {
  const git=(...rest)=>execFileSync('git',['-C',sdkDir,...rest],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}).trim();
  if(git('rev-parse','HEAD')!==PIN||git('status','--porcelain','--untracked-files=all'))throw new Error('SDK_PIN_MISMATCH');
  await mkdir(dir,{recursive:true,mode:0o700});
  lock=await open(path.join(dir,'bridge.lock'),'wx',0o600);locked=true;
  await lock.writeFile(String(process.pid));
  const {createLogin,pollLogin,GrokBotClient}=await import(pathToFileURL(path.join(sdkDir,'sdk.mjs')).href);
  const flow=createLogin(),url=new URL(flow.loginUrl);
  if(url.origin!=='https://cursor.com'||url.pathname!=='/loginDeepControl')throw new Error('LOGIN_ORIGIN_REJECTED');
  console.log('Experimental roster connection. Sign in only if you accept the unofficial adapter described in docs/grok-bot.md.');
  console.log('Tokens stay in this process until it exits. Open this sign-in URL:\n'+url.href);
  const fetchImpl=(url,init)=>readOnlyFetch(url,{...init,signal:AbortSignal.any([controller.signal,init?.signal??new AbortController().signal])});
  const login=await pollLogin(flow,{fetchImpl,sleep:ms=>delay(ms,undefined,{signal:controller.signal})});
  if(stopped)throw new Error('STOPPED');
  const client=new GrokBotClient({accessToken:login.accessToken,teamId:login.selectedTeamId,fetchImpl});
  await client.getMe();
  console.log('Signed in. Reading personal Bot names every 10 seconds. Activity state is unavailable.');
  while(!stopped) {
    try {
      snapshot=rosterSnapshot(await client.listBots({includeTeamAgents:false}));
      await save();
    } catch {
      snapshot={...snapshot,connection:'error',bots:snapshot.bots.map(b=>({...b,state:'unknown'}))};
      await save();console.error('Roster unavailable; retaining the last household. No task state is assumed.');
    }
    await delay(10000,undefined,{signal:controller.signal}).catch(()=>{});
  }
} catch {
  // SDK/provider errors may contain credentials or response bodies. Never print them.
  if(!stopped){console.error('Bridge could not start. Check the pinned, clean SDK, ensure no other bridge owns this scope, and retry sign-in. See docs/grok-bot.md.');process.exitCode=1;}
} finally {
  if(locked) {
    snapshot={...snapshot,connection:'disconnected',bots:snapshot.bots.map(b=>({...b,state:'unknown'}))};
    await save().catch(()=>{});await lock.close();await unlink(path.join(dir,'bridge.lock')).catch(()=>{});
  }
}
