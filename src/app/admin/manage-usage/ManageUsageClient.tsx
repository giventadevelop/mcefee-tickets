'use client';
import { useEffect, useState, useRef } from 'react';
import type { UserProfileDTO } from '@/types';
import Link from 'next/link';
import ReactDOM from 'react-dom';
import { FaEye, FaCheck, FaEdit, FaTimes, FaUsers, FaPhotoVideo, FaCalendarAlt, FaUpload, FaDownload, FaBan, FaChevronLeft, FaChevronRight, FaHome } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { getTenantId } from '@/lib/env';
import { fetchUsersServer, patchUserProfileServer, bulkUploadUsersServer } from './ApiServerActions';

// Import UserDetailsTooltip and EditUserModal from the same file or extract if needed
// ... (copy UserDetailsTooltip and EditUserModal here or import them)

const SEARCH_FIELDS = [
  { label: 'First Name', value: 'firstName' },
  { label: 'Last Name', value: 'lastName' },
  { label: 'Email', value: 'email' },
  { label: 'Phone', value: 'phone' },
];

function UserDetailsTooltip({ user, anchorRect, onClose }: { user: UserProfileDTO, anchorRect: DOMRect | null, onClose: () => void }) {
  if (!anchorRect) return null;

  const tooltipWidth = 450;
  const spacing = 12;

  // Always show tooltip to the right of the anchor cell, never above the columns
  let top = anchorRect.top;
  let left = anchorRect.right + spacing;

  // Clamp position to stay within the viewport
  const estimatedHeight = 300; // Heuristic average height
  if (top + estimatedHeight > window.innerHeight) {
    top = window.innerHeight - estimatedHeight - spacing;
  }
  if (top < spacing) {
    top = spacing;
  }
  if (left + tooltipWidth > window.innerWidth - spacing) {
    left = window.innerWidth - tooltipWidth - spacing;
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 9999,
    background: 'white',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    padding: '16px',
    width: `${tooltipWidth}px`,
    fontSize: '14px',
    maxHeight: '400px',
    overflowY: 'auto',
    transition: 'opacity 0.1s ease-in-out',
  };

  const entries = Object.entries(user);
  return ReactDOM.createPortal(
    <div
      style={style}
      tabIndex={-1}
      className="admin-tooltip"
    >
      <div className="sticky top-0 right-0 z-10 bg-white flex justify-end" style={{ minHeight: 0 }}>
        <button
          onClick={onClose}
          className="w-10 h-10 text-2xl bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          aria-label="Close tooltip"
        >
          &times;
        </button>
      </div>
      <table className="admin-tooltip-table">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <th>{key}</th>
              <td>{value === null || value === undefined || value === '' ? <span className="text-gray-400 italic">(empty)</span> : String(value)}</td>
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
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="ORGANIZER">Organizer</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Status</label>
              <select className="w-full border rounded px-3 py-2" value={form.userStatus || ''} onChange={e => setForm(f => ({ ...f, userStatus: e.target.value }))}>
                <option value="">Select Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="REJECTED">Rejected</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="bg-teal-100 hover:bg-teal-200 text-teal-800 font-bold px-4 py-2 rounded-md flex items-center gap-2 transition-colors" onClick={onClose}>
              <FaBan />
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center gap-2 transition-colors">
              <FaDownload />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

const renderRoleBadge = (role: string | null | undefined) => {
  const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
  switch (role) {
    case 'ADMIN':
      return <span className={`bg-blue-100 text-blue-800 ${baseClasses}`}>Administrator</span>;
    case 'ORGANIZER':
      return <span className={`bg-purple-100 text-purple-800 ${baseClasses}`}>Organizer</span>;
    case 'MEMBER':
      return <span className={`bg-gray-100 text-gray-800 ${baseClasses}`}>Member</span>;
    default:
      return <span className={`bg-gray-100 text-gray-500 italic ${baseClasses}`}>{role || 'Not set'}</span>;
  }
};

const renderStatusBadge = (status: string | null | undefined) => {
  const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
  switch (status) {
    case 'ACTIVE':
    case 'APPROVED':
      return <span className={`bg-green-100 text-green-800 ${baseClasses}`}>{status}</span>;
    case 'PENDING_APPROVAL':
      return <span className={`bg-yellow-100 text-yellow-800 ${baseClasses}`}>Pending</span>;
    case 'REJECTED':
      return <span className={`bg-red-100 text-red-800 ${baseClasses}`}>Rejected</span>;
    default:
      return <span className={`bg-gray-100 text-gray-500 italic ${baseClasses}`}>{status || 'Not set'}</span>;
  }
};

export default function ManageUsageClient({ adminProfile }: { adminProfile: UserProfileDTO | null }) {
  const [users, setUsers] = useState<UserProfileDTO[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
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
  const [page, setPage] = useState(1); // 1-indexed for UI
  const pageSize = 10;

  // Fetch users (paginated)
  async function fetchUsers() {
    setLoading(true);
    try {
      const { data, totalCount } = await fetchUsersServer({
        search,
        searchField,
        status,
        role,
        page,
        pageSize,
      });

      // Support both pageable and array fallback
      if (Array.isArray(data)) {
        setUsers(data);
        setTotalUsers(totalCount || data.length);
      } else if (data && Array.isArray(data.content)) {
        setUsers(data.content);
        setTotalUsers(totalCount || data.totalElements || data.total || 0);
      } else {
        setUsers([]);
        setTotalUsers(0);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  }

  const handleNextPage = () => {
    if (page * pageSize < totalUsers) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, searchField, status, role, page]);

  // Helper to build a complete UserProfileDTO for PATCH
  function buildPatchedUser(user: UserProfileDTO, patch: Partial<UserProfileDTO>): UserProfileDTO {
    return {
      id: user.id,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      country: user.country,
      notes: user.notes,
      familyName: user.familyName,
      cityTown: user.cityTown,
      district: user.district,
      educationalInstitution: user.educationalInstitution,
      profileImageUrl: user.profileImageUrl,
      userRole: user.userRole,
      userStatus: user.userStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      tenantId: user.tenantId,
      reviewedByAdminId: user.reviewedByAdminId,
      reviewedByAdminAt: user.reviewedByAdminAt,
      ...patch,
    };
  }

  async function handleApprove(user: UserProfileDTO) {
    if (!user.id || !adminProfile?.id) {
      setBulkMessage('Admin profile not loaded. Please refresh and try again.');
      return;
    }
    setApprovingId(user.id);
    try {
      const now = new Date().toISOString();
      const payload = buildPatchedUser(user, {
        userStatus: 'APPROVED',
        reviewedByAdminId: adminProfile.id,
        reviewedByAdminAt: now,
        updatedAt: now,
      });
      const res = await patchUserProfileServer(user.id, payload);
      if (res && !res.error) {
        setUsers(users => users.map(u => u.id === user.id ? { ...u, userStatus: 'APPROVED', reviewedByAdminId: adminProfile.id, reviewedByAdminAt: now, updatedAt: now } : u));
      } else {
        setBulkMessage('Approve failed: ' + (res?.error || 'Unknown error'));
        setTimeout(() => setBulkMessage(null), 4000);
      }
    } catch (err: any) {
      setBulkMessage('Approve error: ' + (err?.message || err));
      setTimeout(() => setBulkMessage(null), 4000);
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(user: UserProfileDTO) {
    if (!user.id || !adminProfile?.id) {
      setBulkMessage('Admin profile not loaded. Please refresh and try again.');
      return;
    }
    setRejectingId(user.id);
    try {
      const now = new Date().toISOString();
      const payload = buildPatchedUser(user, {
        userStatus: 'REJECTED',
        reviewedByAdminId: adminProfile.id,
        reviewedByAdminAt: now,
        updatedAt: now,
      });
      const res = await patchUserProfileServer(user.id, payload);
      if (res && !res.error) {
        setUsers(users => users.map(u => u.id === user.id ? { ...u, userStatus: 'REJECTED', reviewedByAdminId: adminProfile.id, reviewedByAdminAt: now, updatedAt: now } : u));
      } else {
        setBulkMessage('Reject failed: ' + (res?.error || 'Unknown error'));
        setTimeout(() => setBulkMessage(null), 4000);
      }
    } catch (err: any) {
      setBulkMessage('Reject error: ' + (err?.message || err));
      setTimeout(() => setBulkMessage(null), 4000);
    } finally {
      setRejectingId(null);
    }
  }

  async function handleEditSave(updated: Partial<UserProfileDTO>) {
    if (!editUser?.id) return;
    setEditLoading(true);
    try {
      const res = await patchUserProfileServer(editUser.id, { ...editUser, ...updated });
      if (res && !res.error) {
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
        };
      });
      const res = await bulkUploadUsersServer(users);
      if (res && !res.error) {
        setBulkMessage('Bulk upload successful!');
        fetchUsers();
        setTimeout(() => setBulkMessage(null), 4000);
      } else {
        setBulkMessage('Bulk upload failed: ' + (res?.error || 'Unknown error'));
      }
    } catch (err: any) {
      setBulkMessage('Bulk upload error: ' + err.message);
    } finally {
      setBulkLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const handleMouseEnter = (user: UserProfileDTO, e: React.MouseEvent) => {
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
    }
    setPopoverUser(user);
    setPopoverAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
  };

  const handleMouseLeave = () => {
    tooltipTimer.current = setTimeout(() => {
      setPopoverUser(null);
    }, 200);
  };

  const startEntry = (page - 1) * pageSize + 1;
  const endEntry = Math.min(page * pageSize, totalUsers);
  const totalPages = Math.ceil(totalUsers / pageSize) || 1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ paddingTop: '118px' }}>
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 justify-items-center mx-auto">
            <Link href="/admin" className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all">
              <FaHome className="text-base sm:text-lg mb-1 mx-auto" />
              <span className="font-semibold text-center leading-tight">Admin Home</span>
            </Link>
            <Link href="/admin/manage-usage" className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all">
              <FaUsers className="text-base sm:text-lg mb-1 mx-auto" />
              <span className="font-semibold text-center leading-tight">Manage Users [Usage]</span>
              <span className="text-xs text-blue-500 mt-1">[Users]</span>
            </Link>
            <Link href="/admin" className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-700 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all">
              <FaCalendarAlt className="text-base sm:text-lg mb-1 mx-auto" />
              <span className="font-semibold text-center leading-tight">Manage Events</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Manage Users</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} disabled={bulkLoading} className="h-10 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50">
            <FaUpload />
            {bulkLoading ? 'Uploading...' : 'Bulk Upload User List'}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleBulkUpload} className="hidden" accept=".xlsx" />
          <a href="https://eventapp-media-bucket.s3.us-east-2.amazonaws.com/media/users_profile_list_bulk_upload_template/users_profile_list_bulk_upload_template.xlsx" download="users_profile_list_bulk_upload_template.xlsx" className="h-10 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
            <FaDownload />
            Download Bulk Upload Template File
          </a>
        </div>
      </div>

      {/* Filter and Action Controls */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              className="h-10 border-gray-300 dark:border-gray-600 rounded-l-md dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            >
              {SEARCH_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <input
              type="text"
              placeholder={`Search by ${SEARCH_FIELDS.find(f => f.value === searchField)?.label}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full h-10 px-3 border-gray-300 dark:border-gray-600 rounded-r-md dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="block w-full h-10 px-3 border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="REJECTED">Rejected</option>
            <option value="APPROVED">Approved</option>
          </select>

          {/* Role Filter */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="block w-full h-10 px-3 border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="ORGANIZER">Organizer</option>
            <option value="MEMBER">Member</option>
          </select>
        </div>
        {bulkMessage && <p className="mt-2 text-sm text-center text-red-600 dark:text-red-400">{bulkMessage}</p>}
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 border border-gray-300 dark:border-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-8 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">Name</th>
                <th scope="col" className="px-8 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">Contact</th>
                <th scope="col" className="px-8 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">Role</th>
                <th scope="col" className="px-8 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">Status</th>
                <th scope="col" className="px-8 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-r border-gray-300 dark:border-gray-600">Joined</th>
                <th scope="col" className="px-8 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-300 dark:border-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-600">
              {loading && Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`skel-${i}`} className={`${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-700'} border-b border-gray-300 dark:border-gray-600`}>
                  <td className="px-8 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div></td>
                  <td className="px-8 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div></td>
                  <td className="px-8 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse"></div></td>
                  <td className="px-8 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse"></div></td>
                  <td className="px-8 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div></td>
                  <td className="px-8 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end items-center gap-2">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.map((user, index) => (
                <tr key={user.id} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-gray-700'} hover:bg-yellow-100 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-300 dark:border-gray-600`}>
                  <td className="px-8 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600" onMouseEnter={(e) => handleMouseEnter(user, e)} onMouseLeave={handleMouseLeave}>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full object-cover" src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`} alt={`${user.firstName} ${user.lastName}`} />
                      </div>
                      <div className="ml-4">
                        <div className="text-xs font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600" onMouseEnter={(e) => handleMouseEnter(user, e)} onMouseLeave={handleMouseLeave}>
                    <div className="text-xs text-gray-900 dark:text-white">{user.phone}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.city}, {user.state}</div>
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600">{renderRoleBadge(user.userRole)}</td>
                  <td className="px-8 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-600">{renderStatusBadge(user.userStatus)}</td>
                  <td className="px-8 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditUser(user)}
                        disabled={editLoading && editUser?.id === user.id}
                        className="p-2 rounded-full text-blue-600 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 transition-colors"
                        aria-label="Edit User"
                        title="Edit User"
                      >
                        <FaEdit />
                      </button>

                      <button
                        onClick={() => handleApprove(user)}
                        disabled={approvingId === user.id || user.userStatus === 'ACTIVE' || user.userStatus === 'APPROVED'}
                        className="p-2 rounded-full text-green-600 bg-green-100 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Approve User"
                        title="Approve User"
                      >
                        {approvingId === user.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div> : <FaCheck />}
                      </button>
                      <button
                        onClick={() => handleReject(user)}
                        disabled={rejectingId === user.id || user.userStatus === 'REJECTED'}
                        className="p-2 rounded-full text-red-600 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Reject User"
                        title="Reject User"
                      >
                        {rejectingId === user.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div> : <FaTimes />}
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        <div className="mt-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <FaChevronLeft />
              Previous
            </button>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </div>
            <button
              onClick={handleNextPage}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              Next
              <FaChevronRight />
            </button>
          </div>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
            Showing <span className="font-medium">{startEntry}</span> to <span className="font-medium">{endEntry}</span> of <span className="font-medium">{totalUsers}</span> results
          </div>
        </div>
      </div>

      {popoverUser && (
        <div
          onMouseEnter={() => {
            if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
          }}
          onMouseLeave={() => {
            tooltipTimer.current = setTimeout(() => {
              setPopoverUser(null);
            }, 200);
          }}
        >
          <UserDetailsTooltip
            user={popoverUser}
            anchorRect={popoverAnchor}
            onClose={() => setPopoverUser(null)}
          />
        </div>
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          open={!!editUser}
          onClose={() => setEditUser(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}