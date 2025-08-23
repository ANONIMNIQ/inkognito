import React, { useState, useEffect, useRef, forwardRef, Ref } from "react";
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
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useIsMobile } from "@/hooks/use-mobile";

const COMMENTS_PER_PAGE = 5; // Define the constant here

interface Comment {
  id: string;
  content: string;
  gender: "male" | "female" | "incognito";
  timestamp: Date;
}

interface Confession {
  id:string;
  title: string;
  content: string;
  gender: "male" | "female" | "incognito";
  timestamp: Date;
  comments: Comment[];
  likes: number;
  comment_count: number;
  category: string;
}

interface ConfessionCardProps {
  confession: Confession;
  onAddComment: (confessionId: string, content: string, gender: "male" | "female" | "incognito") => void;
  onLikeConfession: (confessionId: string) => void;
  onFetchComments: (confessionId: string) => Promise<void>;
  isContentOpen: boolean;
  onToggleExpand: (confessionId: string) => void;
  animationDelay?: number;
  onSelectCategory: (category: string) => void;
}

const ConfessionCard = forwardRef<HTMLDivElement, ConfessionCardProps>(({
  confession,
  onAddComment,
  onLikeConfession,
  onFetchComments,
  isContentOpen,
  onToggleExpand,
  animationDelay = 0,
  onSelectCategory,
}, ref: Ref<HTMLDivElement>) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENTS_PER_PAGE);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [isFetchingComments, setIsFetchingComments] = useState(false);
  
  const cardRootRef = useRef<HTMLDivElement>(null);
  const commentsListRef = useRef<HTMLDivElement>(null);
  const commentsToggleRef = useRef<HTMLButtonElement>(null);
  const prevVisibleCountRef = useRef(COMMENTS_PER_PAGE);

  // The useScrollLock hook is still available if needed elsewhere,
  // but we're removing its direct usage for content/comment expansion here.
  // The global scroll lock is not ideal for in-page content expansions.
  // const { lockScroll, unlockScroll } = useScrollLock(); 
  const isMobile = useIsMobile();

  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(cardRootRef.current);
      } else if (cardRootRef.current) {
        (ref as React.MutableRefObject<HTMLDivElement>).current = cardRootRef.current;
      }
    }
  }, [ref]);

  // Re-adding scrollIntoView for content expansion
  useEffect(() => {
    if (isContentOpen) {
      setTimeout(() => {
        cardRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300); // Allow animation to start before scrolling
    }
  }, [isContentOpen]);

  useEffect(() => {
    if (!isContentOpen) {
      setIsCommentsOpen(false);
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

    setIsCommentsOpen(willBeOpen);

    if (willBeOpen) {
      if (!isContentOpen) {
        onToggleExpand(confession.id);
      }

      if (confession.comments.length === 0 && confession.comment_count > 0) {
        setIsFetchingComments(true);
        await onFetchComments(confession.id);
        setIsFetchingComments(false);
      }

      setTimeout(() => {
        commentsToggleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600); // Allow animation to start before scrolling
    } else {
      setTimeout(() => {
        cardRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250); // Allow animation to start before scrolling
    }
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
      <div className={cn("flex items-start", isMobile ? "space-x-0" : "space-x-3")}>
        {!isMobile && <GenderAvatar gender={confession.gender} className="h-10 w-10 flex-shrink-0 mt-2" />}
        <div className={cn("flex-1 p-4 rounded-xl shadow-md relative min-w-0", bubbleBackgroundColor, isMobile ? "ml-0" : "")}>
          <div
            className={cn(
              "absolute top-3 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
              isMobile ? "left-2" : "-left-2",
              confession.gender === "male"
                ? "border-r-blue-100 dark:border-r-blue-950"
                : confession.gender === "female"
                ? "border-r-pink-100 dark:border-r-pink-950"
                : "border-r-gray-100 dark:border-r-gray-800"
            )}
          ></div>
          
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-auto px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            onClick={() => onSelectCategory(confession.category)}
          >
            {confession.category}
          </Button>

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
                    "p-0 h-auto text-left text-lg md:text-2xl font-semibold hover:no-underline font-serif transition-colors justify-start min-w-0 flex-1", // Smaller title on mobile, larger on desktop
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
              <p className={cn("whitespace-pre-wrap font-serif text-lg md:text-xl", textColor)}>{confession.content}</p> {/* Base text on mobile, larger on desktop */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                Публикувано на {format(confession.timestamp, "dd MMMM yyyy 'г.'", { locale: bg })}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {isContentOpen && (
        <div className={cn("mt-4", isMobile ? "ml-0" : "ml-14")}>
          <Collapsible open={isCommentsOpen}>
            <div className="flex justify-between items-center min-w-0">
              <CollapsibleTrigger asChild>
                <Button ref={commentsToggleRef} variant="link" className={cn("justify-start p-0 h-auto flex-shrink-0", linkColor)} onClick={handleToggleComments}>
                  {isCommentsOpen ? "Скрий коментарите" : "Покажи коментарите"} ({confession.comment_count})
                  {isCommentsOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <p className={cn(
                "text-sm font-semibold font-serif text-right truncate text-gray-600 dark:text-gray-400",
                "transition-all duration-300 ease-in-out",
                isCommentsOpen ? "opacity-100 flex-1 ml-4" : "opacity-0 flex-none w-0 ml-0"
              )}>
                {confession.title}
              </p>
            </div>
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
                    <CommentForm onSubmit={handleAddComment} hideAvatarOnMobile={true} />
                  </div>
                  <div ref={commentsListRef} className="space-y-3">
                    {confession.comments.slice(0, visibleCommentsCount).map((comment, index) => (
                      <CommentCard key={comment.id} comment={comment} animationDelay={(index + 1) * 100} hideAvatarOnMobile={true} />
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