import React, { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@/components/SessionProvider";
import { isAdmin } from "@/integrations/supabase/auth";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { session, profile, loading } = useSessionContext();

  useEffect(() => {
    if (loading) {
      return; // Still loading session or profile, wait
    }

    if (session) {
      // Session exists, profile should have been fetched by now.
      // If profile is null, or role is not admin, they are not an admin.
      if (isAdmin(profile)) {
        navigate("/admin/dashboard", { replace: true });
      } else {
        // User is logged in but not an admin, or profile fetch failed/no profile.
        // Redirect them to the main page.
        navigate("/", { replace: true });
      }
    }
    // If no session, the Auth component will be rendered, which is correct.
  }, [session, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading authentication...</p>
      </div>
    );
  }

  // If session exists and user is an admin, this component should not be rendered
  // as the useEffect above would have navigated them away.
  // If session exists but not admin, they are navigated to '/', so this won't render.
  // So, if we reach here, it means there's no session, and we should show the login form.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Admin Login
        </h2>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          theme="dark"
          view="sign_in"
          showLinks={false}
        />
      </div>
    </div>
  );
};

export default AdminLogin;