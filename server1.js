require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 80;




// ====================================================
// ✅ Middleware
// ====================================================
app.use(cors({
    origin: 'http://localhost:80', // or your frontend URL
    credentials: true // Allow cookies
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));







// ====================================================
// ✅ MySQL Connection Pool
// ====================================================
let pool = null;

async function getDBPool() {
    if (pool) return pool;

    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'complaints_management_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    await pool.query('SELECT 1');
    console.log('✅ MySQL pool created');
    return pool;
}




// ====================================================
// ✅ Configuration
// ====================================================
const CONFIG = {
    // OTP Configuration
    OTP_LIFE_MINUTES: parseInt(process.env.OTP_LIFE_MINUTES) || 5,
    OTP_RESEND_COOLDOWN_SECONDS: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
    MAX_DAILY_ATTEMPTS: parseInt(process.env.MAX_DAILY_ATTEMPTS) || 5,
    OTP_LENGTH: parseInt(process.env.OTP_LENGTH) || 6,

    // Server Configuration
    PORT: process.env.PORT || 80,

    // Database Configuration
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'complaints_management_db',

    // Email Configuration
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    RECIPIENT_EMAIL: process.env.RECIPIENT_EMAIL
};

console.log('🔧 Configuration loaded:', {
    OTP_LIFE_MINUTES: CONFIG.OTP_LIFE_MINUTES,
    OTP_RESEND_COOLDOWN_SECONDS: CONFIG.OTP_RESEND_COOLDOWN_SECONDS,
    MAX_DAILY_ATTEMPTS: CONFIG.MAX_DAILY_ATTEMPTS,
    OTP_LENGTH: CONFIG.OTP_LENGTH
});

// ====================================================
// ✅ JWT Configuration
// ====================================================
const JWT_CONFIG = {
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret-key-change-in-production',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-key-change-in-production',
    ACCESS_TOKEN_EXPIRY: '15m', // 15 minutes
    REFRESH_TOKEN_EXPIRY: '30d' // 30 days
};

console.log('🔐 JWT Configuration loaded');

// ====================================================
// ✅ Email Transporter Setup
// ====================================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});





// ====================================================
// ✅ Authentication Middleware (Fixed)
// ====================================================
const authenticateToken = async (req, res, next) => {
    console.log('Verify auth endpoint constant hit');
    try {
        // Get token from cookies or Authorization header
        const token = req.cookies.access_token ||
            req.cookies.accessToken ||
            req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            console.log('No token found');
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET);
        req.user = decoded;
        console.log('Token verified');
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);

        if (error.name === 'TokenExpiredError') {
            console.log('Token expired');
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please refresh or login again.'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            console.log('Invalid token format');
            return res.status(403).json({
                success: false,
                message: 'Invalid token format'
            });
        }

        console.log('Authentication failed');
        return res.status(403).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};




// ====================================================
// ✅ File Upload Configuration
// ====================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'assets', 'staff');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
        }
    }
});





// back-end api.js - Updated with badge counts


// 🔌 HTTP API
// ====================================================
// ✅ Role-Based Navigation (Simple IF Version)
// ====================================================
app.get('/api/pages', authenticateToken, (req, res) => {

    const role = req.user.role.toLowerCase();

    // ================= admin / SUPERADMIN =================
    if (role === 'admin' || role === 'superadmin') {

        const pages = [
            { name: "Dashboard", file: "/admin/dashboard", icon: "fa fa-tachometer-alt", badge: 0 },

            // Management Core
            { name: "priority Management", file: "/admin/priority", icon: "fa fa-exclamation-triangle", badge: 0 },
            { name: "natures", file: "/admin/natures", icon: "fa fa-tags", badge: 1 },

            // Location Structure
            { name: "Colonies", file: "/admin/colonies", icon: "fa fa-city", badge: 1 },
            { name: "Buildings", file: "/admin/buildings", icon: "fa fa-building", badge: 1 },
            { name: "Floors", file: "/admin/floors-management", icon: "fa fa-layer-group", badge: 1 },

            // User Management
            { name: "All Customers", file: "/admin/all-customers", icon: "fa fa-user-friends", badge: 0 },
            { name: "staff", file: "/admin/staff-management", icon: "fa fa-screwdriver-wrench", badge: 1 },
            { name: "Handlers", file: "/admin/handlers", icon: "fa fa-headset", badge: 1 },
            { name: "Admins", file: "/admin/admins", icon: "fa fa-user-shield", badge: 1 },

            // Reporting Section
            { name: "Complaints Report", file: "/admin/complaints-report", icon: "fa-solid fa-file-lines", badge: 1 },
            { name: "Handlers Report", file: "/admin/handlers-reporting", icon: "fa-solid fa-file-lines", badge: 1 },
            { name: "staff Report", file: "/admin/staff-reporting", icon: "fa-solid fa-file-lines", badge: 1 },

            // Account
            { name: "Profile", file: "/admin/profile", icon: "fa fa-user-circle", badge: 0 }
        ];


        return res.json({ success: true, pages });
    }

    // ================= customer =================
    if (role === 'customer') {

        const pages = [
            { name: "Dashboard", file: "/customer/dashboard", icon: "fa fa-tachometer-alt", badge: 0 },

            // Actions
            { name: "Submit Complaint", file: "/customer/submit-complaint", icon: "fa fa-exclamation-circle", badge: 0 },
            { name: "Submit Found", file: "/customer/submit-found", icon: "fa fa-hand-holding", badge: 0 },

            // Records
            { name: "My Complaints", file: "/customer/my-complaints", icon: "fa fa-clipboard-list", badge: 0 },
            { name: "Found Items", file: "/customer/found-items", icon: "fa fa-box-open", badge: 0 },
            { name: "My Found Items", file: "/customer/my-found-items", icon: "fa fa-search", badge: 0 },

            // Account
            { name: "Profile", file: "/customer/profile", icon: "fa fa-user-circle", badge: 0 }
        ];


        return res.json({ success: true, pages });
    }

    // ================= staff =================
    if (role === 'staff') {

        const pages = [
            { name: "Dashboard", file: "/staff/dashboard", icon: "fa fa-home", badge: 0 },
            { name: "All Complaints", file: "/staff/complaints", icon: "fa fa-clipboard-list", badge: 0 },
            { name: "Profile", file: "/staff/profile", icon: "fa fa-user-circle", badge: 0 }

        ];

        return res.json({ success: true, pages });
    }

    // ================= HANDLER (complaintreceiver) =================
    if (role === 'complaintreceiver') {

        const pages = [
            { name: "Dashboard", file: "/handler/dashboard", icon: "fa fa-tachometer-alt", badge: 0 },

            // Work
            { name: "All Complaints", file: "/handler/all-complaints", icon: "fa fa-clipboard-list", badge: 0 },
            { name: "Found Items", file: "/handler/found-items", icon: "fa fa-box-open", badge: 0 },

            { name: "Daily Report", file: "/handler/daily-report", icon: "fa-solid fa-file-lines", badge: 0 },
            { name: "Complaints Report", file: "/handler/complaints-report", icon: "fa-solid fa-file-lines", badge: 0 },
            { name: "Found Items Report", file: "/handler/found-items-report", icon: "fa-solid fa-file-lines", badge: 0 },

            // Reference / Categories
            { name: "natures", file: "/handler/natures", icon: "fa fa-tags", badge: 0 },

            // Account
            { name: "Profile", file: "/handler/profile", icon: "fa fa-user-circle", badge: 0 }
        ];


        return res.json({ success: true, pages });
    }

    console.log("Unknown role: " + role);
    // ================= UNKNOWN ROLE =================
    return res.status(403).json({
        success: false,
        message: "Unauthorized role"
    });
});




// ====================================================
// ✅ Helper Functions
// ====================================================
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

function validateUserID(userID) {
    // Allow alphanumeric and some special characters
    const regex = /^[a-zA-Z0-9_-]{3,50}$/;
    return regex.test(userID);
}

// ====================================================
// ✅ OTP Management Functions
// ====================================================
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

    // Check daily attempts
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

    // Check cooldown period
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

    // Delete old OTPs for this email to avoid duplicates
    await pool.execute(
        'DELETE FROM email_otp WHERE email = ? AND purpose = ?',
        [email, purpose]
    );

    // Store new OTP with MySQL handling timestamps
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

    // Get the latest valid (not expired) OTP
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

    // Verify OTP
    const isValid = await verifyOTP(providedOTP, record.otp_hash);

    if (!isValid) {
        // Increment attempts
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

    // Delete OTP after successful verification
    await pool.execute(
        'DELETE FROM email_otp WHERE otp_id = ?',
        [record.otp_id]
    );

    return { success: true };
}
// ====================================================
// ✅ Global Email Check Helper
// ====================================================
async function checkEmailExistsGlobally(email, excludeUserId = null) {
    const pool = await getDBPool();
    const tables = ['admin', 'complaintreceiver', 'customer', 'staff'];

    for (const table of tables) {
        let query;
        const idField = table === 'customer' ? 'customer_id' : 'id';

        if (excludeUserId) {
            query = `SELECT ${idField} FROM ${table} WHERE email = ? AND ${idField} != ?`;
            const [rows] = await pool.execute(query, [email, excludeUserId]);
            if (rows.length > 0) return true;
        } else {
            query = `SELECT ${idField} FROM ${table} WHERE email = ?`;
            const [rows] = await pool.execute(query, [email]);
            if (rows.length > 0) return true;
        }
    }
    return false;
}

// ====================================================
// ✅ Unified Signup API
// ====================================================
app.post('/api/signup', async (req, res) => {
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
                'SELECT customer_id FROM customer WHERE email = ?',
                [email]
            );

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
                'SELECT customer_id FROM customer WHERE customer_id = ?',
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
                `INSERT INTO customer 
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

// ====================================================
// ✅ Contact Form API
// ====================================================
app.post('/api/contact', async (req, res) => {
    try {
        const { name, phone, email, message } = req.body;

        if (!name || !phone || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const mailOptions = {
            from: `Resolvia Contact <${CONFIG.GMAIL_USER}>`,
            to: CONFIG.RECIPIENT_EMAIL,
            replyTo: email,
            subject: `New Contact Form Submission from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #085144; margin-bottom: 10px;">New Contact Message</h2>
                        <p style="color: #666;">Resolvia System Notification</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                    </div>
                    
                    <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin-bottom: 20px;">
                        <p style="font-weight: bold; margin-bottom: 10px;">Message:</p>
                        <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                    
                    <div style="text-align: center; color: #999; font-size: 12px;">
                        <p>This message was sent via the Resolvia contact form.</p>
                        <p>© ${new Date().getFullYear()} Resolvia. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'Your message has been sent successfully!'
        });

    } catch (error) {
        console.error('Contact API error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.'
        });
    }
});


// ====================================================
// ✅ Check User ID Availability
// ====================================================
app.post('/api/check-userid', async (req, res) => {
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
            'SELECT customer_id FROM customer WHERE customer_id = ?',
            [userID]
        );

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

// ====================================================
// ✅ Check OTP Status API
// ====================================================
app.post('/api/check-otp-status', async (req, res) => {
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

// ====================================================
// ✅ Get OTP Configuration
// ====================================================
app.get('/api/otp-config', (req, res) => {
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






// ====================================================
// ✅ Check Email Exists in System
// ====================================================
app.post('/api/check-email-exists', async (req, res) => {
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
        const tables = ['customer', 'admin', 'complaintreceiver', 'staff'];

        for (const table of tables) {
            let query;
            const idField = table === 'customer' ? 'customer_id' : 'id';

            // Add status check for tables that have status column
            if (table === 'customer') {
                query = `SELECT ${idField} FROM ${table} WHERE email = ? AND status = 'Active'`;
            } else if (table === 'admin' || table === 'complaintreceiver') {
                query = `SELECT ${idField} FROM ${table} WHERE email = ? AND status = 'Active'`;
            } else if (table === 'staff') {
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

// ====================================================
// ✅ Get User Type by Email
// ====================================================
async function getUserTypeByEmail(email) {
    const pool = await getDBPool();

    const tables = [
        { name: 'customer', idField: 'customer_id' },
        { name: 'admin', idField: 'id' },
        { name: 'complaintreceiver', idField: 'id' },
        { name: 'staff', idField: 'id' }
    ];

    for (const table of tables) {
        let query;

        // Add status check for tables that have status column
        if (table.name === 'customer') {
            query = `SELECT ${table.idField} FROM ${table.name} WHERE email = ? AND status = 'Active'`;
        } else if (table.name === 'admin' || table.name === 'complaintreceiver') {
            query = `SELECT ${table.idField} FROM ${table.name} WHERE email = ? AND status = 'Active'`;
        } else if (table.name === 'staff') {
            query = `SELECT ${table.idField} FROM ${table.name} WHERE email = ? AND status = 'Active'`;
        } else {
            query = `SELECT ${table.idField} FROM ${table.name} WHERE email = ?`;
        }

        const [rows] = await pool.execute(query, [email]);

        if (rows.length > 0) {
            return {
                table: table.name,
                idField: table.idField,
                userId: rows[0][table.idField]
            };
        }
    }

    return null;
}

// ====================================================
// ✅ Update Password in Specific Table
// ====================================================
async function updatePasswordInTable(tableName, idField, userId, passwordHash) {
    const pool = await getDBPool();

    const updateQuery = `
        UPDATE ${tableName} 
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE ${idField} = ?
    `;

    const [result] = await pool.execute(updateQuery, [passwordHash, userId]);
    return result.affectedRows > 0;
}

// ====================================================
// ✅ Reset Password API
// ====================================================
app.post('/api/reset-password', async (req, res) => {
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

// ====================================================
// ✅ Update canSendOTP and storeOTP for password_reset purpose
// ====================================================
// Modify the canSendOTP function to accept purpose parameter (already done)
// Modify the storeOTP function to accept purpose parameter (already done)

// Also update the cleanupExpiredOTPs function to handle all purposes







// ====================================================
// ✅ Authentication Endpoints
// ====================================================

// Login endpoint
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    console.log('Verify auth endpoint hit');
    try {
        const pool = await getDBPool();
        const { id, table } = req.user;

        if (!table) {
            console.log('No table found');
            return res.json({
                success: true,
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    role: req.user.role
                }
            });
        }

        let idColumn = 'id';
        if (table === 'customer') idColumn = 'customer_id';

        const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE ${idColumn} = ?`, [id]);

        if (rows.length === 0) {
            console.log('User not found');
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = rows[0];

        res.json({
            success: true,
            user: {
                id: user.customer_id || user.id,
                email: user.email,
                name: user.name,
                picture: user.picture,
                role: req.user.role
            }
        });

    } catch (error) {
        console.error('Verify auth error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { userID, password } = req.body;

        if (!userID || !password) {
            return res.status(400).json({
                success: false,
                message: 'User ID and password are required'
            });
        }

        const pool = await getDBPool();

        // Check in all tables
        const tables = ['admin', 'complaintreceiver', 'customer', 'staff'];
        let user = null;
        let userType = null;
        let tableName = null;

        for (const table of tables) {
            let query;
            let idField = 'id';

            if (table === 'customer') {
                idField = 'customer_id';
                query = `SELECT *, 'customer' as role FROM ${table} WHERE (${idField} = ? OR email = ?)`;
                const [rows] = await pool.execute(query, [userID, userID]);
                if (rows.length > 0) {
                    user = rows[0];
                    userType = 'customer';
                    tableName = table;
                    break;
                }
            } else {
                query = `SELECT *, '${table.toLowerCase()}' as role FROM ${table} WHERE (id = ? OR email = ?)`;
                const [rows] = await pool.execute(query, [userID, userID]);
                if (rows.length > 0) {
                    user = rows[0];
                    userType = table.toLowerCase();
                    tableName = table;
                    break;
                }
            }
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (user.status && user.status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Account is not active'
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Determine role
        let role = userType;
        if (userType === 'admin' && user.is_superadmin) {
            role = 'superadmin';
        }

        // Create payload
        const payload = {
            id: user.id || user.customer_id,
            email: user.email,
            role: role,
            userType: userType,
            tokenVersion: 1, // Initial token version
            table: tableName
        };

        // Generate tokens
        const accessToken = jwt.sign(
            payload,
            JWT_CONFIG.ACCESS_TOKEN_SECRET,
            { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY }
        );

        const refreshToken = jwt.sign(
            { ...payload, isRefreshToken: true },
            JWT_CONFIG.REFRESH_TOKEN_SECRET,
            { expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY }
        );

        // Set cookies
        // In your login endpoint (/api/auth/login), update cookie names:
        res.cookie('access_token', accessToken, {  // Changed from 'accessToken' to 'access_token'
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 1 * 60 * 1000 // 15 minutes
        });

        res.cookie('refresh_token', refreshToken, {  // Changed from 'refreshToken' to 'refresh_token'
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id || user.customer_id,
                name: user.name,
                email: user.email,
                role: role,
                picture: user.picture
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Refresh token endpoint
app.post('/api/auth/refresh', async (req, res) => {
    console.log('Refresh token endpoint hit');
    try {
        const refreshToken = req.cookies.refresh_token || req.cookies.refreshToken;

        if (!refreshToken) {
            console.log('No refresh token provided');
            return res.status(401).json({
                success: false,
                message: 'No refresh token provided'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_CONFIG.REFRESH_TOKEN_SECRET);

        if (!decoded.isRefreshToken) {
            console.log('Invalid refresh token');
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Check if user still exists and is active
        const pool = await getDBPool();
        let query;
        let idField = 'id';

        if (decoded.table === 'customer') {
            idField = 'customer_id';
        }

        query = `SELECT * FROM ${decoded.table} WHERE ${idField} = ?`;
        const [rows] = await pool.execute(query, [decoded.id]);

        if (rows.length === 0) {
            console.log('User no longer exists');
            return res.status(401).json({
                success: false,
                message: 'User no longer exists'
            });
        }

        const user = rows[0];

        // Check status if applicable
        if (user.status && user.status !== 'Active') {
            console.log('Account is not active');
            return res.status(403).json({
                success: false,
                message: 'Account is not active'
            });
        }

        // Create new payload
        const payload = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            userType: decoded.userType,
            tokenVersion: decoded.tokenVersion,
            table: decoded.table
        };

        // Generate new access token
        const newAccessToken = jwt.sign(
            payload,
            JWT_CONFIG.ACCESS_TOKEN_SECRET,
            { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY }
        );

        // Set new access token cookie
        res.cookie('access_token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 1 * 60 * 1000
        });

        console.log(`Access token is refreshed by user with id ${decoded.id}`);

        res.json({
            success: true,
            message: 'Token refreshed'
        });

    } catch (error) {
        console.error('Refresh token error:', error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            // Clear invalid cookies
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');

            console.log("Invalid or expired refresh token");
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});


// Update the protected route:
app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'You have access to protected data',
        user: req.user
    });
});

// ====================================================
// ✅ Decode JWT Payload API
// ====================================================
app.get('/api/auth/decode', authenticateToken, (req, res) => {
    res.json({
        success: true,
        payload: req.user
    });
});

// Token status check endpoint
app.get('/api/auth/token-status', authenticateToken, (req, res) => {
    try {
        // If we reach here, token is valid
        const token = req.cookies.access_token || req.cookies.accessToken;

        // Decode token to get expiration
        const decoded = jwt.decode(token);
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;

        res.json({
            success: true,
            valid: true,
            expiresIn: expiresIn, // seconds until expiry
            expiresAt: new Date(decoded.exp * 1000).toISOString(),
            user: req.user
        });
    } catch (error) {
        res.json({
            success: false,
            valid: false,
            error: error.message
        });
    }
});

// Check refresh token validity
app.post('/api/auth/check-refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies.refresh_token || req.cookies.refreshToken;

        if (!refreshToken) {
            return res.json({
                success: false,
                valid: false,
                reason: 'No refresh token found'
            });
        }

        // Try to verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_CONFIG.REFRESH_TOKEN_SECRET);

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;

        res.json({
            success: true,
            valid: true,
            expiresIn: expiresIn,
            expiresAt: new Date(decoded.exp * 1000).toISOString(),
            user: {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            }
        });
    } catch (error) {
        res.json({
            success: false,
            valid: false,
            reason: error.name === 'TokenExpiredError' ? 'Expired' : 'Invalid',
            error: error.message
        });
    }
});




// ====================================================
// ✅ customer Profile Picture Upload Configuration
// ====================================================
const customerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'assets', 'customers');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Get user ID from token - FIXED HERE
        const userId = req.user.id || req.user.userId;
        const extension = path.extname(file.originalname);
        const uniqueName = `${userId}-${Date.now()}${extension}`;
        cb(null, uniqueName);
    }
});

const staffStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'assets', 'staff');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const userId = req.user.id || req.user.userId;
        const extension = path.extname(file.originalname);
        const uniqueName = `${userId}-${Date.now()}${extension}`;
        cb(null, uniqueName);
    }
});

const staffUpload = multer({
    storage: staffStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
        }
    }
});

const customerUpload = multer({
    storage: customerStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
        }
    }
});


// ====================================================
// ✅ customer PROFILE APIs
// ====================================================

// ✅ 1. Get customer Profile
app.get('/api/customer/profile', authenticateToken, async (req, res) => {
    try {
        // Use req.user.id instead of req.user.userId
        const userId = req.user.id || req.user.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const pool = await getDBPool();
        const [rows] = await pool.execute(
            `SELECT 
                customer_id, 
                name, 
                email, 
                phone_number,
                picture,
                created_at
             FROM customer 
             WHERE customer_id = ?`,
            [userId]  // Use the correct variable
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'customer not found'
            });
        }

        const customer = rows[0];
        const profileData = {
            id: customer.customer_id,
            fullName: customer.name,
            email: customer.email,
            phone: customer.phone_number || 'Not set',
            picture: customer.picture ? (customer.picture.startsWith('/') ? customer.picture : '/' + customer.picture) : '/assets/customers/default.png',
            joinDate: customer.created_at,
            designation: 'customer'
        };

        res.json({
            success: true,
            data: profileData
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ✅ 1.5. Get customer Dashboard Summary
app.get('/api/customer/dashboard-summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const pool = await getDBPool();

        // 1. Complaint Stats
        const [complaintStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inprogress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as resolved
            FROM complaint
            WHERE customer_id = ?
        `, [userId]);

        // 2. Lost Items Stats (Claims)
        const [lostStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as found
            FROM found_item_claims
            WHERE customer_id = ?
        `, [userId]);

        // 3. Found Items Stats (Submissions)
        const [foundStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('Returned', 'Collected') THEN 1 ELSE 0 END) as returned
            FROM found_items
            WHERE customer_id = ?
        `, [userId]);

        // 4. Recent Complaints (Last 5)
        const [recentComplaints] = await pool.execute(`
            SELECT id, title, status, created_at as date
            FROM complaint
            WHERE customer_id = ?
            ORDER BY created_at DESC
            LIMIT 5
        `, [userId]);

        // 5. Notifications (Last 5 status changes)
        const [notifications] = await pool.execute(`
            SELECT 
                h.new_status, 
                h.changed_at, 
                c.title,
                c.id as complaint_id
            FROM complaint_status_history h
            JOIN complaint c ON h.complaint_id = c.id
            WHERE c.customer_id = ?
            ORDER BY h.changed_at DESC
            LIMIT 5
        `, [userId]);

        res.json({
            success: true,
            data: {
                stats: {
                    complaints: {
                        total: complaintStats[0].total || 0,
                        pending: parseInt(complaintStats[0].pending) || 0,
                        inprogress: parseInt(complaintStats[0].inprogress) || 0,
                        resolved: parseInt(complaintStats[0].resolved) || 0
                    },
                    lostFound: {
                        myLost: {
                            total: lostStats[0].total || 0,
                            found: parseInt(lostStats[0].found) || 0
                        },
                        myFound: {
                            total: foundStats[0].total || 0,
                            returned: parseInt(foundStats[0].returned) || 0
                        }
                    }
                },
                recentComplaints,
                notifications: notifications.map(n => ({
                    text: `Complaint #${n.complaint_id} status changed to '${n.new_status}'`,
                    time: n.changed_at,
                    type: n.new_status.toLowerCase().replace(' ', '-')
                }))
            }
        });

    } catch (error) {
        console.error('customer dashboard summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
    }
});

// ✅ 2. Update customer Name
app.put('/api/customer/profile/name', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id || req.user.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Name must be at least 2 characters'
            });
        }

        const pool = await getDBPool();
        await pool.execute(
            'UPDATE customer SET name = ? WHERE customer_id = ?',
            [name.trim(), userId]  // Use userId
        );

        res.json({
            success: true,
            message: 'Name updated successfully',
            data: { name: name.trim() }
        });
    } catch (error) {
        console.error('Update name error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update name'
        });
    }
});

// ✅ 3. Update customer Phone
app.put('/api/customer/profile/phone', authenticateToken, async (req, res) => {
    try {
        const { phone } = req.body;
        const userId = req.user.id || req.user.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        // Allow empty phone (null)
        if (phone && !/^[\d\s\-\+\(\)]{10,20}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid phone number'
            });
        }

        const pool = await getDBPool();
        const phoneValue = phone ? phone.trim() : null;

        await pool.execute(
            'UPDATE customer SET phone_number = ? WHERE customer_id = ?',
            [phoneValue, userId]  // Use userId
        );

        res.json({
            success: true,
            message: 'Phone number updated successfully',
            data: { phone: phoneValue || null }
        });
    } catch (error) {
        console.error('Update phone error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update phone number'
        });
    }
});

// ✅ 4. Initiate Email Change (Send OTP)
app.post('/api/customer/profile/email/initiate-change', authenticateToken, async (req, res) => {
    try {
        const { newEmail } = req.body;

        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // Get user ID from token - FIXED HERE
        const userId = req.user.id || req.user.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const pool = await getDBPool();

        // Check if email already exists globally
        if (await checkEmailExistsGlobally(newEmail, userId)) {
            return res.status(400).json({
                success: false,
                message: 'This email is already in use by another account'
            });
        }

        // Check if OTP can be sent
        const canSend = await canSendOTP(newEmail, 'email_change');
        if (!canSend.canSend) {
            return res.status(429).json({
                success: false,
                message: canSend.reason
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const otpHash = await hashOTP(otp);

        // Store OTP
        await storeOTP(newEmail, otpHash, 'email_change');

        // Send OTP email
        const mailOptions = {
            from: `"Resolvia" <${process.env.GMAIL_USER}>`,
            to: newEmail,
            subject: 'Verify Your New Email Address - Resolvia',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0a4238;">Email Change Verification</h2>
                    <p>You have requested to change your email address to this email.</p>
                    <p>Your verification OTP is:</p>
                    <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
                        <strong>${otp}</strong>
                    </div>
                    <p>This OTP is valid for ${CONFIG.OTP_LIFE_MINUTES} minutes.</p>
                    <p>If you didn't request this change, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">This is an automated message from Resolvia Complaint Management System.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: `Verification OTP sent to ${newEmail}`,
            data: { email: newEmail }
        });
    } catch (error) {
        console.error('Initiate email change error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send verification OTP'
        });
    }
});

// ✅ 5. Verify OTP and Change Email
app.post('/api/customer/profile/email/verify-and-change', authenticateToken, async (req, res) => {
    try {
        const { newEmail, otp } = req.body;

        if (!newEmail || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Get user ID from token - FIXED HERE
        const userId = req.user.id || req.user.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        // Verify OTP
        const verification = await verifyAndUseOTP(newEmail, otp, 'email_change');
        if (!verification.success) {
            return res.status(400).json({
                success: false,
                message: verification.message
            });
        }

        // Update email in database - FIXED bind parameter
        const pool = await getDBPool();
        await pool.execute(
            'UPDATE customer SET email = ? WHERE customer_id = ?',
            [newEmail, userId]  // Use userId instead of req.user.userId
        );

        // Generate new JWT token with updated email
        const [customer] = await pool.execute(
            'SELECT customer_id, name, email FROM customer WHERE customer_id = ?',
            [userId]  // Use userId
        );

        const newToken = jwt.sign(
            {
                userId: customer[0].customer_id,
                email: customer[0].email,
                name: customer[0].name,
                role: 'customer'
            },
            JWT_CONFIG.ACCESS_TOKEN_SECRET,
            { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY }
        );

        // ====================================================
        // ✅ Complaint Management APIs
        // ====================================================

        // Configuration for Complaint Images
        const complaintStorage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join(__dirname, 'assets', 'complaints');
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
                cb(null, uniqueName);
            }
        });

        const complaintUpload = multer({
            storage: complaintStorage,
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
            fileFilter: (req, file, cb) => {
                const allowedTypes = /jpeg|jpg|png|gif/;
                const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
                const mimetype = allowedTypes.test(file.mimetype);
                if (mimetype && extname) {
                    return cb(null, true);
                } else {
                    cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
                }
            }
        });

        // 1. Fetch natures (Categories)
        app.get('/api/natures', authenticateToken, async (req, res) => {
            try {
                const pool = await getDBPool();
                const [rows] = await pool.execute('SELECT * FROM natures ORDER BY name ASC');
                res.json({ success: true, data: rows });
            } catch (error) {
                console.error('Fetch natures Error:', error);
                res.status(500).json({ success: false, message: 'Failed to fetch natures' });
            }
        });

        // 2. Fetch Nature Types (Sub-categories)
        app.get('/api/nature-types/:natureId', authenticateToken, async (req, res) => {
            try {
                const { natureId } = req.params;
                const pool = await getDBPool();
                const [rows] = await pool.execute('SELECT * FROM naturetypes WHERE nature_id = ? ORDER BY type_name ASC', [natureId]);
                res.json({ success: true, data: rows });
            } catch (error) {
                console.error('Fetch Nature Types Error:', error);
                res.status(500).json({ success: false, message: 'Failed to fetch nature types' });
            }
        });

        // 3. Fetch Colonies
        app.get('/api/locations/colonies', authenticateToken, async (req, res) => {
            try {
                const pool = await getDBPool();
                const [rows] = await pool.execute('SELECT * FROM colony ORDER BY name ASC');
                res.json({ success: true, data: rows });
            } catch (error) {
                console.error('Fetch Colonies Error:', error);
                res.status(500).json({ success: false, message: 'Failed to fetch colonies' });
            }
        });

        // 4. Fetch Buildings for a Colony
        app.get('/api/locations/colony/:colonyId/buildings', authenticateToken, async (req, res) => {
            try {
                const { colonyId } = req.params;
                const pool = await getDBPool();
                const [rows] = await pool.execute('SELECT * FROM building WHERE colony_id = ? ORDER BY name ASC', [colonyId]);
                res.json({ success: true, data: rows });
            } catch (error) {
                console.error('Fetch Buildings Error:', error);
                res.status(500).json({ success: false, message: 'Failed to fetch buildings' });
            }
        });

        // 5. Fetch Floors for a Building
        app.get('/api/locations/building/:buildingId/floors', authenticateToken, async (req, res) => {
            try {
                const { buildingId } = req.params;
                const pool = await getDBPool();
                const [rows] = await pool.execute('SELECT * FROM floor WHERE building_id = ? ORDER BY floor_name ASC', [buildingId]);
                res.json({ success: true, data: rows });
            } catch (error) {
                console.error('Fetch Floors Error:', error);
                res.status(500).json({ success: false, message: 'Failed to fetch floors' });
            }
        });

        // 6. Fetch Rooms for a Floor
        app.get('/api/locations/floor/:floorId/rooms', authenticateToken, async (req, res) => {
            try {
                const { floorId } = req.params;
                const pool = await getDBPool();
                // Fetch room type name as well if needed, or just room data
                const [rows] = await pool.execute(`
            SELECT r.id, r.room_label, rt.name as room_type 
            FROM room r 
            JOIN room_type rt ON r.room_type_id = rt.id 
            WHERE r.floor_id = ? 
            ORDER BY r.room_label ASC
        `, [floorId]);
                res.json({ success: true, data: rows });
            } catch (error) {
                console.error('Fetch Rooms Error:', error);
                res.status(500).json({ success: false, message: 'Failed to fetch rooms' });
            }
        });

        // 6.5. Fetch All Rooms (Flattened Hierarchy) for Search
        app.get('/api/locations/all-rooms', authenticateToken, async (req, res) => {
            try {
                const pool = await getDBPool();
                const [rows] = await pool.execute(`
            SELECT 
                r.id as room_id, 
                r.room_label, 
                rt.name as room_type_name,
                f.floor_name,
                b.name as building_name,
                c.name as colony_name
            FROM room r
            JOIN room_type rt ON r.room_type_id = rt.id
            JOIN floor f ON r.floor_id = f.id
            JOIN building b ON f.building_id = b.id
            JOIN colony c ON b.colony_id = c.id
            ORDER BY c.name, b.name, f.floor_name, r.room_label
        `);
                res.json({ success: true, data: rows });
            } catch (error) {
                console.error('Fetch All Rooms Error:', error);
                res.status(500).json({ success: false, message: 'Failed to fetch all rooms' });
            }
        });

        // 7. Submit Complaint
        app.post('/api/complaints', authenticateToken, complaintUpload.single('picture'), async (req, res) => {
            const connection = await getDBPool().then(pool => pool.getConnection());
            try {
                await connection.beginTransaction();

                const { title, natureId, natureTypeId, description, roomId } = req.body;
                // userId from token (customer_id)
                const customerId = req.user.id || req.user.userId;

                if (!title || !natureId || !natureTypeId || !description) {
                    return res.status(400).json({ success: false, message: 'Missing required fields' });
                }

                // Handle "Others" location: roomId will be null or "null" string
                const finalRoomId = (roomId && roomId !== 'null' && roomId !== '') ? roomId : null;

                // Generate Complaint ID: CP<MM><YY>-<Count+1>
                const date = new Date();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                const prefix = `CP${month}${year}`;

                // Get count of complaints for this month/year to generate sequential ID
                // Note: Using a simple count query might have concurrency issues in high load, 
                // but for this app it should be fine. Better approach is a sequence table or atomic increment.
                // We will query for the latest ID with this prefix to determine the next number.
                const [latestComplaint] = await connection.execute(
                    `SELECT id FROM complaint WHERE id LIKE ? ORDER BY created_at DESC LIMIT 1`,
                    [`${prefix}-%`]
                );

                let nextSequence = 1;
                if (latestComplaint.length > 0) {
                    const lastId = latestComplaint[0].id;
                    const parts = lastId.split('-');
                    if (parts.length > 1) {
                        const lastSeq = parseInt(parts[1], 10);
                        if (!isNaN(lastSeq)) {
                            nextSequence = lastSeq + 1;
                        }
                    }
                }

                const complaintId = `${prefix}-${nextSequence}`;
                const picturePath = req.file ? `/assets/complaints/${req.file.filename}` : null;

                // Insert into Complaint table
                await connection.execute(
                    `INSERT INTO complaint 
            (id, title, nature_id, nature_type_id, picture, description, room_id, customer_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
                    [complaintId, title, natureId, natureTypeId, picturePath, description, finalRoomId, customerId]
                );

                // Insert into Complaint Status History
                await connection.execute(
                    `INSERT INTO complaint_status_history 
            (complaint_id, previous_status, new_status, changed_by_staff_id) 
            VALUES (?, 'Pending', 'Pending', ?)`, // Assuming system/initial status doesnt need staff_id, but foreign key might require it?
                    // Wait, changed_by_staff_id is NOT NULL in schema. 
                    // We need a way to handle "customer created". 
                    // The schema says `changed_by_staff_id VARCHAR(50) NOT NULL`.
                    // This implies a staff member must change it? 
                    // Or maybe we put the customer_id there if the column allows?
                    // Let's check schema again. `changed_by_staff_id` references `staff(id)`.
                    // User is a customer, not staff.
                    // Problem: Who is the "changer" for the initial state?
                    // Option 1: Make `changed_by_staff_id` nullable in schema (Best for initial state).
                    // Option 2: Have a dummy "System" staff account.
                    // Option 3: Initial status doesn't go into history? (But history is good).

                    // Let's check if we can insert without history for now, or if we need to fix schema.
                    // The user didn't ask to change schema, but strict FK will fail.
                    // Actually, the `complaint` table has `status` column. 
                    // Maybe history is only for *changes* made by staff?
                    // I'll skip inserting into `complaint_status_history` for the initial creation 
                    // UNLESS I need to track it.
                    // If I look at `complaint_status_history` schema:
                    // `previous_status` ENUM, `new_status` ENUM.
                    // It seems to track transitions. Creation isn't really a transition from something.
                );

                // Wait, I should probably NOT insert into history on creation if it requires a staff ID.
                // Or I can update the schema to make it nullable. 
                // For now, I will ONLY insert into `complaint` table. 
                // If the user wants history for creation, we'd need to adjust schema or requirements.

                await connection.commit();

                res.json({
                    success: true,
                    message: 'Complaint submitted successfully',
                    complaintId: complaintId
                });

            } catch (error) {
                await connection.rollback();
                console.error('Submit Complaint Error:', error);
                res.status(500).json({ success: false, message: 'Failed to submit complaint' });
            } finally {
                connection.release();
            }
        });

        app.use('/assets/complaints', express.static(path.join(__dirname, 'assets', 'complaints')));

        // Previous code ends around line 1599 in view_file.


        res.json({
            success: true,
            message: 'Email updated successfully',
            data: {
                email: newEmail,
                token: newToken
            }
        });
    } catch (error) {
        console.error('Verify and change email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update email'
        });
    }
});

// ✅ 6. Change Password
app.put('/api/customer/profile/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        // Get user ID from token - FIXED HERE
        const userId = req.user.id || req.user.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const pool = await getDBPool();

        // Get current password hash
        const [customer] = await pool.execute(
            'SELECT password_hash FROM customer WHERE customer_id = ?',
            [userId]  // Use userId
        );

        if (customer.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'customer not found'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, customer[0].password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.execute(
            'UPDATE customer SET password_hash = ? WHERE customer_id = ?',
            [newPasswordHash, userId]  // Use userId
        );

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update password'
        });
    }
});

// ✅ 7. Upload Profile Picture
app.post('/api/customer/profile/picture',
    authenticateToken,
    customerUpload.single('picture'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            // Get user ID from token - FIXED HERE
            const userId = req.user.id || req.user.userId;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID not found in token'
                });
            }

            const filePath = `/assets/customers/${req.file.filename}`;
            const pool = await getDBPool();

            // Get old picture to delete it later
            const [oldData] = await pool.execute(
                'SELECT picture FROM customer WHERE customer_id = ?',
                [userId]  // Use userId
            );

            // Update database with new picture path
            await pool.execute(
                'UPDATE customer SET picture = ? WHERE customer_id = ?',
                [filePath, userId]  // Use userId
            );

            // Delete old picture if it exists and is not default
            if (oldData[0]?.picture &&
                !oldData[0].picture.includes('default.png') &&
                oldData[0].picture.startsWith('/assets/customers/')) {

                const oldFilePath = path.join(__dirname, oldData[0].picture);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }

            res.json({
                success: true,
                message: 'Profile picture updated successfully',
                data: { picture: filePath }
            });
        } catch (error) {
            console.error('Upload picture error:', error);

            // Delete uploaded file if error occurred
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                success: false,
                message: 'Failed to upload profile picture'
            });
        }
    }
);

// ✅ 8. Delete Profile Picture (Reset to default)
app.delete('/api/customer/profile/picture', authenticateToken, async (req, res) => {
    try {
        // Get user ID from token - FIXED HERE
        const userId = req.user.id || req.user.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const pool = await getDBPool();

        // Get current picture
        const [customer] = await pool.execute(
            'SELECT picture FROM customer WHERE customer_id = ?',
            [userId]  // Use userId
        );

        if (customer.length > 0 && customer[0].picture) {
            const picturePath = customer[0].picture;

            // Delete file if it exists and is not default
            if (!picturePath.includes('default.png') &&
                picturePath.startsWith('/assets/customers/')) {

                const fullPath = path.join(__dirname, picturePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
        }

        // Set to default picture
        const defaultPath = '/assets/customers/default.png';
        await pool.execute(
            'UPDATE customer SET picture = ? WHERE customer_id = ?',
            [defaultPath, userId]  // Use userId
        );

        res.json({
            success: true,
            message: 'Profile picture reset to default',
            data: { picture: defaultPath }
        });
    } catch (error) {
        console.error('Delete picture error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset profile picture'
        });
    }
});

// ====================================================
// ✅ admin DASHBOARD APIs
// ====================================================

app.get('/api/admin/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        const role = req.user.role.toLowerCase();
        if (role !== 'admin' && role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Forbidden: admin access required' });
        }

        const pool = await getDBPool();

        // 1. Complaints Stats
        const [complaintStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN staff_id IS NULL AND status != 'Completed' AND status != 'Rejected' AND status != 'Cancelled' THEN 1 ELSE 0 END) as unassigned,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM complaint
        `);

        // 2. Found Items Stats
        const [foundStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Collected' OR status = 'Returned' THEN 1 ELSE 0 END) as collected,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending
            FROM found_items
        `);

        // 3. Complaints by Category (Nature)
        const [complaintsByCategory] = await pool.execute(`
            SELECT n.name as label, COUNT(c.id) as value
            FROM natures n
            LEFT JOIN complaint c ON n.id = c.nature_id
            GROUP BY n.id, n.name
            HAVING value > 0
            ORDER BY value DESC
        `);

        // 4. Found Items by Category
        const [foundByCategory] = await pool.execute(`
            SELECT category as label, COUNT(*) as value
            FROM found_items
            GROUP BY category
            HAVING value > 0
            ORDER BY value DESC
        `);

        // 5. People & Places Counts
        const [customerCount] = await pool.execute('SELECT COUNT(*) as count FROM customer');
        const [staffCount] = await pool.execute('SELECT COUNT(*) as count FROM staff');
        const [adminCount] = await pool.execute('SELECT COUNT(*) as count FROM admin');
        const [handlerCount] = await pool.execute('SELECT COUNT(*) as count FROM complaintreceiver');
        const [roomCount] = await pool.execute('SELECT COUNT(*) as count FROM room');
        const [colonyCount] = await pool.execute('SELECT COUNT(*) as count FROM colony');
        const [buildingCount] = await pool.execute('SELECT COUNT(*) as count FROM building');

        // 6. Trend Data
        const period = req.query.period || 'weekly';
        const days = period === 'monthly' ? 29 : 6;
        const dateFormat = period === 'monthly' ? '%d %b' : '%a';

        const [trendData] = await pool.execute(`
            SELECT 
                DATE_FORMAT(date_series.date, ?) as label,
                COALESCE(SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END), 0) as pending,
                COALESCE(SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END), 0) as inProgress,
                COALESCE(SUM(CASE WHEN c.status = 'Completed' THEN 1 ELSE 0 END), 0) as completed
            FROM (
                SELECT CURDATE() - INTERVAL (a.a + (10 * b.a)) DAY as date
                FROM (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) as a
                CROSS JOIN (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) as b
            ) as date_series
            LEFT JOIN complaint c ON DATE(c.created_at) = date_series.date
            WHERE date_series.date BETWEEN CURDATE() - INTERVAL ? DAY AND CURDATE()
            GROUP BY date_series.date
            ORDER BY date_series.date ASC
        `, [dateFormat, days]);

        res.json({
            success: true,
            data: {
                complaints: {
                    total: complaintStats[0].total || 0,
                    unassigned: parseInt(complaintStats[0].unassigned) || 0,
                    inProgress: parseInt(complaintStats[0].inProgress) || 0,
                    completed: parseInt(complaintStats[0].completed) || 0
                },
                foundItems: {
                    total: foundStats[0].total || 0,
                    collected: parseInt(foundStats[0].collected) || 0,
                    pending: parseInt(foundStats[0].pending) || 0
                },
                charts: {
                    complaintsByCategory: complaintsByCategory,
                    foundByCategory: foundByCategory,
                    trend: trendData
                },
                peoplePlaces: {
                    customers: customerCount[0].count,
                    staff: staffCount[0].count,
                    admins: adminCount[0].count,
                    handlers: handlerCount[0].count,
                    rooms: roomCount[0].count,
                    colonies: colonyCount[0].count,
                    buildings: buildingCount[0].count
                }
            }
        });

    } catch (error) {
        console.error('admin dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch admin dashboard statistics' });
    }
});

// ====================================================
// ✅ staff PROFILE APIs
// ====================================================



// ✅ 2. Update staff Profile (Limited to phone)
app.put('/api/staff/profile', authenticateToken, async (req, res) => {
    try {
        const { phone } = req.body;
        const userId = req.user.id || req.user.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        // Validate phone if provided
        if (phone && !/^[\d\s\-\+\(\)]{10,20}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid phone number'
            });
        }

        const pool = await getDBPool();
        const phoneValue = phone ? phone.trim() : null;

        await pool.execute(
            'UPDATE staff SET phone = ? WHERE id = ?',
            [phoneValue, userId]
        );

        res.json({
            success: true,
            message: 'Phone number updated successfully',
            data: { phone: phoneValue }
        });
    } catch (error) {
        console.error('Update staff profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// ✅ 3. Change staff Password
app.put('/api/staff/profile/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id || req.user.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const pool = await getDBPool();
        const [staff] = await pool.execute(
            'SELECT password_hash FROM staff WHERE id = ?',
            [userId]
        );

        if (staff.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'staff member not found'
            });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, staff[0].password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await pool.execute(
            'UPDATE staff SET password_hash = ? WHERE id = ?',
            [newPasswordHash, userId]
        );

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('staff change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update password'
        });
    }
});

// ✅ 4. Upload staff Profile Picture
app.post('/api/staff/profile/picture',
    authenticateToken,
    staffUpload.single('picture'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const userId = req.user.id || req.user.userId;
            const filePath = `/assets/staff/${req.file.filename}`;
            const pool = await getDBPool();

            // Get old picture to delete it
            const [oldData] = await pool.execute(
                'SELECT picture FROM staff WHERE id = ?',
                [userId]
            );

            // Update database
            await pool.execute(
                'UPDATE staff SET picture = ? WHERE id = ?',
                [filePath, userId]
            );

            // Delete old picture if it exists and is not default
            if (oldData[0]?.picture &&
                !oldData[0].picture.includes('default') &&
                oldData[0].picture.startsWith('/assets/staff/')) {

                const oldFilePath = path.join(__dirname, oldData[0].picture);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }

            res.json({
                success: true,
                message: 'Profile picture updated successfully',
                data: { picture: filePath }
            });
        } catch (error) {
            console.error('staff upload picture error:', error);
            if (req.file) fs.unlinkSync(req.file.path);
            res.status(500).json({
                success: false,
                message: 'Failed to upload profile picture'
            });
        }
    }
);


// ====================================================
// ✅ admin REPORTING APIS
// ====================================================

// 1. Get staff Stats for Reporting Table
app.get('/api/admin/staff-stats', authenticateToken, async (req, res) => {
    try {
        if (req.user.role.toLowerCase() !== 'admin' && req.user.role.toLowerCase() !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const pool = await getDBPool();
        const query = `
            SELECT 
                s.id, 
                s.name, 
                d.name as designation, 
                s.email,
                COUNT(c.id) as total,
                SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) as inprogress,
                SUM(CASE WHEN c.status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM staff s
            LEFT JOIN designation d ON s.designation_id = d.id
            LEFT JOIN complaint c ON s.id = c.staff_id
            GROUP BY s.id, s.name, d.name, s.email
        `;

        const [rows] = await pool.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get staff stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch staff statistics' });
    }
});

// 2. Get Detailed staff Complaints for CSV Report
app.get('/api/admin/staff-complaints-report', authenticateToken, async (req, res) => {
    try {
        if (req.user.role.toLowerCase() !== 'admin' && req.user.role.toLowerCase() !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { staffName, status, from, to } = req.query;
        const pool = await getDBPool();

        let query = `
            SELECT 
                c.id as complaints_id, 
                c.title, 
                n.name as category, 
                nt.type_name as category_type,
                CONCAT_WS(' ', r.room_label, f.floor_name, b.name, col.name) as location,
                cust.name as reported_by,
                s.id as resolver,
                c.created_at as date,
                c.completed_at,
                c.status
            FROM complaint c
            JOIN staff s ON c.staff_id = s.id
            LEFT JOIN natures n ON c.nature_id = n.id
            LEFT JOIN naturetypes nt ON c.nature_type_id = nt.id
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            LEFT JOIN room r ON c.room_id = r.id
            LEFT JOIN floor f ON r.floor_id = f.id
            LEFT JOIN building b ON f.building_id = b.id
            LEFT JOIN colony col ON b.colony_id = col.id
            WHERE s.name = ?
        `;

        const queryParams = [staffName];

        if (status && status !== 'all') {
            query += " AND c.status = ?";
            queryParams.push(status);
        }

        if (from) {
            query += " AND c.created_at >= ?";
            queryParams.push(`${from} 00:00:00`);
        }

        if (to) {
            query += " AND c.created_at <= ?";
            queryParams.push(`${to} 23:59:59`);
        }

        query += " ORDER BY c.created_at DESC";

        const [rows] = await pool.execute(query, queryParams);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get staff complaints report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report data' });
    }
});

// 3. Get All Buildings for Handler Reporting Dropdown
app.get('/api/handler/buildings', authenticateToken, async (req, res) => {
    try {
        if (req.user.role.toLowerCase() !== 'complaintreceiver' && req.user.role.toLowerCase() !== 'admin' && req.user.role.toLowerCase() !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const pool = await getDBPool();
        const [buildings] = await pool.execute('SELECT id, name FROM building ORDER BY name ASC');
        res.json({ success: true, data: buildings });
    } catch (error) {
        console.error('Get buildings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch buildings' });
    }
});

// 4. Get Handler Complaints Report Data with Filters
app.get('/api/handler/complaints-report', authenticateToken, async (req, res) => {
    try {
        if (req.user.role.toLowerCase() !== 'complaintreceiver' && req.user.role.toLowerCase() !== 'admin' && req.user.role.toLowerCase() !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { fromDate, toDate, status, buildingId, search } = req.query;
        const pool = await getDBPool();

        let query = `
            SELECT 
                c.id, 
                c.created_at as date, 
                c.title, 
                n.name as category, 
                nt.type_name as category_type,
                CONCAT_WS(' ', r.room_label, f.floor_name, b.name) as location,
                f.building_id as building_id,
                c.status,
                s.name as assigned_to
            FROM complaint c
            LEFT JOIN natures n ON c.nature_id = n.id
            LEFT JOIN naturetypes nt ON c.nature_type_id = nt.id
            LEFT JOIN room r ON c.room_id = r.id
            LEFT JOIN floor f ON r.floor_id = f.id
            LEFT JOIN building b ON f.building_id = b.id
            LEFT JOIN staff s ON c.staff_id = s.id
            WHERE 1=1
        `;

        const queryParams = [];

        if (fromDate) {
            query += " AND c.created_at >= ?";
            queryParams.push(`${fromDate} 00:00:00`);
        }

        if (toDate) {
            query += " AND c.created_at <= ?";
            queryParams.push(`${toDate} 23:59:59`);
        }

        if (status && status !== 'all') {
            query += " AND c.status = ?";
            queryParams.push(status);
        }

        if (buildingId && buildingId !== 'all') {
            query += " AND b.id = ?";
            queryParams.push(buildingId);
        }

        if (search) {
            query += " AND (c.id LIKE ? OR c.title LIKE ? OR b.name LIKE ?)";
            const searchVal = `%${search}%`;
            queryParams.push(searchVal, searchVal, searchVal);
        }

        query += " ORDER BY c.created_at DESC";

        const [rows] = await pool.execute(query, queryParams);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get handler complaints report error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch report data' });
    }
});

// ✅ 5. Get Assigned Complaints
app.get('/api/staff/complaints', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const pool = await getDBPool();

        // Join with natures, naturetypes, priority, customer, and Location tables
        // INCLUDING building.picture and floor.picture
        const query = `
            SELECT 
                c.id, 
                c.title, 
                c.description, 
                c.created_at as date, 
                c.status, 
                c.picture,
                n.name as category,
                nt.type_name as type,
                p.name as priority,
                cust.name as reportedBy,
                COALESCE(cust.phone_number, cust.email) as reporterContact,
                CONCAT_WS(' - ', col.name, b.name, f.floor_name, r.room_label) as location,
                b.picture as building_picture,
                f.picture as floor_picture,
                b.name as building_name,
                f.floor_name as floor_name
            FROM complaint c
            LEFT JOIN natures n ON c.nature_id = n.id
            LEFT JOIN naturetypes nt ON c.nature_type_id = nt.id
            LEFT JOIN priority p ON c.priority_id = p.id
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            LEFT JOIN room r ON c.room_id = r.id
            LEFT JOIN floor f ON r.floor_id = f.id
            LEFT JOIN building b ON f.building_id = b.id
            LEFT JOIN colony col ON b.colony_id = col.id
            WHERE c.staff_id = ? 
            AND c.status NOT IN ('Rejected', 'Cancelled')
            ORDER BY c.created_at DESC
        `;

        const [rows] = await pool.execute(query, [userId]);

        // Transform data if necessary - including building and floor pictures
        const complaints = rows.map(row => ({
            ...row,
            location: row.location || 'Location not specified',
            picture: row.picture ? (row.picture.startsWith('/') ? row.picture : '/' + row.picture) : null,
            building_picture: row.building_picture ? (row.building_picture.startsWith('/') ? row.building_picture : '/' + row.building_picture) : null,
            floor_picture: row.floor_picture ? (row.floor_picture.startsWith('/') ? row.floor_picture : '/' + row.floor_picture) : null
        }));

        res.json({
            success: true,
            data: complaints
        });

    } catch (error) {
        console.error('Get staff complaints error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaints'
        });
    }
});

// ✅ 6. Update Complaint Status
app.put('/api/staff/complaint/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const complaintId = req.params.id;
        const staffId = req.user.id || req.user.userId;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const allowedStatuses = ['In Progress', 'On Hold', 'Completed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status update.'
            });
        }

        const pool = await getDBPool();

        // Check assignment
        const [complaint] = await pool.execute(
            'SELECT id FROM complaint WHERE id = ? AND staff_id = ?',
            [complaintId, staffId]
        );

        if (complaint.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found or not assigned to you'
            });
        }

        await pool.execute(
            'UPDATE complaint SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, complaintId]
        );

        res.json({
            success: true,
            message: `Complaint marked as ${status}`
        });

    } catch (error) {
        console.error('Update complaint status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});


















// ====================================================
// ✅ Complaint Image Upload Configuration
// ====================================================
const complaintStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'assets', 'complaints');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const uploadComplaintImage = multer({
    storage: complaintStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
        }
    }
});



// ====================================================
// ✅ Helper Functions for Complaint ID Generation
// ====================================================

/**
 * Generate a unique complaint ID in format: CP<MM><YY>-<sequence>
 * Example: CP0125-001 (January 2025, 1st complaint of the month)
 */
async function generateComplaintId() {
    try {
        const pool = await getDBPool();
        const now = new Date();

        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString().substring(2);
        const monthYear = month + year; // e.g. 0125

        const [countResult] = await pool.query(
            `SELECT COUNT(*) AS count
             FROM complaint
             WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?`,
            [now.getFullYear(), now.getMonth() + 1]
        );

        // First complaint => -1, then -2, -3, ...
        const sequenceNumber = -(countResult[0].count + 1);

        return `CP${monthYear}-${sequenceNumber}`;
    } catch (error) {
        console.error('Error generating complaint ID:', error);
        const now = new Date();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString().substring(2);
        return `CP${month}${year}1`;
    }
}


// ====================================================
// ✅ API Routes for Complaint System
// ====================================================

// GET /api/complaints/natures - Get all natures with their types
app.get('/api/complaints/natures', async (req, res) => {
    try {
        const pool = await getDBPool();

        // Get all natures
        const [natures] = await pool.query(`
            SELECT id, name 
            FROM natures 
            ORDER BY name
        `);

        // Get types for each nature
        const naturesWithTypes = await Promise.all(natures.map(async (nature) => {
            const [types] = await pool.query(`
                SELECT id, type_name 
                FROM naturetypes 
                WHERE nature_id = ?
                ORDER BY type_name
            `, [nature.id]);

            return {
                ...nature,
                types
            };
        }));

        res.json({
            success: true,
            data: naturesWithTypes
        });
    } catch (error) {
        console.error('Error fetching natures:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
});

// GET /api/complaints/locations - Get all locations with hierarchy
app.get('/api/complaints/locations', async (req, res) => {
    try {
        const pool = await getDBPool();

        const [locations] = await pool.query(`
            SELECT 
                r.id as room_id,
                r.room_label,
                rt.name as room_type_name,
                f.floor_name,
                b.name as building_name,
                c.name as colony_name
            FROM room r
            LEFT JOIN room_type rt ON r.room_type_id = rt.id
            LEFT JOIN floor f ON r.floor_id = f.id
            LEFT JOIN building b ON f.building_id = b.id
            LEFT JOIN colony c ON b.colony_id = c.id
            ORDER BY colony_name, building_name, floor_name, room_label
        `);

        res.json({
            success: true,
            data: locations
        });
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch locations'
        });
    }
});

// GET /api/complaints/colonies - Get all colonies
app.get('/api/complaints/colonies', async (req, res) => {
    try {
        const pool = await getDBPool();

        const [colonies] = await pool.query(`
            SELECT id, name 
            FROM colony 
            WHERE deleted_at IS NULL 
            ORDER BY name
        `);

        res.json({
            success: true,
            data: colonies
        });
    } catch (error) {
        console.error('Error fetching colonies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch colonies'
        });
    }
});

// GET /api/auth/me - Get current user info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();

        const userId = req.user.id;

        const [users] = await pool.query(
            `SELECT customer_id, name, email, phone_number, picture 
             FROM customer 
             WHERE customer_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user information'
        });
    }
});

// POST /api/complaint - Submit a new complaint
app.post('/api/complaint', authenticateToken, uploadComplaintImage.single('complaint_image'), async (req, res) => {
    try {
        const pool = await getDBPool();

        // Parse complaint data
        let complaintData;
        try {
            complaintData = JSON.parse(req.body.complaint_data || '{}');
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid complaint data format'
            });
        }

        // Validate required fields
        if (!complaintData.title || !complaintData.description || !complaintData.nature_type_id) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, and category type are required'
            });
        }

        // Validate description length
        if (complaintData.description.length > 400) {
            return res.status(400).json({
                success: false,
                message: 'Description must be no more than 400 characters'
            });
        }

        // Get user from token
        const userId = req.user.id;
        console.log(`[Complaint] Submission attempt - User: ${userId}, Title: "${complaintData.title}"`);

        // Verify nature_type_id exists
        const [natureType] = await pool.query(
            `SELECT nt.id, nt.nature_id, n.name as nature_name, nt.type_name 
             FROM naturetypes nt
             JOIN natures n ON nt.nature_id = n.id
             WHERE nt.id = ?`,
            [complaintData.nature_type_id]
        );

        if (natureType.length === 0) {
            console.warn(`[Complaint] Invalid nature_type_id: ${complaintData.nature_type_id}`);
            return res.status(400).json({
                success: false,
                message: `Invalid category type selected (ID: ${complaintData.nature_type_id})`
            });
        }

        // Verify user exists
        const [user] = await pool.query(
            'SELECT customer_id, name FROM customer WHERE customer_id = ?',
            [userId]
        );

        if (user.length === 0) {
            console.warn(`[Complaint] User not found in database: ${userId}`);
            return res.status(400).json({
                success: false,
                message: `User session active but customer record not found (ID: ${userId}). Please contact support.`
            });
        }

        // Verify room exists if provided
        if (complaintData.room_id && complaintData.room_id !== 'others') {
            const [room] = await pool.query(
                'SELECT id FROM room WHERE id = ?',
                [complaintData.room_id]
            );

            if (room.length === 0) {
                console.warn(`[Complaint] Invalid room_id: ${complaintData.room_id}`);
                return res.status(400).json({
                    success: false,
                    message: `Invalid location selected (ID: ${complaintData.room_id})`
                });
            }
        }

        // Check for duplicate complaint on the same day
        const [duplicateCheck] = await pool.query(`
            SELECT id 
            FROM complaint 
            WHERE customer_id = ? 
                AND title = ? 
                AND nature_type_id = ?
                AND (room_id = ? OR (room_id IS NULL AND ? IS NULL))
                AND DATE(created_at) = CURDATE()
            LIMIT 1
        `, [
            userId,
            complaintData.title,
            complaintData.nature_type_id,
            complaintData.room_id && complaintData.room_id !== 'others' ? complaintData.room_id : null,
            complaintData.room_id && complaintData.room_id !== 'others' ? complaintData.room_id : null
        ]);

        if (duplicateCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted this complaint today. Please check your complaint history.'
            });
        }

        // Generate complaint ID
        const complaintId = await generateComplaintId();

        // Handle image path
        let picturePath = null;
        if (req.file) {
            picturePath = `/assets/complaints/${req.file.filename}`;
        }

        // Insert complaint
        const [result] = await pool.query(`
            INSERT INTO complaint (
                id, title, nature_id, nature_type_id, picture, 
                description, room_id, customer_id, status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            complaintId,
            complaintData.title,
            natureType[0].nature_id,
            complaintData.nature_type_id,
            picturePath,
            complaintData.description,
            complaintData.room_id && complaintData.room_id !== 'others' ? complaintData.room_id : null,
            userId,
            complaintData.status || 'Pending'
        ]);

        if (result.affectedRows === 1) {
            // Log the complaint submission
            await pool.query(
                `INSERT INTO complaint_logs (complaint_id, action, performed_by, details) 
                 VALUES (?, ?, ?, ?)`,
                [
                    complaintId,
                    'Created',
                    userId,
                    JSON.stringify({
                        title: complaintData.title,
                        nature: natureType[0].nature_name,
                        nature_type: natureType[0].type_name,
                        status: complaintData.status || 'Pending'
                    })
                ]
            );

            res.json({
                success: true,
                message: 'Complaint submitted successfully',
                data: {
                    complaint_id: complaintId,
                    title: complaintData.title,
                    nature: natureType[0].nature_name,
                    nature_type: natureType[0].type_name,
                    status: complaintData.status || 'Pending',
                    submitted_at: new Date().toISOString()
                }
            });
        } else {
            throw new Error('Failed to insert complaint');
        }
    } catch (error) {
        console.error('Error submitting complaint:', error);

        // Delete uploaded file if there was an error
        if (req.file) {
            const filePath = path.join(__dirname, 'assets', 'complaints', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to submit complaint. Please try again.'
        });
    }
});

// GET /api/complaint/:id - Get complaint details
app.get('/api/complaint/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const userId = req.user.userId || req.user.customer_id;

        const [complaints] = await pool.query(`
            SELECT 
                c.*,
                n.name as nature_name,
                nt.type_name as nature_type_name,
                r.room_label,
                f.floor_name,
                b.name as building_name,
                col.name as colony_name,
                cust.name as customer_name,
                cust.email as customer_email,
                cust.phone_number as customer_phone,
                s.name as staff_name,
                s.email as staff_email,
                rcv.name as receiver_name
            FROM complaint c
            LEFT JOIN natures n ON c.nature_id = n.id
            LEFT JOIN naturetypes nt ON c.nature_type_id = nt.id
            LEFT JOIN room r ON c.room_id = r.id
            LEFT JOIN floor f ON r.floor_id = f.id
            LEFT JOIN building b ON f.building_id = b.id
            LEFT JOIN colony col ON b.colony_id = col.id
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            LEFT JOIN staff s ON c.staff_id = s.id
            LEFT JOIN staff rcv ON c.receiver_id = rcv.id
            WHERE c.id = ? AND (c.customer_id = ? OR ? IN (SELECT customer_id FROM customer WHERE role = 'admin'))
            AND c.deleted_at IS NULL
        `, [req.params.id, userId, userId]);

        if (complaints.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Get complaint logs
        const [logs] = await pool.query(`
            SELECT * FROM complaint_logs 
            WHERE complaint_id = ? 
            ORDER BY created_at DESC
        `, [req.params.id]);

        const complaint = complaints[0];
        complaint.logs = logs;

        res.json({
            success: true,
            data: complaint
        });
    } catch (error) {
        console.error('Error fetching complaint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaint details'
        });
    }
});

// GET /api/customer/complaints - Get all complaints with full details for the logged in customer
app.get('/api/customer/complaints', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get filter parameters
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || '';

        const pool = await getDBPool();

        // Build the WHERE clause dynamically
        let whereConditions = ['c.customer_id = ?'];
        let queryParams = [userId];

        if (statusFilter) {
            whereConditions.push('c.status = ?');
            queryParams.push(statusFilter);
        }

        if (searchTerm) {
            whereConditions.push('(c.title LIKE ? OR c.description LIKE ? OR c.id LIKE ?)');
            const searchPattern = `%${searchTerm}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // Get total count with filters
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM complaint c 
            ${whereClause}
        `;

        const [countResult] = await pool.execute(countQuery, queryParams);
        const total = countResult[0].total;

        // Add pagination params to query
        const dataQuery = `
            SELECT 
                c.id, c.title, c.status, c.created_at, c.updated_at, c.completed_at,
                c.description, c.picture,
                n.name as nature_name,
                COALESCE(p.name, 'Default') as priority_name,
                COALESCE(s.name, 'Unassigned') as worker_name,
                r.room_label,
                f.floor_name,
                b.name as building_name,
                col.name as colony_name
            FROM complaint c
            LEFT JOIN natures n ON c.nature_id = n.id
            LEFT JOIN priority p ON c.priority_id = p.id
            LEFT JOIN staff s ON c.staff_id = s.id
            LEFT JOIN room r ON c.room_id = r.id
            LEFT JOIN floor f ON r.floor_id = f.id
            LEFT JOIN building b ON f.building_id = b.id
            LEFT JOIN colony col ON b.colony_id = col.id
            ${whereClause}
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `;

        // Add pagination params
        const dataParams = [...queryParams, limit, offset];

        const [complaints] = await pool.execute(dataQuery, dataParams);

        res.json({
            success: true,
            data: {
                complaints,
                total,
                page,
                limit,
                filters: {
                    search: searchTerm || null,
                    status: statusFilter || null
                }
            }
        });
    } catch (error) {
        console.error('Fetch customer Complaints Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaints'
        });
    }
});

// GET /api/my-complaints - Get logged in user's complaints
app.get('/api/my-complaints', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const userId = req.user.userId || req.user.customer_id;

        const [complaints] = await pool.query(`
            SELECT 
                c.id, c.title, c.description, c.status, c.created_at,
                c.picture, c.updated_at,
                n.name as nature_name,
                nt.type_name as nature_type_name,
                r.room_label,
                f.floor_name,
                b.name as building_name
            FROM complaint c
            LEFT JOIN natures n ON c.nature_id = n.id
            LEFT JOIN naturetypes nt ON c.nature_type_id = nt.id
            LEFT JOIN room r ON c.room_id = r.id
            LEFT JOIN floor f ON r.floor_id = f.id
            LEFT JOIN building b ON f.building_id = b.id
            WHERE c.customer_id = ? AND c.deleted_at IS NULL
            ORDER BY c.created_at DESC
            LIMIT 100
        `, [userId]);

        // Get counts by status
        const [counts] = await pool.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM complaint
            WHERE customer_id = ? AND deleted_at IS NULL
            GROUP BY status
        `, [userId]);

        res.json({
            success: true,
            data: {
                complaints,
                counts: counts.reduce((acc, curr) => {
                    acc[curr.status] = curr.count;
                    return acc;
                }, {}),
                total: complaints.length
            }
        });
    } catch (error) {
        console.error('Error fetching user complaints:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaints'
        });
    }
});

// GET /api/complaint-stats - Get complaint statistics
app.get('/api/complaint-stats', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const userId = req.user.userId || req.user.customer_id;

        // Check if user is admin
        const [user] = await pool.query(
            'SELECT role FROM customer WHERE customer_id = ? AND deleted_at IS NULL',
            [userId]
        );

        const isAdmin = user.length > 0 && user[0].role === 'admin';

        let statsQuery = '';
        let queryParams = [];

        if (isAdmin) {
            // admin sees all stats
            statsQuery = `
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
                FROM complaint
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND deleted_at IS NULL
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `;
        } else {
            // Regular user sees only their stats
            statsQuery = `
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
                FROM complaint
                WHERE customer_id = ? 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND deleted_at IS NULL
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `;
            queryParams = [userId];
        }

        const [stats] = await pool.query(statsQuery, queryParams);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching complaint stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaint statistics'
        });
    }
});

// PUT /api/complaint/:id/update-status - Update complaint status
app.put('/api/complaint/:id/update-status', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const userId = req.user.userId || req.user.customer_id;
        const { status, remarks } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        // Allowed statuses
        const allowedStatuses = ['Pending', 'In Progress', 'On Hold', 'Completed', 'Rejected', 'Cancelled'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Check if user owns the complaint or is admin
        const [complaint] = await pool.query(
            `SELECT c.*, cust.role 
             FROM complaint c
             JOIN customer cust ON c.customer_id = cust.customer_id
             WHERE c.id = ? AND c.deleted_at IS NULL`,
            [req.params.id]
        );

        if (complaint.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const isOwner = complaint[0].customer_id === userId;
        const isAdmin = complaint[0].role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this complaint'
            });
        }

        // Update status
        const [result] = await pool.query(
            `UPDATE complaint 
             SET status = ?, updated_at = NOW() 
             WHERE id = ? AND deleted_at IS NULL`,
            [status, req.params.id]
        );

        if (result.affectedRows === 1) {
            // Log the status change
            await pool.query(
                `INSERT INTO complaint_logs (complaint_id, action, performed_by, details) 
                 VALUES (?, ?, ?, ?)`,
                [
                    req.params.id,
                    'Status Updated',
                    userId,
                    JSON.stringify({
                        old_status: complaint[0].status,
                        new_status: status,
                        remarks: remarks || ''
                    })
                ]
            );

            res.json({
                success: true,
                message: 'Complaint status updated successfully',
                data: {
                    complaint_id: req.params.id,
                    new_status: status
                }
            });
        } else {
            throw new Error('Failed to update complaint status');
        }
    } catch (error) {
        console.error('Error updating complaint status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update complaint status'
        });
    }
});

// ====================================================
// ✅ Create Complaint Logs Table (Run this once)
// ====================================================
async function createComplaintLogsTable() {
    try {
        const pool = await getDBPool();

        await pool.query(`
            CREATE TABLE IF NOT EXISTS complaint_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                complaint_id VARCHAR(50) NOT NULL,
                action VARCHAR(100) NOT NULL,
                performed_by VARCHAR(100) NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_complaint_id (complaint_id),
                INDEX idx_created_at (created_at),
                CONSTRAINT fk_complaint_logs_complaint
                    FOREIGN KEY (complaint_id)
                    REFERENCES complaint(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE
            ) ENGINE=InnoDB
        `);

        console.log('✅ Complaint logs table created/verified');
    } catch (error) {
        console.error('Error creating complaint logs table:', error);
    }
}

// Call this function when server starts
createComplaintLogsTable();









// ====================================================
// ✅ COMPLAINTS MANAGEMENT API ENDPOINTS
// ✅ UPDATED FOR complaintreceiver IN STATUS HISTORY
// ====================================================

/**
 * @route   GET /api/complaint-center/get-category-list
 * @desc    Get all complaint natures/categories with their types
 * @access  Public
 */
app.get('/api/complaint-center/get-category-list', async (req, res) => {
    try {
        const pool = await getDBPool();

        const [natures] = await pool.execute(`
            SELECT id, name 
            FROM natures 
            ORDER BY name
        `);

        const result = [];
        for (const nature of natures) {
            const [types] = await pool.execute(`
                SELECT id, type_name 
                FROM naturetypes 
                WHERE nature_id = ?
                ORDER BY type_name
            `, [nature.id]);

            result.push({
                id: nature.id,
                name: nature.name,
                types: types.map(t => ({
                    id: t.id,
                    type_name: t.type_name
                }))
            });
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaint categories'
        });
    }
});

/**
 * @route   GET /api/complaint-center/get-all-complaints
 * @desc    Get all complaints with filters, pagination
 * @access  Private
 */
// ====================================================
// ✅ GET ALL COMPLAINTS - COMPLETELY REWRITTEN
// ====================================================
app.get('/api/complaint-center/get-all-complaints', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const userRole = req.user.role;
        const userId = req.user.id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const search = req.query.search || '';
        const status = req.query.status || '';
        const natureId = req.query.nature_id || '';
        const staffId = req.query.staff_id || '';
        const customerId = req.query.customer_id || '';

        // ========== MAIN QUERY ==========
        let baseQuery = `
            SELECT 
                c.id,
                c.title,
                c.description,
                c.picture,
                c.status,
                c.created_at,
                c.updated_at,
                c.completed_at,
                c.receiver_id,
                
                -- Nature & Type
                n.id as nature_id,
                n.name as nature_name,
                nt.id as nature_type_id,
                nt.type_name as nature_type_name,
                
                -- Location hierarchy
                r.id as room_id,
                r.room_label,
                f.id as floor_id,
                f.floor_name,
                b.id as building_id,
                b.name as building_name,
                col.id as colony_id,
                col.name as colony_name,
                
                -- customer info
                cust.customer_id,
                cust.name as customer_name,
                cust.email as customer_email,
                cust.phone_number as customer_phone,
                cust.picture as customer_picture,
                
                -- staff/Resolver info
                s.id as staff_id,
                s.name as staff_name,
                s.phone as staff_phone,
                s.email as staff_email,
                s.picture as staff_picture,
                d.name as staff_designation,
                
                -- Receiver/Updated By info
                rec.id as receiver_id,
                rec.name as receiver_name,
                rec.email as receiver_email,
                rec.picture as receiver_picture,
                
                -- priority
                p.id as priority_id,
                p.name as priority_name
                
            FROM complaint c
            LEFT JOIN natures n ON c.nature_id = n.id
            LEFT JOIN naturetypes nt ON c.nature_type_id = nt.id
            LEFT JOIN room r ON c.room_id = r.id
            LEFT JOIN floor f ON r.floor_id = f.id
            LEFT JOIN building b ON f.building_id = b.id
            LEFT JOIN colony col ON b.colony_id = col.id
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            LEFT JOIN staff s ON c.staff_id = s.id
            LEFT JOIN designation d ON s.designation_id = d.id
            LEFT JOIN complaintreceiver rec ON c.receiver_id = rec.id
            LEFT JOIN priority p ON c.priority_id = p.id
            WHERE 1=1
        `;

        // ========== COUNT QUERY - COMPLETELY SEPARATE ==========
        let countQuery = `
            SELECT COUNT(DISTINCT c.id) as total 
            FROM complaint c
        `;

        // Track if we need joins for count query
        let needsCountJoins = false;

        // Arrays for parameters
        const queryParams = [];
        const countParams = [];

        // ========== APPLY FILTERS TO BOTH QUERIES ==========

        // SEARCH FILTER
        if (search) {
            const searchCondition = ` AND (
                c.id LIKE ? OR 
                c.title LIKE ? OR 
                c.description LIKE ? OR 
                n.name LIKE ? OR 
                nt.type_name LIKE ? OR 
                r.room_label LIKE ? OR 
                cust.name LIKE ? OR 
                cust.email LIKE ? OR 
                s.name LIKE ? OR 
                s.email LIKE ?
            )`;

            baseQuery += searchCondition;
            needsCountJoins = true;

            const searchTerm = `%${search}%`;
            for (let i = 0; i < 10; i++) {
                queryParams.push(searchTerm);
                countParams.push(searchTerm);
            }
        }

        // STATUS FILTER
        if (status) {
            baseQuery += ' AND c.status = ?';
            queryParams.push(status);
            countParams.push(status);
        }

        // NATURE ID FILTER
        if (natureId) {
            baseQuery += ' AND c.nature_id = ?';
            queryParams.push(natureId);
            countParams.push(natureId);
        }

        // staff ID FILTER
        if (staffId) {
            baseQuery += ' AND c.staff_id = ?';
            queryParams.push(staffId);
            countParams.push(staffId);
        }

        // customer ID FILTER
        if (customerId) {
            baseQuery += ' AND c.customer_id = ?';
            queryParams.push(customerId);
            countParams.push(customerId);
        }

        // ROLE-BASED FILTERING
        if (userRole === 'staff') {
            baseQuery += ' AND c.staff_id = ?';
            queryParams.push(userId);
            countParams.push(userId);
        } else if (userRole === 'customer') {
            baseQuery += ' AND c.customer_id = ?';
            queryParams.push(userId);
            countParams.push(userId);
        }

        // ========== BUILD COUNT QUERY WITH JOINS IF NEEDED ==========
        if (needsCountJoins) {
            countQuery += `
                LEFT JOIN natures n ON c.nature_id = n.id
                LEFT JOIN naturetypes nt ON c.nature_type_id = nt.id
                LEFT JOIN room r ON c.room_id = r.id
                LEFT JOIN customer cust ON c.customer_id = cust.customer_id
                LEFT JOIN staff s ON c.staff_id = s.id
            `;
        }

        // Add WHERE clause to count query
        // Start with WHERE 1=1 to make adding conditions easier
        let countWhereClause = ' WHERE 1=1';

        // Add the same conditions to count WHERE clause
        if (search) {
            countWhereClause += ` AND (
                c.id LIKE ? OR 
                c.title LIKE ? OR 
                c.description LIKE ? OR 
                n.name LIKE ? OR 
                nt.type_name LIKE ? OR 
                r.room_label LIKE ? OR 
                cust.name LIKE ? OR 
                cust.email LIKE ? OR 
                s.name LIKE ? OR 
                s.email LIKE ?
            )`;
        }

        if (status) {
            countWhereClause += ' AND c.status = ?';
        }

        if (natureId) {
            countWhereClause += ' AND c.nature_id = ?';
        }

        if (staffId) {
            countWhereClause += ' AND c.staff_id = ?';
        }

        if (customerId) {
            countWhereClause += ' AND c.customer_id = ?';
        }

        if (userRole === 'staff') {
            countWhereClause += ' AND c.staff_id = ?';
        } else if (userRole === 'customer') {
            countWhereClause += ' AND c.customer_id = ?';
        }

        // Combine count query with where clause
        const fullCountQuery = countQuery + countWhereClause;

        // ========== EXECUTE QUERIES ==========

        // Get total count
        const [countResult] = await pool.execute(fullCountQuery, countParams);
        const total = parseInt(countResult[0].total) || 0;
        const totalPages = Math.ceil(total / limit);

        // Add sorting and pagination to main query
        baseQuery += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        // Execute main query
        const [complaints] = await pool.execute(baseQuery, queryParams);

        // ========== FORMAT RESULTS ==========
        const formattedComplaints = complaints.map(c => ({
            id: c.id,
            complaintId: c.id,
            title: c.title,
            description: c.description,
            picture: c.picture,
            status: c.status,
            date: c.created_at,
            completedAt: c.completed_at,
            updatedAt: c.updated_at,

            category: {
                id: c.nature_id,
                name: c.nature_name || 'Uncategorized',
                type: {
                    id: c.nature_type_id,
                    name: c.nature_type_name || 'Not Specified'
                }
            },

            categoryName: c.nature_name || 'Uncategorized',
            categoryTypeName: c.nature_type_name || 'Not Specified',

            location: {
                room: c.room_id ? {
                    id: c.room_id,
                    label: c.room_label
                } : null,
                floor: c.floor_id ? {
                    id: c.floor_id,
                    name: c.floor_name
                } : null,
                building: c.building_id ? {
                    id: c.building_id,
                    name: c.building_name
                } : null,
                colony: c.colony_id ? {
                    id: c.colony_id,
                    name: c.colony_name
                } : null,
                fullLocation: c.room_label ?
                    `${c.room_label}${c.floor_name ? ', ' + c.floor_name : ''}${c.building_name ? ', ' + c.building_name : ''}${c.colony_name ? ', ' + c.colony_name : ''}` :
                    'Location not specified'
            },

            reportedBy: {
                id: c.customer_id,
                name: c.customer_name || 'Anonymous',
                email: c.customer_email,
                phone: c.customer_phone,
                picture: c.customer_picture
            },

            resolver: c.staff_id ? {
                id: c.staff_id,
                name: c.staff_name,
                email: c.staff_email,
                phone: c.staff_phone,
                picture: c.staff_picture,
                designation: c.staff_designation || 'staff'
            } : null,

            updatedBy: c.receiver_id ? {
                id: c.receiver_id,
                name: c.receiver_name,
                email: c.receiver_email,
                picture: c.receiver_picture
            } : {
                id: null,
                name: 'Not Updated',
                email: null,
                picture: null
            },

            priority: c.priority_id ? {
                id: c.priority_id,
                name: c.priority_name
            } : null
        }));

        res.json({
            success: true,
            data: formattedComplaints,
            pagination: {
                currentPage: page,
                itemsPerPage: limit,
                totalItems: total,
                totalPages: totalPages
            }
        });

    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaints',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/complaint-center/view-details/:complaintId
 * @desc    Get single complaint by ID with full details
 * @access  Private
 */
app.get('/api/complaint-center/view-details/:complaintId', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const complaintId = req.params.complaintId;
        const userRole = req.user.role;
        const userId = req.user.id;

        // ✅ FIXED: Added all fields properly
        const query = `
            SELECT 
                c.*,
                -- Nature & Type - ✅ FIXED: Both fields clearly separated
                n.id as nature_id,
                n.name as nature_name,
                nt.id as nature_type_id,
                nt.type_name as nature_type_name,
                
                -- Location hierarchy
                r.id as room_id,
                r.room_label,
                f.id as floor_id,
                f.floor_name,
                b.id as building_id,
                b.name as building_name,
                col.id as colony_id,
                col.name as colony_name,
                
                -- customer info
                cust.customer_id,
                cust.name as customer_name,
                cust.email as customer_email,
                cust.phone_number as customer_phone,
                cust.picture as customer_picture,
                cust.status as customer_status,
                
                -- staff/Resolver info - ✅ FIXED: Get all staff fields
                s.id as staff_id,
                s.name as staff_name,
                s.phone as staff_phone,
                s.email as staff_email,
                s.picture as staff_picture,
                s.status as staff_status,
                d.id as designation_id,
                d.name as designation_name,
                
                -- ✅ FIXED: Receiver/Updated By info from complaintreceiver
                rec.id as receiver_id,
                rec.name as receiver_name,
                rec.email as receiver_email,
                rec.picture as receiver_picture,
                rec.status as receiver_status,
                
                -- priority
                p.id as priority_id,
                p.name as priority_name
                
            FROM complaint c
            LEFT JOIN natures n ON c.nature_id = n.id
            LEFT JOIN naturetypes nt ON c.nature_type_id = nt.id
            LEFT JOIN room r ON c.room_id = r.id
            LEFT JOIN floor f ON r.floor_id = f.id
            LEFT JOIN building b ON f.building_id = b.id
            LEFT JOIN colony col ON b.colony_id = col.id
            LEFT JOIN customer cust ON c.customer_id = cust.customer_id
            LEFT JOIN staff s ON c.staff_id = s.id
            LEFT JOIN designation d ON s.designation_id = d.id
            LEFT JOIN complaintreceiver rec ON c.receiver_id = rec.id
            LEFT JOIN priority p ON c.priority_id = p.id
            WHERE c.id = ?
        `;

        const [rows] = await pool.execute(query, [complaintId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const c = rows[0];

        // Check permissions
        if (userRole === 'customer' && c.customer_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (userRole === 'staff' && c.staff_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get status history with complaintreceiver details
        const [history] = await pool.execute(
            `SELECT 
                h.*,
                cr.name as changed_by_name,
                cr.email as changed_by_email,
                cr.picture as changed_by_picture
             FROM complaint_status_history h
             LEFT JOIN complaintreceiver cr ON h.changed_by_receiver_id = cr.id
             WHERE h.complaint_id = ?
             ORDER BY h.changed_at DESC`,
            [complaintId]
        );

        // ✅ FIXED: Format complaint with proper category, resolver, updatedBy
        const complaint = {
            id: c.id,
            title: c.title,
            description: c.description,
            picture: c.picture, // This is the image path
            status: c.status,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            completedAt: c.completed_at,

            // ✅ FIXED: Category - Properly separated nature and type
            category: {
                id: c.nature_id,
                name: c.nature_name || 'Uncategorized',
                type: {
                    id: c.nature_type_id,
                    name: c.nature_type_name || 'Not Specified'
                }
            },

            // ✅ FIXED: For easy access in frontend
            categoryName: c.nature_name || 'Uncategorized',
            categoryType: {
                id: c.nature_type_id,
                name: c.nature_type_name || 'Not Specified'
            },
            categoryTypeName: c.nature_type_name || 'Not Specified',

            location: {
                room: c.room_id ? {
                    id: c.room_id,
                    label: c.room_label
                } : null,
                floor: c.floor_id ? {
                    id: c.floor_id,
                    name: c.floor_name
                } : null,
                building: c.building_id ? {
                    id: c.building_id,
                    name: c.building_name
                } : null,
                colony: c.colony_id ? {
                    id: c.colony_id,
                    name: c.colony_name
                } : null,
                fullAddress: c.room_label ?
                    `${c.room_label}${c.floor_name ? ', ' + c.floor_name : ''}${c.building_name ? ', ' + c.building_name : ''}${c.colony_name ? ', ' + c.colony_name : ''}` :
                    'Location not specified'
            },

            reportedBy: {
                id: c.customer_id,
                name: c.customer_name || 'Anonymous',
                email: c.customer_email || 'No email provided',
                phone: c.customer_phone || 'No phone provided',
                picture: c.customer_picture,
                status: c.customer_status
            },

            // ✅ FIXED: Resolver - Properly formatted with designation as string, not object
            resolver: c.staff_id ? {
                id: c.staff_id,
                name: c.staff_name,
                email: c.staff_email || 'No email provided',
                phone: c.staff_phone || 'No phone provided',
                picture: c.staff_picture,
                status: c.staff_status,
                // ✅ FIXED: designation is a string, not an object
                designation: c.designation_name || 'Not Assigned'
            } : null,

            // ✅ FIXED: Updated By - This is who last updated the complaint
            updatedBy: c.receiver_id ? {
                id: c.receiver_id,
                name: c.receiver_name,
                email: c.receiver_email || 'No email provided',
                picture: c.receiver_picture,
                status: c.receiver_status
            } : {
                id: null,
                name: 'Not Updated Yet',
                email: null,
                picture: null,
                status: null
            },

            priority: c.priority_id ? {
                id: c.priority_id,
                name: c.priority_name || 'Normal'
            } : null,

            // Status history
            statusHistory: history.map(h => ({
                id: h.id,
                previousStatus: h.previous_status,
                newStatus: h.new_status,
                changedBy: {
                    id: h.changed_by_receiver_id,
                    name: h.changed_by_name || 'System',
                    email: h.changed_by_email,
                    picture: h.changed_by_picture
                },
                changedAt: h.changed_at
            }))
        };

        res.json({
            success: true,
            data: complaint
        });

    } catch (error) {
        console.error('Error fetching complaint details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaint details'
        });
    }
});


/**
 * @route   GET /api/complaint-center/get-location-list
 * @desc    Get all available locations with hierarchy
 * @access  Public
 */
app.get('/api/complaint-center/get-location-list', async (req, res) => {
    try {
        const pool = await getDBPool();

        const query = `
            SELECT 
                r.id as room_id,
                r.room_label,
                f.id as floor_id,
                f.floor_name,
                b.id as building_id,
                b.name as building_name,
                col.id as colony_id,
                col.name as colony_name
            FROM room r
            INNER JOIN floor f ON r.floor_id = f.id
            INNER JOIN building b ON f.building_id = b.id
            INNER JOIN colony col ON b.colony_id = col.id
            ORDER BY col.name, b.name, f.floor_name, r.room_label
        `;

        const [locations] = await pool.execute(query);

        const formattedLocations = locations.map(l => ({
            room_id: l.room_id,
            room_label: l.room_label,
            floor_id: l.floor_id,
            floor_name: l.floor_name,
            building_id: l.building_id,
            building_name: l.building_name,
            colony_id: l.colony_id,
            colony_name: l.colony_name,
            full_address: `${l.room_label}, ${l.floor_name}, ${l.building_name}, ${l.colony_name}`
        }));

        res.json({
            success: true,
            data: formattedLocations
        });

    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch locations'
        });
    }
});

/**
 * @route   GET /api/complaint-center/get-active-staff-list
 * @desc    Get all active staff members for assignment
 * @access  Private (complaintreceiver, admin, Superadmin)
 */
app.get('/api/complaint-center/get-active-staff-list', authenticateToken, async (req, res) => {
    try {
        // Allow multiple role variations
        const allowedRoles = ['complaintreceiver', 'admin', 'superadmin'];
        const userRole = req.user.role?.toLowerCase();
        const userType = req.user.userType?.toLowerCase();

        if (!allowedRoles.includes(userRole) && !allowedRoles.includes(userType)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Requires complaintreceiver or admin privileges.',
                debug: { role: userRole, userType: userType }
            });
        }

        const pool = await getDBPool();

        const query = `
            SELECT 
                s.id,
                s.name,
                s.picture,
                s.phone,
                s.email,
                s.status,
                d.id as designation_id,
                d.name as designation_name
            FROM staff s
            LEFT JOIN designation d ON s.designation_id = d.id
            WHERE s.status = 'Active'
            ORDER BY s.name
        `;

        const [staff] = await pool.execute(query);

        const formattedStaff = staff.map(s => ({
            id: s.id,
            name: s.name,
            picture: s.picture,
            phone: s.phone,
            email: s.email,
            status: s.status,
            designation: {
                id: s.designation_id,
                name: s.designation_name
            }
        }));

        res.json({
            success: true,
            data: formattedStaff
        });

    } catch (error) {
        console.error('Error fetching staff list:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch staff members'
        });
    }
});

/**
 * @route   GET /api/complaint-center/get-dashboard-stats
 * @desc    Get complaint statistics for dashboard
 * @access  Private
 */
app.get('/api/complaint-center/get-dashboard-stats', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const userRole = req.user.role;
        const userId = req.user.id;

        let query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inprogress,
                SUM(CASE WHEN status = 'On Hold' THEN 1 ELSE 0 END) as onhold,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM complaint
            WHERE 1=1
        `;

        const params = [];

        if (userRole === 'staff') {
            query += ' AND staff_id = ?';
            params.push(userId);
        } else if (userRole === 'customer') {
            query += ' AND customer_id = ?';
            params.push(userId);
        }

        const [rows] = await pool.execute(query, params);
        const stats = rows[0];

        // Get today's complaints
        const [todayRows] = await pool.execute(`
            SELECT COUNT(*) as today_count 
            FROM complaint 
            WHERE DATE(created_at) = CURDATE()
        `);

        // Get unassigned complaints
        const [unassignedRows] = await pool.execute(`
            SELECT COUNT(*) as unassigned_count 
            FROM complaint 
            WHERE staff_id IS NULL AND status = 'Pending'
        `);

        res.json({
            success: true,
            data: {
                total: parseInt(stats.total) || 0,
                pending: parseInt(stats.pending) || 0,
                inprogress: parseInt(stats.inprogress) || 0,
                onhold: parseInt(stats.onhold) || 0,
                completed: parseInt(stats.completed) || 0,
                rejected: parseInt(stats.rejected) || 0,
                cancelled: parseInt(stats.cancelled) || 0,
                today: parseInt(todayRows[0].today_count) || 0,
                unassigned: parseInt(unassignedRows[0].unassigned_count) || 0
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

/**
 * @route   POST /api/complaint-center/register-new-complaint
 * @desc    Create a new complaint
 * @access  Private (customer only)
 */
app.post('/api/complaint-center/register-new-complaint', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Only customers can submit complaints'
            });
        }

        const complaintUpload = upload.fields([
            { name: 'complaint_image', maxCount: 1 }
        ]);

        complaintUpload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            try {
                const pool = await getDBPool();

                let complaintData;
                try {
                    complaintData = JSON.parse(req.body.complaint_data);
                } catch (e) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid complaint data format'
                    });
                }

                // Validate required fields
                if (!complaintData.title || !complaintData.description ||
                    !complaintData.nature_id || !complaintData.nature_type_id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Missing required fields'
                    });
                }

                // Generate complaint ID
                const [lastComplaint] = await pool.execute(
                    'SELECT id FROM complaint ORDER BY id DESC LIMIT 1'
                );

                let nextId = 'CMP-00001';
                if (lastComplaint.length > 0) {
                    const lastNum = parseInt(lastComplaint[0].id.split('-')[1]);
                    nextId = `CMP-${String(lastNum + 1).padStart(5, '0')}`;
                }

                // Picture path
                let picturePath = null;
                if (req.files && req.files.complaint_image && req.files.complaint_image[0]) {
                    picturePath = `/assets/complaints/${req.files.complaint_image[0].filename}`;
                }

                // Insert complaint
                const query = `
                    INSERT INTO complaint (
                        id, title, description, picture,
                        nature_id, nature_type_id,
                        room_id, customer_id,
                        status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())
                `;

                await pool.execute(query, [
                    nextId,
                    complaintData.title,
                    complaintData.description,
                    picturePath,
                    complaintData.nature_id,
                    complaintData.nature_type_id,
                    complaintData.room_id || null,
                    req.user.id
                ]);

                // ✅ FIXED: No initial status history needed for new complaint
                // or you can add it with NULL receiver_id

                res.json({
                    success: true,
                    message: 'Complaint submitted successfully',
                    data: {
                        complaint_id: nextId,
                        picture: picturePath
                    }
                });

            } catch (error) {
                console.error('Error creating complaint:', error);

                if (req.files && req.files.complaint_image && req.files.complaint_image[0]) {
                    fs.unlink(req.files.complaint_image[0].path, (err) => {
                        if (err) console.error('Error deleting file:', err);
                    });
                }

                res.status(500).json({
                    success: false,
                    message: 'Failed to submit complaint'
                });
            }
        });

    } catch (error) {
        console.error('Error in complaint submission:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/**
 * @route   PUT /api/complaint-center/update-complaint-status/:complaintId
 * @desc    Update complaint status
 * @access  Private (complaintreceiver only)
 */
app.put('/api/complaint-center/update-complaint-status/:complaintId', authenticateToken, async (req, res) => {
    try {
        // Check for complaintreceiver role
        if (req.user.role !== 'complaintreceiver' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Only Complaint Receivers can update complaint status'
            });
        }

        const { status } = req.body;
        const complaintId = req.params.complaintId;
        const receiverId = req.user.id; // This is from complaintreceiver table

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const validStatuses = ['Pending', 'In Progress', 'On Hold', 'Completed', 'Rejected', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const pool = await getDBPool();

        const [current] = await pool.execute(
            'SELECT status FROM complaint WHERE id = ?',
            [complaintId]
        );

        if (current.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const currentStatus = current[0].status;

        if (currentStatus === status) {
            return res.status(400).json({
                success: false,
                message: 'Complaint already has this status'
            });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // ✅ FIXED: Update receiver_id with the complaintreceiver who is updating
            // This ensures the complaint shows who last updated it
            let updateQuery = 'UPDATE complaint SET status = ?, receiver_id = ?, updated_at = NOW()';
            const params = [status, receiverId];

            if (status === 'Completed') {
                updateQuery += ', completed_at = NOW()';
            }

            updateQuery += ' WHERE id = ?';
            params.push(complaintId);

            await connection.execute(updateQuery, params);

            // ✅ FIXED: Insert into status history with changed_by_receiver_id
            await connection.execute(
                `INSERT INTO complaint_status_history 
                 (complaint_id, previous_status, new_status, changed_by_receiver_id)
                 VALUES (?, ?, ?, ?)`,
                [complaintId, currentStatus, status, receiverId]
            );

            await connection.commit();

            // ✅ FIXED: Fetch updated complaint with receiver details
            const [updatedComplaint] = await connection.execute(
                `SELECT 
                    c.receiver_id,
                    cr.name as receiver_name,
                    cr.email as receiver_email,
                    cr.picture as receiver_picture
                 FROM complaint c
                 LEFT JOIN complaintreceiver cr ON c.receiver_id = cr.id
                 WHERE c.id = ?`,
                [complaintId]
            );

            res.json({
                success: true,
                message: 'Status updated successfully',
                data: {
                    complaint_id: complaintId,
                    previous_status: currentStatus,
                    new_status: status,
                    updated_by: {
                        id: receiverId,
                        name: req.user.name || updatedComplaint[0]?.receiver_name,
                        email: req.user.email || updatedComplaint[0]?.receiver_email,
                        picture: updatedComplaint[0]?.receiver_picture,
                        type: 'complaintreceiver'
                    }
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error updating complaint status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});

/**
 * @route   PUT /api/complaint-center/assign-resolver/:complaintId
 * @desc    Assign staff to complaint
 * @access  Private (complaintreceiver only)
 */
app.put('/api/complaint-center/assign-resolver/:complaintId', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'complaintreceiver' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Only Complaint Receivers can assign staff'
            });
        }

        const { staff_id } = req.body;
        const complaintId = req.params.complaintId;
        const receiverId = req.user.id; // This is from complaintreceiver table

        if (!staff_id) {
            return res.status(400).json({
                success: false,
                message: 'staff ID is required'
            });
        }

        const pool = await getDBPool();

        // Check if staff exists and is active
        const [staff] = await pool.execute(
            'SELECT id, name, email, phone, picture FROM staff WHERE id = ? AND status = "Active"',
            [staff_id]
        );

        if (staff.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'staff member not found or inactive'
            });
        }

        const [complaint] = await pool.execute(
            'SELECT id, status, staff_id FROM complaint WHERE id = ?',
            [complaintId]
        );

        if (complaint.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // ✅ FIXED: Update both staff_id AND receiver_id (who assigned)
            await connection.execute(
                'UPDATE complaint SET staff_id = ?, receiver_id = ?, updated_at = NOW() WHERE id = ?',
                [staff_id, receiverId, complaintId]
            );

            // If complaint was pending, change to In Progress
            if (complaint[0].status === 'Pending') {
                await connection.execute(
                    `INSERT INTO complaint_status_history 
                     (complaint_id, previous_status, new_status, changed_by_receiver_id)
                     VALUES (?, 'Pending', 'In Progress', ?)`,
                    [complaintId, receiverId]
                );

                await connection.execute(
                    'UPDATE complaint SET status = "In Progress" WHERE id = ?',
                    [complaintId]
                );
            }

            // ✅ NEW: Log the staff assignment change
            await connection.execute(
                `INSERT INTO staff_assignment_logs 
                 (complaint_id, changed_by_receiver_id, previous_staff_id, new_staff_id)
                 VALUES (?, ?, ?, ?)`,
                [complaintId, receiverId, complaint[0].staff_id, staff_id]
            );

            await connection.commit();

            // ✅ FIXED: Fetch updated complaint with receiver details
            const [updatedComplaint] = await connection.execute(
                `SELECT 
                    c.receiver_id,
                    cr.name as receiver_name,
                    cr.email as receiver_email,
                    cr.picture as receiver_picture
                 FROM complaint c
                 LEFT JOIN complaintreceiver cr ON c.receiver_id = cr.id
                 WHERE c.id = ?`,
                [complaintId]
            );

            res.json({
                success: true,
                message: 'Resolver assigned successfully',
                data: {
                    complaint_id: complaintId,
                    staff: {
                        id: staff[0].id,
                        name: staff[0].name,
                        email: staff[0].email,
                        phone: staff[0].phone,
                        picture: staff[0].picture
                    },
                    assigned_by: {
                        id: receiverId,
                        name: req.user.name || updatedComplaint[0]?.receiver_name,
                        email: req.user.email || updatedComplaint[0]?.receiver_email,
                        picture: updatedComplaint[0]?.receiver_picture,
                        type: 'complaintreceiver'
                    }
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error assigning resolver:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign resolver'
        });
    }
});

/**
 * @route   GET /api/complaint-center/get-complaint-history/:complaintId
 * @desc    Get status history of a complaint
 * @access  Private
 */
app.get('/api/complaint-center/get-complaint-history/:complaintId', authenticateToken, async (req, res) => {
    try {
        const complaintId = req.params.complaintId;
        const pool = await getDBPool();

        // ✅ FIXED: Query using changed_by_receiver_id
        const query = `
            SELECT 
                h.*,
                cr.name as changed_by_name,
                cr.email as changed_by_email
            FROM complaint_status_history h
            LEFT JOIN complaintreceiver cr ON h.changed_by_receiver_id = cr.id
            WHERE h.complaint_id = ?
            ORDER BY h.changed_at DESC
        `;

        const [history] = await pool.execute(query, [complaintId]);

        const formattedHistory = history.map(h => ({
            id: h.id,
            previous_status: h.previous_status,
            new_status: h.new_status,
            changed_at: h.changed_at,
            changed_by: {
                id: h.changed_by_receiver_id,
                name: h.changed_by_name || 'Unknown',
                email: h.changed_by_email,
                type: 'complaintreceiver'
            }
        }));

        res.json({
            success: true,
            data: formattedHistory
        });

    } catch (error) {
        console.error('Error fetching complaint history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaint history'
        });
    }
});

/**
 * @route   GET /api/complaint-center/get-customer-complaints/:customerId
 * @desc    Get complaints by customer ID
 * @access  Private
 */
app.get('/api/complaint-center/get-customer-complaints/:customerId', authenticateToken, async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (userRole !== 'admin' && userRole !== 'complaintreceiver' &&
            (userRole === 'customer' && userId !== customerId)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const pool = await getDBPool();

        const query = `
            SELECT 
                c.id,
                c.title,
                c.description,
                c.status,
                c.created_at,
                n.name as category,
                nt.type_name as category_type,
                s.name as resolver_name,
                s.id as resolver_id
            FROM complaint c
            LEFT JOIN natures n ON c.nature_id = n.id
            LEFT JOIN naturetypes nt ON c.nature_type_id = nt.id
            LEFT JOIN staff s ON c.staff_id = s.id
            WHERE c.customer_id = ?
            ORDER BY c.created_at DESC
        `;

        const [complaints] = await pool.execute(query, [customerId]);

        res.json({
            success: true,
            data: complaints
        });

    } catch (error) {
        console.error('Error fetching customer complaints:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer complaints'
        });
    }
});

/**
 * @route   DELETE /api/complaint-center/remove-complaint/:complaintId
 * @desc    Delete a complaint
 * @access  Private (admin/Superadmin only)
 */
app.delete('/api/complaint-center/remove-complaint/:complaintId', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. admin privileges required.'
            });
        }

        const complaintId = req.params.complaintId;
        const pool = await getDBPool();

        const [complaint] = await pool.execute(
            'SELECT picture FROM complaint WHERE id = ?',
            [complaintId]
        );

        if (complaint.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // Delete the image file if exists
        if (complaint[0].picture) {
            const imagePath = path.join(__dirname, complaint[0].picture);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await pool.execute('DELETE FROM complaint WHERE id = ?', [complaintId]);

        res.json({
            success: true,
            message: 'Complaint deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting complaint:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete complaint'
        });
    }
});

/**
 * @route   GET /api/complaint-center/get-receiver-info/:receiverId
 * @desc    Get complaintreceiver details
 * @access  Private
 */
app.get('/api/complaint-center/get-receiver-info/:receiverId', authenticateToken, async (req, res) => {
    try {
        const receiverId = req.params.receiverId;
        const pool = await getDBPool();

        const query = `
            SELECT id, name, email, phone, status
            FROM complaintreceiver
            WHERE id = ?
        `;

        const [receivers] = await pool.execute(query, [receiverId]);

        if (receivers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'complaintreceiver not found'
            });
        }

        res.json({
            success: true,
            data: receivers[0]
        });

    } catch (error) {
        console.error('Error fetching receiver info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch receiver information'
        });
    }
});












/**
 * @route   GET /api/handler/daily-report
 * @desc    Get counts and data for daily report
 * @access  Private
 */
app.get('/api/handler/daily-report', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query; // Expecting YYYY-MM-DD
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        const pool = await getDBPool();

        // 1. Complaint Stats Today
        const [complaintStats] = await pool.execute(
            `SELECT status, COUNT(*) as count 
             FROM complaint 
             WHERE DATE(created_at) = ? 
             GROUP BY status`,
            [date]
        );

        // 2. Found Item Stats Today
        const [foundStats] = await pool.execute(
            `SELECT status, COUNT(*) as count 
             FROM found_items 
             WHERE DATE(date_found) = ? 
             GROUP BY status`,
            [date]
        );

        // 3. Complaints Today (List)
        const [complaintsToday] = await pool.execute(
            `SELECT 
                c.id, 
                c.title, 
                n.name as category, 
                c.status, 
                c.created_at as time
             FROM complaint c
             LEFT JOIN natures n ON c.nature_id = n.id
             WHERE DATE(c.created_at) = ?
             ORDER BY c.created_at DESC`,
            [date]
        );

        // 4. Items Today (List)
        const [itemsToday] = await pool.execute(
            `SELECT 
                id, 
                title as name, 
                category, 
                status, 
                date_found as time
             FROM found_items
             WHERE DATE(date_found) = ?
             ORDER BY date_found DESC`,
            [date]
        );

        // 5. Category Distribution Matrix (Complaints: Category x Status)
        const [complaintMatrix] = await pool.execute(
            `SELECT n.name as category, c.status, COUNT(*) as count 
             FROM complaint c
             JOIN natures n ON c.nature_id = n.id
             WHERE DATE(c.created_at) = ?
             GROUP BY n.name, c.status`,
            [date]
        );

        // 6. Category Distribution Matrix (Found Items: Category x Status)
        const [foundMatrix] = await pool.execute(
            `SELECT category, status, COUNT(*) as count 
             FROM found_items 
             WHERE DATE(date_found) = ?
             GROUP BY category, status`,
            [date]
        );

        // 7. Hourly Trend (Complaints)
        const [complaintTrend] = await pool.execute(
            `SELECT HOUR(created_at) as hour, COUNT(*) as count 
             FROM complaint 
             WHERE DATE(created_at) = ?
             GROUP BY hour`,
            [date]
        );

        // Format Summary Stats
        const summary = {
            complaints: {
                total: complaintStats.reduce((sum, s) => sum + s.count, 0),
                pending: complaintStats.find(s => s.status === 'Pending')?.count || 0,
                inprogress: complaintStats.find(s => s.status === 'In Progress')?.count || 0,
                onhold: complaintStats.find(s => s.status === 'On Hold')?.count || 0,
                completed: complaintStats.find(s => s.status === 'Completed')?.count || 0,
                rejected: complaintStats.find(s => s.status === 'Rejected')?.count || 0,
                cancelled: complaintStats.find(s => s.status === 'Cancelled')?.count || 0
            },
            items: {
                total: foundStats.reduce((sum, s) => sum + s.count, 0),
                pending: foundStats.find(s => s.status === 'Pending')?.count || 0,
                collected: foundStats.find(s => s.status === 'Collected')?.count || 0,
                returned: foundStats.find(s => s.status === 'Returned')?.count || 0,
                unavailable: foundStats.find(s => s.status === 'Unavailable')?.count || 0
            }
        };

        // Helper to transform matrix into object: { Category: { Status: Count, total: Count } }
        const transformMatrix = (matrix, statuses) => {
            const result = {};
            matrix.forEach(row => {
                if (!result[row.category]) {
                    result[row.category] = { total: 0 };
                    statuses.forEach(s => result[row.category][s] = 0);
                }
                result[row.category][row.status] = row.count;
                result[row.category].total += row.count;
            });
            return result;
        };

        const complaintStatuses = ['Pending', 'In Progress', 'On Hold', 'Completed', 'Rejected', 'Cancelled'];
        const itemStatuses = ['Pending', 'Collected', 'Returned', 'Unavailable'];

        // Format Lists
        const formatTime = (timeStr) => {
            if (!timeStr) return 'N/A';
            const dateObj = new Date(timeStr);
            if (isNaN(dateObj.getTime())) return 'N/A';
            return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        const complaintsList = complaintsToday.map(c => ({
            id: c.id,
            title: c.title,
            category: c.category,
            status: c.status,
            time: formatTime(c.time)
        }));

        const itemsList = itemsToday.map(i => ({
            id: i.id,
            name: i.name,
            category: i.category,
            status: i.status,
            time: formatTime(i.time)
        }));

        // Format Hourly Trend (24 hours)
        const hourlyTrendData = Array.from({ length: 24 }, (_, i) => {
            const cMatch = complaintTrend.find(t => t.hour === i);
            return {
                hour: `${i}:00`,
                complaints: cMatch ? cMatch.count : 0,
                foundItems: 0
            };
        });

        res.json({
            success: true,
            data: {
                summary,
                complaintsToday: complaintsList,
                itemsToday: itemsList,
                categoryMatrix: {
                    complaints: transformMatrix(complaintMatrix, complaintStatuses),
                    foundItems: transformMatrix(foundMatrix, itemStatuses)
                },
                hourlyTrend: hourlyTrendData
            }
        });

    } catch (error) {
        console.error('Error fetching daily report:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch daily report' });
    }
});


// ====================================================
// ✅ Colony Management API Endpoints
// ====================================================


// GET /api/colonies - Get all colonies with building count
app.get('/api/colonies', async (req, res) => {
    try {
        const pool = await getDBPool();
        const [colonies] = await pool.query(`
            SELECT 
                c.id, 
                c.name,
                COUNT(b.id) as buildings_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
            GROUP BY c.id, c.name
            ORDER BY c.id DESC
        `);

        res.json({
            success: true,
            data: colonies
        });
    } catch (error) {
        console.error('Error fetching colonies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch colonies'
        });
    }
});

// GET /api/colonies/search - Search colonies
app.get('/api/colonies/search', async (req, res) => {
    try {
        const { q } = req.query;
        const pool = await getDBPool();

        let query = `
            SELECT 
                c.id, 
                c.name,
                COUNT(b.id) as buildings_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
        `;

        const params = [];

        if (q) {
            query += ` WHERE c.name LIKE ? OR c.id = ?`;
            params.push(`%${q}%`, parseInt(q) || 0);
        }

        query += ` GROUP BY c.id, c.name ORDER BY c.id DESC`;

        const [colonies] = await pool.query(query, params);

        res.json({
            success: true,
            data: colonies
        });
    } catch (error) {
        console.error('Error searching colonies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search colonies'
        });
    }
});

// POST /api/colonies - Create new colony
app.post('/api/colonies', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Colony name is required'
            });
        }

        const pool = await getDBPool();
        const [result] = await pool.query(
            'INSERT INTO colony (name) VALUES (?)',
            [name.trim()]
        );

        // Fetch the newly created colony with building count
        const [newColony] = await pool.query(`
            SELECT 
                c.id, 
                c.name,
                COUNT(b.id) as buildings_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
            WHERE c.id = ?
            GROUP BY c.id, c.name
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Colony created successfully',
            data: newColony[0]
        });
    } catch (error) {
        console.error('Error creating colony:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'A colony with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create colony'
        });
    }
});

// PUT /api/colonies/:id - Update colony
app.put('/api/colonies/:id', async (req, res) => {
    try {
        const colonyId = req.params.id;
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Colony name is required'
            });
        }

        const pool = await getDBPool();

        // Check if colony exists
        const [existing] = await pool.query(
            'SELECT id FROM colony WHERE id = ?',
            [colonyId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Colony not found'
            });
        }

        // Update colony
        await pool.query(
            'UPDATE colony SET name = ? WHERE id = ?',
            [name.trim(), colonyId]
        );

        // Fetch updated colony with building count
        const [updatedColony] = await pool.query(`
            SELECT 
                c.id, 
                c.name,
                COUNT(b.id) as buildings_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
            WHERE c.id = ?
            GROUP BY c.id, c.name
        `, [colonyId]);

        res.json({
            success: true,
            message: 'Colony updated successfully',
            data: updatedColony[0]
        });
    } catch (error) {
        console.error('Error updating colony:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'A colony with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update colony'
        });
    }
});

// DELETE /api/colonies/:id - Delete colony
app.delete('/api/colonies/:id', async (req, res) => {
    try {
        const colonyId = req.params.id;
        const pool = await getDBPool();

        // Check if colony has buildings (due to RESTRICT foreign key)
        const [buildings] = await pool.query(
            'SELECT COUNT(*) as count FROM building WHERE colony_id = ?',
            [colonyId]
        );

        if (buildings[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete colony because it has buildings. Delete the buildings first.'
            });
        }

        // Check if colony exists
        const [existing] = await pool.query(
            'SELECT id, name FROM colony WHERE id = ?',
            [colonyId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Colony not found'
            });
        }

        // Delete colony
        await pool.query('DELETE FROM colony WHERE id = ?', [colonyId]);

        res.json({
            success: true,
            message: 'Colony deleted successfully',
            data: { id: colonyId, name: existing[0].name }
        });
    } catch (error) {
        console.error('Error deleting colony:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete colony'
        });
    }
});

// GET /api/colonies/:id - Get single colony with buildings
app.get('/api/colonies/:id', async (req, res) => {
    try {
        const colonyId = req.params.id;
        const pool = await getDBPool();

        const [colony] = await pool.query(`
            SELECT 
                c.id, 
                c.name,
                COUNT(b.id) as buildings_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
            WHERE c.id = ?
            GROUP BY c.id, c.name
        `, [colonyId]);

        if (colony.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Colony not found'
            });
        }

        res.json({
            success: true,
            data: colony[0]
        });
    } catch (error) {
        console.error('Error fetching colony:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch colony'
        });
    }
});



// ====================================================
// ✅ Building Management API Endpoints
// ====================================================

// Multer configuration for building images
const buildingStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'assets', 'buildings');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const buildingUpload = multer({
    storage: buildingStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for building images
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
        }
    }
});

// GET /api/buildings - Get all buildings with colony name
app.get('/api/buildings', async (req, res) => {
    try {
        const pool = await getDBPool();
        const [buildings] = await pool.query(`
            SELECT 
                b.id,
                b.name,
                b.picture,
                b.built_year AS builtYear,
                c.name AS colony,
                c.id AS colony_id,
                COALESCE(floor_counts.floors, 0) AS floors,
                COALESCE(room_counts.rooms, 0) AS rooms
            FROM building b
            JOIN colony c ON b.colony_id = c.id
            LEFT JOIN (
                SELECT building_id, COUNT(*) AS floors
                FROM floor
                GROUP BY building_id
            ) floor_counts ON floor_counts.building_id = b.id
            LEFT JOIN (
                SELECT f.building_id, COUNT(r.id) AS rooms
                FROM floor f
                JOIN room r ON r.floor_id = f.id
                GROUP BY f.building_id
            ) room_counts ON room_counts.building_id = b.id
            ORDER BY b.id DESC;
        `);

        // Picture is already stored as full URL in database
        res.json({
            success: true,
            data: buildings
        });
    } catch (error) {
        console.error('Error fetching buildings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch buildings'
        });
    }
});

// GET /api/buildings/search - Search buildings with filters
app.get('/api/buildings/search', async (req, res) => {
    try {
        const { q, colony } = req.query;
        const pool = await getDBPool();

        let query = `
            SELECT 
                b.id,
                b.name,
                b.picture,
                b.built_year as builtYear,
                c.name as colony,
                c.id as colony_id,
                0 as rooms,
                0 as floors
            FROM building b
            JOIN colony c ON b.colony_id = c.id
            WHERE 1=1
        `;

        const params = [];

        if (q) {
            query += ` AND (b.name LIKE ? OR c.name LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        if (colony && colony !== 'all') {
            query += ` AND c.id = ?`;
            params.push(colony);
        }

        query += ` ORDER BY b.id DESC`;

        const [buildings] = await pool.query(query, params);

        // Picture is already stored as full URL in database
        res.json({
            success: true,
            data: buildings
        });
    } catch (error) {
        console.error('Error searching buildings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search buildings'
        });
    }
});

// GET /api/colonies/dropdown - Get colonies for dropdown
app.get('/api/coloniesdropdown', async (req, res) => {
    try {
        const pool = await getDBPool();
        const [colonies] = await pool.query(`
            SELECT id, name FROM colony ORDER BY name
        `);

        res.json({
            success: true,
            data: colonies || []
        });
    } catch (error) {
        console.error('Error fetching colonies dropdown:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch colonies'
        });
    }
});

// GET /api/buildings/:id - Get single building details
app.get('/api/buildings/:id', async (req, res) => {
    try {
        const buildingId = req.params.id;
        const pool = await getDBPool();

        const [buildings] = await pool.query(`
            SELECT 
                b.id,
                b.name,
                b.picture,
                b.built_year as builtYear,
                c.name as colony,
                c.id as colony_id,
                0 as rooms,
                0 as floors
            FROM building b
            JOIN colony c ON b.colony_id = c.id
            WHERE b.id = ?
        `, [buildingId]);

        if (buildings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Building not found'
            });
        }

        // Picture is already stored as full URL in database
        res.json({
            success: true,
            data: buildings[0]
        });
    } catch (error) {
        console.error('Error fetching building:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch building'
        });
    }
});

// POST /api/buildings - Create new building with image upload
app.post('/api/buildings', buildingUpload.single('image'), async (req, res) => {
    try {
        const { name, colony_id, built_year } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Building name is required'
            });
        }

        if (!colony_id) {
            return res.status(400).json({
                success: false,
                message: 'Colony is required'
            });
        }

        const pool = await getDBPool();

        // Check if colony exists
        const [colony] = await pool.query(
            'SELECT id, name FROM colony WHERE id = ?',
            [colony_id]
        );

        if (colony.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected colony does not exist'
            });
        }

        // Prepare building data - store full URL in database
        const buildingData = {
            name: name.trim(),
            colony_id: colony_id,
            built_year: built_year || null,
            picture: req.file ? `/assets/buildings/${req.file.filename}` : null
        };

        // Insert building
        const [result] = await pool.query(
            'INSERT INTO building SET ?',
            [buildingData]
        );

        // Fetch the newly created building
        const [newBuilding] = await pool.query(`
            SELECT 
                b.id,
                b.name,
                b.picture,
                b.built_year as builtYear,
                c.name as colony,
                c.id as colony_id,
                0 as rooms,
                0 as floors
            FROM building b
            JOIN colony c ON b.colony_id = c.id
            WHERE b.id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Building created successfully',
            data: newBuilding[0]
        });
    } catch (error) {
        console.error('Error creating building:', error);

        // If there was an error and a file was uploaded, delete it
        if (req.file) {
            const filePath = path.join(__dirname, 'assets', 'buildings', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'A building with this name already exists'
            });
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Selected colony does not exist'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create building'
        });
    }
});

// PUT /api/buildings/:id - Update building with optional image upload
app.put('/api/buildings/:id', buildingUpload.single('image'), async (req, res) => {
    try {
        const buildingId = req.params.id;
        const { name, colony_id, built_year, remove_image } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Building name is required'
            });
        }

        if (!colony_id) {
            return res.status(400).json({
                success: false,
                message: 'Colony is required'
            });
        }

        const pool = await getDBPool();

        // Check if building exists and get current image URL
        const [existingBuilding] = await pool.query(
            'SELECT id, picture FROM building WHERE id = ?',
            [buildingId]
        );

        if (existingBuilding.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Building not found'
            });
        }

        // Check if colony exists
        const [colony] = await pool.query(
            'SELECT id FROM colony WHERE id = ?',
            [colony_id]
        );

        if (colony.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected colony does not exist'
            });
        }

        // Prepare update data
        const updateData = {
            name: name.trim(),
            colony_id: colony_id,
            built_year: built_year || null
        };

        // Handle image updates
        if (req.file) {
            // New image uploaded - store full URL in database
            updateData.picture = `/assets/buildings/${req.file.filename}`;

            // Delete old image if exists
            if (existingBuilding[0].picture) {
                // Extract filename from the stored URL
                const oldFilename = existingBuilding[0].picture.replace('/assets/buildings/', '');
                const oldImagePath = path.join(__dirname, 'assets', 'buildings', oldFilename);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        } else if (remove_image === 'true' || remove_image === true) {
            // Remove existing image
            updateData.picture = null;

            // Delete old image if exists
            if (existingBuilding[0].picture) {
                // Extract filename from the stored URL
                const oldFilename = existingBuilding[0].picture.replace('/assets/buildings/', '');
                const oldImagePath = path.join(__dirname, 'assets', 'buildings', oldFilename);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        // Update building
        await pool.query(
            'UPDATE building SET ? WHERE id = ?',
            [updateData, buildingId]
        );

        // Fetch updated building
        const [updatedBuilding] = await pool.query(`
            SELECT 
                b.id,
                b.name,
                b.picture,
                b.built_year as builtYear,
                c.name as colony,
                c.id as colony_id,
                0 as rooms,
                0 as floors
            FROM building b
            JOIN colony c ON b.colony_id = c.id
            WHERE b.id = ?
        `, [buildingId]);

        res.json({
            success: true,
            message: 'Building updated successfully',
            data: updatedBuilding[0]
        });
    } catch (error) {
        console.error('Error updating building:', error);

        // If there was an error and a new file was uploaded, delete it
        if (req.file) {
            const filePath = path.join(__dirname, 'assets', 'buildings', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'A building with this name already exists'
            });
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Selected colony does not exist'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update building'
        });
    }
});

// DELETE /api/buildings/:id - Delete building
app.delete('/api/buildings/:id', async (req, res) => {
    try {
        const buildingId = req.params.id;
        const pool = await getDBPool();

        // Check if building exists and get image URL
        const [existingBuilding] = await pool.query(
            'SELECT id, name, picture FROM building WHERE id = ?',
            [buildingId]
        );

        if (existingBuilding.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Building not found'
            });
        }

        // Check if building has floors
        const [floorCount] = await pool.query(
            'SELECT COUNT(*) as count FROM floor WHERE building_id = ?',
            [buildingId]
        );

        if (floorCount[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete building with existing floors. Please delete all floors first.'
            });
        }

        // Delete associated image file if exists
        if (existingBuilding[0].picture) {
            // Extract filename from the stored URL
            const filename = existingBuilding[0].picture.replace('/assets/buildings/', '');
            const imagePath = path.join(__dirname, 'assets', 'buildings', filename);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Delete building
        await pool.query('DELETE FROM building WHERE id = ?', [buildingId]);

        res.json({
            success: true,
            message: 'Building deleted successfully',
            data: { id: buildingId, name: existingBuilding[0].name }
        });
    } catch (error) {
        console.error('Error deleting building:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete building'
        });
    }
});

// Serve building images statically
app.use('/assets/buildings', express.static(path.join(__dirname, 'assets', 'buildings')));








// ====================================================
// ✅ Floors & Rooms Management API Endpoints
// ====================================================

// Multer configuration for floor images
const floorStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'assets', 'floors');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const floorUpload = multer({
    storage: floorStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
        }
    }
});

// GET /api/floors-management/colonies - Get colonies for dropdown
app.get('/api/floors-management/colonies', async (req, res) => {
    try {
        const pool = await getDBPool();
        const [colonies] = await pool.query(`
            SELECT id, name FROM colony ORDER BY name
        `);

        res.json({
            success: true,
            data: colonies
        });
    } catch (error) {
        console.error('Error fetching colonies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch colonies'
        });
    }
});

// GET /api/floors-management/buildings/:colonyId - Get buildings for colony
app.get('/api/floors-management/buildings/:colonyId', async (req, res) => {
    try {
        const colonyId = req.params.colonyId;
        const pool = await getDBPool();

        const [buildings] = await pool.query(`
            SELECT id, name FROM building 
            WHERE colony_id = ? 
            ORDER BY name
        `, [colonyId]);

        res.json({
            success: true,
            data: buildings
        });
    } catch (error) {
        console.error('Error fetching buildings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch buildings'
        });
    }
});

// GET /api/floors-management/floors/:buildingId - Get floors for building
app.get('/api/floors-management/floors/:buildingId', async (req, res) => {
    try {
        const buildingId = req.params.buildingId;
        const pool = await getDBPool();

        const [floors] = await pool.query(`
            SELECT 
                f.id,
                f.floor_name as name,
                f.picture,
                COUNT(r.id) as room_count
            FROM floor f
            LEFT JOIN room r ON f.id = r.floor_id
            WHERE f.building_id = ?
            GROUP BY f.id
            ORDER BY 
                CASE 
                    WHEN f.floor_name REGEXP '^[0-9]+' THEN CAST(f.floor_name AS UNSIGNED)
                    ELSE 999999
                END,
                f.floor_name
        `, [buildingId]);

        // Add image URLs
        const floorsWithImages = floors.map(floor => ({
            ...floor,
            picture: floor.picture
        }));

        res.json({
            success: true,
            data: floorsWithImages
        });
    } catch (error) {
        console.error('Error fetching floors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floors'
        });
    }
});

// GET /api/floors-management/all-data - Get all data for floors page
app.get('/api/floors-management/all-data', async (req, res) => {
    try {
        const pool = await getDBPool();

        // Get all colonies with buildings and floors
        const [data] = await pool.query(`
            SELECT 
                c.id as colony_id,
                c.name as colony_name,
                b.id as building_id,
                b.name as building_name,
                f.id as floor_id,
                f.floor_name as floor_name,
                f.picture as floor_picture,
                COUNT(r.id) as room_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
            LEFT JOIN floor f ON b.id = f.building_id
            LEFT JOIN room r ON f.id = r.floor_id
            GROUP BY c.id, b.id, f.id
            ORDER BY c.name, b.name, 
                CASE 
                    WHEN f.floor_name REGEXP '^[0-9]+' THEN CAST(f.floor_name AS UNSIGNED)
                    ELSE 999999
                END,
                f.floor_name
        `);

        // Transform to hierarchical structure
        const structuredData = {};
        data.forEach(row => {
            if (!row.colony_id) return;

            if (!structuredData[row.colony_id]) {
                structuredData[row.colony_id] = {
                    id: row.colony_id,
                    name: row.colony_name,
                    buildings: {}
                };
            }

            if (row.building_id && !structuredData[row.colony_id].buildings[row.building_id]) {
                structuredData[row.colony_id].buildings[row.building_id] = {
                    id: row.building_id,
                    name: row.building_name,
                    floors: {}
                };
            }

            if (row.floor_id && row.building_id) {
                structuredData[row.colony_id].buildings[row.building_id].floors[row.floor_id] = {
                    id: row.floor_id,
                    name: row.floor_name,
                    picture: row.floor_picture,
                    room_count: row.room_count || 0
                };
            }
        });

        res.json({
            success: true,
            data: structuredData
        });
    } catch (error) {
        console.error('Error fetching all floors data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floors data'
        });
    }
});

// GET /api/floors-management/floor-details/:floorId - Get floor details with rooms
app.get('/api/floors-management/floor-details/:floorId', async (req, res) => {
    try {
        const floorId = req.params.floorId;
        const pool = await getDBPool();

        // Get floor details
        const [floorDetails] = await pool.query(`
            SELECT 
                f.id,
                f.floor_name,
                f.picture,
                b.id as building_id,
                b.name as building_name,
                c.id as colony_id,
                c.name as colony_name
            FROM floor f
            JOIN building b ON f.building_id = b.id
            JOIN colony c ON b.colony_id = c.id
            WHERE f.id = ?
        `, [floorId]);

        if (floorDetails.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found'
            });
        }

        // Get rooms for this floor
        const [rooms] = await pool.query(`
            SELECT 
                r.id,
                r.room_label,
                rt.id as room_type_id,
                rt.name as room_type_name
            FROM room r
            JOIN room_type rt ON r.room_type_id = rt.id
            WHERE r.floor_id = ?
            ORDER BY r.room_label
        `, [floorId]);

        const floorData = {
            ...floorDetails[0],
            picture: floorDetails[0].picture,
            rooms: rooms
        };

        res.json({
            success: true,
            data: floorData
        });
    } catch (error) {
        console.error('Error fetching floor details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floor details'
        });
    }
});

// GET /api/floors-management/room-types - Get all room types
app.get('/api/floors-management/room-types', async (req, res) => {
    try {
        const pool = await getDBPool();
        const [roomTypes] = await pool.query(`
            SELECT id, name FROM room_type ORDER BY name
        `);

        res.json({
            success: true,
            data: roomTypes
        });
    } catch (error) {
        console.error('Error fetching room types:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch room types'
        });
    }
});

// POST /api/floors-management/floors - Create new floor
app.post('/api/floors-management/floors', floorUpload.single('image'), async (req, res) => {
    try {
        const { building_id, floor_name } = req.body;

        if (!building_id) {
            return res.status(400).json({
                success: false,
                message: 'Building is required'
            });
        }

        if (!floor_name || !floor_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Floor name is required'
            });
        }

        const pool = await getDBPool();

        // Check if building exists
        const [building] = await pool.query(
            'SELECT id, name FROM building WHERE id = ?',
            [building_id]
        );

        if (building.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected building does not exist'
            });
        }

        // Prepare floor data
        const floorData = {
            building_id: building_id,
            floor_name: floor_name.trim(),
            picture: req.file ? `/assets/floors/${req.file.filename}` : null  // Save full path
        };

        // Insert floor
        const [result] = await pool.query(
            'INSERT INTO floor SET ?',
            [floorData]
        );

        // Fetch the newly created floor with details
        const [newFloor] = await pool.query(`
            SELECT 
                f.id,
                f.floor_name as name,
                f.picture,
                b.id as building_id,
                b.name as building_name,
                c.id as colony_id,
                c.name as colony_name,
                0 as room_count
            FROM floor f
            JOIN building b ON f.building_id = b.id
            JOIN colony c ON b.colony_id = c.id
            WHERE f.id = ?
        `, [result.insertId]);

        const floorResponse = {
            ...newFloor[0],
            picture: newFloor[0].picture
        };

        res.status(201).json({
            success: true,
            message: 'Floor created successfully',
            data: floorResponse
        });
    } catch (error) {
        console.error('Error creating floor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create floor'
        });
    }
});

// PUT /api/floors-management/floors/:id - Update floor
app.put('/api/floors-management/floors/:id', floorUpload.single('image'), async (req, res) => {
    try {
        const floorId = req.params.id;
        const { building_id, floor_name, remove_image } = req.body;

        if (!floor_name || !floor_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Floor name is required'
            });
        }

        const pool = await getDBPool();

        // Check if floor exists
        const [existingFloor] = await pool.query(
            'SELECT id, picture, building_id FROM floor WHERE id = ?',
            [floorId]
        );

        if (existingFloor.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found'
            });
        }

        // Prepare update data
        const updateData = {
            floor_name: floor_name.trim()
        };

        // Update building if provided
        if (building_id && building_id !== existingFloor[0].building_id) {
            // Check if new building exists
            const [building] = await pool.query(
                'SELECT id FROM building WHERE id = ?',
                [building_id]
            );

            if (building.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected building does not exist'
                });
            }
            updateData.building_id = building_id;
        }

        // Handle image updates
        if (req.file) {
            // New image uploaded
            updateData.picture = `/assets/floors/${req.file.filename}`;  // Save full pat

            // Delete old image if exists
            if (existingFloor[0].picture) {
                const oldImagePath = path.join(__dirname, 'assets', 'floors', existingFloor[0].picture);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        } else if (remove_image === 'true' || remove_image === true) {
            // Remove existing image
            updateData.picture = null;

            // Delete old image if exists
            if (existingFloor[0].picture) {
                const oldImagePath = path.join(__dirname, 'assets', 'floors', existingFloor[0].picture);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        // Update floor
        await pool.query(
            'UPDATE floor SET ? WHERE id = ?',
            [updateData, floorId]
        );

        // Fetch updated floor
        const [updatedFloor] = await pool.query(`
            SELECT 
                f.id,
                f.floor_name as name,
                f.picture,
                b.id as building_id,
                b.name as building_name,
                c.id as colony_id,
                c.name as colony_name,
                COUNT(r.id) as room_count
            FROM floor f
            JOIN building b ON f.building_id = b.id
            JOIN colony c ON b.colony_id = c.id
            LEFT JOIN room r ON f.id = r.floor_id
            WHERE f.id = ?
            GROUP BY f.id
        `, [floorId]);

        const floorResponse = {
            ...updatedFloor[0],
            picture: updatedFloor[0].picture
        };

        res.json({
            success: true,
            message: 'Floor updated successfully',
            data: floorResponse
        });
    } catch (error) {
        console.error('Error updating floor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update floor'
        });
    }
});

// DELETE /api/floors-management/floors/:id - Delete floor
app.delete('/api/floors-management/floors/:id', async (req, res) => {
    try {
        const floorId = req.params.id;
        const pool = await getDBPool();

        // Check if floor exists
        const [existingFloor] = await pool.query(
            'SELECT id, floor_name, picture FROM floor WHERE id = ?',
            [floorId]
        );

        if (existingFloor.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found'
            });
        }

        // Check if floor has rooms
        const [rooms] = await pool.query(
            'SELECT COUNT(*) as count FROM room WHERE floor_id = ?',
            [floorId]
        );

        if (rooms[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete floor because it has rooms. Delete the rooms first.'
            });
        }

        // Delete associated image file if exists
        if (existingFloor[0].picture) {
            const imagePath = path.join(__dirname, 'assets', 'floors', existingFloor[0].picture);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Delete floor
        await pool.query('DELETE FROM floor WHERE id = ?', [floorId]);

        res.json({
            success: true,
            message: 'Floor deleted successfully',
            data: { id: floorId, name: existingFloor[0].floor_name }
        });
    } catch (error) {
        console.error('Error deleting floor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete floor'
        });
    }
});

// POST /api/floors-management/rooms - Create new room
app.post('/api/floors-management/rooms', async (req, res) => {
    try {
        const { floor_id, room_label, room_type_id } = req.body;

        if (!floor_id) {
            return res.status(400).json({
                success: false,
                message: 'Floor is required'
            });
        }

        if (!room_label || !room_label.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Room label is required'
            });
        }

        if (!room_type_id) {
            return res.status(400).json({
                success: false,
                message: 'Room type is required'
            });
        }

        const pool = await getDBPool();

        // Check if floor exists
        const [floor] = await pool.query(
            'SELECT id FROM floor WHERE id = ?',
            [floor_id]
        );

        if (floor.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected floor does not exist'
            });
        }

        // Check if room type exists
        const [roomType] = await pool.query(
            'SELECT id FROM room_type WHERE id = ?',
            [room_type_id]
        );

        if (roomType.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected room type does not exist'
            });
        }

        // Check if room with same label already exists on this floor
        const [existingRoom] = await pool.query(
            'SELECT id FROM room WHERE floor_id = ? AND room_label = ?',
            [floor_id, room_label.trim()]
        );

        if (existingRoom.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A room with this label already exists on this floor'
            });
        }

        // Prepare room data
        const roomData = {
            floor_id: floor_id,
            room_label: room_label.trim(),
            room_type_id: room_type_id
        };

        // Insert room
        const [result] = await pool.query(
            'INSERT INTO room SET ?',
            [roomData]
        );

        // Fetch the newly created room
        const [newRoom] = await pool.query(`
            SELECT 
                r.id,
                r.room_label,
                rt.id as room_type_id,
                rt.name as room_type_name
            FROM room r
            JOIN room_type rt ON r.room_type_id = rt.id
            WHERE r.id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            data: newRoom[0]
        });
    } catch (error) {
        console.error('Error creating room:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'A room with this label already exists on this floor'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create room'
        });
    }
});

// PUT /api/floors-management/rooms/:id - Update room
app.put('/api/floors-management/rooms/:id', async (req, res) => {
    try {
        const roomId = req.params.id;
        const { room_label, room_type_id } = req.body;

        if (!room_label || !room_label.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Room label is required'
            });
        }

        if (!room_type_id) {
            return res.status(400).json({
                success: false,
                message: 'Room type is required'
            });
        }

        const pool = await getDBPool();

        // Check if room exists
        const [existingRoom] = await pool.query(
            'SELECT id, floor_id FROM room WHERE id = ?',
            [roomId]
        );

        if (existingRoom.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Check if room type exists
        const [roomType] = await pool.query(
            'SELECT id FROM room_type WHERE id = ?',
            [room_type_id]
        );

        if (roomType.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected room type does not exist'
            });
        }

        // Check if room with same label already exists on this floor (excluding current room)
        const [duplicateRoom] = await pool.query(
            'SELECT id FROM room WHERE floor_id = ? AND room_label = ? AND id != ?',
            [existingRoom[0].floor_id, room_label.trim(), roomId]
        );

        if (duplicateRoom.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A room with this label already exists on this floor'
            });
        }

        // Update room
        await pool.query(
            'UPDATE room SET room_label = ?, room_type_id = ? WHERE id = ?',
            [room_label.trim(), room_type_id, roomId]
        );

        // Fetch updated room
        const [updatedRoom] = await pool.query(`
            SELECT 
                r.id,
                r.room_label,
                rt.id as room_type_id,
                rt.name as room_type_name
            FROM room r
            JOIN room_type rt ON r.room_type_id = rt.id
            WHERE r.id = ?
        `, [roomId]);

        res.json({
            success: true,
            message: 'Room updated successfully',
            data: updatedRoom[0]
        });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update room'
        });
    }
});

// DELETE /api/floors-management/rooms/:id - Delete room
app.delete('/api/floors-management/rooms/:id', async (req, res) => {
    try {
        const roomId = req.params.id;
        const pool = await getDBPool();

        // Check if room exists
        const [existingRoom] = await pool.query(
            'SELECT id, room_label FROM room WHERE id = ?',
            [roomId]
        );

        if (existingRoom.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Delete room
        await pool.query('DELETE FROM room WHERE id = ?', [roomId]);

        res.json({
            success: true,
            message: 'Room deleted successfully',
            data: { id: roomId, label: existingRoom[0].room_label }
        });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete room'
        });
    }
});

// POST /api/floors-management/room-types - Create new room type
app.post('/api/floors-management/room-types', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Room type name is required'
            });
        }

        const pool = await getDBPool();

        // Check if room type already exists
        const [existingType] = await pool.query(
            'SELECT id FROM room_type WHERE name = ?',
            [name.trim()]
        );

        if (existingType.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Room type already exists'
            });
        }

        // Insert room type
        const [result] = await pool.query(
            'INSERT INTO room_type (name) VALUES (?)',
            [name.trim()]
        );

        res.status(201).json({
            success: true,
            message: 'Room type created successfully',
            data: { id: result.insertId, name: name.trim() }
        });
    } catch (error) {
        console.error('Error creating room type:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create room type'
        });
    }
});

// DELETE /api/floors-management/room-types/:id - Delete room type
app.delete('/api/floors-management/room-types/:id', async (req, res) => {
    try {
        const typeId = req.params.id;
        const pool = await getDBPool();

        // Check if room type exists
        const [existingType] = await pool.query(
            'SELECT id, name FROM room_type WHERE id = ?',
            [typeId]
        );

        if (existingType.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room type not found'
            });
        }

        // Check if room type is used by any rooms
        const [usedInRooms] = await pool.query(
            'SELECT COUNT(*) as count FROM room WHERE room_type_id = ?',
            [typeId]
        );

        if (usedInRooms[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete room type because it is used by rooms. Update the rooms first.'
            });
        }

        // Delete room type
        await pool.query('DELETE FROM room_type WHERE id = ?', [typeId]);

        res.json({
            success: true,
            message: 'Room type deleted successfully',
            data: { id: typeId, name: existingType[0].name }
        });
    } catch (error) {
        console.error('Error deleting room type:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete room type'
        });
    }
});

// Serve floor images statically
app.use('/assets/floors', express.static(path.join(__dirname, 'assets', 'floors')));





// ====================================================
// ✅ natures Endpoints
// ====================================================
// Endpoint for fetching natures



app.get('/api/natures', async (req, res) => {
    try {
        const pool = await getDBPool();

        const sql = `
            SELECT 
                n.id AS nature_id, 
                n.name AS nature_name, 
                nt.id AS type_id, 
                nt.type_name 
            FROM natures n
            LEFT JOIN naturetypes nt ON n.id = nt.nature_id
            ORDER BY n.id, nt.id;
        `;

        const [rows] = await pool.query(sql);

        // Transform rows into nested JSON
        const result = [];
        const map = new Map();

        rows.forEach(row => {
            if (!map.has(row.nature_id)) {
                map.set(row.nature_id, {
                    id: row.nature_id,
                    name: row.nature_name,
                    types: []
                });
            }
            if (row.type_id) {
                map.get(row.nature_id).types.push({
                    id: row.type_id,
                    type_name: row.type_name
                });
            }
        });

        res.json(Array.from(map.values()));
    } catch (error) {
        console.error('Error fetching natures:', error);
        res.status(500).json({ error: 'Failed to fetch natures' });
    }
});

// GET single nature by ID
app.get('/api/natures/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const natureId = req.params.id;

        const sql = `
            SELECT 
                n.id AS nature_id, 
                n.name AS nature_name, 
                nt.id AS type_id, 
                nt.type_name 
            FROM natures n
            LEFT JOIN naturetypes nt ON n.id = nt.nature_id
            WHERE n.id = ?
            ORDER BY nt.id;
        `;

        const [rows] = await pool.query(sql, [natureId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nature not found' });
        }

        // Transform rows into nested JSON
        const nature = {
            id: rows[0].nature_id,
            name: rows[0].nature_name,
            types: []
        };

        rows.forEach(row => {
            if (row.type_id) {
                nature.types.push({
                    id: row.type_id,
                    type_name: row.type_name
                });
            }
        });

        res.json(nature);
    } catch (error) {
        console.error('Error fetching nature:', error);
        res.status(500).json({ error: 'Failed to fetch nature' });
    }
});

// POST create new nature with types
app.post('/api/natures', async (req, res) => {
    let connection;
    try {
        const pool = await getDBPool();
        connection = await pool.getConnection();

        const { name, types = [] } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nature name is required' });
        }

        await connection.beginTransaction();

        // Insert the nature
        const [natureResult] = await connection.query(
            'INSERT INTO natures (name) VALUES (?)',
            [name.trim()]
        );

        const natureId = natureResult.insertId;

        // Insert types if provided
        if (types.length > 0) {
            const typeValues = types.map(type => [natureId, type.trim()]);
            await connection.query(
                'INSERT INTO naturetypes (nature_id, type_name) VALUES ?',
                [typeValues]
            );
        }

        await connection.commit();

        // Fetch the created nature with types
        const [result] = await connection.query(`
            SELECT 
                n.id AS nature_id, 
                n.name AS nature_name, 
                nt.id AS type_id, 
                nt.type_name 
            FROM natures n
            LEFT JOIN naturetypes nt ON n.id = nt.nature_id
            WHERE n.id = ?
            ORDER BY nt.id;
        `, [natureId]);

        // Transform result
        const createdNature = {
            id: natureId,
            name: name.trim(),
            types: result
                .filter(row => row.type_id)
                .map(row => ({
                    id: row.type_id,
                    type_name: row.type_name
                }))
        };

        res.status(201).json(createdNature);
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error creating nature:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A nature with this name already exists' });
        }

        res.status(500).json({ error: 'Failed to create nature' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// PUT update nature
app.put('/api/natures/:id', async (req, res) => {
    let connection;
    try {
        const pool = await getDBPool();
        connection = await pool.getConnection();
        const natureId = req.params.id;
        const { name, types } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nature name is required' });
        }

        await connection.beginTransaction();

        // Check if nature exists
        const [existing] = await connection.query(
            'SELECT id FROM natures WHERE id = ?',
            [natureId]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Nature not found' });
        }

        // Update nature name
        await connection.query(
            'UPDATE natures SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name.trim(), natureId]
        );

        // If types are provided, update them
        if (types !== undefined) {
            // Delete existing types
            await connection.query(
                'DELETE FROM naturetypes WHERE nature_id = ?',
                [natureId]
            );

            // Insert new types if any
            if (types.length > 0) {
                const typeValues = types.map(type => [natureId, type.trim()]);
                await connection.query(
                    'INSERT INTO naturetypes (nature_id, type_name) VALUES ?',
                    [typeValues]
                );
            }
        }

        await connection.commit();

        // Fetch updated nature
        const [result] = await connection.query(`
            SELECT 
                n.id AS nature_id, 
                n.name AS nature_name, 
                nt.id AS type_id, 
                nt.type_name 
            FROM natures n
            LEFT JOIN naturetypes nt ON n.id = nt.nature_id
            WHERE n.id = ?
            ORDER BY nt.id;
        `, [natureId]);

        const updatedNature = {
            id: parseInt(natureId),
            name: name.trim(),
            types: result
                .filter(row => row.type_id)
                .map(row => ({
                    id: row.type_id,
                    type_name: row.type_name
                }))
        };

        res.json(updatedNature);
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error updating nature:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A nature with this name already exists' });
        }

        res.status(500).json({ error: 'Failed to update nature' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// PUT update nature types only
app.put('/api/natures/:id/types', async (req, res) => {
    let connection;
    try {
        const pool = await getDBPool();
        connection = await pool.getConnection();
        const natureId = req.params.id;
        const { types = [] } = req.body;

        await connection.beginTransaction();

        // Check if nature exists
        const [existing] = await connection.query(
            'SELECT id FROM natures WHERE id = ?',
            [natureId]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Nature not found' });
        }

        // Delete existing types
        await connection.query(
            'DELETE FROM naturetypes WHERE nature_id = ?',
            [natureId]
        );

        // Insert new types if any
        if (types.length > 0) {
            const typeValues = types.map(type => [natureId, type.trim()]);
            await connection.query(
                'INSERT INTO naturetypes (nature_id, type_name) VALUES ?',
                [typeValues]
            );
        }

        await connection.commit();

        // Fetch updated nature
        const [result] = await connection.query(`
            SELECT 
                n.id AS nature_id, 
                n.name AS nature_name, 
                nt.id AS type_id, 
                nt.type_name 
            FROM natures n
            LEFT JOIN naturetypes nt ON n.id = nt.nature_id
            WHERE n.id = ?
            ORDER BY nt.id;
        `, [natureId]);

        const updatedNature = {
            id: parseInt(natureId),
            name: result[0].nature_name,
            types: result
                .filter(row => row.type_id)
                .map(row => ({
                    id: row.type_id,
                    type_name: row.type_name
                }))
        };

        res.json(updatedNature);
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error updating nature types:', error);
        res.status(500).json({ error: 'Failed to update nature types' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// DELETE nature
app.delete('/api/natures/:id', async (req, res) => {
    let connection;
    try {
        const pool = await getDBPool();
        connection = await pool.getConnection();
        const natureId = req.params.id;

        await connection.beginTransaction();

        // Check if nature exists
        const [existing] = await connection.query(
            'SELECT id FROM natures WHERE id = ?',
            [natureId]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Nature not found' });
        }

        // Delete nature (cascade will delete types)
        await connection.query(
            'DELETE FROM natures WHERE id = ?',
            [natureId]
        );

        await connection.commit();

        res.json({ message: 'Nature deleted successfully' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error deleting nature:', error);
        res.status(500).json({ error: 'Failed to delete nature' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// DELETE nature type
app.delete('/api/nature-types/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const typeId = req.params.id;

        // Check if type exists
        const [existing] = await pool.query(
            'SELECT id FROM naturetypes WHERE id = ?',
            [typeId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Type not found' });
        }

        // Delete type
        await pool.query(
            'DELETE FROM naturetypes WHERE id = ?',
            [typeId]
        );

        res.json({ message: 'Type deleted successfully' });
    } catch (error) {
        console.error('Error deleting type:', error);
        res.status(500).json({ error: 'Failed to delete type' });
    }
});






// ====================================================
// ✅ admin Management Endpoints
// ====================================================

const adminStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'assets/admins/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'admin-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const adminUpload = multer({
    storage: adminStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true)
        } else {
            cb(new Error('Only image files are allowed'), false)
        }
    }
});

// Get all admins with pagination
app.get('/api/admins', async (req, res) => {
    try {
        const pool = await getDBPool();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let query = `SELECT * FROM admin WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as total FROM admin WHERE 1=1`;
        const params = [];
        const countParams = [];

        if (search) {
            query += ` AND (name LIKE ? OR email LIKE ? OR id LIKE ?)`;
            countQuery += ` AND (name LIKE ? OR email LIKE ? OR id LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        const admins = rows.map(admin => {
            const { password_hash, ...adminWithoutPassword } = admin;
            return {
                ...adminWithoutPassword,
                picture: admin.picture ? `/assets/admins/${path.basename(admin.picture)}` : null,
                is_superadmin: admin.is_superadmin === 1 || admin.is_superadmin === true
            };
        });

        res.json({
            success: true,
            data: admins,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ success: false, message: 'Error fetching admins' });
    }
});

// Get admin by ID
app.get('/api/admins/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const [rows] = await pool.execute(
            'SELECT * FROM admin WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'admin not found' });
        }

        const { password_hash, ...admin } = rows[0];
        admin.picture = admin.picture ? `/assets/admins/${path.basename(admin.picture)}` : null;
        admin.is_superadmin = admin.is_superadmin === 1 || admin.is_superadmin === true;

        res.json({ success: true, data: admin });
    } catch (error) {
        console.error('Error fetching admin:', error);
        res.status(500).json({ success: false, message: 'Error fetching admin' });
    }
});

// Add new admin
app.post('/api/admins', adminUpload.single('picture'), async (req, res) => {
    try {
        const pool = await getDBPool();

        const {
            id,
            name,
            email,
            status = 'Active',
            password,
            is_superadmin = 'false' // Force false as requested
        } = req.body;

        // Validate required fields
        if (!id || !name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'ID, name, email, and password are required'
            });
        }

        // Check if ID already exists
        const [existingId] = await pool.execute(
            'SELECT id FROM admin WHERE id = ?',
            [id]
        );

        if (existingId.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'admin ID already exists'
            });
        }

        // Check if email already exists globally
        if (await checkEmailExistsGlobally(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Handle image upload
        let picturePath = null;
        if (req.file) {
            picturePath = `/assets/admins/${req.file.filename}`;
        }

        // Force is_superadmin to false (as requested)
        const isSuperadmin = false;

        // Insert admin
        await pool.execute(
            `INSERT INTO admin 
             (id, name, picture, email, status, password_hash, is_superadmin) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, name, picturePath, email, status, password_hash, isSuperadmin]
        );

        // Get the created admin
        const [newAdminRows] = await pool.execute(
            'SELECT * FROM admin WHERE id = ?',
            [id]
        );

        const { password_hash: _, ...admin } = newAdminRows[0];
        admin.picture = admin.picture ? `/assets/admins/${path.basename(admin.picture)}` : null;
        admin.is_superadmin = admin.is_superadmin === 1 || admin.is_superadmin === true;

        res.status(201).json({
            success: true,
            message: 'admin created successfully',
            data: admin
        });
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ success: false, message: 'Error creating admin: ' + error.message });
    }
});

// Update admin
app.put('/api/admins/:id', adminUpload.single('picture'), async (req, res) => {
    try {
        const pool = await getDBPool();
        const adminId = req.params.id;
        const {
            name,
            email,
            status,
            password,
            is_superadmin // We'll ignore this field for updates
        } = req.body;

        // Check if admin exists
        const [existingAdmin] = await pool.execute(
            'SELECT * FROM admin WHERE id = ?',
            [adminId]
        );

        if (existingAdmin.length === 0) {
            return res.status(404).json({ success: false, message: 'admin not found' });
        }

        // Check if trying to update a superadmin
        if (existingAdmin[0].is_superadmin === 1 || existingAdmin[0].is_superadmin === true) {
            return res.status(403).json({
                success: false,
                message: 'Superadmin accounts cannot be modified'
            });
        }

        // Check if email is being changed and already exists globally
        if (email && email !== existingAdmin[0].email) {
            if (await checkEmailExistsGlobally(email, adminId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        // Build update query - DO NOT UPDATE is_superadmin field
        let updateFields = [];
        let params = [];

        if (name) { updateFields.push('name = ?'); params.push(name); }
        if (email) { updateFields.push('email = ?'); params.push(email); }
        if (status) { updateFields.push('status = ?'); params.push(status); }

        // Handle password update
        if (password) {
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);
            updateFields.push('password_hash = ?');
            params.push(password_hash);
        }

        // Handle image upload
        let picturePath = existingAdmin[0].picture;
        if (req.file) {
            // Delete old image if exists
            if (picturePath && fs.existsSync(path.join(__dirname, picturePath))) {
                fs.unlinkSync(path.join(__dirname, picturePath));
            }
            picturePath = `/assets/admins/${req.file.filename}`;
            updateFields.push('picture = ?');
            params.push(picturePath);
        }

        // Add updated_at and adminId to params
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(adminId);

        // Update admin
        await pool.execute(
            `UPDATE admin SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        // Get updated admin
        const [updatedRows] = await pool.execute(
            'SELECT * FROM admin WHERE id = ?',
            [adminId]
        );

        const { password_hash, ...admin } = updatedRows[0];
        admin.picture = admin.picture ? `/assets/admins/${path.basename(admin.picture)}` : null;
        admin.is_superadmin = admin.is_superadmin === 1 || admin.is_superadmin === true;

        res.json({
            success: true,
            message: 'admin updated successfully',
            data: admin
        });
    } catch (error) {
        console.error('Error updating admin:', error);
        res.status(500).json({ success: false, message: 'Error updating admin' });
    }
});

// Delete admin
app.delete('/api/admins/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const adminId = req.params.id;

        // Check if admin exists
        const [existingAdmin] = await pool.execute(
            'SELECT * FROM admin WHERE id = ?',
            [adminId]
        );

        if (existingAdmin.length === 0) {
            return res.status(404).json({ success: false, message: 'admin not found' });
        }

        // Check if trying to delete a superadmin
        if (existingAdmin[0].is_superadmin === 1 || existingAdmin[0].is_superadmin === true) {
            return res.status(403).json({
                success: false,
                message: 'Superadmin accounts cannot be deleted'
            });
        }

        // Delete image file if exists
        const picturePath = existingAdmin[0].picture;
        if (picturePath && fs.existsSync(path.join(__dirname, picturePath))) {
            fs.unlinkSync(path.join(__dirname, picturePath));
        }

        // Delete admin from database
        await pool.execute('DELETE FROM admin WHERE id = ?', [adminId]);

        res.json({
            success: true,
            message: 'admin deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ success: false, message: 'Error deleting admin' });
    }
});




// ====================================================
// ✅ staff Profile Endpoints (Self-Service)
// ====================================================

// Get Own Profile
app.get('/api/staff/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const pool = await getDBPool();
        const [rows] = await pool.execute(`
            SELECT s.*, d.name as designation_name 
            FROM staff s 
            LEFT JOIN designation d ON s.designation_id = d.id 
            WHERE s.id = ?
        `, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'staff not found' });
        }

        const { password_hash, ...staff } = rows[0];
        staff.picture = staff.picture ? `/assets/staff/${path.basename(staff.picture)}` : '/assets/default%20user%20icon.png';

        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('Error fetching staff profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update Own Profile
app.put('/api/staff/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { name, email, phone } = req.body;
        const pool = await getDBPool();

        // Check if email already exists globally
        if (email) {
            if (await checkEmailExistsGlobally(email, userId)) {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }
        }

        let updateFields = [];
        let params = [];

        if (name) { updateFields.push('name = ?'); params.push(name); }
        if (email) { updateFields.push('email = ?'); params.push(email); }
        if (phone !== undefined) { updateFields.push('phone = ?'); params.push(phone); }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);

        await pool.execute(
            `UPDATE staff SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating staff profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Change Password
app.put('/api/staff/profile/password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { currentPassword, newPassword } = req.body;
        const pool = await getDBPool();

        const [staff] = await pool.execute('SELECT password_hash FROM staff WHERE id = ?', [userId]);
        if (staff.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const isValid = await bcrypt.compare(currentPassword, staff[0].password_hash);
        if (!isValid) return res.status(400).json({ success: false, message: 'Incorrect current password' });

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE staff SET password_hash = ? WHERE id = ?', [newHash, userId]);

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Upload Picture
app.post('/api/staff/profile/picture', authenticateToken, upload.single('picture'), async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const picturePath = `/assets/staff/${req.file.filename}`;
        const pool = await getDBPool();

        const [old] = await pool.execute('SELECT picture FROM staff WHERE id = ?', [userId]);
        if (old.length > 0 && old[0].picture) {
            const oldPath = path.join(__dirname, old[0].picture);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await pool.execute('UPDATE staff SET picture = ? WHERE id = ?', [picturePath, userId]);
        res.json({ success: true, message: 'Picture updated', data: { picture: `/assets/staff/${req.file.filename}` } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// ====================================================
// ✅ staff Endpoints
// ====================================================

app.get('/api/staff', async (req, res) => {
    try {
        const pool = await getDBPool();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let query = `
            SELECT s.*, d.name as designation_name 
            FROM staff s 
            LEFT JOIN designation d ON s.designation_id = d.id
            WHERE 1=1
        `;
        let countQuery = `SELECT COUNT(*) as total FROM staff s WHERE 1=1`;
        const params = [];
        const countParams = [];

        if (search) {
            query += ` AND (s.name LIKE ? OR s.email LIKE ? OR s.phone LIKE ? OR s.id LIKE ?)`;
            countQuery += ` AND (s.name LIKE ? OR s.email LIKE ? OR s.phone LIKE ? OR s.id LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        // Remove password_hash from response
        const staffList = rows.map(staff => {
            const { password_hash, ...staffWithoutPassword } = staff;
            return {
                ...staffWithoutPassword,
                picture: staff.picture ? `/assets/staff/${path.basename(staff.picture)}` : null
            };
        });

        res.json({
            success: true,
            data: staffList,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ success: false, message: 'Error fetching staff' });
    }
});



// Get staff by ID
// ====================================================
// ✅ staff Dashboard API & Helpers
// ====================================================
async function getStaffDashboardStats(staffId) {
    const pool = await getDBPool();
    const [totalRes] = await pool.execute('SELECT COUNT(*) as count FROM complaint WHERE staff_id = ?', [staffId]);
    const [unresolvedRes] = await pool.execute("SELECT COUNT(*) as count FROM complaint WHERE staff_id = ? AND status IN ('Pending', 'In Progress', 'On Hold')", [staffId]);
    const [inProgressRes] = await pool.execute("SELECT COUNT(*) as count FROM complaint WHERE staff_id = ? AND status = 'In Progress'", [staffId]);
    const [completedMonthRes] = await pool.execute(
        `SELECT COUNT(*) as count FROM complaint 
         WHERE staff_id = ? AND status = 'Completed' 
         AND MONTH(updated_at) = MONTH(CURRENT_DATE()) 
         AND YEAR(updated_at) = YEAR(CURRENT_DATE())`,
        [staffId]
    );
    return {
        totalAssigned: totalRes[0].count || 0,
        unresolved: unresolvedRes[0].count || 0,
        inProgress: inProgressRes[0].count || 0,
        completedMonth: completedMonthRes[0].count || 0
    };
}
async function getStaffRecentComplaints(staffId) {
    const pool = await getDBPool();
    const [complaints] = await pool.execute('SELECT id, title, created_at as date, status FROM complaint WHERE staff_id = ? ORDER BY created_at DESC LIMIT 10', [staffId]);
    return complaints;
}
async function getStaffChartData(staffId, period = 'week') {
    const pool = await getDBPool();
    const labels = period === 'week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    try {
        if (period === 'week') {
            const [rows] = await pool.execute(`
                SELECT DAYOFWEEK(created_at) as dayIndex, 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('Completed', 'Resolved') THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status IN ('Pending', 'In Progress', 'On Hold') THEN 1 ELSE 0 END) as pending
                FROM complaint WHERE staff_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY dayIndex`, [staffId]);
            const dayData = Array(7).fill(0).map(() => ({ total: 0, pending: 0, completed: 0 }));
            rows.forEach(r => {
                const idx = (r.dayIndex + 5) % 7;
                dayData[idx] = { total: r.total || 0, pending: r.pending || 0, completed: r.completed || 0 };
            });
            return { labels, total: dayData.map(d => d.total), pending: dayData.map(d => d.pending), completed: dayData.map(d => d.completed) };
        } else {
            const [rows] = await pool.execute(`
                SELECT FLOOR(DATEDIFF(CURDATE(), created_at) / 7) as weekOffset,
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('Completed', 'Resolved') THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status IN ('Pending', 'In Progress', 'On Hold') THEN 1 ELSE 0 END) as pending
                FROM complaint WHERE staff_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
                GROUP BY weekOffset`, [staffId]);
            const weekData = Array(4).fill(0).map(() => ({ total: 0, pending: 0, completed: 0 }));
            rows.forEach(r => {
                const idx = 3 - r.weekOffset;
                if (idx >= 0 && idx < 4) weekData[idx] = { total: r.total || 0, pending: r.pending || 0, completed: r.completed || 0 };
            });
            return { labels, total: weekData.map(d => d.total), pending: weekData.map(d => d.pending), completed: weekData.map(d => d.completed) };
        }
    } catch (e) { return { labels, total: Array(labels.length).fill(0), pending: Array(labels.length).fill(0), completed: Array(labels.length).fill(0) }; }
}
async function getStaffRecentNotifications(staffId) {
    const pool = await getDBPool();
    try {
        // Only show complaints assigned to the staff that are NOT complete, rejected, or cancelled
        const [assignments] = await pool.execute(`
            SELECT id, title, created_at as time 
            FROM complaint 
            WHERE staff_id = ? 
              AND status NOT IN ('Completed', 'Rejected', 'Cancelled')
            ORDER BY created_at DESC 
            LIMIT 5
        `, [staffId]);

        const notifications = assignments.map(a => ({
            id: `assign-${a.id}`,
            text: `Complaint ${a.id} has been assigned to you.`,
            time: a.time,
            type: 'assigned'
        }));

        return notifications;
    } catch (e) {
        console.error('Error in getStaffRecentNotifications:', e);
        return [];
    }
}
async function getStaffUserInfo(staffId) {
    const pool = await getDBPool();
    const [rows] = await pool.execute('SELECT name FROM staff WHERE id = ?', [staffId]);
    return rows[0] || { name: 'Unknown staff' };
}
app.get('/api/staff/dashboard-summary', authenticateToken, async (req, res) => {
    console.log('[API] staff Dashboard Summary hit');
    try {
        const staffId = req.user.id || req.user.userId;
        const role = (req.user.role || '').toLowerCase();
        if (role !== 'staff') return res.status(403).json({ success: false, message: 'Access denied. staff only.' });
        const period = req.query.period || 'week';
        const [stats, complaints, chartData, userInfo, notifications] = await Promise.all([
            getStaffDashboardStats(staffId), getStaffRecentComplaints(staffId), getStaffChartData(staffId, period), getStaffUserInfo(staffId), getStaffRecentNotifications(staffId)
        ]);
        res.json({ success: true, data: { stats, complaints, notifications, chartData, userInfo } });
    } catch (error) { console.error('staff Dashboard Summary Error:', error); res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' }); }
});

// ====================================================
// ✅ HANDLER DASHBOARD BACKEND
// ====================================================

async function getHandlerDashboardStats(handlerId) {
    const pool = await getDBPool();
    const [counts] = await pool.execute(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
        FROM complaint
        WHERE receiver_id = ?
    `, [handlerId]);
    return counts[0] || { total: 0, pending: 0, inProgress: 0, completed: 0 };
}

async function getFoundItemsStats() {
    const pool = await getDBPool();
    const [counts] = await pool.execute(`
        SELECT 
            (SELECT COUNT(*) FROM found_items) as total,
            (SELECT COUNT(*) FROM found_items WHERE status = 'Returned') as returned,
            (SELECT COUNT(*) FROM found_item_claims WHERE status = 'pending') as pendingClaims
    `);
    return counts[0];
}

async function getHandlerChartData(handlerId, period = 'week') {
    const pool = await getDBPool();
    const statuses = ['Pending', 'In Progress', 'On Hold', 'Completed', 'Rejected', 'Cancelled'];

    let labels = [];
    let datasets = statuses.map(status => ({ label: status, data: [] }));

    if (period === 'week') {
        labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        // Get counts for the last 7 days partitioned by status
        const [rows] = await pool.execute(`
            SELECT 
                DAYOFWEEK(created_at) as day_index,
                status,
                COUNT(*) as count
            FROM complaint
            WHERE receiver_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY day_index, status
        `, [handlerId]);

        // Initialize with zeros
        datasets.forEach(ds => ds.data = new Array(7).fill(0));

        rows.forEach(row => {
            const ds = datasets.find(d => d.label === row.status);
            if (ds) ds.data[row.day_index - 1] = row.count;
        });
    } else {
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        const [rows] = await pool.execute(`
            SELECT 
                FLOOR((DAY(created_at)-1)/7) + 1 as week_index,
                status,
                COUNT(*) as count
            FROM complaint
            WHERE receiver_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY week_index, status
        `, [handlerId]);

        datasets.forEach(ds => ds.data = new Array(4).fill(0));

        rows.forEach(row => {
            const weekIdx = Math.min(row.week_index - 1, 3);
            const ds = datasets.find(d => d.label === row.status);
            if (ds) ds.data[weekIdx] = row.count;
        });
    }

    return { labels, datasets };
}

async function getHandlerCategoryDistribution(handlerId) {
    const pool = await getDBPool();
    const [rows] = await pool.execute(`
        SELECT n.name as label, COUNT(c.id) as value
        FROM natures n
        LEFT JOIN complaint c ON n.id = c.nature_id AND c.receiver_id = ?
        GROUP BY n.id
        HAVING value > 0
        ORDER BY value DESC
        LIMIT 10
    `, [handlerId]);
    return rows;
}

async function getHandlerUserInfo(id) {
    const pool = await getDBPool();
    const [rows] = await pool.execute('SELECT name, picture FROM complaintreceiver WHERE id = ?', [id]);
    return rows[0] || { name: 'Unknown Handler', picture: null };
}

app.get('/api/handler/dashboard-summary', authenticateToken, async (req, res) => {
    console.log('--- Handler Dashboard Summary API Hit ---');
    try {
        const handlerId = req.user.id || req.user.userId;
        console.log('Handler ID:', handlerId);
        const role = (req.user.role || '').toLowerCase();

        if (role !== 'complaintreceiver' && role !== 'handler') {
            // Check if user is actually a handler even if role name differs slightly
            if (req.user.userType !== 'complaintreceiver') {
                return res.status(403).json({ success: false, message: 'Access denied. Handler only.' });
            }
        }

        const period = req.query.period || 'week';
        const [stats, foundStats, chartData, categories, userInfo] = await Promise.all([
            getHandlerDashboardStats(handlerId),
            getFoundItemsStats(),
            getHandlerChartData(handlerId, period),
            getHandlerCategoryDistribution(handlerId),
            getHandlerUserInfo(handlerId)
        ]);

        console.log('Sending dashboard data:', { stats, foundStats, userInfo: userInfo.name });
        res.json({
            success: true,
            data: {
                stats,
                foundStats,
                chartData,
                categories,
                userInfo
            }
        });
    } catch (error) {
        console.error('Handler Dashboard Summary Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    }
});


app.get('/api/staff/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const [rows] = await pool.execute(
            `SELECT s.*, d.name as designation_name 
             FROM staff s 
             LEFT JOIN designation d ON s.designation_id = d.id 
             WHERE s.id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'staff not found' });
        }

        const { password_hash, ...staff } = rows[0];
        staff.picture = staff.picture ? `/assets/staff/${path.basename(staff.picture)}` : null;

        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ success: false, message: 'Error fetching staff' });
    }
});


// Add new staff - UPDATED WITH MORE DEBUGGING
app.post('/api/staff', upload.single('picture'), async (req, res) => {
    try {
        const pool = await getDBPool();

        console.log('=== START staff CREATION ===');
        console.log('Request body:', req.body);
        console.log('Files:', req.file);

        const {
            id,
            name,
            phone,
            email,
            designation_id,
            status = 'Active',
            password
        } = req.body;

        console.log('Parsed fields:');
        console.log('ID:', id);
        console.log('Name:', name);
        console.log('Email:', email);
        console.log('designation ID:', designation_id);
        console.log('Password exists:', !!password);

        // Validate required fields
        if (!id || !name || !email || !password) {
            console.log('Validation failed - missing fields');
            return res.status(400).json({
                success: false,
                message: 'ID, name, email, and password are required'
            });
        }

        // Check if ID already exists
        const [existingId] = await pool.execute(
            'SELECT id FROM staff WHERE id = ?',
            [id]
        );

        if (existingId.length > 0) {
            console.log('ID already exists:', id);
            return res.status(400).json({
                success: false,
                message: 'staff ID already exists'
            });
        }

        // Check if email already exists globally
        if (await checkEmailExistsGlobally(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Handle image upload
        let picturePath = null;
        if (req.file) {
            picturePath = `/assets/staff/${req.file.filename}`;
        }

        // Get designation name if provided instead of ID
        let finalDesignationId = designation_id;
        if (isNaN(designation_id) && designation_id) {
            const [designationRows] = await pool.execute(
                'SELECT id FROM designation WHERE name = ?',
                [designation_id]
            );
            if (designationRows.length > 0) {
                finalDesignationId = designationRows[0].id;
            } else {
                // Create new designation
                const [newDesignation] = await pool.execute(
                    'INSERT INTO designation (name) VALUES (?)',
                    [designation_id]
                );
                finalDesignationId = newDesignation.insertId;
            }
        }

        console.log('Final designation ID:', finalDesignationId);
        console.log('Picture path:', picturePath);
        console.log('Password hash generated:', !!password_hash);

        // Insert staff
        console.log('Inserting staff with ID:', id);
        const result = await pool.execute(
            `INSERT INTO staff 
             (id, name, picture, phone, email, designation_id, status, password_hash) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, picturePath, phone, email, finalDesignationId, status, password_hash]
        );

        console.log('Insert result:', result);
        console.log('Inserted staff ID:', id);

        // Get the created staff
        console.log('Fetching created staff...');
        const [newStaffRows] = await pool.execute(
            `SELECT s.*, d.name as designation_name 
             FROM staff s 
             LEFT JOIN designation d ON s.designation_id = d.id 
             WHERE s.id = ?`,
            [id]  // ✅ Using user-provided ID
        );

        console.log('New staff rows found:', newStaffRows.length);
        console.log('New staff rows:', newStaffRows);

        if (newStaffRows.length === 0) {
            console.log('ERROR: staff was inserted but not found when fetching!');
            // Even if not found, return success since it was inserted
            return res.status(201).json({
                success: true,
                message: 'staff created successfully (but could not fetch details)',
                data: { id, name, email, status }
            });
        }

        const { password_hash: _, ...staff } = newStaffRows[0];
        staff.picture = staff.picture ? `/assets/staff/${path.basename(staff.picture)}` : null;

        console.log('Final staff data to send:', staff);
        console.log('=== END staff CREATION ===');

        res.status(201).json({
            success: true,
            message: 'staff created successfully',
            data: staff
        });
    } catch (error) {
        console.error('Error creating staff:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ success: false, message: 'Error creating staff: ' + error.message });
    }
});


// Update staff
app.put('/api/staff/:id', upload.single('picture'), async (req, res) => {
    try {
        const pool = await getDBPool();
        const staffId = req.params.id;
        const {
            name,
            phone,
            email,
            designation_id,
            status,
            password
        } = req.body;

        // Check if staff exists
        const [existingStaff] = await pool.execute(
            'SELECT * FROM staff WHERE id = ?',
            [staffId]
        );

        if (existingStaff.length === 0) {
            return res.status(404).json({ success: false, message: 'staff not found' });
        }

        // Check if email is being changed and already exists globally
        if (email && email !== existingStaff[0].email) {
            if (await checkEmailExistsGlobally(email, staffId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        // Build update query dynamically
        let updateFields = [];
        let params = [];

        if (name) { updateFields.push('name = ?'); params.push(name); }
        if (phone !== undefined) { updateFields.push('phone = ?'); params.push(phone); }
        if (email) { updateFields.push('email = ?'); params.push(email); }
        if (status) { updateFields.push('status = ?'); params.push(status); }

        // Handle password update
        if (password) {
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);
            updateFields.push('password_hash = ?');
            params.push(password_hash);
        }

        // Handle designation
        let finalDesignationId = designation_id;
        if (designation_id !== undefined) {
            if (isNaN(designation_id) && designation_id) {
                const [designationRows] = await pool.execute(
                    'SELECT id FROM designation WHERE name = ?',
                    [designation_id]
                );
                if (designationRows.length > 0) {
                    finalDesignationId = designationRows[0].id;
                } else {
                    // Create new designation
                    const [newDesignation] = await pool.execute(
                        'INSERT INTO designation (name) VALUES (?)',
                        [designation_id]
                    );
                    finalDesignationId = newDesignation.insertId;
                }
            }
            updateFields.push('designation_id = ?');
            params.push(finalDesignationId);
        }

        // Handle image upload
        let picturePath = existingStaff[0].picture;
        if (req.file) {
            // Delete old image if exists
            if (picturePath && fs.existsSync(path.join(__dirname, picturePath))) {
                fs.unlinkSync(path.join(__dirname, picturePath));
            }
            picturePath = `/assets/staff/${req.file.filename}`;
            updateFields.push('picture = ?');
            params.push(picturePath);
        }

        // Add updated_at and staffId to params
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(staffId);

        // Update staff
        await pool.execute(
            `UPDATE staff SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        // Get updated staff
        const [updatedRows] = await pool.execute(
            `SELECT s.*, d.name as designation_name 
             FROM staff s 
             LEFT JOIN designation d ON s.designation_id = d.id 
             WHERE s.id = ?`,
            [staffId]
        );

        const { password_hash, ...staff } = updatedRows[0];
        staff.picture = staff.picture ? `/assets/staff/${path.basename(staff.picture)}` : null;

        res.json({
            success: true,
            message: 'staff updated successfully',
            data: staff
        });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ success: false, message: 'Error updating staff' });
    }
});


// Delete staff
app.delete('/api/staff/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const staffId = req.params.id;

        // Check if staff exists
        const [existingStaff] = await pool.execute(
            'SELECT picture FROM staff WHERE id = ?',
            [staffId]
        );

        if (existingStaff.length === 0) {
            return res.status(404).json({ success: false, message: 'staff not found' });
        }

        // Delete image file if exists
        const picturePath = existingStaff[0].picture;
        if (picturePath && fs.existsSync(path.join(__dirname, picturePath))) {
            fs.unlinkSync(path.join(__dirname, picturePath));
        }

        // Delete staff from database
        await pool.execute('DELETE FROM staff WHERE id = ?', [staffId]);

        res.json({
            success: true,
            message: 'staff deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ success: false, message: 'Error deleting staff' });
    }
});


// designation CRUD operations
app.get('/api/designations', async (req, res) => {
    try {
        const pool = await getDBPool();
        const [rows] = await pool.execute('SELECT * FROM designation ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching designations:', error);
        res.status(500).json({ success: false, message: 'Error fetching designations' });
    }
});


app.post('/api/designations', async (req, res) => {
    try {
        const pool = await getDBPool();
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'designation name is required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO designation (name) VALUES (?)',
            [name]
        );

        res.status(201).json({
            success: true,
            message: 'designation created successfully',
            data: { id: result.insertId, name }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'designation already exists' });
        }
        console.error('Error creating designation:', error);
        res.status(500).json({ success: false, message: 'Error creating designation' });
    }
});


app.put('/api/designations/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'designation name is required' });
        }

        await pool.execute(
            'UPDATE designation SET name = ? WHERE id = ?',
            [name, req.params.id]
        );

        res.json({
            success: true,
            message: 'designation updated successfully'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'designation already exists' });
        }
        console.error('Error updating designation:', error);
        res.status(500).json({ success: false, message: 'Error updating designation' });
    }
});


app.delete('/api/designations/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const designationId = req.params.id;

        // Check if any staff uses this designation
        const [staffUsing] = await pool.execute(
            'SELECT COUNT(*) as count FROM staff WHERE designation_id = ?',
            [designationId]
        );

        if (staffUsing[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete designation as it is being used by staff members'
            });
        }

        await pool.execute('DELETE FROM designation WHERE id = ?', [designationId]);

        res.json({
            success: true,
            message: 'designation deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting designation:', error);
        res.status(500).json({ success: false, message: 'Error deleting designation' });
    }
});





// ====================================================
// ✅ customer Endpoints
// ====================================================

// Get all customers with pagination and search
app.get('/api/customers', async (req, res) => {
    try {
        const pool = await getDBPool();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let query = `SELECT * FROM customer WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as total FROM customer WHERE 1=1`;
        const params = [];
        const countParams = [];

        if (search) {
            query += ` AND (name LIKE ? OR email LIKE ? OR customer_id LIKE ? OR phone_number LIKE ?)`;
            countQuery += ` AND (name LIKE ? OR email LIKE ? OR customer_id LIKE ? OR phone_number LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        // Add full picture URL
        const customers = rows.map(customer => ({
            ...customer,
            picture: customer.picture ? `/assets/customers/${path.basename(customer.picture)}` : null
        }));

        res.json({
            success: true,
            data: customers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ success: false, message: 'Error fetching customers' });
    }
});

// Get single customer by ID
app.get('/api/customers/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const [rows] = await pool.execute(
            'SELECT * FROM customer WHERE customer_id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'customer not found' });
        }

        const customer = rows[0];
        customer.picture = customer.picture ? `/assets/customers/${path.basename(customer.picture)}` : null;

        res.json({ success: true, data: customer });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ success: false, message: 'Error fetching customer' });
    }
});

// Update customer status
app.put('/api/customers/:id/status', async (req, res) => {
    try {
        const pool = await getDBPool();
        const { status } = req.body;

        if (!status || !['Active', 'Disabled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status (Active/Disabled) is required'
            });
        }

        // Check if customer exists
        const [existingCustomer] = await pool.execute(
            'SELECT customer_id FROM customer WHERE customer_id = ?',
            [req.params.id]
        );

        if (existingCustomer.length === 0) {
            return res.status(404).json({ success: false, message: 'customer not found' });
        }

        // Update status
        await pool.execute(
            'UPDATE customer SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?',
            [status, req.params.id]
        );

        // Get updated customer
        const [updatedCustomer] = await pool.execute(
            'SELECT * FROM customer WHERE customer_id = ?',
            [req.params.id]
        );

        const customer = updatedCustomer[0];
        customer.picture = customer.picture ? `/assets/customers/${path.basename(customer.picture)}` : null;

        res.json({
            success: true,
            message: 'customer status updated successfully',
            data: customer
        });
    } catch (error) {
        console.error('Error updating customer status:', error);
        res.status(500).json({ success: false, message: 'Error updating customer status' });
    }
});




// ====================================================
// ✅ admin: Receiver Reporting Endpoints
// ====================================================

/**
 * @route   GET /api/admin/receivers-report
 * @desc    Get all complaint receivers with assignment stats
 * @access  Private (admin)
 */
app.get('/api/admin/receivers-report', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();

        const [rows] = await pool.execute(`
            SELECT
                cr.id,
                cr.name,
                cr.email,
                cr.phone_number,
                cr.status,
                -- Total complaints this receiver has handled
                COUNT(DISTINCT c.id)                                   AS total_received,
                -- Total complaints that have a staff assigned via this receiver
                COUNT(DISTINCT sal.complaint_id)                       AS assigned_count,
                -- Average minutes between complaint creation and first staff assignment
                ROUND(
                    AVG(
                        TIMESTAMPDIFF(MINUTE, c.created_at, sal.changed_at)
                    ), 1
                )                                                      AS avg_assign_time_mins
            FROM complaintreceiver cr
            LEFT JOIN complaint c
                ON c.receiver_id = cr.id
            LEFT JOIN (
                -- Only take each receiver's first assignment per complaint
                SELECT complaint_id, changed_by_receiver_id, MIN(changed_at) AS changed_at
                FROM staff_assignment_logs
                GROUP BY complaint_id, changed_by_receiver_id
            ) sal
                ON sal.complaint_id = c.id
                AND sal.changed_by_receiver_id = cr.id
            GROUP BY cr.id, cr.name, cr.email, cr.phone_number, cr.status
            ORDER BY cr.name ASC
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching receivers report:', error);
        res.status(500).json({ success: false, message: 'Error fetching receivers report' });
    }
});


/**
 * @route   GET /api/admin/receivers-report/:id/details
 * @desc    Get detailed status & staff-assignment logs for a receiver, filtered by date range
 * @access  Private (admin)
 * @query   from (YYYY-MM-DD), to (YYYY-MM-DD)
 */
app.get('/api/admin/receivers-report/:id/details', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const receiverId = req.params.id;
        const from = req.query.from || '2000-01-01';
        const to = req.query.to || '2099-12-31';

        // Pad 'to' to end of day
        const toEndOfDay = `${to} 23:59:59`;

        // 1. Receiver info
        const [receiverRows] = await pool.execute(
            'SELECT id, name, email, status FROM complaintreceiver WHERE id = ?',
            [receiverId]
        );
        if (receiverRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Receiver not found' });
        }

        // 2. Status change logs (complaints this receiver changed the status of)
        const [statusLogs] = await pool.execute(`
            SELECT
                csh.complaint_id,
                csh.previous_status,
                csh.new_status,
                csh.changed_at
            FROM complaint_status_history csh
            WHERE csh.changed_by_receiver_id = ?
              AND csh.changed_at BETWEEN ? AND ?
            ORDER BY csh.changed_at ASC
        `, [receiverId, from, toEndOfDay]);

        // 3. staff assignment logs (assignments this receiver made)
        const [staffLogs] = await pool.execute(`
            SELECT
                sal.complaint_id,
                prev_s.name  AS previous_staff_name,
                sal.previous_staff_id,
                new_s.name   AS new_staff_name,
                sal.new_staff_id,
                sal.changed_at
            FROM staff_assignment_logs sal
            LEFT JOIN staff prev_s ON prev_s.id = sal.previous_staff_id
            LEFT JOIN staff new_s  ON new_s.id  = sal.new_staff_id
            WHERE sal.changed_by_receiver_id = ?
              AND sal.changed_at BETWEEN ? AND ?
            ORDER BY sal.changed_at ASC
        `, [receiverId, from, toEndOfDay]);

        res.json({
            success: true,
            data: {
                receiverInfo: receiverRows[0],
                statusLogs,
                staffLogs
            }
        });
    } catch (error) {
        console.error('Error fetching receiver details:', error);
        res.status(500).json({ success: false, message: 'Error fetching receiver details' });
    }
});


// ====================================================
// ✅ admin Profile Endpoints (Self-Service)
// ====================================================

// Get Own Profile
app.get('/api/admin/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const pool = await getDBPool();
        const [rows] = await pool.execute('SELECT * FROM admin WHERE id = ?', [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'admin not found' });
        }

        const { password_hash, ...admin } = rows[0];
        admin.picture = admin.picture ? `/assets/admins/${path.basename(admin.picture)}` : null;
        // Ensure boolean
        admin.is_superadmin = admin.is_superadmin === 1 || admin.is_superadmin === true;

        res.json({ success: true, data: admin });
    } catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update Own Profile
app.put('/api/admin/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { name, email } = req.body;
        const pool = await getDBPool();

        // Check if email already exists globally
        if (email) {
            if (await checkEmailExistsGlobally(email, userId)) {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }
        }

        let updateFields = [];
        let params = [];

        if (name) { updateFields.push('name = ?'); params.push(name); }
        if (email) { updateFields.push('email = ?'); params.push(email); }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);

        await pool.execute(
            `UPDATE admin SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating admin profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Change Password
app.put('/api/admin/profile/password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { currentPassword, newPassword } = req.body;
        const pool = await getDBPool();

        const [admin] = await pool.execute('SELECT password_hash FROM admin WHERE id = ?', [userId]);
        if (admin.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const isValid = await bcrypt.compare(currentPassword, admin[0].password_hash);
        if (!isValid) return res.status(400).json({ success: false, message: 'Incorrect current password' });

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE admin SET password_hash = ? WHERE id = ?', [newHash, userId]);

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Upload Picture
app.post('/api/admin/profile/picture', authenticateToken, adminUpload.single('picture'), async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const picturePath = `/assets/admins/${req.file.filename}`;
        const pool = await getDBPool();

        const [old] = await pool.execute('SELECT picture FROM admin WHERE id = ?', [userId]);
        if (old.length > 0 && old[0].picture) {
            const oldPath = path.join(__dirname, old[0].picture);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await pool.execute('UPDATE admin SET picture = ? WHERE id = ?', [picturePath, userId]);
        res.json({ success: true, message: 'Picture updated', data: { picture: `/assets/admins/${req.file.filename}` } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});




const complaintManagerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'assets/cmanager/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'cmanager-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const complaintManagerUpload = multer({
    storage: complaintManagerStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true)
        } else {
            cb(new Error('Only image files are allowed'), false)
        }
    }
});

// ====================================================
// ✅ Handler Profile Endpoints (Self-Service)
// ====================================================

// Get Own Profile
app.get('/api/handler/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const pool = await getDBPool();
        const [rows] = await pool.execute('SELECT * FROM complaintreceiver WHERE id = ?', [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Handler not found' });
        }

        const { password_hash, ...handler } = rows[0];
        handler.picture = handler.picture ? `/assets/cmanager/${path.basename(handler.picture)}` : '/assets/default%20user%20icon.png';

        res.json({ success: true, data: handler });
    } catch (error) {
        console.error('Error fetching handler profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update Own Profile
app.put('/api/handler/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { name, email, phone_number } = req.body;
        const pool = await getDBPool();

        // Check if email already exists globally
        if (email) {
            if (await checkEmailExistsGlobally(email, userId)) {
                return res.status(400).json({ success: false, message: 'Email already exists' });
            }
        }

        let updateFields = [];
        let params = [];

        if (name) { updateFields.push('name = ?'); params.push(name); }
        if (email) { updateFields.push('email = ?'); params.push(email); }
        if (phone_number !== undefined) { updateFields.push('phone_number = ?'); params.push(phone_number || null); }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);

        await pool.execute(
            `UPDATE complaintreceiver SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating handler profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// Change Password
app.put('/api/handler/profile/password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { currentPassword, newPassword } = req.body;
        const pool = await getDBPool();

        const [handler] = await pool.execute('SELECT password_hash FROM complaintreceiver WHERE id = ?', [userId]);
        if (handler.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const isValid = await bcrypt.compare(currentPassword, handler[0].password_hash);
        if (!isValid) return res.status(400).json({ success: false, message: 'Incorrect current password' });

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE complaintreceiver SET password_hash = ? WHERE id = ?', [newHash, userId]);

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Upload Picture
app.post('/api/handler/profile/picture', authenticateToken, complaintManagerUpload.single('picture'), async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const picturePath = `/assets/cmanager/${req.file.filename}`;
        const pool = await getDBPool();

        const [old] = await pool.execute('SELECT picture FROM complaintreceiver WHERE id = ?', [userId]);
        if (old.length > 0 && old[0].picture) {
            const oldPath = path.join(__dirname, old[0].picture);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await pool.execute('UPDATE complaintreceiver SET picture = ? WHERE id = ?', [picturePath, userId]);
        res.json({ success: true, message: 'Picture updated', data: { picture: `/assets/cmanager/${req.file.filename}` } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});



// ====================================================
// ✅ Complaint Manager Endpoints
// ====================================================


// Get all complaint managers with pagination
app.get('/api/complaint-receivers', async (req, res) => {
    try {
        const pool = await getDBPool();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let query = `SELECT * FROM complaintreceiver WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as total FROM complaintreceiver WHERE 1=1`;
        const params = [];
        const countParams = [];

        if (search) {
            query += ` AND (name LIKE ? OR email LIKE ? OR id LIKE ?)`;
            countQuery += ` AND (name LIKE ? OR email LIKE ? OR id LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, countParams);
        const total = countResult[0].total;

        const managers = rows.map(manager => {
            const { password_hash, ...managerWithoutPassword } = manager;
            return {
                ...managerWithoutPassword,
                picture: manager.picture ? `/assets/cmanager/${path.basename(manager.picture)}` : null
            };
        });

        res.json({
            success: true,
            data: managers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching complaint managers:', error);
        res.status(500).json({ success: false, message: 'Error fetching complaint managers' });
    }
});

// Get complaint manager by ID
app.get('/api/complaint-receivers/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const [rows] = await pool.execute(
            'SELECT * FROM complaintreceiver WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Complaint manager not found' });
        }

        const { password_hash, ...manager } = rows[0];
        manager.picture = manager.picture ? `/assets/cmanager/${path.basename(manager.picture)}` : null;

        res.json({ success: true, data: manager });
    } catch (error) {
        console.error('Error fetching complaint manager:', error);
        res.status(500).json({ success: false, message: 'Error fetching complaint manager' });
    }
});

// Add new complaint manager
app.post('/api/complaint-receivers', complaintManagerUpload.single('picture'), async (req, res) => {
    try {
        const pool = await getDBPool();

        const {
            id,
            name,
            email,
            status = 'Active',
            password,
            phone_number
        } = req.body;

        // Validate required fields
        if (!id || !name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'ID, name, email, and password are required'
            });
        }

        // Check if ID already exists
        const [existingId] = await pool.execute(
            'SELECT id FROM complaintreceiver WHERE id = ?',
            [id]
        );

        if (existingId.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Manager ID already exists'
            });
        }

        // Check if email already exists globally
        if (await checkEmailExistsGlobally(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Handle image upload
        let picturePath = null;
        if (req.file) {
            picturePath = `/assets/cmanager/${req.file.filename}`;
        }

        // Insert complaint manager
        await pool.execute(
            `INSERT INTO complaintreceiver 
             (id, name, picture, email, phone_number, status, password_hash) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, name, picturePath, email, phone_number || null, status, password_hash]
        );

        // Get the created manager
        const [newManagerRows] = await pool.execute(
            'SELECT * FROM complaintreceiver WHERE id = ?',
            [id]
        );

        const { password_hash: _, ...manager } = newManagerRows[0];
        manager.picture = manager.picture ? `/assets/cmanager/${path.basename(manager.picture)}` : null;

        res.status(201).json({
            success: true,
            message: 'Complaint manager created successfully',
            data: manager
        });
    } catch (error) {
        console.error('Error creating complaint manager:', error);
        res.status(500).json({ success: false, message: 'Error creating complaint manager: ' + error.message });
    }
});

// Update complaint manager
app.put('/api/complaint-receivers/:id', complaintManagerUpload.single('picture'), async (req, res) => {
    try {
        const pool = await getDBPool();
        const managerId = req.params.id;
        const {
            name,
            email,
            status,
            password,
            phone_number
        } = req.body;

        // Check if manager exists
        const [existingManager] = await pool.execute(
            'SELECT * FROM complaintreceiver WHERE id = ?',
            [managerId]
        );

        if (existingManager.length === 0) {
            return res.status(404).json({ success: false, message: 'Complaint manager not found' });
        }

        // Check if email is being changed and already exists globally
        if (email && email !== existingManager[0].email) {
            if (await checkEmailExistsGlobally(email, managerId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        // Build update query
        let updateFields = [];
        let params = [];

        if (name) { updateFields.push('name = ?'); params.push(name); }
        if (email) { updateFields.push('email = ?'); params.push(email); }
        if (status) { updateFields.push('status = ?'); params.push(status); }
        if (phone_number !== undefined) { updateFields.push('phone_number = ?'); params.push(phone_number || null); }

        // Handle password update
        if (password) {
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);
            updateFields.push('password_hash = ?');
            params.push(password_hash);
        }

        // Handle image upload
        let picturePath = existingManager[0].picture;
        if (req.file) {
            // Delete old image if exists
            if (picturePath && fs.existsSync(path.join(__dirname, picturePath))) {
                fs.unlinkSync(path.join(__dirname, picturePath));
            }
            picturePath = `/assets/cmanager/${req.file.filename}`;
            updateFields.push('picture = ?');
            params.push(picturePath);
        }

        // Add updated_at and managerId to params
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(managerId);

        // Update manager
        await pool.execute(
            `UPDATE complaintreceiver SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        // Get updated manager
        const [updatedRows] = await pool.execute(
            'SELECT * FROM complaintreceiver WHERE id = ?',
            [managerId]
        );

        const { password_hash, ...manager } = updatedRows[0];
        manager.picture = manager.picture ? `/assets/cmanager/${path.basename(manager.picture)}` : null;

        res.json({
            success: true,
            message: 'Complaint manager updated successfully',
            data: manager
        });
    } catch (error) {
        console.error('Error updating complaint manager:', error);
        res.status(500).json({ success: false, message: 'Error updating complaint manager' });
    }
});

// Delete complaint manager
app.delete('/api/complaint-receivers/:id', async (req, res) => {
    try {
        const pool = await getDBPool();
        const managerId = req.params.id;

        // Check if manager exists
        const [existingManager] = await pool.execute(
            'SELECT picture FROM complaintreceiver WHERE id = ?',
            [managerId]
        );

        if (existingManager.length === 0) {
            return res.status(404).json({ success: false, message: 'Complaint manager not found' });
        }

        // Delete image file if exists
        const picturePath = existingManager[0].picture;
        if (picturePath && fs.existsSync(path.join(__dirname, picturePath))) {
            fs.unlinkSync(path.join(__dirname, picturePath));
        }

        // Delete manager from database
        await pool.execute('DELETE FROM complaintreceiver WHERE id = ?', [managerId]);

        res.json({
            success: true,
            message: 'Complaint manager deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting complaint manager:', error);
        res.status(500).json({ success: false, message: 'Error deleting complaint manager' });
    }
});










// Get all priorities
app.get('/api/priorities', async (req, res) => {
    try {
        const db = await getDBPool();
        const [rows] = await db.query('SELECT * FROM priority ORDER BY value DESC');

        res.json(rows);
    } catch (error) {
        console.error('Error fetching priorities:', error);
        res.status(500).json({ error: 'Failed to fetch priorities' });
    }
});

// Get single priority by ID
app.get('/api/priorities/:id', async (req, res) => {
    try {
        const db = await getDBPool();
        const [rows] = await db.query('SELECT * FROM priority WHERE id = ?', [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'priority not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching priority:', error);
        res.status(500).json({ error: 'Failed to fetch priority' });
    }
});

// Create new priority
app.post('/api/priorities', async (req, res) => {
    try {
        const { name, value } = req.body;

        if (!name || !value) {
            return res.status(400).json({ error: 'Name and value are required' });
        }

        // Validate value range
        const numValue = parseInt(value);
        if (numValue < 1 || numValue > 720) {
            return res.status(400).json({ error: 'Value must be between 1 and 720 hours' });
        }

        // Check for duplicate name
        const db = await getDBPool();
        const [existing] = await db.query('SELECT id FROM priority WHERE name = ?', [name]);

        if (existing.length > 0) {
            return res.status(409).json({ error: 'priority with this name already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO priority (name, value) VALUES (?, ?)',
            [name, numValue]
        );

        const [newPriority] = await db.query('SELECT * FROM priority WHERE id = ?', [result.insertId]);

        res.status(201).json(newPriority[0]);
    } catch (error) {
        console.error('Error creating priority:', error);
        res.status(500).json({ error: 'Failed to create priority' });
    }
});

// Update priority
app.put('/api/priorities/:id', async (req, res) => {
    try {
        const { name, value } = req.body;

        if (!name || !value) {
            return res.status(400).json({ error: 'Name and value are required' });
        }

        // Validate value range
        const numValue = parseInt(value);
        if (numValue < 1 || numValue > 720) {
            return res.status(400).json({ error: 'Value must be between 1 and 720 hours' });
        }

        // Check if priority exists
        const db = await getDBPool();
        const [existing] = await db.query('SELECT id FROM priority WHERE id = ?', [req.params.id]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'priority not found' });
        }

        // Check for duplicate name (excluding current priority)
        const [duplicate] = await db.query(
            'SELECT id FROM priority WHERE name = ? AND id != ?',
            [name, req.params.id]
        );

        if (duplicate.length > 0) {
            return res.status(409).json({ error: 'priority with this name already exists' });
        }

        await db.query(
            'UPDATE priority SET name = ?, value = ? WHERE id = ?',
            [name, numValue, req.params.id]
        );

        const [updatedPriority] = await db.query('SELECT * FROM priority WHERE id = ?', [req.params.id]);

        res.json(updatedPriority[0]);
    } catch (error) {
        console.error('Error updating priority:', error);
        res.status(500).json({ error: 'Failed to update priority' });
    }
});

// Delete priority
app.delete('/api/priorities/:id', async (req, res) => {
    try {
        const db = await getDBPool();

        // Check if priority exists
        const [existing] = await db.query('SELECT id FROM priority WHERE id = ?', [req.params.id]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'priority not found' });
        }

        // Check if priority is being used (you can add this check based on your business logic)
        // Example: Check if any complaints use this priority
        // const [inUse] = await db.query('SELECT id FROM Complaints WHERE priority_id = ?', [req.params.id]);
        // if (inUse.length > 0) {
        //     return res.status(400).json({ error: 'Cannot delete priority that is in use' });
        // }

        await db.query('DELETE FROM priority WHERE id = ?', [req.params.id]);

        res.json({ success: true, message: 'priority deleted successfully' });
    } catch (error) {
        console.error('Error deleting priority:', error);
        res.status(500).json({ error: 'Failed to delete priority' });
    }
});




// ====================================================
// ✅ Found Items System APIs
// ====================================================

// Configuration for Found Item Images
const foundStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'assets', 'found');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const foundUpload = multer({
    storage: foundStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
        }
    }
});

// POST /api/found-items - Submit a new found item
app.post('/api/found-items', authenticateToken, foundUpload.array('pictures', 5), async (req, res) => {
    const connection = await getDBPool().then(pool => pool.getConnection());
    try {
        await connection.beginTransaction();

        const {
            title,
            category,
            date_found,
            description,
            location,
            location_details,
            city,
            postal_code,
            state_province,
            country,
            latitude,
            longitude
        } = req.body;

        if (!title || !category || !date_found) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const finalLocation = location_details ? `${location} (${location_details})` : location;

        const userId = req.user.id;

        // Insert into found_items table
        const [result] = await connection.execute(
            `INSERT INTO found_items 
            (title, category, date_found, description, location, city, postal_code, state_province, country, latitude, longitude, is_visible, customer_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                category,
                date_found,
                description || null,
                finalLocation || null,
                city || null,
                postal_code || null,
                state_province || null,
                country || null,
                latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null,
                false, // is_visible defaults to false for now
                userId
            ]
        );

        const foundItemId = result.insertId;

        // Insert uploaded pictures into found_item_pictures table
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const picturePath = `/assets/found/${file.filename}`;
                await connection.execute(
                    `INSERT INTO found_item_pictures (found_item_id, picture) VALUES (?, ?)`,
                    [foundItemId, picturePath]
                );
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Found item submitted successfully',
            foundItemId: foundItemId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Submit Found Item Error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit found item report' });
    } finally {
        connection.release();
    }
});

// Serve Found Item Images
app.use('/assets/found', express.static(path.join(__dirname, 'assets', 'found')));




// ====================================================
// ✅ GET /api/found-items - Get all items with filters
// ====================================================
app.get('/api/found-items', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();

        const {
            page = 1,
            limit = 10,
            search = '',
            category = '',
            status = '',
            sortBy = 'date_found',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build WHERE clause
        let whereConditions = ['1=1'];
        let queryParams = [];

        // Search filter
        if (search) {
            whereConditions.push('(fi.title LIKE ? OR fi.description LIKE ? OR fi.location LIKE ? OR fi.city LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Category filter
        if (category) {
            whereConditions.push('fi.category = ?');
            queryParams.push(category);
        }

        // Status filter
        if (status) {
            whereConditions.push('fi.status = ?');
            queryParams.push(status);
        }

        // Only show visible items? For staff pages, we might want to see all
        // For customer pages, we'd add: AND fi.is_visible = TRUE
        // For staff, we show all items regardless of visibility

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM found_items fi 
            WHERE ${whereClause}
        `;
        const [countResult] = await pool.execute(countQuery, queryParams);
        const total = countResult[0].total;

        // Get paginated items
        const itemsQuery = `
            SELECT 
                fi.id,
                fi.title as name,
                fi.category,
                fi.date_found as date,
                fi.location,
                fi.city,
                fi.state_province,
                fi.country,
                fi.postal_code,
                fi.latitude,
                fi.longitude,
                fi.description,
                fi.status,
                fi.is_visible,
                fi.date_found,
                NULL as finder,
                NULL as receivedBy,
                NULL as detailedLocation
            FROM found_items fi
            WHERE ${whereClause}
            ORDER BY fi.${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const paginatedParams = [...queryParams, parseInt(limit), parseInt(offset)];
        const [items] = await pool.execute(itemsQuery, paginatedParams);

        // For each item, get its pictures and claims
        for (let item of items) {
            // Get pictures
            const [pictures] = await pool.execute(
                `SELECT id, picture 
                 FROM found_item_pictures 
                 WHERE found_item_id = ?`,
                [item.id]
            );
            item.images = pictures.map(p => `/${p.picture}`);

            // Get claims with customer details
            const [claims] = await pool.execute(
                `SELECT 
                    fic.id,
                    c.customer_id,
                    c.name,
                    c.email,
                    c.phone_number as phone,
                    fic.claim_date,
                    fic.status
                 FROM found_item_claims fic
                 JOIN customer c ON fic.customer_id = c.customer_id
                 WHERE fic.found_item_id = ?
                 ORDER BY fic.claim_date DESC`,
                [item.id]
            );
            item.claims = claims;

            // Set receivedBy if status is 'returned' or 'collected'
            if (item.status === 'returned' || item.status === 'collected') {
                const [approvedClaim] = claims.filter(c => c.status === 'approved');
                item.receivedBy = approvedClaim?.name || null;
            }
        }

        res.json({
            success: true,
            data: items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching found items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch found items'
        });
    }
});

// ====================================================
// ✅ GET /api/found-items/:id - Get single item by ID
// ====================================================
app.get('/api/found-items/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const { id } = req.params;

        const [items] = await pool.execute(
            `SELECT 
                fi.id,
                fi.title as name,
                fi.category,
                fi.date_found as date,
                fi.location,
                fi.city,
                fi.state_province,
                fi.country,
                fi.postal_code,
                fi.latitude,
                fi.longitude,
                fi.description,
                fi.status,
                fi.is_visible,
                fi.customer_id as finder_id,
                c.name as finder_name,
                c.email as finder_email,
                c.phone_number as finder_phone,
                CONCAT(fi.location, ', ', fi.city, ', ', fi.state_province, ', ', fi.country) as full_location,
                CONCAT(fi.location, ' - ', fi.city) as detailedLocation
             FROM found_items fi
             LEFT JOIN customer c ON fi.customer_id = c.customer_id
             WHERE fi.id = ?`,
            [id]
        );

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        const item = items[0];

        // Get pictures
        const [pictures] = await pool.execute(
            `SELECT id, picture 
             FROM found_item_pictures 
             WHERE found_item_id = ?`,
            [id]
        );
        item.images = pictures.map(p => `${p.picture}`);

        // Get claims with customer details
        const [claims] = await pool.execute(
            `SELECT 
                fic.id,
                c.customer_id,
                c.name,
                c.email,
                c.phone_number as phone,
                fic.claim_date,
                fic.status
             FROM found_item_claims fic
             JOIN customer c ON fic.customer_id = c.customer_id
             WHERE fic.found_item_id = ?
             ORDER BY fic.claim_date DESC`,
            [id]
        );
        item.claims = claims;

        // Set receivedBy if status is 'returned' or 'collected'
        if (item.status === 'returned' || item.status === 'collected' || item.status === 'Returned' || item.status === 'Collected') {
            const approvedClaim = claims.find(c => c.status === 'approved' || c.status === 'Approved');
            if (approvedClaim) {
                item.receivedBy = `${approvedClaim.name} (${approvedClaim.customer_id})`;
            } else {
                item.receivedBy = null;
            }
        }

        res.json({
            success: true,
            data: item
        });

    } catch (error) {
        console.error('Error fetching found item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch found item'
        });
    }
});

// ====================================================
// ✅ PATCH /api/found-items/:id/status - Update item status
// ====================================================
app.patch('/api/found-items/:id/status', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['Pending', 'Collected', 'Returned', 'Unavailable'];
        const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

        if (!validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // Check if item exists
        const [item] = await pool.execute(
            'SELECT id FROM found_items WHERE id = ?',
            [id]
        );

        if (item.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Update status
        await pool.execute(
            'UPDATE found_items SET status = ? WHERE id = ?',
            [normalizedStatus, id]
        );

        // Log the action (optional)
        console.log(`Item ${id} status updated to ${normalizedStatus} by user ${req.user?.id}`);

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: { id, status: normalizedStatus }
        });

    } catch (error) {
        console.error('Error updating item status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update item status'
        });
    }
});

// ====================================================
// ✅ PATCH /api/found-items/:id/visibility - Update item visibility
// ====================================================
app.patch('/api/found-items/:id/visibility', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const { id } = req.params;
        const { isVisible } = req.body;

        if (typeof isVisible !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isVisible must be a boolean'
            });
        }

        // Check if item exists
        const [item] = await pool.execute(
            'SELECT id FROM found_items WHERE id = ?',
            [id]
        );

        if (item.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Update visibility
        await pool.execute(
            'UPDATE found_items SET is_visible = ? WHERE id = ?',
            [isVisible, id]
        );

        res.json({
            success: true,
            message: `Item visibility set to ${isVisible ? 'visible' : 'hidden'}`,
            data: { id, isVisible }
        });

    } catch (error) {
        console.error('Error updating item visibility:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update item visibility'
        });
    }
});

// ====================================================
// ✅ POST /api/found-items/:id/claims/:claimId/approve - Approve claim and mark as returned
// ====================================================
app.post('/api/found-items/:id/claims/:claimId/approve', authenticateToken, async (req, res) => {
    const connection = await (await getDBPool()).getConnection();

    try {
        await connection.beginTransaction();

        const { id: itemId, claimId } = req.params;

        // Check if item exists
        const [item] = await connection.execute(
            'SELECT id, status FROM found_items WHERE id = ?',
            [itemId]
        );

        if (item.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Check if claim exists and is pending
        const [claim] = await connection.execute(
            `SELECT fic.id, c.name 
             FROM found_item_claims fic
             JOIN customer c ON fic.customer_id = c.customer_id
             WHERE fic.id = ? AND fic.found_item_id = ? AND fic.status = 'pending'`,
            [claimId, itemId]
        );

        if (claim.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Pending claim not found'
            });
        }

        // Approve selected claim
        await connection.execute(
            'UPDATE found_item_claims SET status = ? WHERE id = ?',
            ['approved', claimId]
        );

        // Reject all other pending claims for this item
        await connection.execute(
            `UPDATE found_item_claims 
             SET status = ? 
             WHERE found_item_id = ? AND id != ? AND status = 'pending'`,
            ['rejected', itemId, claimId]
        );

        // Update item status to 'Returned'
        await connection.execute(
            'UPDATE found_items SET status = ? WHERE id = ?',
            ['Returned', itemId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: `Item marked as returned to ${claim[0].name}`,
            data: {
                itemId: parseInt(itemId),
                claimId: parseInt(claimId),
                claimantName: claim[0].name,
                status: 'Returned'
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error approving claim:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve claim'
        });
    } finally {
        connection.release();
    }
});

// ====================================================
// ✅ POST /api/found-items/:id/claims/:claimId/reject - Reject an individual claim
// ====================================================
app.post('/api/found-items/:id/claims/:claimId/reject', authenticateToken, async (req, res) => {
    try {
        const { id: itemId, claimId } = req.params;
        const pool = await getDBPool();

        const [result] = await pool.execute(
            'UPDATE found_item_claims SET status = ? WHERE id = ? AND found_item_id = ? AND status = ?',
            ['rejected', claimId, itemId, 'pending']
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pending claim not found'
            });
        }

        res.json({
            success: true,
            message: 'Claim rejected successfully'
        });
    } catch (error) {
        console.error('Error rejecting claim:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject claim'
        });
    }
});

// ====================================================
// ✅ GET /api/found-items/stats/summary - Get statistics
// ====================================================
app.get('/api/found-items/stats/summary', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();

        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'Collected' THEN 1 ELSE 0 END) as collected,
                SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) as returned,
                SUM(CASE WHEN status = 'Unavailable' THEN 1 ELSE 0 END) as unavailable
            FROM found_items
        `);

        // Get this month's items
        const [monthStats] = await pool.execute(`
            SELECT COUNT(*) as this_month
            FROM found_items
            WHERE MONTH(date_found) = MONTH(CURRENT_DATE())
            AND YEAR(date_found) = YEAR(CURRENT_DATE())
        `);

        res.json({
            success: true,
            data: {
                total: stats[0].total || 0,
                pending: stats[0].pending || 0,
                collected: stats[0].collected || 0,
                returned: stats[0].returned || 0,
                unavailable: stats[0].unavailable || 0,
                thisMonth: monthStats[0].this_month || 0
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});



// ====================================================
// ✅ customer Found Items APIs
// ====================================================

// Get items found by the current customer
app.get('/api/customer/my-found-items', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const customerId = req.user.customer_id || req.user.id || req.user.userId;

        if (!customerId) {
            return res.status(401).json({ success: false, message: 'Invalid user session' });
        }

        const {
            page = 1,
            limit = 10,
            search = '',
            category = '',
            status = '',
            sortBy = 'date_found',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build WHERE clause
        let whereConditions = ['customer_id = ?'];
        let queryParams = [customerId];

        if (search) {
            whereConditions.push('(title LIKE ? OR description LIKE ? OR location LIKE ? OR city LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (category && category !== 'all' && category !== '') {
            whereConditions.push('category = ?');
            queryParams.push(category);
        }

        if (status && status !== 'all' && status !== '') {
            // If the filter is 'pending', search for 'Pending'
            // If the filter is 'submitted', search for anything NOT 'Pending'
            if (status.toLowerCase() === 'pending') {
                whereConditions.push('status = ?');
                queryParams.push('Pending');
            } else if (status.toLowerCase() === 'submitted') {
                whereConditions.push('status != ?');
                queryParams.push('Pending');
            }
        }

        const whereClause = whereConditions.join(' AND ');

        const countQuery = `SELECT COUNT(*) as total FROM found_items WHERE ${whereClause}`;
        const [countResult] = await pool.execute(countQuery, queryParams);
        const total = countResult[0].total;

        const itemsQuery = `
            SELECT 
                id, title as name, category, date_found as date, description, 
                location, city, postal_code, state_province, country, 
                status, is_visible
            FROM found_items
            WHERE ${whereClause}
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const paginatedParams = [...queryParams, parseInt(limit), parseInt(offset)];
        const [items] = await pool.execute(itemsQuery, paginatedParams);

        // Fetch pictures for each item and map status
        for (let item of items) {
            const [pictures] = await pool.execute(
                'SELECT picture FROM found_item_pictures WHERE found_item_id = ?',
                [item.id]
            );
            item.images = pictures.map(p => `/assets/found/${path.basename(p.picture)}`);

            // Map status as per requirement: 'Pending' or 'Submitted'
            item.status = item.status === 'Pending' ? 'pending' : 'submitted';
        }

        res.json({
            success: true,
            data: items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching my found items:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your found items' });
    }
});

// Get visible found items for customers
app.get('/api/customer/found-items', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const {
            page = 1,
            limit = 10,
            search = '',
            category = '',
            status = '',
            sortBy = 'date_found',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build WHERE clause
        let whereConditions = ['is_visible = TRUE']; // Customers only see visible items
        let queryParams = [];

        if (search) {
            whereConditions.push('(title LIKE ? OR description LIKE ? OR location LIKE ? OR city LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (category && category !== 'all') {
            whereConditions.push('category = ?');
            queryParams.push(category);
        }

        if (status && status !== 'all') {
            whereConditions.push('status = ?');
            queryParams.push(status);
        }

        const whereClause = whereConditions.join(' AND ');

        const countQuery = `SELECT COUNT(*) as total FROM found_items WHERE ${whereClause}`;
        const [countResult] = await pool.execute(countQuery, queryParams);
        const total = countResult[0].total;

        const itemsQuery = `
            SELECT 
                id, title, category, date_found, description, 
                location, city, postal_code, state_province, country, 
                latitude, longitude, status, is_visible
            FROM found_items
            WHERE ${whereClause}
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const paginatedParams = [...queryParams, parseInt(limit), parseInt(offset)];
        const [items] = await pool.execute(itemsQuery, paginatedParams);

        // Fetch pictures for each item
        for (let item of items) {
            const [pictures] = await pool.execute(
                'SELECT picture FROM found_item_pictures WHERE found_item_id = ?',
                [item.id]
            );
            item.pictures = pictures.map(p => `/assets/found/${path.basename(p.picture)}`);
        }

        res.json({
            success: true,
            data: items,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching customer found items:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch items' });
    }
});

// Submit a claim for a found item
app.post('/api/customer/found-items/:id/claim', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const itemId = req.params.id;
        // Try to get customer ID from various token fields
        const customerId = req.user.customer_id || req.user.id || req.user.userId;

        if (!customerId) {
            return res.status(401).json({ success: false, message: 'Invalid user session' });
        }

        // Check if item exists and is pending
        const [item] = await pool.execute(
            'SELECT id, status FROM found_items WHERE id = ?',
            [itemId]
        );

        if (item.length === 0) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        if (item[0].status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'Item is not available for claiming' });
        }

        // Check if already claimed by this user
        const [existing] = await pool.execute(
            'SELECT id FROM found_item_claims WHERE found_item_id = ? AND customer_id = ?',
            [itemId, customerId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'You have already submitted a claim for this item' });
        }

        // Submit claim
        await pool.execute(
            'INSERT INTO found_item_claims (found_item_id, customer_id) VALUES (?, ?)',
            [itemId, customerId]
        );

        res.json({ success: true, message: 'Claim submitted successfully' });

    } catch (error) {
        console.error('Error submitting claim:', error);
        res.status(500).json({ success: false, message: 'Failed to submit claim' });
    }
});

// Get my claims
app.get('/api/customer/my-claims', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const customerId = req.user.customer_id || req.user.id || req.user.userId;

        if (!customerId) {
            return res.status(401).json({ success: false, message: 'Invalid user session' });
        }

        // Return a map of found_item_id -> claim status
        const [claims] = await pool.execute(
            'SELECT found_item_id, status FROM found_item_claims WHERE customer_id = ?',
            [customerId]
        );

        const claimsMap = {};
        claims.forEach(c => {
            claimsMap[c.found_item_id] = { status: c.status };
        });

        res.json({ success: true, data: claimsMap });

    } catch (error) {
        console.error('Error fetching user claims:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch claims' });
    }
});

// ====================================================
// ✅ Error Handling Middleware
// ====================================================
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.code === 'LIMIT_FILE_SIZE'
                ? 'File size too large (max 2MB)'
                : 'File upload error'
        });
    } else if (err) {
        console.error('Error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
    next();
});




// ====================================================
// ✅ FOUND ITEMS REPORT API (HANDLER)
// ====================================================
app.get('/api/handler/found-items-report', authenticateToken, async (req, res) => {
    try {
        const role = req.user.role.toLowerCase();
        if (role !== 'complaintreceiver' && role !== 'admin' && role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Forbidden: Only handlers can view this report' });
        }

        const pool = await getDBPool();
        const query = `
            SELECT 
                f.id as raw_id,
                CONCAT('I', LPAD(f.id, 3, '0')) as id,
                DATE_FORMAT(f.date_found, '%Y-%m-%d') as dateFound,
                f.title as name,
                f.category,
                LOWER(f.status) as status,
                f.location,
                COALESCE(c.name, '-') as claimedBy
            FROM found_items f
            LEFT JOIN found_item_claims fic ON f.id = fic.found_item_id AND fic.status = 'approved'
            LEFT JOIN customer c ON fic.customer_id = c.customer_id
            ORDER BY f.date_found DESC
        `;

        const [rows] = await pool.execute(query);

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Found Items Report API Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch found items report format' });
    }
});

// 🧩 WebSocket (kept)
// ====================================================
// ✅ WebSocket (optional, for real-time updates)
// ====================================================
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    console.log('WebSocket connected');
    ws.on('message', (message) => {
        console.log('Received:', message);
    });
});





// ====================================================
// ✅ Serve Assets
// ====================================================
app.use('/assets', express.static(path.join(__dirname, 'assets')));


// ====================================================
// ✅ Secure HTML Serving with Role → Folder Mapping
// ====================================================
app.use((req, res, next) => {
    try {
        let requestedPath = req.path;

        // Default landing
        if (requestedPath === '/') {
            console.log('Default landing page');
            requestedPath = '/login';
        }

        const firstSegment = requestedPath.split('/')[1];

        // Role → Folder mapping
        const roleFolderMap = {
            admin: 'admin',
            superadmin: 'admin',
            customer: 'customer',
            staff: 'staff',
            complaintreceiver: 'handler'
        };

        // Protected folders
        const protectedFolders = ['admin', 'customer', 'staff', 'handler'];

        // Serve static files
        const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
        const fileExtension = path.extname(requestedPath);

        if (staticExtensions.includes(fileExtension)) {
            const staticFile = path.join(__dirname, 'src', requestedPath);
            return res.sendFile(staticFile, err => {
                if (err) next();
            });
        }

        // Public access
        if (!protectedFolders.includes(firstSegment)) {
            const publicFile = path.join(__dirname, 'src', `${requestedPath}.html`);
            return res.sendFile(publicFile, err => {
                if (err) next();
            });
        }

        // Protected folders - Authentication required
        const accessToken = req.cookies.access_token;
        const refreshToken = req.cookies.refresh_token;

        // Helper function to extract user data from token
        const extractUserFromToken = (token) => {
            // Remove isRefreshToken field if present
            const { isRefreshToken, ...userData } = token;
            return userData;
        };

        // Helper function to check role and serve file
        const checkRoleAndServe = (tokenData) => {
            const userData = extractUserFromToken(tokenData);
            const userRole = userData.role.toLowerCase();
            const allowedFolder = roleFolderMap[userRole];

            if (!allowedFolder) {
                console.error('Role not recognized:', userRole);
                return res.redirect('/login');
            }

            if (firstSegment !== allowedFolder) {
                console.error('Trying to access wrong protected folder:', firstSegment, 'with role:', userRole);
                return res.redirect(`/${allowedFolder}/dashboard`);
            }

            const protectedFile = path.join(__dirname, 'src', `${requestedPath}.html`);
            return res.sendFile(protectedFile, err => {
                if (err) next();
            });
        };

        // Try access token first
        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, JWT_CONFIG.ACCESS_TOKEN_SECRET);
                console.log('Access token valid');
                return checkRoleAndServe(decoded);
            } catch (accessError) {
                console.log('Access token failed:', accessError.message);
                // Continue to check refresh token
            }
        }

        // If access token missing or failed, try refresh token
        if (refreshToken) {
            try {
                const decodedRefresh = jwt.verify(refreshToken, JWT_CONFIG.REFRESH_TOKEN_SECRET);
                console.log('Refresh token valid, granting access');

                // Check if this is actually a refresh token (has isRefreshToken flag)
                if (!decodedRefresh.isRefreshToken) {
                    console.error('Token is not a refresh token');
                    return res.redirect('/login');
                }

                return checkRoleAndServe(decodedRefresh);
            } catch (refreshError) {
                console.error('Refresh token verification failed:', refreshError.message);
                res.clearCookie('access_token');
                res.clearCookie('refresh_token');
                return res.redirect('/login');
            }
        }

        console.error('No valid tokens found');
        return res.redirect('/login');

    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.redirect('/login');
    }
});



// Only serve public assets (JS, CSS) safely
app.use('/public', express.static(path.join(__dirname, 'public')));



// ====================================================
// ✅ Redirect .html URLs → extensionless
// ====================================================
app.get(/^\/(.+)\.html$/, (req, res) => {
    const pageName = req.params[0];
    const query = req.originalUrl.split('?')[1];
    const redirectUrl = query ? `/${pageName}?${query}` : `/${pageName}`;
    res.redirect(301, redirectUrl);
});

// ====================================================
// ✅ Serve extensionless HTML pages (ANY DEPTH)
// ====================================================
app.use((req, res, next) => {
    const requestedPath = req.path === '/' ? '/login' : req.path;

    const filePath = path.join(__dirname, 'src', `${requestedPath}.html`);

    res.sendFile(filePath, err => {
        if (err) next();
    });
});

// ====================================================
// ❌ 404 handler
// ====================================================
app.use((req, res) => {
    res.status(404).send('Page not found');
});


// ====================================================
// ✅ Start Server
// ====================================================
// Clean up expired OTPs on server start
cleanupExpiredOTPs();

// Schedule cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 API available at http://localhost:${PORT}/api`);
    console.log(`🔧 OTP Configuration:`);
    console.log(`   Life: ${CONFIG.OTP_LIFE_MINUTES} minutes`);
    console.log(`   Cooldown: ${CONFIG.OTP_RESEND_COOLDOWN_SECONDS} seconds`);
    console.log(`   Max Daily Attempts: ${CONFIG.MAX_DAILY_ATTEMPTS}`);
    console.log(`   Length: ${CONFIG.OTP_LENGTH} digits`);
});
