exports.up = (pgm) => {
    pgm.createTable('tickets', {
        id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
        event_id: { type: 'uuid', notNull: true },
        seat_id: { type: 'uuid', notNull: true },
        user_id: { type: 'uuid', notNull: true },
        user_email: { type: 'varchar(255)', notNull: true },
        status: { type: 'varchar(50)', notNull: true, default: 'ISSUED' },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    // Optional: add foreign keys if events and seats tables exist
    // pgm.addConstraint('tickets', 'fk_tickets_events', {
    //     foreignKeys: {
    //         columns: 'event_id',
    //         references: 'events(id)',
    //         onDelete: 'CASCADE'
    //     }
    // });
};

exports.down = (pgm) => {
    pgm.dropTable('tickets');
};
