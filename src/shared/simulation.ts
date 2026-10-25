/** Read-only projection of persistent Bots. Never a replacement for execution state. */
export const BOT_STATES = ['unknown', 'idle', 'working', 'waiting', 'error', 'offline'] as const;
export type BotState = typeof BOT_STATES[number];
export const TASK_PLACES = ['coding', 'cooking', 'travel', 'writing', 'analysis', 'meeting', 'rest', 'general'] as const;
export type TaskPlace = typeof TASK_PLACES[number];
export interface SimulationBot {
  id: string;
  name: string;
  state: BotState;
  color: string;
  observedAt: number;
  task?: string;
  activity?: TaskPlace;
}
export interface SimulationSnapshot {
  version: 1;
  source: 'grok-bot';
  connection: 'connected' | 'disconnected' | 'stale' | 'error';
  observedAt: number;
  bots: SimulationBot[];
}
export const SNAPSHOT_TTL = 45_000;
export function emptySimulation(): SimulationSnapshot {
  return { version: 1, source: 'grok-bot', connection: 'disconnected', observedAt: 0, bots: [] };
}
/** Whitelist every field: credentials, transcript bodies and URLs never reach the browser. */
export function parseSimulation(value: unknown, now = Date.now()): SimulationSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid Bot snapshot');
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || v.source !== 'grok-bot' || !Array.isArray(v.bots) || v.bots.length > 200 ||
    typeof v.observedAt !== 'number' || !Number.isFinite(v.observedAt) || v.observedAt < 0 || v.observedAt > now + 5000) throw new Error('Invalid Bot snapshot');
  const fresh = now - v.observedAt <= SNAPSHOT_TTL;
  const connection = v.connection === 'connected' ? (fresh ? 'connected' : 'stale') : v.connection === 'error' ? 'error' : v.connection === 'stale' ? 'stale' : 'disconnected';
  const ids = new Set<string>();
  const bots = v.bots.map((row): SimulationBot => {
    if (!row || typeof row !== 'object') throw new Error('Invalid Bot');
    const b = row as Record<string, unknown>;
    if (typeof b.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(b.id) || ids.has(b.id) || typeof b.name !== 'string' || !b.name.trim() || b.name.length > 160) throw new Error('Invalid Bot identity');
    ids.add(b.id);
    const observedAt = typeof b.observedAt === 'number' && Number.isFinite(b.observedAt) && b.observedAt >= 0 && b.observedAt <= now + 5000 ? b.observedAt : 0;
    const current = connection === 'connected' && now - observedAt <= SNAPSHOT_TTL;
    const state = current && BOT_STATES.includes(b.state as BotState) ? b.state as BotState : 'unknown';
    const activity = current && TASK_PLACES.includes(b.activity as TaskPlace) ? b.activity as TaskPlace : undefined;
    return { id: b.id, name: b.name, state, observedAt,
      color: typeof b.color === 'string' && /^#[a-f0-9]{6}$/i.test(b.color) ? b.color : '#659b8c',
      task: current && typeof b.task === 'string' ? b.task.slice(0, 280) : undefined, activity };
  });
  return { version: 1, source: 'grok-bot', connection, observedAt: v.observedAt, bots };
}
export function placeForBot(bot: SimulationBot): TaskPlace {
  if (bot.state === 'idle') return 'rest';
  if (bot.state !== 'working') return 'general';
  return bot.activity && bot.activity !== 'rest' ? bot.activity : 'general';
}
