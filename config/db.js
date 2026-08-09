const mysql = require('mysql2/promise');

let pool = null;

async function getDBPool() {
    if (pool) return pool;

    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'complaints_management_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    await pool.query('SELECT 1');
    console.log('✅ MySQL pool created');
    return pool;
}

module.exports = { getDBPool };
