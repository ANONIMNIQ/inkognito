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
    lockScroll(); // Lock scroll
    // Unlock after the form's collapsible animation (200ms) and scroll (e.g., 300ms)
    setTimeout(() => {
      unlockScroll();
    }, 500); // Total duration for scroll + animation
  };

  const fetchConfessions = useCallback(async (currentPage: number, initialLoad: boolean, categoryFilter: string) => {
    console.log(`[fetchConfessions] START: page=${currentPage}, initialLoad=${initialLoad}, category=${categoryFilter}`);
    if (initialLoad) {
      setLoadingConfessions(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const from = currentPage * CONFESSIONS_PER_PAGE;
      const to = from + CONFESSIONS_PER_PAGE - 1;

      let query = supabase
        .from("confessions")
        .select("id, title, content, gender, likes, created_at, category, comments(count)")
        .order("created_at", { ascending: false });

      if (categoryFilter !== "Всички") {
        query = query.eq("category", categoryFilter);
      }

      const { data: confessionsData, error: confessionsError } = await query.range(from, to);

      if (confessionsError) {
        throw confessionsError;
      }

      const confessionsWithCommentCount = confessionsData.map((c: any) => ({
        ...c,
        comment_count: c.comments[0]?.count || 0,
        comments: [],
      }));

      const newHasMore = confessionsData.length === CONFESSIONS_PER_PAGE;
      setHasMore(newHasMore);
      console.log(`[fetchConfessions] Fetched ${confessionsData.length} items. New hasMore: ${newHasMore}`);

      if (initialLoad) {
        setConfessions(confessionsWithCommentCount);
      } else {
        setConfessions((prev) => [...prev, ...confessionsWithCommentCount]);
      }
    } catch (error: any) {
      console.error("[fetchConfessions] Error fetching confessions:", error);
      toast.error("Error fetching confessions: " + error.message);
      setHasMore(false);
    } finally {
      if (initialLoad) {
        setLoadingConfessions(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      console.log(`[useEffect] Category changed to ${selectedCategory}. Resetting state.`);
      // Explicitly disconnect the observer before resetting state to prevent race conditions.
      if (observer.current) {
        observer.current.disconnect();
      }
      setPage(0);
      setConfessions([]);
      setHasMore(true);
      setExpandedConfessionId(null);
      fetchConfessions(0, true, selectedCategory);
    }
  }, [authLoading, selectedCategory, fetchConfessions]);

  useEffect(() => {
    if (page > 0) {
      console.log(`[useEffect] Page changed to ${page}. Fetching next batch.`);
      fetchConfessions(page, false, selectedCategory);
    }
  }, [page, selectedCategory, fetchConfessions]);

  const lastConfessionElementRef = useCallback(
    (node: HTMLDivElement) => {
      console.log(
        `[lastConfessionElementRef] State check: loadingMore=${loadingMore}, loadingConfessions=${loadingConfessions}, hasMore=${hasMore}, confessions.length=${confessions.length}`
      );

      if (loadingMore || loadingConfessions) {
        console.log("[lastConfessionElementRef] Aborting: currently loading.");
        return;
      }

      if (observer.current) {
        observer.current.disconnect();
        console.log("[lastConfessionElementRef] Disconnected previous observer.");
      }

      if (node && hasMore) {
        console.log("[lastConfessionElementRef] Attaching new observer to node:", node);
        observer.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            console.log("[Observer Callback] Intersection detected. Triggering page load.");
            setPage((prevPage) => prevPage + 1);
          }
        });
        observer.current.observe(node);
      } else {
        console.log(`[lastConfessionElementRef] Not attaching observer. Node: ${!!node}, hasMore: ${hasMore}`);
      }
    },
    [loadingMore, loadingConfessions, hasMore, confessions.length] // Simplified dependencies
  );

  useEffect(() => {
    const confessionsSubscription = supabase
      .channel('public:confessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' }, (payload) => {
        const newConfession = payload.new as Omit<Confession, 'comments' | 'comment_count'>;
        if (selectedCategory === "Всички" || newConfession.category === selectedCategory) {
          setConfessions((prev) => {
            if (prev.some(c => c.id === newConfession.id)) return prev;
            return [{ ...newConfession, comments: [], comment_count: 0 }, ...prev];
          });
          setExpandedConfessionId(newConfession.id);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(confessionsSubscription);
    };
  }, [selectedCategory]);

  const handleAddConfession = async (title: string, content: string, gender: "male" | "female" | "incognito", category: string, email?: string) => {
    lockScroll();
    
    const confessionData: {
      title: string;
      content: string;
      gender: "male" | "female" | "incognito";
      category: string;
      author_email?: string;
    } = { title, content, gender, category };

    if (email) {
      confessionData.author_email = email;
    }

    const { data: newConfessionData, error: insertError } = await supabase
      .from("confessions")
      .insert(confessionData)
      .select()
      .single();

    if (insertError) {
      toast.error("Error posting confession: " + insertError.message);
      unlockScroll();
      return;
    }

    toast.success("Confession posted successfully!");

    const newConfessionForState = { ...newConfessionData, comments: [], comment_count: 0 };
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
    } finally {
      setTimeout(() => unlockScroll(), 700);
    }
  };

  const handleFetchComments = async (confessionId: string) => {
    const confessionToUpdate = confessions.find(c => c.id === confessionId);
    if (!confessionToUpdate || confessionToUpdate.comments.length > 0) return;

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
    lockScroll();
    const { data, error } = await supabase
      .from("comments")
      .insert({ confession_id: confessionId, content, gender })
      .select()
      .single();

    if (error) {
      toast.error("Error posting comment: " + error.message);
      unlockScroll();
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
      setTimeout(() => unlockScroll(), 600);
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
      <h1 className="text-3xl font-bold text-center mb-8 opacity-0 animate-fade-zoom-in">Анонимни изповеди</h1>
      <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
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
              onSelectCategory={setSelectedCategory}
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