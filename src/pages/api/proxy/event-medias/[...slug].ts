import { NextApiRequest, NextApiResponse } from 'next';
import { getJwtToken } from '@/lib/api/jwt';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getJwtToken();
    const { slug } = req.query;
    const path = Array.isArray(slug) ? slug.join('/') : slug;

    // Build query string from all query parameters
    const queryParams = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'slug' && value) {
        queryParams.append(key, Array.isArray(value) ? value[0] : value);
      }
    });
    const queryString = queryParams.toString();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/event-medias/${path}${queryString ? `?${queryString}` : ''}`,
      {
        method: req.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      }
    );

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in event-medias proxy:', error);
    res.status(500).json({ error: 'Failed to fetch event media' });
  }
}