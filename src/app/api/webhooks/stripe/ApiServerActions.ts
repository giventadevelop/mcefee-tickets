"use server";

import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { EventTicketTransactionDTO, EventTicketTypeDTO } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function createEventTicketTransactionServer(transaction: Omit<EventTicketTransactionDTO, 'id'>): Promise<EventTicketTransactionDTO> {
  const url = `${API_BASE_URL}/api/event-ticket-transactions`;
  
  // Enhanced debugging for webhook transaction creation
  console.log('[WEBHOOK DEBUG] Creating transaction with payload:', {
    url,
    hasApiBaseUrl: !!API_BASE_URL,
    transactionKeys: Object.keys(transaction),
    email: transaction.email,
    eventId: transaction.eventId,
    totalAmount: transaction.totalAmount,
    finalAmount: transaction.finalAmount,
    tenantId: transaction.tenantId
  });

  const res = await fetchWithJwtRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('[WEBHOOK ERROR] Failed to create event ticket transaction:', {
      status: res.status,
      statusText: res.statusText,
      url,
      errorBody,
      transactionPayload: transaction
    });
    
    // Don't throw error - let webhook succeed even if backend transaction creation fails
    // This prevents Stripe from retrying the webhook indefinitely
    console.warn('[WEBHOOK WARN] Webhook will succeed despite transaction creation failure');
    
    // Return a minimal transaction object to prevent downstream errors
    return {
      id: -1, // Indicates failed creation
      ...transaction,
      status: 'FAILED_CREATION'
    } as EventTicketTransactionDTO;
  }

  const result = await res.json();
  console.log('[WEBHOOK DEBUG] Transaction created successfully:', result.id);
  return result;
}

// Helper to bulk create transaction items
export async function createTransactionItemsBulkServer(items: any[]): Promise<any[]> {
  const url = `${API_BASE_URL}/api/event-ticket-transaction-items/bulk`;
  
  // Validate all items have required non-null fields before sending to backend
  const validatedItems = items.map(item => {
    if (!item.transactionId || !item.ticketTypeId || 
        typeof item.quantity !== 'number' || typeof item.pricePerUnit !== 'number' ||
        typeof item.totalAmount !== 'number') {
      throw new Error(`Invalid transaction item: ${JSON.stringify(item)}`);
    }
    
    return {
      ...item,
      // Ensure BigDecimal-compatible numbers (backend expects precision)
      pricePerUnit: Number(item.pricePerUnit.toFixed(2)),
      totalAmount: Number(item.totalAmount.toFixed(2))
    };
  });
  
  console.log('[WEBHOOK DEBUG] Creating bulk transaction items:', {
    url,
    itemCount: validatedItems.length,
    items: validatedItems.map(item => ({
      transactionId: item.transactionId,
      ticketTypeId: item.ticketTypeId,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      totalAmount: item.totalAmount
    }))
  });

  const res = await fetchWithJwtRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validatedItems),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('[WEBHOOK ERROR] Failed to bulk create transaction items:', {
      status: res.status,
      statusText: res.statusText,
      url,
      errorBody,
      itemsPayload: validatedItems
    });
    throw new Error(`Failed to bulk create transaction items: ${errorBody}`);
  }

  const result = await res.json();
  console.log('[WEBHOOK DEBUG] Bulk transaction items created successfully:', result.length);
  return result;
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