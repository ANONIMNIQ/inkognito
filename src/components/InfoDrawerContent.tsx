import React from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoDrawerContentProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void; // Called when user initiates close (e.g., clicks X or outside)
}

const InfoDrawerContent: React.FC<InfoDrawerContentProps> = ({ title, children, isOpen, onClose }) => {
  return (
    <Drawer open={isOpen} onOpenChange={onClose}> {/* Removed onClose={onDrawerCloseComplete} */}
      <DrawerContent className={cn(
        "fixed inset-x-0 bottom-0 mt-0 flex h-full flex-col rounded-t-[10px] bg-gray-900 dark:bg-gray-900 text-white z-50",
        "max-w-3xl mx-auto" // Constrain width for better readability on large screens
      )}>
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-700 dark:bg-gray-700 mb-8 mt-3" />
        <div className="flex-1 overflow-auto p-4">
          <DrawerHeader className="flex justify-between items-center px-0 pt-0 pb-4">
            <DrawerTitle className="text-2xl font-bold text-white">{title}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="prose prose-invert max-w-none">
            {children}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default InfoDrawerContent;