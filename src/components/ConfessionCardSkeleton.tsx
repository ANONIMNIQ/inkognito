import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import GenderAvatarSkeleton from "./GenderAvatarSkeleton";
import { cn } from "@/lib/utils";

interface ConfessionCardSkeletonProps {
  className?: string;
}

const ConfessionCardSkeleton: React.FC<ConfessionCardSkeletonProps> = ({ className }) => {
  return (
    <div className={cn("w-full max-w-2xl mx-auto mb-6 flex items-start space-x-3", className)}>
      <GenderAvatarSkeleton className="h-10 w-10 flex-shrink-0 mt-2" />
      <div className="flex-1 p-4 rounded-xl shadow-md bg-gray-100 dark:bg-gray-800">
        <div className="flex justify-between items-center mb-2">
          <div className="flex space-x-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-11/12 mb-1" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-3 w-1/4 mt-4" />
      </div>
    </div>
  );
};

export default ConfessionCardSkeleton;