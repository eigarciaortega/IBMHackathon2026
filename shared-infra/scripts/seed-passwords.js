// shared-infra/scripts/seed-passwords.js
// Run this once after init-db.sql to set real bcrypt password hashes.
// Usage: node shared-infra/scripts/seed-passwords.js
//
// Requires: npm install bcryptjs pg dotenv (or run from booking-service directory)

require('dotenv').config({ path: '../booking-service/.env' });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const users = [
  { email: 'admin@corporativoalpha.com',         password: 'Admin123' },
  { email: 'carlos.mendez@corporativoalpha.com', password: 'User123' },
  { email: 'ana.torres@corporativoalpha.com',    password: 'User123' },
];

async function seedPasswords() {
  console.log('Generating bcrypt hashes and updating users...\n');

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, user.email]
    );
    console.log(`Updated: ${user.email}`);
  }

  console.log('\nDone. All passwords updated.');
  await pool.end();
}

seedPasswords().catch((err) => {
  console.error('Error seeding passwords:', err.message);
  process.exit(1);
});
