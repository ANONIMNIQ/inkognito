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

  modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  modifiedHtml = modifiedHtml.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${description}">`);
  modifiedHtml = modifiedHtml.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${title}">`);
  modifiedHtml = modifiedHtml.replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${description}">`);
  modifiedHtml = modifiedHtml.replace(/<meta property="og:url" content=".*?">/, `<meta property="og:url" content="${url}">`);
  modifiedHtml = modifiedHtml.replace(/<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${title}">`);
  modifiedHtml = modifiedHtml.replace(/<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="${description}">`);

  return modifiedHtml;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path'); // e.g., /confessions/uuid/slug

    if (!path || !path.startsWith('/confessions/')) {
      const indexResponse = await fetch('https://inkognito.online/index.html');
      const defaultHtml = await indexResponse.text();
      return new Response(defaultHtml, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
    }

    const pathParts = path.split('/');
    const confessionId = pathParts[2];

    if (!confessionId) {
      const indexResponse = await fetch('https://inkognito.online/index.html');
      const defaultHtml = await indexResponse.text();
      return new Response(defaultHtml, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
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

    const indexResponse = await fetch('https://inkognito.online/index.html');
    let indexHtml = await indexResponse.text();

    if (error || !confession) {
      return new Response(indexHtml, { headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
    }

    const metaTags = {
      'og:title': `Инкогнито Online - ${confession.title}`,
      'og:description': confession.content.substring(0, 160) + (confession.content.length > 160 ? '...' : ''),
      'og:url': `https://inkognito.online/confessions/${confession.id}/${confession.slug}`,
    };

    const finalHtml = replaceMetaTags(indexHtml, metaTags);

    return new Response(finalHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      status: 200,
    });

  } catch (error) {
    const indexResponse = await fetch('https://inkognito.online/index.html');
    const defaultHtml = await indexResponse.text();
    return new Response(defaultHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      status: 500,
    });
  }
});