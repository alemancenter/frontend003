import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react";

function useSearchParam(key: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(key) ?? "";
}

export function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = useSearchParam("token");
  const emailFromUrl = useSearchParam("email");

  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "كلمة المرور يجب أن تكون 8 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (!token) {
      toast({ title: "رابط إعادة التعيين غير صالح", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, email, password, password_confirmation: confirm });
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "الرابط منتهي الصلاحية أو غير صالح";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <KeyRound className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-xl font-bold text-muted-foreground">رابط إعادة التعيين غير صالح</p>
        <Link href="/forgot-password">
          <Button variant="outline">طلب رابط جديد</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-foreground">تعيين كلمة مرور جديدة</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            اختر كلمة مرور قوية لا تقل عن 8 أحرف
          </p>
        </div>

        <Card className="border-primary/10 shadow-lg">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-base font-bold text-muted-foreground">
              {done ? "تم بنجاح!" : "كلمة المرور الجديدة"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {done ? (
              <div className="flex flex-col items-center gap-5 py-4 text-center">
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                <div>
                  <p className="font-bold text-foreground">تم تغيير كلمة المرور بنجاح</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة
                  </p>
                </div>
                <Button className="w-full rounded-xl" onClick={() => setLocation("/login")}>
                  تسجيل الدخول
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!emailFromUrl && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">البريد الإلكتروني</label>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="rounded-xl text-left"
                      dir="ltr"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8 أحرف على الأقل"
                      className="rounded-xl pr-4 pl-10 text-left"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">تأكيد كلمة المرور</label>
                  <Input
                    type={showPass ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="أعد كتابة كلمة المرور"
                    className="rounded-xl text-left"
                    dir="ltr"
                  />
                  {confirm && password !== confirm && (
                    <p className="text-xs text-destructive">كلمتا المرور غير متطابقتين</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-xl"
                  disabled={isLoading || !password || !confirm || password !== confirm}
                >
                  {isLoading ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
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
