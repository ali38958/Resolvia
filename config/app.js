const CONFIG = {
    OTP_LIFE_MINUTES: parseInt(process.env.OTP_LIFE_MINUTES) || 5,
    OTP_RESEND_COOLDOWN_SECONDS: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
    MAX_DAILY_ATTEMPTS: parseInt(process.env.MAX_DAILY_ATTEMPTS) || 5,
    OTP_LENGTH: parseInt(process.env.OTP_LENGTH) || 6,
    PORT: process.env.PORT || 80,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'complaints_management_db',
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    RECIPIENT_EMAIL: process.env.RECIPIENT_EMAIL
};

const JWT_CONFIG = {
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret-key-change-in-production',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-key-change-in-production',
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '30d'
};

module.exports = { CONFIG, JWT_CONFIG };
