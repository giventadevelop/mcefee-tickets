import { EventWithMedia } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { formatDateLocal } from '@/lib/date';
import { useMemo } from 'react';

interface EventCardProps {
  event: EventWithMedia;
  placeholderText?: string;
}

export function EventCard({ event, placeholderText }: EventCardProps) {
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

  return (
    <div className="event-item bg-gray-50 rounded-lg shadow-lg p-6 flex flex-col items-center h-full hover:shadow-2xl transition-shadow duration-200 cursor-pointer">
      <Link href={`/events/${event.id}`} className="block w-full h-full group" tabIndex={-1}>
        <div className="event-image rounded-lg overflow-hidden mb-4 relative"
          style={{ width: 300, minWidth: 300, maxWidth: 300, height: 180, minHeight: 180, maxHeight: 180 }}>
          {event.thumbnailUrl ? (
            <Image
              src={event.thumbnailUrl}
              alt={event.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center">
              <span
                className="font-bold text-gray-900 text-lg text-center px-2 w-full overflow-hidden whitespace-nowrap"
                style={{
                  textOverflow: 'ellipsis',
                  display: 'block',
                  width: '100%',
                }}
                title={placeholderText || event.title || 'No image available'}
              >
                {placeholderText || event.title || 'No image available'}
              </span>
            </div>
          )}
        </div>
        <div className="event-content text-center flex-grow">
          <h4 className="event-title text-xl font-semibold mb-2">{event.title}</h4>
          <p className="text-gray-600 mb-4 line-clamp-3">{event.description}</p>
          <div className="text-yellow-600 font-bold mb-2">
            {formatDateLocal(event.startDate)}
          </div>
          <div className="text-gray-500 text-sm">
            {event.startTime} - {event.endTime}
          </div>
        </div>
        <span className="mt-4 inline-block bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg font-semibold text-sm shadow group-hover:bg-yellow-300 transition">
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