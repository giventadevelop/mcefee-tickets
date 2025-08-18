"use client";
import { EventWithMedia } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { formatDateLocal } from '@/lib/date';
import { useMemo, useState } from 'react';

interface EventCardProps {
  event: EventWithMedia;
  placeholderText?: string;
}

export function EventCard({ event, placeholderText }: EventCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

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

  const isUpcoming = useMemo(() => {
    const today = new Date();
    const eventDate = event.startDate ? new Date(event.startDate) : null;
    return eventDate && eventDate >= today;
  }, [event.startDate]);

  const calendarLink = useMemo(() => {
    if (!isUpcoming) return '';
    const start = toGoogleCalendarDate(event.startDate, event.startTime);
    const end = toGoogleCalendarDate(event.endDate, event.endTime);
    const text = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.location || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
  }, [event, isUpcoming]);

  // Debug logging
  console.log(`EventCard ${event.id}: thumbnailUrl = ${event.thumbnailUrl}, imageError = ${imageError}`);

  return (
    <div className="event-item bg-gray-50 rounded-lg shadow-lg p-4 flex flex-col items-center h-full hover:shadow-2xl transition-shadow duration-200 cursor-pointer w-[320px] max-w-[calc(100vw-2rem)]">
      <Link href={`/events/${event.id}`} className="block w-full h-full group flex flex-col items-center" tabIndex={-1}>
        <div className="event-image rounded-lg overflow-hidden mb-3 relative"
          style={{ width: '100%', height: 160 }}>
          {event.thumbnailUrl && !imageError ? (
            event.thumbnailUrl.includes('s3.amazonaws.com') ? (
              // Use regular img tag for S3 URLs
              <img
                src={event.thumbnailUrl}
                alt={event.title}
                className="object-cover w-full h-full"
                onError={(e) => {
                  console.error(`Image failed to load for event ${event.id}:`, event.thumbnailUrl, e);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log(`Image loaded successfully for event ${event.id}:`, event.thumbnailUrl);
                }}
              />
            ) : (
              // Use Next.js Image for other URLs
              <Image
                src={event.thumbnailUrl}
                alt={event.title}
                fill
                className="object-cover"
                onError={(e) => {
                  console.error(`Image failed to load for event ${event.id}:`, event.thumbnailUrl, e);
                  setImageError(true);
                }}
                onLoad={() => {
                  console.log(`Image loaded successfully for event ${event.id}:`, event.thumbnailUrl);
                }}
              />
            )
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-4">
              <div className="text-center">
                <div className="text-gray-400 text-4xl mb-2">📷</div>
                <div className="text-gray-600 font-medium text-sm leading-tight">
                  {placeholderText || 'No poster available for this event yet'}
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  Check back soon!
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="event-content text-center flex-grow">
          <h4 className="event-title text-lg font-semibold mb-1">{event.title}</h4>
          <p className="text-gray-600 mb-3 text-sm line-clamp-2">{event.description}</p>
          <div className="text-yellow-600 font-bold mb-1 text-sm">
            {formatDateLocal(event.startDate)}
          </div>
          <div className="text-gray-500 text-xs">
            {event.startTime} - {event.endTime}
          </div>
        </div>
        <span className="mt-3 inline-block bg-yellow-400 text-gray-900 px-5 py-2 rounded-lg font-semibold text-xs shadow group-hover:bg-yellow-300 transition">
          Learn More
        </span>
      </Link>
      {isUpcoming && calendarLink && (
        <div className="flex flex-col items-center mt-4">
          <a href={calendarLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center group">
            <img src="/images/icons8-calendar.gif" alt="Calendar" className="w-7 h-7 rounded shadow mx-auto" />
            <span className="text-xs text-blue-700 font-semibold mt-1">Add to Calendar</span>
          </a>
        </div>
      )}
    </div>
  );
}