import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import GenderAvatar from "./GenderAvatar";
import { cn } from "@/lib/utils";

interface ConfessionFormProps {
  onSubmit: (title: string, content: string, gender: "male" | "female") => void;
}

const ConfessionForm: React.FC<ConfessionFormProps> = ({ onSubmit }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and confession content cannot be empty.");
      return;
    }
    onSubmit(title, content, gender);
    setTitle("");
    setContent("");
    setGender("male");
    setOpen(false);
    toast.success("Your confession has been posted!");
  };

  const handleTitleFocus = () => {
    setOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        // Only collapse if the form is empty to prevent data loss
        if (title.trim() === "" && content.trim() === "") {
          setOpen(false);
        }
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, title, content]);

  const bubbleBackgroundColor =
    gender === "male"
      ? "bg-blue-100 dark:bg-blue-950"
      : "bg-pink-100 dark:bg-pink-950";

  const maleTextColor = "text-blue-900 dark:text-blue-100";
  const femaleTextColor = "text-pink-900 dark:text-pink-100";
  
  const currentTextColor = gender === 'male' ? maleTextColor : femaleTextColor;
  const placeholderColor = gender === 'male' ? "placeholder:text-blue-700/60 dark:placeholder:text-blue-200/60" : "placeholder:text-pink-700/60 dark:placeholder:text-pink-200/60";

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 flex items-start space-x-3" ref={formRef}>
      <GenderAvatar gender={gender} className="h-10 w-10 flex-shrink-0 mt-2" />
      <div className={cn("flex-1 p-4 rounded-xl shadow-md relative", bubbleBackgroundColor)}>
        {/* Speech bubble tail */}
        <div
          className={cn(
            "absolute top-3 -left-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
            gender === "male"
              ? "border-r-blue-100 dark:border-r-blue-950"
              : "border-r-pink-100 dark:border-r-pink-950"
          )}
        ></div>

        <Input
          id="title"
          placeholder="Share your anonymous confession title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={handleTitleFocus}
          required
          className={cn("w-full bg-transparent", currentTextColor, placeholderColor)}
        />

        <Collapsible open={open} className="mt-2">
          <CollapsibleContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="content" className="sr-only">Confession</Label>
                <Textarea
                  id="content"
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  required
                  className={cn("bg-transparent", currentTextColor, placeholderColor)}
                />
              </div>
              <div>
                <Label className={cn("text-sm", currentTextColor)}>Your Gender (Anonymous)</Label>
                <RadioGroup
                  defaultValue="male"
                  value={gender}
                  onValueChange={(value: "male" | "female") => setGender(value)}
                  className="flex space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="confession-gender-male" className="sr-only" />
                    <Label htmlFor="confession-gender-male" className="flex items-center space-x-1 cursor-pointer">
                      <GenderAvatar gender="male" className="h-6 w-6" />
                      <span className={cn(
                        "text-sm",
                        gender === "male"
                          ? cn(maleTextColor, "font-bold underline decoration-2")
                          : cn("text-gray-500 dark:text-gray-400", "hover:underline", `hover:${maleTextColor}`)
                      )}>Male</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="confession-gender-female" className="sr-only" />
                    <Label htmlFor="confession-gender-female" className="flex items-center space-x-1 cursor-pointer">
                      <GenderAvatar gender="female" className="h-6 w-6" />
                      <span className={cn(
                        "text-sm",
                        gender === "female"
                          ? cn(femaleTextColor, "font-bold underline decoration-2")
                          : cn("text-gray-500 dark:text-gray-400", "hover:underline", `hover:${femaleTextColor}`)
                      )}>Female</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <Button type="submit" className="w-full">Post Confession</Button>
            </form>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default ConfessionForm;