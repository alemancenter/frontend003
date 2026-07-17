import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminContentAuditApi,
  type AdsenseItem,
  type AuditRun,
  type QualityBatch,
  type ReviewQueueItem,
} from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  BarChart3,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  ExternalLink,
  ListChecks,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  StopCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { COUNTRY_META, VALID_COUNTRIES, type CountryCode } from "@/lib/country";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";

type ContentAuditTab = "overview" | "review" | "quality" | "costs";

interface ContentAuditProps {
  initialTab?: ContentAuditTab;
  title?: string;
  description?: string;
}

const ALL = "all";
const ADSENSE_PER_PAGE = 15;

const LEVEL_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ready: { label: "جاهز", variant: "default" },
  review: { label: "مراجعة", variant: "secondary" },
  weak: { label: "ضعيف", variant: "destructive" },
  no_index: { label: "بدون فهرسة", variant: "outline" },
};

const BATCH_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "مكتمل", variant: "default" },
  running: { label: "جاري", variant: "secondary" },
  queued: { label: "بالانتظار", variant: "outline" },
  failed: { label: "فشل", variant: "destructive" },
  cancelled: { label: "ملغى", variant: "outline" },
};

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ContentAudit({
  initialTab = "overview",
  title = "تدقيق المحتوى والسياسات",
  description = "إدارة جودة المحتوى، تكاليف الذكاء الاصطناعي، والمراجعة البشرية",
}: ContentAuditProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const country = useCountry();
  const switchCountry = useCountrySwitcher();

  const [activeTab, setActiveTab] = useState<ContentAuditTab>(initialTab);
  const [adsensePage, setAdsensePage] = useState(1);
  const [levelFilter, setLevelFilter] = useState(ALL);

  useEffect(() => setActiveTab(initialTab), [initialTab]);
  useEffect(() => setAdsensePage(1), [levelFilter, country]);

  // Scoped invalidation — never nuke the whole app's cache.
  const invalidateAudit = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "content-audit"] });

  const { data: adsense, isLoading: isLoadingAdsense } = useQuery({
    queryKey: ["admin", "content-audit", "adsense", country, adsensePage, levelFilter],
    queryFn: () =>
      adminContentAuditApi.adsenseReadiness({
        country,
        page: adsensePage,
        per_page: ADSENSE_PER_PAGE,
        level: levelFilter === ALL ? undefined : levelFilter,
      }),
  });

  const { data: runs = [], isLoading: isLoadingRuns } = useQuery({
    queryKey: ["admin", "content-audit", "runs", country],
    queryFn: () => adminContentAuditApi.listRuns({ country }),
  });

  const { data: costSummary, isLoading: isLoadingCosts } = useQuery({
    queryKey: ["admin", "content-audit", "ai-costs", country],
    queryFn: () => adminContentAuditApi.modelCostSummary({ country }),
    enabled: activeTab === "costs",
  });

  const { data: reviewQueue = [], isLoading: isLoadingReview } = useQuery({
    queryKey: ["admin", "content-audit", "review-queue", country],
    queryFn: () => adminContentAuditApi.reviewQueue({ country }),
    enabled: activeTab === "review",
  });

  const { data: qualityBatches = [], isLoading: isLoadingQuality } = useQuery({
    queryKey: ["admin", "content-audit", "quality-batches", country],
    queryFn: () => adminContentAuditApi.listQualityBatches({ country }),
    enabled: activeTab === "quality",
    // Auto-refresh while a batch is still running.
    refetchInterval: (query) =>
      (query.state.data as QualityBatch[] | undefined)?.some((b) => b.status === "running" || b.status === "queued")
        ? 5000
        : false,
  });

  const summary = adsense?.summary;
  const readinessPct = summary && summary.total > 0 ? Math.round((summary.ads_eligible / summary.total) * 100) : 0;
  const adsenseMeta = adsense?.meta;

  const runStartMutation = useMutation({
    mutationFn: () => adminContentAuditApi.runStart({ country }),
    onSuccess: () => {
      invalidateAudit();
      toast({ title: "تم بدء الفحص", description: "بدأ فحص المحتوى في الخلفية" });
    },
    onError: (error: Error) =>
      toast({ title: "فشل بدء الفحص", description: error.message, variant: "destructive" }),
  });

  const startQualityBatchMutation = useMutation({
    mutationFn: () =>
      adminContentAuditApi.startQualityBatch(
        {
          content_type: "all",
          level: "weak",
          mode: "fix_preview",
          model_strategy: "balanced",
          source: "adsense_readiness",
          preset: "weak_first",
          limit: 20,
          concurrency: 2,
        },
        { country },
      ),
    onSuccess: () => {
      invalidateAudit();
      toast({ title: "تم بدء دفعة الجودة", description: "ستُحدَّث حالتها تلقائيًا." });
      setActiveTab("quality");
    },
    onError: (error: Error) =>
      toast({ title: "فشل بدء دفعة الجودة", description: error.message, variant: "destructive" }),
  });

  const cancelBatchMutation = useMutation({
    mutationFn: (id: string) => adminContentAuditApi.cancelQualityBatch(id, { country }),
    onSuccess: () => {
      toast({ title: "تم طلب إلغاء الدفعة" });
      invalidateAudit();
    },
    onError: (error: Error) =>
      toast({ title: "فشل الإلغاء", description: error.message, variant: "destructive" }),
  });

  const applyFixMutation = useMutation({
    mutationFn: (id: number) => adminContentAuditApi.applyFix({ fix_preview_id: id }),
    onSuccess: () => {
      invalidateAudit();
      toast({ title: "تم الاعتماد", description: "تم تطبيق التصحيح على المحتوى" });
    },
    onError: (error: Error) =>
      toast({ title: "فشل الاعتماد", description: error.message, variant: "destructive" }),
  });

  const rejectFixMutation = useMutation({
    mutationFn: (id: number) => adminContentAuditApi.rejectFix({ fix_preview_id: id }),
    onSuccess: () => {
      invalidateAudit();
      toast({ title: "تم الرفض" });
    },
    onError: (error: Error) =>
      toast({ title: "فشل الرفض", description: error.message, variant: "destructive" }),
  });

  const summaryTiles = useMemo(
    () => [
      { label: "جاهز", value: summary?.ready ?? 0, tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
      { label: "بحاجة مراجعة", value: summary?.review ?? 0, tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
      { label: "ضعيف", value: summary?.weak ?? 0, tint: "bg-destructive/10 text-destructive" },
      { label: "مؤهّل للإعلانات", value: summary?.ads_eligible ?? 0, tint: "bg-primary/10 text-primary" },
    ],
    [summary],
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" title="تحديث" onClick={invalidateAudit}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => runStartMutation.mutate()} disabled={runStartMutation.isPending}>
            {runStartMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Play className="ml-2 h-4 w-4" />}
            بدء فحص جديد
          </Button>
          <Select value={country} onValueChange={(value) => switchCountry(value as CountryCode)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="قاعدة البيانات" />
            </SelectTrigger>
            <SelectContent>
              {VALID_COUNTRIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {COUNTRY_META[code].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentAuditTab)} className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2">
            <ListChecks className="h-4 w-4" />
            المراجعة
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            الجودة
          </TabsTrigger>
          <TabsTrigger value="costs" className="gap-2">
            <DollarSign className="h-4 w-4" />
            التكاليف
          </TabsTrigger>
        </TabsList>

        {/* ── Overview / AdSense ── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  جاهزية AdSense
                </CardTitle>
                <CardDescription>نسبة المحتوى المؤهّل لعرض الإعلانات</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <div className={`text-5xl font-black ${readinessPct >= 80 ? "text-emerald-500" : readinessPct >= 50 ? "text-amber-500" : "text-destructive"}`}>
                  {readinessPct}%
                </div>
                <Progress value={readinessPct} className="w-full" />
                <p className="text-center text-sm text-muted-foreground">
                  {summary ? `${summary.ads_eligible.toLocaleString("ar-EG")} من ${summary.total.toLocaleString("ar-EG")} عنصر` : "—"}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {summaryTiles.map((tile) => (
                <Card key={tile.label}>
                  <CardContent className="p-4">
                    <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${tile.tint}`}>
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <p className="text-2xl font-black leading-none">{tile.value.toLocaleString("ar-EG")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{tile.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* AdSense items table */}
          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>تقييم المحتوى</CardTitle>
                  <CardDescription>درجة جاهزية كل عنصر لسياسات AdSense</CardDescription>
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>كل المستويات</SelectItem>
                    <SelectItem value="ready">جاهز</SelectItem>
                    <SelectItem value="review">بحاجة مراجعة</SelectItem>
                    <SelectItem value="weak">ضعيف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العنوان</TableHead>
                      <TableHead className="w-[80px]">النوع</TableHead>
                      <TableHead className="w-[80px]">الدرجة</TableHead>
                      <TableHead className="w-[110px]">المستوى</TableHead>
                      <TableHead>الملاحظات</TableHead>
                      <TableHead className="w-[70px] text-left">فتح</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAdsense ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : (adsense?.items ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">لا توجد عناصر</TableCell>
                      </TableRow>
                    ) : (
                      (adsense?.items ?? []).map((item: AdsenseItem) => {
                        const level = LEVEL_META[item.level] ?? { label: item.level, variant: "outline" as const };
                        return (
                          <TableRow key={`${item.type}-${item.id}`}>
                            <TableCell className="max-w-[280px]">
                              <p className="truncate font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.word_count ?? 0} كلمة · {item.files_count ?? 0} ملف
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.type === "post" ? "منشور" : "مقالة"}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`font-bold ${item.score >= 80 ? "text-emerald-600" : item.score >= 50 ? "text-amber-600" : "text-destructive"}`}>
                                {item.score}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={level.variant}>{level.label}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[260px]">
                              <p className="truncate text-xs text-muted-foreground">
                                {item.issues && item.issues.length > 0 ? item.issues.join("، ") : "—"}
                              </p>
                            </TableCell>
                            <TableCell className="text-left">
                              {item.url && (
                                <Button variant="ghost" size="icon" title="فتح الصفحة" asChild>
                                  <a href={item.url} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {adsenseMeta && adsenseMeta.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    صفحة {adsensePage} من {adsenseMeta.last_page} · {adsenseMeta.total.toLocaleString("ar-EG")} عنصر
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAdsensePage((p) => Math.max(1, p - 1))} disabled={adsensePage === 1}>
                      <ChevronRight className="h-4 w-4" />
                      السابق
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAdsensePage((p) => Math.min(adsenseMeta.last_page, p + 1))} disabled={adsensePage >= adsenseMeta.last_page}>
                      التالي
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Runs history */}
          <Card>
            <CardHeader>
              <CardTitle>سجل عمليات الفحص</CardTitle>
              <CardDescription>العمليات السابقة لتدقيق المحتوى</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">المعرف</TableHead>
                      <TableHead className="w-[110px]">الحالة</TableHead>
                      <TableHead className="w-[110px]">النتائج</TableHead>
                      <TableHead>بدأها</TableHead>
                      <TableHead className="w-[170px]">التاريخ</TableHead>
                      <TableHead className="w-[70px] text-left">تصدير</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingRuns ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : runs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">لم يُجرَ أي فحص بعد</TableCell>
                      </TableRow>
                    ) : (
                      runs.map((run: AuditRun) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">#{run.id}</TableCell>
                          <TableCell>
                            <Badge variant={run.status === "completed" ? "default" : run.status === "failed" ? "destructive" : "secondary"}>
                              {run.status === "completed" ? "مكتمل" : run.status === "failed" ? "فشل" : "قيد التنفيذ"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{run.findings_count ?? 0}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{run.triggered_by || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDateTime(run.created_at)}</TableCell>
                          <TableCell className="text-left">
                            <Button variant="ghost" size="icon" title="تصدير CSV" asChild>
                              <a href={adminContentAuditApi.exportRunCsvUrl(run.id, { country })} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Review ── */}
        <TabsContent value="review" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>قائمة المراجعة البشرية</CardTitle>
              <CardDescription>اعتماد أو رفض تصحيحات الذكاء الاصطناعي المقترحة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العنوان المقترح</TableHead>
                      <TableHead className="w-[80px]">النوع</TableHead>
                      <TableHead className="w-[80px]">الدرجة</TableHead>
                      <TableHead className="w-[100px]">مخاطرة</TableHead>
                      <TableHead>الموديل</TableHead>
                      <TableHead className="w-[120px] text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingReview ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : reviewQueue.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">لا توجد طلبات مراجعة حاليًا</TableCell>
                      </TableRow>
                    ) : (
                      reviewQueue.map((item: ReviewQueueItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="max-w-[280px]">
                            <p className="truncate font-medium">{item.fixed_title || item.original_title}</p>
                            {item.fix_summary && (
                              <p className="truncate text-xs text-muted-foreground">{item.fix_summary}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.content_type === "post" ? "منشور" : "مقالة"}</Badge>
                          </TableCell>
                          <TableCell className="font-bold">{item.score ?? "—"}</TableCell>
                          <TableCell>
                            {item.adsense_risk ? (
                              <Badge variant={item.adsense_risk === "high" ? "destructive" : item.adsense_risk === "medium" ? "secondary" : "outline"}>
                                {item.adsense_risk}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.model || "—"}</TableCell>
                          <TableCell className="text-left">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-emerald-600 hover:bg-emerald-600/10"
                                title="اعتماد"
                                onClick={() => applyFixMutation.mutate(item.id)}
                                disabled={applyFixMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                title="رفض"
                                onClick={() => rejectFixMutation.mutate(item.id)}
                                disabled={rejectFixMutation.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Quality ── */}
        <TabsContent value="quality" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>دفعات تحسين الجودة</CardTitle>
                  <CardDescription>عمليات التحسين الجماعي بالذكاء الاصطناعي</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startQualityBatchMutation.mutate()}
                  disabled={startQualityBatchMutation.isPending}
                >
                  {startQualityBatchMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Play className="ml-2 h-4 w-4" />}
                  بدء دفعة جديدة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الهدف</TableHead>
                      <TableHead className="w-[200px]">التقدم</TableHead>
                      <TableHead className="w-[130px]">النتائج</TableHead>
                      <TableHead className="w-[100px]">الحالة</TableHead>
                      <TableHead className="w-[70px] text-left">إلغاء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQuality ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : qualityBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">لا توجد دفعات مسجلة</TableCell>
                      </TableRow>
                    ) : (
                      qualityBatches.map((batch: QualityBatch) => {
                        const status = BATCH_STATUS[batch.status] ?? { label: batch.status, variant: "outline" as const };
                        const isRunning = batch.status === "running" || batch.status === "queued";
                        return (
                          <TableRow key={batch.id}>
                            <TableCell className="text-sm">
                              <span className="font-medium">{batch.content_type === "post" ? "منشورات" : batch.content_type === "article" ? "مقالات" : batch.content_type || "الكل"}</span>
                              <span className="text-muted-foreground"> · {batch.level || "—"}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={batch.progress ?? 0} className="h-2 flex-1" />
                                <span className="w-10 text-xs text-muted-foreground">{batch.progress ?? 0}%</span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {batch.processed_items ?? 0} / {batch.total_items ?? 0}
                              </p>
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="text-emerald-600">✓ {batch.successful_items ?? 0}</span>
                              {(batch.failed_items ?? 0) > 0 && (
                                <span className="ms-2 text-destructive">✗ {batch.failed_items}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell className="text-left">
                              {isRunning && !batch.cancel_requested && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:bg-destructive/10"
                                  title="إلغاء الدفعة"
                                  onClick={() => cancelBatchMutation.mutate(batch.id)}
                                  disabled={cancelBatchMutation.isPending}
                                >
                                  <StopCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Costs ── */}
        <TabsContent value="costs" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "إجمالي التكلفة", value: `$${Number(costSummary?.summary?.estimated_cost_usd ?? 0).toFixed(4)}` },
              { label: "عدد الطلبات", value: (costSummary?.summary?.total_runs ?? 0).toLocaleString("ar-EG") },
              { label: "Input Tokens", value: (costSummary?.summary?.input_tokens ?? 0).toLocaleString("ar-EG") },
              { label: "Output Tokens", value: (costSummary?.summary?.output_tokens ?? 0).toLocaleString("ar-EG") },
            ].map((tile) => (
              <Card key={tile.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{tile.label}</CardDescription>
                  <CardTitle className="text-2xl">{tile.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                استهلاك الموديلات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingCosts ? (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !costSummary?.models || costSummary.models.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات استهلاك بعد</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {costSummary.models.map((model, index) => (
                    <div key={`${model.model}-${index}`} className="space-y-2 rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="max-w-[150px] truncate text-sm font-bold">{model.model}</span>
                        <Badge variant="outline">{model.runs} طلب</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[model.task_type, model.model_strategy].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-lg font-bold text-primary">${Number(model.estimated_cost_usd).toFixed(4)}</span>
                        {(model.failed_runs ?? 0) > 0 && <Badge variant="destructive">فشل: {model.failed_runs}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
