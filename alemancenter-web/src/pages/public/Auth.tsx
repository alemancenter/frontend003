import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { isFacebookLoginEnabled, isGoogleLoginEnabled } from "@/lib/social-auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.43 3.58v2.98h3.86c2.26-2.09 3.59-5.17 3.59-8.8z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.98c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.31c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.6H1.29A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.29 5.4l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.98 3.09c.95-2.85 3.6-4.94 6.73-4.94z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 5.99 4.39 10.96 10.13 11.87v-8.38H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.94h-1.51c-1.49 0-1.95.93-1.95 1.89v2.28h3.32l-.53 3.49h-2.79v8.38C19.61 23.03 24 18.06 24 12.07z" />
    </svg>
  );
}

export function AuthScreens() {
  const [location, setLocation] = useLocation();
  const isLogin = location === "/login";
  const { login, register, loginWithGoogle, loginWithFacebook } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await login({ email, password });
        toast({ title: "تم تسجيل الدخول بنجاح" });
        setLocation("/");
      } else {
        await register({ email, password, name, password_confirmation: password });
        toast({ title: "تم إنشاء الحساب بنجاح" });
        setLocation("/");
      }
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading("google");
    try {
      await loginWithGoogle();
      toast({ title: "تم تسجيل الدخول بنجاح" });
      setLocation("/");
    } catch (err: any) {
      toast({ title: "تعذّر تسجيل الدخول عبر Google", description: err.message, variant: "destructive" });
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    setSocialLoading("facebook");
    try {
      await loginWithFacebook();
      toast({ title: "تم تسجيل الدخول بنجاح" });
      setLocation("/");
    } catch (err: any) {
      toast({ title: "تعذّر تسجيل الدخول عبر Facebook", description: err.message, variant: "destructive" });
    } finally {
      setSocialLoading(null);
    }
  };

  const showSocialLogin = isGoogleLoginEnabled || isFacebookLoginEnabled;

  return (
    <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[70vh]">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl">{isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}</CardTitle>
          <CardDescription>
            {isLogin ? "مرحباً بك مجدداً في موقع الإيمان التعليمي" : "انضم إلى آلاف الطلاب والمعلمين"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">الاسم الكامل</label>
                <Input required value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">البريد الإلكتروني</label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="text-left" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} dir="ltr" className="text-left" />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "جاري..." : (isLogin ? "دخول" : "إنشاء حساب")}
            </Button>
          </form>

          {showSocialLogin && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">أو</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-3">
                {isGoogleLoginEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    disabled={socialLoading !== null}
                    onClick={handleGoogleLogin}
                  >
                    <GoogleIcon />
                    {socialLoading === "google" ? "جاري..." : "الدخول باستخدام Google"}
                  </Button>
                )}
                {isFacebookLoginEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    disabled={socialLoading !== null}
                    onClick={handleFacebookLogin}
                  >
                    <FacebookIcon />
                    {socialLoading === "facebook" ? "جاري..." : "الدخول باستخدام Facebook"}
                  </Button>
                )}
              </div>
            </>
          )}

          <div className="mt-6 space-y-3 text-center text-sm">
            {isLogin && (
              <p>
                <Button variant="link" className="px-1 text-xs font-bold text-muted-foreground hover:text-primary" onClick={() => setLocation("/forgot-password")}>
                  نسيت كلمة المرور؟
                </Button>
              </p>
            )}
            {isLogin ? (
              <p className="text-muted-foreground">
                ليس لديك حساب؟ <Button variant="link" className="px-1 font-bold text-primary" onClick={() => setLocation("/register")}>سجل الآن</Button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                لديك حساب بالفعل؟ <Button variant="link" className="px-1 font-bold text-primary" onClick={() => setLocation("/login")}>سجل دخول</Button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
