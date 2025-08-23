import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ConfessionCard from "@/components/ConfessionCard";
import ConfessionCardSkeleton from "@/components/ConfessionCardSkeleton";
import { toast } from "sonner";
import { useSessionContext } from "@/components/SessionProvider";
import { cn } from "@/lib/utils";

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

  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver>();

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
    <div className="container mx-auto p-4 max-w-3xl">
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
    </div>
  );
};

export default ConfessionDetail;