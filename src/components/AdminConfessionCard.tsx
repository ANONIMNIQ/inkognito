import React, { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageCircle, Heart, Edit, Trash2, Save, X, Mail } from "lucide-react";
import GenderAvatar from "./GenderAvatar";
import CommentCard from "./CommentCard";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

interface Comment {
  id: string;
  confession_id: string;
  content: string;
  gender: "male" | "female" | "incognito";
  created_at: string;
}

interface Confession {
  id: string;
  title: string;
  content: string;
  gender: "male" | "female" | "incognito";
  likes: number;
  created_at: string;
  comments: Comment[];
  author_email?: string;
}

interface AdminConfessionCardProps {
  confession: Confession;
  onDeleteConfession: (confessionId: string) => void;
  onEditConfession: (confessionId: string, title: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onEditComment: (commentId: string, content: string) => void;
}

const AdminConfessionCard: React.FC<AdminConfessionCardProps> = ({
  confession,
  onDeleteConfession,
  onEditConfession,
  onDeleteComment,
  onEditComment,
}) => {
  const [isContentOpen, setIsContentOpen] = useState(true);
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);
  const [isEditingConfession, setIsEditingConfession] = useState(false);
  const [editedConfessionTitle, setEditedConfessionTitle] = useState(confession.title);
  const [editedConfessionContent, setEditedConfessionContent] = useState(confession.content);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentContent, setEditedCommentContent] = useState("");

  const isMobile = useIsMobile(); // Use the hook

  const bubbleBackgroundColor =
    confession.gender === "male"
      ? "bg-blue-100 dark:bg-blue-950"
      : confession.gender === "female"
      ? "bg-pink-100 dark:bg-pink-950"
      : "bg-gray-100 dark:bg-gray-800";

  const textColor = "text-gray-800 dark:text-gray-200";
  const linkColor = "text-gray-600 dark:text-gray-400";
  const borderColor = "border-gray-300 dark:border-gray-700";
  const placeholderColor = "placeholder:text-gray-500 dark:placeholder:text-gray-400";

  const handleSaveConfession = () => {
    onEditConfession(confession.id, editedConfessionTitle, editedConfessionContent);
    setIsEditingConfession(false);
  };

  const handleCancelConfessionEdit = () => {
    setEditedConfessionTitle(confession.title);
    setEditedConfessionContent(confession.content);
    setIsEditingConfession(false);
  };

  const handleEditCommentClick = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditedCommentContent(comment.content);
  };

  const handleSaveComment = (commentId: string) => {
    onEditComment(commentId, editedCommentContent);
    setEditingCommentId(null);
    setEditedCommentContent("");
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditedCommentContent("");
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className={cn("flex items-start", isMobile ? "space-x-0" : "space-x-3")}>
        {!isMobile && <GenderAvatar gender={confession.gender} className="h-10 w-10 flex-shrink-0 mt-2" />}
        <div className={cn("flex-1 p-4 rounded-xl shadow-md", bubbleBackgroundColor, isMobile ? "ml-0" : "")}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-4">
              <div className={cn("flex items-center space-x-1 p-0 h-auto", linkColor)}>
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">{confession.comments.length}</span>
              </div>
              <div className={cn("flex items-center space-x-1 p-0 h-auto", linkColor)}>
                <Heart className="h-4 w-4" />
                <span className="text-sm">{confession.likes}</span>
              </div>
              {confession.author_email && (
                <div className={cn("flex items-center space-x-1 p-0 h-auto", linkColor)}>
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{confession.author_email}</span>
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              {isEditingConfession ? (
                <>
                  <Button variant="ghost" size="icon" onClick={handleSaveConfession}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleCancelConfessionEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditingConfession(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this confession and all its comments.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteConfession(confession.id)} variant="secondary" className="text-red-500">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>

          <Collapsible open={isContentOpen} onOpenChange={setIsContentOpen}>
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 mb-2">
              <CollapsibleTrigger asChild>
                {isEditingConfession ? (
                  <Input
                    value={editedConfessionTitle}
                    onChange={(e) => setEditedConfessionTitle(e.target.value)}
                    className={cn("text-base md:text-lg font-semibold font-serif w-full", textColor, placeholderColor, borderColor)} // Smaller title on mobile
                  />
                ) : (
                  <Button variant="link" className={cn("p-0 h-auto text-left text-base md:text-lg font-semibold hover:no-underline font-serif whitespace-normal justify-start", textColor)}> {/* Smaller title on mobile */}
                    {confession.title}
                  </Button>
                )}
              </CollapsibleTrigger>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {isContentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">Toggle confession content</span>
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="space-y-4 pt-2">
              {isEditingConfession ? (
                <Textarea
                  value={editedConfessionContent}
                  onChange={(e) => setEditedConfessionContent(e.target.value)}
                  className={cn("whitespace-pre-wrap font-serif text-lg", textColor, placeholderColor, borderColor)}
                  rows={5}
                />
              ) : (
                <p className={cn("whitespace-pre-wrap font-serif text-lg", textColor)}>{confession.content}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Posted {formatDistanceToNow(new Date(confession.created_at), { addSuffix: true })}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      <div className={cn("mt-4", isMobile ? "ml-0" : "ml-14")}> {/* Adjust margin for mobile */}
        <Collapsible open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="link" className={cn("w-full justify-start p-0 h-auto", linkColor)}>
              See all comments ({confession.comments.length})
              {isCommentsOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {confession.comments.length === 0 ? (
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No comments yet.</p>
            ) : (
              confession.comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-2">
                  <CommentCard
                    comment={{ ...comment, timestamp: new Date(comment.created_at) }}
                    isEditing={editingCommentId === comment.id}
                    editedContent={editedCommentContent}
                    onContentChange={setEditedCommentContent}
                    hideAvatarOnMobile={true} // Pass prop to hide avatar
                  />
                  <div className="flex space-x-1 mt-1">
                    {editingCommentId === comment.id ? (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleSaveComment(comment.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleCancelCommentEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleEditCommentClick(comment)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this comment.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteComment(comment.id)} variant="secondary" className="text-red-500">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default AdminConfessionCard;