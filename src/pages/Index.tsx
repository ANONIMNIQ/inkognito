import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ConfessionForm from "@/components/ConfessionForm";
import ConfessionCard from "@/components/ConfessionCard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Comment {
  id: string;
  confession_id: string;
  content: string;
  gender: "male" | "female";
  created_at: string; // Use string for ISO date from Supabase
}

interface Confession {
  id: string;
  title: string;
  content: string;
  gender: "male" | "female";
  likes: number;
  created_at: string; // Use string for ISO date from Supabase
  comments: Comment[];
}

const Index: React.FC = () => {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCollapsed, setAllCollapsed] = useState(false);

  const fetchConfessions = useCallback(async () => {
    setLoading(true);
    const { data: confessionsData, error: confessionsError } = await supabase
      .from("confessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (confessionsError) {
      toast.error("Error fetching confessions: " + confessionsError.message);
      setLoading(false);
      return;
    }

    const confessionsWithComments: Confession[] = [];
    for (const confession of confessionsData) {
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("confession_id", confession.id)
        .order("created_at", { ascending: true }); // Order comments by oldest first

      if (commentsError) {
        console.error("Error fetching comments for confession", confession.id, commentsError);
        // Continue without comments if there's an error
        confessionsWithComments.push({ ...confession, comments: [] });
      } else {
        confessionsWithComments.push({ ...confession, comments: commentsData || [] });
      }
    }

    setConfessions(confessionsWithComments);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfessions();

    // Set up real-time subscription for new confessions
    const confessionsSubscription = supabase
      .channel('public:confessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' }, (payload) => {
        const newConfession = payload.new as Confession;
        setConfessions((prev) => [{ ...newConfession, comments: [] }, ...prev]);
      })
      .subscribe();

    // Set up real-time subscription for new comments
    const commentsSubscription = supabase
      .channel('public:comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
        const newComment = payload.new as Comment;
        setConfessions((prev) =>
          prev.map((conf) =>
            conf.id === newComment.confession_id
              ? { ...conf, comments: [...conf.comments, newComment] }
              : conf
          )
        );
      })
      .subscribe();

    // Set up real-time subscription for likes updates
    const likesSubscription = supabase
      .channel('public:confessions_likes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'confessions' }, (payload) => {
        const updatedConfession = payload.new as Confession;
        setConfessions((prev) =>
          prev.map((conf) =>
            conf.id === updatedConfession.id
              ? { ...conf, likes: updatedConfession.likes }
              : conf
          )
        );
      })
      .subscribe();

    return () => {
      confessionsSubscription.unsubscribe();
      commentsSubscription.unsubscribe();
      likesSubscription.unsubscribe();
    };
  }, [fetchConfessions]);

  const handleAddConfession = async (title: string, content: string, gender: "male" | "female") => {
    const { data, error } = await supabase
      .from("confessions")
      .insert({ title, content, gender })
      .select()
      .single();

    if (error) {
      toast.error("Error posting confession: " + error.message);
      return;
    }

    const newConfession = { ...data, comments: [] };
    setConfessions((prev) => [newConfession, ...prev]);
    toast.success("Confession posted successfully!");

    // Invoke AI Edge Function for comment
    try {
      const { data: aiCommentResponse, error: aiError } = await supabase.functions.invoke(
        'generate-ai-comment',
        {
          body: { confessionContent: content }, // Changed to a plain object
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (aiError) {
        console.error("Error invoking AI function:", aiError);
        toast.warning("Confession posted, but AI comment failed to generate.");
      } else if (aiCommentResponse) {
        const aiComment = aiCommentResponse as Omit<Comment, 'confession_id'> & { timestamp: string }; // Ensure timestamp is string
        const { data: insertedAiComment, error: aiInsertError } = await supabase
          .from('comments')
          .insert({
            confession_id: newConfession.id,
            content: aiComment.content,
            gender: aiComment.gender,
            created_at: aiComment.timestamp, // Use the timestamp from AI response
          })
          .select()
          .single();

        if (aiInsertError) {
          console.error("Error inserting AI comment:", aiInsertError);
          toast.warning("Confession posted, but AI comment failed to save.");
        } else if (insertedAiComment) {
          setConfessions((prev) =>
            prev.map((conf) =>
              conf.id === newConfession.id
                ? { ...conf, comments: [...conf.comments, insertedAiComment] }
                : conf
            )
          );
        }
      }
    } catch (aiInvokeError) {
      console.error("Unexpected error during AI function invocation:", aiInvokeError);
      toast.warning("Confession posted, but AI comment failed due to an unexpected error.");
    }
  };

  const handleAddComment = async (confessionId: string, content: string, gender: "male" | "female") => {
    const { data, error } = await supabase
      .from("comments")
      .insert({ confession_id: confessionId, content, gender })
      .select()
      .single();

    if (error) {
      toast.error("Error posting comment: " + error.message);
      return;
    }

    setConfessions((prev) =>
      prev.map((conf) =>
        conf.id === confessionId
          ? { ...conf, comments: [...conf.comments, data] }
          : conf
      )
    );
    toast.success("Comment posted!");
  };

  const handleLikeConfession = async (confessionId: string) => {
    // Optimistically update UI
    setConfessions((prev) =>
      prev.map((conf) =>
        conf.id === confessionId ? { ...conf, likes: conf.likes + 1 } : conf
      )
    );

    const { error } = await supabase
      .rpc("increment_confession_likes", { confession_id: confessionId });

    if (error) {
      toast.error("Error liking confession: " + error.message);
      // Revert optimistic update if error
      setConfessions((prev) =>
        prev.map((conf) =>
          conf.id === confessionId ? { ...conf, likes: conf.likes - 1 } : conf
        )
      );
    } else {
      toast.success("Confession liked!");
    }
  };

  const toggleAllCollapsed = () => {
    setAllCollapsed((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading confessions...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-8">Anonymous Confessions</h1>
      <ConfessionForm onSubmit={handleAddConfession} />

      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={toggleAllCollapsed} className="flex items-center space-x-2">
          {allCollapsed ? (
            <>
              <ChevronDown className="h-4 w-4" />
              <span>Expand All</span>
            </>
          ) : (
            <>
              <ChevronUp className="h-4 w-4" />
              <span>Collapse All</span>
            </>
          )}
        </Button>
      </div>

      {confessions.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">No confessions yet. Be the first to share!</p>
      ) : (
        <div className="space-y-6">
          {confessions.map((confession) => (
            <ConfessionCard
              key={confession.id}
              confession={{
                ...confession,
                timestamp: new Date(confession.created_at),
                comments: confession.comments.map(comment => ({
                  ...comment,
                  timestamp: new Date(comment.created_at)
                }))
              }}
              onAddComment={handleAddComment}
              onLikeConfession={handleLikeConfession}
              allCollapsed={allCollapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;