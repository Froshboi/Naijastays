import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  // Find unread notifications older than 24hrs, no email sent yet
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*, profiles(email)")
    .eq("read", false)
    .eq("email_sent", false)
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
  for (const n of notifications || []) {
    await fetch("https://lvntcsobqtgtbnudiwmv.supabase.co/functions/v1/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        to: n.profiles?.email,
        subject: `Reminder: ${n.title}`,
        html: `<p>${n.body}</p><p><a href="https://naijastays.com">Log in to take action</a></p>`
      }),
    });
    
    await supabase.from("notifications").update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq("id", n.id);
  }
  
  return new Response("OK");
});