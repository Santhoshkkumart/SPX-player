function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateUsername(username) {
  const value = String(username || '').trim();
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(value)) {
    return { error: 'Username must be 3-30 characters and use only letters, numbers, and underscores' };
  }
  return { value };
}

function validateEmail(email) {
  const value = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) {
    return { error: 'Valid email is required' };
  }
  return { value };
}

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 8 || value.length > 128) {
    return { error: 'Password must be 8-128 characters' };
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return { error: 'Password must include at least one letter and one number' };
  }
  return { value };
}

module.exports = {
  normalizeEmail,
  validateUsername,
  validateEmail,
  validatePassword,
};
