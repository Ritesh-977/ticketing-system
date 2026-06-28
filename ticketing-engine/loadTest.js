import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function runTest() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();

        console.log('--- Step 1: Getting a valid API Key ---');
        const keyRes = await client.query(`SELECT tenant_id, publishable_key, is_live FROM api_keys WHERE status = 'active' LIMIT 1`);
        if (keyRes.rows.length === 0) {
            console.error('No active api keys found. Please create one first.');
            process.exit(1);
        }
        const { tenant_id, publishable_key, is_live } = keyRes.rows[0];
        console.log(`Using Tenant: ${tenant_id}`);
        console.log(`Using Key: ${publishable_key}`);

        console.log('\n--- Step 2: Creating a Flash Sale Event with ONLY 1 Ticket ---');
        const eventRes = await client.query(`
            INSERT INTO events (tenant_id, name, total_inventory, status, is_live) 
            VALUES ($1, 'Supreme Drop - Limited Edition', 1, 'UPCOMING', $2) 
            RETURNING id
        `, [tenant_id, is_live]);
        const eventId = eventRes.rows[0].id;
        console.log(`Created Event ID: ${eventId} with 1 inventory left.`);

        console.log('\n--- Step 3: Firing 10 Concurrent Checkout Requests ---');
        const numRequests = 10;
        console.log(`Simulating ${numRequests} simultaneous users trying to checkout at the EXACT same millisecond...`);

        const startTime = Date.now();
        const promises = Array.from({ length: numRequests }).map(async (_, idx) => {
            const reqStart = Date.now();
            try {
                const response = await fetch(`http://localhost:3000/api/public/checkout/${eventId}`, {
                    method: 'POST',
                    headers: {
                        'x-publishable-key': publishable_key,
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json().catch(() => null);
                const latency = Date.now() - reqStart;
                return {
                    user: `User ${idx + 1}`,
                    status: response.status,
                    data,
                    latency: `${latency}ms`
                };
            } catch (err) {
                return {
                    user: `User ${idx + 1}`,
                    status: 'Error',
                    error: err.message
                };
            }
        });

        const results = await Promise.all(promises);
        const endTime = Date.now();

        console.log(`\n--- Test Complete in ${endTime - startTime}ms ---`);
        console.log('Results:');
        
        let successCount = 0;
        let soldOutCount = 0;
        let lockTimeoutCount = 0;

        results.forEach(res => {
            if (res.status === 201) successCount++;
            if (res.status === 400) soldOutCount++;
            if (res.status === 429) lockTimeoutCount++;
            
            console.log(`[${res.user}] - Status: ${res.status} | Response: ${JSON.stringify(res.data)} | Latency: ${res.latency}`);
        });

        console.log('\n--- Final Tally ---');
        console.log(`✅ Success (201): ${successCount} (Should be exactly 1)`);
        console.log(`🔒 Rate Limited / Lock Busy (429): ${lockTimeoutCount}`);
        console.log(`❌ Sold Out (400): ${soldOutCount}`);

        if (successCount === 1) {
            console.log('\n🎉 SUCCESS! Your distributed locking system prevented overselling perfectly!');
        } else if (successCount > 1) {
            console.log('\n🚨 WARNING: Overselling occurred! Multiple tickets were sold when only 1 existed.');
        } else {
            console.log('\n🚨 WARNING: No tickets were sold. Lock might have timed out for everyone.');
        }

        console.log('\n--- Step 4: Cleaning up temporary event ---');
        await client.query(`DELETE FROM orders WHERE event_id = $1`, [eventId]);
        await client.query(`DELETE FROM events WHERE id = $1`, [eventId]);
        console.log('Cleanup complete.');

    } catch (e) {
        console.error('Test script error:', e);
    } finally {
        await client.end();
    }
}

runTest();
