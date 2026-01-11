import { AuthenticationError, AuthorizationError } from "@/utils/errors";
import { AccessTokenPayload } from "@/utils/generate-tokens";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;

/**
 * Authenticate middleware - verifies JWT access token
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("No token provided");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new AuthenticationError("Invalid token format");
    }

    // Verify token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError("Invalid token"));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError("Token has expired"));
    } else {
      next(error);
    }
  }
};

/**
 * Require specific role(s)
 */
export const requireRole = (allowedRoles: Array<"user" | "bendahara">) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError("Authentication required");
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
export const requireBendahara = requireRole(["bendahara"]);

/**
 * Require user role (both user and bendahara can access)
 */
export const requireUser = requireRole(["user"]);
