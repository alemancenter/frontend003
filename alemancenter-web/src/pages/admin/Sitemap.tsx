import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Map,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { adminSitemapApi } from "@/lib/api/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { COUNTRY_META, VALID_COUNTRIES, type CountryCode } from "@/lib/country";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";

type SitemapKey = "articles" | "post" | "static";

interface SitemapInfo {
  name?: string;
  exists?: boolean;
  last_modified?: string | null;
  url?: string | null;
  size?: string | number | null;
  count?: number | null;
}

interface NormalizedSitemap extends SitemapInfo {
  key: SitemapKey;
  title: string;
  description: string;
  fileName: string;
  icon: typeof FileText;
  accent: string;
}

const sitemapTypes: Array<Omit<NormalizedSitemap, keyof SitemapInfo>> = [
  {
    key: "articles",
    title: "خريطة المقالات",
    description: "جميع المقالات التعليمية المنشورة والقابلة للفهرسة.",
    fileName: "sitemap_articles",
    icon: FileText,
    accent: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/20 dark:text-sky-300",
  },
  {
    key: "post",
    title: "خريطة المنشورات",
    description: "الأخبار والمنشورات والتحديثات العامة.",
    fileName: "sitemap_post",
    icon: FileText,
    accent: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/20 dark:text-violet-300",
  },
  {
    key: "static",
    title: "خريطة الصفحات الثابتة",
    description: "الصفوف والمواد والتصنيفات والصفحات الأساسية.",
    fileName: "sitemap_static",
    icon: Globe,
    accent: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300",
  },
];

function formatDate(value?: string | null) {
  if (!value) return "لم يتم التوليد بعد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCount(value?: number | null) {
  return Number(value ?? 0).toLocaleString("ar-EG");
}

function formatSize(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "0 KB";
  if (typeof value === "number") {
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${value} B`;
  }
  return value;
}

function sitemapUrl(info: NormalizedSitemap, country: string) {
  if (info.url) return info.url;
  if (info.name) return `/sitemap/${info.name}`;
  return `/storage/sitemaps/${info.fileName}_${country}.xml`;
}

function indexSitemapUrl(country: string) {
  return `/storage/sitemaps/sitemap_index_${country}.xml`;
}

function normalizeStatus(raw: unknown, country: string): NormalizedSitemap[] {
  const payload = raw && typeof raw === "object" && "data" in raw ? (raw as { data?: unknown }).data : raw;
  const sitemaps = payload && typeof payload === "object" ? (payload as { sitemaps?: unknown }).sitemaps : undefined;

  const byKey: Record<string, SitemapInfo> = {};
  if (Array.isArray(sitemaps)) {
    for (const item of sitemaps) {
      if (!item || typeof item !== "object") continue;
      const entry = item as SitemapInfo;
      const name = String(entry.name || "");
      const key = sitemapTypes.find((type) => name.includes(type.key) || name.includes(type.fileName))?.key;
      if (key) byKey[key] = entry;
    }
  } else if (sitemaps && typeof sitemaps === "object") {
    Object.assign(byKey, sitemaps as Record<string, SitemapInfo>);
  }

  return sitemapTypes.map((type) => {
    const info = byKey[type.key] || {};
    return {
      ...type,
      ...info,
      name: info.name || `${type.fileName}_${country}.xml`,
      exists: Boolean(info.exists),
    };
  });
}

export default function Sitemap() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const country = useCountry();
  const switchCountry = useCountrySwitcher();
  const [deleteTarget, setDeleteTarget] = useState<NormalizedSitemap | null>(null);

  const { data: status, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin", "sitemap-status", country],
    queryFn: () => adminSitemapApi.status({ country }),
  });

  const sitemaps = useMemo(() => normalizeStatus(status, country), [status, country]);
  const existingCount = sitemaps.filter((item) => item.exists).length;
  const readinessPct = Math.round((existingCount / sitemapTypes.length) * 100);
  const totalLinks = sitemaps.reduce((total, item) => total + Number(item.count || 0), 0);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "sitemap-status"] });

  const generateMutation = useMutation({
    mutationFn: () => adminSitemapApi.generateAll({ country }),
    onSuccess: (data) => {
      toast({ title: "تم توليد خرائط الموقع", description: data.message || "تم تحديث ملفات sitemap بنجاح." });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "فشل إنشاء خريطة الموقع", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (target: NormalizedSitemap) => adminSitemapApi.delete(target.key, country, { country }),
    onSuccess: (data) => {
      toast({ title: "تم حذف الخريطة", description: data.message || "يمكن إعادة توليدها لاحقًا." });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "فشل حذف الخريطة", description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري تحميل حالة خرائط الموقع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
              <Map className="ml-1 h-3.5 w-3.5" />
              ملفات XML لمحركات البحث
            </Badge>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
              {existingCount} من {sitemapTypes.length} متاحة
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">خريطة الموقع</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            إدارة وتوليد خرائط الموقع الخاصة بالمقالات والمنشورات والصفحات الثابتة لكل قاعدة بيانات، ثم استخدام ملف الفهرس الرئيسي داخل Google Search Console.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" title="تحديث الحالة" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}
            توليد الكل
          </Button>
          <Select value={country} onValueChange={(value) => switchCountry(value as CountryCode)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="قاعدة البيانات" />
            </SelectTrigger>
            <SelectContent>
              {VALID_COUNTRIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {COUNTRY_META[code].flag} {COUNTRY_META[code].name}
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
              <Globe className="h-5 w-5 text-sky-600" />
              جاهزية الخرائط
            </CardTitle>
            <CardDescription>حالة ملفات sitemap لهذه القاعدة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn("text-5xl font-black", readinessPct === 100 ? "text-emerald-600" : readinessPct >= 50 ? "text-amber-600" : "text-rose-600")}>
              {readinessPct}%
            </div>
            <Progress value={readinessPct} />
            <p className="text-sm text-muted-foreground">
              {existingCount} ملفات متاحة من أصل {sitemapTypes.length}، بإجمالي {formatCount(totalLinks)} رابط.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          {sitemaps.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.key} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg border", item.accent)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {item.exists ? (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                        متاح
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                        <XCircle className="ml-1 h-3.5 w-3.5" />
                        مفقود
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="pt-2 text-lg">{item.title}</CardTitle>
                  <CardDescription className="leading-6">{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">الملف</span>
                      <code className="truncate text-xs" dir="ltr">{item.name}</code>
                    </div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">آخر تحديث</span>
                      <span className="text-xs" dir="ltr">{formatDate(item.last_modified)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">الحجم / الروابط</span>
                      <span className="text-xs">{formatSize(item.size)} · {formatCount(item.count)} رابط</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild disabled={!item.exists}>
                      <a href={sitemapUrl(item, country)} target="_blank" rel="noreferrer">
                        <ExternalLink className="ml-1 h-4 w-4" />
                        عرض
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:text-rose-300"
                      disabled={!item.exists || deleteMutation.isPending}
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="ml-1 h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <Map className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>خريطة الموقع الرئيسية</CardTitle>
                <CardDescription>ملف الفهرس الذي يجمع خرائط المقالات والمنشورات والصفحات الثابتة.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <code className="truncate text-sm" dir="ltr">sitemap_index_{country}.xml</code>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                  <a href={indexSitemapUrl(country)} target="_blank" rel="noreferrer">
                    <ExternalLink className="ml-2 h-4 w-4" />
                    فتح الفهرس
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:text-rose-300"
                  onClick={() =>
                    setDeleteTarget({
                      key: "static",
                      title: "خريطة الموقع الرئيسية",
                      description: "",
                      fileName: "sitemap_index",
                      icon: Map,
                      accent: "",
                      name: `sitemap_index_${country}.xml`,
                      exists: true,
                    })
                  }
                >
                  <Trash2 className="ml-2 h-4 w-4" />
                  حذف الفهرس
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              ملاحظات تشغيل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
              <li>يتم توليد الخرائط لكل قاعدة بيانات بشكل منفصل.</li>
              <li>أعد التوليد بعد إضافة مقالات أو منشورات كثيرة.</li>
              <li>أضف ملف الفهرس الرئيسي في Google Search Console.</li>
              <li>قد تستغرق عملية التوليد عدة دقائق حسب حجم المحتوى.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">توليد يدوي آمن</p>
              <p className="text-sm text-muted-foreground">يعيد إنشاء جميع ملفات sitemap للقاعدة الحالية من بيانات الموقع.</p>
            </div>
          </div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}
            تشغيل التوليد الآن
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف خريطة الموقع</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف ملف {deleteTarget?.name || deleteTarget?.title}. يمكنك إعادة توليده لاحقًا من زر توليد الكل.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                const target =
                  deleteTarget.fileName === "sitemap_index"
                    ? { ...deleteTarget, key: "index" as SitemapKey }
                    : deleteTarget;
                deleteMutation.mutate(target);
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
