/**
 * Complaint submission, viewing, status updates
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { upload, customerUpload, staffUpload, adminUpload, complaintManagerUpload, complaintUpload, uploadComplaintImage, buildingUpload, floorUpload, foundUpload } = require('../config/upload');
const { validateUserID, checkEmailExistsGlobally } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');


// Generate unique complaint ID: CPmmYY-<sequence>
async function generateComplaintId() {
    try {
        const pool = await getDBPool();
        const now = new Date();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString().substring(2);
        const monthYear = month + year;

        const [countResult] = await pool.query(
            `SELECT COUNT(*) AS count FROM complaint WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?`,
            [now.getFullYear(), now.getMonth() + 1]
        );

        const sequenceNumber = (countResult[0].count + 1);
        return `CP${monthYear}-${sequenceNumber}`;
    } catch (error) {
        console.error('Error generating complaint ID:', error);
        const now = new Date();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString().substring(2);
        return `CP${month}${year}1`;
    }
}

// Create complaint_logs table if not exists
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
                    FOREIGN KEY (complaint_id) REFERENCES complaint(id)
                    ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        `);
        console.log('✅ Complaint logs table created/verified');
    } catch (error) {
        console.error('Error creating complaint logs table:', error);
    }
}

createComplaintLogsTable();

router.get('/complaints/natures', authenticateToken, async (req, res) => {
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

router.get('/complaints/locations', authenticateToken, async (req, res) => {
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

router.get('/complaints/colonies', authenticateToken, async (req, res) => {
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

router.post('/complaint', authenticateToken, uploadComplaintImage.single('complaint_image'), async (req, res) => {
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
            const filePath = path.join(__dirname, '..', 'assets', 'complaints', req.file.filename);
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

router.get('/complaint/:id', authenticateToken, async (req, res) => {
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

router.get('/my-complaints', authenticateToken, async (req, res) => {
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

router.get('/complaint-stats', authenticateToken, async (req, res) => {
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

router.put('/complaint/:id/update-status', authenticateToken, async (req, res) => {
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

router.get('/complaint-receivers', authenticateToken, async (req, res) => {
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

router.get('/complaint-receivers/:id', authenticateToken, async (req, res) => {
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

router.post('/complaint-receivers', authenticateToken, complaintManagerUpload.single('picture'), async (req, res) => {
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
            `
            SELECT id FROM (
                SELECT id FROM admin
                UNION
                SELECT id FROM staff
                UNION
                SELECT id FROM complaintreceiver
                UNION
                SELECT customer_id AS id FROM customer
            ) AS all_ids
            WHERE id = ?
            `,
            [id]
        );

        if (existingId.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'This ID already exists'
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

router.put('/complaint-receivers/:id', authenticateToken, complaintManagerUpload.single('picture'), async (req, res) => {
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
                return res.status(200).json({
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
            if (picturePath && fs.existsSync(path.join(__dirname, '..', picturePath))) {
                fs.unlinkSync(path.join(__dirname, '..', picturePath));
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

router.delete('/complaint-receivers/:id', authenticateToken, async (req, res) => {
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
        if (picturePath && fs.existsSync(path.join(__dirname, '..', picturePath))) {
            fs.unlinkSync(path.join(__dirname, '..', picturePath));
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

module.exports = router;
