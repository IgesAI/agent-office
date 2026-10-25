import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { emptySimulation, parseSimulation, type SimulationSnapshot } from '../../shared/simulation.js';

export const botScope = (accountId?: string) => accountId ? createHash('sha256').update(accountId).digest('hex') : 'shared';
export async function readSimulation(dataDir: string, accountId?: string): Promise<SimulationSnapshot> {
  const file = path.join(dataDir, 'grok-bot', botScope(accountId), 'snapshot.json');
  try {
    if ((await stat(file)).size > 1024 * 1024) throw new Error('Snapshot too large');
    const text = await readFile(file, 'utf8');
    if (Buffer.byteLength(text) > 1024 * 1024) throw new Error('Snapshot too large');
    return parseSimulation(JSON.parse(text));
  } catch (e) {
    const snapshot = emptySimulation();
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') snapshot.connection = 'error';
    return snapshot;
  }
}
