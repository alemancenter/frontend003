import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import type { TeacherAuditLog } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, History, Loader2, Search } from "lucide-react";

const PER_PAGE = 25;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => setPage(1), [debounced]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "ts", "audit-logs", debounced, page],
    queryFn: () =>
      teacherSubscriptionAdminApi.auditLogsWithMeta({
        page,
        per_page: PER_PAGE,
        action: debounced || undefined,
      }),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta ?? data?.pagination;
  const total = meta?.total ?? logs.length;
  const lastPage = meta?.last_page ?? 1;

  const actorName = (log: TeacherAuditLog) =>
    log.actor?.name ?? (log.actor_id ? `مشرف #${log.actor_id}` : "النظام");
  const subjectName = (log: TeacherAuditLog) =>
    log.user?.name ?? (log.user_id ? `مستخدم #${log.user_id}` : "—");

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">سجل التدقيق</h1>
        <p className="mt-1 text-muted-foreground">أثر الإجراءات الحساسة على اشتراكات المعلمين</p>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                السجلات
                <span className="ms-2 text-sm font-normal text-muted-foreground">({total.toLocaleString("ar-EG")})</span>
              </CardTitle>
              <CardDescription>مَن فعل ماذا، ومتى — لكل إجراء إداري.</CardDescription>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بنوع الإجراء..."
                className="pr-8"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">المعرف</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>المنفّذ</TableHead>
                  <TableHead>المتأثّر</TableHead>
                  <TableHead>الكيان</TableHead>
                  <TableHead>ملاحظة</TableHead>
                  <TableHead className="w-[160px]">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <History className="mb-2 h-8 w-8 text-muted-foreground/50" />
                        <span>{debounced ? "لا توجد سجلات مطابقة" : "لا توجد سجلات بعد"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: TeacherAuditLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-muted-foreground">{log.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" dir="ltr" className="font-mono text-xs">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{actorName(log)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{subjectName(log)}</TableCell>
                      <TableCell dir="ltr" className="text-start text-xs text-muted-foreground">
                        {log.entity_type}
                        {log.entity_id ? `#${log.entity_id}` : ""}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="truncate text-xs text-muted-foreground" title={log.note}>{log.note || "—"}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {lastPage > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                صفحة {page} من {lastPage}
                {isFetching && <Loader2 className="ms-2 inline h-3 w-3 animate-spin" />}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isFetching}>
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page >= lastPage || isFetching}>
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
