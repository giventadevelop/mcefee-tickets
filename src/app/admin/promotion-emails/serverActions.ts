"use server";
import { PromotionEmailRequestDTO } from '@/types';
import { withTenantId } from '@/lib/withTenantId';
import { getEmailHostUrlPrefix } from '@/lib/env';

export async function sendPromotionEmailServer(form: Partial<PromotionEmailRequestDTO>) {
  // Trim and validate all required fields
  const to = (form.to || '').trim();
  const subject = (form.subject || '').trim();
  const promoCode = (form.promoCode || '').trim();
  const bodyHtml = (form.bodyHtml || '').trim();
  if (!to || !subject || !promoCode || !bodyHtml) {
    throw new Error('All fields (recipient email, subject, promo code, body HTML) are required.');
  }

  // Get the email host URL prefix for email context
  const emailHostUrlPrefix = getEmailHostUrlPrefix();

  const payload = withTenantId({
    ...form,
    to,
    subject,
    promoCode,
    bodyHtml,
    emailHostUrlPrefix,
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/proxy/send-promotion-emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  if (!res.ok) {
    let msg = 'Failed to send promotion email';
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}