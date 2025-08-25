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
  let confessionId;
  let rawRequestBody = '';
  try {
    rawRequestBody = await req.text();

    if (rawRequestBody) {
      const body = JSON.parse(rawRequestBody);
      // Handle both direct invocation payload (from our trigger) and webhook payload
      if (body.record) { // This is a webhook payload
        confessionContent = body.record.content;
        confessionId = body.record.id;
      } else { // This is a direct invocation payload
        confessionContent = body.confessionContent;
        confessionId = body.confessionId;
      }
    } else {
      throw new Error('Empty request body received.');
    }
  } catch (jsonParseError) {
    console.error("Error parsing incoming request JSON:", jsonParseError, "Raw body received:", rawRequestBody);
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body', rawBody: rawRequestBody }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  if (!confessionContent || !confessionId) {
    console.error("Validation Error: Confession content and ID are required.");
    return new Response(JSON.stringify({ error: 'Confession content and ID are required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

  if (!GOOGLE_API_KEY) {
    console.error("Configuration Error: GOOGLE_API_KEY not set in Supabase secrets.");
    return new Response(JSON.stringify({ error: 'GOOGLE_API_KEY not set in Supabase secrets.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  // Call Google Gemini API
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: "You are a compassionate and thoughtful anonymous commenter on a confession board. Provide a short, supportive, or reflective comment in Bulgarian. Keep it concise, under 100 words." },
            { text: `Confession: "${confessionContent}"` }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
      },
    }),
  });

  const responseText = await response.text();

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
    data = JSON.parse(responseText);
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

  // Insert the AI comment directly into the comments table
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { error: insertError } = await supabaseAdmin
    .from('comments')
    .insert({
      confession_id: confessionId,
      content: `AI коментар: "${aiResponseContent}"`,
      gender: "ai", // Changed gender to "ai"
    });

  if (insertError) {
    console.error("Error inserting AI comment into database:", insertError);
    return new Response(JSON.stringify({ error: 'Failed to insert AI comment into database: ' + insertError.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  return new Response(JSON.stringify({ message: 'AI comment generated and inserted successfully.' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});