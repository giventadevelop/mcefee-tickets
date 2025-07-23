"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PhilantropHeaderClient } from '@/components/PhilantropHeaderClient';
import { Footer } from '@/components/Footer';

interface LoadingTicketProps {
  heroImageUrl?: string;
  sessionId?: string;
}

export default function LoadingTicket({ heroImageUrl: initialHeroImageUrl, sessionId }: LoadingTicketProps) {
  const [heroImageUrl, setHeroImageUrl] = useState<string>(initialHeroImageUrl || "/images/side_images/chilanka_2025.webp");
  const [isClient, setIsClient] = useState(false);

  console.log('LoadingTicket received heroImageUrl:', initialHeroImageUrl);
  console.log('LoadingTicket received sessionId:', sessionId);

  // Handle client-side hydration safely
  useEffect(() => {
    setIsClient(true);
    const storedHeroImageUrl = localStorage.getItem('eventHeroImageUrl');
    if (storedHeroImageUrl) {
      console.log('Using hero image from localStorage:', storedHeroImageUrl);
      setHeroImageUrl(storedHeroImageUrl);
    } else {
      console.log('No hero image in localStorage, using default');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* HEADER */}
      <PhilantropHeaderClient />
      {/* Responsive logo in top left if not home page */}
      <div className="absolute top-20 left-4 z-50">
        <img src="/images/mcefee_logo_black_border_transparent.png" alt="MCEFEE Logo" style={{ width: '140px', height: 'auto', maxWidth: '30vw' }} className="block md:hidden" />
        <img src="/images/mcefee_logo_black_border_transparent.png" alt="MCEFEE Logo" style={{ width: '180px', height: 'auto', maxWidth: '15vw' }} className="hidden md:block" />
      </div>

      {/* HERO SECTION - matches success page styling */}
      <section className="hero-section" style={{ minHeight: '240px', height: '377px', position: 'relative', marginTop: '0px' }}>
        <div className="hero-background" style={{ backgroundImage: `url('${heroImageUrl}')`, backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'top center', width: '100%', height: '100%', position: 'absolute', top: '40px', left: 0 }}></div>
        <div className="hero-overlay" style={{ opacity: 0.1 }}></div>
      </section>

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
    </div>
  );
}