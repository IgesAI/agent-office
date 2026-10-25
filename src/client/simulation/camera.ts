import * as THREE from 'three';

export class HouseCamera {
  readonly camera = new THREE.OrthographicCamera(-15, 15, 12, -12, .1, 150);
  readonly target = new THREE.Vector3(0, 0, 0);
  private yaw = Math.PI / 4;
  private span = 27;
  private drag: { x: number; y: number; atX: number; atZ: number; moved: boolean } | null = null;
  private size = { w: 1, h: 1 };
  constructor(private canvas: HTMLCanvasElement, select: (x: number, y: number) => void) {
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.button !== 1) return;
      this.drag = { x: e.clientX, y: e.clientY, atX: this.target.x, atZ: this.target.z, moved: false };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      const d = this.drag;
      if (!d) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.hypot(dx, dy) < 4 && !d.moved) return;
      d.moved = true;
      const scale = (this.camera.top-this.camera.bottom) / this.size.h;
      this.target.x = THREE.MathUtils.clamp(d.atX - (dx * Math.cos(this.yaw) + dy * Math.sin(this.yaw) * 1.35) * scale, -10, 10);
      this.target.z = THREE.MathUtils.clamp(d.atZ + (dx * Math.sin(this.yaw) - dy * Math.cos(this.yaw) * 1.35) * scale, -8, 8);
      this.update();
    });
    canvas.addEventListener('pointerup', e => {
      if (this.drag && !this.drag.moved) select(e.clientX, e.clientY);
      this.drag = null;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointercancel', () => { this.drag = null; });
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.zoom(Math.exp(e.deltaY * .001)); }, { passive: false });
    canvas.addEventListener('keydown', e => {
      if (e.key === '+' || e.key === '=') this.zoom(.9);
      else if (e.key === '-') this.zoom(1.1);
      else if (e.key.toLowerCase() === 'q') this.rotate(-1);
      else if (e.key.toLowerCase() === 'e') this.rotate(1);
      else if (e.key.toLowerCase() === 'r') this.reset();
      else if (e.key.startsWith('Arrow')) {
        if (e.key === 'ArrowLeft') this.target.x -= .6;
        if (e.key === 'ArrowRight') this.target.x += .6;
        if (e.key === 'ArrowUp') this.target.z -= .6;
        if (e.key === 'ArrowDown') this.target.z += .6;
        this.target.x = THREE.MathUtils.clamp(this.target.x,-10,10);
        this.target.z = THREE.MathUtils.clamp(this.target.z,-8,8);
        this.update();
      } else return;
      e.preventDefault();
    });
    this.update();
  }
  resize(w: number, h: number) { this.size = { w, h }; this.update(); }
  zoom(by: number) { this.span = THREE.MathUtils.clamp(this.span * by, 8, 34); this.update(); }
  rotate(direction: number) { this.yaw += direction * Math.PI / 2; this.update(); }
  reset() { this.target.set(0, 0, 0); this.yaw = Math.PI / 4; this.span = 27; this.update(); }
  focus(x: number, z: number) { this.target.set(x, 0, z); this.span = 13; this.update(); }
  private update() {
    const aspect = this.size.w / this.size.h, half = this.span / 2 * Math.max(1, 1.3 / aspect);
    Object.assign(this.camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
    this.camera.position.set(this.target.x + Math.sin(this.yaw) * 30, 35, this.target.z + Math.cos(this.yaw) * 30);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
}
