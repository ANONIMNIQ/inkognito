// functions/confessions/[[path]].ts

// This is a Cloudflare Pages Function. It runs on the server before a page is served.
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // We only want to modify the HTML for social media crawlers/bots.
  // We check the "User-Agent" header to identify them.
  const userAgent = request.headers.get('User-Agent') || '';
  const isCrawler = /bot|facebook|embed|got|meta|discord|preview|link|slack|spider|telegram|twitter|whatsapp/i.test(userAgent);

  // If it's a regular user, we serve the normal React application without any changes.
  if (!isCrawler) {
    return next();
  }

  // Check if the URL path matches the pattern for a single confession.
  const pathParts = url.pathname.split('/');
  if (pathParts.length < 3 || pathParts[1] !== 'confessions') {
    return next(); // Not a confession URL, serve the default page.
  }
  const confessionId = pathParts[2];

  if (!confessionId) {
    return next(); // No ID found, serve the default page.
  }

  try {
    // These are the credentials for accessing the Supabase database API.
    const SUPABASE_URL = 'https://yyhlligskuppqmlzpobp.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aGxsaWdza3VwcHFtbHpwb2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjU3NzYsImV4cCI6MjA3MTQ0MTc3Nn0.2rm63LXJfv0b-ewieqE040aNbX_LOoIX19g7ALCJl3Y';

    // Instead of importing a library, we use the built-in `fetch` API to query Supabase.
    // This is a more robust method that avoids the previous build errors.
    const response = await fetch(`${SUPABASE_URL}/rest/v1/confessions?id=eq.${confessionId}&select=title,content`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/vnd.pgrst.object+json', // Asks Supabase to return a single object, not an array
      },
    });

    // If the request to Supabase fails or returns no data, we stop and serve the default page.
    if (!response.ok) {
      return next();
    }

    const confession = await response.json();

    if (!confession || !confession.title) {
      return next();
    }

    // Get the original index.html file.
    const asset = await next();
    let html = await asset.text();

    // Prepare the dynamic content for the meta tags.
    const SITE_ORIGIN = 'https://inkognito.online';
    const title = `Инкогнито Online - ${confession.title}`;
    const description = confession.content.substring(0, 160) + (confession.content.length > 160 ? '...' : '');
    const pageUrl = `${SITE_ORIGIN}${url.pathname}`;
    const imageUrl = `${SITE_ORIGIN}/images/logo-main.jpg?v=2`;

    // Helper function to escape special characters in the text to prevent breaking the HTML.
    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Replace the default meta tags in the HTML with our dynamic ones.
    html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(title)}">`);
    html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/, `<meta property="og:url" content="${escapeHtml(pageUrl)}">`);
    html = html.replace(/<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${escapeHtml(imageUrl)}">`);
    html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${escapeHtml(title)}">`);
    html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/?>/, `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`);

    // Send the modified HTML back to the social media bot.
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (e) {
    // If any error occurs, we fall back to serving the default page to ensure the site never crashes.
    console.error("Error in server-side meta tag function:", e);
    return next();
  }
}