import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { confessionContent } = await req.json();

    if (!confessionContent) {
      return new Response(JSON.stringify({ error: 'Confession content is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

    if (!GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'GOOGLE_API_KEY not set in Supabase secrets.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Call Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "You are a compassionate and thoughtful anonymous commenter on a confession board. Provide a short, supportive, or reflective comment. Keep it under 50 words." },
              { text: `Confession: "${confessionContent}"` }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.7,
        },
      }),
    });

    const data = await response.json();
    const aiResponseContent = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "AI comment generation failed.";

    return new Response(JSON.stringify({
      id: crypto.randomUUID(), // Generate a UUID for the comment
      content: `AI says: "${aiResponseContent}"`,
      gender: "male", // Default gender for AI
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error generating AI comment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});