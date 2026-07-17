import { useState } from "react";
import { Link } from "wouter";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Mail, CheckCircle2, KeyRound } from "lucide-react";

export function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ، حاول مرة أخرى";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-foreground">استعادة كلمة المرور</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
          </p>
        </div>

        <Card className="border-primary/10 shadow-lg">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-base font-bold text-muted-foreground">
              {sent ? "تم الإرسال!" : "أدخل بريدك الإلكتروني"}
            </CardTitle>
            {sent && (
              <CardDescription>
                تحقق من صندوق الوارد الخاص بك
              </CardDescription>
            )}
          </CardHeader>

          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center gap-5 py-4 text-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                <div>
                  <p className="font-bold text-foreground">تم إرسال رابط إعادة التعيين</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    إذا كان البريد{" "}
                    <span className="font-bold text-primary" dir="ltr">{email}</span>{" "}
                    مسجلاً لدينا، ستصلك رسالة خلال دقائق.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    لم تصلك الرسالة؟ تحقق من مجلد البريد غير المرغوب
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-2 w-full rounded-xl"
                  onClick={() => { setSent(false); setEmail(""); }}
                >
                  إعادة المحاولة
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="rounded-xl pr-9 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-xl"
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
                </Button>
              </form>
            )}

            <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
              <Link href="/login" className="flex items-center justify-center gap-1 font-bold text-primary hover:underline">
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                العودة لتسجيل الدخول
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
