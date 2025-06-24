"use server";
import { getTenantId } from "@/lib/env";
import { fetchWithJwtRetry } from "@/lib/proxyHandler";
import { withTenantId } from "@/lib/withTenantId";
import { DiscountCodeDTO } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function fetchDiscountCodesForEvent(eventId: string): Promise<DiscountCodeDTO[]> {
  const tenantId = getTenantId();
  const url = `${API_BASE_URL}/api/discount-codes?eventId.equals=${eventId}&tenantId.equals=${tenantId}`;

  const response = await fetchWithJwtRetry(url, {
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const errorBody = await response.text();
    console.error(`[ Server ] Error fetching discount codes for event ${eventId}: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Failed to fetch discount codes. Status: ${response.status}`);
    }

    return await response.json();
}

export async function createDiscountCodeServer(
  code: Omit<DiscountCodeDTO, "id" | "tenantId" | "createdAt" | "updatedAt">,
  eventId: string
): Promise<DiscountCodeDTO> {
  const url = `${API_BASE_URL}/api/discount-codes`;

  const payload = withTenantId({
    ...code,
    eventId: parseInt(eventId, 10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const response = await fetchWithJwtRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
    console.error(`[ Server ] Error creating discount code: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Failed to create discount code. Status: ${response.status}`);
    }

    return await response.json();
}

export async function deleteDiscountCodeServer(discountCodeId: number): Promise<{ success: boolean }> {
  const url = `${API_BASE_URL}/api/discount-codes/${discountCodeId}`;

  const response = await fetchWithJwtRetry(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[ Server ] Error deleting discount code ${discountCodeId}: ${response.status} ${response.statusText}`, errorBody);
    throw new Error(`Failed to delete discount code. Status: ${response.status}`);
  }

  return { success: true };
}

export async function fetchDiscountCodeByIdServer(
  id: number
): Promise<DiscountCodeDTO | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${baseUrl}/api/proxy/discount-codes/${id}`;

  const response = await fetchWithJwtRetry(url, {
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    if (response.status !== 404) {
      console.error(
        `[ Server ] Failed to fetch discount code ${id} via proxy:`,
        response.status,
        await response.text()
      );
  }
    return null;
  }
  return response.json();
}