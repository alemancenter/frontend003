import { Link } from "wouter";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/country";
import { useCountry } from "@/hooks/use-country";

function formatDate(value?: string | null) {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function initials(name?: string | null) {
  const value = String(name ?? "").trim();
  if (!value) return "ع";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function MemberDashboard() {
  const { user, hasPermission, isTeacher } = useAuth();
  // The app's selected country code (jo/sa/…) — user.country holds a display
  // name, not a routable code, so it can't feed routes.* helpers.
  const country = useCountry();
  const verified = Boolean(user?.email_verified_at);

  const actions = [
    ...(hasPermission("manage messages")
      ? [
          {
            title: "الرسائل",
            description: "عرض الرسائل الداخلية والرد عليها حسب الصلاحية الممنوحة لحسابك.",
            href: "/dashboard/messages",
            icon: Mail,
          },
        ]
      : []),
    ...(hasPermission("manage notifications")
      ? [
          {
            title: "الإشعارات",
            description: "متابعة الإشعارات وإدارتها حسب الصلاحية الممنوحة لحسابك.",
            href: "/dashboard/notifications",
            icon: Bell,
          },
        ]
      : []),
    {
      title: "تصفح الدروس والمواد",
      description: "الوصول إلى الصفوف والمواد المتاحة حسب الدولة المختارة.",
      href: routes.lessonList(country),
      icon: GraduationCap,
    },
    {
      title: "الأخبار والمقالات العامة",
      description: "متابعة آخر المنشورات والمحتوى المنشور للزوار والأعضاء.",
      href: routes.postsList(country),
      icon: BookOpen,
    },
    {
      title: "التقويم الدراسي",
      description: "عرض المواعيد والأحداث الدراسية المنشورة.",
      href: "/calendar",
      icon: CalendarDays,
    },
    {
      title: isTeacher ? "بوابة المعلم" : "اشتراك المعلمين",
      description: isTeacher ? "إدارة اشتراكك وملفاتك التعليمية." : "استعراض مزايا وخطط اشتراك المعلمين.",
      href: isTeacher ? "/teacher" : "/teacher-subscription",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6" dir="rtl">
      <section className="rounded-lg border bg-background p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-black text-primary">
              {initials(user?.name)}
            </div>
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                لوحة العضو
              </div>
              <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl">
                مرحبا {user?.name || "بك"}
              </h1>
              <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">
                هذه لوحة مخصصة لحساب العضو. لا تعرض إحصائيات المنصة أو بيانات الإدارة أو مؤشرات الزوار.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/profile">
                <UserRound className="ml-2 h-4 w-4" />
                تعديل الملف الشخصي
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                <ExternalLink className="ml-2 h-4 w-4" />
                العودة للموقع
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">حالة الحساب</CardTitle>
            <CardDescription>معلومات أساسية ظاهرة لصاحب الحساب فقط.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
              <span className="text-muted-foreground">البريد</span>
              <span className="min-w-0 truncate font-medium" dir="ltr">{user?.email || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
              <span className="text-muted-foreground">التحقق</span>
              <Badge variant={verified ? "default" : "secondary"} className={verified ? "bg-emerald-600 hover:bg-emerald-600" : ""}>
                {verified ? "مفعل" : "غير مفعل"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
              <span className="text-muted-foreground">تاريخ الانضمام</span>
              <span className="font-medium">{formatDate(user?.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">اختصارات العضو</CardTitle>
            <CardDescription>روابط آمنة لا تتطلب صلاحيات إدارية.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {actions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="h-full rounded-lg border p-4 transition hover:bg-muted/60">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <action.icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-bold">{action.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-3 p-5 text-sm leading-7 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
            <p>
              لا يتم تحميل إحصائيات الإدارة أو بيانات المستخدمين أو الزيارات في هذه الصفحة. أي صلاحية إدارية تحتاج دورا أو إذنا مخصصا من الإدارة.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/contact-us">طلب مساعدة</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
