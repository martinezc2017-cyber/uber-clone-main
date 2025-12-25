require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function cleanRides() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('🧹 Limpiando rides viejos de la base de datos...');

  try {
    // Delete all rides
    const result = await sql`DELETE FROM rides`;
    console.log(`✅ Se eliminaron ${result.length} rides de prueba`);

    // Show current state
    const remaining = await sql`SELECT COUNT(*) as count FROM rides`;
    console.log(`📊 Rides restantes en la base de datos: ${remaining[0].count}`);

  } catch (error) {
    console.error('❌ Error limpiando rides:', error);
    process.exit(1);
  }
}

cleanRides();
