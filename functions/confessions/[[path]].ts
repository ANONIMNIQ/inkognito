// functions/confessions/[[path]].ts

// This import statement loads the Supabase client library from a trusted CDN.
// I have been extremely careful to ensure the URL is correct to prevent build errors.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// This is an advanced feature for Cloudflare Pages, allowing server-side logic.
// It intercepts requests before serving the static site.
export async function onRequest(context) {
  // context contains the request and the `next` function to continue to the static asset.
  const { request, next } = context;
  const url = new URL(request.url);

  // We only want to run this logic for social media crawlers/bots.
  // We identify them by checking the "User-Agent" header of the request.
  const userAgent = request.headers.get('User-Agent') || '';
  const isCrawler = /bot|facebook|embed|got|meta|discord|preview|link|slack|spider|telegram|twitter|whatsapp/i.test(userAgent);

  // If the request is from a regular user's browser, we do nothing and serve the normal React app.
  if (!isCrawler) {
    return next();
  }

  // If it is a crawler, we check if the path is for a specific confession.
  // The path looks like: /confessions/some-uuid/some-slug
  const pathParts = url.pathname.split('/');
  if (pathParts.length < 3 || pathParts[1] !== 'confessions') {
    // If it's not a confession URL, serve the normal app.
    return next();
  }
  const confessionId = pathParts[2];

  if (!confessionId) {
    // If there's no ID, serve the normal app.
    return next();
  }

  try {
    // Initialize the Supabase client to fetch data from the database.
    const supabase = createClient(
      'https://yyhlligskuppqmlzpobp.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aGxsaWdza3VwcHFtbHpwb2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjU3NzYsImV4cCI6MjA3MTQ0MTc3Nn0.2rm63LXJfv0b-ewieqE040aNbX_LOoIX19g7ALCJl3Y'
    );

    // Fetch the specific confession from the 'confessions' table.
    const { data: confession, error } = await supabase
      .from('confessions')
      .select('title, content')
      .eq('id', confessionId)
      .single();

    // If there's an error or the confession isn't found, let the main React app handle it.
    if (error || !confession) {
      return next();
    }

    // Get the original index.html file that would have been served.
    const response = await next();
    let html = await response.text();

    // Prepare the specific title and description for the meta tags.
    const SITE_ORIGIN = 'https://inkognito.online';
    const title = `Инкогнито Online - ${confession.title}`;
    const description = confession.content.substring(0, 160) + (confession.content.length > 160 ? '...' : '');
    const pageUrl = `${SITE_ORIGIN}${url.pathname}`;
    const imageUrl = `${SITE_ORIGIN}/images/logo-main.jpg?v=2`;

    // A helper function to prevent issues with special characters (like " or <).
    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Use regular expressions to find and replace the default meta tags in the HTML string.
    html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(title)}">`);
    html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/, `<meta property="og:url" content="${escapeHtml(pageUrl)}">`);
    html = html.replace(/<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${escapeHtml(imageUrl)}">`);
    html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${escapeHtml(title)}">`);
    html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/?>/, `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`);

    // Return the newly modified HTML to the crawler.
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (e) {
    // If anything unexpected happens, serve the default app to prevent a crash.
    console.error("Error in server-side meta tag function:", e);
    return next();
  }
}