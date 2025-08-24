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

    // Step 1: Find the confession using ID and token
    const { data: confession, error: selectError } = await supabaseAdmin
      .from('confessions')
      .select('title, author_email')
      .eq('id', confessionId)
      .eq('unsubscribe_token', token)
      .single();

    // If no confession is found, the link is invalid
    if (selectError || !confession) {
      console.error("Unsubscribe error: Confession not found or token mismatch.", selectError);
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

    // Step 2: Check if already unsubscribed
    if (confession.author_email === null) {
      const alreadyUnsubscribedHtml = `
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h1>Вече сте отписани</h1>
            <p>Вече сте се отписали от известия за тази изповед: <strong>"${confession.title}"</strong>.</p>
            <p><a href="https://inkognito.online">Върни се към сайта</a></p>
          </body>
        </html>
      `;
      return new Response(alreadyUnsubscribedHtml, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 200,
      });
    }

    // Step 3: Perform the update
    const { error: updateError } = await supabaseAdmin
      .from('confessions')
      .update({ author_email: null })
      .eq('id', confessionId);

    if (updateError) {
      // This would be a more critical server-side error
      console.error("Unsubscribe update error:", updateError);
      throw new Error("Failed to update confession for unsubscribe.");
    }

    // Step 4: Return success
    const successHtml = `
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1>Успешно отписан!</h1>
          <p>Вие повече няма да получавате известия за нови коментари на изповедта: <strong>"${confession.title}"</strong>.</p>
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