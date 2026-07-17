import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { imgUrl } from "@/lib/img-url";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import {
  adminSettingsApi,
  adminEmailBounceApi,
  adminEmailVerificationApi,
} from "@/lib/api/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Settings as SettingsIcon,
  Phone,
  Mail,
  FileText,
  Shield,
  MailWarning,
  MailCheck,
  Save,
  Loader2,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Search,
  Zap,
  Server,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  Upload,
  Code2,
  Download,
  Palette,
  Copy,
  MonitorSmartphone,
  Smartphone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsData = Record<string, string>;

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { id: "general",      label: "الإعدادات العامة",    icon: SettingsIcon },
  { id: "contact",      label: "الاتصال والتواصل",    icon: Phone },
  { id: "media",        label: "الوسائط",              icon: ImageIcon },
  { id: "email",        label: "البريد الإلكتروني",   icon: Mail },
  { id: "seo",          label: "SEO",                  icon: FileText },
  { id: "ads",          label: "الإعلانات",            icon: Code2 },
  { id: "downloads",    label: "التحميل",              icon: Download },
  { id: "security",     label: "الأمان والمصادقة",    icon: Shield },
  { id: "appearance",   label: "المظهر",               icon: Palette },
  { id: "bounce",       label: "البريد المرتد",        icon: MailWarning },
  { id: "verification", label: "التحقق من البريد",     icon: MailCheck },
];

const SAVE_TABS = ["general", "contact", "email", "seo", "ads", "downloads", "security", "appearance"];
type SettingsTabId = (typeof TABS)[number]["id"];

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
      <span className="shrink-0 text-base">ℹ️</span>
      <div>{children}</div>
    </div>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
  label,
  description,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/50 border">
      <div>
        <h4 className="font-medium">{label}</h4>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative w-14 h-8 rounded-full transition-colors shrink-0",
          enabled ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-transform",
            enabled ? "translate-x-[22px]" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

// ─── Main Settings page ───────────────────────────────────────────────────────

interface SettingsProps {
  initialTab?: SettingsTabId;
}

export default function Settings({ initialTab = "general" }: SettingsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const country = useCountry();

  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [settings, setSettings] = useState<SettingsData>({});
  const [original, setOriginal] = useState<SettingsData>({});

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // SMTP
  const [smtpResult, setSmtpResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [serverMailPrefix, setServerMailPrefix] = useState("noreply");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Media upload
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const ogImageRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  // ── Load settings ──────────────────────────────────────────────────────────

  const { isLoading, data: rawSettings } = useQuery({
    queryKey: ["admin", "settings", country],
    queryFn: () => adminSettingsApi.getAll({ country }),
  });

  useEffect(() => {
    if (rawSettings) {
      const s = rawSettings as SettingsData;
      setSettings(s);
      setOriginal(s);
    }
  }, [rawSettings]);

  const set = useCallback((key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value })), []);

  const val = (key: string, fallback = "") => settings[key] ?? fallback;

  const hasChanges = Object.keys(settings).some((k) => settings[k] !== original[k]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (changed: SettingsData) => adminSettingsApi.update(changed, { country }),
    onSuccess: () => {
      setOriginal({ ...settings });
      // Invalidate both admin and public settings so the UI reflects changes immediately
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "تم حفظ الإعدادات بنجاح" });
    },
    onError: (err: any) => {
      toast({ title: "فشل الحفظ", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const changed: SettingsData = {};
    Object.keys(settings).forEach((k) => {
      if (settings[k] !== original[k]) changed[k] = settings[k];
    });
    if (!Object.keys(changed).length) {
      toast({ title: "لم تُجرَ أي تغييرات" });
      return;
    }
    saveMutation.mutate(changed);
  };

  // ── SMTP test ──────────────────────────────────────────────────────────────

  const smtpCfg = () => ({
    host: val("mail_host"), port: val("mail_port"),
    username: val("mail_username"), password: val("mail_password"),
    encryption: val("mail_encryption"), from_address: val("mail_from_address"),
    from_name: val("mail_from_name"),
  });

  const handleTestSmtp = async () => {
    setIsTesting(true); setSmtpResult(null);
    try {
      const res = await adminSettingsApi.testSmtp(smtpCfg());
      setSmtpResult({ success: res.success, message: res.message || res.error || "تمت العملية" });
    } catch (e: any) {
      setSmtpResult({ success: false, message: e.message });
    } finally { setIsTesting(false); }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) return;
    setIsSendingTest(true);
    try {
      await adminSettingsApi.sendTestEmail(testEmail, smtpCfg());
      toast({ title: "تم إرسال البريد التجريبي بنجاح" });
    } catch (e: any) {
      toast({ title: "فشل الإرسال", description: e.message, variant: "destructive" });
    } finally { setIsSendingTest(false); }
  };

  // ── Server mail quick-apply ────────────────────────────────────────────────

  const extractDomain = (url: string) => {
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    }
  };

  const domain = extractDomain(val("site_url"));

  const applyServerMail = () => {
    const email = `${serverMailPrefix}@${domain}`;
    ["mail_host", "mail_port", "mail_encryption", "mail_username", "mail_from_address"].forEach(
      (k, i) => set(k, [domain, "465", "ssl", email, email][i])
    );
    if (!val("mail_from_name") && val("site_name")) set("mail_from_name", val("site_name"));
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(id);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // ── File upload ────────────────────────────────────────────────────────────

  const handleFileUpload = async (key: string, file: File) => {
    setUploading(key);
    try {
      const result = await adminSettingsApi.uploadFile(key, file, { country });
      const newPath = result?.[key];
      if (newPath) {
        setSettings((prev) => ({ ...prev, [key]: newPath }));
        setOriginal((prev) => ({ ...prev, [key]: newPath }));
        toast({ title: "تم رفع الملف بنجاح" });
      } else {
        toast({ title: "رُفع الملف ولكن لم يُعاد مساره", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "فشل رفع الملف", description: e.message, variant: "destructive" });
    } finally { setUploading(null); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إعدادات النظام</h1>
          <p className="text-muted-foreground mt-1">تكوين إعدادات الموقع والخدمات</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminCountrySelect />
          {SAVE_TABS.includes(activeTab) && (
          <Button onClick={handleSave} disabled={saveMutation.isPending || !hasChanges}>
            {saveMutation.isPending ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="ml-2 h-4 w-4" />
            )}
            حفظ التغييرات
            {hasChanges && <span className="mr-2 h-2 w-2 rounded-full bg-orange-400 inline-block" />}
          </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-2">
            <nav className="space-y-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTabId)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-4 space-y-6">

          {/* ── General ────────────────────────────────────────────── */}
          {activeTab === "general" && (
            <SectionCard title="معلومات الموقع" description="الإعدادات الأساسية">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="اسم الموقع">
                  <Input value={val("site_name")} onChange={(e) => set("site_name", e.target.value)} placeholder="مركز العليمان" />
                </Field>
                <Field label="البريد الإلكتروني للموقع">
                  <Input dir="ltr" type="email" value={val("site_email")} onChange={(e) => set("site_email", e.target.value)} placeholder="admin@alemancenter.com" />
                </Field>
                <Field label="لغة الموقع">
                  <Input dir="ltr" value={val("site_language", "ar")} onChange={(e) => set("site_language", e.target.value)} placeholder="ar" />
                </Field>
                <Field label="المنطقة الزمنية">
                  <Input dir="ltr" value={val("timezone", "Asia/Amman")} onChange={(e) => set("timezone", e.target.value)} placeholder="Asia/Amman" />
                </Field>
                <Field label="رابط الموقع" hint="يُستخدم في إنشاء الروابط الكاملة والـ sitemap">
                  <Input dir="ltr" value={val("site_url")} onChange={(e) => set("site_url", e.target.value)} placeholder="https://alemancenter.com" />
                </Field>
              </div>
              <Field label="وصف الموقع">
                <Textarea value={val("site_description")} onChange={(e) => set("site_description", e.target.value)} placeholder="وصف مختصر للموقع..." rows={3} />
              </Field>
            </SectionCard>
          )}

          {/* ── Contact ─────────────────────────────────────────────── */}
          {activeTab === "contact" && (
            <>
              <SectionCard title="معلومات الاتصال" description="بيانات التواصل الرئيسية">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="البريد الإلكتروني للتواصل">
                    <Input dir="ltr" type="email" value={val("contact_email")} onChange={(e) => set("contact_email", e.target.value)} placeholder="contact@alemancenter.com" />
                  </Field>
                  <Field label="رقم الهاتف">
                    <Input dir="ltr" value={val("contact_phone")} onChange={(e) => set("contact_phone", e.target.value)} placeholder="+962 7xx xxx xxx" />
                  </Field>
                </div>
                <Field label="العنوان">
                  <Textarea value={val("contact_address")} onChange={(e) => set("contact_address", e.target.value)} placeholder="عمّان، الأردن" rows={2} />
                </Field>
              </SectionCard>

              <SectionCard title="شبكات التواصل الاجتماعي" description="روابط الحسابات الرسمية">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { key: "social_facebook",  label: "فيسبوك",          placeholder: "https://facebook.com/..." },
                    { key: "social_twitter",   label: "تويتر / X",        placeholder: "https://twitter.com/..." },
                    { key: "social_linkedin",  label: "لينكدإن",          placeholder: "https://linkedin.com/..." },
                    { key: "social_whatsapp",  label: "واتساب",           placeholder: "https://wa.me/962..." },
                    { key: "social_tiktok",    label: "تيك توك",          placeholder: "https://tiktok.com/@..." },
                    { key: "social_youtube",   label: "يوتيوب",           placeholder: "https://youtube.com/@..." },
                    { key: "social_instagram", label: "إنستغرام",         placeholder: "https://instagram.com/..." },
                    { key: "social_snapchat",  label: "سناب شات",         placeholder: "https://snapchat.com/add/..." },
                  ].map(({ key, label, placeholder }) => (
                    <Field key={key} label={label}>
                      <Input dir="ltr" value={val(key)} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
                    </Field>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {/* ── Media ───────────────────────────────────────────────── */}
          {activeTab === "media" && (
            <SectionCard title="الشعار والأيقونة" description="رفع شعار الموقع والأيقونة المفضّلة (Favicon)">
              {/* Logo */}
              <div>
                <Label className="mb-2 block">شعار الموقع</Label>
                <div className="flex items-center gap-5">
                  <div className="w-32 h-32 rounded-xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0">
                    {val("site_logo") ? (
                      <img src={imgUrl(val("site_logo"), 256) ?? ""} alt="Logo" className="object-contain w-full h-full" loading="lazy" decoding="async" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload("site_logo", f);
                        e.target.value = "";
                      }}
                    />
                    <Button variant="outline" size="sm" disabled={uploading === "site_logo"}
                      onClick={() => logoRef.current?.click()}>
                      {uploading === "site_logo" ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
                      رفع شعار جديد
                    </Button>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, SVG — حد أقصى 2 MB</p>
                    {val("site_logo") && (
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">{val("site_logo")}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block">الأيقونة المفضّلة (Favicon)</Label>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0">
                    {val("site_favicon") ? (
                      <img src={imgUrl(val("site_favicon"), 128) ?? ""} alt="Favicon" className="object-contain w-full h-full" loading="lazy" decoding="async" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={faviconRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload("site_favicon", f);
                        e.target.value = "";
                      }}
                    />
                    <Button variant="outline" size="sm" disabled={uploading === "site_favicon"}
                      onClick={() => faviconRef.current?.click()}>
                      {uploading === "site_favicon" ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
                      رفع أيقونة جديدة
                    </Button>
                    <p className="text-xs text-muted-foreground">يفضّل 32×32 أو 64×64 بكسل</p>
                  </div>
                </div>
              </div>

              {/* Default share / Open-Graph image */}
              <div className="border-t pt-4">
                <Label className="mb-2 block">صورة المشاركة الافتراضية (OG)</Label>
                <p className="mb-3 text-xs text-muted-foreground">
                  تظهر عند مشاركة روابط الموقع على فيسبوك/تويتر/واتساب للصفحات التي لا تملك صورة خاصة. يُفضّل مقاس 1200×630 بكسل.
                </p>
                <div className="flex items-center gap-5">
                  <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/50">
                    {val("site_og_image") ? (
                      <img src={imgUrl(val("site_og_image"), 320) ?? ""} alt="OG" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={ogImageRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload("site_og_image", f);
                        e.target.value = "";
                      }}
                    />
                    <Button variant="outline" size="sm" disabled={uploading === "site_og_image"}
                      onClick={() => ogImageRef.current?.click()}>
                      {uploading === "site_og_image" ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
                      رفع صورة المشاركة
                    </Button>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP — حد أقصى 2 MB. إن لم تُحدَّد يُستخدم الشعار.</p>
                    {val("site_og_image") && (
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">{val("site_og_image")}</p>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── Email / SMTP ─────────────────────────────────────────── */}
          {activeTab === "email" && (
            <>
              {/* Server mail quick setup */}
              {domain && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-primary" />
                      <CardTitle>إعداد بريد الخادم الداخلي</CardTitle>
                    </div>
                    <CardDescription>
                      إعدادات البريد المستضاف على النطاق{" "}
                      <span className="font-mono font-semibold text-foreground">{domain}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Protocol cards */}
                    <div className="grid sm:grid-cols-3 gap-3">
                      {[
                        { proto: "SMTP", desc: "صادر", port: "465" },
                        { proto: "IMAP", desc: "وارد",  port: "993" },
                        { proto: "POP3", desc: "وارد",  port: "995" },
                      ].map(({ proto, desc, port }) => (
                        <div key={proto} className="p-3 rounded-xl bg-muted/50 border space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary">{proto}</span>
                            <span className="text-xs text-muted-foreground">{desc}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-mono truncate flex-1">{domain}</span>
                            <button onClick={() => copyText(domain, `${proto}-host`)}
                              className="text-muted-foreground hover:text-foreground shrink-0">
                              {copiedField === `${proto}-host`
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold">{port}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">SSL</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Auto-apply */}
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        تطبيق الإعدادات تلقائياً على نموذج SMTP
                      </p>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">اسم الحساب (قبل @)</label>
                          <div className="flex items-center border rounded-lg overflow-hidden bg-background">
                            <input
                              type="text"
                              value={serverMailPrefix}
                              onChange={(e) => setServerMailPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, ""))}
                              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none font-mono"
                              placeholder="noreply"
                              dir="ltr"
                            />
                            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted/60 border-r font-mono shrink-0">
                              @{domain}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" onClick={applyServerMail}>
                          <Zap className="ml-2 h-4 w-4" />
                          تطبيق
                        </Button>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ ستحتاج إلى إدخال كلمة المرور يدوياً من لوحة تحكم الاستضافة (cPanel / Plesk)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SMTP form */}
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات SMTP</CardTitle>
                  <CardDescription>خادم البريد الصادر لإرسال الإشعارات</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {val("mail_host").includes("gmail") && (
                    <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
                      <span className="shrink-0">⚠️</span>
                      <div>
                        <p className="font-medium">Gmail يتطلب كلمة مرور التطبيق</p>
                        <p className="text-xs mt-0.5 opacity-80">
                          كلمة مرور حسابك العادية لن تعمل — يجب إنشاء{" "}
                          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                            كلمة مرور التطبيق
                          </a>{" "}
                          وتفعيل المصادقة الثنائية أولاً.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="خادم SMTP (Host)">
                      <Input dir="ltr" value={val("mail_host")} onChange={(e) => set("mail_host", e.target.value)} placeholder="mail.alemancenter.com" />
                    </Field>
                    <Field label="المنفذ (Port)">
                      <Input dir="ltr" value={val("mail_port", "587")} onChange={(e) => set("mail_port", e.target.value)} placeholder="587" />
                    </Field>
                    <Field label="اسم المستخدم">
                      <Input dir="ltr" value={val("mail_username")} onChange={(e) => set("mail_username", e.target.value)} placeholder="noreply@alemancenter.com" />
                    </Field>
                    <Field label="كلمة المرور">
                      <div className="relative">
                        <Input dir="ltr" type={showPwd.mail ? "text" : "password"} value={val("mail_password")} onChange={(e) => set("mail_password", e.target.value)} placeholder="••••••••" className="pl-10" />
                        <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPwd((p) => ({ ...p, mail: !p.mail }))}>
                          {showPwd.mail ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field label="التشفير">
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" dir="ltr"
                        value={val("mail_encryption", "tls")} onChange={(e) => set("mail_encryption", e.target.value)}>
                        <option value="tls">TLS / STARTTLS (587) — Gmail, Outlook</option>
                        <option value="ssl">SSL / Implicit TLS (465)</option>
                        <option value="">بدون تشفير (25)</option>
                      </select>
                    </Field>
                    <Field label="اسم المرسل">
                      <Input value={val("mail_from_name")} onChange={(e) => set("mail_from_name", e.target.value)} placeholder="مركز العليمان" />
                    </Field>
                    <Field label="بريد المرسل (From Address)" className="sm:col-span-2">
                      <Input dir="ltr" type="email" value={val("mail_from_address")} onChange={(e) => set("mail_from_address", e.target.value)} placeholder="noreply@alemancenter.com" />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {/* Test */}
              <Card>
                <CardHeader>
                  <CardTitle>اختبار الاتصال</CardTitle>
                  <CardDescription>تحقق من إعدادات SMTP قبل الحفظ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" onClick={handleTestSmtp} disabled={isTesting}>
                    {isTesting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Server className="ml-2 h-4 w-4" />}
                    اختبار الاتصال بالخادم
                  </Button>
                  {smtpResult && (
                    <Alert variant={smtpResult.success ? "default" : "destructive"}>
                      {smtpResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      <AlertDescription>{smtpResult.message}</AlertDescription>
                    </Alert>
                  )}
                  <div className="border-t pt-4">
                    <Label className="mb-2 block">إرسال بريد تجريبي</Label>
                    <div className="flex gap-2">
                      <Input dir="ltr" type="email" placeholder="your@email.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="max-w-xs" />
                      <Button variant="outline" onClick={handleSendTestEmail} disabled={isSendingTest || !testEmail}>
                        {isSendingTest ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
                        إرسال
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── SEO ─────────────────────────────────────────────────── */}
          {activeTab === "seo" && (
            <>
              <SectionCard title="بيانات SEO العامة" description="تُستخدم كافتراضي للصفحات التي لا تحدد قيماً خاصة">
                <Field label="عنوان الصفحة الرئيسية (Meta Title)">
                  <Input value={val("meta_title")} onChange={(e) => set("meta_title", e.target.value)} placeholder="مركز العليمان للتعليم" />
                </Field>
                <Field label="الوصف التعريفي (Meta Description)" hint="150–160 حرف مثالي">
                  <Textarea value={val("meta_description")} onChange={(e) => set("meta_description", e.target.value)} placeholder="وصف الموقع لمحركات البحث..." rows={3} />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="الكلمات المفتاحية" hint="مفصولة بفواصل">
                    <Input value={val("meta_keywords")} onChange={(e) => set("meta_keywords", e.target.value)} placeholder="تعليم، مناهج، أردن" />
                  </Field>
                  <Field label="رابط Canonical">
                    <Input dir="ltr" value={val("canonical_url")} onChange={(e) => set("canonical_url", e.target.value)} placeholder="https://alemancenter.com" />
                  </Field>
                  <Field label="Google Analytics (G-XXXXXXXX)">
                    <Input dir="ltr" value={val("google_analytics_id")} onChange={(e) => set("google_analytics_id", e.target.value)} placeholder="G-XXXXXXXXXX" />
                  </Field>
                  <Field label="Facebook Pixel ID">
                    <Input dir="ltr" value={val("facebook_pixel_id")} onChange={(e) => set("facebook_pixel_id", e.target.value)} placeholder="1234567890" />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard
                title="ملف robots.txt"
                description="التحكم في ما يسمح لمحركات البحث بفهرسته"
                action={
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      await adminSettingsApi.updateRobots(val("robots_txt", "User-agent: *\nAllow: /"), { country });
                      toast({ title: "تم تحديث robots.txt بنجاح" });
                    } catch (e: any) {
                      toast({ title: "فشل التحديث", description: e.message, variant: "destructive" });
                    }
                  }}>
                    <Globe className="ml-2 h-4 w-4" />
                    تحديث
                  </Button>
                }
              >
                <Textarea dir="ltr" className="font-mono text-xs" rows={8}
                  value={val("robots_txt", "User-agent: *\nAllow: /")}
                  onChange={(e) => set("robots_txt", e.target.value)} />
              </SectionCard>
            </>
          )}

          {/* ── Ads ─────────────────────────────────────────────────── */}
          {activeTab === "ads" && (
            <>
              <SectionCard title="Google AdSense" description="أدخل معرّف الحساب — يُستخدم في جميع الإعلانات تلقائياً">
                <Field label="معرّف AdSense Client" hint="مثال: ca-pub-1234567890123456">
                  <Input dir="ltr" value={val("adsense_client")} onChange={(e) => set("adsense_client", e.target.value)} placeholder="ca-pub-xxxxxxxxxxxxxxxx" />
                </Field>
              </SectionCard>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>إعلانات سطح المكتب</CardTitle>
                  </div>
                  <CardDescription>أدخل رقم Ad Slot فقط (مثال: 1234567890)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid lg:grid-cols-2 gap-4">
                    {[
                      { key: "google_ads_desktop_home",        label: "الصفحة الرئيسية (1)" },
                      { key: "google_ads_desktop_home_2",      label: "الصفحة الرئيسية (2)" },
                      { key: "google_ads_desktop_classes",     label: "صفحة الأقسام (1)" },
                      { key: "google_ads_desktop_classes_2",   label: "صفحة الأقسام (2)" },
                      { key: "google_ads_desktop_subject",     label: "صفحة المادة (1)" },
                      { key: "google_ads_desktop_subject_2",   label: "صفحة المادة (2)" },
                      { key: "google_ads_desktop_article",     label: "المقال (1)" },
                      { key: "google_ads_desktop_article_2",   label: "المقال (2)" },
                      { key: "google_ads_desktop_news",        label: "الأخبار (1)" },
                      { key: "google_ads_desktop_news_2",      label: "الأخبار (2)" },
                      { key: "google_ads_desktop_download",    label: "التحميل (1)" },
                      { key: "google_ads_desktop_download_2",  label: "التحميل (2)" },
                    ].map(({ key, label }) => (
                      <Field key={key} label={label}>
                        <Input dir="ltr" value={val(key)} onChange={(e) => set(key, e.target.value)} placeholder="1234567890" />
                      </Field>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>إعلانات الجوال</CardTitle>
                  </div>
                  <CardDescription>أدخل رقم Ad Slot فقط (مثال: 1234567890)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid lg:grid-cols-2 gap-4">
                    {[
                      { key: "google_ads_mobile_home",        label: "الصفحة الرئيسية (1)" },
                      { key: "google_ads_mobile_home_2",      label: "الصفحة الرئيسية (2)" },
                      { key: "google_ads_mobile_classes",     label: "صفحة الأقسام (1)" },
                      { key: "google_ads_mobile_classes_2",   label: "صفحة الأقسام (2)" },
                      { key: "google_ads_mobile_subject",     label: "صفحة المادة (1)" },
                      { key: "google_ads_mobile_subject_2",   label: "صفحة المادة (2)" },
                      { key: "google_ads_mobile_article",     label: "المقال (1)" },
                      { key: "google_ads_mobile_article_2",   label: "المقال (2)" },
                      { key: "google_ads_mobile_news",        label: "الأخبار (1)" },
                      { key: "google_ads_mobile_news_2",      label: "الأخبار (2)" },
                      { key: "google_ads_mobile_download",    label: "التحميل (1)" },
                      { key: "google_ads_mobile_download_2",  label: "التحميل (2)" },
                    ].map(({ key, label }) => (
                      <Field key={key} label={label}>
                        <Input dir="ltr" value={val(key)} onChange={(e) => set(key, e.target.value)} placeholder="1234567890" />
                      </Field>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Downloads ───────────────────────────────────────────── */}
          {activeTab === "downloads" && (
            <SectionCard title="إعدادات التحميل" description="تحكّم في طريقة وصول الزوّار إلى الملفات القابلة للتحميل">
              <ToggleSwitch
                enabled={val("require_login_for_download") !== "false"}
                onToggle={() => set("require_login_for_download", val("require_login_for_download") !== "false" ? "false" : "true")}
                label="طلب تسجيل الدخول قبل التحميل"
                description="عند التفعيل يجب على الزائر تسجيل الدخول وتأكيد البريد قبل تحميل أي ملف. عند إيقافه يصبح التحميل متاحاً للجميع مباشرةً."
              />
              <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                <span className="shrink-0">ℹ️</span>
                <p>لا تنسَ الضغط على «حفظ التغييرات» في أعلى الصفحة لتطبيق هذا الخيار على الموقع.</p>
              </div>
            </SectionCard>
          )}

          {/* ── Security ─────────────────────────────────────────────── */}
          {activeTab === "security" && (
            <>
              <SectionCard title="Google reCAPTCHA" description="حماية النماذج من الروبوتات">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Site Key (المفتاح العام)">
                    <Input dir="ltr" value={val("recaptcha_site_key")} onChange={(e) => set("recaptcha_site_key", e.target.value)} placeholder="6Lc..." />
                  </Field>
                  <Field label="Secret Key (المفتاح السري)">
                    <div className="relative">
                      <Input dir="ltr" type={showPwd.rcaptcha ? "text" : "password"} value={val("recaptcha_secret_key")} onChange={(e) => set("recaptcha_secret_key", e.target.value)} placeholder="6Lc..." className="pl-10" />
                      <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPwd((p) => ({ ...p, rcaptcha: !p.rcaptcha }))}>
                        {showPwd.rcaptcha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                </div>
              </SectionCard>

              <Card>
                <CardHeader>
                  <CardTitle>Google OAuth</CardTitle>
                  <CardDescription>تسجيل الدخول عبر حساب Google</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoBox>
                    <p className="font-medium">كيفية الحصول على بيانات Google OAuth</p>
                    <ol className="text-xs mt-1 opacity-80 list-decimal list-inside space-y-0.5">
                      <li>افتح <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                      <li>APIs &amp; Services → Credentials → Create OAuth 2.0 Client</li>
                      <li>أضف Redirect URI: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded font-mono">{val("google_redirect_uri") || "https://alemancenter.com/api/auth/google/callback"}</code></li>
                    </ol>
                  </InfoBox>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Client ID">
                      <Input dir="ltr" value={val("google_client_id")} onChange={(e) => set("google_client_id", e.target.value)} placeholder="xxxxx.apps.googleusercontent.com" />
                    </Field>
                    <Field label="Client Secret">
                      <div className="relative">
                        <Input dir="ltr" type={showPwd.google ? "text" : "password"} value={val("google_client_secret")} onChange={(e) => set("google_client_secret", e.target.value)} placeholder="GOCSPX-..." className="pl-10" />
                        <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPwd((p) => ({ ...p, google: !p.google }))}>
                          {showPwd.google ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field label="Redirect URI" className="sm:col-span-2" hint="يجب إضافته في Google Cloud Console">
                      <Input dir="ltr" value={val("google_redirect_uri")} onChange={(e) => set("google_redirect_uri", e.target.value)} placeholder="https://alemancenter.com/api/auth/google/callback" />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Facebook / Instagram OAuth</CardTitle>
                  <CardDescription>تسجيل الدخول عبر حساب Facebook</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoBox>
                    <p className="font-medium">كيفية الحصول على بيانات Facebook OAuth</p>
                    <ol className="text-xs mt-1 opacity-80 list-decimal list-inside space-y-0.5">
                      <li>افتح <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline">Facebook for Developers</a></li>
                      <li>أنشئ تطبيقاً من نوع "Consumer" وأضف منتج "Facebook Login"</li>
                      <li>أضف Redirect URI: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded font-mono">{val("facebook_redirect_uri") || "https://alemancenter.com/api/auth/facebook/callback"}</code></li>
                    </ol>
                  </InfoBox>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="App ID">
                      <Input dir="ltr" value={val("facebook_app_id")} onChange={(e) => set("facebook_app_id", e.target.value)} placeholder="1234567890" />
                    </Field>
                    <Field label="App Secret">
                      <div className="relative">
                        <Input dir="ltr" type={showPwd.fb ? "text" : "password"} value={val("facebook_app_secret")} onChange={(e) => set("facebook_app_secret", e.target.value)} placeholder="abc123..." className="pl-10" />
                        <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPwd((p) => ({ ...p, fb: !p.fb }))}>
                          {showPwd.fb ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field label="Redirect URI" className="sm:col-span-2" hint="يجب إضافته في Meta for Developers">
                      <Input dir="ltr" value={val("facebook_redirect_uri")} onChange={(e) => set("facebook_redirect_uri", e.target.value)} placeholder="https://alemancenter.com/api/auth/facebook/callback" />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Appearance ───────────────────────────────────────────── */}
          {activeTab === "appearance" && (
            <SectionCard title="المظهر والألوان" description="تخصيص الهوية البصرية للموقع">
              <div>
                <Label className="mb-3 block">اللون الأساسي للموقع</Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { color: "#696cff", name: "بنفسجي (افتراضي)" },
                    { color: "#0891b2", name: "تيل" },
                    { color: "#7c3aed", name: "بنفسجي غامق" },
                    { color: "#22c55e", name: "أخضر" },
                    { color: "#f59e0b", name: "ذهبي" },
                    { color: "#ef4444", name: "أحمر" },
                    { color: "#ec4899", name: "وردي" },
                    { color: "#06b6d4", name: "سماوي" },
                  ].map(({ color, name }) => (
                    <button
                      key={color}
                      title={name}
                      onClick={() => set("primary_color", color)}
                      className={cn(
                        "w-10 h-10 rounded-full border-4 transition-transform hover:scale-110",
                        val("primary_color") === color
                          ? "border-foreground scale-110 shadow-md"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {/* Custom */}
                  <label className="flex items-center gap-2 cursor-pointer" title="لون مخصص">
                    <input
                      type="color"
                      value={val("primary_color", "#696cff")}
                      onChange={(e) => set("primary_color", e.target.value)}
                      className="w-10 h-10 rounded-full border-4 border-dashed border-muted-foreground cursor-pointer p-0.5 bg-transparent"
                    />
                    <span className="text-sm text-muted-foreground">مخصص</span>
                  </label>
                </div>
                {val("primary_color") && (
                  <p className="mt-2 text-xs text-muted-foreground font-mono">
                    اللون المحدد: {val("primary_color")}
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <Label className="mb-3 block">اللون الثانوي</Label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="color"
                    value={val("secondary_color", "#8592a3")}
                    onChange={(e) => set("secondary_color", e.target.value)}
                    className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer p-1 bg-transparent"
                  />
                  <div>
                    <p className="text-sm">{val("secondary_color", "#8592a3")}</p>
                    <p className="text-xs text-muted-foreground">يُستخدم في العناصر الثانوية والحدود</p>
                  </div>
                </label>
              </div>
            </SectionCard>
          )}

          {/* ── Email Bounce ─────────────────────────────────────────── */}
          {activeTab === "bounce" && <EmailBounceTab toast={toast} />}

          {/* ── Email Verification ───────────────────────────────────── */}
          {activeTab === "verification" && <EmailVerificationTab toast={toast} />}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Bounce Sub-tab
// ─────────────────────────────────────────────────────────────────────────────

function EmailBounceTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const qc = useQueryClient();
  const country = useCountry();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // IMAP config state
  const [cfg, setCfg] = useState({
    mail_bounce_address: "",
    bounce_imap_host: "",
    bounce_imap_port: "993",
    bounce_imap_username: "",
    bounce_imap_password: "",
  });
  const [cfgSaving, setCfgSaving] = useState(false);

  const { data: rawSettings } = useQuery({
    queryKey: ["admin", "settings", country],
    queryFn: () => adminSettingsApi.getAll({ country }),
  });

  useEffect(() => {
    if (rawSettings) {
      const s = rawSettings as Record<string, string>;
      setCfg({
        mail_bounce_address:  s.mail_bounce_address  ?? "",
        bounce_imap_host:     s.bounce_imap_host     ?? "",
        bounce_imap_port:     s.bounce_imap_port     ?? "993",
        bounce_imap_username: s.bounce_imap_username ?? "",
        bounce_imap_password: s.bounce_imap_password ?? "",
      });
    }
  }, [rawSettings]);

  const { data: stats } = useQuery({
    queryKey: ["admin", "bounce-stats"],
    queryFn: () => adminEmailBounceApi.stats(),
  });

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["admin", "bounce-events", page, search, typeFilter],
    queryFn: () =>
      adminEmailBounceApi.listEvents({
        page, per_page: 25,
        ...(search && { email: search }),
        ...(typeFilter && { bounce_type: typeFilter }),
      }),
  });

  const events: any[] = (eventsData as any)?.data ?? [];
  const pagination: any = (eventsData as any)?.pagination ?? {};
  const lastPage = pagination?.last_page ?? 1;
  const total = pagination?.total ?? 0;

  const allSelected = events.length > 0 && events.every((e) => selected.includes(e.email));

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["admin", "bounce-events"] });
    qc.invalidateQueries({ queryKey: ["admin", "bounce-stats"] });
  };

  const runAction = async (fn: () => Promise<any>, successMsg: string) => {
    setActionLoading(true);
    try {
      const res = await fn();
      const extra = res?.updated ? ` (${res.updated})` : "";
      toast({ title: successMsg + extra });
      setSelected([]);
      refetch();
    } catch (e: any) {
      toast({ title: "فشلت العملية", description: e.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const saveCfg = async () => {
    setCfgSaving(true);
    try {
      await adminSettingsApi.update(cfg, { country });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast({ title: "تم حفظ إعدادات صندوق الارتداد" });
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    } finally { setCfgSaving(false); }
  };

  const countByStatus = (status: string) =>
    (stats as any)?.user_statuses?.find((s: any) => s.status === status)?.count ?? 0;

  const bounceLabels: Record<string, string> = {
    hard_bounce: "ارتداد دائم",
    soft_bounce: "ارتداد مؤقت",
    unknown: "غير محدد",
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "ارتداد دائم",    value: countByStatus("hard_bounce"), color: "text-red-600" },
          { label: "ارتداد مؤقت",   value: countByStatus("soft_bounce"), color: "text-yellow-600" },
          { label: "نشط",            value: countByStatus("active"),      color: "text-green-600" },
          { label: "إجمالي الأحداث", value: (stats as any)?.total_events ?? 0, color: "" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value.toLocaleString("ar-EG")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Events table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>سجل أحداث الارتداد</CardTitle>
            <CardDescription className="mt-0.5">إجمالي {total.toLocaleString("ar-EG")} حدث</CardDescription>
          </div>
          <Button variant="outline" size="sm"
            onClick={() => runAction(() => adminEmailBounceApi.processNow(), "تمت معالجة صندوق الارتداد")}
            disabled={actionLoading}>
            <Zap className="ml-2 h-4 w-4" />
            معالجة الآن
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="بحث بالبريد الإلكتروني..." className="pr-9" dir="ltr" />
            </div>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">كل الأنواع</option>
              <option value="hard_bounce">ارتداد دائم</option>
              <option value="soft_bounce">ارتداد مؤقت</option>
              <option value="unknown">غير محدد</option>
            </select>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="ml-2 h-4 w-4" />
              تحديث
            </Button>
          </div>

          {/* Bulk actions */}
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 px-4 py-2 border border-blue-200">
              <span className="text-sm font-medium">{selected.length} محدد</span>
              <Button size="sm" variant="outline" disabled={actionLoading}
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => runAction(() => adminEmailBounceApi.markStatus(selected, "hard_bounce"), "تم تعليم ارتداد دائم")}>
                <XCircle className="h-3.5 w-3.5 ml-1" /> دائم
              </Button>
              <Button size="sm" variant="outline" disabled={actionLoading}
                className="border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                onClick={() => runAction(() => adminEmailBounceApi.markStatus(selected, "soft_bounce"), "تم تعليم ارتداد مؤقت")}>
                <AlertTriangle className="h-3.5 w-3.5 ml-1" /> مؤقت
              </Button>
              <Button size="sm" variant="outline" disabled={actionLoading}
                className="border-green-200 text-green-700 hover:bg-green-50"
                onClick={() => runAction(() => adminEmailBounceApi.resetStatus(selected), "تمت إعادة التعيين")}>
                <RotateCcw className="h-3.5 w-3.5 ml-1" /> إعادة تعيين
              </Button>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="h-32 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : events.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">لا توجد أحداث ارتداد مسجّلة</div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allSelected} onCheckedChange={() => setSelected(allSelected ? [] : events.map((e) => e.email))} />
                    </TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>كود SMTP</TableHead>
                    <TableHead className="max-w-[180px]">التشخيص</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id} className={selected.includes(event.email) ? "bg-blue-50/50" : ""}>
                      <TableCell>
                        <Checkbox checked={selected.includes(event.email)}
                          onCheckedChange={() => setSelected((prev) =>
                            prev.includes(event.email) ? prev.filter((e) => e !== event.email) : [...prev, event.email]
                          )} />
                      </TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{event.email}</TableCell>
                      <TableCell>
                        <Badge variant={event.bounce_type === "hard_bounce" ? "destructive" : "outline"}>
                          {bounceLabels[event.bounce_type] ?? event.bounce_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{event.smtp_status || "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={event.diagnostic_code}>{event.diagnostic_code || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground" dir="ltr">
                        {event.created_at ? new Date(event.created_at).toLocaleString("ar-EG") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {lastPage > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>إجمالي النتائج: {total.toLocaleString("ar-EG")}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
                <span className="px-2 py-1">{page} / {lastPage}</span>
                <Button size="sm" variant="outline" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>التالي</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IMAP Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <CardTitle>إعدادات صندوق الارتداد (IMAP)</CardTitle>
          </div>
          <CardDescription>يقرأ النظام هذا الصندوق تلقائياً لرصد رسائل الارتداد</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>عنوان صندوق الارتداد (MAIL_BOUNCE_ADDRESS)</Label>
              <Input dir="ltr" value={cfg.mail_bounce_address}
                onChange={(e) => setCfg((p) => ({ ...p, mail_bounce_address: e.target.value }))}
                placeholder="bounce@alemancenter.com" />
            </div>
            <div className="space-y-1.5">
              <Label>خادم IMAP (BOUNCE_IMAP_HOST)</Label>
              <Input dir="ltr" value={cfg.bounce_imap_host}
                onChange={(e) => setCfg((p) => ({ ...p, bounce_imap_host: e.target.value }))}
                placeholder="mail.alemancenter.com" />
            </div>
            <div className="space-y-1.5">
              <Label>المنفذ (BOUNCE_IMAP_PORT)</Label>
              <Input dir="ltr" value={cfg.bounce_imap_port}
                onChange={(e) => setCfg((p) => ({ ...p, bounce_imap_port: e.target.value }))}
                placeholder="993" />
            </div>
            <div className="space-y-1.5">
              <Label>اسم المستخدم (BOUNCE_IMAP_USERNAME)</Label>
              <Input dir="ltr" value={cfg.bounce_imap_username}
                onChange={(e) => setCfg((p) => ({ ...p, bounce_imap_username: e.target.value }))}
                placeholder="bounce@alemancenter.com" />
            </div>
            <div className="space-y-1.5">
              <Label>كلمة المرور (BOUNCE_IMAP_PASSWORD)</Label>
              <Input dir="ltr" type="password" value={cfg.bounce_imap_password}
                onChange={(e) => setCfg((p) => ({ ...p, bounce_imap_password: e.target.value }))}
                placeholder="••••••••" />
            </div>
          </div>
          <Button onClick={saveCfg} disabled={cfgSaving}>
            {cfgSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            حفظ إعدادات IMAP
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Verification Sub-tab
// ─────────────────────────────────────────────────────────────────────────────

function EmailVerificationTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [only, setOnly] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["admin", "verification-stats"],
    queryFn: () => adminEmailVerificationApi.stats(),
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ["admin", "verification-users", page, search, emailStatus, only],
    queryFn: () =>
      adminEmailVerificationApi.list({
        page, per_page: 25,
        ...(search && { search }),
        ...(emailStatus && { email_status: emailStatus }),
        ...(only && { only }),
      }),
  });

  const users: any[] = (listData as any)?.data ?? [];
  const pagination: any = (listData as any)?.pagination ?? {};
  const lastPage = pagination?.last_page ?? 1;
  const total = pagination?.total ?? 0;

  const allSelected = users.length > 0 && users.every((u) => selected.includes(u.id));

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["admin", "verification-users"] });
    qc.invalidateQueries({ queryKey: ["admin", "verification-stats"] });
  };

  const runAction = async (fn: () => Promise<any>, successMsg: string) => {
    setActionLoading(true);
    try {
      const res = await fn();
      const extra = res?.sent ? ` (${res.sent} مرسل)` : res?.deleted ? ` (${res.deleted} محذوف)` : "";
      toast({ title: successMsg + extra });
      setSelected([]);
      refetch();
    } catch (e: any) {
      toast({ title: "فشلت العملية", description: e.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  useEffect(() => { setPage(1); }, [search, emailStatus, only]);

  const statusLabels: Record<string, string> = {
    pending:       "بانتظار الفحص",
    deliverable:   "قابل للإرسال",
    invalid_format:"صيغة خاطئة",
    no_mx:         "دومين لا يستقبل",
    send_failed:   "فشل الإرسال",
    bounced:       "مرتد",
    manual_invalid:"غير صالح يدويًا",
  };

  const statusVariant = (s: string): "default" | "destructive" | "outline" | "secondary" =>
    s === "deliverable" ? "default"
    : ["invalid_format", "no_mx", "bounced", "manual_invalid"].includes(s) ? "destructive"
    : "outline";

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      review_delete: "مراجعة ثم حذف",
      review_smtp_or_mark_invalid: "راجع SMTP أو علّم غير صالح",
      review_delete_or_disable: "لم يؤكد بعد 3 رسائل",
      send_reminder: "إرسال تذكير",
    };
    return map[action] ?? action ?? "—";
  };

  const s = stats as any;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "غير مؤكدين",       value: s?.unverified ?? 0,                           color: "" },
          { label: "جاهزون للتذكير",   value: s?.ready_for_reminder ?? 0,                   color: "text-blue-600" },
          { label: "أرسلنا 3 رسائل",   value: s?.exhausted ?? 0,                            color: "text-yellow-600" },
          { label: "غير صالحة / مرتدة",value: (s?.invalid ?? 0) + (s?.bounced ?? 0),        color: "text-red-600" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn("text-2xl font-bold mt-1", item.color)}>{(item.value as number).toLocaleString("ar-EG")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>المستخدمون غير المؤكدين</CardTitle>
            <CardDescription className="mt-0.5">إجمالي {total.toLocaleString("ar-EG")} مستخدم</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refetch} disabled={isLoading}>
              <RefreshCw className={cn("ml-2 h-4 w-4", isLoading && "animate-spin")} />
              تحديث
            </Button>
            <Button size="sm" disabled={actionLoading}
              onClick={() => runAction(() => adminEmailVerificationApi.sendReminders({ limit: 100 }), "تمت معالجة التذكيرات")}>
              <Send className="ml-2 h-4 w-4" />
              إرسال الجاهزين
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_160px_auto] gap-3 mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو البريد" className="pr-9" />
            </div>
            <select value={emailStatus} onChange={(e) => setEmailStatus(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">كل الحالات</option>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={only} onChange={(e) => setOnly(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">كل غير المؤكدين</option>
              <option value="ready">جاهزون للتذكير</option>
              <option value="exhausted">أرسلنا 3 رسائل</option>
              <option value="invalid">غير صالح أو مرتد</option>
            </select>
          </div>

          {/* Delete filtered */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3 mb-4">
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">حذف جماعي حسب الفلتر الحالي</p>
              <p className="text-xs text-red-700 dark:text-red-400">يحذف كل الحسابات المطابقة للفلاتر الحالية ({total.toLocaleString("ar-EG")} نتيجة)</p>
            </div>
            <Button size="sm" variant="destructive" disabled={actionLoading || total <= 0}
              onClick={() => {
                const typed = window.prompt(`سيتم حذف ${total} حساب. اكتب DELETE للتأكيد.`);
                if (typed !== "DELETE") return;
                runAction(
                  () => adminEmailVerificationApi.deleteFiltered({ search, email_status: emailStatus, only }),
                  "تم الحذف الجماعي"
                );
              }}>
              <Trash2 className="ml-2 h-4 w-4" />
              حذف كل النتائج
            </Button>
          </div>

          {/* Bulk actions */}
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4 rounded-lg border bg-muted/40 px-4 py-2">
              <span className="text-sm font-medium">المحدد: {selected.length}</span>
              <Button size="sm" disabled={actionLoading}
                onClick={() => runAction(() => adminEmailVerificationApi.sendReminders({ user_ids: selected, force: true }), "تم إرسال التذكيرات للمحدد")}>
                <Send className="h-3.5 w-3.5 ml-1" /> إرسال
              </Button>
              <Button size="sm" variant="outline" disabled={actionLoading}
                onClick={() => runAction(() => adminEmailVerificationApi.markInvalid(selected), "تم التعليم كغير صالح")}>
                <XCircle className="h-3.5 w-3.5 ml-1" /> غير صالح
              </Button>
              <Button size="sm" variant="outline" disabled={actionLoading}
                onClick={() => runAction(() => adminEmailVerificationApi.clearStatus(selected), "تمت إعادة الحالة")}>
                <RotateCcw className="h-3.5 w-3.5 ml-1" /> إعادة الحالة
              </Button>
              <Button size="sm" variant="destructive" disabled={actionLoading}
                onClick={() => {
                  if (!window.confirm(`حذف ${selected.length} مستخدم؟`)) return;
                  runAction(() => adminEmailVerificationApi.deleteUsers(selected), "تم الحذف");
                }}>
                <Trash2 className="h-3.5 w-3.5 ml-1" /> حذف
              </Button>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="h-32 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : users.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">لا توجد نتائج مطابقة</div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allSelected}
                        onCheckedChange={() => setSelected(allSelected ? [] : users.map((u) => u.id))} />
                    </TableHead>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>حالة البريد</TableHead>
                    <TableHead>التذكيرات</TableHead>
                    <TableHead>آخر إرسال</TableHead>
                    <TableHead>الإجراء المقترح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={selected.includes(user.id) ? "bg-blue-50/50" : ""}>
                      <TableCell>
                        <Checkbox checked={selected.includes(user.id)}
                          onCheckedChange={() => setSelected((prev) =>
                            prev.includes(user.id) ? prev.filter((i) => i !== user.id) : [...prev, user.id]
                          )} />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(user.email_status)}>
                          {statusLabels[user.email_status] ?? user.email_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.reminder_count ?? 0} / 3</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.last_reminder_sent_at ? new Date(user.last_reminder_sent_at).toLocaleString("ar-EG") : "لم يرسل"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{actionLabel(user.recommended_action)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {lastPage > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>إجمالي النتائج: {total.toLocaleString("ar-EG")}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>السابق</Button>
                <span className="px-2 py-1">{page} / {lastPage}</span>
                <Button size="sm" variant="outline" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>التالي</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
