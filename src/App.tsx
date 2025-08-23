import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ConfessionDetail from "./pages/ConfessionDetail"; // Import the new ConfessionDetail page
import { SessionProvider, useSessionContext } from "@/components/SessionProvider";
import { isAdmin } from "@/integrations/supabase/auth";
import React from "react";
import AdminRedirectWrapper from "@/components/AdminRedirectWrapper"; // Import the new wrapper

const queryClient = new QueryClient();

// ProtectedRoute component to guard admin routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading } = useSessionContext();

  console.log("ProtectedRoute: loading:", loading, "session:", session ? "present" : "null", "profile:", profile ? profile.role : "null");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading authentication...</p>
      </div>
    );
  }

  if (!session || !isAdmin(profile)) {
    console.log("ProtectedRoute: Not authenticated or not admin, redirecting to /admin/login");
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

const App = () => (
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
                <AdminRedirectWrapper> {/* Wrap Index with AdminRedirectWrapper */}
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
            <Route path="/confessions/:id/:slug" element={<ConfessionDetail />} /> {/* New route for individual confessions */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;