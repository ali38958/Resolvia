/**
 * Handler/receiver dashboard, reports, profile
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { upload, customerUpload, staffUpload, adminUpload, complaintManagerUpload, complaintUpload, uploadComplaintImage, buildingUpload, floorUpload, foundUpload } = require('../config/upload');
const { validateUserID, checkEmailExistsGlobally } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

router.get('/buildings', authenticateToken, async (req, res) => {
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

router.get('/complaints-report', authenticateToken, async (req, res) => {
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
            LEFT JOIN Natures n ON c.nature_id = n.id
            LEFT JOIN NatureTypes nt ON c.nature_type_id = nt.id
            LEFT JOIN room r ON c.room_id = r.id
            LEFT JOIN floor f ON r.floor_id = f.id
            LEFT JOIN building b ON f.building_id = b.id
            LEFT JOIN Staff s ON c.staff_id = s.id
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

router.get('/daily-report', authenticateToken, async (req, res) => {
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
             LEFT JOIN Natures n ON c.nature_id = n.id
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
             JOIN Natures n ON c.nature_id = n.id
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

        // 7. Hourly Trend (Combined - both complaints and found items)
        const [hourlyTrend] = await pool.execute(
            `SELECT 
                hour_num.hour,
                COALESCE(complaint_counts.count, 0) as complaints,
                COALESCE(found_counts.count, 0) as foundItems
             FROM (
                SELECT 0 as hour UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
                UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
                UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
                UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23
             ) hour_num
             LEFT JOIN (
                SELECT HOUR(created_at) as hour, COUNT(*) as count 
                FROM complaint 
                WHERE DATE(created_at) = ?
                GROUP BY hour
             ) complaint_counts ON hour_num.hour = complaint_counts.hour
             LEFT JOIN (
                SELECT HOUR(date_found) as hour, COUNT(*) as count 
                FROM found_items 
                WHERE DATE(date_found) = ?
                GROUP BY hour
             ) found_counts ON hour_num.hour = found_counts.hour
             ORDER BY hour_num.hour`,
            [date, date]
        );

        // 8. Get total buildings count
        const [buildingCount] = await pool.execute(
            `SELECT COUNT(*) as count FROM building`
        );

        // 9. Get total rooms count
        const [roomCount] = await pool.execute(
            `SELECT COUNT(*) as count FROM room`
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
        const hourlyTrendData = hourlyTrend.map(row => ({
            hour: `${row.hour}:00`,
            complaints: row.complaints || 0,
            foundItems: row.foundItems || 0
        }));

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
                hourlyTrend: hourlyTrendData,
                buildings: {
                    total: buildingCount[0].count
                },
                rooms: {
                    total: roomCount[0].count
                }
            }
        });

    } catch (error) {
        console.error('Error fetching daily report:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch daily report' });
    }
});

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
        FROM Natures n
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
    const [rows] = await pool.execute('SELECT name, picture FROM ComplaintReceiver WHERE id = ?', [id]);
    return rows[0] || { name: 'Unknown Handler', picture: null };
}

router.get('/dashboard-summary', authenticateToken, async (req, res) => {
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

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const pool = await getDBPool();
        const [rows] = await pool.execute('SELECT * FROM ComplaintReceiver WHERE id = ?', [userId]);

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

router.put('/profile', authenticateToken, async (req, res) => {
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
            `UPDATE ComplaintReceiver SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating handler profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/profile/password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { currentPassword, newPassword } = req.body;
        const pool = await getDBPool();

        const [handler] = await pool.execute('SELECT password_hash FROM ComplaintReceiver WHERE id = ?', [userId]);
        if (handler.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const isValid = await bcrypt.compare(currentPassword, handler[0].password_hash);
        if (!isValid) return res.status(400).json({ success: false, message: 'Incorrect current password' });

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE ComplaintReceiver SET password_hash = ? WHERE id = ?', [newHash, userId]);

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/profile/picture', authenticateToken, complaintManagerUpload.single('picture'), async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const picturePath = `/assets/cmanager/${req.file.filename}`;
        const pool = await getDBPool();

        const [old] = await pool.execute('SELECT picture FROM ComplaintReceiver WHERE id = ?', [userId]);
        if (old.length > 0 && old[0].picture) {
            const oldPath = path.join(__dirname, '..', old[0].picture);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await pool.execute('UPDATE ComplaintReceiver SET picture = ? WHERE id = ?', [picturePath, userId]);
        res.json({ success: true, message: 'Picture updated', data: { picture: `/assets/cmanager/${req.file.filename}` } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/found-items-report', authenticateToken, async (req, res) => {
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
            LEFT JOIN Customer c ON fic.customer_id = c.customer_id
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

module.exports = router;
