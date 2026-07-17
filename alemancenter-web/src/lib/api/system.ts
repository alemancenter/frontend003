import { api } from "./client";

export interface FrontSettings {
  site_name?: string;
  site_description?: string;
  site_url?: string;
  site_logo?: string;
  site_favicon?: string;
  /** Default share/Open-Graph image (storage path). Set from admin → Settings → SEO. */
  site_og_image?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  primary_color?: string;
  secondary_color?: string;
  social_facebook?: string;
  social_twitter?: string;
  social_youtube?: string;
  social_instagram?: string;
  social_whatsapp?: string;
  social_tiktok?: string;
  social_linkedin?: string;
  social_snapchat?: string;
  google_analytics_id?: string;
  facebook_pixel_id?: string;
  [key: string]: string | undefined;
}

export const systemApi = {
  getPublicSettings: () =>
    api.get<FrontSettings>("/front/settings", { skipAuth: true }),

  contact: (input: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  }) => api.post<{ message: string }>("/front/contact", input, { skipAuth: true }),

  legalPage: (
    slug: "privacy-policy" | "terms-of-service" | "cookie-policy" | "disclaimer"
  ) => api.get<string>(`/legal/${slug}`, { skipAuth: true }),
};
