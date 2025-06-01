import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { withTenantId } from '@/lib/withTenantId';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function buildQueryString(query: Record<string, any>) {
  const params = new URLSearchParams();
  for (const key in query) {
    if (key !== 'id') params.append(key, query[key]);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// Generalized fetch with JWT retry and debug logging
async function fetchWithJwtRetry(apiUrl: string, options: any = {}, debugLabel = '') {
  let token = await getCachedApiJwt();
  let response = await fetch(apiUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(`[${debugLabel}] First attempt:`, apiUrl, response.status);
  if (response.status === 401) {
    console.warn(`[${debugLabel}] JWT expired/invalid, regenerating and retrying...`);
    token = await generateApiJwt();
    response = await fetch(apiUrl, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(`[${debugLabel}] Second attempt:`, apiUrl, response.status);
  }
  return response;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!API_BASE_URL) {
    res.status(500).json({ error: 'API base URL not configured' });
    return;
  }

  const { method, query, body } = req;
  const slug = (req.query.slug || []) as string[];
  const queryString = buildQueryString(query);

  // Handle /by-user/:userId
  if (slug[0] === 'by-user' && slug[1] && method === 'GET') {
    const userId = slug[1];
    const apiUrl = `${API_BASE_URL}/api/user-profiles/by-user/${userId}`;
    const apiRes = await fetchWithJwtRetry(apiUrl, { method: 'GET' }, 'user-profiles-by-user-GET');
    const data = await apiRes.text();
    res.status(apiRes.status).send(data);
    return;
  }

  // Handle /:id (single profile CRUD)
  if (slug.length === 1 && slug[0] && method !== 'POST') {
    const id = slug[0];
    const apiUrl = `${API_BASE_URL}/api/user-profiles/${id}${queryString}`;
    let apiRes;
    switch (method) {
      case 'GET':
        apiRes = await fetchWithJwtRetry(apiUrl, { method: 'GET' }, 'user-profiles-id-GET');
        break;
      case 'PUT':
        apiRes = await fetchWithJwtRetry(apiUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withTenantId(body)),
        }, 'user-profiles-id-PUT');
        break;
      case 'DELETE':
        apiRes = await fetchWithJwtRetry(apiUrl, { method: 'DELETE' }, 'user-profiles-id-DELETE');
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
    const apiUrl = `${API_BASE_URL}/api/user-profiles${queryString}`;
    let apiRes;
    switch (method) {
      case 'GET':
        apiRes = await fetchWithJwtRetry(apiUrl, { method: 'GET' }, 'user-profiles-root-GET');
        break;
      case 'POST':
        apiRes = await fetchWithJwtRetry(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withTenantId(body)),
        }, 'user-profiles-root-POST');
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