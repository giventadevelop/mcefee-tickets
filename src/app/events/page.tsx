"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { EventWithMedia } from "@/types";

const EVENTS_PAGE_SIZE = 10;

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [heroImageUrl, setHeroImageUrl] = useState<string>("/images/side_images/chilanka_2025.webp");

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        // Fetch paginated events
        const eventsRes = await fetch(`/api/proxy/events?sort=startDate,desc&page=${page}&size=${EVENTS_PAGE_SIZE}`);
        const eventsData = await eventsRes.json();
        let eventList = Array.isArray(eventsData.content) ? eventsData.content : eventsData;
        // For each event, fetch its flyer
        const eventsWithMedia = await Promise.all(
          eventList.map(async (event: EventWithMedia) => {
            try {
              const mediaRes = await fetch(`/api/proxy/event-medias?eventId.equals=${event.id}&eventFlyer.equals=true`);
              const mediaData = await mediaRes.json();
              if (mediaData && mediaData.length > 0) {
                return { ...event, thumbnailUrl: mediaData[0].fileUrl };
              }
              return event;
            } catch {
              return event;
            }
          })
        );
        setEvents(eventsWithMedia);
        // Set total pages if available
        if (eventsData.totalPages) setTotalPages(eventsData.totalPages);
        else setTotalPages(1);

        // Hero image logic: earliest upcoming event within 3 months
        const today = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);
        const upcoming = eventsWithMedia
          .filter(e => e.startDate && new Date(e.startDate) >= today)
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        if (upcoming.length > 0) {
          const nextEvent = upcoming[0];
          const eventDate = nextEvent.startDate ? new Date(nextEvent.startDate) : null;
          if (eventDate && eventDate <= threeMonthsFromNow && nextEvent.thumbnailUrl) {
            setHeroImageUrl(nextEvent.thumbnailUrl);
            return;
          }
        }
        setHeroImageUrl("/images/side_images/chilanka_2025.webp");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [page]);

  return (
    <div>
      {/* Hero Section (copied from home page) */}
      <section className="hero-section relative w-full bg-transparent pb-0" style={{ height: '180px' }}>
        {/* Side Image */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '250px',
            minWidth: '120px',
            height: '100%',
            zIndex: 1,
          }}
          className="w-[120px] md:w-[250px] min-w-[80px] h-full"
        >
          {/* Overlay logo at top left of side image */}
          <Image
            src="/images/side_images/malayalees_us_logo.avif"
            alt="Malayalees US Logo"
            width={80}
            height={80}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(255,255,255,0.7)',
              borderRadius: '50%',
              boxShadow: '0 8px 64px 16px rgba(80,80,80,0.22)',
              zIndex: 2,
            }}
            className="md:w-[120px] md:h-[120px] w-[80px] h-[80px]"
            priority
          />
          <Image
            src="/images/side_images/pooram_side_image_two_images_blur_1.png"
            alt="Kerala Sea Coast"
            width={250}
            height={400}
            className="h-full object-cover rounded-l-lg shadow-2xl"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: '60% center',
              display: 'block',
              boxShadow: '0 0 96px 32px rgba(80,80,80,0.22)',
            }}
            priority
          />
        </div>
        {/* Hero Image fills the rest */}
        <div
          className="absolute hero-image-container"
          style={{
            left: 265,
            top: 4,
            right: 4,
            bottom: 4,
            zIndex: 2,
          }}
        >
          <div className="w-full h-full relative">
            {/* Blurred background image for width fill */}
            <Image
              src={heroImageUrl}
              alt="Hero blurred background"
              fill
              className="object-cover w-full h-full blur-lg scale-105"
              style={{
                zIndex: 0,
                filter: 'blur(24px) brightness(1.1)',
                objectPosition: 'center',
              }}
              aria-hidden="true"
              priority
            />
            {/* Main hero image, fully visible */}
            <Image
              src={heroImageUrl}
              alt="Event Hero"
              fill
              className="object-cover w-full h-full"
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
                zIndex: 1,
                background: 'linear-gradient(to bottom, #f8fafc 0%, #fff 100%)',
              }}
              priority
            />
            {/* Fade overlays for all four borders */}
            <div className="pointer-events-none absolute left-0 top-0 w-full h-8" style={{ background: 'linear-gradient(to bottom, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%)', zIndex: 20 }} />
            <div className="pointer-events-none absolute left-0 bottom-0 w-full h-8" style={{ background: 'linear-gradient(to top, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%)', zIndex: 20 }} />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-8" style={{ background: 'linear-gradient(to right, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%)', zIndex: 20 }} />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-8" style={{ background: 'linear-gradient(to left, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%)', zIndex: 20 }} />
          </div>
        </div>
        <style jsx global>{`
          @media (max-width: 768px) {
            .hero-section .hero-image-container {
              left: 120px !important;
            }
          }
        `}</style>
      </section>

      {/* Event List */}
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">All Events</h1>
        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="w-full border text-sm bg-white rounded shadow-md">
                <thead>
                  <tr className="bg-blue-100 font-bold border-b-2 border-blue-300">
                    <th className="p-2 border w-40">Flyer</th>
                    <th className="p-2 border">Event Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-gray-300 hover:bg-yellow-50 transition cursor-pointer"
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <td className="p-2 border align-top w-40">
                        {event.thumbnailUrl ? (
                          <Image
                            src={event.thumbnailUrl}
                            alt={event.title}
                            width={160}
                            height={120}
                            className="rounded shadow object-cover w-40 h-28 bg-white"
                          />
                        ) : (
                          <div className="w-40 h-28 bg-gray-200 flex items-center justify-center rounded">
                            <span className="text-gray-400">No image</span>
                          </div>
                        )}
                      </td>
                      <td className="p-2 border align-top">
                        <h2 className="text-xl font-semibold mb-1">
                          <span className="text-blue-700 hover:underline">
                            {event.title}
                          </span>
                        </h2>
                        <div className="text-gray-600 mb-1">{event.caption}</div>
                        <div className="mb-1">
                          <span className="font-semibold">Date:</span> {event.startDate} <span className="ml-4 font-semibold">Time:</span> {event.startTime} - {event.endTime}
                        </div>
                        <div className="mb-1">
                          <span className="font-semibold">Location:</span> {event.location}
                        </div>
                        <div className="mb-1 text-sm text-gray-700">{event.description}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination controls */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <span className="font-bold">Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                disabled={page + 1 >= totalPages}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}