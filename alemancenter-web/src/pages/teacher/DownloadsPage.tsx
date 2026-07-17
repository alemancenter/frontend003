import { useTeacherDownloads } from "@/hooks/use-teacher";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export function DownloadsPage() {
  const { data: downloads, isLoading } = useTeacherDownloads();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Download className="w-8 h-8 text-primary" />
          سجل التحميلات
        </h1>
        <p className="text-muted-foreground">قائمة بالملفات التي قمت بتحميلها عبر اشتراكك.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !downloads || downloads.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
          <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground">لا يوجد تحميلات</h3>
          <p className="text-muted-foreground">لم تقم بتحميل أي ملفات مميزة حتى الآن</p>
        </div>
      ) : (
        <Card className="border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {downloads.map((item: any, idx: number) => (
              <div key={idx} className="p-4 sm:p-6 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground truncate text-lg">{item.file_title || item.original_filename || "ملف مميز"}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {item.downloaded_at ? format(new Date(item.downloaded_at), 'dd MMM yyyy HH:mm', { locale: arSA }) : "غير معروف"}
                    </span>
                    {item.ip_address && (
                      <span className="hidden sm:inline-block">IP: {item.ip_address}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}