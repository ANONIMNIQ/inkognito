import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COOKIE_CONSENT_KEY = "cookie_consent_accepted";

const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent !== "true") {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    setIsVisible(false);
  };

  const handleDecline = () => {
    // For simplicity, declining also hides the banner.
    // In a real-world scenario, you might disable certain non-essential cookies here.
    localStorage.setItem(COOKIE_CONSENT_KEY, "false"); // Store as false if declined
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-[100] bg-gray-900 dark:bg-gray-900 text-white p-4 shadow-lg",
      "flex flex-col md:flex-row items-center justify-between gap-4",
      "animate-slide-fade-in-top" // Use a subtle animation for appearance
    )}>
      <p className="text-sm text-center md:text-left flex-1">
        Този уебсайт използва бисквитки, за да осигури най-доброто потребителско изживяване. Продължавайки да използвате сайта, вие се съгласявате с нашата политика за бисквитки.
      </p>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          onClick={handleAccept}
          className="bg-white text-gray-900 hover:bg-gray-200 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 rounded-full px-4 py-2 text-sm"
        >
          Приемам
        </Button>
        <Button
          onClick={handleDecline}
          variant="ghost"
          className="border-gray-400 text-gray-200 hover:bg-gray-700 hover:text-white dark:border-gray-400 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white rounded-full px-4 py-2 text-sm"
        >
          Отказвам
        </Button>
      </div>
    </div>
  );
};

export default CookieConsentBanner;