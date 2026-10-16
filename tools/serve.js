// Tiny static dev server with caching disabled (used for local testing only).
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), port = process.env.PORT || 8123;
const types = {'.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css'};
http.createServer((req, res) =>
{
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    fs.readFile(p, (err, data) =>
    {
        if (err) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, {'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
        res.end(data);
    });
}).listen(port, () => console.log('LittleTrain on http://localhost:' + port));
