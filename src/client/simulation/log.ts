import { placeForBot, type SimulationBot } from '../../shared/simulation';
import { placeById } from './places';

export interface LogEntry { at: number; botId: string; name: string; color: string; text: string; }
const LIMIT = 12;

/** What changed for one Bot, in a sentence, or null when nothing worth noting did. */
export function describeChange(before: SimulationBot | undefined, after: SimulationBot): string | null {
  const place = placeById(placeForBot(after));
  if (after.state === 'working' && (!before || before.state !== 'working' || before.task !== after.task || before.activity !== after.activity)) {
    const where = place ? ` in the ${place.name.toLowerCase()}` : '';
    return after.task ? `${before ? 'started' : 'is on'} “${after.task}”${where}` : `${before ? 'got' : 'is hard at'} work${where}`;
  }
  if (!before) return after.state === 'idle' ? 'is resting' : 'moved in';
  if (after.state === before.state) return null;
  if (after.state === 'idle') return before.state === 'working' ? 'finished and went to rest' : 'is resting';
  if (after.state === 'error') return 'hit a failed turn';
  if (after.state === 'waiting') return 'needs your attention';
  if (after.state === 'unknown' && before.state !== 'unknown') return 'went out of view';
  return null;
}

/** A short, newest-first history of what the household has been doing since this page opened. */
export class ActivityLog {
  readonly entries: LogEntry[] = [];
  private last = new Map<string, SimulationBot>();
  update(bots: SimulationBot[], now = Date.now()) {
    let changed = false;
    for (const bot of bots) {
      const text = describeChange(this.last.get(bot.id), bot);
      if (text) { this.entries.unshift({ at: now, botId: bot.id, name: bot.name, color: bot.color, text }); changed = true; }
      this.last.set(bot.id, bot);
    }
    for (const id of [...this.last.keys()]) if (!bots.some(b => b.id === id)) {
      const gone = this.last.get(id)!; this.last.delete(id);
      this.entries.unshift({ at: now, botId: id, name: gone.name, color: gone.color, text: 'left the house' }); changed = true;
    }
    this.entries.splice(LIMIT);
    return changed;
  }
}

export function ago(at: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}
