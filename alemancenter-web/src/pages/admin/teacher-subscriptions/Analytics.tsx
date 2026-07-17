import { useQuery } from "@tanstack/react-query";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Cpu, Download, FileText, FolderTree, Loader2, Smartphone, Users } from "lucide-react";

interface MetricItem {
  label: string;
  value: number;
  extra?: string;
}

// Backend AdminUsageAnalytics is FLAT (no `summary`, no `daily_usage`). The old
// page read `report.summary.*` (→ 0) and charted `report.daily_usage` (empty),
// while ignoring the four rich top-lists the endpoint actually returns.
interface UsageAnalytics {
  total_downloads: number;
  total_ai_generations: number;
  total_premium_files: number;
  total_teachers: number;
  active_devices: number;
  top_subjects: MetricItem[] | null;
  top_categories: MetricItem[] | null;
  top_downloaded_files: MetricItem[] | null;
  most_active_teachers: MetricItem[] | null;
}

function TopList({ title, icon: Icon, items }: { title: string; icon: typeof BookOpen; items: MetricItem[] | null }) {
  const list = items ?? [];
  const max = Math.max(1, ...list.map((i) => i.value));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
        ) : (
          list.slice(0, 6).map((item, index) => (
            <div key={`${item.label}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{item.label}</span>
                <span className="whitespace-nowrap font-medium">
                  {item.value.toLocaleString("ar-EG")}
                  {item.extra && <span className="ms-1 text-xs text-muted-foreground">{item.extra}</span>}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ts", "report", "analytics"],
    queryFn: () => teacherSubscriptionAdminApi.usageAnalytics() as unknown as Promise<UsageAnalytics>,
  });

  const r = data;

  const tiles = [
    { label: "إجمالي التنزيلات", value: r?.total_downloads, icon: Download, tint: "text-blue-600" },
    { label: "توليد AI", value: r?.total_ai_generations, icon: Cpu, tint: "text-violet-600" },
    { label: "ملفات مميزة", value: r?.total_premium_files, icon: FileText, tint: "text-emerald-600" },
    { label: "المعلمون", value: r?.total_teachers, icon: Users, tint: "text-amber-600" },
    { label: "أجهزة نشطة", value: r?.active_devices, icon: Smartphone, tint: "text-cyan-600" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إحصائيات الاستخدام</h1>
        <p className="mt-1 text-muted-foreground">تحليل نشاط المعلمين واستخدام الأدوات</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {tiles.map((tile) => (
              <Card key={tile.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{tile.label}</CardTitle>
                  <tile.icon className={`h-4 w-4 ${tile.tint}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black">{Number(tile.value ?? 0).toLocaleString("ar-EG")}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <TopList title="أكثر المعلمين نشاطًا" icon={Users} items={r?.most_active_teachers ?? null} />
            <TopList title="أكثر الملفات تنزيلًا" icon={FileText} items={r?.top_downloaded_files ?? null} />
            <TopList title="أعلى المواد" icon={BookOpen} items={r?.top_subjects ?? null} />
            <TopList title="أعلى التصنيفات" icon={FolderTree} items={r?.top_categories ?? null} />
          </div>
        </>
      )}
    </div>
  );
}
