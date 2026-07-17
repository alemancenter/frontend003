// Thin wrappers around the Google Identity Services and Facebook JS SDKs.
// Both load lazily (only when the user clicks a social login button) and
// resolve with a raw token that is then sent to our backend's token-based
// OAuth endpoints (/auth/google/token, /auth/facebook/token), which verify
// it server-side and return our own app's AuthTokens.

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
    FB?: {
      init: (config: { appId: string; version: string; xfbml: boolean; cookie: boolean }) => void;
      login: (
        callback: (response: {
          authResponse?: { accessToken: string };
          status: string;
        }) => void,
        options: { scope: string },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;

export const isGoogleLoginEnabled = Boolean(GOOGLE_CLIENT_ID);
export const isFacebookLoginEnabled = Boolean(FACEBOOK_APP_ID);

let googleScriptPromise: Promise<void> | null = null;
let facebookScriptPromise: Promise<void> | null = null;

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("فشل تحميل السكربت الخارجي"));
    document.body.appendChild(script);
  });
}

function loadGoogleScript(): Promise<void> {
  if (!googleScriptPromise) {
    googleScriptPromise = loadScript("https://accounts.google.com/gsi/client", "google-identity-services");
  }
  return googleScriptPromise;
}

function loadFacebookScript(): Promise<void> {
  if (!facebookScriptPromise) {
    facebookScriptPromise = loadScript("https://connect.facebook.net/en_US/sdk.js", "facebook-jssdk").then(() => {
      if (!window.FB) return;
      window.FB.init({
        appId: FACEBOOK_APP_ID as string,
        version: "v19.0",
        xfbml: false,
        cookie: false,
      });
    });
  }
  return facebookScriptPromise;
}

/** Opens the Google One Tap / account chooser and resolves with the ID token (JWT). */
export async function getGoogleIdToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("تسجيل الدخول عبر Google غير مفعّل حالياً");
  }
  await loadGoogleScript();
  if (!window.google) {
    throw new Error("تعذّر تحميل خدمة تسجيل الدخول من Google");
  }

  return new Promise<string>((resolve, reject) => {
    try {
      window.google!.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID as string,
        callback: (response) => {
          if (response?.credential) {
            resolve(response.credential);
          } else {
            reject(new Error("لم يتم استلام بيانات الدخول من Google"));
          }
        },
      });
      window.google!.accounts.id.prompt();
    } catch (err) {
      reject(err instanceof Error ? err : new Error("فشل تسجيل الدخول عبر Google"));
    }
  });
}

/** Opens the Facebook login popup and resolves with the access token. */
export async function getFacebookAccessToken(): Promise<string> {
  if (!FACEBOOK_APP_ID) {
    throw new Error("تسجيل الدخول عبر Facebook غير مفعّل حالياً");
  }
  await loadFacebookScript();
  if (!window.FB) {
    throw new Error("تعذّر تحميل خدمة تسجيل الدخول من Facebook");
  }

  return new Promise<string>((resolve, reject) => {
    window.FB!.login(
      (response) => {
        if (response.status === "connected" && response.authResponse?.accessToken) {
          resolve(response.authResponse.accessToken);
        } else {
          reject(new Error("تم إلغاء تسجيل الدخول عبر Facebook أو فشل"));
        }
      },
      { scope: "email,public_profile" },
    );
  });
}
