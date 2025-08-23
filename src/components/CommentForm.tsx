import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import GenderAvatar from "./GenderAvatar";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

interface CommentFormProps {
  onSubmit: (content: string, gender: "male" | "female" | "incognito") => void;
  hideAvatarOnMobile?: boolean; // New prop
}

const CommentForm: React.FC<CommentFormProps> = ({ onSubmit, hideAvatarOnMobile = false }) => {
  const [content, setContent] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "incognito">("incognito");
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const isMobile = useIsMobile(); // Use the hook
  const showAvatar = !isMobile || !hideAvatarOnMobile;

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer("");
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Comment content cannot be empty.");
      return;
    }
    if (parseInt(captchaAnswer, 10) !== captchaNum1 + captchaNum2) {
      toast.error("Грешен отговор на въпроса. Моля, опитайте отново.");
      generateCaptcha();
      return;
    }
    onSubmit(content, gender);
    setContent("");
    setGender("incognito"); // Reset to default
    generateCaptcha();
    toast.success("Your comment has been posted!");
  };

  const bubbleBackgroundColor =
    gender === "male"
      ? "bg-blue-50 dark:bg-blue-900"
      : gender === "female"
      ? "bg-pink-50 dark:bg-pink-900"
      : "bg-gray-100 dark:bg-gray-700";

  const generalTextColor = "text-gray-800 dark:text-gray-200";
  const placeholderColor = "placeholder:text-gray-500 dark:placeholder:text-gray-400";
  const borderColor = "border-gray-300 dark:border-gray-700";

  return (
    <div className={cn("flex items-start mb-2", showAvatar ? "space-x-2" : "space-x-0")}>
      {showAvatar && <GenderAvatar gender={gender} className="h-7 w-7 flex-shrink-0 mt-1" />}
      <form onSubmit={handleSubmit} className={cn("flex-1 p-3 rounded-xl shadow-sm space-y-2 relative", bubbleBackgroundColor, showAvatar ? "" : "ml-0")}>
        <div
          className={cn(
            "absolute top-3 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
            showAvatar ? "-left-2" : "left-2", // Adjust arrow position for mobile
            gender === "male"
              ? "border-r-blue-50 dark:border-r-blue-900"
              : gender === "female"
              ? "border-r-pink-50 dark:border-r-pink-900"
              : "border-r-gray-100 dark:border-r-gray-700"
          )}
        ></div>
        <div>
          <Textarea
            placeholder="Напиши твоя анонимен коментар..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            required
            className={cn("resize-none text-base pl-1", generalTextColor, placeholderColor, borderColor)}
          />
        </div>
        <div>
          <Label className={cn("text-xs", generalTextColor)}>Твоят пол</Label>
          <RadioGroup
            defaultValue="incognito"
            value={gender}
            onValueChange={(value: "male" | "female" | "incognito") => setGender(value)}
            className="flex space-x-4 mt-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="incognito" id="comment-gender-incognito" className="sr-only" />
              <Label htmlFor="comment-gender-incognito" className="flex items-center space-x-1 cursor-pointer">
                <GenderAvatar gender="incognito" className="h-6 w-6" />
                <span className={cn(
                  "text-sm",
                  gender === "incognito"
                    ? cn(generalTextColor, "font-bold underline decoration-2")
                    : cn("text-gray-500 dark:text-gray-400", "hover:underline", `hover:${generalTextColor}`)
                )}>инкогнито</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="comment-gender-male" className="sr-only" />
              <Label htmlFor="comment-gender-male" className="flex items-center space-x-1 cursor-pointer">
                <GenderAvatar gender="male" className="h-6 w-6" />
                <span className={cn(
                  "text-sm",
                  gender === "male"
                    ? cn(generalTextColor, "font-bold underline decoration-2")
                    : cn("text-gray-500 dark:text-gray-400", "hover:underline", `hover:${generalTextColor}`)
                )}>мъж</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="comment-gender-female" className="sr-only" />
              <Label htmlFor="comment-gender-female" className="flex items-center space-x-1 cursor-pointer">
                <GenderAvatar gender="female" className="h-6 w-6" />
                <span className={cn(
                  "text-sm",
                  gender === "female"
                    ? cn(generalTextColor, "font-bold underline decoration-2")
                    : cn("text-gray-500 dark:text-gray-400", "hover:underline", `hover:${generalTextColor}`)
                )}>жена</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div>
          <Label htmlFor="comment-captcha" className={cn("text-xs", generalTextColor)}>
            Колко е {captchaNum1} + {captchaNum2}?
          </Label>
          <Input
            id="comment-captcha"
            type="number"
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
            required
            className={cn("mt-1 h-8 bg-transparent", generalTextColor, placeholderColor, borderColor)}
          />
        </div>
        <div className="flex justify-center pt-1">
          <Button
            type="submit"
            size="sm"
            className="w-auto rounded-full bg-gray-900 px-6 text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-300"
          >
            Публикувай Коментар
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CommentForm;