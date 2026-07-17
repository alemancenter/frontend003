import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import { adminSecurityApi, adminAnalyticsApi } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, AlertTriangle, Cpu, HardDrive, Loader2, RefreshCw, Server, Shield, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatUptime(seconds?: number) {
  if (!seconds || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}ي ${h}س`;
  if (h > 0) return `${h}س ${m}د`;
  return `${m}د`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Monitor() {
  const queryClient = useQueryClient();
  const country = useCountry();
  const { toast } = useToast();

  const { data: monitor, isLoading } = useQuery({
    queryKey: ["admin", "monitor", "dashboard", country],
    queryFn: () => adminSecurityApi.monitorDashboard({ country }),
    refetchInterval: 15000,
  });

  // Live CPU/memory + uptime come from the performance endpoints, not the
  // security monitor dashboard (which only carries security stats + events).
  const { data: live } = useQuery({
    queryKey: ["admin", "monitor", "live", country],
    queryFn: () => adminAnalyticsApi.performanceLive({ country }),
    refetchInterval: 15000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin", "monitor", "metrics", country],
    queryFn: () => adminAnalyticsApi.performanceMetrics({ country }),
    refetchInterval: 30000,
  });

  const isFetching = queryClient.isFetching({ queryKey: ["admin", "monitor"] }) > 0;

  const pruneMutation = useMutation({
    mutationFn: () => adminAnalyticsApi.pruneVisitors({ country }),
    onSuccess: () => {
      toast({ title: "تم تنظيف الجلسات القديمة" });
      queryClient.invalidateQueries({ queryKey: ["admin", "monitor"] });
    },
    onError: (error: Error) =>
      toast({ title: "فشل التنظيف", description: error.message, variant: "destructive" }),
  });

  const stats = monitor?.stats;
  const events = monitor?.recent_events ?? [];
  const cpuUsage = Math.round(live?.cpu?.usage ?? 0);
  const memUsage = Math.round(live?.memory?.usage_percentage ?? 0);

  if (isLoading && !monitor) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tiles = [
    { title: "استهلاك المعالج", value: `${cpuUsage}%`, pct: cpuUsage, icon: Cpu, sub: `${live?.cpu?.cores ?? 1} أنوية` },
    { title: "استهلاك الذاكرة", value: `${memUsage}%`, pct: memUsage, icon: HardDrive, sub: `${Math.round((live?.memory?.used ?? 0) / 1048576)} م.ب مستخدمة` },
    { title: "تهديدات محظورة", value: (stats?.blocked_attacks ?? 0).toLocaleString("ar-EG"), icon: Shield, sub: `${(stats?.blocked_ips ?? 0).toLocaleString("ar-EG")} IP محظور` },
    { title: "أحداث غير محلولة", value: (stats?.unresolved_events ?? 0).toLocaleString("ar-EG"), icon: AlertTriangle, sub: `${(stats?.total_events ?? 0).toLocaleString("ar-EG")} إجمالي` },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">المراقبة المركزية</h1>
            <p className="text-sm text-muted-foreground">مراقبة الأداء والأمان في مكان واحد</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            النظام يعمل
          </span>
          <AdminCountrySelect />
          <Button
            variant="outline"
            size="icon"
            title="تحديث"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "monitor"] })}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tile.title}</CardTitle>
              <tile.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{tile.value}</div>
              {tile.pct !== undefined && (
                <Progress
                  value={tile.pct}
                  className={cn("mt-2 h-1.5", tile.pct > 85 ? "[&>div]:bg-destructive" : tile.pct > 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary")}
                />
              )}
              <p className="mt-2 text-xs text-muted-foreground">{tile.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-destructive" />
                أحدث الأحداث الأمنية
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => pruneMutation.mutate()} disabled={pruneMutation.isPending}>
                {pruneMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}
                تنظيف الجلسات
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead className="w-[90px]">الخطورة</TableHead>
                    <TableHead className="w-[130px]">IP</TableHead>
                    <TableHead className="w-[100px]">الوقت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">لا توجد أحداث أمنية أخيرة</TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-xs font-medium">
                          {event.event_type || "—"}
                          {event.is_blocked && <Badge variant="destructive" className="ms-2">محظور</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              event.severity === "critical" || event.severity === "danger"
                                ? "destructive"
                                : event.severity === "warning"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {event.severity || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell dir="ltr" className="text-start font-mono text-xs">{event.ip_address || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatTime(event.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                معلومات الخادم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y text-sm">
                {[
                  { k: "مدة التشغيل", v: formatUptime(metrics?.uptime_seconds) },
                  { k: "إجمالي الطلبات", v: (metrics?.requests_total ?? 0).toLocaleString("ar-EG") },
                  { k: "متوسط الكمون", v: `${Math.round(metrics?.avg_latency_ms ?? 0)} ms` },
                  { k: "IP موثوقة", v: (stats?.trusted_ips ?? 0).toLocaleString("ar-EG") },
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between py-2.5">
                    <span className="text-muted-foreground">{row.k}</span>
                    <span className="font-medium">{row.v}</span>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className={cn((stats?.unresolved_events ?? 0) > 0 && "border-amber-500/40 bg-amber-500/5")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className={cn("h-5 w-5", (stats?.unresolved_events ?? 0) > 0 ? "text-amber-500" : "text-muted-foreground")} />
                تنبيهات النظام
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(stats?.unresolved_events ?? 0) > 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  يوجد {(stats?.unresolved_events ?? 0).toLocaleString("ar-EG")} حدث أمني غير محلول يحتاج للمراجعة.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد تنبيهات عاجلة — جميع الأنظمة طبيعية.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
