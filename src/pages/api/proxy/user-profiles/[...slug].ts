import type { NextApiRequest, NextApiResponse } from 'next';
import { generateApiJwt } from '@/lib/api/jwt';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function buildQueryString(query: Record<string, any>) {
  const params = new URLSearchParams();
  for (const key in query) {
    if (key !== 'id') params.append(key, query[key]);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!API_BASE_URL) {
    res.status(500).json({ error: 'API base URL not configured' });
    return;
  }

  const token = await generateApiJwt();
  const { method, query, body } = req;
  // Get the path segments after /api/proxy/user-profiles
  const slug = (req.query.slug || []) as string[];
  const queryString = buildQueryString(query);

  console.log('[proxy] user-profiles: method:', method, 'slug:', slug, 'query:', query);

  // Handle /by-user/:userId
  if (slug[0] === 'by-user' && slug[1] && method === 'GET') {
    console.log('[proxy] Matched /by-user/:userId', slug[1]);
    const userId = slug[1];
    const apiUrl = `${API_BASE_URL}/api/user-profiles/by-user/${userId}`;
    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await apiRes.text();
    res.status(apiRes.status).send(data);
    return;
  }

  // Handle /:id (single profile CRUD)
  if (slug.length === 1 && slug[0] && method !== 'POST') {
    console.log('[proxy] Matched /:id', slug[0]);
    const id = slug[0];
    const apiUrl = `${API_BASE_URL}/api/user-profiles/${id}${queryString}`;
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
  if (slug.length === 0) {
    console.log('[proxy] Matched / (list, create, filter)');
    const apiUrl = `${API_BASE_URL}/api/user-profiles${queryString}`;
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
  console.log('[proxy] Fallback: Not found', { slug, method });
  res.status(404).json({ error: 'Not found' });
}