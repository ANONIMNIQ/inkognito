import React, { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  };
  onAddComment: (confessionId: string, content: string, gender: "male" | "female") => void;
}

const ConfessionCard: React.FC<ConfessionCardProps> = ({ confession, onAddComment }) => {
  const [isContentOpen, setIsContentOpen] = useState(false); // State for main confession content
  const [isCommentsOpen, setIsCommentsOpen] = useState(false); // State for comments section

  const handleAddComment = (content: string, gender: "male" | "female") => {
    onAddComment(confession.id, content, gender);
  };

  const bubbleBackgroundColor =
    confession.gender === "male"
      ? "bg-blue-100 dark:bg-blue-950"
      : "bg-pink-100 dark:bg-pink-950";

  const textColor =
    confession.gender === "male"
      ? "text-blue-900 dark:text-blue-100"
      : "text-pink-900 dark:text-pink-100";

  const linkColor =
    confession.gender === "male"
      ? "text-blue-600 dark:text-blue-400"
      : "text-pink-600 dark:text-pink-400";

  // Sort comments by timestamp, newest first
  const sortedComments = [...confession.comments].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="w-full max-w-2xl mx-auto mb-6"> {/* Overall container for confession and its comments */}
      {/* Main Confession Bubble */}
      <div className="flex items-start space-x-3">
        <GenderAvatar gender={confession.gender} className="h-10 w-10 flex-shrink-0 mt-2" />
        <div className={cn("flex-1 p-4 rounded-xl shadow-md relative", bubbleBackgroundColor)}>
          {/* Speech bubble tail */}
          <div
            className={cn(
              "absolute top-3 -left-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
              confession.gender === "male"
                ? "border-r-blue-100 dark:border-r-blue-950"
                : "border-r-pink-100 dark:border-r-pink-950"
            )}
          ></div>

          <Collapsible open={isContentOpen} onOpenChange={setIsContentOpen}>
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

      {/* Comments Section - threaded outside the main bubble, only visible when content is open */}
      {isContentOpen && (
        <div className="ml-14 mt-4"> {/* Indent comments section to align with main bubble content */}
          <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="link" className={cn("w-full justify-start p-0 h-auto", linkColor)}>
                See all comments ({confession.comments.length})
                {isCommentsOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <CommentForm onSubmit={handleAddComment} /> {/* Moved to the top */}
              {sortedComments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet. Be the first!</p>
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