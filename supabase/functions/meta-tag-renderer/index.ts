import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to replace meta tags in HTML content
const replaceMetaTags = (html: string, metaTags: { [key: string]: string }): string => {
  let modifiedHtml = html;
  const escapeHtml = (unsafe: string) => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  };

  const title = escapeHtml(metaTags['og:title']);
  const description = escapeHtml(metaTags['og:description']);
  const url = escapeHtml(metaTags['og:url']);
  const image = escapeHtml(metaTags['og:image']);

  // Helper to update or add a meta tag
  const updateOrAddMeta = (doc: string, attribute: 'name' | 'property', key: string, content: string) => {
    const regex = new RegExp(`<meta ${attribute}="${key}" content=".*?"\\s*\/?>`, 'i');
    const newTag = `<meta ${attribute}="${key}" content="${content}">`;
    if (doc.match(regex)) {
      return doc.replace(regex, newTag);
    } else {
      // If tag doesn't exist, try to insert it before </head>
      // This is a simple heuristic; a more robust solution might parse the HTML
      return doc.replace('</head>', `  ${newTag}\n</head>`);
    }
  };

  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'name', 'description', description);
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'property', 'og:title', title);
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'property', 'og:description', description);
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'property', 'og:url', url);
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'property', 'og:image', image); // Ensure og:image is set
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'name', 'twitter:title', title);
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'name', 'twitter:description', description);
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'name', 'twitter:image', image); // Ensure twitter:image is set

  return modifiedHtml;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const SITE_ORIGIN = 'https://inkognito.online'; // Hardcode site origin for fetching index.html
  const DEFAULT_IMAGE = `${SITE_ORIGIN}/images/logo-main.jpg?v=2`; // Cache bust

  // Helper function to serve the default index.html page
  const serveDefaultPage = async (status: number = 200, errorMessage?: string) => {
    try {
      const indexResponse = await fetch(`${SITE_ORIGIN}/index.html`);
      if (!indexResponse.ok) {
        // Fallback if fetching default index.html fails
        return new Response(`<!DOCTYPE html><html><head><title>Инкогнито Online</title><meta name="description" content="Сподели своите тайни анонимно. Място за откровения, подкрепа и разбиране."></head><body><h1>Error loading page.</h1><p>${errorMessage || 'Could not fetch base HTML.'}</p></body></html>`, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 500,
        });
      }
      const defaultHtml = await indexResponse.text();
      return new Response(defaultHtml, { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status });
    } catch (e: any) {
      // Ultimate fallback if even fetching default page fails
      return new Response(`<!DOCTYPE html><html><head><title>Инкогнито Online</title><meta name="description" content="Сподели своите тайni анонимно. Място за откровения, подкрепа и разбиране."></head><body><h1>Error loading page.</h1><p>Critical error: ${e.message}</p></body></html>`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 500,
      });
    }
  };

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path'); // e.g., /confessions/uuid/slug

    // If the path isn't for a specific confession, serve the default page
    if (!path || !path.startsWith('/confessions/')) {
      return await serveDefaultPage();
    }

    const pathParts = path.split('/');
    const confessionId = pathParts[2];

    // If there's no ID in the path, serve the default page
    if (!confessionId) {
      return await serveDefaultPage();
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: confession, error } = await supabaseAdmin
      .from('confessions')
      .select('title, content, id, slug')
      .eq('id', confessionId)
      .single();

    // Fetch the base HTML to inject our tags into
    const indexResponse = await fetch(`${SITE_ORIGIN}/index.html`);
    if (!indexResponse.ok) {
      return await serveDefaultPage(500, 'Failed to fetch base index.html for meta tag injection.');
    }
    let indexHtml = await indexResponse.text();

    // If the confession isn't found or there's an error, serve the default page
    if (error || !confession) {
      return await serveDefaultPage(404, `Confession with ID ${confessionId} not found.`);
    }

    // Create the dynamic meta tags
    const metaTags = {
      'og:title': `Инкогнито Online - ${confession.title}`,
      'og:description': confession.content.substring(0, 160) + (confession.content.length > 160 ? '...' : ''),
      'og:url': `${SITE_ORIGIN}/confessions/${confession.id}/${confession.slug}`,
      'og:image': DEFAULT_IMAGE,
      'twitter:image': DEFAULT_IMAGE,
    };

    // Replace the default tags with our new dynamic ones
    const finalHtml = replaceMetaTags(indexHtml, metaTags);

    return new Response(finalHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      status: 200,
    });

  } catch (error: any) {
    // If any other unexpected error occurs, safely serve the default page
    return await serveDefaultPage(500, `Unexpected error in meta-tag-renderer: ${error.message}`);
  }
});