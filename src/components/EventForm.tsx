import React, { useState, useEffect } from 'react';
import type { EventDTO, EventTypeDTO } from '@/types';

interface EventFormProps {
  event?: EventDTO;
  eventTypes: EventTypeDTO[];
  onSubmit: (event: EventDTO) => void;
  loading?: boolean;
}

export const defaultEvent: EventDTO = {
  title: '',
  caption: '',
  description: '',
  eventType: undefined,
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  location: '',
  directionsToVenue: '',
  capacity: undefined,
  admissionType: 'free',
  isActive: true,
  createdBy: undefined,
};

export function EventForm({ event, eventTypes, onSubmit, loading }: EventFormProps) {
  const [form, setForm] = useState<EventDTO>({ ...defaultEvent, ...event });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (event) setForm({ ...defaultEvent, ...event });
  }, [event]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title) errs.title = 'Title is required';
    if (!form.eventType || !form.eventType.id) errs.eventType = 'Event type is required';
    if (!form.startDate) errs.startDate = 'Start date is required';
    if (!form.endDate) errs.endDate = 'End date is required';
    if (!form.startTime) errs.startTime = 'Start time is required';
    if (!form.endTime) errs.endTime = 'End time is required';
    if (!form.admissionType) errs.admissionType = 'Admission type is required';

    // Date and time validations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateStr = form.startDate;
    const endDateStr = form.endDate;
    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);

    if (startDate && startDate.getTime() < today.getTime()) {
      errs.startDate = 'Start date must be today or in the future';
    }
    if (endDate && endDate < today) {
      errs.endDate = 'End date must be today or in the future';
    }
    if (startDate && endDate && endDate < startDate) {
      errs.endDate = 'End date cannot be before start date';
    }

    // Time validations
    const startTimeStr = form.startTime;
    const endTimeStr = form.endTime;
    if (startDateStr && startTimeStr) {
      const now = new Date();
      const startDateTime = new Date(`${startDateStr}T${convertTo24Hour(startTimeStr)}`);
      if (startDate && startDate.getTime() === today.getTime() && startDateTime < now) {
        errs.startTime = 'Start time must be in the future';
      }
    }
    if (startDateStr && startTimeStr && endDateStr && endTimeStr) {
      const startDateTime = new Date(`${startDateStr}T${convertTo24Hour(startTimeStr)}`);
      const endDateTime = new Date(`${endDateStr}T${convertTo24Hour(endTimeStr)}`);
      if (startDate && endDate && startDate.getTime() === endDate.getTime() && endDateTime <= startDateTime) {
        errs.endTime = 'End time must be after start time';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Helper to convert '06:00 PM' to '18:00' for Date parsing
  function convertTo24Hour(time12h: string): string {
    if (!time12h) return '';
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier && modifier.toUpperCase() === 'PM') hours = String(parseInt(hours, 10) + 12);
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  // Helper to convert 'HH:mm' (from <input type="time">) to 'hh:mm AM/PM'
  function to12HourFormat(time24: string): string {
    if (!time24) return '';
    let [hour, minute] = time24.split(':');
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${minute} ${ampm}`;
  }

  // Helper to convert 'hh:mm AM/PM' to 'HH:mm' for <input type="time"> value
  function to24HourFormat(time12: string): string {
    if (!time12) return '';
    const [time, ampm] = time12.split(' ');
    let [hour, minute] = time.split(':');
    let h = parseInt(hour, 10);
    if (ampm && ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm && ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${minute}`;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    if (name === 'eventType') {
      // Find the event type object by id
      const selectedType = eventTypes.find(et => String(et.id) === value);
      setForm((f) => ({ ...f, eventType: selectedType }));
    } else if (name === 'startTime' || name === 'endTime') {
      // Convert 24-hour value from <input type="time"> to 12-hour AM/PM string
      setForm((f) => ({ ...f, [name]: to12HourFormat(value) }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function handleReset() {
    setForm({ ...defaultEvent });
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-medium">Title *</label>
        <input name="title" value={form.title} onChange={handleChange} className="w-full border rounded p-2" />
        {errors.title && <div className="text-red-500 text-sm">{errors.title}</div>}
      </div>
      <div>
        <label className="block font-medium">Caption</label>
        <input name="caption" value={form.caption} onChange={handleChange} className="w-full border rounded p-2" />
      </div>
      <div>
        <label className="block font-medium">Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} className="w-full border rounded p-2" />
      </div>
      <div>
        <label className="block font-medium">Event Type *</label>
        <select name="eventType" value={form.eventType?.id ?? ''} onChange={handleChange} className="w-full border rounded p-2">
          <option value="">Select event type</option>
          {eventTypes.map((et) => (
            <option key={et.id} value={et.id}>{et.name}</option>
          ))}
        </select>
        {errors.eventType && <div className="text-red-500 text-sm">{errors.eventType}</div>}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block font-medium">Start Date *</label>
          <input type="date" name="startDate" value={form.startDate} onChange={handleChange} className="w-full border rounded p-2" />
          {errors.startDate && <div className="text-red-500 text-sm">{errors.startDate}</div>}
        </div>
        <div className="flex-1">
          <label className="block font-medium">End Date *</label>
          <input type="date" name="endDate" value={form.endDate} onChange={handleChange} className="w-full border rounded p-2" />
          {errors.endDate && <div className="text-red-500 text-sm">{errors.endDate}</div>}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block font-medium">Start Time *</label>
          <input type="time" name="startTime" value={to24HourFormat(form.startTime)} onChange={handleChange} className="w-full border rounded p-2" />
          {errors.startTime && <div className="text-red-500 text-sm">{errors.startTime}</div>}
        </div>
        <div className="flex-1">
          <label className="block font-medium">End Time *</label>
          <input type="time" name="endTime" value={to24HourFormat(form.endTime)} onChange={handleChange} className="w-full border rounded p-2" />
          {errors.endTime && <div className="text-red-500 text-sm">{errors.endTime}</div>}
        </div>
      </div>
      <div>
        <label className="block font-medium">Location</label>
        <input name="location" value={form.location} onChange={handleChange} className="w-full border rounded p-2" />
      </div>
      <div>
        <label className="block font-medium">Directions to Venue</label>
        <textarea name="directionsToVenue" value={form.directionsToVenue} onChange={handleChange} className="w-full border rounded p-2" />
      </div>
      <div>
        <label className="block font-medium">Capacity</label>
        <input type="number" name="capacity" value={form.capacity ?? ''} onChange={handleChange} className="w-full border rounded p-2" />
      </div>
      <div>
        <label className="block font-medium">Admission Type *</label>
        <select name="admissionType" value={form.admissionType} onChange={handleChange} className="w-full border rounded p-2">
          <option value="free">Free</option>
          <option value="ticketed">Ticketed</option>
        </select>
        {errors.admissionType && <div className="text-red-500 text-sm">{errors.admissionType}</div>}
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
        <label className="font-medium">Active</label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Saving...' : 'Save Event'}</button>
        <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={handleReset} disabled={loading}>Reset</button>
      </div>
    </form>
  );
}