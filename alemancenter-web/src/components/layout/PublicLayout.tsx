import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

const ChatbotWidget = lazy(() =>
  import("../ChatbotWidget").then((module) => ({ default: module.ChatbotWidget })),
);

function DeferredChatbotWidget() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const show = () => setEnabled(true);
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(show, { timeout: 12000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(show, 8000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <ChatbotWidget />
    </Suspense>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background font-sans" dir="rtl">
      <Navbar />
      <main className="flex-1 w-full relative">
        {children}
      </main>
      <Footer />
      <DeferredChatbotWidget />
    </div>
  );
}
