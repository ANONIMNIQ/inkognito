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
  const [searchParams] = useSearchParams();

  const { loading: authLoading } = useSessionContext();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true); // Initial page load
  const [loadingMore, setLoadingMore] = useState(false); // Infinite scroll loading
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedConfessionId, setExpandedConfessionId] = useState<string | null>(null); // Local UI state
  const [isComposeButtonVisible, setIsComposeButtonVisible] = useState(false);
  const [forceExpandForm, setForceExpandForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Всички"); // Local UI state, updated from URL
  const [visibleConfessionCount, setVisibleConfessionCount] = useState(0);
  const [isFormAnimationComplete, setIsFormAnimationComplete] = useState(false);

  const confessionFormContainerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver>();
  const { lockScroll, unlockScroll } = useScrollLock();

  const prevConfessionsLengthRef = useRef(0);
  const hasMoreRef = useRef(hasMore);
  const latestConfessionsRef = useRef<Confession[]>([]);
  const loadingMoreRef = useRef(loadingMore); // Ref for loadingMore
  const lastLoadedContextRef = useRef<{ category: string; paramId: string | undefined | null } | null>(null);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    latestConfessionsRef.current = confessions;
  }, [confessions]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore; // Keep loadingMoreRef updated
  }, [loadingMore]);

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

  // Function to fetch a page of confessions (for initial load or infinite scroll)
  const fetchConfessionsPage = useCallback(async (
    { category, oldestCreatedAtForInfiniteScroll }:
    { category: string; oldestCreatedAtForInfiniteScroll?: string }
  ) => {
    console.log(`[Fetch] Fetching confessions for category: ${category}, oldestCreatedAt: ${oldestCreatedAtForInfiniteScroll || 'none'}`);
    setLoadingMore(true); // Set loadingMore to true at the start of fetch
    try {
      let query = supabase.from("confessions").select("*").order("created_at", { ascending: false });
      if (category !== "Всички") query = query.eq("category", category);

      if (oldestCreatedAtForInfiniteScroll) {
        query = query.lt("created_at", oldestCreatedAtForInfiniteScroll);
      }
      // Always apply limit, range is handled by oldestCreatedAtForInfiniteScroll or initial load
      query = query.limit(CONFESSIONS_PER_PAGE);
      
      const { data, error } = await query;
      if (error) throw error;

      console.log(`[Fetch] Received ${data.length} confessions from Supabase.`);

      const confessionIds = data.map(c => c.id);
      let commentsCountMap = new Map<string, number>();
      if (confessionIds.length > 0) {
        const { data: commentsRaw } = await supabase.from('comments').select('confession_id').in('confession_id', confessionIds);
        commentsRaw?.forEach(comment => {
          commentsCountMap.set(comment.confession_id, (commentsCountMap.get(comment.confession_id) || 0) + 1);
        });
      }

      const fetchedData = data.map((c: any) => ({ ...c, comment_count: commentsCountMap.get(c.id) || 0, comments: [] }));
      const newHasMore = data.length === CONFESSIONS_PER_PAGE;

      setHasMore(newHasMore);
      setConfessions(prev => {
        console.log(`[State] setConfessions - Previous length: ${prev.length}`);
        const existingIds = new Set(prev.map(c => c.id));
        const newUniqueConfessions = fetchedData.filter(c => !existingIds.has(c.id));
        console.log(`[State] setConfessions - New unique confessions added: ${newUniqueConfessions.length}`);
        const newState = [...prev, ...newUniqueConfessions];
        console.log(`[State] setConfessions - New state length: ${newState.length}`);
        return newState;
      });
      return fetchedData;
    } catch (error: any) {
      toast.error("Error fetching confessions: " + error.message);
      setHasMore(false);
      return [];
    } finally {
      setLoadingMore(false); // Set loadingMore to false at the end of fetch
    }
  }, []); // No dependency on loadingMore here, as it's managed internally

  // Function to fetch a single confession with its comments
  const fetchSingleConfession = useCallback(async (id: string, slug: string, categoryFromUrl: string) => {
    console.log(`[Fetch] Fetching single confession: ${id}`);
    try {
      // First, fetch the confession by ID without category filter
      const { data: confessionData, error: confessionError } = await supabase
        .from("confessions")
        .select("*")
        .eq("id", id)
        .single();

      if (confessionError || !confessionData) {
        throw new Error("Confession not found.");
      }

      // Check slug consistency
      if (confessionData.slug !== slug) {
        // If slug is wrong, navigate to correct slug, preserving category if it matches
        const newSearch = (categoryFromUrl !== "Всички" && confessionData.category === categoryFromUrl) ? `?category=${categoryFromUrl}` : '';
        navigate(`/confessions/${confessionData.id}/${confessionData.slug}${newSearch}`, { replace: true });
        return null; // Indicate that navigation happened
      }

      // Check category consistency
      if (categoryFromUrl !== "Всички" && confessionData.category !== categoryFromUrl) {
        // If category in URL doesn't match actual category, update URL to reflect actual category
        const newSearch = confessionData.category !== "Всички" ? `?category=${confessionData.category}` : '';
        navigate(`/confessions/${confessionData.id}/${confessionData.slug}${newSearch}`, { replace: true });
        return null; // Indicate that navigation happened
      }

      const { data: commentsData, error: commentsError } = await supabase.from("comments").select("*").eq("confession_id", id).order("created_at", { ascending: false });
      if (commentsError) console.error("Error fetching comments for single confession:", commentsError);

      const formattedConfession: Confession = {
        ...confessionData,
        comment_count: commentsData?.length || 0,
        comments: commentsData || [],
      };
      return formattedConfession;
    } catch (error: any) {
      toast.error("Error fetching confession details: " + error.message);
      // If any other error (e.g., confession not found), redirect to main page, preserving category
      const currentCategoryParam = searchParams.get('category'); // Get current category from URL
      let redirectPath = '/';
      if (currentCategoryParam && currentCategoryParam !== "Всички") {
        redirectPath += `?category=${currentCategoryParam}`;
      }
      navigate(redirectPath, { replace: true }); // Redirect to main page with category
      return null;
    }
  }, [navigate, searchParams]);

  // Effect to update selectedCategory from URL search params
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category') || "Всички";
    if (categoryFromUrl !== selectedCategory) {
      console.log(`[URL] Category changed from URL: ${selectedCategory} -> ${categoryFromUrl}`);
      setSelectedCategory(categoryFromUrl);
    }
  }, [searchParams, selectedCategory]);

  // Main data loading effect (for initial load or category/paramId changes)
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    const currentCategory = selectedCategory;
    const currentParamId = paramId;
    const currentContext = { category: currentCategory, paramId: currentParamId };
    const prevContext = lastLoadedContextRef.current;

    let needsFullRefetch = false;

    // Scenario 1: Category has changed
    if (prevContext?.category !== currentCategory) {
      needsFullRefetch = true;
      console.log(`[Effect] Needs full refetch: Category changed (${prevContext?.category} -> ${currentCategory})`);
    } 
    // Scenario 2: Navigating to a specific confession (paramId is set)
    else if (currentParamId) {
      // If we were NOT on a specific confession before (prevContext?.paramId is null/undefined)
      // OR if the target confession is NOT currently in the list
      if (!prevContext?.paramId || !confessions.some(c => c.id === currentParamId)) {
        needsFullRefetch = true;
        console.log(`[Effect] Needs full refetch: Navigating to new specific confession (${currentParamId}) or it's not in list.`);
      }
      // If we are switching between two *different* specific confessions,
      // AND both are already in the `confessions` array, `needsFullRefetch` will remain `false`.
      // This means `prevContext?.paramId` was defined, and `confessions.some(c => c.id === currentParamId)` is true.
      // In this case, the `else if` block above would be skipped.
    }
    // Scenario 3: Collapsing from a specific confession back to the main feed
    else if (!currentParamId && prevContext?.paramId) {
      needsFullRefetch = true;
      console.log(`[Effect] Needs full refetch: Collapsing from specific confession.`);
    }

    // If a full re-fetch is needed, execute it.
    if (needsFullRefetch) {
      console.log("[Effect] Initiating full re-fetch.");
      setLoading(true);
      setConfessions([]); // Clear existing confessions for a fresh load
      setPage(0);
      setHasMore(true);
      setVisibleConfessionCount(0);
      prevConfessionsLengthRef.current = 0;
      setExpandedConfessionId(currentParamId || null); // Update expanded state immediately

      const loadData = async () => {
        try {
          if (currentParamId) {
            const targetConf = await fetchSingleConfession(currentParamId, paramSlug!, currentCategory);
            if (!targetConf) {
              return; 
            }
            let beforeQuery = supabase.from("confessions").select("*").lt("created_at", targetConf.created_at).order("created_at", { ascending: false });
            if (currentCategory !== "Всички") beforeQuery = beforeQuery.eq("category", currentCategory);
            const { data: beforeData } = await beforeQuery.limit(CONFESSIONS_PER_PAGE / 2);

            let afterQuery = supabase.from("confessions").select("*").gt("created_at", targetConf.created_at).order("created_at", { ascending: true });
            if (currentCategory !== "Всички") afterQuery = afterQuery.eq("category", currentCategory);
            const { data: afterData } = await afterQuery.limit(CONFESSIONS_PER_PAGE / 2);

            const formatConfession = (c: any) => ({ ...c, comment_count: 0, comments: [] });
            const combinedConfessions = [
              ...(afterData || []).reverse().map(formatConfession),
              targetConf,
              ...(beforeData || []).map(formatConfession)
            ];
            
            const uniqueConfessions = Array.from(new Map(combinedConfessions.map(c => [c.id, c])).values())
                                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setConfessions(uniqueConfessions);
            setHasMore(false);
          } else {
            await fetchConfessionsPage({ category: currentCategory });
          }
        } finally {
          setLoading(false);
          lastLoadedContextRef.current = currentContext; // Update ref here
          console.log("[Effect] Full re-fetch completed. Loading set to false.");
        }
      };
      loadData();
    } else {
      // If no full re-fetch is needed, just update the expanded state and context
      if (expandedConfessionId !== currentParamId) {
        console.log(`[Effect] No full refetch needed. Updating expandedConfessionId to: ${currentParamId || 'null'}`);
        setExpandedConfessionId(currentParamId || null);
      }
      // Always update lastLoadedContextRef to reflect the current state
      lastLoadedContextRef.current = currentContext; // Update ref here
    }
  }, [authLoading, selectedCategory, paramId, paramSlug, fetchConfessionsPage, fetchSingleConfession, confessions]); // Added 'confessions' to dependencies for the `some` check

  // Effect to handle infinite scroll (triggered by page state change)
  useEffect(() => {
    if (page > 0 && hasMoreRef.current && !loadingMoreRef.current) { // Use ref for loadingMore
      console.log(`[Infinite Scroll] Page incremented to ${page}. Initiating fetch for next batch.`);
      const oldestCreatedAt = latestConfessionsRef.current.length > 0 ? latestConfessionsRef.current[latestConfessionsRef.current.length - 1].created_at : undefined;
      fetchConfessionsPage({ category: selectedCategory, oldestCreatedAtForInfiniteScroll: oldestCreatedAt });
    }
  }, [page, fetchConfessionsPage, selectedCategory]); // Removed loadingMore from dependencies

  // Intersection Observer for infinite scroll
  const lastConfessionElementRef = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      // Only increment page if intersecting, has more, and NOT currently loading more
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) { // Use ref here
        console.log("[Observer] Last element intersected. Incrementing page.");
        setPage(prev => prev + 1);
      }
    }, { rootMargin: '0px 0px 200px 0px' });
    if (node) observer.current.observe(node);
  }, []); // Removed loadingMore from dependencies

  // Effect to scroll to expanded confession
  useEffect(() => {
    if (!loading && expandedConfessionId) {
      const el = document.getElementById(expandedConfessionId);
      if (el) {
        console.log(`[Scroll] Scrolling to expanded confession: ${expandedConfessionId}`);
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }
  }, [loading, expandedConfessionId, location.hash]);

  // Effect to manage initial visible count and kick off cascade for new batches
  useEffect(() => {
    if (loading || !isFormAnimationComplete) {
      return;
    }

    const currentLength = confessions.length;
    const prevLength = prevConfessionsLengthRef.current;

    console.log(`[VisibleCount Effect] Current confessions length: ${currentLength}, Previous length: ${prevLength}, Visible count: ${visibleConfessionCount}, Param ID: ${paramId}`);

    // If a specific confession is expanded, show all immediately
    if (paramId) {
      if (visibleConfessionCount !== currentLength) {
        console.log(`[VisibleCount Effect] Param ID present, setting visibleCount to all (${currentLength}).`);
        setVisibleConfessionCount(currentLength);
      }
    }
    // If we have new confessions and haven't started cascading for them yet
    else if (currentLength > prevLength && visibleConfessionCount < currentLength) {
      // If it's the very first load (page 0) and we haven't started cascading yet
      if (page === 0 && visibleConfessionCount === 0) {
        console.log("[VisibleCount Effect] Initial load, starting cascade (visibleCount = 1).");
        setVisibleConfessionCount(1); // Start the cascade for the first item
      }
      // If a new batch has been loaded (page > 0) and visibleCount is stuck at the end of the previous batch
      else if (page > 0 && visibleConfessionCount === prevLength) {
        console.log("[VisibleCount Effect] New batch loaded, kicking off cascade for new items (visibleCount + 1).");
        setVisibleConfessionCount(prev => prev + 1); // Kick off cascade for the first new item in the batch
      }
    }
    prevConfessionsLengthRef.current = currentLength; // Update ref for next comparison
  }, [loading, isFormAnimationComplete, paramId, confessions.length, loadingMore, visibleConfessionCount, page]);

  const handleAnimationComplete = useCallback(() => {
    console.log(`[Animation Complete] Confession animation finished. Current visibleCount: ${visibleConfessionCount}, Total confessions: ${confessions.length}, Param ID: ${paramId}`);
    // Continue cascade as long as there are more confessions to show
    // and we are not in a single-confession view (paramId)
    if (!paramId && visibleConfessionCount < confessions.length) {
      console.log("[Animation Complete] Continuing cascade (visibleCount + 1).");
      setVisibleConfessionCount(prev => prev + 1);
    }
  }, [confessions.length, paramId, visibleConfessionCount]);

  const handleAddConfession = async (title: string, content: string, gender: "male" | "female" | "incognito", category: string, slug: string, email?: string) => {
    const { data, error } = await supabase.from("confessions").insert({ title, content, gender, category, slug, author_email: email }).select('id, slug');
    if (error) {
      toast.error("Error posting confession: " + error.message);
    } else {
      const newConfession = data?.[0];
      if (newConfession) {
        toast.success("Confession posted!");
        supabase.functions.invoke('generate-ai-comment', { body: { confessionId: newConfession.id, confessionContent: content } })
          .then(({ error: invokeError }) => {
            if (invokeError) console.error("Error invoking AI comment function:", invokeError.message);
          });
        navigate(`/confessions/${newConfession.id}/${newConfession.slug}`);
      } else {
        toast.error("Error: No confession data returned after posting.");
      }
    }
  };

  const handleAddComment = async (confessionId: string, content: string, gender: "male" | "female" | "incognito") => {
    const { error } = await supabase.from("comments").insert({ confession_id: confessionId, content, gender });
    if (error) {
      toast.error("Error posting comment: " + error.message);
    } else {
      toast.success("Comment posted!");
      supabase.functions.invoke('send-comment-notification', { body: { confession_id: confessionId, comment_content: content } });
    }
  };

  const handleFetchComments = async (confessionId: string) => {
    const { data, error } = await supabase.from("comments").select("*").eq("confession_id", confessionId).order("created_at", { ascending: false });
    if (error) {
      toast.error("Error fetching comments: " + error.message);
    } else {
      setConfessions(prev => prev.map(c => c.id === confessionId ? { ...c, comments: data || [] } : c));
    }
  };

  const handleLikeConfession = async (confessionId: string) => {
    setConfessions(prev => prev.map(c => c.id === confessionId ? { ...c, likes: c.likes + 1 } : c));
    const { error } = await supabase.rpc("increment_confession_likes", { confession_id_param: confessionId });
    if (error) {
      toast.error("Error liking confession: " + error.message);
      setConfessions(prev => prev.map(c => c.id === confessionId ? { ...c, likes: c.likes - 1 } : c));
    }
  };

  const handleConfessionToggle = (confessionId: string, slug: string) => {
    const isCurrentlyExpanded = expandedConfessionId === confessionId;
    const currentCategoryParam = searchParams.get('category');
    let newPath = '/';

    if (!isCurrentlyExpanded) { // If expanding this confession
      newPath = `/confessions/${confessionId}/${slug}`;
    } else { // If collapsing this confession
      // Keep the current category in the URL, but remove the confession ID/slug
      newPath = '/'; // Start with root
    }

    // Append category if present
    if (currentCategoryParam && currentCategoryParam !== "Всички") {
      newPath += `?category=${currentCategoryParam}`;
    }
    
    navigate(newPath, { replace: true });
  };

  const handleSelectCategory = (category: string) => {
    // When selecting a new category, always navigate to the root path for that category.
    // This ensures any currently expanded confession is "collapsed" and the feed is reset.
    let newPath = '/';
    let newSearch = '';
    if (category !== "Всички") {
      newSearch = `?category=${category}`;
    }
    navigate(`${newPath}${newSearch}`, { replace: true });
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
    confessionFormContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setForceExpandForm(true);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex justify-center mb-8 opacity-0 animate-fade-zoom-in">
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" preserveAspectRatio="none" x="0px" y="0px" viewBox="0 0 481 134"
          className={cn("w-64 sm:w-72 md:w-80 lg:w-96 h-auto fill-gray-900 dark:fill-white transition-colors duration-300")}>
          <defs><g id="Layer0_0_FILL"><path fill="#000000" stroke="none" d=" M 17.4 29.4 L 17.4 1.85 0 1.85 0 51.1 17.3 51.1 38 23.65 38 51.1 55.4 51.1 55.4 1.85 38 1.85 17.4 29.4 M 119 60.85 Q 111.65 57.95 102.9 57.95 94.1 57.95 86.7 60.85 79.35 63.8 74.1 69 68.8 74.2 65.85 81.1 62.85 88.1 62.85 96.15 62.85 104.25 65.85 111.15 68.8 118.15 74.1 123.3 79.35 128.5 86.7 131.45 94.1 134.35 102.9 134.35 111.65 134.35 119 131.45 126.45 128.5 131.75 123.3 137.05 118.15 140.05 111.15 143 104.25 143 96.15 143 88.1 140.05 81.1 137.05 74.2 131.75 69 126.45 63.8 119 60.85 M 84.2 88.2 Q 85.85 84.55 88.6 81.85 91.35 79.15 95.05 77.7 98.75 76.2 102.9 76.2 107 76.2 110.7 77.7 114.45 79.15 117.25 81.85 120.1 84.55 121.75 88.2 123.35 91.85 123.35 96.15 123.35 100.5 121.75 104.15 120.1 107.8 117.25 110.45 114.45 113.15 110.7 114.65 107 116.15 102.9 116.15 98.75 116.15 95.05 114.65 91.35 113.15 88.6 110.45 85.85 107.8 84.2 104.15 82.55 100.5 82.55 96.15 82.55 91.85 84.2 88.2 M 96.25 1.85 L 96.25 18.85 78.65 18.85 78.65 1.85 61.25 1.85 61.25 51.1 78.65 51.1 78.65 33.15 96.25 33.15 96.25 51.1 113.65 51.1 113.65 1.85 96.25 1.85 M 151.35 1.85 L 136.95 21.6 136.95 1.85 119.55 1.85 119.55 51.1 136.95 51.1 136.95 31.4 152.55 51.1 172.45 51.1 150.35 25.45 169.85 1.85 151.35 1.85 M 259.1 132.35 L 259.1 116.4 243.2 116.4 243.2 60 224.4 60 224.4 132.35 259.1 132.35 259.1 132.35 M 218.25 60 L 199.5 60 199.5 104.25 164.75 60 145.95 60 145.95 132.35 164.75 132.35 164.75 88.1 199.5 132.35 218.25 132.35 218.25 60 M 221.25 7.45 Q 217.25 3.95 211.9 2 206.45 0 200.1 0 193.7 0 188.25 2 182.8 4.05 178.9 7.55 174.95 11.05 172.75 15.8 170.55 20.6 170.55 26 170.55 32.1 172.75 37.05 174.95 41.95 178.85 45.5 182.7 49.1 188.1 51 193.45 52.95 199.85 52.95 206.25 52.95 211.8 51 217.25 49.1 221.2 45.55 225.15 42.1 227.4 37.25 229.7 32.4 229.7 26.55 229.7 20.7 227.45 15.8 225.25 11 221.25 7.45 M 208.05 18.4 Q 209.5 19.9 210.4 21.95 211.3 24.05 211.3 26.35 211.3 28.75 210.4 30.8 209.5 32.85 208.05 34.4 206.55 35.9 204.45 36.8 202.4 37.65 200.1 37.65 197.8 37.65 195.75 36.8 193.7 35.9 192.2 34.4 190.7 32.85 189.8 30.8 188.85 28.75 188.85 26.25 188.85 23.9 189.8 21.9 190.7 19.9 192.2 18.4 193.7 16.85 195.75 15.95 197.8 15.1 200.1 15.1 202.4 15.1 204.45 15.95 206.55 16.85 208.05 18.4 M 285.25 60 L 266.45 60 266.45 132.35 285.25 132.35 285.25 60 M 264.45 16.35 L 264.45 1.85 233.65 1.85 233.65 51.1 250.95 51.1 250.95 16.35 264.45 16.35 M 301.3 1.85 L 301.3 18.85 283.7 18.85 283.7 1.85 266.3 1.85 266.3 51.1 283.7 51.1 283.7 33.15 301.3 33.15 301.3 51.1 318.7 51.1 318.7 1.85 301.3 1.85 M 363.7 60 L 344.95 60 344.95 104.25 310.2 60 291.4 60 291.4 132.35 310.2 132.35 310.2 88.1 344.95 132.35 363.7 132.35 363.7 60 M 342 29.4 L 342 1.85 324.6 1.85 324.6 51.1 341.9 51.1 362.6 23.65 362.6 51.1 380 51.1 380 1.85 362.6 1.85 342 29.4 M 411 75.9 L 411 60 369.85 60 369.85 132.35 411 132.35 411 116.4 388.65 116.4 388.65 103.95 409.8 103.95 409.8 88 388.65 88 388.65 75.9 411 75.9 M 410.7 16.35 L 422.25 16.35 422.25 1.85 381.8 1.85 381.8 16.35 393.35 16.35 393.35 51.1 410.7 51.1 410.7 16.35 M 479 15.8 Q 476.8 11 472.8 7.45 468.8 3.95 463.45 2 458 0 451.65 0 445.25 0 439.8 2 434.35 4.05 430.45 7.55 426.5 11.05 424.3 15.8 422.1 20.6 422.1 26 422.1 32.1 424.3 37.05 426.5 41.95 430.4 45.5 434.25 49.1 439.65 51 445 52.95 451.4 52.95 457.8 52.95 463.35 51 468.8 49.1 472.75 45.55 476.7 42.1 478.95 37.25 481.25 32.4 481.25 26.55 481.25 20.7 479 15.8 M 456 15.95 Q 458.1 16.85 459.6 18.4 461.05 19.9 461.95 21.95 462.85 24.05 462.85 26.35 462.85 28.75 461.95 30.8 461.05 32.85 459.6 34.4 458.1 35.9 456 36.8 453.95 37.65 451.65 37.65 449.35 37.65 447.3 36.8 445.25 35.9 443.75 34.4 442.25 32.85 441.35 30.8 440.4 28.75 440.4 26.25 440.4 23.9 441.35 21.9 442.25 19.9 443.75 18.4 445.25 16.85 447.3 15.95 449.35 15.1 451.65 15.1 453.95 15.1 456 15.95 Z"/></g></defs><g transform="matrix( 1, 0, 0, 1, 0,0) "><use href="#Layer0_0_FILL"/></g></svg>
      </div>
      <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={handleSelectCategory} />
      <div ref={confessionFormContainerRef}>
        <ConfessionForm
          onSubmit={handleAddConfession}
          onFormFocus={() => { if (expandedConfessionId) navigate(`/${location.search}`, { replace: true }); }}
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
              currentCategory={selectedCategory}
            />
          ))}
        </div>
      )}
      {loadingMore && <div className="space-y-6 mt-8"><ConfessionCardSkeleton /><ConfessionCardSkeleton /></div>}
      
      {!loading && !loadingMore && hasMore && (visibleConfessionCount === confessions.length) && (
        <div ref={lastConfessionElementRef} style={{ height: "1px" }} />
      )}

      {!hasMore && confessions.length > 0 && <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Това са всички изповеди.</p>}
      <ComposeButton isVisible={isComposeButtonVisible} onClick={handleComposeClick} />
    </div>
  );
};

export default Index;