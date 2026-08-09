const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const axios = require('axios');

async function run() {
    try {
        const pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'complaints_management_db'
        });

        // Use a known user or create one
        let [rows] = await pool.execute('SELECT * FROM ComplaintReceiver LIMIT 1');

        let userId;
        let plaintextpwd = "password123";

        if (rows.length === 0) {
            console.log("No handlers found. You need a handler to test this.");
            process.exit(0);
        } else {
            userId = rows[0].receiver_id;

            // force update password to known
            const hashed = await bcrypt.hash(plaintextpwd, 10);
            await pool.execute('UPDATE ComplaintReceiver SET password = ? WHERE receiver_id = ?', [hashed, userId]);
            console.log("Updated password for", userId);
        }

        // Now test the API
        const loginRes = await axios.post('http://localhost:80/api/auth/login', {
            userID: userId,
            password: plaintextpwd
        });

        const token = loginRes.data.accessToken;

        const res = await axios.get('http://localhost:80/api/handler/found-items-report', {
            headers: {
                Cookie: `access_token=${token}`
            }
        });

        console.log("Found Items Data:", JSON.stringify(res.data, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
        process.exit(1);
    }
}
run();
