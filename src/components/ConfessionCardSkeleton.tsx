import React from "react";
import { cn } from "@/lib/utils";
import GenderAvatarSkeleton from "./GenderAvatarSkeleton";

interface ConfessionCardSkeletonProps {
  className?: string;
}

const ConfessionCardSkeleton: React.FC<ConfessionCardSkeletonProps> = ({ className }) => {
  return (
    <div className={cn("w-full max-w-2xl mx-auto mb-6 flex items-start space-x-3 animate-pulse", className)}>
      <GenderAvatarSkeleton className="h-10 w-10 flex-shrink-0 mt-2" />
      <div className="flex-1 p-4 rounded-xl shadow-md bg-gray-100 dark:bg-gray-800 h-24" />
    </div>
  );
};

export default ConfessionCardSkeleton;