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
  updateMetaTags: (meta: { title?: string; description?: string; url?: string; type?: string }) => void; // New prop for meta tags
}

const Index: React.FC<IndexProps> = ({ isInfoPageOpen, updateMetaTags }) => { // Receive prop
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
            if (!targetConf) {
              updateMetaTags({}); // Reset to default if confession not found
              return;
            }
            
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

            // Update meta tags for the specific confession
            updateMetaTags({
              title: targetConf.title,
              description: targetConf.content.substring(0, 160) + (targetConf.content.length > 160 ? '...' : ''),
              url: `${window.location.origin}/confessions/${targetConf.id}/${targetConf.slug}`,
              type: 'article',
            });

          } else {
            await fetchConfessionsPage({ category: currentCategory, replace: true, fetchId });
            updateMetaTags({}); // Reset to default meta for the main list page
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
      // If we are on the main page (no paramId), ensure default meta is set
      if (!currentParamId && !isInfoPageOpen) {
        updateMetaTags({});
      }
    }
  }, [authLoading, selectedCategory, paramId, paramSlug, fetchConfessionsPage, fetchSingleConfession, confessions.length, isInfoPageOpen, updateMetaTags]);

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

    if (paramId || page > 0) {
      // If on a specific confession page or loading more pages, show all confessions immediately.
      setVisibleConfessionCount(currentLength);
    } else if (page === 0 && currentLength > 0 && visibleConfessionCount === 0) {
      // On initial load (page 0), start the cascade animation.
      setVisibleConfessionCount(1);
    }
    
    prevConfessionsLengthRef.current = currentLength;
  }, [loading, isFormAnimationComplete, paramId, confessions, page]);

  const handleAnimationComplete = useCallback(() => {
    // Only continue the cascade animation on the initial page load.
    if (!paramId && page === 0 && visibleConfessionCount < confessions.length) {
      setVisibleConfessionCount(prev => prev + 1);
    }
  }, [confessions.length, paramId, visibleConfessionCount, page]);

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
        <img
          src="/images/logo.svg"
          alt="Инкогнито Online Logo"
          className={cn("w-64 sm:w-72 md:w-80 lg:w-96 h-auto dark:invert transition-colors duration-300")}
        />
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
          {confessions.slice(0, visibleConfessionCount).map((conf, index) => (
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
              ref={index === visibleConfessionCount - 1 ? lastConfessionElementRef : null} // Apply ref to the last visible card
            />
          ))}
        </div>
      )}
      {loadingMore && <div className="space-y-6 mt-8"><ConfessionCardSkeleton /><ConfessionCardSkeleton /></div>}
      
      {!hasMore && confessions.length > 0 && <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Това са всички изповеди.</p>}
      <ComposeButton isVisible={isComposeButtonVisible} onClick={handleComposeClick} />
    </div>
  );
};

export default Index;