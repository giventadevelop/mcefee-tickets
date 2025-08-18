"use server";
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getTenantId, getAppUrl } from '@/lib/env';
import type { EventDetailsDTO, EventTypeDetailsDTO, UserProfileDTO, EventCalendarEntryDTO } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function fetchEventsServer(pageNum = 0, pageSize = 5): Promise<EventDetailsDTO[]> {
  const url = `${API_BASE_URL}/api/event-details?page=${pageNum}&size=${pageSize}&sort=startDate,asc&tenantId.equals=${getTenantId()}`;
  const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch events');
  return await res.json();
}

export async function fetchEventTypesServer(): Promise<EventTypeDetailsDTO[]> {
  const url = `${API_BASE_URL}/api/event-type-details?tenantId.equals=${getTenantId()}`;
  const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch event types');
  return await res.json();
}

export async function fetchCalendarEventsServer(): Promise<EventCalendarEntryDTO[]> {
  const url = `${API_BASE_URL}/api/event-calendar-entries?size=1000&tenantId.equals=${getTenantId()}`;
  const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch calendar events');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createEventServer(event: any): Promise<any> {
  const url = `${API_BASE_URL}/api/event-details`;
  const res = await fetchWithJwtRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error('Failed to create event');
  return await res.json();
}

export async function updateEventServer(event: any): Promise<any> {
  if (!event.id) throw new Error('Event ID required for update');
  const url = `${API_BASE_URL}/api/event-details/${event.id}`;
  const res = await fetchWithJwtRetry(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error('Failed to update event');
  return await res.json();
}

export async function cancelEventServer(event: EventDetailsDTO): Promise<EventDetailsDTO> {
  if (!event.id) throw new Error('Event ID required for cancel');
  const url = `${API_BASE_URL}/api/event-details/${event.id}`;
  const res = await fetchWithJwtRetry(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...event, isActive: false }),
  });
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
  const res = await fetchWithJwtRetry(url, {
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

export async function findCalendarEventByEventIdServer(eventId: number): Promise<EventCalendarEntryDTO | null> {
  const url = `${API_BASE_URL}/api/event-calendar-entries?size=1000&tenantId.equals=${getTenantId()}`;
  const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
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
  const res = await fetchWithJwtRetry(url, {
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

export async function deleteCalendarEventForEventServer(event: EventDetailsDTO) {
  if (!event.id) return;
  const calendarEvent = await findCalendarEventByEventIdServer(event.id);
  if (!calendarEvent || !calendarEvent.id) return;
  const url = `${API_BASE_URL}/api/event-calendar-entries/${calendarEvent.id}`;
  const res = await fetchWithJwtRetry(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to delete calendar event: ${err}`);
  }
}

export async function fetchEventsFilteredServer(params: {
  title?: string,
  id?: string,
  caption?: string,
  startDate?: string,
  endDate?: string,
  admissionType?: string,
  sort?: string,
  pageNum?: number,
  pageSize?: number
}): Promise<{ events: EventDetailsDTO[], totalCount: number }> {
  const tenantId = getTenantId();
  const queryParams = new URLSearchParams({
    'tenantId.equals': tenantId,
    page: String(params.pageNum || 0),
    size: String(params.pageSize || 5),
    sort: params.sort || 'startDate,asc'
  });

  if (params.title) queryParams.append('title.contains', params.title);
  if (params.id) queryParams.append('id.equals', params.id);
  if (params.caption) queryParams.append('caption.contains', params.caption);
  if (params.startDate) queryParams.append('startDate.greaterThanOrEqual', params.startDate);
  if (params.endDate) queryParams.append('endDate.lessThanOrEqual', params.endDate);
  if (params.admissionType) queryParams.append('admissionType.equals', params.admissionType);

  const url = `${API_BASE_URL}/api/event-details?${queryParams.toString()}`;

  const res = await fetchWithJwtRetry(url, {});

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Error fetching filtered events:', res.status, errorBody);
    throw new Error(`Failed to fetch events: ${res.statusText}`);
  }

  const totalCount = Number(res.headers.get('X-Total-Count')) || 0;
  const events = await res.json();

  return { events, totalCount };
}

export async function fetchEventDetailsServer(eventId: number): Promise<EventDetailsDTO | null> {
  const baseUrl = getAppUrl();
  const response = await fetch(`${baseUrl}/api/proxy/event-details/${eventId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    cache: 'no-store',
    });

    if (!response.ok) {
    console.error(`Failed to fetch event details for eventId ${eventId}:`, response.status, await response.text());
    return null;
  }
  return response.json();
}

export async function fetchUserProfileServer(userId: string): Promise<UserProfileDTO | null> {
    if (!userId) {
        return null;
    }
    const tenantId = getTenantId();
    const url = `${API_BASE_URL}/api/user-profiles/by-user/${userId}?tenantId.equals=${tenantId}`;
    try {
        const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
        if (!res.ok) {
            console.error(`Failed to fetch user profile for userId ${userId}: ${res.status}`);
            return null;
        }
        return await res.json();
    } catch (error) {
        console.error(`Error fetching user profile for userId ${userId}:`, error);
        return null;
    }
}

export async function fetchUserProfileByEmailServer(email: string): Promise<UserProfileDTO | null> {
    if (!email) {
      return null;
    }
    const tenantId = getTenantId();
    const url = `${API_BASE_URL}/api/user-profiles?email.equals=${encodeURIComponent(email)}&tenantId.equals=${tenantId}`;
    try {
        const res = await fetchWithJwtRetry(url, { cache: 'no-store' });
        if (!res.ok) {
            console.error(`Failed to fetch user profile for email ${email}: ${res.status}`);
            return null;
        }
        const users = await res.json();
        return users && users.length > 0 ? users[0] : null;
  } catch (error) {
        console.error(`Error fetching user profile for email ${email}:`, error);
    return null;
  }
}