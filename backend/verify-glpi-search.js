const axios = require('axios');

const GLPI_URL = process.env.GLPI_URL || 'http://glpi/apirest.php';
const APP_TOKEN = process.env.GLPI_APP_TOKEN;
const USER_TOKEN = process.env.GLPI_USER_TOKEN;

async function search() {
    try {
        // Credentials for glpi (Super-Admin)
        const USER = 'glpi';
        const PASS = 'M4YQYceYVsAeKay';
        const AUTH = 'Basic ' + Buffer.from(USER + ':' + PASS).toString('base64');

        // Session setup
        const sessionRes = await axios.get(`${GLPI_URL}/initSession`, {
            headers: {
                'App-Token': APP_TOKEN,
                'Authorization': AUTH
            }
        });
        const sessionToken = sessionRes.data.session_token;
        console.log('Session:', sessionToken);

        // Attempt 1: List all tickets (no search)
        console.log('--- Attempt 1: List Tickets ---');
        try {
            const listRes = await axios.get(`${GLPI_URL}/Ticket`, {
                headers: { 'App-Token': APP_TOKEN, 'Session-Token': sessionToken },
                params: { range: '0-5', sort: 'id', order: 'DESC' }
            });
            console.log('List Success:', listRes.data.length);
            listRes.data.forEach(t => {
                console.log(`[${t.id}] ${t.name} (${t.date_creation})`);
            });
        } catch (e) {
            console.log('List Failed:', e.response?.data || e.message);
        }

        // Attempt 2: Search with criteria object
        console.log('--- Attempt 2: Search Object ---');
        try {
            const searchRes2 = await axios.get(`${GLPI_URL}/search/Ticket`, {
                headers: { 'App-Token': APP_TOKEN, 'Session-Token': sessionToken },
                params: {
                    criteria: [{ field: 15, searchtype: 'morethan', value: '2026-02-01 00:00:00' }],
                    forcedisplay: [1, 2, 12, 15],
                    range: '0-10'
                }
            });
            console.log('Search Object Success:', searchRes2.data.totalcount);
        } catch (e) {
            console.log('Search Object Failed:', e.response?.data || e.message);
        }

        // Attempt 3: Search with criteria string (as seen in service)
        console.log('--- Attempt 3: Search String ---');
        const paramsString = {
            criteria: JSON.stringify([{ field: 15, searchtype: 'morethan', value: '2026-02-01 00:00:00' }]),
            forcedisplay: [1, 2, 12, 15],
            range: '0-10'
        };
        try {
            const searchRes3 = await axios.get(`${GLPI_URL}/search/Ticket`, {
                headers: { 'App-Token': APP_TOKEN, 'Session-Token': sessionToken },
                params: paramsString
            });
            console.log('Search String Success:', searchRes3.data.totalcount);
        } catch (e) {
            console.log('Search String Failed:', e.response?.data || e.message);
        }

        // Kill session
        await axios.get(`${GLPI_URL}/killSession`, {
            headers: { 'Session-Token': sessionToken, 'App-Token': APP_TOKEN }
        });

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

search();
