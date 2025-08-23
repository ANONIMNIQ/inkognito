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
import { cn } from "@/lib/utils"; // Import cn for utility classes

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
  category: string;
  slug: string; // Added slug
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
        .select("id, title, content, gender, likes, created_at, category, slug, comments(count)") // Added slug
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

  const handleAddConfession = async (title: string, content: string, gender: "male" | "female" | "incognito", category: string, slug: string, email?: string) => {
    lockScroll();
    
    const confessionData: {
      title: string;
      content: string;
      gender: "male" | "female" | "incognito";
      category: string;
      slug: string; // Added slug
      author_email?: string;
    } = { title, content, gender, category, slug };

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

      // Trigger the notification function without waiting for it
      supabase.functions.invoke('send-comment-notification', {
        body: { confession_id: confessionId, comment_content: content },
      }).catch(err => console.error("Error invoking notification function:", err));

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
      <div className="flex justify-center mb-8 opacity-0 animate-fade-zoom-in">
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" preserveAspectRatio="none" x="0px" y="0px" viewBox="0 0 481 134"
          className={cn(
            "w-64 sm:w-72 md:w-80 lg:w-96 h-auto fill-gray-900 dark:fill-white transition-colors duration-300"
          )}
        >
          <defs>
            <g id="Layer0_0_FILL">
              <path fill="#000000" stroke="none" d="
M 17.4 29.4
L 17.4 1.85 0 1.85 0 51.1 17.3 51.1 38 23.65 38 51.1 55.4 51.1 55.4 1.85 38 1.85 17.4 29.4
M 119 60.85
Q 111.65 57.95 102.9 57.95 94.1 57.95 86.7 60.85 79.35 63.8 74.1 69 68.8 74.2 65.85 81.1 62.85 88.1 62.85 96.15 62.85 104.25 65.85 111.15 68.8 118.15 74.1 123.3 79.35 128.5 86.7 131.45 94.1 134.35 102.9 134.35 111.65 134.35 119 131.45 126.45 128.5 131.75 123.3 137.05 118.15 140.05 111.15 143 104.25 143 96.15 143 88.1 140.05 81.1 137.05 74.2 131.75 69 126.45 63.8 119 60.85
M 84.2 88.2
Q 85.85 84.55 88.6 81.85 91.35 79.15 95.05 77.7 98.75 76.2 102.9 76.2 107 76.2 110.7 77.7 114.45 79.15 117.25 81.85 120.1 84.55 121.75 88.2 123.35 91.85 123.35 96.15 123.35 100.5 121.75 104.15 120.1 107.8 117.25 110.45 114.45 113.15 110.7 114.65 107 116.15 102.9 116.15 98.75 116.15 95.05 114.65 91.35 113.15 88.6 110.45 85.85 107.8 84.2 104.15 82.55 100.5 82.55 96.15 82.55 91.85 84.2 88.2
M 96.25 1.85
L 96.25 18.85 78.65 18.85 78.65 1.85 61.25 1.85 61.25 51.1 78.65 51.1 78.65 33.15 96.25 33.15 96.25 51.1 113.65 51.1 113.65 1.85 96.25 1.85
M 151.35 1.85
L 136.95 21.6 136.95 1.85 119.55 1.85 119.55 51.1 136.95 51.1 136.95 31.4 152.55 51.1 172.45 51.1 150.35 25.45 169.85 1.85 151.35 1.85
M 259.1 132.35
L 259.1 116.4 243.2 116.4 243.2 60 224.4 60 224.4 132.35 259.1 132.35
M 218.25 60
L 199.5 60 199.5 104.25 164.75 60 145.95 60 145.95 132.35 164.75 132.35 164.75 88.1 199.5 132.35 218.25 132.35 218.25 60
M 221.25 7.45
Q 217.25 3.95 211.9 2 206.45 0 200.1 0 193.7 0 188.25 2 182.8 4.05 178.9 7.55 174.95 11.05 172.75 15.8 170.55 20.6 170.55 26 170.55 32.1 172.75 37.05 174.95 41.95 178.85 45.5 182.7 49.1 188.1 51 193.45 52.95 199.85 52.95 206.25 52.95 211.8 51 217.25 49.1 221.2 45.55 225.15 42.1 227.4 37.25 229.7 32.4 229.7 26.55 229.7 20.7 227.45 15.8 225.25 11 221.25 7.45
M 208.05 18.4
Q 209.5 19.9 210.4 21.95 211.3 24.05 211.3 26.35 211.3 28.75 210.4 30.8 209.5 32.85 208.05 34.4 206.55 35.9 204.45 36.8 202.4 37.65 200.1 37.65 197.8 37.65 195.75 36.8 193.7 35.9 192.2 34.4 190.7 32.85 189.8 30.8 188.85 28.75 188.85 26.25 188.85 23.9 189.8 21.9 190.7 19.9 192.2 18.4 193.7 16.85 195.75 15.95 197.8 15.1 200.1 15.1 202.4 15.1 204.45 15.95 206.55 16.85 208.05 18.4
M 285.25 60
L 266.45 60 266.45 132.35 285.25 132.35 285.25 60
M 264.45 16.35
L 264.45 1.85 233.65 1.85 233.65 51.1 250.95 51.1 250.95 16.35 264.45 16.35
M 301.3 1.85
L 301.3 18.85 283.7 18.85 283.7 1.85 266.3 1.85 266.3 51.1 283.7 51.1 283.7 33.15 301.3 33.15 301.3 51.1 318.7 51.1 318.7 1.85 301.3 1.85
M 363.7 60
L 344.95 60 344.95 104.25 310.2 60 291.4 60 291.4 132.35 310.2 132.35 310.2 88.1 344.95 132.35 363.7 132.35 363.7 60
M 342 29.4
L 342 1.85 324.6 1.85 324.6 51.1 341.9 51.1 362.6 23.65 362.6 51.1 380 51.1 380 1.85 362.6 1.85 342 29.4
M 411 75.9
L 411 60 369.85 60 369.85 132.35 411 132.35 411 116.4 388.65 116.4 388.65 103.95 409.8 103.95 409.8 88 388.65 88 388.65 75.9 411 75.9
M 410.7 16.35
L 422.25 16.35 422.25 1.85 381.8 1.85 381.8 16.35 393.35 16.35 393.35 51.1 410.7 51.1 410.7 16.35
M 479 15.8
Q 476.8 11 472.8 7.45 468.8 3.95 463.45 2 458 0 451.65 0 445.25 0 439.8 2 434.35 4.05 430.45 7.55 426.5 11.05 424.3 15.8 422.1 20.6 422.1 26 422.1 32.1 424.3 37.05 426.5 41.95 430.4 45.5 434.25 49.1 439.65 51 445 52.95 451.4 52.95 457.8 52.95 463.35 51 468.8 49.1 472.75 45.55 476.7 42.1 478.95 37.25 481.25 32.4 481.25 26.55 481.25 20.7 479 15.8
M 456 15.95
Q 458.1 16.85 459.6 18.4 461.05 19.9 461.95 21.95 462.85 24.05 462.85 26.35 462.85 28.75 461.95 30.8 461.05 32.85 459.6 34.4 458.1 35.9 456 36.8 453.95 37.65 451.65 37.65 449.35 37.65 447.3 36.8 445.25 35.9 443.75 34.4 442.25 32.85 441.35 30.8 440.4 28.75 440.4 26.25 440.4 23.9 441.35 21.9 442.25 19.9 443.75 18.4 445.25 16.85 447.3 15.95 449.35 15.1 451.65 15.1 453.95 15.1 456 15.95 Z"/>
            </g>
          </defs>
          <g transform="matrix( 1, 0, 0, 1, 0,0) ">
            <use href="#Layer0_0_FILL"/>
          </g>
        </svg>
      </div>
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