import * as THREE from 'three';
import { buildHouse } from './house';
import { HouseCamera } from './camera';
import { Actors } from './actors';
import { pollRoster } from './feed';
import { HouseUI, element } from './ui';

export async function startHouse() {
  const canvas=element<HTMLCanvasElement>('house');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f0f0e8');
  scene.add(new THREE.HemisphereLight('#fff6df','#9caa91',1.8));
  const sun=new THREE.DirectionalLight('#fff2d7',2.8);sun.position.set(-10,20,10);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:.1,far:70});
  sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#efefe5',roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.67;ground.receiveShadow=true;scene.add(ground);
  const actors=new Actors(scene),ray=new THREE.Raycaster();
  const camera=new HouseCamera(canvas,(x,y)=>{
    const rect=canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),camera.camera);
    choose(actors.pick(ray));
  });
  function choose(id:string|null) {
    actors.select(id);ui.select(id);
    const p=id?actors.position(id):null;if(p)camera.focus(p.x,p.z);
  }
  const ui=new HouseUI(choose,(x,z)=>camera.focus(x,z));
  const observer=new ResizeObserver(()=>{
    const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;
    renderer.setSize(width,height,false);camera.resize(width,height);
  });observer.observe(canvas);
  element('zoom-in').onclick=()=>camera.zoom(.85);element('zoom-out').onclick=()=>camera.zoom(1.18);
  element('rotate').onclick=()=>camera.rotate(1);element('reset').onclick=()=>camera.reset();
  const media=matchMedia('(prefers-reduced-motion: reduce)');let paused=media.matches;
  const pause=element<HTMLButtonElement>('pause');
  const updatePause=()=>{pause.setAttribute('aria-pressed',String(paused));pause.replaceChildren(document.createTextNode(paused?'▷ ':'Ⅱ '),Object.assign(document.createElement('span'),{textContent:paused?'Play':'Pause'}));};
  pause.onclick=()=>{paused=!paused;updatePause();};updatePause();
  const {missing}=await buildHouse(scene);
  const loading=element('loading');
  if(missing.length)loading.textContent='Some furnishings could not load. Refresh to try again.';else loading.hidden=true;
  const stop=pollRoster(snapshot=>{actors.sync(snapshot.bots,paused);ui.render(snapshot);});
  let last=performance.now();
  renderer.setAnimationLoop(now=>{
    const dt=Math.min((now-last)/1000,.05);last=now;
    if(!document.hidden) { if(!paused)actors.update(dt);renderer.render(scene,camera.camera); }
  });
  canvas.dataset.ready='true';
  window.addEventListener('pagehide',event=>{if(!event.persisted){stop();observer.disconnect();renderer.setAnimationLoop(null);renderer.dispose();}});
}
