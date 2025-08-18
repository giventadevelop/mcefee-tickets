'use client';
import { EventDetailsDTO, EventTypeDetailsDTO, UserProfileDTO, EventCalendarEntryDTO } from '@/types';
import React, { useState, useEffect } from 'react';
import { EventList } from '@/components/EventList';
import { useAuth } from "@clerk/nextjs";
import { FaUsers, FaCalendarAlt, FaPlus, FaEnvelope, FaCreditCard } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  fetchEventsFilteredServer,
  fetchEventTypesServer,
  fetchCalendarEventsServer,
  cancelEventServer,
  deleteCalendarEventForEventServer,
} from './ApiServerActions';


export default function AdminPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventDetailsDTO[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeDetailsDTO[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<EventCalendarEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
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
      const { events: eventsResult, totalCount: fetchedTotalCount } = await fetchEventsFilteredServer(filterParams);
      const types = await fetchEventTypesServer();
      const calendarEventsResult = await fetchCalendarEventsServer();
      setEvents(eventsResult);
      setTotalCount(fetchedTotalCount);
      setEventTypes(types);
      setCalendarEvents(calendarEventsResult);
    } catch (e: any) {
      setError(e.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTitle, searchId, searchCaption, searchField, searchStartDate, searchEndDate, searchAdmissionType, sort]);

  async function handleCancel(event: EventDetailsDTO) {
    setLoading(true);
    setError(null);
    try {
      await cancelEventServer(event);
      try {
        await deleteCalendarEventForEventServer(event);
      } catch (calendarErr) {
        setError((prev) => (prev ? prev + '\\n' : '') + (calendarErr instanceof Error ? calendarErr.message : String(calendarErr)));
      }
      await loadAll(page);
    } catch (e: any) {
      setError(e.message || 'Failed to cancel event');
    } finally {
      setLoading(false);
    }
  }

  // Pagination controls
  function handlePrevPage() {
    setPage((p) => Math.max(0, p - 1));
  }
  function handleNextPage() {
    setPage((p) => p + 1);
  }

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8" style={{ paddingTop: '118px' }}>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Event Management</h1>
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center mx-auto">
            <Link href="/admin/manage-usage" className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all cursor-pointer">
              <FaUsers className="text-base sm:text-lg mb-1 mx-auto" />
              <span className="font-semibold text-center leading-tight">Manage Users [Usage]</span>
            </Link>
            <Link href="/admin" className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-700 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all cursor-pointer">
              <FaCalendarAlt className="text-base sm:text-lg mb-1 mx-auto" />
              <span className="font-semibold text-center leading-tight">Manage Events</span>
            </Link>
            <Link href="/admin/promotion-emails" className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all cursor-pointer">
              <FaEnvelope className="text-base sm:text-lg mb-1 mx-auto" />
              <span className="font-semibold text-center leading-tight">Manage Promotion Emails</span>
            </Link>
            <Link href="/admin/test-stripe" className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all cursor-pointer">
              <FaCreditCard className="text-base sm:text-lg mb-1 mx-auto" />
              <span className="font-semibold text-center leading-tight">Test Stripe Payments</span>
            </Link>
          </div>
        </div>
      </div>
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <EventList
            events={events}
            eventTypes={eventTypes}
            calendarEvents={calendarEvents}
            onEdit={event => router.push(`/admin/events/${event.id}/edit`)}
            onCancel={handleCancel}
            loading={loading}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            page={page + 1}
            totalCount={totalCount}
            pageSize={pageSize}
            boldEventIdLabel={true}
            showDetailsOnHover={true}
          />
        </div>
      </div>
    </div>
  );
}