"use client";
import { useEffect, useState, useRef } from 'react';
import type { UserProfileDTO } from '@/types';
import Link from 'next/link';
import ReactDOM from 'react-dom';
import { useAuth } from '@clerk/nextjs';
import { FaEye, FaCheck, FaEdit, FaTimes } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { getTenantId } from '@/lib/env';

const SEARCH_FIELDS = [
  { label: 'First Name', value: 'firstName' },
  { label: 'Last Name', value: 'lastName' },
  { label: 'Email', value: 'email' },
  { label: 'Phone', value: 'phone' },
];

function UserDetailsTooltip({ user, anchorRect, onClose }: { user: UserProfileDTO, anchorRect: DOMRect | null, onClose: () => void }) {
  if (!anchorRect) return null;
  // Center the tooltip horizontally relative to the anchor
  const tooltipWidth = 400;
  const left = Math.max(
    window.scrollX + anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2,
    16 // prevent offscreen left
  );
  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.top + window.scrollY + anchorRect.height + 8,
    left,
    zIndex: 9999,
    background: 'white',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    padding: 16,
    minWidth: tooltipWidth,
    maxWidth: tooltipWidth,
    fontSize: 14,
    maxHeight: 400,
    overflowY: 'auto',
  };
  // Show all fields in the DTO
  const entries = Object.entries(user);
  return ReactDOM.createPortal(
    <div
      style={style}
      onMouseEnter={e => e.stopPropagation()}
      onMouseLeave={onClose}
      tabIndex={-1}
      className="user-details-tooltip"
    >
      <table className="w-full text-sm border border-gray-300">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td className="font-bold pr-4 border-r border-gray-200 align-top whitespace-nowrap">{key}:</td>
              <td className="break-all">{value === null || value === undefined || value === '' ? <span className="text-gray-400 italic">(empty)</span> : String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>,
    document.body
  );
}

function EditUserModal({ user, open, onClose, onSave }: {
  user: UserProfileDTO | null,
  open: boolean,
  onClose: () => void,
  onSave: (updated: Partial<UserProfileDTO>) => void,
}) {
  const [form, setForm] = useState<Partial<UserProfileDTO>>(user || {});
  useEffect(() => {
    setForm(user || {});
  }, [user]);
  if (!open || !user) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg font-bold" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Edit User</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-4"
        >
          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">First Name</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.firstName || ''} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="block font-semibold mb-1">Last Name</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.lastName || ''} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Email</label>
              <input type="email" className="w-full border rounded px-3 py-2" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block font-semibold mb-1">Phone</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Address Line 1</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.addressLine1 || ''} onChange={e => setForm(f => ({ ...f, addressLine1: e.target.value }))} />
            </div>
            <div>
              <label className="block font-semibold mb-1">Address Line 2</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.addressLine2 || ''} onChange={e => setForm(f => ({ ...f, addressLine2: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">City</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="block font-semibold mb-1">State</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.state || ''} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Zip Code</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.zipCode || ''} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} />
            </div>
            <div>
              <label className="block font-semibold mb-1">Country</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.country || ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
            </div>
          </div>
          {/* India related details section title */}
          <div className="pt-2 pb-1">
            <h3 className="text-lg font-semibold text-blue-700 border-b border-blue-200 mb-2">India related details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Family Name</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.familyName || ''} onChange={e => setForm(f => ({ ...f, familyName: e.target.value }))} />
            </div>
            <div>
              <label className="block font-semibold mb-1">City/Town</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.cityTown || ''} onChange={e => setForm(f => ({ ...f, cityTown: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">District</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.district || ''} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
            </div>
            <div>
              <label className="block font-semibold mb-1">Educational Institution</label>
              <input type="text" className="w-full border rounded px-3 py-2" value={form.educationalInstitution || ''} onChange={e => setForm(f => ({ ...f, educationalInstitution: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block font-semibold mb-1">Profile Image URL</label>
            <input type="text" className="w-full border rounded px-3 py-2" value={form.profileImageUrl || ''} onChange={e => setForm(f => ({ ...f, profileImageUrl: e.target.value }))} />
          </div>
          <div>
            <label className="block font-semibold mb-1">Notes</label>
            <textarea className="w-full border rounded px-3 py-2" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Role</label>
              <select className="w-full border rounded px-3 py-2" value={form.userRole || ''} onChange={e => setForm(f => ({ ...f, userRole: e.target.value }))}>
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Status</label>
              <select className="w-full border rounded px-3 py-2" value={form.userStatus || ''} onChange={e => setForm(f => ({ ...f, userStatus: e.target.value }))}>
                <option value="">Select Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function ManageUsagePage() {
  const { userId } = useAuth();
  const [adminProfile, setAdminProfile] = useState<UserProfileDTO | null>(null);
  const [users, setUsers] = useState<UserProfileDTO[]>([]);
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState('firstName');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [hoveredUserId, setHoveredUserId] = useState<number | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  const [popoverUser, setPopoverUser] = useState<UserProfileDTO | null>(null);
  const tooltipTimer = useRef<NodeJS.Timeout | null>(null);
  const [editUser, setEditUser] = useState<UserProfileDTO | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current admin's user profile
  useEffect(() => {
    if (!userId) return;
    async function fetchAdminProfile() {
      const res = await fetch(`/api/proxy/user-profiles/by-user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setAdminProfile(Array.isArray(data) ? data[0] : data);
      }
    }
    fetchAdminProfile();
  }, [userId]);

  // Fetch users (moved to function for reuse)
  async function fetchUsers() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search && searchField) {
      params.append(`${searchField}.contains`, search);
    }
    if (status) params.append('userStatus.equals', status);
    if (role) params.append('userRole.equals', role);
    const res = await fetch(`/api/proxy/user-profiles?${params.toString()}`);
    if (res.ok) {
      setUsers(await res.json());
    } else {
      setUsers([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, searchField, status, role]);

  async function handleApprove(user: UserProfileDTO) {
    if (!user.id || !adminProfile?.id) return;
    setApprovingId(user.id);
    try {
      const res = await fetch(`/api/proxy/user-profiles/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user,
          userStatus: 'approved',
          reviewedByAdminId: adminProfile.id,
          reviewedByAdminAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setUsers(users => users.map(u => u.id === user.id ? { ...u, userStatus: 'approved', reviewedByAdminId: adminProfile.id, reviewedByAdminAt: new Date().toISOString() } : u));
      }
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(user: UserProfileDTO) {
    if (!user.id || !adminProfile?.id) return;
    setRejectingId(user.id);
    try {
      const res = await fetch(`/api/proxy/user-profiles/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user,
          userStatus: 'rejected',
          reviewedByAdminId: adminProfile.id,
          reviewedByAdminAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setUsers(users => users.map(u => u.id === user.id ? { ...u, userStatus: 'rejected', reviewedByAdminId: adminProfile.id, reviewedByAdminAt: new Date().toISOString() } : u));
      }
    } finally {
      setRejectingId(null);
    }
  }

  async function handleEditSave(updated: Partial<UserProfileDTO>) {
    if (!editUser?.id) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/proxy/user-profiles/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editUser, ...updated }),
      });
      if (res.ok) {
        setUsers(users => users.map(u => u.id === editUser.id ? { ...u, ...updated } : u));
        setEditUser(null);
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkMessage(null);
    setBulkLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      let rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!Array.isArray(rows)) {
        rows = [rows];
      }

      const users = rows.map((row: any, i: number) => {
        const now = new Date().toISOString();
        const getUniqueId = () =>
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? 'bulk_' + crypto.randomUUID()
            : 'bulk_' + Date.now() + '_' + i;
        return {
          userId: row.userId && String(row.userId).trim() ? row.userId : getUniqueId(),
          createdAt: row.createdAt && String(row.createdAt).trim() ? row.createdAt : now,
          updatedAt: row.updatedAt && String(row.updatedAt).trim() ? row.updatedAt : now,
          firstName: row.firstName || "",
          lastName: row.lastName || "",
          email: row.email || "",
          phone: row.phone || "",
          addressLine1: row.addressLine1 || "",
          addressLine2: row.addressLine2 || "",
          city: row.city || "",
          state: row.state || "",
          zipCode: row.zipCode ? String(row.zipCode) : "",
          country: row.country || "",
          notes: row.notes || "",
          familyName: row.familyName || "",
          cityTown: row.cityTown || "",
          district: row.district || "",
          educationalInstitution: row.educationalInstitution || "",
          profileImageUrl: row.profileImageUrl || "",
          userRole: row.userRole || "MEMBER",
          userStatus: row.userStatus || "pending",
          tenantId: getTenantId(),
        };
      });

      const res = await fetch('/api/proxy/user-profiles/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users),
      });
      if (res.ok) {
        setBulkMessage('Bulk upload successful!');
        fetchUsers();
        setTimeout(() => setBulkMessage(null), 4000);
      } else {
        const err = await res.text();
        setBulkMessage('Bulk upload failed: ' + err);
      }
    } catch (err: any) {
      setBulkMessage('Bulk upload error: ' + err.message);
    } finally {
      setBulkLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      {/* Bulk Upload Button */}
      <div className="mb-4 flex items-center gap-4">
        <button
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 font-semibold"
          onClick={() => fileInputRef.current?.click()}
          disabled={bulkLoading}
        >
          {bulkLoading ? 'Uploading...' : 'Bulk Upload Users from Excel'}
        </button>
        <input
          type="file"
          accept=".xlsx"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleBulkUpload}
        />
        {bulkMessage && (
          <span className={bulkMessage.startsWith('Bulk upload successful') ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
            {bulkMessage}
          </span>
        )}
        <a
          href="/user-bulk-upload-template.xlsx"
          download
          className="ml-4 text-blue-600 underline text-sm"
        >
          Download Excel Template
        </a>
      </div>
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <select
          className="border px-3 py-2 rounded"
          value={searchField}
          onChange={e => setSearchField(e.target.value)}
        >
          {SEARCH_FIELDS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder={`Search by ${SEARCH_FIELDS.find(f => f.value === searchField)?.label.toLowerCase()}`}
          className="border px-3 py-2 rounded w-64"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="border px-3 py-2 rounded" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="approved">Approved</option>
        </select>
        <select className="border px-3 py-2 rounded" value={role} onChange={e => setRole(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 bg-white rounded shadow text-sm">
          <thead>
            <tr className="bg-blue-100">
              <th className="border px-3 py-2">First Name</th>
              <th className="border px-3 py-2">Last Name</th>
              <th className="border px-3 py-2">Email</th>
              <th className="border px-3 py-2">Status</th>
              <th className="border px-3 py-2">Role</th>
              <th className="border px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8">No users found.</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-blue-50">
                <td className="border px-3 py-2">{user.firstName}</td>
                <td className="border px-3 py-2">{user.lastName}</td>
                <td className="border px-3 py-2">{user.email}</td>
                <td className="border px-3 py-2">{user.userStatus}</td>
                <td className="border px-3 py-2">{user.userRole}</td>
                <td className="border px-3 py-2 flex gap-2 items-center">
                  <span
                    onMouseEnter={e => {
                      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
                      setHoveredUserId(user.id!);
                      setPopoverUser(user);
                      setPopoverAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
                    }}
                    onMouseLeave={() => {
                      tooltipTimer.current = setTimeout(() => {
                        setHoveredUserId(null);
                        setPopoverUser(null);
                        setPopoverAnchor(null);
                      }, 200);
                    }}
                  >
                    <button
                      type="button"
                      tabIndex={0}
                      className="flex items-center gap-1 text-blue-600 hover:underline bg-transparent border-none p-0 m-0 cursor-pointer focus:outline-none"
                      style={{ background: 'none' }}
                      onClick={e => { e.preventDefault(); }}
                    >
                      <FaEye className="inline-block" /> <span>View</span>
                    </button>
                  </span>
                  <button
                    className="flex items-center gap-1 text-green-600 hover:underline disabled:opacity-50"
                    disabled={approvingId === user.id || user.userStatus === 'approved'}
                    onClick={() => handleApprove(user)}
                  >
                    <FaCheck className="inline-block" />
                    <span>{approvingId === user.id ? 'Approving...' : 'Approve'}</span>
                  </button>
                  <button className="flex items-center gap-1 text-yellow-600 hover:underline"
                    onClick={() => setEditUser(user)}>
                    <FaEdit className="inline-block" /> <span>Edit</span>
                  </button>
                  <button
                    className="flex items-center gap-1 text-red-600 hover:underline disabled:opacity-50"
                    disabled={rejectingId === user.id || user.userStatus === 'rejected'}
                    onClick={() => handleReject(user)}
                  >
                    <FaTimes className="inline-block" />
                    <span>{rejectingId === user.id ? 'Rejecting...' : 'Reject'}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {popoverUser && hoveredUserId === popoverUser.id && (
          <div
            onMouseEnter={() => {
              if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
            }}
            onMouseLeave={() => {
              tooltipTimer.current = setTimeout(() => {
                setHoveredUserId(null);
                setPopoverUser(null);
                setPopoverAnchor(null);
              }, 200);
            }}
          >
            <UserDetailsTooltip user={popoverUser} anchorRect={popoverAnchor} onClose={() => {
              setHoveredUserId(null);
              setPopoverUser(null);
              setPopoverAnchor(null);
            }} />
          </div>
        )}
      </div>
      <EditUserModal
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSave={handleEditSave}
      />
    </div>
  );
}