import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import GenderAvatar from "./GenderAvatar";
import CommentCard from "./CommentCard";
import CommentForm from "./CommentForm";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  gender: "male" | "female";
  timestamp: Date;
}

interface ConfessionCardProps {
  confession: {
    id: string;
    title: string;
    content: string;
    gender: "male" | "female";
    timestamp: Date;
    comments: Comment[];
  };
  onAddComment: (confessionId: string, content: string, gender: "male" | "female") => void;
}

const ConfessionCard: React.FC<ConfessionCardProps> = ({ confession, onAddComment }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddComment = (content: string, gender: "male" | "female") => {
    onAddComment(confession.id, content, gender);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6 shadow-lg">
      <CardHeader className="pb-2">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3">
              <GenderAvatar gender={confession.gender} className="h-10 w-10" />
              <CollapsibleTrigger asChild>
                <Button variant="link" className="p-0 h-auto text-left text-lg font-semibold hover:no-underline">
                  {confession.title}
                </Button>
              </CollapsibleTrigger>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{formatDistanceToNow(confession.timestamp, { addSuffix: true })}</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent className="space-y-4 pt-4">
            <CardContent className="p-0 text-gray-800 dark:text-gray-200">
              <p className="whitespace-pre-wrap">{confession.content}</p>
            </CardContent>
            <div className="space-y-3">
              <h3 className="text-md font-semibold">Comments ({confession.comments.length})</h3>
              {confession.comments.length === 0 ? (
                <p className="text-sm text-gray-500">No comments yet. Be the first!</p>
              ) : (
                confession.comments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))
              )}
              <CommentForm onSubmit={handleAddComment} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
      {!isOpen && (
        <CardFooter className="pt-2">
          <Button variant="link" onClick={() => setIsOpen(true)} className="w-full text-blue-600 dark:text-blue-400">
            See all comments ({confession.comments.length})
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ConfessionCard;