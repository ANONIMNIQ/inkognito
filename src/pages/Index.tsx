import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import ConfessionForm from "@/components/ConfessionForm";
import ConfessionCard from "@/components/ConfessionCard";
import { toast } from "sonner";
import { useSessionContext } from "@/components/SessionProvider";
import ConfessionCardSkeleton from "@/components/ConfessionCardSkeleton";
import ComposeButton from "@/components/ComposeButton";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import CategoryFilter from "@/components/CategoryFilter";
import { cn } from "@/lib/utils";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";

interface Comment {
  id: string;
  confession_id: string;
  content: string;
  gender: "male" | "female" | "incognito" | "ai";
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
  slug: string;
}

const CONFESSIONS_PER_PAGE = 10;

const Index: React.FC = () => {
  const { id: paramId, slug: paramSlug } = useParams<{ id: string; slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const { loading: authLoading } = useSessionContext();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true); // Initial loading state for the first fetch
  const [loadingMore, setLoadingMore] = useState(false); // Loading state for subsequent infinite scroll fetches
  const [page, setPage] = useState(0); // Current page for infinite scroll
  const [hasMore, setHasMore] = useState(true); // Whether there are more confessions to load
  const [expandedConfessionId, setExpandedConfessionId] = useState<string | null>(null);
  const [isComposeButtonVisible, setIsComposeButtonVisible] = useState(false);
  const [forceExpandForm, setForceExpandForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Всички"); // State for category filter
  const [visibleConfessionCount, setVisibleConfessionCount] = useState(0);
  const [isFormAnimationComplete, setIsFormAnimationComplete] = useState(false);

  const confessionFormContainerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver>();
  const { lockScroll, unlockScroll } = useScrollLock();
  const previousViewIdentifier = useRef<string | null>(null); // Ref to track the current view for fetching

  // Real-time comments subscription
  useEffect(() => {
    const commentsChannel = supabase
      .channel('public-comments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          const newComment = payload.new as Comment;
          setConfessions((currentConfessions) => {
            return currentConfessions.map((confession) => {
              if (confession.id === newComment.confession_id) {
                // Avoid adding duplicate comments if the event fires multiple times
                if (confession.comments.some(c => c.id === newComment.id)) {
                  return confession;
                }
                return {
                  ...confession,
                  comment_count: confession.comment_count + 1,
                  comments: [newComment, ...confession.comments],
                };
              }
              return confession;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, []);

  // useCallback for fetching confessions
  const fetchConfessions = useCallback(async (
    { initialLoad = false, currentPage = 0, targetId, targetSlug, category }:
    { initialLoad?: boolean; currentPage?: number; targetId?: string; targetSlug?: string; category: string }
  ) => {
    console.log(`[fetchConfessions] Called: initialLoad=${initialLoad}, category=${category}, currentPage=${currentPage}, targetId=${targetId}`);
    if (initialLoad) setLoading(true);
    else setLoadingMore(true);

    let allConfessions: Confession[] = []; // Declared here
    let newHasMore = true; // Declared here

    try {
      if (targetId) { // Detail View Logic
        console.log(`[fetchConfessions] Fetching single confession for ID: ${targetId}`);
        const { data: target, error: targetError } = await supabase.from("confessions").select("*, comments!fk_confession_id(count)").eq("id", targetId).single();
        if (targetError || !target) throw new Error("Confession not found.");
        if (target.slug !== targetSlug) {
          console.log(`[fetchConfessions] Redirecting due to slug mismatch: ${targetSlug} vs ${target.slug}`);
          navigate(`/confessions/${target.id}/${target.slug}`, { replace: true });
          return; // Exit early after navigation
        }

        const { data: commentsData } = await supabase
          .from("comments")
          .select("*")
          .eq("confession_id", targetId)
          .order("created_at", { ascending: false });
        console.log(`[fetchConfessions] Fetched ${commentsData?.length || 0} comments for target confession.`);

        const { data: before } = await supabase.from("confessions").select("*, comments!fk_confession_id(count)").lt("created_at", target.created_at).order("created_at", { ascending: false }).limit(CONFESSIONS_PER_PAGE);
        const { data: after } = await supabase.from("confessions").select("*, comments!fk_confession_id(count)").gt("created_at", target.created_at).order("created_at", { ascending: true }).limit(CONFESSIONS_PER_PAGE);
        
        const format = (c: any, comments: any[] = []) => ({ ...c, comment_count: c.comments[0]?.count || 0, comments });
        
        const targetWithComments = format(target, commentsData || []);
        
        allConfessions = [
          ...(after || []).reverse().map(c => format(c)), 
          targetWithComments, 
          ...(before || []).map(c => format(c))
        ];
        newHasMore = (before || []).length === CONFESSIONS_PER_PAGE;
        console.log(`[fetchConfessions] Detail view loaded ${allConfessions.length} confessions. Has more: ${newHasMore}`);

      } else { // Index View Logic
        const from = currentPage * CONFESSIONS_PER_PAGE;
        const to = from + CONFESSIONS_PER_PAGE - 1;
        console.log(`[fetchConfessions] Fetching range: from=${from}, to=${to} for category: ${category}`);
        let query = supabase.from("confessions").select("*, comments!fk_confession_id(count)").order("created_at", { ascending: false });
        if (category !== "Всички") query = query.eq("category", category);
        const { data, error } = await query.range(from, to);
        if (error) throw error;

        allConfessions = data.map((c: any) => ({ ...c, comment_count: c.comments[0]?.count || 0, comments: [] }));
        newHasMore = data.length === CONFESSIONS_PER_PAGE;
        console.log(`[fetchConfessions] Fetched ${data.length} confessions. Has more: ${newHasMore}`);
      }

      setHasMore(newHasMore);
      setConfessions(prev => initialLoad ? allConfessions : [...prev, ...allConfessions]);

    } catch (error: any) {
      toast.error("Error fetching confessions: " + error.message);
      console.error("[fetchConfessions] Error:", error);
      setHasMore(false);
      allConfessions = []; // Ensure it's an empty array on error
    } finally {
      if (initialLoad) setLoading(false);
      else setLoadingMore(false);
      console.log(`[fetchConfessions] Finished. Current confessions count: ${allConfessions.length}`);
    }
  }, [navigate]); // Only navigate is a dependency

  // Main effect to handle URL changes (paramId, category) and initial load
  useEffect(() => {
    if (authLoading) return;

    const categoryFromUrl = searchParams.get('category') || "Всички";
    const isDetailView = !!paramId;

    // Create a unique identifier for the current view state
    const currentViewIdentifier = isDetailView ? `detail-${paramId}-${paramSlug}` : `index-${categoryFromUrl}`;

    // Only trigger a full re-fetch if the view identifier has changed
    if (currentViewIdentifier !== previousViewIdentifier.current) {
      console.log(`[useEffect: Main Fetch Trigger] View changed from ${previousViewIdentifier.current} to ${currentViewIdentifier}. Triggering new fetch.`);
      previousViewIdentifier.current = currentViewIdentifier; // Update the ref

      setLoading(true); // Indicate a new full load is starting
      setConfessions([]); // Clear existing confessions for a fresh start
      setPage(0); // Reset page to 0 for new fetch
      setHasMore(true);
      setSelectedCategory(categoryFromUrl); // Update selectedCategory state to reflect URL
      setVisibleConfessionCount(0); // Reset animation chain

      if (isDetailView) {
        fetchConfessions({ initialLoad: true, targetId: paramId, targetSlug: paramSlug, category: categoryFromUrl });
      } else {
        fetchConfessions({ initialLoad: true, category: categoryFromUrl, currentPage: 0 });
      }
    }
    
    setExpandedConfessionId(paramId || null);

    if (searchParams.get('compose') === 'true') {
      console.log("[useEffect: URL Change] 'compose=true' detected, forcing form expand.");
      setForceExpandForm(true);
      setTimeout(() => {
        confessionFormContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('compose');
        setSearchParams(newSearchParams, { replace: true });
      }, 100);
    }
  }, [authLoading, paramId, paramSlug, searchParams, fetchConfessions, navigate, setSearchParams]); // Dependencies are now only external inputs and stable functions

  // Effect for infinite scroll on index view
  const lastConfessionElementRef = useCallback(node => {
    if (loadingMore || paramId || loading) return; // Prevent if initial loading or more data is already happening, or if in detail view
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        console.log(`[IntersectionObserver] Triggered: Loading more confessions. Current page: ${page}`);
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, paramId, loading, page]);

  // Effect to trigger subsequent page fetches
  useEffect(() => {
    // Only fetch if page > 0 (not initial load), not in detail view, and not already loading
    if (page > 0 && !paramId && !loading && !loadingMore) {
      console.log(`[useEffect: Page Change] Page changed to ${page}. Initiating fetch for more confessions.`);
      fetchConfessions({ initialLoad: false, category: selectedCategory, currentPage: page });
    }
  }, [page, paramId, selectedCategory, loading, loadingMore, fetchConfessions]);

  // Scroll to expanded confession and potentially comments
  useEffect(() => {
    if (!loading && expandedConfessionId) {
      const el = document.getElementById(expandedConfessionId);
      if (el) {
        console.log(`[useEffect: Scroll] Scrolling to expanded confession: ${expandedConfessionId}`);
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }
  }, [loading, expandedConfessionId, location.hash]);

  // Effect to manage the animation chain
  useEffect(() => {
    if (!loading && isFormAnimationComplete) {
      if (paramId) {
        console.log("[useEffect: Animation] Direct link, showing all loaded confessions immediately without animation chain.");
        setVisibleConfessionCount(confessions.length);
      } else if (confessions.length > 0 && visibleConfessionCount === 0) {
        console.log("[useEffect: Animation] Starting animation chain for first confession.");
        setVisibleConfessionCount(1);
      }
    }
  }, [loading, isFormAnimationComplete, paramId, confessions.length, visibleConfessionCount]);

  const handleAnimationComplete = useCallback(() => {
    setVisibleConfessionCount(prev => {
      if (prev < confessions.length) {
        console.log(`[handleAnimationComplete] Incrementing visible confessions: ${prev + 1}`);
        return prev + 1;
      }
      console.log("[handleAnimationComplete] All confessions visible.");
      return prev;
    });
  }, [confessions.length]);

  const handleAddConfession = async (title: string, content: string, gender: "male" | "female" | "incognito", category: string, slug: string, email?: string) => {
    console.log("[handleAddConfession] Attempting to add new confession.");
    const { data, error } = await supabase.from("confessions").insert({ title, content, gender, category, slug, author_email: email }).select('id, slug');
    if (error) {
      toast.error("Error posting confession: " + error.message);
      console.error("[handleAddConfession] Error posting confession:", error);
    } else {
      const newConfession = data?.[0];
      if (newConfession) {
        toast.success("Confession posted!");
        console.log(`[handleAddConfession] Confession posted, ID: ${newConfession.id}. Invoking AI comment function.`);
        
        supabase.functions.invoke('generate-ai-comment', {
          body: {
            confessionId: newConfession.id,
            confessionContent: content
          }
        }).then(({ error: invokeError }) => {
          if (invokeError) {
            console.error("[handleAddConfession] Error invoking AI comment function:", invokeError.message);
          }
        });

        navigate(`/confessions/${newConfession.id}/${newConfession.slug}`);
      } else {
        toast.error("Error: No confession data returned after posting.");
        console.error("[handleAddConfession] No confession data returned.");
      }
    }
  };

  const handleAddComment = async (confessionId: string, content: string, gender: "male" | "female" | "incognito") => {
    console.log(`[handleAddComment] Attempting to add new comment for confession ID: ${confessionId}`);
    const { error } = await supabase.from("comments").insert({ confession_id: confessionId, content, gender });
    if (error) {
      toast.error("Error posting comment: " + error.message);
      console.error("[handleAddComment] Error posting comment:", error);
    } else {
      toast.success("Comment posted!");
      console.log(`[handleAddComment] Comment posted for confession ID: ${confessionId}. Invoking notification function.`);
      supabase.functions.invoke('send-comment-notification', { body: { confession_id: confessionId, comment_content: content } });
    }
  };

  const handleFetchComments = async (confessionId: string) => {
    console.log(`[handleFetchComments] Fetching comments for confession ID: ${confessionId}`);
    const { data, error } = await supabase.from("comments").select("*").eq("confession_id", confessionId).order("created_at", { ascending: false });
    if (error) {
      toast.error("Error fetching comments: " + error.message);
      console.error("[handleFetchComments] Error fetching comments:", error);
    } else {
      console.log(`[handleFetchComments] Fetched ${data?.length || 0} comments for confession ID: ${confessionId}`);
      setConfessions(prev => prev.map(c => c.id === confessionId ? { ...c, comments: data || [] } : c));
    }
  };

  const handleLikeConfession = async (confessionId: string) => {
    console.log(`[handleLikeConfession] Liking confession ID: ${confessionId}`);
    setConfessions(prev => prev.map(c => c.id === confessionId ? { ...c, likes: c.likes + 1 } : c));
    const { error } = await supabase.rpc("increment_confession_likes", { confession_id_param: confessionId });
    if (error) {
      toast.error("Error liking confession: " + error.message);
      console.error("[handleLikeConfession] Error liking confession:", error);
      setConfessions(prev => prev.map(c => c.id === confessionId ? { ...c, likes: c.likes - 1 } : c));
    }
  };

  const handleConfessionToggle = (confessionId: string, slug: string) => {
    console.log(`[handleConfessionToggle] Toggling confession ID: ${confessionId}`);
    if (expandedConfessionId === confessionId) {
      navigate('/');
    } else {
      navigate(`/confessions/${confessionId}/${slug}`);
    }
  };

  const handleSelectCategory = (category: string) => {
    console.log(`[handleSelectCategory] Selected category: ${category}`);
    if (category === "Всички") {
      navigate('/');
    } else {
      navigate(`/?category=${category}`);
    }
  };
  
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
    console.log("[handleComposeClick] Compose button clicked.");
    confessionFormContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setForceExpandForm(true);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex justify-center mb-8 opacity-0 animate-fade-zoom-in">
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" preserveAspectRatio="none" x="0px" y="0px" viewBox="0 0 481 134"
          className={cn("w-64 sm:w-72 md:w-80 lg:w-96 h-auto fill-gray-900 dark:fill-white transition-colors duration-300")}>
          <defs><g id="Layer0_0_FILL"><path fill="#000000" stroke="none" d=" M 17.4 29.4 L 17.4 1.85 0 1.85 0 51.1 17.3 51.1 38 23.65 38 51.1 55.4 51.1 55.4 1.85 38 1.85 17.4 29.4 M 119 60.85 Q 111.65 57.95 102.9 57.95 94.1 57.95 86.7 60.85 79.35 63.8 74.1 69 68.8 74.2 65.85 81.1 62.85 88.1 62.85 96.15 62.85 104.25 65.85 111.15 68.8 118.15 74.1 123.3 79.35 128.5 86.7 131.45 94.1 134.35 102.9 134.35 111.65 134.35 119 131.45 126.45 128.5 131.75 123.3 137.05 118.15 140.05 111.15 143 104.25 143 96.15 143 88.1 140.05 81.1 137.05 74.2 131.75 69 126.45 63.8 119 60.85 M 84.2 88.2 Q 85.85 84.55 88.6 81.85 91.35 79.15 95.05 77.7 98.75 76.2 102.9 76.2 107 76.2 110.7 77.7 114.45 79.15 117.25 81.85 120.1 84.55 121.75 88.2 123.35 91.85 123.35 96.15 123.35 100.5 121.75 104.15 120.1 107.8 117.25 110.45 114.45 113.15 110.7 114.65 107 116.15 102.9 116.15 98.75 116.15 95.05 114.65 91.35 113.15 88.6 110.45 85.85 107.8 84.2 104.15 82.55 100.5 82.55 96.15 82.55 91.85 84.2 88.2 M 96.25 1.85 L 96.25 18.85 78.65 18.85 78.65 1.85 61.25 1.85 61.25 51.1 78.65 51.1 78.65 33.15 96.25 33.15 96.25 51.1 113.65 51.1 113.65 1.85 96.25 1.85 M 151.35 1.85 L 136.95 21.6 136.95 1.85 119.55 1.85 119.55 51.1 136.95 51.1 136.95 31.4 152.55 51.1 172.45 51.1 150.35 25.45 169.85 1.85 151.35 1.85 M 259.1 132.35 L 259.1 116.4 243.2 116.4 243.2 60 224.4 60 224.4 132.35 259.1 132.35 M 218.25 60 L 199.5 60 199.5 104.25 164.75 60 145.95 60 145.95 132.35 164.75 132.35 164.75 88.1 199.5 132.35 218.25 132.35 218.25 60 M 221.25 7.45 Q 217.25 3.95 211.9 2 206.45 0 200.1 0 193.7 0 188.25 2 182.8 4.05 178.9 7.55 174.95 11.05 172.75 15.8 170.55 20.6 170.55 26 170.55 32.1 172.75 37.05 174.95 41.95 178.85 45.5 182.7 49.1 188.1 51 193.45 52.95 199.85 52.95 206.25 52.95 211.8 51 217.25 49.1 221.2 45.55 225.15 42.1 227.4 37.25 229.7 32.4 229.7 26.55 229.7 20.7 227.45 15.8 225.25 11 221.25 7.45 M 208.05 18.4 Q 209.5 19.9 210.4 21.95 211.3 24.05 211.3 26.35 211.3 28.75 210.4 30.8 209.5 32.85 208.05 34.4 206.55 35.9 204.45 36.8 202.4 37.65 200.1 37.65 197.8 37.65 195.75 36.8 193.7 35.9 192.2 34.4 190.7 32.85 189.8 30.8 188.85 28.75 188.85 26.25 188.85 23.9 189.8 21.9 190.7 19.9 192.2 18.4 193.7 16.85 195.75 15.95 197.8 15.1 200.1 15.1 202.4 15.1 204.45 15.95 206.55 16.85 208.05 18.4 M 285.25 60 L 266.45 60 266.45 132.35 285.25 132.35 285.25 60 M 264.45 16.35 L 264.45 1.85 233.65 1.85 233.65 51.1 250.95 51.1 250.95 16.35 264.45 16.35 M 301.3 1.85 L 301.3 18.85 283.7 18.85 283.7 1.85 266.3 1.85 266.3 51.1 283.7 51.1 283.7 33.15 301.3 33.15 301.3 51.1 318.7 51.1 318.7 1.85 301.3 1.85 M 363.7 60 L 344.95 60 344.95 104.25 310.2 60 291.4 60 291.4 132.35 310.2 132.35 310.2 88.1 344.95 132.35 363.7 132.35 363.7 60 M 342 29.4 L 342 1.85 324.6 1.85 324.6 51.1 341.9 51.1 362.6 23.65 362.6 51.1 380 51.1 380 1.85 362.6 1.85 342 29.4 M 411 75.9 L 411 60 369.85 60 369.85 132.35 411 132.35 411 116.4 388.65 116.4 388.65 103.95 409.8 103.95 409.8 88 388.65 88 388.65 75.9 411 75.9 M 410.7 16.35 L 422.25 16.35 422.25 1.85 381.8 1.85 381.8 16.35 393.35 16.35 393.35 51.1 410.7 51.1 410.7 16.35 M 479 15.8 Q 476.8 11 472.8 7.45 468.8 3.95 463.45 2 458 0 451.65 0 445.25 0 439.8 2 434.35 4.05 430.45 7.55 426.5 11.05 424.3 15.8 422.1 20.6 422.1 26 422.1 32.1 424.3 37.05 426.5 41.95 430.4 45.5 434.25 49.1 439.65 51 445 52.95 451.4 52.95 457.8 52.95 463.35 51 468.8 49.1 472.75 45.55 476.7 42.1 478.95 37.25 481.25 32.4 481.25 26.55 481.25 20.7 479 15.8 M 456 15.95 Q 458.1 16.85 459.6 18.4 461.05 19.9 461.95 21.95 462.85 24.05 462.85 26.35 462.85 28.75 461.95 30.8 461.05 32.85 459.6 34.4 458.1 35.9 456 36.8 453.95 37.65 451.65 37.65 449.35 37.65 447.3 36.8 445.25 35.9 443.75 34.4 442.25 32.85 441.35 30.8 440.4 28.75 440.4 26.25 440.4 23.9 441.35 21.9 442.25 19.9 443.75 18.4 445.25 16.85 447.3 15.95 449.35 15.1 451.65 15.1 453.95 15.1 456 15.95 Z"/></g></defs><g transform="matrix( 1, 0, 0, 1, 0,0) "><use href="#Layer0_0_FILL"/></g></svg>
      </div>
      <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={handleSelectCategory} />
      <div ref={confessionFormContainerRef}>
        <ConfessionForm
          onSubmit={handleAddConfession}
          onFormFocus={() => setExpandedConfessionId(null)}
          forceExpand={forceExpandForm}
          onFormExpanded={() => setForceExpandForm(false)}
          onAnimationComplete={() => {
            if (!isFormAnimationComplete) {
              setIsFormAnimationComplete(true);
            }
          }}
        />
      </div>

      {loading ? (
        <div className="space-y-6 mt-8">
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
        </div>
      ) : (
        <div className="space-y-6">
          {confessions.slice(0, visibleConfessionCount).map((conf) => (
            <ConfessionCard
              key={conf.id}
              confession={{ ...conf, timestamp: new Date(conf.created_at), comments: conf.comments.map(c => ({ ...c, timestamp: new Date(c.created_at) })) }}
              onAddComment={handleAddComment}
              onLikeConfession={handleLikeConfession}
              onFetchComments={handleFetchComments}
              isContentOpen={conf.id === expandedConfessionId}
              isDirectLinkTarget={conf.id === paramId}
              onToggleExpand={handleConfessionToggle}
              onSelectCategory={handleSelectCategory}
              shouldOpenCommentsOnLoad={conf.id === expandedConfessionId && location.hash === '#comments'}
              onAnimationComplete={handleAnimationComplete}
            />
          ))}
        </div>
      )}
      {loadingMore && <div className="space-y-6 mt-8"><ConfessionCardSkeleton /><ConfessionCardSkeleton /></div>}
      
      {/* Invisible trigger for infinite scroll */}
      {!loading && hasMore && !paramId && <div ref={lastConfessionElementRef} style={{ height: "1px" }} />}

      {!hasMore && confessions.length > 0 && !paramId && <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Това са всички изповеди.</p>}
      <ComposeButton isVisible={isComposeButtonVisible} onClick={handleComposeClick} />
    </div>
  );
};

export default Index;