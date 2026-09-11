/**
 * Nature/category management
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.get('/natures', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();

        const sql = `
            SELECT 
                n.id AS nature_id, 
                n.name AS nature_name, 
                nt.id AS type_id, 
                nt.type_name 
            FROM natures n
            LEFT JOIN naturetypes nt ON n.id = nt.nature_id
            ORDER BY n.id, nt.id;
        `;

        const [rows] = await pool.query(sql);

        // Transform rows into nested JSON
        const result = [];
        const map = new Map();

        rows.forEach(row => {
            if (!map.has(row.nature_id)) {
                map.set(row.nature_id, {
                    id: row.nature_id,
                    name: row.nature_name,
                    types: []
                });
            }
            if (row.type_id) {
                map.get(row.nature_id).types.push({
                    id: row.type_id,
                    type_name: row.type_name
                });
            }
        });

        res.json(Array.from(map.values()));
    } catch (error) {
        console.error('Error fetching natures:', error);
        res.status(500).json({ error: 'Failed to fetch natures' });
    }
});

router.get('/natures/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const natureId = req.params.id;

        const sql = `
            SELECT 
                n.id AS nature_id, 
                n.name AS nature_name, 
                nt.id AS type_id, 
                nt.type_name 
            FROM natures n
            LEFT JOIN naturetypes nt ON n.id = nt.nature_id
            WHERE n.id = ?
            ORDER BY nt.id;
        `;

        const [rows] = await pool.query(sql, [natureId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Nature not found' });
        }

        // Transform rows into nested JSON
        const nature = {
            id: rows[0].nature_id,
            name: rows[0].nature_name,
            types: []
        };

        rows.forEach(row => {
            if (row.type_id) {
                nature.types.push({
                    id: row.type_id,
                    type_name: row.type_name
                });
            }
        });

        res.json(nature);
    } catch (error) {
        console.error('Error fetching nature:', error);
        res.status(500).json({ error: 'Failed to fetch nature' });
    }
});

router.post('/natures', authenticateToken, async (req, res) => {
    let connection;
    try {
        const pool = await getDBPool();
        connection = await pool.getConnection();

        const { name, types = [] } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nature name is required' });
        }

        await connection.beginTransaction();

        // Insert the nature
        const [natureResult] = await connection.query(
            'INSERT INTO natures (name) VALUES (?)',
            [name.trim()]
        );

        const natureId = natureResult.insertId;

        // Insert types if provided
        if (types.length > 0) {
            const typeValues = types.map(type => [natureId, type.trim()]);
            await connection.query(
                'INSERT INTO naturetypes (nature_id, type_name) VALUES ?',
                [typeValues]
            );
        }

        await connection.commit();

        // Fetch the created nature with types
        const [result] = await connection.query(`
            SELECT 
                n.id AS nature_id, 
                n.name AS nature_name, 
                nt.id AS type_id, 
                nt.type_name 
            FROM natures n
            LEFT JOIN naturetypes nt ON n.id = nt.nature_id
            WHERE n.id = ?
            ORDER BY nt.id;
        `, [natureId]);

        // Transform result
        const createdNature = {
            id: natureId,
            name: name.trim(),
            types: result
                .filter(row => row.type_id)
                .map(row => ({
                    id: row.type_id,
                    type_name: row.type_name
                }))
        };

        res.status(201).json(createdNature);
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error creating nature:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A nature with this name already exists' });
        }

        res.status(500).json({ error: 'Failed to create nature' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

router.put('/natures/:id', authenticateToken, async (req, res) => {
    let connection;
    try {
        const pool = await getDBPool();
        connection = await pool.getConnection();
        const natureId = req.params.id;
        const { name, types } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nature name is required' });
        }

        await connection.beginTransaction();

        // Check if nature exists
        const [existing] = await connection.query(
            'SELECT id FROM natures WHERE id = ?',
            [natureId]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Nature not found' });
        }

        // Update nature name
        await connection.query(
            'UPDATE natures SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name.trim(), natureId]
        );

        // If types are provided, update them
        if (types !== undefined) {
            // Delete existing types
            await connection.query(
                'DELETE FROM naturetypes WHERE nature_id = ?',
                [natureId]
            );

            // Insert new types if any
            if (types.length > 0) {
                const typeValues = types.map(type => [natureId, type.trim()]);
                await connection.query(
                    'INSERT INTO naturetypes (nature_id, type_name) VALUES ?',
                    [typeValues]
                );
            }
        }

        await connection.commit();

        // Fetch updated nature
        const [result] = await connection.query(`
            SELECT 
                n.id AS nature_id, 
                n.name AS nature_name, 
                nt.id AS type_id, 
                nt.type_name 
            FROM natures n
            LEFT JOIN naturetypes nt ON n.id = nt.nature_id
            WHERE n.id = ?
            ORDER BY nt.id;
        `, [natureId]);

        const updatedNature = {
            id: parseInt(natureId),
            name: name.trim(),
            types: result
                .filter(row => row.type_id)
                .map(row => ({
                    id: row.type_id,
                    type_name: row.type_name
                }))
        };

        res.json(updatedNature);
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error updating nature:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A nature with this name already exists' });
        }

        res.status(500).json({ error: 'Failed to update nature' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

router.put('/natures/:id/types', authenticateToken, async (req, res) => {
    let connection;
    try {
        const pool = await getDBPool();
        connection = await pool.getConnection();
        const natureId = req.params.id;
        const { types = [] } = req.body;

        await connection.beginTransaction();

        // Check if nature exists
        const [existing] = await connection.query(
            'SELECT id FROM natures WHERE id = ?',
            [natureId]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Nature not found' });
        }

        // Delete existing types
        await connection.query(
            'DELETE FROM naturetypes WHERE nature_id = ?',
            [natureId]
        );

        // Insert new types if any
        if (types.length > 0) {
            const typeValues = types.map(type => [natureId, type.trim()]);
            await connection.query(
                'INSERT INTO naturetypes (nature_id, type_name) VALUES ?',
                [typeValues]
            );
        }

        await connection.commit();

        // Fetch updated nature
        const [result] = await connection.query(`
            SELECT 
                n.id AS nature_id, 
                n.name AS nature_name, 
                nt.id AS type_id, 
                nt.type_name 
            FROM natures n
            LEFT JOIN naturetypes nt ON n.id = nt.nature_id
            WHERE n.id = ?
            ORDER BY nt.id;
        `, [natureId]);

        const updatedNature = {
            id: parseInt(natureId),
            name: result[0].nature_name,
            types: result
                .filter(row => row.type_id)
                .map(row => ({
                    id: row.type_id,
                    type_name: row.type_name
                }))
        };

        res.json(updatedNature);
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error updating nature types:', error);
        res.status(500).json({ error: 'Failed to update nature types' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

router.delete('/natures/:id', authenticateToken, async (req, res) => {
    let connection;
    try {
        const pool = await getDBPool();
        connection = await pool.getConnection();
        const natureId = req.params.id;

        await connection.beginTransaction();

        // Check if nature exists
        const [existing] = await connection.query(
            'SELECT id FROM natures WHERE id = ?',
            [natureId]
        );

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Nature not found' });
        }

        // Delete nature (cascade will delete types)
        await connection.query(
            'DELETE FROM natures WHERE id = ?',
            [natureId]
        );

        await connection.commit();

        res.json({ message: 'Nature deleted successfully' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Error deleting nature:', error);
        res.status(500).json({ error: 'Failed to delete nature' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

router.delete('/nature-types/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await getDBPool();
        const typeId = req.params.id;

        // Check if type exists
        const [existing] = await pool.query(
            'SELECT id FROM naturetypes WHERE id = ?',
            [typeId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Type not found' });
        }

        // Delete type
        await pool.query(
            'DELETE FROM naturetypes WHERE id = ?',
            [typeId]
        );

        res.json({ message: 'Type deleted successfully' });
    } catch (error) {
        console.error('Error deleting type:', error);
        res.status(500).json({ error: 'Failed to delete type' });
    }
});

module.exports = router;
