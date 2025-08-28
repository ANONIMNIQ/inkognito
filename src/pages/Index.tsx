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
import FloatingMenu from "@/components/FloatingMenu"; // Import the new component

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

interface IndexProps {
  isInfoPageOpen: boolean; // New prop to indicate if an info page is open
}

const Index: React.FC<IndexProps> = ({ isInfoPageOpen }) => { // Receive prop
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
  const currentFetchId = useRef(0); // New ref to track the latest fetch request
  const lastNonInfoPageCategoryRef = useRef<string>("Всички"); // New ref to store the category when info page is NOT open

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

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
            const updatedConfessions = currentConfessions.map((confession) => {
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
            latestConfessionsRef.current = updatedConfessions;
            return updatedConfessions;
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
    { category, oldestCreatedAtForInfiniteScroll, replace = false, fetchId }:
    { category: string; oldestCreatedAtForInfiniteScroll?: string; replace?: boolean; fetchId: number }
  ) => {
    setLoadingMore(true);
    try {
      let query = supabase.from("confessions").select("*").order("created_at", { ascending: false });
      if (category !== "Всички") query = query.eq("category", category);

      if (oldestCreatedAtForInfiniteScroll) {
        query = query.lt("created_at", oldestCreatedAtForInfiniteScroll);
      }
      query = query.limit(CONFESSIONS_PER_PAGE);
      
      const { data, error } = await query;
      if (error) throw error;

      if (fetchId !== currentFetchId.current) {
        return [];
      }

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
        if (replace) {
          latestConfessionsRef.current = fetchedData;
          return fetchedData;
        }
        
        const existingIds = new Set(prev.map(c => c.id));
        const newUniqueConfessions = fetchedData.filter(c => !existingIds.has(c.id));
        const newState = [...prev, ...newUniqueConfessions];
        latestConfessionsRef.current = newState;
        return newState;
      });
      return fetchedData;
    } catch (error: any) {
      toast.error("Error fetching confessions: " + error.message);
      setHasMore(false);
      return [];
    } finally {
      setLoadingMore(false);
    }
  }, []);

  // Function to fetch a single confession with its comments
  const fetchSingleConfession = useCallback(async (id: string, slug: string, categoryFromUrl: string, fetchId: number) => {
    try {
      const { data: confessionData, error: confessionError } = await supabase
        .from("confessions")
        .select("*")
        .eq("id", id)
        .single();

      if (confessionError || !confessionData) {
        throw new Error("Confession not found.");
      }

      if (fetchId !== currentFetchId.current) {
        return null;
      }

      if (confessionData.slug !== slug) {
        const newSearch = (categoryFromUrl !== "Всички" && confessionData.category === categoryFromUrl) ? `?category=${categoryFromUrl}` : '';
        navigate(`/confessions/${confessionData.id}/${confessionData.slug}${newSearch}`, { replace: true });
        return null;
      }

      if (categoryFromUrl !== "Всички" && confessionData.category !== selectedCategory) { // Changed confessionData.category === categoryFromUrl to currentCategory
        const newSearch = confessionData.category !== "Всички" ? `?category=${confessionData.category}` : '';
        navigate(`/confessions/${confessionData.id}/${confessionData.slug}${newSearch}`, { replace: true });
        return null;
      }

      const { data: commentsData, error: commentsError } = await supabase.from("comments").select("*").eq("confession_id", id).order("created_at", { ascending: false });
      if (commentsError) { /* console.error("Error fetching comments for single confession:", commentsError); */ }

      if (fetchId !== currentFetchId.current) {
        return null;
      }

      const formattedConfession: Confession = {
        ...confessionData,
        comment_count: commentsData?.length || 0,
        comments: commentsData || [],
      };
      return formattedConfession;
    } catch (error: any) {
      toast.error("Error fetching confession details: " + error.message);
      const currentCategoryParam = searchParams.get('category');
      let redirectPath = '/';
      if (currentCategoryParam && currentCategoryParam !== "Всички") {
        redirectPath += `?category=${currentCategoryParam}`;
      }
      navigate(redirectPath, { replace: true });
      return null;
    }
  }, [navigate, searchParams, selectedCategory]);

  // Effect to update selectedCategory from URL search params, but only if info page is not open
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category') || "Всички";
    if (!isInfoPageOpen) {
      if (categoryFromUrl !== selectedCategory) {
        setSelectedCategory(categoryFromUrl);
      }
      lastNonInfoPageCategoryRef.current = categoryFromUrl; // Store the last valid category
    } else {
      // If info page is open, ensure selectedCategory reflects the last valid category
      // This prevents selectedCategory from changing to "Всички" when on /about-us
      if (selectedCategory !== lastNonInfoPageCategoryRef.current) {
        setSelectedCategory(lastNonInfoPageCategoryRef.current);
      }
    }
  }, [searchParams, selectedCategory, isInfoPageOpen]); // Add isInfoPageOpen to dependencies

  // Main data loading effect
  useEffect(() => {
    if (authLoading) return;

    if (expandedConfessionId !== paramId) {
      setExpandedConfessionId(paramId || null);
    }

    const currentCategory = selectedCategory; // Use the state, which is now stable
    const currentParamId = paramId;

    const isCategoryChanged = lastLoadedContextRef.current?.category !== currentCategory;
    const isNavigatingToNewConfession = currentParamId && !latestConfessionsRef.current.some(c => c.id === currentParamId);
    const isReturningToListAndListIsEmpty = !currentParamId && lastLoadedContextRef.current?.paramId && confessions.length === 0;

    const needsFullRefetch = isCategoryChanged || isNavigatingToNewConfession || isReturningToListAndListIsEmpty;

    if (needsFullRefetch) {
      currentFetchId.current++;
      const fetchId = currentFetchId.current;
      
      setLoading(true);
      setPage(0);
      setHasMore(true);
      setVisibleConfessionCount(0);
      prevConfessionsLengthRef.current = 0;

      const loadData = async () => {
        try {
          if (currentParamId) {
            const targetConf = await fetchSingleConfession(currentParamId, paramSlug!, currentCategory, fetchId);
            if (!targetConf) return;
            
            if (fetchId !== currentFetchId.current) return;

            // Fetch ALL newer confessions for context
            let afterQuery = supabase.from("confessions").select("*").gt("created_at", targetConf.created_at).order("created_at", { ascending: true });
            if (currentCategory !== "Всички") afterQuery = afterQuery.eq("category", currentCategory);
            const { data: afterData } = await afterQuery; // No limit

            // Fetch a full page of older confessions to enable infinite scroll
            let beforeQuery = supabase.from("confessions").select("*").lt("created_at", targetConf.created_at).order("created_at", { ascending: false });
            if (currentCategory !== "Всички") beforeQuery = beforeQuery.eq("category", currentCategory);
            const { data: beforeData, error: beforeError } = await beforeQuery.limit(CONFESSIONS_PER_PAGE);
            if (beforeError) throw beforeError;

            // Correctly set hasMore based on the fetch result
            const newHasMore = beforeData.length === CONFESSIONS_PER_PAGE;
            setHasMore(newHasMore);

            const formatConfession = (c: any) => ({ ...c, comment_count: 0, comments: [] });
            const combinedConfessions = [
              ...(afterData || []).reverse().map(formatConfession),
              targetConf,
              ...(beforeData || []).map(formatConfession)
            ];
            
            const uniqueConfessions = Array.from(new Map(combinedConfessions.map(c => [c.id, c])).values())
                                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setConfessions(uniqueConfessions);
            latestConfessionsRef.current = uniqueConfessions;
          } else {
            await fetchConfessionsPage({ category: currentCategory, replace: true, fetchId });
          }
        } finally {
          if (fetchId === currentFetchId.current) {
            setLoading(false);
            lastLoadedContextRef.current = { category: currentCategory, paramId: currentParamId };
          }
        }
      };
      loadData();
    } else {
      // If needsFullRefetch is false, it means:
      // 1. Category hasn't changed.
      // 2. We are not navigating to a new, unseen confession.
      // 3. We are either already on the list view, or collapsing a confession
      //    and the list is NOT empty (so no full refetch needed).
      // In this case, we just update the context ref if it's different,
      // and the UI will react to `expandedConfessionId` changing.
      if (lastLoadedContextRef.current?.category !== currentCategory || lastLoadedContextRef.current?.paramId !== currentParamId) {
        lastLoadedContextRef.current = { category: currentCategory, paramId: currentParamId };
      }
      // Crucially, we do NOT set setLoading(false) here if it was already false,
      // and we do NOT trigger any data fetching.
    }
  }, [authLoading, selectedCategory, paramId, paramSlug, fetchConfessionsPage, fetchSingleConfession, confessions.length]);

  // Effect to handle infinite scroll
  useEffect(() => {
    if (page > 0 && hasMoreRef.current && !loadingMoreRef.current) {
      const oldestCreatedAt = latestConfessionsRef.current.length > 0 ? latestConfessionsRef.current[latestConfessionsRef.current.length - 1].created_at : undefined;
      fetchConfessionsPage({ category: selectedCategory, oldestCreatedAtForInfiniteScroll: oldestCreatedAt, fetchId: currentFetchId.current });
    }
  }, [page, fetchConfessionsPage, selectedCategory]);

  // Intersection Observer for infinite scroll
  const lastConfessionElementRef = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
        setPage(prev => prev + 1);
      }
    }, { rootMargin: '0px 0px 200px 0px' });
    if (node) observer.current.observe(node);
  }, []);

  // Effect to scroll to expanded confession
  useEffect(() => {
    if (!loading && expandedConfessionId) {
      const el = document.getElementById(expandedConfessionId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }
  }, [loading, expandedConfessionId, location.hash]);

  // Effect to manage visible count for cascade animation
  useEffect(() => {
    if (loading || !isFormAnimationComplete) return;

    const currentLength = confessions.length;
    const prevLength = prevConfessionsLengthRef.current;

    if (paramId) {
      if (visibleConfessionCount !== currentLength) {
        setVisibleConfessionCount(currentLength);
      }
    }
    else if (currentLength > prevLength && visibleConfessionCount < currentLength) {
      if (page === 0 && visibleConfessionCount === 0) {
        setVisibleConfessionCount(1);
      }
      else if (page > 0 && visibleConfessionCount === prevLength) {
        setVisibleConfessionCount(prev => prev + 1);
      }
    }
    prevConfessionsLengthRef.current = currentLength;
  }, [loading, isFormAnimationComplete, paramId, confessions.length, loadingMore, visibleConfessionCount, page]);

  const handleAnimationComplete = useCallback(() => {
    if (!paramId && visibleConfessionCount < confessions.length) {
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
          .then(() => { /* No action needed for invokeError */ });
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
      setConfessions(prev => {
        const newState = prev.map(c => c.id === confessionId ? { ...c, comments: data || [] } : c);
        latestConfessionsRef.current = newState;
        return newState;
      });
    }
  };

  const handleLikeConfession = async (confessionId: string) => {
    setConfessions(prev => {
      const newState = prev.map(c => c.id === confessionId ? { ...c, likes: c.likes + 1 } : c);
      latestConfessionsRef.current = newState;
      return newState;
    });
    const { error } = await supabase.rpc("increment_confession_likes", { confession_id_param: confessionId });
    if (error) {
      toast.error("Error liking confession: " + error.message);
      setConfessions(prev => {
        const newState = prev.map(c => c.id === confessionId ? { ...c, likes: c.likes - 1 } : c);
        latestConfessionsRef.current = newState;
        return newState;
      });
    }
  };

  const handleConfessionToggle = (confessionId: string, slug: string) => {
    const isCurrentlyExpanded = expandedConfessionId === confessionId;
    const currentCategoryParam = searchParams.get('category');
    let newPath = '/';

    if (!isCurrentlyExpanded) {
      newPath = `/confessions/${confessionId}/${slug}`;
    }
    
    if (currentCategoryParam && currentCategoryParam !== "Всички") {
      newPath += `?category=${currentCategoryParam}`;
    }
    
    navigate(newPath, { replace: true });
  };

  const handleSelectCategory = (category: string) => {
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
      {/* FloatingMenu is now rendered in App.tsx */}
      <div className="flex justify-center mb-8 opacity-0 animate-fade-zoom-in">
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="none" x="0px" y="0px" viewBox="0 0 481 134"
          className={cn("w-64 sm:w-72 md:w-80 lg:w-96 h-auto fill-gray-900 dark:fill-white transition-colors duration-300")}>
          <defs>
            <g id="Layer0_0_FILL">
              <path fillRule="evenodd" d=" M 17.4 29.4 L 17.4 1.85 0 1.85 0 51.1 17.3 51.1 38 23.65 38 51.1 55.4 51.1 55.4 1.85 38 1.85 17.4 29.4 M 119 60.85 Q 111.65 57.95 102.9 57.95 94.1 57.95 86.7 60.85 79.35 63.8 74.1 69 68.8 74.2 65.85 81.1 62.85 88.1 62.85 96.15 62.85 104.25 65.85 111.15 68.8 118.15 74.1 123.3 79.35 128.5 86.7 131.45 94.1 134.35 102.9 134.35 111.65 134.35 119 131.45 126.45 128.5 131.75 123.3 137.05 118.15 140.05 111.15 143 104.25 143 96.15 143 88.1 140.05 81.1 137.05 74.2 131.75 69 126.45 63.8 119 60.85 M 84.2 88.2 Q 85.85 84.55 88.6 81.85 91.35 79.15 95.05 77.7 98.75 76.2 102.9 76.2 107 76.2 110.7 77.7 114.45 79.15 117.25 81.85 120.1 84.55 121.75 88.2 123.35 91.85 123.35 96.15 123.35 100.5 121.75 104.15 120.1 107.8 117.25 110.45 114.45 113.15 110.7 114.65 107 116.15 102.9 116.15 98.75 116.15 95.05 114.65 91.35 113.15 88.6 110.45 85.85 107.8 84.2 104.15 82.55 100.5 82.55 96.15 82.55 91.85 84.2 88.2 M 96.25 1.85 L 96.25 18.85 78.65 18.85 78.65 1.85 61.25 1.85 61.25 51.1 78.65 51.1 78.65 33.15 96.25 33.15 96.25 51.1 113.65 51.1 113.65 1.85 96.25 1.85 M 151.35 1.85 L 136.95 21.6 136.95 1.85 119.55 1.85 119.55 51.1 136.95 51.1 136.95 31.4 152.55 51.1 172.45 51.1 150.35 25.45 169.85 1.85 151.35 1.85 M 259.1 132.35 L 259.1 116.4 243.2 116.4 243.2 60 224.4 60 224.4 132.35 259.1 132.35 M 218.25 60 L 199.5 60 199.5 104.25 164.75 60 145.95 60 145.95 132.35 164.75 132.35 164.75 88.1 199.5 132.35 218.25 132.35 218.25 60 M 221.25 7.45 Q 217.25 3.95 211.9 2 206.45 0 200.1 0 193.7 0 188.25 2 182.8 4.05 178.9 7.55 174.95 11.05 172.75 15.8 170.55 20.6 170.55 26 170.55 32.1 172.75 37.05 174.95 41.95 178.85 45.5 182.7 49.1 188.1 51 193.45 52.95 199.85 52.95 206.25 52.95 211.8 51 217.25 49.1 221.2 45.55 225.15 42.1 227.4 37.25 229.7 32.4 229.7 26.55 229.7 20.7 227.45 15.8 225.25 11 221.25 7.45 M 208.05 18.4 Q 209.5 19.9 210.4 21.95 211.3 24.05 211.3 26.35 211.3 28.75 210.4 30.8 209.5 32.85 208.05 34.4 206.55 35.9 204.45 36.8 202.4 37.65 200.1 37.65 197.8 37.65 195.75 36.8 193.7 35.9 192.2 34.4 190.7 32.85 189.8 30.8 188.85 28.75 188.85 26.25 188.85 23.9 189.8 21.9 190.7 19.9 192.2 18.4 193.7 16.85 195.75 15.95 197.8 15.1 200.1 15.1 202.4 15.1 204.45 15.95 206.55 16.85 208.05 18.4 M 285.25 60 L 266.45 60 266.45 132.35 285.25 132.35 285.25 60 M 264.45 16.35 L 264.45 1.85 233.65 1.85 233.65 51.1 250.95 51.1 250.95 16.35 264.45 16.35 M 301.3 1.85 L 301.3 18.85 283.7 18.85 283.7 1.85 266.3 1.85 266.3 51.1 283.7 51.1 283.7 33.15 301.3 33.15 301.3 51.1 318.7 51.1 318.7 1.85 301.3 1.85 M 363.7 60 L 344.95 60 344.95 104.25 310.2 60 291.4 60 291.4 132.35 310.2 132.35 310.2 88.1 344.95 132.35 363.7 132.35 363.7 60 M 342 29.4 L 342 1.85 324.6 1.85 324.6 51.1 341.9 51.1 362.6 23.65 362.6 51.1 380 51.1 380 1.85 362.6 1.85 342 29.4 M 411 75.9 L 411 60 369.85 60 369.85 132.35 411 132.35 411 116.4 388.65 116.4 388.65 103.95 409.8 103.95 409.8 88 388.65 88 388.65 75.9 411 75.9 M 410.7 16.35 L 422.25 16.35 422.25 1.85 381.8 1.85 381.8 16.35 393.35 16.35 393.35 51.1 410.7 51.1 410.7 16.35 M 479 15.8 Q 476.8 11 472.8 7.45 468.8 3.95 463.45 2 458 0 451.65 0 445.25 0 439.8 2 434.35 4.05 430.45 7.55 426.5 11.05 424.3 15.8 422.1 20.6 422.1 26 422.1 32.1 424.3 37.05 426.5 41.95 430.4 45.5 434.25 49.1 439.65 51 445 52.95 451.4 52.95 457.8 52.95 463.35 51 468.8 49.1 472.75 45.55 476.7 42.1 478.95 37.25 481.25 32.4 481.25 26.55 481.25 20.7 479 15.8 M 456 15.95 Q 458.1 16.85 459.6 18.4 461.05 19.9 461.95 21.95 462.85 24.05 462.85 26.35 462.85 28.75 461.95 30.8 461.05 32.85 459.6 34.4 458.1 35.9 456 36.8 453.95 37.65 451.65 37.65 449.35 37.65 447.3 36.8 445.25 35.9 443.75 34.4 442.25 32.85 441.35 30.8 440.4 28.75 440.4 26.25 440.4 23.9 441.35 21.9 442.25 19.9 443.75 18.4 445.25 16.85 447.3 15.95 449.35 15.1 451.65 15.1 453.95 15.1 456 15.95 Z"/>
            </g>
          </defs>
          <g transform="matrix( 1, 0, 0, 1, 0,0) ">
            <use xlink:href="#Layer0_0_FILL"/>
          </g>
        </svg>
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