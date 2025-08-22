import React, { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@/components/SessionProvider";
import { toast } from "sonner";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading } = useSessionContext();

  useEffect(() => {
    if (!loading && session) {
      // If session exists and loading is complete, navigate to dashboard.
      // ProtectedRoute will handle the admin role check.
      navigate("/admin/dashboard");
      toast.info("You are already logged in.");
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading authentication...</p>
      </div>
    );
  }

  // Only render the Auth component if not loading and no session exists
  if (!session) {
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
            redirectTo={window.location.origin + "/admin/dashboard"}
          />
        </div>
      </div>
    );
  }

  // If loading is false and session exists, but useEffect hasn't navigated yet,
  // return null to avoid rendering anything until the redirect happens.
  return null;
};

export default AdminLogin;