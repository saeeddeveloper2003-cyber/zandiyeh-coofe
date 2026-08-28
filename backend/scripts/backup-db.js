#!/usr/bin/env node
/**
 * Simple periodic backup for the SQLite database.
 *
 * Usage:
 *   node scripts/backup-db.js [outputDir]
 *
 * Uses better-sqlite3's built-in .backup() (a safe, consistent online
 * backup — it does not lock or interrupt the running server) rather than
 * copying the .db file directly, which can capture a half-written page if
 * a write is in progress.
 *
 * Wire this up with a cron job, e.g. daily at 3am:
 *   0 3 * * * cd /path/to/backend && node scripts/backup-db.js /path/to/backups
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'zandieh.db');
const outDir = process.argv[2] || path.join(__dirname, '..', 'backups');

if (!fs.existsSync(DB_PATH)) {
  console.error(`دیتابیس پیدا نشد: ${DB_PATH}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = path.join(outDir, `zandieh-${timestamp}.db`);

const db = new Database(DB_PATH, { readonly: true });
db.backup(outPath)
  .then(() => {
    console.log(`بک‌آپ گرفته شد: ${outPath}`);
    db.close();
  })
  .catch((err) => {
    console.error('بک‌آپ ناموفق بود:', err);
    db.close();
    process.exit(1);
  });
