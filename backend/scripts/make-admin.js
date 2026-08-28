'use strict';

require('dotenv').config();

const db = require('../src/db');

const userId = process.argv[2];

if (!userId) {
  console.error(
    'Usage: node scripts/make-admin.js USER_ID'
  );
  process.exit(1);
}

const result = db
  .prepare(
    `UPDATE users
     SET role = 'admin'
     WHERE id = ?`,
  )
  .run(userId);

if (result.changes !== 1) {
  console.error(
    'User not found or role was not changed.',
  );
  process.exit(1);
}

console.log(
  `User ${userId} is now admin.`,
);