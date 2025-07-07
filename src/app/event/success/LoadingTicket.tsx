"use client";
import Image from "next/image";

export default function LoadingTicket() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6 animate-pulse">
      <Image
        src="/images/selling-tickets-vector-loading-image.jpg"
        alt="Ticket Loading"
        width={180}
        height={180}
        className="mb-4 rounded shadow-lg"
        priority
      />
      <div className="text-xl font-bold text-teal-700 mb-2">Please wait while your ticket is generated</div>
      <div className="text-gray-600 text-base text-center">It may take a few minutes.<br />Do not close this page.</div>
    </div>
  );
}