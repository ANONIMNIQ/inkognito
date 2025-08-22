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
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      setIsTypingComplete(true);
      return;
    }

    setIsTypingComplete(false);
    let i = 0;
    setDisplayedText("");

    const type = () => {
      if (i < text.length) {
        // Use substring to avoid potential race conditions with state updates
        setDisplayedText(text.substring(0, i + 1));
        i++;
        timeoutRef.current = setTimeout(type, speed);
      } else {
        setIsTypingComplete(true);
      }
    };

    // Start the typing after the initial delay
    const startTimeout = setTimeout(type, delay);

    // Cleanup function to clear all timeouts on unmount or re-render
    return () => {
      clearTimeout(startTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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