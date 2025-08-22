import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ConfessionForm from "./ConfessionForm";
import { Input } from "@/components/ui/input";

interface ExpandableConfessionFormProps {
  onSubmit: (title: string, content: string, gender: "male" | "female") => void;
}

const ExpandableConfessionForm: React.FC<ExpandableConfessionFormProps> = ({ onSubmit }) => {
  const [open, setOpen] = useState(false);

  const handleFormSubmit = (title: string, content: string, gender: "male" | "female") => {
    onSubmit(title, content, gender);
    setOpen(false); // Close the dialog after submission
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="w-full max-w-2xl mx-auto mb-6">
          <Input
            placeholder="Share your anonymous confession..."
            className="cursor-pointer text-muted-foreground"
            readOnly
            onClick={() => setOpen(true)}
          />
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share Your Confession</DialogTitle>
        </DialogHeader>
        <ConfessionForm onSubmit={handleFormSubmit} />
      </DialogContent>
    </Dialog>
  );
};

export default ExpandableConfessionForm;