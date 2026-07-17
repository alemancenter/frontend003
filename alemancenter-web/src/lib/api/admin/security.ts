import { api, buildQuery } from "../client";
import { countryQuery } from "@/lib/country";

function withCountry(params: Record<string, unknown> = {}) {
  return params.country ? { ...params, ...countryQuery(String(params.country)) } : params;
}

export interface SecurityEvent {
  id: number;
  ip_address?: string;
  event_type?: string;
  description?: string;
  route?: string;
  method?: string;
  risk_score?: number;
  is_blocked?: boolean;
  is_resolved?: boolean;
  severity?: string;
  created_at: string;
}

export interface SecurityOverview {
  last_24h_events: number;
  last_7d_events: number;
  total_attacks: number;
  top_ips: { ip_address: string; count: number }[];
}

export interface SecurityStats {
  total_logs: number;
  critical_logs: number;
  resolved_logs: number;
  blocked_ips: number;
  trusted_ips: number;
}

export interface MonitorDashboard {
  recent_events: SecurityEvent[];
  recent_logs: SecurityEvent[];
  stats: {
    alerts_count: number;
    attack_attempts: number;
    blocked_attacks: number;
    blocked_ips: number;
    critical_events: number;
    high_risk_events: number;
    resolved_events: number;
    total_events: number;
    total_requests: number;
    trusted_ips: number;
    unresolved_events: number;
  };
}

// ===== Security (logs, blocked/trusted IPs, analytics) =====
export const adminSecurityApi = {
  overview: (params: { country?: string } = {}) =>
    api.get<SecurityOverview>(`/dashboard/security/overview${buildQuery(withCountry(params))}`),
  stats: (params: { country?: string } = {}) =>
    api.get<SecurityStats>(`/dashboard/security/stats${buildQuery(withCountry(params))}`),
  logs: (params: Record<string, unknown> = {}) =>
    api.get<SecurityEvent[]>(`/dashboard/security/logs${buildQuery(withCountry(params))}`),
  deleteAllLogs: (params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/security/logs${buildQuery(withCountry(params))}`),
  resolveLog: (id: number | string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/security/logs/${id}/resolve${buildQuery(withCountry(params))}`),
  deleteLog: (id: number | string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/security/logs/${id}${buildQuery(withCountry(params))}`),
  analytics: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard/security/analytics${buildQuery(withCountry(params))}`),
  topRoutes: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>[]>(`/dashboard/security/analytics/routes${buildQuery(withCountry(params))}`),
  geoDistribution: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>[]>(`/dashboard/security/analytics/geo${buildQuery(withCountry(params))}`),
  monitorDashboard: (params: { country?: string } = {}) =>
    api.get<MonitorDashboard>(`/dashboard/security/monitor/dashboard${buildQuery(withCountry(params))}`),
  blockedIps: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>[]>(`/dashboard/security/blocked-ips${buildQuery(withCountry(params))}`),
  trustedIps: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>[]>(`/dashboard/security/trusted-ips${buildQuery(withCountry(params))}`),
  ipDetails: (ip: string, params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard/security/ip/${ip}${buildQuery(withCountry(params))}`),
  blockIp: (ip: string, reason?: string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/security/ip/block${buildQuery(withCountry(params))}`, { ip, reason }),
  unblockIp: (ip: string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/security/blocked-ips/${ip}${buildQuery(withCountry(params))}`),
  trustIp: (ip: string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/security/ip/trust${buildQuery(withCountry(params))}`, { ip }),
  untrustIp: (ip: string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/security/trusted-ips/${ip}${buildQuery(withCountry(params))}`),
};
