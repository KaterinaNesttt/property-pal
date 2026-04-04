import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { offlineSync } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import { OFFLINE_SYNC_EVENT } from "@/lib/offline-sync";
import Analytics from "./pages/Analytics";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Index";
import Invoices from "./pages/Invoices";
import Meters from "./pages/Meters";
import NotFound from "./pages/NotFound";
import Payments from "./pages/Payments";
import Properties from "./pages/Properties";
import SettingsPage from "./pages/SettingsPage";
import Tasks from "./pages/Tasks";
import Tenants from "./pages/Tenants";

const queryClient = new QueryClient();

type SyncEventDetail =
  | { type: "queued" }
  | { type: "flush-complete"; synced: number; failed: number; pending: number }
  | { type: "flush-error"; message: string }
  | { type: "flush-paused"; pending: number };

const messages = {
  queued:
    "\u0417\u043c\u0456\u043d\u0438 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043e \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e. \u0412\u043e\u043d\u0438 \u0432\u0456\u0434\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u044c\u0441\u044f \u043f\u0456\u0441\u043b\u044f \u043f\u043e\u0432\u0435\u0440\u043d\u0435\u043d\u043d\u044f \u043c\u0435\u0440\u0435\u0436\u0456.",
  syncedPrefix: "\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0456\u0437\u043e\u0432\u0430\u043d\u043e \u0437\u043c\u0456\u043d: ",
  failedPrefix: "\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0456\u0437\u0443\u0432\u0430\u0442\u0438 \u0437\u043c\u0456\u043d: ",
  flushErrorPrefix:
    "\u041e\u0434\u043d\u0430 \u0437\u0456 \u0437\u043c\u0456\u043d \u043d\u0435 \u043f\u0440\u043e\u0439\u0448\u043b\u0430 \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0456\u0437\u0430\u0446\u0456\u044e: ",
  paused:
    "\u0427\u0435\u0440\u0433\u0430 \u0437\u043c\u0456\u043d \u0449\u0435 \u043e\u0447\u0456\u043a\u0443\u0454 \u043d\u0430 \u0441\u0442\u0430\u0431\u0456\u043b\u044c\u043d\u0435 \u043f\u0456\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u043d\u044f.",
  loadingTitle: "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f \u043f\u0440\u043e\u0444\u0456\u043b\u044e...",
  loadingBody:
    "\u041f\u0456\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u043d\u044f \u0434\u043e API \u0442\u0430 \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u043a\u0430 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0456\u0457.",
};

const OfflineSyncBridge = () => {
  useEffect(() => {
    const flush = () => {
      void offlineSync.flush();
    };

    const onSyncEvent = (event: Event) => {
      const detail = (event as CustomEvent<SyncEventDetail>).detail;

      if (detail.type === "queued") {
        toast.info(messages.queued);
        return;
      }

      if (detail.type === "flush-complete") {
        if (detail.synced > 0) {
          toast.success(`${messages.syncedPrefix}${detail.synced}`);
          void queryClient.invalidateQueries();
        }
        if (detail.failed > 0) {
          toast.warning(`${messages.failedPrefix}${detail.failed}`);
        }
        return;
      }

      if (detail.type === "flush-error") {
        toast.warning(`${messages.flushErrorPrefix}${detail.message}`);
        return;
      }

      if (detail.type === "flush-paused" && detail.pending > 0) {
        toast.info(messages.paused);
      }
    };

    window.addEventListener("online", flush);
    window.addEventListener(OFFLINE_SYNC_EVENT, onSyncEvent as EventListener);
    void offlineSync.flush();

    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener(OFFLINE_SYNC_EVENT, onSyncEvent as EventListener);
    };
  }, []);

  return null;
};

const ProtectedRoutes = () => {
  const { ready, token } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="glass-card w-full max-w-sm text-center">
          <p className="text-lg font-semibold">{messages.loadingTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{messages.loadingBody}</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/properties" element={<Properties />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/tenants" element={<Tenants />} />
      <Route path="/meters" element={<Meters />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/invoices" element={<Invoices />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OfflineSyncBridge />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProtectedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
