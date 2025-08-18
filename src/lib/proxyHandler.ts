import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { withTenantId } from '@/lib/withTenantId';
import { getRawBody } from '@/lib/getRawBody';
import { getTenantId } from '@/lib/env';

interface ProxyHandlerOptions {
  injectTenantId?: boolean;
  allowedMethods?: string[];
  backendPath: string;
}

export function createProxyHandler({ injectTenantId = true, allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], backendPath }: ProxyHandlerOptions) {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
      console.log('[ProxyHandler] API_BASE_URL:', API_BASE_URL);
      if (!API_BASE_URL) {
        res.status(500).json({ error: 'API base URL not configured' });
        return;
      }
      const { method, query, body } = req;
      console.log('[ProxyHandler] Method:', method, 'Allowed:', allowedMethods);
      const tenantId = getTenantId();
      // Debug: Log incoming query and backendPath before replacement
      console.log('[ProxyHandler DEBUG] Incoming req.query:', query);
      console.log('[ProxyHandler DEBUG] Original backendPath:', backendPath);
      let path = backendPath;
      Object.entries(query).forEach(([key, value]) => {
        path = path.replace(`[${key}]`, encodeURIComponent(String(value)));
      });
      console.log('[ProxyHandler DEBUG] Path after param replacement:', path);
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
      let qs;
      // Special case: only forward 'to' param for send-ticket-email endpoint
      if (path.includes('/send-ticket-email')) {
        qs = new URLSearchParams();
        if (query.to) qs.append('to', query.to as string);
      } else {
        qs = new URLSearchParams(req.query as Record<string, string>);
        qs.delete('slug');
        // Only append tenantId.equals for GET/POST list endpoints, not for PATCH/PUT/DELETE by ID
        const isListEndpoint =
          (method === 'GET' || method === 'POST') &&
          !/\/\d+(\/|$)/.test(path); // path does not end with /:id or /:id/...
        if (isListEndpoint && !Array.from(qs.keys()).includes('tenantId.equals')) {
          qs.append('tenantId.equals', tenantId);
        }
      }
      const queryString = qs.toString();
      const apiUrl = `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;
      console.log('[ProxyHandler] Forwarding to backend URL:', apiUrl);
      if (!allowedMethods.includes(method!)) {
        res.setHeader('Allow', allowedMethods);
        res.status(405).end(`Method ${method} Not Allowed`);
        return;
      }
      // Log before entering the inner try block
      console.log('[ProxyHandler] About to enter try block');
      try {
        console.log('[ProxyHandler] Entered try block');
        let payload = body;
        console.log('[ProxyHandler] Preparing payload:', payload);
        // Determine Content-Type header
        let contentType = 'application/json';
        let extraHeaders: Record<string, string> = {};
        if (method === 'PATCH' && req.headers['content-type']) {
          contentType = req.headers['content-type'];
        }
        // Prepare headers
        console.log('[ProxyHandler] Preparing headers:', { 'Content-Type': contentType, ...extraHeaders });
        let bodyToSend: any = undefined;
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
          // Apply tenantId injection for POST/PUT requests if needed
          if (injectTenantId && payload && typeof payload === 'object') {
            if (Array.isArray(payload)) {
              // For arrays, inject tenantId into each array item if they are objects
              payload = payload.map(item => 
                typeof item === 'object' && item !== null ? withTenantId(item) : item
              );
            } else {
              // For single objects, inject tenantId normally
              payload = withTenantId(payload);
            }
          }
          
          // Special debugging for promotion emails
          if (path.includes('send-promotion-emails')) {
            console.log('[PROXY DEBUG] Promotion email request - payload after tenantId injection:', payload);
            console.log('[PROXY DEBUG] Promotion email request - payload.isTestEmail:', payload?.isTestEmail);
            console.log('[PROXY DEBUG] Promotion email request - typeof payload.isTestEmail:', typeof payload?.isTestEmail);
            console.log('[PROXY DEBUG] Promotion email request - JSON.stringify(payload):', JSON.stringify(payload));
          }
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
        console.log('[ProxyHandler] About to call fetchWithJwtRetry');
        
        // Special logging for promotion emails - log exactly what we're sending to backend
        if (path.includes('send-promotion-emails') && bodyToSend) {
          console.log('[PROXY FINAL] About to send to backend API:', {
            url: apiUrl,
            method: method,
            headers: { 'Content-Type': contentType, ...extraHeaders },
            body: bodyToSend
          });
          try {
            const parsedBody = JSON.parse(bodyToSend);
            console.log('[PROXY FINAL] Parsed body being sent to backend:', parsedBody);
            console.log('[PROXY FINAL] isTestEmail in final payload:', parsedBody.isTestEmail);
          } catch (e) {
            console.log('[PROXY FINAL] Could not parse body:', e);
          }
        }
        
        const apiRes = await fetchWithJwtRetry(apiUrl, {
          method,
          headers: { 'Content-Type': contentType, ...extraHeaders },
          ...(bodyToSend ? { body: bodyToSend } : {}),
        }, `proxy-${backendPath}-${method}`);
        console.log('[ProxyHandler] fetchWithJwtRetry returned:', apiRes.status);

        // Forward x-total-count header for GET requests
        if (method === 'GET') {
          const totalCount = apiRes.headers.get('x-total-count');
          if (totalCount) {
            res.setHeader('x-total-count', totalCount);
          }
          const data = await apiRes.json();
          res.status(apiRes.status).json(data);
          return;
        }
        const data = await apiRes.text();
        res.status(apiRes.status).send(data);
      } catch (err) {
        const errorObj = err as Error;
        console.error('[ProxyHandler ERROR]', err, errorObj.stack);
        res.status(500).json({ error: 'Internal server error', details: String(err) });
      }
    } catch (err) {
      const errorObj = err as Error;
      console.error('[ProxyHandler OUTER ERROR]', err, errorObj.stack);
      res.status(500).json({ error: 'Internal server error', details: String(err) });
    }
  }
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

export async function fetchWithJwtRetry(apiUrl: string, options: any = {}, debugLabel = '') {
  console.log('[fetchWithJwtRetry] Called with URL:', apiUrl);
  let token = await getCachedApiJwt();
  console.log('[fetchWithJwtRetry] Using JWT:', token);
  let response = await fetch(apiUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  console.log('[fetchWithJwtRetry] Response status:', response.status);
  if (response.status === 401) {
    token = await generateApiJwt();
    console.log('[fetchWithJwtRetry] Retrying with new JWT:', token);
    response = await fetch(apiUrl, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('[fetchWithJwtRetry] Response status (after retry):', response.status);
  }
  return response;
}