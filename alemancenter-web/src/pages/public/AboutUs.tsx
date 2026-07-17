import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { systemApi } from "@/lib/api/system";
import StaticPageHeader from "@/components/common/StaticPageHeader";
import {
  Eye,
  Target,
  Gift,
  School,
  BookOpen,
  Newspaper,
  Filter,
  Heart,
  Award,
  Users,
  Lightbulb,
  Mail,
  Globe,
  Building2,
  MapPin,
  Phone,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";

export function AboutUs() {
  const { data: settings } = useQuery({
    queryKey: ["front-settings"],
    queryFn: () => systemApi.getPublicSettings(),
  });

  const resolvedSiteName = (settings?.site_name || "").trim() || "موقع الإيمان التعليمي";
  const resolvedSiteUrl = ((settings as any)?.canonical_url || (settings as any)?.site_url || "").trim();
  const resolvedContactEmail = (settings?.contact_email || "").trim();
  const resolvedContactPhone = (settings?.contact_phone || "").trim();
  const resolvedContactAddress = ((settings as any)?.contact_address || "").trim();

  return (
    <div className="font-sans">
      <StaticPageHeader
        title="من نحن"
        current="من نحن"
        eyebrow={resolvedSiteName}
        description={`مرحبًا بكم في موقع ${resolvedSiteName}، مساحة تعليمية مصممة لدعم الطلاب والمعلمين بمحتوى واضح وسهل الوصول.`}
      />

      <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
        <div className="mb-8 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:mb-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">هويتنا</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-4">
            <strong className="text-foreground">{resolvedSiteName}</strong> منصة تعليمية إلكترونية متخصصة في توفير
            المحتوى التعليمي للطلاب والمعلمين وفق المنهاج الدراسي. نعمل على تقديم موارد تعليمية عالية الجودة تشمل
            المناهج الدراسية وأوراق العمل والاختبارات والأخبار التربوية.
          </p>
          <div className="flex flex-col gap-3 text-sm">
            {resolvedSiteUrl && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <a href={resolvedSiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-medium inline-flex items-center gap-1">
                  {resolvedSiteUrl}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
            {resolvedContactEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href={`mailto:${resolvedContactEmail}`} className="hover:text-primary transition-colors font-medium">
                  {resolvedContactEmail}
                </a>
              </div>
            )}
            {resolvedContactPhone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href={`tel:${resolvedContactPhone}`} className="hover:text-primary transition-colors font-medium" dir="ltr">
                  {resolvedContactPhone}
                </a>
              </div>
            )}
            {resolvedContactAddress && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span>{resolvedContactAddress}</span>
              </div>
            )}
            {!resolvedContactEmail && !resolvedSiteUrl && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <LinkIcon className="w-4 h-4 text-primary shrink-0" />
                <Link href="/contact-us" className="hover:text-primary transition-colors font-medium">
                  نموذج التواصل المباشر
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="h-full rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <Eye className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">رؤيتنا</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              نسعى إلى أن نكون المصدر الأول للمحتوى التعليمي الموثوق والشامل، مع تسهيل الوصول إلى المواد التعليمية
              والاختبارات والمقالات الإرشادية للطلاب والمعلمين على حد سواء.
            </p>
          </div>
          <div className="h-full rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">رسالتنا</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              تقديم تجربة تعليمية متكاملة تعتمد على توفير موارد تعليمية عالية الجودة تساهم في تحسين أداء الطلاب
              والمعلمين وتطوير البيئة التعليمية بشكل عام.
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:mb-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <Gift className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">ماذا نقدم؟</h2>
          </div>
          <p className="text-muted-foreground mb-8">
            يقدم موقع {resolvedSiteName} مجموعة واسعة من الخدمات التعليمية المصممة بعناية، بما في ذلك:
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-primary/10 text-primary rounded-lg h-fit">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">صفوف دراسية</h3>
                <p className="text-muted-foreground text-sm">تغطي جميع الصفوف من التمهيدي حتى الثاني عشر.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-primary/10 text-primary rounded-lg h-fit">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">مواد دراسية</h3>
                <ul className="text-muted-foreground text-sm list-disc list-inside space-y-1">
                  <li>الخطة الدراسية</li>
                  <li>أوراق العمل والكورسات</li>
                  <li>الاختبارات الشهرية والنهائية</li>
                  <li>الكتب الرسمية ودليل المعلم</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-primary/10 text-primary rounded-lg h-fit">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">أخبار تربوية</h3>
                <p className="text-muted-foreground text-sm">تشمل آخر الأخبار التربوية والمقالات الإرشادية.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-primary/10 text-primary rounded-lg h-fit">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">تصفية المحتوى</h3>
                <p className="text-muted-foreground text-sm">
                  أدوات بحث وتصنيف متقدمة تتيح للمستخدمين الوصول إلى المحتوى المناسب بسهولة.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:mb-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <Heart className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">قيمنا</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-primary/10 text-primary rounded-lg h-fit">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">الجودة</h3>
                <p className="text-muted-foreground text-sm">تقديم محتوى تعليمي متميز ودقيق.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-primary/10 text-primary rounded-lg h-fit">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">التعاون</h3>
                <p className="text-muted-foreground text-sm">تعزيز بيئة تعليمية تدعم الشراكة بين الطلاب والمعلمين.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 p-2 bg-primary/10 text-primary rounded-lg h-fit">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-2">الإبداع</h3>
                <p className="text-muted-foreground text-sm">استخدام أدوات وتقنيات حديثة لتحسين تجربة المستخدم.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">التواصل معنا</h2>
          </div>
          <p className="text-muted-foreground mb-6">إذا كانت لديك أي أسئلة أو اقتراحات، يسعدنا أن نتواصل معك عبر:</p>
          <div className="flex flex-col gap-4">
            {resolvedContactEmail ? (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Mail className="w-5 h-5" />
                </div>
                <a href={`mailto:${resolvedContactEmail}`} className="text-foreground hover:text-primary transition-colors font-medium">
                  {resolvedContactEmail}
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Mail className="w-5 h-5" />
                </div>
                <Link href="/contact-us" className="text-foreground hover:text-primary transition-colors font-medium">
                  نموذج التواصل
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
