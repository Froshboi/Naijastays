// Save as: supabase/functions/send-email/index.ts
// Deploy with: supabase functions deploy send-email
// Set secret: supabase secrets set RESEND_API_KEY=your_key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  try {
    const { to, subject, html, text } = await req.json();

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NaijaStays <onboarding@resend.dev>",  -- change to your domain after verifying
        to,
        subject,
        html,
        text,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { 
      status: res.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});