import React, { useEffect, useState } from 'react';
import type { EventDTO, TicketTypeDTO } from '@/types';
import { getTenantId } from '@/lib/env';

interface TicketTypeManagerProps {
  eventId: number;
}

export function TicketTypeManager({ eventId }: TicketTypeManagerProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketTypeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TicketTypeDTO | null>(null);
  const [form, setForm] = useState<Partial<TicketTypeDTO>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTicketTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function fetchTicketTypes() {
    setLoading(true);
    setError(null);
    try {
      const tenantId = getTenantId();
      const res = await fetch(`/api/proxy/ticket-types?page=0&size=100&sort=createdAt,desc&tenantId.equals=${tenantId}`);
      if (!res.ok) throw new Error('Failed to fetch ticket types');
      const data = await res.json();
      // Filter by eventId
      setTicketTypes(Array.isArray(data) ? data.filter((t) => t.event && t.event.id === eventId) : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load ticket types');
    } finally {
      setLoading(false);
    }
  }

  function startAdd() {
    setEditing(null);
    setForm({
      id: 0, // Temporary id for type safety; backend will assign real id
      name: '',
      code: '',
      price: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      availableQuantity: 0,
      isActive: true,
      event: { id: eventId } as any,
      description: '',
    });
    setFormError(null);
  }

  function startEdit(ticket: TicketTypeDTO) {
    setEditing(ticket);
    setForm({ ...ticket });
    setFormError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setForm({});
    setFormError(null);
  }

  async function handleDelete(ticket: TicketTypeDTO) {
    if (!ticket.id) return;
    if (!window.confirm('Delete this ticket type?')) return;
    try {
      await fetch(`/api/proxy/ticket-types/${ticket.id}`, { method: 'DELETE' });
      setTicketTypes((prev) => prev.filter((t) => t.id !== ticket.id));
    } catch (e: any) {
      alert(e.message || 'Failed to delete ticket type');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (!form.name || !form.code || form.price === undefined) {
        setFormError('Name, code, and price are required');
        setSaving(false);
        return;
      }
      const now = new Date().toISOString();
      let payload: any;
      if (editing && editing.id) {
        payload = {
          ...form,
          id: editing.id,
          event: { id: eventId } as any,
          createdAt: form.createdAt || now,
          updatedAt: now,
        };
      } else {
        const { id, ...rest } = form;
        payload = {
          ...rest,
          event: { id: eventId } as any,
          createdAt: form.createdAt || now,
          updatedAt: now,
        };
      }
      let res: Response, data: any;
      if (editing && editing.id) {
        res = await fetch(`/api/proxy/ticket-types/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to update ticket type');
        setTicketTypes((prev) => prev.map((t) => (t.id === editing.id ? data : t)));
      } else {
        res = await fetch('/api/proxy/ticket-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to create ticket type');
        setTicketTypes((prev) => [data, ...prev]);
      }
      cancelEdit();
    } catch (e: any) {
      setFormError(e.message || 'Failed to save ticket type');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Ticket Types</h3>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <>
          <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={startAdd}>Add Ticket Type</button>
          <ul className="mb-4">
            {ticketTypes.length === 0 && <li className="text-gray-500">No ticket types found.</li>}
            {ticketTypes.map((ticket) => (
              <li key={ticket.id} className="flex items-center gap-2 border-b py-2">
                <span className="font-semibold">{ticket.name}</span>
                <span className="text-gray-600">({ticket.code})</span>
                <span className="ml-2">${ticket.price}</span>
                <span className="ml-2 text-xs text-gray-500">Qty: {ticket.availableQuantity ?? '-'}</span>
                <button className="ml-2 text-blue-600 underline" onClick={() => startEdit(ticket)}>Edit</button>
                <button className="ml-2 text-red-600 underline" onClick={() => handleDelete(ticket)}>Delete</button>
              </li>
            ))}
          </ul>
          {(editing || form.name !== undefined) && (
            <form onSubmit={handleSubmit} className="border p-4 rounded bg-gray-50 mb-4">
              <div className="mb-2">
                <label className="block font-medium">Name *</label>
                <input className="border rounded p-2 w-full" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="block font-medium">Code *</label>
                <input className="border rounded p-2 w-full" value={form.code ?? ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="block font-medium">Price *</label>
                <input type="number" className="border rounded p-2 w-full" value={form.price ?? 0} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div className="mb-2">
                <label className="block font-medium">Available Quantity</label>
                <input type="number" className="border rounded p-2 w-full" value={form.availableQuantity ?? 0} onChange={e => setForm(f => ({ ...f, availableQuantity: Number(e.target.value) }))} />
              </div>
              <div className="mb-2">
                <label className="block font-medium">Description</label>
                <textarea className="border rounded p-2 w-full" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="block font-medium">Active</label>
                <input type="checkbox" checked={form.isActive ?? true} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              </div>
              {formError && <div className="text-red-500 mb-2">{formError}</div>}
              <div className="flex gap-2 mt-2">
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={saving}>{editing ? 'Update' : 'Create'}</button>
                <button type="button" className="px-4 py-2 bg-gray-300 rounded" onClick={cancelEdit}>Cancel</button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}