import type { Ctx } from '../../core/context';
import { store } from '../../state';
import { paintScreen } from '../workers/laptop';

/** Mirrors the existing authenticated terminal frames; never derives execution from animations. */
export function installHeadquarters(ctx: Ctx) {
  const drawn = new Map<string, string>();
  // An open transport is not yet a reconciled snapshot after a reconnect.
  let synchronized = false;
  function repaint() {
    const connected = ctx.net.up && synchronized;
    for (const screen of ctx.office.studioScreens) {
      const worker = [...store.workers.values()].find(w => w.deskId === screen.deskId);
      const frame = worker && store.screens.get(worker.id);
      const key = `${store.floor}|${connected}|${worker?.id}|${worker?.status}|${worker?.name}|${frame?.version}`;
      if (drawn.get(screen.deskId) === key) continue;
      drawn.set(screen.deskId, key);
      const g = screen.canvas.getContext('2d')!;
      const { width, height } = screen.canvas;
      const unavailable = !connected ? 'Waiting for office connection' : !worker ? 'Available workstation' : 'Waiting for terminal frame';
      const header = connected && worker ? 32 : 0;
      g.save();
      g.translate(0, header);
      paintScreen(g, width, height - header, connected ? frame : undefined, unavailable);
      g.restore();
      // Real worker identity/status; safely painted as text, never interpreted as markup.
      if (connected && worker) {
        g.fillStyle = '#141b1d';
        g.fillRect(0, 0, width, 32);
        g.fillStyle = '#c4d3cf';
        g.font = '18px system-ui';
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.fillText(`${worker.name} · ${worker.status.replaceAll('_', ' ')}`, 16, 16, width - 32);
      }
      screen.texture.needsUpdate = true;
    }
  }
  store.on('workers', repaint);
  store.on('screens', repaint);
  store.on('floor', repaint);
  ctx.net.onStatus(() => { synchronized = false; repaint(); });
  ctx.messages.on('welcome', () => { synchronized = true; repaint(); });
  ctx.messages.on('floor.enter', () => { synchronized = true; repaint(); });
  repaint();
}
