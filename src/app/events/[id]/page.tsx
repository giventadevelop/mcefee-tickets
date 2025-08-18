"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { EventWithMedia, EventMediaDTO, EventDetailsDTO } from "@/types";
import { formatInTimeZone } from 'date-fns-tz';
import LocationDisplay from '@/components/LocationDisplay';

export default function EventDetailsPage() {
  const params = useParams();
  const eventId = params?.id;
  const [event, setEvent] = useState<EventDetailsDTO | null>(null);
  const [media, setMedia] = useState<EventMediaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaPage, setMediaPage] = useState(0);
  const mediaPageSize = 15; // 5 rows of 3
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchEventDetails() {
      if (!eventId) return;
      setLoading(true);
      try {
        const eventRes = await fetch(`/api/proxy/event-details/${eventId}`);
        const eventData: EventDetailsDTO = await eventRes.json();
        setEvent(eventData);
        // Use the same query as admin media page
        const mediaRes = await fetch(`/api/proxy/event-medias?eventId.equals=${eventId}&isEventManagementOfficialDocument.equals=false&sort=updatedAt,desc`);
        const mediaData = await mediaRes.json();
        setMedia(Array.isArray(mediaData) ? mediaData : [mediaData]);
      } catch (err) {
        setEvent(null);
        setMedia([]);
      } finally {
        setLoading(false);
      }
    }
    fetchEventDetails();
  }, [eventId]);

  if (loading) return <div className="p-8 text-center">Loading event details...</div>;
  if (!event) return <div className="p-8 text-center text-red-500">Event not found.</div>;

  // Find flyer or use first image as hero
  const flyer = media.find((m) => m.eventFlyer && m.fileUrl) || media.find((m) => m.fileUrl);
  const gallery = media.filter((m) => m.fileUrl && (!flyer || m.id !== flyer.id));
  const pagedGallery = gallery.slice(mediaPage * mediaPageSize, (mediaPage + 1) * mediaPageSize);
  const hasNextMediaPage = (mediaPage + 1) * mediaPageSize < gallery.length;
  const hasPrevMediaPage = mediaPage > 0;

  // Helper to generate Google Calendar URL
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

  const isUpcoming = (() => {
    const today = new Date();
    const eventDate = event.startDate ? new Date(event.startDate) : null;
    return eventDate && eventDate >= today;
  })();

  const calendarLink = (() => {
    if (!isUpcoming) return '';
    const start = toGoogleCalendarDate(event.startDate, event.startTime);
    const end = toGoogleCalendarDate(event.endDate, event.endTime);
    const text = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.location || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
  })();

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
            {flyer && flyer.fileUrl && (
              <Image
                src={flyer.fileUrl}
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
            )}
            {/* Main hero image, fully visible */}
            {flyer && flyer.fileUrl && (
              <Image
                src={flyer.fileUrl}
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
            )}
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

      {/* Event Details */}
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
        <div className="text-gray-600 mb-4">{event.caption}</div>
        <div className="mb-4">
          <span className="font-semibold">Date:</span> {event.startDate} <span className="ml-4 font-semibold">Time:</span> {event.startTime} - {event.endTime}
        </div>
        <div className="mb-4">
          {event.location && <LocationDisplay location={event.location} />}
        </div>
        <div className="mb-6 text-lg">{event.description}</div>
        {isUpcoming && calendarLink && (
          <div className="flex flex-col items-center mb-6">
            <a href={calendarLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center group">
              <img src="/images/icons8-calendar.gif" alt="Calendar" className="w-7 h-7 rounded shadow mx-auto" />
              <span className="text-xs text-blue-700 font-semibold mt-1">Add to Calendar</span>
            </a>
          </div>
        )}
        {/* Gallery of thumbnails with pagination */}
        {gallery.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Event Gallery</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pagedGallery.map((m, idx) => (
                m.fileUrl ? (
                  <button
                    key={m.id || idx}
                    className="focus:outline-none"
                    onClick={() => setLightboxIndex(mediaPage * mediaPageSize + idx)}
                  >
                    <Image src={m.fileUrl} alt={m.title || "Event Media"} width={200} height={150} className="rounded shadow w-full h-auto object-contain bg-white" />
                  </button>
                ) : null
              ))}
            </div>
            {/* Pagination controls */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setMediaPage((p) => Math.max(0, p - 1))}
                disabled={!hasPrevMediaPage}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <span className="font-bold">Page {mediaPage + 1} of {Math.ceil(gallery.length / mediaPageSize)}</span>
              <button
                onClick={() => setMediaPage((p) => (hasNextMediaPage ? p + 1 : p))}
                disabled={!hasNextMediaPage}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
            {/* Lightbox slideshow */}
            {lightboxIndex !== null && gallery[lightboxIndex] && (
              <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setLightboxIndex(null)}>
                <div className="relative max-w-3xl w-full flex flex-col items-center">
                  <button className="absolute top-2 right-2 text-white text-2xl font-bold" onClick={() => setLightboxIndex(null)}>&times;</button>
                  <Image
                    src={gallery[lightboxIndex].fileUrl!}
                    alt={gallery[lightboxIndex].title || "Event Media"}
                    width={800}
                    height={600}
                    className="rounded shadow bg-white max-h-[80vh] w-auto h-auto"
                  />
                  <div className="flex justify-between w-full mt-4">
                    <button
                      onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i && i > 0 ? i - 1 : 0)); }}
                      disabled={lightboxIndex === 0}
                      className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i !== null && i < gallery.length - 1 ? i + 1 : i)); }}
                      disabled={lightboxIndex === gallery.length - 1}
                      className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link href="/events" className="inline-block bg-yellow-400 text-gray-900 px-8 py-3 rounded-lg font-semibold text-lg shadow hover:bg-yellow-300 transition">
            View All Events
          </Link>
        </div>
      </div>
    </div>
  );
}