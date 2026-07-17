import StaticPageHeader from "@/components/common/StaticPageHeader";
import { BookOpenCheck, RefreshCw, SearchCheck, MessageSquareWarning } from "lucide-react";

export function EditorialPolicy() {
  return (
    <div className="font-sans">
      <StaticPageHeader
        title="سياسة التحرير والمراجعة"
        current="سياسة التحرير"
        eyebrow="موقع الإيمان التعليمي"
        description="نوضح هنا كيف يتم تنظيم المحتوى التعليمي ومراجعته وتحديثه لضمان تجربة مفيدة وواضحة للطلاب والمعلمين."
      />
      <main className="container mx-auto px-4 py-8 lg:py-12">
        <article className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6 md:p-8">
          <div className="prose max-w-none text-right text-base leading-8 text-muted-foreground prose-headings:font-black prose-headings:text-foreground dark:prose-invert md:text-[17px]">
            <p>
              يهدف موقع <strong>موقع الإيمان التعليمي</strong> إلى تقديم محتوى تعليمي منظم وواضح يساعد الطالب والمعلم وولي
              الأمر على الوصول السريع إلى الملفات والمقالات والموارد المرتبطة بالمنهاج.
            </p>

            <h2>معايير اختيار المحتوى</h2>
            <p>
              نعتمد في نشر المحتوى على مدى ارتباطه بالمنهاج، فائدته التعليمية، وضوح عنوانه، وإمكانية استفادة المستخدم
              منه في الدراسة أو التحضير أو المراجعة. لا يتم اعتماد الصفحات التي لا تقدم فائدة واضحة أو تحتوي على
              معلومات مضللة.
            </p>

            <div className="my-8 grid gap-4 md:grid-cols-2 not-prose">
              <div className="rounded-2xl border bg-primary/5 p-5">
                <BookOpenCheck className="mb-3 h-7 w-7 text-primary" />
                <h3 className="mb-2 text-lg font-black text-foreground">محتوى تعليمي واضح</h3>
                <p className="text-sm leading-7 text-muted-foreground">نحرص على أن تكون الصفحات مرتبطة بصف أو مادة أو موضوع واضح.</p>
              </div>
              <div className="rounded-2xl border bg-emerald-500/5 p-5">
                <SearchCheck className="mb-3 h-7 w-7 text-emerald-600" />
                <h3 className="mb-2 text-lg font-black text-foreground">تنظيم وفهرسة</h3>
                <p className="text-sm leading-7 text-muted-foreground">يتم تنظيم المحتوى عبر الأقسام والكلمات والروابط الداخلية لتسهيل الوصول.</p>
              </div>
              <div className="rounded-2xl border bg-violet-500/5 p-5">
                <RefreshCw className="mb-3 h-7 w-7 text-violet-600" />
                <h3 className="mb-2 text-lg font-black text-foreground">تحديث مستمر</h3>
                <p className="text-sm leading-7 text-muted-foreground">نقوم بتحديث الملفات والمقالات عند توفر معلومات أو نسخ أحدث.</p>
              </div>
              <div className="rounded-2xl border bg-amber-500/5 p-5">
                <MessageSquareWarning className="mb-3 h-7 w-7 text-amber-600" />
                <h3 className="mb-2 text-lg font-black text-foreground">تصحيح الأخطاء</h3>
                <p className="text-sm leading-7 text-muted-foreground">يمكن للمستخدمين إرسال ملاحظات حول أي خطأ أو ملف غير مناسب للمراجعة.</p>
              </div>
            </div>

            <h2>مراجعة المقالات والملفات</h2>
            <p>
              قبل نشر المحتوى أو تحديثه، تتم مراجعة العنوان، التصنيف، الوصف، وضوح الملف أو المرفق، وسلامة تجربة
              المستخدم. كما نعمل تدريجيًا على تحسين الصفحات القديمة وإضافة وصف تعليمي أوضح لكل ملف.
            </p>

            <h2>التعامل مع المحتوى القديم</h2>
            <p>
              نظرًا لكثرة الصفحات والملفات التعليمية، قد توجد صفحات قديمة تحتاج إلى تحسين أو تحديث. لذلك نعتمد خطة
              مراجعة مرحلية تبدأ بالصفحات الأعلى زيارة والأكثر أهمية، ثم تنتقل تدريجيًا إلى باقي المحتوى.
            </p>

            <h2>الإبلاغ عن خطأ</h2>
            <p>
              إذا لاحظت خطأ في صفحة، ملف غير مناسب، رابط تحميل لا يعمل، أو معلومة تحتاج إلى تحديث، يمكنك التواصل معنا
              عبر صفحة اتصل بنا أو عبر البريد المخصص للدعم.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
