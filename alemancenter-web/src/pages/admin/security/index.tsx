import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { adminSecurityApi, type SecurityEvent } from "@/lib/api/admin";
import { useCountry } from "@/contexts/CountryContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  EyeOff,
  Loader2,
  Ban,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive",
  danger: "destructive",
  high: "destructive",
  warning: "secondary",
  medium: "secondary",
};

export default function Security() {
  const country = useCountry();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["admin", "security", "overview", country],
    queryFn: () => adminSecurityApi.overview({ country }),
    refetchInterval: 30000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "security", "stats", country],
    queryFn: () => adminSecurityApi.stats({ country }),
    refetchInterval: 30000,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["admin", "security", "logs", "recent", country],
    queryFn: () => adminSecurityApi.logs({ per_page: 8, country }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "security"] });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => adminSecurityApi.resolveLog(id, { country }),
    onSuccess: () => {
      toast({ title: "تم تعليم الحدث كمحلول" });
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل الإجراء", description: error.message, variant: "destructive" }),
  });

  const loading = overviewLoading || statsLoading;

  const tiles = [
    { title: "أحداث 24 ساعة", value: overview?.last_24h_events, icon: Activity, tint: "text-blue-500" },
    { title: "أحداث 7 أيام", value: overview?.last_7d_events, icon: CalendarDays, tint: "text-violet-500" },
    { title: "عناوين IP محظورة", value: stats?.blocked_ips, icon: EyeOff, tint: "text-destructive", href: "/admin/security/blocked-ips" },
    { title: "أحداث حرجة", value: stats?.critical_logs, icon: ShieldAlert, tint: "text-amber-500", href: "/admin/security/logs" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الأمان</h1>
          <p className="mt-1 text-muted-foreground">مراقبة الأحداث الأمنية وسجلات النظام</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminCountrySelect />
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/security/blocked-ips">إدارة عناوين IP</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/security/logs">كل السجلات</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <Card className={tile.href ? "cursor-pointer transition hover:border-primary/40" : undefined}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{tile.title}</CardTitle>
                <tile.icon className={`h-4 w-4 ${tile.tint}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-black">{(tile.value ?? 0).toLocaleString("ar-EG")}</div>
                )}
              </CardContent>
            </Card>
          );
          return tile.href ? (
            <Link key={tile.title} href={tile.href}>
              {body}
            </Link>
          ) : (
            <div key={tile.title}>{body}</div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent security logs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              أحدث الأحداث الأمنية
            </CardTitle>
            <CardDescription>آخر ما سُجّل من نشاط ومحاولات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الحدث</TableHead>
                    <TableHead className="w-[90px]">الخطورة</TableHead>
                    <TableHead className="w-[130px]">IP</TableHead>
                    <TableHead className="w-[120px]">التاريخ</TableHead>
                    <TableHead className="w-[60px] text-left" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">لا توجد سجلات</TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log: SecurityEvent) => (
                      <TableRow key={log.id}>
                        <TableCell className="max-w-[260px]">
                          <p className="truncate text-sm font-medium">
                            {log.event_type || "—"}
                            {log.is_blocked && <Badge variant="destructive" className="ms-2">محظور</Badge>}
                          </p>
                          {log.route && (
                            <p dir="ltr" className="truncate text-start text-xs text-muted-foreground">
                              {log.method} {log.route}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={SEVERITY_VARIANT[log.severity ?? ""] ?? "outline"}>
                            {log.severity || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell dir="ltr" className="text-start font-mono text-xs">{log.ip_address || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                        <TableCell className="text-left">
                          {!log.is_resolved && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-emerald-600 hover:bg-emerald-600/10"
                              title="تعليم كمحلول"
                              onClick={() => resolveMutation.mutate(log.id)}
                              disabled={resolveMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Top attacking IPs — was unused data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              أكثر العناوين نشاطًا
            </CardTitle>
            <CardDescription>أعلى مصادر الأحداث الأمنية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {overviewLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (overview?.top_ips ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              overview!.top_ips.slice(0, 8).map((item, index) => (
                <div key={item.ip_address} className="flex items-center justify-between rounded-md border p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span dir="ltr" className="font-mono text-sm">{item.ip_address}</span>
                  </div>
                  <Badge variant="secondary">{item.count.toLocaleString("ar-EG")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
