import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  Trash2,
  WifiOff,
} from "lucide-react";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import { adminRedisApi, type RedisKeyInfo, type RedisKeysResponse, type RedisTTLFilter } from "@/lib/api/admin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const KEYS_PER_PAGE = 25;
const DEFAULT_TTL = "3600";
const SEVEN_DAYS_TTL = "604800";

type RedisInfoSection = Record<string, string>;
type RedisInfo = Record<string, string | RedisInfoSection>;
type TabValue = "keys" | "info" | "settings";

interface KeyPagination {
  data: RedisKeyInfo[];
  count: number;
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
  from: number;
  to: number;
  hasMore: boolean;
}

function normalizeKeysResponse(payload: RedisKeysResponse | RedisKeyInfo[] | undefined, page: number): KeyPagination {
  if (Array.isArray(payload)) {
    return {
      data: payload,
      count: payload.length,
      currentPage: page,
      perPage: KEYS_PER_PAGE,
      total: payload.length,
      lastPage: 1,
      from: payload.length ? 1 : 0,
      to: payload.length,
      hasMore: false,
    };
  }

  const data =
    payload?.data ??
    (payload?.keys ?? []).map((key) => ({
      key,
      ttl: -2,
      ttl_label: "غير معروف",
      is_persistent: false,
      type: "unknown",
      memory_usage_bytes: 0,
    }));
  const currentPage = payload?.current_page ?? payload?.page ?? page;
  const perPage = payload?.per_page ?? KEYS_PER_PAGE;
  const total = payload?.total ?? payload?.count ?? data.length;
  const lastPage = payload?.last_page ?? Math.max(1, Math.ceil(total / perPage));

  return {
    data,
    count: payload?.count ?? data.length,
    currentPage,
    perPage,
    total,
    lastPage,
    from: payload?.from ?? (data.length ? (currentPage - 1) * perPage + 1 : 0),
    to: payload?.to ?? (data.length ? (currentPage - 1) * perPage + data.length : 0),
    hasMore: payload?.has_more ?? currentPage < lastPage,
  };
}

function parseRedisInfo(raw: string): RedisInfo {
  const parsed: RedisInfo = {};
  let currentSection = "General";

  raw.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("#")) {
      currentSection = trimmed.replace(/^#\s*/, "") || "General";
      parsed[currentSection] = {};
      return;
    }

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    const section = parsed[currentSection];

    if (section && typeof section === "object") {
      section[key] = value;
    } else {
      parsed[key] = value;
    }
  });

  return parsed;
}

function normalizeRedisInfo(payload: unknown): RedisInfo {
  if (!payload || typeof payload !== "object") return {};
  const info = (payload as { info?: unknown }).info;
  if (typeof info === "string") return parseRedisInfo(info);
  return payload as RedisInfo;
}

function getInfoSection(info: RedisInfo, section: string): RedisInfoSection {
  const value = info[section];
  if (value && typeof value === "object") return value;
  const hasSections = Object.values(info).some((entry) => entry && typeof entry === "object");
  return hasSections ? {} : (info as RedisInfoSection);
}

function flattenInfo(info: RedisInfo) {
  return Object.entries(info).flatMap(([key, value]) => {
    if (value && typeof value === "object") {
      return Object.entries(value).map(([subKey, subValue]) => [`${key}.${subKey}`, String(subValue)] as const);
    }
    return [[key, String(value ?? "")] as const];
  });
}

function formatBytes(value?: number) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatTtl(item: RedisKeyInfo) {
  if (item.ttl_label) return item.ttl_label;
  if (item.ttl === -1 || item.is_persistent) return "دائم";
  if (item.ttl === -2) return "غير معروف";
  return `${item.ttl} ثانية`;
}

function toPositiveNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export default function Redis() {
  const queryClient = useQueryClient();
  const country = useCountry();
  const [activeTab, setActiveTab] = useState<TabValue>("keys");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [ttlFilter, setTtlFilter] = useState<RedisTTLFilter>("all");
  const [keysPage, setKeysPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RedisKeyInfo | null>(null);
  const [expireTarget, setExpireTarget] = useState<RedisKeyInfo | null>(null);
  const [expireTtl, setExpireTtl] = useState(SEVEN_DAYS_TTL);
  const [cleanLegacyOpen, setCleanLegacyOpen] = useState(false);
  const [newKey, setNewKey] = useState({ key: "", value: "", ttl: DEFAULT_TTL, persist: false });
  const [envSettings, setEnvSettings] = useState({
    REDIS_HOST: "",
    REDIS_PORT: "",
    REDIS_PASSWORD: "",
    REDIS_DB: "",
  });

  const keysQuery = useQuery({
    queryKey: ["admin", "redis", "keys", country, appliedSearch, ttlFilter, keysPage],
    queryFn: () =>
      adminRedisApi.listKeys({
        pattern: appliedSearch ? `*${appliedSearch}*` : "*",
        ttl_filter: ttlFilter,
        page: keysPage,
        per_page: KEYS_PER_PAGE,
        country,
      }),
    enabled: activeTab === "keys",
  });

  const infoQuery = useQuery({
    queryKey: ["admin", "redis", "info", country],
    queryFn: () => adminRedisApi.getInfo({ country }),
    enabled: activeTab === "info" || activeTab === "settings",
  });

  const healthQuery = useQuery({
    queryKey: ["admin", "redis", "health", country],
    queryFn: () => adminRedisApi.testConnection({ country }),
    retry: false,
  });

  const keys = useMemo(() => normalizeKeysResponse(keysQuery.data, keysPage), [keysPage, keysQuery.data]);
  const info = useMemo(() => normalizeRedisInfo(infoQuery.data), [infoQuery.data]);
  const infoEntries = useMemo(() => flattenInfo(info), [info]);
  const serverInfo = useMemo(() => getInfoSection(info, "Server"), [info]);
  const memoryInfo = useMemo(() => getInfoSection(info, "Memory"), [info]);
  const clientsInfo = useMemo(() => getInfoSection(info, "Clients"), [info]);
  const statsInfo = useMemo(() => getInfoSection(info, "Stats"), [info]);
  const healthValues = Object.values(healthQuery.data ?? {});
  const isRedisHealthy = healthQuery.isSuccess && healthValues.length > 0 && healthValues.every(Boolean);

  const invalidateRedis = () => queryClient.invalidateQueries({ queryKey: ["admin", "redis"] });

  const setMutation = useMutation({
    mutationFn: (input: { key: string; value: string; ttl?: number; persist?: boolean }) =>
      adminRedisApi.setKey(input, { country }),
    onSuccess: () => {
      toast({ title: "تم حفظ مفتاح Redis بنجاح" });
      setIsAddOpen(false);
      setNewKey({ key: "", value: "", ttl: DEFAULT_TTL, persist: false });
      invalidateRedis();
    },
    onError: () => toast({ title: "فشل حفظ مفتاح Redis", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => adminRedisApi.deleteKey(key, { country }),
    onSuccess: () => {
      toast({ title: "تم حذف المفتاح بنجاح" });
      setDeleteTarget(null);
      invalidateRedis();
    },
    onError: () => toast({ title: "فشل حذف المفتاح", variant: "destructive" }),
  });

  const expireMutation = useMutation({
    mutationFn: ({ key, ttl }: { key: string; ttl: number }) => adminRedisApi.expireKey(key, ttl, { country }),
    onSuccess: () => {
      toast({ title: "تم تعيين مدة انتهاء للمفتاح" });
      setExpireTarget(null);
      setExpireTtl(SEVEN_DAYS_TTL);
      invalidateRedis();
    },
    onError: () => toast({ title: "فشل تعيين مدة الانتهاء", variant: "destructive" }),
  });

  const expireLegacyMutation = useMutation({
    mutationFn: () => adminRedisApi.expireLegacyIpLocation({ ttl: Number(SEVEN_DAYS_TTL) }, { country }),
    onSuccess: () => {
      toast({ title: "تم تعيين انتهاء تلقائي لمفاتيح IP القديمة" });
      invalidateRedis();
    },
    onError: () => toast({ title: "فشل تعيين انتهاء مفاتيح IP القديمة", variant: "destructive" }),
  });

  const cleanLegacyMutation = useMutation({
    mutationFn: () => adminRedisApi.cleanLegacyIpLocation({ country }),
    onSuccess: () => {
      toast({ title: "تم تنظيف مفاتيح IP القديمة" });
      setCleanLegacyOpen(false);
      invalidateRedis();
    },
    onError: () => toast({ title: "فشل تنظيف مفاتيح IP القديمة", variant: "destructive" }),
  });

  const cleanExpiredMutation = useMutation({
    mutationFn: () => adminRedisApi.cleanExpired({ country }),
    onSuccess: () => {
      toast({ title: "تم تنفيذ فحص المفاتيح المنتهية" });
      invalidateRedis();
    },
    onError: () => toast({ title: "فشل تنفيذ فحص المفاتيح المنتهية", variant: "destructive" }),
  });

  const updateEnvMutation = useMutation({
    mutationFn: (input: Record<string, string>) => adminRedisApi.updateEnv(input, { country }),
    onSuccess: () => toast({ title: "تم قبول إعدادات Redis، أعد تشغيل الخدمة لتطبيقها" }),
    onError: () => toast({ title: "فشل حفظ إعدادات Redis", variant: "destructive" }),
  });

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setKeysPage(1);
    setAppliedSearch(search.trim());
  };

  const handleAddKey = () => {
    const key = newKey.key.trim();
    if (!key || !newKey.value) {
      toast({ title: "المفتاح والقيمة مطلوبان", variant: "destructive" });
      return;
    }

    setMutation.mutate({
      key,
      value: newKey.value,
      ttl: newKey.persist ? undefined : toPositiveNumber(newKey.ttl, Number(DEFAULT_TTL)),
      persist: newKey.persist,
    });
  };

  const handleUpdateEnv = (event: FormEvent) => {
    event.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(envSettings).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value !== ""),
    );

    if (!Object.keys(payload).length) {
      toast({ title: "أدخل قيمة واحدة على الأقل قبل الحفظ", variant: "destructive" });
      return;
    }

    updateEnvMutation.mutate(payload);
  };

  const pageCanGoBack = keys.currentPage > 1;
  const pageCanGoForward = keys.hasMore || keys.currentPage < keys.lastPage;
  const loadingKeys = keysQuery.isLoading || keysQuery.isFetching;
  const refreshing = keysQuery.isFetching || infoQuery.isFetching || healthQuery.isFetching;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">إدارة Redis</h1>
              <p className="text-sm text-muted-foreground">مراقبة الكاش، المفاتيح، حالة الاتصال، وإعدادات Redis.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={isRedisHealthy ? "default" : "destructive"}
              className={cn(isRedisHealthy && "bg-emerald-600 hover:bg-emerald-600")}
            >
              {isRedisHealthy ? <CheckCircle2 className="ml-1 h-3.5 w-3.5" /> : <WifiOff className="ml-1 h-3.5 w-3.5" />}
              {isRedisHealthy ? "الاتصال يعمل" : healthQuery.isLoading ? "فحص الاتصال" : "الاتصال غير مؤكد"}
            </Badge>
            <Badge variant="outline">القاعدة: {country.toUpperCase()}</Badge>
            <Badge variant="secondary">المفاتيح المعروضة: {keys.count}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <AdminCountrySelect />
          <Button variant="outline" onClick={invalidateRedis} disabled={refreshing}>
            <RefreshCw className={cn("ml-2 h-4 w-4", refreshing && "animate-spin")} />
            تحديث
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة مفتاح
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="sm:max-w-xl">
              <DialogHeader className="text-right">
                <DialogTitle>إضافة مفتاح Redis</DialogTitle>
                <DialogDescription>يفضل استخدام TTL لتجنب مفاتيح دائمة تستهلك الذاكرة بلا حاجة.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="redis-key">المفتاح</Label>
                  <Input
                    id="redis-key"
                    dir="ltr"
                    value={newKey.key}
                    onChange={(event) => setNewKey((prev) => ({ ...prev, key: event.target.value }))}
                    placeholder="cache:example:key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="redis-value">القيمة</Label>
                  <Textarea
                    id="redis-value"
                    dir="ltr"
                    value={newKey.value}
                    onChange={(event) => setNewKey((prev) => ({ ...prev, value: event.target.value }))}
                    placeholder='{"status":"active"}'
                    className="min-h-28 font-mono text-sm"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="redis-ttl">TTL بالثواني</Label>
                    <Input
                      id="redis-ttl"
                      dir="ltr"
                      type="number"
                      min="1"
                      value={newKey.ttl}
                      disabled={newKey.persist}
                      onChange={(event) => setNewKey((prev) => ({ ...prev, ttl: event.target.value }))}
                    />
                  </div>
                  <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                    <Checkbox
                      checked={newKey.persist}
                      onCheckedChange={(checked) => setNewKey((prev) => ({ ...prev, persist: checked === true }))}
                    />
                    مفتاح دائم
                  </label>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddKey} disabled={setMutation.isPending}>
                  {setMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  حفظ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="keys">المفاتيح</TabsTrigger>
          <TabsTrigger value="info">معلومات الخادم</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات والصيانة</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>مفاتيح التخزين المؤقت</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    النتائج {keys.from}-{keys.to} من {keys.total}، مرتبة حسب فحص Redis الحالي.
                  </p>
                </div>
                <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative sm:w-72">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="بحث داخل أسماء المفاتيح..."
                      className="pr-9"
                    />
                  </div>
                  <Select
                    value={ttlFilter}
                    onValueChange={(value) => {
                      setTtlFilter(value as RedisTTLFilter);
                      setKeysPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المفاتيح</SelectItem>
                      <SelectItem value="persistent">الدائمة فقط</SelectItem>
                      <SelectItem value="volatile">ذات انتهاء فقط</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={loadingKeys}>
                    <Search className="ml-2 h-4 w-4" />
                    بحث
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              {keysQuery.isError ? (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>تعذر تحميل مفاتيح Redis</AlertTitle>
                  <AlertDescription>تحقق من الاتصال والصلاحيات ثم أعد المحاولة.</AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[320px]">المفتاح</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>الذاكرة</TableHead>
                        <TableHead>TTL</TableHead>
                        <TableHead className="text-left">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingKeys ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center">
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              جاري تحميل المفاتيح...
                            </span>
                          </TableCell>
                        </TableRow>
                      ) : keys.data.length ? (
                        keys.data.map((item) => (
                          <TableRow key={item.key}>
                            <TableCell>
                              <div className="max-w-[520px] truncate font-mono text-xs" dir="ltr" title={item.key}>
                                {item.key}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono uppercase">
                                {item.type || "unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{formatBytes(item.memory_usage_bytes)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={item.is_persistent ? "destructive" : item.ttl > 0 && item.ttl < 60 ? "secondary" : "outline"}
                                className={cn(!item.is_persistent && item.ttl >= 60 && "border-emerald-200 text-emerald-700 dark:text-emerald-300")}
                              >
                                {formatTtl(item)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="تعيين مدة انتهاء"
                                  onClick={() => {
                                    setExpireTarget(item);
                                    setExpireTtl(SEVEN_DAYS_TTL);
                                  }}
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  title="حذف المفتاح"
                                  onClick={() => setDeleteTarget(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                            لا توجد مفاتيح مطابقة للبحث الحالي.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  الصفحة {keys.currentPage} من {keys.lastPage}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={!pageCanGoBack || loadingKeys}
                    onClick={() => setKeysPage((page) => Math.max(1, page - 1))}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!pageCanGoForward || loadingKeys}
                    onClick={() => setKeysPage((page) => page + 1)}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          {infoQuery.isError ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>تعذر تحميل معلومات Redis</AlertTitle>
              <AlertDescription>قد يكون Redis غير متصل أو أن الصلاحيات غير كافية.</AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-sky-50 p-3 text-sky-600 dark:bg-sky-950/30 dark:text-sky-300">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">الإصدار</p>
                        <p className="text-2xl font-bold">{serverInfo.redis_version || "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">وقت التشغيل</p>
                        <p className="text-2xl font-bold">{serverInfo.uptime_in_days || "0"} يوم</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300">
                        <HardDrive className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">الذاكرة المستخدمة</p>
                        <p className="text-2xl font-bold">{memoryInfo.used_memory_human || "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-violet-50 p-3 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300">
                        <Settings2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">العملاء</p>
                        <p className="text-2xl font-bold">{clientsInfo.connected_clients || "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>تفاصيل خادم Redis</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {infoEntries.length ? `${infoEntries.length} قيمة من أمر INFO` : "لا توجد بيانات معروضة حاليا."}
                  </p>
                </CardHeader>
                <CardContent>
                  {infoQuery.isLoading ? (
                    <div className="flex h-48 items-center justify-center text-muted-foreground">
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري تحميل المعلومات...
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {infoEntries.map(([key, value]) => (
                        <div key={key} className="flex min-w-0 items-center justify-between gap-3 rounded-md border p-3 text-sm">
                          <span className="truncate text-muted-foreground" title={key}>
                            {key}
                          </span>
                          <span className="max-w-[50%] truncate font-mono text-xs" title={value} dir="ltr">
                            {value || "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات الاتصال</CardTitle>
                <p className="text-sm text-muted-foreground">
                  يتم إرسال القيم المملوءة فقط. تطبيق الإعدادات الفعلي يحتاج إعادة تشغيل الخدمة حسب الباك اند.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateEnv} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="redis-host">Redis Host</Label>
                    <Input
                      id="redis-host"
                      dir="ltr"
                      value={envSettings.REDIS_HOST}
                      onChange={(event) => setEnvSettings((prev) => ({ ...prev, REDIS_HOST: event.target.value }))}
                      placeholder="127.0.0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redis-port">Redis Port</Label>
                    <Input
                      id="redis-port"
                      dir="ltr"
                      value={envSettings.REDIS_PORT}
                      onChange={(event) => setEnvSettings((prev) => ({ ...prev, REDIS_PORT: event.target.value }))}
                      placeholder="6379"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redis-password">Redis Password</Label>
                    <Input
                      id="redis-password"
                      dir="ltr"
                      type="password"
                      value={envSettings.REDIS_PASSWORD}
                      onChange={(event) => setEnvSettings((prev) => ({ ...prev, REDIS_PASSWORD: event.target.value }))}
                      placeholder="اختياري"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redis-db">Redis DB</Label>
                    <Input
                      id="redis-db"
                      dir="ltr"
                      value={envSettings.REDIS_DB}
                      onChange={(event) => setEnvSettings((prev) => ({ ...prev, REDIS_DB: event.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={updateEnvMutation.isPending}>
                      {updateEnvMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                      حفظ الإعدادات
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الصيانة</CardTitle>
                <p className="text-sm text-muted-foreground">إجراءات مرتبطة بالمفاتيح القديمة وتنظيف الكاش.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">فحص المفاتيح المنتهية</p>
                      <p className="text-sm text-muted-foreground">Redis يحذفها تلقائيا، وهذا الزر ينفذ endpoint التوافق.</p>
                    </div>
                    <Button variant="outline" onClick={() => cleanExpiredMutation.mutate()} disabled={cleanExpiredMutation.isPending}>
                      فحص
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">مفاتيح IP Location القديمة</p>
                      <p className="text-sm text-muted-foreground">تستهدف النمط القديم *_cache_ip_location_*.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => expireLegacyMutation.mutate()}
                        disabled={expireLegacyMutation.isPending}
                      >
                        TTL 7 أيام
                      </Button>
                      <Button variant="destructive" onClick={() => setCleanLegacyOpen(true)}>
                        حذف
                      </Button>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-muted-foreground">عمليات ناجحة</p>
                    <p className="font-mono">{statsInfo.total_commands_processed || "-"}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-muted-foreground">اتصالات مرفوضة</p>
                    <p className="font-mono">{statsInfo.rejected_connections || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(expireTarget)} onOpenChange={(open) => !open && setExpireTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>تعيين مدة انتهاء</DialogTitle>
            <DialogDescription>
              سيتم تطبيق TTL على المفتاح المحدد. استخدم 604800 لسبعة أيام.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted p-3 font-mono text-xs" dir="ltr">
              {expireTarget?.key}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expire-ttl">TTL بالثواني</Label>
              <Input
                id="expire-ttl"
                dir="ltr"
                type="number"
                min="1"
                value={expireTtl}
                onChange={(event) => setExpireTtl(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExpireTarget(null)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!expireTarget) return;
                expireMutation.mutate({ key: expireTarget.key, ttl: toPositiveNumber(expireTtl, Number(SEVEN_DAYS_TTL)) });
              }}
              disabled={expireMutation.isPending}
            >
              {expireMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              تطبيق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف مفتاح Redis</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المفتاح نهائيا من Redis ولا يمكن التراجع عن العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md bg-muted p-3 font-mono text-xs" dir="ltr">
            {deleteTarget?.key}
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.key)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cleanLegacyOpen} onOpenChange={setCleanLegacyOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف مفاتيح IP Location القديمة</AlertDialogTitle>
            <AlertDialogDescription>
              سيحذف هذا الإجراء كل المفاتيح المطابقة للنمط *_cache_ip_location_* من Redis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cleanLegacyMutation.mutate()}
            >
              حذف المفاتيح
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
