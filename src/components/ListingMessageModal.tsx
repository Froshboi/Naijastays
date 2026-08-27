import { useMemo, useState } from "react";
import { Flag, Headphones, Loader2, MessageSquare, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/lib/data";
import { notifyUser } from "@/lib/notifications";

export type ListingMessageMode = "landlord_chat" | "admin_contact" | "listing_report";

interface Props {
  property: Property;
  mode: ListingMessageMode;
  onClose: () => void;
}

const modeCopy = {
  landlord_chat: {
    title: "Chat about this listing",
    eyebrow: "Message landlord",
    icon: MessageSquare,
    subject: "Question about this listing",
    placeholder: "Ask about availability, inspection time, payment details, rules, or anything you need clarified...",
    submit: "Send message",
  },
  admin_contact: {
    title: "Contact NaijaStay admin",
    eyebrow: "Admin support",
    icon: Headphones,
    subject: "I need help with this listing",
    placeholder: "Tell admin what you need help with. Include the booking, payment, or landlord issue if there is one...",
    submit: "Send to admin",
  },
  listing_report: {
    title: "Report this listing",
    eyebrow: "Safety report",
    icon: Flag,
    subject: "Report listing",
    placeholder: "Explain what looks wrong, unsafe, misleading, suspicious, or different from what was advertised...",
    submit: "Report to admin",
  },
} as const;

export default function ListingMessageModal({ property, mode, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const copy = modeCopy[mode];
  const Icon = copy.icon;
  const [subject, setSubject] = useState(copy.subject);
  const [body, setBody] = useState("");
  const [phone, setPhone] = useState("");

  const recipientLabel = useMemo(() => {
    if (mode === "landlord_chat") return property.agent_name || "the landlord";
    return "NaijaStay admin";
  }, [mode, property.agent_name]);

  const submitMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("Please log in first");
      return;
    }
    if (!body.trim()) {
      toast.error("Write a short message first");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("listing_messages")
        .insert({
          property_id: property.id,
          sender_id: user.id,
          landlord_id: property.user_id || null,
          kind: mode,
          subject: subject.trim() || copy.subject,
          body: body.trim(),
          phone: phone.trim() || null,
          status: "open",
        })
        .select("id")
        .single();

      if (error) throw error;

      if (mode === "landlord_chat" && property.user_id) {
        await notifyUser(
          property.user_id,
          "New listing chat message",
          `${property.title}: ${body.trim().slice(0, 140)}`,
          "message",
          "view_listing_message",
          { property_id: property.id, message_id: data?.id },
        );
      }

      const { error: adminAlertError } = await (supabase as any).rpc("notify_admins_listing_message", {
        p_message_id: data?.id,
      });
      if (adminAlertError) console.error("Admin message alert failed:", adminAlertError);

      toast.success(mode === "listing_report" ? "Report sent to admin" : "Message sent");
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Message could not be sent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 p-0 sm:items-center sm:p-4"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] bg-card shadow-xl sm:max-h-[92dvh] sm:rounded-[28px]">
        <div className="border-b border-border bg-card px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                <Icon size={14} />
                {copy.eyebrow}
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold text-foreground">{copy.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This goes to {recipientLabel} and stays saved for review.
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={submitMessage} className="flex-1 space-y-4 overflow-y-auto p-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Listing</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{property.title}</p>
            <p className="text-xs text-muted-foreground">{[property.city, property.state].filter(Boolean).join(", ") || "Nigeria"}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Subject</label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Your message *</label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              placeholder={copy.placeholder}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Phone number optional</label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+234..."
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom))] flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_18px_38px_-18px_rgba(21,128,61,0.8)] transition hover:opacity-90 disabled:opacity-60 sm:bottom-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? "Sending..." : copy.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
