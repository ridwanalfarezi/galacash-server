import { CacheService } from '../services/cache.service.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors/index.js';
import { AccessTokenPayload } from '../utils/generate-tokens.js';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const cacheService = new CacheService();

/**
 * Authenticate middleware - verifies JWT access token from cookie or Authorization header
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try to get token from cookie first, fallback to Authorization header
    let token = req.cookies?.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      const error = new AuthenticationError('No token provided', 'UNAUTHORIZED');
      throw error;
    }

    const isBlacklisted = await cacheService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been invalidated', 'TOKEN_INVALIDATED');
    }

    // Verify token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;

    // Fast-path token version check for instant global session revocation
    if (decoded.sub && decoded.tokenVersion) {
      const activeVersionStr = await cacheService.getCached<string>(
        cacheService.userVersionKey(decoded.sub)
      );
      if (activeVersionStr && parseInt(activeVersionStr, 10) > decoded.tokenVersion) {
        throw new AuthenticationError(
          'Session has been revoked. Please sign in again.',
          'SESSION_REVOKED'
        );
      }
    }

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      const authError = new AuthenticationError('Invalid token', 'INVALID_TOKEN');
      next(authError);
    } else if (error instanceof jwt.TokenExpiredError) {
      const authError = new AuthenticationError('Token has expired', 'TOKEN_EXPIRED');
      next(authError);
    } else {
      next(error);
    }
  }
};

/**
 * Require specific role(s)
 */
export const requireRole = (allowedRoles: Array<'user' | 'bendahara'>) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError("You don't have permission to access this resource");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require bendahara role
 */
export const requireBendahara = requireRole(['bendahara']);

/**
 * Require user role (both user and bendahara can access)
 */
export const requireUser = requireRole(['user', 'bendahara']);
