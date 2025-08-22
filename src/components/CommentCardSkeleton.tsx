import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import GenderAvatarSkeleton from "./GenderAvatarSkeleton";
import { cn } from "@/lib/utils";

interface CommentCardSkeletonProps {
  className?: string;
}

const CommentCardSkeleton: React.FC<CommentCardSkeletonProps> = ({ className }) => {
  return (
    <div className={cn("flex items-start space-x-2 animate-pulse", className)}>
      <GenderAvatarSkeleton className="h-7 w-7 flex-shrink-0 mt-1" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
};

export default CommentCardSkeleton;