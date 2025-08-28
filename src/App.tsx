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
import React, { useState, useEffect } from "react";
import AdminRedirectWrapper from "@/components/AdminRedirectWrapper";
import FloatingMenu, { InfoPageType } from "@/components/FloatingMenu";
import AboutUsPage from "./pages/AboutUsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { logToSupabase } from "@/utils/logger"; // Import the new logger

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

  // State to control the drawer's open/close animation
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  // State to store which specific info page is currently open
  const [currentInfoPageType, setCurrentInfoPageType] = useState<InfoPageType>(null);

  const getInfoPageTypeFromPathname = (pathname: string): InfoPageType => {
    if (pathname === '/about-us') return 'about';
    if (pathname === '/privacy-policy') return 'privacy';
    if (pathname === '/terms-and-conditions') return 'terms';
    return null;
  };

  // Effect to sync the drawer's state with the URL
  useEffect(() => {
    const pageType = getInfoPageTypeFromPathname(location.pathname);
    if (pageType) {
      setIsInfoDrawerOpen(true);
      setCurrentInfoPageType(pageType);
    } else {
      // If the URL is not an info page, ensure the drawer is closed
      setIsInfoDrawerOpen(false);
      setCurrentInfoPageType(null);
    }
  }, [location.pathname]);

  // This prop is passed to Index to inform it if an info page is visually open
  const isAnyInfoPageVisuallyOpen = isInfoDrawerOpen;

  const handleMenuItemClick = (pageKey: InfoPageType) => {
    if (pageKey === 'about') navigate('/about-us');
    else if (pageKey === 'privacy') navigate('/privacy-policy');
    else if (pageKey === 'terms') navigate('/terms-and-conditions');
  };

  const handleCloseInfoPage = () => {
    const currentCategoryParam = new URLSearchParams(location.search).get('category');
    const newPath = currentCategoryParam && currentCategoryParam !== "Всички" ? `/?category=${currentCategoryParam}` : '/';

    if (window.history.length > 1) {
      // Standard case: there's a previous page, so close drawer and navigate back
      setIsInfoDrawerOpen(false);
      setCurrentInfoPageType(null);
      setTimeout(() => {
        navigate(-1);
      }, 300); // Match drawer closing animation duration
    } else {
      // Edge case: landed directly on info page, no history to go back to.
      // Log to Supabase before the full page reload.
      logToSupabase("Closing info page from direct access, performing window.location.replace.", {
        fromPath: location.pathname,
        toPath: newPath,
        historyLength: window.history.length,
      });
      window.location.replace(newPath); // This will cause a full page reload
    }
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <AdminRedirectWrapper>
              <Index isInfoPageOpen={isAnyInfoPageVisuallyOpen} />
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
              <Index isInfoPageOpen={isAnyInfoPageVisuallyOpen} />
            </AdminRedirectWrapper>
          }
        />
        {/* These routes now just ensure the Index page is rendered behind the drawer */}
        <Route path="/about-us" element={<AdminRedirectWrapper><Index isInfoPageOpen={isAnyInfoPageVisuallyOpen} /></AdminRedirectWrapper>} />
        <Route path="/privacy-policy" element={<AdminRedirectWrapper><Index isInfoPageOpen={isAnyInfoPageVisuallyOpen} /></AdminRedirectWrapper>} />
        <Route path="/terms-and-conditions" element={<AdminRedirectWrapper><Index isInfoPageOpen={isAnyInfoPageVisuallyOpen} /></AdminRedirectWrapper>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <FloatingMenu onMenuItemClick={handleMenuItemClick} />

      <AboutUsPage isOpen={isInfoDrawerOpen && currentInfoPageType === 'about'} onClose={handleCloseInfoPage} />
      <PrivacyPolicyPage isOpen={isInfoDrawerOpen && currentInfoPageType === 'privacy'} onClose={handleCloseInfoPage} />
      <TermsAndConditionsPage isOpen={isInfoDrawerOpen && currentInfoPageType === 'terms'} onClose={handleCloseInfoPage} />
      <CookieConsentBanner />
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