import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminConfessionCard from "./AdminConfessionCard";

interface Comment {
  id: string;
  confession_id: string;
  content: string;
  gender: "male" | "female";
  created_at: string;
}

interface Confession {
  id: string;
  title: string;
  content: string;
  gender: "male" | "female";
  likes: number;
  created_at: string;
  comments: Comment[];
}

const AdminConfessionList: React.FC = () => {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllConfessionsAndComments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: confessionsData, error: confessionsError } = await supabase
        .from("confessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (confessionsError) {
        toast.error("Error fetching confessions for admin: " + confessionsError.message);
        return;
      }

      const confessionsWithComments: Confession[] = [];
      for (const confession of confessionsData) {
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select("*")
          .eq("confession_id", confession.id)
          .order("created_at", { ascending: true });

        if (commentsError) {
          console.error("Error fetching comments for confession", confession.id, commentsError);
          confessionsWithComments.push({ ...confession, comments: [] });
        } else {
          confessionsWithComments.push({ ...confession, comments: commentsData || [] });
        }
      }
      setConfessions(confessionsWithComments);
    } catch (e) {
      console.error("Unexpected error fetching confessions for admin:", e);
      toast.error("An unexpected error occurred while loading confessions for moderation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllConfessionsAndComments();

    // Setup real-time subscriptions for admin view
    const confessionsSubscription = supabase
      .channel('admin_confessions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'confessions' }, () => {
        fetchAllConfessionsAndComments(); // Re-fetch all data on any change
      })
      .subscribe();

    const commentsSubscription = supabase
      .channel('admin_comments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchAllConfessionsAndComments(); // Re-fetch all data on any change
      })
      .subscribe();

    return () => {
      confessionsSubscription.unsubscribe();
      commentsSubscription.unsubscribe();
    };
  }, [fetchAllConfessionsAndComments]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-gray-700 dark:text-gray-300">Loading confessions for moderation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {confessions.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No confessions to moderate yet.</p>
      ) : (
        confessions.map((confession) => (
          <AdminConfessionCard key={confession.id} confession={confession} />
        ))
      )}
    </div>
  );
};

export default AdminConfessionList;