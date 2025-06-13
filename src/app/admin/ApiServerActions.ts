"use server";
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { getTenantId } from '@/lib/env';
import type { EventDetailsDTO, EventTypeDetailsDTO, UserProfileDTO, EventCalendarEntryDTO } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function fetchEventsServer(pageNum = 0, pageSize = 5): Promise<EventDetailsDTO[]> {
  const url = `${API_BASE_URL}/api/event-details?page=${pageNum}&size=${pageSize}&sort=startDate,asc&tenantId.equals=${getTenantId()}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  }
  if (!res.ok) throw new Error('Failed to fetch events');
  return await res.json();
}

export async function fetchEventTypesServer(): Promise<EventTypeDetailsDTO[]> {
  const url = `${API_BASE_URL}/api/event-type-details?tenantId.equals=${getTenantId()}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  }
  if (!res.ok) throw new Error('Failed to fetch event types');
  return await res.json();
}

export async function createEventServer(event: any): Promise<any> {
  const url = `${API_BASE_URL}/api/event-details`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(event),
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(event),
    });
  }
  if (!res.ok) throw new Error('Failed to create event');
  return await res.json();
}

export async function updateEventServer(event: any): Promise<any> {
  if (!event.id) throw new Error('Event ID required for update');
  const url = `${API_BASE_URL}/api/event-details/${event.id}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(event),
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(event),
    });
  }
  if (!res.ok) throw new Error('Failed to update event');
  return await res.json();
}

export async function cancelEventServer(event: EventDetailsDTO): Promise<EventDetailsDTO> {
  if (!event.id) throw new Error('Event ID required for cancel');
  const url = `${API_BASE_URL}/api/event-details/${event.id}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...event, isActive: false }),
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...event, isActive: false }),
    });
  }
  if (!res.ok) throw new Error('Failed to cancel event');
  return await res.json();
}

function toGoogleCalendarDate(date: string, time: string) {
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

export async function createCalendarEventServer(event: EventDetailsDTO, userProfile: UserProfileDTO) {
  const now = new Date().toISOString();
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
  const url = `${API_BASE_URL}/api/event-calendar-entries`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(calendarEvent),
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(calendarEvent),
    });
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create calendar event: ${err}`);
  }
  return await res.json();
}

export async function findCalendarEventByEventIdServer(eventId: number): Promise<EventCalendarEntryDTO | null> {
  const url = `${API_BASE_URL}/api/event-calendar-entries?size=1000&tenantId.equals=${getTenantId()}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  }
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data)) return null;
  return data.find((ce: EventCalendarEntryDTO) => ce.event && ce.event.id === eventId) || null;
}

export async function updateCalendarEventForEventServer(event: EventDetailsDTO, userProfile: UserProfileDTO) {
  if (!event.id) return;
  const calendarEvent = await findCalendarEventByEventIdServer(event.id);
  if (!calendarEvent || !calendarEvent.id) return;
  const now = new Date().toISOString();
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
  const url = `${API_BASE_URL}/api/event-calendar-entries/${calendarEvent.id}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updatedCalendarEvent),
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updatedCalendarEvent),
    });
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update calendar event: ${err}`);
  }
  return await res.json();
}

export async function deleteCalendarEventForEventServer(event: EventDetailsDTO) {
  if (!event.id) return;
  const calendarEvent = await findCalendarEventByEventIdServer(event.id);
  if (!calendarEvent || !calendarEvent.id) return;
  const url = `${API_BASE_URL}/api/event-calendar-entries/${calendarEvent.id}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to delete calendar event: ${err}`);
  }
}