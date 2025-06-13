import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { withTenantId } from '@/lib/withTenantId';
import { getRawBody } from '@/lib/getRawBody';

interface ProxyHandlerOptions {
  injectTenantId?: boolean;
  allowedMethods?: string[];
  backendPath: string;
}

export function createProxyHandler({ injectTenantId = true, allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], backendPath }: ProxyHandlerOptions) {
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
    // If bodyParser is false, parse the raw body for non-GET/DELETE
    if (injectTenantId && ['POST', 'PUT', 'PATCH'].includes(method!)) {
      let parsedBody = body;
      // If body is empty and content-type is JSON, parse raw body
      if (req.headers['content-type']?.includes('application/json') && (!body || Object.keys(body).length === 0)) {
        const rawBody = (await getRawBody(req)).toString('utf-8');
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          parsedBody = {};
        }
      }
      if (Array.isArray(parsedBody)) {
        payload = parsedBody.map(item => withTenantId(item));
      } else {
        payload = withTenantId(parsedBody);
      }
    }
    try {
      // Determine Content-Type header
      let contentType = 'application/json';
      if (method === 'PATCH' && req.headers['content-type']) {
        contentType = req.headers['content-type'];
      }
      let bodyToSend: any = undefined;
      let extraHeaders: Record<string, string> = {};
      if (method === 'PATCH') {
        console.log('[PROXY] Received PATCH request:', {
          path,
          headers: req.headers,
          query: req.query
        });

        // Read the raw body as text, parse, inject tenantId, and re-stringify
        const rawBody = (await getRawBody(req)).toString('utf-8');
        console.log('[PROXY] Raw PATCH body:', rawBody);

        let json: any;
        try {
          json = JSON.parse(rawBody);
          console.log('[PROXY] Parsed PATCH body:', json);
        } catch (e) {
          console.error('[PROXY] Failed to parse PATCH body:', e);
          json = {};
        }

        if (injectTenantId) {
          const beforeTenant = { ...json };
          json = withTenantId(json);
          console.log('[PROXY] Injected tenantId:', {
            before: beforeTenant,
            after: json
          });
        }

        bodyToSend = JSON.stringify(json);
        // Use merge-patch+json if not explicitly set
        if (!req.headers['content-type']) {
          extraHeaders['Content-Type'] = 'application/merge-patch+json';
        }

        console.log('[PROXY OUTGOING] PATCH request details:', {
          method,
          path,
          apiUrl,
          headers: { ...req.headers, ...extraHeaders },
          payload: json
        });
      } else if (method !== 'GET' && method !== 'DELETE') {
        bodyToSend = JSON.stringify(payload);
      }
      // Log the outgoing payload for all non-GET/DELETE
      if (method !== 'GET' && method !== 'DELETE') {
        try {
          const parsed = JSON.parse(bodyToSend);
          console.log('[PROXY OUTGOING] apiUrl:', apiUrl, 'method:', method, 'headers:', { 'Content-Type': contentType, ...extraHeaders }, 'payload:', parsed, 'typeof payload:', typeof bodyToSend);
        } catch {
          console.log('[PROXY OUTGOING] apiUrl:', apiUrl, 'method:', method, 'headers:', { 'Content-Type': contentType, ...extraHeaders }, 'payload:', bodyToSend, 'typeof payload:', typeof bodyToSend);
        }
      }
      // Before making the backend request, add debug logging for /by-user endpoints
      if (apiUrl.includes('/by-user')) {
        console.log('[PROXY DEBUG] Outgoing headers for by-user:', {
          method,
          path,
          apiUrl,
          headers: { ...req.headers, ...extraHeaders },
          payload: payload
        });
        if (req.headers && typeof req.headers.Authorization === 'string') {
          const jwt = req.headers.Authorization.split(' ')[1];
          try {
            const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
            console.log('[PROXY DEBUG] JWT payload:', payload);
          } catch (e) {
            console.log('[PROXY DEBUG] Could not decode JWT:', e);
          }
        } else {
          console.log('[PROXY DEBUG] No Authorization header present for by-user endpoint');
        }
      }
      const apiRes = await fetchWithJwtRetry(apiUrl, {
        method,
        headers: { 'Content-Type': contentType, ...extraHeaders },
        ...(bodyToSend ? { body: bodyToSend } : {}),
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