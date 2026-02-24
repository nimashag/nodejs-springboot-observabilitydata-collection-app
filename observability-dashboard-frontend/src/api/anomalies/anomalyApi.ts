import axios from 'axios';
import type { IncidentsPayload } from '../../types/anomalies/anomaly.types';

function getAnomalyApiBaseUrl(): string {
  if (import.meta.env.VITE_ANOMALY_API_URL) {
    return import.meta.env.VITE_ANOMALY_API_URL;
  }

  // Default to same-origin so Vite dev middleware (or nginx route) can serve /api/incidents.
  return '';
}

const api = axios.create({
  baseURL: getAnomalyApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export async function fetchIncidents(): Promise<IncidentsPayload> {
  const response = await api.get<IncidentsPayload>('/api/incidents');
  return response.data;
}
