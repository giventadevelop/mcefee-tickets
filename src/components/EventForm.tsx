import React, { useState, useEffect } from 'react';
import type { EventDTO, EventTypeDTO } from '@/types';

interface EventFormProps {
  event?: EventDTO;
  eventTypes: EventTypeDTO[];
  onSubmit: (event: EventDTO) => void;
  loading?: boolean;
}

const defaultEvent: EventDTO = {
  title: '',
  caption: '',
  description: '',
  event_type_id: 0,
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  location: '',
  directions_to_venue: '',
  capacity: undefined,
  admission_type: 'free',
  is_active: true,
  created_by: '',
};

export function EventForm({ event, eventTypes, onSubmit, loading }: EventFormProps) {
  const [form, setForm] = useState<EventDTO>({ ...defaultEvent, ...event, created_by: event?.created_by ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (event) setForm({ ...defaultEvent, ...event, created_by: event.created_by ?? '' });
  }, [event]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title) errs.title = 'Title is required';
    if (!form.event_type_id) errs.event_type_id = 'Event type is required';
    if (!form.start_date) errs.start_date = 'Start date is required';
    if (!form.end_date) errs.end_date = 'End date is required';
    if (!form.start_time) errs.start_time = 'Start time is required';
    if (!form.end_time) errs.end_time = 'End time is required';
    if (!form.admission_type) errs.admission_type = 'Admission type is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
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
        <select name="event_type_id" value={form.event_type_id} onChange={handleChange} className="w-full border rounded p-2">
          <option value={0}>Select event type</option>
          {eventTypes.map((et) => (
            <option key={et.id} value={et.id}>{et.name}</option>
          ))}
        </select>
        {errors.event_type_id && <div className="text-red-500 text-sm">{errors.event_type_id}</div>}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block font-medium">Start Date *</label>
          <input type="date" name="start_date" value={form.start_date} onChange={handleChange} className="w-full border rounded p-2" />
          {errors.start_date && <div className="text-red-500 text-sm">{errors.start_date}</div>}
        </div>
        <div className="flex-1">
          <label className="block font-medium">End Date *</label>
          <input type="date" name="end_date" value={form.end_date} onChange={handleChange} className="w-full border rounded p-2" />
          {errors.end_date && <div className="text-red-500 text-sm">{errors.end_date}</div>}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block font-medium">Start Time *</label>
          <input type="time" name="start_time" value={form.start_time} onChange={handleChange} className="w-full border rounded p-2" />
          {errors.start_time && <div className="text-red-500 text-sm">{errors.start_time}</div>}
        </div>
        <div className="flex-1">
          <label className="block font-medium">End Time *</label>
          <input type="time" name="end_time" value={form.end_time} onChange={handleChange} className="w-full border rounded p-2" />
          {errors.end_time && <div className="text-red-500 text-sm">{errors.end_time}</div>}
        </div>
      </div>
      <div>
        <label className="block font-medium">Location</label>
        <input name="location" value={form.location} onChange={handleChange} className="w-full border rounded p-2" />
      </div>
      <div>
        <label className="block font-medium">Directions to Venue</label>
        <textarea name="directions_to_venue" value={form.directions_to_venue} onChange={handleChange} className="w-full border rounded p-2" />
      </div>
      <div>
        <label className="block font-medium">Capacity</label>
        <input type="number" name="capacity" value={form.capacity ?? ''} onChange={handleChange} className="w-full border rounded p-2" />
      </div>
      <div>
        <label className="block font-medium">Admission Type *</label>
        <select name="admission_type" value={form.admission_type} onChange={handleChange} className="w-full border rounded p-2">
          <option value="free">Free</option>
          <option value="ticketed">Ticketed</option>
        </select>
        {errors.admission_type && <div className="text-red-500 text-sm">{errors.admission_type}</div>}
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
        <label className="font-medium">Active</label>
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Saving...' : 'Save Event'}</button>
    </form>
  );
}