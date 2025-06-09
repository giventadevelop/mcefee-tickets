'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EventForm, defaultEvent } from '@/components/EventForm';
import type { EventDetailsDTO, EventTypeDetailsDTO } from '@/types';
import Link from 'next/link';

export default function CreateEventPage() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventTypeDetailsDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/proxy/event-type-details')
      .then(res => res.ok ? res.json() : [])
      .then(data => setEventTypes(Array.isArray(data) ? data : []));
  }, []);

  async function handleSubmit(event: EventDetailsDTO) {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const eventToSend = {
        ...event,
        createdAt: now,
        updatedAt: now,
      };
      const res = await fetch('/api/proxy/event-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventToSend),
      });
      if (!res.ok) throw new Error('Failed to create event');
      router.push('/admin');
    } catch (e: any) {
      setError(e.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <Link href="/admin" className="inline-block mb-6 text-blue-600 hover:underline">← Back to All Events</Link>
      <h1 className="text-2xl font-bold mb-4">Create Event</h1>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}
      <div className="border rounded p-4 bg-white shadow-sm min-h-[200px]">
        <EventForm event={defaultEvent} eventTypes={eventTypes} onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}