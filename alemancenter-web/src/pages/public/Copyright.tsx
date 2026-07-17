import StaticPageHeader from "@/components/common/StaticPageHeader";
import { Mail, ShieldCheck, FileText, Clock, CheckCircle } from "lucide-react";

export function Copyright() {
  return (
    <div className="font-sans">
      <StaticPageHeader
        title="حقوق الملكية وطلبات الإزالة"
        current="حقوق الملكية"
        eyebrow="موقع الإيمان التعليمي"
        description="نحترم حقوق المؤلفين والجهات التعليمية، ونوفر آلية واضحة للتبليغ عن أي محتوى يحتاج إلى تعديل أو إزالة."
      />
      <main className="container mx-auto px-4 py-8 lg:py-12">
        <article className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6 md:p-8">
          <div className="prose max-w-none text-right text-base leading-8 text-muted-foreground prose-headings:font-black prose-headings:text-foreground dark:prose-invert md:text-[17px]">
            <p>
              يلتزم موقع <strong>موقع الإيمان التعليمي</strong> باحترام حقوق الملكية الفكرية لأصحاب المحتوى والجهات
              التعليمية. يتم نشر الموارد التعليمية بهدف دعم الطلاب والمعلمين وأولياء الأمور، ولا يقصد الموقع بأي حال
              انتهاك حقوق أي طرف.
            </p>

            <h2>مصادر المحتوى والملفات</h2>
            <p>
              قد تتضمن صفحات الموقع ملفات تعليمية، ملخصات، اختبارات، خططًا دراسية، أو روابط ومواد مساعدة. بعض المواد
              قد تكون من إعداد فريق الموقع أو من مساهمات تعليمية أو مصادر عامة متاحة للطلاب والمعلمين. عند وجود حقوق
              واضحة لطرف معين، نحرص على الإشارة إليها أو التعامل مع طلبات الإزالة بسرعة.
            </p>

            <div className="my-8 grid gap-4 md:grid-cols-3 not-prose">
              <div className="rounded-2xl border bg-primary/5 p-4">
                <ShieldCheck className="mb-3 h-7 w-7 text-primary" />
                <h3 className="mb-2 text-lg font-black text-foreground">احترام الحقوق</h3>
                <p className="text-sm leading-7 text-muted-foreground">نراجع البلاغات المتعلقة بحقوق الملكية ونتعامل معها بجدية.</p>
              </div>
              <div className="rounded-2xl border bg-emerald-500/5 p-4">
                <FileText className="mb-3 h-7 w-7 text-emerald-600" />
                <h3 className="mb-2 text-lg font-black text-foreground">استخدام تعليمي</h3>
                <p className="text-sm leading-7 text-muted-foreground">الملفات المنشورة مخصصة للاستخدام الشخصي والتعليمي غير التجاري.</p>
              </div>
              <div className="rounded-2xl border bg-amber-500/5 p-4">
                <Clock className="mb-3 h-7 w-7 text-amber-600" />
                <h3 className="mb-2 text-lg font-black text-foreground">استجابة منظمة</h3>
                <p className="text-sm leading-7 text-muted-foreground">نعمل على مراجعة الطلبات وتحديث المحتوى أو إزالته عند ثبوت الطلب.</p>
              </div>
            </div>

            <h2>كيف تقدم طلب إزالة أو تعديل؟</h2>
            <p>يرجى إرسال رسالة واضحة تتضمن المعلومات التالية:</p>
            <ul>
              <li>رابط الصفحة أو الملف محل الطلب.</li>
              <li>توضيح صفتك أو علاقتك بالمحتوى.</li>
              <li>وصف مختصر للمشكلة: إزالة، تعديل، تصحيح نسبة، أو تحديث ملف.</li>
              <li>وسيلة تواصل صحيحة للرد على الطلب.</li>
            </ul>

            <div className="not-prose mt-8 rounded-2xl border bg-muted p-5">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-foreground">
                <Mail className="h-5 w-5 text-primary" />
                البريد المخصص للتواصل
              </h3>
              <a href="mailto:support@alemancenter.com" className="font-black text-primary hover:underline" dir="ltr">
                support@alemancenter.com
              </a>
            </div>

            <h2>إجراء المراجعة</h2>
            <p>
              بعد استلام البلاغ، تتم مراجعة الصفحة أو الملف والتحقق من المعلومات المتاحة. إذا تبين أن المحتوى يحتاج
              إلى تعديل أو إزالة، سيتم اتخاذ الإجراء المناسب بما يحافظ على حقوق الأطراف وجودة المحتوى التعليمي
              للمستخدمين.
            </p>

            <p className="not-prose flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="mt-1 h-5 w-5 shrink-0" />
              هذه الصفحة جزء من التزام الموقع بالشفافية، وجودة المحتوى، واحترام حقوق الملكية الفكرية.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
