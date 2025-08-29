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
import React, { useState, useEffect, useCallback } from "react";
import AdminRedirectWrapper from "@/components/AdminRedirectWrapper";
import FloatingMenu, { InfoPageType } from "@/components/FloatingMenu";
import AboutUsPage from "./pages/AboutUsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { HelmetProvider } from 'react-helmet-async';
import MetaTags, { DEFAULT_IMAGE_URL } from "@/components/MetaTags"; // Import DEFAULT_IMAGE_URL

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

// Define a type for dynamic meta data
interface DynamicMeta {
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  type?: string;
}

// New component to encapsulate routing and modal logic
const AppRoutesAndModals: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State to control the drawer's open/close animation
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  // State to store which specific info page is currently open
  const [currentInfoPageType, setCurrentInfoPageType] = useState<InfoPageType>(null);
  // State for dynamic meta tags
  const [dynamicMeta, setDynamicMeta] = useState<DynamicMeta>({});

  const getInfoPageTypeFromPathname = (pathname: string): InfoPageType => {
    if (pathname === '/about-us') return 'about';
    if (pathname === '/privacy-policy') return 'privacy';
    if (pathname === '/terms-and-conditions') return 'terms';
    return null;
  };

  // Callback to update meta tags from child components
  const updateMetaTags = useCallback((meta: DynamicMeta) => {
    setDynamicMeta({ ...meta, imageUrl: meta.imageUrl || DEFAULT_IMAGE_URL }); // Ensure default image is always set
  }, []);

  // Effect to sync the drawer's state with the URL and set info page meta
  useEffect(() => {
    const pageType = getInfoPageTypeFromPathname(location.pathname);
    if (pageType) {
      setIsInfoDrawerOpen(true);
      setCurrentInfoPageType(pageType);
      // Set meta for info pages directly here
      let infoPageTitle = "";
      let infoPageDescription = "";
      switch (pageType) {
        case 'about':
          infoPageTitle = "За нас";
          infoPageDescription = "Научете повече за Инкогнито Online - мястото, където можеш да споделиш своите тайни анонимно.";
          break;
        case 'privacy':
          infoPageTitle = "Политика за поверителност";
          infoPageDescription = "Прочетете нашата политика за поверителност, за да разберете как събираме, използваме и защитаваме вашата информация.";
          break;
        case 'terms':
          infoPageTitle = "Правила и условия";
          infoPageDescription = "Запознайте се с правилата и условията за използване на Инкогнито Online.";
          break;
      }
      updateMetaTags({
        title: infoPageTitle,
        description: infoPageDescription,
        url: window.location.href,
        type: 'article',
        imageUrl: DEFAULT_IMAGE_URL, // Explicitly set for info pages
      });
    } else {
      // If the URL is not an info page, ensure the drawer is closed
      setIsInfoDrawerOpen(false);
      setCurrentInfoPageType(null);
      // Reset dynamic meta if not on a specific content page
      if (!location.pathname.startsWith('/confessions/')) {
        updateMetaTags({}); // This will now correctly default to DEFAULT_IMAGE_URL due to the useCallback modification
      }
    }
  }, [location.pathname, location.search, updateMetaTags]);

  // This prop is passed to Index to inform it if an info page is visually open
  const isAnyInfoPageVisuallyOpen = isInfoDrawerOpen;

  const handleMenuItemClick = (pageKey: InfoPageType) => {
    if (pageKey === 'about') navigate('/about-us');
    else if (pageKey === 'privacy') navigate('/privacy-policy');
    else if (pageKey === 'terms') navigate('/terms-and-conditions');
  };

  const handleCloseInfoPage = async () => {
    const currentCategoryParam = new URLSearchParams(location.search).get('category');
    const newPath = currentCategoryParam && currentCategoryParam !== "Всички" ? `/?category=${currentCategoryParam}` : '/';

    // First, trigger the drawer closing animation
    setIsInfoDrawerOpen(false);
    setCurrentInfoPageType(null);

    // Wait for the drawer's closing animation to complete (300ms is the duration from InfoDrawerContent)
    await new Promise(resolve => setTimeout(resolve, 300));

    const historyLength = window.history.length;
    const isDirectAccess = (historyLength <= 1) || (historyLength === 2 && !location.state);

    if (isDirectAccess) {
      // If directly accessed, navigate to the main page and replace the history entry
      navigate(newPath, { replace: true });
    } else {
      // If internally navigated, go back one step in history
      navigate(-1);
    }
    updateMetaTags({}); // Reset meta tags to default after closing info page
  };

  return (
    <>
      <MetaTags {...dynamicMeta} /> {/* Use the dynamic meta tags */}
      <Routes>
        <Route
          path="/"
          element={
            <AdminRedirectWrapper>
              <Index isInfoPageOpen={isAnyInfoPageVisuallyOpen} updateMetaTags={updateMetaTags} />
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
              <Index isInfoPageOpen={isAnyInfoPageVisuallyOpen} updateMetaTags={updateMetaTags} />
            </AdminRedirectWrapper>
          }
        />
        {/* These routes now just ensure the Index page is rendered behind the drawer */}
        <Route path="/about-us" element={<AdminRedirectWrapper><Index isInfoPageOpen={isAnyInfoPageVisuallyOpen} updateMetaTags={updateMetaTags} /></AdminRedirectWrapper>} />
        <Route path="/privacy-policy" element={<AdminRedirectWrapper><Index isInfoPageOpen={isAnyInfoPageVisuallyOpen} updateMetaTags={updateMetaTags} /></AdminRedirectWrapper>} />
        <Route path="/terms-and-conditions" element={<AdminRedirectWrapper><Index isInfoPageOpen={isAnyInfoPageVisuallyOpen} updateMetaTags={updateMetaTags} /></AdminRedirectWrapper>} />
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
            <HelmetProvider> {/* Wrap with HelmetProvider */}
              <AppRoutesAndModals />
            </HelmetProvider>
          </SessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;