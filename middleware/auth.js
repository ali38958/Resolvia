const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../config/app');
const { getDBPool } = require('../config/db');

const authenticateToken = async (req, res, next) => {
    console.log('Verify auth endpoint constant hit');
    try {
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

        const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET);
        req.user = decoded;
        console.log('Token verified');

        const pool = await getDBPool();

        let idField = 'id';
        if (req.user.table === 'customer') {
            idField = 'customer_id';
        }

        const [rows] = await pool.execute(
            `SELECT status FROM ${req.user.table} WHERE ${idField} = ?`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Account not found'
            });
        }

        if (rows[0].status !== 'Active') {
            return res.status(403).json({
                success: false,
                message: 'Account is not active'
            });
        }

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

module.exports = { authenticateToken };
