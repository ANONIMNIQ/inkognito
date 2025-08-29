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

  // Fetch the response from the Supabase function
  const supabaseResponse = await fetch(newRequest);

  // Create a new response to send back to the client,
  // ensuring we copy the body, status, and headers.
  const response = new Response(supabaseResponse.body, {
    status: supabaseResponse.status,
    statusText: supabaseResponse.statusText,
    headers: supabaseResponse.headers,
  });

  // Explicitly set the Content-Type header to ensure it's correct for the browser.
  response.headers.set('Content-Type', 'text/html; charset=utf-8');

  return response;
}