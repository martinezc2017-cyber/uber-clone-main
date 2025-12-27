import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export function apiKeyGuard(req: Request, res: Response, next: NextFunction): void {
  if (!config.financeApiKey) {
    return next();
  }
  const key = req.headers['x-finance-key'];
  if (key !== config.financeApiKey) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}
