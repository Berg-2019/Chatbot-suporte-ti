async function testTabs() {
    try {
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@helpdesk.com', password: 'admin123' })
        });

        if (!loginRes.ok) {
            console.error('Login failed with status:', loginRes.status, await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
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
                const res = await fetch(`http://localhost:3000${url}`, { headers });
                if (res.ok) {
                    console.log(`[OK] ${url} - Status: ${res.status}`);
                } else {
                    const body = await res.text();
                    console.log(`[ERROR] ${url} - Status: ${res.status} - Data: ${body}`);
                }
            } catch (err) {
                console.log(`[NETWORK ERROR] ${url} -`, err.message);
            }
        }
    } catch (err) {
        console.error('Test script failed', err.message);
    }
}

testTabs();
