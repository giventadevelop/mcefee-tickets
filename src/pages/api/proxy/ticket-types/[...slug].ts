import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';

const API_BASE_URL = process.env.BACKEND_API_BASE_URL;

async function fetchWithJwtRetry(apiUrl: string, options: any = {}, debugLabel = '') {
  let token = await getCachedApiJwt();
  let response = await fetch(apiUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 401) {
    token = await generateApiJwt();
    response = await fetch(apiUrl, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }
  return response;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!API_BASE_URL) {
    res.status(500).json({ error: 'API base URL not configured' });
    return;
  }

  const { method, query, body } = req;
  const slug = query.slug as string[];
  if (!slug || slug.length === 0) {
    res.status(400).json({ error: 'Missing ticket type ID in path' });
    return;
  }
  const id = slug[0];
  const url = `${API_BASE_URL}/api/ticket-types/${id}`;

  if (method === 'GET') {
    const response = await fetchWithJwtRetry(url, { method: 'GET' }, 'GET ticket-type');
    const text = await response.text();
    res.status(response.status).send(text);
    return;
  }
  if (method === 'PUT') {
    const response = await fetchWithJwtRetry(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, 'PUT ticket-type');
    const text = await response.text();
    res.status(response.status).send(text);
    return;
  }
  if (method === 'PATCH') {
    const response = await fetchWithJwtRetry(url, {
      method: 'PATCH',
      headers: { 'Content-Type': req.headers['content-type'] || 'application/json' },
      body: JSON.stringify(body),
    }, 'PATCH ticket-type');
    const text = await response.text();
    res.status(response.status).send(text);
    return;
  }
  if (method === 'DELETE') {
    const response = await fetchWithJwtRetry(url, { method: 'DELETE' }, 'DELETE ticket-type');
    const text = await response.text();
    res.status(response.status).send(text);
    return;
  }
  res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${method} Not Allowed`);
}