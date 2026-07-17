import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Download,
  FileQuestion,
  Filter,
  KeyRound,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRound,
  Wifi,
} from "lucide-react";
import StaticPageHeader from "@/components/common/StaticPageHeader";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";

type FaqCategory = "all" | "account" | "content" | "downloads" | "search" | "technical" | "privacy";

interface FaqItem {
  id: string;
  category: Exclude<FaqCategory, "all">;
  question: string;
  answer: string;
}

const categories: Array<{ id: FaqCategory; label: string; icon: ReactNode }> = [
  { id: "all", label: "الكل", icon: <CircleHelp className="h-4 w-4" /> },
  { id: "account", label: "الحساب", icon: <UserRound className="h-4 w-4" /> },
  { id: "content", label: "المحتوى", icon: <BookOpen className="h-4 w-4" /> },
  { id: "downloads", label: "التحميل", icon: <Download className="h-4 w-4" /> },
  { id: "search", label: "البحث", icon: <Search className="h-4 w-4" /> },
  { id: "technical", label: "مشاكل تقنية", icon: <Wifi className="h-4 w-4" /> },
  { id: "privacy", label: "الخصوصية", icon: <ShieldCheck className="h-4 w-4" /> },
];

const faqs: FaqItem[] = [
  { id: "create-account", category: "account", question: "كيف أقوم بإنشاء حساب جديد؟", answer: "يمكنك إنشاء حساب من زر دخول / تسجيل في أعلى الصفحة. أدخل بياناتك بشكل صحيح، ثم اتبع خطوات التحقق إذا كانت مفعلة في الموقع." },
  { id: "login-problem", category: "account", question: "لا أستطيع تسجيل الدخول، ماذا أفعل؟", answer: "تأكد من كتابة البريد الإلكتروني وكلمة المرور بشكل صحيح. إذا استمرت المشكلة استخدم خيار استعادة كلمة المرور، أو تواصل معنا من صفحة اتصل بنا مع ذكر البريد المستخدم." },
  { id: "forgot-password", category: "account", question: "نسيت كلمة المرور، كيف أستعيدها؟", answer: "من صفحة تسجيل الدخول اختر استعادة كلمة المرور، ثم أدخل بريدك الإلكتروني. ستصلك رسالة تحتوي على رابط إعادة التعيين إذا كان البريد مسجلاً." },
  { id: "change-profile", category: "account", question: "كيف أعدل بياناتي الشخصية؟", answer: "بعد تسجيل الدخول انتقل إلى حسابك أو لوحة الملف الشخصي، ثم عدل الاسم أو الصورة أو البيانات المتاحة حسب الصلاحيات المفعلة لحسابك." },
  { id: "message-admin", category: "account", question: "كيف أراسل الإدارة أو أحد المشرفين؟", answer: "يمكنك استخدام صفحة اتصل بنا. اكتب عنواناً واضحاً للرسالة واشرح المشكلة بالتفصيل." },
  { id: "choose-class", category: "content", question: "كيف أختار صفي الدراسي؟", answer: "من الصفحة الرئيسية أو صفحة الصفوف اختر الصف الدراسي المناسب، ثم ستظهر المواد والأقسام التعليمية المرتبطة به." },
  { id: "find-subject", category: "content", question: "لا أجد المادة التي أبحث عنها، ما الحل؟", answer: "تأكد أولاً من اختيار الصف الصحيح. إذا كانت المادة غير موجودة فقد لا تكون مضافة بعد، ويمكنك إرسال اقتراح للإدارة." },
  { id: "content-types", category: "content", question: "ما أنواع الملفات الموجودة في الموقع؟", answer: "يحتوي الموقع على خطط دراسية، أوراق عمل، اختبارات، ملخصات، كتب، أدلة معلم، ومقالات تعليمية حسب الصف والمادة والفصل." },
  { id: "content-update", category: "content", question: "هل المحتوى يتم تحديثه باستمرار؟", answer: "نعم، يتم تحديث المحتوى حسب توفر الملفات والمصادر التعليمية." },
  { id: "wrong-file", category: "content", question: "وجدت ملفاً خاطئاً أو رابطاً غير مناسب، كيف أبلغ عنه؟", answer: "أرسل رابط الصفحة من خلال صفحة اتصل بنا مع وصف المشكلة." },
  { id: "download-file", category: "downloads", question: "كيف أحمل ملفاً تعليمياً؟", answer: "افتح صفحة الملف المطلوب ثم اضغط زر التحميل." },
  { id: "download-not-working", category: "downloads", question: "زر التحميل لا يعمل، ماذا أفعل؟", answer: "جرب تحديث الصفحة، إيقاف مانع الإعلانات مؤقتاً، أو استخدام متصفح آخر. إذا بقيت المشكلة أرسل رابط الملف للإدارة لفحصه." },
  { id: "file-not-open", category: "downloads", question: "الملف تم تحميله لكنه لا يفتح لدي، ما السبب؟", answer: "قد تحتاج إلى تطبيق يدعم صيغة الملف مثل PDF أو Word. تأكد أيضاً أن التحميل اكتمل بالكامل." },
  { id: "download-limit", category: "downloads", question: "هل توجد حدود على التحميل؟", answer: "قد توجد قيود مؤقتة للحماية من الاستخدام المفرط. إذا ظهرت رسالة منع انتظر قليلاً ثم حاول مرة أخرى." },
  { id: "quick-search", category: "search", question: "كيف أستخدم البحث السريع؟", answer: "اكتب كلمة من اسم الدرس أو الملف، ثم اختر المادة والفصل الدراسي عند الحاجة." },
  { id: "no-results", category: "search", question: "لم تظهر نتائج في البحث، ماذا يعني ذلك؟", answer: "قد تكون الكلمة مختلفة عن العنوان الموجود في الموقع. جرب كلمة أقصر أو ابحث باسم المادة فقط." },
  { id: "slow-site", category: "technical", question: "الموقع بطيء على الجوال، ماذا أفعل؟", answer: "تأكد من اتصال الإنترنت، أغلق الصفحات الثقيلة، ثم حدث الصفحة." },
  { id: "page-error", category: "technical", question: "ظهرت صفحة خطأ أو 404، ما الحل؟", answer: "قد يكون الرابط قديماً أو تم نقل المحتوى. ارجع للصفحة الرئيسية وابحث عن الملف من جديد." },
  { id: "browser-support", category: "technical", question: "ما أفضل متصفح لاستخدام الموقع؟", answer: "ننصح باستخدام آخر إصدار من Chrome أو Edge أو Safari على الجوال." },
  { id: "privacy-data", category: "privacy", question: "هل بياناتي الشخصية محفوظة؟", answer: "نستخدم البيانات فقط لتشغيل الحساب والخدمات المرتبطة به وفق سياسة الخصوصية." },
  { id: "cookies", category: "privacy", question: "لماذا يستخدم الموقع ملفات تعريف الارتباط؟", answer: "تُستخدم لتحسين التجربة، حفظ بعض التفضيلات، وقياس الأداء وفق سياسة ملفات تعريف الارتباط." },
  { id: "delete-account", category: "privacy", question: "هل يمكنني طلب حذف حسابي أو بياناتي؟", answer: "نعم، يمكنك إرسال طلب من صفحة اتصل بنا مع ذكر البريد المرتبط بالحساب." },
];

const categoryLabels = categories.reduce<Record<FaqCategory, string>>((acc, category) => {
  acc[category.id] = category.label;
  return acc;
}, {} as Record<FaqCategory, string>);

export function Faq() {
  const country = useCountry();
  const [activeCategory, setActiveCategory] = useState<FaqCategory>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(faqs[0]?.id ?? "");

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      return `${faq.question} ${faq.answer}`.toLowerCase().includes(normalizedQuery);
    });
  }, [activeCategory, query]);

  return (
    <div className="font-sans">
      <StaticPageHeader
        title="الأسئلة الشائعة"
        current="الأسئلة الشائعة"
        description="إجابات عملية لأكثر المشاكل والأسئلة التي قد تواجه الطلاب والأعضاء أثناء استخدام الموقع."
      />

      <main className="container mx-auto px-4 py-8 lg:py-12">
        <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <label htmlFor="faq-search" className="mb-2 block text-sm font-black text-foreground">
                ابحث في الأسئلة
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                <input
                  id="faq-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="اكتب مشكلتك أو سؤالك..."
                  className="h-12 w-full rounded-xl border bg-muted/40 py-3 pl-4 pr-10 text-sm font-medium outline-none transition placeholder:text-muted-foreground focus:bg-background focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-foreground">
                <Filter className="h-4 w-4 text-primary" />
                التصنيفات
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                {categories.map((category) => {
                  const isActive = activeCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setActiveCategory(category.id);
                        setOpenId("");
                      }}
                      className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition lg:justify-start ${
                        isActive ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:bg-muted"
                      }`}
                    >
                      {category.icon}
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-sm">
              <MessageCircle className="mb-3 h-7 w-7" />
              <h2 className="text-lg font-black">لم تجد إجابتك؟</h2>
              <p className="mt-2 text-sm font-medium leading-7 opacity-90">
                أرسل لنا وصف المشكلة مع رابط الصفحة حتى نتمكن من مساعدتك بدقة.
              </p>
              <Link
                href="/contact-us"
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-background px-4 text-sm font-black text-primary transition hover:opacity-90"
              >
                <Mail className="h-4 w-4" />
                تواصل معنا
              </Link>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-primary">{categoryLabels[activeCategory]}</p>
                  <h2 className="mt-1 text-2xl font-black text-foreground">مركز المساعدة</h2>
                </div>
                <div className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-black text-primary">
                  {filteredFaqs.length} سؤال
                </div>
              </div>
            </div>

            {filteredFaqs.length > 0 ? (
              <div className="space-y-3">
                {filteredFaqs.map((faq) => {
                  const isOpen = openId === faq.id;
                  return (
                    <article key={faq.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? "" : faq.id)}
                        className="flex w-full items-start justify-between gap-4 p-5 text-right transition hover:bg-muted/50 sm:p-6"
                        aria-expanded={isOpen}
                      >
                        <span className="flex min-w-0 gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <FileQuestion className="h-5 w-5" />
                          </span>
                          <span>
                            <span className="block text-base font-black leading-7 text-foreground sm:text-lg">{faq.question}</span>
                            <span className="mt-1 block text-xs font-bold text-primary">{categoryLabels[faq.category]}</span>
                          </span>
                        </span>
                        <ChevronDown className={`mt-2 h-5 w-5 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180 text-primary" : ""}`} />
                      </button>
                      {isOpen ? (
                        <div className="border-t px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                          <p className="text-sm font-medium leading-8 text-muted-foreground sm:text-base">{faq.answer}</p>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
                <AlertCircle className="mx-auto mb-3 h-9 w-9 text-amber-600" />
                <h3 className="text-lg font-black text-foreground">لا توجد نتائج مطابقة</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-muted-foreground">
                  جرّب كلمة أبسط أو اختر تصنيفاً آخر، ويمكنك التواصل معنا إذا كانت المشكلة غير موجودة.
                </p>
              </div>
            )}
          </section>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Link href="/login" className="rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <KeyRound className="mb-3 h-7 w-7 text-primary" />
            <h3 className="font-black text-foreground">الدخول للحساب</h3>
            <p className="mt-2 text-sm font-medium leading-7 text-muted-foreground">
              استخدم هذه الصفحة عند مواجهة مشاكل في الدخول أو استعادة كلمة المرور.
            </p>
          </Link>
          <Link href={routes.lessonList(country)} className="rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <BookOpen className="mb-3 h-7 w-7 text-primary" />
            <h3 className="font-black text-foreground">تصفح الصفوف</h3>
            <p className="mt-2 text-sm font-medium leading-7 text-muted-foreground">
              ابدأ من الصف الدراسي للوصول إلى المواد والملفات بطريقة منظمة.
            </p>
          </Link>
          <Link href="/contact-us" className="rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Mail className="mb-3 h-7 w-7 text-primary" />
            <h3 className="font-black text-foreground">الدعم والتواصل</h3>
            <p className="mt-2 text-sm font-medium leading-7 text-muted-foreground">
              أرسل تفاصيل المشكلة لفريق الموقع عند تعطل رابط أو وجود ملف غير مناسب.
            </p>
          </Link>
        </section>
      </main>
    </div>
  );
}
