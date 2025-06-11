'use client';
import { EventDetailsDTO, EventTypeDetailsDTO, UserProfileDTO, EventCalendarEntryDTO } from '@/types';
import React, { useState, useEffect } from 'react';
import { EventForm, defaultEvent } from '@/components/EventForm';
import { EventList } from '@/components/EventList';
import { useAuth } from "@clerk/nextjs";
import { Modal } from '@/components/Modal';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

async function fetchEvents(): Promise<EventDetailsDTO[]> {
  const res = await fetch('/api/proxy/event-details');
  if (!res.ok) throw new Error('Failed to fetch events');
  return await res.json();
}

async function fetchEventTypes(): Promise<EventTypeDetailsDTO[]> {
  const res = await fetch('/api/proxy/event-type-details');
  if (!res.ok) throw new Error('Failed to fetch event types');
  return await res.json();
}

async function createEvent(event: any): Promise<any> {
  const res = await fetch('/api/proxy/event-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error('Failed to create event');
  return await res.json();
}

async function updateEvent(event: any): Promise<any> {
  if (!event.id) throw new Error('Event ID required for update');
  const res = await fetch(`/api/proxy/event-details/${event.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error('Failed to update event');
  return await res.json();
}

async function cancelEvent(event: EventDetailsDTO): Promise<EventDetailsDTO> {
  if (!event.id) throw new Error('Event ID required for cancel');
  const res = await fetch(`/api/proxy/event-details/${event.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...event, isActive: false }),
  });
  if (!res.ok) throw new Error('Failed to cancel event');
  return await res.json();
}

// Helper to convert date and time to Google Calendar format
function toGoogleCalendarDate(date: string, time: string) {
  // date: '2025-05-21', time: '11:53 PM'
  if (!date || !time) return '';
  const [year, month, day] = date.split('-');
  let [hour, minute] = time.split(':');
  let ampm = '';
  if (minute && minute.includes(' ')) {
    [minute, ampm] = minute.split(' ');
  }
  let h = parseInt(hour, 10);
  if (ampm && ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (ampm && ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  return `${year}${month}${day}T${String(h).padStart(2, '0')}${minute}00`;
}

async function createCalendarEvent(event: EventDetailsDTO, userProfile: UserProfileDTO) {
  const now = new Date().toISOString();
  // Use correct Google Calendar date format
  const start = toGoogleCalendarDate(event.startDate, event.startTime);
  const end = toGoogleCalendarDate(event.endDate, event.endTime);
  const text = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.description || '');
  const location = encodeURIComponent(event.location || '');
  const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
  const calendarEvent: EventCalendarEntryDTO = {
    calendarProvider: 'GOOGLE',
    calendarLink,
    createdAt: now,
    updatedAt: now,
    event,
    createdBy: userProfile,
  };
  const res = await fetch('/api/proxy/event-calendar-entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(calendarEvent),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create calendar event: ${err}`);
  }
  return await res.json();
}

async function findCalendarEventByEventId(eventId: number): Promise<EventCalendarEntryDTO | null> {
  const res = await fetch(`/api/proxy/event-calendar-entries?size=1000`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data)) return null;
  return data.find((ce: EventCalendarEntryDTO) => ce.event && ce.event.id === eventId) || null;
}

async function updateCalendarEventForEvent(event: EventDetailsDTO, userProfile: UserProfileDTO) {
  if (!event.id) return;
  const calendarEvent = await findCalendarEventByEventId(event.id);
  if (!calendarEvent || !calendarEvent.id) return;
  const now = new Date().toISOString();
  // Use correct Google Calendar date format
  const start = toGoogleCalendarDate(event.startDate, event.startTime);
  const end = toGoogleCalendarDate(event.endDate, event.endTime);
  const text = encodeURIComponent(event.title);
  const details = encodeURIComponent(event.description || '');
  const location = encodeURIComponent(event.location || '');
  const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
  const updatedCalendarEvent: EventCalendarEntryDTO = {
    ...calendarEvent,
    calendarLink,
    updatedAt: now,
    event,
    createdBy: userProfile,
  };
  const res = await fetch(`/api/proxy/event-calendar-entries/${calendarEvent.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedCalendarEvent),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update calendar event: ${err}`);
  }
  return await res.json();
}

async function deleteCalendarEventForEvent(event: EventDetailsDTO) {
  if (!event.id) return;
  const calendarEvent = await findCalendarEventByEventId(event.id);
  if (!calendarEvent || !calendarEvent.id) return;
  const res = await fetch(`/api/proxy/event-calendar-entries/${calendarEvent.id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to delete calendar event: ${err}`);
  }
}

export default function AdminPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfileDTO | null>(null);
  const [events, setEvents] = useState<EventDetailsDTO[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeDetailsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 5;

  async function loadAll(pageNum = 0) {
    setLoading(true);
    setError(null);
    try {
      // Fetch events for the current page only
      const res = await fetch(`/api/proxy/event-details?page=${pageNum}&size=${pageSize}&sort=startDate,asc`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const evs = await res.json();
      const types = await fetchEventTypes();
      setEvents(evs);
      setEventTypes(types);
    } catch (e: any) {
      setError(e.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(page);
    if (!userId) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/proxy/user-profiles/by-user/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch user profile');
        const data = await res.json();
        setUserProfile(Array.isArray(data) ? data[0] : data);
      } catch (e) {
        setUserProfile(null);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, userId]);

  async function handleCancel(event: EventDetailsDTO) {
    setFormLoading(true);
    setError(null);
    try {
      await cancelEvent(event);
      try {
        await deleteCalendarEventForEvent(event);
      } catch (calendarErr) {
        setError((prev) => (prev ? prev + '\n' : '') + (calendarErr instanceof Error ? calendarErr.message : String(calendarErr)));
      }
      await loadAll(page);
    } catch (e: any) {
      setError(e.message || 'Failed to cancel event');
    } finally {
      setFormLoading(false);
    }
  }

  // Pagination controls
  function handlePrevPage() {
    setPage((p) => Math.max(0, p - 1));
  }
  function handleNextPage() {
    setPage((p) => p + 1);
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Event Management</h1>
      <div className="mb-6 flex justify-end">
        <Link href="/admin/manage-usage" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition">
          Manage Usage (Users)
        </Link>
      </div>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}
      <div className="mb-4 flex justify-end gap-4">
        <Link
          href="/admin/media"
          className="bg-yellow-500 text-gray-900 px-4 py-2 rounded shadow font-bold flex items-center gap-2 hover:bg-yellow-400 transition"
        >
          Manage Media Files
        </Link>
        <Link
          href="/admin/events/new"
          className="bg-blue-600 text-white px-4 py-2 rounded shadow font-bold flex items-center gap-2"
        >
          Create Event
        </Link>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">All Events</h2>
        <div className="border rounded p-4 bg-white shadow-sm min-h-[200px]">
          <EventList
            events={events}
            eventTypes={eventTypes}
            onEdit={event => router.push(`/admin/events/${event.id}/edit`)}
            onCancel={handleCancel}
            loading={loading}
            showDetailsOnHover={true}
            onPrevPage={page > 0 ? handlePrevPage : undefined}
            onNextPage={events.length === pageSize ? handleNextPage : undefined}
            page={page}
            hasNextPage={events.length === pageSize}
          />
        </div>
      </div>
    </div>
  );
}