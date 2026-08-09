/**
 * Admin dashboard, reports, profile
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { upload, customerUpload, staffUpload, adminUpload, complaintManagerUpload, complaintUpload, uploadComplaintImage, buildingUpload, floorUpload, foundUpload } = require('../config/upload');
const { validateUserID, checkEmailExistsGlobally } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

router.get('/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        const role = req.user.role.toLowerCase();
        if (role !== 'admin' && role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
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
            FROM Natures n
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
        const [customerCount] = await pool.execute('SELECT COUNT(*) as count FROM Customer');
        const [staffCount] = await pool.execute('SELECT COUNT(*) as count FROM Staff');
        const [adminCount] = await pool.execute('SELECT COUNT(*) as count FROM Admin');
        const [handlerCount] = await pool.execute('SELECT COUNT(*) as count FROM ComplaintReceiver');
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
        console.error('Admin dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch admin dashboard statistics' });
    }
});

router.get('/staff-stats', authenticateToken, async (req, res) => {
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
            FROM Staff s
            LEFT JOIN Designation d ON s.designation_id = d.id
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

router.get('/staff-complaints-report', authenticateToken, async (req, res) => {
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
            JOIN Staff s ON c.staff_id = s.id
            LEFT JOIN Natures n ON c.nature_id = n.id
            LEFT JOIN NatureTypes nt ON c.nature_type_id = nt.id
            LEFT JOIN Customer cust ON c.customer_id = cust.customer_id
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

router.get('/receivers-report', authenticateToken, async (req, res) => {
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
            FROM ComplaintReceiver cr
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

router.get('/receivers-report/:id/details', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const receiverId = req.params.id;
        const from = req.query.from || '2000-01-01';
        const to = req.query.to || '2099-12-31';

        // Pad 'to' to end of day
        const toEndOfDay = `${to} 23:59:59`;

        // 1. Receiver info
        const [receiverRows] = await pool.execute(
            'SELECT id, name, email, status FROM ComplaintReceiver WHERE id = ?',
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

        // 3. Staff assignment logs (assignments this receiver made)
        const [staffLogs] = await pool.execute(`
            SELECT
                sal.complaint_id,
                prev_s.name  AS previous_staff_name,
                sal.previous_staff_id,
                new_s.name   AS new_staff_name,
                sal.new_staff_id,
                sal.changed_at
            FROM staff_assignment_logs sal
            LEFT JOIN Staff prev_s ON prev_s.id = sal.previous_staff_id
            LEFT JOIN Staff new_s  ON new_s.id  = sal.new_staff_id
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

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const pool = await getDBPool();
        const [rows] = await pool.execute('SELECT * FROM Admin WHERE id = ?', [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
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

router.put('/profile', authenticateToken, async (req, res) => {
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
            `UPDATE Admin SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating admin profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/profile/password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { currentPassword, newPassword } = req.body;
        const pool = await getDBPool();

        const [admin] = await pool.execute('SELECT password_hash FROM Admin WHERE id = ?', [userId]);
        if (admin.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const isValid = await bcrypt.compare(currentPassword, admin[0].password_hash);
        if (!isValid) return res.status(400).json({ success: false, message: 'Incorrect current password' });

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE Admin SET password_hash = ? WHERE id = ?', [newHash, userId]);

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/profile/picture', authenticateToken, adminUpload.single('picture'), async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const picturePath = `/assets/admins/${req.file.filename}`;
        const pool = await getDBPool();

        const [old] = await pool.execute('SELECT picture FROM Admin WHERE id = ?', [userId]);
        if (old.length > 0 && old[0].picture) {
            const oldPath = path.join(__dirname, '..', old[0].picture);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await pool.execute('UPDATE Admin SET picture = ? WHERE id = ?', [picturePath, userId]);
        res.json({ success: true, message: 'Picture updated', data: { picture: `/assets/admins/${req.file.filename}` } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
