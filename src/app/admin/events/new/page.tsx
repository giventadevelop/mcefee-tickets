'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EventForm, defaultEvent } from '@/components/EventForm';
import type { EventDetailsDTO, EventTypeDetailsDTO, UserProfileDTO } from '@/types';
import Link from 'next/link';
import { FaUsers, FaPhotoVideo, FaCalendarAlt } from 'react-icons/fa';
import { createCalendarEventServer } from '../../ApiServerActions';
import { useAuth, useUser } from '@clerk/nextjs';

export default function CreateEventPage() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventTypeDetailsDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuth();
  const { user } = useUser();

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
      const newEvent = await res.json();
      let userProfile: UserProfileDTO | null = null;
      if (userId) {
        const profileRes = await fetch(`/api/proxy/user-profiles/by-user/${userId}`);
        if (profileRes.ok) {
          userProfile = await profileRes.json();
        }
      }
      try {
        if (userProfile) {
          await createCalendarEventServer(newEvent, userProfile);
        }
      } catch (calendarErr: any) {
        setError('Event created, but failed to create calendar entry: ' + (calendarErr?.message || 'Unknown error'));
      }
      router.push('/admin');
    } catch (e: any) {
      setError(e.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-[80%] max-w-5xl mx-auto p-4" style={{ paddingTop: '118px' }}>
      {/* Dashboard Card with Grid Buttons */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full">
          <div className="flex justify-center gap-8">
            <Link href="/admin/manage-usage" className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg shadow-sm px-4 py-4 transition font-semibold text-sm">
              <FaUsers className="mb-2 text-2xl" />
              <span>Manage Usage</span>
              <span className="text-xs text-blue-500 mt-1">[Users]</span>
            </Link>
            <Link href="/admin" className="flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-700 rounded-lg shadow-sm px-4 py-4 transition font-semibold text-sm">
              <FaCalendarAlt className="mb-2 text-2xl" />
              Manage Events
            </Link>
          </div>
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-4">Create Event</h1>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}
      <div className="border rounded p-4 bg-white shadow-sm min-h-[200px]">
        <EventForm event={defaultEvent} eventTypes={eventTypes} onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}