import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  updated_at: string | null;
};

export const useSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // Initial state is true

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("Error fetching profile:", profileError);
        toast.error("Failed to load user profile: " + profileError.message);
        setProfile(null);
      } else if (profileData) {
        setProfile(profileData);
      } else {
        setProfile(null); // No profile found
      }
    } catch (e) {
      console.error("Unexpected error in fetchUserProfile:", e);
      toast.error("An unexpected error occurred while fetching user profile.");
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    // This listener will fire immediately upon subscription with the current session state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return; // Don't update state if component is unmounted

        setLoading(true); // Start loading for any auth state change
        try {
          // Always get the most current session directly from Supabase,
          // as currentSession from the event might sometimes be slightly stale or incomplete
          const { data: { session: latestSession }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("Error getting latest session:", sessionError);
            toast.error("Failed to retrieve latest session: " + sessionError.message);
            setSession(null);
            setUser(null);
            setProfile(null);
          } else {
            setSession(latestSession);
            setUser(latestSession?.user || null);
            if (latestSession?.user) {
              await fetchUserProfile(latestSession.user.id);
            } else {
              setProfile(null); // Clear profile on sign out or no user
            }
          }
        } catch (e) {
          console.error("Unexpected error during auth state change:", e);
          toast.error("An unexpected authentication error occurred during state change.");
        } finally {
          if (isMounted) { // Ensure component is still mounted before setting loading to false
            setLoading(false); // Always set loading to false after processing
          }
        }
      }
    );

    return () => {
      isMounted = false; // Cleanup: component is unmounted
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]); // Add fetchUserProfile to dependencies

  return { session, user, profile, loading };
};

export const isAdmin = (profile: Profile | null): boolean => {
  return profile?.role === 'admin';
};