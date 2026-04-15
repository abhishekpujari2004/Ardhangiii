const http = require('http');
const data = JSON.stringify({
  userId: '000000000000000000000000',
  height: "5'8\"",
  diet: ['Veg'],
  qualification: 'B.Tech',
  collegeName: 'Test College',
  income: '5-10 LPA',
  hobbies: ['Reading'],
  profession: 'Engineer',
  workDetails: { sector: 'Private', type: 'Private' },
  agePreference: { min: 25, max: 30 },
  religionPreference: ['Hindu'],
  locationPreference: ['Mumbai'],
  interests: ['Traveling'],
  lifestyle: { smoking: 'No', drinking: 'No', caste: 'General' }
});

const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/api/survey',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log('status', res.statusCode);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => { console.log(body); });
});

req.on('error', (err) => {
  console.error('request error', err);
});

req.write(data);
req.end();
