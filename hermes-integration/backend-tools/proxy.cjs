const http = require('http');
const proxy = http.createServer((req, res) => {
  const headers = { ...req.headers, host: 'hermes' };
  const options = {
    hostname: 'hermes',
    port: 3000,
    path: req.url,
    method: req.method,
    headers,
  };
  const p = http.request(options, (pr) => {
    res.writeHead(pr.statusCode, pr.headers);
    pr.pipe(res);
  });
  req.pipe(p);
});
proxy.listen(3001, '0.0.0.0', () => {
  console.log('Proxy 3001->hermes:3000 active');
});
