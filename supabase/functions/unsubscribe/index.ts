import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// Removed createClient import for now to isolate the issue

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("Unsubscribe function invoked - TEST 1."); // Very early log

  if (req.method === 'OPTIONS') {
    console.log("OPTIONS request received.");
    return new Response(null, { headers: corsHeaders })
  }

  console.log("GET request received - TEST 1."); // Log for GET request

  const url = new URL(req.url);
  const confessionId = url.searchParams.get('id');
  const token = url.searchParams.get('token');

  console.log(`Confession ID: ${confessionId}, Token: ${token}`); // Log params

  // Just return a simple success response for now
  return new Response(JSON.stringify({ code: 200, message: 'Unsubscribe function test successful.' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});