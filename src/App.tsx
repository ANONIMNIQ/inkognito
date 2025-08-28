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
import React, { useState, useEffect } from "react"; // Import useState and useEffect
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
    // This is called when the user *initiates* the close (e.g., clicks X or outside).
    // It starts the drawer's closing animation.
    setIsInfoDrawerOpen(false);
    setCurrentInfoPageType(null); // Clear the type immediately to ensure correct rendering if another info page is opened quickly
  };

  const handleDrawerCloseComplete = () => {
    // This is called *after* the drawer's closing animation has finished.
    // Now we can safely manipulate history if needed.
    const infoPagePaths = ['/about-us', '/privacy-policy', '/terms-and-conditions'];
    const isCurrentlyOnInfoPagePath = infoPagePaths.includes(location.pathname);

    if (window.history.length > 1) {
      // If there's history, go back to the previous page
      navigate(-1);
    } else if (isCurrentlyOnInfoPagePath) {
      // If it's a direct access to an info page and no other history,
      // silently update the URL to the home page.
      window.history.replaceState({}, '', '/');
    }
    // If not on an info page path (e.g., already navigated away), do nothing.
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

      <AboutUsPage isOpen={isInfoDrawerOpen && currentInfoPageType === 'about'} onClose={handleCloseInfoPage} onDrawerCloseComplete={handleDrawerCloseComplete} />
      <PrivacyPolicyPage isOpen={isInfoDrawerOpen && currentInfoPageType === 'privacy'} onClose={handleCloseInfoPage} onDrawerCloseComplete={handleDrawerCloseComplete} />
      <TermsAndConditionsPage isOpen={isInfoDrawerOpen && currentInfoPageType === 'terms'} onClose={handleCloseInfoPage} onDrawerCloseComplete={handleDrawerCloseComplete} />
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