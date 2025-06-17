"use client";
import React, { useRef, useState, useEffect } from "react";
import { EventMediaDTO, EventDetailsDTO } from "@/types";
import { FaEdit, FaTrashAlt, FaUsers, FaPhotoVideo, FaCalendarAlt } from 'react-icons/fa';
import { deleteMediaServer, editMediaServer } from '../ApiServerActions';
import { createPortal } from "react-dom";
import Link from 'next/link';
import { useRouter, useParams } from "next/navigation";

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

export default function EventMediaListPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const [eventDetails, setEventDetails] = useState<EventDetailsDTO | null>(null);
  const [mediaList, setMediaList] = useState<EventMediaDTO[]>([]);
  const [officialDocsList, setOfficialDocsList] = useState<EventMediaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pagination and filter state
  const [mediaPage, setMediaPage] = useState(0);
  const mediaPageSize = 10;
  const [showOnlyEventFlyers, setShowOnlyEventFlyers] = useState(false);
  const [officialDocsPage, setOfficialDocsPage] = useState(0);
  const officialDocsPageSize = 10;
  // Tooltip state
  const [tooltipMedia, setTooltipMedia] = useState<EventMediaDTO | null>(null);
  const [tooltipAnchorRect, setTooltipAnchorRect] = useState<DOMRect | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [tooltipType, setTooltipType] = useState<'officialDocs' | 'uploadedMedia' | null>(null);
  // Edit modal state
  const [editMedia, setEditMedia] = useState<EventMediaDTO | null>(null);
  const [editLoading, setEditLoading] = useState(false);
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

  async function handleEditSave(updated: Partial<EventMediaDTO>) {
    if (!editMedia?.id) return;
    setEditLoading(true);
    try {
      await editMediaServer(editMedia.id, updated);
      setMediaList((prev) => prev.map(m => m.id === editMedia.id ? { ...m, ...updated } : m));
      setOfficialDocsList((prev) => prev.map(m => m.id === editMedia.id ? { ...m, ...updated } : m));
      setEditMedia(null);
    } catch (err: any) {
      // Optionally show error
    } finally {
      setEditLoading(false);
    }
  }

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
    <div className="min-h-screen p-8">
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
                <table className="w-full border text-sm relative bg-white rounded shadow-md">
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
                      <tr key={media.id} className="border-b border-gray-300 relative">
                        <td
                          className="p-2 border align-middle relative hover:bg-blue-50 cursor-pointer"
                          onMouseEnter={e => handleCellMouseEnter(media, e, 'officialDocs')}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          {media.title}
                        </td>
                        <td
                          className="p-2 border align-middle relative hover:bg-blue-50 cursor-pointer"
                          onMouseEnter={e => handleCellMouseEnter(media, e, 'officialDocs')}
                          onMouseLeave={handleCellMouseLeave}
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
                        <td className="p-2 border align-middle flex gap-2 items-center justify-center">
                          <button
                            className="icon-btn icon-btn-edit flex flex-col items-center"
                            title="Edit"
                            onClick={() => setEditMedia(media)}
                          >
                            <FaEdit />
                            <span className="text-[10px] text-gray-600 mt-1">Edit</span>
                          </button>
                          <button
                            className="icon-btn icon-btn-delete flex flex-col items-center"
                            onClick={() => handleDelete(media.id!)}
                            title="Delete"
                          >
                            <FaTrashAlt />
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
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2 select-none">
                <span className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={showOnlyEventFlyers}
                    onChange={e => setShowOnlyEventFlyers(e.target.checked)}
                  />
                  <span className="custom-checkbox-tick">
                    {showOnlyEventFlyers && (
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="text-sm font-semibold">Show only event flyers</span>
              </label>
            </div>
            {/* Media Search/Filter Bar (moved here) */}
            <div className="mb-4">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <div className="text-base font-semibold text-blue-800 mb-2">Search Uploaded Media</div>
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Search By</label>
                    <select className="border px-3 py-2 rounded w-40" value={searchField} onChange={e => setSearchField(e.target.value as 'title' | 'type')}>
                      <option value="title">Title</option>
                      <option value="type">Type</option>
                    </select>
                  </div>
                  {searchField === 'title' && (
                    <div>
                      <label className="block text-xs font-semibold mb-1">Title</label>
                      <input
                        type="text"
                        className="border px-3 py-2 rounded w-48"
                        value={searchTitle}
                        onChange={e => setSearchTitle(e.target.value)}
                        placeholder="Search by title"
                      />
                    </div>
                  )}
                  {searchField === 'type' && (
                    <div>
                      <label className="block text-xs font-semibold mb-1">Type</label>
                      <input
                        type="text"
                        className="border px-3 py-2 rounded w-48"
                        value={searchType}
                        onChange={e => setSearchType(e.target.value)}
                        placeholder="Search by type"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold mb-1">Start Date (from)</label>
                    <input type="date" className="border px-3 py-2 rounded w-40" value={searchStartDate} onChange={e => setSearchStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">End Date (to)</label>
                    <input type="date" className="border px-3 py-2 rounded w-40" value={searchEndDate} onChange={e => setSearchEndDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Sort By</label>
                    <select className="border px-3 py-2 rounded w-56" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
                      <option value="uploadedAt,desc">Uploaded At (Latest)</option>
                      <option value="uploadedAt,asc">Uploaded At (Earliest)</option>
                      <option value="title,asc">Title (A-Z)</option>
                      <option value="title,desc">Title (Z-A)</option>
                      <option value="type,asc">Type (A-Z)</option>
                      <option value="type,desc">Type (Z-A)</option>
                    </select>
                  </div>
                  <button className="ml-auto px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-semibold" onClick={() => {
                    setSearchTitle('');
                    setSearchType('');
                    setSearchStartDate('');
                    setSearchEndDate('');
                    setSort('uploadedAt,desc');
                  }}>Clear</button>
                </div>
              </div>
            </div>
            {mediaList.length === 0 ? (
              <div className="text-gray-500">No media uploaded yet.</div>
            ) : (
              <div className="mb-8">
                <table className="w-full border text-sm relative bg-white rounded shadow-md">
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
                      <tr key={media.id} className="border-b border-gray-300 relative">
                        <td
                          className="p-2 border align-middle relative hover:bg-green-50 cursor-pointer"
                          onMouseEnter={e => handleCellMouseEnter(media, e, 'uploadedMedia')}
                          onMouseLeave={handleCellMouseLeave}
                        >
                          {media.title}
                        </td>
                        <td
                          className="p-2 border align-middle relative hover:bg-green-50 cursor-pointer"
                          onMouseEnter={e => handleCellMouseEnter(media, e, 'uploadedMedia')}
                          onMouseLeave={handleCellMouseLeave}
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
                        <td className="p-2 border align-middle flex gap-2 items-center justify-center">
                          <button
                            className="icon-btn icon-btn-edit flex flex-col items-center"
                            title="Edit"
                            onClick={() => setEditMedia(media)}
                          >
                            <FaEdit />
                            <span className="text-[10px] text-gray-600 mt-1">Edit</span>
                          </button>
                          <button
                            className="icon-btn icon-btn-delete flex flex-col items-center"
                            onClick={() => handleDelete(media.id!)}
                            title="Delete"
                          >
                            <FaTrashAlt />
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
      {/* Tooltip Portal */}
      {tooltipMedia && tooltipAnchorRect && (
        <MediaDetailsTooltip
          media={tooltipMedia}
          anchorRect={tooltipAnchorRect}
          onClose={() => setIsTooltipHovered(false)}
          onTooltipMouseEnter={() => setIsTooltipHovered(true)}
          onTooltipMouseLeave={() => setIsTooltipHovered(false)}
          tooltipType={tooltipType}
        />
      )}
      {/* Edit modal would go here if needed */}
    </div>
  );
}