import React from "react";
import GenderAvatar from "./GenderAvatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea"; // Import Textarea

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    gender: "male" | "female";
    timestamp: Date;
  };
  isEditing?: boolean; // New prop to indicate if comment is being edited
  editedContent?: string; // New prop for edited content
  onContentChange?: (content: string) => void; // New prop for content change handler
  animationDelay?: number; // New prop for animation delay
}

const CommentCard: React.FC<CommentCardProps> = ({ comment, isEditing = false, editedContent, onContentChange, animationDelay = 0 }) => {
  const bubbleBackgroundColor =
    comment.gender === "male"
      ? "bg-blue-50 dark:bg-blue-900"
      : "bg-pink-50 dark:bg-pink-900";

  // Updated to grey/black
  const textColor = "text-gray-800 dark:text-gray-200";

  return (
    <div className="flex items-start space-x-2 flex-1 animate-fade-zoom-in" style={{ animationDelay: `${animationDelay}ms` }}> {/* Added animation classes and style */}
      <GenderAvatar gender={comment.gender} className="h-7 w-7 flex-shrink-0 mt-1" />
      <div className={cn("flex-1 p-3 rounded-xl shadow-sm relative", bubbleBackgroundColor)}>
        {/* Speech bubble tail */}
        <div
          className={cn(
            "absolute top-2 -left-2 w-0 h-0 border-t-6 border-b-6 border-r-6 border-t-transparent border-b-transparent",
            comment.gender === "male"
              ? "border-r-blue-50 dark:border-r-blue-900"
              : "border-r-pink-50 dark:border-r-pink-900"
          )}
        ></div>
        {isEditing && onContentChange ? (
          <Textarea
            value={editedContent}
            onChange={(e) => onContentChange(e.target.value)}
            rows={2}
            className={cn("resize-none", textColor, "border-gray-300 dark:border-gray-700")}
          />
        ) : (
          <p className={cn("text-sm", textColor)}>{comment.content}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

export default CommentCard;