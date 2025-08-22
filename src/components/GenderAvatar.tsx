import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GenderAvatarProps {
  gender: "male" | "female" | "incognito";
  className?: string;
}

const GenderAvatar: React.FC<GenderAvatarProps> = ({ gender, className }) => {
  const getAvatarDetails = () => {
    switch (gender) {
      case "male":
        return { src: "/avatars/male.png", fallback: "M" };
      case "female":
        return { src: "/avatars/female.png", fallback: "F" };
      case "incognito":
        return { src: "/avatars/anonymous.png", fallback: "A" };
      default:
        return { src: "/avatars/anonymous.png", fallback: "A" }; // Default case
    }
  };

  const { src: avatarSrc, fallback: fallbackText } = getAvatarDetails();


  return (
    <Avatar className={className}>
      <AvatarImage src={avatarSrc} alt={gender} />
      <AvatarFallback>{fallbackText}</AvatarFallback>
    </Avatar>
  );
};

export default GenderAvatar;