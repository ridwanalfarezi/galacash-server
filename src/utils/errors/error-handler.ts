import { NextFunction, Request, Response } from "express";
import { logger } from "../logger";
import { AppError } from "./app-error";

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    field?: string;
    stack?: string;
  };
}

/**
 * Global error handler middleware
 * Catches all errors and sends formatted response
 */
export const globalErrorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Log error
  logger.error("Error occurred:", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Handle known AppError instances
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code || "INTERNAL_SERVER_ERROR",
        message: error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      },
    };

    // Add field info for validation errors
    if ("field" in error && error.field) {
      response.error.field = error.field as string;
    }

    res.status(error.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (error.name === "PrismaClientKnownRequestError") {
    const prismaError = error as unknown as { code?: string; meta?: { target?: string[] } };

    if (prismaError.code === "P2002") {
      // Unique constraint violation
      const field = prismaError.meta?.target?.[0] || "field";
      res.status(409).json({
        success: false,
        error: {
          code: "CONFLICT_ERROR",
          message: `${field} already exists`,
          field,
        },
      });
      return;
    }

    if (prismaError.code === "P2025") {
      // Record not found
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Record not found",
        },
      });
      return;
    }
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      error: {
        code: "TOKEN_INVALID",
        message: "Invalid token",
      },
    });
    return;
  }

  if (error.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      error: {
        code: "TOKEN_EXPIRED",
        message: "Token has expired",
      },
    });
    return;
  }

  // Handle Multer errors
  if (error.name === "MulterError") {
    const multerError = error as unknown as { code?: string };

    if (multerError.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: "File size exceeds the allowed limit",
        },
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: {
        code: "FILE_UPLOAD_FAILED",
        message: error.message,
      },
    });
    return;
  }

  // Handle unexpected errors
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
        stack: error.stack,
      }),
    },
  });
};

/**
 * Async handler wrapper
 * Catches async errors and passes to global error handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
