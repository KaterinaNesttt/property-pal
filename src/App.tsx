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
import PropertyDetails from "./pages/PropertyDetails";
import Properties from "./pages/Properties";
import SettingsPage from "./pages/SettingsPage";
import TenantDetails from "./pages/TenantDetails";
import Tasks from "./pages/Tasks";
import Tenants from "./pages/Tenants";

const queryClient = new QueryClient();

type SyncEventDetail =
  | { type: "queued" }
  | { type: "flush-complete"; synced: number; failed: number; pending: number }
  | { type: "flush-error"; message: string }
  | { type: "flush-paused"; pending: number };

const messages = {
  queued: "Зміни збережено локально. Вони відправляться після повернення мережі.",
  syncedPrefix: "Синхронізовано змін: ",
  failedPrefix: "Не вдалося синхронізувати змін: ",
  flushErrorPrefix: "Одна зі змін не пройшла синхронізацію: ",
  paused: "Черга змін ще очікує на стабільне підключення.",
  loadingTitle: "Завантаження профілю…",
  loadingBody: "Підключення до API та перевірка авторизації.",
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

const PwaRegistration = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          const interval = setInterval(() => {
            void registration.update();
          }, 60_000);

          return () => clearInterval(interval);
        })
        .catch((error) => {
          console.error("[PWA] SW registration failed:", error);
        });
    });
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
      <Route path="/properties/:id" element={<PropertyDetails />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/tenants" element={<Tenants />} />
      <Route path="/tenants/:id" element={<TenantDetails />} />
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
        <PwaRegistration />
        <OfflineSyncBridge />
        <Sonner
          position="top-center"
          toastOptions={{
            style: { top: "1rem" },
          }}
        />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProtectedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;