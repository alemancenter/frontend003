import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminChatbotApi, type ChatKnowledge, type ChatSession } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import {
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Edit,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";

const ALL = "all";
const SESSIONS_PER_PAGE = 500;

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SESSION_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  open: { label: "نشطة", variant: "default" },
  closed: { label: "منتهية", variant: "secondary" },
};

interface KnowledgeFormState {
  title: string;
  question: string;
  answer: string;
  category: string;
  keywords: string;
  priority: number;
  is_active: boolean;
}

const EMPTY_KNOWLEDGE: KnowledgeFormState = {
  title: "",
  question: "",
  answer: "",
  category: "general",
  keywords: "",
  priority: 10,
  is_active: true,
};

export default function Chatbot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const country = useCountry();

  const [tab, setTab] = useState("sessions");
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);

  const [viewSession, setViewSession] = useState<ChatSession | null>(null);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<ChatKnowledge | null>(null);
  const [form, setForm] = useState<KnowledgeFormState>(EMPTY_KNOWLEDGE);
  const [deleteTarget, setDeleteTarget] = useState<ChatKnowledge | null>(null);

  const [sessionPage, setSessionPage] = useState(1);
  const [selectedSessions, setSelectedSessions] = useState<number[]>([]);
  const [bulkDeleteSessionsOpen, setBulkDeleteSessionsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: sessionData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["admin", "chatbot", "sessions", country, sessionPage],
    queryFn: () =>
      adminChatbotApi.sessionsWithMeta({ country, page: sessionPage, per_page: SESSIONS_PER_PAGE }),
  });

  const sessions = sessionData?.data ?? [];
  const sessionMeta = sessionData?.meta ?? sessionData?.pagination;
  const sessionTotal = sessionMeta?.total ?? sessions.length;
  const sessionLastPage = sessionMeta?.last_page ?? 1;

  const { data: knowledge = [], isLoading: knowledgeLoading } = useQuery({
    queryKey: ["admin", "chatbot", "knowledge", country],
    queryFn: () => adminChatbotApi.knowledge({ country, limit: 500 }),
  });

  // Full conversation for the view dialog (all messages, not just the preloaded 8).
  const sessionDetail = useQuery({
    queryKey: ["admin", "chatbot", "session", viewSession?.id, country],
    queryFn: () => adminChatbotApi.session(viewSession!.id, { country }),
    enabled: !!viewSession,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "chatbot", "knowledge"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title.trim(),
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category.trim() || "general",
        keywords: form.keywords.trim() || undefined,
        priority: form.priority,
        is_active: form.is_active,
      };
      return editingKnowledge
        ? adminChatbotApi.updateKnowledge(editingKnowledge.id, payload)
        : adminChatbotApi.createKnowledge(payload);
    },
    onSuccess: () => {
      toast({ title: editingKnowledge ? "تم تحديث المعرفة" : "تمت إضافة المعرفة" });
      setIsKnowledgeOpen(false);
      setEditingKnowledge(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({
        title: editingKnowledge ? "فشل التحديث" : "فشل الإضافة",
        description: error.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (item: ChatKnowledge) => adminChatbotApi.deleteKnowledge(item.id),
    onSuccess: () => {
      toast({ title: "تم حذف المعرفة" });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل الحذف", description: error.message, variant: "destructive" }),
  });

  // ── session selection / bulk actions ──────────────────────────────────────

  const bulkDeleteSessionsMutation = useMutation({
    mutationFn: (ids: number[]) => adminChatbotApi.bulkDeleteSessions(ids, { country }),
    onSuccess: (result) => {
      toast({ title: `تم حذف ${result.deleted} محادثة` });
      setSelectedSessions([]);
      setBulkDeleteSessionsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "chatbot", "sessions"] });
    },
    onError: (error: Error) =>
      toast({ title: "فشل حذف المحادثات", description: error.message, variant: "destructive" }),
  });

  const allSessionsSelected =
    sessions.length > 0 && sessions.every((session) => selectedSessions.includes(session.id));

  const toggleAllSessions = () =>
    setSelectedSessions((prev) => {
      const pageIds = sessions.map((session) => session.id);
      if (allSessionsSelected) return prev.filter((id) => !pageIds.includes(id));
      return [...new Set([...prev, ...pageIds])];
    });

  const toggleSession = (id: number) =>
    setSelectedSessions((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );

  // Export selected conversations as JSONL — one training example per line, in
  // the {messages:[{role,content}]} shape used for chat fine-tuning. A single
  // backend request returns everything, so large selections never trip the
  // rate limiter.
  const exportSelected = async () => {
    if (selectedSessions.length === 0) return;
    setIsExporting(true);
    try {
      const { conversations } = await adminChatbotApi.exportSessions(selectedSessions, { country });
      const lines = (conversations ?? []).map((conversation) =>
        JSON.stringify({ session_id: conversation.session_id, messages: conversation.messages }),
      );

      if (lines.length === 0) {
        toast({ title: "لا توجد رسائل للتصدير", variant: "destructive" });
        return;
      }

      const blob = new Blob([lines.join("\n")], { type: "application/x-ndjson;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `chatbot-training-${country}-${new Date().toISOString().slice(0, 10)}.jsonl`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({ title: `تم تصدير ${lines.length} محادثة للتدريب` });
    } catch (error) {
      toast({
        title: "فشل التصدير",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const openCreate = () => {
    setEditingKnowledge(null);
    setForm(EMPTY_KNOWLEDGE);
    setIsKnowledgeOpen(true);
  };

  const openEdit = (item: ChatKnowledge) => {
    setEditingKnowledge(item);
    setForm({
      title: item.title,
      question: item.question,
      answer: item.answer,
      category: item.category ?? "general",
      keywords: item.keywords ?? "",
      priority: item.priority ?? 10,
      is_active: item.is_active ?? true,
    });
    setIsKnowledgeOpen(true);
  };

  const submit = () => {
    if (form.title.trim().length < 1 || form.question.trim().length < 1 || form.answer.trim().length < 1) {
      toast({ title: "الحقول المطلوبة", description: "العنوان والسؤال والإجابة مطلوبة.", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  const sessionLabel = (session: ChatSession) =>
    session.user_id ? `مستخدم #${session.user_id}` : session.guest_id ? `زائر ${session.guest_id.slice(0, 8)}` : "زائر";

  const categories = useMemo(
    () => [...new Set(knowledge.map((item) => item.category).filter(Boolean))] as string[],
    [knowledge],
  );

  const filteredKnowledge = useMemo(() => {
    const term = knowledgeSearch.trim().toLowerCase();
    return knowledge.filter((item) => {
      if (categoryFilter !== ALL && item.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.question.toLowerCase().includes(term) ||
        item.answer.toLowerCase().includes(term) ||
        (item.keywords ?? "").toLowerCase().includes(term)
      );
    });
  }, [knowledge, knowledgeSearch, categoryFilter]);

  const activeKnowledge = useMemo(() => knowledge.filter((item) => item.is_active).length, [knowledge]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المساعد الذكي</h1>
          <p className="mt-1 text-muted-foreground">إدارة محادثات المساعد «رفيق» وقاعدة معرفته</p>
        </div>
        <AdminCountrySelect />
      </div>

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: MessageSquare, label: "المحادثات", value: sessionTotal, tint: "bg-primary/10 text-primary" },
          { icon: BookOpen, label: "قاعدة المعرفة", value: knowledge.length, tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
          { icon: Bot, label: "معرفة مفعّلة", value: activeKnowledge, tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
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

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            المحادثات
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <BookOpen className="h-4 w-4" />
            قاعدة المعرفة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-0">
          <Card>
            <CardHeader className="gap-4">
              <div>
                <CardTitle>
                  المحادثات
                  <span className="ms-2 text-sm font-normal text-muted-foreground">({sessionTotal})</span>
                </CardTitle>
                <CardDescription>آخر المحادثات مع المساعد. اضغط للعرض الكامل، أو حدّدها للحذف أو التصدير للتدريب.</CardDescription>
              </div>

              {selectedSessions.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
                  <span className="text-sm font-medium">{selectedSessions.length} محادثة محددة</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportSelected} disabled={isExporting}>
                      {isExporting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Download className="ml-2 h-4 w-4" />}
                      تصدير للتدريب
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBulkDeleteSessionsOpen(true)}
                      disabled={bulkDeleteSessionsMutation.isPending}
                    >
                      <Trash2 className="ml-2 h-4 w-4" />
                      حذف المحدد
                    </Button>
                  </div>
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
                          checked={allSessionsSelected}
                          onCheckedChange={toggleAllSessions}
                          aria-label="تحديد كل محادثات الصفحة"
                          disabled={sessions.length === 0}
                        />
                      </TableHead>
                      <TableHead className="w-[60px]">المعرف</TableHead>
                      <TableHead>المستخدم</TableHead>
                      <TableHead className="w-[110px]">الرسائل</TableHead>
                      <TableHead>آخر نية</TableHead>
                      <TableHead className="w-[100px]">الحالة</TableHead>
                      <TableHead className="w-[170px]">آخر نشاط</TableHead>
                      <TableHead className="w-[70px] text-left">عرض</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : sessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          لا توجد محادثات
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessions.map((session) => {
                        const statusMeta = SESSION_STATUS[session.status ?? ""] ?? {
                          label: session.status ?? "—",
                          variant: "outline" as const,
                        };
                        return (
                          <TableRow
                            key={session.id}
                            data-state={selectedSessions.includes(session.id) ? "selected" : undefined}
                            className="cursor-pointer"
                            onClick={() => setViewSession(session)}
                          >
                            <TableCell onClick={(event) => event.stopPropagation()}>
                              <Checkbox
                                checked={selectedSessions.includes(session.id)}
                                onCheckedChange={() => toggleSession(session.id)}
                                aria-label={`تحديد محادثة ${session.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium text-muted-foreground">{session.id}</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {sessionLabel(session)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {session.messages?.length ?? 0}
                                {(session.messages?.length ?? 0) >= 8 ? "+" : ""}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {session.last_intent || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(session.updated_at)}
                            </TableCell>
                            <TableCell className="text-left" onClick={(event) => event.stopPropagation()}>
                              <Button variant="ghost" size="icon" title="عرض" onClick={() => setViewSession(session)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {sessionLastPage > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    صفحة {sessionPage} من {sessionLastPage} · {sessionTotal} محادثة
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSessionPage((prev) => Math.max(1, prev - 1))}
                      disabled={sessionPage === 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                      السابق
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSessionPage((prev) => Math.min(sessionLastPage, prev + 1))}
                      disabled={sessionPage >= sessionLastPage}
                    >
                      التالي
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="mt-0">
          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>
                    قاعدة المعرفة
                    <span className="ms-2 text-sm font-normal text-muted-foreground">({filteredKnowledge.length})</span>
                  </CardTitle>
                  <CardDescription>الأسئلة والأجوبة التي يعتمدها المساعد قبل اللجوء للذكاء الاصطناعي.</CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
                      className="pr-8"
                      value={knowledgeSearch}
                      onChange={(event) => setKnowledgeSearch(event.target.value)}
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>كل التصنيفات</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={openCreate}>
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة معرفة
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">التصنيف</TableHead>
                      <TableHead>العنوان</TableHead>
                      <TableHead>السؤال</TableHead>
                      <TableHead className="w-[90px]">الأولوية</TableHead>
                      <TableHead className="w-[90px]">الحالة</TableHead>
                      <TableHead className="w-[100px] text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {knowledgeLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filteredKnowledge.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          {knowledgeSearch || categoryFilter !== ALL ? "لا توجد نتائج مطابقة" : "لا توجد معرفة بعد"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredKnowledge.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="outline">{item.category || "general"}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell className="max-w-[320px]">
                            <p className="truncate text-muted-foreground">{item.question}</p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.priority ?? 10}</TableCell>
                          <TableCell>
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                              {item.is_active ? "مفعّلة" : "معطّلة"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEdit(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                title="حذف"
                                onClick={() => setDeleteTarget(item)}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Session view dialog */}
      <Dialog open={!!viewSession} onOpenChange={(open) => !open && setViewSession(null)}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>محادثة #{viewSession?.id}</DialogTitle>
            <DialogDescription>
              {viewSession && `${sessionLabel(viewSession)} · ${formatDateTime(viewSession.created_at)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {sessionDetail.isLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (sessionDetail.data?.messages ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد رسائل في هذه المحادثة</p>
            ) : (
              sessionDetail.data!.messages!.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div key={message.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        isUser
                          ? "rounded-tr-sm bg-muted"
                          : "rounded-tl-sm bg-primary text-primary-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.message}</p>
                      <p className={`mt-1 text-[10px] ${isUser ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                        {new Date(message.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Knowledge create/edit dialog */}
      <Dialog open={isKnowledgeOpen} onOpenChange={setIsKnowledgeOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>{editingKnowledge ? "تعديل المعرفة" : "معرفة جديدة"}</DialogTitle>
            <DialogDescription>سؤال وإجابة يستخدمهما المساعد للرد على المستخدمين.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="k-title">العنوان</Label>
              <Input
                id="k-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="عنوان مختصر"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="k-question">السؤال</Label>
              <Textarea
                id="k-question"
                value={form.question}
                onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
                placeholder="السؤال كما قد يطرحه المستخدم"
                className="min-h-16"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="k-answer">الإجابة</Label>
              <Textarea
                id="k-answer"
                value={form.answer}
                onChange={(event) => setForm((prev) => ({ ...prev, answer: event.target.value }))}
                placeholder="الإجابة التي سيقدمها المساعد"
                className="min-h-24"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="k-category">التصنيف</Label>
                <Input
                  id="k-category"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="general"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="k-priority">الأولوية</Label>
                <Input
                  id="k-priority"
                  type="number"
                  value={form.priority}
                  onChange={(event) => setForm((prev) => ({ ...prev, priority: Number(event.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="k-keywords">كلمات مفتاحية (اختياري)</Label>
              <Input
                id="k-keywords"
                value={form.keywords}
                onChange={(event) => setForm((prev) => ({ ...prev, keywords: event.target.value }))}
                placeholder="مفصولة بفواصل لتحسين المطابقة"
              />
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">تفعيل المعرفة</p>
                <p className="text-xs text-muted-foreground">المعرفة المعطّلة لا يستخدمها المساعد.</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </label>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={submit} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {editingKnowledge ? "حفظ" : "إضافة"}
            </Button>
            <Button variant="outline" onClick={() => setIsKnowledgeOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف المعرفة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleteTarget?.title}» نهائيًا من قاعدة معرفة المساعد. لا يمكن التراجع.
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

      {/* Bulk delete sessions confirmation */}
      <AlertDialog open={bulkDeleteSessionsOpen} onOpenChange={setBulkDeleteSessionsOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف {selectedSessions.length} محادثة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المحادثات المحددة ورسائلها نهائيًا. إن كنت تريد الاحتفاظ ببياناتها للتدريب، صدّرها أولًا. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={() => bulkDeleteSessionsMutation.mutate(selectedSessions)}
              disabled={bulkDeleteSessionsMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteSessionsMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف نهائيًا
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
