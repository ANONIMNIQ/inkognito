import React, { useState, useEffect, useRef, forwardRef, Ref, useCallback } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageCircle, Heart, Share2 } from "lucide-react"; // Removed Bot icon
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
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

const COMMENTS_PER_PAGE = 5;

interface Comment {
  id: string;
  confession_id: string;
  content: string;
  gender: "male" | "female" | "incognito" | "ai";
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
  slug: string;
}

interface ConfessionCardProps {
  confession: Confession;
  onAddComment: (confessionId: string, content: string, gender: "male" | "female" | "incognito") => void;
  onLikeConfession: (confessionId: string) => void;
  onFetchComments: (confessionId: string) => Promise<void>;
  isContentOpen: boolean;
  isDirectLinkTarget?: boolean;
  onToggleExpand: (confessionId: string, slug: string) => void;
  onSelectCategory: (category: string) => void;
  shouldOpenCommentsOnLoad?: boolean;
}

const ConfessionCard = forwardRef<HTMLDivElement, ConfessionCardProps>(({
  confession,
  onAddComment,
  onLikeConfession,
  onFetchComments,
  isContentOpen,
  isDirectLinkTarget = false,
  onToggleExpand,
  onSelectCategory,
  shouldOpenCommentsOnLoad = false,
}, ref: Ref<HTMLDivElement>) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENTS_PER_PAGE);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [isFetchingComments, setIsFetchingComments] = useState(false);
  
  const cardRootRef = useRef<HTMLDivElement>(null);
  const commentsListRef = useRef<HTMLDivElement>(null);
  const commentsToggleRef = useRef<HTMLButtonElement>(null);
  const prevVisibleCountRef = useRef(COMMENTS_PER_PAGE);
  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    if (isContentOpen) {
      setTimeout(() => {
        cardRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [isContentOpen]);

  useEffect(() => {
    if (!isContentOpen) {
      setIsCommentsOpen(false);
    }
  }, [isContentOpen]);

  // Effect to open comments if shouldOpenCommentsOnLoad is true
  useEffect(() => {
    if (isContentOpen && shouldOpenCommentsOnLoad && !isCommentsOpen) {
      handleToggleCommentsLocal(true); // Pass true to force open and add hash
      // Scroll to comments section after it opens
      setTimeout(() => {
        document.getElementById(`comments-section-${confession.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600); // Give time for collapsible to open
    }
  }, [isContentOpen, shouldOpenCommentsOnLoad, isCommentsOpen, confession.id]);


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

  const handleAddCommentLocal = (content: string, gender: "male" | "female" | "incognito") => {
    onAddComment(confession.id, content, gender);
    if (!isCommentsOpen) {
      handleToggleCommentsLocal();
    }
  };

  const handleToggleCommentsLocal = async (forceOpen: boolean = false) => {
    // If the main confession content is not open, navigate to its dedicated page with #comments
    if (!isContentOpen && !forceOpen) {
      navigate(`/confessions/${confession.id}/${confession.slug}#comments`);
      return; // Exit early, let the navigation and subsequent render handle the rest
    }

    // If the main confession content IS open, then we just toggle comments locally
    const willBeOpen = forceOpen || !isCommentsOpen;
    setIsCommentsOpen(willBeOpen);

    if (willBeOpen) {
      if (confession.comments.length === 0 && confession.comment_count > 0) {
        setIsFetchingComments(true);
        await onFetchComments(confession.id);
        setIsFetchingComments(false);
      }
      setTimeout(() => {
        commentsToggleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600);
      // Add #comments to URL if not already there
      if (location.hash !== '#comments') {
        navigate(location.pathname + location.search + '#comments', { replace: true });
      }
    } else {
      setTimeout(() => {
        cardRootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
      // Remove #comments from URL if present
      if (location.hash === '#comments') {
        navigate(location.pathname + location.search, { replace: true });
      }
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

  const handleShareConfession = () => {
    const confessionLink = `${window.location.origin}/confessions/${confession.id}/${confession.slug}`;
    navigator.clipboard.writeText(confessionLink)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link."));
  };

  const handleShareComments = () => {
    const commentsLink = `${window.location.origin}/confessions/${confession.id}/${confession.slug}#comments`;
    navigator.clipboard.writeText(commentsLink)
      .then(() => toast.success("Comments link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link."));
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
    <div
      id={confession.id}
      ref={cardRootRef}
      className="w-full max-w-2xl mx-auto mb-6"
    >
      <div className={cn("flex items-start", isMobile ? "space-x-0" : "space-x-3")}>
        {!isMobile && (
          <div className="opacity-0 animate-fade-in">
            <GenderAvatar gender={confession.gender} className="h-10 w-10 flex-shrink-0 mt-2" />
          </div>
        )}
        <div 
          className={cn("flex-1 p-4 rounded-xl shadow-md relative min-w-0 opacity-0 animate-fade-zoom-in", bubbleBackgroundColor, isMobile ? "ml-0" : "")}
        >
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
              onClick={() => handleToggleCommentsLocal()}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="link"
                  className="flex items-center p-0 h-auto text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white transition-colors hover:no-underline"
                  aria-label="Сподели"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium ml-1">Сподели</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShareConfession}>
                  Сподели линк към историята
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareComments}>
                  Сподели линк към коментарите
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Collapsible open={isContentOpen} onOpenChange={() => onToggleExpand(confession.id, confession.slug)}>
            <div className="flex items-center justify-between space-x-4 mb-2">
              <CollapsibleTrigger asChild>
                <Link
                  to={`/confessions/${confession.id}/${confession.slug}`}
                  className={cn(
                    "p-0 h-auto text-left text-lg md:text-xl font-semibold hover:no-underline font-serif transition-colors justify-start min-w-0 flex-1",
                    isContentOpen
                      ? textColor
                      : [linkColor, "hover:text-gray-800 dark:hover:text-gray-200"]
                  )}
                >
                  <span className={cn("block w-full", isContentOpen ? "whitespace-pre-wrap" : "truncate")}>
                    {confession.title}
                  </span>
                </Link>
              </CollapsibleTrigger>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white hover:bg-transparent dark:hover:bg-transparent">
                  {isContentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">Toggle confession content</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-4 pt-2">
              <p className={cn("whitespace-pre-wrap font-serif text-lg md:text-base", textColor)}>{confession.content}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                Публикувано на {format(confession.timestamp, "dd MMMM yyyy 'г.'", { locale: bg })}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {isContentOpen && (
        <div id={`comments-section-${confession.id}`} className={cn("mt-4", isMobile ? "ml-0" : "ml-14")}>
          <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
            <div className="flex justify-between items-center">
              <CollapsibleTrigger asChild>
                <Button ref={commentsToggleRef} variant="link" className={cn("p-0 h-auto", linkColor)} onClick={() => handleToggleCommentsLocal()}>
                  {isCommentsOpen ? "Скрий коментарите" : "Покажи коментарите"} ({confession.comment_count})
                  {isCommentsOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              {isCommentsOpen && (
                <TypingText
                  text={`"${confession.title}"`}
                  speed={30}
                  className="font-serif text-sm font-semibold text-gray-500 dark:text-gray-400 truncate ml-4 flex-shrink min-w-0"
                  maxAnimateLength={50}
                />
              )}
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
                    <CommentForm onSubmit={handleAddCommentLocal} hideAvatarOnMobile={true} />
                  </div>
                  <div ref={commentsListRef} className="space-y-3">
                    {confession.comments.slice(0, visibleCommentsCount).map((comment, index) => (
                      <CommentCard 
                        key={comment.id} 
                        comment={comment} 
                        animationDelay={(index + 1) * 100} 
                        hideAvatarOnMobile={true} 
                        commentNumber={confession.comments.length - index} // Calculate comment number backwards
                      />
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