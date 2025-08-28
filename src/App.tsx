import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { SessionProvider, useSessionContext } from "@/components/SessionProvider";
import { isAdmin } from "@/integrations/supabase/auth";
import React from "react";
import AdminRedirectWrapper from "@/components/AdminRedirectWrapper";
import FloatingMenu, { InfoPageType } from "@/components/FloatingMenu";
import AboutUsPage from "./pages/AboutUsPage";
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

// New component to encapsulate routing and modal logic
const AppRoutesAndModals: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveInfoPage = (pathname: string): InfoPageType => {
    if (pathname === '/about-us') return 'about';
    if (pathname === '/privacy-policy') return 'privacy';
    if (pathname === '/terms-and-conditions') return 'terms';
    return null;
  };

  const activeInfoPage = getActiveInfoPage(location.pathname);
  const isInfoPageOpen = activeInfoPage !== null; // Determine if any info page is open

  const handleMenuItemClick = (pageKey: InfoPageType) => {
    if (pageKey === 'about') navigate('/about-us');
    else if (pageKey === 'privacy') navigate('/privacy-policy');
    else if (pageKey === 'terms') navigate('/terms-and-conditions');
  };

  const handleCloseInfoPage = () => {
    // If there's more than one entry in history, go back.
    // Otherwise, navigate to the home page (pushing a new entry) to prevent tab closure.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/'); // Push to home, do not replace, to prevent tab closure on direct access
    }
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <AdminRedirectWrapper>
              <Index isInfoPageOpen={isInfoPageOpen} />
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
        <Route
          path="/confessions/:id/:slug"
          element={
            <AdminRedirectWrapper>
              <Index isInfoPageOpen={isInfoPageOpen} />
            </AdminRedirectWrapper>
          }
        />
        <Route path="/about-us" element={<AdminRedirectWrapper><Index isInfoPageOpen={isInfoPageOpen} /></AdminRedirectWrapper>} />
        <Route path="/privacy-policy" element={<AdminRedirectWrapper><Index isInfoPageOpen={isInfoPageOpen} /></AdminRedirectWrapper>} />
        <Route path="/terms-and-conditions" element={<AdminRedirectWrapper><Index isInfoPageOpen={isInfoPageOpen} /></AdminRedirectWrapper>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <FloatingMenu onMenuItemClick={handleMenuItemClick} />

      <AboutUsPage isOpen={activeInfoPage === 'about'} onClose={handleCloseInfoPage} />
      <PrivacyPolicyPage isOpen={activeInfoPage === 'privacy'} onClose={handleCloseInfoPage} />
      <TermsAndConditionsPage isOpen={activeInfoPage === 'terms'} onClose={handleCloseInfoPage} />
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionProvider>
            <AppRoutesAndModals />
          </SessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;