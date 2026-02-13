const axios = require('axios');

const GLPI_URL = process.env.GLPI_URL || 'http://glpi/apirest.php';
const APP_TOKEN = process.env.GLPI_APP_TOKEN;

// Credentials for glpi user
const USER = 'glpi';
const PASS = 'glpi';
const AUTH = 'Basic ' + Buffer.from(USER + ':' + PASS).toString('base64');

console.log('Testing connection to:', GLPI_URL);
console.log('App-Token:', APP_TOKEN);
console.log('Auth Header:', AUTH);

async function test() {
    try {
        const response = await axios.get(`${GLPI_URL}/initSession`, {
            headers: {
                'App-Token': APP_TOKEN,
                'Authorization': AUTH
            }
        });
        console.log('SUCCESS:', response.data);
    } catch (error) {
        console.log('ERROR STATUS:', error.response?.status);
        console.log('ERROR DATA:', error.response?.data);
    }
}

test();
