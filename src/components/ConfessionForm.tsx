import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"; // Removed CollapsibleTrigger

interface ConfessionFormProps {
  onSubmit: (title: string, content: string, gender: "male" | "female") => void;
}

const ConfessionForm: React.FC<ConfessionFormProps> = ({ onSubmit }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const cardRef = useRef<HTMLDivElement>(null); // Ref to the Card component

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and confession content cannot be empty.");
      return;
    }
    onSubmit(title, content, gender);
    setTitle(""); // Clear title after submission
    setContent("");
    setGender("male"); // Reset to default
    setOpen(false); // Collapse the form after submission
    toast.success("Your confession has been posted!");
  };

  const handleTitleFocus = () => {
    setOpen(true); // Open collapsible when input is focused
  };

  // Effect to close the collapsible when clicking outside the form
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setOpen(false);
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
  }, [open]);

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6 p-4" ref={cardRef}>
      <Input
        id="title"
        placeholder="Share your anonymous confession title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={handleTitleFocus}
        required
        className="w-full"
      />

      {/* The Collapsible component now only wraps the content that expands */}
      <Collapsible open={open}>
        <CollapsibleContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl font-bold">Complete Your Confession</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div>
                <Label htmlFor="content">Confession</Label>
                <Textarea
                  id="content"
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  required
                />
              </div>
              <div>
                <Label>Your Gender (Anonymous)</Label>
                <RadioGroup
                  defaultValue="male"
                  value={gender}
                  onValueChange={(value: "male" | "female") => setGender(value)}
                  className="flex space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="gender-male" />
                    <Label htmlFor="gender-male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="gender-female" />
                    <Label htmlFor="gender-female">Female</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter className="p-0 pt-4">
              <Button type="submit" className="w-full">Post Confession</Button>
            </CardFooter>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ConfessionForm;