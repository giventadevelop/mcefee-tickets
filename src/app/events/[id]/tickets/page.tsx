'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FaTags, FaCreditCard, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaMapPin } from 'react-icons/fa';
import { Modal } from '@/components/Modal';
import { formatInTimeZone } from 'date-fns-tz';

export default function TicketingPage() {
  const params = useParams();
  const eventId = params?.id;
  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<{ [key: number]: number }>({});
  const [email, setEmail] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [discountError, setDiscountError] = useState('');
  const [discountSuccessMessage, setDiscountSuccessMessage] = useState('');
  const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([]);
  const [emailError, setEmailError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [savedAmount, setSavedAmount] = useState(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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

        // Fetch discount codes for this event
        const discountRes = await fetch(`/api/proxy/discount-codes?eventId.equals=${eventId}&isActive.equals=true`);
        if (discountRes.ok) {
          const discountData = await discountRes.json();
          setAvailableDiscounts(Array.isArray(discountData) ? discountData : []);
        }

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

  // Reactive calculation for total and discount
  useEffect(() => {
    const subtotal = Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      const ticket = ticketTypes.find(t => t.id === parseInt(ticketId));
      return total + (ticket?.price || 0) * quantity;
    }, 0);

    let finalAmount = subtotal;
    let amountSaved = 0;

    if (appliedDiscount) {
      if (appliedDiscount.discountType === 'PERCENTAGE') {
        amountSaved = subtotal * (appliedDiscount.discountValue / 100);
      } else if (appliedDiscount.discountType === 'FIXED_AMOUNT') {
        amountSaved = Math.min(subtotal, appliedDiscount.discountValue);
      }
      finalAmount = Math.max(0, subtotal - amountSaved);

      if (amountSaved > 0) {
        setDiscountSuccessMessage(`Discount '${appliedDiscount.code}' applied! You saved $${amountSaved.toFixed(2)}.`);
      }
    } else {
      setDiscountSuccessMessage('');
    }

    setTotalAmount(finalAmount);
    setSavedAmount(amountSaved);
  }, [selectedTickets, appliedDiscount, ticketTypes]);

  const handleTicketChange = (ticketId: number, quantity: number) => {
    const ticketType = ticketTypes.find(t => t.id === ticketId);
    if (!ticketType) return;

    const available = ticketType.availableQuantity ?? Infinity;
    const newQuantity = Math.max(0, Math.min(quantity, available));

    if (newQuantity >= 0) {
      setSelectedTickets(prev => ({ ...prev, [ticketId]: newQuantity }));
    }
  };

  const calculateSubtotal = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      const ticket = ticketTypes.find(t => t.id === parseInt(ticketId));
      return total + (ticket?.price || 0) * quantity;
    }, 0);
  };

  const validateAndApplyDiscount = (code: string) => {
    if (Object.values(selectedTickets).every(q => q === 0)) {
      setDiscountError('Please select tickets before applying a discount.');
      return null;
    }

    setDiscountError('');
    const codeToValidate = code.trim().toLowerCase();

    if (!codeToValidate) {
      setAppliedDiscount(null); // Clear discount if input is empty
      return null;
    }

    const codeToApply = availableDiscounts.find(d => d.code.toLowerCase() === codeToValidate);

    if (codeToApply) {
      if (codeToApply.usesCount >= (codeToApply.maxUses || Infinity)) {
        setDiscountError('This discount code has reached its maximum usage limit.');
        setAppliedDiscount(null);
        return null;
      } else {
        setAppliedDiscount(codeToApply); // Success! Set the discount object.
        return codeToApply;
      }
    } else {
      setDiscountError('Invalid code. Please clear the field or enter a valid code to proceed.');
      setAppliedDiscount(null);
      return null;
    }
  };

  const handleApplyDiscount = () => {
    // Validation 1: No tickets selected
    if (Object.values(selectedTickets).every(q => q === 0)) {
      setDiscountError('Please select at least one ticket before applying a discount.');
      return;
    }
    // Validation 2: Discount code is empty
    if (!discountCode.trim()) {
      setDiscountError('Please enter the discount code.');
      return;
    }
    setDiscountError('');
    validateAndApplyDiscount(discountCode);
  };

  const handleCheckout = async () => {
    // 1. Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setEmailError(true);
      return;
    }

    // 2. Auto-apply discount if code is entered but not applied
    let finalDiscount = appliedDiscount;
    if (discountCode && (!appliedDiscount || appliedDiscount.code.toLowerCase() !== discountCode.toLowerCase())) {
      finalDiscount = validateAndApplyDiscount(discountCode);
    }

    // Block checkout if there is a discount code error and the field is not empty
    if (discountError && discountCode.trim()) {
      setShowDiscountModal(true);
      return;
    }

    // 3. Build cart.
    const cart = Object.entries(selectedTickets)
      .filter(([, quantity]) => quantity > 0)
      .map(([ticketId, quantity]) => {
        const ticketType = ticketTypes.find(t => t.id === parseInt(ticketId));
        return { ticketType, quantity };
      });

    if (cart.length === 0) {
      alert('Your cart is empty. Please select at least one ticket.');
      return;
    }

    // 4. Start processing and call Stripe API directly.
    setIsProcessing(true);

    try {
      const response = await fetch('/api/stripe/event-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          discountCodeId: finalDiscount?.id || null,
          eventId,
          email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session.');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Could not proceed to checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Loading...</div>;
  }
  if (!event) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-red-600">Event not found.</div>;
  }

  // --- HERO SECTION (prompt-compliant) ---
  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* HEADER */}
      <header className={mounted ? "header-transparent" : "header-transparent"}>
        <div className="header-inner">
          <nav>
            <ul className="main-menu">
              {/* ...menu items... */}
            </ul>
            <button className="hamburger-menu" aria-label="Menu">
              <span></span><span></span><span></span>
            </button>
          </nav>
        </div>
      </header>
      <div className="mobile-menu">
        <ul className="mobile-menu-list">
          {/* ...mobile menu items... */}
        </ul>
      </div>
      <section className="hero-section">
        <div className="hero-background" style={{ backgroundImage: `url('${heroImageUrl || defaultHeroImageUrl}')` }}></div>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <img src="/images/mcefee_logo_black_border_transparent.png" className="hero-mcafee-logo" alt="MCEFEE Logo" />
          <h1 className="hero-title">
            {event?.title || 'Event Tickets'} <span style={{ color: 'var(--primary-color)' }}>{event?.caption}</span>
          </h1>
        </div>
      </section>
      {/* --- END HERO SECTION --- */}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Details Card */}
        <div className="bg-teal-50 rounded-xl shadow-lg p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            {event.title}
          </h2>
          {event.caption && (
            <div className="text-lg text-teal-700 font-semibold mb-2">{event.caption}</div>
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <FaCalendarAlt />
              <span>{formatInTimeZone(event.startDate, event.timezone || 'America/New_York', 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaClock />
              <span>{formatTime(event.startTime)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ''} {'('}{formatInTimeZone(event.startDate, event.timezone || 'America/New_York', 'zzz')}{')'}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <FaMapPin />
                <span>{event.location}</span>
              </div>
            )}
            {event.venueName && (
              <div className="flex items-center gap-2">
                <FaMapMarkerAlt />
                <span>{event.venueName}</span>
              </div>
            )}
          </div>
          <p className="text-gray-700 text-base">{event.description}</p>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side: Ticket Types */}
          <div className="lg:col-span-2">
            <div className="bg-slate-50 rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Select Your Tickets</h2>
              <div className="space-y-6">
                {ticketTypes.length === 0 && (
                  <div className="text-center text-gray-500 py-8">No ticket types available for this event.</div>
                )}
                {ticketTypes.map(ticket => (
                  <div key={ticket.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border border-gray-200 rounded-lg bg-white shadow-sm">
                    <div className="mb-4 sm:mb-0">
                      <h3 className="text-xl font-semibold text-gray-900">{ticket.name}</h3>
                      <p className="text-lg font-bold text-blue-600 mt-1">${ticket.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-600 mt-2">{ticket.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTicketChange(ticket.id, (selectedTickets[ticket.id] || 0) - 1)}
                        className="bg-gray-200 text-gray-700 px-3 py-1 rounded-l-md hover:bg-gray-300 transition-colors"
                      >
                        -
                      </button>
                      <span className="px-4 py-1 bg-white border-t border-b">{selectedTickets[ticket.id] || 0}</span>
                      <button
                        onClick={() => handleTicketChange(ticket.id, (selectedTickets[ticket.id] || 0) + 1)}
                        className="bg-gray-200 text-gray-700 px-3 py-1 rounded-r-md hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={(selectedTickets[ticket.id] || 0) >= (ticket.availableQuantity ?? Infinity)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Order Summary & Checkout */}
          <div className="lg:col-span-1">
            <div className="bg-slate-50 rounded-xl shadow-lg p-6 md:p-8 sticky top-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Order Summary</h2>

              {/* Discount Code Section */}
              {availableDiscounts.length > 0 && (
                <div className="mb-6">
                  <label htmlFor="discountCode" className="block text-sm font-medium text-gray-700 mb-1">Discount Code</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      id="discountCode"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Enter code"
                      className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 disabled:bg-blue-300 font-semibold flex items-center gap-2"
                    >
                      <FaTags />
                      Apply
                    </button>
                  </div>
                  {discountError && <p className="text-red-500 text-sm mt-2">{discountError}</p>}
                  {discountSuccessMessage && <p className="text-green-600 text-sm mt-2">{discountSuccessMessage}</p>}
                </div>
              )}

              {/* Total */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium text-gray-600">Total:</span>
                  <span className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Email and Checkout */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email for ticket confirmation
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(false);
                  }}
                  className={`mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base ${emailError ? 'border-red-500' : 'border-gray-400'}`}
                  required
                  placeholder="you@example.com"
                />
                {emailError && <p className="text-red-500 text-xs mt-1">Please enter a valid email address.</p>}
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                className="w-full mt-6 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300 disabled:bg-gray-400 flex items-center justify-center gap-2"
                disabled={isProcessing || Object.values(selectedTickets).every(q => q === 0)}
              >
                <FaCreditCard /> {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Modal open={showDiscountModal} onClose={() => setShowDiscountModal(false)} title="Discount Code Error">
        <div className="text-center">
          <p className="text-lg">
            Please enter valid discount code or clear the field before proceeding.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => setShowDiscountModal(false)}
              className="bg-teal-100 hover:bg-teal-200 text-teal-800 px-4 py-2 rounded-md flex items-center gap-2"
            >
              OK
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

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