import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // For social media crawlers, we generate meta tags. For users, we serve the standard app.
  // A simple way to check is by looking at the User-Agent header.
  const userAgent = request.headers.get('User-Agent') || '';
  const isCrawler = /bot|facebook|embed|got|meta|discord|preview|link|slack|spider|telegram|twitter|whatsapp/i.test(userAgent);

  // If it's not a crawler, just serve the normal single-page application.
  // The client-side React app will handle rendering the correct confession.
  if (!isCrawler) {
    return next();
  }

  // If it IS a crawler, proceed with server-side tag injection.
  const pathParts = url.pathname.split('/');
  const confessionId = pathParts[2];

  if (!confessionId) {
    return next(); // Not a valid confession path, serve the app.
  }

  try {
    // Initialize Supabase client with public key.
    const supabase = createClient(
      'https://yyhlligskuppqmlzpobp.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5aGxsaWdza3VwcHFtbHpwb2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjU5NzYsImV4cCI6MjA3MTQ0MTk3Nn0.2rm63LXJfv0b-ewieqE040aNbX_LOoIX19g7ALCJl3Y'
    );

    // Fetch the specific confession.
    const { data: confession, error } = await supabase
      .from('confessions')
      .select('title, content, id, slug')
      .eq('id', confessionId)
      .single();

    if (error || !confession) {
      return next(); // Confession not found, serve the app which will show a 404.
    }

    // Fetch the original index.html page.
    const response = await next();
    let html = await response.text();

    // Prepare meta tag values.
    const SITE_ORIGIN = 'https://inkognito.online';
    const DEFAULT_IMAGE = `${SITE_ORIGIN}/images/logo-main.jpg?v=2`;
    const title = `Инкогнито Online - ${confession.title}`;
    const description = confession.content.substring(0, 160) + (confession.content.length > 160 ? '...' : '');
    const pageUrl = `${SITE_ORIGIN}${url.pathname}`;

    // Function to escape HTML characters in content.
    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Replace the default meta tags with confession-specific ones.
    html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(title)}">`);
    html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/, `<meta property="og:url" content="${escapeHtml(pageUrl)}">`);
    html = html.replace(/<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${escapeHtml(DEFAULT_IMAGE)}">`);
    html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/?>/, `<meta name="twitter:title" content="${escapeHtml(title)}">`);
    html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/?>/, `<meta name="twitter:description" content="${escapeHtml(description)}">`);
    html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/?>/, `<meta name="twitter:image" content="${escapeHtml(DEFAULT_IMAGE)}">`);

    // Return the modified HTML.
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (e) {
    // If anything goes wrong, just serve the default app.
    return next();
  }
}