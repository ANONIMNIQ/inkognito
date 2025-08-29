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
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'property', 'og:image', image);
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'name', 'twitter:title', title);
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'name', 'twitter:description', description);
  modifiedHtml = updateOrAddMeta(modifiedHtml, 'name', 'twitter:image', image);

  return modifiedHtml;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const SITE_ORIGIN = 'https://inkognito.online';
  const DEFAULT_IMAGE = `${SITE_ORIGIN}/images/logo-main.jpg?v=2`;

  const serveDefaultPage = async (status: number = 200, errorMessage?: string) => {
    try {
      const indexResponse = await fetch(`${SITE_ORIGIN}/index.html`);
      if (!indexResponse.ok) {
        throw new Error(`Failed to fetch default index.html: ${indexResponse.status}`);
      }
      const defaultHtml = await indexResponse.text();
      return new Response(defaultHtml, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }, status });
    } catch (e: any) {
      const errorHtml = `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error loading page.</h1><p>${errorMessage || e.message}</p></body></html>`;
      return new Response(errorHtml, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        status: 500,
      });
    }
  };

  const url = new URL(req.url);
  const requestPath = url.searchParams.get('path');

  if (!requestPath || !requestPath.startsWith('/confessions/')) {
    return await serveDefaultPage();
  }

  const pathUrl = new URL(requestPath, SITE_ORIGIN);
  const pathParts = pathUrl.pathname.split('/');
  const confessionId = pathParts[2];

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

  if (error || !confession) {
    return await serveDefaultPage(404, `Confession not found.`);
  }

  const indexResponse = await fetch(`${SITE_ORIGIN}/index.html`);
  if (!indexResponse.ok) {
    return await serveDefaultPage(500, 'Failed to fetch base HTML for meta tag injection.');
  }
  let indexHtml = await indexResponse.text();

  const metaTags = {
    'og:title': `Инкогнито Online - ${confession.title}`,
    'og:description': confession.content.substring(0, 160) + (confession.content.length > 160 ? '...' : ''),
    'og:url': `${SITE_ORIGIN}${requestPath}`,
    'og:image': DEFAULT_IMAGE,
    'twitter:image': DEFAULT_IMAGE,
  };

  const finalHtml = replaceMetaTags(indexHtml, metaTags);

  return new Response(finalHtml, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    status: 200,
  });
});