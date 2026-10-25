// Read-only render timing of the empty house. No simulated Bots or provider sign-in.
import { chromium } from 'playwright-core';
import { mkdir,writeFile } from 'node:fs/promises';
const base=process.env.SIMULATION_URL??'http://127.0.0.1:4600';
const browser=await chromium.launch({channel:process.env.LAB_BROWSER??'msedge',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  await page.goto(base+'/login.html');await page.locator('#password').fill('dev');
  const started=Date.now();await page.locator('#submit').click();await page.waitForURL(base+'/');
  await page.locator('canvas[data-ready="true"]').waitFor();
  const readyMs=Date.now()-started;
  const metrics=await page.evaluate(async()=>{
    const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
    const intervals=[];let previous=performance.now();
    await new Promise(resolve=>{const frame=now=>{intervals.push(now-previous);previous=now;if(intervals.length<240)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});
    intervals.shift();const sorted=[...intervals].sort((a,b)=>a-b);
    return {fps:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),p95FrameMs:sorted[Math.floor(sorted.length*.95)],gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable',bots:document.querySelectorAll('.bot-row').length};
  });
  const report={base,viewport:[1440,960],dpr:1,readyMs,...metrics};
  await mkdir('artifacts/simulation',{recursive:true});await writeFile('artifacts/simulation/benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
