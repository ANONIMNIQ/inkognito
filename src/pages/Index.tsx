import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import ConfessionForm from "@/components/ConfessionForm";
import ConfessionCard from "@/components/ConfessionCard";
import { toast } from "sonner";
import { useSessionContext } from "@/components/SessionProvider";
import ConfessionCardSkeleton from "@/components/ConfessionCardSkeleton";
import ComposeButton from "@/components/ComposeButton";
import { useScrollLock } from "@/hooks/use-scroll-lock"; // Import useScrollLock
import CategoryFilter, { categories } from "@/components/CategoryFilter"; // Import CategoryFilter and categories

interface Comment {
  id: string;
  confession_id: string;
  content: string;
  gender: "male" | "female" | "incognito";
  created_at: string;
}

interface Confession {
  id: string;
  title: string;
  content: string;
  gender: "male" | "female" | "incognito";
  likes: number;
  created_at: string;
  comments: Comment[];
  comment_count: number;
  category: string; // Added category
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
  const [isComposeButtonVisible, setIsComposeButtonVisible] = useState(false);
  const [forceExpand, setForceExpand] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Всички"); // New state for selected category
  const confessionFormContainerRef = useRef<HTMLDivElement>(null);

  const observer = useRef<IntersectionObserver>();
  const { lockScroll, unlockScroll } = useScrollLock(); // Initialize scroll lock hook

  useEffect(() => {
    const handleScroll = () => {
      if (confessionFormContainerRef.current) {
        const { bottom } = confessionFormContainerRef.current.getBoundingClientRect();
        setIsComposeButtonVisible(bottom < 0);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleComposeClick = () => {
    confessionFormContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setForceExpand(true);
    lockScroll(500); // Lock scroll for form expansion and scroll
  };

  const fetchConfessions = useCallback(async (currentPage: number, initialLoad: boolean, categoryFilter: string) => {
    if (initialLoad) {
      setLoadingConfessions(true);
    } else {
      setLoadingMore(true);
    }

    const from = currentPage * CONFESSIONS_PER_PAGE;
    const to = from + CONFESSIONS_PER_PAGE - 1;

    try {
      let query = supabase
        .from("confessions")
        .select("*, comments(count)")
        .order("created_at", { ascending: false });

      if (categoryFilter !== "Всички") {
        query = query.eq("category", categoryFilter);
      }

      const { data: confessionsData, error: confessionsError } = await query.range(from, to);

      if (confessionsError) {
        toast.error("Error fetching confessions: " + confessionsError.message);
        setHasMore(false);
        return;
      }

      if (confessionsData.length < CONFESSIONS_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true); // Reset hasMore if we get a full page
      }

      const confessionsWithCommentCount = confessionsData.map((c: any) => ({
        ...c,
        comment_count: c.comments[0]?.count || 0,
        comments: [],
      }));

      setConfessions((prev) =>
        initialLoad ? confessionsWithCommentCount : [...prev, ...confessionsWithCommentCount]
      );
    } catch (e) {
      console.error("Unexpected error fetching confessions:", e);
      toast.error("An unexpected error occurred while loading confessions.");
    } finally {
      if (initialLoad) {
        setLoadingConfessions(false);
      } else {
        // Add a small delay to ensure skeletons are visible
        setTimeout(() => {
          setLoadingMore(false);
        }, 500); // 500ms delay
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      setPage(0); // Reset page when category changes
      setConfessions([]); // Clear confessions when category changes
      fetchConfessions(0, true, selectedCategory);
    }
  }, [authLoading, fetchConfessions, selectedCategory]); // Re-fetch when selectedCategory changes

  useEffect(() => {
    if (page > 0) {
      fetchConfessions(page, false, selectedCategory);
    }
  }, [page, fetchConfessions, selectedCategory]);

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
        const newConfession = payload.new as Omit<Confession, 'comments' | 'comment_count'>;
        // Only add new confession if it matches the current filter
        if (selectedCategory === "Всички" || newConfession.category === selectedCategory) {
          setConfessions((prev) => {
            if (prev.some(c => c.id === newConfession.id)) {
              return prev;
            }
            return [{ ...newConfession, comments: [], comment_count: 0 }, ...prev];
          });
          setExpandedConfessionId(newConfession.id);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(confessionsSubscription);
    };
  }, [selectedCategory]); // Re-subscribe when selectedCategory changes

  const handleAddConfession = async (title: string, content: string, gender: "male" | "female" | "incognito", category: string) => {
    lockScroll(1500); // Lock scroll for confession post, AI comment, and fade-in
    const { data: newConfessionData, error: insertError } = await supabase
      .from("confessions")
      .insert({ title, content, gender, category }) // Include category
      .select()
      .single();

    if (insertError) {
      toast.error("Error posting confession: " + insertError.message);
      unlockScroll(); // Unlock if there's an error
      return;
    }

    toast.success("Confession posted successfully!");

    const newConfessionForState = { ...newConfessionData, comments: [], comment_count: 0 };
    // Only add to state if it matches the current filter
    if (selectedCategory === "Всички" || newConfessionForState.category === selectedCategory) {
      setConfessions((prev) => [newConfessionForState, ...prev]);
      setExpandedConfessionId(newConfessionData.id);
    }


    try {
      toast.info("Generating an AI comment...");
      const { data: aiCommentData, error: functionError } = await supabase.functions.invoke('generate-ai-comment', {
        body: { confessionContent: content },
      });

      if (functionError) throw functionError;

      const { error: commentInsertError } = await supabase
        .from('comments')
        .insert({
          confession_id: newConfessionData.id,
          content: aiCommentData.content,
          gender: aiCommentData.gender,
        });

      if (commentInsertError) {
        toast.error("Failed to save AI comment: " + commentInsertError.message);
      } else {
        const newCommentForState = {
          ...aiCommentData,
          confession_id: newConfessionData.id,
          created_at: aiCommentData.timestamp,
        };
        setConfessions(prev => prev.map(conf =>
          conf.id === newConfessionData.id
            ? { ...conf, comments: [newCommentForState, ...conf.comments], comment_count: conf.comment_count + 1 }
            : conf
        ));
        toast.success("AI added a comment!");
      }
    } catch (error: any) {
      console.error("Error invoking AI comment function:", error);
      toast.error("Could not generate an AI comment: " + error.message);
    }
    // Unlock is handled by the lockScroll timeout
  };

  const handleFetchComments = async (confessionId: string) => {
    const confessionToUpdate = confessions.find(c => c.id === confessionId);
    if (!confessionToUpdate || confessionToUpdate.comments.length > 0) {
      return;
    }

    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("confession_id", confessionId)
        .order("created_at", { ascending: false });

      if (commentsError) {
        toast.error("Error fetching comments: " + commentsError.message);
        return;
      }

      setConfessions(prev =>
        prev.map(conf =>
          conf.id === confessionId
            ? { ...conf, comments: commentsData || [] }
            : conf
        )
      );
    } catch (e) {
      toast.error("An unexpected error occurred while fetching comments.");
    }
  };

  const handleAddComment = async (confessionId: string, content: string, gender: "male" | "female" | "incognito") => {
    lockScroll(500); // Lock scroll for comment post and fade-in
    const { data, error } = await supabase
      .from("comments")
      .insert({ confession_id: confessionId, content, gender })
      .select()
      .single();

    if (error) {
      toast.error("Error posting comment: " + error.message);
      unlockScroll(); // Unlock if there's an error
    } else {
      setConfessions((prev) =>
        prev.map((conf) =>
          conf.id === confessionId
            ? { ...conf, comments: [data, ...conf.comments], comment_count: conf.comment_count + 1 }
            : conf
        )
      );
      setExpandedConfessionId(confessionId);
      toast.success("Comment posted!");
    }
    // Unlock is handled by the lockScroll timeout
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
      <h1 className="text-3xl font-bold text-center mb-8 opacity-0 animate-fade-zoom-in">Анонимни изповеди</h1>
      <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} /> {/* Add CategoryFilter */}
      <div
        ref={confessionFormContainerRef}
        className="opacity-0 animate-fade-zoom-in"
        style={{ animationDelay: '200ms' }}
      >
        <ConfessionForm
          onSubmit={handleAddConfession}
          onFormFocus={handleFormFocus}
          forceExpand={forceExpand}
          onFormExpanded={() => setForceExpand(false)}
        />
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
              onFetchComments={handleFetchComments}
              isContentOpen={expandedConfessionId === confession.id}
              onToggleExpand={handleConfessionToggle}
              animationDelay={200 + ((index % CONFESSIONS_PER_PAGE) * 150)}
              onSelectCategory={setSelectedCategory} // Pass the setSelectedCategory function
            />
          ))}
        </div>
      )}
      {loadingMore && (
        <div className="space-y-6 mt-8">
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
        </div>
      )}
      {!hasMore && confessions.length > 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Това са всички изповеди.</p>
      )}
      <ComposeButton isVisible={isComposeButtonVisible} onClick={handleComposeClick} />
    </div>
  );
};

export default Index;