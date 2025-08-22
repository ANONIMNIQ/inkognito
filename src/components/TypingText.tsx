import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TypingTextProps {
  text: string;
  delay?: number; // Delay before starting typing
  speed?: number; // Speed of typing in ms per character
  className?: string;
}

const TypingText: React.FC<TypingTextProps> = ({ text, delay = 0, speed = 50, className }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  useEffect(() => {
    setDisplayedText(""); // Reset when text changes
    setIsTypingComplete(false);
    let charIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const startTyping = () => {
      timeoutId = setTimeout(() => {
        if (charIndex < text.length) {
          setDisplayedText((prev) => prev + text.charAt(charIndex));
          charIndex++;
          startTyping();
        } else {
          setIsTypingComplete(true);
        }
      }, speed);
    };

    const initialDelayTimeout = setTimeout(startTyping, delay);

    return () => {
      clearTimeout(initialDelayTimeout);
      clearTimeout(timeoutId);
    };
  }, [text, delay, speed]);

  return (
    <span className={cn("inline-block overflow-hidden whitespace-nowrap", className)}>
      {displayedText}
      {!isTypingComplete && (
        <span className="inline-block w-0.5 h-full bg-current align-bottom animate-pulse"></span>
      )}
    </span>
  );
};

export default TypingText;