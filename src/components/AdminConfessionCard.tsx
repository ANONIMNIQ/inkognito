import React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageCircle, Heart } from "lucide-react";
import GenderAvatar from "./GenderAvatar";
import CommentCard from "./CommentCard";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  confession_id: string;
  content: string;
  gender: "male" | "female";
  created_at: string;
}

interface Confession {
  id: string;
  title: string;
  content: string;
  gender: "male" | "female";
  likes: number;
  created_at: string;
  comments: Comment[];
}

interface AdminConfessionCardProps {
  confession: Confession;
}

const AdminConfessionCard: React.FC<AdminConfessionCardProps> = ({ confession }) => {
  const [isContentOpen, setIsContentOpen] = React.useState(true); // Default open for admin review
  const [isCommentsOpen, setIsCommentsOpen] = React.useState(true); // Default open for admin review

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
  const sortedComments = [...confession.comments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
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
            <div className={cn("flex items-center space-x-1 p-0 h-auto", linkColor)}>
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">{confession.comments.length}</span>
            </div>
            <div className={cn("flex items-center space-x-1 p-0 h-auto", linkColor)}>
              <Heart className="h-4 w-4" />
              <span className="text-sm">{confession.likes}</span>
            </div>
          </div>

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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Posted {formatDistanceToNow(new Date(confession.created_at), { addSuffix: true })}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      <div className="ml-14 mt-4">
        <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="link" className={cn("w-full justify-start p-0 h-auto", linkColor)}>
              See all comments ({confession.comments.length})
              {isCommentsOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {sortedComments.length === 0 ? (
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No comments yet.</p>
            ) : (
              sortedComments.map((comment) => (
                <CommentCard key={comment.id} comment={{ ...comment, timestamp: new Date(comment.created_at) }} />
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default AdminConfessionCard;