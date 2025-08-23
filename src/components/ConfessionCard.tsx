import React, { useState, useEffect, useRef, forwardRef } from "react";
import { createPortal } from "react-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageCircle, Heart } from "lucide-react";
import GenderAvatar from "./GenderAvatar";
import CommentCard from "./CommentCard";
import CommentForm from "./CommentForm";
import { format } from "date-fns";
import { bg } from "date-fns/locale";
import { cn } from "@/lib/utils";
import TypingText from "./TypingText";
import CommentCardSkeleton from "./CommentCardSkeleton";

interface Comment {
  id: string;
  content: string;
  gender: "male" | "female" | "incognito";
  timestamp: Date;
}

interface ConfessionCardProps {
  confession: {
    id:string;
    title: string;
    content: string;
    gender: "male" | "female" | "incognito";
    timestamp: Date;
    comments: Comment[];
    likes: number;
    comment_count: number;
  };
  onAddComment: (confessionId: string, content: string, gender: "male" | "female" | "incognito") => void;
  onLikeConfession: (confessionId: string) => void;
  onFetchComments: (confessionId: string) => Promise<void>;
  isContentOpen: boolean;
  onToggleExpand: (confessionId: string) => void;
  animationDelay?: number;
}

const COMMENTS_PER_PAGE = 10;

const ConfessionCard = forwardRef<HTMLDivElement, ConfessionCardProps>(({
  confession,
  onAddComment,
  onLikeConfession,
  onFetchComments,
  isContentOpen,
  onToggleExpand,
  animationDelay = 0,
}, ref) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENTS_PER_PAGE);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [isFetchingComments, setIsFetchingComments] = useState(false);
  const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(false);
  const [headerStyle, setHeaderStyle] = useState<React.CSSProperties>({});
  const [isScrolling, setIsScrolling] = useState(false);
  
  const cardRootRef = useRef<HTMLDivElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const commentsListRef = useRef<HTMLDivElement>(null);
  const commentsToggleRef = useRef<HTMLButtonElement>(null);
  const prevVisibleCountRef = useRef(COMMENTS_PER_PAGE);
  const autoScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(cardRootRef.current);
      } else {
        ref.current = cardRootRef.current;
      }
    }
  }, [ref]);

  // Effect to dynamically position the sticky header
  useEffect(() => {
    const updateHeaderPosition = () => {
      if (commentsContainerRef.current) {
        const rect = commentsContainerRef.current.getBoundingClientRect();
        setHeaderStyle({
          left: `${rect.left}px`,
          width: `${rect.width}px`,
        });
      }
    };

    if (isStickyHeaderVisible) {
      updateHeaderPosition();
      window.addEventListener('resize', updateHeaderPosition);
      window.addEventListener('scroll', updateHeaderPosition, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', updateHeaderPosition);
      window.removeEventListener('scroll', updateHeaderPosition);
    };
  }, [isStickyHeaderVisible]);

  // Effect for scroll detection to hide header while scrolling
  useEffect(() => {
    if (!isStickyHeaderVisible) {
      return;
    }

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 300); // Match this with the transition duration
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isStickyHeaderVisible]);

  useEffect(() => {
    if (!isContentOpen) {
      setIsCommentsOpen(false);
      setIsStickyHeaderVisible(false);
    }
  }, [isContentOpen]);

  useEffect(() => {
    if (!isLoadingMoreComments && visibleCommentsCount > prevVisibleCountRef.current) {
      const firstNewCommentIndex = prevVisibleCountRef.current;
      const commentElements = commentsListRef.current?.children;
      if (commentElements && commentElements[firstNewCommentIndex]) {
        setTimeout(() => {
          (commentElements[firstNewCommentIndex] as HTMLElement).scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 100);
      }
    }
  }, [visibleCommentsCount, isLoadingMoreComments]);

  const handleAddComment = (content: string, gender: "male" | "female" | "incognito") => {
    onAddComment(confession.id, content, gender);
    if (!isCommentsOpen) {
      handleToggleComments();
    }
  };

  const handleToggleComments = async () => {
    const willBeOpen = !isCommentsOpen;

    if (!willBeOpen) {
      setIsCommentsOpen(false);
      setIsStickyHeaderVisible(false);
      if (autoScrollTimeout.current) {
        clearTimeout(autoScrollTimeout.current);
      }
      return;
    }

    setIsCommentsOpen(true);

    if (!isContentOpen) {
      onToggleExpand(confession.id);
    }

    if (confession.comments.length === 0 && confession.comment_count > 0) {
      setIsFetchingComments(true);
      await onFetchComments(confession.id);
      setIsFetchingComments(false);
    }

    setTimeout(() => {
      if (autoScrollTimeout.current) {
        clearTimeout(autoScrollTimeout.current);
      }

      commentsToggleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      const scrollAnimationDuration = 800;
      autoScrollTimeout.current = setTimeout(() => {
        setIsStickyHeaderVisible(true);
      }, scrollAnimationDuration);
    }, 100);
  };

  const handleLoadMoreComments = () => {
    prevVisibleCountRef.current = visibleCommentsCount;
    setIsLoadingMoreComments(true);
    setTimeout(() => {
      setVisibleCommentsCount(prev => prev + COMMENTS_PER_PAGE);
      setIsLoadingMoreComments(false);
    }, 500);
  };

  const bubbleBackgroundColor =
    confession.gender === "male"
      ? "bg-blue-100 dark:bg-blue-950"
      : confession.gender === "female"
      ? "bg-pink-100 dark:bg-pink-950"
      : "bg-gray-100 dark:bg-gray-800";

  const textColor = "text-gray-800 dark:text-gray-200";
  const linkColor = "text-gray-500 dark:text-gray-400";

  return (
    <div ref={cardRootRef} className="w-full max-w-2xl mx-auto mb-6 opacity-0 animate-fade-zoom-in" style={{ animationDelay: `${animationDelay}ms` }}>
      {createPortal(
        <div
          style={headerStyle}
          className={cn(
            "fixed top-0 z-20 px-4",
            "flex items-center justify-end py-1",
            "pointer-events-none",
            "transition-all duration-300 ease-out",
            isStickyHeaderVisible && !isScrolling
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2"
          )}
        >
          <div className="w-2/3 text-right min-w-0">
            <p className="font-serif text-sm font-semibold truncate text-foreground">
              {confession.title}
            </p>
          </div>
        </div>,
        document.body
      )}

      <div className="flex items-start space-x-3">
        <GenderAvatar gender={confession.gender} className="h-10 w-10 flex-shrink-0 mt-2" />
        <div className={cn("flex-1 p-4 rounded-xl shadow-md relative min-w-0", bubbleBackgroundColor)}>
          <div
            className={cn(
              "absolute top-3 -left-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
              confession.gender === "male"
                ? "border-r-blue-100 dark:border-r-blue-950"
                : confession.gender === "female"
                ? "border-r-pink-100 dark:border-r-pink-950"
                : "border-r-gray-100 dark:border-r-gray-800"
            )}
          ></div>
          
          <div className="flex items-center space-x-4 mb-2">
            <Button
              variant="link"
              className="flex items-center p-0 h-auto text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white transition-colors hover:no-underline"
              onClick={handleToggleComments}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium ml-1">{confession.comment_count}</span>
            </Button>
            <Button
              variant="link"
              className="flex items-center p-0 h-auto text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white transition-colors hover:no-underline"
              onClick={() => onLikeConfession(confession.id)}
            >
              <Heart className="h-3.5 w-3.5" />
              <span className="text-xs font-medium ml-1">{confession.likes}</span>
            </Button>
          </div>

          <Collapsible open={isContentOpen} onOpenChange={() => onToggleExpand(confession.id)}>
            <div className="flex items-center justify-between space-x-4 mb-2">
              <CollapsibleTrigger asChild>
                <Button
                  variant="link"
                  className={cn(
                    "p-0 h-auto text-left text-2xl font-semibold hover:no-underline font-serif transition-colors justify-start min-w-0 flex-1",
                    isContentOpen
                      ? textColor
                      : [linkColor, "hover:text-gray-800 dark:hover:text-gray-200"]
                  )}
                >
                  <TypingText
                    text={confession.title}
                    delay={animationDelay + 300}
                    speed={30}
                    className={cn(
                      "w-full",
                      isContentOpen ? "whitespace-pre-wrap" : "truncate"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white hover:bg-transparent dark:hover:bg-transparent">
                  {isContentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">Toggle confession content</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-4 pt-2">
              <p className={cn("whitespace-pre-wrap font-serif", textColor)}>{confession.content}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                Публикувано на {format(confession.timestamp, "dd MMMM yyyy 'г.'", { locale: bg })}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {isContentOpen && (
        <div ref={commentsContainerRef} className="ml-14 mt-4">
          <Collapsible open={isCommentsOpen}>
            <CollapsibleTrigger asChild>
              <Button ref={commentsToggleRef} variant="link" className={cn("w-full justify-start p-0 h-auto", linkColor)} onClick={handleToggleComments}>
                {isCommentsOpen ? "Скрий коментарите" : "Покажи коментарите"} ({confession.comment_count})
                {isCommentsOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {isFetchingComments ? (
                <>
                  <CommentCardSkeleton />
                  <CommentCardSkeleton />
                  <CommentCardSkeleton />
                </>
              ) : (
                <>
                  <div className="opacity-0 animate-fade-zoom-in" style={{ animationDelay: '0ms' }}>
                    <CommentForm onSubmit={handleAddComment} />
                  </div>
                  <div ref={commentsListRef} className="space-y-3">
                    {confession.comments.slice(0, visibleCommentsCount).map((comment, index) => (
                      <CommentCard key={comment.id} comment={comment} animationDelay={(index + 1) * 100} />
                    ))}
                  </div>
                  {isLoadingMoreComments && (
                    <>
                      <CommentCardSkeleton />
                      <CommentCardSkeleton />
                    </>
                  )}
                  {confession.comments.length > visibleCommentsCount && !isLoadingMoreComments && (
                    <div className="text-center">
                      <Button
                        variant="link"
                        className={linkColor}
                        onClick={handleLoadMoreComments}
                      >
                        Покажи по-стари коментари
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
});

export default ConfessionCard;