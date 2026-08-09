const bcrypt = require('bcrypt');
const { CONFIG } = require('../config/app');
const { getDBPool } = require('../config/db');

function generateOTP() {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < CONFIG.OTP_LENGTH; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

async function hashOTP(otp) {
    return bcrypt.hash(otp, 10);
}

async function verifyOTP(providedOTP, storedHash) {
    return bcrypt.compare(providedOTP, storedHash);
}

async function cleanupExpiredOTPs() {
    try {
        const pool = await getDBPool();
        const result = await pool.execute(
            'DELETE FROM email_otp WHERE expires_at < NOW()'
        );
        if (result[0].affectedRows > 0) {
            console.log(`🧹 Cleaned up ${result[0].affectedRows} expired OTPs`);
        }
    } catch (error) {
        console.error('Error cleaning up expired OTPs:', error);
    }
}

async function canSendOTP(email, purpose = 'signup') {
    const pool = await getDBPool();

    const [attemptsResult] = await pool.execute(
        `SELECT SUM(attempts_today) as total_attempts 
         FROM email_otp 
         WHERE email = ? AND purpose = ? AND DATE(last_sent_at) = CURDATE()`,
        [email, purpose]
    );

    const totalAttempts = attemptsResult[0].total_attempts || 0;

    if (totalAttempts >= CONFIG.MAX_DAILY_ATTEMPTS) {
        return {
            canSend: false,
            reason: `Maximum OTP attempts (${CONFIG.MAX_DAILY_ATTEMPTS}) reached for today. Please try again tomorrow.`
        };
    }

    const [lastSentResult] = await pool.execute(
        `SELECT last_sent_at, 
                TIMESTAMPDIFF(SECOND, last_sent_at, NOW()) as seconds_since_last
         FROM email_otp 
         WHERE email = ? AND purpose = ?
         ORDER BY last_sent_at DESC 
         LIMIT 1`,
        [email, purpose]
    );

    if (lastSentResult.length > 0) {
        const secondsSinceLast = lastSentResult[0].seconds_since_last;

        if (secondsSinceLast < CONFIG.OTP_RESEND_COOLDOWN_SECONDS) {
            const waitTime = CONFIG.OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast;
            return {
                canSend: false,
                reason: `Please wait ${waitTime} seconds before requesting another OTP`
            };
        }
    }

    return { canSend: true };
}

async function storeOTP(email, otpHash, purpose) {
    const pool = await getDBPool();

    await pool.execute(
        'DELETE FROM email_otp WHERE email = ? AND purpose = ?',
        [email, purpose]
    );

    await pool.execute(
        `INSERT INTO email_otp 
         (email, otp_hash, purpose, attempts_today, last_sent_at, expires_at) 
         VALUES (?, ?, ?, 1, NOW(), NOW() + INTERVAL ? MINUTE)`,
        [email, otpHash, purpose, CONFIG.OTP_LIFE_MINUTES]
    );

    return true;
}

async function verifyAndUseOTP(email, providedOTP, purpose = 'signup') {
    const pool = await getDBPool();

    const [otpRecords] = await pool.execute(
        `SELECT otp_id, otp_hash, attempts_today 
         FROM email_otp 
         WHERE email = ? AND purpose = ? AND expires_at > NOW()
         ORDER BY created_at DESC 
         LIMIT 1`,
        [email, purpose]
    );

    if (otpRecords.length === 0) {
        return {
            success: false,
            message: 'No valid OTP found. Please request a new one.'
        };
    }

    const record = otpRecords[0];

    const isValid = await verifyOTP(providedOTP, record.otp_hash);

    if (!isValid) {
        const newAttempts = Math.min(record.attempts_today + 1, CONFIG.MAX_DAILY_ATTEMPTS);
        await pool.execute(
            'UPDATE email_otp SET attempts_today = ? WHERE otp_id = ?',
            [newAttempts, record.otp_id]
        );

        const attemptsLeft = CONFIG.MAX_DAILY_ATTEMPTS - newAttempts;
        return {
            success: false,
            message: `Invalid OTP. ${attemptsLeft > 0 ? `${attemptsLeft} attempt(s) left.` : 'No attempts left for today.'}`
        };
    }

    await pool.execute(
        'DELETE FROM email_otp WHERE otp_id = ?',
        [record.otp_id]
    );

    return { success: true };
}

module.exports = {
    generateOTP,
    hashOTP,
    verifyOTP,
    cleanupExpiredOTPs,
    canSendOTP,
    storeOTP,
    verifyAndUseOTP
};
