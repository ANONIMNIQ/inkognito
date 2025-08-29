import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import GenderAvatar from "./GenderAvatar";
import { cn, generateSlug } from "@/lib/utils"; // Import generateSlug
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories } from "./CategoryFilter";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCategoryColors } from "@/lib/category-colors"; // Import getCategoryColors

interface ConfessionFormProps {
  onSubmit: (title: string, content: string, gender: "male" | "female" | "incognito", category: string, slug: string, email?: string) => void;
  onFormFocus?: () => void;
  forceExpand: boolean;
  onFormExpanded: () => void;
  onAnimationComplete?: () => void;
}

const ConfessionForm: React.FC<ConfessionFormProps> = ({ onSubmit, onFormFocus, forceExpand, onFormExpanded, onAnimationComplete }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "incognito">("incognito");
  const [category, setCategory] = useState<string>("Други");
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [subscribe, setSubscribe] = useState(false);
  const [email, setEmail] = useState("");

  const formRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const generateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer("");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSelectOpen) {
        return;
      }
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setOpen(false);
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
  }, [open, isSelectOpen]);

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
    if (subscribe) {
      if (!email.trim()) {
        toast.error("Моля, въведете имейл адрес за абонамента.");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error("Моля, въведете валиден имейл адрес.");
        return;
      }
    }

    const confessionSlug = generateSlug(title); // Generate slug here
    onSubmit(title, content, gender, category, confessionSlug, subscribe ? email : undefined);
    setTitle("");
    setContent("");
    setGender("incognito");
    setCategory("Други");
    setSubscribe(false);
    setEmail("");
    setOpen(false);
    toast.success("Your confession has been posted!");
  };

  const handleTitleFocus = () => {
    setOpen(true);
    if (onFormFocus) {
      onFormFocus();
    }
  };

  const bubbleBackgroundColor =
    gender === "male"
      ? "bg-blue-100 dark:bg-blue-950"
      : gender === "female"
      ? "bg-pink-100 dark:bg-pink-950"
      : "bg-gray-100 dark:bg-gray-800";

  const generalTextColor = "text-gray-800 dark:text-gray-200";
  const placeholderColor = "placeholder:text-gray-500 dark:placeholder:text-gray-400";
  const borderColor = "border-gray-300 dark:border-gray-700";

  const { bg, darkBg } = getCategoryColors(category); // Get colors for the selected category

  return (
    <div className={cn("w-full max-w-2xl mx-auto mb-6 flex items-start", isMobile ? "space-x-0" : "space-x-3")} ref={formRef}>
      {!isMobile && (
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <GenderAvatar
            gender={gender}
            className={cn(
              "h-10 w-10 flex-shrink-0 transition-all duration-300 mt-1.5",
              !open && "self-center"
            )}
          />
        </div>
      )}
      <div
        className={cn("flex-1 rounded-xl shadow-md relative transition-all duration-300 ease-in-out opacity-0 animate-fade-zoom-in", bubbleBackgroundColor, open ? "p-4" : "p-1.5 flex items-center", isMobile ? "ml-0" : "")}
        style={{ animationDelay: '200ms' }}
        onAnimationEnd={onAnimationComplete}
      >
        <div
          className={cn(
            "absolute top-3 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent",
            isMobile ? "left-2" : "-left-2",
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
          placeholder="Кратко заглавие на твоята изповед... *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={handleTitleFocus}
          required
          maxLength={100}
          className={cn("w-full bg-transparent text-base", generalTextColor, placeholderColor, borderColor)}
        />

        <Collapsible open={open} className="mt-2">
          <CollapsibleContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="content" className={cn("text-sm", generalTextColor)}>
                  Твоята изповед <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="content"
                  placeholder="Сподели ни тайната си..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  required
                  className={cn("bg-transparent mt-1 text-base md:text-lg", generalTextColor, placeholderColor, borderColor)}
                />
              </div>
              <div>
                <Label htmlFor="category" className={cn("text-sm w-full", generalTextColor)}>
                  Категория <span className="text-red-500">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory} onOpenChange={setIsSelectOpen}>
                  <SelectTrigger id="category" className={cn("mt-1 w-full bg-transparent", generalTextColor, borderColor)}>
                    {category === "Други" ? ( // Assuming "Други" is the default/placeholder
                      <SelectValue placeholder="Избери категория" />
                    ) : (
                      <div className="flex items-center">
                        <div className={cn("w-3 h-3 rounded-full mr-2", bg, darkBg)} />
                        <span>{category}</span>
                      </div>
                    )}
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700">
                    {categories.filter(c => c !== "Всички").map((cat) => {
                      const { bg, darkBg } = getCategoryColors(cat);
                      return (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center">
                            <div className={cn("w-3 h-3 rounded-full mr-2", bg, darkBg)} />
                            <span>{cat}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={cn("text-sm", generalTextColor)}>
                  Твоят пол <span className="text-red-500">*</span>
                </Label>
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
                <Label className={cn("text-sm", generalTextColor)}>Известяване за коментари</Label>
                <div className="flex items-center space-x-3 mt-2 bg-gray-200/50 dark:bg-gray-900/50 p-3 rounded-md">
                  <Switch
                    id="subscribe-switch"
                    checked={subscribe}
                    onCheckedChange={setSubscribe}
                  />
                  <Label htmlFor="subscribe-switch" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    Абониране за известия при нов коментар
                  </Label>
                </div>
                {subscribe && (
                  <div className="mt-2 animate-slide-fade-in-top">
                    <Label htmlFor="email" className={cn("text-sm", generalTextColor)}>Email адрес</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email адрес"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required={subscribe}
                      className={cn("mt-1 bg-transparent", generalTextColor, placeholderColor, borderColor)}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="captcha" className={cn("text-sm", generalTextColor)}>
                  Колко е {captchaNum1} + {captchaNum2}? <span className="text-red-500">*</span>
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