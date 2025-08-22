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

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set in Supabase secrets.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Or gpt-4, depending on your preference and access
        messages: [
          { role: "system", content: "You are a compassionate and thoughtful anonymous commenter on a confession board. Provide a short, supportive, or reflective comment. Keep it under 50 words." },
          { role: "user", content: `Confession: "${confessionContent}"` },
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const aiResponseContent = data.choices?.[0]?.message?.content?.trim() || "AI comment generation failed.";

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