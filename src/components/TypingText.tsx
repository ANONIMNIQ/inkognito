import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface TypingTextProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  startCondition?: boolean;
}

const TypingText: React.FC<TypingTextProps> = ({ text, delay = 0, speed = 50, className, startCondition = true }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!startCondition) {
      setDisplayedText("");
      setIsTypingComplete(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setDisplayedText("");
    setIsTypingComplete(false);
    indexRef.current = 0;

    const type = () => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.substring(0, indexRef.current + 1));
        indexRef.current++;
        timeoutRef.current = setTimeout(type, speed);
      } else {
        setIsTypingComplete(true);
      }
    };

    timeoutRef.current = setTimeout(type, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, delay, speed, startCondition]);

  return (
    <div className={cn(className)}>
      {displayedText}
      {!isTypingComplete && startCondition && (
        <span className="inline-block w-0.5 h-full bg-current align-bottom animate-pulse" />
      )}
    </div>
  );
};

export default TypingText;