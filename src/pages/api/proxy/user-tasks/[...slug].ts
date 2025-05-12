import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt } from '@/lib/api/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function buildQueryString(query: Record<string, any>) {
  const params = new URLSearchParams();
  for (const key in query) {
    const value = query[key];
    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, v));
    } else if (typeof value !== 'undefined') {
      params.append(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

console.log('user-tasks proxy handler loaded (single segment test)');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[proxy] user-tasks:', { method: req.method, slug: req.query.slug, query: req.query });
  if (!API_BASE_URL) {
    res.status(500).json({ error: 'API base URL not configured' });
    return;
  }

  const token = await getCachedApiJwt();
  const { method, query, body } = req;
  const slug = req.query.slug as string | undefined;
  const queryString = buildQueryString(query);

  // Handle /:id (single task CRUD)
  if (slug && method !== 'POST') {
    const id = slug;
    const apiUrl = `${API_BASE_URL}/api/user-tasks/${id}${queryString}`;
    let apiRes;
    switch (method) {
      case 'GET':
        apiRes = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        break;
      case 'PUT':
        apiRes = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        break;
      case 'DELETE':
        apiRes = await fetch(apiUrl, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const data = await apiRes.text();
    res.status(apiRes.status).send(data);
    return;
  }

  // Handle / (list, create, filter)
  if (!slug) {
    const apiUrl = `${API_BASE_URL}/api/user-tasks${queryString}`;
    let apiRes;
    switch (method) {
      case 'GET':
        apiRes = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        break;
      case 'POST':
        apiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const data = await apiRes.text();
    res.status(apiRes.status).send(data);
    return;
  }

  // Fallback: Not found
  res.status(404).json({ error: 'Not found' });
}