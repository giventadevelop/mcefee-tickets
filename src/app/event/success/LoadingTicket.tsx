"use client";
import Image from "next/image";
import { useEffect, useState } from 'react';
import { PhilantropHeaderClient } from '@/components/PhilantropHeaderClient';
import { Footer } from '@/components/Footer';
import { HeroImageDebugger } from '@/components/HeroImageDebugger';
import { ImageCacheTest } from '@/components/ImageCacheTest';
import { HydrationSafeHeroImage } from '@/components/HydrationSafeHeroImage';

interface LoadingTicketProps {
  sessionId?: string;
}

export default function LoadingTicket({ sessionId }: LoadingTicketProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  console.log('LoadingTicket received sessionId:', sessionId);
  console.log('LoadingTicket image status - loaded:', isLoaded, 'error:', hasError);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* HEADER */}
      <PhilantropHeaderClient />

      {/* HERO SECTION - Full width bleeding to edges */}
      <section className="hero-section" style={{ position: 'relative', marginTop: '20px', paddingTop: '40px', padding: '40px 0 0 0', margin: '0', backgroundColor: 'transparent', height: 'auto', overflow: 'hidden', width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
        <HydrationSafeHeroImage
          alt="Event Hero"
          className="hero-image"
          onLoad={() => {
            console.log('Hero image loaded successfully');
            setIsLoaded(true);
          }}
          onError={(e) => {
            console.error('Hero image failed to load:', e);
            setHasError(true);
          }}
        />
        {/* Responsive logo positioned as overlay on hero image */}
        <div className="absolute top-1/2 left-4 z-50 mobile-logo" style={{ transform: 'translateY(-50%)' }}>
          <img src="/images/mcefee_logo_black_border_transparent.png" alt="MCEFEE Logo" style={{ width: '140px', height: 'auto', maxWidth: '30vw' }} className="block md:hidden" />
          <img src="/images/mcefee_logo_black_border_transparent.png" alt="MCEFEE Logo" style={{ width: '180px', height: 'auto', maxWidth: '15vw' }} className="hidden md:block" />
        </div>
        <div className="hero-overlay" style={{ opacity: 0.1, height: '5px', padding: '20' }}></div>
      </section>

      {/* CSS Styles for hero section */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .hero-image {
            width: 100%;
            height: auto; /* Let image dictate height */
            object-fit: cover; /* Cover full width, may crop height */
            object-position: center;
            display: block;
            margin: 0;
            padding: 0; /* Remove padding to bleed to edges */
          }

          .hero-section {
            min-height: 10vh;
            background-color: transparent !important; /* Remove coral background */
            padding-top: 40px; /* Top padding to prevent header cut-off */
            margin-left: calc(-50vw + 50%) !important;
            margin-right: calc(-50vw + 50%) !important;
            width: 100vw !important;
          }

          @media (max-width: 768px) {
            .hero-image {
              height: auto; /* Let image dictate height on mobile */
              padding: 0; /* Remove padding to bleed to edges on mobile */
            }
          }

          @media (max-width: 767px) {
            .hero-section {
              padding-top: 50px !important; /* Extra mobile top padding */
              margin-top: 0 !important;
              min-height: 5vh !important;
              background-color: transparent !important; /* Remove coral background on mobile */
              margin-left: calc(-50vw + 50%) !important;
              margin-right: calc(-50vw + 50%) !important;
              width: 100vw !important;
            }

            .mobile-logo {
              top: 120px !important;
            }
          }
        `
      }} />

      {/* Loading content - flex-grow to push footer down */}
      <div className="flex-grow flex flex-col items-center justify-center min-h-[200px] p-6 animate-pulse" style={{ marginTop: '80px' }}>
        <Image
          src="/images/selling-tickets-vector-loading-image.jpg"
          alt="Ticket Loading"
          width={180}
          height={180}
          className="mb-4 rounded shadow-lg"
          priority
        />
        <div className="text-xl font-bold text-teal-700 mb-2">Please wait while your ticket is generated</div>
        <div className="text-gray-600 text-base text-center">It may take a few minutes.<br />Do not close this page.</div>
      </div>

      {/* FOOTER - bleeds to edges */}
      <Footer />

      {/* Debug components - set show={true} to enable */}
      <HeroImageDebugger show={false} />
      <ImageCacheTest />
    </div>
  );
}