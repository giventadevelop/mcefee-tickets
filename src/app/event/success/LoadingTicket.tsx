"use client";
import Image from "next/image";
import { useEffect, useState } from 'react';

interface LoadingTicketProps {
  sessionId?: string;
}

export default function LoadingTicket({ sessionId }: LoadingTicketProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  console.log('LoadingTicket received sessionId:', sessionId);
  console.log('LoadingTicket image status - loaded:', isLoaded, 'error:', hasError);

  // Fetch hero image data using the success process endpoint
  useEffect(() => {
    if (sessionId) {
      const fetchHeroImage = async () => {
        try {
          console.log('LoadingTicket: Fetching hero image for session:', sessionId);
          
          // Get the pi parameter from URL if available
          const url = new URL(window.location.href);
          const pi = url.searchParams.get('pi');
          const qs = sessionId ? `session_id=${encodeURIComponent(sessionId)}` : (pi ? `pi=${encodeURIComponent(pi)}` : '');
          
          if (!qs) {
            console.log('LoadingTicket: No session_id or pi available');
            return;
          }

          // Use the same endpoint as the success page to get event details and hero image
          const response = await fetch(`/api/event/success/process?${qs}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('LoadingTicket: Response data:', { 
              hasTransaction: !!data.transaction,
              hasEventDetails: !!data.eventDetails,
              hasHeroImageUrl: !!data.heroImageUrl 
            });
            
            if (data.heroImageUrl) {
              setHeroImageUrl(data.heroImageUrl);
              console.log('LoadingTicket: Successfully fetched hero image URL:', data.heroImageUrl);
            } else {
              console.log('LoadingTicket: No hero image URL in response');
            }
          } else {
            console.error('LoadingTicket: Failed to get success process data:', response.status);
          }
        } catch (error) {
          console.error('LoadingTicket: Failed to fetch hero image:', error);
        }
      };
      fetchHeroImage();
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ overflowX: 'hidden' }}>

      {/* HERO SECTION - Full width bleeding to header */}
      <section className="hero-section" style={{
        position: 'relative',
        marginTop: '0',
        backgroundColor: 'transparent',
        minHeight: '400px',
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 0 0 0'
      }}>
        <Image
          src={heroImageUrl || "/images/default_placeholder_hero_image.jpeg"}
          alt="Event Hero"
          width={1200}
          height={400}
          className="hero-image object-cover"
          style={{
            margin: '0 auto',
            padding: '0',
            display: 'block',
            width: '100%',
            maxWidth: '100%',
            height: 'auto',
            objectFit: 'cover',
            borderRadius: '0'
          }}
          onLoad={() => {
            console.log('Hero image loaded successfully');
            setIsLoaded(true);
          }}
          onError={(e) => {
            console.error('Hero image failed to load:', e);
            setHasError(true);
          }}
        />
        <div className="hero-overlay" style={{ opacity: 0.1, height: '5px', padding: '20' }}></div>
      </section>

      {/* CSS Styles for hero section */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .hero-image {
            width: 100%;
            max-width: 100%;
            height: auto;
            object-fit: cover;
            object-position: center;
            display: block;
            margin: 0 auto;
            padding: 0;
            border-radius: 0;
          }

          .hero-section {
            min-height: 15vh;
            background-color: transparent !important;
            padding: 80px 0 0 0 !important;
            width: 100% !important;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          @media (max-width: 768px) {
            .hero-image {
              width: 100%;
              max-width: 100%;
              height: auto;
              padding: 0;
              border-radius: 0;
            }

            .hero-section {
              padding: 95px 0 15px 0 !important;
              min-height: 12vh !important;
            }
          }

          @media (max-width: 480px) {
            .hero-image {
              width: 100%;
              padding: 0;
              border-radius: 0;
            }

            .hero-section {
              padding: 90px 0 10px 0 !important;
              min-height: 10vh !important;
            }
          }
        `
      }} />

      {/* Loading content - flex-grow to push footer down */}
      <div className="flex-grow flex flex-col items-center justify-center min-h-[200px] p-6 animate-pulse" style={{ marginTop: '150px', paddingTop: '60px' }}>
        <Image
          src="/images/selling-tickets-vector-loading-image.jpg"
          alt="Ticket Loading"
          width={180}
          height={180}
          className="mb-4 rounded shadow-lg"
          priority
        />
        <div className="text-xl font-bold text-teal-700 mb-2">Processing your payment and generating your QR code</div>
        <div className="text-gray-600 text-base text-center">This may take a few moments.<br />Please do not close or refresh this page.</div>
      </div>


    </div>
  );
}