import { Router, Request, Response, NextFunction } from 'express';
import { getMarketAlpha } from '../services/market-alpha-service.js';
import { logger } from '../lib/logger.js';

export const marketAlphaRouter = Router();

marketAlphaRouter.get('/market-alpha', (_req: Request, res: Response, next: NextFunction): void => {
  logger.info('GET /market-alpha');

  getMarketAlpha()
    .then((result) => {
      const statusCode = result.status === 'success' ? 200 : 500;
      res.status(statusCode).json(result);
    })
    .catch(next);
});
