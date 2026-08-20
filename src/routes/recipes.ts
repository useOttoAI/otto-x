/**
 * Recipe routes — the paid composite endpoints. Flat top-level paths (NEVER
 * /recipes/*, which the free recipe-listing pages own and which mount BEFORE
 * the paywall — a paid /recipes/<x> would be swallowed by that earlier free
 * handler and serve HTML instead of 402ing).
 *
 * Each handler is thin: validate the manifest-declared input, build the leg
 * fetchers, and hand off to runRecipe (which owns the #1-rule core guard and
 * the degraded-leg naming). GET + query params only (OKX A2MCP defaults to GET;
 * POST 405s there).
 */
import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import { recipeByPath } from '../config/recipes.js';
import {
  runRecipe,
  vetTokenFetchers,
  tokenDeepDiveFetchers,
  rwaPulseFetchers,
  resolveXLayerAddress,
} from '../lib/recipe-engine.js';

export const recipesRouter = Router();

const EVM_ADDR = /^0x[a-fA-F0-9]{40}$/;

/** Token Safety & Liquidity Vetting */
recipesRouter.get('/vet-token', (req: Request, res: Response, next: NextFunction): void => {
  const address = (req.query.address as string) || '';
  if (!EVM_ADDR.test(address)) {
    res.status(400).json({ status: 'error', data: 'Missing or invalid ?address= (0x-prefixed EVM address on X Layer)' });
    return;
  }
  const spec = recipeByPath('/vet-token')!;
  logger.info('GET /vet-token', { address });
  runRecipe(spec, vetTokenFetchers(address.toLowerCase()))
    .then(({ status, body }) => res.status(status).json(body))
    .catch(next);
});

/** Token Deep-Dive */
recipesRouter.get('/token-deep-dive', (req: Request, res: Response, next: NextFunction): void => {
  const symbol = ((req.query.symbol as string) || '').trim();
  if (!symbol || symbol.length > 20) {
    res.status(400).json({ status: 'error', data: 'Missing or invalid ?symbol= (e.g. BTC, ETH, SOL)' });
    return;
  }
  const spec = recipeByPath('/token-deep-dive')!;
  logger.info('GET /token-deep-dive', { symbol });
  resolveXLayerAddress(symbol)
    .then((address) => runRecipe(spec, tokenDeepDiveFetchers(symbol, address)))
    .then(({ status, body }) => res.status(status).json(body))
    .catch(next);
});

/** RWA Market Pulse — no input */
recipesRouter.get('/rwa-pulse', (_req: Request, res: Response, next: NextFunction): void => {
  const spec = recipeByPath('/rwa-pulse')!;
  logger.info('GET /rwa-pulse');
  runRecipe(spec, rwaPulseFetchers())
    .then(({ status, body }) => res.status(status).json(body))
    .catch(next);
});
