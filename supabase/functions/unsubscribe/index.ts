import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("Unsubscribe function invoked."); // Log at the very beginning

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const confessionId = url.searchParams.get('id');
    const token = url.searchParams.get('token');

    if (!confessionId || !token) {
      console.error("Unsubscribe: Missing confession ID or token in URL.");
      return new Response(JSON.stringify({ code: 400, message: 'Missing confession ID or token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log("SUPABASE_URL present:", !!supabaseUrl);
    console.log("SUPABASE_SERVICE_ROLE_KEY length:", supabaseServiceRoleKey?.length || 0);

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Unsubscribe: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
      return new Response(JSON.stringify({ code: 500, message: 'Server configuration error: Supabase credentials missing. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your Edge Function secrets.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    // Step 1: Find the confession using ID and token
    const { data: confession, error: selectError } = await supabaseAdmin
      .from('confessions')
      .select('title, author_email')
      .eq('id', confessionId)
      .eq('unsubscribe_token', token)
      .single();

    // If no confession is found, the link is invalid
    if (selectError || !confession) {
      console.error("Unsubscribe error: Confession not found or token mismatch.", selectError);
      return new Response(JSON.stringify({ code: 400, message: 'Invalid unsubscribe link or token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Step 2: Check if already unsubscribed
    if (confession.author_email === null) {
      console.log("Unsubscribe: Already unsubscribed for confession ID:", confessionId);
      return new Response(JSON.stringify({ code: 200, message: `Already unsubscribed from confession: "${confession.title}".` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Step 3: Perform the update
    const { error: updateError } = await supabaseAdmin
      .from('confessions')
      .update({ author_email: null })
      .eq('id', confessionId);

    if (updateError) {
      console.error("Unsubscribe update error:", updateError);
      return new Response(JSON.stringify({ code: 500, message: 'Failed to update confession for unsubscribe: ' + updateError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Step 4: Return success
    console.log("Unsubscribe: Successfully unsubscribed for confession ID:", confessionId);
    return new Response(JSON.stringify({ code: 200, message: `Successfully unsubscribed from confession: "${confession.title}".` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Critical error in unsubscribe function:', error.message || error);
    return new Response(JSON.stringify({ code: 500, message: 'An unexpected server error occurred: ' + (error.message || 'Unknown error') }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});