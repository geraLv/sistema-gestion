import rateLimit from 'express-rate-limit';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Global rate limiter
 * Desarrollo: 500 req/15min | Producción: 100 req/15min
 */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isDevelopment ? 500 : 100,
    message: {
        success: false,
        error: 'Demasiadas solicitudes desde esta IP. Por favor, intenta de nuevo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Auth rate limiter - protección contra fuerza bruta
 * Desarrollo: 50 intentos/15min | Producción: 5 intentos/15min
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isDevelopment ? 50 : 20,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        error: 'Demasiados intentos de inicio de sesión. Por favor, espera 15 minutos antes de volver a intentar.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * API rate limiter
 * Desarrollo: 100 req/min | Producción: 30 req/min
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: isDevelopment ? 200 : 90,  // 90/min en prod (permite ~3 usuarios activos con 30 req cada uno)
    message: {
        success: false,
        error: 'Límite de solicitudes por minuto excedido. Por favor, reduce la frecuencia de tus peticiones.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict limiter para operaciones sensibles (admin, delete, etc)
 * Desarrollo: 50 req/5min | Producción: 10 req/5min
 */
export const strictLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: isDevelopment ? 50 : 10,
    message: {
        success: false,
        error: 'Límite de operaciones sensibles excedido. Espera 5 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
