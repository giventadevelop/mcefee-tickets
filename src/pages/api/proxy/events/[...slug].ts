import { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { EventDTO } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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
  try {
    const { slug } = req.query;
    const path = Array.isArray(slug) ? slug.join('/') : slug;
    const apiUrl = `${API_BASE_URL}/api/events/${path}`;
    const response = await fetchWithJwtRetry(apiUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    }, 'events-proxy');

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error('Error in events proxy:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}