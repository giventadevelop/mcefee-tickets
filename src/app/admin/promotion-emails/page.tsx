"use client";
import React, { useState } from "react";
import { PromotionEmailRequestDTO } from "@/types";
import { sendPromotionEmailServer } from "./serverActions";
import DOMPurify from "dompurify";

function cleanHtmlInput(input) {
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedHtml = cleanHtmlInput(form.bodyHtml || "");
    if (!cleanedHtml.trim()) {
      setError("Body HTML is empty or invalid after cleaning. Please check your input.");
      return;
    }
    try {
      await sendPromotionEmailServer({ ...form, bodyHtml: cleanedHtml });
      setForm({ bodyHtml: "", tenantId: "" });
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to send promotion email");
    }
  };
  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Send Promotion Email</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="to">Recipient Email <span className="text-red-500">*</span></label>
            <input type="text" id="to" name="to" value={form.to || ""} onChange={handleChange} required className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="subject">Subject <span className="text-red-500">*</span></label>
            <input type="text" id="subject" name="subject" value={form.subject || ""} onChange={handleChange} required className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base" />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-2 p-2 bg-blue-50 rounded">
              For promo code, the sample URL will be like this:<br />
              <span className="font-mono text-xs">https://eventapp-media-bucket.s3.us-east-2.amazonaws.com/events/tenantId/tenant_demo_001/promotions/promotion_code_001/email-templates/email_header_image.jpeg</span><br />
              You should enter the value <span className="font-mono text-xs font-semibold">promotion_code_001</span> (the folder you created for promo code related email headers/footers).<br />
              <span className="text-gray-500">Sample entry: <span className="font-mono text-xs font-semibold">promotion_code_001</span></span>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="promoCode">Promo Code <span className="text-red-500">*</span></label>
            <input type="text" id="promoCode" name="promoCode" value={form.promoCode || ""} onChange={handleChange} required className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bodyHtml">Body HTML <span className="text-red-500">*</span></label>
            <textarea id="bodyHtml" name="bodyHtml" value={form.bodyHtml || ""} onChange={handleChange} required className="mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base min-h-[120px]" />
            <div className="text-xs text-gray-500 mt-1">Paste only the inner HTML (no &lt;body&gt; tags). Example:</div>
            <pre className="bg-gray-100 rounded p-2 mt-1 text-xs overflow-x-auto">{`<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9f9f9; border-radius: 8px; padding: 24px; text-align: center;">
  <h2 style="color: #1a237e; margin-bottom: 12px;">Special Offer Just for You!</h2>
  <p style="font-size: 18px; color: #333; margin-bottom: 8px;">Use the code below to get an exclusive discount:</p>
  <div style="font-size: 24px; font-weight: bold; color: #1565c0; background: #e3f2fd; border-radius: 6px; display: inline-block; padding: 12px 32px; margin-bottom: 12px;">SAVE20</div>
  <p style="font-size: 16px; color: #444;">Enter this code at checkout to enjoy your savings!</p>
</div>`}</pre>
          </div>
          <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2">Send Email</button>
        </form>
        {error && <div className="mt-4 text-red-600">{error}</div>}
      </div>
    </div>
  );
}