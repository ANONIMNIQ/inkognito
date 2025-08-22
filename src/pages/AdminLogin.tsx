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
    // Only navigate if loading is complete AND a session exists AND the user is an admin
    if (!loading && session && isAdmin(profile)) {
      navigate("/admin/dashboard", { replace: true }); // Use replace to prevent going back to login
      toast.info("You are already logged in as an admin.");
    } else if (!loading && session && !isAdmin(profile)) {
      // If logged in but not admin, redirect to main page
      navigate("/", { replace: true });
      toast.warning("You are logged in, but do not have admin access.");
    }
  }, [session, profile, loading, navigate]); // Add profile to dependencies

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading authentication...</p>
      </div>
    );
  }

  // Only render the Auth component if not loading and no session exists OR session exists but not admin
  if (!session || (session && !isAdmin(profile))) {
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
            // Removed redirectTo to prevent full page reloads.
            // Navigation is now handled by the useEffect above.
          />
        </div>
      </div>
    );
  }

  // If loading is false and session exists and is admin, but useEffect hasn't navigated yet,
  // return null to avoid rendering anything until the redirect happens.
  return null;
};

export default AdminLogin;