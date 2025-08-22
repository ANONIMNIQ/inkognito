import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { toast } from "sonner"; // Import toast for user-facing errors

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
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
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
  };

  useEffect(() => {
    const initializeSession = async () => {
      setLoading(true); // Ensure loading is true at the start
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting initial session:", sessionError);
          toast.error("Authentication error: " + sessionError.message);
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(initialSession);
          setUser(initialSession?.user || null);
          if (initialSession?.user) {
            await fetchUserProfile(initialSession.user.id);
          } else {
            setProfile(null);
          }
        }
      } catch (e) {
        console.error("Unexpected error during initial session fetch:", e);
        toast.error("An unexpected authentication error occurred.");
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false); // Always set loading to false after initial attempt
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setLoading(true); // Set loading true for state changes
        try {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          if (currentSession?.user) {
            await fetchUserProfile(currentSession.user.id);
          } else {
            setProfile(null); // Clear profile on sign out
          }
        } catch (e) {
          console.error("Unexpected error during auth state change:", e);
          toast.error("An unexpected authentication error occurred during state change.");
        } finally {
          setLoading(false); // Always set loading to false after state change processing
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, profile, loading };
};

export const isAdmin = (profile: Profile | null): boolean => {
  return profile?.role === "admin";
};