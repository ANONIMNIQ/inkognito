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
    const { confession_id, comment_content } = await req.json()

    if (!confession_id || !comment_content) {
      // console.error("Validation Error: confession_id and comment_content are required."); // Removed console.error
      throw new Error("confession_id and comment_content are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: confession, error: confessionError } = await supabaseAdmin
      .from('confessions')
      .select('title, author_email, slug, id, unsubscribe_token')
      .eq('id', confession_id)
      .single()

    if (confessionError) {
      // console.error("Supabase Error fetching confession:", confessionError); // Removed console.error
      throw confessionError
    }
    
    if (!confession || !confession.author_email) {
      return new Response(JSON.stringify({ message: 'No subscriber for this confession.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      // console.error("Configuration Error: RESEND_API_KEY is not set."); // Removed console.error
      throw new Error('RESEND_API_KEY is not set in Supabase secrets.')
    }

    const confessionUrl = `https://inkognito.online/confessions/${confession.id}/${confession.slug}#comments`;
    const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/unsubscribe?id=${confession.id}&token=${confession.unsubscribe_token}`;

    const emailHtml = `
      <html>
        <body style="font-family: sans-serif; color: #333;">
          <h2>Здравейте,</h2>
          <p>Получихте нов коментар на вашата изповед: <strong>"${confession.title}"</strong></p>
          <blockquote style="border-left: 2px solid #ccc; padding-left: 1em; margin-left: 1em; font-style: italic;">
            ${comment_content}
          </blockquote>
          <p>
            <a href="${confessionUrl}" style="color: #007bff; text-decoration: none;">Натиснете тук, за да видите всички коментари.</a>
          </p>
          <p>Поздрави,<br/>Екипът на Инкогнито Online</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">
            Ако не желаете повече да получавате известия за тази изповед, можете да се отпишете <a href="${unsubscribeUrl}" style="color: #888;">оттук</a>.
          </p>
        </body>
      </html>
    `;

    const emailPayload = {
      from: 'noreply@inkognito.online',
      to: confession.author_email,
      subject: `Нов коментар на вашата изповед: "${confession.title}"`,
      html: emailHtml,
    };

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    })

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      // console.error(`Resend API Error: Status ${resendResponse.status}, Body: ${errorBody}`); // Removed console.error
      throw new Error(`Failed to send email: ${resendResponse.status} ${errorBody}`);
    }

    return new Response(JSON.stringify({ message: 'Email sent successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // console.error('Error in send-comment-notification Edge Function:', error) // Removed console.error
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
});