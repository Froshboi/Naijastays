import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, Headphones, Loader2, MessageSquare, Phone, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/lib/data";

export type ListingMessageMode = "landlord_chat" | "admin_contact" | "listing_report";

interface MessageRow {
  id: string;
  parent_id: string | null;
  sender_id: string;
  body: string;
  created_at: string;
}

type ListingProperty = Pick<Property, "id" | "title" | "city" | "state" | "user_id" | "agent_name" | "agent_phone">;

interface Props {
  property: ListingProperty;
  mode: ListingMessageMode;
  onClose: () => void;
  initialThreadId?: string | null;
}

const modeCopy = {
  landlord_chat: {
    title: "Chat about this listing",
    eyebrow: "Message landlord",
    icon: MessageSquare,
    subject: "Question about this listing",
    placeholder: "Ask about availability, inspection time, payment details, rules, or anything you need clarified...",
    submit: "Start chat",
  },
  admin_contact: {
    title: "Contact NaijaStay admin",
    eyebrow: "Admin support",
    icon: Headphones,
    subject: "I need help with this listing",
    placeholder: "Tell admin what you need help with...",
    submit: "Send to admin",
  },
  listing_report: {
    title: "Report this listing",
    eyebrow: "Safety report",
    icon: Flag,
    subject: "Report listing",
    placeholder: "Explain what looks wrong, unsafe, misleading, or suspicious...",
    submit: "Report to admin",
  },
} as const;

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" }).format(new Date(value));

export default function ListingMessageModal({ property, mode, onClose, initialThreadId }: Props) {
  const { user } = useAuth();
  const copy = modeCopy[mode];
  const Icon = copy.icon;
  const [threadId, setThreadId] = useState<string | null>(initialThreadId ?? null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [subject, setSubject] = useState(copy.subject);
  const [body, setBody] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(Boolean(initialThreadId));
  const endRef = useRef<HTMLDivElement>(null);

  const recipientLabel = useMemo(
    () => (mode === "landlord_chat" ? property.agent_name || "the landlord" : "NaijaStay admin"),
    [mode, property.agent_name],
  );
  const isChat = mode === "landlord_chat" && threadId !== null;

  const loadThread = async (rootId: string) => {
    const { data, error } = await (supabase as any)
      .from("listing_messages")
      .select("id,parent_id,sender_id,body,created_at")
      .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
      .order("created_at", { ascending: true });
    if (error) throw error;
    setMessages((data as MessageRow[]) || []);
  };

  useEffect(() => {
    if (!user || mode !== "landlord_chat") return;
    let cancelled = false;
    const initialise = async () => {
      try {
        setLoadingThread(true);
        if (initialThreadId) {
          setThreadId(initialThreadId);
          await loadThread(initialThreadId);
        } else {
          const { data, error } = await (supabase as any)
            .from("listing_messages")
            .select("id")
            .eq("property_id", property.id)
            .eq("sender_id", user.id)
            .eq("kind", "landlord_chat")
            .is("parent_id", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          if (data?.id && !cancelled) {
            setThreadId(data.id);
            await loadThread(data.id);
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error("Could not load this chat");
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    };
    void initialise();
    return () => { cancelled = true; };
  }, [initialThreadId, mode, property.id, user?.id]);

  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`listing-chat-${threadId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "listing_messages",
        filter: `parent_id=eq.${threadId}`,
      }, (payload) => {
        setMessages((current) => current.some((message) => message.id === payload.new.id)
          ? current
          : [...current, payload.new as MessageRow]);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [threadId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !body.trim() || !threadId) return;
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("listing_messages")
        .insert({ parent_id: threadId, property_id: property.id, sender_id: user.id, landlord_id: property.user_id || null, kind: mode, subject, body: body.trim(), status: "open" })
        .select("id,parent_id,sender_id,body,created_at")
        .single();
      if (error) throw error;
      setMessages((current) => [...current, data as MessageRow]);
      setBody("");
    } catch (error) {
      console.error(error);
      const details = error && typeof error === "object"
        ? [Reflect.get(error, "message"), Reflect.get(error, "details"), Reflect.get(error, "hint"), Reflect.get(error, "code")].filter(Boolean).join(" — ")
        : "";
      toast.error(details || "Message could not be sent");
    } finally {
      setLoading(false);
    }
  };

  const submitFirstMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !body.trim()) {
      toast.error(user ? "Write a short message first" : "Please log in first");
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("listing_messages")
        .insert({ property_id: property.id, sender_id: user.id, landlord_id: property.user_id || null, kind: mode, subject: subject.trim() || copy.subject, body: body.trim(), phone: phone.trim() || null, status: "open" })
        .select("id,parent_id,sender_id,body,created_at")
        .single();
      if (error) throw error;
      if (mode === "landlord_chat") {
        setThreadId(data.id);
        setMessages([data as MessageRow]);
      } else {
        toast.success(mode === "listing_report" ? "Report sent to admin" : "Message sent to admin");
        onClose();
      }
    } catch (error) {
      console.error(error);
      const details = error && typeof error === "object"
        ? [Reflect.get(error, "message"), Reflect.get(error, "details"), Reflect.get(error, "hint"), Reflect.get(error, "code")].filter(Boolean).join(" — ")
        : "";
      toast.error(details || "Message could not be sent");
    } finally {
      setLoading(false);
    }
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 p-0 sm:items-center sm:p-4" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] bg-card shadow-xl sm:max-h-[92dvh] sm:rounded-[28px]">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary"><Icon size={14} />{copy.eyebrow}</div>
              <h3 className="mt-3 font-display text-xl font-semibold text-foreground">{isChat ? property.title : copy.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">This goes to {recipientLabel}.</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={20} /></button>
          </div>
        </div>

        {isChat ? (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {loadingThread ? <Loader2 className="mx-auto animate-spin text-primary" /> : messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${message.sender_id === user?.id ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary text-foreground"}`}>
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <p className={`mt-1 text-[10px] ${message.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{formatTime(message.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={sendReply} className="border-t border-border p-4">
              <div className="flex items-end gap-2">
                <textarea value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={handleComposerKeyDown} rows={2} placeholder="Write a reply..." className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
                <button disabled={loading || !body.trim()} className="rounded-xl bg-primary p-3 text-primary-foreground disabled:opacity-50" aria-label="Send reply">{loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}</button>
              </div>
              {property.agent_phone && <a href={`tel:${property.agent_phone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><Phone size={13} /> Call agent</a>}
            </form>
          </>
        ) : (
          <form onSubmit={submitFirstMessage} className="flex-1 space-y-4 overflow-y-auto p-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-3"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Listing</p><p className="mt-1 text-sm font-semibold text-foreground">{property.title}</p><p className="text-xs text-muted-foreground">{[property.city, property.state].filter(Boolean).join(", ") || "Nigeria"}</p></div>
            <div><label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Subject</label><input value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary" /></div>
            <div><label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Your message *</label><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} placeholder={copy.placeholder} className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary" /></div>
            <div><label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Phone number optional</label><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+234..." className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary" /></div>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{loading ? "Sending..." : copy.submit}</button>
          </form>
        )}
      </div>
    </div>
  );
}
