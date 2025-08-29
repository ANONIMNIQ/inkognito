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

  // Fetch the response from the Supabase function.
  const supabaseResponse = await fetch(newRequest);

  // Read the entire response body as text. This is a more robust method
  // than trying to pipe the stream, which caused the previous "blank page" issue.
  const body = await supabaseResponse.text();

  // Create a mutable copy of the headers from the Supabase response.
  const headers = new Headers(supabaseResponse.headers);
  
  // **Crucially, set the correct Content-Type header.** This tells the browser
  // to render the content as an HTML page with correct character encoding.
  headers.set('Content-Type', 'text/html; charset=utf-8');

  // Return a new response built from the buffered body and our corrected headers.
  return new Response(body, {
    status: supabaseResponse.status,
    statusText: supabaseResponse.statusText,
    headers: headers,
  });
}