import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import CookieConsent from "@/components/CookieConsent";
import Analytics from "@/components/analytics/Analytics";
import ScrollToTop from "@/components/ScrollToTop";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Upload = lazy(() => import("./pages/Upload"));
const Results = lazy(() => import("./pages/Results"));
const OfferDetail = lazy(() => import("./pages/OfferDetail"));
const QA = lazy(() => import("./pages/QA"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const About = lazy(() => import("./pages/About"));
const DataDeletion = lazy(() => import("./pages/DataDeletion"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const OffersManagement = lazy(() => import("./pages/OffersManagement"));
const Debug = lazy(() => import("./pages/Debug"));
const DebugOCR = lazy(() => import("./pages/DebugOCR"));
const DebugScraping = lazy(() => import("./pages/DebugScraping"));
const DebugAI = lazy(() => import("./pages/DebugAI"));
const PipelineDebug = lazy(() => import("./pages/PipelineDebug"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CollectiveOffer = lazy(() => import("./pages/CollectiveOffer"));
const Contracts = lazy(() => import("./pages/Contracts"));
const ScrapingTest = lazy(() => import("./pages/ScrapingTest"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const ReviewsAdmin = lazy(() => import("./pages/ReviewsAdmin"));
const SubmitReview = lazy(() => import("./pages/SubmitReview"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <CookieConsent />
          <Analytics />
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
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
              <Route path="/recensioni" element={<Feedback />} />
              <Route path="/scrivi-recensione" element={<SubmitReview />} />
              <Route path="/admin/recensioni" element={<ReviewsAdmin />} />
              <Route path="/admin-reviews" element={<AdminReviews />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/debug" element={<Debug />} />
              <Route path="/debug-ocr" element={<DebugOCR />} />
              <Route path="/debug-scraping" element={<DebugScraping />} />
              <Route path="/debug-ai" element={<DebugAI />} />
              <Route path="/debug-pipeline" element={<PipelineDebug />} />
              <Route path="/scraping-test" element={<ScrapingTest />} />
              <Route path="/offerta-collettiva" element={<CollectiveOffer />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
