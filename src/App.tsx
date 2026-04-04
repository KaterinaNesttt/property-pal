import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Properties from "./pages/Properties.tsx";
import Payments from "./pages/Payments.tsx";
import Tenants from "./pages/Tenants.tsx";
import Meters from "./pages/Meters.tsx";
import Analytics from "./pages/Analytics.tsx";
import Invoices from "./pages/Invoices.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/meters" element={<Meters />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
