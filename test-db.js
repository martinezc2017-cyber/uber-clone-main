require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

sql`SELECT NOW() as now, version() as version`
  .then(result => {
    console.log('✅ Database connection OK');
    console.log('Time:', result[0].now);
    console.log('Version:', result[0].version);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  });
