import { useEffect, useState } from "react";
import { LogOut, Search, LayoutDashboard, MessageSquare, ShieldCheck, UserRound, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AuthModal from "./AuthModal";
import NotificationBell from "./NotificationBell";
import ProfileSettings from "./ProfileSettings";
import { useNavigate } from "react-router-dom";

interface NavbarProps {
  onSearch: (val: string) => void;
  onDashboard?: () => void;
  onAdmin?: () => void;
}

export default function Navbar({ onSearch, onDashboard, onAdmin }: NavbarProps) {
  const { user, profile, signOut, isLandlord, roles } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const [threads, setThreads] = useState<Array<{ id: string; property_id: string | null; subject: string; body: string; created_at: string; properties?: { title: string } | null }>>([]);
  const navigate = useNavigate();

  const fetchThreads = async () => {
    if (!user) return;
    const query = (supabase as any).from("listing_messages").select("id,property_id,subject,body,created_at").is("parent_id", null).order("created_at", { ascending: false }).limit(30);
    const { data, error } = roles.includes("admin")
      ? await query
      : await query.or(`sender_id.eq.${user.id},landlord_id.eq.${user.id}`);
    if (error) {
      console.error("Failed to load chat threads:", error);
      return;
    }
    const rows = data || [];
    const propertyIds = [...new Set(rows.map((thread: { property_id: string | null }) => thread.property_id).filter(Boolean))];
    if (propertyIds.length) {
      const { data: properties, error: propertyError } = await supabase.from("properties").select("id,title").in("id", propertyIds);
      if (propertyError) {
        console.error("Failed to load chat listing titles:", propertyError);
      } else {
        const titles = new Map((properties || []).map((property) => [property.id, property.title]));
        setThreads(rows.map((thread: { property_id: string | null }) => ({
          ...thread,
          properties: thread.property_id ? { title: titles.get(thread.property_id) || "Listing chat" } : null,
        })));
        return;
      }
    }
    setThreads(rows);
  };

  const fetchUnreadChats = async () => {
    if (!user) return;
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .eq("action_type", "open_chat_thread");
    if (error) {
      console.error("Failed to load unread chat count:", error);
      return;
    }
    setUnreadChats(count ?? 0);
  };

  useEffect(() => {
    if (!user) {
      setUnreadChats(0);
      return;
    }
    void fetchUnreadChats();
    const channel = supabase
      .channel(`navbar-chat-notifications-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => { void fetchUnreadChats(); })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => { void fetchUnreadChats(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    if (messagesOpen) void fetchThreads();
  }, [messagesOpen, user?.id, roles.join(",")]);

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <>
      <nav className="sticky top-0 z-40 flex h-[76px] min-w-0 items-center gap-2 border-b border-border/80 bg-card/90 px-2 shadow-[0_12px_40px_-32px_rgba(20,83,45,0.65)] backdrop-blur-xl sm:gap-4 sm:px-4 md:px-8">
        <a href="/" className="min-w-0 shrink">
          <div className="flex flex-col leading-none">
            <span className="truncate font-display text-[21px] font-semibold tracking-tight text-foreground sm:text-[24px] md:text-[28px]">
              Naija<span className="text-primary">Stay</span>
            </span>
            <span className="mt-1 inline-flex w-fit max-w-full truncate rounded-full bg-primary px-2 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-primary-foreground sm:px-2.5 sm:text-[9px] md:text-[10px]">
              BUY. SELL. RENT
            </span>
          </div>
        </a>

        <div className="flex-1 max-w-[520px] mx-auto hidden md:flex items-center bg-secondary/85 border border-primary/10 rounded-full px-4 h-12 gap-2 shadow-inner">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); onSearch(e.target.value); }}
            placeholder="Search homes in Port Harcourt and beyond..."
            className="flex-1 border-none bg-transparent text-sm text-foreground placeholder:text-naija-faint outline-none"
          />
          <button onClick={() => onSearch(search)} className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shrink-0 shadow-sm">
            <Search size={13} />
          </button>
        </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-2">
          {user ? (
            <>
              {isLandlord && onDashboard && (
                <button onClick={onDashboard} className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-secondary/70 px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary sm:px-3 md:px-4">
                  <LayoutDashboard size={16} />
                  <span className="hidden md:inline">Dashboard</span>
                </button>
              )}
              {roles.includes("admin") && onAdmin && (
                <button onClick={onAdmin} className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 sm:px-3 md:px-4">
                  <ShieldCheck size={16} />
                  <span className="hidden md:inline">Admin</span>
                </button>
              )}
              <div className="relative">
                <button onClick={async () => {
                  setMessagesOpen((current) => !current);
                  await fetchUnreadChats();
                  if ("Notification" in window && window.Notification.permission === "default") {
                    await window.Notification.requestPermission();
                  }
                }} className="relative rounded-full p-2 text-foreground hover:bg-secondary" title="View chat threads">
                  <MessageSquare size={19} />
                  {unreadChats > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {unreadChats > 9 ? "9+" : unreadChats}
                    </span>
                  )}
                </button>
                {messagesOpen && (
                  <div className="fixed left-3 right-3 top-[86px] z-50 max-h-[calc(100dvh-110px)] overflow-y-auto rounded-2xl border border-border bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 sm:max-h-[70vh]">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <span className="text-sm font-semibold">Chat threads</span>
                      <button onClick={() => void fetchThreads()} className="text-xs font-semibold text-primary hover:underline">Refresh</button>
                    </div>
                    {threads.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">No chat threads yet.</div>
                    ) : threads.map((thread) => (
                      <button
                        key={thread.id}
                        onClick={() => {
                          if (thread.property_id) {
                            navigate(`/?listing=${thread.property_id}&chat=open&thread=${thread.id}`);
                            void supabase
                              .from("notifications")
                              .update({ read: true })
                              .eq("user_id", user?.id)
                              .eq("action_type", "open_chat_thread")
                              .eq("action_metadata->>thread_id", thread.id)
                              .then(({ error }) => {
                                if (error) console.error("Failed to mark chat notifications read:", error);
                                void fetchUnreadChats();
                              });
                          }
                          setMessagesOpen(false);
                        }}
                        className="block w-full border-b border-border px-4 py-3 text-left hover:bg-secondary/50"
                      >
                        <div className="truncate text-sm font-semibold text-foreground">{thread.properties?.title || "Listing chat"}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{thread.subject}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{thread.body}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <NotificationBell /> {/* ← MOVED INSIDE user block */}
              <button onClick={() => setProfileOpen(true)} className="shrink-0 rounded-full p-2 text-foreground hover:bg-secondary" title="Edit profile">
                <UserRound size={18} />
              </button>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Hi, {profile?.full_name?.split(" ")[0] || "User"}
              </span>
              <button onClick={signOut} className="shrink-0 rounded-full border border-border px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary sm:px-4" title="Log out">
                <span className="hidden sm:inline">Log out</span>
                <LogOut size={17} className="sm:hidden" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => openAuth("login")} className="px-4 py-2 rounded-full text-sm font-medium border border-border text-foreground hover:bg-secondary transition-colors">
                Log in
              </button>
              <button onClick={() => openAuth("register")} className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground shadow-[0_10px_22px_-12px_rgba(22,101,52,0.75)] hover:opacity-90 transition-opacity">
                Sign up
              </button>
            </>
          )}
        </div>
      </nav>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(event) => event.target === event.currentTarget && setProfileOpen(false)}>
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <button onClick={() => setProfileOpen(false)} className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-secondary" title="Close profile editor"><X size={18} /></button>
            <ProfileSettings />
          </div>
        </div>
      )}
    </>
  );
}