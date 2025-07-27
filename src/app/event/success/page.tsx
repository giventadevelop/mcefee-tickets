import { processStripeSessionServer, fetchTransactionQrCode } from '@/app/event/success/ApiServerActions';
import { fetchUserProfileServer } from '@/app/admin/ApiServerActions';
import { fetchEventDetailsByIdServer } from '@/app/admin/events/[id]/media/ApiServerActions';
import {
  FaCheckCircle, FaTicketAlt, FaCalendarAlt, FaUser, FaEnvelope,
  FaMoneyBillWave, FaInfoCircle, FaReceipt, FaMapMarkerAlt, FaClock, FaMapPin
} from 'react-icons/fa';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Image from 'next/image';
import { formatInTimeZone } from 'date-fns-tz';
import { Suspense } from 'react';
import LoadingTicketFallback from './LoadingTicketFallback';
import SuccessClient from './SuccessClient';
import { getTenantId } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Function to check if transaction already exists on server side
async function checkTransactionExistsServer(sessionId: string): Promise<{ exists: boolean; transaction?: any }> {
  try {
    const tenantId = getTenantId();
    const params = new URLSearchParams({
      'stripeCheckoutSessionId.equals': sessionId,
      'tenantId.equals': tenantId,
    });

    const response = await fetchWithJwtRetry(
      `${APP_URL}/api/proxy/event-ticket-transactions?${params.toString()}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.error(`Failed to check transaction existence for session ${sessionId}:`, await response.text());
      return { exists: false };
    }

    const transactions = await response.json();
    const exists = Array.isArray(transactions) && transactions.length > 0;
    const transaction = exists ? transactions[0] : null;

    console.log(`Server-side transaction check for session ${sessionId}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    if (exists && transaction) {
      console.log(`Transaction details - ID: ${transaction.id}, Status: ${transaction.status}, Created: ${transaction.createdAt}`);
    }

    return { exists, transaction };
  } catch (error) {
    console.error('Error checking transaction existence on server:', error);
    return { exists: false };
  }
}

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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <h1 className="text-2xl font-bold text-gray-800">Missing session ID</h1>
        <p className="text-gray-600 mt-2">No session ID was provided. Please check your payment link or contact support.</p>
      </div>
    );
  }

  // Check if transaction already exists on server side
  const { exists: transactionExists, transaction } = await checkTransactionExistsServer(session_id);

  if (transactionExists) {
    console.log(`Transaction already exists for session ${session_id}, redirecting to homepage`);
    console.log(`This could be due to: page refresh, back button, or duplicate access`);
    console.log(`Transaction ID: ${transaction?.id}, Status: ${transaction?.status}`);

    // Redirect to homepage with a query parameter to indicate why
    redirect('/?payment=already-processed');
  }

  return <SuccessClient session_id={session_id} />;
}
