/**
 * Migration: Create api_usage table
 * 
 * This table is the PostgreSQL ledger for the Usage Tracking engine.
 * Redis counters are periodically flushed into this table using an
 * INSERT ... ON CONFLICT (UPSERT) pattern on (tenant_id, billing_period).
 * 
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */

export const up = (pgm) => {
    pgm.sql(`
    CREATE TABLE api_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        billing_period VARCHAR(7) NOT NULL,  -- e.g. '2026-06'
        total_requests BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT uq_tenant_billing_period UNIQUE (tenant_id, billing_period)
    );

    -- Index for fast lookups by tenant
    CREATE INDEX idx_api_usage_tenant_id ON api_usage(tenant_id);
  `);
};

export const down = (pgm) => {
    pgm.sql(`DROP TABLE api_usage;`);
};
