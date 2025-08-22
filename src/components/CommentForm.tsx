import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import GenderAvatar from "./GenderAvatar";
import { cn } from "@/lib/utils";

interface CommentFormProps {
  onSubmit: (content: string, gender: "male" | "female") => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ onSubmit }) => {
  const [content, setContent] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Comment content cannot be empty.");
      return;
    }
    onSubmit(content, gender);
setContent("");
    setGender("male"); // Reset to default
    toast.success("Your comment has been posted!");
  };

  const bubbleBackgroundColor =
    gender === "male"
      ? "bg-blue-50 dark:bg-blue-900"
      : "bg-pink-50 dark:bg-pink-900";

  // Updated to grey/black
  const generalTextColor = "text-gray-800 dark:text-gray-200";
  const placeholderColor = "placeholder:text-gray-500 dark:placeholder:text-gray-400";
  const borderColor = "border-gray-300 dark:border-gray-700";

  return (
    <div className="flex items-start space-x-2 mb-2">
      <GenderAvatar gender={gender} className="h-7 w-7 flex-shrink-0 mt-1" />
      <form onSubmit={handleSubmit} className={cn("flex-1 p-3 rounded-xl shadow-sm space-y-2 relative", bubbleBackgroundColor)}>
        <div
          className={cn(
            "absolute top-3 -left-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
            gender === "male"
              ? "border-r-blue-50 dark:border-r-blue-900"
              : "border-r-pink-50 dark:border-r-pink-900"
          )}
        ></div>
        <div>
          <Textarea
            placeholder="Add your anonymous comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            required
            className={cn("resize-none", generalTextColor, placeholderColor, borderColor)}
          />
        </div>
        <div>
          <Label className={cn("text-xs", generalTextColor)}>Your Gender (Anonymous)</Label>
          <RadioGroup
            defaultValue="male"
            value={gender}
            onValueChange={(value: "male" | "female") => setGender(value)}
            className="flex space-x-4 mt-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="comment-gender-male" className="sr-only" />
              <Label htmlFor="comment-gender-male" className="flex items-center space-x-1 cursor-pointer">
                <GenderAvatar gender="male" className="h-6 w-6" />
                <span className={cn(
                  "text-sm",
                  gender === "male"
                    ? cn(generalTextColor, "font-bold underline decoration-2")
                    : cn("text-gray-500 dark:text-gray-400", "hover:underline", `hover:${generalTextColor}`)
                )}>Male</span>
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
                )}>Female</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
        <Button type="submit" size="sm" variant="secondary" className={cn(generalTextColor, "w-full")}>Post Comment</Button>
      </form>
    </div>
  );
};

export default CommentForm;