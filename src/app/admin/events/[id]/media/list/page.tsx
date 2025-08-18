"use client";
import React, { useRef, useState, useEffect, useCallback, useTransition } from "react";
import { EventMediaDTO, EventDetailsDTO } from "@/types";
import { FaEdit, FaTrashAlt, FaUsers, FaPhotoVideo, FaCalendarAlt, FaSave, FaTimes, FaChevronLeft, FaChevronRight, FaTicketAlt, FaUpload, FaBan, FaTags, FaHome } from 'react-icons/fa';
import { deleteMediaServer, editMediaServer, fetchMediaFilteredServer } from '../ApiServerActions';
import { fetchEventDetailsServer } from '@/app/admin/ApiServerActions';
import { createPortal } from "react-dom";
import Link from 'next/link';
import { useRouter, useParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import { getTenantId } from '@/lib/env';
import { formatInTimeZone } from 'date-fns-tz';

// Helper function for timezone-aware date formatting
function formatDateInTimezone(dateString: string, timezone: string = 'America/New_York'): string {
  if (!dateString) return 'N/A';
  try {
    return formatInTimeZone(dateString, timezone, 'EEEE, MMMM d, yyyy');
  } catch {
    // Fallback to simple date formatting if timezone parsing fails
    return new Date(dateString).toLocaleDateString();
  }
}

// Tooltip component (reuse from MediaClientPage)
function MediaDetailsTooltip({ media, anchorRect, onClose, onTooltipMouseEnter, onTooltipMouseLeave, tooltipType }: { media: EventMediaDTO | null, anchorRect: DOMRect | null, onClose: () => void, onTooltipMouseEnter: () => void, onTooltipMouseLeave: () => void, tooltipType: 'officialDocs' | 'uploadedMedia' | null }) {
  if (!media || !anchorRect) return null;
  const entries = Object.entries(media).filter(([key]) => key !== 'fileUrl' && key !== 'preSignedUrl');
  const tooltipWidth = 480;
  const thWidth = 168;
  // Always show tooltip to the right of the anchor cell, never above the columns
  const spacing = 8;
  let top = anchorRect.top;
  let left = anchorRect.right + spacing;
  // Clamp position to stay within the viewport
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
    width: tooltipWidth,
    maxWidth: 480,
    maxHeight: 320,
    overflowY: 'auto',
    pointerEvents: 'auto',
    background: '#fff',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    fontSize: 15,
    padding: 16,
    paddingBottom: 16,
  };
  return createPortal(
    <div
      className="admin-tooltip"
      style={style}
      tabIndex={-1}
      onMouseEnter={onTooltipMouseEnter}
      onMouseLeave={onTooltipMouseLeave}
    >
      {/* Sticky, always-visible close button */}
      <div className="sticky top-0 right-0 z-10 bg-white flex justify-end">
        <button
          onClick={onClose}
          className="w-10 h-10 text-2xl bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          aria-label="Close tooltip"
        >
          &times;
        </button>
      </div>
      <table className="admin-tooltip-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <th style={{ textAlign: 'left', width: thWidth, minWidth: thWidth, maxWidth: thWidth, fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal', boxSizing: 'border-box' }}>{key}</th>
              <td style={{ textAlign: 'left', width: 'auto' }}>{
                typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                  value instanceof Date ? value.toLocaleString() :
                    (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) && value ? formatDateInTimezone(value, 'America/New_York') :
                      value === null || value === undefined || value === '' ? <span className="text-gray-400 italic">(empty)</span> : String(value)
              }</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>,
    document.body
  );
}

function EventDetailsTable({ event }: { event: EventDetailsDTO | null }) {
  if (!event) {
    return null;
  }

  const details = [
    { label: 'Event ID', value: event.id },
    { label: 'Title', value: event.title },
    { label: 'Start Date', value: formatDateInTimezone(event.startDate, event.timezone) },
    { label: 'End Date', value: formatDateInTimezone(event.endDate, event.timezone) },
    { label: 'Start Time', value: event.startTime || 'N/A' },
    { label: 'End Time', value: event.endTime || 'N/A' },
    { label: 'Description', value: event.description },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            {details.map((detail, index) => (
              <tr key={index} className="bg-blue-50 odd:bg-blue-100">
                <td className="px-6 py-3 w-1/4 text-sm font-semibold text-gray-800">{detail.label}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{detail.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface EditMediaModalProps {
  media: EventMediaDTO;
  onClose: () => void;
  onSave: (updated: Partial<EventMediaDTO>) => void;
  loading: boolean;
}

type MediaCheckboxName = 'isPublic' | 'eventFlyer' | 'isEventManagementOfficialDocument' | 'isFeaturedImage' | 'isHeroImage' | 'isActiveHeroImage' | 'isFeaturedVideo';

function EditMediaModal({ media, onClose, onSave, loading }: EditMediaModalProps) {
  const [form, setForm] = useState<Partial<EventMediaDTO>>(() => ({
    ...media,
    isPublic: Boolean(media.isPublic),
    eventFlyer: Boolean(media.eventFlyer),
    isEventManagementOfficialDocument: Boolean(media.isEventManagementOfficialDocument),
    isFeaturedImage: Boolean(media.isFeaturedImage),
    isHeroImage: Boolean(media.isHeroImage),
    isActiveHeroImage: Boolean(media.isActiveHeroImage),
    isFeaturedVideo: Boolean(media.isFeaturedVideo),
    featuredVideoUrl: media.featuredVideoUrl || '',
  }));

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    try {
      const payload = {
        ...form,
        updatedAt: new Date().toISOString(),
        ...Object.fromEntries(
          Object.entries(form)
            .filter(([_, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, typeof v === 'boolean' ? Boolean(v) : v])
        ),
      };
      await onSave(payload);
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  }, [form, onSave, loading]);

  const handleCheckboxChange = useCallback((name: MediaCheckboxName) => {
    setForm(prev => {
      const newValue = !prev[name];
      let updates: Partial<EventMediaDTO> = { [name]: newValue };

      if (name === 'isHeroImage' && !newValue) {
        updates.isActiveHeroImage = false;
      }
      if (name === 'isActiveHeroImage' && newValue) {
        updates.isHeroImage = true;
      }
      if (name === 'isEventManagementOfficialDocument' && newValue) {
        updates.eventFlyer = false;
        updates.isFeaturedImage = false;
      }
      if ((name === 'eventFlyer' || name === 'isFeaturedImage') && newValue) {
        updates.isEventManagementOfficialDocument = false;
      }
      if (name === 'isFeaturedVideo' && !newValue) {
        updates.featuredVideoUrl = '';
      }
      return { ...prev, ...updates };
    });
  }, []);

  return (
    <Modal open={true} onClose={onClose} title="Edit Media">
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={form.title || ''}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={form.description || ''}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="altText">
              Alt Text
            </label>
            <input
              id="altText"
              type="text"
              value={form.altText || ''}
              onChange={(e) => setForm(prev => ({ ...prev, altText: e.target.value }))}
              className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
            />
          </div>

          {form.isFeaturedVideo && (
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="featuredVideoUrl">
                Featured Video URL
              </label>
              <input
                id="featuredVideoUrl"
                type="text"
                value={form.featuredVideoUrl || ''}
                onChange={(e) => setForm(prev => ({ ...prev, featuredVideoUrl: e.target.value }))}
                className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}

          <div className="border border-gray-200 rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-700">
              Media Properties
            </label>
            <div className="custom-grid-table mt-4 p-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[
                { name: 'isPublic' as const, label: 'Public' },
                { name: 'eventFlyer' as const, label: 'Event Flyer' },
                { name: 'isEventManagementOfficialDocument' as const, label: 'Official Doc' },
                { name: 'isFeaturedImage' as const, label: 'Featured Image' },
                { name: 'isHeroImage' as const, label: 'Hero Image' },
                { name: 'isActiveHeroImage' as const, label: 'Active Hero' },
                { name: 'isFeaturedVideo' as const, label: 'Featured Video' },
              ].map(({ name, label }) => (
                <label key={name} className="flex flex-col items-center">
                  <span className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={Boolean(form[name])}
                      onChange={() => handleCheckboxChange(name)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="custom-checkbox-tick">
                      {Boolean(form[name]) && (
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-teal-100 hover:bg-teal-200 text-teal-800 px-4 py-2 rounded-md flex items-center gap-2"
            disabled={loading}
          >
            <FaBan />
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
            disabled={loading}
          >
            <FaSave />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function EventMediaListPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params ? (params.id as string) : null;

  const [media, setMedia] = useState<EventMediaDTO[]>([]);
  const [eventDetails, setEventDetails] = useState<EventDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMedia, setEditMedia] = useState<EventMediaDTO | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<EventMediaDTO | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [page, setPage] = useState(0);
  const [pageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFlyerOnly, setEventFlyerOnly] = useState(false);
  const totalPages = Math.ceil(totalCount / pageSize);

  const [activeTooltip, setActiveTooltip] = useState<{ media: EventMediaDTO, type: 'officialDocs' | 'uploadedMedia' } | null>(null);
  const [tooltipAnchorRect, setTooltipAnchorRect] = useState<DOMRect | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [isCellHovered, setIsCellHovered] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      async function fetchData() {
        if (!eventId) return;
        setLoading(true);
        try {
          const details = await fetchEventDetailsServer(parseInt(eventId, 10));
          setEventDetails(details);

          const mediaResponse = await fetchMediaFilteredServer(eventId, page, pageSize, searchTerm, eventFlyerOnly);
          setMedia(mediaResponse.data);
          setTotalCount(mediaResponse.totalCount);

        } catch (err: any) {
          setError(err.message || 'Failed to fetch data.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
      fetchData();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [eventId, page, pageSize, searchTerm, eventFlyerOnly]);

  function handleCellMouseEnter(media: EventMediaDTO, e: React.MouseEvent<HTMLTableCellElement>, type: 'officialDocs' | 'uploadedMedia') {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setIsCellHovered(true);
    setTooltipAnchorRect(e.currentTarget.getBoundingClientRect());
    setActiveTooltip({ media, type });
  }

  function handleCellMouseLeave() {
    setIsCellHovered(false);
    tooltipTimeoutRef.current = setTimeout(() => {
      if (!isTooltipHovered) {
        setActiveTooltip(null);
      }
    }, 200);
  }

  function handleTooltipMouseEnter() {
    setIsTooltipHovered(true);
  }

  function handleTooltipMouseLeave() {
    setIsTooltipHovered(false);
    setActiveTooltip(null);
  }

  const handleEditClick = (media: EventMediaDTO) => {
    setEditMedia(media);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditMedia(null);
  };

  const handleSave = async (updated: Partial<EventMediaDTO>) => {
    if (!editMedia || !editMedia.id) return;
    setEditLoading(true);
    try {
      const result = await editMediaServer(editMedia.id, updated);
      setMedia(prev => prev.map(m => m.id === editMedia.id ? { ...m, ...result } : m));
      handleCloseModal();
    } catch (error: any) {
      console.error('Failed to save media:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (media: EventMediaDTO) => {
    setDeletingMedia(media);
  };

  const confirmDelete = async () => {
    if (!deletingMedia) return;
    startTransition(async () => {
      try {
        await deleteMediaServer(deletingMedia.id!);
        setMedia(prev => prev.filter(m => m.id !== deletingMedia.id));
        setDeletingMedia(null);
      } catch (error: any) {
        alert(`Failed to delete media: ${error.message}`);
        setDeletingMedia(null);
      }
    });
  };

  const sortedMedia = media.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  const handleNextPage = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className="w-[80%] mx-auto py-8" style={{ paddingTop: '118px' }}>
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 justify-items-center mx-auto max-w-6xl">
            <Link href="/admin" className="w-full max-w-xs flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200">
              <FaHome className="text-lg sm:text-xl mb-2" />
              <span className="font-semibold text-center leading-tight">Admin Home</span>
            </Link>
            <Link href="/admin/manage-usage" className="w-full max-w-xs flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200">
              <FaUsers className="text-lg sm:text-xl mb-2" />
              <span className="font-semibold text-center leading-tight">Manage Users [Usage]</span>
            </Link>
            <Link href="/admin" className="w-full max-w-xs flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200">
              <FaCalendarAlt className="text-lg sm:text-xl mb-2" />
              <span className="font-semibold text-center leading-tight">Manage Events</span>
            </Link>
            {eventDetails?.admissionType === 'ticketed' && (
              <>
                <Link href={`/admin/events/${eventId}/ticket-types/list`} className="w-full max-w-xs flex flex-col items-center justify-center bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200">
                  <FaTags className="text-lg sm:text-xl mb-2" />
                  <span className="font-semibold text-center leading-tight">Manage Ticket Types</span>
                </Link>
                <Link href={`/admin/events/${eventId}/tickets/list`} className="w-full max-w-xs flex flex-col items-center justify-center bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg shadow-sm hover:shadow-md p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200">
                  <FaTicketAlt className="text-lg sm:text-xl mb-2" />
                  <span className="font-semibold text-center leading-tight">Manage Tickets</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Media Files for Event</h1>
        <div className="flex space-x-2">
          <Link href={`/admin/events/${eventId}/media`} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2">
            <FaUpload />
            Upload New Media
          </Link>
        </div>
      </div>

      <EventDetailsTable event={eventDetails} />

      <div className="mb-8 bg-white p-4 rounded-lg shadow-md flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by media title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="relative flex items-center justify-center">
            <input
              type="checkbox"
              className="custom-checkbox"
              checked={eventFlyerOnly}
              onChange={(e) => setEventFlyerOnly(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="custom-checkbox-tick">
              {eventFlyerOnly && (
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                </svg>
              )}
            </span>
          </span>
          <span className="text-sm font-medium text-gray-700 select-none">Event Flyers Only</span>
        </label>
      </div>

      <div className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
        Mouse over an image to see the full details. Use the × button to close the tooltip.
      </div>

      {loading && <div className="text-center p-8">Loading media...</div>}
      {!loading && sortedMedia.length === 0 && <div className="text-center p-8">No media found for this event.</div>}
      {!loading && sortedMedia.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedMedia.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden group flex flex-col justify-between">
              <div>
                <div
                  className="relative h-48 bg-gray-200 cursor-pointer"
                  onMouseEnter={(e) => handleCellMouseEnter(item, e as any, 'uploadedMedia')}
                  onMouseLeave={handleCellMouseLeave}
                >
                  {item.fileUrl && (
                    <img
                      src={item.fileUrl.startsWith('http') ? item.fileUrl : `https://placehold.co/600x400?text=${item.title}`}
                      alt={item.altText || item.title || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `https://placehold.co/600x400?text=No+Image`;
                      }}
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg truncate" title={item.title || ''}>{item.title}</h3>
                  <p className="text-gray-600 text-sm h-10 overflow-hidden" title={item.description || ''}>{item.description}</p>
                </div>
              </div>
              <div className="p-4 pt-0 flex justify-end space-x-2">
                <button
                  onClick={() => handleEditClick(item)}
                  className="text-blue-500 hover:text-blue-700 p-2 rounded-full"
                  aria-label="Edit Media"
                >
                  <FaEdit size={20} />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="text-red-500 hover:text-red-700 p-2 rounded-full"
                  aria-label="Delete Media"
                >
                  <FaTrashAlt size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && totalCount > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevPage}
              disabled={page === 0}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <FaChevronLeft />
              Previous
            </button>
            <div className="text-sm font-semibold text-gray-700">
              Page {page + 1} of {totalPages}
            </div>
            <button
              onClick={handleNextPage}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              Next
              <FaChevronRight />
            </button>
          </div>
          <div className="text-center text-sm text-gray-600 mt-2">
            Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalCount}</span> results
          </div>
        </div>
      )}

      {deletingMedia && (
        <Modal open={!!deletingMedia} onClose={() => setDeletingMedia(null)} title="Confirm Deletion">
          <div className="text-center">
            <p className="text-lg">
              Are you sure you want to delete this media item: <strong>{deletingMedia.title}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => setDeletingMedia(null)}
                className="bg-teal-100 hover:bg-teal-200 text-teal-800 px-4 py-2 rounded-md flex items-center gap-2"
                disabled={isPending}
              >
                <FaBan /> Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                disabled={isPending}
              >
                <FaTrashAlt /> {isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {isEditModalOpen && editMedia && (
        <EditMediaModal
          media={editMedia}
          onClose={handleCloseModal}
          onSave={handleSave}
          loading={editLoading}
        />
      )}
      <MediaDetailsTooltip
        media={activeTooltip?.media || null}
        anchorRect={tooltipAnchorRect}
        onClose={() => setActiveTooltip(null)}
        onTooltipMouseEnter={handleTooltipMouseEnter}
        onTooltipMouseLeave={handleTooltipMouseLeave}
        tooltipType={activeTooltip?.type || null}
      />
    </div>
  );
}