import { api, buildQuery } from "../client";
import { countryQuery } from "@/lib/country";

function withCountry(params: Record<string, unknown> = {}) {
  return params.country ? { ...params, ...countryQuery(String(params.country)) } : params;
}

// ─── visitor-analytics response shape (mirrors handlers/analytics) ───────────

export interface ActiveVisitor {
  ip?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  user_agent?: string;
  current_page?: string;
  current_page_full?: string;
  is_member?: boolean;
  last_active?: string;
  session_start?: string;
}

export interface VisitorTimePoint {
  name: string;
  full_date: string;
  visitors: number;
  pageViews: number;
}

export interface DeviceStat {
  name: string;
  value: number;
  count: number;
  color?: string;
}

export interface TrafficSource {
  source: string;
  visits: number;
  change?: number;
}

export interface CountryStat {
  country: string;
  count: number;
}

export interface VisitorAnalytics {
  visitor_stats: {
    current: number;
    current_members: number;
    current_guests: number;
    total_today: number;
    total_combined_today?: number;
    change?: number;
    history?: VisitorTimePoint[];
    active_visitors?: ActiveVisitor[];
  };
  user_stats: { total: number; active: number; new_today: number };
  country_stats: CountryStat[];
  chart_data: VisitorTimePoint[];
  device_stats: DeviceStat[];
  traffic_sources: TrafficSource[];
}

// ─── performance endpoints ───────────────────────────────────────────────────

export interface PerformanceLive {
  cpu: { cores: number; load: number; usage: number };
  memory: { free: number; total: number; used: number; percentage: number; usage_percentage: number };
  disk: { free: number; total: number; used: number; percentage: number; usage_percentage: number };
  timestamp: string;
}

export interface PerformanceCache {
  cache_size: string;
  hit_ratio: number;
}

export interface RouteErrorSample {
  status: number;
  message: string;
  path?: string;
  timestamp: string;
}

export interface RouteMetric {
  count: number;
  errors: number;
  avg_latency_ms: number;
  max_latency_ms: number;
  recent_errors?: RouteErrorSample[];
}

// The metrics endpoint returns a FLAT object (no `data` wrapper).
export interface PerformanceMetrics {
  uptime_seconds: number;
  requests_total: number;
  errors_total: number;
  avg_latency_ms: number;
  routes: Record<string, RouteMetric>;
}

// ===== Analytics / Monitoring / Performance =====
export const adminAnalyticsApi = {
  dashboardSummary: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard${buildQuery(withCountry(params))}`),
  contentAnalytics: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard/content-analytics${buildQuery(withCountry(params))}`),
  activities: (params: Record<string, unknown> = {}) =>
    api.get<Record<string, unknown>[]>(`/dashboard/activities${buildQuery(withCountry(params))}`),
  cleanActivities: (params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/activities/clean${buildQuery(withCountry(params))}`),
  visitorAnalytics: (params: Record<string, unknown> = {}) =>
    api.get<VisitorAnalytics>(`/dashboard/visitor-analytics${buildQuery(withCountry(params))}`),
  pruneVisitors: (params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/visitor-analytics/prune${buildQuery(withCountry(params))}`),
  performanceSummary: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard/performance/summary${buildQuery(withCountry(params))}`),
  performanceLive: (params: { country?: string } = {}) =>
    api.get<PerformanceLive>(`/dashboard/performance/live${buildQuery(withCountry(params))}`),
  performanceRaw: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard/performance/raw${buildQuery(withCountry(params))}`),
  performanceResponseTime: (params: { country?: string } = {}) =>
    api.get<{ average_ms: number }>(`/dashboard/performance/response-time${buildQuery(withCountry(params))}`),
  performanceCache: (params: { country?: string } = {}) =>
    api.get<PerformanceCache>(`/dashboard/performance/cache${buildQuery(withCountry(params))}`),
  performanceMetrics: (params: { country?: string } = {}) =>
    api.get<PerformanceMetrics>(`/dashboard/performance/metrics${buildQuery(withCountry(params))}`),
};

// ===== Redis management =====
export type RedisTTLFilter = "all" | "persistent" | "volatile";

export interface RedisKeyInfo {
  key: string;
  value?: string;
  ttl: number;
  ttl_label?: string;
  is_persistent?: boolean;
  type?: string;
  memory_usage_bytes?: number;
}

export interface RedisKeysResponse {
  data?: RedisKeyInfo[];
  keys?: string[];
  count?: number;
  current_page?: number;
  page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
  from?: number;
  to?: number;
  has_more?: boolean;
}

export type RedisInfoResponse = Record<string, unknown> | { info: string };

export const adminRedisApi = {
  listKeys: (params: Record<string, unknown> = {}) =>
    api.get<RedisKeysResponse>(`/dashboard/redis/keys${buildQuery(withCountry(params))}`),
  setKey: (input: { key: string; value: string; ttl?: number; persist?: boolean }, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/redis${buildQuery(withCountry(params))}`, input),
  cleanExpired: (params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/redis/expired/clean${buildQuery(withCountry(params))}`),
  expireLegacyIpLocation: (input: { ttl?: number } = {}, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/redis/legacy-ip-location/expire${buildQuery(withCountry(params))}`, input),
  cleanLegacyIpLocation: (params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/redis/legacy-ip-location/clean${buildQuery(withCountry(params))}`),
  testConnection: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard/redis/test${buildQuery(withCountry(params))}`),
  getInfo: (params: { country?: string } = {}) =>
    api.get<RedisInfoResponse>(`/dashboard/redis/info${buildQuery(withCountry(params))}`),
  updateEnv: (input: Record<string, unknown>, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/redis/env${buildQuery(withCountry(params))}`, input),
  expireKey: (key: string, ttl: number, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/redis/${encodeURIComponent(key)}/expire${buildQuery(withCountry(params))}`, { ttl }),
  deleteKey: (key: string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/redis/${encodeURIComponent(key)}${buildQuery(withCountry(params))}`),
};
