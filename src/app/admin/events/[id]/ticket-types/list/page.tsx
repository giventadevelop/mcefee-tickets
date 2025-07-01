import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TicketTypeListClient from './TicketTypeListClient';
import type { EventDetailsDTO, EventTicketTypeDTO } from '@/types';
import Link from 'next/link';
import { FaUsers, FaPhotoVideo, FaCalendarAlt, FaTags, FaTicketAlt, FaPercent } from 'react-icons/fa';
import { fetchEventDetailsForTicketListPage, fetchTicketTypesForTicketListPage } from './ApiServerActions';

interface Props {
  params: {
    id: string;
  };
}

export default async function TicketTypeListPage({ params }: Props) {
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const eventId = parseInt(params.id);
  if (isNaN(eventId)) {
    redirect('/admin/events');
  }

  const event = await fetchEventDetailsForTicketListPage(eventId);
  if (!event) {
    redirect('/admin/events');
  }

  const ticketTypes = await fetchTicketTypesForTicketListPage(eventId);

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      {/* Title Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manage Ticket Types</h1>
        <p className="text-gray-500 mt-2">
          Add, edit, or delete ticket types for the event: <span className="font-semibold text-blue-600">{event.title}</span> (ID: {event.id})
        </p>
      </div>

      {/* Button Group */}
      <div className="w-full overflow-x-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-6 justify-items-center mx-auto">
          <Link
            href="/admin/manage-usage"
            className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all"
          >
            <FaUsers className="text-base sm:text-lg mb-1 mx-auto" />
            <span className="font-semibold text-center leading-tight">Manage Usage<br />[Users]</span>
          </Link>
          <Link
            href={`/admin/events/${eventId}/media/list`}
            className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-yellow-50 hover:bg-yellow-100 text-yellow-800 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all"
          >
            <FaPhotoVideo className="text-base sm:text-lg mb-1 mx-auto" />
            <span className="font-semibold text-center leading-tight">Manage Media Files</span>
          </Link>
          <Link
            href="/admin"
            className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-800 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all"
          >
            <FaCalendarAlt className="text-base sm:text-lg mb-1 mx-auto" />
            <span className="font-semibold text-center leading-tight">Manage Events</span>
          </Link>
          <Link
            href={`/admin/events/${eventId}/ticket-types/list`}
            className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all"
          >
            <FaTags className="text-base sm:text-lg mb-1 mx-auto" />
            <span className="font-semibold text-center leading-tight">Manage Ticket Types</span>
          </Link>
          <Link
            href={`/admin/events/${eventId}/tickets/list`}
            className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all"
          >
            <FaTicketAlt className="text-base sm:text-lg mb-1 mx-auto" />
            <span className="font-semibold text-center leading-tight">Manage Tickets</span>
          </Link>
          <Link
            href={`/admin/events/${eventId}/discount-codes/list`}
            className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-pink-50 hover:bg-pink-100 text-pink-800 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all"
          >
            <FaPercent className="text-base sm:text-lg mb-1 mx-auto" />
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