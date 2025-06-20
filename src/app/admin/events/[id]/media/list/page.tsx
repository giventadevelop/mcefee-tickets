"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { EventMediaDTO, EventDetailsDTO } from "@/types";
import { FaEdit, FaTrashAlt, FaUsers, FaPhotoVideo, FaCalendarAlt, FaSave, FaTimes } from 'react-icons/fa';
import { deleteMediaServer, editMediaServer } from '../ApiServerActions';
import { createPortal } from "react-dom";
import Link from 'next/link';
import { useRouter, useParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import { getTenantId } from '@/lib/env';

// Tooltip component (reuse from MediaClientPage)
function MediaDetailsTooltip({ media, anchorRect, onClose, onTooltipMouseEnter, onTooltipMouseLeave, tooltipType }: { media: EventMediaDTO | null, anchorRect: DOMRect | null, onClose: () => void, onTooltipMouseEnter: () => void, onTooltipMouseLeave: () => void, tooltipType: 'officialDocs' | 'uploadedMedia' | null }) {
  if (!media || !anchorRect) return null;
  const entries = Object.entries(media).filter(([key]) => key !== 'fileUrl' && key !== 'preSignedUrl');
  const tooltipWidth = 400;
  const style: React.CSSProperties = {
    position: 'fixed',
    top: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    minWidth: tooltipWidth,
    maxWidth: '90vw',
    maxHeight: '40vh',
    overflowY: 'auto',
    pointerEvents: 'auto',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '0.75rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    fontSize: '0.95rem',
    padding: '1rem',
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
      <button
        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg font-bold focus:outline-none"
        onClick={onClose}
        aria-label="Close tooltip"
        style={{ position: 'absolute', top: 8, right: 12 }}
      >
        &times;
      </button>
      <table className="admin-tooltip-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <th style={{ textAlign: 'left', width: 140, minWidth: 140, maxWidth: 140, fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal', boxSizing: 'border-box' }}>{key}</th>
              <td style={{ textAlign: 'left', width: 'auto' }}>{
                typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                  value instanceof Date ? value.toLocaleString() :
                    (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) && value ? new Date(value).toLocaleString() :
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

    // Prevent double submission
    if (loading) return;

    try {
      console.log('Form submitted with values:', form);

      // Clean up the payload
      const payload = {
        ...form,
        updatedAt: new Date().toISOString(),
        // Remove any undefined/null values
        ...Object.fromEntries(
          Object.entries(form)
            .filter(([_, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, typeof v === 'boolean' ? Boolean(v) : v])
        ),
      };

      console.log('Submitting payload:', payload);
      await onSave(payload);
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  }, [form, onSave, loading]);

  const handleCheckboxChange = useCallback((name: MediaCheckboxName) => {
    setForm(prev => {
      const newValue = !prev[name];
      console.log(`Toggling ${name} from ${prev[name]} to ${newValue}`);
      // Special handling for related checkboxes
      let updates: Partial<EventMediaDTO> = { [name]: newValue };

      // If turning off isHeroImage, also turn off isActiveHeroImage
      if (name === 'isHeroImage' && !newValue) {
        updates.isActiveHeroImage = false;
      }
      // If turning on isActiveHeroImage, also turn on isHeroImage
      if (name === 'isActiveHeroImage' && newValue) {
        updates.isHeroImage = true;
      }
      // If turning on isEventManagementOfficialDocument, turn off eventFlyer and isFeaturedImage
      if (name === 'isEventManagementOfficialDocument' && newValue) {
        updates.eventFlyer = false;
        updates.isFeaturedImage = false;
      }
      // If turning on eventFlyer or isFeaturedImage, turn off isEventManagementOfficialDocument
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Media Properties
            </label>
            <div className="custom-grid-table mt-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
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

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center px-6 py-2.5 bg-teal-100 text-teal-800 hover:bg-teal-200 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <FaTimes className="mr-2" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              'Saving...'
            ) : (
              <>
                <FaSave className="mr-2" />
                Save
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function EventMediaListPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const [eventDetails, setEventDetails] = useState<EventDetailsDTO | null>(null);
  const [mediaList, setMediaList] = useState<EventMediaDTO[]>([]);
  const [officialDocsList, setOfficialDocsList] = useState<EventMediaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMedia, setEditMedia] = useState<EventMediaDTO | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tooltipMedia, setTooltipMedia] = useState<EventMediaDTO | null>(null);
  const [tooltipAnchorRect, setTooltipAnchorRect] = useState<DOMRect | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [tooltipType, setTooltipType] = useState<'officialDocs' | 'uploadedMedia' | null>(null);
  // Pagination and filter state
  const [mediaPage, setMediaPage] = useState(0);
  const mediaPageSize = 10;
  const [showOnlyEventFlyers, setShowOnlyEventFlyers] = useState(false);
  const [officialDocsPage, setOfficialDocsPage] = useState(0);
  const officialDocsPageSize = 10;
  // Search/filter state for media
  const [searchField, setSearchField] = useState<'title' | 'type'>('title');
  const [searchTitle, setSearchTitle] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [sort, setSort] = useState<'uploadedAt,desc' | 'uploadedAt,asc' | 'title,asc' | 'title,desc' | 'type,asc' | 'type,desc'>('uploadedAt,desc');

  // Fetch event details and media
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [eventRes, mediaRes] = await Promise.all([
          fetch(`/api/proxy/event-details/${eventId}`),
          fetch(`/api/proxy/event-medias?eventId.equals=${eventId}&size=1000`),
        ]);
        if (!eventRes.ok) throw new Error('Failed to fetch event details');
        if (!mediaRes.ok) throw new Error('Failed to fetch media files');
        const eventData = await eventRes.json();
        const mediaData = await mediaRes.json();
        setEventDetails(eventData);
        const allMedia = Array.isArray(mediaData) ? mediaData : [mediaData];
        setMediaList(allMedia.filter((m: EventMediaDTO) => !m.isEventManagementOfficialDocument));
        setOfficialDocsList(allMedia.filter((m: EventMediaDTO) => m.isEventManagementOfficialDocument));
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    if (eventId) fetchData();
  }, [eventId]);

  // Tooltip handlers
  function handleCellMouseEnter(media: EventMediaDTO, e: React.MouseEvent<HTMLTableCellElement>, type: 'officialDocs' | 'uploadedMedia') {
    setTooltipMedia(media);
    setTooltipAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
    setIsTooltipHovered(true);
    setTooltipType(type);
  }
  function handleCellMouseLeave() {
    setIsTooltipHovered(false);
  }
  useEffect(() => {
    if (!isTooltipHovered) {
      setTooltipMedia(null);
      setTooltipAnchorRect(null);
    }
  }, [isTooltipHovered]);

  // Ensure state updates are batched
  const handleEditClick = useCallback((media: EventMediaDTO) => {
    if (editLoading || deleteLoading) return;
    console.log('Edit icon clicked', media);
    setEditMedia(media);
  }, [editLoading, deleteLoading]);

  const handleEditClose = useCallback(() => {
    if (editLoading) return;
    console.log('Closing edit modal');
    setEditMedia(null);
  }, [editLoading]);

  const handleSaveMedia = useCallback(async (updated: Partial<EventMediaDTO>) => {
    if (!editMedia?.id) return;
    setEditLoading(true);
    setMessage(null); // Clear previous messages

    try {
      console.log('Starting save operation for media:', editMedia.id);

      const cleanedPayload = {
        ...updated,
        eventId: Number(eventId),
        id: editMedia.id,
        isPublic: Boolean(updated.isPublic),
        eventFlyer: Boolean(updated.eventFlyer),
        isEventManagementOfficialDocument: Boolean(updated.isEventManagementOfficialDocument),
        isFeaturedImage: Boolean(updated.isFeaturedImage),
        isHeroImage: Boolean(updated.isHeroImage),
        isActiveHeroImage: Boolean(updated.isActiveHeroImage),
        isFeaturedVideo: Boolean(updated.isFeaturedVideo),
        featuredVideoUrl: updated.featuredVideoUrl || '',
      };

      console.log('Calling editMediaServer with payload:', cleanedPayload);
      const result = await editMediaServer(editMedia.id, cleanedPayload);
      console.log('Save result:', result);

      if (result) {
        const updateList = (prev: EventMediaDTO[]) =>
          prev.map(m => m.id === editMedia.id ? { ...m, ...result } : m);

        setMediaList(updateList);
        setOfficialDocsList(updateList);
        setMessage({ type: 'success', text: 'Media updated successfully' });
        setEditMedia(null);
      } else {
        // Handle cases where result is null or undefined
        throw new Error('Received an empty response from the server.');
      }
    } catch (error) {
      console.error('handleSaveMedia caught an error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage({ type: 'error', text: `Failed to update media: ${errorMessage}` });
    } finally {
      console.log('Finished save attempt, resetting loading state.');
      setEditLoading(false);
    }
  }, [editMedia, eventId, setMessage]);

  const handleDelete = useCallback(async (id: number) => {
    if (editLoading || deleteLoading) return;
    setDeleteLoading(id);
    try {
      await deleteMediaServer(id);
      setMediaList((prev: EventMediaDTO[]) => prev.filter((m: EventMediaDTO) => m.id !== id));
      setOfficialDocsList((prev: EventMediaDTO[]) => prev.filter((m: EventMediaDTO) => m.id !== id));
      setMessage({ type: 'success', text: 'Media deleted successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Delete error: ${err.message}` });
    } finally {
      setDeleteLoading(null);
    }
  }, [editLoading, deleteLoading]);

  // Filtering and sorting logic
  function filterAndSortMedia(list: EventMediaDTO[]) {
    let filtered = list;
    if (searchField === 'title' && searchTitle) {
      filtered = filtered.filter(m => m.title?.toLowerCase().includes(searchTitle.toLowerCase()));
    }
    if (searchField === 'type' && searchType) {
      filtered = filtered.filter(m => m.eventMediaType?.toLowerCase().includes(searchType.toLowerCase()));
    }
    if (searchStartDate) {
      filtered = filtered.filter(m => m.createdAt && m.createdAt >= searchStartDate);
    }
    if (searchEndDate) {
      filtered = filtered.filter(m => m.createdAt && m.createdAt <= searchEndDate + 'T23:59:59');
    }
    // Sorting
    filtered = [...filtered].sort((a, b) => {
      if (sort.startsWith('uploadedAt')) {
        const dir = sort.endsWith('desc') ? -1 : 1;
        return (a.createdAt || '').localeCompare(b.createdAt || '') * dir;
      } else if (sort.startsWith('title')) {
        const dir = sort.endsWith('desc') ? -1 : 1;
        return (a.title || '').localeCompare(b.title || '') * dir;
      } else if (sort.startsWith('type')) {
        const dir = sort.endsWith('desc') ? -1 : 1;
        return (a.eventMediaType || '').localeCompare(b.eventMediaType || '') * dir;
      }
      return 0;
    });
    return filtered;
  }

  const filteredOfficialDocsList = filterAndSortMedia(officialDocsList);
  const filteredMediaList = filterAndSortMedia(showOnlyEventFlyers ? mediaList.filter(m => m.eventFlyer) : mediaList);
  const pagedOfficialDocs = filteredOfficialDocsList.slice(officialDocsPage * officialDocsPageSize, (officialDocsPage + 1) * officialDocsPageSize);
  const hasNextOfficialDocsPage = (officialDocsPage + 1) * officialDocsPageSize < filteredOfficialDocsList.length;
  const pagedMedia = filteredMediaList.slice(mediaPage * mediaPageSize, (mediaPage + 1) * mediaPageSize);
  const hasNextMediaPage = (mediaPage + 1) * mediaPageSize < filteredMediaList.length;

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 justify-center">
            <Link href="/admin/manage-usage" className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg shadow-sm px-4 py-4 transition font-semibold text-sm cursor-pointer">
              <FaUsers className="mb-2 text-2xl" />
              <span>Manage Users [Usage]</span>
            </Link>
            <Link href="/admin" className="flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-700 rounded-lg shadow-sm px-4 py-4 transition font-semibold text-sm cursor-pointer">
              <FaCalendarAlt className="mb-2 text-2xl" />
              Manage Events
            </Link>
          </div>
        </div>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Media Files for Event</h1>
      {eventDetails && (
        <div className="mt-3 mb-2 flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 shadow-sm text-lg font-semibold text-blue-900">
          <div className="mt-2 w-full max-w-2xl">
            <table className="min-w-full border border-blue-200 rounded bg-blue-50 text-xs md:text-sm">
              <tbody>
                <tr>
                  <td className="border border-blue-200 font-semibold text-blue-700 px-3 py-2 w-32">Event ID</td>
                  <td className="border border-blue-200 px-3 py-2 font-mono text-blue-800 bg-blue-100">{eventDetails.id}</td>
                </tr>
                <tr>
                  <td className="border border-blue-200 font-semibold text-blue-700 px-3 py-2">Title</td>
                  <td className="border border-blue-200 px-3 py-2 text-blue-900 bg-blue-100 font-bold">{eventDetails.title}</td>
                </tr>
                <tr>
                  <td className="border border-blue-200 font-semibold text-blue-700 px-3 py-2">Start Date</td>
                  <td className="border border-blue-200 px-3 py-2">{eventDetails.startDate}</td>
                </tr>
                <tr>
                  <td className="border border-blue-200 font-semibold text-blue-700 px-3 py-2">End Date</td>
                  <td className="border border-blue-200 px-3 py-2">{eventDetails.endDate}</td>
                </tr>
                <tr>
                  <td className="border border-blue-200 font-semibold text-blue-700 px-3 py-2">Start Time</td>
                  <td className="border border-blue-200 px-3 py-2">{eventDetails.startTime || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="border border-blue-200 font-semibold text-blue-700 px-3 py-2">End Time</td>
                  <td className="border border-blue-200 px-3 py-2">{eventDetails.endTime || 'N/A'}</td>
                </tr>
                {eventDetails.description && (
                  <tr>
                    <td className="border border-blue-200 font-semibold text-blue-700 px-3 py-2 align-top">Description</td>
                    <td className="border border-blue-200 px-3 py-2 text-blue-800 bg-blue-100 whitespace-pre-line">{eventDetails.description}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}
      {loading ? (
        <div>Loading media files...</div>
      ) : (
        <>
          {/* Filter Section */}
          <div className="flex items-center mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <span className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={showOnlyEventFlyers}
                  onChange={(e) => setShowOnlyEventFlyers(e.target.checked)}
                />
                <span className="custom-checkbox-tick">
                  {showOnlyEventFlyers && (
                    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                    </svg>
                  )}
                </span>
              </span>
              <span className="text-sm font-medium text-gray-700">Show only event flyers</span>
            </label>
          </div>
          {/* Official Documents Table */}
          <div className="mt-8">
            <div className="mb-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-4 py-2">
              Mouse over the first 2 columns (Title, Type) to see full details about the item. Use the × button to close the tooltip.
            </div>
            <h2 className="text-lg font-semibold mb-2">Official Documents</h2>
            {officialDocsList.length === 0 ? (
              <div className="text-gray-500">No official documents uploaded yet.</div>
            ) : (
              <div className="mb-8">
                <table className="w-full border text-sm relative bg-white rounded shadow-md" onClick={(e) => e.stopPropagation()}>
                  <thead>
                    <tr className="bg-blue-100 font-bold border-b-2 border-blue-300">
                      <th className="p-2 border">Title</th>
                      <th className="p-2 border">Type</th>
                      <th className="p-2 border">Preview</th>
                      <th className="p-2 border">Uploaded At</th>
                      <th className="p-2 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedOfficialDocs.map((media) => (
                      <tr key={media.id} className="border-b border-gray-300 relative" onClick={(e) => e.stopPropagation()}>
                        <td
                          className="p-2 border align-middle relative hover:bg-blue-50 cursor-pointer"
                          onMouseEnter={(e) => {
                            if (!(e.target as HTMLElement).closest('button')) {
                              handleCellMouseEnter(media, e, 'officialDocs');
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(e.target as HTMLElement).closest('button')) {
                              handleCellMouseLeave();
                            }
                          }}
                        >
                          {media.title}
                        </td>
                        <td
                          className="p-2 border align-middle relative hover:bg-blue-50 cursor-pointer"
                          onMouseEnter={(e) => {
                            if (!(e.target as HTMLElement).closest('button')) {
                              handleCellMouseEnter(media, e, 'officialDocs');
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(e.target as HTMLElement).closest('button')) {
                              handleCellMouseLeave();
                            }
                          }}
                        >
                          {media.eventMediaType}
                        </td>
                        <td className="p-2 border align-middle text-center relative">
                          {media.fileUrl && media.contentType?.startsWith('image') && (
                            <a href={media.fileUrl} target="_blank" rel="noopener noreferrer">
                              <img src={media.fileUrl} alt={media.title || ''} className="w-16 h-16 object-cover rounded mx-auto" />
                            </a>
                          )}
                          {media.fileUrl && media.contentType?.startsWith('video') && (
                            <a href={media.fileUrl} target="_blank" rel="noopener noreferrer">
                              <video src={media.fileUrl} controls className="w-24 h-16 rounded mx-auto" />
                            </a>
                          )}
                          {media.fileUrl && !media.contentType?.startsWith('image') && !media.contentType?.startsWith('video') && (
                            <a href={media.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              {media.title || media.fileUrl}
                            </a>
                          )}
                        </td>
                        <td className="p-2 border align-middle">{media.createdAt ? new Date(media.createdAt).toLocaleString() : ''}</td>
                        <td
                          className="p-2 border align-middle flex gap-2 items-center justify-center"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <button
                            className="icon-btn icon-btn-edit flex flex-col items-center"
                            title="Edit"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditClick(media);
                            }}
                            disabled={editLoading || deleteLoading === media.id}
                          >
                            <FaEdit className={editLoading && editMedia?.id === media.id ? 'animate-spin' : ''} />
                            <span className="text-[10px] text-gray-600 mt-1">Edit</span>
                          </button>
                          <button
                            className="icon-btn icon-btn-delete flex flex-col items-center"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this media?')) {
                                handleDelete(media.id!);
                              }
                            }}
                            disabled={editLoading || deleteLoading === media.id}
                            title="Delete"
                          >
                            <FaTrashAlt className={deleteLoading === media.id ? 'animate-spin' : ''} />
                            <span className="text-[10px] text-gray-600 mt-1">Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination for official docs */}
                <div className="flex justify-between items-center mt-2">
                  <button
                    className="px-3 py-1 rounded bg-blue-100 border border-blue-300 text-blue-700 disabled:opacity-50"
                    onClick={() => setOfficialDocsPage(p => Math.max(0, p - 1))}
                    disabled={officialDocsPage === 0}
                  >
                    Previous
                  </button>
                  <span>Page {officialDocsPage + 1}</span>
                  <button
                    className="px-3 py-1 rounded bg-blue-100 border border-blue-300 text-blue-700 disabled:opacity-50"
                    onClick={() => setOfficialDocsPage(p => p + 1)}
                    disabled={!hasNextOfficialDocsPage}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Uploaded Media Table */}
          <div className="mt-8">
            <div className="mb-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-4 py-2">
              Mouse over the first 2 columns (Title, Type) to see full details about the item. Use the × button to close the tooltip.
            </div>
            <h2 className="text-lg font-semibold mb-2">Uploaded Media</h2>
            {mediaList.length === 0 ? (
              <div className="text-gray-500">No media uploaded yet.</div>
            ) : (
              <div className="mb-8">
                <table className="w-full border text-sm relative bg-white rounded shadow-md" onClick={(e) => e.stopPropagation()}>
                  <thead>
                    <tr className="bg-green-100 font-bold border-b-2 border-green-300">
                      <th className="p-2 border">Title</th>
                      <th className="p-2 border">Type</th>
                      <th className="p-2 border">Preview</th>
                      <th className="p-2 border">Uploaded At</th>
                      <th className="p-2 border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedMedia.map((media) => (
                      <tr key={media.id} className="border-b border-gray-300 relative" onClick={(e) => e.stopPropagation()}>
                        <td
                          className="p-2 border align-middle relative hover:bg-green-50 cursor-pointer"
                          onMouseEnter={(e) => {
                            if (!(e.target as HTMLElement).closest('button')) {
                              handleCellMouseEnter(media, e, 'uploadedMedia');
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(e.target as HTMLElement).closest('button')) {
                              handleCellMouseLeave();
                            }
                          }}
                        >
                          {media.title}
                        </td>
                        <td
                          className="p-2 border align-middle relative hover:bg-green-50 cursor-pointer"
                          onMouseEnter={(e) => {
                            if (!(e.target as HTMLElement).closest('button')) {
                              handleCellMouseEnter(media, e, 'uploadedMedia');
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(e.target as HTMLElement).closest('button')) {
                              handleCellMouseLeave();
                            }
                          }}
                        >
                          {media.eventMediaType}
                        </td>
                        <td className="p-2 border align-middle text-center relative">
                          {media.fileUrl && media.contentType?.startsWith('image') && (
                            <a href={media.fileUrl} target="_blank" rel="noopener noreferrer">
                              <img src={media.fileUrl} alt={media.title || ''} className="w-16 h-16 object-cover rounded mx-auto" />
                            </a>
                          )}
                          {media.fileUrl && media.contentType?.startsWith('video') && (
                            <a href={media.fileUrl} target="_blank" rel="noopener noreferrer">
                              <video src={media.fileUrl} controls className="w-24 h-16 rounded mx-auto" />
                            </a>
                          )}
                          {media.fileUrl && !media.contentType?.startsWith('image') && !media.contentType?.startsWith('video') && (
                            <a href={media.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              {media.title || media.fileUrl}
                            </a>
                          )}
                        </td>
                        <td className="p-2 border align-middle">{media.createdAt ? new Date(media.createdAt).toLocaleString() : ''}</td>
                        <td
                          className="p-2 border align-middle flex gap-2 items-center justify-center"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <button
                            className="icon-btn icon-btn-edit flex flex-col items-center"
                            title="Edit"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEditClick(media);
                            }}
                            disabled={editLoading || deleteLoading === media.id}
                          >
                            <FaEdit className={editLoading && editMedia?.id === media.id ? 'animate-spin' : ''} />
                            <span className="text-[10px] text-gray-600 mt-1">Edit</span>
                          </button>
                          <button
                            className="icon-btn icon-btn-delete flex flex-col items-center"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this media?')) {
                                handleDelete(media.id!);
                              }
                            }}
                            disabled={editLoading || deleteLoading === media.id}
                            title="Delete"
                          >
                            <FaTrashAlt className={deleteLoading === media.id ? 'animate-spin' : ''} />
                            <span className="text-[10px] text-gray-600 mt-1">Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination for uploaded media */}
                <div className="flex justify-between items-center mt-2">
                  <button
                    className="px-3 py-1 rounded bg-green-100 border border-green-300 text-green-700 disabled:opacity-50"
                    onClick={() => setMediaPage(p => Math.max(0, p - 1))}
                    disabled={mediaPage === 0}
                  >
                    Previous
                  </button>
                  <span>Page {mediaPage + 1}</span>
                  <button
                    className="px-3 py-1 rounded bg-green-100 border border-green-300 text-green-700 disabled:opacity-50"
                    onClick={() => setMediaPage(p => p + 1)}
                    disabled={!hasNextMediaPage}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {editMedia && (
        <EditMediaModal
          media={editMedia}
          onClose={() => setEditMedia(null)}
          onSave={handleSaveMedia}
          loading={editLoading}
        />
      )}
      {tooltipMedia && tooltipAnchorRect && (
        <MediaDetailsTooltip
          media={tooltipMedia}
          anchorRect={tooltipAnchorRect}
          onClose={() => setTooltipMedia(null)}
          onTooltipMouseEnter={() => setIsTooltipHovered(true)}
          onTooltipMouseLeave={() => setIsTooltipHovered(false)}
          tooltipType={tooltipType}
        />
      )}
      {message && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}