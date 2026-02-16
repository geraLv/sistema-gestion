import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';

// Formato personalizado para consola (desarrollo)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
    })
);

// Formato para archivos (JSON estructurado)
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Transport para errores únicamente
const errorFileTransport = new DailyRotateFile({
    filename: path.join('logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
});

// Transport para todos los logs
const combinedFileTransport = new DailyRotateFile({
    filename: path.join('logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
});

// Crear logger principal
const logger = winston.createLogger({
    level: isProd ? 'info' : 'debug',
    format: fileFormat,
    transports: [
        errorFileTransport,
        combinedFileTransport,
    ],
    // Evitar que Winston crashee el proceso en caso de error
    exitOnError: false,
});

// En desarrollo, también mostrar en consola con colores
if (!isProd) {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
    }));
}

// Helper methods para logging estructurado
export const logInfo = (message: string, meta?: object) => {
    logger.info(message, meta);
};

export const logError = (message: string, error?: Error | any, meta?: object) => {
    logger.error(message, {
        ...meta,
        error: error?.message,
        stack: error?.stack,
    });
};

export const logWarn = (message: string, meta?: object) => {
    logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: object) => {
    logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: object) => {
    logger.http(message, meta);
};

export default logger;
