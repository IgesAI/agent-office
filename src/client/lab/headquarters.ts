// Vite-only review of the real office builder. No network, fake workers or execution state.
import * as THREE from 'three';
import { createScene, makeRenderer } from '../core/scene';
import { preloadModels } from '../world/models';
import { ready } from './stage';

await preloadModels();
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = makeRenderer(canvas)!;
renderer.info.autoReset = false;
const { scene, camera, effect, holiday, sky, office } = createScene(canvas, renderer);
holiday.group.visible = false;
const q = new URLSearchParams(location.search);
const views: Record<string, { at: number[]; target: number[]; fov: number }> = {
  overview: { at: [1, 6.2, 11], target: [-5, 0.7, -3], fov: 68 },
  workstation: { at: [-14.6, 3.4, -8.9], target: [-10.5, 0.8, -4.6], fov: 44 },
  lounge: { at: [6.3, 3.3, 6], target: [12.4, 0.8, 0], fov: 52 },
  meeting: { at: [5.8, 2.7, 8], target: [11.5, 0.9, 9], fov: 55 },
};
const view = views[q.get('view') ?? 'overview'] ?? views.overview;
camera.position.fromArray(view.at);
camera.lookAt(new THREE.Vector3().fromArray(view.target));
camera.fov = view.fov;
sky.show({ hour: q.get('light') === 'evening' ? 20 : 11, weather: 'clear', intensity: 0 });
sky.update(0, 8, camera);
function render() {
  renderer.info.reset();
  effect.render(scene, camera);
}
function fit() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  render();
}
fit();
addEventListener('resize', fit);
Object.assign(window, { __benchmark: async () => {
  const frames: number[] = [], cpu: number[] = [];
  let last = performance.now();
  for (let i = 0; i < 140; i++) {
    const now = await new Promise<number>(requestAnimationFrame);
    const start = performance.now();
    render();
    if (i >= 20) { frames.push(now - last); cpu.push(performance.now() - start); }
    last = now;
  }
  const percentile = (a: number[], p: number) => [...a].sort((a, b) => a - b)[Math.floor((a.length - 1) * p)];
  return { samples: frames.length, fps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
    frameMsP50: percentile(frames, .5), frameMsP95: percentile(frames, .95), cpuSubmitMsP95: percentile(cpu, .95),
    calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures };
} });
const gl = renderer.getContext();
const debug = gl.getExtension('WEBGL_debug_renderer_info');
ready({ view: q.get('view') ?? 'overview', studioScreens: office.studioScreens.length,
  deskAnchorsIntact: ['desk-1', 'desk-2'].every(id => {
    const d = office.desks.get(id)!;
    return [d.laptopAnchor, d.seatAnchor, d.stage, d.vacancy, d.chair].every(o => o.parent === d.group && o.visible);
  }), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
  gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'not exposed', revision: THREE.REVISION });
