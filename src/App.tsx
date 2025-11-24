import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import CookieConsent from "@/components/CookieConsent";
import Analytics from "@/components/analytics/Analytics";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Upload from "./pages/Upload";
import Results from "./pages/Results";
import OfferDetail from "./pages/OfferDetail";
import QA from "./pages/QA";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import DataDeletion from "./pages/DataDeletion";
import Feedback from "./pages/Feedback";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import OffersManagement from "./pages/OffersManagement";
import Debug from "./pages/Debug";
import DebugOCR from "./pages/DebugOCR";
import DebugScraping from "./pages/DebugScraping";
import DebugAI from "./pages/DebugAI";
import NotFound from "./pages/NotFound";
import CollectiveOffer from "./pages/CollectiveOffer";
import Contracts from "./pages/Contracts";
import ScrapingTest from "./pages/ScrapingTest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <CookieConsent />
          <Analytics />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/results" element={<Results />} />
            <Route path="/offer/:id" element={<OfferDetail />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/qa" element={<QA />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/offers" element={<OffersManagement />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/chi-siamo" element={<About />} />
            <Route path="/data-deletion" element={<DataDeletion />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/debug" element={<Debug />} />
            <Route path="/debug-ocr" element={<DebugOCR />} />
            <Route path="/debug-scraping" element={<DebugScraping />} />
            <Route path="/debug-ai" element={<DebugAI />} />
            <Route path="/scraping-test" element={<ScrapingTest />} />
            <Route path="/offerta-collettiva" element={<CollectiveOffer />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
