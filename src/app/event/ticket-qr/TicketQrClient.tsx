"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingTicket from "../success/LoadingTicket";
import Image from "next/image";
import {
  FaCheckCircle, FaTicketAlt, FaCalendarAlt, FaUser, FaEnvelope,
  FaMoneyBillWave, FaInfoCircle, FaReceipt, FaMapPin, FaClock, FaTags
} from "react-icons/fa";
import { formatInTimeZone } from "date-fns-tz";
import LocationDisplay from '@/components/LocationDisplay';
import { sendTicketEmailAsync } from '@/lib/emailUtils';

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

// CRITICAL: Absolutely prevent any duplicate QR API calls using singleton pattern
class QrFetchSingleton {
  private static instance: QrFetchSingleton;
  private fetchInProgress = false;
  private fetchedTransactions = new Set<string>();
  private qrResults = new Map<string, any>();

  static getInstance(): QrFetchSingleton {
    if (!QrFetchSingleton.instance) {
      QrFetchSingleton.instance = new QrFetchSingleton();
    }
    return QrFetchSingleton.instance;
  }

  async fetchQrCodeOnce(eventId: number, transactionId: number, addApiLog: (msg: string) => void): Promise<any> {
    const key = `${eventId}-${transactionId}`;

    // If already fetched, return cached result
    if (this.qrResults.has(key)) {
      console.log(`[QR SINGLETON] Returning cached QR result for ${key}`);
      addApiLog(`Returning cached QR result for ${key}`);
      return this.qrResults.get(key);
    }

    // If already marked as fetched but no result yet, return error
    if (this.fetchedTransactions.has(key)) {
      console.log(`[QR SINGLETON] QR already attempted for ${key} - BLOCKING`);
      addApiLog(`QR already attempted for ${key} - BLOCKING`);
      return { error: 'QR fetch already attempted' };
    }

    // If fetch in progress, return error
    if (this.fetchInProgress) {
      console.log(`[QR SINGLETON] QR fetch already in progress - BLOCKING`);
      addApiLog(`QR fetch already in progress - BLOCKING`);
      return { error: 'QR fetch in progress' };
    }

    // Mark as being fetched IMMEDIATELY to prevent any race conditions
    this.fetchedTransactions.add(key);
    this.fetchInProgress = true;

    try {
      console.log(`[QR SINGLETON] Making SINGLE QR API call for ${key} - THIS IS THE ONLY EMAIL-TRIGGERING CALL`);
      addApiLog(`Making SINGLE QR API call for ${key} - THIS IS THE ONLY EMAIL-TRIGGERING CALL`);

      const baseUrl = window.location.origin;
      const emailHostUrlPrefix = baseUrl;
      const encodedEmailHostUrlPrefix = btoa(emailHostUrlPrefix);
      const qrUrl = `/api/proxy/events/${eventId}/transactions/${transactionId}/emailHostUrlPrefix/${encodedEmailHostUrlPrefix}/qrcode`;

      console.log(`[QR SINGLETON] QR URL: ${qrUrl}`);
      addApiLog(`QR URL: ${qrUrl}`);

      const qrRes = await fetch(qrUrl, {
        method: 'GET',
        cache: 'no-store',
      });

      console.log(`[QR SINGLETON] QR response status: ${qrRes.status}`);
      addApiLog(`QR response status: ${qrRes.status}`);

      let result;
      if (qrRes.ok) {
        const qrUrlResponse = await qrRes.text();
        console.log(`[QR SINGLETON] QR URL length: ${qrUrlResponse.length}`);
        addApiLog(`QR URL received: ${qrUrlResponse.length} characters`);

        if (qrUrlResponse && qrUrlResponse.trim().length > 0) {
          result = { qrCodeImageUrl: qrUrlResponse.trim() };
          console.log(`[QR SINGLETON] QR fetch SUCCESS - cached for ${key}`);
          addApiLog('QR code fetched successfully - DONE');
        } else {
          result = { error: 'QR URL empty' };
          console.log(`[QR SINGLETON] QR URL empty for ${key}`);
          addApiLog('QR URL empty');
        }
      } else {
        const errorText = await qrRes.text();
        result = { error: `QR fetch failed: ${qrRes.status}` };
        console.error(`[QR SINGLETON] QR fetch failed for ${key}:`, qrRes.status, errorText);
        addApiLog(`QR fetch failed: ${qrRes.status}`);
      }

      // Cache the result
      this.qrResults.set(key, result);
      return result;

    } catch (error: any) {
      const result = { error: `QR fetch exception: ${error.message}` };
      this.qrResults.set(key, result);
      console.error(`[QR SINGLETON] QR fetch exception for ${key}:`, error);
      addApiLog(`QR fetch exception: ${error.message}`);
      return result;
    } finally {
      this.fetchInProgress = false;
    }
  }
}

const qrSingleton = QrFetchSingleton.getInstance();

export default function TicketQrClient() {
  // Add immediate debug logging to see if component is even instantiated
  console.log('[QR CLIENT DEBUG] TicketQrClient function called - component starting');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [apiLogs, setApiLogs] = useState<string[]>([]);
  const [qrFetching, setQrFetching] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper function to add logs that will be visible in error screen
  const addApiLog = (message: string) => {
    console.log(message);
    setApiLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  console.log('[QR CLIENT DEBUG] State and hooks initialized');

  // Component initialization
  console.log('[MOBILE QR] TicketQrClient mounted');

  // Get session_id or payment_intent from URL params or sessionStorage
  const [session_id, setSessionId] = useState<string | null>(null);
  const [payment_intent, setPaymentIntent] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState<string | null>(null);

  // Initialize parameters on client side to avoid SSR issues
  useEffect(() => {
    const urlSessionId = searchParams?.get('session_id');
    const urlPaymentIntent = searchParams?.get('pi');
    const storageSessionId = sessionStorage.getItem('stripe_session_id');
    const storagePaymentIntent = sessionStorage.getItem('stripe_payment_intent');

    const finalSessionId = urlSessionId || storageSessionId;
    const finalPaymentIntent = urlPaymentIntent || storagePaymentIntent;
    const finalIdentifier = finalSessionId || finalPaymentIntent;

    console.log('[MOBILE QR DEBUG] Parameter initialization:', {
      urlSessionId,
      urlPaymentIntent,
      storageSessionId,
      storagePaymentIntent,
      finalSessionId,
      finalPaymentIntent,
      finalIdentifier
    });

    setSessionId(finalSessionId);
    setPaymentIntent(finalPaymentIntent);
    setIdentifier(finalIdentifier);
  }, [searchParams]);

  // Debug logging for parameter retrieval will now happen in useEffect above

  // Helper to get ticket number
  function getTicketNumber(transaction: any) {
    return (
      transaction?.transactionReference ||
      transaction?.transaction_reference ||
      (transaction?.id ? `TKTN${transaction.id}` : '')
    );
  }

  // Call mobile debug endpoint to verify mobile flow is working - only after parameters are initialized
  useEffect(() => {
    if (typeof window !== 'undefined' && (session_id || payment_intent)) {
      const debugMobile = async () => {
        try {
          console.log('[MOBILE QR DEBUG] Calling mobile debug endpoint...');
          const response = await fetch(`/api/debug/mobile?page=ticket-qr&pi=${payment_intent || 'none'}&session_id=${session_id || 'none'}`);
          const data = await response.json();
          console.log('[MOBILE QR DEBUG] Mobile debug response:', data);
        } catch (error) {
          console.error('[MOBILE QR DEBUG] Mobile debug endpoint error:', error);
        }
      };
      debugMobile();
    }
  }, [session_id, payment_intent]);

  // First, load transaction data - wait for parameters to be initialized
  useEffect(() => {
    // Skip if parameters haven't been initialized yet (identifier will be null during SSR)
    if (identifier === null) {
      console.log('[MOBILE QR DEBUG] Parameters not initialized yet, waiting...');
      return;
    }

    if (!identifier) {
      console.error('[MOBILE QR DEBUG] Missing identifier after initialization - session_id:', session_id, 'payment_intent:', payment_intent);
      setError('Missing session ID or payment intent');
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchTransactionData() {
      try {
        addApiLog('Starting transaction fetch');
        addApiLog(`Fetching for identifier: ${identifier}`);
        addApiLog(`session_id: ${session_id}, payment_intent: ${payment_intent}`);

        // Build the appropriate query parameters
        const queryParams = new URLSearchParams();
        if (session_id) {
          queryParams.set('session_id', session_id);
          console.log('[TicketQrClient] Added session_id to query params');
          addApiLog('Added session_id to query params');
        } else if (payment_intent) {
          queryParams.set('pi', payment_intent);
          console.log('[TicketQrClient] Added pi to query params');
          addApiLog('Added payment_intent to query params');
        }
        queryParams.set('skip_qr', 'true'); // Prevent duplicate emails
        queryParams.set('_t', Date.now().toString());

        // Allow server to also fetch QR code (may send duplicate email, accepted for now)
        const apiUrl = `/api/event/success/process?${queryParams.toString()}`;
        console.log('[TicketQrClient] Making GET request to:', apiUrl);
        addApiLog(`Making GET request to: ${apiUrl}`);

        // Try to GET the transaction
        const getRes = await fetch(apiUrl, {
          cache: 'no-store'
        });

        console.log('[MOBILE QR DEBUG] GET response status:', getRes.status);
        addApiLog(`GET response status: ${getRes.status}`);

        if (getRes.ok) {
          const data = await getRes.json();
          console.log('[MOBILE QR DEBUG] GET response data:', data);
          addApiLog(`GET response received: ${JSON.stringify({
            hasTransaction: !!data.transaction,
            transactionId: data.transaction?.id,
            error: data.error
          })}`);

          if (data.transaction && !cancelled) {
            console.log('[MOBILE QR DEBUG] Transaction data loaded:', data.transaction.id);
            addApiLog(`Transaction data loaded successfully: ID ${data.transaction.id}`);
            setResult(data);
            setLoading(false);

            // Immediately fetch QR code using singleton - NO useEffect, NO setTimeout
            // This is the ONLY place QR code should be fetched in mobile flow to prevent duplicate emails
            addApiLog('Mobile client will now fetch QR code (this is the ONLY QR fetch for mobile)');
            fetchQrCodeViaSingleton(data);
            return;
          } else {
            console.log('[MOBILE QR DEBUG] No transaction in GET response, will try POST');
            addApiLog('No transaction in GET response, attempting POST');
          }
        } else {
          const errorText = await getRes.text();
          console.error('[MOBILE QR DEBUG] GET request failed:', getRes.status, errorText);
          addApiLog(`GET request failed: ${getRes.status} - ${errorText.substring(0, 200)}`);
        }

        // If not found, POST to create it
        // IMPORTANT: keep skip_qr=true to prevent server route from fetching and emailing
        const postBody: any = {};
        if (session_id) {
          postBody.session_id = session_id;
          postBody.skip_qr = true; // Prevent duplicate emails
          console.log('[TicketQrClient] POST body with session_id:', postBody);
          addApiLog(`POST body prepared with session_id: ${session_id}`);
        } else if (payment_intent) {
          postBody.pi = payment_intent;
          postBody.skip_qr = true; // Prevent duplicate emails
          console.log('[TicketQrClient] POST body with pi:', postBody);
          addApiLog(`POST body prepared with payment_intent: ${payment_intent}`);
        }

        console.log('[TicketQrClient] Making POST request to create transaction');
        addApiLog('Making POST request to create transaction');
        const postRes = await fetch("/api/event/success/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postBody),
        });

        addApiLog(`POST response status: ${postRes.status}`);

        if (!postRes.ok) {
          const errorText = await postRes.text();
          addApiLog(`POST request failed: ${postRes.status} - ${errorText.substring(0, 200)}`);
          throw new Error(errorText);
        }

        const postData = await postRes.json();
        addApiLog(`POST response received: ${JSON.stringify({
          hasTransaction: !!postData.transaction,
          transactionId: postData.transaction?.id,
          error: postData.error
        })}`);

        if (!cancelled) {
          console.log('[MOBILE QR DEBUG] Transaction created:', postData.transaction.id);
          addApiLog(`Transaction created successfully: ID ${postData.transaction.id}`);
          setResult(postData);
          setLoading(false);
          // Trigger the single QR fetch after POST success (credit card / fallback)
          // Guard with small delay to give backend a moment to finish QR prereqs
          setTimeout(() => {
            addApiLog('Mobile client will now fetch QR code after POST (credit card flow)');
            fetchQrCodeViaSingleton(postData);
          }, 300);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[MOBILE QR DEBUG] Error loading transaction:', err);
          console.error('[MOBILE QR DEBUG] Error details:', {
            message: err?.message,
            stack: err?.stack,
            identifier,
            session_id,
            payment_intent
          });
          addApiLog(`ERROR: ${err?.message || 'Unknown error occurred'}`);
          addApiLog(`Error details: ${err?.stack ? err.stack.substring(0, 200) : 'No stack trace'}`);
          setError(err?.message || "Failed to load transaction");
          setLoading(false);
        }
      }
    }

    fetchTransactionData();
    return () => { cancelled = true; };
  }, [identifier, session_id, payment_intent]);

  // SINGLETON QR FETCH - Absolutely prevents any duplicate calls
  const fetchQrCodeViaSingleton = async (transactionResult: any) => {
    console.log('[SINGLETON FETCH] fetchQrCodeViaSingleton called');

    if (!transactionResult?.transaction || !transactionResult?.eventDetails) {
      console.log('[SINGLETON FETCH] Missing transaction or event details - skipping');
      return;
    }

    if (qrCodeData || qrError) {
      console.log('[SINGLETON FETCH] QR already exists or error occurred - skipping');
      return;
    }

    const transaction = transactionResult.transaction;
    const eventDetails = transactionResult.eventDetails;

    if (!transaction.id || !eventDetails.id) {
      console.log('[SINGLETON FETCH] Missing transaction or event ID - skipping');
      return;
    }

    // Extra mobile idempotency: prevent duplicate calls across reloads in same tab
    try {
      if (typeof window !== 'undefined') {
        const storageKey = `qr_fetched_${eventDetails.id}_${transaction.id}`;
        const alreadyFetched = sessionStorage.getItem(storageKey);
        if (alreadyFetched) {
          console.log('[SINGLETON FETCH] sessionStorage indicates QR already fetched - skipping');
          return;
        }
        // Mark as fetched before the network call to prevent races
        sessionStorage.setItem(storageKey, '1');
      }
    } catch (e) {
      // Non-fatal if sessionStorage unavailable
    }

    setQrFetching(true);

    try {
      const result = await qrSingleton.fetchQrCodeOnce(eventDetails.id, transaction.id, addApiLog);

      if (result.error) {
        console.log('[SINGLETON FETCH] QR fetch error:', result.error);
        setQrError('QR code not available. Please check your email.');
      } else if (result.qrCodeImageUrl) {
        console.log('[SINGLETON FETCH] QR code fetched successfully via singleton');
        setQrCodeData(result);

        // Send ticket email after QR code is successfully fetched
        if (transaction.email && eventDetails.id) {
          console.log('[MOBILE QR] QR code loaded successfully, sending ticket email:', {
            eventId: eventDetails.id,
            transactionId: transaction.id,
            email: transaction.email
          });

          // Send email asynchronously after QR code is displayed
          sendTicketEmailAsync({
            eventId: eventDetails.id,
            transactionId: transaction.id,
            email: transaction.email
          });
        }
      } else {
        console.log('[SINGLETON FETCH] Unexpected result from singleton');
        setQrError('QR code not available. Please check your email.');
      }
    } catch (error: any) {
      console.error('[SINGLETON FETCH] Exception:', error);
      setQrError('QR code fetch failed. Please check your email.');
    } finally {
      setQrFetching(false);
    }
  };

  if (loading) {
    return (
      <div>
        <LoadingTicket sessionId={identifier || ''} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Error</h1>
        <p className="text-gray-600 mt-2">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return Home
        </button>
      </div>
    );
  }

  const { transaction, userProfile, eventDetails, transactionItems, heroImageUrl: fetchedHeroImageUrl } = result || {};

  if (!transaction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Transaction Not Found</h1>
        <p className="text-gray-600 mt-2">We could not find the details for your transaction.</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" style={{ overflowX: 'hidden' }}>

      {/* HERO SECTION - styled to merge with header like success/tickets pages */}
      <section className="hero-section" style={{
        position: 'relative',
        marginTop: '0',
        backgroundColor: 'transparent',
        minHeight: '400px',
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 0 0 0'
      }}>
        <img
          src={fetchedHeroImageUrl || "/images/default_placeholder_hero_image.jpeg"}
          alt="Event Hero"
          className="hero-image"
          style={{
            margin: '0 auto',
            padding: '0',
            display: 'block',
            width: '100%',
            maxWidth: '100%',
            height: 'auto',
            objectFit: 'cover',
            borderRadius: '0'
          }}
        />
        <div className="hero-overlay" style={{ opacity: 0.1, height: '5px', padding: '20' }}></div>
      </section>

      {/* Main content container */}
      <div className="max-w-5xl mx-auto px-8 py-8" style={{ marginTop: '80px' }}>

        {/* Payment Success Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 ring-4 ring-white -mt-16 mb-4">
              <FaCheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Payment Successful!</h1>
            <p className="mt-2 text-gray-600">
              Thank you for your purchase. Your tickets for <strong>{eventDetails?.title}</strong> are confirmed.<br />
              A confirmation is sent to your email: <strong>{transaction.email}</strong>
            </p>
          </div>
        </div>

        {/* Event Details Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            {eventDetails?.title}
          </h2>
          {eventDetails?.caption && (
            <div className="text-lg text-teal-700 font-semibold mb-4">{eventDetails.caption}</div>
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <FaCalendarAlt />
              <span>{formatInTimeZone(eventDetails?.startDate, eventDetails?.timezone, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaClock />
              <span>
                {formatTime(eventDetails?.startTime)}{eventDetails?.endTime ? ` - ${formatTime(eventDetails.endTime)}` : ''}
                {' '}
                ({formatInTimeZone(eventDetails?.startDate, eventDetails?.timezone, 'zzz')})
              </span>
            </div>
            {eventDetails?.location && (
              <div className="flex items-center gap-2">
                <LocationDisplay location={eventDetails.location} />
              </div>
            )}
          </div>
          {eventDetails?.description && <p className="text-gray-700 text-base">{eventDetails.description}</p>}
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
                  <img
                    src={qrCodeData.qrCodeImageUrl}
                    alt="Ticket QR Code"
                    className="mx-auto w-48 h-48 object-contain border border-gray-300 rounded-lg shadow"
                  />
                ) : (
                  <div className="text-gray-500">QR code not available.</div>
                )}

                {/* Email Status Section */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <FaEnvelope className="text-sm" />
                    <span className="text-sm font-medium">Ticket email sent to {transaction.email}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Check your email for your tickets. If you don't see it, check your spam folder.
                  </p>
                </div>
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
            {transaction.firstName && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaUser /> Name</label>
                <p className="text-lg text-gray-800 font-medium">{transaction.firstName}</p>
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
              <p className="text-lg text-gray-800 font-medium">${(transaction.finalAmount ?? transaction.totalAmount ?? 0).toFixed(2)}</p>
            </div>
            {(transaction.discountAmount ?? 0) > 0 && (
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaTags /> Discount Applied</label>
                <p className="text-lg text-green-600 font-medium">-${transaction.discountAmount.toFixed(2)}</p>
              </div>
            )}
            {(transaction.discountAmount ?? 0) > 0 && (
              <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Price Breakdown</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Original Amount:</span>
                    <span className="text-gray-800">${(transaction.totalAmount ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="text-green-600">-${transaction.discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-gray-800 font-semibold">Final Amount:</span>
                    <span className="text-gray-800 font-semibold">${(transaction.finalAmount ?? transaction.totalAmount ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}