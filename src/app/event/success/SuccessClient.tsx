"use client";
import { useEffect, useState } from "react";
import LoadingTicket from "./LoadingTicket";
import Image from "next/image";
import {
  FaCheckCircle, FaTicketAlt, FaCalendarAlt, FaUser, FaEnvelope,
  FaMoneyBillWave, FaInfoCircle, FaReceipt, FaMapPin, FaClock
} from "react-icons/fa";
import { formatInTimeZone } from "date-fns-tz";

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
            if (!cancelled) setResult(data);
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
        if (!cancelled) setResult(postData);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [session_id]);

  if (loading) return <LoadingTicket />;
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Error</h1>
        <p className="text-gray-600 mt-2">{error}</p>
      </div>
    );
  }
  const { transaction, userProfile, eventDetails, qrCodeData, transactionItems, heroImageUrl } = result || {};
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
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* Hero Section - matches ticketing page */}
      <section className="hero-section relative w-full h-[350px] md:h-[350px] sm:h-[220px] h-[160px] bg-transparent pb-0 mb-8">
        <div className="absolute hero-image-container left-0 top-0 right-0 bottom-0 z-0">
          <div className="w-full h-full relative">
            {/* Blurred background image for width fill */}
            <Image
              src={heroImageUrl || "/images/side_images/chilanka_2025.webp"}
              alt={eventDetails.title || 'Event Image'}
              fill
              className="object-cover w-full h-full blur-lg scale-105"
              style={{ zIndex: 0, filter: 'blur(24px) brightness(1.1)', objectPosition: 'center' }}
              aria-hidden="true"
              priority
            />
            {/* Main hero image, fully visible */}
            <Image
              src={heroImageUrl || "/images/side_images/chilanka_2025.webp"}
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