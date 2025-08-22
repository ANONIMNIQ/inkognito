import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ConfessionFormProps {
  onSubmit: (title: string, content: string, gender: "male" | "female") => void;
  initialTitle?: string; // New prop for initial title
}

const ConfessionForm: React.FC<ConfessionFormProps> = ({ onSubmit, initialTitle = "" }) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  // Update title state if initialTitle prop changes (e.g., when form expands)
  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

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
    toast.success("Your confession has been posted!");
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-none shadow-none"> {/* Removed border and shadow for nested card */}
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-xl font-bold">Complete Your Confession</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="A short summary of your confession"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
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
          <CardFooter className="p-0 pt-4">
            <Button type="submit" className="w-full">Post Confession</Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default ConfessionForm;