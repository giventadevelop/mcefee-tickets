import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TicketTypeListClient from './TicketTypeListClient';
import { getTenantId } from '@/lib/env';
import type { EventDetailsDTO, EventTicketTypeDTO } from '@/types';
import Link from 'next/link';
import { FaUsers, FaPhotoVideo, FaCalendarAlt } from 'react-icons/fa';

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

  // Fetch event details to verify it exists and show event info
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const tenantId = getTenantId();
  const eventRes = await fetch(`${baseUrl}/api/proxy/event-details/${eventId}?tenantId.equals=${tenantId}`, {
    cache: 'no-store'
  });

  if (!eventRes.ok) {
    redirect('/admin/events');
  }

  const event: EventDetailsDTO = await eventRes.json();

  // Fetch ticket types for this event
  const ticketTypesRes = await fetch(
    `${baseUrl}/api/proxy/event-ticket-types?eventId.equals=${eventId}&tenantId.equals=${tenantId}`,
    { cache: 'no-store' }
  );

  let ticketTypes: EventTicketTypeDTO[] = [];
  if (ticketTypesRes.ok) {
    ticketTypes = await ticketTypesRes.json();
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link
          href="/admin/manage-usage"
          className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg shadow-md p-6 transition-all duration-200"
        >
          <FaUsers className="text-3xl mb-2" />
          <span className="font-semibold text-center">Manage Usage<br />[Users]</span>
        </Link>
        <Link
          href={`/admin/events/${eventId}/media/list`}
          className="flex flex-col items-center justify-center bg-yellow-50 hover:bg-yellow-100 text-yellow-800 rounded-lg shadow-md p-6 transition-all duration-200"
        >
          <FaPhotoVideo className="text-3xl mb-2" />
          <span className="font-semibold text-center">Manage Media Files</span>
        </Link>
        <Link
          href="/admin"
          className="flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-800 rounded-lg shadow-md p-6 transition-all duration-200"
        >
          <FaCalendarAlt className="text-3xl mb-2" />
          <span className="font-semibold text-center">Manage Events</span>
        </Link>
      </div>

      <TicketTypeListClient
        eventId={eventId.toString()}
        eventDetails={event}
        ticketTypes={ticketTypes}
      />
    </div>
  );
}