import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ConfessionCard from "@/components/ConfessionCard";
import ConfessionCardSkeleton from "@/components/ConfessionCardSkeleton";
import { toast } from "sonner";
import { useSessionContext } from "@/components/SessionProvider";
import { cn } from "@/lib/utils";
import ComposeButton from "@/components/ComposeButton"; // Import ComposeButton

const CONFESSIONS_PER_PAGE = 10; // Number of confessions to load in each direction (before/after target)

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
  slug: string;
}

const ConfessionDetail: React.FC = () => {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading } = useSessionContext();

  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMoreBefore, setLoadingMoreBefore] = useState(false);
  const [loadingMoreAfter, setLoadingMoreAfter] = useState(false);
  const [expandedConfessionId, setExpandedConfessionId] = useState<string | null>(null);
  const [oldestConfessionCreatedAt, setOldestConfessionCreatedAt] = useState<string | null>(null);
  const [newestConfessionCreatedAt, setNewestConfessionCreatedAt] = useState<string | null>(null);
  const [hasMoreBefore, setHasMoreBefore] = useState(true); // Assume true until proven otherwise
  const [hasMoreAfter, setHasMoreAfter] = useState(true); // Assume true until proven otherwise
  const [isComposeButtonVisible, setIsComposeButtonVisible] = useState(false); // State for compose button visibility

  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const pageContentRef = useRef<HTMLDivElement>(null); // Ref for the scrollable content area
  const observer = useRef<IntersectionObserver>();

  // Effect to control ComposeButton visibility based on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (pageContentRef.current) {
        // Check if scrolled past a certain point, e.g., 200px from top
        setIsComposeButtonVisible(pageContentRef.current.scrollTop > 200);
      }
    };

    const currentRef = pageContentRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (currentRef) {
        currentRef.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const handleComposeClick = () => {
    navigate('/?compose=true'); // Navigate to home and trigger form expansion
  };

  // Function to fetch confessions based on a reference point (created_at)
  const fetchConfessions = useCallback(async (
    direction: 'initial' | 'before' | 'after',
    referenceCreatedAt: string | null = null,
    limit: number = CONFESSIONS_PER_PAGE
  ) => {
    if (direction === 'before') setLoadingMoreBefore(true);
    if (direction === 'after') setLoadingMoreAfter(true);

    try {
      let query = supabase
        .from("confessions")
        .select("id, title, content, gender, likes, created_at, category, slug, comments(count)")
        .order("created_at", { ascending: false }); // Always order by newest first

      if (direction === 'before' && referenceCreatedAt) {
        query = query.lt("created_at", referenceCreatedAt); // Get older confessions
      } else if (direction === 'after' && referenceCreatedAt) {
        query = query.gt("created_at", referenceCreatedAt); // Get newer confessions
        query = query.order("created_at", { ascending: true }); // For 'after', we want to fetch in reverse chronological order to append correctly
      }

      const { data: confessionsData, error: confessionsError } = await query.limit(limit);

      if (confessionsError) {
        throw confessionsError;
      }

      const confessionsWithCommentCount = confessionsData.map((c: any) => ({
        ...c,
        comment_count: c.comments[0]?.count || 0,
        comments: [],
      }));

      setConfessions(prev => {
        let newConfessions = [...prev];
        if (direction === 'before') {
          newConfessions = [...confessionsWithCommentCount, ...prev];
        } else if (direction === 'after') {
          newConfessions = [...prev, ...confessionsWithCommentCount.reverse()]; // Reverse to maintain chronological order
        } else { // initial load
          newConfessions = confessionsWithCommentCount;
        }

        // Remove duplicates and sort by created_at descending
        const uniqueConfessions = Array.from(new Map(newConfessions.map(c => [c.id, c])).values());
        return uniqueConfessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });

      // Update oldest/newest timestamps
      if (confessionsWithCommentCount.length > 0) {
        const sortedFetched = [...confessionsWithCommentCount].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        if (direction === 'before' || direction === 'initial') {
          setOldestConfessionCreatedAt(sortedFetched[0].created_at);
        }
        if (direction === 'after' || direction === 'initial') {
          setNewestConfessionCreatedAt(sortedFetched[sortedFetched.length - 1].created_at);
        }
      }

      // Update hasMore flags
      if (direction === 'before') {
        setHasMoreBefore(confessionsData.length === limit);
      } else if (direction === 'after') {
        setHasMoreAfter(confessionsData.length === limit);
      }

    } catch (error: any) {
      console.error("Error fetching confessions:", error);
      toast.error("Error fetching confessions: " + error.message);
      if (direction === 'before') setHasMoreBefore(false);
      if (direction === 'after') setHasMoreAfter(false);
    } finally {
      if (direction === 'before') setLoadingMoreBefore(false);
      if (direction === 'after') setLoadingMoreAfter(false);
    }
  }, []);

  // Initial load effect
  useEffect(() => {
    if (!authLoading && id) {
      setLoading(true);
      setExpandedConfessionId(id); // Always expand the target confession

      const loadInitialData = async () => {
        try {
          // 1. Fetch the target confession to get its created_at and verify slug
          const { data: targetConfession, error: targetError } = await supabase
            .from("confessions")
            .select("id, title, content, gender, likes, created_at, category, slug, comments(count)")
            .eq("id", id)
            .single();

          if (targetError || !targetConfession) {
            console.error("Confession not found or error:", targetError);
            toast.error("Confession not found.");
            navigate("/", { replace: true });
            return;
          }

          // Redirect if slug doesn't match
          if (targetConfession.slug !== slug) {
            navigate(`/confessions/${id}/${targetConfession.slug}`, { replace: true });
            return;
          }

          // Set initial oldest/newest based on target
          setOldestConfessionCreatedAt(targetConfession.created_at);
          setNewestConfessionCreatedAt(targetConfession.created_at);

          // Fetch confessions around the target
          const { data: beforeData, error: beforeError } = await supabase
            .from("confessions")
            .select("id, title, content, gender, likes, created_at, category, slug, comments(count)")
            .lt("created_at", targetConfession.created_at)
            .order("created_at", { ascending: false })
            .limit(CONFESSIONS_PER_PAGE);

          if (beforeError) throw beforeError;

          const { data: afterData, error: afterError } = await supabase
            .from("confessions")
            .select("id, title, content, gender, likes, created_at, category, slug, comments(count)")
            .gt("created_at", targetConfession.created_at)
            .order("created_at", { ascending: true }) // Fetch in ascending order to easily append
            .limit(CONFESSIONS_PER_PAGE);

          if (afterError) throw afterError;

          const initialConfessions = [
            ...(beforeData || []).map((c: any) => ({ ...c, comment_count: c.comments[0]?.count || 0, comments: [] })),
            { ...targetConfession, comment_count: targetConfession.comments[0]?.count || 0, comments: [] },
            ...(afterData || []).reverse().map((c: any) => ({ ...c, comment_count: c.comments[0]?.count || 0, comments: [] })), // Reverse to maintain chronological order
          ];

          const uniqueConfessions = Array.from(new Map(initialConfessions.map(c => [c.id, c])).values());
          const sortedConfessions = uniqueConfessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          setConfessions(sortedConfessions);

          if (sortedConfessions.length > 0) {
            setOldestConfessionCreatedAt(sortedConfessions[sortedConfessions.length - 1].created_at);
            setNewestConfessionCreatedAt(sortedConfessions[0].created_at);
          }

          setHasMoreBefore((beforeData || []).length === CONFESSIONS_PER_PAGE);
          setHasMoreAfter((afterData || []).length === CONFESSIONS_PER_PAGE);

        } catch (error: any) {
          console.error("Error loading initial batch for detail page:", error);
          toast.error("Failed to load confession details: " + error.message);
          navigate("/", { replace: true });
        } finally {
          setLoading(false);
        }
      };

      loadInitialData();
    }
  }, [authLoading, id, slug, navigate, fetchConfessions]);

  // Scroll to target confession or comments section after loading
  useEffect(() => {
    if (!loading && expandedConfessionId && confessions.length > 0) {
      const targetElement = document.getElementById(expandedConfessionId);
      if (targetElement) {
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // If there's a #comments hash, scroll to comments section
          if (location.hash === '#comments') {
            const commentsSection = document.getElementById(`comments-section-${expandedConfessionId}`);
            if (commentsSection) {
              setTimeout(() => {
                commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 500); // Delay slightly after confession scrolls
            }
          }
        }, 300); // Delay to allow rendering and animations
      }
    }
  }, [loading, expandedConfessionId, confessions, location.hash]);

  // Intersection Observer for infinite scrolling (both directions)
  useEffect(() => {
    if (loading || loadingMoreBefore || loadingMoreAfter || !id) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target === topSentinelRef.current && hasMoreBefore && !loadingMoreBefore && oldestConfessionCreatedAt) {
            fetchConfessions('before', oldestConfessionCreatedAt);
          } else if (entry.target === bottomSentinelRef.current && hasMoreAfter && !loadingMoreAfter && newestConfessionCreatedAt) {
            fetchConfessions('after', newestConfessionCreatedAt);
          }
        }
      });
    }, {
      rootMargin: "200px", // Load when 200px from the edge
      // Use the pageContentRef as the root for the observer
      root: pageContentRef.current,
    });

    if (topSentinelRef.current) observer.current.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observer.current.observe(bottomSentinelRef.current);

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, loadingMoreBefore, loadingMoreAfter, hasMoreBefore, hasMoreAfter, oldestConfessionCreatedAt, newestConfessionCreatedAt, fetchConfessions, id]);

  const handleAddComment = async (confessionId: string, content: string, gender: "male" | "female" | "incognito") => {
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
            ? { ...conf, comments: [data, ...conf.comments], comment_count: conf.comment_count + 1 }
            : conf
        )
      );
      toast.success("Comment posted!");

      supabase.functions.invoke('send-comment-notification', {
        body: { confession_id: confessionId, comment_content: content },
      }).catch(err => console.error("Error invoking notification function:", err));
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

  // On the detail page, this just toggles the local expanded state
  const handleConfessionToggle = useCallback((toggledConfessionId: string) => {
    setExpandedConfessionId(currentId =>
      currentId === toggledConfessionId ? null : toggledConfessionId
    );
  }, []);

  const handleSelectCategory = useCallback((category: string) => {
    navigate(`/?category=${category}`); // Navigate back to index with category filter
  }, [navigate]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl space-y-6">
        <ConfessionCardSkeleton />
        <ConfessionCardSkeleton />
        <ConfessionCardSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl relative min-h-screen" ref={pageContentRef}>
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
      <div ref={topSentinelRef} className="h-1 w-full" /> {/* Top sentinel for infinite scroll */}
      {loadingMoreBefore && (
        <div className="space-y-6 mt-8">
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
        </div>
      )}
      {!hasMoreBefore && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Няма по-нови изповеди.</p>
      )}
      <div className="space-y-6">
        {confessions.map((conf, index) => (
          <ConfessionCard
            key={conf.id}
            confession={{
              ...conf,
              timestamp: new Date(conf.created_at),
              comments: conf.comments.map(comment => ({
                ...comment,
                timestamp: new Date(comment.created_at)
              }))
            }}
            onAddComment={handleAddComment}
            onLikeConfession={handleLikeConfession}
            onFetchComments={handleFetchComments}
            isContentOpen={conf.id === expandedConfessionId} // Controlled by local state
            onToggleExpand={handleConfessionToggle} // Local toggle
            animationDelay={200 + (index * 100)} // Stagger animation
            onSelectCategory={handleSelectCategory}
          />
        ))}
      </div>
      {loadingMoreAfter && (
        <div className="space-y-6 mt-8">
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
        </div>
      )}
      <div ref={bottomSentinelRef} className="h-1 w-full" /> {/* Bottom sentinel for infinite scroll */}
      {!hasMoreAfter && confessions.length > 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Това са всички изповеди.</p>
      )}
      <ComposeButton isVisible={isComposeButtonVisible} onClick={handleComposeClick} />
    </div>
  );
};

export default ConfessionDetail;