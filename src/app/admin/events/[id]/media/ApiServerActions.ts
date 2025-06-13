"use server";
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { getTenantId } from '@/lib/env';

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

export async function uploadMediaServer({
  eventId,
  files,
  title,
  description,
  eventFlyer,
  isEventManagementOfficialDocument,
  isHeroImage,
  isActiveHeroImage,
  isFeatured,
  isPublic,
  altText,
  displayOrder,
  userProfileId,
}: {
  eventId: string;
  files: File[];
  title: string;
  description: string;
  eventFlyer: boolean;
  isEventManagementOfficialDocument: boolean;
  isHeroImage: boolean;
  isActiveHeroImage: boolean;
  isFeatured: boolean;
  isPublic: boolean;
  altText: string;
  displayOrder?: number;
  userProfileId?: number | null;
}) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  const params = new URLSearchParams();
  params.append('eventFlyer', String(eventFlyer));
  params.append('isEventManagementOfficialDocument', String(isEventManagementOfficialDocument));
  params.append('isHeroImage', String(isHeroImage));
  params.append('isActiveHeroImage', String(isActiveHeroImage));
  params.append('isFeatured', String(isFeatured));
  params.append('isPublic', String(isPublic));
  params.append('altText', altText);
  if (displayOrder !== undefined) params.append('displayOrder', String(displayOrder));
  params.append('eventId', String(eventId));
  params.append('titles', title);
  params.append('descriptions', description);
  params.append('tenantId', getTenantId());
  if (userProfileId) params.append('upLoadedById', String(userProfileId));
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

export async function editMediaServer(mediaId: number | string, payload: any) {
  const url = `${API_BASE_URL}/api/event-medias/${mediaId}`;
  let token = await getCachedApiJwt();
  const body = JSON.stringify({ ...payload, tenantId: getTenantId() });
  let res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
  });
  if (res.status === 401) {
    token = await generateApiJwt();
    res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    });
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return await res.json();
}

// Add upload and delete actions as needed