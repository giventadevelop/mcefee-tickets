'use client';
import { EventDetailsDTO, EventTypeDetailsDTO, UserProfileDTO, EventCalendarEntryDTO } from '@/types';
import React, { useState, useEffect } from 'react';
import { EventForm, defaultEvent } from '@/components/EventForm';
import { EventList } from '@/components/EventList';
import { useAuth } from "@clerk/nextjs";
import { Modal } from '@/components/Modal';
import { FaChevronLeft, FaChevronRight, FaUsers, FaPhotoVideo, FaCalendarAlt, FaPlus } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  fetchEventsServer,
  fetchEventTypesServer,
  createEventServer,
  updateEventServer,
  cancelEventServer,
  createCalendarEventServer,
  findCalendarEventByEventIdServer,
  updateCalendarEventForEventServer,
  deleteCalendarEventForEventServer,
  fetchEventsFilteredServer,
} from './ApiServerActions';

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
  // Search/filter state
  const [searchTitle, setSearchTitle] = useState('');
  const [searchCaption, setSearchCaption] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [searchAdmissionType, setSearchAdmissionType] = useState('');
  const [sort, setSort] = useState('startDate,asc');
  const [searchField, setSearchField] = useState<'title' | 'id' | 'caption'>('title');
  const [searchId, setSearchId] = useState('');

  async function loadAll(pageNum = 0) {
    setLoading(true);
    setError(null);
    try {
      // Build filter params based on searchField
      const filterParams: any = {
        startDate: searchStartDate,
        endDate: searchEndDate,
        admissionType: searchAdmissionType,
        sort,
        pageNum,
        pageSize,
      };
      if (searchField === 'title') filterParams.title = searchTitle;
      else if (searchField === 'id') filterParams.id = searchId;
      else if (searchField === 'caption') filterParams.caption = searchCaption;
      const eventsResult = await fetchEventsFilteredServer(filterParams);
      const types = await fetchEventTypesServer();
      setEvents(eventsResult);
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
  }, [page, userId, searchTitle, searchId, searchCaption, searchField, searchStartDate, searchEndDate, searchAdmissionType, sort]);

  async function handleCancel(event: EventDetailsDTO) {
    setFormLoading(true);
    setError(null);
    try {
      await cancelEventServer(event);
      try {
        await deleteCalendarEventForEventServer(event);
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
      {/* Dashboard Card with Grid Buttons */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-center">
            <Link href="/admin/manage-usage" className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg shadow-sm px-4 py-4 transition font-semibold text-sm cursor-pointer">
              <FaUsers className="mb-2 text-2xl" />
              <span>Manage Users [Usage]</span>
            </Link>
            <Link href="/admin" className="flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-700 rounded-lg shadow-sm px-4 py-4 transition font-semibold text-sm cursor-pointer">
              <FaCalendarAlt className="mb-2 text-2xl" />
              Manage Events
            </Link>
          </div>
        </div>
      </div>
      {/* Event Search/Filter Bar */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="text-lg font-semibold text-blue-800 mb-4">Search Events</div>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold mb-1">Search By</label>
              <select className="border px-3 py-2 rounded w-40" value={searchField} onChange={e => setSearchField(e.target.value as 'title' | 'id' | 'caption')}>
                <option value="title">Title</option>
                <option value="id">ID</option>
                <option value="caption">Caption</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">{searchField === 'id' ? 'Event ID' : searchField.charAt(0).toUpperCase() + searchField.slice(1)}</label>
              <input
                type={searchField === 'id' ? 'number' : 'text'}
                className="border px-3 py-2 rounded w-48"
                value={searchField === 'title' ? searchTitle : searchField === 'id' ? searchId : searchCaption}
                onChange={e => {
                  if (searchField === 'title') setSearchTitle(e.target.value);
                  else if (searchField === 'id') setSearchId(e.target.value);
                  else setSearchCaption(e.target.value);
                }}
                placeholder={`Search by ${searchField === 'id' ? 'ID' : searchField}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Start Date (from)</label>
              <input type="date" className="border px-3 py-2 rounded w-40" value={searchStartDate} onChange={e => setSearchStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End Date (to)</label>
              <input type="date" className="border px-3 py-2 rounded w-40" value={searchEndDate} onChange={e => setSearchEndDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Admission Type</label>
              <select className="border px-3 py-2 rounded w-40" value={searchAdmissionType} onChange={e => setSearchAdmissionType(e.target.value)}>
                <option value="">All</option>
                <option value="FREE">Free</option>
                <option value="TICKETED">Ticketed</option>
                <option value="INVITATION_ONLY">Invitation Only</option>
                <option value="DONATION_BASED">Donation Based</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Sort By</label>
              <select className="border px-3 py-2 rounded w-56" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="startDate,asc">Start Date (Earliest)</option>
                <option value="startDate,desc">Start Date (Latest)</option>
                <option value="title,asc">Title (A-Z)</option>
                <option value="title,desc">Title (Z-A)</option>
              </select>
            </div>
            <button className="ml-auto px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-semibold" onClick={() => {
              setSearchTitle('');
              setSearchId('');
              setSearchCaption('');
              setSearchStartDate('');
              setSearchEndDate('');
              setSearchAdmissionType('');
              setSort('startDate,asc');
            }}>Clear</button>
          </div>
        </div>
      </div>
      {/* After the dashboard card, add the Create Event button aligned right */}
      <div className="flex justify-end mb-6">
        <Link
          href="/admin/events/new"
          className="bg-blue-600 text-white px-4 py-2 rounded shadow font-bold flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <FaPlus />
          Create Event
        </Link>
      </div>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}
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
            boldEventIdLabel={true}
          />
        </div>
      </div>
    </div>
  );
}