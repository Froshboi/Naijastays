import { useState } from "react";
import { Search, LayoutDashboard, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "./AuthModal";
import NotificationBell from "./NotificationBell"; // ← ADD THIS

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

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-xl h-[76px] flex items-center px-4 md:px-8 gap-4 shadow-[0_12px_40px_-32px_rgba(20,83,45,0.65)]">
        <a href="/" className="shrink-0">
          <div className="flex flex-col leading-none">
            <span className="font-display text-[24px] font-semibold tracking-tight text-foreground md:text-[28px]">
              Naija<span className="text-primary">Stay</span>
            </span>
            <span className="mt-1 inline-flex w-fit rounded-full bg-primary px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.3em] text-primary-foreground md:text-[10px]">
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

        <div className="flex items-center gap-2 ml-auto">
          {user ? (
            <>
              {isLandlord && onDashboard && (
                <button onClick={onDashboard} className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full text-sm font-medium border border-primary/15 bg-secondary/70 text-foreground hover:bg-secondary transition-colors">
                  <LayoutDashboard size={16} />
                  <span className="hidden md:inline">Dashboard</span>
                </button>
              )}
              {roles.includes("admin") && onAdmin && (
                <button onClick={onAdmin} className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full text-sm font-medium border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                  <ShieldCheck size={16} />
                  <span className="hidden md:inline">Admin</span>
                </button>
              )}
              <NotificationBell /> {/* ← MOVED INSIDE user block */}
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Hi, {profile?.full_name?.split(" ")[0] || "User"}
              </span>
              <button onClick={signOut} className="px-4 py-2 rounded-full text-sm font-medium border border-border text-foreground hover:bg-secondary transition-colors">
                Log out
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
    </>
  );
}