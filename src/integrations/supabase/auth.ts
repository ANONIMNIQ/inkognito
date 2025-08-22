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
    if (!userId) {
      setProfile(null);
      return;
    }
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

    const handleAuthChange = async (currentSession: Session | null) => {
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user || null);
      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false); // Always set loading to false after processing
    };

    // Get initial session and set up listener
    const setupAuth = async () => {
      try {
        const { data: { session: initialSession }, error: initialSessionError } = await supabase.auth.getSession();
        if (isMounted) {
          if (initialSessionError) {
            console.error("Error getting initial session:", initialSessionError);
            setSession(null);
            setUser(null);
            setProfile(null);
          } else {
            await handleAuthChange(initialSession); // Process initial session
          }
        }
      } catch (e) {
        console.error("Unexpected error during initial session fetch:", e);
        if (isMounted) {
          toast.error("An unexpected error occurred during initial session load.");
        }
      } finally {
        if (isMounted) {
          setLoading(false); // Ensure loading is false after initial check
        }
      }

      // Set up the listener for subsequent auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          console.log("Auth state change event:", event, "Session:", currentSession);
          if (!isMounted) return;
          // For any auth state change, re-evaluate the session and profile
          // We don't set loading to true here, as handleAuthChange will manage it
          await handleAuthChange(currentSession);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    };

    setupAuth();

    return () => {
      isMounted = false;
    };
  }, [fetchUserProfile]); // Dependencies for useEffect

  return { session, user, profile, loading };
};

export const isAdmin = (profile: Profile | null): boolean => {
  return profile?.role === 'admin';
};