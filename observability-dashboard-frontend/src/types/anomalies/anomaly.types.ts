export interface IncidentSummaryItem {
  request_id: string;
  service: string;
  status_code: number;
  level: string;
  level_encoded: number;
  events: string[];
  reason: string;
  row_count?: number;
  max_anomaly_score?: number;
  detected_at?: string; // For historical incidents
  source_file?: string; // For historical incidents
}

export interface IncidentStory {
  title?: string;
  summary?: string;
  top_services?: Array<[string, number]>;
  top_events?: Array<[string, number]>;
  top_status_codes?: Array<[string, number]>;
}

export interface IncidentsPayload {
  generated_at: string;
  input_csv: string;
  model_path: string;
  total_rows: number;
  predicted_anomaly_count: number;
  predicted_normal_count: number;
  predicted_anomaly_request_count: number;
  incident_story: IncidentStory;
  incidents: IncidentSummaryItem[];
}

export interface HistoricalSnapshot {
  filename: string;
  timestamp: string;
  total_rows: number;
  predicted_anomaly_count: number;
  incidents_count: number;
  incidents: IncidentSummaryItem[];
  incident_story: IncidentStory;
}

export interface HistoricalIncidentsResponse {
  historical_incidents: HistoricalSnapshot[];
  total_files: number;
  returned_files: number;
  limit: number;
}

export interface AllIncidentsResponse {
  all_incidents: IncidentSummaryItem[];
  total_count: number;
  files_scanned: number;
  total_files: number;
}
