import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminContactMessagesApi } from "@/lib/api/admin";
import type { ContactMessage } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { safeUrl } from "@/lib/sanitize";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Mail,
  MailOpen,
  MessageSquare,
  Phone,
  Search,
  Trash2,
} from "lucide-react";

const ALL = "all";
const PER_PAGE = 20;
// Backend max per_page — the list is paginated server-side, so pull the whole
// set once and paginate/search/filter client-side.
const FETCH_ALL = 500;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ContactMessages() {
  const country = useCountry();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<string>(ALL);
  const [active, setActive] = useState<ContactMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["admin", "contact-messages", country],
    queryFn: () => adminContactMessagesApi.list({ country, per_page: FETCH_ALL }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "contact-messages"] });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => adminContactMessagesApi.markAsRead(id, { country }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (message: ContactMessage) => adminContactMessagesApi.delete(message.id, { country }),
    onSuccess: () => {
      toast({ title: "تم حذف الرسالة" });
      setDeleteTarget(null);
      setActive(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل حذف الرسالة", description: error.message, variant: "destructive" }),
  });

  // The backend has no bulk endpoint, so we fan out parallel single deletes and
  // report how many succeeded.
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => adminContactMessagesApi.delete(id, { country })),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { total: ids.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      if (failed === 0) {
        toast({ title: `تم حذف ${total} رسالة` });
      } else {
        toast({
          title: `تم حذف ${total - failed} من ${total}`,
          description: `فشل حذف ${failed} رسالة`,
          variant: "destructive",
        });
      }
      setSelected([]);
      setBulkDeleteOpen(false);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل الحذف الجماعي", description: error.message, variant: "destructive" }),
  });

  // Opening a message marks it read (once).
  const openMessage = (message: ContactMessage) => {
    setActive(message);
    if (!message.read) markReadMutation.mutate(message.id);
  };

  const unreadCount = useMemo(() => messages.filter((m) => !m.read).length, [messages]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return messages.filter((message) => {
      if (readFilter === "unread" && message.read) return false;
      if (readFilter === "read" && !message.read) return false;
      if (!term) return true;
      return (
        message.name.toLowerCase().includes(term) ||
        message.email.toLowerCase().includes(term) ||
        (message.subject ?? "").toLowerCase().includes(term) ||
        message.message.toLowerCase().includes(term)
      );
    });
  }, [messages, search, readFilter]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  // Reset to the first page whenever the filtered set changes shape.
  useEffect(() => {
    setPage(1);
  }, [search, readFilter, country]);

  // Clamp the page if the list shrank (e.g. after deletions).
  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);

  // Keep the selection limited to rows still present under the filters.
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => filtered.some((message) => message.id === id)));
  }, [filtered]);

  // "Select all" targets the current page's rows (selection persists across pages).
  const pageAllSelected =
    pageRows.length > 0 && pageRows.every((message) => selected.includes(message.id));

  const toggleAll = () =>
    setSelected((prev) => {
      const pageIds = pageRows.map((message) => message.id);
      if (pageAllSelected) return prev.filter((id) => !pageIds.includes(id));
      return [...new Set([...prev, ...pageIds])];
    });

  const toggleOne = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">رسائل اتصل بنا</h1>
          <p className="mt-1 text-muted-foreground">
            الرسائل الواردة من الزوار عبر نموذج التواصل
            {unreadCount > 0 && <span className="ms-2 font-bold text-primary">({unreadCount} غير مقروءة)</span>}
          </p>
        </div>
        <AdminCountrySelect />
      </div>

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: MessageSquare, label: "إجمالي الرسائل", value: messages.length, tint: "bg-primary/10 text-primary" },
          { icon: Mail, label: "غير مقروءة", value: unreadCount, tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
          { icon: MailOpen, label: "مقروءة", value: messages.length - unreadCount, tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tile.tint}`}>
                <tile.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black leading-none">{tile.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tile.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                صندوق الوارد
                <span className="ms-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>
              </CardTitle>
              <CardDescription>اضغط على أي رسالة لعرض تفاصيلها كاملة.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-56">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو البريد أو النص..."
                  className="pr-8"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>الكل</SelectItem>
                  <SelectItem value="unread">غير مقروءة</SelectItem>
                  <SelectItem value="read">مقروءة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium">{selected.length} رسالة محددة</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف المحدد
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">
                    <Checkbox
                      checked={pageAllSelected}
                      onCheckedChange={toggleAll}
                      aria-label="تحديد كل رسائل الصفحة"
                      disabled={pageRows.length === 0}
                    />
                  </TableHead>
                  <TableHead className="w-[40px]" />
                  <TableHead>المرسل</TableHead>
                  <TableHead>الموضوع</TableHead>
                  <TableHead className="w-[170px]">التاريخ</TableHead>
                  <TableHead className="w-[100px] text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/50" />
                        <span>{search || readFilter !== ALL ? "لا توجد رسائل مطابقة" : "لا توجد رسائل"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((message) => (
                    <TableRow
                      key={message.id}
                      data-state={selected.includes(message.id) ? "selected" : undefined}
                      className={`cursor-pointer ${!message.read ? "bg-primary/5 font-medium" : ""}`}
                      onClick={() => openMessage(message)}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selected.includes(message.id)}
                          onCheckedChange={() => toggleOne(message.id)}
                          aria-label={`تحديد رسالة ${message.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        {message.read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <span className="flex h-2.5 w-2.5 rounded-full bg-primary" title="غير مقروءة" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate">{message.name}</p>
                          <p dir="ltr" className="truncate text-start text-xs text-muted-foreground">
                            {message.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="truncate">{message.subject || "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{message.message}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(message.created_at)}
                      </TableCell>
                      <TableCell className="text-left" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            title="حذف"
                            onClick={() => setDeleteTarget(message)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {lastPage > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                صفحة {page} من {lastPage} · {filtered.length} رسالة
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}
                  disabled={page >= lastPage}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>{active?.subject || "رسالة تواصل"}</DialogTitle>
            <DialogDescription>{active && formatDateTime(active.created_at)}</DialogDescription>
          </DialogHeader>

          {active && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">الاسم</p>
                  <p className="font-medium">{active.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                  <a href={`mailto:${active.email}`} dir="ltr" className="block font-medium text-primary hover:underline">
                    {active.email}
                  </a>
                </div>
                {active.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">الهاتف</p>
                    <a href={`tel:${active.phone}`} dir="ltr" className="flex items-center gap-1 font-medium text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" />
                      {active.phone}
                    </a>
                  </div>
                )}
                {active.page_url && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">أُرسلت من</p>
                    {safeUrl(active.page_url) ? (
                      <a
                        href={safeUrl(active.page_url)!}
                        target="_blank"
                        rel="noreferrer"
                        dir="ltr"
                        className="flex items-center gap-1 truncate font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        {active.page_url}
                      </a>
                    ) : (
                      // Unsafe scheme (javascript:/data:…) — show as inert text, never a link.
                      <span dir="ltr" className="truncate text-muted-foreground">{active.page_url}</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs text-muted-foreground">نص الرسالة</p>
                <p className="whitespace-pre-wrap rounded-lg border p-3 text-sm leading-relaxed">{active.message}</p>
              </div>

              <div className="flex justify-start gap-2">
                <Button asChild>
                  <a href={`mailto:${active.email}?subject=${encodeURIComponent(`رد: ${active.subject ?? ""}`)}`}>
                    <Mail className="ml-2 h-4 w-4" />
                    الرد عبر البريد
                  </a>
                </Button>
                <Button variant="outline" className="text-destructive" onClick={() => setDeleteTarget(active)}>
                  <Trash2 className="ml-2 h-4 w-4" />
                  حذف
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف الرسالة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف رسالة «{deleteTarget?.name}» نهائيًا. لا يمكن التراجع.
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

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف {selected.length} رسالة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الرسائل المحددة نهائيًا ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selected)}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف نهائيًا
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
