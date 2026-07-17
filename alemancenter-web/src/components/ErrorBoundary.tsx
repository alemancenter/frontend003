import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-bold text-foreground">حدث خطأ غير متوقع</p>
          <p className="text-sm text-muted-foreground">يرجى إعادة تحميل الصفحة أو التواصل مع الدعم.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            إعادة التحميل
          </button>
          {import.meta.env.DEV && (
            <details className="mt-4 max-w-xl rounded-xl border bg-muted p-4 text-left">
              <summary className="cursor-pointer text-xs font-bold text-muted-foreground">تفاصيل الخطأ (DEV فقط)</summary>
              <pre className="mt-2 overflow-auto text-xs text-red-600">{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
