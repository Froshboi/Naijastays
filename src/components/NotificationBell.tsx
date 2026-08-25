import { useEffect, useState, useRef } from "react";
import { Bell, Home, Eye, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  action_type: string | null;
  action_metadata: any;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    
    // Realtime subscription
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user?.id}` },
        () => fetchNotifications()
      )
      .subscribe();
      
    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    fetchNotifications();
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    fetchNotifications();
  };

  const handleAction = async (n: Notification) => {
    setActionLoading(n.id);
    
    try {
      switch (n.action_type) {
        case "mark_unavailable": {
          const propertyId = n.action_metadata?.property_id;
          if (!propertyId) break;
          if (!window.confirm("Mark this property as unavailable and reject pending requests?")) break;
          const { error } = await supabase
            .from("properties")
            .update({ status: "occupied" })
            .eq("id", propertyId);
          if (error) throw error;
          
          // Reject all pending offers for this property
          await supabase.from("property_offers").update({ status: "rejected" }).eq("property_id", propertyId).eq("status", "pending");
          // Decline all pending bookings
          await supabase.from("booking_requests").update({ status: "declined" }).eq("property_id", propertyId).eq("status", "pending");
          
          toast.success("Property marked as unavailable. Pending offers rejected.");
          break;
        }
        case "view_property": {
          const propertyId = n.action_metadata?.property_id;
          if (propertyId) navigate(`/?listing=${propertyId}`);
          setOpen(false);
          break;
        }
        case "view_offer": {
          navigate("/?dashboard=landlord");
          setOpen(false);
          break;
        }
        case "review_booking":
        case "confirm_booking": {
          navigate("/?dashboard=landlord");
          setOpen(false);
          break;
        }
        default:
          break;
      }
      await markRead(n.id);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getActionButton = (n: Notification) => {
    if (n.read) return null;
    
    switch (n.action_type) {
      case "mark_unavailable":
        return (
          <button onClick={() => handleAction(n)} disabled={actionLoading === n.id} className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {actionLoading === n.id ? <Loader2 size={12} className="animate-spin" /> : <Home size={12} />} Mark Unavailable
          </button>
        );
      case "view_property":
        return (
          <button onClick={() => handleAction(n)} className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/20 bg-secondary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary/80">
            <Eye size={12} /> View Property
          </button>
        );
      case "view_offer":
      case "review_booking":
      case "confirm_booking":
        return (
          <button onClick={() => handleAction(n)} className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/20 bg-secondary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary/80">
            <Eye size={12} /> Review in dashboard
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-full hover:bg-secondary transition-colors">
        <Bell size={20} className="text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-[86px] w-auto rounded-2xl border border-border bg-white shadow-[0_20px_55px_-40px_rgba(15,23,42,0.35)] z-50 max-h-[calc(100dvh-110px)] flex flex-col sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 sm:max-h-[80vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary font-semibold hover:underline">Mark all read</button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-border last:border-0 transition-colors ${n.read ? 'bg-white' : 'bg-secondary/30'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-3 break-words">{n.body}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()} • {n.type}</div>
                      {getActionButton(n)}
                    </div>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="shrink-0 p-1 rounded-full hover:bg-secondary text-muted-foreground" title="Mark read">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
