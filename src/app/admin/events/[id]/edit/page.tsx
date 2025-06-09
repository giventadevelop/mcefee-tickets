'use client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EventForm } from '@/components/EventForm';
import type { EventDetailsDTO, EventTypeDetailsDTO } from '@/types';
import Link from 'next/link';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id;
  const [event, setEvent] = useState<EventDetailsDTO | null>(null);
  const [eventTypes, setEventTypes] = useState<EventTypeDetailsDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/proxy/event-details/${eventId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setEvent(data));
    fetch('/api/proxy/event-type-details')
      .then(res => res.ok ? res.json() : [])
      .then(data => setEventTypes(Array.isArray(data) ? data : []));
  }, [eventId]);

  async function handleSubmit(updatedEvent: EventDetailsDTO) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/event-details/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      });
      if (!res.ok) throw new Error('Failed to update event');
      router.push('/admin');
    } catch (e: any) {
      setError(e.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  }

  if (!event) return <div className="p-8">Loading event details...</div>;

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <Link href="/admin" className="inline-block mb-6 text-blue-600 hover:underline">← Back to All Events</Link>
      <h1 className="text-2xl font-bold mb-4">Edit Event</h1>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}
      <div className="border rounded p-4 bg-white shadow-sm min-h-[200px]">
        <EventForm event={event} eventTypes={eventTypes} onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}