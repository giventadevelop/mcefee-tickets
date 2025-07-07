'use client';

import React, { useState, useTransition } from 'react';
import type { DiscountCodeDTO, EventDetailsDTO } from '@/types';
import Link from 'next/link';
import { FaPhotoVideo, FaTicketAlt, FaTags, FaPlus, FaEdit, FaTrashAlt, FaSave, FaBan, FaTimes } from 'react-icons/fa';
import { Modal } from '@/components/Modal';
import { deleteDiscountCodeServer, patchDiscountCodeServer, createDiscountCodeServer } from './ApiServerActions';

interface DiscountCodeListClientProps {
  eventId: string;
  initialDiscountCodes: DiscountCodeDTO[];
  eventDetails: EventDetailsDTO | null;
}

export default function DiscountCodeListClient({
  eventId,
  initialDiscountCodes,
  eventDetails,
}: DiscountCodeListClientProps) {
  const [discountCodes, setDiscountCodes] = useState<DiscountCodeDTO[]>(initialDiscountCodes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCodeDTO | null>(null);
  const [deletingCode, setDeletingCode] = useState<DiscountCodeDTO | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAddNewClick = () => {
    setEditingCode(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (code: DiscountCodeDTO) => {
    setEditingCode(code);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (code: DiscountCodeDTO) => {
    setError(null);
    setDeletingCode(code);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCode(null);
    setError(null);
  };

  const confirmDelete = () => {
    if (!deletingCode || typeof deletingCode.id !== 'number') return;

    const idToDelete = deletingCode.id;

    startTransition(async () => {
      try {
        setError(null);
        await deleteDiscountCodeServer(idToDelete);
        setDiscountCodes(prev => prev.filter(c => c.id !== idToDelete));
        setDeletingCode(null);
      } catch (err: any) {
        setError(err.message || 'Failed to delete discount code.');
      }
    });
  };

  const handleSave = (formData: Partial<DiscountCodeDTO>) => {
    startTransition(async () => {
      try {
        setError(null);
        let updatedCode;
        if (editingCode) {
          // PATCH update via server action
          const payload = {
            ...formData,
            eventId: parseInt(eventId, 10),
            createdAt: editingCode.createdAt, // preserve original
          };
          updatedCode = await patchDiscountCodeServer(editingCode.id!, payload);
        } else {
          // CREATE via server action (not direct fetch!)
          // Ensure all required fields are present for the DTO
          const payload = {
            code: formData.code ?? '',
            discountType: formData.discountType ?? '',
            discountValue: formData.discountValue ?? 0,
            eventId: parseInt(eventId, 10),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Optional fields
            description: formData.description,
            maxUses: formData.maxUses,
            usesCount: formData.usesCount,
            isActive: formData.isActive,
          };
          updatedCode = await createDiscountCodeServer(payload, eventId);
        }

        setDiscountCodes(prev => {
          if (editingCode) {
            return prev.map(c => c.id === updatedCode.id ? updatedCode : c);
          }
          return [...prev, updatedCode];
        });

        handleCloseModal();
      } catch (err: any) {
        console.error("Save operation failed:", err);
        setError(err.message || "An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 justify-items-center mx-auto">
            <Link href={`/admin/events/${eventId}/media/list`} className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all">
              <FaPhotoVideo className="text-base sm:text-lg mb-1 mx-auto" />
              <span className="font-semibold text-center leading-tight">Manage Media Files</span>
            </Link>
            <Link href={`/admin/events/${eventId}/ticket-types/list`} className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-700 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all">
              <FaTicketAlt className="text-base sm:text-lg mb-1 mx-auto" />
              <span className="font-semibold text-center leading-tight">Manage Ticket Types</span>
            </Link>
            <Link href={`/admin/events/${eventId}/discount-codes/list`} className="w-48 max-w-xs mx-auto flex flex-col items-center justify-center bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-md shadow p-1 sm:p-2 text-xs sm:text-xs transition-all">
              <FaTags className="text-base sm:text-lg mb-1 mx-auto" />
              <span className="font-semibold text-center leading-tight">Manage Discount Codes</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Discount Codes for {eventDetails?.title}
          </h1>
          <button
            onClick={handleAddNewClick}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FaPlus /> Add New Discount Code
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uses</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {discountCodes.map((code) => (
                <tr key={code.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{code.code}</div>
                    <div className="text-sm text-gray-500">{code.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{code.discountType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{code.discountValue}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{code.usesCount} / {code.maxUses || '∞'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${code.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {code.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEditClick(code)} className="text-indigo-600 hover:text-indigo-900 mr-4"><FaEdit className="w-5 h-5" /></button>
                    <button onClick={() => handleDeleteClick(code)} className="text-red-600 hover:text-red-900"><FaTrashAlt className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {discountCodes.length === 0 && (
          <p className="mt-4 text-center text-gray-500">No discount codes found for this event.</p>
        )}
      </div>

      <DiscountCodeModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        code={editingCode}
        isPending={isPending}
        error={error}
      />

      {deletingCode && (
        <Modal open={!!deletingCode} onClose={() => setDeletingCode(null)} title="Confirm Deletion">
          <div className="text-center">
            <p className="text-lg">
              Are you sure you want to delete the discount code: <strong>{deletingCode.code}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
            {error && <div className="mt-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => setDeletingCode(null)}
                className="bg-teal-100 hover:bg-teal-200 text-teal-800 px-4 py-2 rounded-md flex items-center gap-2"
                disabled={isPending}
              >
                <FaTimes /> Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                disabled={isPending}
              >
                <FaTrashAlt /> {isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DiscountCodeModal({ open, onClose, onSave, code, isPending, error }: {
  open: boolean,
  onClose: () => void,
  onSave: (code: Partial<DiscountCodeDTO>) => void,
  code: DiscountCodeDTO | null,
  isPending: boolean,
  error: string | null
}) {
  const [formData, setFormData] = useState<Partial<DiscountCodeDTO>>({});

  React.useEffect(() => {
    if (code) {
      setFormData(code);
    } else {
      setFormData({
        code: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: 0,
        maxUses: 100,
        isActive: true,
      });
    }
  }, [code]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    let processedValue: string | number | boolean = value;

    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      processedValue = value === '' ? 0 : parseFloat(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal open={open} onClose={onClose} title={code ? 'Edit Discount Code' : 'Add New Discount Code'}>
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">Code</label>
            <input type="text" name="code" id="code" value={formData.code || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <input type="text" name="description" id="description" value={formData.description || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="discountType" className="block text-sm font-medium text-gray-700">Discount Type</label>
            <select name="discountType" id="discountType" value={formData.discountType || 'PERCENTAGE'} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed Amount</option>
            </select>
          </div>
          <div>
            <label htmlFor="discountValue" className="block text-sm font-medium text-gray-700">Discount Value</label>
            <input type="number" name="discountValue" id="discountValue" value={formData.discountValue || 0} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
          </div>
          <div>
            <label htmlFor="maxUses" className="block text-sm font-medium text-gray-700">Max Uses</label>
            <input type="number" name="maxUses" id="maxUses" value={formData.maxUses || 0} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div className="flex items-center pt-6">
            <label htmlFor="isActive" className="flex items-center cursor-pointer">
              <span className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  className="custom-checkbox"
                  checked={!!formData.isActive}
                  onChange={handleChange}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="custom-checkbox-tick">
                  {formData.isActive && (
                    <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                    </svg>
                  )}
                </span>
              </span>
              <span className="ml-3 block text-sm text-gray-900">Active</span>
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isPending} className="bg-teal-100 hover:bg-teal-200 text-teal-800 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
            <FaBan /> Cancel
          </button>
          <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
            {isPending ? 'Saving...' : 'Save'} <FaSave />
          </button>
        </div>
      </form>
    </Modal>
  );
}