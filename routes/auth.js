/**
 * Authentication routes (login, logout, refresh, verify, etc.)
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { JWT_CONFIG, CONFIG } = require('../config/app');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { upload, customerUpload, staffUpload, adminUpload, complaintManagerUpload, complaintUpload, uploadComplaintImage, buildingUpload, floorUpload, foundUpload } = require('../config/upload');

router.get('/verify', authenticateToken, async (req, res) => {
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

router.post('/login', async (req, res) => {
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
            maxAge: 15 * 60 * 1000 // 15 minutes
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

router.post('/refresh', async (req, res) => {
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
            maxAge: 15 * 60 * 1000
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

router.post('/logout', (req, res) => {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Note: This route is accessible at /api/auth/protected
// (original was /api/protected)
router.get('/protected', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'You have access to protected data',
        user: req.user
    });
});

router.get('/decode', authenticateToken, (req, res) => {
    res.json({
        success: true,
        payload: req.user
    });
});

router.get('/token-status', authenticateToken, (req, res) => {
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

router.post('/check-refresh', async (req, res) => {
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

router.get('/profile-image', authenticateToken, async (req, res) => {
    try {
        // Get user info from the token (added by authenticateToken middleware)
        const userId = req.user.id;
        const userRole = req.user.role;
        const userTable = req.user.table; // This comes from the token payload

        console.log(`Fetching profile image for user ID: ${userId}, Role: ${userRole}`);

        const pool = await getDBPool();
        let imageUrl = null;
        let user = null;

        // Query the appropriate table based on user's role/table
        if (userTable === 'customer') {
            // customer table uses customer_id
            const [rows] = await pool.execute(
                'SELECT picture FROM customer WHERE customer_id = ?',
                [userId]
            );
            user = rows[0];
        } else {
            // Other tables use id
            const [rows] = await pool.execute(
                `SELECT picture FROM ${userTable} WHERE id = ?`,
                [userId]
            );
            user = rows[0];
        }

        // Get image URL if exists
        if (user && user.picture) {
            imageUrl = user.picture;

            // If it's a relative path, construct full URL
            if (imageUrl && !imageUrl.startsWith('http')) {
                // Assuming images are stored in uploads directory
                imageUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;
            }
        }

        // If no image, return success with null imageUrl (frontend will use default)
        return res.json({
            success: true,
            logoUrl: imageUrl, // Using logoUrl to match frontend expectation
            message: imageUrl ? 'Profile image found' : 'No profile image set'
        });

    } catch (error) {
        console.error('Error fetching profile image:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
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

module.exports = router;
