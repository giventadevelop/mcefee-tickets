import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { withTenantId } from '@/lib/withTenantId';

interface ProxyHandlerOptions {
  injectTenantId?: boolean;
  allowedMethods?: string[];
  backendPath: string;
}

export function createProxyHandler({ injectTenantId = true, allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'], backendPath }: ProxyHandlerOptions) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!API_BASE_URL) {
      res.status(500).json({ error: 'API base URL not configured' });
      return;
    }
    const { method, query, body } = req;
    // Handle slug path segments for catch-all routes
    let path = backendPath;
    const slug = query.slug;
    if (slug) {
      if (Array.isArray(slug)) {
        path += '/' + slug.map(encodeURIComponent).join('/');
      } else if (typeof slug === 'string') {
        path += '/' + encodeURIComponent(slug);
      }
    }
    // Remove slug from query before building query string
    const { slug: _omit, ...restQuery } = query;
    const queryString = buildQueryString(restQuery);
    const apiUrl = `${API_BASE_URL}${path}${queryString}`;
    if (!allowedMethods.includes(method!)) {
      res.setHeader('Allow', allowedMethods);
      res.status(405).end(`Method ${method} Not Allowed`);
      return;
    }
    let payload = body;
    if (injectTenantId && ['POST', 'PUT', 'PATCH'].includes(method!)) {
      if (Array.isArray(body)) {
        payload = body.map(item => withTenantId(item));
      } else {
        payload = withTenantId(body);
      }
    }
    try {
      console.log('[PROXY OUTGOING] apiUrl:', apiUrl, 'method:', method, 'headers:', { 'Content-Type': 'application/json' }, 'payload:', payload, 'typeof payload:', typeof payload);
      const apiRes = await fetchWithJwtRetry(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(method === 'GET' || method === 'DELETE' ? {} : { body: JSON.stringify(payload) }),
      }, `proxy-${backendPath}-${method}`);
      const data = await apiRes.text();
      res.status(apiRes.status).send(data);
    } catch (err) {
      console.error('Proxy error:', err);
      res.status(500).json({ error: 'Internal server error', details: String(err) });
    }
  };
}

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