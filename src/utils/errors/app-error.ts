/**
 * Base application error class
 * All custom errors extend from this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error (HTTP 400)
 * Used for input validation failures
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.field = field;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error (HTTP 401)
 * Used when authentication fails or is required
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_ERROR");
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error (HTTP 403)
 * Used when user doesn't have permission
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Permission denied") {
    super(message, 403, "AUTHORIZATION_ERROR");
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error (HTTP 404)
 * Used when a resource is not found
 */
export class NotFoundError extends AppError {
  public readonly resourceType?: string;

  constructor(message: string, resourceType?: string) {
    super(message, 404, "NOT_FOUND");
    this.resourceType = resourceType;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error (HTTP 409)
 * Used for duplicate entries or conflicting states
 */
export class ConflictError extends AppError {
  public readonly conflictingField?: string;

  constructor(message: string, conflictingField?: string) {
    super(message, 409, "CONFLICT_ERROR");
    this.conflictingField = conflictingField;
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Business logic error (HTTP 400)
 * Used for business rule violations
 */
export class BusinessLogicError extends AppError {
  constructor(message: string) {
    super(message, 400, "BUSINESS_LOGIC_ERROR");
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}

/**
 * Database error (HTTP 500)
 * Used for database operation failures
 */
export class DatabaseError extends AppError {
  public readonly originalError?: unknown;

  constructor(message: string = "Database operation failed", originalError?: unknown) {
    super(message, 500, "DATABASE_ERROR");
    this.originalError = originalError;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}
