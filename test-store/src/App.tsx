import { TicketingProvider } from 'ticketing-react';
import { HoodieDropPage } from './HoodieDropPage.tsx';

export default function App() {
  return (
    // Replace with the Publishable Key from your database!
    <TicketingProvider publishableKey="pk_test_3e4938f0c759d0d426bd7d96a6d60ea2d9ff8cccefe3c018">
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Alpha Club Merch Store</h1>
        <HoodieDropPage />
      </div>
    </TicketingProvider>
  );
}