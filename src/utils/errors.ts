/**
 * Base error class for application errors
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Maintain proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 404 - Resource not found
 */
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404);
    }
}

/**
 * 400 - Validation error
 */
export class ValidationError extends AppError {
    public readonly errors?: any;

    constructor(message: string = 'Validation failed', errors?: any) {
        super(message, 400);
        this.errors = errors;
    }
}

/**
 * 401 - Unauthorized (authentication required)
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401);
    }
}

/**
 * 403 - Forbidden (insufficient permissions)
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(message, 403);
    }
}

/**
 * 409 - Conflict (e.g., duplicate resource)
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict') {
        super(message, 409);
    }
}

/**
 * 500 - Internal server error
 */
export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error') {
        super(message, 500, false); // Not operational - unexpected errors
    }
}
