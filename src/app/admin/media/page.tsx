"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EventMediaDTO } from "@/types";
import { FaEdit, FaTrashAlt, FaUsers, FaPhotoVideo, FaCalendarAlt } from 'react-icons/fa';

export default function AdminMediaPage() {
  const [mediaList, setMediaList] = useState<EventMediaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const router = useRouter();

  useEffect(() => {
    async function fetchMedia() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/proxy/event-medias?page=${page}&size=${pageSize}&sort=updatedAt,desc`);
        if (!res.ok) throw new Error("Failed to fetch media files");
        const data = await res.json();
        setMediaList(Array.isArray(data) ? data : [data]);
      } catch (e: any) {
        setError(e.message || "Failed to load media files");
      } finally {
        setLoading(false);
      }
    }
    fetchMedia();
  }, [page]);

  function handlePrevPage() {
    setPage((p) => Math.max(0, p - 1));
  }
  function handleNextPage() {
    setPage((p) => p + 1);
  }

  // Mouse-over state for details popover
  const [hoveredMediaId, setHoveredMediaId] = useState<number | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  const [popoverMedia, setPopoverMedia] = useState<EventMediaDTO | null>(null);

  function MediaDetailsPopover({ media, anchorRect }: { media: EventMediaDTO, anchorRect: DOMRect | null }) {
    if (!anchorRect) return null;
    const style: React.CSSProperties = {
      position: "fixed",
      top: anchorRect.top + window.scrollY + anchorRect.height + 8,
      left: anchorRect.left + window.scrollX + 16,
      zIndex: 9999,
      background: "white",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      padding: 16,
      minWidth: 320,
      maxWidth: 400,
      fontSize: 14,
    };
    return (
      <div style={style} className="media-details-popover">
        <table className="w-full text-sm border border-gray-400">
          <tbody>
            <tr><td className="font-bold pr-4 border border-gray-400">Title:</td><td className="border border-gray-400">{media.title}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Type:</td><td className="border border-gray-400">{media.eventMediaType}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Description:</td><td className="border border-gray-400">{media.description}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Alt Text:</td><td className="border border-gray-400">{media.altText}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">File Size:</td><td className="border border-gray-400">{media.fileSize ? `${(media.fileSize / 1024).toFixed(2)} KB` : 'Unknown'}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Created At:</td><td className="border border-gray-400">{media.createdAt ? new Date(media.createdAt).toLocaleString() : ''}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Display Order:</td><td className="border border-gray-400">{media.displayOrder ?? ''}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Public:</td><td className="border border-gray-400">{media.isPublic ? 'Yes' : 'No'}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Hero Image:</td><td className="border border-gray-400">{media.isHeroImage ? 'Yes' : 'No'}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Active Hero Image:</td><td className="border border-gray-400">{media.isActiveHeroImage ? 'Yes' : 'No'}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Featured:</td><td className="border border-gray-400">{media.isFeatured ? 'Yes' : 'No'}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Event Flyer:</td><td className="border border-gray-400">{media.eventFlyer ? 'Yes' : 'No'}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Official Document:</td><td className="border border-gray-400">{media.isEventManagementOfficialDocument ? 'Yes' : 'No'}</td></tr>
            <tr><td className="font-bold pr-4 border border-gray-400">Download Count:</td><td className="border border-gray-400">{media.downloadCount ?? ''}</td></tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Media Files</h1>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}
      <div className="border rounded p-4 bg-white shadow-sm min-h-[200px]">
        {loading ? (
          <div>Loading media files...</div>
        ) : mediaList.length === 0 ? (
          <div className="text-gray-500">No media files found.</div>
        ) : (
          <table className="w-full border text-sm relative bg-white rounded shadow-md">
            <thead>
              <tr className="bg-blue-100 font-bold border-b-2 border-blue-300">
                <th className="p-2 border border-gray-400">Title</th>
                <th className="p-2 border border-gray-400">Type</th>
                <th className="p-2 border border-gray-400">Preview</th>
                <th className="p-2 border border-gray-400">Uploaded At</th>
                <th className="p-2 border border-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mediaList.map((media) => (
                <tr
                  key={media.id}
                  className="border-b border-gray-300 hover:bg-blue-50 relative"
                >
                  <td
                    className="p-2 border border-gray-400 align-middle font-medium text-blue-900 cursor-pointer underline"
                    onMouseEnter={e => {
                      setHoveredMediaId(media.id!);
                      setPopoverMedia(media);
                      setPopoverAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                    }}
                    onMouseLeave={() => {
                      setHoveredMediaId(null);
                      setPopoverMedia(null);
                      setPopoverAnchor(null);
                    }}
                  >
                    {media.title}
                  </td>
                  <td
                    className="p-2 border border-gray-400 align-middle cursor-pointer"
                    onMouseEnter={e => {
                      setHoveredMediaId(media.id!);
                      setPopoverMedia(media);
                      setPopoverAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                    }}
                    onMouseLeave={() => {
                      setHoveredMediaId(null);
                      setPopoverMedia(null);
                      setPopoverAnchor(null);
                    }}
                  >
                    {media.eventMediaType}
                  </td>
                  <td className="p-2 border border-gray-400 align-middle text-center">
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
                  <td className="p-2 border border-gray-400 align-middle">{media.createdAt ? new Date(media.createdAt).toLocaleString() : ''}</td>
                  <td className="p-2 border border-gray-400 align-middle text-center">
                    <button
                      className="icon-btn icon-btn-edit flex flex-col items-center"
                      onClick={() => router.push(`/admin/media/${media.id}/edit`)}
                      title="Edit Media"
                    >
                      <FaEdit />
                      <span className="text-[10px] text-gray-600 mt-1">Edit</span>
                    </button>
                    <button
                      className="icon-btn icon-btn-delete flex flex-col items-center ml-2"
                      onClick={async () => {
                        if (!window.confirm('Are you sure you want to delete this media file?')) return;
                        try {
                          const res = await fetch(`/api/proxy/event-medias/${media.id}`, { method: 'DELETE' });
                          if (res.ok) {
                            setMediaList(list => list.filter(m => m.id !== media.id));
                          } else {
                            alert('Failed to delete media file');
                          }
                        } catch {
                          alert('Failed to delete media file');
                        }
                      }}
                      title="Delete Media"
                    >
                      <FaTrashAlt />
                      <span className="text-[10px] text-gray-600 mt-1">Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {/* Pagination controls */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={handlePrevPage}
            disabled={page === 0}
            className="flex flex-col items-center justify-center w-16 h-12 rounded bg-blue-600 text-white font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors shadow text-base"
          >
            <span className="text-lg">&#8592;</span>
            <span className="text-xs px-4">Previous</span>
          </button>
          <span className="font-bold">Page {page + 1}</span>
          <button
            onClick={handleNextPage}
            disabled={mediaList.length < pageSize}
            className="flex flex-col items-center justify-center w-16 h-12 rounded bg-blue-600 text-white font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors shadow text-base"
          >
            <span className="text-lg">&#8594;</span>
            <span className="text-xs px-4">Next</span>
          </button>
        </div>
        {/* Mouse-over popover for details */}
        {popoverMedia && hoveredMediaId === popoverMedia.id && (
          <MediaDetailsPopover media={popoverMedia} anchorRect={popoverAnchor} />
        )}
      </div>
    </div>
  );
}