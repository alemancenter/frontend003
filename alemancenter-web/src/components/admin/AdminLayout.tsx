import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { prefetchRoute } from "@/lib/prefetch";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { imgUrl } from "@/lib/img-url";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  FileText,
  Files,
  MessageSquare,
  Users,
  Shield,
  Settings,
  Bell,
  Mail,
  MailCheck,
  MailWarning,
  Calendar,
  GraduationCap,
  HardDrive,
  CreditCard,
  Activity,
  LogOut,
  ChevronDown,
  ChevronLeft,
  BarChart3,
  Server,
  Gauge,
  Database,
  Map,
  Bot,
  FolderOpen,
  BookOpen,
  BookMarked,
  Wrench,
  MessageCircle,
  UserCheck,
  ShieldCheck,
  ListChecks,
  CheckCircle,
  DollarSign,
  Menu,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: string | string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const sidebarGroups: NavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { title: "لوحة القيادة", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "المحتوى",
    items: [
      { title: "المقالات", href: "/admin/articles", icon: FileText, permission: "manage articles" },
      { title: "المنشورات", href: "/admin/posts", icon: Files, permission: "manage posts" },
      { title: "التصنيفات", href: "/admin/categories", icon: FolderOpen, permission: "manage categories" },
      { title: "التعليقات", href: "/admin/comments", icon: MessageSquare, permission: "manage comments" },
      { title: "الملفات", href: "/admin/files", icon: HardDrive, permission: "manage files" },
    ],
  },
  {
    label: "الأكاديمي",
    items: [
      { title: "الأكاديمي", href: "/admin/academic", icon: GraduationCap, permission: ["manage school classes", "manage subjects", "manage semesters"] },
      { title: "الصفوف", href: "/admin/school-classes", icon: GraduationCap, permission: "manage school classes" },
      { title: "المواد", href: "/admin/subjects", icon: BookMarked, permission: "manage subjects" },
      { title: "الفصول", href: "/admin/semesters", icon: BookOpen, permission: "manage semesters" },
      { title: "التقويم", href: "/admin/calendar", icon: Calendar, permission: "manage calendar" },
    ],
  },
  {
    label: "المستخدمون",
    items: [
      { title: "المستخدمين", href: "/admin/users", icon: Users, permission: "manage users" },
      { title: "الأدوار", href: "/admin/roles", icon: UserCheck, permission: "manage roles" },
      { title: "الصلاحيات", href: "/admin/permissions", icon: Shield, permission: "manage permissions" },
      { title: "الاشتراكات", href: "/admin/teacher-subscriptions", icon: CreditCard, permission: "manage teacher subscriptions" },
    ],
  },
  {
    label: "التواصل",
    items: [
      { title: "الرسائل", href: "/admin/messages", icon: Mail, permission: "manage messages" },
      { title: "رسائل التواصل", href: "/admin/contact-messages", icon: MessageCircle, permission: "manage messages" },
      { title: "الإشعارات", href: "/admin/notifications", icon: Bell, permission: "manage notifications" },
    ],
  },
  {
    label: "الذكاء الاصطناعي",
    items: [
      { title: "المحادثة الذكية", href: "/admin/chatbot", icon: Bot, permission: "manage settings" },
      { title: "جاهزية AdSense", href: "/admin/adsense-readiness", icon: ShieldCheck, permission: "manage content audit" },
      { title: "مراجعة المحتوى", href: "/admin/content-review", icon: ListChecks, permission: "manage content audit" },
      { title: "تحسين الجودة", href: "/admin/content-quality", icon: CheckCircle, permission: "manage content audit" },
      { title: "تكلفة AI", href: "/admin/ai-costs", icon: DollarSign, permission: "manage content audit" },
    ],
  },
  {
    label: "النظام",
    items: [
      { title: "التحليلات", href: "/admin/analytics", icon: BarChart3, permission: "manage monitoring" },
      { title: "المراقبة", href: "/admin/monitor", icon: Server, permission: "manage monitoring" },
      { title: "الأداء", href: "/admin/performance", icon: Gauge, permission: "manage settings" },
      { title: "Redis", href: "/admin/redis", icon: Database, permission: "manage settings" },
      { title: "خريطة الموقع", href: "/admin/sitemap", icon: Map, permission: "manage sitemap" },
      { title: "تدقيق المحتوى", href: "/admin/content-audit", icon: Activity, permission: "manage content audit" },
      { title: "الأمان", href: "/admin/security", icon: Shield, permission: "manage security" },
      { title: "الإعدادات", href: "/admin/settings", icon: Settings, permission: "manage settings" },
      { title: "البريد المرتد", href: "/admin/settings/email-bounce", icon: MailWarning, permission: "manage settings" },
      { title: "التحقق من البريد", href: "/admin/settings/email-verification", icon: MailCheck, permission: "manage settings" },
    ],
  },
];

function SidebarContent({ location }: { location: string }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { hasPermission, canAccessAdmin } = useAuth();

  const visibleGroups = useMemo(() => {
    const canViewItem = (item: NavItem) => {
      if (!item.permission) return canAccessAdmin;
      const permissions = Array.isArray(item.permission) ? item.permission : [item.permission];
      return permissions.some((permission) => hasPermission(permission));
    };

    return sidebarGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(canViewItem),
      }))
      .filter((group) => group.items.length > 0);
  }, [canAccessAdmin, hasPermission]);

  const toggle = (label: string) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));

  const isGroupActive = (group: NavGroup) =>
    group.items.some(
      (item) =>
        location === item.href ||
        (location.startsWith(item.href + "/") && item.href !== "/admin")
    );

  return (
    <nav className="grid gap-0.5 px-3 py-2 text-right text-sm font-medium">
      {visibleGroups.map((group) => {
        const isOpen = collapsed[group.label] !== true;
        const active = isGroupActive(group);

        return (
          <div key={group.label} className="mb-1">
            {group.label !== "الرئيسية" && (
              <button
                onClick={() => toggle(group.label)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-right text-xs font-semibold uppercase tracking-wider transition-colors",
                  active
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
                )}
              >
                <span className="min-w-0 truncate">{group.label}</span>
                <ChevronLeft
                  className={cn(
                    "h-3 w-3 shrink-0 transition-transform",
                    isOpen && "-rotate-90"
                  )}
                />
              </button>
            )}

            {isOpen && (
              <div className="mt-0.5 grid gap-0.5">
                {group.items.map((item) => {
                  const isActive =
                    location === item.href ||
                    (location.startsWith(item.href + "/") &&
                      item.href !== "/admin");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onMouseEnter={() => prefetchRoute(item.href)}
                      onFocus={() => prefetchRoute(item.href)}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-start gap-3 rounded-lg px-3 py-2 text-right transition-all cursor-pointer",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout, canAccessPrivilegedAdmin } = useAuth();
  const settings = useSiteSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Site name + logo come from the live settings; fall back to a default until loaded.
  const siteName = settings.site_name || "لوحة التحكم";
  const logoUrl = imgUrl(settings.site_logo, 64);

  // Brand block reused in the desktop and mobile sidebars.
  const brand = logoUrl ? (
    <img src={logoUrl} alt={siteName} className="me-2 h-6 w-6 shrink-0 rounded object-contain" />
  ) : (
    <BookOpen className="me-2 h-5 w-5 shrink-0 text-primary" />
  );

  return (
    <div
      className="flex min-h-screen w-full flex-col bg-muted/40 text-foreground"
      dir="rtl"
    >
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 start-0 z-10 hidden w-60 flex-col border-e bg-sidebar sm:flex text-sidebar-foreground">
          <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
            {brand}
            <span className="truncate text-lg font-bold tracking-tight" title={siteName}>{siteName}</span>
          </div>
          <ScrollArea className="flex-1 py-3">
            <SidebarContent location={location} />
          </ScrollArea>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex justify-start sm:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground border-e border-sidebar-border">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
                <span className="flex min-w-0 items-center">
                  {brand}
                  <span className="truncate text-lg font-bold tracking-tight" title={siteName}>{siteName}</span>
                </span>
                <button onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ScrollArea className="flex-1 py-3">
                <SidebarContent location={location} />
              </ScrollArea>
            </aside>
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-1 flex-col sm:ms-60 w-full">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:static sm:h-16 sm:border-0 sm:bg-background sm:px-6">
            <div className="flex flex-1 items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="sm:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {canAccessPrivilegedAdmin && <NotificationBell />}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-auto px-2 flex items-center gap-2"
                    >
                      <span className="text-sm font-medium hidden sm:inline-block">
                        {user?.name || "مدير النظام"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user?.name}
                        </p>
                        <p
                          className="text-xs leading-none text-muted-foreground"
                          dir="ltr"
                        >
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>إعدادات الحساب</DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/">العودة للموقع</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-destructive"
                    >
                      <LogOut className="me-2 h-4 w-4" />
                      تسجيل الخروج
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
