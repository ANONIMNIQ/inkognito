import React, { useEffect } from "react";
import { useSessionContext } from "@/components/SessionProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AdminConfessionList from "@/components/AdminConfessionList"; // Import the new component
import { isAdmin } from "@/integrations/supabase/auth"; // Import isAdmin

const AdminDashboard: React.FC = () => {
  const { user, profile, loading } = useSessionContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) { // Only act once loading (overallLoading) is complete
      if (!user || !profile || !isAdmin(profile)) {
        navigate("/admin/login", { replace: true });
        toast.error("You do not have administrative access.");
      }
    }
  }, [loading, user, profile, navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error logging out: " + error.message);
    } else {
      toast.success("Logged out successfully!");
      navigate("/admin/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading admin dashboard...</p>
      </div>
    );
  }

  // If we reach here, loading is false, and the useEffect above has determined the user is an admin.
  // So, we can safely render the dashboard content.
  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <Button onClick={handleLogout} variant="destructive">
          Logout
        </Button>
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        Welcome, {profile?.first_name || user?.email}! Your role: {profile?.role}
      </p>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        This is where you will moderate confessions and comments.
      </p>
      
      {/* Content moderation components will go here */}
      <AdminConfessionList />
    </div>
  );
};

export default AdminDashboard;