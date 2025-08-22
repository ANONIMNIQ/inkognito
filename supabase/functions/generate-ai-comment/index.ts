import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let confessionContent;
  let rawRequestBody = ''; // Variable to store the raw request body
  try {
    rawRequestBody = await req.text(); // Read the raw body as text first
    console.log("Incoming raw request body:", rawRequestBody); // Log the raw body

    // Only attempt to parse if the raw body is not empty
    if (rawRequestBody) {
      const body = JSON.parse(rawRequestBody);
      confessionContent = body.confessionContent;
    } else {
      // If body is empty, treat it as missing content
      throw new Error('Empty request body received.');
    }
  } catch (jsonParseError) {
    console.error("Error parsing incoming request JSON:", jsonParseError, "Raw body received:", rawRequestBody);
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body', rawBody: rawRequestBody }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

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
  // Changed v1beta to v1
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`, {
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

  // Always read the response body as text first for debugging
  const responseText = await response.text();
  console.log(`Google Gemini API raw response (Status: ${response.status}):`, responseText);

  if (!response.ok) {
    console.error(`Google Gemini API error: Status ${response.status}, Body: ${responseText}`);
    return new Response(JSON.stringify({
      error: `Failed to get AI comment from Google Gemini API. Status: ${response.status}. Details: ${responseText.substring(0, 200)}...`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }

  let data;
  try {
    data = JSON.parse(responseText); // Attempt to parse the text as JSON
  } catch (jsonError) {
    console.error("Failed to parse Google Gemini API response as JSON:", jsonError);
    return new Response(JSON.stringify({
      error: `Failed to parse AI comment response. Raw body: ${responseText.substring(0, 200)}...`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
  
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

});