import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import { adminAnalyticsApi, type ActiveVisitor } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Globe,
  Loader2,
  Monitor,
  RefreshCw,
  Search,
  Smartphone,
  Tablet,
  TrendingUp,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ALL = "all";

const DEVICE_ICON: Record<string, typeof Monitor> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

function ChangeBadge({ change, label }: { change?: number; label?: string }) {
  if (change === undefined || change === null || Number.isNaN(change)) return null;
  const up = change >= 0;
  return (
    <span className={cn("flex items-center gap-1 text-xs", up ? "text-emerald-500" : "text-destructive")}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(change)}
      {label ? ` ${label}` : "%"}
    </span>
  );
}

export default function Analytics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const country = useCountry();

  const [period, setPeriod] = useState("30");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(ALL);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "analytics", "visitor", country, period],
    queryFn: () => adminAnalyticsApi.visitorAnalytics({ period: Number(period), country }),
    // Live-ish: refresh the active-visitor snapshot periodically.
    refetchInterval: 30_000,
  });

  const pruneMutation = useMutation({
    mutationFn: () => adminAnalyticsApi.pruneVisitors({ country }),
    onSuccess: () => {
      toast({ title: "تم تنظيف بيانات الزوار" });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
    onError: (error: Error) =>
      toast({ title: "فشل التنظيف", description: error.message, variant: "destructive" }),
  });

  const visitorStats = data?.visitor_stats;
  const userStats = data?.user_stats;
  const chartData = data?.chart_data ?? [];
  const deviceStats = data?.device_stats ?? [];
  const trafficSources = data?.traffic_sources ?? [];
  const countryStats = data?.country_stats ?? [];

  const stats = [
    {
      title: "الزوار اليوم",
      value: (visitorStats?.total_today ?? 0).toLocaleString("ar-EG"),
      change: visitorStats?.change,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "النشطون الآن",
      value: (visitorStats?.current ?? 0).toLocaleString("ar-EG"),
      subtitle: `${visitorStats?.current_members ?? 0} عضو + ${visitorStats?.current_guests ?? 0} زائر`,
      icon: Activity,
      color: "text-emerald-500",
      isLive: true,
    },
    {
      title: "إجمالي الأعضاء",
      value: (userStats?.total ?? 0).toLocaleString("ar-EG"),
      change: userStats?.new_today,
      changeLabel: "جديد اليوم",
      icon: Users,
      color: "text-violet-500",
    },
    {
      title: "الأعضاء النشطون",
      value: (userStats?.active ?? 0).toLocaleString("ar-EG"),
      icon: TrendingUp,
      color: "text-amber-500",
    },
  ];

  const activeVisitors = visitorStats?.active_visitors ?? [];
  const filteredVisitors = useMemo(() => {
    const term = search.trim().toLowerCase();
    return activeVisitors.filter((v) => {
      const matchesFilter =
        filter === ALL || (filter === "members" && v.is_member) || (filter === "guests" && !v.is_member);
      const matchesSearch =
        !term ||
        (v.ip ?? "").toLowerCase().includes(term) ||
        (v.country ?? "").toLowerCase().includes(term) ||
        (v.city ?? "").toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [activeVisitors, search, filter]);

  const maxSource = Math.max(1, ...trafficSources.map((s) => s.visits));
  const maxCountry = Math.max(1, ...countryStats.map((c) => c.count));

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التحليلات</h1>
          <p className="mt-1 text-muted-foreground">تتبّع أداء الموقع وسلوك الزوار لحظيًا</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminCountrySelect />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="14">آخر 14 يومًا</SelectItem>
              <SelectItem value="30">آخر 30 يومًا</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            title="تحديث"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] })}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => pruneMutation.mutate()} disabled={pruneMutation.isPending}>
            {pruneMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            تنظيف البيانات
          </Button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{stat.value}</div>
              {stat.subtitle && <p className="mt-1 text-xs text-muted-foreground">{stat.subtitle}</p>}
              {stat.change !== undefined && <div className="mt-1"><ChangeBadge change={stat.change} label={stat.changeLabel} /></div>}
              {stat.isLive && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-xs text-emerald-500">مباشر</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visitors over time — single-series area chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            الزيارات عبر الوقت
          </CardTitle>
          <CardDescription>عدد الزوار اليومي خلال الفترة المختارة</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <div className="h-[300px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickMargin={8} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={40} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1 }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 700 }}
                    formatter={(value: number) => [value.toLocaleString("ar-EG"), "زوار"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#visitorsFill)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Device breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              الأجهزة
            </CardTitle>
            <CardDescription>توزيع الزيارات حسب الجهاز</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deviceStats.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              deviceStats.map((device) => {
                const Icon = DEVICE_ICON[device.name] ?? Monitor;
                return (
                  <div key={device.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {device.name === "Desktop" ? "حاسوب" : device.name === "Mobile" ? "جوال" : "لوحي"}
                      </span>
                      <span className="font-medium">
                        {Math.round(device.value)}%
                        <span className="ms-1 text-xs text-muted-foreground">({device.count.toLocaleString("ar-EG")})</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${device.value}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Traffic sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              مصادر الزيارات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trafficSources.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              trafficSources.map((source) => (
                <div key={source.source} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate" title={source.source}>{source.source}</span>
                    <span className="flex items-center gap-2 whitespace-nowrap font-medium">
                      {source.visits.toLocaleString("ar-EG")}
                      <ChangeBadge change={source.change} />
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(source.visits / maxSource) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top countries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              أعلى الدول
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {countryStats.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              countryStats.slice(0, 6).map((item) => (
                <div key={item.country} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.country}</span>
                    <span className="font-medium">{item.count.toLocaleString("ar-EG")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(item.count / maxCountry) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active visitors */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              الزوار النشطون الآن
              <Badge variant="secondary">{filteredVisitors.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالدولة أو المدينة أو IP..."
                  className="pr-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>الكل</SelectItem>
                  <SelectItem value="members">الأعضاء</SelectItem>
                  <SelectItem value="guests">الزوار</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموقع</TableHead>
                  <TableHead className="w-[90px]">النوع</TableHead>
                  <TableHead>المتصفح / النظام</TableHead>
                  <TableHead>الصفحة الحالية</TableHead>
                  <TableHead className="w-[130px]">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      لا يوجد زوار نشطون حاليًا
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVisitors.map((visitor: ActiveVisitor, i) => (
                    <TableRow key={`${visitor.ip}-${i}`}>
                      <TableCell>
                        {[visitor.city, visitor.country].filter(Boolean).join("، ") || "—"}
                      </TableCell>
                      <TableCell>
                        {visitor.is_member ? (
                          <Badge variant="default">عضو</Badge>
                        ) : (
                          <Badge variant="outline">زائر</Badge>
                        )}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start text-xs text-muted-foreground">
                        {[visitor.browser, visitor.os].filter(Boolean).join(" / ") || "—"}
                      </TableCell>
                      <TableCell dir="ltr" className="max-w-[220px] truncate text-start text-xs" title={visitor.current_page_full ?? visitor.current_page}>
                        {visitor.current_page || "—"}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start font-mono text-xs">{visitor.ip || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
