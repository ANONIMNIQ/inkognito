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
      throw new Error("confession_id and comment_content are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: confession, error: confessionError } = await supabaseAdmin
      .from('confessions')
      .select('title, author_email')
      .eq('id', confession_id)
      .single()

    if (confessionError) throw confessionError
    if (!confession || !confession.author_email) {
      return new Response(JSON.stringify({ message: 'No subscriber for this confession.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in Supabase secrets.')
    }

    const emailHtml = `
      <html>
        <body>
          <h2>Здравейте,</h2>
          <p>Получихте нов коментар на вашата изповед: <strong>"${confession.title}"</strong></p>
          <blockquote style="border-left: 2px solid #ccc; padding-left: 1em; margin-left: 1em; font-style: italic;">
            ${comment_content}
          </blockquote>
          <p>Можете да видите всички коментари, като посетите сайта.</p>
          <p>Поздрави,<br/>Екипът на Анонимни Изповеди</p>
        </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // IMPORTANT: Replace with your verified domain on Resend
        to: confession.author_email,
        subject: `Нов коментар на вашата изповед: "${confession.title}"`,
        html: emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      throw new Error(`Failed to send email: ${resendResponse.status} ${errorBody}`);
    }

    return new Response(JSON.stringify({ message: 'Email sent successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})