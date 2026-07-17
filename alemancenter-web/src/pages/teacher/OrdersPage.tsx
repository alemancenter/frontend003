import { useTeacherMe } from "@/hooks/use-teacher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export function OrdersPage() {
  // `me` returns a composite snapshot; the actual subscription (status/dates/price)
  // lives under `.subscription`, so read that rather than the wrapper object.
  const { data: me, isLoading } = useTeacherMe();
  const sub = me?.subscription;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-primary" />
          سجل الطلبات والاشتراك
        </h1>
        <p className="text-muted-foreground">حالة اشتراكك الحالي وتفاصيل العضوية.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : !sub ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground">لا يوجد طلبات</h3>
          <p className="text-muted-foreground">ليس لديك أي اشتراك أو طلبات سابقة.</p>
        </div>
      ) : (
        <Card className="border-border shadow-md overflow-hidden relative">
          <div className="absolute top-0 right-0 w-2 h-full bg-primary"></div>
          <CardHeader className="bg-muted/20 border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">تفاصيل الاشتراك الحالي</CardTitle>
              <div className="flex items-center gap-2">
                {sub.status === 'active' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> فعال
                  </span>
                ) : sub.status === 'expired' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4" /> منتهي
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold text-sm">
                    <Clock className="w-4 h-4" /> قيد المراجعة / ملغى
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">اسم الباقة</p>
                  <p className="text-lg font-bold text-foreground">{sub.plan?.name || "باقة غير معروفة"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">قيمة الاشتراك</p>
                  <p className="text-lg font-bold text-foreground">{sub.price_jod} JOD</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">تاريخ البدء</p>
                  <p className="text-lg font-bold text-foreground">
                    {sub.starts_at ? format(new Date(sub.starts_at), 'dd MMMM yyyy', { locale: arSA }) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">تاريخ الانتهاء</p>
                  <p className="text-lg font-bold text-foreground">
                    {sub.ends_at ? format(new Date(sub.ends_at), 'dd MMMM yyyy', { locale: arSA }) : "-"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}