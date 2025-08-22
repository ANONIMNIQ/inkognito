import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface GenderAvatarSkeletonProps {
  className?: string;
}

const GenderAvatarSkeleton: React.FC<GenderAvatarSkeletonProps> = ({ className }) => {
  return (
    <Skeleton className={cn("h-10 w-10 rounded-full", className)} />
  );
};

export default GenderAvatarSkeleton;