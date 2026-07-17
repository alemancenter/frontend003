import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { MessageSquare, Send, Minus, ThumbsUp, ThumbsDown, Check, FileText, BookOpen, Newspaper, ArrowLeft } from "lucide-react";
import { communicationApi, type ChatbotLink } from "@/lib/api/communication";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  feedbackSent?: boolean;
  /** Backend message id — required to submit feedback. */
  messageId?: number;
  /** Content matches (files/articles/posts) to render as clickable links. */
  links?: ChatbotLink[];
}

// Map a backend content link to a working frontend route + icon.
function linkHref(l: ChatbotLink): string {
  // Files come back as "/download/{id}"; the frontend download route differs.
  if (l.type === "file") return `/articles/file/${l.id}/download`;
  return l.url;
}
function linkIcon(type: string) {
  if (type === "file") return FileText;
  if (type === "post") return Newspaper;
  return BookOpen;
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", text: "أهلاً بك في منصة موقع الإيمان التعليمي، كيف يمكنني مساعدتك؟", sender: "bot" },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<number | undefined>(undefined);

  const sendMessage = useMutation({
    mutationFn: (msg: string) => communicationApi.chatbotMessage({ message: msg, session_id: sessionId }),
    onSuccess: (data) => {
      const sid = Number(data.session_id);
      if (sid) setSessionId(sid);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: data.answer || "لم أتمكن من العثور على إجابة، جرّب إعادة صياغة سؤالك.",
          sender: "bot",
          messageId: data.message_id,
          links: data.links,
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), text: "تعذّر الاتصال بالمساعد حالياً، حاول مرة أخرى.", sender: "bot" },
      ]);
    },
  });

  const sendFeedback = useMutation({
    mutationFn: ({ messageId, rating }: { messageId: number; rating: string; msgId: string }) =>
      communicationApi.chatbotFeedback({ message_id: messageId, rating }),
    onSuccess: (_, { msgId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, feedbackSent: true } : m))
      );
    },
  });

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, text: userMsg, sender: "user" }]);
    sendMessage.mutate(userMsg);
  };

  const handleFeedback = (msg: Message, rating: "helpful" | "not_helpful") => {
    if (!msg.messageId) return;
    sendFeedback.mutate({ messageId: msg.messageId, rating, msgId: msg.id });
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-transform hover:scale-105 z-50 flex items-center justify-center p-0"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 left-6 w-[350px] h-[520px] max-h-[80vh] flex flex-col shadow-2xl z-50 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-t-lg shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <div>
                <span className="block font-bold leading-tight">المساعد الذكي</span>
                <span className="block text-[10px] text-primary-foreground/70">مدعوم بالذكاء الاصطناعي</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary/80 h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 bg-gray-50/50 dark:bg-card">
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2 text-sm ${
                      m.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-white dark:bg-muted border border-border shadow-sm rounded-bl-none"
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Content matches — clickable files / articles / posts */}
                  {m.sender === "bot" && m.links && m.links.length > 0 && (
                    <div className="mt-2 flex w-[85%] flex-col gap-1.5">
                      {m.links.map((l) => {
                        const Icon = linkIcon(l.type);
                        return (
                          <Link
                            key={`${l.type}-${l.id}`}
                            href={linkHref(l)}
                            onClick={() => setIsOpen(false)}
                            className="group flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-sm transition hover:border-primary/50 hover:bg-primary/5 dark:bg-muted"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-bold text-foreground">{l.title}</span>
                              {(l.subject || l.grade) && (
                                <span className="block truncate text-[10px] text-muted-foreground">
                                  {[l.subject, l.grade, l.semester].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </span>
                            <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-primary rtl:rotate-180" />
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Feedback buttons — only for bot messages (not the welcome) */}
                  {m.sender === "bot" && m.id !== "init" && m.messageId && (
                    <div className="mt-1 flex items-center gap-1.5">
                      {m.feedbackSent ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                          <Check className="h-3 w-3" />
                          شكراً على تقييمك
                        </span>
                      ) : (
                        <>
                          <span className="text-[10px] text-muted-foreground">هل الإجابة مفيدة؟</span>
                          <button
                            type="button"
                            onClick={() => handleFeedback(m, "helpful")}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-900/30"
                            title="مفيدة"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(m, "not_helpful")}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30"
                            title="غير مفيدة"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {sendMessage.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-muted border border-border shadow-sm rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-1">
                    <div className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" />
                    <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce delay-75" />
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t bg-background shrink-0">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="flex-1 rounded-full bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary"
                dir="rtl"
              />
              <Button
                type="submit"
                size="icon"
                disabled={sendMessage.isPending || !input.trim()}
                className="rounded-full shrink-0"
              >
                <Send className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </>
  );
}
