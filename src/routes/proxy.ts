import { Router, Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export const proxyRouter = Router();

/**
 * Proxy to existing Otto AI backend services.
 * Otto X handles x402 payment on X Layer; backends are called with
 * X-Internal-API-Key to skip their own payment verification.
 */
async function proxyToBackend(
  backendUrl: string,
  path: string,
  queryParams?: Record<string, string>,
): Promise<{ status: number; data: unknown }> {
  const url = new URL(path, backendUrl);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-Internal-API-Key': env.INTERNAL_API_KEY,
      Accept: 'application/json',
    },
  });

  const data = await response.json();
  return { status: response.status, data };
}

// --- Market Intelligence (Market Alpha Agent) ---

/** GET /crypto-news — Real-time crypto news with sentiment analysis */
proxyRouter.get('/crypto-news', (req: Request, res: Response, next: NextFunction): void => {
  logger.info('GET /crypto-news');
  proxyToBackend(env.MARKET_ALPHA_X402_URL, '/crypto-news')
    .then(({ status, data }) => res.status(status).json(data))
    .catch(next);
});

/** GET /token-alpha?symbol=BTC — Premium token intelligence */
proxyRouter.get('/token-alpha', (req: Request, res: Response, next: NextFunction): void => {
  const symbol = req.query.symbol as string;
  if (!symbol) {
    res.status(400).json({ status: 'error', data: 'Missing ?symbol= parameter (e.g. BTC, ETH)' });
    return;
  }
  logger.info('GET /token-alpha', { symbol });
  proxyToBackend(env.MARKET_ALPHA_X402_URL, '/token-alpha', { symbol })
    .then(({ status, data }) => res.status(status).json(data))
    .catch(next);
});

/** GET /kol-sentiment — Aggregated crypto KOL sentiment */
proxyRouter.get('/kol-sentiment', (req: Request, res: Response, next: NextFunction): void => {
  logger.info('GET /kol-sentiment');
  proxyToBackend(env.MARKET_ALPHA_X402_URL, '/kol-sentiment')
    .then(({ status, data }) => res.status(status).json(data))
    .catch(next);
});

/** GET /trending-altcoins — Top trending altcoins with analysis */
proxyRouter.get('/trending-altcoins', (req: Request, res: Response, next: NextFunction): void => {
  logger.info('GET /trending-altcoins');
  proxyToBackend(env.MARKET_ALPHA_X402_URL, '/trending-altcoins')
    .then(({ status, data }) => res.status(status).json(data))
    .catch(next);
});

/** GET /mega-report — Comprehensive daily market briefing */
proxyRouter.get('/mega-report', (req: Request, res: Response, next: NextFunction): void => {
  logger.info('GET /mega-report');
  proxyToBackend(env.MARKET_ALPHA_X402_URL, '/mega-report')
    .then(({ status, data }) => res.status(status).json(data))
    .catch(next);
});

/** GET /token-security?address=0x...&chain=196 — Token contract security audit */
proxyRouter.get('/token-security', (req: Request, res: Response, next: NextFunction): void => {
  const address = req.query.address as string;
  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    res.status(400).json({ status: 'error', data: 'Missing or invalid ?address= parameter (0x-prefixed EVM address)' });
    return;
  }
  const chain = (req.query.chain as string) || '196';
  logger.info('GET /token-security', { address, chain });
  proxyToBackend(env.MARKET_ALPHA_X402_URL, '/token-security', { address, chain })
    .then(({ status, data }) => res.status(status).json(data))
    .catch(next);
});

/** GET /funding-rates?symbol=BTC — Derivatives funding rates & open interest */
proxyRouter.get('/funding-rates', (req: Request, res: Response, next: NextFunction): void => {
  const symbol = (req.query.symbol as string) || '';
  logger.info('GET /funding-rates', { symbol });
  proxyToBackend(env.MARKET_ALPHA_X402_URL, '/funding-rates', symbol ? { symbol } : {})
    .then(({ status, data }) => res.status(status).json(data))
    .catch(next);
});

/** GET /defi-analytics?protocol=aave — DeFi protocol analytics */
proxyRouter.get('/defi-analytics', (req: Request, res: Response, next: NextFunction): void => {
  const protocol = (req.query.protocol as string) || '';
  logger.info('GET /defi-analytics', { protocol });
  proxyToBackend(env.MARKET_ALPHA_X402_URL, '/defi-analytics', protocol ? { protocol } : {})
    .then(({ status, data }) => res.status(status).json(data))
    .catch(next);
});

// --- AI Creative Tools (Tools Agent) ---

/** GET /generate-meme?prompt=... — AI image generation via Gemini */
proxyRouter.get('/generate-meme', (req: Request, res: Response, next: NextFunction): void => {
  const prompt = req.query.prompt as string;
  if (!prompt) {
    res.status(400).json({ status: 'error', data: 'Missing ?prompt= parameter (image description)' });
    return;
  }
  logger.info('GET /generate-meme', { prompt: prompt.substring(0, 80) });
  proxyToBackend(env.TOOLS_AGENT_X402_URL, '/generate-meme', { prompt })
    .then(({ status, data }) => res.status(status).json(data))
    .catch(next);
});

/** GET /llm-research?prompt=... — AI research assistant */
proxyRouter.get('/llm-research', (req: Request, res: Response, next: NextFunction): void => {
  const prompt = req.query.prompt as string;
  if (!prompt) {
    res.status(400).json({ status: 'error', data: 'Missing ?prompt= parameter (research question)' });
    return;
  }
  logger.info('GET /llm-research', { prompt: prompt.substring(0, 80) });
  proxyToBackend(env.TOOLS_AGENT_X402_URL, '/llm-research', { prompt })
    .then(({ status, data }) => res.status(status).json(data))
    .catch(next);
});
