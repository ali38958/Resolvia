/**
 * Found items management
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { upload, customerUpload, staffUpload, adminUpload, complaintManagerUpload, complaintUpload, uploadComplaintImage, buildingUpload, floorUpload, foundUpload } = require('../config/upload');

router.post('/found-items', authenticateToken, foundUpload.array('pictures', 5), async (req, res) => {
    const connection = await getDBPool().then(pool => pool.getConnection());
    try {
        await connection.beginTransaction();

        const {
            title,
            category,
            date_found,
            description,
            location,
            location_details,
            city,
            postal_code,
            state_province,
            country,
            latitude,
            longitude
        } = req.body;

        if (!title || !category || !date_found) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const finalLocation = location_details ? `${location} (${location_details})` : location;

        const userId = req.user.id;

        // Insert into found_items table
        const [result] = await connection.execute(
            `INSERT INTO found_items 
            (title, category, date_found, description, location, city, postal_code, state_province, country, latitude, longitude, is_visible, customer_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                category,
                date_found,
                description || null,
                finalLocation || null,
                city || null,
                postal_code || null,
                state_province || null,
                country || null,
                latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null,
                false, // is_visible defaults to false for now
                userId
            ]
        );

        const foundItemId = result.insertId;

        // Insert uploaded pictures into found_item_pictures table
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const picturePath = `/assets/found/${file.filename}`;
                await connection.execute(
                    `INSERT INTO found_item_pictures (found_item_id, picture) VALUES (?, ?)`,
                    [foundItemId, picturePath]
                );
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Found item submitted successfully',
            foundItemId: foundItemId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Submit Found Item Error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit found item report' });
    } finally {
        connection.release();
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
        let whereConditions = ['1=1'];
        let queryParams = [];

        // Search filter
        if (search) {
            whereConditions.push('(fi.title LIKE ? OR fi.description LIKE ? OR fi.location LIKE ? OR fi.city LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Category filter
        if (category) {
            whereConditions.push('fi.category = ?');
            queryParams.push(category);
        }

        // Status filter
        if (status) {
            whereConditions.push('fi.status = ?');
            queryParams.push(status);
        }

        // Only show visible items? For staff pages, we might want to see all
        // For customer pages, we'd add: AND fi.is_visible = TRUE
        // For staff, we show all items regardless of visibility

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM found_items fi 
            WHERE ${whereClause}
        `;
        const [countResult] = await pool.execute(countQuery, queryParams);
        const total = countResult[0].total;

        // Get paginated items
        const itemsQuery = `
            SELECT 
                fi.id,
                fi.title as name,
                fi.category,
                fi.date_found as date,
                fi.location,
                fi.city,
                fi.state_province,
                fi.country,
                fi.postal_code,
                fi.latitude,
                fi.longitude,
                fi.description,
                fi.status,
                fi.is_visible,
                fi.date_found,
                NULL as finder,
                NULL as receivedBy,
                NULL as detailedLocation
            FROM found_items fi
            WHERE ${whereClause}
            ORDER BY fi.${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const paginatedParams = [...queryParams, parseInt(limit), parseInt(offset)];
        const [items] = await pool.execute(itemsQuery, paginatedParams);

        // For each item, get its pictures and claims
        for (let item of items) {
            // Get pictures
            const [pictures] = await pool.execute(
                `SELECT id, picture 
                 FROM found_item_pictures 
                 WHERE found_item_id = ?`,
                [item.id]
            );
            item.images = pictures.map(p => `/${p.picture}`);

            // Get claims with customer details
            const [claims] = await pool.execute(
                `SELECT 
                    fic.id,
                    c.customer_id,
                    c.name,
                    c.email,
                    c.phone_number as phone,
                    fic.claim_date,
                    fic.status
                 FROM found_item_claims fic
                 JOIN Customer c ON fic.customer_id = c.customer_id
                 WHERE fic.found_item_id = ?
                 ORDER BY fic.claim_date DESC`,
                [item.id]
            );
            item.claims = claims;

            // Set receivedBy if status is 'returned' or 'collected'
            if (item.status === 'returned' || item.status === 'collected') {
                const [approvedClaim] = claims.filter(c => c.status === 'approved');
                item.receivedBy = approvedClaim?.name || null;
            }
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
        console.error('Error fetching found items:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch found items'
        });
    }
});

router.get('/found-items/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const { id } = req.params;

        const [items] = await pool.execute(
            `SELECT 
                fi.id,
                fi.title as name,
                fi.category,
                fi.date_found as date,
                fi.location,
                fi.city,
                fi.state_province,
                fi.country,
                fi.postal_code,
                fi.latitude,
                fi.longitude,
                fi.description,
                fi.status,
                fi.is_visible,
                fi.customer_id as finder_id,
                c.name as finder_name,
                c.email as finder_email,
                c.phone_number as finder_phone,
                CONCAT(fi.location, ', ', fi.city, ', ', fi.state_province, ', ', fi.country) as full_location,
                CONCAT(fi.location, ' - ', fi.city) as detailedLocation
             FROM found_items fi
             LEFT JOIN Customer c ON fi.customer_id = c.customer_id
             WHERE fi.id = ?`,
            [id]
        );

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        const item = items[0];

        // Get pictures
        const [pictures] = await pool.execute(
            `SELECT id, picture 
             FROM found_item_pictures 
             WHERE found_item_id = ?`,
            [id]
        );
        item.images = pictures.map(p => `${p.picture}`);

        // Get claims with customer details
        const [claims] = await pool.execute(
            `SELECT 
                fic.id,
                c.customer_id,
                c.name,
                c.email,
                c.phone_number as phone,
                fic.claim_date,
                fic.status
             FROM found_item_claims fic
             JOIN Customer c ON fic.customer_id = c.customer_id
             WHERE fic.found_item_id = ?
             ORDER BY fic.claim_date DESC`,
            [id]
        );
        item.claims = claims;

        // Set receivedBy if status is 'returned' or 'collected'
        if (item.status === 'returned' || item.status === 'collected' || item.status === 'Returned' || item.status === 'Collected') {
            const approvedClaim = claims.find(c => c.status === 'approved' || c.status === 'Approved');
            if (approvedClaim) {
                item.receivedBy = `${approvedClaim.name} (${approvedClaim.customer_id})`;
            } else {
                item.receivedBy = null;
            }
        }

        res.json({
            success: true,
            data: item
        });

    } catch (error) {
        console.error('Error fetching found item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch found item'
        });
    }
});

router.post('/found-items/:id/claims/:claimId/approve', authenticateToken, async (req, res) => {
    const connection = await (await getDBPool()).getConnection();

    try {
        await connection.beginTransaction();

        const { id: itemId, claimId } = req.params;

        // Check if item exists
        const [item] = await connection.execute(
            'SELECT id, status FROM found_items WHERE id = ?',
            [itemId]
        );

        if (item.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Check if claim exists and is pending
        const [claim] = await connection.execute(
            `SELECT fic.id, c.name 
             FROM found_item_claims fic
             JOIN Customer c ON fic.customer_id = c.customer_id
             WHERE fic.id = ? AND fic.found_item_id = ? AND fic.status = 'pending'`,
            [claimId, itemId]
        );

        if (claim.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Pending claim not found'
            });
        }

        // Approve selected claim
        await connection.execute(
            'UPDATE found_item_claims SET status = ? WHERE id = ?',
            ['approved', claimId]
        );

        // Reject all other pending claims for this item
        await connection.execute(
            `UPDATE found_item_claims 
             SET status = ? 
             WHERE found_item_id = ? AND id != ? AND status = 'pending'`,
            ['rejected', itemId, claimId]
        );

        // Update item status to 'Returned'
        await connection.execute(
            'UPDATE found_items SET status = ? WHERE id = ?',
            ['Returned', itemId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: `Item marked as returned to ${claim[0].name}`,
            data: {
                itemId: parseInt(itemId),
                claimId: parseInt(claimId),
                claimantName: claim[0].name,
                status: 'Returned'
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error approving claim:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve claim'
        });
    } finally {
        connection.release();
    }
});

router.post('/found-items/:id/claims/:claimId/reject', authenticateToken, async (req, res) => {
    try {
        const { id: itemId, claimId } = req.params;
        const pool = await getDBPool();

        const [result] = await pool.execute(
            'UPDATE found_item_claims SET status = ? WHERE id = ? AND found_item_id = ? AND status = ?',
            ['rejected', claimId, itemId, 'pending']
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pending claim not found'
            });
        }

        res.json({
            success: true,
            message: 'Claim rejected successfully'
        });
    } catch (error) {
        console.error('Error rejecting claim:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject claim'
        });
    }
});

router.get('/found-items/stats/summary', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();

        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'Collected' THEN 1 ELSE 0 END) as collected,
                SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) as returned,
                SUM(CASE WHEN status = 'Unavailable' THEN 1 ELSE 0 END) as unavailable
            FROM found_items
        `);

        // Get this month's items
        const [monthStats] = await pool.execute(`
            SELECT COUNT(*) as this_month
            FROM found_items
            WHERE MONTH(date_found) = MONTH(CURRENT_DATE())
            AND YEAR(date_found) = YEAR(CURRENT_DATE())
        `);

        res.json({
            success: true,
            data: {
                total: stats[0].total || 0,
                pending: stats[0].pending || 0,
                collected: stats[0].collected || 0,
                returned: stats[0].returned || 0,
                unavailable: stats[0].unavailable || 0,
                thisMonth: monthStats[0].this_month || 0
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

module.exports = router;
