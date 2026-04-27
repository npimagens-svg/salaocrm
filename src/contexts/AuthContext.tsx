// @ts-nocheck
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/dynamicSupabaseClient";

export type AppRole = "admin" | "manager" | "receptionist" | "financial" | "professional";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  salonId: string | null;
  userRole: AppRole | null;
  isAdmin: boolean;
  isMaster: boolean;
  canDelete: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    salonName: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createSalonForCurrentUser: (fullName: string, salonName: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback master user email - will be overridden by system config
const DEFAULT_MASTER_EMAIL = "vanieri_2006@hotmail.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [masterEmail, setMasterEmail] = useState<string>(DEFAULT_MASTER_EMAIL);

  useEffect(() => {
    // Fetch master email from system config (idempotente — pode rodar varias vezes)
    const fetchMasterEmail = async () => {
      const { data } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "master_user_email")
        .maybeSingle();

      if (data?.value) {
        setMasterEmail(data.value);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer fetching salon ID to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserSalonId(session.user.id);
            // Re-fetch master email apos login (caso RLS tenha bloqueado a primeira leitura como anon)
            fetchMasterEmail();
          }, 0);
        } else {
          setSalonId(null);
        }
      }
    );

    // THEN check for existing session and master email
    fetchMasterEmail();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserSalonId(session.user.id);
        // Re-fetch master email com sessao ativa (garantia)
        fetchMasterEmail();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserSalonId = async (userId: string) => {
    // Fetch profile and role in parallel once we have the salon_id
    const { data: profileData } = await supabase
      .from("profiles")
      .select("salon_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileData?.salon_id) {
      setSalonId(profileData.salon_id);
      // Fetch role immediately (no separate function call needed)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("salon_id", profileData.salon_id)
        .maybeSingle();
      if (roleData?.role) {
        setUserRole(roleData.role as AppRole);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const createSalonForCurrentUser = async (fullName: string, salonName: string) => {
    if (!user) return { error: new Error("Usuário não autenticado") };

    // Create everything via backend function (bypasses RLS issues during onboarding)
    const { data, error } = await supabase.functions.invoke("create-salon", {
      body: { fullName, salonName },
    });

    if (error) return { error: error as unknown as Error };

    const newSalonId = (data as any)?.salonId as string | undefined;
    if (!newSalonId) return { error: new Error("Resposta inválida ao criar salão") };

    setSalonId(newSalonId);
    return { error: null };
  };

  const signUp = async (email: string, password: string, _fullName: string, _salonName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    // Create the user (salon creation happens after login, in /setup-salon)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (authError) return { error: authError as Error };
    if (!authData.user) return { error: new Error("Erro ao criar usuário") };

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSalonId(null);
    setUserRole(null);
  };

  // Comparacao case-insensitive e robusta a espaços/case do banco vs auth
  const isMaster = !!user?.email && !!masterEmail &&
    user.email.trim().toLowerCase() === masterEmail.trim().toLowerCase();
  const isAdmin = userRole === "admin";
  const canDelete = isMaster;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      salonId, 
      userRole,
      isAdmin,
      isMaster,
      canDelete,
      signIn, 
      signUp, 
      signOut, 
      createSalonForCurrentUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
