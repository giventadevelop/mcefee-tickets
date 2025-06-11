"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { EventMediaDTO } from "@/types";
import { format } from 'date-fns-tz';
import { eventMediaService } from "../../../../../../services/eventMediaService";
import { useAuth } from "@clerk/nextjs";
import type { UserProfileDTO } from "@/types";

export default function EditMediaPage() {
  const router = useRouter();
  const params = useParams();
  const mediaId = params?.id;
  const [media, setMedia] = useState<EventMediaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfileId, setUserProfileId] = useState<number | null>(null);
  const { userId } = useAuth();

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

  useEffect(() => {
    async function fetchMedia() {
      setLoading(true);
      setError(null);
      try {
        if (!mediaId) throw new Error('No mediaId');
        const data = await eventMediaService.fetchById(Number(mediaId));
        setMedia(data);
      } catch (e: any) {
        setError(e.message || "Failed to load media file");
      } finally {
        setLoading(false);
      }
    }
    if (mediaId) fetchMedia();
  }, [mediaId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!media) return;
    setSaving(true);
    setError(null);
    const now = new Date();
    const formattedNow = format(now, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
    // Ensure all required fields are present and non-null, matching backend expectations
    const fullDto: EventMediaDTO = {
      id: media.id!,
      tenantId: media.tenantId || process.env.NEXT_PUBLIC_TENANT_ID || '',
      title: media.title || '',
      description: media.description ?? '',
      eventMediaType: media.eventMediaType || '',
      storageType: media.storageType || '',
      fileUrl: media.fileUrl ?? '',
      fileData: null, // always send null for updates
      fileDataContentType: media.fileDataContentType ?? '',
      contentType: media.contentType ?? '',
      fileSize: typeof media.fileSize === 'number' ? media.fileSize : 0,
      isPublic: media.isPublic ?? true,
      eventFlyer: media.eventFlyer ?? false,
      isEventManagementOfficialDocument: media.isEventManagementOfficialDocument ?? false,
      preSignedUrl: media.preSignedUrl ?? '',
      preSignedUrlExpiresAt: media.preSignedUrlExpiresAt ?? '',
      altText: media.altText ?? '',
      displayOrder: typeof media.displayOrder === 'number' ? media.displayOrder : 0,
      downloadCount: typeof media.downloadCount === 'number' ? media.downloadCount : 0,
      isFeatured: media.isFeatured ?? false,
      isHeroImage: media.isHeroImage ?? false,
      isActiveHeroImage: media.isActiveHeroImage ?? false,
      eventId: media.eventId!,
      uploadedById: userProfileId ?? undefined,
      createdAt: media.createdAt || formattedNow,
      updatedAt: formattedNow,
    };
    console.log('PUT EventMediaDTO being sent:', fullDto);
    try {
      const response = await fetch(`/api/proxy/event-medias/${fullDto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullDto),
      });
      if (!response.ok) throw new Error('Failed to update media file');
      router.push('/admin/media');
    } catch (e: any) {
      setError(e.message || 'Failed to update media file');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    let newValue: any = value;
    if (type === "checkbox" && e.target instanceof HTMLInputElement) {
      newValue = e.target.checked;
    } else if (type === "number") {
      newValue = value === '' ? undefined : Number(value);
    }
    setMedia((prev) => prev ? {
      ...prev,
      [name]: newValue
    } : prev);
  }

  if (loading) return <div className="p-8">Loading media file...</div>;
  if (!media) return <div className="p-8 text-red-500">Media file not found.</div>;

  return (
    <div className="max-w-xl mx-auto p-8 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-2">
        <div className="text-gray-700 text-sm font-semibold">Media File ID: <span className="font-mono text-blue-700">{media.id}</span></div>
        <button className="text-blue-600 underline" onClick={() => router.push("/admin/media")}>Back to Media List</button>
      </div>
      <div className="mb-4 text-xs text-gray-500">
        <span className="mr-4">Type: <span className="font-semibold text-gray-800">{media.eventMediaType}</span></span>
        <span className="mr-4">Created: <span className="font-mono">{media.createdAt ? new Date(media.createdAt).toLocaleString() : ''}</span></span>
        <span>Updated: <span className="font-mono">{media.updatedAt ? new Date(media.updatedAt).toLocaleString() : ''}</span></span>
      </div>
      <h1 className="text-2xl font-bold mb-4">Edit Media File</h1>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hidden fields for eventId and uploadedById */}
        <input type="hidden" name="eventId" value={media.eventId ?? ''} />
        <input type="hidden" name="uploadedById" value={media.uploadedById ?? ''} />
        <div>
          <label className="block font-semibold mb-1">Title</label>
          <input type="text" name="title" value={media.title} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block font-semibold mb-1">Description</label>
          <textarea name="description" value={media.description ?? ''} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={3} />
        </div>
        <div>
          <label className="block font-semibold mb-1">Alt Text</label>
          <input type="text" name="altText" value={media.altText ?? ''} onChange={handleChange} className="w-full border rounded px-3 py-2" maxLength={500} />
        </div>
        <div>
          <label className="block font-semibold mb-1">Display Order</label>
          <input type="number" name="displayOrder" value={media.displayOrder ?? ''} onChange={handleChange} className="w-full border rounded px-3 py-2" min={0} />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <label className="flex items-center gap-3">
            <input type="checkbox" name="isPublic" checked={media.isPublic ?? false} onChange={handleChange} className="w-6 h-6 accent-yellow-500" />
            <span className="font-medium">Public</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="isHeroImage" checked={media.isHeroImage ?? false} onChange={handleChange} className="w-6 h-6 accent-yellow-500" />
            <span className="font-medium">Hero Image</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="isActiveHeroImage" checked={media.isActiveHeroImage ?? false} onChange={handleChange} className="w-6 h-6 accent-yellow-500" />
            <span className="font-medium">Active Hero Image</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="isFeatured" checked={media.isFeatured ?? false} onChange={handleChange} className="w-6 h-6 accent-yellow-500" />
            <span className="font-medium">Featured</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="eventFlyer" checked={media.eventFlyer ?? false} onChange={handleChange} className="w-6 h-6 accent-yellow-500" />
            <span className="font-medium">Event Flyer</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="isEventManagementOfficialDocument" checked={media.isEventManagementOfficialDocument ?? false} onChange={handleChange} className="w-6 h-6 accent-yellow-500" />
            <span className="font-medium">Official Document</span>
          </label>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50" disabled={saving}>
          {saving ? "Saving..." : "Save Changes (PUT)"}
        </button>
      </form>
    </div>
  );
}