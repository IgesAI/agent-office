import type { Route } from '../router.js';
import { send } from '../util.js';
import { readSimulation } from '../../simulation/snapshot.js';

export const simulationRoutes = {
  roster: { path: '/api/simulation', method: 'GET', auth: 'session',
    async handle(ctx, { res, session }) {
      return send(res, 200, await readSimulation(ctx.cfg.dataDir, session.account?.id));
    },
  },
} satisfies Record<string, Route>;
