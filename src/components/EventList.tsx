import React from 'react';
import type { EventDTO, EventTypeDTO } from '@/types';

interface EventListProps {
  events: EventDTO[];
  eventTypes: EventTypeDTO[];
  onEdit: (event: EventDTO) => void;
  onCancel: (event: EventDTO) => void;
  loading?: boolean;
}

export function EventList({ events, eventTypes, onEdit, onCancel, loading }: EventListProps) {
  function getEventTypeName(id: number) {
    return eventTypes.find(et => et.id === id)?.name || 'Unknown';
  }

  if (loading) return <div>Loading events...</div>;
  if (!events.length) return <div>No events found.</div>;

  return (
    <table className="w-full border text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 border">Title</th>
          <th className="p-2 border">Type</th>
          <th className="p-2 border">Start</th>
          <th className="p-2 border">End</th>
          <th className="p-2 border">Active</th>
          <th className="p-2 border">Actions</th>
        </tr>
      </thead>
      <tbody>
        {events.map(event => (
          <tr key={event.id} className={event.is_active ? '' : 'bg-gray-50 text-gray-400'}>
            <td className="p-2 border font-medium">{event.title}</td>
            <td className="p-2 border">{getEventTypeName(event.event_type_id)}</td>
            <td className="p-2 border">{event.start_date} {event.start_time}</td>
            <td className="p-2 border">{event.end_date} {event.end_time}</td>
            <td className="p-2 border text-center">{event.is_active ? 'Yes' : 'No'}</td>
            <td className="p-2 border flex gap-2">
              <button className="text-blue-600 underline" onClick={() => onEdit(event)}>Edit</button>
              {event.is_active && (
                <button className="text-red-600 underline" onClick={() => onCancel(event)}>Cancel</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}