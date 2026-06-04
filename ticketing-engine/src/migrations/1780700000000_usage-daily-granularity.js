/**
 * Migration: Convert api_usage from monthly to daily granularity
 *
 * Renames `billing_period` (VARCHAR '2026-06') to `usage_date` (DATE).
 * Updates the unique constraint to (tenant_id, usage_date).
 *
 * NOTE: Existing monthly rows like '2026-06' will cast to '2026-06-01'.
 * This is acceptable in dev; production would need a proper data migration.
 *
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */

export const up = (pgm) => {
    pgm.sql(`
        -- 1. Drop the old unique constraint
        ALTER TABLE api_usage DROP CONSTRAINT IF EXISTS uq_tenant_billing_period;

        -- 2. Rename the column
        ALTER TABLE api_usage RENAME COLUMN billing_period TO usage_date;

        -- 3. Cast VARCHAR(7) → DATE
        ALTER TABLE api_usage
            ALTER COLUMN usage_date TYPE DATE
            USING (usage_date || '-01')::DATE;

        -- 4. Add new unique constraint for daily granularity
        ALTER TABLE api_usage
            ADD CONSTRAINT uq_tenant_usage_date UNIQUE (tenant_id, usage_date);
    `);
};

export const down = (pgm) => {
    pgm.sql(`
        ALTER TABLE api_usage DROP CONSTRAINT IF EXISTS uq_tenant_usage_date;

        ALTER TABLE api_usage
            ALTER COLUMN usage_date TYPE VARCHAR(7)
            USING TO_CHAR(usage_date, 'YYYY-MM');

        ALTER TABLE api_usage RENAME COLUMN usage_date TO billing_period;

        ALTER TABLE api_usage
            ADD CONSTRAINT uq_tenant_billing_period UNIQUE (tenant_id, billing_period);
    `);
};
