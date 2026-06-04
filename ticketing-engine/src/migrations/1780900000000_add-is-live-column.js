/**
 * Migration: Add is_live column to partition data between Test and Live environments.
 * 
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */

export const up = (pgm) => {
    // 1. Add is_live to api_keys
    pgm.sql(`
        ALTER TABLE api_keys ADD COLUMN is_live BOOLEAN NOT NULL DEFAULT true;
    `);

    // 2. Add is_live to events
    pgm.sql(`
        ALTER TABLE events ADD COLUMN is_live BOOLEAN NOT NULL DEFAULT true;
    `);

    // 3. Add is_live to orders
    pgm.sql(`
        ALTER TABLE orders ADD COLUMN is_live BOOLEAN NOT NULL DEFAULT true;
    `);

    // 4. Add is_live to webhooks
    pgm.sql(`
        ALTER TABLE webhooks ADD COLUMN is_live BOOLEAN NOT NULL DEFAULT true;
    `);

    // 5. Add is_live to api_usage and update unique constraint
    pgm.sql(`
        ALTER TABLE api_usage ADD COLUMN is_live BOOLEAN NOT NULL DEFAULT true;
        
        -- Drop the old constraint that only checked (tenant_id, usage_date)
        ALTER TABLE api_usage DROP CONSTRAINT IF EXISTS uq_tenant_usage_date;
        
        -- Add the new constraint that checks (tenant_id, usage_date, is_live)
        ALTER TABLE api_usage ADD CONSTRAINT uq_tenant_usage_date_live UNIQUE (tenant_id, usage_date, is_live);
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        ALTER TABLE api_usage DROP CONSTRAINT IF EXISTS uq_tenant_usage_date_live;
        ALTER TABLE api_usage ADD CONSTRAINT uq_tenant_usage_date UNIQUE (tenant_id, usage_date);
        
        ALTER TABLE api_usage DROP COLUMN IF EXISTS is_live;
        ALTER TABLE webhooks DROP COLUMN IF EXISTS is_live;
        ALTER TABLE orders DROP COLUMN IF EXISTS is_live;
        ALTER TABLE events DROP COLUMN IF EXISTS is_live;
        ALTER TABLE api_keys DROP COLUMN IF EXISTS is_live;
    `);
};
