import { useParams, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowRight, Download, FileText, Loader2, ShieldCheck } from "lucide-react";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

function formatDate(value?: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

function formatBytes(value?: unknown) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function Empty() {
  return <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">لا توجد بيانات.</div>;
}

export default function PremiumFileDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ts", "premium-files", "detail", id],
    queryFn: () => teacherSubscriptionAdminApi.premiumFileDetail(id),
    enabled: !!id,
  });

  const detail = data as any;
  const file = detail?.file || detail;
  const downloads: any[] = detail?.downloads || [];
  const auditLogs: any[] = detail?.audit_logs || detail?.auditLogs || [];

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const reason = window.prompt("سبب الأرشفة", "") || "";
      return teacherSubscriptionAdminApi.archivePremiumFile(id, reason);
    },
    onSuccess: () => {
      toast({ title: "تمت أرشفة الملف" });
      queryClient.invalidateQueries({ queryKey: ["admin", "ts", "premium-files"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "ts", "files"] });
    },
    onError: (error: any) => {
      toast({ title: "فشل أرشفة الملف", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!file?.id) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">الملف غير موجود.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/teacher-subscriptions/premium-files">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{file.title || "تفاصيل الملف المميز"}</h1>
            <p className="mt-1 text-muted-foreground">مراجعة الملف، التحميلات، وسجل التدقيق.</p>
          </div>
        </div>
        {file.is_active && (
          <Button variant="destructive" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
            <Archive className="h-4 w-4" />
            أرشفة
          </Button>
        )}
      </div>

      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-primary/10 p-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{file.original_filename || file.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {file.subject_name || "-"} / {file.category || "-"} / {file.semester_name || "-"}
                </p>
              </div>
            </div>
            <Badge variant={file.is_active ? "default" : "secondary"}>
              {file.is_active ? "نشط" : "مؤرشف"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">المادة</p><p className="mt-2 text-xl font-bold">{file.subject_name || "-"}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">التصنيف</p><p className="mt-2 text-xl font-bold">{file.category || "-"}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">التحميلات</p><p className="mt-2 text-xl font-bold">{Number(file.download_count || 0).toLocaleString("ar-EG")}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">الحجم</p><p className="mt-2 text-xl font-bold">{formatBytes(file.file_size)}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>آخر التحميلات</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {downloads.length === 0 ? <Empty /> : downloads.map((item) => (
              <div key={item.id} className="rounded-md border p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Download className="h-4 w-4 text-primary" />
                  {item.user?.name || item.user_name || `مستخدم #${item.user_id || "-"}`}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.download_code || "-"} / {formatDate(item.created_at)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>سجل التدقيق</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {auditLogs.length === 0 ? <Empty /> : auditLogs.map((item) => (
              <div key={item.id} className="rounded-md border p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {item.action || "نشاط"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.note || "-"} / {item.actor?.name || item.actor_id || "النظام"} / {formatDate(item.created_at)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
