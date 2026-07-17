import { Link, useLocation } from "wouter";
import { prefetchRoute } from "@/lib/prefetch";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { RequireTeacherPortal } from "@/components/ProtectedRoute";
import {
  Home,
  BookOpen,
  Download,
  Sparkles,
  MonitorSmartphone,
  Bell,
  CreditCard,
  Crown,
  LogOut,
  FolderHeart,
  ArrowRight,
  LayoutDashboard
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useTeacherAccess } from "@/hooks/use-teacher";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { imgUrl } from "@/lib/img-url";
import { cn } from "@/lib/utils";

export function TeacherLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { data: accessData } = useTeacherAccess();
  const settings = useSiteSettings();

  const isSubscribed = accessData?.has_access ?? false;
  const siteName = settings.site_name || "الموقع التعليمي";
  const logoUrl = imgUrl(settings.site_logo, 64);

  const navItems = [
    { title: "مساحة العمل", path: "/teacher", icon: Home, exact: true },
    { title: "المكتبة المميزة", path: "/teacher/library", icon: BookOpen },
    { title: "محفوظاتي", path: "/teacher/my-library", icon: FolderHeart },
    { title: "استوديو الذكاء الاصطناعي", path: "/teacher/ai-studio", icon: Sparkles, premium: true },
    { title: "سجل التحميلات", path: "/teacher/downloads", icon: Download },
    { title: "إدارة الأجهزة", path: "/teacher/devices", icon: MonitorSmartphone },
    { title: "الإشعارات", path: "/teacher/notifications", icon: Bell },
    { title: "طلباتي", path: "/teacher/orders", icon: CreditCard },
  ];

  return (
    <RequireTeacherPortal>
      <div dir="rtl" className="min-h-screen bg-background text-foreground flex w-full">
        <SidebarProvider>
          <div className="flex h-screen overflow-hidden w-full">
            <Sidebar side="right" variant="sidebar" className="border-l border-border h-full">
              <SidebarHeader className="p-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt={siteName} className="h-full w-full object-contain" />
                    ) : (
                      <Crown className="w-6 h-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg leading-none text-sidebar-foreground">بوابة المعلم</h2>
                    <p className="text-xs text-sidebar-foreground/70 mt-1 truncate">{siteName}</p>
                  </div>
                </div>
              </SidebarHeader>
              <SidebarContent className="bg-sidebar">
                <SidebarGroup>
                  <SidebarGroupLabel className="text-sidebar-foreground/60">القائمة الرئيسية</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navItems.map((item) => {
                        const isActive = item.exact 
                          ? location === item.path 
                          : location.startsWith(item.path);
                        
                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                              <Link
                                href={item.path}
                                onMouseEnter={() => prefetchRoute(item.path)}
                                onFocus={() => prefetchRoute(item.path)}
                                className={cn(
                                  "flex items-center gap-3 font-medium transition-colors",
                                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground hover:text-sidebar-primary"
                                )}
                              >
                                <item.icon className="w-5 h-5" />
                                <span>{item.title}</span>
                                {item.premium && !isSubscribed && (
                                  <Crown className="w-3 h-3 text-secondary ms-auto" />
                                )}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-auto">
                  <SidebarGroupContent>
                    <div className="p-4 rounded-xl bg-sidebar-accent/50 mx-2 mb-4 border border-sidebar-border">
                      <p className="text-sm font-bold text-sidebar-foreground">{user?.name}</p>
                      <p className="text-xs text-sidebar-foreground/70 mb-3 truncate">{user?.email}</p>
                      {!isSubscribed ? (
                        <Button asChild size="sm" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                          <Link href="/teacher/subscribe">
                            <Crown className="w-4 h-4 me-2" />
                            ترقية الحساب
                          </Link>
                        </Button>
                      ) : (
                        <div className="inline-flex items-center justify-center rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          اشتراك فعال
                        </div>
                      )}
                    </div>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton onClick={logout} className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <LogOut className="w-5 h-5" />
                          <span>تسجيل الخروج</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full relative">
              <header className="h-16 flex items-center gap-2 px-4 border-b border-border bg-card shadow-sm shrink-0 sticky top-0 z-10">
                <SidebarTrigger className="text-foreground md:hidden" />
                <Button asChild size="sm" variant="ghost" className="text-foreground">
                  <Link href="/dashboard">
                    <LayoutDashboard className="w-4 h-4 me-2" />
                    <span className="hidden sm:inline">لوحة العضو</span>
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/">
                    <ArrowRight className="w-4 h-4 me-2" />
                    العودة للموقع
                  </Link>
                </Button>
                <div className="flex-1"></div>
                {!isSubscribed && location !== "/teacher/subscribe" && (
                  <Button asChild size="sm" variant="outline" className="text-secondary border-secondary/30 hover:bg-secondary hover:text-secondary-foreground transition-colors">
                    <Link href="/teacher/subscribe">احصل على العضوية المميزة</Link>
                  </Button>
                )}
              </header>
              <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-background">
                <div className="max-w-6xl mx-auto h-full">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </RequireTeacherPortal>
  );
}