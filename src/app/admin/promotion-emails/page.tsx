"use client";
import React, { useState } from "react";
import { PromotionEmailRequestDTO } from "@/types";
import { sendPromotionEmailServer } from "./serverActions";
import DOMPurify from "dompurify";
import Link from 'next/link';
import { FaUsers, FaPhotoVideo, FaCalendarAlt, FaTags, FaTicketAlt, FaPercent, FaHome } from 'react-icons/fa';

function cleanHtmlInput(input: string) {
  let clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      "div", "h2", "p", "span", "a", "img", "ul", "li", "strong", "em", "br"
    ],
    ALLOWED_ATTR: ["style", "href", "src", "alt"]
  });
  clean = clean.replace(/[\u200B-\u200D\uFEFF]/g, "");
  return clean;
}

export default function PromotionEmailPage() {
  const [form, setForm] = useState<Partial<PromotionEmailRequestDTO>>({ bodyHtml: "", tenantId: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear messages when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };
  const handleSubmit = async (e: React.FormEvent, isTestEmail = false) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const cleanedHtml = cleanHtmlInput(form.bodyHtml || "");
    if (!cleanedHtml.trim()) {
      setError("Body HTML is empty or invalid after cleaning. Please check your input.");
      return;
    }
    try {
      // Debug logging
      console.log('handleSubmit - isTestEmail parameter:', isTestEmail);
      console.log('handleSubmit - form data:', { ...form, bodyHtml: cleanedHtml, isTestEmail });
      
      await sendPromotionEmailServer({ ...form, bodyHtml: cleanedHtml, isTestEmail });
      // Don't reset form to retain values after submission
      setSuccess(isTestEmail ? "Test email sent successfully!" : "Bulk email sent successfully!");
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to send promotion email");
      setSuccess(null);
    }
  };
  return (
    <div className="max-w-6xl mx-auto px-4 pt-32 pb-8">
      {/* Responsive Button Group */}
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-1 sm:gap-2 mb-8 justify-items-stretch max-w-[280px] sm:max-w-2xl sm:mx-auto">
          <Link href="/admin" className="flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-lg shadow-sm hover:shadow-md p-1.5 sm:p-3 text-xs transition-all duration-200 min-h-[60px] sm:min-h-[80px]">
            <FaHome className="text-xs sm:text-base mb-0.5 sm:mb-1" />
            <span className="font-medium text-center leading-tight text-[8px] sm:text-xs">Admin Home</span>
          </Link>
          <Link href="/admin/manage-usage" className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg shadow-sm hover:shadow-md p-1.5 sm:p-3 text-xs transition-all duration-200 min-h-[60px] sm:min-h-[80px]">
            <FaUsers className="text-xs sm:text-base mb-0.5 sm:mb-1" />
            <span className="font-medium text-center leading-tight text-[8px] sm:text-xs">Manage Usage<br />[Users]</span>
          </Link>
          <Link href="/admin" className="flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-800 rounded-lg shadow-sm hover:shadow-md p-1.5 sm:p-3 text-xs transition-all duration-200 min-h-[60px] sm:min-h-[80px]">
            <FaCalendarAlt className="text-xs sm:text-base mb-0.5 sm:mb-1" />
            <span className="font-medium text-center leading-tight text-[8px] sm:text-xs">Manage Events</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4">Send Promotion Email</h1>
        <form onSubmit={e => handleSubmit(e, false)} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="to">Recipient Email <span className="text-red-500">*</span></label>
            <input type="text" id="to" name="to" value={form.to || ""} onChange={handleChange} required className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="subject">Subject <span className="text-red-500">*</span></label>
            <input type="text" id="subject" name="subject" value={form.subject || ""} onChange={handleChange} required className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base" />
          </div>
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-2 p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div className="mb-2"><strong>For promo code, the sample URL will be like this:</strong></div>
              <div className="font-mono text-xs bg-white p-2 rounded mb-2 overflow-x-auto">
                https://eventapp-media-bucket.s3.us-east-2.amazonaws.com/events/tenantId/tenant_demo_001/promotions/promotion_code_001/email-templates/email_header_image.jpeg
              </div>
              <div className="space-y-2">
                <div>You should also make sure you have the file the image <span className="font-mono text-xs font-semibold bg-white px-1 rounded">email_header_image.jpeg</span> under the folder <span className="font-mono text-xs font-semibold bg-white px-1 rounded">promotion_code_001/email-templates/</span> which could be used as the header image in the bulk email template.</div>
                <div>You should enter the value <span className="font-mono text-xs font-semibold bg-white px-1 rounded">promotion_code_001</span> (the folder you created for promo code related email headers/footers).</div>
                <div className="text-gray-500">Sample entry: <span className="font-mono text-xs font-semibold bg-white px-1 rounded">promotion_code_001</span></div>
              </div>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="promoCode">Promo Code <span className="text-red-500">*</span></label>
            <input type="text" id="promoCode" name="promoCode" value={form.promoCode || ""} onChange={handleChange} required className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bodyHtml">Body HTML <span className="text-red-500">*</span></label>
            <textarea id="bodyHtml" name="bodyHtml" value={form.bodyHtml || ""} onChange={handleChange} required className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base min-h-[120px] sm:min-h-[150px]" />
            <div className="text-xs sm:text-sm text-gray-500 mt-2">Paste only the inner HTML (no &lt;body&gt; tags). Example: [You can create a sample email body HTML like below using the chat GTP AI tools]</div>
            <pre className="bg-gray-100 rounded-lg p-3 mt-2 text-xs overflow-x-auto max-h-48 sm:max-h-64 overflow-y-auto">{`<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; padding: 24px; text-align: center;">
  <h2 style="color: #1a237e; margin-bottom: 12px;">Special Offer Just for You!</h2>
  <p style="font-size: 18px; color: #333; margin-bottom: 8px;">Use the code below to get an exclusive discount:</p>
  <div style="font-size: 24px; font-weight: bold; color: #1565c0; background: #e3f2fd; border-radius: 6px; display: inline-block; padding: 12px 32px; margin-bottom: 12px;">SAVE20</div>
  <p style="font-size: 16px; color: #444;">Enter this code at checkout to enjoy your savings!</p>
</div>`}</pre>
          </div>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
              <p className="text-sm sm:text-base text-yellow-800">
                <strong>Test Email: [Test email template] button below.</strong> A sample email will be sent to your email ID which you entered in the recipient email field 
                so that you can verify the template of the email and the content before you send it as a bulk email.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button type="submit" className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-3 sm:py-2 rounded-lg sm:rounded-md flex items-center justify-center gap-2 text-sm sm:text-base font-medium transition-colors">
                Send Bulk Email
              </button>
              <button type="button" onClick={e => {
                console.log('Test Email Template button clicked');
                handleSubmit(e as any, true);
              }} className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white px-4 sm:px-6 py-3 sm:py-2 rounded-lg sm:rounded-md flex items-center justify-center gap-2 text-sm sm:text-base font-medium transition-colors">
                Test Email Template
              </button>
            </div>
          </div>
        </form>
        {error && <div className="mt-4 text-red-600">{error}</div>}
        {success && <div className="mt-4 text-green-600">{success}</div>}
      </div>
    </div>
  );
}