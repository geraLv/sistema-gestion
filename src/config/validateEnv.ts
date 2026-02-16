export function validateEnv() {
    const required = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please check your .env file and ensure all required variables are set.');
        process.exit(1);
    }

    // Validate JWT_SECRET length
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        console.error('❌ JWT_SECRET must be at least 32 characters long for security.');
        console.error('Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        process.exit(1);
    }

    // Validate JWT_REFRESH_SECRET length
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
        console.error('❌ JWT_REFRESH_SECRET must be at least 32 characters long for security.');
        process.exit(1);
    }

    console.log('✅ Environment variables validated successfully');
}
