import { useInventory, useCheckout } from 'ticketing-react';

export const HoodieDropPage = () => {
    // Replace with the Event ID from your database!
    const eventId = "9edb4fb1-8ded-447f-b6cd-c3bef1a9d6c0";

    const { data: inventory, loading: inventoryLoading, error: inventoryError } = useInventory(eventId);
    const { processCheckout, loading: checkoutLoading, error: checkoutError, order } = useCheckout();

    if (inventoryLoading) return <p>Loading inventory...</p>;
    if (inventoryError) return <p style={{ color: 'red' }}>Error loading inventory: {inventoryError}</p>;

    return (
        <div style={{ border: '1px solid #ccc', padding: '1rem', maxWidth: '400px', borderRadius: '8px' }}>
            <h2>{inventory?.name}</h2>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                Only {inventory?.total_inventory} left in stock!
            </p>

            {order ? (
                <div style={{ color: 'green', padding: '1rem', backgroundColor: '#e6ffe6', borderRadius: '4px' }}>
                    <strong>Order Confirmed!</strong><br />
                    Ticket ID: {order.id}
                </div>
            ) : (
                <button
                    onClick={() => processCheckout(eventId)}
                    disabled={checkoutLoading || inventory?.total_inventory === 0}
                    style={{
                        padding: '10px 20px',
                        fontSize: '1rem',
                        cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                        backgroundColor: checkoutLoading ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px'
                    }}
                >
                    {checkoutLoading ? 'Processing your order...' : 'Buy Now'}
                </button>
            )}

            {checkoutError && <p style={{ color: 'red', marginTop: '1rem' }}>{checkoutError}</p>}
        </div>
    );
};