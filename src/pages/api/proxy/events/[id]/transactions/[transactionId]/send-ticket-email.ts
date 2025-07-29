import { createProxyHandler } from '@/lib/proxyHandler';
import { getEmailHostUrlPrefix } from '@/lib/env';

// Custom handler for send-ticket-email that includes emailHostUrlPrefix
export default async function handler(req: any, res: any) {
  const { id, transactionId } = req.query;

  // Get emailHostUrlPrefix from request headers or use default
  const emailHostUrlPrefix = req.headers['x-email-host-url-prefix'] as string ||
                           getEmailHostUrlPrefix();

  // Create a custom backend path that includes the emailHostUrlPrefix
  const customBackendPath = `/api/events/${id}/transactions/${transactionId}/emailHostUrlPrefix/${encodeURIComponent(emailHostUrlPrefix)}/send-ticket-email`;

  // Use the shared proxy handler with the custom backend path
  const proxyHandler = createProxyHandler({
    backendPath: customBackendPath,
    allowedMethods: ['POST']
  });

  return proxyHandler(req, res);
}