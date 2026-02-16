import * as Sentry from '@sentry/node';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Sentry is optional - if DSN is not configured, it will log a warning but won't crash
 * @returns boolean - true if Sentry was initialized successfully
 */
export const initSentry = (): boolean => {
    const dsn = process.env.SENTRY_DSN;

    // Sentry es opcional - no crashear si no está configurado
    if (!dsn) {
        console.log('⚠️  Sentry DSN not configured - error tracking disabled');
        console.log('   To enable Sentry: Set SENTRY_DSN in .env');
        return false;
    }

    try {
        Sentry.init({
            dsn,
            environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

            // Sampling rates
            tracesSampleRate: isDevelopment ? 1.0 : 0.1, // 100% en dev, 10% en prod

            // Release tracking (opcional - usar package version)
            release: `sistema-gestion@${process.env.npm_package_version || '1.0.0'}`,

            // Before send hook - filtrar errores que no queremos
            beforeSend(event: any, hint: any) {
                // No enviar errores de rate limiting (son esperados)
                const error = hint.originalException;
                if (error && typeof error === 'object' && 'message' in error) {
                    const message = String(error.message);
                    if (message.includes('Too Many Requests') ||
                        message.includes('rate limit')) {
                        return null; // Don't send to Sentry
                    }
                }

                return event;
            },

            // Ignore known/expected errors
            ignoreErrors: [
                'Navigation cancelled',
                'Non-Error promise rejection captured',
                'Network request failed',
            ],
        });

        console.log('✅ Sentry initialized for error tracking');
        console.log(`   Environment: ${process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development'}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Sentry:', error);
        return false;
    }
};

export default Sentry;
