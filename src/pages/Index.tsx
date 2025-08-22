import React, { useState, useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import ConfessionForm from "@/components/ConfessionForm";
import ConfessionCard from "@/components/ConfessionCard";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Comment {
  id: string;
  confession_id: string;
  content: string;
  gender: "male" | "female";
  created_at: string; // ISO string from Supabase
}

interface Confession {
  id: string;
  title: string;
  content: string;
  gender: "male" | "female";
  likes: number;
  created_at: string; // ISO string from Supabase
  comments: Comment[]; // Will be populated client-side
}

const Index = () => {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfessions = async () => {
      setLoading(true);
      const { data: confessionsData, error: confessionsError } = await supabase
        .from('confessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (confessionsError) {
        console.error("Error fetching confessions:", confessionsError);
        setError("Failed to load confessions.");
        setLoading(false);
        return;
      }

      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: true }); // Order comments by oldest first

      if (commentsError) {
        console.error("Error fetching comments:", commentsError);
        setError("Failed to load comments.");
        setLoading(false);
        return;
      }

      const confessionsWithComments = confessionsData.map(conf => ({
        ...conf,
        comments: commentsData.filter(comment => comment.confession_id === conf.id),
      }));

      setConfessions(confessionsWithComments);
      setLoading(false);
    };

    fetchConfessions();
  }, []);

  const handleAddConfession = async (title: string, content: string, gender: "male" | "female") => {
    const { data: newConfessionData, error: insertError } = await supabase
      .from('confessions')
      .insert({ title, content, gender, likes: 0 })
      .select()
      .single();

    if (insertError) {
      console.error("Error posting confession:", insertError);
      toast.error("Failed to post confession.");
      return;
    }

    const newConfession: Confession = { ...newConfessionData, comments: [] };

    // Invoke AI Edge Function for comment
    try {
      const { data: aiCommentResponse, error: aiError } = await supabase.functions.invoke(
        'generate-ai-comment',
        {
          body: JSON.stringify({ confessionContent: content }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (aiError) {
        console.error("Error invoking AI function:", aiError);
        toast.warning("Confession posted, but AI comment failed to generate.");
      } else if (aiCommentResponse) {
        const aiComment = aiCommentResponse as Omit<Comment, 'confession_id'>;
        const { data: insertedAiComment, error: aiInsertError } = await supabase
          .from('comments')
          .insert({
            confession_id: newConfession.id,
            content: aiComment.content,
            gender: aiComment.gender,
            created_at: aiComment.created_at,
          })
          .select()
          .single();

        if (aiInsertError) {
          console.error("Error inserting AI comment:", aiInsertError);
          toast.warning("Confession posted, but AI comment failed to save.");
        } else if (insertedAiComment) {
          newConfession.comments.push(insertedAiComment);
        }
      }
    } catch (aiInvokeError) {
      console.error("Unexpected error during AI function invocation:", aiInvokeError);
      toast.warning("Confession posted, but AI comment failed due to an unexpected error.");
    }

    setConfessions((prevConfessions) => [newConfession, ...prevConfessions]);
    toast.success("Your confession has been posted!");
  };

  const handleAddComment = async (confessionId: string, content: string, gender: "male" | "female") => {
    const { data: newCommentData, error: insertError } = await supabase
      .from('comments')
      .insert({ confession_id: confessionId, content, gender })
      .select()
      .single();

    if (insertError) {
      console.error("Error posting comment:", insertError);
      toast.error("Failed to post comment.");
      return;
    }

    setConfessions((prevConfessions) =>
      prevConfessions.map((confession) =>
        confession.id === confessionId
          ? {
              ...confession,
              comments: [...confession.comments, newCommentData],
            }
          : confession
      )
    );
    toast.success("Your comment has been posted!");
  };

  const handleLikeConfession = async (confessionId: string) => {
    const confessionToUpdate = confessions.find(c => c.id === confessionId);
    if (!confessionToUpdate) return;

    const newLikes = confessionToUpdate.likes + 1;

    const { error: updateError } = await supabase
      .from('confessions')
      .update({ likes: newLikes })
      .eq('id', confessionId);

    if (updateError) {
      console.error("Error liking confession:", updateError);
      toast.error("Failed to like confession.");
      return;
    }

    setConfessions((prevConfessions) =>
      prevConfessions.map((confession) =>
        confession.id === confessionId
          ? { ...confession, likes: newLikes }
          : confession
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading confessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center text-gray-900 dark:text-gray-50 mb-8">
          Anonymous Confessions
        </h1>

        <ConfessionForm onSubmit={handleAddConfession} />

        <Separator className="my-8" />

        {confessions.length > 0 && (
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={() => setAllCollapsed(!allCollapsed)}>
              {allCollapsed ? "Expand All" : "Collapse All"}
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {confessions.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400 text-lg">
              No confessions yet. Be the first to share!
            </p>
          ) : (
            confessions.map((confession) => (
              <ConfessionCard
                key={confession.id}
                confession={{
                  ...confession,
                  timestamp: new Date(confession.created_at), // Convert ISO string to Date object for component
                  comments: confession.comments.map(comment => ({
                    ...comment,
                    timestamp: new Date(comment.created_at), // Convert ISO string to Date object
                  })),
                }}
                onAddComment={handleAddComment}
                onLikeConfession={handleLikeConfession}
                allCollapsed={allCollapsed}
              />
            ))
          )}
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;