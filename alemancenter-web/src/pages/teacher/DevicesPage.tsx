import { useTeacherDevices, useDeactivateDevice } from "@/hooks/use-teacher";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MonitorSmartphone, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DevicesPage() {
  const { data: devices, isLoading } = useTeacherDevices();
  const deactivateDevice = useDeactivateDevice();

  const handleDeactivate = (id: number) => {
    if (window.confirm("هل أنت متأكد من إلغاء تفعيل هذا الجهاز؟")) {
      deactivateDevice.mutate(id, {
        onSuccess: () => toast.success("تم إلغاء تفعيل الجهاز بنجاح"),
        onError: () => toast.error("حدث خطأ أثناء إلغاء التفعيل")
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <MonitorSmartphone className="w-8 h-8 text-primary" />
          إدارة الأجهزة
        </h1>
        <p className="text-muted-foreground">الأجهزة المرتبطة باشتراكك الحالي. يمكنك إلغاء تفعيل الأجهزة القديمة لإضافة أجهزة جديدة.</p>
      </div>

      <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-500">
        <AlertCircle className="w-5 h-5" />
        <AlertTitle>ملاحظة هامة</AlertTitle>
        <AlertDescription>
          يتم ربط الجهاز تلقائياً عند تسجيل الدخول واستخدام النظام. عدد الأجهزة المسموح بها يعتمد على باقة الاشتراك الخاصة بك.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : !devices || devices.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
          <MonitorSmartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground">لا يوجد أجهزة</h3>
          <p className="text-muted-foreground">لم يتم تسجيل أي أجهزة على حسابك بعد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {devices.map((device) => (
            <Card key={device.id} className={`p-6 border-border shadow-sm flex flex-col justify-between ${!device.is_active ? 'opacity-60' : ''}`}>
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${device.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <MonitorSmartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{device.label || "جهاز غير مسمى"}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${device.is_active ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                        {device.is_active ? "نشط" : "غير نشط"}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground mb-6">
                  <p>تاريخ التسجيل: {format(new Date(device.created_at), 'dd MMM yyyy', { locale: arSA })}</p>
                  <p>آخر ظهور: {device.last_seen_at ? format(new Date(device.last_seen_at), 'dd MMM yyyy HH:mm', { locale: arSA }) : "غير متاح"}</p>
                </div>
              </div>
              
              {device.is_active && (
                <Button 
                  variant="outline" 
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => handleDeactivate(device.id)}
                  disabled={deactivateDevice.isPending}
                >
                  <XCircle className="w-4 h-4 me-2" />
                  إلغاء تفعيل الجهاز
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}