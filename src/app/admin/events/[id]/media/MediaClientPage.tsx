"use client";
import React, { useRef, useState, useEffect } from "react";
import { EventMediaDTO, EventDetailsDTO } from "@/types";
import { FaEdit, FaTrashAlt, FaUpload, FaFolderOpen, FaSpinner, FaUsers, FaPhotoVideo, FaCalendarAlt } from 'react-icons/fa';
import { uploadMediaServer, deleteMediaServer, editMediaServer } from './ApiServerActions';
import { createPortal } from "react-dom";
import Link from 'next/link';

interface MediaClientPageProps {
  eventId: string;
  mediaList: EventMediaDTO[];
  eventDetails: EventDetailsDTO | null;
  officialDocsList: EventMediaDTO[];
  userProfileId: number | null;
}

// Tooltip component (matches /admin/manage-usage)
function MediaDetailsTooltip({ media, anchorRect, onClose, onTooltipMouseEnter, onTooltipMouseLeave, tooltipType }: { media: EventMediaDTO | null, anchorRect: DOMRect | null, onClose: () => void, onTooltipMouseEnter: () => void, onTooltipMouseLeave: () => void, tooltipType: 'officialDocs' | 'uploadedMedia' | null }) {
  useEffect(() => {
    console.log('MediaDetailsTooltip rendered', { media, anchorRect });
  }, [media, anchorRect]);
  if (!media || !anchorRect) return null;
  // Exclude fileUrl and preSignedUrl
  const entries = Object.entries(media).filter(([key]) => key !== 'fileUrl' && key !== 'preSignedUrl');
  const tooltipWidth = 400;
  const thWidth = 140;
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

export function MediaClientPage({ eventId, mediaList: initialMediaList, eventDetails, officialDocsList: initialOfficialDocsList, userProfileId }: MediaClientPageProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [mediaList, setMediaList] = useState<EventMediaDTO[]>(initialMediaList);
  const [mediaPage, setMediaPage] = useState(0);
  const mediaPageSize = 10;
  const [showOnlyEventFlyers, setShowOnlyEventFlyers] = useState(false);
  const filteredMediaList = showOnlyEventFlyers ? mediaList.filter(m => m.eventFlyer) : mediaList;
  const pagedMedia = filteredMediaList.slice(mediaPage * mediaPageSize, (mediaPage + 1) * mediaPageSize);
  const hasNextMediaPage = (mediaPage + 1) * mediaPageSize < filteredMediaList.length;
  const [eventFlyer, setEventFlyer] = useState(false);
  const [isEventManagementOfficialDocument, setIsEventManagementOfficialDocument] = useState(false);
  const [officialDocsList, setOfficialDocsList] = useState<EventMediaDTO[]>(initialOfficialDocsList);
  const [officialDocsPage, setOfficialDocsPage] = useState(0);
  const officialDocsPageSize = 10;
  const pagedOfficialDocs = officialDocsList.slice(officialDocsPage * officialDocsPageSize, (officialDocsPage + 1) * officialDocsPageSize);
  const hasNextOfficialDocsPage = (officialDocsPage + 1) * officialDocsPageSize < officialDocsList.length;
  const [hoveredOfficialDocId, setHoveredOfficialDocId] = useState<string | number | null>(null);
  const [hoveredOfficialDocCol, setHoveredOfficialDocCol] = useState<number | null>(null);
  const [popoverOfficialDocAnchor, setPopoverOfficialDocAnchor] = useState<DOMRect | null>(null);
  const [popoverOfficialDocMedia, setPopoverOfficialDocMedia] = useState<EventMediaDTO | null>(null);
  const [hoveredUploadedMediaId, setHoveredUploadedMediaId] = useState<string | number | null>(null);
  const [hoveredUploadedMediaCol, setHoveredUploadedMediaCol] = useState<number | null>(null);
  const [popoverUploadedMediaAnchor, setPopoverUploadedMediaAnchor] = useState<DOMRect | null>(null);
  const [popoverUploadedMediaMedia, setPopoverUploadedMediaMedia] = useState<EventMediaDTO | null>(null);
  const [isHeroImage, setIsHeroImage] = useState(false);
  const [isActiveHeroImage, setIsActiveHeroImage] = useState(false);
  const [isFeaturedImage, setIsFeaturedImage] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [altText, setAltText] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFormDivRef = useRef<HTMLDivElement>(null);
  const tooltipTimer = useRef<NodeJS.Timeout | null>(null);
  const [officialDocTooltipPosition0, setOfficialDocTooltipPosition0] = useState<'right' | 'above'>('right');
  const [officialDocTooltipPosition1, setOfficialDocTooltipPosition1] = useState<'right' | 'above'>('right');
  const [officialDocTooltipPosition2, setOfficialDocTooltipPosition2] = useState<'right' | 'above'>('right');
  const [uploadedMediaTooltipPosition0, setUploadedMediaTooltipPosition0] = useState<'right' | 'above'>('right');
  const [uploadedMediaTooltipPosition1, setUploadedMediaTooltipPosition1] = useState<'right' | 'above'>('right');
  const [uploadedMediaTooltipPosition2, setUploadedMediaTooltipPosition2] = useState<'right' | 'above'>('right');
  // Tooltip state for robust portal-based tooltip
  const [tooltipMedia, setTooltipMedia] = useState<EventMediaDTO | null>(null);
  const [tooltipAnchorRect, setTooltipAnchorRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [editMedia, setEditMedia] = useState<EventMediaDTO | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [tooltipType, setTooltipType] = useState<'officialDocs' | 'uploadedMedia' | null>(null);
  const uploadedMediaSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMounted(true); }, []);

  // Helper to infer eventMediaType from file extension
  function inferEventMediaType(file: File): string {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext) return 'other';
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) return "gallery";
    if (["mp4", "mov", "avi", "webm", "mkv"].includes(ext)) return "video";
    if (["pdf"].includes(ext)) return "document";
    if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) return "document";
    if (["svg"].includes(ext)) return "image";
    return "other";
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || !eventId) {
      setMessage("Please select files and ensure event ID is present.");
      return;
    }
    setUploading(true);
    setProgress(0);
    setMessage(null);
    try {
      await uploadMediaServer({
        eventId,
        files: Array.from(files),
        title,
        description,
        eventFlyer,
        isEventManagementOfficialDocument,
        isHeroImage,
        isActiveHeroImage,
        isFeaturedImage,
        isPublic,
        altText,
        displayOrder,
        userProfileId,
      });
      setMessage("Upload successful!");
      setFiles(null);
      setTitle("");
      setDescription("");
      setEventFlyer(false);
      setIsEventManagementOfficialDocument(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Refresh the page after upload
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setMessage(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  const handleDelete = async (mediaId: number | string) => {
    if (!mediaId) return;
    if (!confirm('Are you sure you want to delete this media?')) return;
    try {
      await deleteMediaServer(mediaId);
      setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
      setMessage('Media deleted successfully.');
    } catch (err: any) {
      setMessage(`Delete error: ${err.message}`);
    }
  };

  // Helper to extract file name from URL robustly and truncate hash after last _
  function getFileName(url?: string): string {
    if (!url) return '';
    const path = url.split('?')[0].split('#')[0];
    let fileName = path.substring(path.lastIndexOf('/') + 1);
    // Truncate hash after last _ before extension
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot > 0) {
      const base = fileName.substring(0, lastDot);
      const ext = fileName.substring(lastDot);
      const lastUnderscore = base.lastIndexOf('_');
      if (lastUnderscore > 0) {
        return base.substring(0, lastUnderscore) + ext;
      }
    }
    return fileName;
  }

  // Tooltip handlers (robust, shared for both tables)
  function handleCellMouseEnter(media: EventMediaDTO, e: React.MouseEvent<HTMLTableCellElement>, type: 'officialDocs' | 'uploadedMedia') {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltipMedia(media);
    setTooltipAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
    setIsTooltipHovered(true);
    setTooltipType(type);
  }
  function handleCellMouseLeave() {
    tooltipTimer.current = setTimeout(() => {
      setIsTooltipHovered(false);
    }, 300);
  }
  function handleTooltipMouseEnter() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setIsTooltipHovered(true);
  }
  function handleTooltipMouseLeave() {
    tooltipTimer.current = setTimeout(() => {
      setIsTooltipHovered(false);
    }, 300);
  }
  // Hide tooltip when isTooltipHovered becomes false
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
      // Update both lists as appropriate
      if (editMedia.isEventManagementOfficialDocument) {
        setOfficialDocsList((prev) => prev.map(m => m.id === editMedia.id ? { ...m, ...updated } : m));
      } else {
        setMediaList((prev) => prev.map(m => m.id === editMedia.id ? { ...m, ...updated } : m));
      }
      setEditMedia(null);
      setMessage('Media updated successfully.');
    } catch (err: any) {
      setMessage('Edit error: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  }

  function EditMediaModal({ media, onClose, onSave }: {
    media: EventMediaDTO,
    onClose: () => void,
    onSave: (updated: Partial<EventMediaDTO>) => void,
  }) {
    console.log('EditMediaModal render', media);
    const [form, setForm] = useState<Partial<EventMediaDTO>>({ ...media });
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
          <button className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg font-bold" onClick={onClose}>&times;</button>
          <h2 className="text-xl font-bold mb-4">Edit Media</h2>
          <form
            onSubmit={e => { e.preventDefault(); onSave(form); }}
            className="space-y-4"
          >
            <div>
              <label className="block font-semibold mb-1">Title</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block font-semibold mb-1">Description</label>
              <textarea className="w-full border rounded px-3 py-2" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5} />
            </div>
            <div className="custom-grid-table mt-2 mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div className="custom-grid-cell">
                <label className="flex flex-col items-center">
                  <span className="relative flex items-center justify-center">
                    <input type="checkbox" className="custom-checkbox" checked={!!form.eventFlyer} onChange={e => setForm(f => ({ ...f, eventFlyer: e.target.checked }))} />
                    <span className="custom-checkbox-tick">
                      {form.eventFlyer && (
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Event Flyer</span>
                </label>
              </div>
              <div className="custom-grid-cell">
                <label className="flex flex-col items-center">
                  <span className="relative flex items-center justify-center">
                    <input type="checkbox" className="custom-checkbox" checked={!!form.isEventManagementOfficialDocument} onChange={e => setForm(f => ({ ...f, isEventManagementOfficialDocument: e.target.checked }))} />
                    <span className="custom-checkbox-tick">
                      {form.isEventManagementOfficialDocument && (
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Official Doc</span>
                </label>
              </div>
              <div className="custom-grid-cell">
                <label className="flex flex-col items-center">
                  <span className="relative flex items-center justify-center">
                    <input type="checkbox" className="custom-checkbox" checked={!!form.isHeroImage} onChange={e => setForm(f => ({ ...f, isHeroImage: e.target.checked }))} />
                    <span className="custom-checkbox-tick">
                      {form.isHeroImage && (
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Hero Image</span>
                </label>
              </div>
              <div className="custom-grid-cell">
                <label className="flex flex-col items-center">
                  <span className="relative flex items-center justify-center">
                    <input type="checkbox" className="custom-checkbox" checked={!!form.isActiveHeroImage} onChange={e => setForm(f => ({ ...f, isActiveHeroImage: e.target.checked }))} />
                    <span className="custom-checkbox-tick">
                      {form.isActiveHeroImage && (
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Active Hero</span>
                </label>
              </div>
              <div className="custom-grid-cell">
                <label className="flex flex-col items-center">
                  <span className="relative flex items-center justify-center">
                    <input type="checkbox" className="custom-checkbox" checked={!!form.isFeaturedImage} onChange={e => setForm(f => ({ ...f, isFeaturedImage: e.target.checked }))} />
                    <span className="custom-checkbox-tick">
                      {form.isFeaturedImage && (
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Featured Image</span>
                </label>
              </div>
              <div className="custom-grid-cell">
                <label className="flex flex-col items-center">
                  <span className="relative flex items-center justify-center">
                    <input type="checkbox" className="custom-checkbox" checked={!!form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} />
                    <span className="custom-checkbox-tick">
                      {form.isPublic && (
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Public</span>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center mt-2">
              <input
                type="text"
                placeholder="Alt Text"
                value={form.altText || ''}
                onChange={e => setForm(f => ({ ...f, altText: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2 w-64"
              />
              <input
                type="number"
                placeholder="Display Order"
                value={form.displayOrder ?? ''}
                onChange={e => setForm(f => ({ ...f, displayOrder: e.target.value ? Number(e.target.value) : undefined }))}
                className="border border-gray-300 rounded px-3 py-2 w-40 appearance-auto"
                style={{ MozAppearance: 'textfield', appearance: 'auto' }}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={onClose}>Cancel</button>
              <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white rounded shadow">
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
      {/* Upload Files and Go to Uploaded Media buttons at the top */}
      <div className="flex justify-end mb-4 gap-2">
        <button
          type="button"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded shadow-sm border border-green-700 transition-colors flex items-center gap-2"
          onClick={() => uploadFormDivRef.current?.scrollIntoView({ behavior: 'smooth' })}
        >
          <FaUpload className="w-5 h-5 mr-1" />
          Upload Files
        </button>
        <button
          type="button"
          className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-2 rounded shadow-sm border border-yellow-700 transition-colors flex items-center gap-2"
          onClick={() => uploadedMediaSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
        >
          <FaPhotoVideo className="w-5 h-5 mr-1" />
          <span className="text-left">
            Go to / View<br />Uploaded Media Files
          </span>
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-4">
        Upload Media Files for Event
        <div className="mt-3 mb-2 flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 shadow-sm text-lg font-semibold text-blue-900">
          {eventDetails ? (
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
          ) : (
            <span className="text-red-600 text-base font-medium">Event not found</span>
          )}
        </div>
      </h1>

      {/* Upload form */}
      <div ref={uploadFormDivRef} className="mt-8 mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
        <div className="text-xl font-bold mb-4">Media File Upload Form</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full"
            rows={2}
          />
          <div className="flex flex-col md:flex-row gap-4 items-start mt-2 mb-2">
            <label className="relative cursor-pointer max-w-xs">
              <span className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow-sm border border-blue-700 transition-colors inline-block text-center w-auto min-w-[120px] flex items-center justify-center gap-2">
                <FaFolderOpen className="w-5 h-5 mr-1" />
                Choose Files
              </span>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.svg"
              />
            </label>
            {files && files.length > 0 && (
              <div className="flex-1 flex flex-wrap items-center gap-2 ml-4 min-w-0">
                {Array.from(files).map((file, idx) => (
                  <span key={idx} className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-xs truncate max-w-xs" title={file.name}>{file.name}</span>
                ))}
              </div>
            )}
          </div>
          <div className="custom-grid-table mt-2 mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <div className="custom-grid-cell">
              <label className="flex flex-col items-center">
                <span className="relative flex items-center justify-center">
                  <input type="checkbox" className="custom-checkbox" checked={eventFlyer} onChange={e => setEventFlyer(e.target.checked)} />
                  <span className="custom-checkbox-tick">
                    {eventFlyer && (
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Event Flyer</span>
              </label>
            </div>
            <div className="custom-grid-cell">
              <label className="flex flex-col items-center">
                <span className="relative flex items-center justify-center">
                  <input type="checkbox" className="custom-checkbox" checked={isEventManagementOfficialDocument} onChange={e => setIsEventManagementOfficialDocument(e.target.checked)} />
                  <span className="custom-checkbox-tick">
                    {isEventManagementOfficialDocument && (
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Official Document</span>
              </label>
            </div>
            <div className="custom-grid-cell">
              <label className="flex flex-col items-center">
                <span className="relative flex items-center justify-center">
                  <input type="checkbox" className="custom-checkbox" checked={isHeroImage} onChange={e => setIsHeroImage(e.target.checked)} />
                  <span className="custom-checkbox-tick">
                    {isHeroImage && (
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Hero Image</span>
              </label>
            </div>
            <div className="custom-grid-cell">
              <label className="flex flex-col items-center">
                <span className="relative flex items-center justify-center">
                  <input type="checkbox" className="custom-checkbox" checked={isActiveHeroImage} onChange={e => setIsActiveHeroImage(e.target.checked)} />
                  <span className="custom-checkbox-tick">
                    {isActiveHeroImage && (
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Active Hero Image</span>
              </label>
            </div>
            <div className="custom-grid-cell">
              <label className="flex flex-col items-center">
                <span className="relative flex items-center justify-center">
                  <input type="checkbox" className="custom-checkbox" checked={isFeaturedImage} onChange={e => setIsFeaturedImage(e.target.checked)} />
                  <span className="custom-checkbox-tick">
                    {isFeaturedImage && (
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Featured Image</span>
              </label>
            </div>
            <div className="custom-grid-cell">
              <label className="flex flex-col items-center">
                <span className="relative flex items-center justify-center">
                  <input type="checkbox" className="custom-checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                  <span className="custom-checkbox-tick">
                    {isPublic && (
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Public</span>
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center mt-2">
            <input
              type="text"
              placeholder="Alt Text"
              value={altText}
              onChange={e => setAltText(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-64"
            />
            <input
              type="number"
              placeholder="Display Order"
              value={displayOrder ?? ''}
              onChange={e => setDisplayOrder(e.target.value ? Number(e.target.value) : undefined)}
              className="border border-gray-300 rounded px-3 py-2 w-40 appearance-auto"
              style={{ MozAppearance: 'textfield', appearance: 'auto' }}
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow-sm border border-blue-700 transition-colors flex items-center gap-2"
            disabled={uploading}
          >
            <FaUpload className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          {message && (
            <div className={`mt-4 text-2xl font-extrabold italic drop-shadow-sm tracking-wide ${message.includes('successful') ? 'text-green-600' : 'text-blue-700'}`}
              style={{ background: 'none', border: 'none' }}>
              {message}
            </div>
          )}
        </form>
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
                {pagedOfficialDocs.map((media) => {
                  let officialDocPosition0 = 'right', officialDocPosition1 = 'right', officialDocPosition2 = 'right';
                  // Calculate position for each cell
                  // We'll use a ref and effect, but for simplicity, use mouse event
                  return (
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
                      <td
                        className="p-2 border align-middle text-center relative"
                      >
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
                          onClick={() => {
                            console.log('Edit icon clicked', media);
                            setEditMedia(media);
                          }}
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
                  );
                })}
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
      <div ref={uploadedMediaSectionRef} className="mt-8">
        <div className="mb-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-4 py-2">
          Mouse over the first 2 columns (Title, Type) to see full details about the item. Use the × button to close the tooltip.
        </div>
        <h2 className="text-lg font-semibold mb-2">Uploaded Media</h2>
        <div className="flex items-center gap-4 mb-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showOnlyEventFlyers} onChange={e => setShowOnlyEventFlyers(e.target.checked)} /> Show only event flyers
          </label>
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
                {pagedMedia.map((media) => {
                  let uploadedMediaPosition0 = 'right', uploadedMediaPosition1 = 'right', uploadedMediaPosition2 = 'right';
                  return (
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
                      <td
                        className="p-2 border align-middle text-center relative"
                      >
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
                          <a href={media.fileUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 underline">
                            {media.title || media.fileUrl}
                          </a>
                        )}
                      </td>
                      <td className="p-2 border align-middle">{media.createdAt ? new Date(media.createdAt).toLocaleString() : ''}</td>
                      <td className="p-2 border align-middle flex gap-2 items-center justify-center">
                        <button
                          className="icon-btn icon-btn-edit flex flex-col items-center"
                          title="Edit"
                          onClick={() => {
                            console.log('Edit icon clicked', media);
                            setEditMedia(media);
                          }}
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
                  );
                })}
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
      {mounted && (
        <MediaDetailsTooltip
          media={tooltipMedia}
          anchorRect={tooltipAnchorRect}
          onClose={handleTooltipMouseLeave}
          onTooltipMouseEnter={handleTooltipMouseEnter}
          onTooltipMouseLeave={handleTooltipMouseLeave}
          tooltipType={tooltipType}
        />
      )}
      {editMedia && (
        <EditMediaModal
          media={editMedia}
          onClose={() => setEditMedia(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}