"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { getTenantId } from "@/lib/env";
import type { EventDetailsDTO, EventMediaDTO, EventAttendeeDTO, EventAttendeeGuestDTO, UserProfileDTO } from "@/types";
import { FaPlus, FaTrashAlt, FaCheck } from "react-icons/fa";
import { formatInTimeZone } from 'date-fns-tz';
import LocationDisplay from '@/components/LocationDisplay';

export default function EventRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = Number(id);
  const { userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // State for event details and media
  const [event, setEvent] = useState<EventDetailsDTO | null>(null);
  const [media, setMedia] = useState<EventMediaDTO[]>([]);
  const [loadingEvent, setLoadingEvent] = useState(true);

  // State for attendee and guests
  const [attendee, setAttendee] = useState<EventAttendeeDTO>({
    tenantId: getTenantId(),
    eventId,
    registrationStatus: "PENDING",
    registrationDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // All other fields default to undefined
  });
  const [guests, setGuests] = useState<EventAttendeeGuestDTO[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch event details and media
  useEffect(() => {
    async function fetchEvent() {
      setLoadingEvent(true);
      try {
        const eventRes = await fetch(`/api/proxy/event-details/${eventId}`);
        const eventData: EventDetailsDTO = await eventRes.json();
        setEvent(eventData);
        const mediaRes = await fetch(`/api/proxy/event-medias?eventId.equals=${eventId}&isEventManagementOfficialDocument.equals=false&sort=updatedAt,desc`);
        const mediaData = await mediaRes.json();
        setMedia(Array.isArray(mediaData) ? mediaData : [mediaData]);
      } catch (err) {
        setEvent(null);
        setMedia([]);
      } finally {
        setLoadingEvent(false);
      }
    }
    fetchEvent();
  }, [eventId]);

  // Prepopulate attendee fields from user profile if logged in
  useEffect(() => {
    async function fetchProfile() {
      if (!userId) return;
      setLoadingProfile(true);
      try {
        const res = await fetch(`/api/proxy/user-profiles/by-user/${userId}?tenantId.equals=${getTenantId()}`);
        if (res.ok) {
          const profile: UserProfileDTO = await res.json();
          setAttendee((prev) => ({
            ...prev,
            firstName: profile.firstName || user?.firstName || "",
            lastName: profile.lastName || user?.lastName || "",
            email: profile.email || user?.primaryEmailAddress?.emailAddress || "",
            phone: profile.phone || user?.phoneNumbers?.[0]?.phoneNumber || "",
            attendeeId: profile.id,
          }));
        } else if (user) {
          setAttendee((prev) => ({
            ...prev,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.primaryEmailAddress?.emailAddress || "",
            phone: user.phoneNumbers?.[0]?.phoneNumber || "",
          }));
        }
      } catch { }
      setLoadingProfile(false);
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user]);

  // Handle attendee field changes
  const handleAttendeeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setAttendee((prev) => ({
      ...prev,
      [name]: type === "checkbox" && e.target instanceof HTMLInputElement ? e.target.checked : value,
    }));
  };

  // Handle guest field changes
  const handleGuestChange = (idx: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setGuests((prev) => prev.map((g, i) => i === idx ? { ...g, [name]: type === "checkbox" && e.target instanceof HTMLInputElement ? e.target.checked : value } : g));
  };

  // Add a new guest
  const addGuest = () => {
    setGuests((prev) => [
      ...prev,
      {
        tenantId: getTenantId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  };

  // Remove a guest
  const removeGuest = (idx: number) => {
    setGuests((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      // Send attendee
      const attendeePayload: EventAttendeeDTO = {
        ...attendee,
        tenantId: getTenantId(),
        eventId,
        createdAt: attendee.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const attendeeRes = await fetch("/api/proxy/event-attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attendeePayload),
      });
      if (!attendeeRes.ok) {
        // Try to parse backend error
        let errorMsg = "Failed to register attendee";
        try {
          const errorData = await attendeeRes.json();
          if (
            typeof errorData === "object" &&
            errorData.detail &&
            errorData.detail.includes("duplicate key value") &&
            errorData.detail.includes("ux_event_attendee__event_attendee")
          ) {
            errorMsg = "You have already registered for this event.";
          } else if (errorData.error) {
            errorMsg = errorData.error;
          }
        } catch {
          // fallback: try text
          try {
            const text = await attendeeRes.text();
            if (
              text.includes("duplicate key value") &&
              text.includes("ux_event_attendee__event_attendee")
            ) {
              errorMsg = "You have already registered for this event.";
            }
          } catch { }
        }
        throw new Error(errorMsg);
      }
      const savedAttendee = await attendeeRes.json();
      // Send guests
      for (const guest of guests) {
        const guestPayload: EventAttendeeGuestDTO = {
          ...guest,
          tenantId: getTenantId(),
          createdAt: guest.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          primaryAttendee: {
            id: savedAttendee.id,
            registrationStatus: savedAttendee.registrationStatus,
            registrationDate: savedAttendee.registrationDate,
            createdAt: savedAttendee.createdAt,
            updatedAt: savedAttendee.updatedAt,
          },
        };
        const guestRes = await fetch("/api/proxy/event-attendee-guests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(guestPayload),
        });
        if (!guestRes.ok) throw new Error("Failed to register guest");
      }
      router.push(`/events/${eventId}`);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Find flyer/hero image
  const flyer = media.find((m) => m.eventFlyer && m.fileUrl) || media.find((m) => m.fileUrl);

  // Responsive layout: summary+thumbnail above form on mobile, side-by-side on desktop
  return (
    <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
      {/* Event summary and thumbnail */}
      <div className="md:col-span-1 flex flex-col items-center md:items-start">
        {flyer && flyer.fileUrl && (
          <div className="mb-4 w-full flex justify-center md:justify-start">
            <Image src={flyer.fileUrl} alt="Event Flyer" width={220} height={160} className="rounded-lg shadow object-cover w-[220px] h-[160px]" />
          </div>
        )}
        {event && (
          <table className="w-full text-sm border rounded-lg overflow-hidden bg-gray-50">
            <tbody>
              <tr><th className="text-left font-semibold pr-2 py-1">Title</th><td className="py-1">{event.title}</td></tr>
              <tr><th className="text-left font-semibold pr-2 py-1">Date</th><td className="py-1">{event.startDate}</td></tr>
              <tr><th className="text-left font-semibold pr-2 py-1">Time</th><td className="py-1">{event.startTime} - {event.endTime}</td></tr>
              <tr><th className="text-left font-semibold pr-2 py-1">Location</th><td className="py-1">{event.location && <LocationDisplay location={event.location} />}</td></tr>
              {event.description && <tr><th className="text-left font-semibold pr-2 py-1 align-top">Description</th><td className="py-1 align-top">{event.description}</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      {/* Registration form */}
      <div className="md:col-span-2">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <h2 className="md:col-span-2 text-2xl font-bold mb-2">Register for Event</h2>
          {error && <div className="md:col-span-2 text-red-600 mb-2">{error}</div>}
          {/* Attendee fields: all fields from EventAttendeeDTO except specialRequirements, emergencyContactName, emergencyContactPhone, notes */}
          <input type="hidden" name="tenantId" value={attendee.tenantId} />
          <input type="hidden" name="eventId" value={attendee.eventId} />
          <div>
            <label className="block font-medium">First Name</label>
            <input name="firstName" value={attendee.firstName || ""} onChange={handleAttendeeChange} className="w-full border rounded p-2" required />
          </div>
          <div>
            <label className="block font-medium">Last Name</label>
            <input name="lastName" value={attendee.lastName || ""} onChange={handleAttendeeChange} className="w-full border rounded p-2" required />
          </div>
          <div>
            <label className="block font-medium">Email</label>
            <input name="email" type="email" value={attendee.email || ""} onChange={handleAttendeeChange} className="w-full border rounded p-2" required />
          </div>
          <div>
            <label className="block font-medium">Phone</label>
            <input name="phone" value={attendee.phone || ""} onChange={handleAttendeeChange} className="w-full border rounded p-2" />
          </div>
          {/* Guests section */}
          <div className="md:col-span-2 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">
                Guests
                <span className="text-blue-600 font-bold ml-2">[optional]</span>
              </span>
              <button type="button" onClick={addGuest} className="icon-btn bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold flex items-center min-w-[160px]">
                <FaPlus className="mr-2" /> Add Guest
              </button>
            </div>
            {guests.map((guest, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2 p-2 border rounded bg-gray-50">
                <div>
                  <label className="block font-medium">First Name</label>
                  <input name="firstName" value={guest.firstName || ""} onChange={e => handleGuestChange(idx, e)} className="w-full border rounded p-2" required />
                </div>
                <div>
                  <label className="block font-medium">Last Name</label>
                  <input name="lastName" value={guest.lastName || ""} onChange={e => handleGuestChange(idx, e)} className="w-full border rounded p-2" required />
                </div>
                <div>
                  <label className="block font-medium">Age Group</label>
                  <select name="ageGroup" value={guest.ageGroup || ""} onChange={e => handleGuestChange(idx, e)} className="w-full border rounded p-2" required>
                    <option value="" disabled>Select age group</option>
                    <option value="Child">Child</option>
                    <option value="Teen">Teen</option>
                    <option value="Adult">Adult</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium">Email</label>
                  <input name="email" type="email" value={guest.email || ""} onChange={e => handleGuestChange(idx, e)} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block font-medium">Phone</label>
                  <input name="phone" value={guest.phone || ""} onChange={e => handleGuestChange(idx, e)} className="w-full border rounded p-2" />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" onClick={() => removeGuest(idx)} className="icon-btn icon-btn-delete">
                    <FaTrashAlt className="mr-1" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="md:col-span-2 flex justify-end mt-4">
            <button type="submit" disabled={submitting} className="icon-btn bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold flex items-center min-w-[160px]">
              <FaCheck className="mr-2" />
              {submitting ? "Registering..." : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}