/**
 * OTP configuration & status routes
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { CONFIG } = require('../config/app');

router.post('/check-otp-status', async (req, res) => {
    try {
        const { email, purpose = 'signup' } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const pool = await getDBPool();

        const [otpRecords] = await pool.execute(
            `SELECT 
                expires_at,
                attempts_today,
                TIMESTAMPDIFF(SECOND, NOW(), expires_at) as seconds_remaining
             FROM email_otp 
             WHERE email = ? AND purpose = ?
             ORDER BY created_at DESC 
             LIMIT 1`,
            [email, purpose]
        );

        if (otpRecords.length === 0) {
            return res.json({
                success: false,
                message: 'No active OTP found'
            });
        }

        const record = otpRecords[0];
        const isValid = record.seconds_remaining > 0;

        res.json({
            success: true,
            isValid: isValid,
            expiresAt: record.expires_at,
            secondsRemaining: record.seconds_remaining,
            attemptsUsed: record.attempts_today,
            attemptsLeft: CONFIG.MAX_DAILY_ATTEMPTS - record.attempts_today
        });

    } catch (error) {
        console.error('Check OTP status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check OTP status'
        });
    }
});

router.get('/otp-config', (req, res) => {
    res.json({
        success: true,
        config: {
            otpLifeMinutes: CONFIG.OTP_LIFE_MINUTES,
            otpResendCooldownSeconds: CONFIG.OTP_RESEND_COOLDOWN_SECONDS,
            maxDailyAttempts: CONFIG.MAX_DAILY_ATTEMPTS,
            otpLength: CONFIG.OTP_LENGTH
        }
    });
});

module.exports = router;
