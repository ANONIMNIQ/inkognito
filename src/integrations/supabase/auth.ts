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
  const [isProfileFetching, setIsProfileFetching] = useState(false); // New state for profile fetching

  const fetchUserProfile = useCallback(async (userId: string) => {
    console.log("fetchUserProfile: Attempting to fetch profile for userId:", userId);
    setIsProfileFetching(true); // Set fetching to true
    if (!userId) {
      setProfile(null);
      console.log("fetchUserProfile: No userId provided, setting profile to null.");
      setIsProfileFetching(false); // Reset fetching
      return null;
    }
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("fetchUserProfile: Error fetching profile:", profileError);
        toast.error("Failed to load user profile: " + profileError.message);
        setProfile(null);
        return null;
      } else if (profileData) {
        setProfile(profileData);
        console.log("fetchUserProfile: Profile fetched successfully:", profileData);
        return profileData;
      } else {
        setProfile(null); // No profile found
        console.log("fetchUserProfile: No profile found for userId:", userId);
        return null;
      }
    } catch (e) {
      console.error("fetchUserProfile: Unexpected error:", e);
      toast.error("An unexpected error occurred while fetching user profile.");
      setProfile(null);
      return null;
    } finally {
      setIsProfileFetching(false); // Reset fetching in finally
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    console.log("useSession: useEffect mounted.");

    const initializeSession = async () => {
      console.log("useSession: initializeSession started.");
      setLoading(true); // Ensure loading is true at the start of initialization
      try {
        const { data: { session: initialSession }, error: initialSessionError } = await supabase.auth.getSession();
        if (!isMounted) {
          console.log("useSession: initializeSession aborted, component unmounted.");
          return;
        }

        if (initialSessionError) {
          console.error("useSession: Error getting initial session:", initialSessionError);
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          console.log("useSession: Initial session set:", initialSession ? "present" : "null");
          if (initialSession?.user) {
            await fetchUserProfile(initialSession.user.id); // Await profile fetch
          } else {
            setProfile(null);
          }
        }
      } catch (e) {
        console.error("useSession: Unexpected error during initial session fetch:", e);
        if (isMounted) {
          toast.error("An unexpected error occurred during initial session load.");
        }
      } finally {
        if (isMounted) {
          setLoading(false); // Set loading to false only after initial session and profile (if any) are fetched
          console.log("useSession: Initial load complete, setLoading(false). Current loading:", false);
        }
      }
    };

    initializeSession();

    // Set up the listener for subsequent auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) {
          console.log("useSession: onAuthStateChange callback aborted, component unmounted.");
          return;
        }
        console.log("useSession: Auth state change event:", event, "Session:", currentSession ? "present" : "null");

        setSession(currentSession);
        setUser(currentSession?.user || null);
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
        // Do NOT set loading to false here, it's managed by initializeSession for initial load
        // and by isProfileFetching for subsequent profile fetches.
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      console.log("useSession: useEffect unmounted, subscription unsubscribed.");
    };
  }, [fetchUserProfile]); // fetchUserProfile is a dependency

  // The overall loading state should consider both initial loading and profile fetching
  const overallLoading = loading || isProfileFetching;

  console.log("useSession: Render. Overall Loading:", overallLoading, "Session:", session ? "present" : "null", "Profile:", profile ? "present" : "null");
  return { session, user, profile, loading: overallLoading };
};

export const isAdmin = (profile: Profile | null): boolean => {
  const result = profile?.role === 'admin';
  console.log("isAdmin check: Profile:", profile ? profile.role : "null", "Is Admin:", result);
  return result;
};