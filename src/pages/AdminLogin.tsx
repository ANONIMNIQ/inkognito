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
      return;
    }

    if (session) {
      if (profile === null) {
        return;
      }

      if (isAdmin(profile)) {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [session, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading authentication...</p>
      </div>
    );
  }

  if (session && isAdmin(profile)) {
    return null;
  }

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