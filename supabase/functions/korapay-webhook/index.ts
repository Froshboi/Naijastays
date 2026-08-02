import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const secret = Deno.env.get("KORAPAY_SECRET_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const isInitialize =
    req.method === "POST" &&
    (url.pathname.endsWith("/initialize") || url.searchParams.get("action") === "initialize");

  if (isInitialize) {
    try {
      const {
        payment_kind = "promotion",
        property_id,
        plan,
        user_id,
        tenant_id,
        landlord_id,
        amount,
        email,
        name,
        phone,
        note,
      } = await req.json();

      console.log("Received:", {
        payment_kind,
        property_id,
        plan,
        user_id,
        tenant_id,
        landlord_id,
        amount,
        email,
        name,
      });

      if (!amount || Number(amount) <= 0) throw new Error("Invalid amount: " + amount);
      if (!email || !email.includes("@")) throw new Error("Invalid email: " + email);
      if (!property_id) throw new Error("Missing property_id");
      if (payment_kind === "promotion" && !plan) throw new Error("Missing plan");
      if (payment_kind === "escrow" && !tenant_id) throw new Error("Missing tenant_id");
      if (payment_kind === "escrow" && !landlord_id) throw new Error("Missing landlord_id");

      const reference = `NS${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      if (payment_kind === "promotion") {
        await supabase.from("promotion_payments").insert({
          user_id,
          property_id,
          plan,
          amount_naira: Number(amount),
          payment_method: "korapay",
          payment_reference: reference,
          status: "pending",
        });
      } else {
        await supabase.from("escrow_payments").insert({
          tenant_id,
          landlord_id,
          property_id,
          amount_naira: Number(amount),
          payment_channel: "naira",
          payment_method: "korapay",
          payment_reference: reference,
          payer_name: name || "NaijaStays User",
          payer_phone: phone || null,
          note: note || null,
          status: "pending",
        });
      }

      const koraPayload = {
        amount: Number(amount),
        currency: "NGN",
        reference,
        narration:
          payment_kind === "promotion"
            ? `NaijaStays ${plan} promotion`
            : "NaijaStays secure escrow payment",
        redirect_url: `https://naijastays.vercel.app/?payment_status=started&payment_kind=${payment_kind}`,
        notification_url: `${supabaseUrl}/functions/v1/korapay-webhook`,
        merchant_bears_cost: false,
        customer: {
          name: name || "NaijaStays User",
          email: email,
        },
        metadata: {
          payment_kind,
          property_id,
          plan,
          user_id,
          tenant_id,
          landlord_id,
          note,
        },
      };

      console.log("Sending to Korapay:", JSON.stringify(koraPayload));

      const res = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(koraPayload),
      });

      const data = await res.json();
      console.log("Korapay response:", JSON.stringify(data));

      if (!data.status) {
        throw new Error(`Korapay error: ${data.message || JSON.stringify(data)}`);
      }

      const checkout_url = data?.data?.checkout_url;
      if (!checkout_url) {
        throw new Error(`No checkout_url: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ checkout_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err: any) {
      console.error("Initialize error:", err.message || err);
      return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { event, data } = body;

      console.log("Webhook event:", event);

      if (event === "charge.success") {
        const reference = data.reference;

        const verify = await fetch(
          `https://api.korapay.com/merchant/api/v1/charges/${reference}`,
          { headers: { Authorization: `Bearer ${secret}` } }
        );
        const verifyData = await verify.json();
        console.log("Verify response:", JSON.stringify(verifyData));

        if (verifyData.data?.status !== "success") {
          return new Response(JSON.stringify({ error: "Not verified" }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const paymentKind = verifyData.data.metadata?.payment_kind || "promotion";

        if (paymentKind === "promotion") {
          const { property_id, plan } = verifyData.data.metadata;
          const durations: Record<string, number> = { basic: 7, pro: 14, elite: 30 };
          const days = durations[plan] || 7;
          const promoted_until = new Date();
          promoted_until.setDate(promoted_until.getDate() + days);

          await supabase.from("properties").update({
            promoted: true,
            promoted_until: promoted_until.toISOString(),
            promotion_plan: plan,
            verified: true,
          }).eq("id", property_id);

          await supabase.from("promotion_payments")
            .update({ status: "confirmed" })
            .eq("payment_reference", reference);

          console.log("Property promoted:", property_id);
        } else {
          await supabase
            .from("escrow_payments")
            .update({ status: "confirmed" })
            .eq("payment_reference", reference);

          console.log("Escrow confirmed:", reference);
        }
      }

      if (event === "charge.failed") {
        const reference = data.reference;
        const paymentKind = data.metadata?.payment_kind || "promotion";

        if (paymentKind === "promotion") {
          await supabase.from("promotion_payments")
            .update({ status: "failed" })
            .eq("payment_reference", reference);
        } else {
          await supabase.from("escrow_payments")
            .update({ status: "failed" })
            .eq("payment_reference", reference);
        }

        console.log("Payment failed:", reference);
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err: any) {
      console.error("Webhook error:", err.message || err);
      return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Not found", { status: 404 });
});
