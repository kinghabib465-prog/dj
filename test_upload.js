const https = require('https');
const data = JSON.stringify({ fileName: 'test.png', fileType: 'image/png' });
const options = {
  hostname: 'pxkgmjtmzvjrcfjybyqq.supabase.co',
  path: '/functions/v1/create-receipt-upload',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};
const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => { console.log('Response:', body); });
});
req.on('error', (e) => { console.error('Error:', e); });
req.write(data);
req.end();
