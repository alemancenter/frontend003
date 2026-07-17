import { useParams, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Download, Loader2, MonitorSmartphone, Sparkles, UserRound } from "lucide-react";
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

function getSubjects(profile: any) {
  const raw = profile?.subjects || profile?.subjects_json || profile?.subject;
  if (Array.isArray(raw)) return raw.filter(Boolean).join("، ");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).join("، ");
    } catch {
      return raw;
    }
  }
  return "-";
}

function Empty() {
  return <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">لا توجد بيانات.</div>;
}

export default function TeacherDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ts", "teachers", "detail", id],
    queryFn: () => teacherSubscriptionAdminApi.teacherDetail(id),
    enabled: !!id,
  });

  const teacher = data as any;
  const user = teacher?.user || teacher;
  const profile = teacher?.profile;
  const devices: any[] = teacher?.devices || [];
  const downloads: any[] = teacher?.downloads || [];
  const generations: any[] = teacher?.ai_generations || [];
  const subscription = teacher?.subscription;

  const deactivateMutation = useMutation({
    mutationFn: ({ deviceId, note }: { deviceId: number; note?: string }) =>
      teacherSubscriptionAdminApi.deactivateTeacherDevice(deviceId, { user_id: Number(id), note }),
    onSuccess: () => {
      toast({ title: "تم تعطيل الجهاز" });
      queryClient.invalidateQueries({ queryKey: ["admin", "ts", "teachers", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "ts", "devices"] });
    },
    onError: (error: any) => {
      toast({ title: "فشل تعطيل الجهاز", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.id && !user?.name) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">المعلم غير موجود.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/teacher-subscriptions/teachers">
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.name || "تفاصيل المعلم"}</h1>
          <p className="mt-1 text-muted-foreground">{user.email || "-"}</p>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4">
                <UserRound className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold">المواد: {getSubjects(profile)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  المدرسة: {profile?.school || "-"} / المدينة: {profile?.city || "-"}
                </p>
              </div>
            </div>
            <Badge variant={subscription?.status === "active" ? "default" : "outline"}>
              {subscription?.status || "بدون اشتراك نشط"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">حالة الاشتراك</p><p className="mt-2 text-2xl font-bold">{subscription?.status || "-"}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">الأجهزة</p><p className="mt-2 text-2xl font-bold">{devices.length.toLocaleString("ar-EG")}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">التحميلات</p><p className="mt-2 text-2xl font-bold">{downloads.length.toLocaleString("ar-EG")}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">عمليات AI</p><p className="mt-2 text-2xl font-bold">{generations.length.toLocaleString("ar-EG")}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>الأجهزة المرتبطة</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {devices.length === 0 ? <Empty /> : devices.map((device) => (
            <div key={device.id} className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  <MonitorSmartphone className="h-4 w-4 text-primary" />
                  {device.label || `جهاز #${device.id}`}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  الحالة: {device.is_active ? "نشط" : "معطل"} / آخر ظهور: {formatDate(device.last_seen_at)}
                </p>
              </div>
              {device.is_active && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const note = window.prompt("سبب تعطيل الجهاز", "") || "";
                    deactivateMutation.mutate({ deviceId: device.id, note });
                  }}
                  disabled={deactivateMutation.isPending}
                >
                  تعطيل
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>آخر التحميلات</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {downloads.length === 0 ? <Empty /> : downloads.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-md border p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Download className="h-4 w-4 text-primary" />
                  {item.file_title || item.original_filename || "ملف"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.subject_name || "-"} / {item.category || "-"} / {formatDate(item.created_at)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>عمليات الذكاء الاصطناعي</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {generations.length === 0 ? <Empty /> : generations.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-md border p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {item.title || item.tool_type || "توليد"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.tool_type || "-"} / {item.model || "-"} / {formatDate(item.created_at)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
