"use client";
import { useState, useTransition } from "react";
import { updateEventTicketTransactionCheckIn } from "./ApiServerActions";
import type { QrCodeUsageDTO, EventTicketTransactionDTO, EventTicketTransactionItemDTO } from "@/types";

export default function CheckInFormClient({
  eventId,
  transactionId,
  qrCodeUsage,
  transaction,
  items,
}: {
  eventId: string;
  transactionId: string;
  qrCodeUsage: QrCodeUsageDTO;
  transaction: EventTicketTransactionDTO | undefined;
  items: EventTicketTransactionItemDTO[];
}) {
  const [usageCount, setUsageCount] = useState(transaction?.numberOfGuestsCheckedIn ?? 0);
  const [checkedIn, setCheckedIn] = useState(transaction?.checkInStatus === "CHECKED_IN" || transaction?.status === "CHECKED_IN");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxCheckIn = transaction?.quantity || items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    if (usageCount > maxCheckIn) {
      setError(`Cannot check in more than ${maxCheckIn} people (total tickets purchased).`);
      return;
    }
    startTransition(async () => {
      try {
        await updateEventTicketTransactionCheckIn(transactionId, {
          checkInStatus: checkedIn ? "CHECKED_IN" : "NOT_CHECKED_IN",
          numberOfGuestsCheckedIn: usageCount,
          checkInTime: checkedIn ? new Date().toISOString() : undefined,
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError("Failed to update check-in. Please try again.");
      }
    });
  };

  return (
    <form className="bg-white rounded-lg shadow-md p-6" onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Number of People Checking In</label>
        <input
          type="number"
          name="usageCount"
          min={1}
          max={maxCheckIn}
          value={usageCount}
          onChange={e => setUsageCount(Number(e.target.value))}
          className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base"
        />
        <div className="text-xs text-gray-500 mt-1">Max: {maxCheckIn}</div>
      </div>
      <div className="mb-4">
        <label className="flex flex-col items-center">
          <span className="relative flex items-center justify-center">
            <input
              type="checkbox"
              name="checkedIn"
              checked={checkedIn}
              onChange={e => setCheckedIn(e.target.checked)}
              className="custom-checkbox"
              onClick={e => e.stopPropagation()}
            />
            <span className="custom-checkbox-tick">
              {checkedIn && (
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                </svg>
              )}
            </span>
          </span>
          <span className="mt-2 text-xs text-center select-none break-words max-w-[6rem]">Check-in is done</span>
        </label>
      </div>
      <button
        type="submit"
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
        disabled={isPending}
      >
        {isPending ? "Updating..." : "Update Check-In"}
      </button>
      {success && <div className="text-green-600 mt-2">Check-in updated!</div>}
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </form>
  );
}