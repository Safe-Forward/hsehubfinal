import { Component, ReactNode, useEffect } from "react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface BoundaryProps {
  children: ReactNode;
  onError: (error: Error, info: { componentStack?: string | null }) => void;
}

interface BoundaryState {
  hasError: boolean;
}

class ErrorBoundaryClass extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.props.onError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md text-center space-y-4">
            <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Ein Fehler ist aufgetreten</h1>
            <p className="text-muted-foreground">
              Der Fehler wurde automatisch protokolliert. Bitte laden Sie die
              Seite neu.
            </p>
            <Button onClick={() => window.location.reload()}>Seite neu laden</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Catches uncaught errors and promise rejections that happen outside React's
// render cycle (async handlers, event listeners) - componentDidCatch alone
// only sees errors thrown during render/lifecycle methods.
function GlobalWindowErrorListener() {
  const { logError } = useAuditLog();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logError(event.error ?? new Error(event.message), "window_error");
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      logError(event.reason, "unhandled_promise_rejection");
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [logError]);

  return null;
}

export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  const { logError } = useAuditLog();

  return (
    <ErrorBoundaryClass
      onError={(error, info) =>
        logError(error, `react_render_error${info.componentStack ? `: ${info.componentStack.slice(0, 300)}` : ""}`)
      }
    >
      <GlobalWindowErrorListener />
      {children}
    </ErrorBoundaryClass>
  );
}
