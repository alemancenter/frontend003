import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  Bot,
  Check,
  Clock,
  Download,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  Loader2,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { teacherSubscriptionApi } from "@/lib/api/teacherSubscription";
import { useAuth } from "@/contexts/AuthContext";
import type { SubscriptionPlan } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function normalizePlans(plan: SubscriptionPlan | SubscriptionPlan[] | undefined) {
  const plans = plan ? (Array.isArray(plan) ? plan : [plan]) : [];
  return plans.filter((item) => item.is_active !== false);
}

function parseFeatures(featuresJson?: string) {
  if (!featuresJson) return [];
  try {
    const parsed = JSON.parse(featuresJson);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

function formatLimit(value: number | undefined, unit: string) {
  if (value === undefined || value === null) return "حسب الباقة";
  if (value === -1) return `غير محدود ${unit}`;
  return `${value.toLocaleString("ar-EG")} ${unit}`;
}

const defaultBenefits = [
  "ملفات حصرية للمعلمين حسب الصف والمادة",
  "أدوات ذكاء اصطناعي لإنشاء محتوى تعليمي أسرع",
  "مكتبة منظمة للامتحانات وأوراق العمل والملخصات",
  "إدارة الأجهزة والتنزيلات من مساحة عمل واحدة",
];

const highlights = [
  {
    icon: LibraryBig,
    title: "مكتبة مميزة",
    description: "مواد تعليمية مرتبة حسب الصف والمادة لتصل إلى الملف المناسب بسرعة.",
  },
  {
    icon: Bot,
    title: "أدوات AI للمعلم",
    description: "مساعدة في إنتاج الأسئلة، الملخصات، وخطط الدروس ضمن حدود الباقة.",
  },
  {
    icon: MonitorSmartphone,
    title: "تحكم بالأجهزة",
    description: "تفعيل الاشتراك على عدد محدد من الأجهزة مع حماية وصول الملفات.",
  },
  {
    icon: ShieldCheck,
    title: "وصول محمي",
    description: "الملفات المميزة لا تظهر إلا للمعلمين المشتركين والمفعلين.",
  },
];

const steps = [
  { title: "اختر الباقة", description: "راجع السعر والمدة وحدود التنزيل والذكاء الاصطناعي." },
  { title: "حدد موادك", description: "اختر الصفوف والمواد التي تدرسها من قاعدة البيانات." },
  { title: "أرسل الدفع", description: "أكمل الطلب وارفع إثبات الدفع عند اختيار طريقة دفع يدوية." },
  { title: "ابدأ العمل", description: "بعد التفعيل تظهر لك المكتبة ومساحة عمل المعلم مباشرة." },
];

export function TeacherSubscriptionPublic() {
  const { isAuthenticated } = useAuth();

  const { data: plan, isLoading: isPlanLoading } = useQuery({
    queryKey: ["teacher-plans"],
    queryFn: () => teacherSubscriptionApi.plan(),
  });

  const { data: access, isLoading: isAccessLoading } = useQuery({
    queryKey: ["teacher-access"],
    queryFn: () => teacherSubscriptionApi.access(),
    enabled: isAuthenticated,
  });

  const plans = useMemo(() => normalizePlans(plan), [plan]);
  const featuredPlan = plans[0];
  const featuredFeatures = useMemo(
    () => {
      const parsed = parseFeatures(featuredPlan?.features_json);
      return parsed.length > 0 ? parsed : defaultBenefits;
    },
    [featuredPlan?.features_json],
  );
  const hasActiveSubscription = Boolean(access?.has_access);
  const isLoading = isPlanLoading || (isAuthenticated && isAccessLoading);

  const cta = !isAuthenticated
    ? { href: "/register", label: "أنشئ حسابا للاشتراك", variant: "default" as const }
    : hasActiveSubscription
      ? { href: "/teacher", label: "الانتقال إلى لوحة المعلم", variant: "secondary" as const }
      : { href: "/teacher/subscribe", label: "اشترك الآن", variant: "default" as const };

  return (
    <main dir="rtl" className="bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border bg-[linear-gradient(135deg,#07194d_0%,#0b2a66_58%,#09204f_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="relative mx-auto grid max-w-[1540px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <Badge className="mb-5 w-fit border-white/15 bg-white/10 px-4 py-1.5 text-sm font-bold text-white hover:bg-white/10">
              <Sparkles className="ml-2 h-4 w-4 text-amber-300" />
              باقة المعلم للفصل الدراسي
            </Badge>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.15] text-white sm:text-5xl lg:text-6xl">
              مساحة احترافية للمعلم العربي
              <span className="block text-cyan-200">ملفات، أدوات، وتنظيم في مكان واحد</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-white/75 sm:text-lg">
              اشترك للوصول إلى مكتبة الملفات المميزة وأدوات الذكاء الاصطناعي الخاصة بالمعلمين، مع ربط المحتوى بالصفوف والمواد التي تدرسها فقط.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-13 rounded-xl px-7 text-base font-black">
                <Link href={cta.href}>
                  {hasActiveSubscription ? <LayoutDashboard className="ml-2 h-5 w-5" /> : <GraduationCap className="ml-2 h-5 w-5" />}
                  {cta.label}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-13 rounded-xl border-white/20 bg-white/10 px-7 text-base font-black text-white hover:bg-white/15 hover:text-white">
                <Link href="/teacher/subscribe">
                  إتمام الاشتراك
                  <ArrowLeft className="mr-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {hasActiveSubscription && (
              <div className="mt-6 flex w-fit items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-100">
                <BadgeCheck className="h-4 w-4" />
                اشتراكك مفعل ويمكنك الدخول إلى مساحة المعلم
              </div>
            )}
          </div>

          <Card className="border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white/60">الباقة الحالية</p>
                  <h2 className="mt-1 text-2xl font-black">{featuredPlan?.name || "باقة اشتراك المعلم"}</h2>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <GraduationCap className="h-7 w-7 text-cyan-200" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black">{featuredPlan?.price_jod ?? 25}</span>
                  <span className="pb-2 text-lg font-bold text-white/65">{featuredPlan?.currency || "JOD"}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white/65">
                  لمدة {featuredPlan?.duration_days?.toLocaleString("ar-EG") || "فصل دراسي"}
                  {typeof featuredPlan?.duration_days === "number" ? " يوم" : ""}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Download className="mb-2 h-5 w-5 text-cyan-200" />
                  <p className="text-xs font-bold text-white/55">التنزيلات</p>
                  <p className="mt-1 text-sm font-black">{formatLimit(featuredPlan?.download_limit, "ملف")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Bot className="mb-2 h-5 w-5 text-cyan-200" />
                  <p className="text-xs font-bold text-white/55">أدوات AI</p>
                  <p className="mt-1 text-sm font-black">{formatLimit(featuredPlan?.ai_generation_limit, "مرة")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <MonitorSmartphone className="mb-2 h-5 w-5 text-cyan-200" />
                  <p className="text-xs font-bold text-white/55">الأجهزة</p>
                  <p className="mt-1 text-sm font-black">{formatLimit(featuredPlan?.device_limit, "أجهزة")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Clock className="mb-2 h-5 w-5 text-cyan-200" />
                  <p className="text-xs font-bold text-white/55">التفعيل</p>
                  <p className="mt-1 text-sm font-black">بعد مراجعة الطلب</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-[1540px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {highlights.map((item) => (
            <Card key={item.title} className="border-border/80 bg-card">
              <CardContent className="p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-[1540px] gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <Badge variant="outline" className="mb-4 px-3 py-1 font-bold">ما الذي يحصل عليه المعلم؟</Badge>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">كل أدوات الاشتراك مصممة حول الصف والمادة</h2>
            <p className="mt-4 text-base font-semibold leading-8 text-muted-foreground">
              عند الاشتراك يحدد المعلم المواد التي يدرسها من قاعدة البيانات، وبعد التفعيل تظهر له الملفات المطابقة ضمن مكتبته المميزة.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {featuredFeatures.map((feature, index) => (
              <div key={`${feature}-${index}`} className="flex gap-3 rounded-2xl border border-border bg-background p-4">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" />
                </div>
                <p className="text-sm font-bold leading-7">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1540px] gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-muted-foreground">معاينة مساحة العمل</p>
              <h2 className="mt-1 text-2xl font-black">مكتبة المعلم المميزة</h2>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">وصول محمي</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: FileText, title: "امتحان جاهز", meta: "الصف العاشر، رياضيات" },
              { icon: BookOpenCheck, title: "ورقة عمل", meta: "الصف السادس، علوم" },
              { icon: Users, title: "خطة درس", meta: "الفصل الدراسي الأول" },
              { icon: Download, title: "ملخص قابل للتحميل", meta: "مرتبط بمواد اشتراكك" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-black">{item.title}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{item.meta}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Badge variant="outline" className="mb-4 px-3 py-1 font-bold">خطوات الاشتراك</Badge>
          <h2 className="text-3xl font-black leading-tight sm:text-4xl">من اختيار الباقة إلى بدء الاستخدام</h2>
          <div className="mt-6 space-y-4">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                  {(index + 1).toLocaleString("ar-EG")}
                </div>
                <div>
                  <h3 className="font-black">{step.title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-7 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1540px] px-4 pb-16 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center rounded-3xl border border-border bg-card py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <h2 className="text-2xl font-black">لا توجد باقات متاحة حاليا</h2>
            <p className="mt-2 text-muted-foreground">سيتم عرض باقات المعلمين هنا فور تفعيلها من الإدارة.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            {plans.map((item) => {
              const features = parseFeatures(item.features_json);
              const shownFeatures = features.length > 0 ? features : defaultBenefits;
              return (
                <Card key={item.id} className="overflow-hidden border-primary/20 shadow-sm">
                  <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_280px]">
                    <div>
                      <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">الباقة المتاحة</Badge>
                      <h2 className="text-2xl font-black">{item.name}</h2>
                      <p className="mt-2 min-h-12 text-sm font-semibold leading-7 text-muted-foreground">{item.description}</p>
                      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                        {shownFeatures.slice(0, 6).map((feature, index) => (
                          <li key={`${feature}-${index}`} className="flex gap-2 text-sm font-bold">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-border bg-muted/30 p-5">
                      <div className="text-center">
                        <div className="text-4xl font-black text-primary">
                          {item.price_jod}
                          <span className="mr-1 text-base font-bold text-muted-foreground">{item.currency}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-muted-foreground">لمدة {item.duration_days.toLocaleString("ar-EG")} يوم</p>
                      </div>

                      <div className="my-5 space-y-2 border-y border-border py-5 text-sm font-bold">
                        <p>{formatLimit(item.download_limit, "ملف")}</p>
                        <p>{formatLimit(item.ai_generation_limit, "مرة AI")}</p>
                        <p>{formatLimit(item.device_limit, "أجهزة")}</p>
                      </div>

                      <Button asChild className="h-12 w-full rounded-xl text-base font-black" variant={cta.variant}>
                        <Link href={cta.href}>
                          {hasActiveSubscription && <LayoutDashboard className="ml-2 h-5 w-5" />}
                          {cta.label}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
