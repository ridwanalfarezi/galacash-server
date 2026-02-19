import { AuthenticationError } from '@/utils/errors';
import { AccessTokenPayload } from '@/utils/generate-tokens';
import { NextFunction, Request, Response } from 'express';

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
  fileUrl?: string;
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new AuthenticationError('User belum terautentikasi', 'UNAUTHORIZED');
  }
  next();
};

export const getUser = (req: Request): AccessTokenPayload => {
  if (!req.user) {
    throw new AuthenticationError('User belum terautentikasi', 'UNAUTHORIZED');
  }
  return req.user;
};
