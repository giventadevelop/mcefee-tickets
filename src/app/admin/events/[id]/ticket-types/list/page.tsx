import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TicketTypeListClient from './TicketTypeListClient';
import type { EventDetailsDTO, EventTicketTypeDTO } from '@/types';
import Link from 'next/link';
import { FaUsers, FaPhotoVideo, FaCalendarAlt, FaTags, FaTicketAlt, FaPercent, FaHome } from 'react-icons/fa';
import { fetchEventDetailsForTicketListPage, fetchTicketTypesForTicketListPage } from './ApiServerActions';

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default async function TicketTypeListPage({ params }: Props) {
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const resolvedParams = typeof params.then === 'function' ? await params : params;
  const eventId = parseInt(resolvedParams.id);
  if (isNaN(eventId)) {
    redirect('/admin/events');
  }

  const event = await fetchEventDetailsForTicketListPage(eventId);
  if (!event) {
    redirect('/admin/events');
  }

  const ticketTypes = await fetchTicketTypesForTicketListPage(eventId);

  return (
    <div className="max-w-5xl mx-auto px-8 py-8" style={{ paddingTop: '118px' }}>
      {/* Title Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manage Ticket Types</h1>
        <p className="text-gray-500 mt-2">
          Add, edit, or delete ticket types for the event: <span className="font-semibold text-blue-600">{event.title}</span> (ID: {event.id})
        </p>
      </div>

      {/* Concise Event Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-700">
          <div><span className="font-semibold text-gray-600">Event ID:</span> {event.id}</div>
          <div className="sm:col-span-2"><span className="font-semibold text-gray-600">Title:</span> {event.title}</div>
          <div><span className="font-semibold text-gray-600">Start Date:</span> {event.startDate}</div>
          <div><span className="font-semibold text-gray-600">End Date:</span> {event.endDate || event.startDate}</div>
          <div><span className="font-semibold text-gray-600">Time:</span> {event.startTime} {event.endTime ? `- ${event.endTime}` : ''}</div>
        </div>
      </div>

      {/* Button Group */}
      <div className="w-full overflow-x-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6 justify-items-center mx-auto max-w-6xl">
          <Link
            href="/admin"
            className="w-full max-w-xs flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200"
          >
            <FaHome className="text-lg sm:text-xl mb-2" />
            <span className="font-semibold text-center leading-tight">Admin Home</span>
          </Link>
          <Link
            href="/admin/manage-usage"
            className="w-full max-w-xs flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200"
          >
            <FaUsers className="text-lg sm:text-xl mb-2" />
            <span className="font-semibold text-center leading-tight">Manage Usage<br />[Users]</span>
          </Link>
          <Link
            href={`/admin/events/${eventId}/media/list`}
            className="w-full max-w-xs flex flex-col items-center justify-center bg-yellow-50 hover:bg-yellow-100 text-yellow-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200"
          >
            <FaPhotoVideo className="text-lg sm:text-xl mb-2" />
            <span className="font-semibold text-center leading-tight">Manage Media Files</span>
          </Link>
          <Link
            href="/admin"
            className="w-full max-w-xs flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200"
          >
            <FaCalendarAlt className="text-lg sm:text-xl mb-2" />
            <span className="font-semibold text-center leading-tight">Manage Events</span>
          </Link>
          <Link
            href={`/admin/events/${eventId}/ticket-types/list`}
            className="w-full max-w-xs flex flex-col items-center justify-center bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200"
          >
            <FaTags className="text-lg sm:text-xl mb-2" />
            <span className="font-semibold text-center leading-tight">Manage Ticket Types</span>
          </Link>
          <Link
            href={`/admin/events/${eventId}/tickets/list`}
            className="w-full max-w-xs flex flex-col items-center justify-center bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200"
          >
            <FaTicketAlt className="text-lg sm:text-xl mb-2" />
            <span className="font-semibold text-center leading-tight">Manage Tickets</span>
          </Link>
          <Link
            href={`/admin/events/${eventId}/discount-codes/list`}
            className="w-full max-w-xs flex flex-col items-center justify-center bg-pink-50 hover:bg-pink-100 text-pink-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200"
          >
            <FaPercent className="text-lg sm:text-xl mb-2" />
            <span className="font-semibold text-center leading-tight">Manage Discount Codes</span>
          </Link>
        </div>
      </div>

      <TicketTypeListClient
        eventId={eventId.toString()}
        eventDetails={event}
        ticketTypes={ticketTypes}
      />
    </div>
  );
}