import React from "react";
import GenderAvatar from "./GenderAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    gender: "male" | "female";
    timestamp: Date;
  };
}

const CommentCard: React.FC<CommentCardProps> = ({ comment }) => {
  return (
    <Card className="mb-2 bg-background shadow-sm">
      <CardContent className="flex items-start space-x-3 p-3">
        <GenderAvatar gender={comment.gender} className="h-8 w-8" />
        <div className="flex-1">
          <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommentCard;