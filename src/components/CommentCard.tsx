import React from "react";
import GenderAvatar from "./GenderAvatar";
// Removed Card, CardContent imports as we're making a custom bubble div
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    gender: "male" | "female";
    timestamp: Date;
  };
}

const CommentCard: React.FC<CommentCardProps> = ({ comment }) => {
  const bubbleBackgroundColor =
    comment.gender === "male"
      ? "bg-blue-50 dark:bg-blue-900"
      : "bg-pink-50 dark:bg-pink-900";

  const textColor =
    comment.gender === "male"
      ? "text-blue-800 dark:text-blue-200"
      : "text-pink-800 dark:text-pink-200";

  return (
    <div className="flex items-start space-x-2 mb-2"> {/* Added mb-2 for spacing between comments */}
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
        <p className={cn("text-sm", textColor)}>{comment.content}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

export default CommentCard;