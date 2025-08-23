import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const confessionId = url.searchParams.get('id');
    const token = url.searchParams.get('token');

    if (!confessionId || !token) {
      return new Response('Missing confession ID or token.', { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin
      .from('confessions')
      .update({ author_email: null })
      .eq('id', confessionId)
      .eq('unsubscribe_token', token)
      .select('title')
      .single();

    if (error || !data) {
      console.error("Unsubscribe error:", error);
      const errorHtml = `
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h1>Грешка при отписване</h1>
            <p>Връзката за отписване е невалидна или е изтекла. Моля, опитайте отново.</p>
          </body>
        </html>
      `;
      return new Response(errorHtml, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 400,
      });
    }

    const successHtml = `
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1>Успешно отписан!</h1>
          <p>Вие повече няма да получавате известия за нови коментари на изповедта: <strong>"${data.title}"</strong>.</p>
          <p><a href="https://inkognito.online">Върни се към сайта</a></p>
        </body>
      </html>
    `;

    return new Response(successHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      status: 200,
    });

  } catch (error) {
    console.error('Critical error in unsubscribe function:', error);
    const criticalErrorHtml = `
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1>Възникна грешка</h1>
          <p>Нещо се обърка. Моля, опитайте отново по-късно.</p>
        </body>
      </html>
    `;
    return new Response(criticalErrorHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      status: 500,
    });
  }
});