import { ValidationError } from "@/utils/errors";
import { NextFunction, Request, Response } from "express";
import { Schema } from "joi";

/**
 * Validate request body middleware
 */
export const validateBody = (schema: Schema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      next(new ValidationError(message));
      return;
    }

    req.body = value;
    next();
  };
};

/**
 * Validate query parameters middleware
 */
export const validateQuery = (schema: Schema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      next(new ValidationError(message));
      return;
    }

    // In Express 5+, req.query is read-only, so we update it via Object.assign
    Object.assign(req.query, value);
    next();
  };
};

/**
 * Validate route params middleware
 */
export const validateParams = (schema: Schema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      next(new ValidationError(message));
      return;
    }

    req.params = value;
    next();
  };
};
