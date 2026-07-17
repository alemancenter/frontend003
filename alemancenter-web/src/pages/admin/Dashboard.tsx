import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Eye,
  FileText,
  Gauge,
  HardDrive,
  Layers,
  Loader2,
  MessageSquare,
  Newspaper,
  Plus,
  RefreshCw,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { adminAnalyticsApi, adminArticlesApi, adminSecurityApi } from "@/lib/api/admin";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { cn } from "@/lib/utils";
import MemberDashboard from "@/pages/member/Dashboard";

type Tone = "sky" | "emerald" | "violet" | "amber" | "rose" | "slate";

const toneClasses: Record<Tone, { box: string; icon: string; soft: string; chart: string }> = {
  sky: {
    box: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300",
    icon: "text-sky-600 dark:text-sky-300",
    soft: "border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/20",
    chart: "#0ea5e9",
  },
  emerald: {
    box: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-300",
    soft: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20",
    chart: "#10b981",
  },
  violet: {
    box: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300",
    icon: "text-violet-600 dark:text-violet-300",
    soft: "border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/20",
    chart: "#8b5cf6",
  },
  amber: {
    box: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-300",
    soft: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
    chart: "#f59e0b",
  },
  rose: {
    box: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
    icon: "text-rose-600 dark:text-rose-300",
    soft: "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20",
    chart: "#f43f5e",
  },
  slate: {
    box: "bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
    icon: "text-slate-600 dark:text-slate-300",
    soft: "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40",
    chart: "#64748b",
  },
};

function numberValue(...values: unknown[]) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function formatNumber(value: unknown) {
  return numberValue(value).toLocaleString("ar-EG");
}

function formatPercent(value: unknown) {
  const num = numberValue(value);
  return `${Math.abs(num).toLocaleString("ar-EG", { maximumFractionDigits: 1 })}%`;
}

function formatBytes(bytes?: number) {
  const value = Number(bytes ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatLabelDate(value: unknown, fallback: string) {
  if (!value) return fallback;
  const raw = String(value);
  const date = new Date(raw.length > 10 ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw || fallback;
  return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}

function getNestedNumber(source: unknown, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (!acc || typeof acc !== "object") return undefined;
      return (acc as Record<string, unknown>)[key];
    }, source);
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function buildPlatformChart(summary: any) {
  const analytics = summary?.analytics ?? {};
  const dates: unknown[] = Array.isArray(analytics.dates) ? analytics.dates : [];
  const length = Math.max(
    dates.length,
    analytics.articles?.length ?? 0,
    analytics.news?.length ?? 0,
    analytics.comments?.length ?? 0,
    analytics.views?.length ?? 0,
  );

  return Array.from({ length }).map((_, index) => ({
    name: formatLabelDate(dates[index], String(index + 1)),
    articles: numberValue(analytics.articles?.[index]),
    posts: numberValue(analytics.news?.[index]),
    comments: numberValue(analytics.comments?.[index]),
    views: numberValue(analytics.views?.[index]),
    authors: numberValue(analytics.authors?.[index]),
  }));
}

function buildVisitorChart(visitorAnalytics: any, summary: any) {
  const raw =
    visitorAnalytics?.chart_data ||
    visitorAnalytics?.visitor_stats?.history ||
    summary?.analytics?.visitors ||
    [];
  if (!Array.isArray(raw)) return [];

  return raw.map((item: any, index: number) => ({
    name: formatLabelDate(item.full_date || item.date || item.name, String(index + 1)),
    views: numberValue(item.pageViews, item.views, item.visits, item.count),
    visitors: numberValue(item.visitors, item.unique_visitors, item.users),
  }));
}

function activityIcon(type: unknown) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("news") || normalized.includes("post")) return Newspaper;
  if (normalized.includes("comment")) return MessageSquare;
  if (normalized.includes("user")) return Users;
  return FileText;
}

function trendBadge(trend?: { percentage?: number; trend?: string }) {
  const percentage = numberValue(trend?.percentage);
  const isDown = trend?.trend === "down" || percentage < 0;
  const Icon = isDown ? ArrowDown : ArrowUp;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        isDown
          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
      )}
    >
      <Icon className="h-3 w-3" />
      {formatPercent(percentage)}
    </span>
  );
}

function EmptyState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-md border border-dashed p-6 text-center text-muted-foreground">
      <Icon className="mb-3 h-9 w-9 opacity-45" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { hasPermission, canAccessPrivilegedAdmin } = useAuth();
  const country = useCountry();
  const queryClient = useQueryClient();

  const canViewDashboard = canAccessPrivilegedAdmin;
  const canMonitor = hasPermission("manage monitoring") || hasPermission("manage performance");
  const canManageSecurity = hasPermission("manage security");
  const canManageTeacherSubscriptions = hasPermission("manage teacher subscriptions");
  const canManageContentAudit = hasPermission("manage content audit");
  const canManageArticles = hasPermission("manage articles");
  const canManagePosts = hasPermission("manage posts");
  const canManageSettings = hasPermission("manage settings");

  const dashboardQuery = useQuery({
    queryKey: ["admin", "dashboard", "summary", country],
    queryFn: () => adminAnalyticsApi.dashboardSummary({ country }),
    enabled: canViewDashboard,
  });

  const contentQuery = useQuery({
    queryKey: ["admin", "dashboard", "content-analytics", country],
    queryFn: () => adminAnalyticsApi.contentAnalytics({ country }),
    enabled: canViewDashboard,
  });

  const articleStatsQuery = useQuery({
    queryKey: ["admin", "articles", "stats", country],
    queryFn: () => adminArticlesApi.stats({ country }),
    enabled: canViewDashboard,
  });

  const visitorQuery = useQuery({
    queryKey: ["admin", "dashboard", "visitor-analytics", country],
    queryFn: () => adminAnalyticsApi.visitorAnalytics({ country, days: 7 }),
    enabled: canViewDashboard && canMonitor,
  });

  const activitiesQuery = useQuery({
    queryKey: ["admin", "dashboard", "activities", country],
    queryFn: () => adminAnalyticsApi.activities({ country, per_page: 8 }),
    enabled: canViewDashboard,
  });

  const performanceLiveQuery = useQuery({
    queryKey: ["admin", "dashboard", "performance-live", country],
    queryFn: () => adminAnalyticsApi.performanceLive({ country }),
    enabled: canViewDashboard && canMonitor,
    refetchInterval: 30000,
  });

  const performanceCacheQuery = useQuery({
    queryKey: ["admin", "dashboard", "performance-cache", country],
    queryFn: () => adminAnalyticsApi.performanceCache({ country }),
    enabled: canViewDashboard && canMonitor,
    refetchInterval: 30000,
  });

  const performanceResponseQuery = useQuery({
    queryKey: ["admin", "dashboard", "performance-response", country],
    queryFn: () => adminAnalyticsApi.performanceResponseTime({ country }),
    enabled: canViewDashboard && canMonitor,
    refetchInterval: 30000,
  });

  const securityOverviewQuery = useQuery({
    queryKey: ["admin", "dashboard", "security-overview", country],
    queryFn: () => adminSecurityApi.overview({ country }),
    enabled: canViewDashboard && canManageSecurity,
  });

  const securityStatsQuery = useQuery({
    queryKey: ["admin", "dashboard", "security-stats", country],
    queryFn: () => adminSecurityApi.stats({ country }),
    enabled: canViewDashboard && canManageSecurity,
  });

  const teacherDashboardQuery = useQuery({
    queryKey: ["admin", "dashboard", "teacher-subscriptions"],
    queryFn: () => teacherSubscriptionAdminApi.dashboard(),
    enabled: canViewDashboard && canManageTeacherSubscriptions,
  });

  const summary = dashboardQuery.data as any;
  const contentAnalytics = contentQuery.data as any;
  const articleStats = articleStatsQuery.data as any;
  const visitorAnalytics = visitorQuery.data as any;
  const performanceLive = performanceLiveQuery.data;
  const performanceCache = performanceCacheQuery.data;
  const securityOverview = securityOverviewQuery.data as any;
  const securityStats = securityStatsQuery.data as any;
  const teacherDashboard = teacherDashboardQuery.data as any;

  const platformChart = useMemo(() => buildPlatformChart(summary), [summary]);
  const visitorChart = useMemo(() => buildVisitorChart(visitorAnalytics, summary), [summary, visitorAnalytics]);

  const recentActivities =
    Array.isArray(activitiesQuery.data) && activitiesQuery.data.length > 0
      ? activitiesQuery.data
      : Array.isArray(summary?.recentActivities)
        ? summary.recentActivities
        : [];

  if (!canViewDashboard) return <MemberDashboard />;

  const totals = summary?.totals ?? {};
  const trends = summary?.trends ?? {};
  const teacherStats = teacherDashboard?.stats ?? {};
  const activeVisitors = getNestedNumber(visitorAnalytics, ["visitor_stats.current", "visitor_stats.total_today"]);
  const totalToday = getNestedNumber(visitorAnalytics, ["visitor_stats.total_combined_today", "visitor_stats.total_today"]);
  const currentMembers = getNestedNumber(visitorAnalytics, ["visitor_stats.current_members"]);
  const currentGuests = getNestedNumber(visitorAnalytics, ["visitor_stats.current_guests"]);
  const publishedArticles = numberValue(contentAnalytics?.published_articles, articleStats?.published, articleStats?.published_articles);
  const draftArticles = numberValue(contentAnalytics?.draft_articles, articleStats?.draft, articleStats?.draft_articles);
  const contentTotal = publishedArticles + draftArticles;
  const publishedRatio = contentTotal > 0 ? Math.round((publishedArticles / contentTotal) * 100) : 0;
  const avgResponse = numberValue(performanceResponseQuery.data?.average_ms);
  const memoryUsage = Math.round(performanceLive?.memory?.usage_percentage ?? performanceLive?.memory?.percentage ?? 0);
  const diskUsage = Math.round(performanceLive?.disk?.usage_percentage ?? performanceLive?.disk?.percentage ?? 0);
  const cacheHitRatio = Math.round(performanceCache?.hit_ratio ?? 0);
  const isFetching = queryClient.isFetching({ queryKey: ["admin", "dashboard"] }) > 0;
  const isInitialLoading = dashboardQuery.isLoading || contentQuery.isLoading || articleStatsQuery.isLoading;

  const kpis = [
    {
      title: "المقالات",
      value: numberValue(articleStats?.total, totals.articles),
      note: `${formatNumber(publishedArticles || articleStats?.published)} منشور`,
      icon: FileText,
      tone: "sky" as Tone,
      trend: trends.articles,
    },
    {
      title: "المنشورات",
      value: numberValue(totals.news),
      note: "الأخبار والمحتوى العام",
      icon: Newspaper,
      tone: "violet" as Tone,
      trend: trends.news,
    },
    {
      title: "المستخدمون",
      value: numberValue(totals.users, visitorAnalytics?.user_stats?.total),
      note: `${formatNumber(visitorAnalytics?.user_stats?.new_today)} جديد اليوم`,
      icon: Users,
      tone: "amber" as Tone,
      trend: trends.users,
    },
    {
      title: "النشطون الآن",
      value: numberValue(activeVisitors, totals.online_users),
      note: canMonitor ? `${formatNumber(currentMembers)} عضو / ${formatNumber(currentGuests)} زائر` : "يتطلب صلاحية المراقبة",
      icon: Eye,
      tone: "emerald" as Tone,
      trend: { percentage: visitorAnalytics?.visitor_stats?.change, trend: numberValue(visitorAnalytics?.visitor_stats?.change) < 0 ? "down" : "up" },
      disabled: !canMonitor,
    },
    {
      title: "تنبيهات الأمان",
      value: numberValue(securityOverview?.last_24h_events, securityStats?.critical_logs, securityOverview?.total_attacks),
      note: canManageSecurity ? `${formatNumber(securityStats?.blocked_ips)} IP محظور` : "يتطلب صلاحية الأمان",
      icon: ShieldAlert,
      tone: "rose" as Tone,
      disabled: !canManageSecurity,
    },
    {
      title: "اشتراكات المعلمين",
      value: numberValue(teacherStats.active_subscriptions, teacherDashboard?.active_subscriptions),
      note: canManageTeacherSubscriptions ? `${formatNumber(teacherStats.pending_orders)} طلب بانتظار المراجعة` : "يتطلب صلاحية الاشتراكات",
      icon: BookOpen,
      tone: "slate" as Tone,
      disabled: !canManageTeacherSubscriptions,
    },
  ];

  const systemHealth = [
    {
      label: "متوسط الاستجابة",
      value: canMonitor ? `${formatNumber(avgResponse)} ms` : "غير متاح",
      sub: "Ping Redis/API",
      icon: Gauge,
      tone: avgResponse > 500 ? "rose" : avgResponse > 150 ? "amber" : "emerald",
      pct: Math.min((avgResponse / 1000) * 100, 100),
    },
    {
      label: "الذاكرة",
      value: canMonitor ? `${formatNumber(memoryUsage)}%` : "غير متاح",
      sub: canMonitor ? `${formatBytes(performanceLive?.memory?.used)} مستخدم` : "صلاحية المراقبة مطلوبة",
      icon: HardDrive,
      tone: memoryUsage > 85 ? "rose" : memoryUsage > 60 ? "amber" : "sky",
      pct: memoryUsage,
    },
    {
      label: "الكاش",
      value: canMonitor ? `${formatNumber(cacheHitRatio)}%` : "غير متاح",
      sub: performanceCache?.cache_size ?? "Hit Ratio",
      icon: Database,
      tone: cacheHitRatio >= 70 ? "emerald" : cacheHitRatio > 0 ? "amber" : "slate",
      pct: cacheHitRatio,
    },
    {
      label: "القرص",
      value: canMonitor ? `${formatNumber(diskUsage)}%` : "غير متاح",
      sub: "مساحة الخادم",
      icon: Layers,
      tone: diskUsage > 85 ? "rose" : diskUsage > 60 ? "amber" : "violet",
      pct: diskUsage,
    },
  ];

  const contentDistribution = [
    { name: "منشور", value: publishedArticles, color: toneClasses.emerald.chart },
    { name: "مسودة", value: draftArticles, color: toneClasses.amber.chart },
  ].filter((item) => item.value > 0);

  const quickActions = [
    { label: "مقال جديد", href: "/admin/articles/new", icon: Plus, show: canManageArticles },
    { label: "منشور جديد", href: "/admin/posts/new", icon: Newspaper, show: canManagePosts },
    { label: "تحسين الجودة", href: "/admin/content-quality", icon: Sparkles, show: canManageContentAudit },
    { label: "تدقيق المحتوى", href: "/admin/content-audit", icon: SearchCheck, show: canManageContentAudit },
    { label: "الأداء", href: "/admin/performance", icon: Gauge, show: canMonitor },
    { label: "Redis", href: "/admin/redis", icon: Database, show: canManageSettings },
  ].filter((item) => item.show);

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-lg border bg-background p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              مركز إدارة المنصة
            </div>
            <h1 className="text-3xl font-bold tracking-tight">لوحة القيادة</h1>
            <p className="mt-2 leading-7 text-muted-foreground">
              نظرة عامة على نشاط المنصة وإحصائيات المحتوى حسب قاعدة البيانات المختارة، مع مؤشرات مباشرة للأداء والأمان والاشتراكات.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <Database className="h-3.5 w-3.5" />
                قاعدة البيانات: {country.toUpperCase()}
              </Badge>
              <Badge variant={canMonitor ? "default" : "secondary"} className={cn(canMonitor && "bg-emerald-600 hover:bg-emerald-600")}>
                {canMonitor ? "المراقبة مفعلة" : "المراقبة غير متاحة"}
              </Badge>
              <Badge variant={canManageSecurity ? "default" : "secondary"} className={cn(canManageSecurity && "bg-sky-600 hover:bg-sky-600")}>
                {canManageSecurity ? "الأمان مفعل" : "الأمان غير متاح"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminCountrySelect />
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["admin"] })}
              disabled={isFetching}
              title="تحديث البيانات"
            >
              <RefreshCw className={cn("ml-2 h-4 w-4", isFetching && "animate-spin")} />
              تحديث
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <ExternalLink className="ml-2 h-4 w-4" />
                عرض الموقع
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((stat) => {
          const tone = toneClasses[stat.tone];
          return (
            <Card key={stat.title} className={cn("overflow-hidden", stat.disabled && "opacity-75")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={cn("rounded-md p-2", tone.box)}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isInitialLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <>
                    <div className="flex items-end justify-between gap-2">
                      <p className="text-2xl font-black">{formatNumber(stat.value)}</p>
                      {stat.trend && !stat.disabled ? trendBadge(stat.trend) : null}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{stat.note}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {systemHealth.map((item) => {
          const tone = toneClasses[item.tone as Tone];
          return (
            <Card key={item.label} className={cn("border", tone.soft)}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-black">{item.value}</p>
                  </div>
                  <div className={cn("rounded-md p-2", tone.box)}>
                    <item.icon className="h-4 w-4" />
                  </div>
                </div>
                <Progress value={item.pct} className="mt-4 h-2" />
                <p className="mt-2 text-xs text-muted-foreground">{item.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                نشاط المحتوى خلال 7 أيام
              </CardTitle>
              <CardDescription>مقالات، منشورات، تعليقات، ومشاهدات من قاعدة البيانات المختارة.</CardDescription>
            </div>
            <Badge variant="secondary">آخر 7 أيام</Badge>
          </CardHeader>
          <CardContent className="h-[340px]">
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : platformChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={platformChart} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashArticles" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={toneClasses.sky.chart} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={toneClasses.sky.chart} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="dashPosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={toneClasses.violet.chart} stopOpacity={0.24} />
                      <stop offset="95%" stopColor={toneClasses.violet.chart} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={34} />
                  <Tooltip />
                  <Area type="monotone" dataKey="articles" name="المقالات" stroke={toneClasses.sky.chart} fill="url(#dashArticles)" strokeWidth={2} />
                  <Area type="monotone" dataKey="posts" name="المنشورات" stroke={toneClasses.violet.chart} fill="url(#dashPosts)" strokeWidth={2} />
                  <Area type="monotone" dataKey="comments" name="التعليقات" stroke={toneClasses.amber.chart} fill="transparent" strokeWidth={2} />
                  <Area type="monotone" dataKey="views" name="المشاهدات" stroke={toneClasses.emerald.chart} fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} label="لا توجد بيانات كافية لعرض نشاط المحتوى." />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              الزيارات والزوار
            </CardTitle>
            <CardDescription>
              {canMonitor ? `${formatNumber(totalToday)} زيارة اليوم` : "تحتاج صلاحية manage monitoring أو manage performance."}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[340px]">
            {!canMonitor ? (
              <EmptyState icon={Eye} label="بيانات الزوار غير مفعلة لهذا الحساب." />
            ) : visitorQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : visitorChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitorChart} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={toneClasses.emerald.chart} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={toneClasses.emerald.chart} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="dashVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={toneClasses.sky.chart} stopOpacity={0.24} />
                      <stop offset="95%" stopColor={toneClasses.sky.chart} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={34} />
                  <Tooltip />
                  <Area type="monotone" dataKey="views" name="الزيارات" stroke={toneClasses.emerald.chart} fill="url(#dashVisits)" strokeWidth={2} />
                  <Area type="monotone" dataKey="visitors" name="الزوار" stroke={toneClasses.sky.chart} fill="url(#dashVisitors)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Eye} label="لا توجد بيانات زيارات كافية حاليا." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              حالة المحتوى
            </CardTitle>
            <CardDescription>نسبة المنشور إلى المسودات ومؤشرات المحتوى الأعلى أداء.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[140px_1fr]">
              <div className="h-36">
                {contentDistribution.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={contentDistribution} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={4}>
                        {contentDistribution.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    لا بيانات
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">نسبة النشر</p>
                  <p className="text-3xl font-black">{formatNumber(publishedRatio)}%</p>
                </div>
                <Progress value={publishedRatio} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-muted-foreground">منشور</p>
                    <p className="font-bold">{formatNumber(publishedArticles)}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-muted-foreground">مسودة</p>
                    <p className="font-bold">{formatNumber(draftArticles)}</p>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link href="/admin/content-quality">
                <Sparkles className="ml-2 h-4 w-4" />
                فتح تحسين الجودة
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              أعلى المقالات والمنشورات
            </CardTitle>
            <CardDescription>ترتيب حسب الزيارات المسجلة في التحليلات.</CardDescription>
          </CardHeader>
          <CardContent>
            {contentQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  ...((contentAnalytics?.top_articles ?? []) as any[]).slice(0, 3).map((item) => ({
                    ...item,
                    kind: "مقال",
                    views: numberValue(item.visit_count),
                    href: `/admin/articles/${item.id}/edit`,
                  })),
                  ...((contentAnalytics?.top_posts ?? []) as any[]).slice(0, 3).map((item) => ({
                    ...item,
                    kind: "منشور",
                    views: numberValue(item.views),
                    href: `/admin/posts/${item.id}/edit`,
                  })),
                ]
                  .sort((a, b) => b.views - a.views)
                  .slice(0, 5)
                  .map((item, index) => (
                    <Link key={`${item.kind}-${item.id}`} href={item.href}>
                      <div className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/60">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title || "بدون عنوان"}</p>
                          <p className="text-xs text-muted-foreground">{item.kind}</p>
                        </div>
                        <Badge variant="secondary">{formatNumber(item.views)}</Badge>
                      </div>
                    </Link>
                  ))}
                {!(contentAnalytics?.top_articles?.length || contentAnalytics?.top_posts?.length) && (
                  <EmptyState icon={FileText} label="لا توجد عناصر أعلى أداء حتى الآن." />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              أحدث النشاطات
            </CardTitle>
            <CardDescription>آخر العمليات داخل لوحة الإدارة.</CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : recentActivities.length ? (
              <div className="space-y-3">
                {recentActivities.slice(0, 6).map((activity: any, index: number) => {
                  const Icon = activityIcon(activity.type || activity.event_type || activity.action);
                  return (
                    <div key={activity.id || index} className="flex items-start gap-3 rounded-md border p-3">
                      <div className="rounded-md bg-muted p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {activity.title || activity.body || activity.event || activity.action || "نشاط جديد"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activity.user?.name || activity.author?.name || activity.user_name || "النظام"}
                          {activity.created_at ? ` · ${formatDateTime(activity.created_at)}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Activity} label="لا توجد نشاطات حديثة." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              ملخص الأمان
            </CardTitle>
            <CardDescription>أحداث آخر 24 ساعة، الهجمات، والعناوين الأكثر تكرارا.</CardDescription>
          </CardHeader>
          <CardContent>
            {!canManageSecurity ? (
              <EmptyState icon={ShieldAlert} label="بيانات الأمان تظهر فقط لمن يملك صلاحية إدارة الأمان." />
            ) : securityOverviewQuery.isLoading || securityStatsQuery.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">24 ساعة</p>
                    <p className="text-xl font-black">{formatNumber(securityOverview?.last_24h_events)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">7 أيام</p>
                    <p className="text-xl font-black">{formatNumber(securityOverview?.last_7d_events)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">حرجة</p>
                    <p className="text-xl font-black text-destructive">{formatNumber(securityStats?.critical_logs)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {(securityOverview?.top_ips ?? []).slice(0, 4).map((item: any) => (
                    <div key={item.ip_address} className="flex items-center justify-between rounded-md bg-muted p-3">
                      <span className="font-mono text-xs" dir="ltr">{item.ip_address}</span>
                      <Badge variant="outline">{formatNumber(item.count)}</Badge>
                    </div>
                  ))}
                  {!(securityOverview?.top_ips ?? []).length && (
                    <p className="rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">لا توجد عناوين متكررة.</p>
                  )}
                </div>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/admin/security">
                    <AlertTriangle className="ml-2 h-4 w-4" />
                    فتح مركز الأمان
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              اشتراكات المعلمين
            </CardTitle>
            <CardDescription>الطلبات والاشتراكات المرتبطة بمساحة المعلمين.</CardDescription>
          </CardHeader>
          <CardContent>
            {!canManageTeacherSubscriptions ? (
              <EmptyState icon={Users} label="بيانات الاشتراكات تحتاج صلاحية إدارة اشتراكات المعلمين." />
            ) : teacherDashboardQuery.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">نشطة</p>
                    <p className="text-2xl font-black">{formatNumber(teacherStats.active_subscriptions)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">طلبات معلقة</p>
                    <p className="text-2xl font-black">{formatNumber(teacherStats.pending_orders)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">المعلمون</p>
                    <p className="text-2xl font-black">{formatNumber(teacherStats.total_teachers)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">ملفات مميزة</p>
                    <p className="text-2xl font-black">{formatNumber(teacherStats.total_premium_files)}</p>
                  </div>
                </div>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/admin/teacher-subscriptions">
                    <Clock className="ml-2 h-4 w-4" />
                    مراجعة الاشتراكات
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              إجراءات سريعة
            </CardTitle>
            <CardDescription>اختصارات للعمليات اليومية المتاحة لصلاحياتك.</CardDescription>
          </CardHeader>
          <CardContent>
            {quickActions.length ? (
              <div className="grid gap-2">
                {quickActions.map((action) => (
                  <Button key={action.href} variant="outline" className="justify-start" asChild>
                    <Link href={action.href}>
                      <action.icon className="ml-2 h-4 w-4" />
                      {action.label}
                    </Link>
                  </Button>
                ))}
              </div>
            ) : (
              <EmptyState icon={Plus} label="لا توجد إجراءات سريعة متاحة لهذا الحساب." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
