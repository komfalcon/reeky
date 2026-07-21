/**
 * Database Migration Runner
 *
 * Applies unapplied SQL migrations from this directory in order.
 * Tracks applied migrations in a `_migrations` table.
 *
 * Usage: node migrations/run.js
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = mysql.createPool({
    uri: dbUrl,
    ssl: dbUrl && !dbUrl.includes('localhost')
      ? { rejectUnauthorized: true }
      : undefined,
  });

  try {
    // Create migrations tracking table if it doesn't exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get already-applied migrations
    const [applied] = await pool.execute('SELECT filename FROM _migrations');
    const appliedFilenames = new Set(applied.map((r) => r.filename));

    // Get all migration files
    const migrationsDir = __dirname;
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No SQL migration files found.');
      return;
    }

    let appliedCount = 0;
    for (const file of files) {
      if (appliedFilenames.has(file)) {
        console.log(`Skipping already-applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`Applying migration: ${file}...`);

      // Execute each statement separately
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await pool.execute(statement);
      }

      // Record the migration
      await pool.execute('INSERT INTO _migrations (filename) VALUES (?)', [file]);
      console.log(`Applied: ${file}`);
      appliedCount++;
    }

    console.log(`Migration complete. ${appliedCount} new migration(s) applied.`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();