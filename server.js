require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const http = require('http');
const WebSocket = require('ws');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { CONFIG, JWT_CONFIG } = require('./config/app');
const { getDBPool } = require('./config/db');
const { cleanupExpiredOTPs } = require('./utils/otp');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 80;

// ====================================================
// ✅ Middleware
// ====================================================
app.use(cors({
    origin: 'http://localhost:80',
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

console.log('🔧 Configuration loaded:', {
    OTP_LIFE_MINUTES: CONFIG.OTP_LIFE_MINUTES,
    OTP_RESEND_COOLDOWN_SECONDS: CONFIG.OTP_RESEND_COOLDOWN_SECONDS,
    MAX_DAILY_ATTEMPTS: CONFIG.MAX_DAILY_ATTEMPTS,
    OTP_LENGTH: CONFIG.OTP_LENGTH
});
console.log('🔐 JWT Configuration loaded');

// ====================================================
// ✅ API Routes (Modular)
// ====================================================
app.use('/api', require('./routes/pages'));
app.use('/api', require('./routes/signup'));
app.use('/api', require('./routes/contact'));
app.use('/api', require('./routes/otp'));
app.use('/api', require('./routes/resetPassword'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customer', require('./routes/customer'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/handler', require('./routes/handler'));
app.use('/api', require('./routes/complaints'));
app.use('/api/complaint-center', require('./routes/complaintCenter'));
app.use('/api', require('./routes/locations'));
app.use('/api', require('./routes/natures'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/priorities'));
app.use('/api', require('./routes/foundItems'));

// ====================================================
// ✅ Axios fallback
// ====================================================
app.get('/js/axios.min.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'node_modules', 'axios', 'dist', 'axios.min.js'));
});

// ====================================================
// ✅ Page Routing & Auth Guard
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
        const authPages = ['login', 'signup', 'reset-password', 'contact'];

        if (!protectedFolders.includes(firstSegment)) {
            const accessToken = req.cookies.access_token;
            const refreshToken = req.cookies.refresh_token;

            const verifyAndRedirect = (token, secret) => {
                try {
                    const decoded = jwt.verify(token, secret);
                    const userRole = decoded.role.toLowerCase();
                    const allowedFolder = roleFolderMap[userRole];

                    if (allowedFolder) {
                        res.redirect(`/${allowedFolder}/dashboard`);
                        return true;
                    }
                } catch (err) {
                    return false;
                }
            };

            if (authPages.includes(firstSegment)) {
                if (accessToken && verifyAndRedirect(accessToken, JWT_CONFIG.ACCESS_TOKEN_SECRET)) return;
                if (refreshToken && verifyAndRedirect(refreshToken, JWT_CONFIG.REFRESH_TOKEN_SECRET)) return;
            }

            const publicFile = path.join(__dirname, 'src', `${requestedPath}.html`);
            return res.sendFile(publicFile, err => {
                if (err) next();
            });
        }

        // Protected folders - Authentication required
        const accessToken = req.cookies.access_token;
        const refreshToken = req.cookies.refresh_token;

        const extractUserFromToken = (token) => {
            const { isRefreshToken, ...userData } = token;
            return userData;
        };

        const checkRoleAndServe = (tokenData) => {
            const userData = extractUserFromToken(tokenData);
            const userRole = userData.role.toLowerCase();
            const allowedFolder = roleFolderMap[userRole];

            if (!allowedFolder) {
                console.error('Role not recognized:', userRole);
                return res.redirect('/login');
            }

            if (
                userRole === 'admin' &&
                userRole !== 'superadmin' &&
                requestedPath === '/admin/admins'
            ) {
                return res.redirect('/admin/dashboard');
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

        if (accessToken) {
            try {
                const decoded = jwt.verify(accessToken, JWT_CONFIG.ACCESS_TOKEN_SECRET);
                console.log('Access token valid');
                return checkRoleAndServe(decoded);
            } catch (accessError) {
                console.log('Access token failed:', accessError.message);
            }
        }

        if (refreshToken) {
            try {
                const decodedRefresh = jwt.verify(refreshToken, JWT_CONFIG.REFRESH_TOKEN_SECRET);
                console.log('Refresh token valid, granting access');

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

// 🧩 WebSocket
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    console.log('WebSocket connected');
    ws.on('message', (message) => {
        console.log('Received:', message);
    });
});

// ====================================================
// ✅ Start Server
// ====================================================
cleanupExpiredOTPs();
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
