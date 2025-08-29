const SUPABASE_FUNCTION_URL = "https://yyhlligskuppqmlzpobp.supabase.co/functions/v1/meta-tag-renderer";

export async function onRequest(context) {
  // Forward the incoming request to the Supabase Edge Function.
  // Cloudflare automatically includes the original URL in the 'X-Original-URL' header,
  // which our Supabase function is already configured to use.
  return await fetch(SUPABASE_FUNCTION_URL, context.request);
}