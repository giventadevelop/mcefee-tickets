'use client';

import React, { useState } from 'react';
import { FaMapMarkerAlt, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';

interface LocationDisplayProps {
  location: string;
  venueName?: string;
  className?: string;
}

export default function LocationDisplay({ location, venueName, className = '' }: LocationDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(location);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy location:', err);
    }
  };

  const handleGoogleMaps = () => {
    const encodedLocation = encodeURIComponent(location);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handleGoogleDirections = () => {
    const encodedLocation = encodeURIComponent(location);
    const googleDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
    window.open(googleDirectionsUrl, '_blank');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <FaMapMarkerAlt className="text-red-500 flex-shrink-0" />
      <span className="font-semibold flex-1">{location}</span>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
        title="Copy address"
      >
        <FaCopy className="w-4 h-4" />
      </button>

      {/* Google Maps Button */}
      <button
        onClick={handleGoogleMaps}
        className="p-1 text-gray-500 hover:text-green-600 transition-colors"
        title="Open in Google Maps"
      >
        <FaExternalLinkAlt className="w-4 h-4" />
      </button>

      {/* Copy Success Indicator */}
      {copied && (
        <span className="text-green-600 text-sm font-medium">Copied!</span>
      )}
    </div>
  );
}