import { useState, useEffect } from 'react';
import { useTicketingContext } from './TicketingProvider';

interface InventoryData {
    id: string;
    name: string;
    total_inventory: number;
    status: string;
}

export const useInventory = (eventId: string) => {
    const { publishableKey, apiUrl } = useTicketingContext();
    const [data, setData] = useState<InventoryData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!eventId) return;

        const fetchInventory = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${apiUrl}/inventory/${eventId}`, {
                    method: 'GET',
                    headers: {
                        'x-publishable-key': publishableKey,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch inventory');
                }

                const result = await response.json();
                setData(result.event);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchInventory();
    }, [eventId, apiUrl, publishableKey]);

    return { data, loading, error };
};