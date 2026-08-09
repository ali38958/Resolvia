/**
 * Password reset route
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { CONFIG } = require('../config/app');
const bcrypt = require('bcrypt');
const { transporter } = require('../config/email');
const { generateOTP, hashOTP, verifyOTP, canSendOTP, storeOTP, verifyAndUseOTP } = require('../utils/otp');

router.post('/reset-password', async (req, res) => {
    const connection = await getDBPool().then(pool => pool.getConnection());

    try {
        await connection.beginTransaction();

        const { email, otpCode, newPassword, confirmPassword, action } = req.body;

        if (action === 'send-otp') {
            // ========== SEND OTP ==========
            if (!email || !email.includes('@')) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid email address'
                });
            }

            // Check if email exists in the system
            const userInfo = await getUserTypeByEmail(email);
            if (!userInfo) {
                return res.status(400).json({
                    success: false,
                    message: 'Email not found in our system.'
                });
            }

            // Check rate limiting
            const canSendResult = await canSendOTP(email, 'password_reset');
            if (!canSendResult.canSend) {
                return res.status(429).json({
                    success: false,
                    message: canSendResult.reason
                });
            }

            // Generate and store OTP
            const otp = generateOTP();
            const otpHash = await hashOTP(otp);
            await storeOTP(email, otpHash, 'password_reset');

            // Send email
            const mailOptions = {
                from: `Resolvia <${CONFIG.GMAIL_USER}>`,
                to: email,
                subject: 'Your Password Reset OTP Code for Resolvia',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #085144; margin-bottom: 10px;">Resolvia</h2>
                            <p style="color: #666;">Complaint Management System</p>
                        </div>
                        
                        <p>Hello,</p>
                        <p>You have requested to reset your password for Resolvia. Use the following OTP to complete the process:</p>
                        
                        <div style="background: linear-gradient(135deg, #085144, #0a7c69); padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
                            <div style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: white; padding: 10px;">
                                ${otp}
                            </div>
                        </div>
                        
                        <p>This OTP is valid for <strong>${CONFIG.OTP_LIFE_MINUTES} minutes</strong>.</p>
                        
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #085144;">
                            <p style="margin: 0; color: #666; font-size: 14px;">
                                <strong>Security Notice:</strong> If you did not request this password reset, please contact our support team immediately.
                            </p>
                        </div>
                        
                        <p>If you didn't request this OTP, please ignore this email.</p>
                        
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                        
                        <div style="text-align: center; color: #999; font-size: 12px;">
                            <p>This is an automated message. Please do not reply to this email.</p>
                            <p>© ${new Date().getFullYear()} Resolvia. All rights reserved.</p>
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);

            await connection.commit();

            res.json({
                success: true,
                message: `OTP sent successfully to ${email}. It will expire in ${CONFIG.OTP_LIFE_MINUTES} minutes.`,
                cooldown: CONFIG.OTP_RESEND_COOLDOWN_SECONDS
            });

        } else if (action === 'reset-password') {
            // ========== VERIFY OTP AND RESET PASSWORD ==========
            if (!email || !otpCode || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            // Validate email
            if (!email.includes('@')) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid email address.'
                });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Passwords do not match.'
                });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long.'
                });
            }

            if (otpCode.length !== CONFIG.OTP_LENGTH) {
                return res.status(400).json({
                    success: false,
                    message: `OTP must be ${CONFIG.OTP_LENGTH} digits.`
                });
            }

            // Check if email exists in the system
            const userInfo = await getUserTypeByEmail(email);
            if (!userInfo) {
                return res.status(400).json({
                    success: false,
                    message: 'Email not found in our system.'
                });
            }

            // Verify OTP
            const otpResult = await verifyAndUseOTP(email, otpCode, 'password_reset');

            if (!otpResult.success) {
                return res.status(400).json(otpResult);
            }

            // Hash new password
            const passwordHash = await bcrypt.hash(newPassword, 10);

            // Update password in the appropriate table
            const updateSuccess = await updatePasswordInTable(
                userInfo.table,
                userInfo.idField,
                userInfo.userId,
                passwordHash
            );

            if (!updateSuccess) {
                throw new Error('Failed to update password');
            }

            await connection.commit();

            res.json({
                success: true,
                message: 'Password reset successfully! Redirecting to login...'
            });

        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }

    } catch (error) {
        await connection.rollback();
        console.error('Reset password error:', error);

        res.status(500).json({
            success: false,
            message: 'An error occurred while resetting password. Please try again.'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
