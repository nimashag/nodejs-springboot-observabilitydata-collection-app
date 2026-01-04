// Dynamically determine API base URL based on current hostname
// This works for both local development and remote deployments (EC2, etc.)
function getApiBaseUrl(): string {
  // If explicitly set via environment variable, use it
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  // Get current hostname and protocol from the browser
  const { protocol, hostname } = window.location;
  
  // For local development, use localhost with nginx gateway port
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return "http://localhost:31000";
  }

  // For remote deployments (EC2, etc.), use nginx gateway on the same host
  // Use port 31000 (nginx gateway) on the same hostname
  // Always use http (not https) for the API gateway
  const apiProtocol = protocol === 'https:' ? 'https:' : 'http:';
  const nginxPort = '31000';
  const apiUrl = `${apiProtocol}//${hostname}:${nginxPort}`;
  
  // Debug logging (remove in production if needed)
  console.log('[FrontendAPI] Detected hostname:', hostname, 'Using API URL:', apiUrl);
  
  return apiUrl;
}

export const apiBase = getApiBaseUrl();
export const userUrl = import.meta.env.VITE_USER_URL || apiBase;
export const restaurantUrl = import.meta.env.VITE_RESTAURANT_URL || apiBase;
export const orderUrl = import.meta.env.VITE_ORDER_URL || apiBase;
export const deliveryUrl = import.meta.env.VITE_DELIVERY_URL || apiBase;