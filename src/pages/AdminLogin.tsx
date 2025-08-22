import React, { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@/components/SessionProvider";
import { toast } from "sonner";
import { isAdmin } from "@/integrations/supabase/auth";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { session, profile, loading } = useSessionContext();

  useEffect(() => {
    console.log("AdminLogin useEffect: loading:", loading, "session:", session ? "present" : "null", "profile:", profile ? profile.role : "null");

    if (loading) {
      return; // Wait for loading to complete
    }

    if (session) {
      if (profile === null) {
        console.log("AdminLogin: Session present, but profile is null. Waiting for profile data.");
        return; // Wait for profile to be loaded
      }

      if (isAdmin(profile)) {
        console.log("AdminLogin: User is admin, redirecting to dashboard.");
        navigate("/admin/dashboard", { replace: true });
        toast.info("Redirecting to admin dashboard.");
      } else {
        console.log("AdminLogin: User is not admin, redirecting to main page.");
        navigate("/", { replace: true });
        toast.warning("You are logged in, but do not have admin access.");
      }
    } else {
      console.log("AdminLogin: No session, staying on login page.");
    }
  }, [session, profile, loading, navigate]);

  // Determine what content to render based on the current state
  let content;

  if (loading) {
    content = (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading authentication...</p>
      </div>
    );
  } else if (session && isAdmin(profile)) {
    // If an admin is logged in, and the useEffect has already handled navigation,
    // we return null here to prevent rendering the login form.
    content = null;
  } else {
    // Otherwise, render the login form for non-admins or unauthenticated users
    content = (
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
            view="sign_in" {/* Ensures only the sign-in form is shown */}
          />
        </div>
      </div>
    );
  }

  return <>{content}</>; // Return the determined content
};

export default AdminLogin;