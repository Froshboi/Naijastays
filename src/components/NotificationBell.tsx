import { useEffect, useState, useRef } from "react";
import { Bell, Home, Eye, X, Loader2, Trash2 } from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    if (!user) {
      setNotifications([]);
      return;
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    
    // Realtime subscription
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user?.id}` },
        (payload) => {
          const notification = payload.new as Notification;
          if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
            new window.Notification(notification.title, { body: notification.body });
          }
          fetchNotifications();
        }
      )
      .subscribe();
      
    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [user?.id]);

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

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((current) => current.filter((notification) => notification.id !== id));
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
        case "view_admin_message": {
          navigate("/admin?tab=messages");
          setOpen(false);
          break;
        }
        case "view_listing_message": {
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

  const expandNotification = async (notification: Notification) => {
    setExpandedId((current) => current === notification.id ? null : notification.id);
    if (!notification.read) await markRead(notification.id);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleBellClick = async () => {
    if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "default") {
      await window.Notification.requestPermission();
    }
    setOpen(!open);
  };

  const getActionButton = (n: Notification) => {
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
      case "view_listing_message":
        return (
          <button onClick={() => handleAction(n)} className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/20 bg-secondary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary/80">
            <Eye size={12} /> Review in dashboard
          </button>
        );
      case "view_admin_message":
        return (
          <button onClick={() => handleAction(n)} className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/20 bg-secondary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-secondary/80">
            <Eye size={12} /> Open admin messages
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <button onClick={handleBellClick} className="relative p-2 rounded-full hover:bg-secondary transition-colors">
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
                    <button onClick={() => expandNotification(n)} className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-semibold text-foreground">{n.title}</div>
                      <div className={`mt-0.5 text-xs text-muted-foreground break-words ${expandedId === n.id ? "whitespace-pre-wrap" : "line-clamp-3"}`}>{n.body}</div>
                      <div className="mt-1 text-[10px] font-semibold text-primary">{expandedId === n.id ? "Click to collapse" : "Click to read full message"}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()} • {n.type}</div>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {getActionButton(n)}
                      <div className="flex items-start gap-1">
                        {!n.read && (
                          <button onClick={() => markRead(n.id)} className="p-1 rounded-full hover:bg-secondary text-muted-foreground" title="Mark read">
                            <X size={14} />
                          </button>
                        )}
                        <button onClick={() => deleteNotification(n.id)} className="p-1 rounded-full hover:bg-red-50 text-muted-foreground hover:text-red-600" title="Delete notification">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
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
