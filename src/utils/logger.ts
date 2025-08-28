import { supabase } from "@/integrations/supabase/client";

export const logToSupabase = async (message: string, context?: Record<string, unknown>) => {
  try {
    const { error } = await supabase.from('logs').insert({
      message,
      context: context || null,
    });

    if (error) {
      console.error("Failed to log to Supabase:", error.message);
    }
  } catch (e) {
    console.error("An unexpected error occurred while logging to Supabase:", e);
  }
};