/**
 * Complaint center management (handler operations)
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { upload, customerUpload, staffUpload, adminUpload, complaintManagerUpload, complaintUpload, uploadComplaintImage, buildingUpload, floorUpload, foundUpload } = require('../config/upload');
const path = require('path');
const fs = require('fs');

router.get('/get-category-list', authenticateToken, async (req, res) => {
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

router.get('/get-all-complaints', authenticateToken, async (req, res) => {
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
        queryParams.push(String(limit), String(offset));

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

router.get('/view-details/:complaintId', authenticateToken, async (req, res) => {
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

router.get('/get-location-list', authenticateToken, async (req, res) => {
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

router.get('/get-active-staff-list', authenticateToken, async (req, res) => {
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

router.get('/get-dashboard-stats', authenticateToken, async (req, res) => {
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

router.post('/register-new-complaint', authenticateToken, async (req, res) => {
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

router.put('/update-complaint-status/:complaintId', authenticateToken, async (req, res) => {
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

router.put('/assign-resolver/:complaintId', authenticateToken, async (req, res) => {
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

router.get('/get-complaint-history/:complaintId', authenticateToken, async (req, res) => {
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

router.get('/get-customer-complaints/:customerId', authenticateToken, async (req, res) => {
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

router.delete('/remove-complaint/:complaintId', authenticateToken, async (req, res) => {
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
            const imagePath = path.join(__dirname, '..', complaint[0].picture);
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

router.get('/get-receiver-info/:receiverId', authenticateToken, async (req, res) => {
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

module.exports = router;
