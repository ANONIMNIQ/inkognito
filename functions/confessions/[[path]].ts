const SUPABASE_FUNCTION_URL = "https://yyhlligskuppqmlzpobp.supabase.co/functions/v1/meta-tag-renderer";

export async function onRequest(context) {
  // The original URL visited by the user.
  const originalUrl = new URL(context.request.url);

  // The path and query string from the original URL.
  const originalPathWithQuery = originalUrl.pathname + originalUrl.search;

  // Create the URL for the Supabase function.
  const destinationUrl = new URL(SUPABASE_FUNCTION_URL);

  // Append the original path as a query parameter.
  destinationUrl.searchParams.set('path', originalPathWithQuery);

  const newRequest = new Request(destinationUrl.toString(), context.request);

  // Directly return the response from the Supabase function.
  // We are now relying on the Supabase function to set all headers correctly.
  return await fetch(newRequest);
}