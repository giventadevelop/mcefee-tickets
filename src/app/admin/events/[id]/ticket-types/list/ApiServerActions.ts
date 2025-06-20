"use server";

import { revalidatePath } from 'next/cache';
import { getTenantId } from '@/lib/env';
import { withTenantId } from '@/lib/withTenantId';
import type { EventTicketTypeDTO, EventTicketTypeFormDTO } from '@/types';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchWithJwt(url: string, options: any = {}) {
  let token = await getCachedApiJwt();
  let res = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });

  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });
  }
  return res;
}

export async function fetchTicketTypesServer(eventId: number) {
  const tenantId = getTenantId();
  const res = await fetch(
    `${API_BASE_URL}/api/proxy/event-ticket-types?eventId.equals=${eventId}&tenantId.equals=${tenantId}&sort=createdAt,desc`,
    { cache: 'no-store' }
  );
  if (!res.ok) {
    throw new Error('Failed to fetch ticket types');
  }
  return res.json();
}

export async function createTicketTypeServer(
  eventId: string,
  formData: EventTicketTypeFormDTO
): Promise<{ success: boolean; data?: EventTicketTypeDTO; error?: string }> {
  try {
    if (!eventId) {
      throw new Error('Event ID is required.');
    }

    const apiUrl = `${API_BASE_URL}/api/event-ticket-types`;

    // Note: maxPerOrder, startDate, and endDate are not part of EventTicketTypeDTO
    // and have been removed from the payload.
    const payload = withTenantId({
      ...formData,
      event: { id: parseInt(eventId, 10) },
      price: parseFloat(formData.price.toString()),
      availableQuantity: parseInt(formData.availableQuantity?.toString() || '0', 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const response = await fetchWithJwt(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to create ticket type:', errorData);
      return { success: false, error: errorData.title || 'Failed to create ticket type.' };
    }

    const newTicketType: EventTicketTypeDTO = await response.json();

    revalidatePath(`/admin/events/${eventId}/ticket-types/list`);

    return { success: true, data: newTicketType };
  } catch (error) {
    console.error('Error in createTicketTypeServer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage };
  }
}

export async function updateTicketTypeServer(
  ticketTypeId: number,
  eventId: string,
  formData: Partial<EventTicketTypeFormDTO>
): Promise<{ success: boolean; data?: EventTicketTypeDTO; error?: string }> {
  try {
    const apiUrl = `${API_BASE_URL}/api/event-ticket-types/${ticketTypeId}`;

    const payload = withTenantId({
      ...formData,
      id: ticketTypeId,
      event: { id: parseInt(eventId, 10) },
      price: formData.price ? parseFloat(formData.price.toString()) : undefined,
      availableQuantity: formData.availableQuantity ? parseInt(formData.availableQuantity.toString(), 10) : undefined,
      updatedAt: new Date().toISOString(),
    });

    const response = await fetchWithJwt(apiUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.title || 'Failed to update ticket type.' };
    }

    const updatedTicketType: EventTicketTypeDTO = await response.json();
    revalidatePath(`/admin/events/${eventId}/ticket-types/list`);
    return { success: true, data: updatedTicketType };
  } catch (error) {
    console.error('Error in updateTicketTypeServer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage };
  }
}

export async function deleteTicketTypeServer(
  ticketTypeId: number,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiUrl = `${API_BASE_URL}/api/event-ticket-types/${ticketTypeId}`;

    const response = await fetchWithJwt(apiUrl, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ title: 'Failed to delete ticket type.' }));
      return { success: false, error: errorData.title };
    }

    revalidatePath(`/admin/events/${eventId}/ticket-types/list`);
    return { success: true };
  } catch (error) {
    console.error('Error in deleteTicketTypeServer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage };
  }
}