require('dotenv').config();

const { db, getPublicUser } = require('./db');

function main() {
  const target = process.argv[2] || process.env.MAKE_ADMIN_USER;

  if (!target) {
    console.log('Usage: node server/make-admin.js <username_or_email>');
    console.log('Or set MAKE_ADMIN_USER environment variable.');
    process.exit(1);
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(target, target);

  if (!user) {
    console.error(`User "${target}" not found in database.`);
    process.exit(1);
  }

  db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);

  const updatedUser = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(user.id);

  console.log('✅ Successfully promoted user to Admin:');
  console.log(JSON.stringify(getPublicUser(updatedUser), null, 2));
}

try {
  main();
} catch (err) {
  console.error('Failed to make admin:', err);
  process.exit(1);
}
