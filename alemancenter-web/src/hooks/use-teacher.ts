import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherSubscriptionApi } from "@/lib/api/teacherSubscription";
import type { TeacherAIGeneration, TeacherLibraryItem } from "@/lib/api/types";

export const teacherKeys = {
  all: ["teacher"] as const,
  me: () => [...teacherKeys.all, "me"] as const,
  access: () => [...teacherKeys.all, "access"] as const,
  workspace: () => [...teacherKeys.all, "workspace"] as const,
  plans: () => [...teacherKeys.all, "plans"] as const,
  paymentSettings: () => [...teacherKeys.all, "paymentSettings"] as const,
  premiumFiles: (filters?: any) => [...teacherKeys.all, "premiumFiles", filters] as const,
  library: () => [...teacherKeys.all, "library"] as const,
  downloads: () => [...teacherKeys.all, "downloads"] as const,
  aiGenerations: () => [...teacherKeys.all, "aiGenerations"] as const,
  notifications: () => [...teacherKeys.all, "notifications"] as const,
  devices: () => [...teacherKeys.all, "devices"] as const,
  orders: () => [...teacherKeys.all, "orders"] as const,
};

export function useTeacherMe() {
  return useQuery({
    queryKey: teacherKeys.me(),
    queryFn: () => teacherSubscriptionApi.me(),
  });
}

export function useTeacherAccess() {
  return useQuery({
    queryKey: teacherKeys.access(),
    queryFn: () => teacherSubscriptionApi.access(),
  });
}

export function useTeacherWorkspace() {
  return useQuery({
    queryKey: teacherKeys.workspace(),
    queryFn: () => teacherSubscriptionApi.workspace(),
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: teacherKeys.plans(),
    queryFn: () => teacherSubscriptionApi.plan(),
  });
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: teacherKeys.paymentSettings(),
    queryFn: () => teacherSubscriptionApi.paymentSettings(),
  });
}

export function usePremiumFiles(filters?: { category?: string; subject_id?: number; query?: string }) {
  return useQuery({
    queryKey: teacherKeys.premiumFiles(filters),
    queryFn: () => teacherSubscriptionApi.premiumFiles(filters),
  });
}

export function useTeacherLibrary() {
  return useQuery({
    queryKey: teacherKeys.library(),
    queryFn: () => teacherSubscriptionApi.library(),
  });
}

export function useSaveLibraryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { item_type: string; item_id?: number; title: string; source_type?: string; category?: string }) => 
      teacherSubscriptionApi.saveLibraryItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.library() });
    },
  });
}

export function useTeacherDownloads() {
  return useQuery({
    queryKey: teacherKeys.downloads(),
    queryFn: () => teacherSubscriptionApi.downloads(),
  });
}

export function useAIGenerations() {
  return useQuery({
    queryKey: teacherKeys.aiGenerations(),
    queryFn: () => teacherSubscriptionApi.aiGenerations(),
  });
}

export function useGenerateAI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { tool_type: string; prompt: string; title?: string }) => 
      teacherSubscriptionApi.generateAI(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.aiGenerations() });
    },
  });
}

export function useTeacherNotifications() {
  return useQuery({
    queryKey: teacherKeys.notifications(),
    queryFn: () => teacherSubscriptionApi.notifications(),
  });
}

export function useTeacherDevices() {
  return useQuery({
    queryKey: teacherKeys.devices(),
    queryFn: () => teacherSubscriptionApi.myDevices(),
  });
}

export function useDeactivateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => teacherSubscriptionApi.deactivateMyDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.devices() });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      plan_id: number;
      payment_method: string;
      payer_name: string;
      phone: string;
      subjects?: string[];
      school?: string;
      city?: string;
      payment_reference?: string;
    }) => teacherSubscriptionApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.me() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.orders() }); // Optional: could infer from notifications or similar
    },
  });
}

export function useCreateOrderWithProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => teacherSubscriptionApi.createOrderWithProof(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.me() });
    },
  });
}
