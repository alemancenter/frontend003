import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import { adminAnalyticsApi, type RouteErrorSample } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, AlertTriangle, Clock, Cpu, Database, Gauge, HardDrive, Loader2, RefreshCw, Server } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteError {
  route: string;
  errors: RouteErrorSample[];
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatUptime(seconds?: number) {
  if (!seconds || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}ي ${h}س`;
  if (h > 0) return `${h}س ${m}د`;
  return `${m}د`;
}

function barTone(pct: number) {
  return pct > 85 ? "[&>div]:bg-destructive" : pct > 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary";
}

export default function Performance() {
  const queryClient = useQueryClient();
  const country = useCountry();
  const [errorDetail, setErrorDetail] = useState<RouteError | null>(null);

  const { data: live, isLoading: liveLoading } = useQuery({
    queryKey: ["admin", "performance", "live", country],
    queryFn: () => adminAnalyticsApi.performanceLive({ country }),
    refetchInterval: 15000,
  });

  const { data: cache } = useQuery({
    queryKey: ["admin", "performance", "cache", country],
    queryFn: () => adminAnalyticsApi.performanceCache({ country }),
    refetchInterval: 30000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin", "performance", "metrics", country],
    queryFn: () => adminAnalyticsApi.performanceMetrics({ country }),
    refetchInterval: 15000,
  });

  const { data: rt } = useQuery({
    queryKey: ["admin", "performance", "response-time", country],
    queryFn: () => adminAnalyticsApi.performanceResponseTime({ country }),
    refetchInterval: 15000,
  });

  const isFetching = queryClient.isFetching({ queryKey: ["admin", "performance"] }) > 0;

  // Slowest routes from the live metrics snapshot (real data, was unused).
  const slowestRoutes = useMemo(() => {
    const routes = metrics?.routes ?? {};
    return Object.entries(routes)
      .map(([route, m]) => ({ route, ...m }))
      .sort((a, b) => b.avg_latency_ms - a.avg_latency_ms)
      .slice(0, 10);
  }, [metrics]);

  const cpuUsage = Math.round(live?.cpu?.usage ?? 0);
  const memUsage = Math.round(live?.memory?.usage_percentage ?? 0);
  const diskUsage = Math.round(live?.disk?.usage_percentage ?? 0);
  const avgMs = Math.round(rt?.average_ms ?? metrics?.avg_latency_ms ?? 0);

  if (liveLoading && !live) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const gauges = [
    { title: "المعالج", value: `${cpuUsage}%`, pct: cpuUsage, icon: Cpu, sub: `${live?.cpu?.cores ?? 1} أنوية` },
    { title: "الذاكرة", value: `${memUsage}%`, pct: memUsage, icon: Activity, sub: `${formatBytes(live?.memory?.used)} / ${formatBytes(live?.memory?.total)}` },
    { title: "القرص", value: `${diskUsage}%`, pct: diskUsage, icon: HardDrive, sub: `متاح: ${formatBytes(live?.disk?.free)}` },
    { title: "زمن الاستجابة", value: `${avgMs} ms`, pct: Math.min((avgMs / 1000) * 100, 100), icon: Clock, sub: "متوسط الكمون" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">أداء النظام</h1>
          <p className="mt-1 text-sm text-muted-foreground">مراقبة موارد الخادم ومقاييسه لحظيًا</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminCountrySelect />
          <Button
            variant="outline"
            size="icon"
            title="تحديث"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "performance"] })}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {gauges.map((g) => (
          <Card key={g.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{g.title}</CardTitle>
              <g.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{g.value}</div>
              <Progress value={g.pct} className={cn("mt-3 h-2", barTone(g.pct))} />
              <p className="mt-2 text-xs text-muted-foreground">{g.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              التخزين المؤقت (Cache)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
              <div>
                <p className="text-sm text-muted-foreground">نسبة النجاح (Hit Ratio)</p>
                <p className="text-2xl font-black">{Math.round(cache?.hit_ratio ?? 0)}%</p>
              </div>
              <Gauge className={cn("h-10 w-10", (cache?.hit_ratio ?? 0) >= 70 ? "text-emerald-500" : "text-amber-500")} />
            </div>
            <Progress value={Math.round(cache?.hit_ratio ?? 0)} className="h-2" />
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="mb-1 text-xs text-muted-foreground">حجم التخزين</p>
              <p className="text-lg font-bold">{cache?.cache_size ?? "0 B"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              إحصائيات الخادم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              {[
                { k: "النهاية الخلفية", v: "Go / Fiber API" },
                { k: "مدة التشغيل", v: formatUptime(metrics?.uptime_seconds) },
                { k: "إجمالي الطلبات", v: (metrics?.requests_total ?? 0).toLocaleString("ar-EG") },
                { k: "أخطاء (5xx)", v: (metrics?.errors_total ?? 0).toLocaleString("ar-EG"), danger: (metrics?.errors_total ?? 0) > 0 },
                { k: "متوسط الكمون", v: `${Math.round(metrics?.avg_latency_ms ?? 0)} ms` },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between py-2.5">
                  <span className="text-muted-foreground">{row.k}</span>
                  <span className={cn("font-medium", row.danger && "text-destructive")}>{row.v}</span>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Slowest routes — real per-route metrics (was fabricated db/redis/template/crypto) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            أبطأ المسارات
          </CardTitle>
          <CardDescription>أعلى المسارات زمنًا في الكمون منذ آخر إقلاع للخادم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المسار</TableHead>
                  <TableHead className="w-[90px]">الطلبات</TableHead>
                  <TableHead className="w-[110px]">متوسط</TableHead>
                  <TableHead className="w-[110px]">أقصى</TableHead>
                  <TableHead className="w-[90px]">أخطاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slowestRoutes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">لا توجد بيانات مقاييس</TableCell>
                  </TableRow>
                ) : (
                  slowestRoutes.map((r) => {
                    const hasErrorDetails = r.errors > 0 && (r.recent_errors?.length ?? 0) > 0;
                    return (
                      <TableRow
                        key={r.route}
                        className={cn(hasErrorDetails && "cursor-pointer")}
                        onClick={
                          hasErrorDetails
                            ? () => setErrorDetail({ route: r.route, errors: r.recent_errors ?? [] })
                            : undefined
                        }
                      >
                        <TableCell dir="ltr" className="max-w-[320px] truncate text-start font-mono text-xs">{r.route}</TableCell>
                        <TableCell className="text-muted-foreground">{r.count.toLocaleString("ar-EG")}</TableCell>
                        <TableCell>
                          <span className={cn("font-bold", r.avg_latency_ms > 200 ? "text-destructive" : r.avg_latency_ms > 50 ? "text-amber-600" : "text-emerald-600")}>
                            {r.avg_latency_ms.toFixed(1)} ms
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.max_latency_ms.toFixed(0)} ms</TableCell>
                        <TableCell>
                          {r.errors > 0 ? (
                            <Badge
                              variant="destructive"
                              className={cn(hasErrorDetails && "gap-1")}
                              title={hasErrorDetails ? "اضغط لعرض تفاصيل الخطأ" : undefined}
                            >
                              {hasErrorDetails && <AlertTriangle className="h-3 w-3" />}
                              {r.errors}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Route error details */}
      <Dialog open={!!errorDetail} onOpenChange={(open) => !open && setErrorDetail(null)}>
        <DialogContent dir="rtl" className="sm:max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              أخطاء المسار
            </DialogTitle>
            <DialogDescription dir="ltr" className="text-start font-mono text-xs">
              {errorDetail?.route}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {(errorDetail?.errors ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد تفاصيل أخطاء محفوظة</p>
            ) : (
              [...(errorDetail?.errors ?? [])].reverse().map((err, index) => (
                <div key={index} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge variant="destructive">HTTP {err.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(err.timestamp).toLocaleString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  {err.path && (
                    <p dir="ltr" className="mb-1 truncate text-start font-mono text-xs text-muted-foreground" title={err.path}>
                      {err.path}
                    </p>
                  )}
                  <pre dir="ltr" className="whitespace-pre-wrap break-words text-start text-xs leading-relaxed text-foreground/90">
                    {err.message}
                  </pre>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
