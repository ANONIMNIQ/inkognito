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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories } from "./CategoryFilter"; // Import categories

interface ConfessionFormProps {
  onSubmit: (title: string, content: string, gender: "male" | "female" | "incognito", category: string) => void;
  onFormFocus?: () => void;
  forceExpand: boolean;
  onFormExpanded: () => void;
}

const ConfessionForm: React.FC<ConfessionFormProps> = ({ onSubmit, onFormFocus, forceExpand, onFormExpanded }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "incognito">("incognito");
  const [category, setCategory] = useState<string>("Други"); // New state for category, default to "Други"
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and confession content cannot be empty.");
      return;
    }
    if (parseInt(captchaAnswer, 10) !== captchaNum1 + captchaNum2) {
      toast.error("Грешен отговор на въпроса. Моля, опитайте отново.");
      generateCaptcha();
      return;
    }
    onSubmit(title, content, gender, category); // Pass category to onSubmit
    setTitle("");
    setContent("");
    setGender("incognito");
    setCategory("Други"); // Reset category
    setOpen(false);
    toast.success("Your confession has been posted!");
  };

  const handleTitleFocus = () => {
    setOpen(true);
    if (onFormFocus) {
      onFormFocus();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        // Check if the click target is inside a Radix UI Select content (which is portal-rendered)
        const targetElement = event.target as HTMLElement;
        const isClickInsideSelectContent = targetElement.closest('[role="listbox"]') || targetElement.closest('[data-radix-popper-content-wrapper]');

        if (!isClickInsideSelectContent) {
          setOpen(false);
        }
      }
    };

    if (open) {
      document.addEventListener("click", handleClickOutside);
    } else {
      document.removeEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (forceExpand) {
      setOpen(true);
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
      onFormExpanded();
    }
  }, [forceExpand, onFormExpanded]);

  useEffect(() => {
    if (open) {
      generateCaptcha();
    }
  }, [open]);

  const bubbleBackgroundColor =
    gender === "male"
      ? "bg-blue-100 dark:bg-blue-950"
      : gender === "female"
      ? "bg-pink-100 dark:bg-pink-950"
      : "bg-gray-100 dark:bg-gray-800";

  const generalTextColor = "text-gray-800 dark:text-gray-200";
  const placeholderColor = "placeholder:text-gray-500 dark:placeholder:text-gray-400";
  const borderColor = "border-gray-300 dark:border-gray-700";

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 flex items-start space-x-3" ref={formRef}>
      <GenderAvatar
        gender={gender}
        className={cn(
          "h-10 w-10 flex-shrink-0 transition-all duration-300 mt-1.5",
          !open && "self-center"
        )}
      />
      <div className={cn("flex-1 rounded-xl shadow-md relative transition-all duration-300 ease-in-out", bubbleBackgroundColor, open ? "p-4" : "p-1.5 flex items-center")}>
        <div
          className={cn(
            "absolute top-3 -left-2 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
            gender === "male"
              ? "border-r-blue-100 dark:border-r-blue-950"
              : gender === "female"
              ? "border-r-pink-100 dark:border-r-pink-950"
              : "border-r-gray-100 dark:border-r-gray-800"
          )}
        ></div>

        <Input
          ref={titleInputRef}
          id="title"
          placeholder="Кратко заглавие на твоята изповед..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={handleTitleFocus}
          required
          maxLength={100}
          className={cn("w-full bg-transparent", generalTextColor, placeholderColor, borderColor)}
        />

        <Collapsible open={open} className="mt-2">
          <CollapsibleContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="content" className="sr-only">Confession</Label>
                <Textarea
                  id="content"
                  placeholder="Сподели ни тайната си..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  required
                  className={cn("bg-transparent", generalTextColor, placeholderColor, borderColor)}
                />
              </div>
              <div>
                <Label htmlFor="category" className={cn("text-sm text-right w-full", generalTextColor)}>Категория</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className={cn("mt-1 w-full bg-transparent", generalTextColor, borderColor)}>
                    <SelectValue placeholder="Избери категория" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700">
                    {categories.filter(c => c !== "Всички").map((cat) => ( // Filter out "Всички" for posting
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={cn("text-sm", generalTextColor)}>Твоят пол</Label>
                <RadioGroup
                  defaultValue="incognito"
                  value={gender}
                  onValueChange={(value: "male" | "female" | "incognito") => setGender(value)}
                  className="flex space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="incognito" id="confession-gender-incognito" className="sr-only" />
                    <Label htmlFor="confession-gender-incognito" className="flex items-center space-x-1 cursor-pointer">
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
                    <RadioGroupItem value="male" id="confession-gender-male" className="sr-only" />
                    <Label htmlFor="confession-gender-male" className="flex items-center space-x-1 cursor-pointer">
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
                    <RadioGroupItem value="female" id="confession-gender-female" className="sr-only" />
                    <Label htmlFor="confession-gender-female" className="flex items-center space-x-1 cursor-pointer">
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
                <Label htmlFor="captcha" className={cn("text-sm", generalTextColor)}>
                  Колко е {captchaNum1} + {captchaNum2}?
                </Label>
                <Input
                  id="captcha"
                  type="number"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  required
                  className={cn("mt-1 bg-transparent", generalTextColor, placeholderColor, borderColor)}
                />
              </div>
              <div className="flex justify-center pt-2">
                <Button
                  type="submit"
                  className="w-auto rounded-full bg-gray-900 px-8 py-2 text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-300"
                >
                  Публикувай
                </Button>
              </div>
            </form>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default ConfessionForm;