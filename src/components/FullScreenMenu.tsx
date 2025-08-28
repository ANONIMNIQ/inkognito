import React from "react";
import { SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FullScreenMenuContentProps {
  menuItems: { label: string }[];
}

const FullScreenMenuContent: React.FC<FullScreenMenuContentProps> = ({ menuItems }) => {
  return (
    <SheetContent
      side="bottom"
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-gray-900 dark:bg-gray-950 text-white",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full",
        "duration-500 ease-out" // Custom duration for slide animation
      )}
    >
      <SheetHeader className="flex flex-row justify-between items-center p-4 border-b border-gray-700">
        <SheetTitle className="text-2xl font-bold text-white">Меню</SheetTitle>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700">
            <X className="h-6 w-6" />
            <span className="sr-only">Close menu</span>
          </Button>
        </SheetClose>
      </SheetHeader>
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {menuItems.map((item, index) => (
          <h2 key={index} className="text-3xl font-bold text-white">
            {item.label}
          </h2>
        ))}
      </div>
    </SheetContent>
  );
};

export default FullScreenMenuContent;