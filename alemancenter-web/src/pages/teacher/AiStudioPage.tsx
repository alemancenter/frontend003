import { useAIGenerations, useGenerateAI, useTeacherAccess } from "@/hooks/use-teacher";
import { UpsellState } from "@/components/teacher/UpsellState";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Copy, CheckCircle2, History, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { teacherSubscriptionApi } from "@/lib/api/teacherSubscription";

export function AiStudioPage() {
  const { data: accessData, isLoading: isAccessLoading } = useTeacherAccess();
  const { data: history, isLoading: isHistoryLoading } = useAIGenerations();
  const generateMutation = useGenerateAI();

  const [prompt, setPrompt] = useState("");
  const [toolType, setToolType] = useState("worksheet");
  const [title, setTitle] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (isAccessLoading) return null;

  if (!accessData?.has_access) {
    return (
      <UpsellState 
        title="استوديو الذكاء الاصطناعي"
        description="قم بترقية حسابك لتوليد أوراق عمل، امتحانات، وخطط دراسية بضغطة زر باستخدام الذكاء الاصطناعي."
      />
    );
  }

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("الرجاء إدخال وصف المحتوى المطلوب");
      return;
    }

    generateMutation.mutate(
      { tool_type: toolType, prompt, title: title || "توليد جديد" },
      {
        onSuccess: (data) => {
          setOutput(data.output);
          toast.success("تم التوليد بنجاح!");
        },
        onError: (err: any) => {
          toast.error(err?.message || "حدث خطأ أثناء التوليد");
        }
      }
    );
  };

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("تم نسخ النص");
    }
  };

  const handleExport = (id: number) => {
    const url = teacherSubscriptionApi.exportAI(id);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-secondary" />
          استوديو الذكاء الاصطناعي
        </h1>
        <p className="text-muted-foreground">قم بتوليد محتوى تعليمي احترافي في ثوانٍ معدودة.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workspace */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-border shadow-md">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع المحتوى</Label>
                  <Select value={toolType} onValueChange={setToolType}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worksheet">ورقة عمل</SelectItem>
                      <SelectItem value="exam">امتحان</SelectItem>
                      <SelectItem value="lesson_plan">خطة درس</SelectItem>
                      <SelectItem value="summary">ملخص وحدة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>عنوان (اختياري)</Label>
                  <Input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="مثال: ورقة عمل رياضيات الصف الخامس" 
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>وصف المحتوى المطلوب بدقة</Label>
                <Textarea 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="اكتب بالتفصيل ما تريد توليده..."
                  className="min-h-[150px] bg-background resize-y text-base p-4 leading-relaxed"
                />
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={generateMutation.isPending}
                className="w-full h-12 text-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 me-2" />
                    توليد المحتوى
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Result Area */}
          {(output || generateMutation.isPending) && (
            <Card className="p-6 border-border shadow-sm min-h-[300px] flex flex-col relative overflow-hidden">
              {generateMutation.isPending ? (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <Sparkles className="w-12 h-12 text-secondary animate-pulse mb-4" />
                  <p className="text-lg font-medium text-foreground animate-pulse">جاري التوليد... قد يستغرق ذلك بعض الوقت</p>
                </div>
              ) : null}
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <h3 className="font-bold text-lg text-foreground">النتيجة</h3>
                {output && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                      {copied ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      نسخ
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 bg-muted/30 rounded-xl p-6 whitespace-pre-wrap font-sans text-base leading-relaxed overflow-y-auto">
                {output}
              </div>
            </Card>
          )}
        </div>

        {/* History */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <History className="w-5 h-5" />
            السجل السابق
          </h3>
          <div className="space-y-3">
            {isHistoryLoading ? (
              [1,2,3].map(i => <Card key={i} className="h-24 p-4 border-border shadow-none" />)
            ) : history?.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا يوجد سجل توليد سابق.</p>
            ) : (
              history?.slice(0, 10).map((item) => (
                <Card key={item.id} className="p-4 border-border shadow-sm hover:border-primary/30 transition-colors group cursor-pointer" onClick={() => {
                  setOutput(item.output);
                  setPrompt(item.prompt);
                  setToolType(item.tool_type);
                  setTitle(item.title || "");
                }}>
                  <h4 className="font-bold text-sm text-foreground mb-1 truncate">{item.title || "توليد بدون عنوان"}</h4>
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-3">
                    <span className="capitalize">{item.tool_type}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(item.id);
                      }}
                    >
                      <ArrowDownToLine className="w-3 h-3 me-1" /> تصدير
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}