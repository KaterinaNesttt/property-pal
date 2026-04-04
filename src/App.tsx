import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Index";
import Properties from "./pages/Properties";
import Payments from "./pages/Payments";
import Tenants from "./pages/Tenants";
import Meters from "./pages/Meters";
import Tasks from "./pages/Tasks";
import Analytics from "./pages/Analytics";
import Invoices from "./pages/Invoices";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { ready, token } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="glass-card w-full max-w-sm text-center">
          <p className="text-lg font-semibold">Завантаження профілю…</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Підключення до API та перевірка авторизації.
          </p>
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
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ProtectedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
