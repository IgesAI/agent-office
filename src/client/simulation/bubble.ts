import * as THREE from 'three';
import { placeForBot, type SimulationBot } from '../../shared/simulation';
import { placeById } from './places';

const SCALE = .0085, MAX = 28;
export interface BubbleLook { icon: string; text: string; tint: string; }

/** What a resident's bubble says, or null when there is nothing verified to say. */
export function bubbleFor(bot: SimulationBot): BubbleLook | null {
  if (bot.state === 'error') return { icon: '!', text: 'Turn failed', tint: '#c67a66' };
  if (bot.state === 'waiting') return { icon: '?', text: 'Needs you', tint: '#d6a44f' };
  if (bot.state === 'idle') return { icon: 'z', text: 'Resting', tint: '#9a95b4' };
  if (bot.state !== 'working') return null;
  const place = placeById(placeForBot(bot));
  const raw = bot.task ?? place?.detail ?? 'Working';
  const text = raw.length > MAX ? raw.slice(0, MAX - 1).trimEnd() + '…' : raw;
  return { icon: place?.icon ?? '…', text, tint: place?.color ?? '#7f957a' };
}

/** A camera-facing speech bubble: a colored icon chip, the task, and a tail toward the Bot. */
export function bubbleSprite(look: BubbleLook): THREE.Sprite {
  const size = 34, pad = 16, chip = size * 1.35, tail = 14;
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!;
  const font = `700 ${size}px "Aptos", "Segoe UI", system-ui, sans-serif`;
  ctx.font = font;
  const w = Math.ceil(chip + pad * 2.6 + ctx.measureText(look.text).width), h = Math.ceil(chip + pad * 1.2);
  canvas.width = w; canvas.height = h + tail;
  ctx.font = font;
  ctx.shadowColor = '#2d443a33'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = look.tint; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, (h - 8) / 2);
  ctx.moveTo(w / 2 - tail, h - 5); ctx.lineTo(w / 2, h + tail - 3); ctx.lineTo(w / 2 + tail, h - 5);
  ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
  ctx.fillStyle = '#fffdf6'; ctx.fillRect(w / 2 - tail + 3, h - 9, tail * 2 - 6, 6);
  const cx = pad + chip / 2, cy = h / 2;
  ctx.fillStyle = look.tint; ctx.beginPath(); ctx.arc(cx, cy, chip / 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${size * .95}px "Segoe UI Symbol", "Aptos", system-ui, sans-serif`; ctx.fillText(look.icon, cx, cy + 1);
  ctx.font = font; ctx.fillStyle = '#34493f'; ctx.textAlign = 'left';
  ctx.fillText(look.text, pad * 1.6 + chip, cy + 1);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, depthTest: false, transparent: true }));
  sprite.scale.set(canvas.width * SCALE, canvas.height * SCALE, 1);
  sprite.center.set(.5, 0); sprite.renderOrder = 12;
  return sprite;
}
