// Placeholder for validation logic
// In the future, replace this with Zod or another validation library

import { Request, Response, NextFunction } from 'express';

export const validateCreateCompany = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  //   const { name, address, email } = req.body;

  //   if (!name || typeof name !== 'string') {
  //     return res.status(400).json({ error: 'Invalid or missing company name' });
  //   }

  //   if (!address || typeof address !== 'string') {
  //     return res.status(400).json({ error: 'Invalid or missing company address' });
  //   }

  //   if (!email || typeof email !== 'string' || !email.includes('@')) {
  //     return res.status(400).json({ error: 'Invalid or missing company email' });
  //   }

  next();
};
