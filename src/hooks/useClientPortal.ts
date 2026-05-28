// @ts-nocheck
// Hook do Portal Cliente — gerencia sessão e chamadas à Edge Function client-portal.
//
// Auth roda no próprio Supabase (auth.users com email sintético). Hook expõe
// helpers tipados pra cada action da Edge Function.
//
// SALON_ID vem da env VITE_PORTAL_SALON_ID. Cada deploy white-label
// configura o salão dele. Pra NP Hair Studio é o salon de produção.

import { useEffect, useState, useCallback } from "react";
import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";

const SUPABASE_URL =
  (import.meta as any).env.VITE_SUPABASE_URL ||
  (typeof window !== "undefined" ? localStorage.getItem("ext_supabase_url") || "" : "");
const SUPABASE_ANON =
  (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof window !== "undefined" ? localStorage.getItem("ext_supabase_anon_key") || "" : "");

const SALON_ID =
  (import.meta as any).env.VITE_PORTAL_SALON_ID ||
  "17ff28b9-aaae-4b07-9562-cd65c3d69e45"; // fallback: NP Hair Studio

const FN_URL = `${SUPABASE_URL}/functions/v1/client-portal`;
const STORAGE_KEY = "client_portal_session";

// Cliente Supabase isolado pro portal (não interfere no auth do CRM)
let portalClient: SupabaseClient | null = null;
function getPortalClient(): SupabaseClient {
  if (!portalClient) {
    portalClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        storageKey: STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return portalClient;
}

async function callApi(action: string, body: any = {}, accessToken?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(FN_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, salon_id: SALON_ID, ...body }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export interface PortalClient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cpf: string | null;
}

export interface MatchInfo {
  client_id: string;
  name_masked: string;
  has_auth: boolean;
  matched_by: "phone" | "cpf" | "email";
}

export function useClientPortal() {
  const sb = getPortalClient();
  const [session, setSession] = useState<Session | null>(null);
  const [client, setClient] = useState<PortalClient | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  // Carrega "me" SEMPRE que session muda. Mantém clientReady=false ENQUANTO
  // carrega — assim o loading do hook só vira false depois do client estar
  // pronto (ou da sessão não existir), evitando loop de redirect.
  useEffect(() => {
    if (!session) {
      setClient(null);
      setClientReady(true);
      return;
    }
    setClientReady(false);
    callApi("me", {}, session.access_token)
      .then((j) => setClient(j.client))
      .catch(() => setClient(null))
      .finally(() => setClientReady(true));
  }, [session]);

  const loading = !sessionReady || !clientReady;

  const lookupMatch = useCallback(
    async (phone?: string, cpf?: string, email?: string): Promise<MatchInfo | null> => {
      const r = await callApi("lookup_match", { phone, cpf, email });
      return r.match ?? null;
    },
    [],
  );

  const signup = useCallback(
    async (data: {
      name: string;
      phone: string;
      email?: string;
      cpf?: string;
      password: string;
      existing_client_id?: string;
    }) => {
      const r = await callApi("signup", data);
      // Edge Function devolve session; precisamos colocar no client local
      if (r.session) {
        await sb.auth.setSession({
          access_token: r.session.access_token,
          refresh_token: r.session.refresh_token,
        });
      }
      return r;
    },
    [sb],
  );

  const login = useCallback(
    async (phone: string, password: string) => {
      const r = await callApi("login", { phone, password });
      if (r.session) {
        await sb.auth.setSession({
          access_token: r.session.access_token,
          refresh_token: r.session.refresh_token,
        });
      }
      return r;
    },
    [sb],
  );

  const logout = useCallback(async () => {
    await sb.auth.signOut();
    setClient(null);
  }, [sb]);

  const listServices = useCallback(async () => {
    const r = await callApi("list_services_online");
    return r.services ?? [];
  }, []);

  const listProfessionals = useCallback(async (service_id: string) => {
    const r = await callApi("list_professionals_for_service", { service_id });
    return r.professionals ?? [];
  }, []);

  const listSlots = useCallback(
    async (professional_id: string, service_id: string, date: string) => {
      const r = await callApi("list_slots", { professional_id, service_id, date });
      return r;
    },
    [],
  );

  const createAppointment = useCallback(
    async (data: {
      professional_id: string;
      service_id: string;
      scheduled_at: string;
      notes?: string;
    }) => {
      return await callApi("create_appointment", data, session?.access_token);
    },
    [session],
  );

  const myAppointments = useCallback(async () => {
    const r = await callApi("my_appointments", {}, session?.access_token);
    return r.appointments ?? [];
  }, [session]);

  const cancelMyAppointment = useCallback(
    async (appointment_id: string, reason?: string) => {
      return await callApi(
        "cancel_my_appointment",
        { appointment_id, reason },
        session?.access_token,
      );
    },
    [session],
  );

  return {
    session,
    client,
    loading,
    isAuthenticated: !!session && !!client,
    salonId: SALON_ID,
    lookupMatch,
    signup,
    login,
    logout,
    listServices,
    listProfessionals,
    listSlots,
    createAppointment,
    myAppointments,
    cancelMyAppointment,
  };
}
