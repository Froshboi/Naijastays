import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { full_name: string | null; phone: string | null; avatar_url: string | null } | null;
  roles: string[];
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isLandlord: boolean;
  fetchRoles: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("full_name, phone, avatar_url").eq("user_id", userId).single();
    setProfile(data);
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (error) {
      setRoles([]);
      return;
    }

    const nextRoles = data?.map((r) => r.role) || [];
    if (nextRoles.length === 0) {
      const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role: "client" });
      if (!insertError) {
        setRoles(["client"]);
      } else {
        setRoles([]);
      }
      return;
    }

    setRoles(nextRoles);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error };
    if (data.user) {
      await supabase.from("profiles").update({ phone, full_name: fullName }).eq("user_id", data.user.id);
      const { error: roleError } = await supabase.from("user_roles").insert({ user_id: data.user.id, role: "client" });
      if (roleError) return { error: roleError };
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile, roles, loading,
      signUp, signIn, signOut,
      isLandlord: roles.includes("landlord"),
      fetchRoles,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
