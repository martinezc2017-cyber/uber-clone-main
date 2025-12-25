require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkTables() {
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('✅ Database tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
    // Check for required tables
    const required = ['users', 'drivers', 'rides', 'messages', 'driver_status', 'driver_waitlist'];
    const existing = tables.map(t => t.table_name);
    const missing = required.filter(t => !existing.includes(t));
    
    if (missing.length > 0) {
      console.log('\n❌ Missing tables:', missing.join(', '));
    } else {
      console.log('\n✅ All required tables exist');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
