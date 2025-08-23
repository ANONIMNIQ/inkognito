import React from "react";
import GenderAvatar from "./GenderAvatar";
import { formatDistanceToNow } from "date-fns";
import { bg } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    gender: "male" | "female" | "incognito";
    timestamp: Date;
  };
  isEditing?: boolean;
  editedContent?: string;
  onContentChange?: (content: string) => void;
  animationDelay?: number;
  hideAvatarOnMobile?: boolean; // New prop
}

const CommentCard: React.FC<CommentCardProps> = ({ comment, isEditing = false, editedContent, onContentChange, animationDelay = 0, hideAvatarOnMobile = false }) => {
  const isMobile = useIsMobile(); // Use the hook

  const bubbleBackgroundColor =
    comment.gender === "male"
      ? "bg-blue-50 dark:bg-blue-900"
      : comment.gender === "female"
      ? "bg-pink-50 dark:bg-pink-900"
      : "bg-gray-100 dark:bg-gray-700";

  const textColor = "text-gray-800 dark:text-gray-200";

  const showAvatar = !isMobile || !hideAvatarOnMobile;

  return (
    <div className={cn("flex items-start flex-1 opacity-0 animate-fade-zoom-in", showAvatar ? "space-x-2" : "space-x-0")} style={{ animationDelay: `${animationDelay}ms` }}>
      {showAvatar && <GenderAvatar gender={comment.gender} className="h-7 w-7 flex-shrink-0 mt-1" />}
      <div className={cn("flex-1 p-3 rounded-xl shadow-sm relative", bubbleBackgroundColor, showAvatar ? "" : "ml-0")}>
        <div
          className={cn(
            "absolute top-3 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
            showAvatar ? "-left-2" : "left-2", // Adjust arrow position if avatar is hidden
            comment.gender === "male"
              ? "border-r-blue-50 dark:border-r-blue-900"
              : comment.gender === "female"
              ? "border-r-pink-50 dark:border-r-pink-900"
              : "border-r-gray-100 dark:border-r-gray-700"
          )}
        ></div>
        {isEditing && onContentChange ? (
          <Textarea
            value={editedContent}
            onChange={(e) => onContentChange(e.target.value)}
            rows={2}
            className={cn("resize-none font-serif text-base pl-1", textColor, "border-gray-300 dark:border-gray-700")}
          />
        ) : (
          <p className={cn("font-serif text-base pl-1", textColor)}>{comment.content}</p>
        )}
        <p className={cn("text-xs text-gray-500 dark:text-gray-400 mt-1 pl-1")}>
          {formatDistanceToNow(comment.timestamp, { addSuffix: true, locale: bg })}
        </p>
      </div>
    </div>
  );
};

export default CommentCard;