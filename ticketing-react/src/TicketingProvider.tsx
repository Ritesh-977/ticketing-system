import React, { createContext, useContext, ReactNode } from 'react';

// 1. Define the shape of our context
interface TicketingContextType {
    publishableKey: string;
    apiUrl: string;
}

// 2. Create the internal React Context
const TicketingContext = createContext<TicketingContextType | undefined>(undefined);

// 3. Define the Props for the Provider component
interface TicketingProviderProps {
    publishableKey: string;
    apiUrl?: string; // Optional: Allows them to point to your local dev server or production
    children: ReactNode;
}

// 4. The actual Provider Component
export const TicketingProvider: React.FC<TicketingProviderProps> = ({
    publishableKey,
    apiUrl = 'http://localhost:3000/api/public',
    children
}) => {

    if (!publishableKey || !publishableKey.startsWith('pk_')) {
        console.error('[Ticketing SDK] A valid Publishable Key is required.');
    }

    return (
        <TicketingContext.Provider value={{ publishableKey, apiUrl }}>
            {children}
        </TicketingContext.Provider>
    );
};

// 5. Internal hook so our other tools can grab the key safely
export const useTicketingContext = () => {
    const context = useContext(TicketingContext);
    if (!context) {
        throw new Error('Ticketing hooks must be used within a <TicketingProvider>');
    }
    return context;
};