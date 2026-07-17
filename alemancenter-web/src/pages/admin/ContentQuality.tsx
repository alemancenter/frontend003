import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  Gauge,
  Layers3,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  StopCircle,
  XCircle,
} from "lucide-react";
import {
  adminContentAuditApi,
  type AdsenseSummary,
  type QualityBatch,
} from "@/lib/api/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { COUNTRY_META, VALID_COUNTRIES, type CountryCode } from "@/lib/country";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";

type ContentType = "all" | "article" | "post";
type QualityLevel = "all" | "weak" | "review" | "no_index" | "ready";
type BatchMode = "analyze_only" | "fix_preview" | "full_review";
type ModelStrategy = "economy" | "balanced" | "quality" | "final_review";
type SmartPreset = "weak_first" | "indexed_weak" | "short_file_pages" | "custom_filter";

interface BatchFormState {
  content_type: ContentType;
  level: QualityLevel;
  mode: BatchMode;
  model_strategy: ModelStrategy;
  preset: SmartPreset;
  limit: number;
  concurrency: number;
  q: string;
}

interface QualityBatchItem {
  content_type: "article" | "post" | string;
  content_id: number | string;
  title?: string;
  status?: string;
  score_before?: number;
  score_after?: number;
  decision_id?: number;
  fix_preview_id?: number;
  message?: string;
  error?: string;
}

interface QualityBatchDetail extends QualityBatch {
  items?: QualityBatchItem[];
}

interface FixPreview {
  id: number;
  status: string;
  content_type?: string;
  content_id?: number | string;
  original_title?: string;
  fixed_title?: string;
  original_content?: string;
  fixed_content?: string;
  fix_summary?: string;
}

const contentTypeOptions: { value: ContentType; label: string }[] = [
  { value: "all", label: "كل المحتوى" },
  { value: "article", label: "المقالات" },
  { value: "post", label: "المنشورات" },
];

const levelOptions: { value: QualityLevel; label: string }[] = [
  { value: "weak", label: "ضعيف أولًا" },
  { value: "review", label: "بحاجة مراجعة" },
  { value: "no_index", label: "بدون فهرسة" },
  { value: "ready", label: "جاهز" },
  { value: "all", label: "كل المستويات" },
];

const modeOptions: { value: BatchMode; label: string; description: string }[] = [
  { value: "analyze_only", label: "تحليل فقط", description: "تقييم بدون إنشاء تعديل" },
  { value: "fix_preview", label: "معاينة تحسين", description: "اقتراح تعديل بانتظار الاعتماد" },
  { value: "full_review", label: "مراجعة كاملة", description: "تحليل وتحسين ومراجعة بشرية" },
];

const strategyOptions: { value: ModelStrategy; label: string; description: string }[] = [
  { value: "economy", label: "اقتصادي", description: "أقل تكلفة للفرز الأولي" },
  { value: "balanced", label: "متوازن", description: "أفضل خيار للتشغيل اليومي" },
  { value: "quality", label: "جودة عالية", description: "للصفحات المهمة أو الضعيفة" },
  { value: "final_review", label: "مراجعة نهائية", description: "أعلى دقة قبل الاعتماد" },
];

const presetOptions: { value: SmartPreset; label: string; description: string; icon: typeof AlertTriangle }[] = [
  { value: "weak_first", label: "الأضعف أولًا", description: "يعالج الصفحات الأقل درجة والأكثر تأثيرًا على القبول.", icon: AlertTriangle },
  { value: "indexed_weak", label: "مفهرس وضعيف", description: "يركز على الصفحات المفهرسة التي تظهر للزوار وتحتاج تحسينًا.", icon: Gauge },
  { value: "short_file_pages", label: "صفحات قصيرة", description: "مناسب للصفحات ذات النص التعليمي القليل حول الملفات.", icon: FileText },
  { value: "custom_filter", label: "فلتر مخصص", description: "يعتمد على النطاق والأولوية وكلمات البحث التي تختارها.", icon: Layers3 },
];

const batchStatusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  completed: { label: "مكتمل", variant: "default", className: "bg-emerald-600 text-white" },
  running: { label: "جاري", variant: "secondary", className: "border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  queued: { label: "بالانتظار", variant: "outline", className: "border-amber-300 text-amber-700 dark:text-amber-300" },
  cancelling: { label: "قيد الإلغاء", variant: "outline", className: "border-orange-300 text-orange-700 dark:text-orange-300" },
  failed: { label: "فشل", variant: "destructive" },
  cancelled: { label: "ملغى", variant: "outline" },
};

function formatNumber(value?: number) {
  return Number(value ?? 0).toLocaleString("ar-EG");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stripHtml(value?: string) {
  if (!value) return "";
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function contentEditPath(item: QualityBatchItem) {
  return item.content_type === "post"
    ? `/admin/posts/${item.content_id}/edit`
    : `/admin/articles/${item.content_id}/edit`;
}

function defaultSummary(): AdsenseSummary {
  return { total: 0, ready: 0, review: 0, weak: 0, no_index: 0, ads_eligible: 0 };
}

export default function ContentQuality() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const country = useCountry();
  const switchCountry = useCountrySwitcher();

  const [form, setForm] = useState<BatchFormState>({
    content_type: "all",
    level: "weak",
    mode: "fix_preview",
    model_strategy: "balanced",
    preset: "weak_first",
    limit: 20,
    concurrency: 2,
    q: "",
  });
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [preview, setPreview] = useState<FixPreview | null>(null);

  const batchQueryKey = ["admin", "content-quality", "batches", country];
  const summaryQueryKey = ["admin", "content-quality", "summary", country, form.content_type];

  const { data: readiness, isLoading: isLoadingReadiness, refetch: refetchReadiness } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: () =>
      adminContentAuditApi.adsenseReadiness({
        country,
        page: 1,
        per_page: 1,
        type: form.content_type === "all" ? undefined : form.content_type,
      }),
  });

  const { data: batches = [], isLoading: isLoadingBatches, refetch: refetchBatches } = useQuery({
    queryKey: batchQueryKey,
    queryFn: () => adminContentAuditApi.listQualityBatches({ country }),
    refetchInterval: (query) =>
      (query.state.data as QualityBatch[] | undefined)?.some((batch) =>
        ["queued", "running", "cancelling"].includes(batch.status),
      )
        ? 5000
        : false,
  });

  const activeBatch = useMemo(
    () =>
      batches.find((batch) => String(batch.id) === selectedBatchId) ||
      batches.find((batch) => ["queued", "running", "cancelling"].includes(batch.status)) ||
      batches[0] ||
      null,
    [batches, selectedBatchId],
  );

  const { data: batchDetail, isFetching: isFetchingDetail, refetch: refetchDetail } = useQuery({
    queryKey: ["admin", "content-quality", "batch-detail", country, activeBatch?.id],
    queryFn: async () => {
      if (!activeBatch?.id) return null;
      const data = await adminContentAuditApi.showQualityBatch(activeBatch.id, { country });
      return data as unknown as QualityBatchDetail;
    },
    enabled: Boolean(activeBatch?.id),
  });

  const summary = readiness?.summary ?? defaultSummary();
  const readinessPct = summary.total > 0 ? Math.round((summary.ads_eligible / summary.total) * 100) : 0;
  const selectedPreset = presetOptions.find((option) => option.value === form.preset) ?? presetOptions[0];
  const SelectedPresetIcon = selectedPreset.icon;
  const detailItems = batchDetail?.items ?? [];

  const invalidateQuality = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "content-quality"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "content-audit"] });
  };

  const startBatchMutation = useMutation({
    mutationFn: () =>
      adminContentAuditApi.startQualityBatch(
        {
          content_type: form.content_type,
          level: form.level === "all" ? undefined : form.level,
          mode: form.mode,
          model_strategy: form.model_strategy,
          source: form.preset === "custom_filter" ? "manual_filter" : "adsense_readiness",
          preset: form.preset,
          limit: Math.max(1, Math.min(500, Number(form.limit) || 20)),
          concurrency: Math.max(1, Math.min(6, Number(form.concurrency) || 2)),
          q: form.q.trim() || undefined,
        },
        { country },
      ),
    onSuccess: (data) => {
      const created = data as Partial<QualityBatch>;
      setSelectedBatchId(created.id ? String(created.id) : null);
      invalidateQuality();
      toast({
        title: "بدأت دفعة تحسين الجودة",
        description: "سيتم إنشاء مقترحات قابلة للمراجعة دون نشر تلقائي.",
      });
    },
    onError: (error: Error) =>
      toast({ title: "فشل بدء الدفعة", description: error.message, variant: "destructive" }),
  });

  const cancelBatchMutation = useMutation({
    mutationFn: (id: string) => adminContentAuditApi.cancelQualityBatch(id, { country }),
    onSuccess: () => {
      invalidateQuality();
      toast({ title: "تم إرسال طلب الإلغاء", description: "ستتوقف الدفعة بعد انتهاء العنصر الجاري." });
    },
    onError: (error: Error) =>
      toast({ title: "فشل الإلغاء", description: error.message, variant: "destructive" }),
  });

  const openPreviewMutation = useMutation({
    mutationFn: async (item: QualityBatchItem) => {
      if (item.fix_preview_id) {
        return adminContentAuditApi.showFixPreview(item.fix_preview_id) as Promise<Record<string, unknown>>;
      }
      if (item.decision_id) {
        return adminContentAuditApi.createFixPreview({ decision_id: item.decision_id }) as Promise<Record<string, unknown>>;
      }
      throw new Error("لا توجد معاينة أو قرار لهذا العنصر");
    },
    onSuccess: (data) => setPreview(data as unknown as FixPreview),
    onError: (error: Error) =>
      toast({ title: "فشل فتح المعاينة", description: error.message, variant: "destructive" }),
  });

  const applyPreviewMutation = useMutation({
    mutationFn: (id: number) => adminContentAuditApi.applyFix({ fix_preview_id: id, note: "تم الاعتماد من مركز تحسين جودة المحتوى" }),
    onSuccess: () => {
      setPreview(null);
      invalidateQuality();
      toast({ title: "تم اعتماد التحسين", description: "تم تحديث المحتوى بنجاح." });
    },
    onError: (error: Error) =>
      toast({ title: "فشل الاعتماد", description: error.message, variant: "destructive" }),
  });

  const rejectPreviewMutation = useMutation({
    mutationFn: (id: number) => adminContentAuditApi.rejectFix({ fix_preview_id: id, note: "تم الرفض من مركز تحسين جودة المحتوى" }),
    onSuccess: () => {
      setPreview(null);
      invalidateQuality();
      toast({ title: "تم رفض المعاينة" });
    },
    onError: (error: Error) =>
      toast({ title: "فشل الرفض", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck className="ml-1 h-3.5 w-3.5" />
              مراجعة بشرية قبل النشر
            </Badge>
            <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
              <Layers3 className="ml-1 h-3.5 w-3.5" />
              معالجة جماعية متعددة المراحل
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">مركز تحسين جودة المحتوى</h1>
          <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
            تشغيل دفعات منظمة لتحسين المقالات والمنشورات اعتمادًا على جاهزية AdSense، مع ضبط العدد والتوازي واستراتيجية الموديلات وإنشاء معاينات قابلة للاعتماد فقط.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[auto_auto_180px] sm:items-center">
          <Button className="w-full sm:w-auto" variant="outline" title="تحديث" onClick={() => void Promise.all([refetchReadiness(), refetchBatches(), refetchDetail()])}>
            <RefreshCw className="h-4 w-4" />
            <span className="mr-2 sm:hidden">تحديث</span>
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => startBatchMutation.mutate()} disabled={startBatchMutation.isPending}>
            {startBatchMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Play className="ml-2 h-4 w-4" />}
            بدء المعالجة
          </Button>
          <Select value={country} onValueChange={(value) => switchCountry(value as CountryCode)}>
            <SelectTrigger className="w-full">
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

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-5 w-5 text-sky-600" />
              جاهزية الإعلانات
            </CardTitle>
            <CardDescription>نسبة المحتوى المؤهل حسب النطاق الحالي</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn("text-5xl font-black", readinessPct >= 80 ? "text-emerald-600" : readinessPct >= 50 ? "text-amber-600" : "text-rose-600")}>
              {isLoadingReadiness ? "..." : `${readinessPct}%`}
            </div>
            <Progress value={readinessPct} />
            <p className="text-sm text-muted-foreground">
              {formatNumber(summary.ads_eligible)} مؤهل من {formatNumber(summary.total)} عنصر مفحوص.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "ضعيف", value: summary.weak, icon: AlertTriangle, className: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-300" },
            { label: "بحاجة مراجعة", value: summary.review, icon: FileText, className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300" },
            { label: "جاهز", value: summary.ready, icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300" },
            { label: "بدون فهرسة", value: summary.no_index, icon: ShieldCheck, className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300" },
          ].map((tile) => (
            <Card key={tile.label} className={tile.className}>
              <CardContent className="p-4">
                <tile.icon className="mb-3 h-5 w-5" />
                <p className="text-2xl font-black leading-none">{formatNumber(tile.value)}</p>
                <p className="mt-1 text-sm font-medium">{tile.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              إعداد دفعة تحسين جديدة
            </h2>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              اختر preset ذكيًا ثم اضبط النطاق والعدد. القاعدة العملية: لا نشر تلقائي، والاعتماد النهائي يتم من المعاينة أو قائمة المراجعة.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            الحد المقترح: 20-50 عنصرًا في الدفعة
          </Badge>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          {presetOptions.map((option) => {
            const Icon = option.icon;
            const active = form.preset === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    preset: option.value,
                    level: option.value === "custom_filter" ? current.level : "weak",
                  }))
                }
                className={cn(
                  "min-h-[116px] rounded-lg border p-4 text-right transition hover:border-primary/50 hover:bg-primary/5",
                  active ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                  {active ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                </div>
                <div className="font-bold">{option.label}</div>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
          <SelectedPresetIcon className="ml-2 inline h-4 w-4 text-primary" />
          الوضع الحالي: <span className="font-semibold text-foreground">{selectedPreset.label}</span> - {selectedPreset.description}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-9">
          <div className="space-y-1 xl:col-span-1">
            <label className="text-xs font-medium text-muted-foreground">النطاق</label>
            <Select value={form.content_type} onValueChange={(value) => setForm((current) => ({ ...current, content_type: value as ContentType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{contentTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 xl:col-span-1">
            <label className="text-xs font-medium text-muted-foreground">الأولوية</label>
            <Select value={form.level} onValueChange={(value) => setForm((current) => ({ ...current, level: value as QualityLevel }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{levelOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 xl:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">طريقة المعالجة</label>
            <Select value={form.mode} onValueChange={(value) => setForm((current) => ({ ...current, mode: value as BatchMode }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{modeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label} - {option.description}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1 xl:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">استراتيجية الموديلات</label>
            <Select value={form.model_strategy} onValueChange={(value) => setForm((current) => ({ ...current, model_strategy: value as ModelStrategy }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{strategyOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label} - {option.description}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">العدد</label>
            <Input type="number" min={1} max={500} value={form.limit} onChange={(event) => setForm((current) => ({ ...current, limit: Number(event.target.value) || 20 }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">التوازي</label>
            <Input type="number" min={1} max={6} value={form.concurrency} onChange={(event) => setForm((current) => ({ ...current, concurrency: Number(event.target.value) || 2 }))} />
          </div>
          <div className="space-y-1 xl:col-span-1">
            <label className="text-xs font-medium text-muted-foreground">كلمات</label>
            <Input value={form.q} onChange={(event) => setForm((current) => ({ ...current, q: event.target.value }))} placeholder="اختياري" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="min-w-0">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>دفعات الجودة</CardTitle>
                <CardDescription>التشغيل الحالي والسجل الأخير</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={() => void refetchBatches()} disabled={isLoadingBatches}>
                {isLoadingBatches ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingBatches ? (
              <div className="py-10 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              </div>
            ) : batches.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                لا توجد دفعات مسجلة بعد.
              </div>
            ) : (
              batches.map((batch) => {
                const meta = batchStatusMeta[batch.status] ?? { label: batch.status, variant: "outline" as const };
                const active = activeBatch?.id === batch.id;
                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => setSelectedBatchId(String(batch.id))}
                    className={cn(
                      "w-full rounded-lg border p-3 text-right transition hover:border-primary/40",
                      active ? "border-primary bg-primary/5" : "border-border bg-background",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant={meta.variant} className={meta.className}>{meta.label}</Badge>
                      <span className="text-xs font-semibold text-muted-foreground">#{batch.id}</span>
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <Progress value={batch.progress ?? 0} className="h-2" />
                      <span className="w-10 text-xs text-muted-foreground">{batch.progress ?? 0}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(batch.processed_items)} / {formatNumber(batch.total_items)} · نجاح {formatNumber(batch.successful_items)} · فشل {formatNumber(batch.failed_items)}
                    </p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  تفاصيل الدفعة
                </CardTitle>
                <CardDescription>
                  {activeBatch ? `دفعة #${activeBatch.id} · بدأت ${formatDateTime(activeBatch.started_at || activeBatch.created_at)}` : "اختر دفعة لعرض التفاصيل"}
                </CardDescription>
              </div>
              {activeBatch ? (
                <div className="flex flex-wrap items-center gap-2">
                  {["queued", "running", "cancelling"].includes(activeBatch.status) && !activeBatch.cancel_requested ? (
                    <Button variant="outline" onClick={() => cancelBatchMutation.mutate(activeBatch.id)} disabled={cancelBatchMutation.isPending}>
                      {cancelBatchMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Square className="ml-2 h-4 w-4" />}
                      إلغاء آمن
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={() => void refetchDetail()} disabled={isFetchingDetail}>
                    {isFetchingDetail ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}
                    تحديث التفاصيل
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {!activeBatch ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                ابدأ دفعة جديدة أو اختر دفعة من القائمة.
              </div>
            ) : (
              <div className="min-w-0 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "إجمالي", value: activeBatch.total_items, icon: FileText },
                    { label: "تمت معالجته", value: activeBatch.processed_items, icon: Check },
                    { label: "ناجح", value: activeBatch.successful_items, icon: CheckCircle2 },
                    { label: "فاشل", value: activeBatch.failed_items, icon: XCircle },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border bg-muted/30 p-3">
                      <item.icon className="mb-2 h-4 w-4 text-muted-foreground" />
                      <div className="text-xl font-black">{formatNumber(item.value)}</div>
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>العنوان</TableHead>
                        <TableHead className="w-[90px]">النوع</TableHead>
                        <TableHead className="w-[110px]">الدرجة</TableHead>
                        <TableHead className="w-[110px]">الحالة</TableHead>
                        <TableHead className="w-[220px] text-left">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isFetchingDetail ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                          </TableCell>
                        </TableRow>
                      ) : detailItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                            لا توجد تفاصيل عناصر لهذه الدفعة، أو أن الخادم لم يرجع قائمة العناصر بعد.
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailItems.slice(0, 100).map((item) => {
                          const hasPreview = Boolean(item.fix_preview_id || item.decision_id);
                          return (
                            <TableRow key={`${item.content_type}-${item.content_id}`}>
                              <TableCell className="max-w-[320px]">
                                <p className="truncate font-medium">{item.title || `محتوى #${item.content_id}`}</p>
                                {(item.error || item.message) && <p className="truncate text-xs text-muted-foreground">{item.error || item.message}</p>}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.content_type === "post" ? "منشور" : "مقال"}</Badge>
                              </TableCell>
                              <TableCell className="text-sm font-semibold">
                                {item.score_before ?? "—"}{item.score_after !== undefined ? ` → ${item.score_after}` : ""}
                              </TableCell>
                              <TableCell>
                                <Badge variant={item.status === "failed" ? "destructive" : item.status === "completed" ? "default" : "outline"}>
                                  {item.status || "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-left">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  {hasPreview ? (
                                    <Button size="sm" variant="outline" onClick={() => openPreviewMutation.mutate(item)} disabled={openPreviewMutation.isPending}>
                                      {openPreviewMutation.isPending ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : <Eye className="ml-1 h-3.5 w-3.5" />}
                                      معاينة
                                    </Button>
                                  ) : null}
                                  <Button size="sm" variant="ghost" asChild>
                                    <a href={contentEditPath(item)} target="_blank" rel="noreferrer">تحرير</a>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-hidden p-4 sm:p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle>معاينة التحسين #{preview?.id}</DialogTitle>
            <DialogDescription>
              راجع الفرق قبل الاعتماد. الاعتماد يحدث فقط بعد الضغط على زر الاعتماد.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[62vh] overflow-auto">
            {preview?.fix_summary ? (
              <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
                {preview.fix_summary}
              </div>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">قبل التعديل</p>
                <h3 className="mb-3 break-words font-bold">{preview?.original_title || "—"}</h3>
                <p className="whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                  {stripHtml(preview?.original_content).slice(0, 2600) || "لا يوجد نص قابل للعرض"}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <p className="mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">بعد التعديل المقترح</p>
                <h3 className="mb-3 break-words font-bold">{preview?.fixed_title || "—"}</h3>
                <p className="whitespace-pre-wrap text-sm leading-8 text-muted-foreground">
                  {stripHtml(preview?.fixed_content).slice(0, 2600) || "لا يوجد نص قابل للعرض"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-muted-foreground">
              الحالة الحالية: {preview?.status || "—"}
            </p>
            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
              {preview?.status === "previewed" ? (
                <>
                  <Button className="w-full" variant="outline" onClick={() => preview?.id && rejectPreviewMutation.mutate(preview.id)} disabled={rejectPreviewMutation.isPending}>
                    {rejectPreviewMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <StopCircle className="ml-2 h-4 w-4" />}
                    رفض
                  </Button>
                  <Button className="w-full" onClick={() => preview?.id && applyPreviewMutation.mutate(preview.id)} disabled={applyPreviewMutation.isPending}>
                    {applyPreviewMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Check className="ml-2 h-4 w-4" />}
                    اعتماد وتحديث
                  </Button>
                </>
              ) : (
                <Badge variant="outline">هذه المعاينة غير قابلة للاعتماد حاليًا</Badge>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
