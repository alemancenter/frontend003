import React from "react";
import { Link } from "wouter";
import { BookOpen, Mail, Phone, MapPin } from "lucide-react";
import { useCountry } from "@/hooks/use-country";
import { routes } from "@/lib/country";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { imgUrl, imgSrcSet } from "@/lib/img-url";

// ─── Minimal inline SVG social icons ─────────────────────────────────────────

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}
function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
function SnapchatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12.017 2C9.6 2 7.37 3.1 5.9 5c-.9 1.2-1.4 2.7-1.4 4.3 0 .4 0 .7.1 1.1-.3.1-.6.1-.9.1-.5 0-.9-.1-1.3-.2l-.3-.1-.1.3c-.1.4 0 .8.3 1 .5.4 1.1.7 1.8.9.1.6.4 1.2.8 1.7-.3.3-.8.7-1.6.9-.2.1-.4.2-.4.5s.2.5.6.6c1.3.4 2.1.8 2.6 1.8.1.3.4.4.7.4.4 0 .9-.2 1.4-.4.7-.3 1.5-.6 2.4-.6s1.7.3 2.4.6c.5.2 1 .4 1.4.4.3 0 .6-.1.7-.4.5-1 1.3-1.4 2.6-1.8.4-.1.6-.4.6-.6s-.2-.4-.4-.5c-.8-.2-1.3-.6-1.6-.9.4-.5.7-1.1.8-1.7.7-.2 1.3-.5 1.8-.9.3-.2.4-.6.3-1l-.1-.3-.3.1c-.4.1-.8.2-1.3.2-.3 0-.6 0-.9-.1.1-.4.1-.7.1-1.1 0-1.6-.5-3.1-1.4-4.3C16.63 3.1 14.4 2 12.017 2z" />
    </svg>
  );
}

// ─── Social link entry ────────────────────────────────────────────────────────

interface SocialEntry {
  key: string;
  label: string;
  Icon: () => React.ReactElement;
}

const SOCIAL_ENTRIES: SocialEntry[] = [
  { key: "social_facebook",  label: "فيسبوك",  Icon: FacebookIcon  },
  { key: "social_twitter",   label: "تويتر",   Icon: TwitterIcon   },
  { key: "social_youtube",   label: "يوتيوب",  Icon: YoutubeIcon   },
  { key: "social_instagram", label: "إنستغرام",Icon: InstagramIcon  },
  { key: "social_whatsapp",  label: "واتساب",  Icon: WhatsappIcon  },
  { key: "social_tiktok",    label: "تيك توك", Icon: TiktokIcon    },
  { key: "social_linkedin",  label: "لينكدإن", Icon: LinkedinIcon  },
  { key: "social_snapchat",  label: "سناب",    Icon: SnapchatIcon  },
];

// ─── Footer ───────────────────────────────────────────────────────────────────

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-black text-slate-900 dark:text-white">{children}</h3>
      <div className="mt-1.5 h-1 w-8 rounded-full bg-blue-600" />
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-slate-500 hover:text-blue-700 transition-colors font-semibold dark:text-slate-400 dark:hover:text-blue-400"
      >
        {children}
      </Link>
    </li>
  );
}

export function Footer() {
  const country = useCountry();
  const settings = useSiteSettings();

  const siteName = settings.site_name || "موقع الإيمان التعليمي";
  const siteDescription =
    settings.site_description ||
    "المنصة التعليمية الأولى في الأردن والشرق الأوسط، نقدم محتوى تعليمي موثوق وملفات دراسية ومقالات تهم الطالب والمعلم وولي الأمر، لنرتقي معاً بالتعليم.";

  const logoPath = imgUrl(settings.site_logo, 112);

  const activeSocials = SOCIAL_ENTRIES.filter(({ key }) => !!settings[key]);

  return (
    <footer className="border-t border-slate-200 bg-white pt-14 pb-8 dark:border-slate-800 dark:bg-slate-950" dir="rtl">
      <div className="mx-auto max-w-[1540px] px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">

          {/* ── Brand column (wider) ── */}
          <div className="md:col-span-5">
            <Link href="/" className="mb-5 flex items-center gap-3">
              {logoPath ? (
                <img
                  src={logoPath!}
                  srcSet={imgSrcSet(settings.site_logo, 56)}
                  sizes="56px"
                  alt={siteName}
                  className="h-14 w-14 rounded-2xl object-contain"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30">
                  <BookOpen className="h-7 w-7" />
                </div>
              )}
              <div>
                <p className="text-xl font-black text-slate-950 dark:text-white">{siteName}</p>
                <p className="text-xs font-semibold text-slate-400">بوابة المستقبل التعليمية</p>
              </div>
            </Link>

            <p className="mb-6 max-w-sm text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">
              {siteDescription}
            </p>

            {/* Contact info */}
            <div className="mb-6 space-y-2 text-sm text-slate-500 dark:text-slate-400">
              {settings.contact_email && (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="flex items-center gap-2 transition-colors hover:text-blue-700 dark:hover:text-blue-400 font-semibold"
                  dir="ltr"
                >
                  <Mail className="h-4 w-4 shrink-0 text-blue-500" />
                  {settings.contact_email}
                </a>
              )}
              {settings.contact_phone && (
                <a
                  href={`tel:${settings.contact_phone}`}
                  className="flex items-center gap-2 transition-colors hover:text-blue-700 dark:hover:text-blue-400 font-semibold"
                  dir="ltr"
                >
                  <Phone className="h-4 w-4 shrink-0 text-blue-500" />
                  {settings.contact_phone}
                </a>
              )}
              {settings.contact_address && (
                <p className="flex items-start gap-2 font-semibold">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  {settings.contact_address}
                </p>
              )}
            </div>

            {/* Social links */}
            {activeSocials.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeSocials.map(({ key, label, Icon }) => (
                  <a
                    key={key}
                    href={settings[key] as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all duration-200 hover:scale-105 hover:bg-blue-700 hover:text-white dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-blue-700 dark:hover:text-white"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── Quick links ── */}
          <div className="md:col-span-3">
            <FooterHeading>روابط سريعة</FooterHeading>
            <ul className="space-y-3 text-sm">
              <FooterLink href={routes.lessonList(country)}>الدروس والمواد</FooterLink>
              <FooterLink href="/grades">الصفوف الدراسية</FooterLink>
              <FooterLink href="/calendar">التقويم الدراسي</FooterLink>
              <FooterLink href="/teacher-subscription">اشتراكات المعلمين</FooterLink>
              <FooterLink href="/contact-us">اتصل بنا</FooterLink>
              <FooterLink href="/about-us">من نحن</FooterLink>
              <FooterLink href="/faq">الأسئلة الشائعة</FooterLink>
            </ul>
          </div>

          {/* ── Legal ── */}
          <div className="md:col-span-4">
            <FooterHeading>السياسات والشروط</FooterHeading>
            <ul className="space-y-3 text-sm">
              <FooterLink href="/privacy-policy">سياسة الخصوصية</FooterLink>
              <FooterLink href="/terms-of-service">شروط الاستخدام</FooterLink>
              <FooterLink href="/cookie-policy">سياسة ملفات الارتباط</FooterLink>
              <FooterLink href="/disclaimer">إخلاء المسؤولية</FooterLink>
              <FooterLink href="/copyright">حقوق الملكية الفكرية</FooterLink>
              <FooterLink href="/editorial-policy">سياسة التحرير</FooterLink>
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-8 text-sm text-slate-400 sm:flex-row dark:border-slate-800 dark:text-slate-500">
          <p className="font-semibold">
            © {new Date().getFullYear()} {siteName}. جميع الحقوق محفوظة.
          </p>
          <p className="font-semibold">
            صُنع بـ ❤️ لأجل الطلاب والمعلمين
          </p>
        </div>
      </div>
    </footer>
  );
}
