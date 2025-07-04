"use client";
import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import type { EventTicketTransactionDTO } from '@/types';
import { FaEnvelope } from 'react-icons/fa';

function TicketDetailsTooltip({ ticket, anchorRect, onClose }: { ticket: EventTicketTransactionDTO, anchorRect: DOMRect | null, onClose: () => void }) {
  if (!anchorRect) return null;
  if (typeof window === 'undefined' || !document.body) return null;
  const tooltipWidth = 420;
  const spacing = 12;
  let top = anchorRect.top;
  let left = anchorRect.right + spacing;
  const estimatedHeight = 300;
  if (top + estimatedHeight > window.innerHeight) {
    top = window.innerHeight - estimatedHeight - spacing;
  }
  if (top < spacing) {
    top = spacing;
  }
  if (left + tooltipWidth > window.innerWidth) {
    left = window.innerWidth - tooltipWidth - spacing;
  }
  const style: React.CSSProperties = {
    position: 'fixed',
    top,
    left,
    zIndex: 9999,
    background: 'white',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    padding: 16,
    width: tooltipWidth,
    fontSize: 14,
    maxHeight: 400,
    overflowY: 'auto',
    transition: 'opacity 0.1s ease-in-out',
  };
  const entries = Object.entries(ticket);
  return ReactDOM.createPortal(
    <div style={style} tabIndex={-1} className="admin-tooltip">
      <div className="sticky top-0 right-0 z-10 bg-white flex justify-end">
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

export default function TicketTableClient({ rows }: { rows: EventTicketTransactionDTO[] }) {
  const [popoverTicket, setPopoverTicket] = useState<EventTicketTransactionDTO | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);
  const [emailSentId, setEmailSentId] = useState<number | null>(null);
  const [emailErrorId, setEmailErrorId] = useState<number | null>(null);

  const handleMouseEnter = (ticket: EventTicketTransactionDTO, e: React.MouseEvent) => {
    setPopoverTicket(ticket);
    setPopoverAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
  };
  const handleClose = () => setPopoverTicket(null);

  async function handleSendEmail(ticket: EventTicketTransactionDTO) {
    setSendingEmailId(typeof ticket.id === 'number' ? ticket.id : -1);
    setEmailSentId(null);
    setEmailErrorId(null);
    try {
      const res = await fetch(`/api/proxy/events/${ticket.eventId}/transactions/${ticket.id}/send-ticket-email?to=${encodeURIComponent(ticket.email ?? '')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      if (res.ok) {
        setEmailSentId(typeof ticket.id === 'number' ? ticket.id : -1);
      } else {
        setEmailErrorId(typeof ticket.id === 'number' ? ticket.id : -1);
      }
    } catch (err) {
      setEmailErrorId(typeof ticket.id === 'number' ? ticket.id : -1);
    } finally {
      setSendingEmailId(null);
    }
  }

  return (
    <>
      {rows.length === 0 ? (
        <tr>
          <td colSpan={7} className="text-center py-8 text-gray-500">No tickets found.</td>
        </tr>
      ) : (
        rows.map((ticket) => (
          <tr key={ticket.id} className="hover:bg-gray-50">
            <td className="px-4 py-2" onMouseEnter={e => handleMouseEnter(ticket, e)}>{ticket.id}</td>
            <td className="px-4 py-2" onMouseEnter={e => handleMouseEnter(ticket, e)}>{ticket.firstName} {ticket.lastName}</td>
            <td className="px-4 py-2">
              <div>{ticket.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  className="text-blue-600 hover:text-blue-800 focus:outline-none flex items-center gap-1 group"
                  title="Resend ticket email"
                  onClick={() => handleSendEmail(ticket)}
                  disabled={sendingEmailId === (typeof ticket.id === 'number' ? ticket.id : -1)}
                >
                  <span className="relative flex items-center">
                    <FaEnvelope className="animate-send-email" />
                  </span>
                  <span className="ml-1 group-hover:underline">Resend Email</span>
                </button>
                {sendingEmailId === (typeof ticket.id === 'number' ? ticket.id : -1) && <span className="ml-1 text-xs text-gray-400">Sending...</span>}
                {emailSentId === (typeof ticket.id === 'number' ? ticket.id : -1) && <span className="ml-1 text-xs text-green-600">Sent!</span>}
                {emailErrorId === (typeof ticket.id === 'number' ? ticket.id : -1) && <span className="ml-1 text-xs text-red-600">Error</span>}
              </div>
            </td>
            <td className="px-4 py-2">{ticket.quantity}</td>
            <td className="px-4 py-2">${ticket.finalAmount?.toFixed(2)}</td>
            <td className="px-4 py-2">{ticket.purchaseDate ? new Date(ticket.purchaseDate).toLocaleString() : ''}</td>
            <td className="px-4 py-2">{ticket.status}</td>
          </tr>
        ))
      )}
      {popoverTicket && (
        <TicketDetailsTooltip
          ticket={popoverTicket}
          anchorRect={popoverAnchor}
          onClose={handleClose}
        />
      )}
    </>
  );
}