import React from 'react';

export function Modal({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 min-w-[350px] max-w-lg w-full relative">
        <button className="absolute top-2 right-2 text-gray-500 text-2xl" onClick={onClose} aria-label="Close">&times;</button>
        {children}
      </div>
    </div>
  );
}