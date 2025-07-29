"use client";
import { useEffect, useState } from "react";
import LoadingTicket from "./LoadingTicket";
import Image from "next/image";
import {
  FaCheckCircle, FaTicketAlt, FaCalendarAlt, FaUser, FaEnvelope,
  FaMoneyBillWave, FaInfoCircle, FaReceipt, FaMapPin, FaClock
} from "react-icons/fa";
import { formatInTimeZone } from "date-fns-tz";
import { PhilantropHeaderClient } from '@/components/PhilantropHeaderClient';
import { Footer } from '@/components/Footer';
import { useRouter, useSearchParams } from 'next/navigation';
import { HydrationSafeHeroImage } from '@/components/HydrationSafeHeroImage';

interface SuccessClientProps {
  session_id: string;
}

function formatTime(time: string): string {
  if (!time) return '';
  if (time.match(/AM|PM/i)) return time;
  const [hourStr, minute] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
}

export default function SuccessClient({ session_id }: SuccessClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Hero image is handled by the HydrationSafeHeroImage component

  // Check if we were redirected due to already processed payment
  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    if (paymentStatus === 'already-processed') {
      console.log('User was redirected due to already processed payment');
      // You could show a toast or notification here if needed
    }
  }, [searchParams]);

  // Enhanced back button prevention
  useEffect(() => {
    console.log('Setting up enhanced navigation prevention...');

    // Check if we're on a Stripe URL and redirect
    if (window.location.href.includes('checkout.stripe.com')) {
      console.log('Detected Stripe URL - redirecting to home');
      window.location.replace('/');
      return;
    }

    // Enhanced back button prevention
    const handlePopState = (e: PopStateEvent) => {
      console.log('Back button detected - preventing navigation and redirecting to home');
      e.preventDefault();
      window.location.replace('/');
    };

    // Remove beforeunload handler to allow normal navigation
    // Only prevent specific refresh attempts via keydown

    // Enhanced keydown prevention for F5 and Ctrl+R
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        console.log('Refresh attempt detected - preventing');
        e.preventDefault();
        window.location.replace('/');
        return false;
      }
    };

    // Add event listeners
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    // Push current state to prevent back navigation
    window.history.pushState(null, '', window.location.href);
    window.history.pushState(null, '', window.location.href);

    console.log('Enhanced navigation prevention setup complete');

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Helper to get ticket number from either camelCase or snake_case, or fallback to 'TKTN'+id
  function getTicketNumber(transaction: any) {
    return (
      transaction?.transactionReference ||
      transaction?.transaction_reference ||
      (transaction?.id ? `TKTN${transaction.id}` : '')
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // 1. Try to GET the transaction by session_id (idempotency)
        const getRes = await fetch(`/api/event/success/process?session_id=${session_id}`);
        if (getRes.ok) {
          const data = await getRes.json();
          if (data.transaction) {
            if (!cancelled) {
              setResult(data);
              // Hero image is handled by HydrationSafeHeroImage component
            }
            setLoading(false);
            return;
          }
        }
        // 2. If not found, POST to create it
        const postRes = await fetch("/api/event/success/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id }),
        });
        if (!postRes.ok) throw new Error(await postRes.text());
        const postData = await postRes.json();
        if (!cancelled) {
          setResult(postData);
          // Hero image is handled by HydrationSafeHeroImage component
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [session_id]);

  if (loading) {
    return <LoadingTicket sessionId={session_id} />;
  }
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Error</h1>
        <p className="text-gray-600 mt-2">{error}</p>
      </div>
    );
  }
  const { transaction, userProfile, eventDetails, qrCodeData, transactionItems, heroImageUrl: fetchedHeroImageUrl } = result || {};

  // Clear hero image storage since we're on success page
  if (fetchedHeroImageUrl) {
    // Don't update heroImageUrl state, handled by component
    // Clear storage since we have the actual data now
    sessionStorage.removeItem('eventHeroImageUrl');
    sessionStorage.removeItem('eventId');
    localStorage.removeItem('eventHeroImageUrl');
    localStorage.removeItem('eventId');
  }
  if (!transaction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Transaction Not Found</h1>
        <p className="text-gray-600 mt-2">We could not find the details for your transaction. Please check your email for a confirmation.</p>
      </div>
    );
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
  const displayName = transaction.firstName || '';
  let qrError: string | null = null;
  // If qrCodeData is an error object, handle it
  if (qrCodeData && qrCodeData.error) qrError = qrCodeData.error;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <PhilantropHeaderClient />

      {/* HERO SECTION - Full width bleeding to edges */}
      <section className="hero-section" style={{ position: 'relative', marginTop: '20px', paddingTop: '40px', padding: '40px 0 0 0', margin: '0', backgroundColor: 'transparent', height: 'auto', overflow: 'hidden', width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
        <HydrationSafeHeroImage
          alt="Event Hero"
          className="hero-image"
          fetchedImageUrl={fetchedHeroImageUrl}
        />
        {/* Responsive logo positioned as overlay on hero image */}
        <div className="absolute top-1/2 left-4 z-50 mobile-logo" style={{ transform: 'translateY(-50%)' }}>
          <img src="/images/mcefee_logo_black_border_transparent.png" alt="MCEFEE Logo" style={{ width: '140px', height: 'auto', maxWidth: '30vw' }} className="block md:hidden" />
          <img src="/images/mcefee_logo_black_border_transparent.png" alt="MCEFEE Logo" style={{ width: '180px', height: 'auto', maxWidth: '15vw' }} className="hidden md:block" />
        </div>
        <div className="hero-overlay" style={{ opacity: 0.1, height: '5px', padding: '20' }}></div>
      </section>

      {/* CSS Styles for hero section */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .hero-image {
            width: 100%;
            height: auto; /* Let image dictate height */
            object-fit: cover; /* Cover full width, may crop height */
            object-position: center;
            display: block;
            margin: 0;
            padding: 0; /* Remove padding to bleed to edges */
          }

          .hero-section {
            min-height: 10vh;
            background-color: transparent !important; /* Remove coral background */
            padding-top: 40px; /* Top padding to prevent header cut-off */
            margin-left: calc(-50vw + 50%) !important;
            margin-right: calc(-50vw + 50%) !important;
            width: 100vw !important;
          }

          @media (max-width: 768px) {
            .hero-image {
              height: auto; /* Let image dictate height on mobile */
              padding: 0; /* Remove padding to bleed to edges on mobile */
            }
          }

          @media (max-width: 767px) {
            .hero-section {
              padding-top: 50px !important; /* Extra mobile top padding */
              margin-top: 0 !important;
              min-height: 5vh !important;
              background-color: transparent !important; /* Remove coral background on mobile */
              margin-left: calc(-50vw + 50%) !important;
              margin-right: calc(-50vw + 50%) !important;
              width: 100vw !important;
            }

            .mobile-logo {
              top: 120px !important;
            }
          }
        `
      }} />

      {/* Main content container - ui_style_guide.mdc compliant */}
      <div className="max-w-5xl mx-auto px-8 py-8" style={{ marginTop: '80px' }}>
        {/* Enhanced Warning Message */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaInfoCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong> Please do not refresh this page, use the back button, or press F5.
                Your payment has been processed successfully. If you need to return to the home page,
                use the navigation menu above. Any attempt to refresh or go back will redirect you to the homepage.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Success Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 ring-4 ring-white -mt-16 mb-4">
              <FaCheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Payment Successful!</h1>
            <p className="mt-2 text-gray-600">
              Thank you for your purchase. Your tickets for <strong>{eventDetails.title}</strong> are confirmed.<br />
              A confirmation is sent to your email: <strong>{transaction.email}</strong>
            </p>
          </div>
        </div>

        {/* Event Details Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            {eventDetails.title}
          </h2>
          {eventDetails.caption && (
            <div className="text-lg text-teal-700 font-semibold mb-4">{eventDetails.caption}</div>
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

        {/* QR Code Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
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

        {/* Transaction Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3 mb-6">
            <FaReceipt className="text-teal-500" />
            Transaction Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {getTicketNumber(transaction) && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaTicketAlt /> Ticket #</label>
                <p className="text-lg text-gray-800 font-medium">{getTicketNumber(transaction)}</p>
              </div>
            )}
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
              <p className="text-lg text-gray-800 font-medium">${(transaction.totalAmount ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Transaction Item Breakdown */}
        {transactionItems && transactionItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
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

      {/* FOOTER - full-bleed, edge-to-edge */}
      <Footer />
    </div>
  );
}