import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ConfessionCard from "@/components/ConfessionCard";
import ConfessionCardSkeleton from "@/components/ConfessionCardSkeleton";
import { toast } from "sonner";
import { useSessionContext } from "@/components/SessionProvider";
import { cn } from "@/lib/utils";

const CONFESSIONS_PER_PAGE = 10;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreBefore, setHasMoreBefore] = useState(false);
  const [hasMoreAfter, setHasMoreAfter] = useState(false);
  const [targetConfessionId, setTargetConfessionId] = useState<string | null>(null);
  const [targetConfessionIndex, setTargetConfessionIndex] = useState<number>(-1);
  const [currentPageOffset, setCurrentPageOffset] = useState(0); // The page offset for the current batch

  const observer = useRef<IntersectionObserver>();
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const fetchConfessionsBatch = useCallback(async (offset: number, limit: number, initialLoad: boolean, targetId: string | null = null) => {
    if (initialLoad) setLoading(true);
    else setLoadingMore(true);

    try {
      let query = supabase
        .from("confessions")
        .select("id, title, content, gender, likes, created_at, category, slug, comments(count)")
        .order("created_at", { ascending: false });

      const { data: confessionsData, error: confessionsError } = await query.range(offset, offset + limit - 1);

      if (confessionsError) {
        throw confessionsError;
      }

      const confessionsWithCommentCount = confessionsData.map((c: any) => ({
        ...c,
        comment_count: c.comments[0]?.count || 0,
        comments: [],
      }));

      if (initialLoad) {
        setConfessions(confessionsWithCommentCount);
      } else {
        setConfessions((prev) => {
          const newConfessions = [...prev];
          confessionsWithCommentCount.forEach(newConf => {
            if (!newConfessions.some(existingConf => existingConf.id === newConf.id)) {
              newConfessions.push(newConf);
            }
          });
          // Sort to maintain chronological order if new items were inserted in between
          return newConfessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
      }

      // Determine if there are more confessions before/after the current loaded set
      const { count: totalCount, error: countError } = await supabase
        .from("confessions")
        .select("count", { count: "exact" });

      if (countError) throw countError;

      const currentLoadedIds = new Set(confessions.map(c => c.id));
      confessionsWithCommentCount.forEach(c => currentLoadedIds.add(c.id));

      setHasMoreBefore(offset > 0);
      setHasMoreAfter((offset + limit) < (totalCount || 0));

    } catch (error: any) {
      console.error("Error fetching confessions batch:", error);
      toast.error("Error fetching confessions: " + error.message);
    } finally {
      if (initialLoad) setLoading(false);
      else setLoadingMore(false);
    }
  }, [confessions]); // Include confessions in dependency array to ensure accurate `currentLoadedIds`

  const loadInitialBatch = useCallback(async () => {
    if (!id) return;

    setLoading(true);
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

      // 2. Determine its position to calculate the batch offset
      const { count: confessionsBeforeCount, error: countError } = await supabase
        .from("confessions")
        .select("count", { count: "exact" })
        .lt("created_at", targetConfession.created_at); // Count confessions created AFTER (i.e., newer)

      if (countError) throw countError;

      const targetIndexInFullList = confessionsBeforeCount || 0;
      const targetPage = Math.floor(targetIndexInFullList / CONFESSIONS_PER_PAGE);
      const initialOffset = Math.max(0, targetPage * CONFESSIONS_PER_PAGE);

      setCurrentPageOffset(initialOffset);
      setTargetConfessionId(id);

      // Load the batch containing the target confession
      await fetchConfessionsBatch(initialOffset, CONFESSIONS_PER_PAGE, true, id);

    } catch (error: any) {
      console.error("Error loading initial batch for detail page:", error);
      toast.error("Failed to load confession details: " + error.message);
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, slug, navigate, fetchConfessionsBatch]);

  useEffect(() => {
    if (!authLoading && id) {
      loadInitialBatch();
    }
  }, [authLoading, id, loadInitialBatch]);

  // Scroll to target confession or comments section after loading
  useEffect(() => {
    if (!loading && targetConfessionId && confessions.length > 0) {
      const targetElement = document.getElementById(targetConfessionId);
      if (targetElement) {
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // If there's a #comments hash, scroll to comments section
          if (location.hash === '#comments') {
            const commentsSection = document.getElementById(`comments-section-${targetConfessionId}`);
            if (commentsSection) {
              setTimeout(() => {
                commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 500); // Delay slightly after confession scrolls
            }
          }
        }, 300); // Delay to allow rendering and animations
      }
      // Find the index of the target confession in the current state
      const index = confessions.findIndex(c => c.id === targetConfessionId);
      setTargetConfessionIndex(index);
    }
  }, [loading, targetConfessionId, confessions, location.hash]);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (loading || loadingMore || !id) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target === topSentinelRef.current && hasMoreBefore) {
            // Load previous batch
            const newOffset = Math.max(0, currentPageOffset - CONFESSIONS_PER_PAGE);
            if (newOffset !== currentPageOffset) {
              setCurrentPageOffset(newOffset);
              fetchConfessionsBatch(newOffset, CONFESSIONS_PER_PAGE, false);
            }
          } else if (entry.target === bottomSentinelRef.current && hasMoreAfter) {
            // Load next batch
            const newOffset = currentPageOffset + CONFESSIONS_PER_PAGE;
            setCurrentPageOffset(newOffset);
            fetchConfessionsBatch(newOffset, CONFESSIONS_PER_PAGE, false);
          }
        }
      });
    }, {
      rootMargin: "200px", // Load when 200px from the edge
    });

    if (topSentinelRef.current) observer.current.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observer.current.observe(bottomSentinelRef.current);

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, loadingMore, hasMoreBefore, hasMoreAfter, currentPageOffset, fetchConfessionsBatch, id]);

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

  const handleConfessionToggle = useCallback((toggledConfessionId: string) => {
    setTargetConfessionId(currentId =>
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
    <div className="container mx-auto p-4 max-w-3xl">
      <div ref={topSentinelRef} className="h-1 w-full" /> {/* Top sentinel for infinite scroll */}
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
            isContentOpen={conf.id === targetConfessionId}
            onToggleExpand={handleConfessionToggle}
            animationDelay={200 + (index * 100)} // Stagger animation
            onSelectCategory={handleSelectCategory}
          />
        ))}
      </div>
      {loadingMore && (
        <div className="space-y-6 mt-8">
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
          <ConfessionCardSkeleton />
        </div>
      )}
      <div ref={bottomSentinelRef} className="h-1 w-full" /> {/* Bottom sentinel for infinite scroll */}
      {!hasMoreAfter && confessions.length > 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Това са всички изповеди.</p>
      )}
    </div>
  );
};

export default ConfessionDetail;