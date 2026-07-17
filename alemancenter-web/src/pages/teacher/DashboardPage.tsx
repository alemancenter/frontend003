import { useState } from "react";
import { useTeacherAccess, useTeacherWorkspace, useTeacherDownloads, useTeacherDevices } from "@/hooks/use-teacher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Sparkles, 
  Download, 
  MonitorSmartphone, 
  BookOpen, 
  ArrowLeft,
  Crown,
  FileText,
  Clock
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export function DashboardPage() {
  const { data: accessData, isLoading: isAccessLoading } = useTeacherAccess();
  const { data: workspaceData, isLoading: isWorkspaceLoading } = useTeacherWorkspace();
  const { data: downloadsData } = useTeacherDownloads();
  const { data: devicesData } = useTeacherDevices();

  const isSubscribed = accessData?.has_access ?? false;
  const subscription = accessData?.subscription;

  if (isAccessLoading || isWorkspaceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  const recentDownloads = Array.isArray(downloadsData) ? downloadsData.slice(0, 5) : [];
  const activeDevicesCount = devicesData?.filter(d => d.is_active).length || 0;
  
  // Calculate usage percentages
  // Safely default to 0 if not available
  const downloadLimit = subscription?.download_limit || 0;
  const aiLimit = subscription?.ai_generation_limit || 0;
  const deviceLimit = subscription?.device_limit || 0;

  // Assuming workspaceData has some usage stats, otherwise default to 0
  const downloadsUsed = (workspaceData as any)?.downloads_this_month || 0;
  const aiUsed = (workspaceData as any)?.ai_generations_this_month || 0;

  const downloadPercent = downloadLimit > 0 ? Math.min(100, (downloadsUsed / downloadLimit) * 100) : 0;
  const aiPercent = aiLimit > 0 ? Math.min(100, (aiUsed / aiLimit) * 100) : 0;
  const devicePercent = deviceLimit > 0 ? Math.min(100, (activeDevicesCount / deviceLimit) * 100) : 0;

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        <div className="absolute -top-24 -start-24 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">أهلاً بك في مساحة المعلم</h1>
            {isSubscribed ? (
              <p className="text-primary-foreground/80 text-lg md:text-xl max-w-xl">
                أنت الآن تستمتع بمزايا باقة <span className="font-bold text-secondary">{subscription?.plan?.name || 'الذهبية'}</span>. 
                استكشف أحدث الملفات والمحتوى الحصري.
              </p>
            ) : (
              <p className="text-primary-foreground/80 text-lg md:text-xl max-w-xl">
                قم بترقية حسابك للوصول إلى مكتبة ضخمة من الملفات، واستوديو الذكاء الاصطناعي، وأدوات حصرية لتسهيل عملك.
              </p>
            )}
          </div>
          
          {!isSubscribed && (
            <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0 h-14 px-8 text-lg rounded-xl shadow-lg">
              <Link href="/teacher/subscribe">
                <Crown className="w-5 h-5 me-2" />
                ترقية الحساب الآن
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isSubscribed && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  <span>التحميلات (هذا الشهر)</span>
                  <Download className="w-4 h-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-foreground">
                  {downloadsUsed} <span className="text-lg text-muted-foreground font-normal">/ {downloadLimit === -1 ? '∞' : downloadLimit}</span>
                </div>
                {downloadLimit !== -1 && (
                  <Progress value={downloadPercent} className="h-2 bg-muted" />
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  <span>توليد المحتوى بالذكاء الاصطناعي</span>
                  <Sparkles className="w-4 h-4 text-secondary" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-foreground">
                  {aiUsed} <span className="text-lg text-muted-foreground font-normal">/ {aiLimit === -1 ? '∞' : aiLimit}</span>
                </div>
                {aiLimit !== -1 && (
                  <Progress value={aiPercent} className="h-2 bg-muted" />
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  <span>الأجهزة النشطة</span>
                  <MonitorSmartphone className="w-4 h-4 text-accent-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 text-foreground">
                  {activeDevicesCount} <span className="text-lg text-muted-foreground font-normal">/ {deviceLimit}</span>
                </div>
                <Progress value={devicePercent} className="h-2 bg-muted" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                روابط سريعة
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <Link href="/teacher/library">
                  <div className="group bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-primary/30 flex items-center gap-4 cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">المكتبة المميزة</h3>
                      <p className="text-sm text-muted-foreground">تصفح وحمل آلاف الملفات</p>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors group-hover:-translate-x-1" />
                  </div>
                </Link>

                <Link href="/teacher/ai-studio">
                  <div className="group bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-secondary/30 flex items-center gap-4 cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">استوديو الذكاء الاصطناعي</h3>
                      <p className="text-sm text-muted-foreground">توليد أوراق عمل وأسئلة</p>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-colors group-hover:-translate-x-1" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Downloads */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">أحدث التحميلات</h2>
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                  <Link href="/teacher/downloads">عرض الكل</Link>
                </Button>
              </div>
              
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="divide-y divide-border">
                  {recentDownloads.length > 0 ? (
                    recentDownloads.map((item: any, i: number) => (
                      <div key={i} className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{item.file_name || 'ملف مميز'}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{item.downloaded_at ? format(new Date(item.downloaded_at), 'dd MMMM yyyy', { locale: arSA }) : 'مؤخراً'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      لا يوجد تحميلات سابقة
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}