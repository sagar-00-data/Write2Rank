const http = require('https');

const postData = JSON.stringify({
  password: 'Mystic01!'
});

const loginOptions = {
  hostname: 'write2rank.vercel.app',
  port: 443,
  path: '/admin/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = http.request(loginOptions, (res) => {
  let cookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0] : '';
  if (!cookie) {
    console.error("No cookie returned!");
    return;
  }

  const cookieVal = cookie.split(';')[0];

  const statsOptions = {
    hostname: 'write2rank.vercel.app',
    port: 443,
    path: '/admin/api/stats',
    method: 'GET',
    headers: {
      'Cookie': cookieVal
    }
  };

  const statsReq = http.request(statsOptions, (statsRes) => {
    let body = '';
    statsRes.on('data', (chunk) => body += chunk);
    statsRes.on('end', () => {
      try {
        const json = JSON.parse(body);
        console.log('Stats meta object:', json.meta);
        console.log('Stats platform object:', json.platform);
        console.log('Stats systemHealth object:', json.systemHealth);
      } catch (err) {
        console.error("Failed to parse stats JSON:", err);
      }
    });
  });

  statsReq.on('error', (e) => console.error('Stats Error:', e.message));
  statsReq.end();
});

req.on('error', (e) => console.error('Login Error:', e.message));
req.write(postData);
req.end();
