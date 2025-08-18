'use server';
import type { EventDetailsDTO } from '@/types';
import { getTenantId, getAppUrl } from '@/lib/env';

interface EventWithMedia extends EventDetailsDTO {
  thumbnailUrl?: string;
  placeholderText?: string;
}

// All event fetching is now in a server action
export async function fetchEventsWithMediaServer(): Promise<EventWithMedia[]> {
  const baseUrl = getAppUrl();
  const tenantId = getTenantId();

  let eventsResponse = await fetch(
    `${baseUrl}/api/proxy/event-details?sort=startDate,asc&tenantId.equals=${tenantId}`,
    { cache: 'no-store' }
  );
  let eventsData: EventDetailsDTO[] = [];
  if (eventsResponse.ok) {
    eventsData = await eventsResponse.json();
  }

  if (!eventsData || eventsData.length === 0) {
    eventsResponse = await fetch(
      `${baseUrl}/api/proxy/event-details?sort=startDate,desc&tenantId.equals=${tenantId}`,
      { cache: 'no-store' }
    );
    if (eventsResponse.ok) {
      eventsData = await eventsResponse.json();
    }
  }

  const eventsWithMedia = await Promise.all(
    eventsData.map(async (event: EventDetailsDTO) => {
      try {
        const flyerRes = await fetch(`${baseUrl}/api/proxy/event-medias?eventId.equals=${event.id}&eventFlyer.equals=true&tenantId.equals=${tenantId}`, { cache: 'no-store' });
        let mediaArray: any[] = [];
        if (flyerRes.ok) {
          const flyerData = await flyerRes.json();
          mediaArray = Array.isArray(flyerData) ? flyerData : (flyerData ? [flyerData] : []);
        }

        if (!mediaArray.length) {
          const featuredRes = await fetch(`${baseUrl}/api/proxy/event-medias?eventId.equals=${event.id}&isFeaturedImage.equals=true&tenantId.equals=${tenantId}`, { cache: 'no-store' });
          if (featuredRes.ok) {
            const featuredData = await featuredRes.json();
            mediaArray = Array.isArray(featuredData) ? featuredData : (featuredData ? [featuredData] : []);
          }
        }

        if (mediaArray.length > 0) {
          return { ...event, thumbnailUrl: mediaArray[0].fileUrl };
        }
        return { ...event, thumbnailUrl: undefined, placeholderText: event.title || 'No image available' };
      } catch (err) {
        return { ...event, thumbnailUrl: undefined, placeholderText: event.title || 'No image available' };
      }
    })
  );

  return eventsWithMedia;
}

export async function fetchHeroImageForEventServer(eventId: number): Promise<string | null> {
  const baseUrl = getAppUrl();
  const tenantId = getTenantId();
  try {
    const mediaRes = await fetch(`${baseUrl}/api/proxy/event-medias?eventId.equals=${eventId}&isHeroImage.equals=true&isActiveHeroImage.equals=true&tenantId.equals=${tenantId}`);
    if (mediaRes.ok) {
      const mediaData = await mediaRes.json();
      const mediaArray = Array.isArray(mediaData) ? mediaData : (mediaData ? [mediaData] : []);
      if (mediaArray.length > 0 && mediaArray[0].fileUrl) {
        return mediaArray[0].fileUrl;
      }
    }
  } catch {
    return null;
  }
  return null;
}