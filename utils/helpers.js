const { getDBPool } = require('../config/db');

function validateUserID(userID) {
    const regex = /^[a-zA-Z0-9_-]{3,50}$/;
    return regex.test(userID);
}

async function checkEmailExistsGlobally(email, excludeUserId = null) {
    const pool = await getDBPool();
    const tables = ['admin', 'complaintreceiver', 'customer', 'staff'];

    for (const table of tables) {
        let query;
        const idField = table === 'customer' ? 'customer_id' : 'id';

        if (excludeUserId) {
            query = `SELECT ${idField} FROM ${table} WHERE email = ? AND ${idField} != ?`;
            const [rows] = await pool.execute(query, [email, excludeUserId]);
            if (rows.length > 0) return true;
        } else {
            query = `SELECT ${idField} FROM ${table} WHERE email = ?`;
            const [rows] = await pool.execute(query, [email]);
            if (rows.length > 0) return true;
        }
    }
    return false;
}

async function getUserTypeByEmail(email) {
    const pool = await getDBPool();
    
    const tables = [
        { table: 'admin', idField: 'id' },
        { table: 'complaintreceiver', idField: 'id' },
        { table: 'customer', idField: 'customer_id' },
        { table: 'staff', idField: 'id' }
    ];

    for (const { table, idField } of tables) {
        const [rows] = await pool.execute(
            `SELECT ${idField} as userId FROM ${table} WHERE email = ?`,
            [email]
        );

        if (rows.length > 0) {
            return {
                table,
                idField,
                userId: rows[0].userId
            };
        }
    }

    return null;
}

async function updatePasswordInTable(tableName, idField, userId, passwordHash) {
    const pool = await getDBPool();

    const updateQuery = `
        UPDATE ${tableName} 
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE ${idField} = ?
    `;

    const [result] = await pool.execute(updateQuery, [passwordHash, userId]);
    return result.affectedRows > 0;
}

module.exports = {
    validateUserID,
    checkEmailExistsGlobally,
    getUserTypeByEmail,
    updatePasswordInTable
};
