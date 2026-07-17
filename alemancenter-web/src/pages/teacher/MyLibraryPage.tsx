import { useTeacherLibrary } from "@/hooks/use-teacher";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderHeart, FileText, ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export function MyLibraryPage() {
  const { data: items, isLoading } = useTeacherLibrary();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <FolderHeart className="w-8 h-8 text-primary" />
          محفوظاتي
        </h1>
        <p className="text-muted-foreground">العناصر والملفات التي قمت بحفظها للوصول السريع.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : items?.length === 0 ? (
        <div className="text-center py-24 bg-card border border-dashed border-border rounded-3xl">
          <FolderHeart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">المكتبة فارغة</h3>
          <p className="text-muted-foreground">لم تقم بحفظ أي ملفات أو عناصر بعد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items?.map((item) => (
            <Card key={item.id} className="p-5 flex items-center gap-4 border-border shadow-sm hover:border-primary/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-lg mb-1 truncate">{item.title}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="capitalize">{item.category || item.item_type}</span>
                  <span>•</span>
                  <span>{format(new Date(item.created_at), 'dd MMM yyyy', { locale: arSA })}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                <ExternalLink className="w-5 h-5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}