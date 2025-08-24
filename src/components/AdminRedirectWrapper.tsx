import React from "react";
import { useSessionContext } from "@/components/SessionProvider";
import { isAdmin } from "@/integrations/supabase/auth";
import { Navigate } from "react-router-dom";

interface AdminRedirectWrapperProps {
  children: React.ReactNode;
}

const AdminRedirectWrapper: React.FC<AdminRedirectWrapperProps> = ({ children }) => {
  const { session, profile, loading } = useSessionContext();

  if (loading) {
    // Still loading session/profile, render nothing or a loading indicator
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading application...</p>
      </div>
    );
  }

  // If session exists and profile is loaded, check if admin
  if (session && profile && isAdmin(profile)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // If not an admin or not logged in, render the children (e.g., Index page)
  return <>{children}</>;
};

export default AdminRedirectWrapper;