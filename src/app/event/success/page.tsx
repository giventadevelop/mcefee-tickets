'use server';
import { processStripeSessionServer } from '@/app/event/success/ApiServerActions';
import { fetchUserProfileServer } from '@/app/admin/ApiServerActions';
import { fetchEventDetailsByIdServer } from '@/app/admin/events/[id]/media/ApiServerActions';
import {
  FaCheckCircle, FaTicketAlt, FaCalendarAlt, FaUser, FaEnvelope,
  FaMoneyBillWave, FaInfoCircle, FaReceipt
} from 'react-icons/fa';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Image from 'next/image';

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

export default async function SuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const { session_id } = searchParams;
  const { userId } = auth();

  if (!session_id || !userId) {
    return notFound();
  }

  const transaction = await processStripeSessionServer(session_id);

  if (!transaction) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <FaInfoCircle className="text-4xl text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Transaction Not Found</h1>
        <p className="text-gray-600 mt-2">We could not find the details for your transaction. Please check your email for a confirmation.</p>
      </div>
    );
  }

  const eventDetails = transaction.event;
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
  const displayName = transaction.firstName ? `${transaction.firstName} ${transaction.lastName || ''}`.trim() : '';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full mx-auto">
        <div className="relative w-full h-48 sm:h-64 rounded-t-2xl overflow-hidden">
          <Image src={heroImageUrl} alt={eventDetails.title || 'Event Image'} layout="fill" objectFit="cover" />
          <div className="absolute inset-0 bg-black bg-opacity-40" />
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-b-2xl shadow-2xl border-t-4 border-teal-500 text-center -mt-16 relative z-10 mx-4 sm:mx-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 ring-4 ring-white -mt-16 mb-4">
            <FaCheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Payment Successful!</h1>
          <p className="mt-2 text-gray-600">
            Thank you for your purchase. Your tickets for <strong>{eventDetails.title}</strong> are confirmed.
          </p>
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
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaTicketAlt /> Ticket Type</label>
              <div>
                <p className="text-lg text-gray-800 font-medium">
                  {transaction.ticketType?.name || 'Ticket'} (x{transaction.quantity})
                </p>
                {transaction.ticketType?.description && (
                  <p className="text-sm text-gray-500 mt-1">{transaction.ticketType.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaMoneyBillWave /> Amount Paid</label>
              <p className="text-lg text-gray-800 font-medium">${(transaction.finalAmount ?? 0).toFixed(2)}</p>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1"><FaCalendarAlt /> Date of Purchase</label>
              <p className="text-lg text-gray-800 font-medium">{new Date(transaction.purchaseDate).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
