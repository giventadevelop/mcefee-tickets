'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function TicketingPage() {
  const params = useParams();
  const eventId = params?.id;
  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<{ [key: number]: number }>({});
  const [email, setEmail] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  const defaultHeroImageUrl = `/images/side_images/chilanka_2025.webp?v=${Date.now()}`;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch event details
        const eventRes = await fetch(`/api/proxy/event-details/${eventId}`);
        const eventData = await eventRes.json();
        setEvent(eventData);
        // Fetch ticket types for this event
        const ticketRes = await fetch(`/api/proxy/event-ticket-types?eventId.equals=${eventId}`);
        const ticketData = await ticketRes.json();
        setTicketTypes(Array.isArray(ticketData) ? ticketData : []);
        // --- Hero image selection logic (match home page) ---
        let imageUrl = null;
        // 1. Try flyer
        const flyerRes = await fetch(`/api/proxy/event-medias?eventId.equals=${eventId}&eventFlyer.equals=true`);
        if (flyerRes.ok) {
          const flyerData = await flyerRes.json();
          const flyerArray = Array.isArray(flyerData) ? flyerData : (flyerData ? [flyerData] : []);
          if (flyerArray.length > 0 && flyerArray[0].fileUrl) {
            imageUrl = flyerArray[0].fileUrl;
          }
        }
        // 2. If no flyer, try featured
        if (!imageUrl) {
          // Try to get featured image
          let featuredImageUrl;
          try {
            const featuredRes = await fetch(`/api/proxy/event-medias?eventId.equals=${eventId}&isFeaturedImage.equals=true`);
            if (featuredRes.ok) {
              const featuredData = await featuredRes.json();
              if (Array.isArray(featuredData) && featuredData.length > 0) {
                featuredImageUrl = featuredData[0].fileUrl;
              }
            }
          } catch (error) {
            console.error('Error fetching featured image:', error);
          }
        }
        // 3. Fallback to default
        if (!imageUrl) {
          imageUrl = defaultHeroImageUrl;
        }
        setHeroImageUrl(imageUrl);
      } catch (e) {
        setEvent(null);
        setTicketTypes([]);
        setHeroImageUrl(defaultHeroImageUrl);
      } finally {
        setLoading(false);
      }
    }
    if (eventId) fetchData();
    // eslint-disable-next-line
  }, [eventId]);

  const handleTicketChange = (ticketId: number, quantity: number) => {
    if (quantity >= 0) {
      setSelectedTickets(prev => ({ ...prev, [ticketId]: quantity }));
    }
  };

  const calculateTotal = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      const ticket = ticketTypes.find(t => t.id === parseInt(ticketId));
      return total + (ticket?.price || 0) * quantity;
    }, 0);
  };

  const handleCheckout = async () => {
    if (!email.trim()) {
      setEmailError(true);
      return;
    }
    // TODO: Integrate with backend checkout API
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert('Checkout simulated!');
    }, 1200);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Loading...</div>;
  }
  if (!event) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-red-600">Event not found.</div>;
  }

  // --- HERO SECTION (copied/adapted from home page) ---
  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* Hero Section - matches home page */}
      <section
        className="hero-section relative w-full h-[350px] md:h-[350px] sm:h-[220px] h-[160px] bg-transparent pb-0 mb-8"
        style={{ height: undefined }}
      >
        {/* Side Image as absolute vertical border with enhanced soft shadow */}
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
            top: 8,
            right: 8,
            bottom: 8,
            zIndex: 2,
          }}
        >
          <div className="w-full h-full relative">
            {/* Blurred background image for width fill */}
            <Image
              src={heroImageUrl || defaultHeroImageUrl}
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
              src={heroImageUrl || defaultHeroImageUrl}
              alt="Event or Default"
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
          {/* Buy Tickets image overlay if ticketed */}
          {event && event.admissionType === 'ticketed' && (
            <div
              className="absolute bottom-6 right-6 z-10"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Image
                src="/images/buy_tickets_click_here_red.webp"
                alt="Buy Tickets"
                width={160}
                height={60}
                style={{ opacity: 0.7, width: '160px', height: 'auto' }}
                className="rounded shadow"
                priority
              />
            </div>
          )}
        </div>
      </section>
      {/* --- END HERO SECTION --- */}

      {/* Event Details */}
      <div className="max-w-3xl mx-auto px-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Event Details</h2>
          <p className="text-gray-700 mb-2">{event.description}</p>
          <div className="text-gray-500 text-sm">Location: {event.location}</div>
        </div>
      </div>

      {/* Ticket Types */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <h2 className="text-2xl font-bold mb-4">Available Ticket Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ticketTypes.length === 0 && <div className="col-span-full text-gray-500">No ticket types available.</div>}
          {ticketTypes.map(ticket => (
            <div key={ticket.id} className="border rounded-lg p-6 bg-white flex flex-col shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{ticket.name}</h3>
              <p className="text-gray-600 mb-2">{ticket.description}</p>
              <div className="text-2xl font-bold text-gray-900 mb-2">${ticket.price?.toFixed(2) ?? '0.00'}</div>
              <div className="flex items-center mt-auto">
                <button
                  onClick={() => handleTicketChange(ticket.id, (selectedTickets[ticket.id] || 0) - 1)}
                  className="bg-gray-200 text-gray-600 px-3 py-1 rounded-l hover:bg-gray-300"
                  disabled={isProcessing || (selectedTickets[ticket.id] || 0) <= 0}
                >
                  -
                </button>
                <span className="px-4 py-1 bg-white border-t border-b">{selectedTickets[ticket.id] || 0}</span>
                <button
                  onClick={() => handleTicketChange(ticket.id, (selectedTickets[ticket.id] || 0) + 1)}
                  className="bg-gray-200 text-gray-600 px-3 py-1 rounded-r hover:bg-gray-300"
                  disabled={isProcessing || (selectedTickets[ticket.id] || 0) >= (ticket.availableQuantity ?? 999)}
                >
                  +
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">Available: {ticket.availableQuantity ?? 'N/A'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checkout Section */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col gap-4">
          <div>
            <label className="block font-semibold mb-1">Email Address <span className="text-red-500">*</span></label>
            <input
              type="email"
              className={`w-full border rounded p-2 ${emailError ? 'border-red-500' : ''}`}
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(false); }}
              required
              disabled={isProcessing}
              placeholder="Enter your email"
            />
            {emailError && <div className="text-red-500 text-sm mt-1">Email is required</div>}
          </div>
          <div>
            <label className="block font-semibold mb-1">Discount Code</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={discountCode}
              onChange={e => setDiscountCode(e.target.value)}
              disabled={isProcessing}
              placeholder="Enter discount code (optional)"
            />
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-lg font-bold">Total: ${calculateTotal().toFixed(2)}</div>
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
              onClick={handleCheckout}
              disabled={isProcessing || !email.trim() || calculateTotal() === 0}
            >
              {isProcessing ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}