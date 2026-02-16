import { Request, Response, NextFunction } from 'express';
import Sentry from '@sentry/node';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

/**
 * Async handler wrapper to catch promise rejections
 * Eliminates the need for try-catch in every route handler
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Centralized error handling middleware
 * Must be registered AFTER all routes
 */
export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Default to 500 if not an AppError
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const isOperational = err instanceof AppError ? err.isOperational : false;

    // Log error with context
    const errorLog = {
        message: err.message,
        statusCode,
        isOperational,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: (req as any).user?.id,
        stack: err.stack,
    };

    // Log based on severity
    if (statusCode >= 500) {
        logger.error('Server error', errorLog);

        // Capture in Sentry for 5xx errors
        Sentry.captureException(err, {
            contexts: {
                request: {
                    method: req.method,
                    url: req.originalUrl,
                    headers: req.headers,
                },
            },
            user: (req as any).user ? {
                id: (req as any).user.iduser || (req as any).user.id,
                username: (req as any).user.usuario,
                email: (req as any).user.email,
            } : undefined,
            tags: {
                statusCode: String(statusCode),
                isOperational: String(isOperational),
            },
        });
    } else if (statusCode >= 400) {
        logger.warn('Client error', errorLog);
    }

    // Prepare response
    const isDevelopment = process.env.NODE_ENV !== 'production';

    const errorResponse: any = {
        success: false,
        error: err.message,
        statusCode,
    };

    // Include validation errors if present
    if (err instanceof AppError && (err as any).errors) {
        errorResponse.errors = (err as any).errors;
    }

    // Include stack trace only in development
    if (isDevelopment && err.stack) {
        errorResponse.stack = err.stack;
    }

    // Send response
    res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    const error = new AppError(`Route not found: ${req.method} ${req.path}`, 404);
    next(error);
};
