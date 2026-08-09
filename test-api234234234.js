const axios = require('axios');

async function test() {
    try {
        const loginRes = await axios.post('http://localhost:80/api/auth/login', {
            userID: 'h002',
            password: 'password' // Try password 
        });
        const token = loginRes.data.accessToken;

        const res = await axios.get('http://localhost:80/api/handler/found-items-report', {
            headers: {
                Cookie: `access_token=${token}`
            }
        });
        console.log("Success:", res.data);
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}

test();
