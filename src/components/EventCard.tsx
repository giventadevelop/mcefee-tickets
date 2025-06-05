import { EventWithMedia } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { formatDateLocal } from '@/lib/date';

interface EventCardProps {
  event: EventWithMedia;
}

export function EventCard({ event }: EventCardProps) {
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

  return (
    <Link href={`/events/${event.id}`} className="block h-full group">
      <div className="event-item bg-gray-50 rounded-lg shadow-lg p-6 flex flex-col items-center h-full hover:shadow-2xl transition-shadow duration-200 cursor-pointer">
        <div className="event-image w-full h-48 rounded-lg overflow-hidden mb-4 relative">
          {event.thumbnailUrl ? (
            <Image
              src={event.thumbnailUrl}
              alt={event.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
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
      </div>
    </Link>
  );
}