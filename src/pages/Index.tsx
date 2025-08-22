import React, { useState } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import ConfessionForm from "@/components/ConfessionForm";
import ConfessionCard from "@/components/ConfessionCard";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button"; // Import Button component
import { generateAIComment } from "@/services/aiService"; // Import the AI service

interface Comment {
  id: string;
  content: string;
  gender: "male" | "female";
  timestamp: Date;
}

interface Confession {
  id: string;
  title: string;
  content: string;
  gender: "male" | "female";
  timestamp: Date;
  comments: Comment[];
  likes: number; // Added likes property
}

const Index = () => {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [allCollapsed, setAllCollapsed] = useState(false); // New state for collapsing all

  const handleAddConfession = async (title: string, content: string, gender: "male" | "female") => {
    const newConfession: Confession = {
      id: Date.now().toString(), // Simple unique ID
      title,
      content,
      gender,
      timestamp: new Date(),
      comments: [],
      likes: 0, // Initialize likes to 0
    };

    // Generate AI comment
    try {
      const aiComment = await generateAIComment(content);
      newConfession.comments.push(aiComment);
    } catch (error) {
      console.error("Failed to generate AI comment:", error);
      // Optionally add a fallback comment or toast error
    }

    setConfessions((prevConfessions) => [newConfession, ...prevConfessions]);
  };

  const handleAddComment = (confessionId: string, content: string, gender: "male" | "female") => {
    setConfessions((prevConfessions) =>
      prevConfessions.map((confession) =>
        confession.id === confessionId
          ? {
              ...confession,
              comments: [
                ...confession.comments,
                {
                  id: Date.now().toString(), // Simple unique ID
                  content,
                  gender,
                  timestamp: new Date(),
                },
              ],
            }
          : confession
      )
    );
  };

  const handleLikeConfession = (confessionId: string) => {
    setConfessions((prevConfessions) =>
      prevConfessions.map((confession) =>
        confession.id === confessionId
          ? { ...confession, likes: confession.likes + 1 }
          : confession
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center text-gray-900 dark:text-gray-50 mb-8">
          Anonymous Confessions
        </h1>

        <ConfessionForm onSubmit={handleAddConfession} />

        <Separator className="my-8" />

        {confessions.length > 0 && (
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={() => setAllCollapsed(!allCollapsed)}>
              {allCollapsed ? "Expand All" : "Collapse All"}
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {confessions.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400 text-lg">
              No confessions yet. Be the first to share!
            </p>
          ) : (
            confessions.map((confession) => (
              <ConfessionCard
                key={confession.id}
                confession={confession}
                onAddComment={handleAddComment}
                onLikeConfession={handleLikeConfession} // Pass new prop
                allCollapsed={allCollapsed} // Pass new prop
              />
            ))
          )}
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;