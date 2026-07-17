import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ar } from "date-fns/locale";
import { adminCalendarApi, type CalendarEventInput } from "@/lib/api/admin";
import type { CalendarEvent } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { COUNTRY_META, VALID_COUNTRIES, type CountryCode } from "@/lib/country";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

type ViewMode = "month" | "list";

const WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// The backend stores/reads event_date as YYYY-MM-DD.
const toApiDate = (date: Date) => format(date, "yyyy-MM-dd");
const eventDay = (event: CalendarEvent) => parseISO(event.event_date);

interface EventFormState {
  title: string;
  description: string;
  event_date: string;
}

const emptyForm = (date?: Date): EventFormState => ({
  title: "",
  description: "",
  event_date: toApiDate(date ?? new Date()),
});

export default function Calendar() {
  const country = useCountry();
  const switchCountry = useCountrySwitcher();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventFormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  // Fetch the whole visible grid (month padded to full weeks) so days from the
  // adjacent months that show in the grid also carry their events.
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin", "calendar", country, toApiDate(gridStart), toApiDate(gridEnd)],
    queryFn: () =>
      adminCalendarApi.getEvents({
        country,
        start: toApiDate(gridStart),
        end: toApiDate(gridEnd),
      }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "calendar"] });
    queryClient.invalidateQueries({ queryKey: ["calendar"] });
  };

  const saveMutation = useMutation({
    mutationFn: (input: CalendarEventInput) =>
      editing
        ? adminCalendarApi.updateEvent(editing.id, input, { country })
        : adminCalendarApi.createEvent(input, { country }),
    onSuccess: () => {
      toast({ title: editing ? "تم تحديث الحدث" : "تم إضافة الحدث" });
      setIsFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({
        title: editing ? "فشل تحديث الحدث" : "فشل إضافة الحدث",
        description: error.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (event: CalendarEvent) => adminCalendarApi.deleteEvent(event.id, { country }),
    onSuccess: () => {
      toast({ title: "تم حذف الحدث" });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل حذف الحدث", description: error.message, variant: "destructive" }),
  });

  const openCreate = (date?: Date) => {
    setEditing(null);
    setForm(emptyForm(date));
    setIsFormOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      event_date: toApiDate(eventDay(event)),
    });
    setIsFormOpen(true);
  };

  const submit = () => {
    const title = form.title.trim();
    if (title.length < 2) {
      toast({ title: "العنوان مطلوب", description: "عنوان الحدث حرفان على الأقل.", variant: "destructive" });
      return;
    }
    if (!form.event_date) {
      toast({ title: "التاريخ مطلوب", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      title,
      description: form.description.trim() || undefined,
      event_date: form.event_date,
    });
  };

  // Group events by day key for O(1) lookup while rendering the grid.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = toApiDate(eventDay(event));
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events]);

  const gridDays = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  // List view: only this month's events, chronologically.
  const monthEvents = useMemo(
    () =>
      [...events]
        .filter((event) => isSameMonth(eventDay(event), cursor))
        .sort((a, b) => eventDay(a).getTime() - eventDay(b).getTime()),
    [events, cursor],
  );

  const monthLabel = format(cursor, "MMMM yyyy", { locale: ar });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التقويم</h1>
          <p className="mt-1 text-muted-foreground">إدارة الأحداث والفعاليات المجدولة</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openCreate()}>
            <Plus className="ml-2 h-4 w-4" />
            حدث جديد
          </Button>
          <Select value={country} onValueChange={(value) => switchCountry(value as CountryCode)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="قاعدة البيانات" />
            </SelectTrigger>
            <SelectContent>
              {VALID_COUNTRIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {COUNTRY_META[code].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCursor((prev) => subMonths(prev, 1))} title="الشهر السابق">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <CardTitle className="min-w-[160px] text-center text-xl">{monthLabel}</CardTitle>
              <Button variant="outline" size="icon" onClick={() => setCursor((prev) => addMonths(prev, 1))} title="الشهر التالي">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
                اليوم
              </Button>
            </div>

            <Tabs value={view} onValueChange={(value) => setView(value as ViewMode)}>
              <TabsList>
                <TabsTrigger value="month">شهري</TabsTrigger>
                <TabsTrigger value="list">قائمة</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardDescription>
            {isLoading
              ? "جاري التحميل..."
              : `${monthEvents.length} حدث في ${monthLabel}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {view === "month" ? (
            <div className="overflow-hidden rounded-lg border">
              {/* Weekday header */}
              <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-bold text-muted-foreground">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7">
                {gridDays.map((day) => {
                  const key = toApiDate(day);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const inMonth = isSameMonth(day, cursor);
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => openCreate(day)}
                      className={`group flex min-h-[104px] flex-col gap-1 border-b border-s p-1.5 text-right transition hover:bg-muted/50 ${
                        inMonth ? "bg-background" : "bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`mb-0.5 inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-bold ${
                          isToday(day) ? "bg-primary text-primary-foreground" : ""
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="flex flex-col gap-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(event);
                            }}
                            className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-right text-[11px] font-medium text-primary hover:bg-primary/20"
                            title={event.title}
                          >
                            {event.title}
                          </span>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="px-1 text-[10px] text-muted-foreground">
                            +{dayEvents.length - 3} أخرى
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">التاريخ</TableHead>
                    <TableHead>الحدث</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead className="w-[110px] text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : monthEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center">
                          <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground/50" />
                          <span>لا توجد أحداث في {monthLabel}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthEvents.map((event) => {
                      const day = eventDay(event);
                      return (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{format(day, "d MMMM", { locale: ar })}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(day, "EEEE", { locale: ar })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell className="max-w-[320px] text-muted-foreground">
                            <p className="line-clamp-2">{event.description || "—"}</p>
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" title="تعديل" onClick={() => openEdit(event)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10"
                                title="حذف"
                                onClick={() => setDeleteTarget(event)}
                              >
                                <Trash2 className="h-4 w-4" />
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
          )}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>{editing ? "تعديل الحدث" : "حدث جديد"}</DialogTitle>
            <DialogDescription>
              في قاعدة بيانات {COUNTRY_META[country as CountryCode]?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">عنوان الحدث</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="مثال: بداية الفصل الدراسي الثاني"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">التاريخ</Label>
              <Input
                id="event-date"
                type="date"
                value={form.event_date}
                onChange={(event) => setForm((prev) => ({ ...prev, event_date: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-desc">الوصف (اختياري)</Label>
              <Textarea
                id="event-desc"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="تفاصيل إضافية عن الحدث..."
                className="min-h-24"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={submit} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {editing ? "حفظ التغييرات" : "إضافة"}
            </Button>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف الحدث</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleteTarget?.title}» نهائيًا. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف نهائيًا
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
