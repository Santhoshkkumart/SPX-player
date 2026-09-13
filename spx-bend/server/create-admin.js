require('dotenv').config();

const bcrypt = require('bcryptjs');

const { db, getPublicUser } = require('./db');
const { validateUsername, validateEmail, validatePassword } = require('./validation');

async function main() {
  const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existingAdmin) {
    console.error('An admin already exists. Refusing to create another first admin.');
    process.exit(1);
  }

  const usernameResult = validateUsername(process.env.FIRST_ADMIN_USERNAME);
  const emailResult = validateEmail(process.env.FIRST_ADMIN_EMAIL);
  const passwordResult = validatePassword(process.env.FIRST_ADMIN_PASSWORD);
  const firstError = usernameResult.error || emailResult.error || passwordResult.error;
  if (firstError) {
    console.error(firstError);
    console.error('Set FIRST_ADMIN_USERNAME, FIRST_ADMIN_EMAIL, and FIRST_ADMIN_PASSWORD before running this script.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(passwordResult.value, 12);
  const result = db.prepare(`
    INSERT INTO users (username, email, password_hash, role)
    VALUES (?, ?, ?, 'admin')
  `).run(usernameResult.value, emailResult.value, passwordHash);

  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  console.log('Created first admin:');
  console.log(JSON.stringify(getPublicUser(user), null, 2));
}

main().catch((err) => {
  console.error('Failed to create first admin:', err);
  process.exit(1);
});
