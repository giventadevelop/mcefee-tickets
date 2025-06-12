"use client";
import React, { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { EventMediaDTO } from "@/types";
import type { EventDetailsDTO } from "@/types";
import ReactDOM from "react-dom";
import { getTenantId } from '@/lib/env';
import { formatDateLocal } from '@/lib/date';
import { useAuth } from "@clerk/nextjs";
import type { UserProfileDTO } from "@/types";
import { FaEdit, FaTrashAlt, FaUpload } from 'react-icons/fa';

export default function UploadMediaPage() {
  const params = useParams();
  const eventId = params?.id;
  const [files, setFiles] = useState<FileList | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [mediaList, setMediaList] = useState<EventMediaDTO[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Pagination state for media list
  const [mediaPage, setMediaPage] = useState(0);
  const mediaPageSize = 10;
  const [showOnlyEventFlyers, setShowOnlyEventFlyers] = useState(false);
  const filteredMediaList = showOnlyEventFlyers ? mediaList.filter(m => m.eventFlyer) : mediaList;
  const pagedMedia = filteredMediaList.slice(mediaPage * mediaPageSize, (mediaPage + 1) * mediaPageSize);
  const hasNextMediaPage = (mediaPage + 1) * mediaPageSize < filteredMediaList.length;
  const [eventFlyer, setEventFlyer] = useState(false);
  const [isEventManagementOfficialDocument, setIsEventManagementOfficialDocument] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetailsDTO | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  // Official Documents state
  const [officialDocsList, setOfficialDocsList] = useState<EventMediaDTO[]>([]);
  const [loadingOfficialDocs, setLoadingOfficialDocs] = useState(false);
  const [officialDocsPage, setOfficialDocsPage] = useState(0);
  const officialDocsPageSize = 10;
  const pagedOfficialDocs = officialDocsList.slice(officialDocsPage * officialDocsPageSize, (officialDocsPage + 1) * officialDocsPageSize);
  const hasNextOfficialDocsPage = (officialDocsPage + 1) * officialDocsPageSize < officialDocsList.length;
  // Add hoveredMediaId state for both tables
  const [hoveredOfficialDocId, setHoveredOfficialDocId] = useState<string | number | null>(null);
  const [popoverOfficialDocAnchor, setPopoverOfficialDocAnchor] = useState<DOMRect | null>(null);
  const [popoverOfficialDocMedia, setPopoverOfficialDocMedia] = useState<EventMediaDTO | null>(null);

  const [hoveredUploadedMediaId, setHoveredUploadedMediaId] = useState<string | number | null>(null);
  const [popoverUploadedMediaAnchor, setPopoverUploadedMediaAnchor] = useState<DOMRect | null>(null);
  const [popoverUploadedMediaMedia, setPopoverUploadedMediaMedia] = useState<EventMediaDTO | null>(null);

  const [isHeroImage, setIsHeroImage] = useState(false);
  const [isActiveHeroImage, setIsActiveHeroImage] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [altText, setAltText] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number | undefined>(undefined);
  // Add state for user profile id
  const [userProfileId, setUserProfileId] = useState<number | null>(null);
  const { userId } = useAuth();

  // Add a ref for the upload form container (div) for scrolling
  const uploadFormDivRef = useRef<HTMLDivElement>(null);

  // Tooltip close timer for flicker prevention
  const tooltipTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch current user's profile id
  useEffect(() => {
    async function fetchProfile() {
      if (!userId) return;
      try {
        const res = await fetch(`/api/proxy/user-profiles/by-user/${userId}`);
        if (res.ok) {
          const profile: UserProfileDTO = await res.json();
          setUserProfileId(profile.id ?? null);
        }
      } catch {
        setUserProfileId(null);
      }
    }
    fetchProfile();
  }, [userId]);

  // Fetch uploaded media list
  useEffect(() => {
    const fetchMedia = async () => {
      if (!eventId) return;
      setLoadingMedia(true);
      try {
        // Use eventId.equals as a query param to filter media for this event (JHipster Criteria API)
        const url = `/api/proxy/event-medias?eventId.equals=${eventId}&isEventManagementOfficialDocument.equals=false&sort=updatedAt,desc`;
        const res = await fetch(url);
        if (!res.ok) {
          setMediaList([]);
          return;
        }
        const data = await res.json();
        setMediaList(Array.isArray(data) ? data : [data]);
      } catch (err) {
        setMediaList([]);
      } finally {
        setLoadingMedia(false);
      }
    };
    fetchMedia();
  }, [eventId, uploading]);

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      setLoadingEvent(true);
      try {
        const res = await fetch(`/api/proxy/event-details/${eventId}`);
        if (!res.ok) throw new Error('Failed to fetch event');
        const event: EventDetailsDTO = await res.json();
        setEventDetails(event);
        console.log('eventDetails:', event);
        console.log('eventDetails.id:', event?.id);
      } catch {
        setEventDetails(null);
      } finally {
        setLoadingEvent(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  // Fetch official documents list
  useEffect(() => {
    const fetchOfficialDocs = async () => {
      if (!eventId) return;
      setLoadingOfficialDocs(true);
      try {
        const url = `/api/proxy/event-medias?eventId.equals=${eventId}&isEventManagementOfficialDocument.equals=true&sort=updatedAt,desc`;
        const res = await fetch(url);
        if (!res.ok) {
          setOfficialDocsList([]);
          return;
        }
        const data = await res.json();
        setOfficialDocsList(Array.isArray(data) ? data : [data]);
      } catch (err) {
        setOfficialDocsList([]);
      } finally {
        setLoadingOfficialDocs(false);
      }
    };
    fetchOfficialDocs();
  }, [eventId, uploading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || !eventId) {
      setMessage("Please select files and ensure event ID is present.");
      return;
    }
    setUploading(true);
    setProgress(0);
    setMessage(null);
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });
    // Query params: eventId, titles, descriptions, isPublic
    const params = new URLSearchParams();

    params.append("eventFlyer", String(eventFlyer));
    params.append("isEventManagementOfficialDocument", String(isEventManagementOfficialDocument));
    params.append("isHeroImage", String(isHeroImage));
    params.append("isActiveHeroImage", String(isActiveHeroImage));
    params.append("isFeatured", String(isFeatured));
    params.append("isPublic", String(isPublic));
    params.append("altText", altText);
    if (displayOrder !== undefined) params.append("displayOrder", String(displayOrder));
    params.append("eventId", String(eventId));
    params.append("titles", title); // If you want to support multiple, loop and append
    params.append("descriptions", description); // If you want to support multiple, loop and append
    // Only add tenantId as a query param
    params.append("tenantId", getTenantId());
    // Add upLoadedById if available (case sensitive for backend)
    if (userProfileId) params.append("upLoadedById", String(userProfileId));
    const url = `/api/proxy/event-medias/upload-multiple?${params.toString()}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setMessage("Upload successful!");
        setFiles(null);
        setTitle("");
        setDescription("");
        setEventFlyer(false);
        setIsEventManagementOfficialDocument(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const err = await res.text();
        setMessage(`Upload failed: ${err}`);
      }
    } catch (err: any) {
      setMessage(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  // Add media deletion
  const handleDelete = async (mediaId: number | string) => {
    if (!mediaId) return;
    if (!confirm('Are you sure you want to delete this media?')) return;
    try {
      const url = `/api/proxy/event-medias/${mediaId}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        setMediaList((prev) => prev.filter((m) => m.id !== mediaId));
        setMessage('Media deleted successfully.');
      } else {
        const err = await res.text();
        setMessage(`Delete failed: ${err}`);
      }
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

  // Popover component using portal
  function MediaDetailsPopover({ media, anchorRect, onClose, position = 'below' }: { media: EventMediaDTO, anchorRect: DOMRect | null, onClose: () => void, position?: 'above' | 'below' }) {
    if (!anchorRect) return null;
    // Default: below
    let top = anchorRect.top + window.scrollY + anchorRect.height + 8;
    const tooltipMaxHeight = window.innerHeight * 0.6; // 60vh
    if (position === 'above') {
      // Estimate popover height (fixed, or could use ref for dynamic)
      const popoverHeight = tooltipMaxHeight;
      top = anchorRect.top + window.scrollY - popoverHeight - 8;
      if (top < 8) top = 8; // Prevent offscreen
    }
    // Ensure tooltip does not overflow bottom of viewport
    const minPadding = 16;
    if (top + tooltipMaxHeight + minPadding > window.scrollY + window.innerHeight) {
      top = window.scrollY + window.innerHeight - tooltipMaxHeight - minPadding;
      if (top < 8) top = 8;
    }
    const style: React.CSSProperties = {
      position: 'fixed',
      top,
      left: anchorRect.left + window.scrollX + 16,
      zIndex: 9999,
      maxHeight: '60vh',
      overflowY: 'auto',
    };
    // Render all fields of EventMediaDTO except fileUrl and preSignedUrl
    const entries = Object.entries(media).filter(([key]) => key !== 'fileUrl' && key !== 'preSignedUrl');
    return ReactDOM.createPortal(
      <div
        style={style}
        onMouseLeave={onClose}
        onMouseEnter={e => e.stopPropagation()}
        tabIndex={-1}
        className="admin-tooltip"
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg font-bold focus:outline-none"
          onClick={onClose}
          aria-label="Close tooltip"
          style={{ position: 'absolute', top: 8, right: 12 }}
        >
          &times;
        </button>
        <table className="admin-tooltip-table">
          <tbody>
            {entries.map(([key, value]) => (
              <tr key={key}>
                <th>{key}</th>
                <td>{
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

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white rounded shadow">
      {/* Upload Files button at the top */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded shadow-sm border border-green-700 transition-colors flex items-center gap-2"
          onClick={() => uploadFormDivRef.current?.scrollIntoView({ behavior: 'smooth' })}
        >
          <FaUpload className="w-5 h-5 mr-1" />
          Upload Files
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-4">
        Upload Media Files for Event
        <div className="mt-3 mb-2 flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 shadow-sm text-lg font-semibold text-blue-900">
          {loadingEvent ? (
            <span className="text-blue-700 text-base font-medium">Loading event details...</span>
          ) : eventDetails ? (
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
                    <td className="border border-blue-200 px-3 py-2">{formatDateLocal(eventDetails.startDate) || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="border border-blue-200 font-semibold text-blue-700 px-3 py-2">End Date</td>
                    <td className="border border-blue-200 px-3 py-2">{formatDateLocal(eventDetails.endDate) || 'N/A'}</td>
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
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Official Documents</h2>
        {loadingOfficialDocs ? (
          <div>Loading official documents...</div>
        ) : officialDocsList.length === 0 ? (
          <div className="text-gray-500">No official documents uploaded yet.</div>
        ) : (
          <div className="overflow-x-auto mb-8">
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
                  <tr
                    key={media.id}
                    className="border-b border-gray-300 hover:bg-blue-50 relative"
                    onMouseEnter={(e: React.MouseEvent<HTMLTableRowElement>) => {
                      setHoveredOfficialDocId(media.id!);
                      setPopoverOfficialDocMedia(media);
                      setPopoverOfficialDocAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLTableRowElement>) => {
                      setHoveredOfficialDocId(null);
                      setPopoverOfficialDocMedia(null);
                      setPopoverOfficialDocAnchor(null);
                    }}
                  >
                    <td className="p-2 border align-middle">{media.title}</td>
                    <td className="p-2 border align-middle">{media.eventMediaType}</td>
                    <td className="p-2 border align-middle text-center">
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
                    <td className="p-2 border align-middle text-center">
                      <div className="flex flex-col items-center gap-2">
                        <button
                          className="icon-btn icon-btn-edit"
                          onClick={() => window.location.href = `/admin/media/${media.id}/edit`}
                          title="Edit Media"
                        >
                          <FaEdit />
                          <span className="text-xs mt-1">Edit</span>
                        </button>
                        <button
                          className="icon-btn icon-btn-delete"
                          onClick={() => handleDelete(media.id!)}
                          title="Delete Media"
                        >
                          <FaTrashAlt />
                          <span className="text-xs mt-1">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination controls for official docs */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setOfficialDocsPage((p) => Math.max(0, p - 1))}
                disabled={officialDocsPage === 0}
                className="flex flex-col items-center justify-center w-16 h-12 rounded bg-blue-600 text-white font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors shadow text-base"
              >
                <span className="text-lg">&#8592;</span>
                <span className="text-xs px-4">Previous</span>
              </button>
              <span className="font-bold">Page {officialDocsPage + 1}</span>
              <button
                onClick={() => setOfficialDocsPage((p) => p + 1)}
                disabled={!hasNextOfficialDocsPage}
                className="flex flex-col items-center justify-center w-16 h-12 rounded bg-blue-600 text-white font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors shadow text-base"
              >
                <span className="text-lg">&#8594;</span>
                <span className="text-xs px-4">Next</span>
              </button>
            </div>
          </div>
        )}
        <h2 className="text-lg font-semibold mb-2">Uploaded Media</h2>
        <div className="mb-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-4 py-2">
          Mouse over the first 3 columns to see the full details about the media file. Use the × button to close the tooltip once you have viewed the details.
        </div>
        <div className="flex items-center mb-2">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={showOnlyEventFlyers}
              onChange={e => {
                setShowOnlyEventFlyers(e.target.checked);
                setMediaPage(0); // Reset to first page on filter change
              }}
            />
            Show only Event Flyers
          </label>
        </div>
        {loadingMedia ? (
          <div>Loading media...</div>
        ) : mediaList.length === 0 ? (
          <div className="text-gray-500">No media uploaded yet.</div>
        ) : (
          <div className="overflow-x-auto">
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
                {pagedMedia.map((media) => (
                  <tr
                    key={media.id}
                    className="border-b border-gray-300 hover:bg-blue-50 relative"
                  >
                    <td
                      className="p-2 border align-middle"
                      onMouseEnter={(e: React.MouseEvent<HTMLTableCellElement>) => {
                        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
                        setHoveredUploadedMediaId(media.id!);
                        setPopoverUploadedMediaMedia(media);
                        setPopoverUploadedMediaAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                      }}
                      onMouseLeave={() => {
                        tooltipTimer.current = setTimeout(() => {
                          setHoveredUploadedMediaId(null);
                          setPopoverUploadedMediaMedia(null);
                          setPopoverUploadedMediaAnchor(null);
                        }, 200);
                      }}
                    >
                      {media.title}
                    </td>
                    <td
                      className="p-2 border align-middle"
                      onMouseEnter={(e: React.MouseEvent<HTMLTableCellElement>) => {
                        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
                        setHoveredUploadedMediaId(media.id!);
                        setPopoverUploadedMediaMedia(media);
                        setPopoverUploadedMediaAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                      }}
                      onMouseLeave={() => {
                        tooltipTimer.current = setTimeout(() => {
                          setHoveredUploadedMediaId(null);
                          setPopoverUploadedMediaMedia(null);
                          setPopoverUploadedMediaAnchor(null);
                        }, 200);
                      }}
                    >
                      {media.eventMediaType}
                    </td>
                    <td
                      className="p-2 border align-middle text-center"
                      onMouseEnter={(e: React.MouseEvent<HTMLTableCellElement>) => {
                        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
                        setHoveredUploadedMediaId(media.id!);
                        setPopoverUploadedMediaMedia(media);
                        setPopoverUploadedMediaAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                      }}
                      onMouseLeave={() => {
                        tooltipTimer.current = setTimeout(() => {
                          setHoveredUploadedMediaId(null);
                          setPopoverUploadedMediaMedia(null);
                          setPopoverUploadedMediaAnchor(null);
                        }, 200);
                      }}
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
                    <td className="p-2 border align-middle text-center">
                      <div className="flex flex-col items-center gap-2">
                        <button
                          className="icon-btn icon-btn-edit"
                          onClick={() => window.location.href = `/admin/media/${media.id}/edit`}
                          title="Edit Media"
                        >
                          <FaEdit />
                          <span className="text-xs mt-1">Edit</span>
                        </button>
                        <button
                          className="icon-btn icon-btn-delete"
                          onClick={() => handleDelete(media.id!)}
                          title="Delete Media"
                        >
                          <FaTrashAlt />
                          <span className="text-xs mt-1">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination controls */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setMediaPage((p) => Math.max(0, p - 1))}
                disabled={mediaPage === 0}
                className="flex flex-col items-center justify-center w-16 h-12 rounded bg-blue-600 text-white font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors shadow text-base"
              >
                <span className="text-lg">&#8592;</span>
                <span className="text-xs px-4">Previous</span>
              </button>
              <span className="font-bold">Page {mediaPage + 1}</span>
              <button
                onClick={() => setMediaPage((p) => p + 1)}
                disabled={!hasNextMediaPage}
                className="flex flex-col items-center justify-center w-16 h-12 rounded bg-blue-600 text-white font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors shadow text-base"
              >
                <span className="text-lg">&#8594;</span>
                <span className="text-xs px-4">Next</span>
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Upload Form at the bottom, with ref */}
      <div ref={uploadFormDivRef} className="mt-12 border border-gray-300 rounded-lg shadow bg-white p-6 max-w-2xl mx-auto">
        <div className="flex justify-center">
          <h2 className="text-xl font-bold mb-6 text-white bg-blue-600 rounded px-6 py-3 w-full text-center">Upload Media Files</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">Title</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Description</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Select Files</label>
            <div className="relative flex items-center">
              <label htmlFor="file-upload" className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded cursor-pointer transition-colors gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3.172a2 2 0 011.414.586l1.828 1.828A2 2 0 0012.828 8H19a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                Choose Files
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                ref={fileInputRef}
                className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                required
                style={{ zIndex: 2 }}
              />
              {files && files.length > 0 && (
                <span className="ml-4 text-sm text-gray-700">{Array.from(files).map(f => f.name).join(", ")}</span>
              )}
            </div>
          </div>
          <div className="custom-grid-table mt-2">
            {[
              { label: 'Event Flyer', checked: eventFlyer, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEventFlyer(e.target.checked) },
              { label: 'Event Management Official Document', checked: isEventManagementOfficialDocument, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setIsEventManagementOfficialDocument(e.target.checked) },
              { label: 'Hero Image', checked: isHeroImage, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setIsHeroImage(e.target.checked) },
              { label: 'Active Hero Image', checked: isActiveHeroImage, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setIsActiveHeroImage(e.target.checked) },
              { label: 'Featured', checked: isFeatured, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setIsFeatured(e.target.checked) },
              { label: 'Public', checked: isPublic, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setIsPublic(e.target.checked) },
            ].map(({ label, checked, onChange }) => (
              <div key={label} className="custom-grid-cell">
                <label className="flex flex-col items-center">
                  <span className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={onChange}
                      className="custom-checkbox"
                    />
                    <span className="custom-checkbox-tick">
                      {checked && (
                        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">{label}</span>
                </label>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex-1">
              <label className="block font-semibold mb-1">Alt Text</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={altText}
                onChange={e => setAltText(e.target.value)}
                maxLength={500}
              />
            </div>
            <div className="flex-1">
              <label className="block font-semibold mb-1">Display Order</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={displayOrder ?? ''}
                onChange={e => setDisplayOrder(e.target.value === '' ? undefined : Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            disabled={uploading}
          >
            <FaUpload className="w-5 h-5 mr-1" />
            {uploading ? "Uploading..." : "Upload"}
          </button>
          {progress > 0 && (
            <div className="w-full bg-gray-200 rounded h-2 mt-2">
              <div
                className="bg-blue-500 h-2 rounded"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {message && (
            <div className={`mt-2 ${message.startsWith("Upload successful") ? "text-green-600" : "text-red-600"}`}>{message}</div>
          )}
        </form>
      </div>
      {popoverOfficialDocMedia && hoveredOfficialDocId === popoverOfficialDocMedia.id && (
        <MediaDetailsPopover media={popoverOfficialDocMedia} anchorRect={popoverOfficialDocAnchor} onClose={() => {
          setHoveredOfficialDocId(null);
          setPopoverOfficialDocMedia(null);
          setPopoverOfficialDocAnchor(null);
        }} position="below" />
      )}
      {popoverUploadedMediaMedia && hoveredUploadedMediaId === popoverUploadedMediaMedia.id && (
        <div
          onMouseEnter={() => {
            if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
          }}
          onMouseLeave={() => {
            tooltipTimer.current = setTimeout(() => {
              setHoveredUploadedMediaId(null);
              setPopoverUploadedMediaMedia(null);
              setPopoverUploadedMediaAnchor(null);
            }, 200);
          }}
        >
          <MediaDetailsPopover media={popoverUploadedMediaMedia} anchorRect={popoverUploadedMediaAnchor} onClose={() => {
            setHoveredUploadedMediaId(null);
            setPopoverUploadedMediaMedia(null);
            setPopoverUploadedMediaAnchor(null);
          }} position="above" />
        </div>
      )}
    </div>
  );
}