import TicketQrClient from './TicketQrClient';

export default function TicketQrPage() {
  console.log('[QR PAGE SERVER] TicketQrPage component rendering');
  return (
    <div>
      <div style={{ padding: '20px', background: 'yellow', textAlign: 'center' }}>
        <h1>[DEBUG] QR Page is Loading...</h1>
        <p>If you see this, the page is rendering correctly</p>
      </div>
      <TicketQrClient />
    </div>
  );
}