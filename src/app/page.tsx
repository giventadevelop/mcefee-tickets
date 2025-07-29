import Link from "next/link";
import { UserRoleDisplay } from "@/components/UserRoleDisplay";
import { EventCard } from "@/components/EventCard";
import Image from "next/image";
import type { EventDetailsDTO } from '@/types';
import { TeamImage } from '@/components/TeamImage';
import { getTenantId } from '@/lib/env';
import { formatDateLocal } from '@/lib/date';
import { auth, currentUser } from '@clerk/nextjs/server';
import { bootstrapUserProfile } from '@/components/ProfileBootstrapperApiServerActions';
import { PhilantropHeaderClient } from '@/components/PhilantropHeaderClient';
import { Footer } from '@/components/Footer';

// Add EventWithMedia type for local use
interface EventWithMedia extends EventDetailsDTO {
  thumbnailUrl?: string;
  placeholderText?: string;
}

// Move all event fetching to the server component
async function fetchEventsWithMedia(): Promise<EventWithMedia[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

  let eventsResponse = await fetch(
    `${baseUrl}/api/proxy/event-details?sort=startDate,asc`,
    { cache: 'no-store' }
  );
  let eventsData: EventDetailsDTO[] = [];
  if (eventsResponse.ok) {
    eventsData = await eventsResponse.json();
  }
  if (!eventsData || eventsData.length === 0) {
    eventsResponse = await fetch(
      `${baseUrl}/api/proxy/event-details?sort=startDate,desc`,
      { cache: 'no-store' }
    );
    if (eventsResponse.ok) {
      eventsData = await eventsResponse.json();
    }
  }

  const eventsWithMedia = await Promise.all(
    eventsData.map(async (event: EventDetailsDTO) => {
      try {
        const flyerRes = await fetch(`${baseUrl}/api/proxy/event-medias?eventId.equals=${event.id}&eventFlyer.equals=true`, { cache: 'no-store' });
        let mediaArray: any[] = [];
        if (flyerRes.ok) {
          const flyerData = await flyerRes.json();
          mediaArray = Array.isArray(flyerData) ? flyerData : (flyerData ? [flyerData] : []);
        }
        if (!mediaArray.length) {
          const featuredRes = await fetch(`${baseUrl}/api/proxy/event-medias?eventId.equals=${event.id}&isFeaturedImage.equals=true`, { cache: 'no-store' });
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

async function fetchHeroImageForEvent(eventId: number): Promise<string | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  try {
    const mediaRes = await fetch(`${baseUrl}/api/proxy/event-medias?eventId.equals=${eventId}&isHeroImage.equals=true&isActiveHeroImage.equals=true`);
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

export default async function Page() {
  // Fetch events on the server side
  const events = await fetchEventsWithMedia();

  // Determine hero image based on upcoming events
  const today = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(today.getMonth() + 3);
  let heroImage = '/images/side_images/chilanka_2025.webp';

  if (events && events.length > 0) {
    const upcomingEvents = events
      .filter((event: EventWithMedia) => event.startDate && new Date(event.startDate) >= today)
      .sort((a: EventWithMedia, b: EventWithMedia) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
        const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
        return aDate - bDate;
      });
    if (upcomingEvents.length > 0) {
      const event = upcomingEvents[0];
      const eventDate = event.startDate ? new Date(event.startDate) : null;
      if (eventDate && eventDate <= threeMonthsFromNow && event.thumbnailUrl) {
        heroImage = event.thumbnailUrl;
      }
    }
  }

  // Fallback: If heroImage is still default, use cache-busting version
  if (!heroImage || heroImage === '/images/side_images/chilanka_2025.webp') {
    heroImage = `/images/side_images/chilanka_2025.webp?v=${Date.now()}`;
  }

  return (
    <>
      <PhilantropHeaderClient />
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (min-width: 768px) {
            .mobile-layout { display: none !important; }
            .desktop-layout { display: flex !important; }
          }
          @media (max-width: 767px) {
            .mobile-layout { display: flex !important; }
            .desktop-layout { display: none !important; }
          }

          /* Override hero-overlay for home page to match events page brightness */
          .hero-overlay {
            background: linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 100%) !important;
          }
        `
      }} />
      <section className="hero-section events-hero-section" style={{
        height: 'calc(20vh + 22px)',
        minHeight: '300px',
        position: 'relative',
        overflow: 'visible',
        backgroundColor: '#000',
        marginBottom: 0,
        paddingBottom: 0,
        paddingTop: '0px',
        marginTop: 0
      }}>
        {/* Desktop Layout */}
        <div className="desktop-layout hero-content" style={{
          position: 'relative',
          zIndex: 3,
          padding: '0 20px',
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: '100%',
          minHeight: 180,
          gap: '40px',
          paddingTop: '60px',
          paddingBottom: '40px'
        }}>
          <img src="/images/mcefee_logo_black_border_transparent.png" className="hero-mcafee-logo" alt="MCEFEE Logo" style={{ width: 220, height: 'auto', opacity: 0.6, marginLeft: -350 }} />
          <h1 className="hero-title" style={{
            fontSize: 26,
            lineHeight: 1.6,
            color: 'white',
            maxWidth: 450,
            fontFamily: 'Sora, sans-serif',
            marginLeft: -36,
            marginRight: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span>Connecting Cultures,</span>
            <span>Empowering Generations –</span>
            <span style={{ color: '#ffce59', fontSize: 26 }}>Celebrating Malayali Roots in the USA</span>
          </h1>
        </div>
        {/* Mobile Layout */}
        <div className="mobile-layout" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2px',
          gap: '8px',
          minHeight: '120px'
        }}>
          <img src="/images/mcefee_logo_black_border_transparent.png" alt="MCEFEE Logo" style={{
            width: '160px',
            height: 'auto',
            opacity: 0.9,
            display: 'block',
            margin: '0 auto'
          }} />
          <h1 style={{
            fontSize: '18px',
            lineHeight: 1.3,
            color: 'white',
            maxWidth: '90%',
            fontFamily: 'Sora, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            textAlign: 'center',
            margin: '0 auto'
          }}>
            <span>Connecting Cultures,</span>
            <span>Empowering Generations –</span>
            <span style={{ color: '#ffce59', fontSize: '18px' }}>Celebrating Malayali Roots in the USA</span>
          </h1>
          {/* Mobile Background - Bottom Position with Gradient Overlay */}
          <div style={{ position: 'relative', width: '100%' }}>
            {/* Gradient overlay at the top of the image */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '20px',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0) 100%)',
              zIndex: 2,
              pointerEvents: 'none',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px'
            }}></div>
            <div className="mobile-background" style={{
              width: '100%',
              height: '160px',
              backgroundImage: "url('/images/kathakali_with_back_light_hero_ai.png')",
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center top',
              opacity: 0.7,
              filter: 'blur(0.5px)',
              marginBottom: '5px',
              paddingTop: '5px',
              borderRadius: '8px'
            }}></div>
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

      {/* FEATURE BOXES SECTION - two columns on desktop, stacked on mobile */}
      <div className="feature-boxes-container w-full" style={{ marginTop: '30px', margin: '0', padding: '0' }}>
        <div className="flex flex-col md:flex-row gap-4 md:gap-0" style={{ margin: '0', padding: '0' }}>
          {/* LEFT FEATURE BOX - three images stacked vertically */}
          <div className="flex-1 rounded-xl p-1" style={{ justifyContent: 'flex-start', alignItems: 'stretch' }}>
            <div style={{ gap: '0px', padding: '0px', justifyContent: 'flex-start', display: 'flex', flexDirection: 'column' }}>
              {/* First image - Buy Tickets Click Here */}
              <Link href="/events/1/tickets" style={{ height: 'auto', flex: 1, display: 'block' }}>
              <img
                src="/images/buy_tickets_click_here_red.webp"
                alt="Buy Tickets"
                  style={{
                    width: '100%',
                    height: 'auto',
                    minHeight: '120px',
                    maxHeight: '180px',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    margin: 0,
                    padding: '0px',
                    boxSizing: 'border-box',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                />
              </Link>

              {/* Second image - Buy Tickets Sep 15 Parsippany */}
              <Link href="/events/1/tickets" style={{ height: 'auto', flex: 1, display: 'block' }}>
                <img
                  src="/images/buy_tickets_sep_15_parsippany.png"
                  alt="Buy Tickets Sep 2 Houston"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    margin: 0,
                    padding: '0px',
                    boxSizing: 'border-box',
                    maxWidth: '100%',
                    overflow: 'hidden'
                  }}
                />
              </Link>

              {/* Third image - Buy Tickets Sep 21 Knanaya */}
              <Link href="/events/2/tickets" style={{ height: 'auto', flex: 1, display: 'block', marginTop: '20px' }}>
                <img
                  src="/images/buy_tickets_sep_21_knanaya.png"
                  alt="Buy Tickets Sep 15 Houston"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    margin: 0,
                    padding: '0px',
                    boxSizing: 'border-box',
                    maxWidth: '100%',
                    overflow: 'hidden'
                  }}
                />
              </Link>
            </div>
          </div>

          {/* RIGHT FEATURE BOX - single large image */}
          <div className="flex-1 rounded-xl p-1" style={{ marginTop: '-60px', alignItems: 'flex-start' }}>
            <img
              src="/images/spark_kerala_event_2025.png"
              alt="Spark Kerala Event 2025"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center',
                margin: 0,
                padding: '0px',
                boxSizing: 'border-box',
                maxWidth: '100%',
                overflow: 'hidden'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content container - ui_style_guide.mdc compliant */}
      <div className="max-w-5xl mx-auto px-8 py-0" style={{ marginTop: '-40px' }}>
        {/* WHAT WE DO SECTION - two columns on desktop, stacked on mobile */}
        <section className="what-we-do bg-white py-8">
          <div className="container mx-auto px-4">
            <div className="section-title-wrapper flex items-center gap-4 mb-4">
              <span className="section-subtitle text-yellow-400 font-semibold text-lg border-b-2 border-yellow-400 pb-1">WHAT WE DO</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-8">Cultural Workshops and Educational Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-x-16 md:gap-y-10">
              {/* Traditional Dance & Music */}
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <svg width="40" height="40" fill="none" viewBox="0 0 40 40"><path d="M28 5v17.58A6.5 6.5 0 1 0 31 28V13h6V5h-9zM22 33a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" fill="#22c55e" /></svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-1">Traditional Dance & Music</h4>
                  <p className="text-gray-500 text-lg">Experience the rich heritage of Kerala through dance and music workshops.</p>
                </div>
              </div>
              {/* Art & Craft Workshops */}
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <svg width="40" height="40" fill="none" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#fbbf24" /><circle cx="13" cy="17" r="2" fill="#fff" /><circle cx="20" cy="13" r="2" fill="#fff" /><circle cx="27" cy="17" r="2" fill="#fff" /><circle cx="20" cy="27" r="2" fill="#fff" /></svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-1">Art & Craft Workshops</h4>
                  <p className="text-gray-500 text-lg">Learn traditional Kerala art forms and crafts through hands-on workshops.</p>
                </div>
              </div>
              {/* Kerala Folklore and Tribal Traditions */}
              <div id="about-us" className="flex items-start gap-6" style={{ scrollMarginTop: '100px' }}>
                <div className="flex-shrink-0">
                  <svg width="40" height="40" fill="none" viewBox="0 0 40 40"><rect x="8" y="8" width="24" height="24" rx="4" fill="#3b82f6" /><rect x="14" y="14" width="12" height="2" rx="1" fill="#fff" /><rect x="14" y="20" width="12" height="2" rx="1" fill="#fff" /></svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-1">Kerala Folklore and Tribal Traditions</h4>
                  <p className="text-gray-500 text-lg">Introduce lesser-known folk dances like Theyyam, Padayani, and Poothan Thira.</p>
                </div>
              </div>
              {/* Kerala Cuisine Classes */}
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <svg width="40" height="40" fill="none" viewBox="0 0 40 40"><g><rect x="10" y="10" width="6" height="20" rx="3" fill="#fbbf24" /><rect x="24" y="10" width="6" height="20" rx="3" fill="#fbbf24" /><rect x="13" y="13" width="2" height="14" rx="1" fill="#fff" /><rect x="27" y="13" width="2" height="14" rx="1" fill="#fff" /></g></svg>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-1">Kerala Cuisine Classes</h4>
                  <p className="text-gray-500 text-lg">Master the art of traditional Kerala cooking with expert chefs.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* TICKER/BANNER SECTION */}
        <section className="ticker-section" style={{ marginTop: '-20px', padding: '20px 0', overflow: 'hidden', backgroundColor: '#ff8c00' }}>
          <div className="ticker" style={{
            display: 'flex',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            animation: 'ticker 15s linear infinite',
            width: '100%'
          }}>
            <div className="ticker-item" style={{
              display: 'inline-block',
              paddingRight: '800px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              whiteSpace: 'nowrap'
            }}>Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item" style={{
              display: 'inline-block',
              paddingRight: '800px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              whiteSpace: 'nowrap'
            }}>Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item" style={{
              display: 'inline-block',
              paddingRight: '800px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              whiteSpace: 'nowrap'
            }}>Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item" style={{
              display: 'inline-block',
              paddingRight: '800px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              whiteSpace: 'nowrap'
            }}>Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item" style={{
              display: 'inline-block',
              paddingRight: '800px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              whiteSpace: 'nowrap'
            }}>Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item" style={{
              display: 'inline-block',
              paddingRight: '800px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              whiteSpace: 'nowrap'
            }}>Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item" style={{
              display: 'inline-block',
              paddingRight: '800px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              whiteSpace: 'nowrap'
            }}>Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item" style={{
              display: 'inline-block',
              paddingRight: '800px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              whiteSpace: 'nowrap'
            }}>Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item" style={{
              display: 'inline-block',
              paddingRight: '800px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              whiteSpace: 'nowrap'
            }}>Culture is the thread to thrive and ties generations to their roots !</div>
            <div className="ticker-item" style={{
              display: 'inline-block',
              paddingRight: '800px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              whiteSpace: 'nowrap'
            }}>Culture is the thread to thrive and ties generations to their roots !</div>
          </div>
        </section>
        {/* ABOUT, VISION, STORY SECTIONS - styled as cards with image left, text right */}
        <section className="bg-[#f9f9f9] py-8" style={{ marginTop: '-20px' }}>
          <div className="max-w-4xl mx-auto flex flex-col gap-8">
            {/* About Foundation */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-1/3 flex-shrink-0">
                <img src="/images/kathakali_with_back_light_hero.jpg" alt="About Foundation" className="w-full h-64 md:h-full object-cover" />
              </div>
              <div className="md:w-2/3 p-6 md:p-8 flex flex-col justify-center">
                <span className="text-yellow-400 font-semibold uppercase tracking-wide text-sm mb-2">About Foundation</span>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">The Malayali Cultural Exchange Foundation</h3>
                <p className="text-gray-700 text-base md:text-lg mb-2">The Malayali Cultural Exchange Foundation for Education and Events is a vibrant, community-driven organization based in New Jersey, USA, dedicated to reviving real Malayali culture, empowering the next generation through education, and offering a nostalgic sense of home to our community. Our mission is to preserve and promote the rich cultural heritage of Kerala while fostering a deeper connection among Malayalis in the USA, creating a sense of belonging and unity.</p>
                <p className="text-gray-700 text-base md:text-lg mb-2">We focus on providing quality events that go beyond face-value interactions, offering genuine cultural experiences and values. Through educational programs, cultural events, and community-building activities, we aim to engage and inspire the new generation. Whether it's learning the Malayalam language, participating in Kerala's traditional festivals, or understanding the deeper meanings of our customs, we ensure that our initiatives go beyond surface-level celebrations.</p>
                <p className="text-gray-700 text-base md:text-lg">At the heart of our foundation is the belief in the power of cultural exchange. We strive to create opportunities for our community to reconnect with their roots while also sharing the beauty of Kerala with others. Our events are specifically designed to attract and engage young people, helping them build a deeper appreciation for their heritage, while also offering a sense of nostalgia and connection to those already established in the USA.</p>
                <p className="text-gray-700 text-base md:text-lg mt-2">The Malayali Cultural Exchange Foundation for Education and Events serves as a home away from home, offering a place to celebrate, educate, and embrace the vibrant spirit of Kerala. Join us in our mission to nurture the next generation of Malayalis and continue the traditions that define our culture, fostering a stronger, more connected community in the USA.</p>
              </div>
            </div>
            {/* Vision Statement */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-1/3 flex-shrink-0">
                <img src="/images/vision_to_future.jpeg" alt="Vision" className="w-full h-64 md:h-full object-cover" />
              </div>
              <div className="md:w-2/3 p-6 md:p-8 flex flex-col justify-center">
                <span className="text-yellow-400 font-semibold uppercase tracking-wide text-sm mb-2">Vision Statement</span>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Our Vision</h3>
                <p className="text-gray-700 text-base md:text-lg">Our vision is to create a thriving community where Malayali culture is celebrated, preserved, and passed on to future generations. We envision a foundation that acts as a hub for cultural exchange, education, and unity, fostering pride in our heritage while adapting it for the modern world. By building lasting connections, both within the Malayali community and with others, we strive to contribute to a greater understanding and appreciation of Kerala's traditions and values in the USA. We aim to be a beacon of empowerment, nostalgia, and cultural pride for generations to come.</p>
              </div>
            </div>
            {/* Story Section */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-1/3 flex-shrink-0">
                <img src="/images/story_foundation.jpeg" alt="Story" className="w-full h-64 md:h-full object-cover" />
              </div>
              <div className="md:w-2/3 p-6 md:p-8 flex flex-col justify-center">
                <span className="text-yellow-400 font-semibold uppercase tracking-wide text-sm mb-2">Our Story</span>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Story Behind the Foundation</h3>
                <p className="text-gray-700 text-base md:text-lg mb-2">The Malayali Cultural Exchange Foundation for Education and Events was born out of a deep passion for preserving and sharing the rich cultural heritage of Kerala with the Malayali community in the USA. The idea emerged when a group of passionate individuals, united by their love for their roots, began to realize the power of genuine, quality cultural experiences in fostering connection and belonging.</p>
                <p className="text-gray-700 text-base md:text-lg mb-2">In observing the growing need for meaningful cultural events within our community, we were inspired by the realization that even though many of our events might not attract large crowds, they held immense value in creating lasting memories and deepening connections. We recognized that the true strength of our culture lies not in large numbers or grandeur, but in the authentic exchange of traditions, stories, and experiences that resonate deeply with individuals.</p>
                <p className="text-gray-700 text-base md:text-lg">Through intimate gatherings, educational programs, and cultural celebrations, we witnessed firsthand the positive impact of quality events—ones that went beyond surface-level interactions to truly engage participants, invoking nostalgia, pride, and a sense of home. These moments of connection made it clear that there was a growing desire for a space where people could celebrate the richness of Malayali culture while empowering the next generation to continue these traditions.</p>
                <p className="text-gray-700 text-base md:text-lg mt-2">This understanding fueled the creation of our foundation: a platform that focuses on quality over quantity, where every event is designed to foster deeper cultural understanding and create lasting bonds within the community. Our goal has always been to offer something more than just a celebration—we aim to provide experiences that honor the values of Kerala while adapting them to the modern context, ensuring they remain relevant and meaningful for future generations.</p>
                <p className="text-gray-700 text-base md:text-lg mt-2">The foundation is not just about holding events; it's about creating a legacy. It's about offering a nostalgic sense of home to those who have moved far from Kerala and empowering younger generations to carry forward the cultural torch. We are driven by the belief that every interaction, no matter how small the crowd, is a step toward preserving and passing on the vibrant traditions of Kerala for years to come.</p>
              </div>
            </div>
          </div>
        </section>
        {/* TEAM SECTION */}
        <section className="philantrop_team_section team-section" id="team-section" style={{ scrollMarginTop: '100px' }}>
          <div className="container">
            <div className="row">
              <div className="col-12 col-md-6">
                <div className="section-title-wrapper">
                  <span className="section-subtitle">Team</span>
                  <h3 className="philantrop_team_title">Meet our the best volunteers team</h3>
                </div>
              </div>
            </div>
            <div className="philantrop_team_grid team-grid">
              {/* Head Team Member */}
              <div className="philantrop_team_item team-item">
                <div className="philantrop_team_image team-image">
                  <img src="/images/team_members/shaji_varghese.jpeg" alt="Shaji Varghese" />
                  <div className="philantrop_team_overlay team-overlay">
                    <ul className="philantrop_team_socials team-socials">
                      <li><a href="#"><i className="fab fa-facebook-f"></i></a></li>
                    </ul>
                  </div>
                </div>
                <div className="philantrop_team_content team-content">
                  <h5 className="philantrop_team_title team-title">Shaji Varghese</h5>
                  <div className="philantrop_team_position team-position">Head Volunteer</div>
                </div>
              </div>
              {/* Team Member 1 */}
              <div className="philantrop_team_item team-item">
                <div className="philantrop_team_image team-image">
                  <img src="/images/team_members/sujith_karakkadan.jpeg" alt="Team Member" />
                  <div className="philantrop_team_overlay team-overlay">
                    <ul className="philantrop_team_socials team-socials">
                      <li><a href="https://www.facebook.com/sujith.thottan" target="_blank"><i className="fab fa-facebook-f"></i></a></li>
                    </ul>
                  </div>
                </div>
                <div className="philantrop_team_content team-content">
                  <h5 className="philantrop_team_title team-title">Sujith Karakkadan</h5>
                  <div className="philantrop_team_position team-position">Volunteer</div>
                </div>
              </div>
              {/* Team Member 2 */}
              <div className="philantrop_team_item team-item">
                <div className="philantrop_team_image team-image">
                  <img src="/images/team_members/arun_sadasivan.jpeg" alt="Team Member" />
                  <div className="philantrop_team_overlay team-overlay">
                    <ul className="philantrop_team_socials team-socials">
                      <li><a href="https://www.facebook.com/arun.sadasivan.3" target="_blank"><i className="fab fa-facebook-f"></i></a></li>
                    </ul>
                  </div>
                </div>
                <div className="philantrop_team_content team-content">
                  <h5 className="philantrop_team_title team-title">Arun Sadasivan</h5>
                  <div className="philantrop_team_position team-position">Volunteer</div>
                </div>
              </div>
              {/* Team Member 3 */}
              <div className="philantrop_team_item team-item">
                <div className="philantrop_team_image team-image">
                  <img src="/images/team_members/latha_krishnan.jpeg" alt="Team Member" style={{ objectPosition: 'center 20%' }} />
                  <div className="philantrop_team_overlay team-overlay">
                    <ul className="philantrop_team_socials team-socials">
                      <li><a href="#"><i className="fab fa-facebook-f"></i></a></li>
                    </ul>
                  </div>
                </div>
                <div className="philantrop_team_content team-content">
                  <h5 className="philantrop_team_title team-title">Latha Krishnan</h5>
                  <div className="philantrop_team_position team-position"> Volunteer</div>
                </div>
              </div>
              {/* Team Member 4 */}
              <div className="philantrop_team_item team-item">
                <div className="philantrop_team_image team-image">
                  <img src="/images/team_members/varun_lal.jpeg" alt="Team Member" />
                  <div className="philantrop_team_overlay team-overlay">
                    <ul className="philantrop_team_socials team-socials">
                      <li><a href="https://www.facebook.com/lalvarun" target="_blank"><i className="fab fa-facebook-f"></i></a></li>
                    </ul>
                  </div>
                </div>
                <div className="philantrop_team_content team-content">
                  <h5 className="philantrop_team_title team-title">Varun Lal</h5>
                  <div className="philantrop_team_position team-position">Volunteer</div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* CONTACT SECTION - centered, four columns */}
        <section id="contact" className="bg-[#f9f9f9] py-12">
          <div className="max-w-5xl mx-auto px-4">
            <span className="text-yellow-400 font-semibold uppercase tracking-wide text-sm mb-2 block">Contact</span>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Get in touch</h2>
            <p className="text-gray-600 text-base md:text-lg mb-8 max-w-2xl mx-auto text-center">Connect with us to learn more about our community initiatives and how you can get involved in preserving and promoting Malayali culture across the United States. Join us in fostering cultural exchange and building stronger connections within our diverse communities.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
              <div>
                <h6 className="font-semibold mb-1">Location</h6>
                <p className="text-gray-700 text-sm">MCEFEE<br />Malayali Cultural Exchange Foundation<br />for Education and Events<br />New Jersey, USA</p>
              </div>
              <div>
                <h6 className="font-semibold mb-1">Phone</h6>
                <p className="text-gray-700 text-sm">(908) 516-8781</p>
              </div>
              <div>
                <h6 className="font-semibold mb-1">Social</h6>
                <a href="https://www.facebook.com/profile.php?id=61573944338286" className="inline-block text-gray-700 hover:text-yellow-500 text-2xl" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-facebook-f"></i>
                </a>
              </div>
              <div>
                <h6 className="font-semibold mb-1">Email</h6>
                <p className="text-gray-700 text-sm"><a href="mailto:Contactus@mcefee.org">Contactus@mcefee.org</a></p>
              </div>
            </div>
          </div>
        </section>
        {/* EVENTS SECTION - two columns, event cards and main event */}
        <section className="bg-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <span className="text-yellow-400 font-semibold uppercase tracking-wide text-sm mb-2 block">Events</span>
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Exciting events & announcements</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Event cards */}
              <div className="md:col-span-2 flex flex-col gap-6">
                {/* Event 1 */}
                <div className="flex bg-[#f9f9f9] rounded-xl shadow-sm overflow-hidden">
                  <img src="/images/spark_kerala_event_2025.png" alt="SPARK OF KERALA" className="w-32 h-44 object-cover rounded-l-xl" />
                  <div className="flex flex-col justify-between p-4 flex-1">
                    <div>
                      <h5 className="font-semibold text-lg mb-1">SPARK OF KERALA</h5>
                      <div className="text-gray-600 text-sm mb-2">Celebrates the vibrant culture, art, and heritage of Kerala across the USA</div>
                    </div>
                    <div className="flex items-end justify-between mt-2">
                      <div className="text-yellow-500 font-bold text-lg">2025<br /><span className="text-xs font-normal text-gray-700">AUG-SEP</span></div>
                    </div>
                  </div>
                </div>
                {/* Event 2 */}
                <div className="flex bg-[#f9f9f9] rounded-xl shadow-sm overflow-hidden">
                  <img src="/images/Karnatic_Music_Festival.jpeg" alt="Karnatic Music Festival" className="w-32 h-44 object-cover rounded-l-xl" />
                  <div className="flex flex-col justify-between p-4 flex-1">
                    <div>
                      <h5 className="font-semibold text-lg mb-1">Karnatic Music Festival</h5>
                      <div className="text-gray-600 text-sm mb-2">A Tribute to Kerala's Classical Melodies Across the USA</div>
                    </div>
                    <div className="flex items-end justify-between mt-2">
                      <div className="text-yellow-500 font-bold text-lg">2025<br /><span className="text-xs font-normal text-gray-700">OCT-NOV</span></div>
                    </div>
                  </div>
                </div>
                <a href="/events.html" className="inline-block mt-4 px-6 py-2 border border-yellow-400 text-yellow-500 rounded-full font-semibold hover:bg-yellow-50 transition">See all events</a>
              </div>
              {/* Main event highlight */}
              <div className="bg-yellow-300 rounded-xl shadow-md p-8 flex flex-col justify-center">
                <span className="text-gray-700 font-semibold text-sm mb-2">Main event</span>
                <h4 className="font-bold text-xl mb-2">SPARK OF KERALA</h4>
                <p className="text-gray-700 text-base mb-2">We are excited to announce SPARK OF KERALA – a grand celebration of Kerala's most iconic festival, Onam, set to take place in the USA in 2025. This event promises to be an unforgettable experience, capturing the true essence of Onam through a power-packed performance that showcases the vibrant culture, traditions, and spirit of Kerala. Explore more</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER - full-bleed, edge-to-edge */}
      <Footer />

      {/* BACK TO TOP BUTTON */}
      <a href="#" className="back-to-top">
        <i className="fas fa-arrow-up"></i>
      </a>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes ticker {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }

          .ticker {
            animation: ticker 15s linear infinite;
            width: 100%;
            overflow: hidden;
          }

          .ticker-item {
            display: inline-block;
            padding-right: 800px;
            font-size: 18px;
            font-weight: bold;
            color: #333;
            white-space: nowrap;
            text-overflow: clip;
          }

          @media (max-width: 767px) {
            .ticker-item {
              font-size: 14px;
              padding-right: 600px;
            }

            .ticker {
              animation: ticker 12s linear infinite;
            }
          }
        `
      }} />
    </>
  );
}
