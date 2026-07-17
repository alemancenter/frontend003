import { useMemo, useState } from "react";
import { Bookmark, Download, FileText, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import { UpsellState } from "@/components/teacher/UpsellState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePremiumFiles, useSaveLibraryItem, useTeacherAccess } from "@/hooks/use-teacher";
import { teacherSubscriptionApi } from "@/lib/api/teacherSubscription";
import type { TeacherPremiumFile } from "@/lib/api/types";

const categoryOptions = [
  { value: "all", label: "جميع التصنيفات" },
  { value: "worksheet", label: "أوراق عمل" },
  { value: "exam", label: "امتحانات" },
  { value: "summary", label: "ملخصات" },
  { value: "presentation", label: "عروض تقديمية" },
  { value: "plan", label: "خطط وتحضير" },
  { value: "other", label: "أخرى" },
];

type FileGroup = {
  key: string;
  gradeName: string;
  subjectName: string;
  files: TeacherPremiumFile[];
};

function categoryLabel(value?: string) {
  return categoryOptions.find((item) => item.value === value)?.label || value || "ملف";
}

function groupedPremiumFiles(items: TeacherPremiumFile[] = []): FileGroup[] {
  const sorted = [...items].sort((a, b) => {
    const gradeCompare = (a.grade_name || "").localeCompare(b.grade_name || "", "ar");
    if (gradeCompare !== 0) return gradeCompare;
    const subjectCompare = (a.subject_name || "").localeCompare(b.subject_name || "", "ar");
    if (subjectCompare !== 0) return subjectCompare;
    return (a.title || a.original_filename || "").localeCompare(b.title || b.original_filename || "", "ar");
  });

  const groups = new Map<string, FileGroup>();
  sorted.forEach((file) => {
    const gradeName = file.grade_name || "بدون صف محدد";
    const subjectName = file.subject_name || "بدون مادة محددة";
    const key = `${gradeName}::${subjectName}`;
    const group = groups.get(key) || { key, gradeName, subjectName, files: [] };
    group.files.push(file);
    groups.set(key, group);
  });
  return Array.from(groups.values());
}

function PremiumFileCard({
  file,
  onDownload,
  onSave,
}: {
  file: TeacherPremiumFile;
  onDownload: (id: number) => void;
  onSave: (file: TeacherPremiumFile) => void;
}) {
  return (
    <Card className="group overflow-hidden border-border shadow-sm transition-colors hover:border-primary/30 hover:shadow-md">
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100"
            onClick={() => onSave(file)}
            title="حفظ في مكتبتي"
          >
            <Bookmark className="h-5 w-5" />
          </Button>
        </div>

        <h3 className="mb-2 line-clamp-2 text-lg font-bold text-foreground" title={file.title || file.original_filename}>
          {file.title || file.original_filename}
        </h3>

        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>{categoryLabel(file.category)}</span>
          </div>
          {file.semester_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary/60" />
              <span>{file.semester_name}</span>
            </div>
          )}
        </div>

        <Button
          onClick={() => onDownload(file.id)}
          className="w-full border border-border bg-background text-foreground shadow-none transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Download className="me-2 h-4 w-4" />
          تحميل الملف
        </Button>
      </div>
    </Card>
  );
}

export function LibraryPage() {
  const { data: accessData, isLoading: isAccessLoading } = useTeacherAccess();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const { data: files = [], isLoading: isFilesLoading } = usePremiumFiles({
    query: search,
    category: category !== "all" ? category : undefined,
  });
  const fileGroups = useMemo(() => groupedPremiumFiles(files), [files]);

  const saveLibraryItem = useSaveLibraryItem();

  if (isAccessLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!accessData?.has_access) {
    return (
      <UpsellState
        title="المكتبة المميزة"
        description="اشترك الآن للوصول إلى الملفات الحصرية المرتبطة بالصفوف والمواد التي تدرسها."
      />
    );
  }

  const handleDownload = (id: number) => {
    window.open(teacherSubscriptionApi.downloadPremiumFile(id), "_blank");
  };

  const handleSave = (file: TeacherPremiumFile) => {
    saveLibraryItem.mutate(
      {
        item_type: "file",
        item_id: file.id,
        title: file.title || file.original_filename,
        source_type: "premium_files",
        category: file.category,
      },
      {
        onSuccess: () => {
          toast.success("تم الحفظ في مكتبتك بنجاح");
        },
        onError: () => {
          toast.error("حدث خطأ أثناء الحفظ");
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">المكتبة المميزة</h1>
        <p className="text-muted-foreground">تصفح الملفات المتاحة لاشتراكك حسب الصف والمادة.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="ابحث عن ملف، ورقة عمل، امتحان..."
            className="h-12 rounded-xl border-border bg-background ps-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full shrink-0 md:w-64">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-12 rounded-xl">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="التصنيف" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isFilesLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Skeleton key={item} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : fileGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-bold text-foreground">لا توجد ملفات</h3>
          <p className="text-muted-foreground">لم يتم العثور على ملفات تطابق بحثك أو مواد اشتراكك.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {fileGroups.map((group) => (
            <section key={group.key} className="space-y-4">
              <div className="flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{group.gradeName}</h2>
                  <p className="text-sm text-muted-foreground">{group.subjectName}</p>
                </div>
                <span className="text-sm text-muted-foreground">{group.files.length} ملف</span>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {group.files.map((file) => (
                  <PremiumFileCard key={file.id} file={file} onDownload={handleDownload} onSave={handleSave} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
