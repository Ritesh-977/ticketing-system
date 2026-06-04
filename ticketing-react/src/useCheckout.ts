import { useState } from 'react';
import { useTicketingContext } from './TicketingProvider';

interface OrderResponse {
    id: string;
    status: string;
    created_at: string;
}

export const useCheckout = () => {
    const { publishableKey, apiUrl } = useTicketingContext();
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [order, setOrder] = useState<OrderResponse | null>(null);

    const processCheckout = async (eventId: string) => {
        setLoading(true);
        setError(null);
        setOrder(null);

        try {
            const response = await fetch(`${apiUrl}/checkout/${eventId}`, {
                method: 'POST',
                headers: {
                    'x-publishable-key': publishableKey,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Checkout failed');
            }

            setOrder(data.order);
            return data.order;
        } catch (err: any) {
            setError(err.message);
            throw err; // Allows the frontend dev to use .catch() on the button click if they want
        } finally {
            setLoading(false);
        }
    };

    return { processCheckout, loading, error, order };
};