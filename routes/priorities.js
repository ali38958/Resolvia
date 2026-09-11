/**
 * priority management CRUD
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.get('/priorities', authenticateToken, async (req, res) => {
    try {
        const db = await getDBPool();
        const [rows] = await db.query('SELECT * FROM priority ORDER BY value DESC');

        res.json(rows);
    } catch (error) {
        console.error('Error fetching priorities:', error);
        res.status(500).json({ error: 'Failed to fetch priorities' });
    }
});

router.get('/priorities/:id', authenticateToken, async (req, res) => {
    try {
        const db = await getDBPool();
        const [rows] = await db.query('SELECT * FROM priority WHERE id = ?', [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'priority not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching priority:', error);
        res.status(500).json({ error: 'Failed to fetch priority' });
    }
});

router.post('/priorities', authenticateToken, async (req, res) => {
    try {
        const { name, value } = req.body;

        if (!name || !value) {
            return res.status(400).json({ error: 'Name and value are required' });
        }

        // Validate value range
        const numValue = parseInt(value);
        if (numValue < 1 || numValue > 720) {
            return res.status(400).json({ error: 'Value must be between 1 and 720 hours' });
        }

        // Check for duplicate name
        const db = await getDBPool();
        const [existing] = await db.query('SELECT id FROM priority WHERE name = ?', [name]);

        if (existing.length > 0) {
            return res.status(409).json({ error: 'priority with this name already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO priority (name, value) VALUES (?, ?)',
            [name, numValue]
        );

        const [newPriority] = await db.query('SELECT * FROM priority WHERE id = ?', [result.insertId]);

        res.status(201).json(newPriority[0]);
    } catch (error) {
        console.error('Error creating priority:', error);
        res.status(500).json({ error: 'Failed to create priority' });
    }
});

router.put('/priorities/:id', authenticateToken, async (req, res) => {
    try {
        const { name, value } = req.body;

        if (!name || !value) {
            return res.status(400).json({ error: 'Name and value are required' });
        }

        // Validate value range
        const numValue = parseInt(value);
        if (numValue < 1 || numValue > 720) {
            return res.status(400).json({ error: 'Value must be between 1 and 720 hours' });
        }

        // Check if priority exists
        const db = await getDBPool();
        const [existing] = await db.query('SELECT id FROM priority WHERE id = ?', [req.params.id]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'priority not found' });
        }

        // Check for duplicate name (excluding current priority)
        const [duplicate] = await db.query(
            'SELECT id FROM priority WHERE name = ? AND id != ?',
            [name, req.params.id]
        );

        if (duplicate.length > 0) {
            return res.status(409).json({ error: 'priority with this name already exists' });
        }

        await db.query(
            'UPDATE priority SET name = ?, value = ? WHERE id = ?',
            [name, numValue, req.params.id]
        );

        const [updatedPriority] = await db.query('SELECT * FROM priority WHERE id = ?', [req.params.id]);

        res.json(updatedPriority[0]);
    } catch (error) {
        console.error('Error updating priority:', error);
        res.status(500).json({ error: 'Failed to update priority' });
    }
});

router.delete('/priorities/:id', authenticateToken, async (req, res) => {
    try {
        const db = await getDBPool();

        // Check if priority exists
        const [existing] = await db.query('SELECT id FROM priority WHERE id = ?', [req.params.id]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'priority not found' });
        }

        // Check if priority is being used (you can add this check based on your business logic)
        // Example: Check if any complaints use this priority
        // const [inUse] = await db.query('SELECT id FROM Complaints WHERE priority_id = ?', [req.params.id]);
        // if (inUse.length > 0) {
        //     return res.status(400).json({ error: 'Cannot delete priority that is in use' });
        // }

        await db.query('DELETE FROM priority WHERE id = ?', [req.params.id]);

        res.json({ success: true, message: 'priority deleted successfully' });
    } catch (error) {
        console.error('Error deleting priority:', error);
        res.status(500).json({ error: 'Failed to delete priority' });
    }
});

module.exports = router;
