import { Router, Request, Response, NextFunction } from 'express';
import { getTokenPrice } from '../okx/market-client.js';
import { getAllTokens } from '../okx/dex-client.js';
import { getApproveTransaction } from '../okx/dex-client.js';
import { logger } from '../lib/logger.js';

export const dexRouter = Router();

/** GET /price?token=0x... — Single token USD price via DEX quote */
dexRouter.get('/price', (req: Request, res: Response, next: NextFunction): void => {
  const token = req.query.token as string;

  if (!token || !token.match(/^0x[a-fA-F0-9]{40}$/)) {
    res.status(400).json({ status: 'error', data: 'Missing or invalid ?token= parameter (EVM address required)' });
    return;
  }

  logger.info('GET /price', { token });

  getTokenPrice(token.toLowerCase())
    .then((result) => {
      if (!result) {
        res.status(404).json({ status: 'error', data: 'Token not found or not tradeable on X Layer DEX' });
        return;
      }
      res.json({
        status: 'success',
        data: {
          ...result,
          chain: 'X Layer (196)',
          source: 'OKX DEX Aggregator',
          timestamp: new Date().toISOString(),
        },
      });
    })
    .catch(next);
});

/** GET /all-tokens — Full list of all tokens supported on X Layer DEX */
dexRouter.get('/all-tokens', (_req: Request, res: Response, next: NextFunction): void => {
  logger.info('GET /all-tokens');

  getAllTokens()
    .then((tokens) => {
      res.json({
        status: 'success',
        data: {
          chain: 'X Layer (196)',
          count: tokens.length,
          tokens,
        },
      });
    })
    .catch(next);
});

/** GET /approve?token=0x...&amount=1000000 — ERC-20 approval calldata for DEX router */
dexRouter.get('/approve', (req: Request, res: Response, next: NextFunction): void => {
  const token = req.query.token as string;
  const amount = req.query.amount as string;

  if (!token || !token.match(/^0x[a-fA-F0-9]{40}$/)) {
    res.status(400).json({ status: 'error', data: 'Missing or invalid ?token= parameter' });
    return;
  }
  if (!amount || !/^\d+$/.test(amount)) {
    res.status(400).json({ status: 'error', data: 'Missing or invalid ?amount= parameter (smallest units)' });
    return;
  }

  logger.info('GET /approve', { token, amount });

  getApproveTransaction(token.toLowerCase(), amount)
    .then((approval) => {
      res.json({
        status: 'success',
        data: {
          token,
          amount,
          tx: {
            to: approval.dexContractAddress,
            data: approval.data,
            gasLimit: approval.gasLimit,
            gasPrice: approval.gasPrice,
          },
          chain: 'X Layer (196)',
        },
      });
    })
    .catch(next);
});
