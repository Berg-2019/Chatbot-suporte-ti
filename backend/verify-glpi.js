const axios = require('axios');

const GLPI_URL = process.env.GLPI_URL || 'http://glpi/apirest.php';
const APP_TOKEN = process.env.GLPI_APP_TOKEN;
const USER_TOKEN = process.env.GLPI_USER_TOKEN;

console.log('Testing connection to:', GLPI_URL);
console.log('App-Token:', APP_TOKEN);
console.log('User-Token:', USER_TOKEN);

async function test() {
    try {
        const response = await axios.get(`${GLPI_URL}/initSession`, {
            headers: {
                'App-Token': APP_TOKEN,
                'Authorization': `user_token ${USER_TOKEN}`
            }
        });
        console.log('SUCCESS:', response.data);
    } catch (error) {
        console.error('ERROR:', error.response ? error.response.data : error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

test();
