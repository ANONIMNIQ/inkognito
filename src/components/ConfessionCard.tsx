import React, { useState, useEffect, useRef, forwardRef } from "react";
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
  setScrollLocked: (locked: boolean) => void; // New prop
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
  setScrollLocked, // Destructure new prop
}, ref) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENTS_PER_PAGE);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [isFetchingComments, setIsFetchingComments] = useState(false);
  
  const cardRootRef = useRef<HTMLDivElement>(null);
  const commentsListRef = useRef<HTMLDivElement>(null);
  const commentsToggleRef = useRef<HTMLButtonElement>(null);
  const prevVisibleCountRef = useRef(COMMENTS_PER_PAGE);
  const prevIsContentOpen = useRef(isContentOpen);

  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(cardRootRef.current);
      } else {
        ref.current = cardRootRef.current;
      }
    }
  }, [ref]);

  useEffect(() => {
    // If the card is being opened (was closed, now is open), scroll it into view.
    if (isContentOpen && !prevIsContentOpen.current) {
      // A small delay to allow the collapsible content to start animating open
      // and to ensure the scroll feels connected to the expansion.
      setTimeout(() => {
        cardRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    // Update the ref for the next render.
    prevIsContentOpen.current = isContentOpen;
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

    if (!willBeOpen) {
      setIsCommentsOpen(false);
      cardRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      commentsToggleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const handleToggleExpandAndScrollLock = (toggledConfessionId: string) => {
    setScrollLocked(true); // Lock scroll immediately

    onToggleExpand(toggledConfessionId); // Update parent state, which will trigger Collapsible animation

    // Unlock scroll after animation duration (0.7s for accordion-up + a small buffer)
    setTimeout(() => {
      setScrollLocked(false);
    }, 750); 
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
      <div className="flex items-start space-x-3">
        <GenderAvatar gender={confession.gender} className="h-10 w-10 flex-shrink-0 mt-2" />
        
        {/* Main bubble container, now without fixed padding */}
        <div className={cn("flex-1 rounded-xl shadow-md relative min-w-0", bubbleBackgroundColor)}>
          {/* Triangle for the bubble */}
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
          
          <Collapsible open={isContentOpen} onOpenChange={() => handleToggleExpandAndScrollLock(confession.id)}>
            {/* Always visible header part of the bubble, with its own padding */}
            <div className="p-4 pb-2">
              {/* Action buttons */}
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

              {/* Title and Chevron Trigger */}
              <div className="flex items-center justify-between space-x-4">
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
            </div>

            {/* Collapsible Content for the main confession text and timestamp, with its own padding */}
            <CollapsibleContent className="space-y-4 px-4 pb-4 overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <p className={cn(
                "whitespace-pre-wrap font-serif",
                textColor,
                isContentOpen ? "animate-fade-in" : "animate-fade-out"
              )} style={{ animationDelay: isContentOpen ? '200ms' : '0ms' }}>{confession.content}</p>
              <p className={cn(
                "text-xs text-gray-500 dark:text-gray-400 mt-1 text-right",
                isContentOpen ? "animate-fade-in" : "animate-fade-out"
              )} style={{ animationDelay: isContentOpen ? '250ms' : '0ms' }}>
                Публикувано на {format(confession.timestamp, "dd MMMM yyyy 'г.'", { locale: bg })}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {isContentOpen && (
        <div className="ml-14 mt-4">
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