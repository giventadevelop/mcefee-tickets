import React, { useState, useEffect } from 'react';
import type { EventDetailsDTO, EventTypeDetailsDTO, EventCalendarEntryDTO } from '@/types';
import { FaEdit, FaTrashAlt, FaUpload, FaCalendarDay, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { TicketTypeManager } from './TicketTypeManager';
import { Modal } from './Modal';
import { getTenantId } from '@/lib/env';

interface EventListProps {
  events: EventDetailsDTO[];
  eventTypes: EventTypeDetailsDTO[];
  onEdit: (event: EventDetailsDTO) => void;
  onCancel: (event: EventDetailsDTO) => void;
  loading?: boolean;
  showDetailsOnHover?: boolean;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  page?: number;
  hasNextPage?: boolean;
}

export function EventList({ events, eventTypes: eventTypesProp, onEdit, onCancel, loading, showDetailsOnHover = false, onPrevPage, onNextPage, page, hasNextPage }: EventListProps) {
  const [hoveredEventId, setHoveredEventId] = useState<number | undefined>(undefined);
  const [calendarEvents, setCalendarEvents] = useState<EventCalendarEntryDTO[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeDetailsDTO[]>(eventTypesProp || []);
  const [showTicketTypeModal, setShowTicketTypeModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch all calendar events for quick lookup
    const tenantId = getTenantId();
    fetch(`/api/proxy/event-calendar-entries?size=1000&tenantId.equals=${tenantId}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setCalendarEvents(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    const tenantId = getTenantId();
    if (!eventTypesProp || eventTypesProp.length === 0) {
      fetch(`/api/proxy/event-type-details?tenantId.equals=${tenantId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setEventTypes(Array.isArray(data) ? data : []));
    } else {
      setEventTypes(eventTypesProp);
    }
  }, [eventTypesProp]);

  function getEventTypeName(event: EventDetailsDTO) {
    if (event?.eventType?.name) return event.eventType.name;
    if (event?.eventType?.id != null) {
      const found = eventTypes.find(et => et.id === event.eventType?.id);
      if (found) return found.name;
    }
    return '';
  }

  function getCalendarEventForEvent(eventId?: number) {
    if (!eventId) return undefined;
    return calendarEvents.find(ce => ce.event && ce.event.id === eventId);
  }

  if (loading) return <div>Loading events...</div>;
  if (!events.length) return <div>No events found.</div>;

  return (
    <>
      <table
        className="w-full border text-sm relative bg-white rounded shadow-md"
        onMouseLeave={() => setHoveredEventId(undefined)}
      >
        <thead>
          <tr className="bg-blue-100 font-bold border-b-2 border-blue-300">
            <th className="p-2 border">Title</th>
            <th className="p-2 border">Type</th>
            <th className="p-2 border">Start</th>
            <th className="p-2 border">End</th>
            <th className="p-2 border">Active</th>
            <th className="p-2 border">Actions</th>
            <th className="p-2 border">Media</th>
            <th className="p-2 border">Calendar</th>
            <th className="p-2 border">Tickets</th>
          </tr>
        </thead>
        <tbody>
          {events.map(event => {
            const isActive = !!event.isActive;
            const rowBg = isActive ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100';
            const calendarEvent = getCalendarEventForEvent(event.id);
            return (
              <tr
                key={event.id}
                className={`${rowBg} transition-colors duration-150 border-b border-gray-300`}
                onMouseEnter={() => showDetailsOnHover && setHoveredEventId(event.id)}
                onMouseLeave={() => setHoveredEventId(undefined)}
                style={{ position: 'relative' }}
              >
                <td className="p-2 border font-medium align-middle">{event.title}</td>
                <td className="p-2 border align-middle">{getEventTypeName(event) || <span className="text-gray-400 italic">Unknown</span>}</td>
                <td className="p-2 border align-middle w-32">{event.startDate} {event.startTime}</td>
                <td className="p-2 border align-middle w-32">{event.endDate} {event.endTime}</td>
                <td className="p-2 border text-center align-middle">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${isActive ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{isActive ? 'Yes' : 'No'}</span>
                </td>
                <td className="p-2 border align-middle">
                  <div className="flex gap-4 items-center justify-center">
                    <button className="relative group flex flex-col items-center text-blue-600 hover:text-blue-800 focus:outline-none" onClick={() => onEdit(event)}>
                      <FaEdit />
                      <span className="text-[10px] text-gray-600 mt-1">Edit</span>
                    </button>
                    <button className="relative group flex flex-col items-center text-red-600 hover:text-red-800 focus:outline-none" onClick={() => onCancel(event)}>
                      <FaTrashAlt />
                      <span className="text-[10px] text-gray-600 mt-1">Delete</span>
                    </button>
                  </div>
                </td>
                <td className="p-2 border text-center align-middle">
                  <span className="relative group flex flex-col items-center">
                    <a href={`/admin/events/${event.id}/media`} className="inline-block w-full h-full">
                      <FaUpload className="text-green-600 hover:text-green-800 mx-auto" />
                      <span className="text-[10px] text-gray-600 mt-1 block">List or upload media files</span>
                    </a>
                  </span>
                </td>
                <td className="p-2 border text-center align-middle">
                  <span className="relative group flex flex-col items-center">
                    {calendarEvent && calendarEvent.calendarLink ? (
                      <a href={calendarEvent.calendarLink} target="_blank" rel="noopener noreferrer" className="inline-block w-full h-full">
                        <img src="/images/icons8-calendar.gif" alt="Calendar" className="w-7 h-7 rounded shadow mx-auto" />
                        <span className="text-[10px] text-gray-600 mt-1 block">View Calendar</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 cursor-not-allowed inline-block">
                        <img src="/images/icons8-calendar.gif" alt="Calendar" className="w-7 h-7 rounded shadow opacity-50 mx-auto" />
                        <span className="text-[10px] text-gray-600 mt-1 block">View Calendar</span>
                      </span>
                    )}
                  </span>
                </td>
                <td className="p-2 border text-center align-middle">
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-700 text-xs"
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setShowTicketTypeModal(true);
                    }}
                  >
                    Manage Ticket Types
                  </button>
                </td>
                {showDetailsOnHover && hoveredEventId === event.id && (
                  <td
                    colSpan={8}
                    style={{ position: 'absolute', left: 10, top: '100%', zIndex: 10, width: '100%' }}
                    onMouseLeave={() => setHoveredEventId(undefined)}
                  >
                    <div className="bg-white border rounded shadow-lg p-6 text-xs w-max max-w-2xl mx-auto mt-2 relative">
                      <button
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg font-bold focus:outline-none"
                        onClick={() => setHoveredEventId(undefined)}
                        aria-label="Close tooltip"
                      >
                        &times;
                      </button>
                      <table className="w-full text-sm border border-gray-300">
                        <tbody>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">ID:</td><td>{event.id}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Title:</td><td>{event.title}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Type:</td><td>{getEventTypeName(event)}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Start:</td><td>{event.startDate} {event.startTime}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">End:</td><td>{event.endDate} {event.endTime}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Active:</td><td>{isActive ? 'Yes' : 'No'}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Caption:</td><td>{event.caption}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Description:</td><td>{event.description}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Location:</td><td>{event.location}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Directions:</td><td>{event.directionsToVenue}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Capacity:</td><td>{event.capacity}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Admission Type:</td><td>{event.admissionType}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Created At:</td><td>{event.createdAt}</td></tr>
                          <tr className="border-b border-gray-200"><td className="font-bold pr-4 border-r border-gray-200">Updated At:</td><td>{event.updatedAt}</td></tr>
                          <tr><td className="font-bold pr-4 border-r border-gray-200">Created By:</td><td>{event.createdBy?.userId}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Modal for TicketTypeManager, rendered outside any form */}
      {showTicketTypeModal && selectedEventId && (
        <Modal open={showTicketTypeModal} onClose={() => setShowTicketTypeModal(false)}>
          <div className="p-4">
            <h2 className="text-lg font-bold mb-2">Manage Ticket Types</h2>
            <TicketTypeManager eventId={selectedEventId} />
          </div>
        </Modal>
      )}
      {/* Pagination controls if provided */}
      {(onPrevPage || onNextPage) && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={onPrevPage}
            disabled={!onPrevPage || (page === 0)}
            className="flex flex-col items-center justify-center w-16 h-12 rounded bg-blue-600 text-white font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors shadow text-base"
          >
            <FaChevronLeft className="mb-1 text-lg" />
            <span className="text-xs px-4">Previous</span>
          </button>
          <span className="font-bold">Page {typeof page === 'number' ? page + 1 : ''}</span>
          <button
            onClick={onNextPage}
            disabled={!onNextPage || !hasNextPage}
            className="flex flex-col items-center justify-center w-16 h-12 rounded bg-blue-600 text-white font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors shadow text-base"
          >
            <FaChevronRight className="mb-1 text-lg" />
            <span className="text-xs px-4">Next</span>
          </button>
        </div>
      )}
    </>
  );
}