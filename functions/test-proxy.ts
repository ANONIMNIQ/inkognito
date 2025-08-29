const SUPABASE_FUNCTION_URL = "https://yyhlligskuppqmlzpobp.supabase.co/functions/v1/test-proxy";

export async function onRequest(context) {
  // Forward the incoming request to the Supabase Edge Function
  return await fetch(SUPABASE_FUNCTION_URL, context.request);
}