import React, { useState } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import ConfessionForm from "@/components/ConfessionForm"; // Updated import
import ConfessionCard from "@/components/ConfessionCard";
import { Separator } from "@/components/ui/separator";

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
}

const Index = () => {
  const [confessions, setConfessions] = useState<Confession[]>([]);

  const handleAddConfession = (title: string, content: string, gender: "male" | "female") => {
    const newConfession: Confession = {
      id: Date.now().toString(), // Simple unique ID
      title,
      content,
      gender,
      timestamp: new Date(),
      comments: [],
    };
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center text-gray-900 dark:text-gray-50 mb-8">
          Anonymous Confessions
        </h1>

        <ConfessionForm onSubmit={handleAddConfession} /> {/* Directly using ConfessionForm */}

        <Separator className="my-8" />

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