/**
 * Migration: Add name to API Keys
 *
 * Adds a `name` column to the `api_keys` table so we can persist user-provided names.
 *
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */

export const up = (pgm) => {
    pgm.sql(`
        ALTER TABLE api_keys
        ADD COLUMN name VARCHAR(255) DEFAULT 'API Key';
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        ALTER TABLE api_keys
        DROP COLUMN name;
    `);
};
