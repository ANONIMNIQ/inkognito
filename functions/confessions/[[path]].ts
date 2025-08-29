const SUPABASE_FUNCTION_URL = "https://yyhlligskuppqmlzpobp.supabase.co/functions/v1/meta-tag-renderer";

export async function onRequest(context) {
  // The original URL visited by the user.
  const originalUrl = new URL(context.request.url);

  // The path and query string from the original URL.
  // e.g., "/confessions/some-id/some-slug?param=1"
  const originalPathWithQuery = originalUrl.pathname + originalUrl.search;

  // Create the URL for the Supabase function.
  const destinationUrl = new URL(SUPABASE_FUNCTION_URL);

  // Append the original path as a query parameter.
  // This is a robust way to pass the path info.
  destinationUrl.searchParams.set('path', originalPathWithQuery);

  // We create a new request object to forward.
  // We use the new URL but keep the method, headers, and body of the original request.
  const newRequest = new Request(destinationUrl.toString(), context.request);

  // Forward the new request to the Supabase Edge Function.
  return await fetch(newRequest);
}