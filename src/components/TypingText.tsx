import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface TypingTextProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
}

const TypingText: React.FC<TypingTextProps> = ({ text, delay = 0, speed = 50, className }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const index = useRef(0);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset everything when text changes
    setDisplayedText("");
    setIsTypingComplete(false);
    index.current = 0;
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }

    const startTyping = () => {
      if (index.current < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index.current));
        index.current++;
        timeoutId.current = setTimeout(startTyping, speed);
      } else {
        setIsTypingComplete(true);
      }
    };

    // Start after initial delay
    timeoutId.current = setTimeout(startTyping, delay);

    // Cleanup function
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
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