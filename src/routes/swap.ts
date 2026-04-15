import { Router, Request, Response, NextFunction } from 'express';
import { executeSwap } from '../services/swap-service.js';
import { logger } from '../lib/logger.js';
import type { SwapRequest } from '../types/swap.js';

export const swapRouter = Router();

swapRouter.post('/swap', (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as SwapRequest;

  logger.info('POST /swap', {
    fromToken: body?.fromToken,
    toToken: body?.toToken,
    amount: body?.amount,
    userWalletAddress: body?.userWalletAddress,
  });

  executeSwap(body)
    .then((result) => {
      const statusCode = result.status === 'success' ? 200 : 400;
      res.status(statusCode).json(result);
    })
    .catch(next);
});
