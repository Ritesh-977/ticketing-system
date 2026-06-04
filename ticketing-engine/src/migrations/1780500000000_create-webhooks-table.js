/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */

export const up = (pgm) => {
    pgm.sql(`
    -- Webhooks table: Stores registered webhook endpoints per tenant
    CREATE TABLE webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        endpoint_url VARCHAR(2048) NOT NULL
            CHECK (endpoint_url ~ '^https://'),
        signing_secret VARCHAR(255) NOT NULL,
        events JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Index on tenant_id for fast retrieval of all webhooks belonging to a tenant
    CREATE INDEX idx_webhooks_tenant_id ON webhooks(tenant_id);
  `);
};

export const down = (pgm) => {
    pgm.sql(`
    DROP TABLE IF EXISTS webhooks;
  `);
};
