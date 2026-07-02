const { Client } = require('pg');
const dns = require('dns');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'sa-east-1'
];

async function scan() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const user = 'postgres.ebphocuyxxfangpuohck';
    const password = 'Mystic01!';
    
    // Check if host resolves first
    const resolved = await new Promise(resolve => {
      dns.resolve(host, (err) => resolve(!err));
    });
    if (!resolved) continue;

    console.log(`Scanning region: ${region} (${host})...`);
    
    const client = new Client({
      connectionString: `postgres://${user}:${password}@${host}:5432/postgres`,
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`🎉 SUCCESS! Connected to DB in region: ${region}`);
      
      // Let's run a test query to verify we can query users
      const res = await client.query('SELECT count(*) FROM users');
      console.log('User count in DB:', res.rows[0].count);
      
      await client.end();
      return;
    } catch (err) {
      if (err.message.includes('password authentication failed')) {
        console.log(`❌ Region ${region} matched but Password Failed.`);
      } else if (err.message.includes('not found')) {
        // Tenant not in this region
      } else {
        console.log(`Error in region ${region}:`, err.message);
      }
    }
  }
  console.log("Scan complete. Could not establish direct DB connection.");
}

scan();
