/**
 * staff profile & complaint management
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { upload, customerUpload, staffUpload, adminUpload, complaintManagerUpload, complaintUpload, uploadComplaintImage, buildingUpload, floorUpload, foundUpload } = require('../config/upload');
const { validateUserID, checkEmailExistsGlobally } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

router.get('/complaints', authenticateToken, async (req, res) => {
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

router.put('/complaint/:id/status', authenticateToken, async (req, res) => {
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

router.get('/profile', authenticateToken, async (req, res) => {
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

router.put('/profile', authenticateToken, async (req, res) => {
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

router.put('/profile/password', authenticateToken, async (req, res) => {
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

router.post('/profile/picture', authenticateToken, upload.single('picture'), async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const picturePath = `/assets/staff/${req.file.filename}`;
        const pool = await getDBPool();

        const [old] = await pool.execute('SELECT picture FROM staff WHERE id = ?', [userId]);
        if (old.length > 0 && old[0].picture) {
            const oldPath = path.join(__dirname, '..', old[0].picture);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await pool.execute('UPDATE staff SET picture = ? WHERE id = ?', [picturePath, userId]);
        res.json({ success: true, message: 'Picture updated', data: { picture: `/assets/staff/${req.file.filename}` } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/dashboard-summary', authenticateToken, async (req, res) => {
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

module.exports = router;
