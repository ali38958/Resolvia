/**
 * Customer profile, dashboard, complaints, found items
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { JWT_CONFIG, CONFIG } = require('../config/app');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { transporter } = require('../config/email');
const { upload, customerUpload, staffUpload, adminUpload, complaintManagerUpload, complaintUpload, uploadComplaintImage, buildingUpload, floorUpload, foundUpload } = require('../config/upload');
const { validateUserID, checkEmailExistsGlobally } = require('../utils/helpers');
const { generateOTP, hashOTP, verifyOTP, canSendOTP, storeOTP, verifyAndUseOTP } = require('../utils/otp');
const path = require('path');
const fs = require('fs');

router.get('/profile', authenticateToken, async (req, res) => {
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
             FROM Customer 
             WHERE customer_id = ?`,
            [userId]  // Use the correct variable
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
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
            designation: 'Customer'
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

router.get('/dashboard-summary', authenticateToken, async (req, res) => {
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
        console.error('Customer dashboard summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
    }
});

router.put('/profile/name', authenticateToken, async (req, res) => {
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
            'UPDATE Customer SET name = ? WHERE customer_id = ?',
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

router.put('/profile/phone', authenticateToken, async (req, res) => {
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
            'UPDATE Customer SET phone_number = ? WHERE customer_id = ?',
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

router.post('/profile/email/initiate-change', authenticateToken, async (req, res) => {
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

router.post('/profile/email/verify-and-change', authenticateToken, async (req, res) => {
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
            'UPDATE Customer SET email = ? WHERE customer_id = ?',
            [newEmail, userId]  // Use userId instead of req.user.userId
        );

        // Generate new JWT token with updated email
        const [customer] = await pool.execute(
            'SELECT customer_id, name, email FROM Customer WHERE customer_id = ?',
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

router.put('/profile/password', authenticateToken, async (req, res) => {
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
            'SELECT password_hash FROM Customer WHERE customer_id = ?',
            [userId]  // Use userId
        );

        if (customer.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
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
            'UPDATE Customer SET password_hash = ? WHERE customer_id = ?',
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

router.post('/profile/picture',
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
                'SELECT picture FROM Customer WHERE customer_id = ?',
                [userId]  // Use userId
            );

            // Update database with new picture path
            await pool.execute(
                'UPDATE Customer SET picture = ? WHERE customer_id = ?',
                [filePath, userId]  // Use userId
            );

            // Delete old picture if it exists and is not default
            if (oldData[0]?.picture &&
                !oldData[0].picture.includes('default.png') &&
                oldData[0].picture.startsWith('/assets/customers/')) {

                const oldFilePath = path.join(__dirname, '..', oldData[0].picture);
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

router.delete('/profile/picture', authenticateToken, async (req, res) => {
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
            'SELECT picture FROM Customer WHERE customer_id = ?',
            [userId]  // Use userId
        );

        if (customer.length > 0 && customer[0].picture) {
            const picturePath = customer[0].picture;

            // Delete file if it exists and is not default
            if (!picturePath.includes('default.png') &&
                picturePath.startsWith('/assets/customers/')) {

                const fullPath = path.join(__dirname, '..', picturePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
        }

        // Set to default picture
        const defaultPath = '/assets/customers/default.png';
        await pool.execute(
            'UPDATE Customer SET picture = ? WHERE customer_id = ?',
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

router.get('/complaints', authenticateToken, async (req, res) => {
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
            LEFT JOIN Natures n ON c.nature_id = n.id
            LEFT JOIN Priority p ON c.priority_id = p.id
            LEFT JOIN Staff s ON c.staff_id = s.id
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
        console.error('Fetch Customer Complaints Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaints'
        });
    }
});

router.get('/my-found-items', authenticateToken, async (req, res) => {
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

router.get('/found-items', authenticateToken, async (req, res) => {
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

router.post('/found-items/:id/claim', authenticateToken, async (req, res) => {
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

router.get('/my-claims', authenticateToken, async (req, res) => {
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

module.exports = router;
