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
    console.log("Edge Function 'send-comment-notification' invoked.");
    const { confession_id, comment_content } = await req.json()
    console.log("Received payload:", { confession_id, comment_content });

    if (!confession_id || !comment_content) {
      console.error("Validation Error: confession_id and comment_content are required.");
      throw new Error("confession_id and comment_content are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log("Supabase admin client created.");

    const { data: confession, error: confessionError } = await supabaseAdmin
      .from('confessions')
      .select('title, author_email')
      .eq('id', confession_id)
      .single()

    if (confessionError) {
      console.error("Supabase Error fetching confession:", confessionError);
      throw confessionError
    }
    
    if (!confession || !confession.author_email) {
      console.log("No confession found or no author_email for confession_id:", confession_id);
      return new Response(JSON.stringify({ message: 'No subscriber for this confession.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log("Confession data fetched:", confession);

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error("Configuration Error: RESEND_API_KEY is not set.");
      throw new Error('RESEND_API_KEY is not set in Supabase secrets.')
    }
    console.log("RESEND_API_KEY is present.");

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

    const emailPayload = {
      from: 'onboarding@resend.dev', // IMPORTANT: Replace with your verified domain on Resend
      to: confession.author_email,
      subject: `Нов коментар на вашата изповед: "${confession.title}"`,
      html: emailHtml,
    };
    console.log("Sending email with payload:", emailPayload);

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
      console.error(`Resend API Error: Status ${resendResponse.status}, Body: ${errorBody}`);
      throw new Error(`Failed to send email: ${resendResponse.status} ${errorBody}`);
    }

    console.log("Email sent successfully via Resend.");
    return new Response(JSON.stringify({ message: 'Email sent successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in send-comment-notification Edge Function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})