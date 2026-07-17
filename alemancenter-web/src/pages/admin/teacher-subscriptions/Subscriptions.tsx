import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import type { TeacherSubscription } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { RefreshCw, XCircle, RotateCcw, CalendarClock, Loader2 } from "lucide-react";

// Normalize an ISO/date string to the `yyyy-MM-dd` value a <input type="date"> needs.
function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}

function safeFormat(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "yyyy/MM/dd");
}

// The subjects the teacher subscribed for are stored as a JSON array string on
// their profile (with a legacy single-subject fallback).
function subscribedSubjects(sub: TeacherSubscription): string[] {
  const raw = sub.profile?.subjects?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      /* fall through */
    }
    if (raw.includes(",")) return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return sub.profile?.subject?.trim() ? [sub.profile.subject.trim()] : [];
}

export default function SubscriptionsList() {
  const queryClient = useQueryClient();
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["admin", "ts", "subscriptions"],
    queryFn: () => teacherSubscriptionAdminApi.listSubscriptions(),
  });

  const [editing, setEditing] = useState<TeacherSubscription | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [note, setNote] = useState("");

  const openEdit = (sub: TeacherSubscription) => {
    setEditing(sub);
    setStartsAt(toDateInput(sub.starts_at));
    setEndsAt(toDateInput(sub.ends_at));
    setNote("");
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "ts", "subscriptions"] });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => teacherSubscriptionAdminApi.cancelSubscription(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "تم إلغاء الاشتراك" });
    },
    onError: (e: any) => toast({ title: "فشل إلغاء الاشتراك", description: e?.message, variant: "destructive" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => teacherSubscriptionAdminApi.reactivateSubscription(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "تم إعادة تفعيل الاشتراك" });
    },
    onError: (e: any) => toast({ title: "فشل إعادة التفعيل", description: e?.message, variant: "destructive" }),
  });

  const runMaintenanceMutation = useMutation({
    mutationFn: () => teacherSubscriptionAdminApi.runExpiryMaintenance(),
    onSuccess: () => {
      invalidate();
      toast({ title: "تم تشغيل صيانة الاشتراكات المنتهية" });
    },
    onError: (e: any) => toast({ title: "فشلت الصيانة", description: e?.message, variant: "destructive" }),
  });

  const datesMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("لا يوجد اشتراك محدد");
      if (!startsAt && !endsAt) throw new Error("يرجى تحديد تاريخ البدء أو الانتهاء");
      if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
        throw new Error("يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء");
      }
      return teacherSubscriptionAdminApi.updateSubscriptionDates(editing.id, {
        starts_at: startsAt || undefined,
        ends_at: endsAt || undefined,
        admin_note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "تم تحديث تواريخ الاشتراك" });
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "تعذر تحديث التواريخ", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الاشتراكات</h1>
          <p className="text-muted-foreground mt-1">عرض وإدارة اشتراكات المعلمين النشطة والمنتهية</p>
        </div>
        <Button onClick={() => runMaintenanceMutation.mutate()} disabled={runMaintenanceMutation.isPending}>
          <RefreshCw className={`ml-2 h-4 w-4 ${runMaintenanceMutation.isPending ? "animate-spin" : ""}`} />
          تحديث الاشتراكات المنتهية
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الاشتراكات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المعلم</TableHead>
                  <TableHead>المواد المشترك بها</TableHead>
                  <TableHead>الخطة</TableHead>
                  <TableHead>تاريخ البدء</TableHead>
                  <TableHead>تاريخ الانتهاء</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-start">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">جاري التحميل...</TableCell>
                  </TableRow>
                ) : subscriptions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">لا توجد اشتراكات</TableCell>
                  </TableRow>
                ) : (
                  subscriptions?.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        <div>{sub.user?.name || "مستخدم"}</div>
                        {(sub.profile?.school || sub.profile?.city) && (
                          <div className="text-xs font-normal text-muted-foreground">
                            {[sub.profile?.school, sub.profile?.city].filter(Boolean).join(" — ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const subjects = subscribedSubjects(sub);
                          return subjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {subjects.map((s) => (
                                <Badge key={s} variant="secondary" className="font-normal">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>{sub.plan?.name || sub.plan_id}</TableCell>
                      <TableCell>{safeFormat(sub.starts_at)}</TableCell>
                      <TableCell>{safeFormat(sub.ends_at)}</TableCell>
                      <TableCell>
                        <Badge variant={sub.status === "active" ? "default" : "destructive"}>
                          {sub.status === "active"
                            ? "نشط"
                            : sub.status === "expired"
                            ? "منتهي"
                            : sub.status === "pending"
                            ? "لم يبدأ بعد"
                            : "ملغى"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-start">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary"
                            onClick={() => openEdit(sub)}
                            title="تعديل تواريخ الاشتراك"
                          >
                            <CalendarClock className="h-4 w-4" />
                          </Button>
                          {sub.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => cancelMutation.mutate(sub.id)}
                              disabled={cancelMutation.isPending}
                              title="إلغاء الاشتراك"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-emerald-600"
                              onClick={() => reactivateMutation.mutate(sub.id)}
                              disabled={reactivateMutation.isPending}
                              title="إعادة تفعيل"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader className="text-start">
            <DialogTitle>تعديل تواريخ الاشتراك</DialogTitle>
            <DialogDescription>
              {editing?.user?.name ? `المعلم: ${editing.user.name}` : "تحديد تاريخي بدء وانتهاء الاشتراك"}
              . يتم تحديث الحالة (نشط/منتهي/لم يبدأ) تلقائيًا حسب التواريخ.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="starts_at">تاريخ البدء</Label>
              <Input
                id="starts_at"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ends_at">تاريخ الانتهاء</Label>
              <Input
                id="ends_at"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin_note">ملاحظة الإدارة (اختياري)</Label>
              <Textarea
                id="admin_note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="سبب التعديل أو ملاحظة داخلية"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={datesMutation.isPending}>
              إلغاء
            </Button>
            <Button onClick={() => datesMutation.mutate()} disabled={datesMutation.isPending}>
              {datesMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
