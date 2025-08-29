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
  console.log("meta-tag-renderer function invoked."); // Log invocation

  if (req.method === 'OPTIONS') {
    console.log("OPTIONS request received.");
    return new Response(null, { headers: corsHeaders })
  }

  const SITE_ORIGIN = 'https://inkognito.online'; // Hardcode site origin for fetching index.html
  const DEFAULT_IMAGE = `${SITE_ORIGIN}/images/logo-main.jpg?v=2`; // Cache bust

  // Helper function to serve the default index.html page
  const serveDefaultPage = async (status: number = 200, errorMessage?: string) => {
    console.log(`Serving default page with status ${status}. Error: ${errorMessage || 'None'}`);
    try {
      const indexResponse = await fetch(`${SITE_ORIGIN}/index.html`);
      if (!indexResponse.ok) {
        console.error(`Failed to fetch default index.html: ${indexResponse.status} ${indexResponse.statusText}`);
        return new Response(`<!DOCTYPE html><html><head><title>Инкогнито Online</title><meta name="description" content="Сподели своите тайни анонимно. Място за откровения, подкрепа и разбиране."></head><body><h1>Error loading page.</h1><p>${errorMessage || 'Could not fetch base HTML.'}</p></body></html>`, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 500,
        });
      }
      const defaultHtml = await indexResponse.text();
      return new Response(defaultHtml, { headers: { ...corsHeaders, 'Content-Type': 'text/html' }, status });
    } catch (e: any) {
      console.error(`Critical error serving default page: ${e.message}`);
      return new Response(`<!DOCTYPE html><html><head><title>Инкогнито Online</title><meta name="description" content="Сподели своите тайni анонимно. Място за откровения, подкрепа и разбиране."></head><body><h1>Error loading page.</h1><p>Critical error: ${e.message}</p></body></html>`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 500,
      });
    }
  };

  let requestPath: string | null = null;

  // 1. Try X-Original-URL (Cloudflare Pages specific)
  const originalUrlHeader = req.headers.get('X-Original-URL');
  if (originalUrlHeader) {
    try {
      const originalUrl = new URL(originalUrlHeader);
      requestPath = originalUrl.pathname + originalUrl.search; // Include search params
      console.log(`Path from X-Original-URL header: ${requestPath}`);
    } catch (e: any) {
      console.error(`Error parsing X-Original-URL: ${e.message}`);
    }
  }

  // 2. Fallback to 'fullPath' query parameter (from custom redirect rule)
  if (!requestPath) {
    const url = new URL(req.url);
    const fullPathParameter = url.searchParams.get('fullPath');
    if (fullPathParameter) {
      requestPath = `/${fullPathParameter}`; // Prepend '/' as fullPath might not have it
      console.log(`Path from 'fullPath' query parameter: ${requestPath}`);
    }
  }

  // 3. Fallback to 'path' query parameter (older redirect rule, for backward compatibility if needed)
  if (!requestPath) {
    const url = new URL(req.url);
    const pathParameter = url.searchParams.get('path');
    if (pathParameter) {
      requestPath = pathParameter;
      console.log(`Path from 'path' query parameter (fallback): ${requestPath}`);
    }
  }

  // If no valid path found, serve default
  if (!requestPath || !requestPath.startsWith('/confessions/')) {
    console.log("No valid confession path found, serving default page.");
    return await serveDefaultPage();
  }

  // Now, parse confessionId and slug from requestPath
  const pathUrl = new URL(requestPath, SITE_ORIGIN); // Use SITE_ORIGIN as base for parsing relative path
  const pathParts = pathUrl.pathname.split('/');
  const confessionId = pathParts[2];
  const slug = pathParts[3]; // Also extract slug for consistency

  console.log(`Extracted confessionId: ${confessionId}, slug: ${slug}`);

  // If there's no ID in the path, serve the default page
  if (!confessionId) {
    console.log("No confession ID found in path, serving default page.");
    return await serveDefaultPage();
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log(`Fetching confession ${confessionId} from Supabase.`);
  const { data: confession, error } = await supabaseAdmin
    .from('confessions')
    .select('title, content, id, slug')
    .eq('id', confessionId)
    .single();

  if (error) {
    console.error(`Supabase error fetching confession ${confessionId}: ${error.message}`);
    return await serveDefaultPage(404, `Confession with ID ${confessionId} not found in DB.`);
  }
  if (!confession) {
    console.log(`Confession ${confessionId} not found, serving default page.`);
    return await serveDefaultPage(404, `Confession with ID ${confessionId} not found.`);
  }
  console.log(`Successfully fetched confession: ${JSON.stringify(confession)}`);

  // Fetch the base HTML to inject our tags into
  console.log(`Fetching base index.html from ${SITE_ORIGIN}/index.html`);
  const indexResponse = await fetch(`${SITE_ORIGIN}/index.html`);
  if (!indexResponse.ok) {
    console.error(`Failed to fetch base index.html: ${indexResponse.status} ${indexResponse.statusText}`);
    return await serveDefaultPage(500, 'Failed to fetch base index.html for meta tag injection.');
  }
  let indexHtml = await indexResponse.text();
  console.log("Successfully fetched base index.html.");

  // Create the dynamic meta tags
  const metaTags = {
    'og:title': `Инкогнито Online - ${confession.title}`,
    'og:description': confession.content.substring(0, 160) + (confession.content.length > 160 ? '...' : ''),
    'og:url': `${SITE_ORIGIN}${requestPath}`, // Use the full requestPath here
    'og:image': DEFAULT_IMAGE,
    'twitter:image': DEFAULT_IMAGE,
  };
  console.log(`Generated meta tags: ${JSON.stringify(metaTags)}`);

  // Replace the default tags with our new dynamic ones
  const finalHtml = replaceMetaTags(indexHtml, metaTags);
  console.log("Meta tags replaced. Returning final HTML.");

  return new Response(finalHtml, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    status: 200,
  });
});