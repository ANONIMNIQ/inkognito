import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("--- test-proxy function was invoked! ---");
  console.log("Request URL:", req.url);
  console.log("Request Headers:", Object.fromEntries(req.headers));

  return new Response(JSON.stringify({ 
    message: "Success! The proxy from Cloudflare Pages to this Supabase Edge Function is working.",
    invokedAt: new Date().toISOString(),
    request: {
      url: req.url,
      headers: Object.fromEntries(req.headers)
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
})