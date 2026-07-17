import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  Briefcase,
  Camera,
  CheckCircle2,
  Globe2,
  IdCard,
  Lock,
  type LucideIcon,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { FaFacebookF, FaGithub, FaInstagram, FaLinkedinIn, FaTwitter } from "react-icons/fa";
import type { IconType } from "react-icons";
import { Redirect, useLocation } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api/auth";
import type { User } from "@/lib/api/types";
import { imgUrl } from "@/lib/img-url";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type SocialKey = "facebook" | "twitter" | "linkedin" | "instagram" | "github";

type ProfileForm = {
  name: string;
  phone: string;
  job_title: string;
  gender: string;
  country: string;
  bio: string;
  social_links: Record<SocialKey, string>;
};

const EMPTY_SOCIAL_LINKS: Record<SocialKey, string> = {
  facebook: "",
  twitter: "",
  linkedin: "",
  instagram: "",
  github: "",
};

const COUNTRY_OPTIONS = [
  { value: "jo", aliases: ["1", "الأردن"], label: "الأردن" },
  { value: "sa", aliases: ["2", "السعودية"], label: "السعودية" },
  { value: "eg", aliases: ["3", "مصر"], label: "مصر" },
  { value: "ps", aliases: ["4", "فلسطين"], label: "فلسطين" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
  { value: "other", label: "آخر" },
];

const SOCIAL_FIELDS: Array<{
  key: SocialKey;
  label: string;
  placeholder: string;
  icon: IconType;
}> = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/username", icon: FaFacebookF },
  { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/username", icon: FaTwitter },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/username", icon: FaLinkedinIn },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/username", icon: FaInstagram },
  { key: "github", label: "GitHub", placeholder: "https://github.com/username", icon: FaGithub },
];

const EMPTY_VALUE = "__empty__";

function normalizeCountry(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return COUNTRY_OPTIONS.find((item) => item.value === raw || item.aliases.includes(raw))?.value ?? raw;
}

function countryLabel(value?: string | null) {
  const normalized = normalizeCountry(value);
  return COUNTRY_OPTIONS.find((item) => item.value === normalized)?.label ?? (normalized || "-");
}

function genderLabel(value?: string | null) {
  return GENDER_OPTIONS.find((item) => item.value === value)?.label ?? "غير محدد";
}

function parseSocialLinks(value: User["social_links"]): Record<SocialKey, string> {
  if (!value) return { ...EMPTY_SOCIAL_LINKS };

  if (typeof value === "string") {
    try {
      return parseSocialLinks(JSON.parse(value));
    } catch {
      return { ...EMPTY_SOCIAL_LINKS };
    }
  }

  return {
    ...EMPTY_SOCIAL_LINKS,
    facebook: typeof value.facebook === "string" ? value.facebook : "",
    twitter: typeof value.twitter === "string" ? value.twitter : "",
    linkedin: typeof value.linkedin === "string" ? value.linkedin : "",
    instagram: typeof value.instagram === "string" ? value.instagram : "",
    github: typeof value.github === "string" ? value.github : "",
  };
}

function formFromUser(user: User | null): ProfileForm {
  return {
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    job_title: user?.job_title ?? "",
    gender: user?.gender ?? "",
    country: normalizeCountry(user?.country),
    bio: user?.bio ?? "",
    social_links: parseSocialLinks(user?.social_links),
  };
}

function photoSrc(user: User | null, preview: string | null) {
  if (preview) return preview;
  if (user?.profile_photo_url) return user.profile_photo_url;
  return imgUrl(user?.profile_photo_path, 180);
}

function isSafeUrl(value: string) {
  const trimmed = value.trim();
  return !trimmed || /^https?:\/\//i.test(trimmed);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ar-JO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function primaryRole(user: User | null) {
  return user?.roles?.[0]?.name ?? "عضو";
}

function isOnline(user: User | null) {
  const raw = user?.last_activity ?? user?.last_seen;
  if (!raw) return false;
  const date = new Date(raw);
  return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() < 5 * 60 * 1000;
}

function buildProfileFormData(form: ProfileForm, photoFile: File | null) {
  const data = new FormData();
  data.set("name", form.name.trim());
  data.set("phone", form.phone.trim());
  data.set("job_title", form.job_title.trim());
  data.set("gender", form.gender);
  data.set("country", form.country);
  data.set("bio", form.bio.trim());
  data.set("social_links", JSON.stringify(form.social_links));
  if (photoFile) data.set("profile_photo", photoFile);
  return data;
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function Profile() {
  const { user, refreshUser, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileForm>(() => formFromUser(user));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setForm(formFromUser(user));
    setNewEmail(user?.email ?? "");
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const verified = Boolean(user?.email_verified_at);
  const online = isOnline(user);
  const currentPhoto = photoSrc(user, previewUrl);

  const completion = useMemo(() => {
    const checks = [
      Boolean(form.name.trim()),
      Boolean(form.phone.trim()),
      Boolean(form.job_title.trim()),
      Boolean(form.country),
      Boolean(form.gender),
      Boolean(form.bio.trim()),
      Boolean(currentPhoto),
      Object.values(form.social_links).some((value) => Boolean(value.trim())),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [currentPhoto, form]);

  if (isAuthLoading) return null;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!user) return null;

  const setField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setSocialField = (field: SocialKey, value: string) => {
    setForm((current) => ({
      ...current,
      social_links: { ...current.social_links, [field]: value },
    }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "صيغة الصورة غير مدعومة",
        description: "استخدم صورة بصيغة JPG أو PNG أو WEBP أو GIF.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "الصورة كبيرة",
        description: "حجم الصورة يجب ألا يتجاوز 2 ميجابايت.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      toast({ title: "الاسم مطلوب", description: "اكتب الاسم الكامل قبل الحفظ.", variant: "destructive" });
      return;
    }

    const invalidLink = SOCIAL_FIELDS.find((item) => !isSafeUrl(form.social_links[item.key]));
    if (invalidLink) {
      toast({
        title: "رابط غير صحيح",
        description: `رابط ${invalidLink.label} يجب أن يبدأ بـ http:// أو https://.`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await authApi.updateProfile(buildProfileFormData(form, photoFile));
      await refreshUser();
      setPhotoFile(null);
      toast({ title: "تم حفظ الملف الشخصي بنجاح" });
    } catch (error) {
      toast({
        title: "تعذر حفظ الملف الشخصي",
        description: extractErrorMessage(error, "راجع البيانات وحاول مرة أخرى."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const reloadProfile = async () => {
    setIsReloading(true);
    try {
      await refreshUser();
      setPhotoFile(null);
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      toast({ title: "تم تحديث البيانات" });
    } finally {
      setIsReloading(false);
    }
  };

  const resendVerification = async () => {
    setIsResendingVerification(true);
    try {
      await authApi.resendVerification();
      toast({ title: "تم إرسال رسالة التفعيل" });
    } catch (error) {
      toast({
        title: "تعذر إرسال رسالة التفعيل",
        description: extractErrorMessage(error, "حاول مرة أخرى بعد قليل."),
        variant: "destructive",
      });
    } finally {
      setIsResendingVerification(false);
    }
  };

  const changeEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || email === user.email) return;

    setIsChangingEmail(true);
    try {
      await authApi.changeUnverifiedEmail(email);
      await refreshUser();
      toast({ title: "تم تحديث البريد وإرسال رسالة التفعيل" });
    } catch (error) {
      toast({
        title: "تعذر تحديث البريد",
        description: extractErrorMessage(error, "تأكد من صحة البريد أو جرّب بريدًا آخر."),
        variant: "destructive",
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const sendPasswordReset = async () => {
    setIsSendingReset(true);
    try {
      await authApi.forgotPassword(user.email);
      toast({ title: "تم إرسال رابط إعادة تعيين كلمة المرور" });
    } catch (error) {
      toast({
        title: "تعذر إرسال رابط إعادة التعيين",
        description: extractErrorMessage(error, "حاول مرة أخرى لاحقًا."),
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const deleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast({ title: "كلمة المرور مطلوبة", variant: "destructive" });
      return;
    }

    setIsDeleting(true);
    try {
      await authApi.deleteAccount(deletePassword);
      await logout();
      setDeleteDialogOpen(false);
      navigate("/login");
    } catch (error) {
      toast({
        title: "تعذر حذف الحساب",
        description: extractErrorMessage(error, "تأكد من كلمة المرور وحاول مرة أخرى."),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <section className="rounded-lg border bg-card p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative w-fit">
                <Avatar className="h-24 w-24 rounded-lg border sm:h-28 sm:w-28">
                  {currentPhoto ? <AvatarImage src={currentPhoto} alt={user.name} className="object-cover" /> : null}
                  <AvatarFallback className="rounded-lg text-3xl font-black">
                    {user.name.trim().charAt(0) || "ع"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  className="absolute -bottom-2 -left-2 h-10 w-10 rounded-md shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="تغيير الصورة الشخصية"
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <span
                  className={cn(
                    "absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-card",
                    online ? "bg-emerald-500" : "bg-muted-foreground",
                  )}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                    {user.name || "الملف الشخصي"}
                  </h1>
                  <Badge variant={verified ? "default" : "outline"} className="gap-1">
                    {verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {verified ? "بريد موثق" : "غير موثق"}
                  </Badge>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                  إدارة بيانات العضو، الصورة الشخصية، معلومات التواصل، الروابط العامة، وخيارات الأمان المتاحة من الباك اند.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill icon={ShieldCheck} label={user.status === "active" ? "الحساب فعال" : user.status} />
                  <StatusPill icon={UserRound} label={primaryRole(user)} />
                  <StatusPill icon={Activity} label={online ? "متصل الآن" : `آخر نشاط: ${formatDate(user.last_activity ?? user.last_seen)}`} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-muted-foreground">اكتمال الملف</span>
                <span className="text-2xl font-black text-primary">{completion}%</span>
              </div>
              <Progress value={completion} className="mt-3" />
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                تكتمل النسبة عند إضافة البيانات الأساسية والصورة والروابط الاختيارية.
              </p>
            </div>
          </div>
        </section>

        {!verified ? (
          <Alert className="mt-6 border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>البريد الإلكتروني غير مفعل</AlertTitle>
            <AlertDescription>
              بعض العمليات تتطلب تفعيل البريد. يمكنك إعادة إرسال رسالة التفعيل أو تعديل البريد قبل التفعيل من تبويب الأمان.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ملخص الحساب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow icon={Mail} label="البريد الإلكتروني" value={user.email} dir="ltr" />
                <InfoRow icon={Phone} label="الهاتف" value={form.phone || "-"} dir="ltr" />
                <InfoRow icon={Briefcase} label="المسمى" value={form.job_title || "-"} />
                <InfoRow icon={Globe2} label="الدولة" value={countryLabel(form.country)} />
                <InfoRow icon={IdCard} label="الجنس" value={genderLabel(form.gender)} />
                <Separator />
                <InfoRow icon={Activity} label="تاريخ الانضمام" value={formatDate(user.created_at)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">الروابط العامة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_FIELDS.map(({ key, label, icon: Icon }) => {
                    const url = form.social_links[key].trim();
                    const enabled = Boolean(url && isSafeUrl(url));
                    return enabled ? (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:text-foreground"
                        aria-label={label}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ) : (
                      <span
                        key={key}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-dashed text-muted-foreground/50"
                        title={`${label} غير مضاف`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </aside>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSave}>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-md p-1">
                    <TabsTrigger value="personal" className="gap-2">
                      <UserRound className="h-4 w-4" />
                      البيانات
                    </TabsTrigger>
                    <TabsTrigger value="social" className="gap-2">
                      <Globe2 className="h-4 w-4" />
                      الروابط
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      الأمان
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="mt-6 space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="الاسم الكامل">
                        <Input value={form.name} onChange={(event) => setField("name", event.target.value)} required />
                      </Field>

                      <Field label="البريد الإلكتروني">
                        <Input value={user.email} disabled dir="ltr" className="bg-muted/60 text-muted-foreground" />
                      </Field>

                      <Field label="رقم الهاتف">
                        <Input
                          value={form.phone}
                          onChange={(event) => setField("phone", event.target.value)}
                          dir="ltr"
                          placeholder="+962..."
                          autoComplete="tel"
                        />
                      </Field>

                      <Field label="المسمى الوظيفي">
                        <Input
                          value={form.job_title}
                          onChange={(event) => setField("job_title", event.target.value)}
                          placeholder="مثال: معلم، طالب، ولي أمر"
                        />
                      </Field>

                      <Field label="الدولة">
                        <Select value={form.country || EMPTY_VALUE} onValueChange={(value) => setField("country", value === EMPTY_VALUE ? "" : value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الدولة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EMPTY_VALUE}>غير محدد</SelectItem>
                            {COUNTRY_OPTIONS.map((country) => (
                              <SelectItem key={country.value} value={country.value}>
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="الجنس">
                        <Select value={form.gender || EMPTY_VALUE} onValueChange={(value) => setField("gender", value === EMPTY_VALUE ? "" : value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="غير محدد" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={EMPTY_VALUE}>غير محدد</SelectItem>
                            {GENDER_OPTIONS.map((gender) => (
                              <SelectItem key={gender.value} value={gender.value}>
                                {gender.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field label="نبذة تعريفية">
                      <Textarea
                        value={form.bio}
                        onChange={(event) => setField("bio", event.target.value)}
                        className="min-h-32 resize-y"
                        placeholder="اكتب نبذة مختصرة تظهر مع حسابك عند الحاجة."
                      />
                    </Field>
                  </TabsContent>

                  <TabsContent value="social" className="mt-6 space-y-5">
                    {SOCIAL_FIELDS.map(({ key, label, placeholder, icon: Icon }) => (
                      <Field key={key} label={label}>
                        <div className="relative">
                          <Icon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={form.social_links[key]}
                            onChange={(event) => setSocialField(key, event.target.value)}
                            className="pr-9"
                            placeholder={placeholder}
                            dir="ltr"
                            autoComplete="off"
                          />
                        </div>
                      </Field>
                    ))}
                  </TabsContent>

                  <TabsContent value="security" className="mt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <StateBox
                        icon={Mail}
                        label="البريد"
                        value={verified ? "موثق" : "غير موثق"}
                        tone={verified ? "success" : "warning"}
                      />
                      <StateBox icon={Activity} label="الاتصال" value={online ? "متصل الآن" : "غير متصل"} tone={online ? "success" : "neutral"} />
                      <StateBox
                        icon={ShieldCheck}
                        label="الحالة"
                        value={user.status === "active" ? "فعال" : user.status}
                        tone={user.status === "active" ? "success" : "danger"}
                      />
                    </div>

                    {!verified ? (
                      <div className="rounded-lg border bg-muted/25 p-4">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                          <Field label="تعديل البريد قبل التفعيل">
                            <Input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} dir="ltr" type="email" />
                          </Field>
                          <Button type="button" variant="outline" onClick={changeEmail} disabled={isChangingEmail || !newEmail.trim() || newEmail === user.email}>
                            {isChangingEmail ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            تحديث البريد
                          </Button>
                          <Button type="button" variant="secondary" onClick={resendVerification} disabled={isResendingVerification}>
                            {isResendingVerification ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            إعادة الإرسال
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-lg border bg-muted/25 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-bold text-foreground">كلمة المرور</h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            سيتم إرسال رابط آمن لإعادة التعيين إلى بريدك الإلكتروني المسجل.
                          </p>
                        </div>
                        <Button type="button" variant="outline" onClick={sendPasswordReset} disabled={isSendingReset}>
                          {isSendingReset ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                          إرسال رابط التعيين
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-2 font-bold text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            حذف الحساب نهائيًا
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-destructive/80">
                            هذا الإجراء يتطلب كلمة المرور الحالية ولا يمكن التراجع عنه بعد التنفيذ.
                          </p>
                        </div>
                        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                              حذف الحساب
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>تأكيد حذف الحساب</AlertDialogTitle>
                              <AlertDialogDescription>
                                أدخل كلمة المرور الحالية لتأكيد حذف الحساب نهائيًا.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Field label="كلمة المرور الحالية">
                              <Input
                                value={deletePassword}
                                onChange={(event) => setDeletePassword(event.target.value)}
                                type="password"
                                autoComplete="current-password"
                              />
                            </Field>
                            <AlertDialogFooter className="gap-2 sm:space-x-0">
                              <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
                              <Button type="button" variant="destructive" onClick={deleteAccount} disabled={isDeleting}>
                                {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                حذف نهائي
                              </Button>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="ghost" onClick={reloadProfile} disabled={isReloading || isSaving}>
                    {isReloading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    إعادة تحميل البيانات
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    حفظ التغييرات
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function StatusPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-background p-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-foreground" dir={dir}>
          {value}
        </p>
      </div>
    </div>
  );
}

function StateBox({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const toneClass = {
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    danger: "border-destructive/25 bg-destructive/10 text-destructive",
    neutral: "border-border bg-muted/30 text-muted-foreground",
  }[tone];

  return (
    <div className={cn("rounded-lg border p-4", toneClass)}>
      <Icon className="h-5 w-5" />
      <p className="mt-3 text-xs font-bold opacity-80">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}
