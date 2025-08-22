import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import ConfessionForm from "@/components/ConfessionForm";
import ConfessionCard from "@/components/ConfessionCard";
import { toast } from "sonner";
import { useSessionContext } from "@/components/SessionProvider";
import ConfessionCardSkeleton from "@/components/ConfessionCardSkeleton";

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

const CONFESSIONS_PER_PAGE = 10;

const Index: React.FC = () => {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loadingConfessions, setLoadingConfessions] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedConfessionId, setExpandedConfessionId] = useState<string | null>(null);
  const { loading: authLoading } = useSessionContext();

  const observer = useRef<IntersectionObserver>();

  const fetchConfessions = useCallback(async (currentPage: number, initialLoad: boolean) => {
    if (initialLoad) {
      setLoadingConfessions(true);
    } else {
      setLoadingMore(true);
    }

    const from = currentPage * CONFESSIONS_PER_PAGE;
    const to = from + CONFESSIONS_PER_PAGE - 1;

    try {
      const { data: confessionsData, error: confessionsError } = await supabase
        .from("confessions")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (confessionsError) {
        toast.error("Error fetching confessions: " + confessionsError.message);
        setHasMore(false);
        return;
      }

      if (confessionsData.length < CONFESSIONS_PER_PAGE) {
        setHasMore(false);
      }

      const confessionsWithComments: Confession[] = [];
      for (const confession of confessionsData) {
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select("*")
          .eq("confession_id", confession.id)
          .order("created_at", { ascending: false });

        confessionsWithComments.push({
          ...confession,
          comments: commentsError ? [] : commentsData || [],
        });
      }

      setConfessions((prev) =>
        initialLoad ? confessionsWithComments : [...prev, ...confessionsWithComments]
      );
    } catch (e) {
      console.error("Unexpected error fetching confessions:", e);
      toast.error("An unexpected error occurred while loading confessions.");
    } finally {
      if (initialLoad) {
        setLoadingConfessions(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, []);

  // Effect for initial load
  useEffect(() => {
    if (!authLoading) {
      fetchConfessions(0, true);
    }
  }, [authLoading, fetchConfessions]);

  // Effect for subsequent page loads (infinite scroll)
  useEffect(() => {
    if (page > 0) {
      fetchConfessions(page, false);
    }
  }, [page, fetchConfessions]);

  const lastConfessionElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loadingMore || loadingConfessions) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadingMore, loadingConfessions, hasMore]
  );

  useEffect(() => {
    const confessionsSubscription = supabase
      .channel('public:confessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' }, (payload) => {
        const newConfession = payload.new as Confession;
        setConfessions((prev) => [{ ...newConfession, comments: [] }, ...prev]);
        setExpandedConfessionId(newConfession.id);
      })
      .subscribe();
    // Note: Real-time updates for comments and likes are handled within the card to avoid re-fetching the whole list.
    return () => {
      supabase.removeChannel(confessionsSubscription);
    };
  }, []);

  const handleAddConfession = async (title: string, content: string, gender: "male" | "female") => {
    // This function remains largely the same, as the subscription will handle the UI update.
    const { error } = await supabase
      .from("confessions")
      .insert({ title, content, gender });
    if (error) toast.error("Error posting confession: " + error.message);
    else toast.success("Confession posted successfully!");
  };

  const handleAddComment = async (confessionId: string, content: string, gender: "male" | "female") => {
    const { data, error } = await supabase
      .from("comments")
      .insert({ confession_id: confessionId, content, gender })
      .select()
      .single();

    if (error) {
      toast.error("Error posting comment: " + error.message);
    } else {
      setConfessions((prev) =>
        prev.map((conf) =>
          conf.id === confessionId
            ? { ...conf, comments: [data, ...conf.comments] }
            : conf
        )
      );
      setExpandedConfessionId(confessionId);
      toast.success("Comment posted!");
    }
  };

  const handleLikeConfession = async (confessionId: string) => {
    setConfessions((prev) =>
      prev.map((conf) =>
        conf.id === confessionId ? { ...conf, likes: conf.likes + 1 } : conf
      )
    );
    const { error } = await supabase.rpc("increment_confession_likes", { confession_id: confessionId });
    if (error) {
      toast.error("Error liking confession: " + error.message);
      setConfessions((prev) =>
        prev.map((conf) =>
          conf.id === confessionId ? { ...conf, likes: conf.likes - 1 } : conf
        )
      );
    }
  };

  const handleConfessionToggle = useCallback((toggledConfessionId: string) => {
    setExpandedConfessionId(currentId =>
      currentId === toggledConfessionId ? null : toggledConfessionId
    );
  }, []);

  const handleFormFocus = () => {
    setExpandedConfessionId(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-8 opacity-0 animate-fade-zoom-in">Anonymous Confessions</h1>
      <div className="opacity-0 animate-fade-zoom-in" style={{ animationDelay: '200ms' }}>
        <ConfessionForm onSubmit={handleAddConfession} onFormFocus={handleFormFocus} />
      </div>

      {loadingConfessions && confessions.length === 0 ? (
        <div className="space-y-6 mt-8">
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
        </div>
      ) : (
        <div className="space-y-6">
          {confessions.map((confession, index) => (
            <ConfessionCard
              ref={confessions.length === index + 1 ? lastConfessionElementRef : null}
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
              isContentOpen={expandedConfessionId === confession.id}
              onToggleExpand={handleConfessionToggle}
              animationDelay={200 + (index * 150)}
            />
          ))}
        </div>
      )}
      {loadingMore && <ConfessionCardSkeleton />}
      {!hasMore && confessions.length > 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">You've reached the end of the confessions.</p>
      )}
    </div>
  );
};

export default Index;