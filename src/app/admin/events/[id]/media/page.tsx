"use client";
import React, { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { EventMediaDTO } from "@/types";

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
  const mediaPageSize = 5;
  const pagedMedia = mediaList.slice(mediaPage * mediaPageSize, (mediaPage + 1) * mediaPageSize);
  const hasNextMediaPage = (mediaPage + 1) * mediaPageSize < mediaList.length;

  // Fetch uploaded media list
  useEffect(() => {
    const fetchMedia = async () => {
      if (!eventId) return;
      setLoadingMedia(true);
      try {
        // Use eventId as a query param to filter media for this event
        const url = `/api/proxy/event-medias?eventId=${eventId}`;
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
    formData.append("title", title);
    formData.append("description", description);
    formData.append("eventId", String(eventId)); // Required by backend
    // Infer eventMediaType from first file
    const firstFile = files[0];
    const eventMediaType = inferEventMediaType(firstFile);
    formData.append("eventMediaType", eventMediaType);
    formData.append("storageType", "AWS_S3");
    const now = new Date().toISOString();
    formData.append("createdAt", now);
    formData.append("updatedAt", now);
    try {
      const url = `/api/proxy/event-medias`;
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setMessage("Upload successful!");
        setFiles(null);
        setTitle("");
        setDescription("");
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

  return (
    <div className="p-8 max-w-xl mx-auto bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Upload Media Files for Event</h1>
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
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="w-full border rounded px-3 py-2"
            onChange={handleFileChange}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={uploading}
        >
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
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Uploaded Media</h2>
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
                  <tr key={media.id} className="border-b border-gray-300">
                    <td className="p-2 border align-middle">{media.title}</td>
                    <td className="p-2 border align-middle">{media.eventMediaType}</td>
                    <td className="p-2 border align-middle text-center">
                      {media.fileUrl && media.contentType?.startsWith('image') && (
                        <img src={media.fileUrl} alt={media.title || ''} className="w-16 h-16 object-cover rounded mx-auto" />
                      )}
                      {media.fileUrl && media.contentType?.startsWith('video') && (
                        <video src={media.fileUrl} controls className="w-24 h-16 rounded mx-auto" />
                      )}
                      {media.fileUrl && !media.contentType?.startsWith('image') && !media.contentType?.startsWith('video') && (
                        <a href={media.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          {media.title || media.fileUrl}
                        </a>
                      )}
                    </td>
                    <td className="p-2 border align-middle">{media.createdAt ? new Date(media.createdAt).toLocaleString() : ''}</td>
                    <td className="p-2 border align-middle text-center">
                      <button
                        className="text-red-600 hover:text-red-800 px-2 py-1 rounded"
                        onClick={() => handleDelete(media.id!)}
                      >
                        Delete
                      </button>
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
    </div>
  );
}