import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ConfessionForm from "./ConfessionForm";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card"; // Using Card for consistent styling

interface ExpandableConfessionFormProps {
  onSubmit: (title: string, content: string, gender: "male" | "female") => void;
}

const ExpandableConfessionForm: React.FC<ExpandableConfessionFormProps> = ({ onSubmit }) => {
  const [open, setOpen] = useState(false);

  const handleFormSubmit = (title: string, content: string, gender: "male" | "female") => {
    onSubmit(title, content, gender);
    setOpen(false); // Collapse the form after submission
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6 p-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Input
            placeholder="Share your anonymous confession..."
            className="cursor-pointer text-muted-foreground w-full"
            readOnly
            onClick={() => setOpen(true)}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <ConfessionForm onSubmit={handleFormSubmit} />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ExpandableConfessionForm;