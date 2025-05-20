import type { NextApiRequest, NextApiResponse } from "next";
import { getCachedApiJwt } from "@/lib/api/jwt";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!API_BASE_URL) {
    res.status(500).json({ error: "API base URL not configured" });
    return;
  }
  const token = await getCachedApiJwt();
  const { method, query, body } = req;
  let apiUrl = `${API_BASE_URL}/api/calendar-events`;
  // Forward query params
  const params = new URLSearchParams();
  for (const key in query) {
    const value = query[key];
    if (Array.isArray(value)) value.forEach(v => params.append(key, v));
    else if (typeof value !== 'undefined') params.append(key, value);
  }
  const qs = params.toString();
  if (qs) apiUrl += `?${qs}`;

  if (method === "POST") {
    const fetch = (await import("node-fetch")).default;
    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });
    const data = await apiRes.text();
    res.status(apiRes.status).send(data);
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