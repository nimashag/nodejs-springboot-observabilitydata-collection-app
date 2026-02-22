// Dynamically determine API base URL based on current hostname
// This works for both local development and remote deployments (EC2, etc.)
function getApiBaseUrl(): string {
  // Get current hostname, protocol, and port from the browser
  const { protocol, hostname, port } = window.location;
  const currentPort = port || (protocol === 'https:' ? '443' : '80');

  // If accessing through nginx gateway (port 31000), always use dynamic detection
  // This covers both local docker-compose and remote EC2 deployments
  if (currentPort === '31000' || currentPort === '30000') {
    // Going through nginx gateway - use dynamic detection
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return "http://localhost:31000";
    }
    // For remote deployments (EC2, etc.), use nginx gateway on the same host
    const apiProtocol = protocol === 'https:' ? 'https:' : 'http:';
    const apiUrl = `${apiProtocol}//${hostname}:31000`;
    console.log('[FrontendAPI] Using nginx gateway, detected hostname:', hostname, 'Using API URL:', apiUrl);
    return apiUrl;
  }

  // Local development mode (not through nginx) - check for VITE env vars
  // This allows direct service URLs for local dev (e.g., http://localhost:3003)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // In local dev, prefer VITE env vars if set, otherwise fallback to nginx gateway
    if (import.meta.env.VITE_API_BASE) {
      console.log('[FrontendAPI] Local dev mode, using VITE_API_BASE:', import.meta.env.VITE_API_BASE);
      return import.meta.env.VITE_API_BASE;
    }
    // Fallback: use nginx gateway even in local dev if no VITE vars
    console.log('[FrontendAPI] Local dev mode, no VITE_API_BASE, using nginx gateway');
    return "http://localhost:31000";
  }

  // Remote deployment (not through nginx) - use dynamic detection
  const apiProtocol = protocol === 'https:' ? 'https:' : 'http:';
  const apiUrl = `${apiProtocol}//${hostname}:31000`;
  console.log('[FrontendAPI] Remote deployment, detected hostname:', hostname, 'Using API URL:', apiUrl);
  return apiUrl;
}

// Get the base API URL
export const apiBase = getApiBaseUrl();

// For individual services, use VITE env vars if available (local dev with direct service ports)
// Otherwise use the dynamic apiBase (docker-compose/nginx or remote)
function getServiceUrl(envVar: string | undefined, defaultUrl: string): string {
  // Only use VITE env vars if we're in local dev mode (not through nginx)
  const { hostname, port } = window.location;
  const currentPort = port || (window.location.protocol === 'https:' ? '443' : '80');
  const isLocalDev = (hostname === 'localhost' || hostname === '127.0.0.1') &&
    currentPort !== '31000' && currentPort !== '30000';

  if (isLocalDev && envVar) {
    console.log('[FrontendAPI] Local dev mode, using VITE env var:', envVar);
    return envVar;
  }
  return defaultUrl;
}

export const userUrl = getServiceUrl(import.meta.env.VITE_USER_URL, apiBase);
export const restaurantUrl = getServiceUrl(import.meta.env.VITE_RESTAURANT_URL, apiBase);
export const orderUrl = getServiceUrl(import.meta.env.VITE_ORDER_URL, apiBase);
export const deliveryUrl = getServiceUrl(import.meta.env.VITE_DELIVERY_URL, apiBase);