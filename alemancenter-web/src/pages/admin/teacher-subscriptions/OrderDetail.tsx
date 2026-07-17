import { useParams, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, FileText, Loader2, ReceiptText, XCircle } from "lucide-react";
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

function formatMoney(value?: unknown, currency?: unknown) {
  const amount = Number(value || 0).toLocaleString("ar-EG");
  return `${amount} ${currency || "JOD"}`;
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

function statusLabel(status?: string) {
  if (status === "approved") return "مقبول";
  if (status === "rejected") return "مرفوض";
  if (status === "pending") return "قيد المراجعة";
  return status || "-";
}

function Info({ label, value }: { label: string; value?: unknown }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-left font-medium" dir="auto">
        {value ? String(value) : "-"}
      </span>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ts", "orders", "detail", id],
    queryFn: () => teacherSubscriptionAdminApi.orderDetail(id),
    enabled: !!id,
  });

  const order = ((data as any)?.order || data) as any;
  const profile = (data as any)?.profile;
  const hasProof = Boolean((data as any)?.has_proof || order?.payment_proof_url || (data as any)?.proof_url);

  // The proof is a private file behind a Bearer-authenticated endpoint, so we
  // fetch it as a blob and open an object URL rather than linking directly.
  const proofMutation = useMutation({
    mutationFn: () => teacherSubscriptionAdminApi.downloadOrderProof(order.id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    onError: (error: any) => {
      toast({ title: "تعذر فتح إثبات الدفع", description: error?.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const note = window.prompt("ملاحظة الإدارة عند التفعيل", "") || "";
      return teacherSubscriptionAdminApi.approveOrderWithNote(order.id, note);
    },
    onSuccess: () => {
      toast({ title: "تم قبول الطلب وتفعيل الاشتراك" });
      queryClient.invalidateQueries({ queryKey: ["admin", "ts"] });
    },
    onError: (error: any) => {
      toast({ title: "فشل قبول الطلب", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const note = window.prompt("سبب الرفض", "") || "";
      if (!note.trim()) throw new Error("يجب كتابة سبب الرفض");
      return teacherSubscriptionAdminApi.rejectOrderWithNote(order.id, note);
    },
    onSuccess: () => {
      toast({ title: "تم رفض الطلب" });
      queryClient.invalidateQueries({ queryKey: ["admin", "ts"] });
    },
    onError: (error: any) => {
      toast({ title: "فشل رفض الطلب", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order?.id) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">الطلب غير موجود.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/teacher-subscriptions/orders">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تفاصيل طلب الاشتراك #{order.id}</h1>
            <p className="mt-1 text-muted-foreground">مراجعة بيانات المعلم والدفع قبل اتخاذ القرار.</p>
          </div>
        </div>
        <Badge variant={order.status === "approved" ? "default" : order.status === "pending" ? "outline" : "destructive"}>
          {statusLabel(order.status)}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">الحالة</p><p className="mt-2 text-2xl font-bold">{statusLabel(order.status)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">المبلغ</p><p className="mt-2 text-2xl font-bold">{formatMoney(order.amount_jod, order.currency)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">طريقة الدفع</p><p className="mt-2 text-2xl font-bold">{order.payment_method || "-"}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">تاريخ الطلب</p><p className="mt-2 text-sm font-bold">{formatDate(order.created_at)}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>بيانات المعلم</CardTitle></CardHeader>
          <CardContent>
            <Info label="الاسم" value={order.user?.name || order.payer_name} />
            <Info label="البريد" value={order.user?.email} />
            <Info label="المواد" value={getSubjects(profile)} />
            <Info label="المدرسة" value={profile?.school} />
            <Info label="المدينة" value={profile?.city} />
            <Info label="الهاتف" value={order.phone || profile?.phone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>بيانات الدفع</CardTitle></CardHeader>
          <CardContent>
            <Info label="اسم الدافع" value={order.payer_name} />
            <Info label="رقم العملية / المرجع" value={order.payment_reference} />
            <Info label="ملاحظة الإدارة" value={order.admin_note} />
            <Info label="وقت المراجعة" value={formatDate(order.reviewed_at)} />
            <div className="mt-4 rounded-md border border-dashed p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <ReceiptText className="h-5 w-5 text-primary" />
                إثبات الدفع
              </div>
              {hasProof ? (
                <Button
                  variant="outline"
                  onClick={() => proofMutation.mutate()}
                  disabled={proofMutation.isPending}
                >
                  {proofMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  فتح إثبات الدفع
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">لم يتم رفع إثبات دفع لهذا الطلب.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {order.status === "pending" && (
        <Card>
          <CardContent className="flex flex-wrap gap-3 pt-6">
            <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              <CheckCircle2 className="h-4 w-4" />
              قبول وتفعيل الاشتراك
            </Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
              <XCircle className="h-4 w-4" />
              رفض الطلب
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
