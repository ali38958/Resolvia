/**
 * Signup & user ID check routes
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { CONFIG } = require('../config/app');
const bcrypt = require('bcrypt');
const { transporter } = require('../config/email');
const { validateUserID, checkEmailExistsGlobally } = require('../utils/helpers');
const { generateOTP, hashOTP, verifyOTP, canSendOTP, storeOTP, verifyAndUseOTP } = require('../utils/otp');

router.post('/signup', async (req, res) => {
    const connection = await getDBPool().then(pool => pool.getConnection());

    try {
        await connection.beginTransaction();

        const { userID, fullName, email, otpCode, password, confirmPass, action } = req.body;

        if (action === 'send-otp') {
            // ========== SEND OTP ==========
            if (!email || !email.includes('@')) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid email address'
                });
            }


            // Check if email already exists
            const [existing] = await connection.execute(
                `SELECT id FROM (
                    SELECT customer_id AS id FROM Customer WHERE email = ?
                    UNION
                    SELECT id FROM complaintreceiver WHERE email = ?
                    UNION
                    SELECT id FROM staff WHERE email = ?
                    UNION
                    SELECT id FROM admin WHERE email = ?
                ) AS all_emails`,
                [email, email, email, email]
            );
            // const [existing] = await connection.execute(
            //     'SELECT customer_id FROM Customer WHERE email = ?',
            //     [email]
            // );

            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered. Please login instead.'
                });
            }

            // Check rate limiting
            const canSendResult = await canSendOTP(email, 'signup');
            if (!canSendResult.canSend) {
                return res.status(429).json({
                    success: false,
                    message: canSendResult.reason
                });
            }

            // Generate and store OTP
            const otp = generateOTP();
            const otpHash = await hashOTP(otp);
            await storeOTP(email, otpHash, 'signup');

            // Send email
            const mailOptions = {
                from: `Resolvia <${CONFIG.GMAIL_USER}>`,
                to: email,
                subject: 'Your OTP Code for Resolvia Signup',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #085144; margin-bottom: 10px;">Resolvia</h2>
                            <p style="color: #666;">Complaint Management System</p>
                        </div>
                        
                        <p>Hello,</p>
                        <p>You have requested to sign up for Resolvia. Use the following OTP to complete your registration:</p>
                        
                        <div style="background: linear-gradient(135deg, #085144, #0a7c69); padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
                            <div style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: white; padding: 10px;">
                                ${otp}
                            </div>
                        </div>
                        
                        <p>This OTP is valid for <strong>${CONFIG.OTP_LIFE_MINUTES} minutes</strong>.</p>
                        
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #085144;">
                            <p style="margin: 0; color: #666; font-size: 14px;">
                                <strong>Note:</strong> For security reasons, please do not share this OTP with anyone.
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

        } else if (action === 'verify-signup') {
            // ========== VERIFY AND SIGNUP ==========
            if (!userID || !fullName || !email || !otpCode || !password || !confirmPass) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            // Validate User ID
            if (!validateUserID(userID)) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID must be 3-50 characters and can only contain letters, numbers, underscores, and hyphens.'
                });
            }

            // Validate Full Name
            if (fullName.length < 2 || fullName.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Full name must be between 2 and 100 characters.'
                });
            }

            // Validate Email
            if (!email.includes('@')) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid email address.'
                });
            }

            if (password !== confirmPass) {
                return res.status(400).json({
                    success: false,
                    message: 'Passwords do not match.'
                });
            }

            if (password.length < 8) {
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

            // Check if userID already exists (customer_id)
            const [existingUserID] = await connection.execute(
                'SELECT customer_id FROM Customer WHERE customer_id = ?',
                [userID]
            );

            if (existingUserID.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID already taken. Please choose another.'
                });
            }

            // Check if email already exists
            if (await checkEmailExistsGlobally(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered. Please login instead.'
                });
            }

            // Verify OTP
            const otpResult = await verifyAndUseOTP(email, otpCode, 'signup');

            if (!otpResult.success) {
                return res.status(400).json(otpResult);
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Insert customer with userID as customer_id
            await connection.execute(
                `INSERT INTO Customer 
                 (customer_id, name, email, password_hash, phone_number, picture) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userID, fullName, email, passwordHash, null, '/assets/customers/default.png']
            );

            await connection.commit();

            res.json({
                success: true,
                message: 'Account created successfully! Redirecting to login...'
            });

        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }

    } catch (error) {
        await connection.rollback();
        console.error('Signup error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Email already registered. Please login instead.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again.'
        });
    } finally {
        connection.release();
    }
});

router.post('/check-userid', async (req, res) => {
    try {
        const { userID } = req.body;

        if (!userID) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Validate User ID format
        if (!validateUserID(userID)) {
            return res.json({
                success: false,
                available: false,
                message: 'User ID must be 3-50 characters and can only contain letters, numbers, underscores, and hyphens.'
            });
        }

        const pool = await getDBPool();

        // Check if userID exists
        const [existing] = await pool.execute(
            `SELECT id FROM (
                SELECT customer_id AS id FROM Customer
                UNION
                SELECT id FROM complaintreceiver
                UNION
                SELECT id FROM staff
                UNION
                SELECT id FROM admin
            ) AS all_ids
            WHERE id = ?`,
            [userID]
        );
        // const [existing] = await pool.execute(
        //     'SELECT customer_id FROM Customer WHERE customer_id = ?',
        //     [userID]
        // );



        if (existing.length > 0) {
            return res.json({
                success: true,
                available: false,
                message: 'User ID already taken.'
            });
        }

        res.json({
            success: true,
            available: true,
            message: 'User ID is available.'
        });

    } catch (error) {
        console.error('Check User ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check User ID availability.'
        });
    }
});

router.post('/check-email-exists', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const pool = await getDBPool();

        // Check across all user tables
        const tables = ['Customer', 'Admin', 'ComplaintReceiver', 'Staff'];

        for (const table of tables) {
            let query;
            const idField = table === 'Customer' ? 'customer_id' : 'id';

            // Add status check for tables that have status column
            if (table === 'Customer') {
                query = `SELECT ${idField} FROM ${table} WHERE email = ? AND status = 'Active'`;
            } else if (table === 'Admin' || table === 'ComplaintReceiver') {
                query = `SELECT ${idField} FROM ${table} WHERE email = ? AND status = 'Active'`;
            } else if (table === 'Staff') {
                query = `SELECT ${idField} FROM ${table} WHERE email = ? AND status = 'Active'`;
            } else {
                query = `SELECT ${idField} FROM ${table} WHERE email = ?`;
            }

            const [rows] = await pool.execute(query, [email]);

            if (rows.length > 0) {
                return res.json({
                    success: true,
                    exists: true,
                    message: 'Email found in system',
                    userType: table,
                    userId: rows[0][idField]
                });
            }
        }

        return res.json({
            success: true,
            exists: false,
            message: 'Email not found in our system'
        });

    } catch (error) {
        console.error('Check email exists error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check email'
        });
    }
});

module.exports = router;
