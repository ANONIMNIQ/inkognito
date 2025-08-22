import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GenderAvatarProps {
  gender: "male" | "female";
  className?: string;
}

const GenderAvatar: React.FC<GenderAvatarProps> = ({ gender, className }) => {
  const avatarSrc = gender === "male" ? "/avatars/male.png" : "/avatars/female.png";
  const fallbackText = gender === "male" ? "M" : "F";

  return (
    <Avatar className={className}>
      <AvatarImage src={avatarSrc} alt={gender} />
      <AvatarFallback>{fallbackText}</AvatarFallback>
    </Avatar>
  );
};

export default GenderAvatar;