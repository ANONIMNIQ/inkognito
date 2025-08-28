import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // console.log("Unsubscribe function invoked."); // Removed console.log

  if (req.method === 'OPTIONS') {
    // console.log("OPTIONS request received."); // Removed console.log
    return new Response(null, { headers: corsHeaders })
  }

  // console.log("GET request received."); // Removed console.log

  const url = new URL(req.url);
  const confessionId = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  // console.log(`Confession ID: ${confessionId}, Token: ${token}`); // Removed console.log

  if (!confessionId || !token) {
    // console.error("Missing confession ID or unsubscribe token."); // Removed console.error
    return new Response(JSON.stringify({ code: 400, message: 'Missing confession ID or unsubscribe token.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { data, error } = await supabaseAdmin
      .from('confessions')
      .update({ author_email: null })
      .eq('id', confessionId)
      .eq('unsubscribe_token', token)
      .select(); // Select the updated row to check if anything was matched

    if (error) {
      // console.error("Supabase Error during unsubscribe:", error); // Removed console.error
      return new Response(JSON.stringify({ code: 500, message: 'Failed to unsubscribe due to database error: ' + error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (data && data.length > 0) {
      // console.log(`Successfully unsubscribed confession ID: ${confessionId}`); // Removed console.log
      return new Response(JSON.stringify({ code: 200, message: 'Successfully unsubscribed from notifications for this confession.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // console.warn(`No matching confession found for ID: ${confessionId} and token: ${token}. Already unsubscribed or invalid link.`); // Removed console.warn
      return new Response(JSON.stringify({ code: 404, message: 'Confession not found or already unsubscribed with this link.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

  } catch (error) {
    // console.error('Unexpected error in unsubscribe Edge Function:', error); // Removed console.error
    return new Response(JSON.stringify({ code: 500, message: 'An unexpected error occurred during unsubscribe.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});