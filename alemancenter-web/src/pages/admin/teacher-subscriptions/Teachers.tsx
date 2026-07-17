import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Eye, UserMinus, Search, Mail, Phone, MapPin, School, BookOpen, Users } from "lucide-react";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import type { TeacherDirectoryItem } from "@/lib/api/teacherSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

// Subjects are stored as a JSON array string; fall back to the legacy single field.
function parseSubjects(item: TeacherDirectoryItem): string[] {
  const raw = item.subjects?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      /* not JSON — treat as comma-separated below */
    }
    if (raw.includes(",")) return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return item.subject?.trim() ? [item.subject.trim()] : [];
}

function initials(name?: string) {
  const value = String(name ?? "").trim();
  if (!value) return "؟";
  return value.split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join("").toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

export default function TeachersDirectory() {
  const [search, setSearch] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<TeacherDirectoryItem | null>(null);
  const queryClient = useQueryClient();

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["admin", "ts", "teachers", search],
    queryFn: () => teacherSubscriptionAdminApi.listTeachers(search ? { q: search } : {}),
  });

  const removeMembershipMutation = useMutation({
    mutationFn: (userId: number) => teacherSubscriptionAdminApi.removeTeacherMembership(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ts", "teachers"] });
      toast({ title: "تم سحب عضوية المعلم بنجاح" });
      setPendingRemoval(null);
    },
    onError: (e: any) =>
      toast({ title: "تعذر سحب العضوية", description: e?.message, variant: "destructive" }),
  });

  const total = teachers.length;
  const withPhone = useMemo(
    () => teachers.filter((t) => (t.phone || t.user?.phone)?.trim()).length,
    [teachers],
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">دليل المعلمين</h1>
        <p className="text-muted-foreground mt-1">إدارة المعلمين المسجلين في نظام الاشتراكات</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المعلمين</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">لديهم رقم تواصل</p>
              <p className="text-2xl font-bold">{withPhone}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">النتائج المعروضة</p>
              <p className="text-2xl font-bold">{isLoading ? "…" : total}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>قائمة المعلمين</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو البريد أو المادة أو المدرسة..."
                className="pr-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المعلم</TableHead>
                  <TableHead>معلومات التواصل</TableHead>
                  <TableHead>المواد</TableHead>
                  <TableHead>المدرسة / المدينة</TableHead>
                  <TableHead>مسجّل منذ</TableHead>
                  <TableHead className="text-start">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : total === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {search ? "لا توجد نتائج مطابقة للبحث" : "لا يوجد معلمون مسجّلون بعد"}
                    </TableCell>
                  </TableRow>
                ) : (
                  teachers.map((teacher) => {
                    const name = teacher.user?.name || "معلم بدون اسم";
                    const email = teacher.user?.email;
                    const phone = teacher.phone || teacher.user?.phone;
                    const subjects = parseSubjects(teacher);
                    const userId = teacher.user_id || teacher.id;
                    return (
                      <TableRow key={teacher.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {initials(teacher.user?.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium">{name}</div>
                              {email && <div className="truncate text-xs text-muted-foreground" dir="ltr">{email}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            {email && (
                              <span className="flex items-center gap-1.5" dir="ltr">
                                <Mail className="h-3 w-3" /> {email}
                              </span>
                            )}
                            {phone ? (
                              <span className="flex items-center gap-1.5" dir="ltr">
                                <Phone className="h-3 w-3" /> {phone}
                              </span>
                            ) : (
                              !email && <span>-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {subjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {subjects.map((s) => (
                                <Badge key={s} variant="secondary" className="font-normal">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <School className="h-3 w-3" /> {teacher.school || "-"}
                            </span>
                            {teacher.city && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" /> {teacher.city}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatDate(teacher.created_at)}</TableCell>
                        <TableCell className="text-start">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" asChild title="تفاصيل المعلم">
                              <Link href={`/admin/teacher-subscriptions/teachers/${userId}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              title="سحب العضوية"
                              onClick={() => setPendingRemoval(teacher)}
                              disabled={removeMembershipMutation.isPending}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingRemoval} onOpenChange={(open) => !open && setPendingRemoval(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>سحب عضوية المعلم</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إلغاء اشتراك المعلم{" "}
              <span className="font-semibold text-foreground">{pendingRemoval?.user?.name || "—"}</span>{" "}
              وإزالة صلاحياته المميزة. لا يمكن التراجع عن هذا الإجراء تلقائيًا.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingRemoval) {
                  removeMembershipMutation.mutate(pendingRemoval.user_id || pendingRemoval.id);
                }
              }}
              disabled={removeMembershipMutation.isPending}
            >
              {removeMembershipMutation.isPending ? "جاري السحب..." : "تأكيد سحب العضوية"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
