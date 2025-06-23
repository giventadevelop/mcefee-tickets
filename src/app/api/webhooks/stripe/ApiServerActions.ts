"use server";

import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { EventTicketTransactionDTO, EventTicketTypeDTO } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function createEventTicketTransactionServer(transaction: Omit<EventTicketTransactionDTO, 'id'>): Promise<EventTicketTransactionDTO> {
  const url = `${API_BASE_URL}/api/event-ticket-transactions`;
  const res = await fetchWithJwtRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('Failed to create event ticket transaction:', res.status, errorBody);
    throw new Error(`Failed to create event ticket transaction: ${res.statusText}`);
  }

  return await res.json();
}

export async function updateTicketTypeInventoryServer(ticketTypeId: number, quantityPurchased: number): Promise<void> {
  const getUrl = `${API_BASE_URL}/api/event-ticket-types/${ticketTypeId}`;

  // 1. Get the current ticket type
  const getRes = await fetchWithJwtRetry(getUrl);
  if (!getRes.ok) {
    throw new Error(`Failed to fetch ticket type ${ticketTypeId}: ${getRes.statusText}`);
  }
  const ticketType: EventTicketTypeDTO = await getRes.json();

  // 2. Update the sold quantity
  const updatedTicketType = {
    ...ticketType,
    soldQuantity: (ticketType.soldQuantity || 0) + quantityPurchased,
  };

  // 3. PUT the updated ticket type back
  const putUrl = `${API_BASE_URL}/api/event-ticket-types/${ticketTypeId}`;
  const putRes = await fetchWithJwtRetry(putUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedTicketType),
  });

  if (!putRes.ok) {
    const errorBody = await putRes.text();
    console.error(`Failed to update inventory for ticket type ${ticketTypeId}:`, putRes.status, errorBody);
    throw new Error(`Failed to update inventory: ${putRes.statusText}`);
  }
}