import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Mail, Globe, Shield, ExternalLink, AlertTriangle } from "lucide-react";
import StaticPageHeader from "@/components/common/StaticPageHeader";
import { systemApi } from "@/lib/api/system";

type LegalPageType = "privacy-policy" | "terms-of-service" | "cookie-policy" | "disclaimer";

const LAST_UPDATED: Record<LegalPageType, string> = {
  "privacy-policy": "16 مايو 2026",
  "terms-of-service": "30 مايو 2026",
  "cookie-policy": "30 مايو 2026",
  "disclaimer": "16 مايو 2026",
};

const titles: Record<LegalPageType, string> = {
  "privacy-policy": "سياسة الخصوصية",
  "terms-of-service": "شروط الاستخدام",
  "cookie-policy": "سياسة ملفات تعريف الارتباط",
  "disclaimer": "إخلاء المسؤولية",
};

const descriptions: Record<LegalPageType, string> = {
  "privacy-policy": "نوضح هنا طريقة التعامل مع البيانات والخصوصية وملفات الارتباط بطريقة مباشرة وقابلة للقراءة.",
  "terms-of-service": "القواعد العامة لاستخدام الموقع والمحتوى التعليمي والخدمات المتاحة للمستخدمين.",
  "cookie-policy": "تفاصيل استخدام ملفات الارتباط والخدمات الخارجية وخيارات التحكم المتاحة للزائر.",
  "disclaimer": "تنبيه واضح حول حدود المسؤولية ودقة المحتوى وطريقة استخدام المواد التعليمية.",
};

interface ContactSection {
  siteName: string;
  siteUrl: string;
  contactEmail: string;
}

function ContactFooter({ siteName: _siteName, siteUrl, contactEmail }: ContactSection) {
  return (
    <div className="mt-12 pt-8 border-t border-border">
      <h2 className="text-xl font-bold text-foreground mb-2">التواصل معنا</h2>
      <p className="text-muted-foreground mb-6">إذا كانت لديك أي أسئلة أو اقتراحات، يسعدنا التواصل معك عبر:</p>
      <div className="flex flex-col gap-4">
        {contactEmail ? (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <a href={`mailto:${contactEmail}`} className="text-foreground hover:text-primary transition-colors font-medium">
              {contactEmail}
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
        {siteUrl && (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
            <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors font-medium">
              {siteUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function PrivacyPolicyContent({ siteName, siteUrl, contactEmail }: ContactSection) {
  return (
    <>
      <div className="prose max-w-none text-base leading-8 text-muted-foreground prose-headings:scroll-mt-28 prose-headings:font-black prose-headings:text-foreground prose-a:font-bold prose-a:text-primary prose-ul:leading-8 md:text-[17px]">
        <p className="lead">آخر تحديث: {LAST_UPDATED["privacy-policy"]}</p>
        <p>
          توضح سياسة الخصوصية هذه سياساتنا وإجراءاتنا بشأن جمع معلوماتك واستخدامها والإفصاح عنها عند
          استخدامك للخدمة، وتخبرك بحقوق الخصوصية الخاصة بك وكيف يحميك القانون.
        </p>
        <p>
          نحن نستخدم بياناتك الشخصية لتوفير الخدمة وتحسينها. باستخدام الخدمة، فإنك توافق على جمع
          المعلومات واستخدامها وفقًا لسياسة الخصوصية هذه.
        </p>

        <h2>التفسير والتعريفات</h2>
        <h3>التفسير</h3>
        <p>
          الكلمات التي يبدأ الحرف الأول منها بأحرف كبيرة لها معاني محددة وفقًا للشروط التالية. يجب أن
          يكون للتعريفات التالية نفس المعنى بغض النظر عما إذا كانت تظهر في صيغة المفرد أو الجمع.
        </p>
        <h3>التعاريف</h3>
        <p>لأغراض سياسة الخصوصية هذه:</p>
        <ul>
          <li><strong>الحساب</strong> يعني حسابًا فريدًا تم إنشاؤه لك للوصول إلى خدمتنا أو أجزاء من خدمتنا.</li>
          <li>
            <strong>الشركة</strong> (المشار إليها باسم "الشركة" أو "نحن" أو "خاصتنا" في هذه الاتفاقية) تشير إلى موقع{" "}
            <strong>{siteName}</strong>.
          </li>
          <li><strong>ملفات تعريف الارتباط</strong> هي ملفات صغيرة يتم وضعها على جهازك بواسطة موقع ويب، وتحتوي على تفاصيل سجل تصفحك.</li>
          <li><strong>البلد</strong> يشير إلى: الأردن.</li>
          <li><strong>الجهاز</strong> يعني أي جهاز يمكنه الوصول إلى الخدمة مثل الكمبيوتر أو الهاتف المحمول أو الجهاز اللوحي.</li>
          <li><strong>البيانات الشخصية</strong> هي أي معلومات تتعلق بشخص محدد أو يمكن تحديده.</li>
          <li><strong>الخدمة</strong> تشير إلى الموقع الإلكتروني.</li>
          {siteUrl && (
            <li>
              <strong>الموقع الإلكتروني</strong> يشير إلى موقع <strong>{siteName}</strong>، الذي يمكن الوصول إليه من{" "}
              <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                {siteUrl}
                <ExternalLink className="inline h-3.5 w-3.5" />
              </a>
            </li>
          )}
        </ul>

        <h2>جمع بياناتك الشخصية واستخدامها</h2>
        <h3>أنواع البيانات التي يتم جمعها</h3>
        <h4>البيانات الشخصية</h4>
        <p>
          أثناء استخدام خدمتنا، قد نطلب منك تزويدنا ببعض المعلومات الشخصية التي يمكن استخدامها للاتصال بك
          أو تحديد هويتك. قد تتضمن المعلومات الشخصية القابلة للتحديد، على سبيل المثال لا الحصر:
        </p>
        <ul>
          <li>الاسم الأول والأخير</li>
          <li>البريد الإلكتروني</li>
          <li>رقم الهاتف</li>
          <li>بيانات الاستخدام</li>
        </ul>
        <h4>بيانات الاستخدام</h4>
        <p>يتم جمع بيانات الاستخدام تلقائيًا عند استخدام الخدمة.</p>
        <p>
          قد تتضمن بيانات الاستخدام معلومات مثل عنوان IP لجهازك، ونوع المتصفح وإصداره، وصفحات الخدمة
          التي تزورها، ووقت وتاريخ زيارتك، والوقت الذي تقضيه في تلك الصفحات، ومعرفات الأجهزة الفريدة.
        </p>
        <h4>تقنيات التتبع وملفات تعريف الارتباط</h4>
        <p>
          نحن نستخدم ملفات تعريف الارتباط وتقنيات التتبع المماثلة لتتبع النشاط على خدمتنا وتخزين معلومات
          معينة. لمعرفة المزيد، اطّلع على{" "}
          <Link href="/cookie-policy">سياسة ملفات تعريف الارتباط</Link>.
        </p>

        <h2>استخدام بياناتك الشخصية</h2>
        <p>يجوز للشركة استخدام البيانات الشخصية للأغراض التالية:</p>
        <ul>
          <li><strong>لتوفير خدمتنا وصيانتها</strong>، بما في ذلك مراقبة استخدام خدمتنا.</li>
          <li><strong>لإدارة حسابك:</strong> لإدارة تسجيلك كمستخدم للخدمة.</li>
          <li><strong>للتواصل معك:</strong> عبر البريد الإلكتروني أو المكالمات الهاتفية أو الرسائل القصيرة.</li>
          <li><strong>لتزويدك بالأخبار:</strong> والعروض الخاصة والمعلومات العامة حول الخدمات.</li>
        </ul>

        <h2>الإعلانات وGoogle AdSense</h2>
        <p>
          نستخدم Google AdSense لعرض إعلانات على موقعنا. تستخدم Google وشركاؤها ملفات تعريف الارتباط
          أو تقنيات مشابهة لعرض الإعلانات وقياسها وتحسينها، وقد تعتمد هذه الإعلانات على زياراتك لهذا
          الموقع أو مواقع أخرى (الإعلانات المخصصة).
        </p>
        <p>يمكنك في أي وقت تعطيل تخصيص الإعلانات أو إدارة طريقة استخدام Google لبياناتك الإعلانية:</p>
        <ul>
          <li>
            <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">
              إعدادات إعلانات Google
            </a>
          </li>
          <li>
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
              كيف تستخدم Google البيانات عند استخدام مواقع شركائها
            </a>
          </li>
          <li>
            <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer">
              كيف تستخدم Google ملفات تعريف الارتباط
            </a>
          </li>
          <li>
            <Link href="/cookie-policy">سياسة ملفات تعريف الارتباط الخاصة بنا</Link>
          </li>
        </ul>

        <div className="not-prose mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-5 py-4">
          <Shield className="h-5 w-5 shrink-0 text-primary" />
          <p className="flex-1 text-sm text-muted-foreground">
            يمكنك مراجعة وتعديل موافقتك على ملفات تعريف الارتباط في أي وقت عبر إعدادات المتصفح الخاص بك.
          </p>
        </div>

        <h2>حقوقك بشأن بياناتك الشخصية</h2>
        <p>
          وفقًا للائحة الأوروبية لحماية البيانات (GDPR) وقانون خصوصية المستهلك في كاليفورنيا (CCPA)
          وما يقابلهما من أنظمة حماية البيانات المعمول بها، يحق لك ممارسة الحقوق التالية:
        </p>
        <ul>
          <li><strong>حق الوصول:</strong> يحق لك طلب نسخة من البيانات الشخصية التي نحتفظ بها عنك وكيفية معالجتها.</li>
          <li><strong>حق التصحيح:</strong> يحق لك طلب تصحيح أي بيانات شخصية غير دقيقة أو غير مكتملة.</li>
          <li><strong>حق الحذف (الحق في النسيان):</strong> يحق لك طلب حذف بياناتك الشخصية عندما لا تكون هناك ضرورة مشروعة للاحتفاظ بها.</li>
          <li><strong>حق الاعتراض على المعالجة:</strong> يحق لك الاعتراض على معالجة بياناتك لأغراض التسويق المباشر أو الإعلانات المخصصة.</li>
          <li><strong>حق تقييد المعالجة:</strong> يحق لك طلب تقييد معالجة بياناتك في حالات معينة.</li>
          <li><strong>حق نقل البيانات:</strong> يحق لك الحصول على بياناتك بصيغة منظمة وقابلة للقراءة آليًا.</li>
          <li><strong>حق سحب الموافقة:</strong> عند استناد المعالجة إلى موافقتك، يحق لك سحبها في أي وقت.</li>
        </ul>
        <p>
          لممارسة أي من هذه الحقوق، يُرجى التواصل معنا عبر البريد الإلكتروني أو{" "}
          <Link href="/contact-us">نموذج التواصل</Link>.
          سنرد على طلبك خلال <strong>30 يومًا</strong> من تاريخ استلامه.
        </p>

        <h2>خصوصية الأطفال</h2>
        <p>
          يستقبل موقع <strong>{siteName}</strong> طلاباً من مختلف المراحل الدراسية بما فيها المرحلة التمهيدية.
          نلتزم بحماية خصوصية الأطفال وفق الإرشادات المعمول بها، بما في ذلك قانون حماية خصوصية الأطفال عبر
          الإنترنت الأمريكي (COPPA) والأنظمة المماثلة الدولية.
        </p>
        <ul>
          <li>لا نجمع بيانات شخصية من الأطفال دون الثالثة عشرة من العمر بشكل مقصود دون موافقة ولي الأمر المسبقة.</li>
          <li>يُنصح أولياء الأمور بمرافقة أطفالهم عند استخدام الموقع وإنشاء أي حسابات بالنيابة عنهم.</li>
          <li>إذا اكتشفنا أننا جمعنا بيانات من طفل دون الثالثة عشرة دون موافقة ولي الأمر، سنحذف هذه البيانات فوراً.</li>
          <li>يحق لولي الأمر في أي وقت طلب الاطلاع على بيانات طفله أو تعديلها أو حذفها عبر التواصل معنا.</li>
        </ul>

        <h2>أمان بياناتك الشخصية</h2>
        <p>
          أمان بياناتك الشخصية مهم بالنسبة لنا. لا توجد طريقة نقل عبر الإنترنت أو طريقة تخزين إلكتروني
          آمنة بنسبة 100%، لكننا نسعى جاهدين لاستخدام وسائل مقبولة تجاريًا لحماية بياناتك.
        </p>

        <h2>التغييرات على سياسة الخصوصية هذه</h2>
        <p>
          قد نقوم بتحديث سياسة الخصوصية الخاصة بنا من وقت لآخر. سنعلمك بأي تغييرات من خلال نشر سياسة
          الخصوصية الجديدة على هذه الصفحة وتحديث تاريخ "آخر تحديث" في أعلاها.
        </p>
      </div>
      <ContactFooter siteName={siteName} siteUrl={siteUrl} contactEmail={contactEmail} />
    </>
  );
}

function TermsOfServiceContent({ siteName, siteUrl, contactEmail }: ContactSection) {
  return (
    <>
      <div className="prose max-w-none text-base leading-8 text-muted-foreground prose-headings:scroll-mt-28 prose-headings:font-black prose-headings:text-foreground prose-a:font-bold prose-a:text-primary prose-ul:leading-8 md:text-[17px]">
        <p className="lead">آخر تحديث: {LAST_UPDATED["terms-of-service"]}</p>
        <p>
          يرجى قراءة شروط وأحكام الاستخدام بعناية قبل استخدام موقع <strong>{siteName}</strong>
          {siteUrl ? (
            <> (<a href={siteUrl} target="_blank" rel="noopener noreferrer">{siteUrl}</a>)</>
          ) : null}.{" "}
          باستخدامك لهذا الموقع، فإنك توافق على الالتزام بالشروط والأحكام التالية.
        </p>

        <h2>1. مقدمة</h2>
        <p>
          يهدف موقع {siteName} إلى توفير محتوى تعليمي متكامل ومحدث يتماشى مع المنهاج الأردني. يتم تقسيم
          المحتوى إلى صفوف دراسية، مواد تعليمية، وأقسام مرفقات تهدف لدعم العملية التعليمية. يوفر الموقع
          أيضًا مقالات تعليمية وأخبار مخصصة للمعلمين والإدارة المدرسية.
        </p>

        <h2>2. التعريفات</h2>
        <ul>
          <li><strong>"الموقع":</strong> يشير إلى موقع {siteName}{siteUrl ? ` (${siteUrl})` : ""}.</li>
          <li><strong>"الخدمة":</strong> تعني جميع المحتويات، المواد التعليمية، والمرفقات التي يوفرها الموقع.</li>
          <li><strong>"المستخدم":</strong> أي شخص يصل إلى الموقع أو يستخدمه، سواء كان مديرًا، مشرفًا، أو عضوًا.</li>
          <li><strong>"العضوية":</strong> تعني الحساب المسجل الذي يمكن للمستخدم الوصول من خلاله إلى ميزات محددة.</li>
        </ul>

        <h2>3. الأدوار والصلاحيات</h2>
        <p>يقسم الموقع صلاحيات المستخدمين إلى ثلاث فئات:</p>
        <ul>
          <li><strong>المدير:</strong> يتمتع بكامل الصلاحيات لإدارة المحتوى، المستخدمين، والإعدادات.</li>
          <li><strong>المشرف:</strong> يقتصر دوره على إدارة المقالات (إضافة، تعديل، حذف).</li>
          <li><strong>العضو:</strong> يمكنه التعليق على المقالات وتحميل المرفقات فقط.</li>
        </ul>

        <h2>4. استخدام الخدمة</h2>
        <p>باستخدامك للموقع، فإنك توافق على:</p>
        <ul>
          <li>عدم استخدام الموقع لأي غرض غير قانوني أو ينتهك القوانين الأردنية.</li>
          <li>عدم محاولة اختراق أو تعطيل عمل الموقع.</li>
          <li>استخدام المحتوى المتاح فقط للأغراض التعليمية الشخصية وعدم إعادة توزيعه دون إذن مسبق.</li>
        </ul>

        <h2>5. الملكية الفكرية</h2>
        <p>
          جميع المحتويات المنشورة على الموقع، بما في ذلك النصوص، الصور، والشعارات، هي ملك لموقع {siteName}
          وتحميها قوانين حقوق الملكية الفكرية. يُحظر نسخ أو استخدام أي جزء من الموقع دون إذن كتابي مسبق.
        </p>

        <h2>6. سياسة المرفقات</h2>
        <p>يحتوي الموقع على مرفقات تعليمية تشمل:</p>
        <ul>
          <li>الخطة الدراسية.</li>
          <li>أوراق العمل وكورسات المواد.</li>
          <li>الاختبارات الشهرية والنهائية.</li>
          <li>الكتب الرسمية ودليل المعلم.</li>
        </ul>
        <p>يُسمح بتنزيل المرفقات للاستخدام الشخصي فقط، ويحظر توزيعها أو استخدامها لأغراض تجارية.</p>

        <h2>7. حدود المسؤولية</h2>
        <p>لا يتحمل الموقع أي مسؤولية عن:</p>
        <ul>
          <li>أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدامك للمحتوى أو المرفقات.</li>
          <li>أي معلومات غير دقيقة أو غير محدثة على الموقع.</li>
          <li>أي انقطاع في الخدمة بسبب عوامل خارجة عن إرادتنا.</li>
        </ul>

        <h2>8. التعديلات</h2>
        <p>
          يحتفظ موقع {siteName} بالحق في تعديل هذه الشروط والأحكام في أي وقت. سيتم إشعار المستخدمين بأي
          تغييرات من خلال تحديث هذه الصفحة. استمرارك في استخدام الموقع يعني قبولك للشروط المعدلة.
        </p>

        <h2>9. القانون الحاكم</h2>
        <p>تُفسر هذه الشروط والأحكام وفقًا لقوانين المملكة الأردنية الهاشمية.</p>
      </div>
      <ContactFooter siteName={siteName} siteUrl={siteUrl} contactEmail={contactEmail} />
    </>
  );
}

function CookiePolicyContent({ siteName, siteUrl, contactEmail }: ContactSection) {
  return (
    <>
      <div className="prose max-w-none text-base leading-8 text-muted-foreground prose-headings:scroll-mt-28 prose-headings:font-black prose-headings:text-foreground prose-a:font-bold prose-a:text-primary prose-ul:leading-8 md:text-[17px]">
        <p className="lead">آخر تحديث: {LAST_UPDATED["cookie-policy"]}</p>
        <p>
          توضح سياسة ملفات تعريف الارتباط هذه كيفية استخدام موقع{" "}
          <strong>{siteName}</strong>{" "}
          {siteUrl && (
            <>
              (
              <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                {siteUrl}
                <ExternalLink className="inline h-3.5 w-3.5" />
              </a>
              ){" "}
            </>
          )}
          ملفات تعريف الارتباط (Cookies) وتقنيات التتبع المماثلة لتحسين تجربة المستخدم وتقديم خدمات مخصصة.
        </p>

        <h2>1. ما هي ملفات تعريف الارتباط؟</h2>
        <p>
          ملفات تعريف الارتباط هي ملفات نصية صغيرة يتم تخزينها على جهازك عند زيارة موقعنا. تُستخدم هذه
          الملفات لتذكر تفضيلاتك وتحسين تجربتك وتحليل أنماط الاستخدام. بالإضافة إلى ملفات تعريف الارتباط،
          قد نستخدم تقنيات مشابهة مثل Web Storage و Pixel Tags.
        </p>

        <h2>2. أنواع ملفات تعريف الارتباط التي نستخدمها</h2>
        <h3>أ. حسب المدة الزمنية</h3>
        <ul>
          <li><strong>ملفات الجلسة (Session Cookies):</strong> تُحذف تلقائيًا عند إغلاق المتصفح.</li>
          <li><strong>الملفات الدائمة (Persistent Cookies):</strong> تظل مخزنة حتى انتهاء صلاحيتها أو حذفها يدويًا.</li>
        </ul>
        <h3>ب. حسب الغرض</h3>
        <ul>
          <li>
            <strong>الضرورية (Always Active):</strong> مطلوبة لعمل الموقع الأساسي كالمصادقة وحفظ
            جلسة تسجيل الدخول وإعدادات الخصوصية. لا يمكن تعطيلها.
          </li>
          <li>
            <strong>التحليلية / الإحصائية:</strong> تجمع معلومات مجهولة الهوية حول كيفية استخدام
            الزوار للموقع (عدد الزيارات، الصفحات الأكثر زيارةً، مدة الجلسة). المزود: Google Analytics.
          </li>
          <li>
            <strong>الإعلانية:</strong> تُستخدم لعرض إعلانات مخصصة بناءً على اهتماماتك وسلوك
            التصفح. المزود: Google AdSense (ملف تعريف DART).
          </li>
          <li><strong>الوظيفية:</strong> تتذكر تفضيلاتك مثل اللغة والمنطقة والإعدادات المخصصة.</li>
          <li><strong>الأداء:</strong> تُساعد في قياس أوقات التحميل وتحسين استجابة الموقع.</li>
        </ul>

        <h2>3. موافقة الكوكيز وضوابط الخصوصية</h2>
        <p>
          يطبّق موقعنا <strong>Google Consent Mode v2</strong> الذي يضبط جميع إشارات الموافقة على
          "مرفوض" افتراضيًا قبل تحميل أي أداة تسويقية. لا تُجمع بيانات إعلانية أو تحليلية إلا
          بعد حصول الموقع على موافقة صريحة منك.
        </p>
        <p>
          عند زيارتك الأولى يظهر بانر للموافقة يتيح لك اختيار فئات الكوكيز التي توافق عليها. يمكنك
          في أي وقت مراجعة اختياراتك أو تغييرها من خلال إعدادات المتصفح الخاص بك.
        </p>

        <div className="not-prose my-4 flex flex-wrap items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-5 py-4">
          <Shield className="h-5 w-5 shrink-0 text-primary" />
          <p className="flex-1 text-sm text-muted-foreground">
            يمكنك إدارة ملفات تعريف الارتباط في أي وقت من إعدادات متصفحك.
          </p>
        </div>

        <h2>4. الخدمات الخارجية وملفاتها</h2>
        <h3>Google Analytics</h3>
        <p>
          نستخدم Google Analytics لتحليل أداء الموقع. تجمع هذه الخدمة بيانات مجهولة الهوية عن
          أنماط الاستخدام. يمكن إلغاء التتبع عبر:
        </p>
        <ul>
          <li>
            <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
              إضافة إلغاء الاشتراك في Google Analytics
            </a>
          </li>
        </ul>
        <h3>Google AdSense</h3>
        <p>
          نستخدم Google AdSense لعرض إعلانات. تستخدم Google ملف تعريف DART لعرض إعلانات
          مخصصة بناءً على زياراتك السابقة. يمكن إلغاء الاشتراك عبر:
        </p>
        <ul>
          <li>
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
              إعدادات إعلانات Google
            </a>
          </li>
          <li>
            <a href="https://optout.aboutads.info" target="_blank" rel="noopener noreferrer">
              aboutads.info (إلغاء اشتراك موحد)
            </a>
          </li>
        </ul>
        <h3>Google Tag Manager</h3>
        <p>
          نستخدم Google Tag Manager لإدارة الأكواد البرمجية. GTM بحد ذاته لا يجمع بيانات شخصية
          لكنه يتحكم في تحميل الأدوات الأخرى وفق إعدادات الموافقة.
        </p>

        <h2>5. التحكم في ملفات تعريف الارتباط عبر المتصفح</h2>
        <p>
          يمكنك التحكم في ملفات تعريف الارتباط أو حذفها من خلال إعدادات متصفحك. لاحظ أن تعطيل
          بعض الملفات قد يؤثر على وظائف الموقع.
        </p>
        <ul>
          <li>
            <a href="https://support.google.com/chrome/answer/95647?hl=ar" target="_blank" rel="noopener noreferrer">
              Google Chrome
            </a>
          </li>
          <li>
            <a href="https://support.mozilla.org/ar/kb/حظر-ملفات-تعريف-الارتباط" target="_blank" rel="noopener noreferrer">
              Mozilla Firefox
            </a>
          </li>
          <li>
            <a href="https://support.apple.com/ar-sa/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">
              Apple Safari
            </a>
          </li>
          <li>
            <a href="https://support.microsoft.com/ar-sa/windows/حذف-ملفات-تعريف-الارتباط-وإدارتها-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer">
              Microsoft Edge
            </a>
          </li>
        </ul>

        <h2>6. تحديثات سياسة الكوكيز</h2>
        <p>
          قد يتم تحديث هذه السياسة من وقت لآخر لتعكس التغييرات في الخدمات المستخدمة أو المتطلبات
          القانونية. يُنصح بمراجعة هذه الصفحة بانتظام. تاريخ آخر تحديث مذكور في أعلى الصفحة.
        </p>
      </div>
      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-xl font-bold text-foreground mb-2">التواصل معنا</h2>
        <p className="text-muted-foreground mb-6">لأي استفسار حول سياسة الكوكيز:</p>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`} className="text-foreground hover:text-primary transition-colors font-medium">
                {contactEmail}
              </a>
            ) : (
              <Link href="/contact-us" className="text-foreground hover:text-primary transition-colors font-medium">
                نموذج التواصل
              </Link>
            )}
          </div>
          {siteUrl && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Globe className="w-5 h-5" />
              </div>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors font-medium">
                {siteUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DisclaimerContent({ siteName, siteUrl, contactEmail }: ContactSection) {
  return (
    <>
      <div className="prose max-w-none text-base leading-8 text-muted-foreground prose-headings:scroll-mt-28 prose-headings:font-black prose-headings:text-foreground prose-a:font-bold prose-a:text-primary prose-ul:leading-8 md:text-[17px]">
        <p className="lead">آخر تحديث: {LAST_UPDATED["disclaimer"]}</p>

        <h2>1. الغرض من الموقع</h2>
        <p>
          موقع <strong>{siteName}</strong>
          {siteUrl && (
            <> (<a href={siteUrl} target="_blank" rel="noopener noreferrer">{siteUrl}</a>)</>
          )}{" "}
          هو منصة تعليمية تهدف إلى تقديم محتوى تعليمي محدث ومصمم لدعم العملية التعليمية وفقًا للمنهاج
          الأردني. جميع المعلومات والمحتويات المقدمة على هذا الموقع هي لأغراض تعليمية وإرشادية فقط.
        </p>

        <h2>2. دقة المعلومات</h2>
        <p>
          نحن نسعى لضمان دقة وصحة جميع المعلومات المقدمة على الموقع. ومع ذلك، لا نضمن أن تكون جميع
          المواد والمحتويات خالية تمامًا من الأخطاء أو محدثة بشكل كامل. يتحمل المستخدم مسؤولية التحقق
          من المعلومات قبل الاعتماد عليها.
        </p>

        <h2>3. حدود المسؤولية</h2>
        <p>موقع {siteName} غير مسؤول عن:</p>
        <ul>
          <li>أي أضرار مباشرة أو غير مباشرة قد تنجم عن استخدامك للموقع أو الاعتماد على محتوياته.</li>
          <li>أي خسائر أو أضرار تتعلق بتنزيل المرفقات أو المستندات التعليمية من الموقع.</li>
          <li>أي انقطاع في الخدمة بسبب مشكلات تقنية أو خارجية.</li>
        </ul>

        <h2>4. الروابط الخارجية</h2>
        <p>
          قد يحتوي الموقع على روابط لمواقع إلكترونية خارجية لتسهيل الوصول إلى مصادر إضافية. نحن غير
          مسؤولين عن محتوى أو سياسات الخصوصية الخاصة بهذه المواقع.
        </p>

        <h2>5. الاستخدام الشخصي وغير التجاري</h2>
        <p>
          جميع المحتويات والمواد التعليمية المقدمة على الموقع مصممة للاستخدام الشخصي وغير التجاري.
          يُحظر نسخ أو إعادة توزيع أي محتوى دون إذن كتابي مسبق.
        </p>

        <h2>6. حقوق الملكية الفكرية والمحتوى المنشور</h2>
        <p>
          يحترم موقع <strong>{siteName}</strong> حقوق الملكية الفكرية ويلتزم بالقوانين المعمول بها.
          يتضمن الموقع مواد تعليمية متنوعة؛ ونلتزم بالتحقق من ملكية هذه المواد أو الحصول على تصريح مناسب
          لنشرها.
        </p>
        <p>تنطبق على المحتوى المنشور السياسة التالية:</p>
        <ul>
          <li>المواد الصادرة رسميًا عن وزارة التربية والتعليم الأردنية تُعامَل كمحتوى عام متاح للاستخدام التعليمي.</li>
          <li>المحتوى المقدَّم من معلمين أو مستخدمين يخضع لمراجعة وفق سياسة النشر الداخلية للموقع.</li>
          <li>أي محتوى محمي بحقوق ملكية يُبلَّغ عنه يُراجَع ويُزال خلال المدة القانونية المحددة.</li>
        </ul>

        <h2>7. إجراءات إشعار DMCA وإزالة المحتوى</h2>
        <p>
          إذا كنت تعتقد أن أيًّا من المحتويات المنشورة على موقعنا ينتهك حقوق الملكية الفكرية الخاصة
          بك، يُرجى إرسال إشعار رسمي يتضمن العناصر التالية:
        </p>
        <ul>
          <li>اسمك الكامل وبيانات التواصل (البريد الإلكتروني ورقم الهاتف).</li>
          <li>وصف واضح للعمل المحمي بحقوق الملكية الذي تدّعي انتهاكه.</li>
          <li>الرابط المحدد (URL) للمحتوى الذي تطلب إزالته.</li>
          <li>بيان بأنك تؤمن بحسن نية بأن الاستخدام المعترَض عليه غير مرخَّص من صاحب حق الملكية أو وكيله أو القانون.</li>
          <li>بيان بأن المعلومات الواردة في إشعارك دقيقة وأنك صاحب الحق أو مفوَّض بالتصرف نيابةً عنه.</li>
        </ul>

        <div className="not-prose my-5 flex flex-wrap items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1 text-sm text-amber-900 dark:text-amber-400">
            <p className="font-semibold mb-1">خطوات تقديم الإشعار:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>أرسل الإشعار بالتفاصيل أعلاه إلى بريدنا الإلكتروني.</li>
              <li>سنرسل تأكيد الاستلام خلال <strong>48 ساعة</strong>.</li>
              <li>سيُراجَع الإشعار خلال <strong>10 أيام عمل</strong> ويُتخذ القرار المناسب.</li>
              <li>في حال صحة الإشعار يُزال المحتوى فور التحقق وتُبلَّغ الجهة المعنية.</li>
            </ol>
          </div>
        </div>

        {contactEmail ? (
          <p>
            يُرجى إرسال إشعار DMCA إلى:{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </p>
        ) : (
          <p>
            يُرجى إرسال إشعار DMCA عبر <Link href="/contact-us">نموذج التواصل</Link>.
          </p>
        )}

        <h2>8. سياسة التحقق من ملكية الملفات قبل النشر</h2>
        <p>يلتزم الموقع قبل نشر أي ملف أو مادة تعليمية بمراجعة المصدر والتحقق من أحد المعايير التالية:</p>
        <ul>
          <li>صدور المادة رسميًا عن جهة حكومية أو مؤسسة تعليمية معتمدة.</li>
          <li>حصول الناشر على إذن صريح من صاحب الحق بالنشر على المنصة.</li>
          <li>خضوع المادة لترخيص مفتوح (Creative Commons أو ما يعادله) يُجيز إعادة النشر للأغراض التعليمية.</li>
          <li>إنتاج المادة بالكامل من قِبل فريق الموقع أو ناشريه المعتمدين.</li>
        </ul>
        <p>
          المحتوى المخالف لهذه المعايير يُزال فور اكتشافه أو الإبلاغ عنه، ويحتفظ الموقع بحق تعليق
          حساب أي ناشر يُخالف هذه السياسة.
        </p>

        <h2>9. تحديث إخلاء المسؤولية</h2>
        <p>
          قد يتم تحديث هذه الصفحة من وقت لآخر لتعكس تغييرات في السياسات أو اللوائح. يُنصح المستخدمون
          بمراجعتها بانتظام للتأكد من فهمهم لأحدث النسخ.
        </p>
      </div>
      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-xl font-bold text-foreground mb-2">التواصل معنا</h2>
        <p className="text-muted-foreground mb-6">لأي استفسار أو إبلاغ عن انتهاك لحقوق الملكية:</p>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`} className="text-foreground hover:text-primary transition-colors font-medium">
                {contactEmail}
              </a>
            ) : (
              <Link href="/contact-us" className="text-foreground hover:text-primary transition-colors font-medium">
                نموذج التواصل
              </Link>
            )}
          </div>
          {siteUrl && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Globe className="w-5 h-5" />
              </div>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors font-medium">
                {siteUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function LegalPage({ type }: { type: LegalPageType }) {
  const { data: settings } = useQuery({
    queryKey: ["front-settings"],
    queryFn: () => systemApi.getPublicSettings(),
  });

  const siteName = (settings?.site_name ?? "").trim() || "موقع الإيمان التعليمي";
  const siteUrl = ((settings as any)?.canonical_url ?? settings?.site_url ?? "").trim();
  const contactEmail = (settings?.contact_email ?? "").trim();

  const contactProps: ContactSection = { siteName, siteUrl, contactEmail };

  return (
    <div className="font-sans">
      <StaticPageHeader
        title={titles[type]}
        current={titles[type]}
        eyebrow={siteName}
        description={descriptions[type]}
      />
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6 md:p-8">
          {type === "privacy-policy" && <PrivacyPolicyContent {...contactProps} />}
          {type === "terms-of-service" && <TermsOfServiceContent {...contactProps} />}
          {type === "cookie-policy" && <CookiePolicyContent {...contactProps} />}
          {type === "disclaimer" && <DisclaimerContent {...contactProps} />}
        </div>
      </div>
    </div>
  );
}
