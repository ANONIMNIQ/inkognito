import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

  return (
    <form onSubmit={handleSubmit} className="space-y-2 mt-4 p-4 border rounded-md bg-muted/50">
      <div>
        <Textarea
          placeholder="Add your anonymous comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          required
        />
      </div>
      <div>
        <Label className="text-sm">Your Gender (Anonymous)</Label>
        <RadioGroup
          defaultValue="male"
          value={gender}
          onValueChange={(value: "male" | "female") => setGender(value)}
          className="flex space-x-4 mt-1"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="male" id="comment-gender-male" />
            <Label htmlFor="comment-gender-male" className="text-sm">Male</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="female" id="comment-gender-female" />
            <Label htmlFor="comment-gender-female" className="text-sm">Female</Label>
          </div>
        </RadioGroup>
      </div>
      <Button type="submit" size="sm" className="w-full">Post Comment</Button>
    </form>
  );
};

export default CommentForm;