import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Check, Crown, Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateOrder,
  useCreateOrderWithProof,
  usePaymentSettings,
  useSubscriptionPlans,
  useTeacherMe,
} from "@/hooks/use-teacher";
import { useCountry } from "@/hooks/use-country";
import { academicApi } from "@/lib/api/academic";
import type { SchoolClass, Subject } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SelectedTeachingSubject = {
  classId: number;
  gradeLevel: number;
  gradeName: string;
  subjectId: number;
  subjectName: string;
};

const MAX_TEACHING_SUBJECTS = 3;

function sortClasses(items: SchoolClass[] = []) {
  return [...items].sort(
    (a, b) => (a.grade_level ?? 0) - (b.grade_level ?? 0) || a.grade_name.localeCompare(b.grade_name, "ar"),
  );
}

function sortSubjects(items: Subject[] = []) {
  return [...items].sort((a, b) => a.subject_name.localeCompare(b.subject_name, "ar"));
}

function planFeatures(featuresJson?: string) {
  if (!featuresJson) return [];
  try {
    const parsed = JSON.parse(featuresJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function SubscribePage() {
  const [, setLocation] = useLocation();
  const country = useCountry();
  const { data: plan, isLoading: isPlansLoading } = useSubscriptionPlans();
  const plans = plan ? (Array.isArray(plan) ? plan : [plan]) : [];
  const { data: paymentSettings, isLoading: isPaymentLoading } = usePaymentSettings();
  const { data: mySub } = useTeacherMe();
  const { data: schoolClasses = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ["teacher", "subscribe", "classes", country],
    queryFn: () => academicApi.listSchoolClasses(country),
  });

  const createOrder = useCreateOrder();
  const createOrderProof = useCreateOrderWithProof();

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedTeachingSubject[]>([]);
  const [payerName, setPayerName] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [city, setCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const sortedClasses = useMemo(() => sortClasses(schoolClasses), [schoolClasses]);
  const currentClass = useMemo(
    () => sortedClasses.find((item) => String(item.id) === selectedClassId),
    [selectedClassId, sortedClasses],
  );
  const { data: classSubjects = [], isLoading: isSubjectsLoading } = useQuery({
    queryKey: ["teacher", "subscribe", "subjects", country, selectedClassId],
    queryFn: () => academicApi.listSubjects(selectedClassId, country),
    enabled: Boolean(selectedClassId),
  });
  const sortedClassSubjects = useMemo(() => sortSubjects(classSubjects), [classSubjects]);
  const subjectPayload = useMemo(
    () => Array.from(new Set(selectedSubjects.map((item) => item.subjectName.trim()).filter(Boolean))),
    [selectedSubjects],
  );
  const activePlans = useMemo(() => plans.filter((item) => item.is_active), [plans]);
  const selectedPlan = activePlans.find((item) => item.id === selectedPlanId);
  const canAddTeachingSubject = Boolean(selectedClassId && selectedSubjectId) && selectedSubjects.length < MAX_TEACHING_SUBJECTS;

  if (isPlansLoading || isPaymentLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleNext = () => {
    if (!selectedPlanId) {
      toast.error("الرجاء اختيار باقة للمتابعة");
      return;
    }
    setStep(2);
  };

  const handleAddTeachingSubject = () => {
    const subject = sortedClassSubjects.find((item) => String(item.id) === selectedSubjectId);
    if (!currentClass || !subject) {
      toast.error("الرجاء اختيار الصف والمادة أولا");
      return;
    }
    if (selectedSubjects.length >= MAX_TEACHING_SUBJECTS) {
      toast.error(`يمكنك اختيار ${MAX_TEACHING_SUBJECTS} مواد كحد أقصى في الطلب الواحد`);
      return;
    }
    const exists = selectedSubjects.some(
      (item) => item.classId === currentClass.id && item.subjectId === subject.id,
    );
    if (exists) {
      toast.error("هذه المادة مضافة مسبقا");
      return;
    }
    setSelectedSubjects((items) =>
      [
        ...items,
        {
          classId: currentClass.id,
          gradeLevel: currentClass.grade_level,
          gradeName: currentClass.grade_name,
          subjectId: subject.id,
          subjectName: subject.subject_name,
        },
      ].sort((a, b) => a.gradeLevel - b.gradeLevel || a.subjectName.localeCompare(b.subjectName, "ar")),
    );
    setSelectedSubjectId("");
  };

  const handleRemoveTeachingSubject = (classId: number, subjectId: number) => {
    setSelectedSubjects((items) => items.filter((item) => item.classId !== classId || item.subjectId !== subjectId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !payerName.trim() || !phone.trim() || !paymentMethod || subjectPayload.length === 0) {
      toast.error("الرجاء تعبئة الحقول المطلوبة واختيار مادة واحدة على الأقل");
      return;
    }

    const isManual = paymentMethod !== "credit_card" && paymentMethod !== "paypal";

    if (isManual && proofFile) {
      const formData = new FormData();
      formData.append("plan_id", selectedPlanId.toString());
      formData.append("payment_method", paymentMethod);
      formData.append("payer_name", payerName.trim());
      formData.append("phone", phone.trim());
      formData.append("subjects", subjectPayload.join(","));
      formData.append("subject", subjectPayload[0]);
      if (school.trim()) formData.append("school", school.trim());
      if (city.trim()) formData.append("city", city.trim());
      if (paymentRef.trim()) formData.append("payment_reference", paymentRef.trim());
      formData.append("payment_proof", proofFile);

      createOrderProof.mutate(formData, {
        onSuccess: () => {
          toast.success("تم إرسال طلب الاشتراك بنجاح. سيتم المراجعة والتفعيل قريبا.");
          setLocation("/teacher");
        },
        onError: () => toast.error("حدث خطأ أثناء إرسال الطلب"),
      });
      return;
    }

    createOrder.mutate(
      {
        plan_id: selectedPlanId,
        payment_method: paymentMethod,
        payer_name: payerName.trim(),
        phone: phone.trim(),
        subjects: subjectPayload,
        school: school.trim() || undefined,
        city: city.trim() || undefined,
        payment_reference: paymentRef.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("تم تأكيد الطلب بنجاح!");
          setLocation("/teacher");
        },
        onError: () => toast.error("حدث خطأ أثناء إرسال الطلب"),
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <div className="mb-10 space-y-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Crown className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">عضوية المعلمين المميزة</h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          انضم إلى منصة المعلمين واحصل على ملفات ومواد حصرية مرتبطة بالصفوف والمواد التي تدرسها.
        </p>
      </div>

      {(mySub?.has_active || mySub?.subscription?.status === "active") && step === 1 && (
        <div className="mb-8 flex items-center justify-center rounded-xl border border-primary/20 bg-primary/10 p-4 text-primary">
          <Check className="me-2 h-5 w-5" />
          لديك اشتراك فعال حاليا بباقة: {mySub?.subscription?.plan?.name || mySub?.plan?.name}
        </div>
      )}

      {step === 1 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {activePlans.map((item) => {
              const features = planFeatures(item.features_json);
              return (
                <Card
                  key={item.id}
                  className={`relative cursor-pointer overflow-hidden transition-all duration-300 ${
                    selectedPlanId === item.id
                      ? "scale-[1.02] border-primary shadow-lg ring-2 ring-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedPlanId(item.id)}
                >
                  {selectedPlanId === item.id && (
                    <div className="absolute right-0 top-0 flex items-center rounded-bl-xl bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                      <Check className="me-1 h-4 w-4" /> تم الاختيار
                    </div>
                  )}
                  <CardHeader className="pb-2 text-center">
                    <CardTitle className="text-2xl font-bold">{item.name}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="my-4">
                      <span className="text-4xl font-bold text-foreground">{item.price_jod}</span>
                      <span className="ms-1 text-muted-foreground">
                        {item.currency} / {item.duration_days} يوم
                      </span>
                    </div>

                    <div className="mt-6 space-y-3 text-start">
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm">تحميل {item.download_limit === -1 ? "لا محدود" : item.download_limit} ملف</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm">
                          توليد {item.ai_generation_limit === -1 ? "لا محدود" : item.ai_generation_limit} بالذكاء الاصطناعي
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm">تفعيل على {item.device_limit} أجهزة</span>
                      </div>
                      {features.map((feature, index) => (
                        <div key={`${feature}-${index}`} className="flex items-start gap-3">
                          <Check className="h-5 w-5 shrink-0 text-primary" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleNext}
              disabled={!selectedPlanId}
              size="lg"
              className="h-14 rounded-full bg-primary px-12 text-lg shadow-lg hover:bg-primary/90"
            >
              المتابعة للدفع
            </Button>
          </div>
        </div>
      ) : (
        <Card className="border-border shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">إتمام الاشتراك</CardTitle>
                <CardDescription>
                  باقة {selectedPlan?.name} - {selectedPlan?.price_jod} {selectedPlan?.currency}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-muted-foreground">
                تغيير الباقة <ArrowRight className="ms-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input required value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="اسم المشترك" className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xxxxxxxx" className="bg-muted/30 text-left" dir="ltr" />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label>
                    المواد التي تدرسها <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <Select
                      value={selectedClassId}
                      onValueChange={(value) => {
                        setSelectedClassId(value);
                        setSelectedSubjectId("");
                      }}
                      disabled={isClassesLoading}
                    >
                      <SelectTrigger className="h-11 bg-muted/30">
                        <SelectValue placeholder={isClassesLoading ? "جاري تحميل الصفوف..." : "اختر الصف"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedClasses.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.grade_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId || isSubjectsLoading}>
                      <SelectTrigger className="h-11 bg-muted/30">
                        <SelectValue placeholder={!selectedClassId ? "اختر الصف أولا" : isSubjectsLoading ? "جاري تحميل المواد..." : "اختر المادة"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedClassSubjects.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.subject_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button type="button" variant="outline" className="h-11" onClick={handleAddTeachingSubject} disabled={!canAddTeachingSubject}>
                      <Plus className="me-2 h-4 w-4" />
                      إضافة
                    </Button>
                  </div>

                  <div className="min-h-11 rounded-xl border border-dashed border-border bg-muted/20 p-3">
                    {selectedSubjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        اختر المواد التي تدرسها من قاعدة البيانات حتى تظهر لك ملفات المشتركين المطابقة بعد تفعيل الاشتراك.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedSubjects.map((item) => (
                          <Badge key={`${item.classId}-${item.subjectId}`} variant="secondary" className="gap-2 rounded-full py-1.5 pe-1">
                            <span>
                              {item.gradeName} - {item.subjectName}
                            </span>
                            <button
                              type="button"
                              className="rounded-full p-0.5 hover:bg-background"
                              onClick={() => handleRemoveTeachingSubject(item.classId, item.subjectId)}
                              aria-label="إزالة المادة"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    يمكنك إضافة حتى {MAX_TEACHING_SUBJECTS} مواد. يتم استخدام اسم المادة لمطابقة ملفات المشتركين بعد الدفع.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>المدرسة (اختياري)</Label>
                  <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="اسم المدرسة" className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label>المدينة (اختياري)</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="المدينة" className="bg-muted/30" />
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <Label className="text-lg">طريقة الدفع</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(paymentSettings ?? [])
                    .filter((method) => method.is_active !== false)
                    .map((method) => (
                      <div key={method.provider} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 hover:bg-muted/50">
                        <RadioGroupItem value={method.provider} id={method.provider} className="mt-1" />
                        <div className="grid gap-1">
                          <Label htmlFor={method.provider} className="cursor-pointer font-bold">
                            {method.display_name}
                          </Label>
                          {method.instructions && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{method.instructions}</p>}
                        </div>
                      </div>
                    ))}
                  {(paymentSettings ?? []).filter((method) => method.is_active !== false).length === 0 && (
                    <p className="col-span-full text-sm text-muted-foreground">لا توجد طرق دفع متاحة حاليا.</p>
                  )}
                </RadioGroup>
              </div>

              {paymentMethod && paymentMethod !== "credit_card" && (
                <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
                  <div className="space-y-2">
                    <Label>الرقم المرجعي (إن وجد)</Label>
                    <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="رقم الحوالة أو العملية" className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label>صورة الإيصال (إثبات الدفع)</Label>
                    <Button type="button" variant="outline" className="relative w-full overflow-hidden bg-background">
                      <input
                        type="file"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        accept="image/*,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                      <Upload className="me-2 h-4 w-4 text-muted-foreground" />
                      {proofFile ? proofFile.name : "اختر ملفا..."}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={createOrder.isPending || createOrderProof.isPending}
                className="mt-6 h-14 w-full bg-secondary text-lg text-secondary-foreground shadow-md hover:bg-secondary/90"
              >
                {createOrder.isPending || createOrderProof.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "تأكيد الدفع وإرسال الطلب"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
