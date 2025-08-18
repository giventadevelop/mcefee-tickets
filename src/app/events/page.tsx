"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { EventWithMedia, EventDetailsDTO } from "@/types";
import { formatInTimeZone } from 'date-fns-tz';
import LocationDisplay from '@/components/LocationDisplay';
// import { formatInTimeZone } from 'date-fns-tz';

const EVENTS_PAGE_SIZE = 10;

// Component for handling long descriptions with expand/collapse
function DescriptionDisplay({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 200; // characters

  if (description.length <= maxLength) {
    return (
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {description}
      </div>
    );
  }

  const truncatedText = description.substring(0, maxLength).trim();

  return (
    <div className="text-sm text-gray-700 leading-relaxed">
      <div className="whitespace-pre-wrap">
        {isExpanded ? description : `${truncatedText}...`}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="mt-2 text-blue-600 hover:text-blue-800 font-medium text-sm underline"
      >
        {isExpanded ? 'Show less' : 'Read more'}
      </button>
    </div>
  );
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [heroImageUrl, setHeroImageUrl] = useState<string>("/images/default_placeholder_hero_image.jpeg");
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setFetchError(false);
      try {
        // Fetch paginated events
        const eventsRes = await fetch(`/api/proxy/event-details?sort=startDate,asc&page=${page}&size=${EVENTS_PAGE_SIZE}`);
        if (!eventsRes.ok) throw new Error('Failed to fetch events');
        const events: EventDetailsDTO[] = await eventsRes.json();
        let eventList = Array.isArray(events) ? events : [events];
        // For each event, fetch its flyer
        const eventsWithMedia = await Promise.all(
          eventList.map(async (event: EventDetailsDTO) => {
            try {
              const mediaRes = await fetch(`/api/proxy/event-medias?eventId.equals=${event.id}&eventFlyer.equals=true`);
              const mediaData = await mediaRes.json();
              if (mediaData && mediaData.length > 0) {
                return { ...event, thumbnailUrl: mediaData[0].fileUrl };
              }
              return { ...event, thumbnailUrl: undefined };
            } catch {
              return { ...event, thumbnailUrl: undefined };
            }
          })
        );
        setEvents(eventsWithMedia);
        // Remove totalPages logic, since not present in array response
        setTotalPages(1);

        // Hero image logic: earliest upcoming event within 3 months
        const today = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);
        const upcoming = eventsWithMedia
          .filter(e => e.startDate && new Date(e.startDate) >= today && e.thumbnailUrl)
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        if (upcoming.length > 0) {
          const nextEvent = upcoming[0];
          const eventDate = nextEvent.startDate ? new Date(nextEvent.startDate) : null;
          if (eventDate && eventDate <= threeMonthsFromNow && nextEvent.thumbnailUrl) {
            setHeroImageUrl(nextEvent.thumbnailUrl);
            return;
          }
        }
        setHeroImageUrl("/images/default_placeholder_hero_image.jpeg");
      } catch (err) {
        setFetchError(true);
        setEvents([]);
        setHeroImageUrl("/images/default_placeholder_hero_image.jpeg");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [page]);

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

  // Helper to format time with AM/PM
  function formatTime(time: string): string {
    if (!time) return '';
    // Accepts 'HH:mm' or 'hh:mm AM/PM' and returns 'hh:mm AM/PM'
    if (time.match(/AM|PM/i)) return time;
    const [hourStr, minute] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
  }

  // Helper to format date
  function formatDate(dateString: string, timezone: string = 'America/New_York'): string {
    if (!dateString) return '';
    // Use formatInTimeZone to display the date in the event's timezone
    return formatInTimeZone(dateString, timezone, 'EEEE, MMMM d, yyyy');
  }

  return (
    <div className="w-full overflow-x-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Mobile-specific hero adjustments */
          @media (max-width: 767px) {
            .hero-section {
              min-height: 180px !important;
              height: 180px !important;
              padding-top: 80px !important;
              background-color: #000 !important;
              margin: 0 !important;
              padding: 80px 0 0 0 !important;
            }
                      /* Prevent horizontal overflow */
          body {
            overflow-x: hidden !important;
          }
          /* Prevent image cutoff */
          .event-image-container {
            overflow: hidden !important;
            max-width: 100% !important;
            padding: 0 10px !important;
          }
          .event-image-container img {
            max-width: 100% !important;
            height: auto !important;
            object-fit: contain !important;
          }
            /* Ensure content fits mobile viewport */
            .container {
              max-width: 100vw !important;
              padding-left: 15px !important;
              padding-right: 15px !important;
            }
            /* Ensure mobile text doesn't duplicate */
            .hero-title {
              display: none !important;
            }
            /* Ensure mobile text stays within hero bounds */
            .hero-section h1 {
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
            /* Mobile feature box spacing - increased significantly */
            .feature-boxes-container {
              margin-top: 180px !important;
            }
            /* Ensure mobile hero has solid black background */
            .flex.md\\:hidden {
              background-color: #000 !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              outline: none !important;
            }
            /* Force all mobile hero elements to have black background */
            .flex.md\\:hidden * {
              background-color: #000 !important;
            }
            /* Ensure no white spaces in mobile hero */
            .flex.md\\:hidden img {
              margin: 0 !important;
              padding: 0 !important;
            }
            .flex.md\\:hidden div {
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
            }
            .flex.md\\:hidden h1 {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #000 !important;
            }
          }
          /* Desktop-specific adjustments */
          @media (min-width: 768px) {
            .hero-section {
              min-height: 320px !important;
              height: 320px !important;
              padding-top: 100px !important;
            }
            .feature-boxes-container {
              margin-top: 120px !important;
            }
            /* Ensure desktop doesn't show mobile elements */
            .flex.md\\:hidden {
              display: none !important;
            }
          }
        `
      }} />
      <section className="hero-section events-hero-section" style={{
        height: '320px',
        minHeight: '320px',
        position: 'relative',
        overflow: 'visible',
        backgroundColor: '#000',
        marginBottom: 0,
        paddingBottom: 0,
        paddingTop: '100px',
        marginTop: 0
      }}>
        {/* Desktop Layout */}
        <div className="hidden md:flex hero-content" style={{
          position: 'relative',
          zIndex: 3,
          padding: '0 20px',
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: '100%',
          minHeight: 200,
          gap: '40px',
          paddingTop: '50px',
          paddingBottom: '70px'
        }}>
          <img src="/images/mcefee_logo_black_border_transparent.png" className="hero-mcafee-logo" alt="MCEFEE Logo" style={{ width: 240, height: 'auto', opacity: 0.6, marginLeft: -200 }} />
          <h1 className="hero-title" style={{
            fontSize: 26,
            lineHeight: 1.4,
            color: 'white',
            maxWidth: 450,
            fontFamily: 'Sora, sans-serif',
            marginLeft: -20,
            marginRight: 40,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <span>Connecting Cultures,</span>
            <span>Empowering Generations –</span>
            <span style={{ color: '#ffce59', fontSize: 26 }}>Celebrating Malayali Roots in the USA</span>
          </h1>
        </div>
        {/* Mobile Layout */}
        <div className="flex md:hidden" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 0px',
          minHeight: '160px',
          backgroundColor: '#000',
          position: 'relative',
          zIndex: 3,
          width: '100%',
          maxWidth: '100vw',
          height: '100%',
          margin: '0px',
          border: 'none',
          outline: 'none'
        }}>
          {/* Mobile Logo */}
          <img src="/images/mcefee_logo_black_border_transparent.png" alt="MCEFEE Logo" style={{
            width: '200px',
            height: 'auto',
            opacity: 0.9,
            display: 'block',
            margin: '20px auto 10px auto',
            padding: '0px'
          }} />

          {/* Mobile Main Text - Single instance only */}
          <div style={{
            backgroundColor: '#000',
            padding: '0px',
            margin: '0px',
            width: '100%',
            border: 'none',
            outline: 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <h1 style={{
              fontSize: '18px',
              lineHeight: 1.3,
              color: 'white',
              maxWidth: '300px',
              fontFamily: 'Sora, sans-serif',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              textAlign: 'center',
              margin: '0px auto',
              padding: '0px',
              fontWeight: '500',
              backgroundColor: '#000',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <span>Connecting Cultures,</span>
              <span>Empowering Generations –</span>
              <span style={{ color: '#ffce59', fontSize: '18px', fontWeight: '600' }}>Celebrating Malayali Roots in the USA</span>
            </h1>
          </div>
        </div>
        {/* Desktop Background */}
        <div className="hidden md:block hero-background" style={{
          position: 'absolute',
          top: '25%',
          right: '10px',
          left: 'auto',
          width: '30%',
          height: '75%',
          backgroundImage: "url('/images/kathakali_with_back_light_hero_ai.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.8,
          filter: 'blur(0.5px)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.9) 50%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.3) 85%, rgba(0,0,0,0) 100%)',
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.9) 50%, rgba(0,0,0,0.7) 65%, rgba(0,0,0,0.3) 85%, rgba(0,0,0,0) 100%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}>
          {/* Top gradient overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '15%',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.1) 100%)',
            zIndex: 1,
            filter: 'blur(1px)'
          }}></div>
          {/* Bottom gradient overlay */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '15%',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.1) 100%)',
            zIndex: 1,
            filter: 'blur(1px)'
          }}></div>
          {/* Left gradient overlay - enhanced for better fade */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '20%',
            height: '100%',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0) 100%)',
            zIndex: 1,
            filter: 'blur(1px)'
          }}></div>

          {/* Additional left fade gradient for smoother transition */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '35%',
            height: '100%',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.05) 80%, rgba(0,0,0,0) 100%)',
            zIndex: 1,
            filter: 'blur(1.5px)'
          }}></div>
          {/* Right gradient overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '25%',
            height: '100%',
            background: 'linear-gradient(270deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.1) 100%)',
            zIndex: 1,
            filter: 'blur(1px)'
          }}></div>
          {/* Corner gradient overlays for smoother blending */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '20%',
            height: '20%',
            background: 'radial-gradient(ellipse at top left, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)',
            zIndex: 2
          }}></div>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '30%',
            height: '30%',
            background: 'radial-gradient(ellipse at top right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
            zIndex: 2
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '30%',
            height: '30%',
            background: 'radial-gradient(ellipse at bottom left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
            zIndex: 2
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '30%',
            height: '30%',
            background: 'radial-gradient(ellipse at bottom right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
            zIndex: 2
          }}></div>
        </div>
        {/* Hero overlay removed to match events page brightness */}
      </section>

      {/* Mobile Spacer Div - Creates space between hero and events list on mobile only */}
      <div className="block md:hidden" style={{ height: '150px', width: '100%', backgroundColor: 'transparent' }}></div>

      {/* Event List */}
      <div className="max-w-5xl mx-auto p-6" style={{ paddingTop: '60px' }}>
        <h1 className="text-3xl font-bold mb-6 text-center">All Events</h1>
        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          </div>
        ) : fetchError ? (
          <div className="text-center text-red-600 font-bold py-8">
            Sorry, we couldn't load events at this time. Please try again later.
          </div>
        ) : events.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No events found.
          </div>
        ) : (
          <>
            <div className="w-full space-y-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-lg shadow-lg border-4 border-blue-200 transition-all duration-300 overflow-hidden"
                >
                  <div className="p-6">
                    {/* Image Section - Full Width on Top */}
                    <div className="w-full mb-6">
                      <div className="event-image-container w-full flex justify-center">
                        {event.thumbnailUrl ? (
                          <Image
                            src={event.thumbnailUrl}
                            alt={event.title}
                            width={600}
                            height={400}
                            className="rounded-lg shadow-md object-contain w-full max-w-2xl h-80 bg-white"
                            style={{
                              objectFit: 'contain',
                              maxWidth: '100%',
                              height: 'auto',
                              padding: '10px'
                            }}
                          />
                        ) : (
                          <div className="w-full max-w-2xl h-80 bg-gray-200 flex items-center justify-center rounded-lg">
                            <span className="text-gray-400">No image</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details Section - Two Column Layout */}
                    <div className="w-full">
                      {/* Mobile Layout - Stacked */}
                      <div className="block sm:hidden">
                        <h2 className="text-2xl font-bold text-blue-700 mb-3">
                          {event.title}
                        </h2>
                        {/* Buy Tickets Link for Mobile */}
                        {(() => {
                          const today = new Date();
                          const eventDate = event.startDate ? new Date(event.startDate) : null;
                          const isUpcoming = eventDate && eventDate >= today;

                          if (!isUpcoming) return null;

                          return (
                            <div className="mb-4 flex justify-center">
                              <Link
                                href={`/events/${event.id}/tickets`}
                                className="transition-transform hover:scale-105"
                              >
                                <img
                                  src="/images/buy_tickets_click_here_red.webp"
                                  alt="Buy Tickets"
                                  className="object-contain"
                                  style={{
                                    width: '200px',
                                    height: '70px'
                                  }}
                                />
                              </Link>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Desktop Layout - Two Columns */}
                      <div className="hidden sm:grid sm:grid-cols-2 sm:gap-8 sm:items-start">
                        {/* Left Column - Event Details */}
                        <div>
                          <h2 className="text-2xl font-bold text-blue-700 mb-3">
                            {event.title}
                          </h2>
                        </div>

                        {/* Right Column - Buy Tickets Button */}
                        <div className="flex justify-center">
                          {(() => {
                            const today = new Date();
                            const eventDate = event.startDate ? new Date(event.startDate) : null;
                            const isUpcoming = eventDate && eventDate >= today;

                            if (!isUpcoming) return null;

                            return (
                              <Link
                                href={`/events/${event.id}/tickets`}
                                className="transition-transform hover:scale-105"
                              >
                                <img
                                  src="/images/buy_tickets_click_here_red.webp"
                                  alt="Buy Tickets"
                                  className="object-contain"
                                  style={{
                                    width: '200px',
                                    height: '70px'
                                  }}
                                />
                              </Link>
                            );
                          })()}
                        </div>
                      </div>
                      {event.caption && (
                        <div className="text-lg text-gray-600 mb-4">{event.caption}</div>
                      )}

                      {/* Date and Time with Emoji Icons */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="text-xl">📅</span>
                          <span className="font-semibold">
                            {formatDate(event.startDate, event.timezone)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="text-xl">🕐</span>
                          <span className="font-semibold">
                            {formatTime(event.startTime)} - {formatTime(event.endTime)} (EDT)
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <LocationDisplay location={event.location} />
                          </div>
                        )}
                      </div>

                      {/* Description with expand/collapse for long text */}
                      {event.description && (
                        <div className="mb-4">
                          <DescriptionDisplay description={event.description} />
                        </div>
                      )}

                      {/* Calendar Link with Better Icon */}
                      {(() => {
                        const today = new Date();
                        const eventDate = event.startDate ? new Date(event.startDate) : null;
                        const isUpcoming = eventDate && eventDate >= today;
                        if (!isUpcoming) return null;
                        const start = toGoogleCalendarDate(event.startDate, event.startTime);
                        const end = toGoogleCalendarDate(event.endDate, event.endTime);
                        const text = encodeURIComponent(event.title);
                        const details = encodeURIComponent(event.description || '');
                        const location = encodeURIComponent(event.location || '');
                        const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
                        return (
                          <div className="flex justify-start mt-4">
                            <a href={calendarLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-700 px-6 py-3 rounded-lg transition-colors">
                              <span className="text-2xl">📅</span>
                              <span className="text-base font-semibold">Add to Calendar</span>
                            </a>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
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