import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ConfessionForm from "./ConfessionForm";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface ExpandableConfessionFormProps {
  onSubmit: (title: string, content: string, gender: "male" | "female") => void;
}

const ExpandableConfessionForm: React.FC<ExpandableConfessionFormProps> = ({ onSubmit }) => {
  const [open, setOpen] = useState(false);
  const [initialTitleInput, setInitialTitleInput] = useState("");

  const handleFormSubmit = (title: string, content: string, gender: "male" | "female") => {
    onSubmit(title, content, gender);
    setOpen(false); // Collapse the form after submission
    setInitialTitleInput(""); // Clear the initial input
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInitialTitleInput(e.target.value);
  };

  const handleInputClick = () => {
    setOpen(true);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6 p-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Input
            placeholder="Share your anonymous confession title..."
            className="w-full"
            value={initialTitleInput}
            onChange={handleInputChange}
            onClick={handleInputClick}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          {/* Render ConfessionForm only when expanded, passing the initial title */}
          {open && (
            <ConfessionForm
              onSubmit={handleFormSubmit}
              initialTitle={initialTitleInput}
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ExpandableConfessionForm;