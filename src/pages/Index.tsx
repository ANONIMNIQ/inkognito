import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ConfessionForm from "@/components/ConfessionForm";
import ConfessionCard from "@/components/ConfessionCard";
import { toast } from "sonner";
import { useSessionContext } from "@/components/SessionProvider";

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

const Index: React.FC = () => {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loadingConfessions, setLoadingConfessions] = useState(true);
  const [expandedConfessionId, setExpandedConfessionId] = useState<string | null>(null);
  const { loading: authLoading } = useSessionContext();

  const fetchConfessions = useCallback(async () => {
    setLoadingConfessions(true);
    try {
      const { data: confessionsData, error: confessionsError } = await supabase
        .from("confessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (confessionsError) {
        toast.error("Error fetching confessions: " + confessionsError.message);
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
      console.error("Unexpected error fetching confessions:", e);
      toast.error("An unexpected error occurred while loading confessions.");
    } finally {
      setLoadingConfessions(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchConfessions();

      const confessionsSubscription = supabase
        .channel('public:confessions')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' }, (payload) => {
          const newConfession = payload.new as Confession;
          setConfessions((prev) => [{ ...newConfession, comments: [] }, ...prev]);
          setExpandedConfessionId(newConfession.id); // New confession starts expanded
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'confessions' }, (payload) => {
          const deletedConfessionId = payload.old.id;
          setConfessions((prev) => prev.filter(conf => conf.id !== deletedConfessionId));
        })
        .subscribe();

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
          setExpandedConfessionId(newComment.confession_id); // Ensure parent confession is expanded
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, (payload) => {
          const deletedCommentId = payload.old.id;
          const confessionId = payload.old.confession_id;
          setConfessions((prev) =>
            prev.map((conf) =>
              conf.id === confessionId
                ? { ...conf, comments: conf.comments.filter(comment => comment.id !== deletedCommentId) }
                : conf
            )
          );
        })
        .subscribe();

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
    }
  }, [fetchConfessions, authLoading]);

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
    setExpandedConfessionId(newConfession.id); // New confession starts expanded
    toast.success("Confession posted successfully!");

    try {
      const SUPABASE_PROJECT_ID = "yyhlligskuppqmlzpobp";
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const aiFunctionUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-ai-comment`;

      const aiResponse = await fetch(aiFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ confessionContent: content }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        console.error("Error invoking AI function:", errorData);
        toast.warning("Confession posted, but AI comment failed to generate: " + (errorData.error || "Unknown error"));
        return;
      }

      const aiCommentResponse = await aiResponse.json();

      if (aiCommentResponse) {
        const aiComment = aiCommentResponse as Omit<Comment, 'confession_id'> & { timestamp: string };
        const { data: insertedAiComment, error: aiInsertError } = await supabase
          .from('comments')
          .insert({
            confession_id: newConfession.id,
            content: aiComment.content,
            gender: aiComment.gender,
            created_at: aiComment.timestamp,
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
    setExpandedConfessionId(confessionId); // Ensure parent confession is expanded
    toast.success("Comment posted!");
  };

  const handleLikeConfession = async (confessionId: string) => {
    setConfessions((prev) =>
      prev.map((conf) =>
        conf.id === confessionId ? { ...conf, likes: conf.likes + 1 } : conf
      )
    );

    const { error } = await supabase
      .rpc("increment_confession_likes", { confession_id: confessionId });

    if (error) {
      toast.error("Error liking confession: " + error.message);
      setConfessions((prev) =>
        prev.map((conf) =>
          conf.id === confessionId ? { ...conf, likes: conf.likes - 1 } : conf
        )
      );
    } else {
      toast.success("Confession liked!");
    }
  };

  const handleConfessionToggle = useCallback((toggledConfessionId: string) => {
    setExpandedConfessionId(currentId =>
      currentId === toggledConfessionId ? null : toggledConfessionId
    );
  }, []);

  if (authLoading || loadingConfessions) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-8">Anonymous Confessions</h1>
      <ConfessionForm onSubmit={handleAddConfession} />

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
              isContentOpen={expandedConfessionId === confession.id} // Pass controlled state
              onToggleExpand={handleConfessionToggle} // Pass callback
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;