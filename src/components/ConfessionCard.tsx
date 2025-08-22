import React, { useState, useEffect, useRef, forwardRef } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageCircle, Heart } from "lucide-react";
import GenderAvatar from "./GenderAvatar";
import CommentCard from "./CommentCard";
import CommentForm from "./CommentForm";
import { formatDistanceToNow } from "date-fns";
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
    id: string;
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
  
  const cardRootRef = useRef<HTMLDivElement>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const commentsListRef = useRef<HTMLDivElement>(null);
  const prevVisibleCountRef = useRef(COMMENTS_PER_PAGE);
  const isInitialMount = useRef(true);

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
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isContentOpen) {
      if (isCommentsOpen) {
        const timer = setTimeout(() => {
          commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          cardRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [isContentOpen, isCommentsOpen]);

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
      setIsCommentsOpen(true);
    }
  };

  const handleToggleComments = async () => {
    const willBeOpen = !isCommentsOpen;

    if (willBeOpen && !isContentOpen) {
      onToggleExpand(confession.id);
    }

    if (willBeOpen && confession.comments.length === 0 && confession.comment_count > 0) {
      setIsFetchingComments(true);
      await onFetchComments(confession.id);
      setIsFetchingComments(false);
    }

    setIsCommentsOpen(willBeOpen);
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
  const linkColor = "text-gray-600 dark:text-gray-400";

  return (
    <div ref={cardRootRef} className="w-full max-w-2xl mx-auto mb-6 opacity-0 animate-fade-zoom-in" style={{ animationDelay: `${animationDelay}ms` }}>
      <div className="flex items-start space-x-3">
        <GenderAvatar gender={confession.gender} className="h-10 w-10 flex-shrink-0 mt-2" />
        <div className={cn("flex-1 p-4 rounded-xl shadow-md relative", bubbleBackgroundColor)}>
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
          <div className="flex justify-between items-center mb-2">
            <Button
              variant="link"
              className="flex items-center space-x-0.5 p-0 h-auto text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors hover:no-underline"
              onClick={handleToggleComments}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{confession.comment_count}</span>
            </Button>
            <Button
              variant="link"
              className="flex items-center space-x-0.5 p-0 h-auto text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors hover:no-underline"
              onClick={() => onLikeConfession(confession.id)}
            >
              <Heart className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{confession.likes}</span>
            </Button>
          </div>

          <Collapsible open={isContentOpen} onOpenChange={() => onToggleExpand(confession.id)}>
            <div className="flex items-center justify-between space-x-4 mb-2">
              <CollapsibleTrigger asChild>
                <Button variant="link" className={cn("p-0 h-auto text-left text-xl font-semibold hover:no-underline", textColor)}>
                  <TypingText text={confession.title} delay={animationDelay + 300} speed={30} className="block" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {isContentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">Toggle confession content</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-4 pt-2">
              <p className={cn("whitespace-pre-wrap", textColor)}>{confession.content}</p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {isContentOpen && (
        <div className="ml-14 mt-4" ref={commentsSectionRef}>
          <Collapsible open={isCommentsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="link" className={cn("w-full justify-start p-0 h-auto", linkColor)} onClick={handleToggleComments}>
                {isCommentsOpen ? "Hide" : "Show"} comments ({confession.comment_count})
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
                        Load More Comments
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