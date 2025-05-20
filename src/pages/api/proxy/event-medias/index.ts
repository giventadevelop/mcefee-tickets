import type { NextApiRequest, NextApiResponse } from "next";
import { getCachedApiJwt } from "@/lib/api/jwt";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!API_BASE_URL) {
    res.status(500).json({ error: "API base URL not configured" });
    return;
  }
  const token = await getCachedApiJwt();
  const { method, query } = req;
  let apiUrl = `${API_BASE_URL}/api/event-medias`;
  // Forward query params (e.g., eventId)
  const params = new URLSearchParams();
  for (const key in query) {
    const value = query[key];
    if (Array.isArray(value)) value.forEach(v => params.append(key, v));
    else if (typeof value !== 'undefined') params.append(key, value);
  }
  const qs = params.toString();
  if (qs) apiUrl += `?${qs}`;

  if (method === "POST") {
    // Forward multipart/form-data
    const fetch = (await import("node-fetch")).default;
    const headers = { ...req.headers, authorization: `Bearer ${token}` };
    delete headers["host"];
    delete headers["connection"];
    // Sanitize headers
    const sanitizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) sanitizedHeaders[key] = value.join("; ");
      else if (typeof value === "string") sanitizedHeaders[key] = value;
    }
    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers: sanitizedHeaders,
      body: req,
    });
    res.status(apiRes.status);
    apiRes.body.pipe(res);
    return;
  }

  if (method === "GET") {
    const fetch = (await import("node-fetch")).default;
    const apiRes = await fetch(apiUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await apiRes.text();
    res.status(apiRes.status).send(data);
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}