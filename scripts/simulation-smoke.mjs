// Real local login -> authenticated API -> temporary snapshot -> UI. No provider authentication.
import { chromium } from 'playwright-core';
import { mkdir, writeFile, rename, unlink, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.SIMULATION_URL??'http://127.0.0.1:5173';
const out='artifacts/simulation';await mkdir(out,{recursive:true});
const dir='.agent-office/grok-bot/shared',file=dir+'/snapshot.json';
await mkdir(dir,{recursive:true});
for(const f of [file,dir+'/bridge.lock']) {
  try {await access(f);throw new Error('Refusing to overwrite an existing Grok Bot connection.');}
  catch(e){if(e.code!=='ENOENT')throw e;}
}
const browser=await chromium.launch({channel:process.env.LAB_BROWSER??'msedge',headless:true});
const errors=[];let wrote=false;
async function snapshot(bots,connection='connected',observedAt=Date.now()) {
  await writeFile(dir+'/test-snapshot.tmp',JSON.stringify({version:1,source:'grok-bot',connection,observedAt,bots}));
  await rename(dir+'/test-snapshot.tmp',file);wrote=true;
}
try {
  const context=await browser.newContext({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await context.addInitScript(()=>{
    localStorage.setItem('agent-office.profile',JSON.stringify({name:'Visual review',color:'#527a70',look:{skin:2,hair:1,style:2}}));
    localStorage.setItem('agent-office.settings',JSON.stringify({muted:true,musicMuted:true,notify:false}));
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  assert.equal((await context.request.get(base+'/api/simulation')).status(),401);
  await page.goto(base+'/login.html');await page.locator('#password').fill('dev');await page.locator('#submit').click();
  await page.waitForURL(base+'/');await page.locator('canvas[data-ready="true"]').waitFor();
  await page.waitForFunction(()=>document.querySelector('#roster')?.textContent.includes('waiting for its team'));
  assert.equal((await (await context.request.get(base+'/api/simulation')).json()).bots.length,0);
  await page.screenshot({path:out+'/house.jpg',quality:85});
  await page.getByRole('button',{name:'Connect Grok Bot'}).first().click();await page.locator('dialog[open]').waitFor();
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
  await page.waitForFunction(()=>document.activeElement.id==='house');
  await page.getByRole('button',{name:'Connect Grok Bot'}).first().click();await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Rotate view'}).click();await page.getByRole('button',{name:'Show whole house'}).click();
  const places=['coding','cooking','rest','writing','travel','analysis','meeting'];
  const bots=places.map((activity,i)=>({id:'preview-'+i,name:['Ada','Remy','Milo','Quill','Atlas','Sage','Piper'][i],state:activity==='rest'?'idle':'working',activity,color:['#7ca893','#cb986e','#a59ab5','#8da4b9','#bc9d69','#a2b775','#c2908a'][i],observedAt:Date.now()}));
  await snapshot(bots);await page.waitForFunction(()=>document.querySelectorAll('.bot-row').length===7);
  await page.evaluate(()=>{const banner=document.createElement('div');banner.id='test-banner';banner.textContent='ANIMATION PREVIEW · SYNTHETIC BOTS · NOT LIVE GROK ACTIVITY';Object.assign(banner.style,{position:'absolute',bottom:'110px',left:'24px',background:'#fff4d4',color:'#86652d',padding:'10px 13px',fontSize:'10px',borderRadius:'7px'});document.querySelector('.world').append(banner);});
  await page.waitForTimeout(18000);
  await page.screenshot({path:out+'/animation-preview.jpg',quality:85});
  await page.locator('[data-bot-id="preview-0"]').click();await page.locator('#selection').waitFor({state:'visible'});
  bots[0].name='Ada renamed';await snapshot(bots.map(b=>({...b,observedAt:Date.now()})));
  await page.waitForFunction(()=>document.querySelector('#selection')?.textContent.includes('Ada renamed'));
  await snapshot([], 'error');await page.waitForFunction(()=>document.querySelector('#connection')?.textContent==='Connection lost');
  assert.equal(await page.locator('.bot-row').count(),7);
  assert.equal(await page.locator('.bot-row small').first().textContent(),'Activity unavailable');
  await snapshot(bots,'connected',Date.now()-60000);await page.waitForFunction(()=>document.querySelector('#connection')?.textContent==='Connection stale');
  await snapshot([]);await page.waitForFunction(()=>document.querySelectorAll('.bot-row').length===0);
  assert.equal(await page.locator('#selection').isVisible(),false);
  await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('canvas[data-ready="true"]').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:out+'/mobile.jpg',quality:85,fullPage:true});
  await page.goto(base+'/office.html');await page.waitForFunction(()=>!document.querySelector('#loading')||document.querySelector('#loading')?.classList.contains('hidden'),null,{timeout:45000});
  assert.ok(await page.locator('canvas').count()>0);
  await writeFile(out+'/verification.json',JSON.stringify({base,passed:['auth gate','empty roster','modal Escape and close','camera controls','seven synthetic activity stations','Bot selection','rename','failed poll retains identities','stale poll clears activity','deletion','390px layout','Classic office renders'],errors},null,2));
  assert.deepEqual(errors,[]);console.log('Simulation browser checks passed. Synthetic snapshot removed on exit.');
} finally {if(wrote)await unlink(file);await browser.close();}
