'use client';
import { EventDTO, EventTypeDTO } from '@/types';
import React, { useState, useEffect } from 'react';
import { EventForm } from '@/components/EventForm';
import { EventList } from '@/components/EventList';

async function fetchEvents(): Promise<EventDTO[]> {
  const res = await fetch('/api/proxy/events');
  if (!res.ok) throw new Error('Failed to fetch events');
  return await res.json();
}

async function fetchEventTypes(): Promise<EventTypeDTO[]> {
  const res = await fetch('/api/proxy/event-types');
  if (!res.ok) throw new Error('Failed to fetch event types');
  return await res.json();
}

async function createEvent(event: any): Promise<any> {
  const res = await fetch('/api/proxy/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error('Failed to create event');
  return await res.json();
}

async function updateEvent(event: any): Promise<any> {
  if (!event.id) throw new Error('Event ID required for update');
  const res = await fetch(`/api/proxy/events/${event.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error('Failed to update event');
  return await res.json();
}

async function cancelEvent(event: EventDTO): Promise<EventDTO> {
  if (!event.id) throw new Error('Event ID required for cancel');
  const res = await fetch(`/api/proxy/events/${event.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...event, is_active: false }),
  });
  if (!res.ok) throw new Error('Failed to cancel event');
  return await res.json();
}

export default function AdminPage() {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventDTO | undefined>(undefined);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 5;

  async function loadAll(pageNum = 0) {
    setLoading(true);
    setError(null);
    try {
      // Fetch events for the current page only
      const res = await fetch(`/api/proxy/events?page=${pageNum}&size=${pageSize}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleEdit(event: EventDTO) {
    setSelectedEvent(event);
  }

  async function handleCancel(event: EventDTO) {
    setFormLoading(true);
    setError(null);
    try {
      await cancelEvent(event);
      await loadAll(page);
    } catch (e: any) {
      setError(e.message || 'Failed to cancel event');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleFormSubmit(event: EventDTO) {
    setFormLoading(true);
    setError(null);
    try {
      // Find the full eventType object
      const foundType = eventTypes.find(et => et.id === Number(event.event_type_id));
      if (!foundType) throw new Error('Event type not found');
      // Only pass id and name fields for eventType
      const eventType = { id: foundType.id, name: foundType.name };

      // TODO: Replace this with the actual user profile object if available
      const createdBy = { userId: event.created_by } as any;

      // Combine date and time into ISO strings (assume local time, adjust as needed)
      function toZonedDateTime(date: string, time: string) {
        if (!date || !time) return null;
        // If time is "HH:mm", add ":00"
        const fullTime = time.length === 5 ? `${time}:00` : time;
        // Combine and add Z (UTC) - adjust if you want local time zone
        return `${date}T${fullTime}Z`;
      }

      const now = new Date().toISOString();

      const eventToSend = {
        id: event.id,
        title: event.title,
        caption: event.caption,
        description: event.description,
        startDate: event.start_date,
        endDate: event.end_date,
        startTime: toZonedDateTime(event.start_date, event.start_time),
        endTime: toZonedDateTime(event.end_date, event.end_time),
        location: event.location,
        directionsToVenue: event.directions_to_venue,
        capacity: event.capacity,
        admissionType: event.admission_type,
        isActive: event.is_active ?? true,
        createdAt: event.created_at ?? now,
        updatedAt: now,
        createdBy,
        eventType,
      };

      if (event.id) {
        await updateEvent(eventToSend as any);
      } else {
        await createEvent(eventToSend as any);
      }
      setSelectedEvent(undefined);
      await loadAll(page);
    } catch (e: any) {
      setError(e.message || 'Failed to save event');
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
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Event List View */}
        <section>
          <h2 className="text-xl font-semibold mb-4">All Events</h2>
          <div className="border rounded p-4 bg-white shadow-sm min-h-[200px]">
            <EventList
              events={events}
              eventTypes={eventTypes}
              onEdit={handleEdit}
              onCancel={handleCancel}
              loading={loading}
            />
            <div className="flex justify-between items-center mt-4">
              <button onClick={handlePrevPage} disabled={page === 0} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Previous</button>
              <span>Page {page + 1}</span>
              <button onClick={handleNextPage} disabled={events.length < pageSize} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Next</button>
            </div>
          </div>
        </section>
        {/* Event Form View */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Create / Edit Event</h2>
          <div className="border rounded p-4 bg-gray-50 shadow-sm min-h-[200px]">
            <EventForm
              event={selectedEvent}
              eventTypes={eventTypes}
              onSubmit={handleFormSubmit}
              loading={formLoading}
            />
          </div>
        </section>
      </div>
    </div>
  );
}