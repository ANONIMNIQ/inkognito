import React, { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@/components/SessionProvider";
import { toast } from "sonner";
import { isAdmin } from "@/integrations/supabase/auth"; // Import isAdmin

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { session, profile, loading } = useSessionContext(); // Get profile here

  useEffect(() => {
    if (loading) {
      // Still loading session or profile, do nothing yet.
      return;
    }

    if (session) {
      // User is authenticated
      if (isAdmin(profile)) {
        // User is an admin, redirect to dashboard
        navigate("/admin/dashboard", { replace: true });
        toast.info("Redirecting to admin dashboard.");
      } else {
        // User is authenticated but not an admin (or profile not found/role not admin)
        navigate("/", { replace: true });
        toast.warning("You are logged in, but do not have admin access.");
      }
    } else {
      // No session, user is not authenticated, stay on login page.
      // The Auth component will be rendered.
    }
  }, [session, profile, loading, navigate]); // Add profile to dependencies

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading authentication...</p>
      </div>
    );
  }

  // Render Auth component only if no session or if session exists but user is not an admin
  // This ensures the login form is shown if they need to log in, or if they are logged in
  // but not as an admin and were redirected here (e.g., by manually typing /admin/login).
  if (!session || !isAdmin(profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">Admin Login</h2>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-foreground))',
                  },
                },
              },
            }}
            theme="dark"
          />
        </div>
      </div>
    );
  }

  // If loading is false, session exists, and user is admin,
  // but useEffect hasn't navigated yet, return null to avoid flickering.
  return null;
};

export default AdminLogin;