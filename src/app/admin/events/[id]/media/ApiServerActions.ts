"use server";
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { getTenantId } from '@/lib/env';
import type { EventMediaDTO } from '@/types';
import { withTenantId } from '@/lib/withTenantId';
import { headers } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function fetchUserProfileServer(userId: string) {
  if (!userId) return null;
  const tenantId = getTenantId();
  let token = await getCachedApiJwt();
  let res = await fetch(`${API_BASE_URL}/api/user-profiles/by-user/${userId}?tenantId.equals=${tenantId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(`${API_BASE_URL}/api/user-profiles/by-user/${userId}?tenantId.equals=${tenantId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  }
  if (!res.ok) return null;
  return await res.json();
}

export async function fetchMediaServer(eventId: string) {
  const url = `${API_BASE_URL}/api/event-medias?eventId.equals=${eventId}&isEventManagementOfficialDocument.equals=false&sort=updatedAt,desc&tenantId.equals=${getTenantId()}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  }
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

export async function fetchEventDetailsServer(eventId: string) {
  const url = `${API_BASE_URL}/api/event-details/${eventId}?tenantId.equals=${getTenantId()}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  }
  if (!res.ok) return null;
  return await res.json();
}

export async function fetchOfficialDocsServer(eventId: string) {
  const url = `${API_BASE_URL}/api/event-medias?eventId.equals=${eventId}&isEventManagementOfficialDocument.equals=true&sort=updatedAt,desc&tenantId.equals=${getTenantId()}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  }
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

export interface MediaUploadParams {
  title: string;
  description: string;
  eventMediaType: string;
  storageType: string;
  fileUrl: string;
  isFeaturedImage: boolean;
  eventFlyer: boolean;
  isEventManagementOfficialDocument: boolean;
  isHeroImage: boolean;
  isActiveHeroImage: boolean;
  isPublic: boolean;
  altText: string;
  displayOrder?: number;
  userProfileId?: number | null;
  files: File[];
}

export async function uploadMedia(eventId: number, {
  title,
  description,
  eventMediaType,
  storageType,
  fileUrl,
  isFeaturedImage,
  eventFlyer,
  isEventManagementOfficialDocument,
  isHeroImage,
  isActiveHeroImage,
  isPublic,
  altText,
  displayOrder,
  userProfileId,
  files
}: MediaUploadParams) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const params = new URLSearchParams();
  params.append('eventFlyer', String(eventFlyer));
  params.append('isEventManagementOfficialDocument', String(isEventManagementOfficialDocument));
  params.append('isHeroImage', String(isHeroImage));
  params.append('isActiveHeroImage', String(isActiveHeroImage));
  params.append('isFeaturedImage', String(isFeaturedImage));
  params.append('isPublic', String(isPublic));
  params.append('altText', altText);
  if (displayOrder !== undefined) params.append('displayOrder', String(displayOrder));
  params.append('tenantId', getTenantId());
  if (userProfileId) params.append('upLoadedById', String(userProfileId));
  params.append('title', title);
  params.append('description', description);
  params.append('eventMediaType', eventMediaType);
  params.append('storageType', storageType);

  const url = `${API_BASE_URL}/api/event-medias/upload-multiple?${params.toString()}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return await res.json();
}

export async function deleteMediaServer(mediaId: number | string) {
  const url = `${API_BASE_URL}/api/event-medias/${mediaId}?tenantId.equals=${getTenantId()}`;
  let token = await getCachedApiJwt();
  let res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return true;
}

async function fetchWithJwtRetry(apiUrl: string, options: any = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

  try {
    let token = await getCachedApiJwt();
    let response = await fetch(apiUrl, {
      ...options,
      signal: controller.signal, // Pass the abort signal to fetch
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      console.log('Token expired or invalid, generating a new one...');
      token = await generateApiJwt();
      response = await fetch(apiUrl, {
        ...options,
        signal: controller.signal, // Also pass it to the retry
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    }

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out after 30 seconds');
    }
    throw error;
  }
}

export async function editMediaServer(mediaId: number | string, payload: Partial<EventMediaDTO>) {
  try {
    console.log('Starting direct-to-backend editMediaServer with payload:', payload);

    const url = `${API_BASE_URL}/api/event-medias/${mediaId}`;

    // Clean and prepare the payload according to rules
    const cleanedPayload = withTenantId({
      ...payload,
      id: Number(mediaId),
      updatedAt: new Date().toISOString(),
    });

    console.log(`Sending PATCH request directly to backend: ${url}`);

    const response = await fetchWithJwtRetry(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanedPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Direct backend media update failed:', errorText);
      throw new Error(errorText || 'Failed to update media');
    }

    const result = await response.json();
    console.log('Media update successful:', result);
    return result;
  } catch (error) {
    console.error('Error in editMediaServer:', error);
    throw error;
  }
}

// Add upload and delete actions as needed