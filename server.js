const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const LOG_FILE = path.join(__dirname, 'client-logs.txt');

// Clear log file on server start
fs.writeFileSync(LOG_FILE, `=== Server started at ${new Date().toISOString()} ===\n`);

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle log endpoint
  if (pathname === '/log' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const logData = JSON.parse(body);
        const timestamp = new Date().toISOString();
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
        const logLine = `[${timestamp}] [${clientIP}] ${logData.level}: ${logData.message}\n`;
        
        // Write to file
        fs.appendFileSync(LOG_FILE, logLine);
        
        // Also print to console
        console.log(logLine.trim());
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (error) {
        console.error('Error processing log:', error);
        res.writeHead(500);
        res.end();
      }
    });
    return;
  }

  // Handle view logs endpoint
  if (pathname === '/view-logs' && req.method === 'GET') {
    try {
      const logs = fs.readFileSync(LOG_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(logs);
    } catch (error) {
      res.writeHead(404);
      res.end('No logs found');
    }
    return;
  }

  // Serve static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  const extname = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };

  const contentType = contentTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`View logs at: http://localhost:${PORT}/view-logs`);
  console.log(`Logs are being written to: ${LOG_FILE}`);
});
