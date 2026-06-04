/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.createTable('webhook_deliveries', {
        id: {
            type: 'uuid',
            default: pgm.func('gen_random_uuid()'),
            primaryKey: true,
        },
        tenant_id: {
            type: 'uuid',
            notNull: true,
            references: '"tenants"',
            onDelete: 'CASCADE',
        },
        endpoint_url: {
            type: 'varchar',
            notNull: true,
        },
        payload: {
            type: 'jsonb',
            notNull: true,
        },
        status: {
            type: 'varchar',
            notNull: true,
            default: 'PENDING', // 'PENDING', 'SUCCESS', 'FAILED'
        },
        attempts: {
            type: 'int',
            notNull: true,
            default: 0,
        },
        next_retry_at: {
            type: 'timestamp',
            notNull: false,
        },
        is_live: {
            type: 'boolean',
            notNull: true,
            default: true,
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    // Create an index for faster lookups by tenant and status (e.g., for a dashboard)
    pgm.createIndex('webhook_deliveries', ['tenant_id', 'status']);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropIndex('webhook_deliveries', ['tenant_id', 'status']);
    pgm.dropTable('webhook_deliveries');
};
