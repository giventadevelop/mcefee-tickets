"use client";

import React, { useState, useEffect } from 'react';
import type { EventDetailsDTO, EventTypeDetailsDTO, EventCalendarEntryDTO } from '@/types';
import { FaEdit, FaTrashAlt, FaUpload, FaCalendarDay, FaChevronLeft, FaChevronRight, FaPhotoVideo, FaTicketAlt } from 'react-icons/fa';
import { Modal } from './Modal';
import { getTenantId } from '@/lib/env';
import { formatDateLocal } from '@/lib/date';
import Link from 'next/link';
import ReactDOM from 'react-dom';

interface EventListProps {
  events: EventDetailsDTO[];
  eventTypes: EventTypeDetailsDTO[];
  calendarEvents?: EventCalendarEntryDTO[];
  onEdit: (event: EventDetailsDTO) => void;
  onCancel: (event: EventDetailsDTO) => void;
  loading?: boolean;
  showDetailsOnHover?: boolean;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  page?: number;
  totalCount?: number;
  pageSize?: number;
  boldEventIdLabel?: boolean;
}

export function EventList({
  events,
  eventTypes: eventTypesProp,
  calendarEvents: calendarEventsProp = [],
  onEdit,
  onCancel,
  loading,
  showDetailsOnHover = false,
  onPrevPage,
  onNextPage,
  page = 1,
  totalCount = 0,
  pageSize = 10,
  boldEventIdLabel = false
}: EventListProps) {
  const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<EventCalendarEntryDTO[]>(calendarEventsProp);
  const [eventTypes, setEventTypes] = useState<EventTypeDetailsDTO[]>(eventTypesProp || []);
  const [showTicketTypeModal, setShowTicketTypeModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [tooltipEvent, setTooltipEvent] = useState<EventDetailsDTO | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Use provided calendar events or fetch if not provided
    if (calendarEventsProp.length > 0) {
      setCalendarEvents(calendarEventsProp);
    } else {
      // Fallback: fetch calendar events if not provided
      const tenantId = getTenantId();
      fetch(`/api/proxy/event-calendar-entries?size=1000&tenantId.equals=${tenantId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setCalendarEvents(Array.isArray(data) ? data : []));
    }
  }, [calendarEventsProp]);

  useEffect(() => {
    // Use provided event types or fetch if not provided
    if (eventTypesProp && eventTypesProp.length > 0) {
      setEventTypes(eventTypesProp);
    } else {
      // Fallback: fetch event types if not provided
      const tenantId = getTenantId();
      fetch(`/api/proxy/event-type-details?tenantId.equals=${tenantId}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setEventTypes(Array.isArray(data) ? data : []));
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

  function EventDetailsTooltip({ event, anchorRect, onClose }: { event: EventDetailsDTO, anchorRect: DOMRect | null, onClose: () => void }) {
    if (!anchorRect) return null;
    if (typeof window === 'undefined' || !document.body) return null;
    const tooltipWidth = 420;
    const spacing = 12;
    let top = anchorRect.top;
    let left = anchorRect.right + spacing;
    const estimatedHeight = 300;
    if (top + estimatedHeight > window.innerHeight) {
      top = window.innerHeight - estimatedHeight - spacing;
    }
    if (top < spacing) {
      top = spacing;
    }
    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - spacing;
    }
    const style: React.CSSProperties = {
      position: 'fixed',
      top,
      left,
      zIndex: 9999,
      background: 'white',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#cbd5e1',
      borderRadius: 12,
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      padding: 16,
      width: tooltipWidth,
      fontSize: 14,
      maxHeight: 400,
      overflowY: 'auto',
      transition: 'opacity 0.1s ease-in-out',
    };
    return ReactDOM.createPortal(
      <div style={style} tabIndex={-1} className="admin-tooltip">
        <div className="sticky top-0 right-0 z-10 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="w-10 h-10 text-2xl bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
            aria-label="Close tooltip"
          >
            &times;
          </button>
        </div>
        <table className="w-full text-sm border border-gray-300">
          <tbody>
            {Object.entries(event).map(([key, value]) => {
              let displayValue: string | number = '';
              if ((key === 'createdBy' || key === 'eventType') && value && typeof value === 'object' && 'id' in value) {
                displayValue = value.id;
              } else if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value);
              } else {
                displayValue = String(value);
              }
              return (
                <tr key={key} className="border-b border-gray-200">
                  <td className="font-bold pr-4 border-r border-gray-200 align-top">{key}:</td>
                  <td className="align-top break-all">{displayValue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>,
      document.body
    );
  }

  if (loading) return <div>Loading events...</div>;
  if (!events.length) return <div>No events found.</div>;

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;

  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = (page - 1) * pageSize + events.length;

  const handleTooltipClose = () => setTooltipEvent(null);

  return (
    <>
      <div className="mb-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-4 py-2">
        Mouse over the first 3 columns to see the full details about the event. Use the × button to close the tooltip once you have viewed the details.
      </div>
      <table
        className="w-full border text-sm relative bg-white rounded shadow-md"
      >
        <thead>
          <tr className="bg-blue-100 font-bold border-b-2 border-blue-300">
            <th className="p-2 border" rowSpan={2}>Title</th>
            <th className="p-2 border" rowSpan={2}>Type</th>
            <th className="p-2 border" rowSpan={2}>Dates</th>
            <th className="p-2 border" rowSpan={2}>Active</th>
            <th className="p-2 border" colSpan={2}>Actions</th>
            <th className="p-2 border" rowSpan={2}>Media</th>
            <th className="p-2 border" rowSpan={2}>Upload</th>
            <th className="p-2 border" rowSpan={2}>Calendar</th>
            <th className="p-2 border" rowSpan={2}>Tickets</th>
          </tr>
          <tr className="bg-blue-50 font-bold border-b border-blue-200">
            <th className="p-2 border text-xs font-bold text-center">Edit/View</th>
            <th className="p-2 border text-xs font-bold text-center">Delete</th>
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
                style={{ position: 'relative' }}
              >
                <td
                  className="p-2 border font-medium align-middle"
                  onMouseEnter={e => {
                    if (showDetailsOnHover) {
                      setTooltipEvent(event);
                      setTooltipAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                    }
                  }}
                >
                  <div className="text-xs text-gray-500" style={boldEventIdLabel ? { fontWeight: 700 } : {}}>
                    {boldEventIdLabel ? <b>Event ID:</b> : 'Event ID:'} {event.id}
                  </div>
                  <div><span className="font-bold">Title:</span> {event.title}</div>
                </td>
                <td
                  className="p-2 border align-middle"
                  onMouseEnter={e => {
                    if (showDetailsOnHover) {
                      setTooltipEvent(event);
                      setTooltipAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                    }
                  }}
                >
                  {getEventTypeName(event) || <span className="text-gray-400 italic">Unknown</span>}
                </td>
                <td
                  className="p-2 border align-middle w-40"
                  onMouseEnter={e => {
                    if (showDetailsOnHover) {
                      setTooltipEvent(event);
                      setTooltipAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                    }
                  }}
                >
                  <div>
                    <span className="font-semibold">{formatDateLocal(event.startDate)}</span> {event.startTime}
                  </div>
                  <div className="text-xs text-gray-500">to</div>
                  <div>
                    <span className="font-semibold">{formatDateLocal(event.endDate)}</span> {event.endTime}
                  </div>
                </td>
                <td className="p-2 border text-center align-middle">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${isActive ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{isActive ? 'Yes' : 'No'}</span>
                </td>
                <td className="p-2 border text-center align-middle">
                  <a
                    href={`/admin/events/${event.id}/edit`}
                    className="flex flex-col items-center text-blue-600 hover:text-blue-800 focus:outline-none inline-block w-full h-full"
                    onClick={(e) => {
                      // Allow default behavior (navigation) but also call onEdit for backward compatibility
                      onEdit(event);
                    }}
                  >
                    <FaEdit className="w-7 h-7" />
                    <span className="text-[10px] text-gray-600 mt-1 block font-bold">Edit/View,<br />Event Details</span>
                  </a>
                </td>
                <td className="p-2 border text-center align-middle">
                  <button className="flex flex-col items-center text-red-600 hover:text-red-800 focus:outline-none" onClick={() => onCancel(event)}>
                    <FaTrashAlt className="w-7 h-7" />
                    <span className="text-[10px] text-gray-600 mt-1 block font-bold">Delete</span>
                  </button>
                </td>
                <td className="p-2 border text-center align-middle">
                  <span className="relative group flex flex-col items-center">
                    <a href={`/admin/events/${event.id}/media/list`} className="inline-block w-full h-full">
                      <FaPhotoVideo className="text-green-600 hover:text-green-800 mx-auto w-7 h-7" />
                      <span className="text-[10px] text-gray-600 mt-1 block font-bold">List Media files</span>
                    </a>
                  </span>
                </td>
                <td className="p-2 border text-center align-middle">
                  <a href={`/admin/events/${event.id}/media`} className="inline-block w-full h-full">
                    <FaUpload className="text-blue-600 hover:text-blue-800 mx-auto w-7 h-7" />
                    <span className="text-[10px] text-gray-600 mt-1 block font-bold">Upload<br />Media Files</span>
                  </a>
                </td>
                <td className="p-2 border text-center align-middle">
                  <span className="relative group flex flex-col items-center">
                    {(() => {
                      let calendarLink = '';
                      if (calendarEvent && calendarEvent.calendarLink) {
                        calendarLink = calendarEvent.calendarLink;
                      } else {
                        // Generate Google Calendar URL on the fly
                        const start = toGoogleCalendarDate(event.startDate, event.startTime);
                        const end = toGoogleCalendarDate(event.endDate, event.endTime);
                        const text = encodeURIComponent(event.title);
                        const details = encodeURIComponent(event.description || '');
                        const location = encodeURIComponent(event.location || '');
                        calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
                      }
                      return (
                        <a href={calendarLink} target="_blank" rel="noopener noreferrer" className="inline-block w-full h-full">
                          <img src="/images/icons8-calendar.gif" alt="Calendar" className="w-7 h-7 rounded shadow mx-auto" />
                          <span className="text-[10px] text-gray-600 mt-1 block">View Calendar</span>
                        </a>
                      );
                    })()}
                  </span>
                </td>
                <td className="p-2 border text-center align-middle">
                  {event.admissionType === 'ticketed' ? (
                    <Link href={`/admin/events/${event.id}/ticket-types/list`} className="inline-block w-full h-full">
                      <FaTicketAlt className="text-blue-600 hover:text-blue-800 mx-auto w-7 h-7" />
                      <span className="text-[10px] text-gray-600 mt-1 block font-bold">Manage<br />Ticket Types</span>
                    </Link>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>

                {showDetailsOnHover && hoveredEventId === event.id && (
                  <td
                    colSpan={8}
                    style={{ position: 'absolute', left: 10, top: '50%', zIndex: 10, width: '100%' }}
                  >
                    <div className="bg-white border rounded shadow-lg p-6 text-xs w-max max-w-2xl mx-auto mt-2 relative max-h-96 overflow-auto">
                      <button
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg font-bold focus:outline-none"
                        onClick={() => setHoveredEventId(null)}
                        aria-label="Close tooltip"
                      >
                        &times;
                      </button>
                      <table className="w-full text-sm border border-gray-300">
                        <tbody>
                          {Object.entries(event).map(([key, value]) => {
                            let displayValue: string | number = '';
                            if ((key === 'createdBy' || key === 'eventType') && value && typeof value === 'object' && 'id' in value) {
                              displayValue = value.id;
                            } else if (typeof value === 'object' && value !== null) {
                              displayValue = JSON.stringify(value);
                            } else {
                              displayValue = String(value);
                            }
                            return (
                              <tr key={key} className="border-b border-gray-200">
                                <td className="font-bold pr-4 border-r border-gray-200 align-top">{key}:</td>
                                <td className="align-top break-all">{displayValue}</td>
                              </tr>
                            );
                          })}
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

      <div className="mt-4">
        <div className="flex justify-between items-center">
          <button
            onClick={onPrevPage}
            disabled={!hasPrevPage}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <FaChevronLeft />
            Previous
          </button>
          <div className="text-sm font-semibold">
            Page {page} of {totalPages}
          </div>
          <button
            onClick={onNextPage}
            disabled={!hasNextPage}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            Next
            <FaChevronRight />
          </button>
        </div>
        <div className="text-center text-sm text-gray-600 mt-2">
          Showing {startItem} to {endItem} of {totalCount} events
        </div>
      </div>

      {tooltipEvent && (
        <EventDetailsTooltip event={tooltipEvent} anchorRect={tooltipAnchor} onClose={handleTooltipClose} />
      )}
    </>
  );
}