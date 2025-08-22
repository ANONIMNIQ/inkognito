// src/services/aiService.ts

/**
 * Simulates an AI API call to generate a comment based on confession content.
 * In a real application, you would replace this with an actual API call to an AI service
 * like OpenAI, Google AI, etc.
 *
 * @param confessionContent The content of the confession to comment on.
 * @returns A promise that resolves to an AI-generated comment object.
 */
export const generateAIComment = async (confessionContent: string) => {
  // --- Placeholder for actual AI API integration ---
  // You would typically make an HTTP request to an AI service here.
  // Example with a hypothetical OpenAI API call:
  //
  // const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY; // Get API key from environment variables
  // if (!OPENAI_API_KEY) {
  //   console.error("VITE_OPENAI_API_KEY is not set.");
  //   return {
  //     id: Date.now().toString() + "-ai",
  //     content: "AI comment generation failed due to missing API key.",
  //     gender: "male" as "male" | "female", // Default gender for AI
  //     timestamp: new Date(Date.now() + 1000), // Slightly after confession
  //   };
  // }
  //
  // try {
  //   const response = await fetch("https://api.openai.com/v1/chat/completions", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "Authorization": `Bearer ${OPENAI_API_KEY}`,
  //     },
  //     body: JSON.stringify({
  //       model: "gpt-3.5-turbo",
  //       messages: [
  //         { role: "system", content: "You are a compassionate and thoughtful anonymous commenter on a confession board. Provide a short, supportive, or reflective comment." },
  //         { role: "user", content: `Confession: "${confessionContent}"` },
  //       ],
  //       max_tokens: 50,
  //     }),
  //   });
  //
  //   const data = await response.json();
  //   const aiResponseContent = data.choices[0].message.content.trim();
  //
  //   return {
  //     id: Date.now().toString() + "-ai",
  //     content: aiResponseContent,
  //     gender: "male" as "male" | "female", // AI's gender, can be randomized or fixed
  //     timestamp: new Date(Date.now() + 1000), // Slightly after confession
  //   };
  // } catch (error) {
  //   console.error("Error generating AI comment:", error);
  //   return {
  //     id: Date.now().toString() + "-ai",
  //     content: "AI comment generation failed. Please try again later.",
  //     gender: "male" as "male" | "female",
  //     timestamp: new Date(Date.now() + 1000),
  //   };
  // }
  // --- End of Placeholder ---

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const aiComments = [
    "Thank you for sharing your thoughts. It takes courage to open up.",
    "Your honesty is truly appreciated here. You're not alone.",
    "This resonates with me. Sending you strength.",
    "It's good to get things off your chest. Hope you find peace.",
    "A powerful confession. We're here to listen.",
    "Sometimes just saying it out loud helps. Thanks for trusting us.",
    "Your feelings are valid. Take care of yourself.",
    "This is a safe space. Thank you for being vulnerable.",
  ];

  const randomComment = aiComments[Math.floor(Math.random() * aiComments.length)];

  return {
    id: Date.now().toString() + "-ai", // Unique ID for AI comment
    content: `AI says: "${randomComment}"`,
    gender: "male" as "male" | "female", // Default gender for AI comment
    timestamp: new Date(Date.now() + 1000), // Timestamp slightly after the confession
  };
};