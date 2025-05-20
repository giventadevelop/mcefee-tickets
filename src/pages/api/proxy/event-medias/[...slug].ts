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
  const slugArr = Array.isArray(query.slug) ? query.slug : [query.slug];
  if (slugArr.length === 1 && slugArr[0]) {
    const mediaId = slugArr[0];
    const apiUrl = `${API_BASE_URL}/api/event-medias/${mediaId}`;
    const fetch = (await import("node-fetch")).default;
    switch (method) {
      case "GET": {
        const apiRes = await fetch(apiUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await apiRes.text();
        res.status(apiRes.status).send(data);
        return;
      }
      case "PUT": {
        const apiRes = await fetch(apiUrl, {
          method: "PUT",
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
      case "DELETE": {
        const apiRes = await fetch(apiUrl, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await apiRes.text();
        res.status(apiRes.status).send(data);
        return;
      }
      default:
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
  }
  res.status(404).json({ error: "Not found" });
}