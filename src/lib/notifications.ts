import { supabase } from "@/integrations/supabase/client";

// In-app notification
export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  type: string = "general",
  actionType: string = "general",
  actionMetadata: Record<string, any> = {}
) {
  const { error } = await supabase.rpc("create_notification", {
    p_user_id: userId,
    p_title: title,
    p_body: body,
    p_type: type,
    p_action_type: actionType,
    p_action_metadata: actionMetadata,
  });
  if (error) console.error("Notification insert failed:", error);
  return !error;
}

// Email via Resend Edge Function
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      "https://lvntcsobqtgtbnudiwmv.supabase.co/functions/v1/send-email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ to, subject, html }),
      }
    );
    return res.ok;
  } catch (e) {
    console.error("Email send failed:", e);
    return false;
  }
}

// Combined: notify in-app + email immediately
export async function notifyAndEmail(
  userId: string,
  userEmail: string | null | undefined,
  title: string,
  body: string,
  emailSubject: string,
  emailHtml: string,
  type: string = "general",
  actionType: string = "general",
  actionMetadata: Record<string, any> = {}
) {
  await notifyUser(userId, title, body, type, actionType, actionMetadata);
  if (userEmail) {
    await sendEmail(userEmail, emailSubject, emailHtml);
  }
}

// Mark property as unavailable + cascade notifications
export async function markPropertyUnavailable(propertyId: string, landlordId: string) {
  const { error } = await supabase.rpc("mark_property_unavailable", {
    p_property_id: propertyId,
    p_landlord_id: landlordId,
  });
  return !error;
}