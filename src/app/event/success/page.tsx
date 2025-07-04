'use server';
import { processStripeSessionServer, fetchTransactionQrCode } from '@/app/event/success/ApiServerActions';
import { fetchUserProfileServer } from '@/app/admin/ApiServerActions';
import { fetchEventDetailsByIdServer } from '@/app/admin/events/[id]/media/ApiServerActions';
import {
  FaCheckCircle, FaTicketAlt, FaCalendarAlt, FaUser, FaEnvelope,
  FaMoneyBillWave, FaInfoCircle, FaReceipt, FaMapMarkerAlt, FaClock, FaMapPin
} from 'react-icons/fa';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Image from 'next/image';
import { formatInTimeZone } from 'date-fns-tz';

async function getHeroImageUrl(eventId: number): Promise<string> {
  const defaultHeroImageUrl = `/images/side_images/chilanka_2025.webp?v=${Date.now()}`;
  let imageUrl: string | null = null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const flyerRes = await fetch(`${baseUrl}/api/proxy/event-medias?eventId.equals=${eventId}&eventFlyer.equals=true`, { cache: 'no-store' });
    if (flyerRes.ok) {
      const flyerData = await flyerRes.json();
      if (Array.isArray(flyerData) && flyerData.length > 0 && flyerData[0].fileUrl) {
        imageUrl = flyerData[0].fileUrl;
      }
    }
    if (!imageUrl) {
      const featuredRes = await fetch(`${baseUrl}/api/proxy/event-medias?eventId.equals=${eventId}&isFeaturedImage.equals=true`, { cache: 'no-store' });
      if (featuredRes.ok) {
        const featuredData = await featuredRes.json();
        if (Array.isArray(featuredData) && featuredData.length > 0 && featuredData[0].fileUrl) {
          imageUrl = featuredData[0].fileUrl;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching hero image:', error);
  }
  return imageUrl || defaultHeroImageUrl;
}

async function fetchTransactionItemsByTransactionId(transactionId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/proxy/event-ticket-transaction-items?transactionId.equals=${transactionId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

async function fetchTicketTypeById(ticketTypeId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/proxy/event-ticket-types/${ticketTypeId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

function formatTime(time: string): string {
  if (!time) return '';
  // Accepts 'HH:mm' or 'hh:mm AM/PM' and returns 'hh:mm AM/PM'
  if (time.match(/AM|PM/i)) return time;
  const [hourStr, minute] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
}

export default async function SuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const session_id = searchParams.session_id;
  if (!session_id) {
    return notFound();
  }

  // Fetch Clerk user info if logged in
  const { userId } = auth();
  let clerkUserInfo = undefined;
  if (userId) {
    // Fetch Clerk user object (server-side)
    // Use Clerk SDK or fetch from API if needed; for now, just pass userId
    // Optionally, fetch more details if available
    clerkUserInfo = { userId };
  }

  // Step 1: Process the Stripe session and create transaction/items
  const result = await processStripeSessionServer(session_id, clerkUserInfo);
  const transaction = result?.transaction;
  const userProfile = result?.userProfile;

  if (!transaction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Transaction Not Found</h1>
        <p className="text-gray-600 mt-2">We could not find the details for your transaction. Please check your email for a confirmation.</p>
      </div>
    );
  }

  // Refetch event details if missing
  let eventDetails = transaction.event;
  if (!eventDetails?.id && transaction.eventId) {
    eventDetails = await fetchEventDetailsByIdServer(transaction.eventId);
  }
  if (!eventDetails?.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Event Details Not Found</h1>
        <p className="text-gray-600 mt-2">We could not find the event details for your transaction.</p>
      </div>
    );
  }

  const heroImageUrl = await getHeroImageUrl(eventDetails.id);
  const displayName = transaction.firstName || '';

  // Step 2: Show a temporary message while fetching QR code
  if (!transaction.id) {
    throw new Error('Transaction ID missing after creation');
  }
  let qrCodeData: { qrCodeImageUrl?: string; qrCodeData?: string } | null = null;
  let qrError: string | null = null;
  try {
    qrCodeData = await fetchTransactionQrCode(eventDetails.id, transaction.id as number);
  } catch (err: any) {
    qrError = err?.message || 'Failed to fetch QR code.';
  }

  // Fetch transaction items (for summary, not for QR code)
  const transactionItems: any[] = transaction.id ? await fetchTransactionItemsByTransactionId(transaction.id) : [];
  // Optionally fetch ticket type names if not present
  const ticketTypeCache: Record<number, any> = {};
  for (const item of transactionItems) {
    if (!item.ticketTypeName && item.ticketTypeId) {
      if (!ticketTypeCache[item.ticketTypeId]) {
        ticketTypeCache[item.ticketTypeId] = await fetchTicketTypeById(item.ticketTypeId);
      }
      item.ticketTypeName = ticketTypeCache[item.ticketTypeId]?.name || `Ticket Type #${item.ticketTypeId}`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* Hero Section - matches ticketing page */}
      <section className="hero-section relative w-full h-[350px] md:h-[350px] sm:h-[220px] h-[160px] bg-transparent pb-0 mb-8">
        <div className="absolute hero-image-container left-0 top-0 right-0 bottom-0 z-0">
          <div className="w-full h-full relative">
            {/* Blurred background image for width fill */}
            <Image
              src={heroImageUrl}
              alt={eventDetails.title || 'Event Image'}
              fill
              className="object-cover w-full h-full blur-lg scale-105"
              style={{ zIndex: 0, filter: 'blur(24px) brightness(1.1)', objectPosition: 'center' }}
              aria-hidden="true"
              priority
            />
            {/* Main hero image, fully visible */}
            <Image
              src={heroImageUrl}
              alt={eventDetails.title || 'Event Image'}
              fill
              className="object-cover w-full h-full"
              style={{ objectFit: 'cover', objectPosition: 'center', zIndex: 1, background: 'linear-gradient(to bottom, #f8fafc 0%, #fff 100%)' }}
              priority
            />
            {/* Fade overlays for all four borders */}
            <div className="pointer-events-none absolute left-0 top-0 w-full h-8" style={{ background: 'linear-gradient(to bottom, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%)', zIndex: 20 }} />
            <div className="pointer-events-none absolute left-0 bottom-0 w-full h-8" style={{ background: 'linear-gradient(to top, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%)', zIndex: 20 }} />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-8" style={{ background: 'linear-gradient(to right, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%)', zIndex: 20 }} />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-8" style={{ background: 'linear-gradient(to left, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%)', zIndex: 20 }} />
          </div>
        </div>
        {/* Event Details Card */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="bg-teal-50 rounded-xl shadow-lg p-6 md:p-8 mb-8 mt-16" style={{ position: 'relative', top: '60px' }}>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              {eventDetails.title}
            </h2>
            {eventDetails.caption && (
              <div className="text-lg text-teal-700 font-semibold mb-2">{eventDetails.caption}</div>
            )}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <FaCalendarAlt />
                <span>{formatInTimeZone(eventDetails.startDate, eventDetails.timezone, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaClock />
                <span>
                  {formatTime(eventDetails.startTime)}{eventDetails.endTime ? ` - ${formatTime(eventDetails.endTime)}` : ''}
                  {' '}
                  ({formatInTimeZone(eventDetails.startDate, eventDetails.timezone, 'zzz')})
                </span>
              </div>
              {eventDetails.location && (
                <div className="flex items-center gap-2">
                  <FaMapPin />
                  <span>{eventDetails.location}</span>
                </div>
              )}
            </div>
            {eventDetails.description && <p className="text-gray-700 text-base">{eventDetails.description}</p>}
          </div>
        </div>
      </section>
      {/* --- END HERO SECTION --- */}
      <div className="max-w-4xl w-full mx-auto">
        {/* Payment Success Card */}
        <div className="bg-white p-6 sm:p-8 rounded-b-2xl shadow-2xl border-t-4 border-teal-500 text-center relative z-10 mx-4 sm:mx-8" style={{ marginTop: '-40px' }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 ring-4 ring-white -mt-16 mb-4">
            <FaCheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Payment Successful!</h1>
          <p className="mt-2 text-gray-600">
            Thank you for your purchase. Your tickets for <strong>{eventDetails.title}</strong> are confirmed.<br />
            A confirmation is sent to your email: <strong>{transaction.email}</strong>
          </p>
        </div>

        {/* QR Code Section */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 mt-8 text-center">
          {!qrCodeData && !qrError && (
            <div className="text-lg text-teal-700 font-semibold flex items-center justify-center gap-2">
              <FaTicketAlt className="animate-bounce" />
              Please wait while your tickets are created…
            </div>
          )}
          {qrError && (
            <div className="text-red-500 font-semibold">{qrError}</div>
          )}
          {qrCodeData && (
            <>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-lg font-semibold text-gray-800">Your Ticket QR Code</div>
                {qrCodeData.qrCodeImageUrl ? (
                  <img src={qrCodeData.qrCodeImageUrl} alt="Ticket QR Code" className="mx-auto w-48 h-48 object-contain border border-gray-300 rounded-lg shadow" />
                ) : qrCodeData.qrCodeData ? (
                  <div className="bg-gray-100 p-4 rounded text-xs break-all max-w-full">{qrCodeData.qrCodeData}</div>
                ) : (
                  <div className="text-gray-500">QR code not available.</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3 mb-6">
            <FaReceipt className="text-teal-500" />
            Transaction Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {displayName && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaUser /> Name</label>
                <p className="text-lg text-gray-800 font-medium">{displayName}</p>
              </div>
            )}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaEnvelope /> Email</label>
              <p className="text-lg text-gray-800 font-medium">{transaction.email}</p>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaCalendarAlt /> Date of Purchase</label>
              <p className="text-lg text-gray-800 font-medium">{new Date(transaction.purchaseDate).toLocaleString()}</p>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaMoneyBillWave /> Amount Paid</label>
              <p className="text-lg text-gray-800 font-medium">${(transaction.finalAmount ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Transaction Item Breakdown */}
        {transactionItems.length > 0 && (
          <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 mt-8">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3 mb-6">
              <FaTicketAlt className="text-teal-500" />
              Ticket Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Ticket Type</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Quantity</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Price Per Unit</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactionItems.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">{item.ticketTypeName || `Ticket Type #${item.ticketTypeId}`}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">${item.pricePerUnit.toFixed(2)}</td>
                      <td className="px-4 py-2">${item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
