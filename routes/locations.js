/**
 * Colonies, buildings, floors, rooms management
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { upload, customerUpload, staffUpload, adminUpload, complaintManagerUpload, complaintUpload, uploadComplaintImage, buildingUpload, floorUpload, foundUpload } = require('../config/upload');
const path = require('path');
const fs = require('fs');

router.get('/colonies', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const [colonies] = await pool.query(`
            SELECT 
                c.id, 
                c.name,
                COUNT(b.id) as buildings_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
            GROUP BY c.id, c.name
            ORDER BY c.id DESC
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

router.get('/colonies/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        const pool = await getDBPool();

        let query = `
            SELECT 
                c.id, 
                c.name,
                COUNT(b.id) as buildings_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
        `;

        const params = [];

        if (q) {
            query += ` WHERE c.name LIKE ? OR c.id = ?`;
            params.push(`%${q}%`, parseInt(q) || 0);
        }

        query += ` GROUP BY c.id, c.name ORDER BY c.id DESC`;

        const [colonies] = await pool.query(query, params);

        res.json({
            success: true,
            data: colonies
        });
    } catch (error) {
        console.error('Error searching colonies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search colonies'
        });
    }
});

router.post('/colonies', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Colony name is required'
            });
        }

        const pool = await getDBPool();
        const [result] = await pool.query(
            'INSERT INTO colony (name) VALUES (?)',
            [name.trim()]
        );

        // Fetch the newly created colony with building count
        const [newColony] = await pool.query(`
            SELECT 
                c.id, 
                c.name,
                COUNT(b.id) as buildings_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
            WHERE c.id = ?
            GROUP BY c.id, c.name
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Colony created successfully',
            data: newColony[0]
        });
    } catch (error) {
        console.error('Error creating colony:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'A colony with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create colony'
        });
    }
});

router.put('/colonies/:id', authenticateToken, async (req, res) => {
    try {
        const colonyId = req.params.id;
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Colony name is required'
            });
        }

        const pool = await getDBPool();

        // Check if colony exists
        const [existing] = await pool.query(
            'SELECT id FROM colony WHERE id = ?',
            [colonyId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Colony not found'
            });
        }

        // Update colony
        await pool.query(
            'UPDATE colony SET name = ? WHERE id = ?',
            [name.trim(), colonyId]
        );

        // Fetch updated colony with building count
        const [updatedColony] = await pool.query(`
            SELECT 
                c.id, 
                c.name,
                COUNT(b.id) as buildings_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
            WHERE c.id = ?
            GROUP BY c.id, c.name
        `, [colonyId]);

        res.json({
            success: true,
            message: 'Colony updated successfully',
            data: updatedColony[0]
        });
    } catch (error) {
        console.error('Error updating colony:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'A colony with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update colony'
        });
    }
});

router.delete('/colonies/:id', authenticateToken, async (req, res) => {
    try {
        const colonyId = req.params.id;
        const pool = await getDBPool();

        // Check if colony has buildings (due to RESTRICT foreign key)
        const [buildings] = await pool.query(
            'SELECT COUNT(*) as count FROM building WHERE colony_id = ?',
            [colonyId]
        );

        if (buildings[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete colony because it has buildings. Delete the buildings first.'
            });
        }

        // Check if colony exists
        const [existing] = await pool.query(
            'SELECT id, name FROM colony WHERE id = ?',
            [colonyId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Colony not found'
            });
        }

        // Delete colony
        await pool.query('DELETE FROM colony WHERE id = ?', [colonyId]);

        res.json({
            success: true,
            message: 'Colony deleted successfully',
            data: { id: colonyId, name: existing[0].name }
        });
    } catch (error) {
        console.error('Error deleting colony:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete colony'
        });
    }
});

router.get('/colonies/:id', authenticateToken, async (req, res) => {
    try {
        const colonyId = req.params.id;
        const pool = await getDBPool();

        const [colony] = await pool.query(`
            SELECT 
                c.id, 
                c.name,
                COUNT(b.id) as buildings_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
            WHERE c.id = ?
            GROUP BY c.id, c.name
        `, [colonyId]);

        if (colony.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Colony not found'
            });
        }

        res.json({
            success: true,
            data: colony[0]
        });
    } catch (error) {
        console.error('Error fetching colony:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch colony'
        });
    }
});

router.get('/buildings', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const [buildings] = await pool.query(`
            SELECT 
                b.id,
                b.name,
                b.picture,
                b.built_year AS builtYear,
                c.name AS colony,
                c.id AS colony_id,
                COALESCE(floor_counts.floors, 0) AS floors,
                COALESCE(room_counts.rooms, 0) AS rooms
            FROM building b
            JOIN colony c ON b.colony_id = c.id
            LEFT JOIN (
                SELECT building_id, COUNT(*) AS floors
                FROM floor
                GROUP BY building_id
            ) floor_counts ON floor_counts.building_id = b.id
            LEFT JOIN (
                SELECT f.building_id, COUNT(r.id) AS rooms
                FROM floor f
                JOIN room r ON r.floor_id = f.id
                GROUP BY f.building_id
            ) room_counts ON room_counts.building_id = b.id
            ORDER BY b.id DESC;
        `);

        // Picture is already stored as full URL in database
        res.json({
            success: true,
            data: buildings
        });
    } catch (error) {
        console.error('Error fetching buildings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch buildings'
        });
    }
});

router.get('/buildings/search', authenticateToken, async (req, res) => {
    try {
        const { q, colony } = req.query;
        const pool = await getDBPool();

        let query = `
            SELECT 
                b.id,
                b.name,
                b.picture,
                b.built_year as builtYear,
                c.name as colony,
                c.id as colony_id,
                0 as rooms,
                0 as floors
            FROM building b
            JOIN colony c ON b.colony_id = c.id
            WHERE 1=1
        `;

        const params = [];

        if (q) {
            query += ` AND (b.name LIKE ? OR c.name LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        if (colony && colony !== 'all') {
            query += ` AND c.id = ?`;
            params.push(colony);
        }

        query += ` ORDER BY b.id DESC`;

        const [buildings] = await pool.query(query, params);

        // Picture is already stored as full URL in database
        res.json({
            success: true,
            data: buildings
        });
    } catch (error) {
        console.error('Error searching buildings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search buildings'
        });
    }
});

router.get('/coloniesdropdown', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const [colonies] = await pool.query(`
            SELECT id, name FROM colony ORDER BY name
        `);

        res.json({
            success: true,
            data: colonies || []
        });
    } catch (error) {
        console.error('Error fetching colonies dropdown:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch colonies'
        });
    }
});

router.get('/buildings/:id', authenticateToken, async (req, res) => {
    try {
        const buildingId = req.params.id;
        const pool = await getDBPool();

        const [buildings] = await pool.query(`
            SELECT 
                b.id,
                b.name,
                b.picture,
                b.built_year as builtYear,
                c.name as colony,
                c.id as colony_id,
                0 as rooms,
                0 as floors
            FROM building b
            JOIN colony c ON b.colony_id = c.id
            WHERE b.id = ?
        `, [buildingId]);

        if (buildings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Building not found'
            });
        }

        // Picture is already stored as full URL in database
        res.json({
            success: true,
            data: buildings[0]
        });
    } catch (error) {
        console.error('Error fetching building:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch building'
        });
    }
});

router.post('/buildings', authenticateToken, buildingUpload.single('image'), async (req, res) => {
    try {
        const { name, colony_id, built_year } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Building name is required'
            });
        }

        if (!colony_id) {
            return res.status(400).json({
                success: false,
                message: 'Colony is required'
            });
        }

        const pool = await getDBPool();

        // Check if colony exists
        const [colony] = await pool.query(
            'SELECT id, name FROM colony WHERE id = ?',
            [colony_id]
        );

        if (colony.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected colony does not exist'
            });
        }

        // Prepare building data - store full URL in database
        const buildingData = {
            name: name.trim(),
            colony_id: colony_id,
            built_year: built_year || null,
            picture: req.file ? `/assets/buildings/${req.file.filename}` : null
        };

        // Insert building
        const [result] = await pool.query(
            'INSERT INTO building SET ?',
            [buildingData]
        );

        // Fetch the newly created building
        const [newBuilding] = await pool.query(`
            SELECT 
                b.id,
                b.name,
                b.picture,
                b.built_year as builtYear,
                c.name as colony,
                c.id as colony_id,
                0 as rooms,
                0 as floors
            FROM building b
            JOIN colony c ON b.colony_id = c.id
            WHERE b.id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Building created successfully',
            data: newBuilding[0]
        });
    } catch (error) {
        console.error('Error creating building:', error);

        // If there was an error and a file was uploaded, delete it
        if (req.file) {
            const filePath = path.join(__dirname, '..', 'assets', 'buildings', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'A building with this name already exists'
            });
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Selected colony does not exist'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create building'
        });
    }
});

router.put('/buildings/:id', authenticateToken, buildingUpload.single('image'), async (req, res) => {
    try {
        const buildingId = req.params.id;
        const { name, colony_id, built_year, remove_image } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Building name is required'
            });
        }

        if (!colony_id) {
            return res.status(400).json({
                success: false,
                message: 'Colony is required'
            });
        }

        const pool = await getDBPool();

        // Check if building exists and get current image URL
        const [existingBuilding] = await pool.query(
            'SELECT id, picture FROM building WHERE id = ?',
            [buildingId]
        );

        if (existingBuilding.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Building not found'
            });
        }

        // Check if colony exists
        const [colony] = await pool.query(
            'SELECT id FROM colony WHERE id = ?',
            [colony_id]
        );

        if (colony.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected colony does not exist'
            });
        }

        // Prepare update data
        const updateData = {
            name: name.trim(),
            colony_id: colony_id,
            built_year: built_year || null
        };

        // Handle image updates
        if (req.file) {
            // New image uploaded - store full URL in database
            updateData.picture = `/assets/buildings/${req.file.filename}`;

            // Delete old image if exists
            if (existingBuilding[0].picture) {
                // Extract filename from the stored URL
                const oldFilename = existingBuilding[0].picture.replace('/assets/buildings/', '');
                const oldImagePath = path.join(__dirname, '..', 'assets', 'buildings', oldFilename);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        } else if (remove_image === 'true' || remove_image === true) {
            // Remove existing image
            updateData.picture = null;

            // Delete old image if exists
            if (existingBuilding[0].picture) {
                // Extract filename from the stored URL
                const oldFilename = existingBuilding[0].picture.replace('/assets/buildings/', '');
                const oldImagePath = path.join(__dirname, '..', 'assets', 'buildings', oldFilename);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        // Update building
        await pool.query(
            'UPDATE building SET ? WHERE id = ?',
            [updateData, buildingId]
        );

        // Fetch updated building
        const [updatedBuilding] = await pool.query(`
            SELECT 
                b.id,
                b.name,
                b.picture,
                b.built_year as builtYear,
                c.name as colony,
                c.id as colony_id,
                0 as rooms,
                0 as floors
            FROM building b
            JOIN colony c ON b.colony_id = c.id
            WHERE b.id = ?
        `, [buildingId]);

        res.json({
            success: true,
            message: 'Building updated successfully',
            data: updatedBuilding[0]
        });
    } catch (error) {
        console.error('Error updating building:', error);

        // If there was an error and a new file was uploaded, delete it
        if (req.file) {
            const filePath = path.join(__dirname, '..', 'assets', 'buildings', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'A building with this name already exists'
            });
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Selected colony does not exist'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update building'
        });
    }
});

router.delete('/buildings/:id', authenticateToken, async (req, res) => {
    try {
        const buildingId = req.params.id;
        const pool = await getDBPool();

        // Check if building exists and get image URL
        const [existingBuilding] = await pool.query(
            'SELECT id, name, picture FROM building WHERE id = ?',
            [buildingId]
        );

        if (existingBuilding.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Building not found'
            });
        }

        // Check if building has floors
        const [floorCount] = await pool.query(
            'SELECT COUNT(*) as count FROM floor WHERE building_id = ?',
            [buildingId]
        );

        if (floorCount[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete building with existing floors. Please delete all floors first.'
            });
        }

        // Delete associated image file if exists
        if (existingBuilding[0].picture) {
            // Extract filename from the stored URL
            const filename = existingBuilding[0].picture.replace('/assets/buildings/', '');
            const imagePath = path.join(__dirname, '..', 'assets', 'buildings', filename);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Delete building
        await pool.query('DELETE FROM building WHERE id = ?', [buildingId]);

        res.json({
            success: true,
            message: 'Building deleted successfully',
            data: { id: buildingId, name: existingBuilding[0].name }
        });
    } catch (error) {
        console.error('Error deleting building:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete building'
        });
    }
});

router.get('/floors-management/colonies', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const [colonies] = await pool.query(`
            SELECT id, name FROM colony ORDER BY name
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

router.get('/floors-management/buildings/:colonyId', authenticateToken, async (req, res) => {
    try {
        const colonyId = req.params.colonyId;
        const pool = await getDBPool();

        const [buildings] = await pool.query(`
            SELECT id, name FROM building 
            WHERE colony_id = ? 
            ORDER BY name
        `, [colonyId]);

        res.json({
            success: true,
            data: buildings
        });
    } catch (error) {
        console.error('Error fetching buildings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch buildings'
        });
    }
});

router.get('/floors-management/floors/:buildingId', authenticateToken, async (req, res) => {
    try {
        const buildingId = req.params.buildingId;
        const pool = await getDBPool();

        const [floors] = await pool.query(`
            SELECT 
                f.id,
                f.floor_name as name,
                f.picture,
                COUNT(r.id) as room_count
            FROM floor f
            LEFT JOIN room r ON f.id = r.floor_id
            WHERE f.building_id = ?
            GROUP BY f.id
            ORDER BY 
                CASE 
                    WHEN f.floor_name REGEXP '^[0-9]+' THEN CAST(f.floor_name AS UNSIGNED)
                    ELSE 999999
                END,
                f.floor_name
        `, [buildingId]);

        // Add image URLs
        const floorsWithImages = floors.map(floor => ({
            ...floor,
            picture: floor.picture
        }));

        res.json({
            success: true,
            data: floorsWithImages
        });
    } catch (error) {
        console.error('Error fetching floors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floors'
        });
    }
});

router.get('/floors-management/all-data', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();

        // Get all colonies with buildings and floors
        const [data] = await pool.query(`
            SELECT 
                c.id as colony_id,
                c.name as colony_name,
                b.id as building_id,
                b.name as building_name,
                f.id as floor_id,
                f.floor_name as floor_name,
                f.picture as floor_picture,
                COUNT(r.id) as room_count
            FROM colony c
            LEFT JOIN building b ON c.id = b.colony_id
            LEFT JOIN floor f ON b.id = f.building_id
            LEFT JOIN room r ON f.id = r.floor_id
            GROUP BY c.id, b.id, f.id
            ORDER BY c.name, b.name, 
                CASE 
                    WHEN f.floor_name REGEXP '^[0-9]+' THEN CAST(f.floor_name AS UNSIGNED)
                    ELSE 999999
                END,
                f.floor_name
        `);

        // Transform to hierarchical structure
        const structuredData = {};
        data.forEach(row => {
            if (!row.colony_id) return;

            if (!structuredData[row.colony_id]) {
                structuredData[row.colony_id] = {
                    id: row.colony_id,
                    name: row.colony_name,
                    buildings: {}
                };
            }

            if (row.building_id && !structuredData[row.colony_id].buildings[row.building_id]) {
                structuredData[row.colony_id].buildings[row.building_id] = {
                    id: row.building_id,
                    name: row.building_name,
                    floors: {}
                };
            }

            if (row.floor_id && row.building_id) {
                structuredData[row.colony_id].buildings[row.building_id].floors[row.floor_id] = {
                    id: row.floor_id,
                    name: row.floor_name,
                    picture: row.floor_picture,
                    room_count: row.room_count || 0
                };
            }
        });

        res.json({
            success: true,
            data: structuredData
        });
    } catch (error) {
        console.error('Error fetching all floors data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floors data'
        });
    }
});

router.get('/floors-management/floor-details/:floorId', authenticateToken, async (req, res) => {
    try {
        const floorId = req.params.floorId;
        const pool = await getDBPool();

        // Get floor details
        const [floorDetails] = await pool.query(`
            SELECT 
                f.id,
                f.floor_name,
                f.picture,
                b.id as building_id,
                b.name as building_name,
                c.id as colony_id,
                c.name as colony_name
            FROM floor f
            JOIN building b ON f.building_id = b.id
            JOIN colony c ON b.colony_id = c.id
            WHERE f.id = ?
        `, [floorId]);

        if (floorDetails.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found'
            });
        }

        // Get rooms for this floor
        const [rooms] = await pool.query(`
            SELECT 
                r.id,
                r.room_label,
                rt.id as room_type_id,
                rt.name as room_type_name
            FROM room r
            JOIN room_type rt ON r.room_type_id = rt.id
            WHERE r.floor_id = ?
            ORDER BY r.room_label
        `, [floorId]);

        const floorData = {
            ...floorDetails[0],
            picture: floorDetails[0].picture,
            rooms: rooms
        };

        res.json({
            success: true,
            data: floorData
        });
    } catch (error) {
        console.error('Error fetching floor details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch floor details'
        });
    }
});

router.get('/floors-management/room-types', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const [roomTypes] = await pool.query(`
            SELECT id, name FROM room_type ORDER BY name
        `);

        res.json({
            success: true,
            data: roomTypes
        });
    } catch (error) {
        console.error('Error fetching room types:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch room types'
        });
    }
});

router.post('/floors-management/floors', authenticateToken, floorUpload.single('image'), async (req, res) => {
    try {
        const { building_id, floor_name } = req.body;

        if (!building_id) {
            return res.status(400).json({
                success: false,
                message: 'Building is required'
            });
        }

        if (!floor_name || !floor_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Floor name is required'
            });
        }

        const pool = await getDBPool();

        // Check if building exists
        const [building] = await pool.query(
            'SELECT id, name FROM building WHERE id = ?',
            [building_id]
        );

        if (building.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected building does not exist'
            });
        }

        // Prepare floor data
        const floorData = {
            building_id: building_id,
            floor_name: floor_name.trim(),
            picture: req.file ? `/assets/floors/${req.file.filename}` : null  // Save full path
        };

        // Insert floor
        const [result] = await pool.query(
            'INSERT INTO floor SET ?',
            [floorData]
        );

        // Fetch the newly created floor with details
        const [newFloor] = await pool.query(`
            SELECT 
                f.id,
                f.floor_name as name,
                f.picture,
                b.id as building_id,
                b.name as building_name,
                c.id as colony_id,
                c.name as colony_name,
                0 as room_count
            FROM floor f
            JOIN building b ON f.building_id = b.id
            JOIN colony c ON b.colony_id = c.id
            WHERE f.id = ?
        `, [result.insertId]);

        const floorResponse = {
            ...newFloor[0],
            picture: newFloor[0].picture
        };

        res.status(201).json({
            success: true,
            message: 'Floor created successfully',
            data: floorResponse
        });
    } catch (error) {
        console.error('Error creating floor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create floor'
        });
    }
});

router.put('/floors-management/floors/:id', authenticateToken, floorUpload.single('image'), async (req, res) => {
    try {
        const floorId = req.params.id;
        const { building_id, floor_name, remove_image } = req.body;

        if (!floor_name || !floor_name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Floor name is required'
            });
        }

        const pool = await getDBPool();

        // Check if floor exists
        const [existingFloor] = await pool.query(
            'SELECT id, picture, building_id FROM floor WHERE id = ?',
            [floorId]
        );

        if (existingFloor.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found'
            });
        }

        // Prepare update data
        const updateData = {
            floor_name: floor_name.trim()
        };

        // Update building if provided
        if (building_id && building_id !== existingFloor[0].building_id) {
            // Check if new building exists
            const [building] = await pool.query(
                'SELECT id FROM building WHERE id = ?',
                [building_id]
            );

            if (building.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected building does not exist'
                });
            }
            updateData.building_id = building_id;
        }

        // Handle image updates
        if (req.file) {
            // New image uploaded
            updateData.picture = `/assets/floors/${req.file.filename}`;  // Save full pat

            // Delete old image if exists
            if (existingFloor[0].picture) {
                const oldImagePath = path.join(__dirname, '..', 'assets', 'floors', existingFloor[0].picture);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        } else if (remove_image === 'true' || remove_image === true) {
            // Remove existing image
            updateData.picture = null;

            // Delete old image if exists
            if (existingFloor[0].picture) {
                const oldImagePath = path.join(__dirname, '..', 'assets', 'floors', existingFloor[0].picture);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        // Update floor
        await pool.query(
            'UPDATE floor SET ? WHERE id = ?',
            [updateData, floorId]
        );

        // Fetch updated floor
        const [updatedFloor] = await pool.query(`
            SELECT 
                f.id,
                f.floor_name as name,
                f.picture,
                b.id as building_id,
                b.name as building_name,
                c.id as colony_id,
                c.name as colony_name,
                COUNT(r.id) as room_count
            FROM floor f
            JOIN building b ON f.building_id = b.id
            JOIN colony c ON b.colony_id = c.id
            LEFT JOIN room r ON f.id = r.floor_id
            WHERE f.id = ?
            GROUP BY f.id
        `, [floorId]);

        const floorResponse = {
            ...updatedFloor[0],
            picture: updatedFloor[0].picture
        };

        res.json({
            success: true,
            message: 'Floor updated successfully',
            data: floorResponse
        });
    } catch (error) {
        console.error('Error updating floor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update floor'
        });
    }
});

router.delete('/floors-management/floors/:id', authenticateToken, async (req, res) => {
    try {
        const floorId = req.params.id;
        const pool = await getDBPool();

        // Check if floor exists
        const [existingFloor] = await pool.query(
            'SELECT id, floor_name, picture FROM floor WHERE id = ?',
            [floorId]
        );

        if (existingFloor.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Floor not found'
            });
        }

        // Check if floor has rooms
        const [rooms] = await pool.query(
            'SELECT COUNT(*) as count FROM room WHERE floor_id = ?',
            [floorId]
        );

        if (rooms[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete floor because it has rooms. Delete the rooms first.'
            });
        }

        // Delete associated image file if exists
        if (existingFloor[0].picture) {
            const imagePath = path.join(__dirname, '..', 'assets', 'floors', existingFloor[0].picture);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Delete floor
        await pool.query('DELETE FROM floor WHERE id = ?', [floorId]);

        res.json({
            success: true,
            message: 'Floor deleted successfully',
            data: { id: floorId, name: existingFloor[0].floor_name }
        });
    } catch (error) {
        console.error('Error deleting floor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete floor'
        });
    }
});

router.post('/floors-management/rooms', authenticateToken, async (req, res) => {
    try {
        const { floor_id, room_label, room_type_id } = req.body;

        if (!floor_id) {
            return res.status(400).json({
                success: false,
                message: 'Floor is required'
            });
        }

        if (!room_label || !room_label.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Room label is required'
            });
        }

        if (!room_type_id) {
            return res.status(400).json({
                success: false,
                message: 'Room type is required'
            });
        }

        const pool = await getDBPool();

        // Check if floor exists
        const [floor] = await pool.query(
            'SELECT id FROM floor WHERE id = ?',
            [floor_id]
        );

        if (floor.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected floor does not exist'
            });
        }

        // Check if room type exists
        const [roomType] = await pool.query(
            'SELECT id FROM room_type WHERE id = ?',
            [room_type_id]
        );

        if (roomType.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected room type does not exist'
            });
        }

        // Check if room with same label already exists on this floor
        const [existingRoom] = await pool.query(
            'SELECT id FROM room WHERE floor_id = ? AND room_label = ?',
            [floor_id, room_label.trim()]
        );

        if (existingRoom.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A room with this label already exists on this floor'
            });
        }

        // Prepare room data
        const roomData = {
            floor_id: floor_id,
            room_label: room_label.trim(),
            room_type_id: room_type_id
        };

        // Insert room
        const [result] = await pool.query(
            'INSERT INTO room SET ?',
            [roomData]
        );

        // Fetch the newly created room
        const [newRoom] = await pool.query(`
            SELECT 
                r.id,
                r.room_label,
                rt.id as room_type_id,
                rt.name as room_type_name
            FROM room r
            JOIN room_type rt ON r.room_type_id = rt.id
            WHERE r.id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            data: newRoom[0]
        });
    } catch (error) {
        console.error('Error creating room:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'A room with this label already exists on this floor'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create room'
        });
    }
});

router.put('/floors-management/rooms/:id', authenticateToken, async (req, res) => {
    try {
        const roomId = req.params.id;
        const { room_label, room_type_id } = req.body;

        if (!room_label || !room_label.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Room label is required'
            });
        }

        if (!room_type_id) {
            return res.status(400).json({
                success: false,
                message: 'Room type is required'
            });
        }

        const pool = await getDBPool();

        // Check if room exists
        const [existingRoom] = await pool.query(
            'SELECT id, floor_id FROM room WHERE id = ?',
            [roomId]
        );

        if (existingRoom.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Check if room type exists
        const [roomType] = await pool.query(
            'SELECT id FROM room_type WHERE id = ?',
            [room_type_id]
        );

        if (roomType.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected room type does not exist'
            });
        }

        // Check if room with same label already exists on this floor (excluding current room)
        const [duplicateRoom] = await pool.query(
            'SELECT id FROM room WHERE floor_id = ? AND room_label = ? AND id != ?',
            [existingRoom[0].floor_id, room_label.trim(), roomId]
        );

        if (duplicateRoom.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A room with this label already exists on this floor'
            });
        }

        // Update room
        await pool.query(
            'UPDATE room SET room_label = ?, room_type_id = ? WHERE id = ?',
            [room_label.trim(), room_type_id, roomId]
        );

        // Fetch updated room
        const [updatedRoom] = await pool.query(`
            SELECT 
                r.id,
                r.room_label,
                rt.id as room_type_id,
                rt.name as room_type_name
            FROM room r
            JOIN room_type rt ON r.room_type_id = rt.id
            WHERE r.id = ?
        `, [roomId]);

        res.json({
            success: true,
            message: 'Room updated successfully',
            data: updatedRoom[0]
        });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update room'
        });
    }
});

router.delete('/floors-management/rooms/:id', authenticateToken, async (req, res) => {
    try {
        const roomId = req.params.id;
        const pool = await getDBPool();

        // Check if room exists
        const [existingRoom] = await pool.query(
            'SELECT id, room_label FROM room WHERE id = ?',
            [roomId]
        );

        if (existingRoom.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        // Delete room
        await pool.query('DELETE FROM room WHERE id = ?', [roomId]);

        res.json({
            success: true,
            message: 'Room deleted successfully',
            data: { id: roomId, label: existingRoom[0].room_label }
        });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete room'
        });
    }
});

router.post('/floors-management/room-types', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Room type name is required'
            });
        }

        const pool = await getDBPool();

        // Check if room type already exists
        const [existingType] = await pool.query(
            'SELECT id FROM room_type WHERE name = ?',
            [name.trim()]
        );

        if (existingType.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Room type already exists'
            });
        }

        // Insert room type
        const [result] = await pool.query(
            'INSERT INTO room_type (name) VALUES (?)',
            [name.trim()]
        );

        res.status(201).json({
            success: true,
            message: 'Room type created successfully',
            data: { id: result.insertId, name: name.trim() }
        });
    } catch (error) {
        console.error('Error creating room type:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create room type'
        });
    }
});

router.delete('/floors-management/room-types/:id', authenticateToken, async (req, res) => {
    try {
        const typeId = req.params.id;
        const pool = await getDBPool();

        // Check if room type exists
        const [existingType] = await pool.query(
            'SELECT id, name FROM room_type WHERE id = ?',
            [typeId]
        );

        if (existingType.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room type not found'
            });
        }

        // Check if room type is used by any rooms
        const [usedInRooms] = await pool.query(
            'SELECT COUNT(*) as count FROM room WHERE room_type_id = ?',
            [typeId]
        );

        if (usedInRooms[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete room type because it is used by rooms. Update the rooms first.'
            });
        }

        // Delete room type
        await pool.query('DELETE FROM room_type WHERE id = ?', [typeId]);

        res.json({
            success: true,
            message: 'Room type deleted successfully',
            data: { id: typeId, name: existingType[0].name }
        });
    } catch (error) {
        console.error('Error deleting room type:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete room type'
        });
    }
});


// ====================================================
// Location Hierarchy APIs (for complaint form dropdowns)
// ====================================================

router.get('/locations/colonies', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const [rows] = await pool.execute('SELECT * FROM colony ORDER BY name ASC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch Colonies Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch colonies' });
    }
});

router.get('/locations/colony/:colonyId/buildings', authenticateToken, async (req, res) => {
    try {
        const { colonyId } = req.params;
        const pool = await getDBPool();
        const [rows] = await pool.execute('SELECT * FROM building WHERE colony_id = ? ORDER BY name ASC', [colonyId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch Buildings Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch buildings' });
    }
});

router.get('/locations/building/:buildingId/floors', authenticateToken, async (req, res) => {
    try {
        const { buildingId } = req.params;
        const pool = await getDBPool();
        const [rows] = await pool.execute('SELECT * FROM floor WHERE building_id = ? ORDER BY floor_name ASC', [buildingId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch Floors Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch floors' });
    }
});

router.get('/locations/floor/:floorId/rooms', authenticateToken, async (req, res) => {
    try {
        const { floorId } = req.params;
        const pool = await getDBPool();
        const [rows] = await pool.execute(`
            SELECT r.id, r.room_label, rt.name as room_type 
            FROM room r 
            JOIN room_type rt ON r.room_type_id = rt.id 
            WHERE r.floor_id = ? 
            ORDER BY r.room_label ASC
        `, [floorId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch Rooms Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch rooms' });
    }
});

router.get('/locations/all-rooms', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const [rows] = await pool.execute(`
            SELECT 
                r.id as room_id, 
                r.room_label, 
                rt.name as room_type_name,
                f.floor_name,
                b.name as building_name,
                c.name as colony_name
            FROM room r
            JOIN room_type rt ON r.room_type_id = rt.id
            JOIN floor f ON r.floor_id = f.id
            JOIN building b ON f.building_id = b.id
            JOIN colony c ON b.colony_id = c.id
            ORDER BY c.name, b.name, f.floor_name, r.room_label
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Fetch All Rooms Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch all rooms' });
    }
});

module.exports = router;
