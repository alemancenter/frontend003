import { useTeacherNotifications } from "@/hooks/use-teacher";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Info } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export function NotificationsPage() {
  const { data: notifications, isLoading } = useTeacherNotifications();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary" />
          الإشعارات
        </h1>
        <p className="text-muted-foreground">تنبيهات ورسائل النظام المتعلقة باشتراكك.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground">لا يوجد إشعارات</h3>
          <p className="text-muted-foreground">لم تتلقَ أي إشعارات حتى الآن.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif: any, idx: number) => (
            <Card key={notif.id || idx} className={`p-5 flex gap-4 transition-colors ${!notif.read_at ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                <Info className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg text-foreground mb-1">{notif.title || "تنبيه من النظام"}</h4>
                <p className="text-muted-foreground mb-3 leading-relaxed">{notif.body}</p>
                <div className="text-xs text-muted-foreground/70">
                  {notif.created_at ? format(new Date(notif.created_at), 'dd MMM yyyy - HH:mm', { locale: arSA }) : ''}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}