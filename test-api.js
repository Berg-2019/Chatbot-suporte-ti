const axios = require('axios');

async function testTabs() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@helpdesk.com',
      password: 'admin123'
    });
    const token = loginRes.data.access_token;
    console.log('Login successful');

    const headers = { Authorization: `Bearer ${token}` };
    const endpoints = [
      '/api/users',
      '/api/tickets',
      '/api/canned-responses',
      '/api/contacts',
      '/api/csat',
      '/api/auto-assignment/config',
      '/api/intent/statistics',
      '/api/agent-metrics',
      '/api/bot-variables'
    ];

    for (const url of endpoints) {
      try {
        const res = await axios.get(`http://localhost:3000${url}`, { headers });
        console.log(`[OK] ${url} - Status: ${res.status}`);
      } catch (err) {
         console.log(`[ERROR] ${url} - Status: ${err.response?.status} - Data:`, err.response?.data || err.message);
      }
    }
  } catch (err) {
    console.error('Login failed', err.response?.data || err.message);
  }
}

testTabs();
