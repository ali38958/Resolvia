/**
 * User CRUD (admins, staff, customers, handlers, designations)
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { upload, customerUpload, staffUpload, adminUpload, complaintManagerUpload, complaintUpload, uploadComplaintImage, buildingUpload, floorUpload, foundUpload } = require('../config/upload');
const { validateUserID, checkEmailExistsGlobally } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

router.get('/admins', authenticateToken, async (req, res) => {
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
        params.push(String(limit), String(offset));

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

router.get('/admins/:id', authenticateToken, async (req, res) => {
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

router.post('/admins', authenticateToken, adminUpload.single('picture'), async (req, res) => {
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

router.put('/admins/:id', authenticateToken, adminUpload.single('picture'), async (req, res) => {
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
            if (picturePath && fs.existsSync(path.join(__dirname, '..', picturePath))) {
                fs.unlinkSync(path.join(__dirname, '..', picturePath));
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

router.delete('/admins/:id', authenticateToken, async (req, res) => {
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
        if (picturePath && fs.existsSync(path.join(__dirname, '..', picturePath))) {
            fs.unlinkSync(path.join(__dirname, '..', picturePath));
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

router.get('/staff', authenticateToken, async (req, res) => {
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
        params.push(String(limit), String(offset));

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

router.get('/staff/:id', authenticateToken, async (req, res) => {
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

router.post('/staff', authenticateToken, upload.single('picture'), async (req, res) => {
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
                message: 'This ID already exists in the system'
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

router.put('/staff/:id', authenticateToken, upload.single('picture'), async (req, res) => {
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
            if (picturePath && fs.existsSync(path.join(__dirname, '..', picturePath))) {
                fs.unlinkSync(path.join(__dirname, '..', picturePath));
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

router.delete('/staff/:id', authenticateToken, async (req, res) => {
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
        if (picturePath && fs.existsSync(path.join(__dirname, '..', picturePath))) {
            fs.unlinkSync(path.join(__dirname, '..', picturePath));
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

router.get('/designations', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const [rows] = await pool.execute('SELECT * FROM designation ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching designations:', error);
        res.status(500).json({ success: false, message: 'Error fetching designations' });
    }
});

router.post('/designations', authenticateToken, async (req, res) => {
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

router.put('/designations/:id', authenticateToken, async (req, res) => {
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

router.delete('/designations/:id', authenticateToken, async (req, res) => {
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

router.get('/customers', authenticateToken, async (req, res) => {
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
        params.push(String(limit), String(offset));

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

router.get('/customers/:id', authenticateToken, async (req, res) => {
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

router.put('/customers/:id/status', authenticateToken, async (req, res) => {
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

module.exports = router;
