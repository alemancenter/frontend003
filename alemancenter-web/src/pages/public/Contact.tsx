import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { systemApi } from "@/lib/api/system";
import StaticPageHeader from "@/components/common/StaticPageHeader";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Send,
  User,
  FileText,
  MessageSquare,
} from "lucide-react";
import { FaFacebookF, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";

export function Contact() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const { data: settings } = useQuery({
    queryKey: ["front-settings"],
    queryFn: () => systemApi.getPublicSettings(),
  });

  const siteName = (settings?.site_name ?? "").trim() || "موقع الإيمان التعليمي";
  const contactEmail = (settings?.contact_email ?? "").trim();
  const contactPhone = (settings?.contact_phone ?? "").trim();
  const contactAddress = ((settings as any)?.contact_address ?? "").trim();
  const siteUrl = ((settings as any)?.canonical_url ?? settings?.site_url ?? "").trim();
  const socialFacebook = (settings?.social_facebook ?? "").trim();
  const socialTwitter = (settings?.social_twitter ?? "").trim();
  const socialYoutube = (settings?.social_youtube ?? "").trim();
  const socialInstagram = (settings?.social_instagram ?? "").trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await systemApi.contact({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      });
      toast({ title: "تم إرسال رسالتك بنجاح", description: "سنقوم بالرد عليك في أقرب وقت." });
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-sans">
      <StaticPageHeader
        title="اتصل بنا"
        current="اتصل بنا"
        eyebrow={siteName}
        description="نحن هنا للإجابة على استفساراتك واقتراحاتك. أرسل لنا رسالة وسنرد عليك في أقرب وقت ممكن."
      />

      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-black text-foreground">معلومات التواصل</h2>
              <div className="space-y-4">
                {contactEmail && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-muted-foreground">البريد الإلكتروني</p>
                      <a
                        href={`mailto:${contactEmail}`}
                        className="mt-0.5 block text-sm font-bold text-foreground hover:text-primary transition-colors"
                        dir="ltr"
                      >
                        {contactEmail}
                      </a>
                    </div>
                  </div>
                )}
                {contactPhone && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-muted-foreground">رقم الهاتف</p>
                      <a
                        href={`tel:${contactPhone}`}
                        className="mt-0.5 block text-sm font-bold text-foreground hover:text-primary transition-colors"
                        dir="ltr"
                      >
                        {contactPhone}
                      </a>
                    </div>
                  </div>
                )}
                {contactAddress && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-muted-foreground">العنوان</p>
                      <p className="mt-0.5 text-sm font-bold text-foreground">{contactAddress}</p>
                    </div>
                  </div>
                )}
                {siteUrl && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-muted-foreground">الموقع الإلكتروني</p>
                      <a
                        href={siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-sm font-bold text-foreground hover:text-primary transition-colors"
                        dir="ltr"
                      >
                        {siteUrl}
                      </a>
                    </div>
                  </div>
                )}
                {!contactEmail && !contactPhone && !contactAddress && !siteUrl && (
                  <p className="text-sm text-muted-foreground">
                    استخدم النموذج المقابل للتواصل معنا مباشرة.
                  </p>
                )}
              </div>
            </div>

            {(socialFacebook || socialTwitter || socialYoutube || socialInstagram) && (
              <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                <h2 className="mb-4 text-lg font-black text-foreground">تابعنا</h2>
                <div className="flex flex-wrap gap-3">
                  {socialFacebook && (
                    <a
                      href={socialFacebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted transition hover:bg-primary hover:text-primary-foreground hover:border-primary"
                      aria-label="Facebook"
                    >
                      <FaFacebookF className="h-5 w-5" />
                    </a>
                  )}
                  {socialTwitter && (
                    <a
                      href={socialTwitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted transition hover:bg-primary hover:text-primary-foreground hover:border-primary"
                      aria-label="Twitter / X"
                    >
                      <FaXTwitter className="h-5 w-5" />
                    </a>
                  )}
                  {socialYoutube && (
                    <a
                      href={socialYoutube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted transition hover:bg-primary hover:text-primary-foreground hover:border-primary"
                      aria-label="YouTube"
                    >
                      <FaYoutube className="h-5 w-5" />
                    </a>
                  )}
                  {socialInstagram && (
                    <a
                      href={socialInstagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted transition hover:bg-primary hover:text-primary-foreground hover:border-primary"
                      aria-label="Instagram"
                    >
                      <FaInstagram className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-sm">
              <MessageSquare className="mb-3 h-7 w-7" />
              <h2 className="text-lg font-black">وقت الاستجابة</h2>
              <p className="mt-2 text-sm font-medium leading-7 opacity-90">
                نسعى للرد على جميع الرسائل خلال 24-48 ساعة في أيام العمل.
              </p>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <p className="text-sm font-black text-primary">راسلنا</p>
                <h2 className="mt-1 text-2xl font-black text-foreground">أرسل رسالة</h2>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  املأ النموذج أدناه وسنتواصل معك في أقرب وقت ممكن.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="contact-name" className="block text-sm font-black text-foreground">
                      الاسم الكامل <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="اكتب اسمك الكامل"
                        className="h-12 w-full rounded-xl border bg-muted/40 py-3 pl-4 pr-10 text-sm font-medium outline-none transition placeholder:text-muted-foreground focus:bg-background focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-email" className="block text-sm font-black text-foreground">
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="contact-email"
                        type="email"
                        required
                        dir="ltr"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="example@email.com"
                        className="h-12 w-full rounded-xl border bg-muted/40 py-3 pl-4 pr-10 text-sm font-medium outline-none transition placeholder:text-muted-foreground focus:bg-background focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="contact-phone" className="block text-sm font-black text-foreground">
                      رقم الهاتف <span className="text-muted-foreground text-xs font-bold">(اختياري)</span>
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="contact-phone"
                        type="tel"
                        dir="ltr"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+962 7X XXX XXXX"
                        className="h-12 w-full rounded-xl border bg-muted/40 py-3 pl-4 pr-10 text-sm font-medium outline-none transition placeholder:text-muted-foreground focus:bg-background focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-subject" className="block text-sm font-black text-foreground">
                      الموضوع <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="contact-subject"
                        type="text"
                        required
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        placeholder="موضوع الرسالة"
                        className="h-12 w-full rounded-xl border bg-muted/40 py-3 pl-4 pr-10 text-sm font-medium outline-none transition placeholder:text-muted-foreground focus:bg-background focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-message" className="block text-sm font-black text-foreground">
                    نص الرسالة <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MessageSquare className="pointer-events-none absolute right-3 top-4 h-4 w-4 text-muted-foreground" />
                    <textarea
                      id="contact-message"
                      required
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="اكتب رسالتك هنا بالتفصيل..."
                      className="w-full rounded-xl border bg-muted/40 py-3 pl-4 pr-10 text-sm font-medium outline-none transition placeholder:text-muted-foreground focus:bg-background focus:ring-4 focus:ring-primary/10 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-black text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      إرسال الرسالة
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
