import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { SessionProvider, useSessionContext } from "@/components/SessionProvider";
import { isAdmin } from "@/integrations/supabase/auth";
import React, { useState } from "react";
import AdminRedirectWrapper from "@/components/AdminRedirectWrapper";
import FloatingMenu, { InfoPageType } from "@/components/FloatingMenu"; // Import InfoPageType
import AboutUsPage from "./pages/AboutUsPage"; // Import new info pages
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";

const queryClient = new QueryClient();

// ProtectedRoute component to guard admin routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading } = useSessionContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading authentication...</p>
      </div>
    );
  }

  if (!session || !isAdmin(profile)) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const [activeInfoPage, setActiveInfoPage] = useState<InfoPageType>(null);

  const handleMenuItemClick = (page: InfoPageType) => {
    setActiveInfoPage(page);
  };

  const handleCloseInfoPage = () => {
    setActiveInfoPage(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <AdminRedirectWrapper>
                    <Index />
                  </AdminRedirectWrapper>
                }
              />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              {/* Both routes now have the same structure to prevent re-mounting */}
              <Route
                path="/confessions/:id/:slug"
                element={
                  <AdminRedirectWrapper>
                    <Index />
                  </AdminRedirectWrapper>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* Render FloatingMenu outside Routes so it's always visible */}
            <FloatingMenu onMenuItemClick={handleMenuItemClick} />

            {/* Render the InfoDrawerContent components conditionally */}
            <AboutUsPage isOpen={activeInfoPage === 'about'} onClose={handleCloseInfoPage} />
            <PrivacyPolicyPage isOpen={activeInfoPage === 'privacy'} onClose={handleCloseInfoPage} />
            <TermsAndConditionsPage isOpen={activeInfoPage === 'terms'} onClose={handleCloseInfoPage} />

          </SessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;