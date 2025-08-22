import React, { useState, useEffect, useRef } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageCircle, Heart } from "lucide-react";
import GenderAvatar from "./GenderAvatar";
import CommentCard from "./CommentCard";
import CommentForm from "./CommentForm";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  gender: "male" | "female";
  timestamp: Date;
}

interface ConfessionCardProps {
  confession: {
    id: string;
    title: string;
    content: string;
    gender: "male" | "female";
    timestamp: Date;
    comments: Comment[];
    likes: number;
  };
  onAddComment: (confessionId: string, content: string, gender: "male" | "female") => void;
  onLikeConfession: (confessionId: string) => void;
  isContentOpen: boolean;
  onToggleExpand: (confessionId: string) => void;
}

const ConfessionCard: React.FC<ConfessionCardProps> = ({
  confession,
  onAddComment,
  onLikeConfession,
  isContentOpen,
  onToggleExpand,
}) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isContentOpen) {
      // Allow layout to settle after other cards collapse before scrolling
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250); // Corresponds to collapse animation duration
      return () => clearTimeout(timer);
    }
  }, [isContentOpen]);

  useEffect(() => {
    if (isContentOpen && isCommentsOpen) {
      const timer = setTimeout(() => {
        commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCommentsOpen, isContentOpen]);

  // If the card is collapsed by the parent, ensure its comments are also collapsed
  useEffect(() => {
    if (!isContentOpen) {
      setIsCommentsOpen(false);
    }
  }, [isContentOpen]);

  const handleAddComment = (content: string, gender: "male" | "female") => {
    onAddComment(confession.id, content, gender);
    setIsCommentsOpen(true);
  };

  const handleToggleComments = () => {
    if (!isContentOpen) {
      onToggleExpand(confession.id);
    }
    setIsCommentsOpen(prev => !prev);
  };

  const handleContentOpenChange = () => {
    onToggleExpand(confession.id);
  };

  const bubbleBackgroundColor =
    confession.gender === "male"
      ? "bg-blue-100 dark:bg-blue-950"
      : "bg-pink-100 dark:bg-pink-950";

  const textColor = "text-gray-800 dark:text-gray-200";
  const linkColor = "text-gray-600 dark:text-gray-400";

  const sortedComments = [...confession.comments].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="w-full max-w-2xl mx-auto mb-6" ref={cardRef}>
      <div className="flex items-start space-x-3">
        <GenderAvatar gender={confession.gender} className="h-10 w-10 flex-shrink-0 mt-2" />
        <div className={cn("flex-1 p-4 rounded-xl shadow-md relative", bubbleBackgroundColor)}>
          <div
            className={cn(
              "absolute top-3 -left-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
              confession.gender === "male"
                ? "border-r-blue-100 dark:border-r-blue-950"
                : "border-r-pink-100 dark:border-r-pink-950"
            )}
          ></div>

          <div className="flex justify-between items-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex items-center space-x-1 p-0 h-auto", linkColor)}
              onClick={handleToggleComments}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{confession.comments.length}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex items-center space-x-1 p-0 h-auto", linkColor)}
              onClick={() => onLikeConfession(confession.id)}
            >
              <Heart className="h-4 w-4" />
              <span className="text-sm">{confession.likes}</span>
            </Button>
          </div>

          <Collapsible open={isContentOpen} onOpenChange={handleContentOpenChange}>
            <div className="flex items-center justify-between space-x-4 mb-2">
              <CollapsibleTrigger asChild>
                <Button variant="link" className={cn("p-0 h-auto text-left text-lg font-semibold hover:no-underline", textColor)}>
                  {confession.title}
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
          <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="link" className={cn("w-full justify-start p-0 h-auto", linkColor)}>
                See all comments ({confession.comments.length})
                {isCommentsOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <CommentForm onSubmit={handleAddComment} />
              {sortedComments.length === 0 ? (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No comments yet. Be the first!</p>
              ) : (
                sortedComments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
};

export default ConfessionCard;